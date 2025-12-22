/**
 * Payment Service
 * Unified service for payment processing with multi-provider support
 */

import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { StripeProvider } from './stripe.provider';
import { MercadoPagoProvider } from './mercadopago.provider';
import {
  IPaymentProvider,
  PaymentProvider,
  Payment,
  PaymentMethod,
  PaymentCustomer,
  Subscription,
  SubscriptionPlan,
  Invoice,
  CheckoutSession,
  PaymentWebhookEvent,
  CreatePaymentInput,
  CreateCheckoutInput,
  CreateSubscriptionInput,
  RefundInput,
  PaymentAnalytics,
  CurrencyCode,
} from './types';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import { getMessagingService, MessageTemplate } from '../messaging';

/**
 * Payment Service Configuration
 */
export interface PaymentServiceConfig {
  defaultProvider: PaymentProvider;
  stripe?: {
    secretKey: string;
    webhookSecret: string;
  };
  mercadopago?: {
    accessToken: string;
    webhookSecret: string;
    sandbox?: boolean;
  };
}

/**
 * Unified Payment Service
 */
@injectable()
export class PaymentService {
  private providers: Map<PaymentProvider, IPaymentProvider> = new Map();
  private defaultProvider: PaymentProvider;
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(private pool: DatabasePool, config?: PaymentServiceConfig) {
    this.initializeEmailProvider();
    // Initialize providers
    const stripeProvider = new StripeProvider(config?.stripe);
    const mercadoPagoProvider = new MercadoPagoProvider(config?.mercadopago);

    if (stripeProvider.isAvailable()) {
      this.providers.set('stripe', stripeProvider);
    }

    if (mercadoPagoProvider.isAvailable()) {
      this.providers.set('mercadopago', mercadoPagoProvider);
    }

    // Set default provider
    this.defaultProvider = config?.defaultProvider || 'stripe';
  }

  private async initializeEmailProvider(): Promise<void> {
    if (this.emailInitialized) return;
    const config = getResendConfig();
    if (config.isEnabled) {
      this.emailProvider = new ResendProvider();
      const result = await this.emailProvider.initialize({
        apiKey: config.apiKey,
        fromEmail: config.fromEmail,
        fromName: config.fromName,
      });
      if (result.isSuccess) {
        this.emailInitialized = true;
      }
    }
  }

  /**
   * Get available providers
   */
  getAvailableProviders(): PaymentProvider[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Get provider status
   */
  getProviderStatus(): Record<PaymentProvider, boolean> {
    return {
      stripe: this.providers.has('stripe'),
      mercadopago: this.providers.has('mercadopago'),
    };
  }

  /**
   * Get provider
   */
  private getProvider(provider?: PaymentProvider): IPaymentProvider | null {
    const targetProvider = provider || this.defaultProvider;
    return this.providers.get(targetProvider) || null;
  }

  // ==================== Customer Management ====================

  /**
   * Create a payment customer
   */
  async createCustomer(
    tenantId: string,
    data: {
      email: string;
      name?: string;
      phone?: string;
      metadata?: Record<string, string>;
    },
    provider?: PaymentProvider
  ): Promise<Result<PaymentCustomer>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const result = await p.createCustomer(tenantId, data);
    if (!result.success || !result.customerId) {
      return Result.fail(result.error || 'Failed to create customer');
    }

    // Store customer in database
    const query = `
      INSERT INTO payment_customers (
        id, tenant_id, email, name, phone, metadata,
        ${p.name === 'stripe' ? 'stripe_customer_id' : 'mercadopago_customer_id'},
        created_at, updated_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `;

    const dbResult = await this.pool.query(query, [
      tenantId,
      data.email,
      data.name || null,
      data.phone || null,
      JSON.stringify(data.metadata || {}),
      result.customerId,
    ]);

    if (dbResult.isFailure || !dbResult.value?.rows?.[0]) {
      return Result.fail('Failed to save customer');
    }

    return Result.ok(this.mapCustomerRow(dbResult.value.rows[0]));
  }

  /**
   * Get customer by ID
   */
  async getCustomer(tenantId: string, customerId: string): Promise<Result<PaymentCustomer>> {
    const query = `
      SELECT * FROM payment_customers
      WHERE tenant_id = $1 AND id = $2
    `;

    const result = await this.pool.query(query, [tenantId, customerId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Customer not found');
    }

    return Result.ok(this.mapCustomerRow(result.value.rows[0]));
  }

  /**
   * Get customer by email
   */
  async getCustomerByEmail(tenantId: string, email: string): Promise<Result<PaymentCustomer>> {
    const query = `
      SELECT * FROM payment_customers
      WHERE tenant_id = $1 AND email = $2
    `;

    const result = await this.pool.query(query, [tenantId, email]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Customer not found');
    }

    return Result.ok(this.mapCustomerRow(result.value.rows[0]));
  }

  /**
   * Update customer
   */
  async updateCustomer(
    tenantId: string,
    customerId: string,
    data: Partial<{ email: string; name: string; phone: string; metadata: Record<string, string> }>
  ): Promise<Result<PaymentCustomer>> {
    // Get existing customer
    const existing = await this.getCustomer(tenantId, customerId);
    if (existing.isFailure || !existing.value) {
      return Result.fail('Customer not found');
    }

    // Update in providers
    for (const [providerName, provider] of this.providers) {
      const providerCustomerId =
        providerName === 'stripe'
          ? existing.value.stripeCustomerId
          : existing.value.mercadopagoCustomerId;

      if (providerCustomerId) {
        await provider.updateCustomer(providerCustomerId, data);
      }
    }

    // Update in database
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (data.email !== undefined) {
      updates.push(`email = $${paramCount++}`);
      values.push(data.email);
    }
    if (data.name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.phone !== undefined) {
      updates.push(`phone = $${paramCount++}`);
      values.push(data.phone);
    }
    if (data.metadata !== undefined) {
      updates.push(`metadata = $${paramCount++}`);
      values.push(JSON.stringify(data.metadata));
    }

    if (updates.length === 0) {
      return existing;
    }

    updates.push(`updated_at = NOW()`);
    values.push(tenantId, customerId);

    const query = `
      UPDATE payment_customers
      SET ${updates.join(', ')}
      WHERE tenant_id = $${paramCount++} AND id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Failed to update customer');
    }

    return Result.ok(this.mapCustomerRow(result.value.rows[0]));
  }

  /**
   * Delete customer
   */
  async deleteCustomer(tenantId: string, customerId: string): Promise<Result<void>> {
    // Get existing customer
    const existing = await this.getCustomer(tenantId, customerId);
    if (existing.isFailure || !existing.value) {
      return Result.fail('Customer not found');
    }

    // Delete from providers
    for (const [providerName, provider] of this.providers) {
      const providerCustomerId =
        providerName === 'stripe'
          ? existing.value.stripeCustomerId
          : existing.value.mercadopagoCustomerId;

      if (providerCustomerId) {
        await provider.deleteCustomer(providerCustomerId);
      }
    }

    // Delete from database
    const query = `
      DELETE FROM payment_customers
      WHERE tenant_id = $1 AND id = $2
    `;

    const result = await this.pool.query(query, [tenantId, customerId]);

    if (result.isFailure) {
      return Result.fail('Failed to delete customer');
    }

    return Result.ok(undefined);
  }

  // ==================== Payment Methods ====================

  /**
   * Create setup intent for adding payment method
   */
  async createSetupIntent(
    tenantId: string,
    customerId: string,
    provider?: PaymentProvider
  ): Promise<Result<{ clientSecret: string; setupIntentId: string }>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    // Get provider customer ID
    const customer = await this.getCustomer(tenantId, customerId);
    if (customer.isFailure || !customer.value) {
      return Result.fail('Customer not found');
    }

    const providerCustomerId =
      p.name === 'stripe'
        ? customer.value.stripeCustomerId
        : customer.value.mercadopagoCustomerId;

    if (!providerCustomerId) {
      return Result.fail('Customer not registered with this provider');
    }

    const result = await p.createSetupIntent(providerCustomerId);
    if (!result.success || !result.clientSecret || !result.setupIntentId) {
      return Result.fail(result.error || 'Failed to create setup intent');
    }

    return Result.ok({
      clientSecret: result.clientSecret,
      setupIntentId: result.setupIntentId,
    });
  }

  /**
   * Attach payment method to customer
   */
  async attachPaymentMethod(
    tenantId: string,
    customerId: string,
    paymentMethodId: string,
    provider?: PaymentProvider
  ): Promise<Result<void>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const customer = await this.getCustomer(tenantId, customerId);
    if (customer.isFailure || !customer.value) {
      return Result.fail('Customer not found');
    }

    const providerCustomerId =
      p.name === 'stripe'
        ? customer.value.stripeCustomerId
        : customer.value.mercadopagoCustomerId;

    if (!providerCustomerId) {
      return Result.fail('Customer not registered with this provider');
    }

    const result = await p.attachPaymentMethod(providerCustomerId, paymentMethodId);
    if (!result.success) {
      return Result.fail(result.error || 'Failed to attach payment method');
    }

    return Result.ok(undefined);
  }

  /**
   * List payment methods for customer
   */
  async listPaymentMethods(
    tenantId: string,
    customerId: string,
    provider?: PaymentProvider
  ): Promise<Result<PaymentMethod[]>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const customer = await this.getCustomer(tenantId, customerId);
    if (customer.isFailure || !customer.value) {
      return Result.fail('Customer not found');
    }

    const providerCustomerId =
      p.name === 'stripe'
        ? customer.value.stripeCustomerId
        : customer.value.mercadopagoCustomerId;

    if (!providerCustomerId) {
      return Result.ok([]);
    }

    const result = await p.listPaymentMethods(providerCustomerId);
    if (!result.success || !result.methods) {
      return Result.fail(result.error || 'Failed to list payment methods');
    }

    return Result.ok(result.methods);
  }

  /**
   * Detach payment method
   */
  async detachPaymentMethod(
    paymentMethodId: string,
    provider?: PaymentProvider
  ): Promise<Result<void>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const result = await p.detachPaymentMethod(paymentMethodId);
    if (!result.success) {
      return Result.fail(result.error || 'Failed to detach payment method');
    }

    return Result.ok(undefined);
  }

  // ==================== Payments ====================

  /**
   * Create payment intent
   */
  async createPaymentIntent(
    tenantId: string,
    input: CreatePaymentInput,
    provider?: PaymentProvider
  ): Promise<Result<{ clientSecret: string; paymentIntentId: string }>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    // Get provider customer ID if customer specified
    let providerCustomerId: string | undefined;
    if (input.customerId) {
      const customer = await this.getCustomer(tenantId, input.customerId);
      if (customer.isSuccess && customer.value) {
        providerCustomerId =
          p.name === 'stripe'
            ? customer.value.stripeCustomerId
            : customer.value.mercadopagoCustomerId;
      }
    }

    const result = await p.createPaymentIntent({
      ...input,
      customerId: providerCustomerId,
      metadata: {
        ...input.metadata,
        tenantId,
      },
    });

    if (!result.success || !result.clientSecret || !result.paymentIntentId) {
      return Result.fail(result.error || 'Failed to create payment intent');
    }

    // Store payment record
    const query = `
      INSERT INTO payments (
        id, tenant_id, customer_id, provider, provider_payment_id,
        amount, currency, status, description, metadata,
        invoice_id, quote_id, opportunity_id, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, 'pending', $7, $8,
        $9, $10, $11, NOW(), NOW()
      )
    `;

    await this.pool.query(query, [
      tenantId,
      input.customerId || null,
      p.name,
      result.paymentIntentId,
      input.amount,
      input.currency,
      input.description || null,
      JSON.stringify(input.metadata || {}),
      input.invoiceId || null,
      input.quoteId || null,
      input.opportunityId || null,
    ]);

    return Result.ok({
      clientSecret: result.clientSecret,
      paymentIntentId: result.paymentIntentId,
    });
  }

  /**
   * Confirm payment
   */
  async confirmPayment(
    tenantId: string,
    paymentIntentId: string,
    paymentMethodId: string,
    provider?: PaymentProvider
  ): Promise<Result<Payment>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const result = await p.confirmPayment(paymentIntentId, paymentMethodId);
    if (!result.success || !result.payment) {
      return Result.fail(result.error || 'Failed to confirm payment');
    }

    // Update payment record
    const updateQuery = `
      UPDATE payments
      SET status = $1, paid_at = $2, updated_at = NOW()
      WHERE tenant_id = $3 AND provider_payment_id = $4
      RETURNING *
    `;

    const updateResult = await this.pool.query(updateQuery, [
      result.payment.status,
      result.payment.paidAt || null,
      tenantId,
      paymentIntentId,
    ]);

    // Send payment confirmation email
    if (this.emailProvider && result.payment.status === 'succeeded') {
      try {
        const appConfig = getAppConfig();
        const paymentRow = updateResult.isSuccess && updateResult.getValue().rows[0];
        const customerEmail = paymentRow?.customer_email || result.payment.customerEmail;

        if (customerEmail) {
          await this.emailProvider.send({
            to: customerEmail,
            subject: `Confirmación de pago - ${result.payment.description || 'Transacción'}`,
            template: EmailTemplate.PAYMENT_CONFIRMATION,
            variables: {
              customerName: paymentRow?.customer_name || 'Cliente',
              paymentAmount: this.formatCurrency(result.payment.amount, result.payment.currency),
              paymentDescription: result.payment.description || 'Pago',
              paymentId: result.payment.id,
              paymentDate: new Date().toLocaleDateString('es-ES'),
              invoiceUrl: paymentRow?.invoice_id ? `${appConfig.appUrl}/invoices/${paymentRow.invoice_id}` : '',
              actionUrl: `${appConfig.appUrl}/payments/${result.payment.id}`,
            },
            tags: [
              { name: 'type', value: 'payment-confirmation' },
              { name: 'paymentId', value: result.payment.id },
            ],
          });
          console.log(`[PaymentService] Payment confirmation email sent to ${customerEmail}`);

          // Send SMS notification if customer has phone
          const customerPhone = paymentRow?.customer_phone;
          if (customerPhone) {
            try {
              const messagingService = getMessagingService();
              if (messagingService.isSmsAvailable()) {
                await messagingService.sendTemplate(
                  customerPhone,
                  MessageTemplate.PAYMENT_RECEIVED,
                  {
                    amount: this.formatCurrency(result.payment.amount, result.payment.currency),
                    customerName: paymentRow?.customer_name || 'Cliente',
                    reference: result.payment.id,
                  },
                  'sms',
                  { entityType: 'customer', entityId: paymentRow?.customer_id }
                );
                console.log(`[PaymentService] Payment confirmation SMS sent to ${customerPhone}`);
              }
            } catch (smsError) {
              console.error('[PaymentService] Failed to send payment confirmation SMS:', smsError);
            }
          }
        }
      } catch (emailError) {
        console.error('[PaymentService] Failed to send payment confirmation email:', emailError);
      }
    }

    return Result.ok(result.payment);
  }

  private formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);
  }

  /**
   * Get payment
   */
  async getPayment(
    tenantId: string,
    paymentId: string,
    provider?: PaymentProvider
  ): Promise<Result<Payment>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const result = await p.getPayment(paymentId);
    if (!result.success || !result.payment) {
      return Result.fail(result.error || 'Payment not found');
    }

    return Result.ok(result.payment);
  }

  /**
   * Cancel payment
   */
  async cancelPayment(
    tenantId: string,
    paymentIntentId: string,
    provider?: PaymentProvider
  ): Promise<Result<void>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const result = await p.cancelPayment(paymentIntentId);
    if (!result.success) {
      return Result.fail(result.error || 'Failed to cancel payment');
    }

    // Update payment record
    const updateQuery = `
      UPDATE payments
      SET status = 'canceled', updated_at = NOW()
      WHERE tenant_id = $1 AND provider_payment_id = $2
    `;

    await this.pool.query(updateQuery, [tenantId, paymentIntentId]);

    return Result.ok(undefined);
  }

  /**
   * Create refund
   */
  async createRefund(
    tenantId: string,
    input: RefundInput,
    provider?: PaymentProvider
  ): Promise<Result<{ refundId: string }>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const result = await p.createRefund(input);
    if (!result.success || !result.refundId) {
      return Result.fail(result.error || 'Failed to create refund');
    }

    // Update payment record
    const updateQuery = `
      UPDATE payments
      SET status = CASE WHEN refunded_amount + $1 >= amount THEN 'refunded' ELSE 'partially_refunded' END,
          refunded_amount = COALESCE(refunded_amount, 0) + $1,
          refund_reason = $2,
          refunded_at = NOW(),
          updated_at = NOW()
      WHERE tenant_id = $3 AND provider_payment_id = $4
      RETURNING *
    `;

    const updateResult = await this.pool.query(updateQuery, [
      input.amount || 0,
      input.reason || null,
      tenantId,
      input.paymentId,
    ]);

    // Send refund notification email
    if (this.emailProvider) {
      try {
        const appConfig = getAppConfig();
        const paymentRow = updateResult.isSuccess && updateResult.getValue().rows[0];
        const customerEmail = paymentRow?.customer_email;

        if (customerEmail) {
          await this.emailProvider.send({
            to: customerEmail,
            subject: `Reembolso procesado - ${paymentRow?.description || 'Transacción'}`,
            template: EmailTemplate.PAYMENT_REFUND,
            variables: {
              customerName: paymentRow?.customer_name || 'Cliente',
              refundAmount: this.formatCurrency(input.amount || paymentRow?.amount || 0, paymentRow?.currency || 'USD'),
              originalAmount: this.formatCurrency(paymentRow?.amount || 0, paymentRow?.currency || 'USD'),
              refundReason: input.reason || 'No especificado',
              refundId: result.refundId,
              refundDate: new Date().toLocaleDateString('es-ES'),
              actionUrl: `${appConfig.appUrl}/payments/${paymentRow?.id}`,
            },
            tags: [
              { name: 'type', value: 'payment-refund' },
              { name: 'refundId', value: result.refundId },
            ],
          });
          console.log(`[PaymentService] Refund notification email sent to ${customerEmail}`);

          // Send SMS notification for refund
          const customerPhone = paymentRow?.customer_phone;
          if (customerPhone) {
            try {
              const messagingService = getMessagingService();
              if (messagingService.isSmsAvailable()) {
                await messagingService.sendTemplate(
                  customerPhone,
                  MessageTemplate.REFUND_PROCESSED,
                  {
                    amount: this.formatCurrency(input.amount || paymentRow?.amount || 0, paymentRow?.currency || 'USD'),
                    reference: result.refundId,
                  },
                  'sms',
                  { entityType: 'customer', entityId: paymentRow?.customer_id }
                );
                console.log(`[PaymentService] Refund SMS sent to ${customerPhone}`);
              }
            } catch (smsError) {
              console.error('[PaymentService] Failed to send refund SMS:', smsError);
            }
          }
        }
      } catch (emailError) {
        console.error('[PaymentService] Failed to send refund notification email:', emailError);
      }
    }

    return Result.ok({ refundId: result.refundId });
  }

  /**
   * List payments
   */
  async listPayments(
    tenantId: string,
    options?: {
      customerId?: string;
      status?: string;
      invoiceId?: string;
      opportunityId?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<{ payments: Payment[]; total: number }>> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramCount = 2;

    if (options?.customerId) {
      conditions.push(`customer_id = $${paramCount++}`);
      values.push(options.customerId);
    }
    if (options?.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(options.status);
    }
    if (options?.invoiceId) {
      conditions.push(`invoice_id = $${paramCount++}`);
      values.push(options.invoiceId);
    }
    if (options?.opportunityId) {
      conditions.push(`opportunity_id = $${paramCount++}`);
      values.push(options.opportunityId);
    }

    const whereClause = conditions.join(' AND ');
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM payments WHERE ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = countResult.isSuccess && countResult.value?.rows?.[0]
      ? parseInt(countResult.value.rows[0].count as string, 10)
      : 0;

    // Get payments
    const query = `
      SELECT * FROM payments
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await this.pool.query(query, values);

    if (result.isFailure || !result.value?.rows) {
      return Result.fail('Failed to list payments');
    }

    const payments = result.value.rows.map((row: Record<string, unknown>) => this.mapPaymentRow(row));

    return Result.ok({ payments, total });
  }

  // ==================== Checkout ====================

  /**
   * Create checkout session
   */
  async createCheckoutSession(
    tenantId: string,
    input: CreateCheckoutInput,
    provider?: PaymentProvider
  ): Promise<Result<CheckoutSession>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const result = await p.createCheckoutSession(tenantId, input);
    if (!result.success || !result.session) {
      return Result.fail(result.error || 'Failed to create checkout session');
    }

    // Store checkout session
    const query = `
      INSERT INTO checkout_sessions (
        id, tenant_id, provider, provider_session_id, url,
        mode, status, expires_at, metadata, created_at
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, NOW())
    `;

    await this.pool.query(query, [
      tenantId,
      p.name,
      result.session.providerSessionId,
      result.session.url,
      result.session.mode,
      result.session.status,
      result.session.expiresAt,
      JSON.stringify(input.metadata || {}),
    ]);

    return Result.ok(result.session);
  }

  /**
   * Get checkout session
   */
  async getCheckoutSession(
    sessionId: string,
    provider?: PaymentProvider
  ): Promise<Result<CheckoutSession>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const result = await p.getCheckoutSession(sessionId);
    if (!result.success || !result.session) {
      return Result.fail(result.error || 'Checkout session not found');
    }

    return Result.ok(result.session);
  }

  // ==================== Subscriptions ====================

  /**
   * Create subscription plan
   */
  async createSubscriptionPlan(
    tenantId: string,
    plan: Omit<SubscriptionPlan, 'id' | 'tenantId' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<SubscriptionPlan>> {
    const query = `
      INSERT INTO subscription_plans (
        id, tenant_id, provider, provider_plan_id, provider_price_id,
        name, description, amount, currency, interval, interval_count,
        trial_days, features, limits, is_active, created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4,
        $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, NOW(), NOW()
      )
      RETURNING *
    `;

    const result = await this.pool.query(query, [
      tenantId,
      plan.provider,
      plan.providerPlanId,
      plan.providerPriceId,
      plan.name,
      plan.description || null,
      plan.amount,
      plan.currency,
      plan.interval,
      plan.intervalCount,
      plan.trialDays || null,
      JSON.stringify(plan.features || []),
      JSON.stringify(plan.limits || {}),
      plan.isActive,
    ]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Failed to create subscription plan');
    }

    return Result.ok(this.mapPlanRow(result.value.rows[0]));
  }

  /**
   * Get subscription plans
   */
  async getSubscriptionPlans(
    tenantId: string,
    activeOnly = true
  ): Promise<Result<SubscriptionPlan[]>> {
    const query = `
      SELECT * FROM subscription_plans
      WHERE tenant_id = $1 ${activeOnly ? 'AND is_active = true' : ''}
      ORDER BY amount ASC
    `;

    const result = await this.pool.query(query, [tenantId]);

    if (result.isFailure || !result.value?.rows) {
      return Result.fail('Failed to get subscription plans');
    }

    const plans = result.value.rows.map((row: Record<string, unknown>) => this.mapPlanRow(row));

    return Result.ok(plans);
  }

  /**
   * Create subscription
   */
  async createSubscription(
    tenantId: string,
    input: CreateSubscriptionInput,
    provider?: PaymentProvider
  ): Promise<Result<Subscription>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    // Get customer provider ID
    const customer = await this.getCustomer(tenantId, input.customerId);
    if (customer.isFailure || !customer.value) {
      return Result.fail('Customer not found');
    }

    const providerCustomerId =
      p.name === 'stripe'
        ? customer.value.stripeCustomerId
        : customer.value.mercadopagoCustomerId;

    if (!providerCustomerId) {
      return Result.fail('Customer not registered with this provider');
    }

    // Get plan provider ID
    const planQuery = `SELECT * FROM subscription_plans WHERE id = $1 AND tenant_id = $2`;
    const planResult = await this.pool.query(planQuery, [input.planId, tenantId]);

    if (planResult.isFailure || !planResult.value?.rows?.[0]) {
      return Result.fail('Plan not found');
    }

    const plan = planResult.value.rows[0];
    const providerPriceId = plan.provider_price_id as string;

    const result = await p.createSubscription({
      ...input,
      customerId: providerCustomerId,
      planId: providerPriceId,
      metadata: {
        ...input.metadata,
        tenantId,
        internalPlanId: input.planId,
      },
    });

    if (!result.success || !result.subscription) {
      return Result.fail(result.error || 'Failed to create subscription');
    }

    // Store subscription
    const subscriptionQuery = `
      INSERT INTO subscriptions (
        id, tenant_id, customer_id, plan_id, provider, provider_subscription_id,
        status, current_period_start, current_period_end,
        trial_start, trial_end, cancel_at_period_end, metadata,
        created_at, updated_at
      )
      VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      )
      RETURNING *
    `;

    const sub = result.subscription;
    const dbResult = await this.pool.query(subscriptionQuery, [
      tenantId,
      input.customerId,
      input.planId,
      p.name,
      sub.providerSubscriptionId,
      sub.status,
      sub.currentPeriodStart,
      sub.currentPeriodEnd,
      sub.trialStart || null,
      sub.trialEnd || null,
      sub.cancelAtPeriodEnd,
      JSON.stringify(input.metadata || {}),
    ]);

    if (dbResult.isFailure || !dbResult.value?.rows?.[0]) {
      return Result.fail('Failed to save subscription');
    }

    return Result.ok(this.mapSubscriptionRow(dbResult.value.rows[0]));
  }

  /**
   * Get subscription
   */
  async getSubscription(
    tenantId: string,
    subscriptionId: string
  ): Promise<Result<Subscription>> {
    const query = `SELECT * FROM subscriptions WHERE tenant_id = $1 AND id = $2`;
    const result = await this.pool.query(query, [tenantId, subscriptionId]);

    if (result.isFailure || !result.value?.rows?.[0]) {
      return Result.fail('Subscription not found');
    }

    return Result.ok(this.mapSubscriptionRow(result.value.rows[0]));
  }

  /**
   * Cancel subscription
   */
  async cancelSubscription(
    tenantId: string,
    subscriptionId: string,
    cancelImmediately = false,
    provider?: PaymentProvider
  ): Promise<Result<void>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    // Get subscription
    const sub = await this.getSubscription(tenantId, subscriptionId);
    if (sub.isFailure || !sub.value) {
      return Result.fail('Subscription not found');
    }

    const result = await p.cancelSubscription(sub.value.providerSubscriptionId, cancelImmediately);
    if (!result.success) {
      return Result.fail(result.error || 'Failed to cancel subscription');
    }

    // Update subscription
    const updateQuery = `
      UPDATE subscriptions
      SET status = $1, cancel_at_period_end = $2, canceled_at = NOW(), updated_at = NOW()
      WHERE tenant_id = $3 AND id = $4
    `;

    await this.pool.query(updateQuery, [
      cancelImmediately ? 'canceled' : sub.value.status,
      !cancelImmediately,
      tenantId,
      subscriptionId,
    ]);

    return Result.ok(undefined);
  }

  /**
   * List subscriptions
   */
  async listSubscriptions(
    tenantId: string,
    options?: {
      customerId?: string;
      status?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<Result<{ subscriptions: Subscription[]; total: number }>> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramCount = 2;

    if (options?.customerId) {
      conditions.push(`customer_id = $${paramCount++}`);
      values.push(options.customerId);
    }
    if (options?.status) {
      conditions.push(`status = $${paramCount++}`);
      values.push(options.status);
    }

    const whereClause = conditions.join(' AND ');
    const limit = options?.limit || 50;
    const offset = options?.offset || 0;

    // Get total count
    const countQuery = `SELECT COUNT(*) FROM subscriptions WHERE ${whereClause}`;
    const countResult = await this.pool.query(countQuery, values);
    const total = countResult.isSuccess && countResult.value?.rows?.[0]
      ? parseInt(countResult.value.rows[0].count as string, 10)
      : 0;

    // Get subscriptions
    const query = `
      SELECT * FROM subscriptions
      WHERE ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `;

    const result = await this.pool.query(query, values);

    if (result.isFailure || !result.value?.rows) {
      return Result.fail('Failed to list subscriptions');
    }

    const subscriptions = result.value.rows.map((row: Record<string, unknown>) =>
      this.mapSubscriptionRow(row)
    );

    return Result.ok({ subscriptions, total });
  }

  // ==================== Invoices ====================

  /**
   * Get invoice
   */
  async getInvoice(
    invoiceId: string,
    provider?: PaymentProvider
  ): Promise<Result<Invoice>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const result = await p.getInvoice(invoiceId);
    if (!result.success || !result.invoice) {
      return Result.fail(result.error || 'Invoice not found');
    }

    return Result.ok(result.invoice);
  }

  /**
   * List invoices for customer
   */
  async listInvoices(
    tenantId: string,
    customerId: string,
    options?: { limit?: number; startingAfter?: string },
    provider?: PaymentProvider
  ): Promise<Result<Invoice[]>> {
    const p = this.getProvider(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    const customer = await this.getCustomer(tenantId, customerId);
    if (customer.isFailure || !customer.value) {
      return Result.fail('Customer not found');
    }

    const providerCustomerId =
      p.name === 'stripe'
        ? customer.value.stripeCustomerId
        : customer.value.mercadopagoCustomerId;

    if (!providerCustomerId) {
      return Result.ok([]);
    }

    const result = await p.listInvoices(providerCustomerId, options);
    if (!result.success || !result.invoices) {
      return Result.fail(result.error || 'Failed to list invoices');
    }

    return Result.ok(result.invoices);
  }

  // ==================== Webhooks ====================

  /**
   * Process webhook
   */
  async processWebhook(
    payload: string,
    signature: string,
    provider: PaymentProvider
  ): Promise<Result<PaymentWebhookEvent>> {
    const p = this.providers.get(provider);
    if (!p) {
      return Result.fail('Payment provider not available');
    }

    // Verify signature
    if (!p.verifyWebhookSignature(payload, signature)) {
      return Result.fail('Invalid webhook signature');
    }

    // Parse event
    const parsedPayload = JSON.parse(payload);
    const event = p.parseWebhookEvent(parsedPayload);
    if (!event) {
      return Result.fail('Invalid webhook event');
    }

    // Handle event
    await this.handleWebhookEvent(event);

    return Result.ok(event);
  }

  /**
   * Handle webhook event
   */
  private async handleWebhookEvent(event: PaymentWebhookEvent): Promise<void> {
    const eventType = event.type;
    const data = event.data;

    switch (eventType) {
      // Payment events
      case 'payment_intent.succeeded':
      case 'payment.approved':
        await this.handlePaymentSucceeded(data);
        break;

      case 'payment_intent.payment_failed':
      case 'payment.rejected':
        await this.handlePaymentFailed(data);
        break;

      // Subscription events
      case 'customer.subscription.updated':
      case 'preapproval.updated':
        await this.handleSubscriptionUpdated(data);
        break;

      case 'customer.subscription.deleted':
      case 'preapproval.cancelled':
        await this.handleSubscriptionCanceled(data);
        break;

      // Invoice events
      case 'invoice.paid':
        await this.handleInvoicePaid(data);
        break;

      case 'invoice.payment_failed':
        await this.handleInvoicePaymentFailed(data);
        break;

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
    }
  }

  private async handlePaymentSucceeded(data: Record<string, unknown>): Promise<void> {
    const paymentId = data.id as string;
    await this.pool.query(
      `UPDATE payments SET status = 'succeeded', paid_at = NOW(), updated_at = NOW() WHERE provider_payment_id = $1`,
      [paymentId]
    );
  }

  private async handlePaymentFailed(data: Record<string, unknown>): Promise<void> {
    const paymentId = data.id as string;
    await this.pool.query(
      `UPDATE payments SET status = 'failed', failed_at = NOW(), updated_at = NOW() WHERE provider_payment_id = $1`,
      [paymentId]
    );
  }

  private async handleSubscriptionUpdated(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = data.id as string;
    const status = data.status as string;
    await this.pool.query(
      `UPDATE subscriptions SET status = $1, updated_at = NOW() WHERE provider_subscription_id = $2`,
      [status, subscriptionId]
    );
  }

  private async handleSubscriptionCanceled(data: Record<string, unknown>): Promise<void> {
    const subscriptionId = data.id as string;
    await this.pool.query(
      `UPDATE subscriptions SET status = 'canceled', canceled_at = NOW(), updated_at = NOW() WHERE provider_subscription_id = $1`,
      [subscriptionId]
    );
  }

  private async handleInvoicePaid(_data: Record<string, unknown>): Promise<void> {
    // Update related payment/subscription if needed
  }

  private async handleInvoicePaymentFailed(_data: Record<string, unknown>): Promise<void> {
    // Update subscription status if needed
  }

  // ==================== Analytics ====================

  /**
   * Get payment analytics
   */
  async getAnalytics(
    tenantId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      currency?: CurrencyCode;
    }
  ): Promise<Result<PaymentAnalytics>> {
    const startDate = options?.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const endDate = options?.endDate || new Date();
    const currency = options?.currency || 'USD';

    // Get basic metrics
    const metricsQuery = `
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN status = 'succeeded' THEN amount ELSE NULL END), 0) as avg_transaction,
        COUNT(CASE WHEN status = 'succeeded' THEN 1 END)::float / NULLIF(COUNT(*), 0) as success_rate,
        COUNT(CASE WHEN status = 'refunded' OR status = 'partially_refunded' THEN 1 END)::float / NULLIF(COUNT(*), 0) as refund_rate
      FROM payments
      WHERE tenant_id = $1
        AND currency = $2
        AND created_at >= $3
        AND created_at <= $4
    `;

    const metricsResult = await this.pool.query(metricsQuery, [
      tenantId,
      currency,
      startDate,
      endDate,
    ]);

    if (metricsResult.isFailure || !metricsResult.value?.rows?.[0]) {
      return Result.fail('Failed to get analytics');
    }

    const metrics = metricsResult.value.rows[0];

    // Get revenue by period (daily for last 30 days)
    const revenueQuery = `
      SELECT
        DATE(created_at) as period,
        SUM(CASE WHEN status = 'succeeded' THEN amount ELSE 0 END) as revenue,
        COUNT(CASE WHEN status = 'succeeded' THEN 1 END) as transactions
      FROM payments
      WHERE tenant_id = $1
        AND currency = $2
        AND created_at >= $3
        AND created_at <= $4
      GROUP BY DATE(created_at)
      ORDER BY period ASC
    `;

    const revenueResult = await this.pool.query(revenueQuery, [
      tenantId,
      currency,
      startDate,
      endDate,
    ]);

    const revenueByPeriod = revenueResult.isSuccess && revenueResult.value?.rows
      ? revenueResult.value.rows.map((row: Record<string, unknown>) => ({
          period: (row.period as Date).toISOString().split('T')[0],
          revenue: parseInt(row.revenue as string, 10),
          transactions: parseInt(row.transactions as string, 10),
        }))
      : [];

    // Get subscription metrics
    const subscriptionQuery = `
      SELECT
        COUNT(*) FILTER (WHERE status = 'active') as active_subscriptions,
        COUNT(*) FILTER (WHERE status = 'canceled' AND canceled_at >= $2) as churned
      FROM subscriptions
      WHERE tenant_id = $1
    `;

    const subscriptionResult = await this.pool.query(subscriptionQuery, [tenantId, startDate]);

    const activeSubscriptions = subscriptionResult.isSuccess && subscriptionResult.value?.rows?.[0]
      ? parseInt(subscriptionResult.value.rows[0].active_subscriptions as string, 10)
      : 0;

    const churned = subscriptionResult.isSuccess && subscriptionResult.value?.rows?.[0]
      ? parseInt(subscriptionResult.value.rows[0].churned as string, 10)
      : 0;

    // Calculate MRR
    const mrrQuery = `
      SELECT COALESCE(SUM(sp.amount), 0) as mrr
      FROM subscriptions s
      JOIN subscription_plans sp ON s.plan_id = sp.id
      WHERE s.tenant_id = $1 AND s.status = 'active' AND sp.interval = 'month'
    `;

    const mrrResult = await this.pool.query(mrrQuery, [tenantId]);
    const mrr = mrrResult.isSuccess && mrrResult.value?.rows?.[0]
      ? parseInt(mrrResult.value.rows[0].mrr as string, 10)
      : 0;

    return Result.ok({
      totalRevenue: parseInt(metrics.total_revenue as string, 10),
      totalTransactions: parseInt(metrics.total_transactions as string, 10),
      averageTransactionValue: parseFloat(metrics.avg_transaction as string),
      successRate: parseFloat(metrics.success_rate as string) || 0,
      refundRate: parseFloat(metrics.refund_rate as string) || 0,
      revenueByPeriod,
      topPaymentMethods: [], // Would need additional query
      subscriptionMetrics: {
        activeSubscriptions,
        mrr,
        churnRate: activeSubscriptions > 0 ? churned / (activeSubscriptions + churned) : 0,
      },
    });
  }

  // ==================== Private Helpers ====================

  private mapCustomerRow(row: Record<string, unknown>): PaymentCustomer {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      email: row.email as string,
      name: row.name as string | undefined,
      phone: row.phone as string | undefined,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, string> | undefined,
      stripeCustomerId: row.stripe_customer_id as string | undefined,
      mercadopagoCustomerId: row.mercadopago_customer_id as string | undefined,
      billingAddress: row.billing_address
        ? typeof row.billing_address === 'string'
          ? JSON.parse(row.billing_address)
          : row.billing_address as PaymentCustomer['billingAddress']
        : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapPaymentRow(row: Record<string, unknown>): Payment {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      customerId: row.customer_id as string | undefined,
      provider: row.provider as PaymentProvider,
      providerPaymentId: row.provider_payment_id as string,
      providerPaymentIntentId: row.provider_payment_intent_id as string | undefined,
      amount: row.amount as number,
      currency: row.currency as CurrencyCode,
      status: row.status as Payment['status'],
      description: row.description as string | undefined,
      statementDescriptor: row.statement_descriptor as string | undefined,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, string> | undefined,
      invoiceId: row.invoice_id as string | undefined,
      quoteId: row.quote_id as string | undefined,
      opportunityId: row.opportunity_id as string | undefined,
      feeAmount: row.fee_amount as number | undefined,
      netAmount: row.net_amount as number | undefined,
      refundedAmount: row.refunded_amount as number | undefined,
      refundReason: row.refund_reason as string | undefined,
      receiptUrl: row.receipt_url as string | undefined,
      receiptNumber: row.receipt_number as string | undefined,
      failureCode: row.failure_code as string | undefined,
      failureMessage: row.failure_message as string | undefined,
      paidAt: row.paid_at ? new Date(row.paid_at as string) : undefined,
      failedAt: row.failed_at ? new Date(row.failed_at as string) : undefined,
      refundedAt: row.refunded_at ? new Date(row.refunded_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapPlanRow(row: Record<string, unknown>): SubscriptionPlan {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      provider: row.provider as PaymentProvider,
      providerPlanId: row.provider_plan_id as string,
      providerPriceId: row.provider_price_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      amount: row.amount as number,
      currency: row.currency as CurrencyCode,
      interval: row.interval as 'day' | 'week' | 'month' | 'year',
      intervalCount: row.interval_count as number,
      trialDays: row.trial_days as number | undefined,
      features: typeof row.features === 'string'
        ? JSON.parse(row.features)
        : row.features as string[] | undefined,
      limits: typeof row.limits === 'string'
        ? JSON.parse(row.limits)
        : row.limits as Record<string, number> | undefined,
      isActive: row.is_active as boolean,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapSubscriptionRow(row: Record<string, unknown>): Subscription {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      customerId: row.customer_id as string,
      planId: row.plan_id as string,
      provider: row.provider as PaymentProvider,
      providerSubscriptionId: row.provider_subscription_id as string,
      status: row.status as Subscription['status'],
      currentPeriodStart: new Date(row.current_period_start as string),
      currentPeriodEnd: new Date(row.current_period_end as string),
      trialStart: row.trial_start ? new Date(row.trial_start as string) : undefined,
      trialEnd: row.trial_end ? new Date(row.trial_end as string) : undefined,
      cancelAtPeriodEnd: row.cancel_at_period_end as boolean,
      canceledAt: row.canceled_at ? new Date(row.canceled_at as string) : undefined,
      cancelReason: row.cancel_reason as string | undefined,
      defaultPaymentMethodId: row.default_payment_method_id as string | undefined,
      latestInvoiceId: row.latest_invoice_id as string | undefined,
      metadata: typeof row.metadata === 'string'
        ? JSON.parse(row.metadata)
        : row.metadata as Record<string, string> | undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

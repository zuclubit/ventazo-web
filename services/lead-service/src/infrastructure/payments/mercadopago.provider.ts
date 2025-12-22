/**
 * MercadoPago Payment Provider
 * Integration with MercadoPago for payment processing in Latin America
 */

import {
  IPaymentProvider,
  PaymentProvider,
  Payment,
  PaymentMethod,
  Subscription,
  Invoice,
  CheckoutSession,
  PaymentWebhookEvent,
  CreatePaymentInput,
  CreateCheckoutInput,
  CreateSubscriptionInput,
  RefundInput,
  CurrencyCode,
  PaymentStatus,
  SubscriptionStatus,
} from './types';

// MercadoPago API types
interface MPCustomer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: { area_code: string; number: string };
  identification?: { type: string; number: string };
  address?: {
    id?: string;
    zip_code?: string;
    street_name?: string;
    street_number?: string;
    city?: { name: string };
  };
  date_registered?: string;
  metadata?: Record<string, string>;
}

interface MPPayment {
  id: number;
  status: string;
  status_detail: string;
  transaction_amount: number;
  currency_id: string;
  description?: string;
  payer?: {
    id?: string;
    email?: string;
  };
  payment_method_id: string;
  payment_type_id: string;
  external_reference?: string;
  metadata?: Record<string, string>;
  date_created: string;
  date_last_updated: string;
  date_approved?: string;
  fee_details?: Array<{ type: string; amount: number }>;
  transaction_details?: {
    net_received_amount: number;
    total_paid_amount: number;
  };
  point_of_interaction?: {
    transaction_data?: {
      ticket_url?: string;
    };
  };
}

interface MPPreference {
  id: string;
  init_point: string;
  sandbox_init_point: string;
  expires: boolean;
  expiration_date_from?: string;
  expiration_date_to?: string;
  items: Array<{
    id: string;
    title: string;
    description?: string;
    currency_id: string;
    quantity: number;
    unit_price: number;
    picture_url?: string;
  }>;
  payer?: {
    email?: string;
  };
  back_urls?: {
    success: string;
    failure: string;
    pending: string;
  };
  external_reference?: string;
  metadata?: Record<string, string>;
}

interface MPSubscription {
  id: string;
  status: string;
  reason: string;
  payer_id: string;
  preapproval_plan_id: string;
  external_reference?: string;
  auto_recurring: {
    frequency: number;
    frequency_type: 'days' | 'months';
    transaction_amount: number;
    currency_id: string;
    start_date: string;
    end_date?: string;
    billing_day?: number;
    free_trial?: {
      frequency: number;
      frequency_type: 'days' | 'months';
    };
  };
  next_payment_date?: string;
  date_created: string;
  last_modified: string;
  metadata?: Record<string, string>;
}

interface MPPlan {
  id: string;
  status: string;
  reason: string;
  auto_recurring: {
    frequency: number;
    frequency_type: 'days' | 'months';
    transaction_amount: number;
    currency_id: string;
    billing_day?: number;
    free_trial?: {
      frequency: number;
      frequency_type: 'days' | 'months';
    };
  };
  external_reference?: string;
  date_created: string;
  last_modified: string;
}

interface MPCard {
  id: string;
  customer_id: string;
  expiration_month: number;
  expiration_year: number;
  first_six_digits: string;
  last_four_digits: string;
  payment_method: {
    id: string;
    name: string;
    payment_type_id: string;
  };
  issuer: {
    id: number;
    name: string;
  };
  cardholder: {
    name: string;
    identification?: {
      type: string;
      number: string;
    };
  };
  date_created: string;
  date_last_updated: string;
}

/**
 * MercadoPago Payment Provider
 */
export class MercadoPagoProvider implements IPaymentProvider {
  readonly name: PaymentProvider = 'mercadopago';
  private accessToken: string | null = null;
  private webhookSecret: string;
  private baseUrl = 'https://api.mercadopago.com';
  private isSandbox: boolean;

  constructor(config?: { accessToken?: string; webhookSecret?: string; sandbox?: boolean }) {
    this.accessToken = config?.accessToken || process.env.MERCADOPAGO_ACCESS_TOKEN || null;
    this.webhookSecret = config?.webhookSecret || process.env.MERCADOPAGO_WEBHOOK_SECRET || '';
    this.isSandbox = config?.sandbox ?? process.env.NODE_ENV !== 'production';
  }

  isAvailable(): boolean {
    return this.accessToken !== null;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    if (!this.accessToken) {
      return { success: false, error: 'MercadoPago not configured' };
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers: {
          'Authorization': `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': crypto.randomUUID(),
          ...options.headers,
        },
      });

      const data = await response.json() as T & { message?: string; error?: string; cause?: Array<{ code: string; description: string }> };

      if (!response.ok) {
        const errorMessage = data.message || data.error || data.cause?.[0]?.description || 'Unknown error';
        return { success: false, error: errorMessage };
      }

      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Customer methods
  async createCustomer(
    tenantId: string,
    data: { email: string; name?: string; metadata?: Record<string, string> }
  ): Promise<{ success: boolean; customerId?: string; error?: string }> {
    const [firstName, ...lastNameParts] = (data.name || '').split(' ');
    const lastName = lastNameParts.join(' ');

    const result = await this.request<MPCustomer>('/v1/customers', {
      method: 'POST',
      body: JSON.stringify({
        email: data.email,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        metadata: {
          tenantId,
          ...data.metadata,
        },
      }),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, customerId: result.data.id };
  }

  async updateCustomer(
    customerId: string,
    data: Partial<{ email: string; name?: string; metadata?: Record<string, string> }>
  ): Promise<{ success: boolean; error?: string }> {
    const [firstName, ...lastNameParts] = (data.name || '').split(' ');
    const lastName = lastNameParts.join(' ');

    const result = await this.request<MPCustomer>(`/v1/customers/${customerId}`, {
      method: 'PUT',
      body: JSON.stringify({
        email: data.email,
        first_name: firstName || undefined,
        last_name: lastName || undefined,
        metadata: data.metadata,
      }),
    });

    return { success: result.success, error: result.error };
  }

  async deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.request(`/v1/customers/${customerId}`, {
      method: 'DELETE',
    });

    return { success: result.success, error: result.error };
  }

  // Payment Methods
  async createSetupIntent(
    customerId: string
  ): Promise<{ success: boolean; clientSecret?: string; setupIntentId?: string; error?: string }> {
    // MercadoPago doesn't have setup intents like Stripe
    // We return a card token endpoint for the frontend to use
    return {
      success: true,
      setupIntentId: customerId,
      clientSecret: `card_token_${customerId}`,
    };
  }

  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    // In MercadoPago, we create a card for the customer
    const result = await this.request<MPCard>(`/v1/customers/${customerId}/cards`, {
      method: 'POST',
      body: JSON.stringify({
        token: paymentMethodId,
      }),
    });

    return { success: result.success, error: result.error };
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    // Parse customer_id and card_id from paymentMethodId (format: customer_id:card_id)
    const [customerId, cardId] = paymentMethodId.split(':');
    if (!customerId || !cardId) {
      return { success: false, error: 'Invalid payment method ID format' };
    }

    const result = await this.request(`/v1/customers/${customerId}/cards/${cardId}`, {
      method: 'DELETE',
    });

    return { success: result.success, error: result.error };
  }

  async listPaymentMethods(
    customerId: string
  ): Promise<{ success: boolean; methods?: PaymentMethod[]; error?: string }> {
    const result = await this.request<MPCard[]>(`/v1/customers/${customerId}/cards`);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const methods: PaymentMethod[] = result.data.map((card) => ({
      id: `${customerId}:${card.id}`,
      tenantId: '',
      customerId,
      provider: 'mercadopago',
      type: 'card',
      providerMethodId: card.id,
      card: {
        brand: card.payment_method.name,
        last4: card.last_four_digits,
        expMonth: card.expiration_month,
        expYear: card.expiration_year,
        funding: this.mapCardFunding(card.payment_method.payment_type_id),
      },
      isDefault: false,
      billingDetails: {
        name: card.cardholder.name,
      },
      createdAt: new Date(card.date_created),
      updatedAt: new Date(card.date_last_updated),
    }));

    return { success: true, methods };
  }

  // Payments
  async createPaymentIntent(
    input: CreatePaymentInput
  ): Promise<{ success: boolean; clientSecret?: string; paymentIntentId?: string; error?: string }> {
    const result = await this.request<MPPayment>('/v1/payments', {
      method: 'POST',
      body: JSON.stringify({
        transaction_amount: input.amount / 100, // MercadoPago uses full units, not cents
        currency_id: this.mapCurrency(input.currency),
        description: input.description,
        payer: {
          email: input.customerId ? undefined : 'customer@email.com', // Required if no customer
        },
        external_reference: input.invoiceId || input.quoteId || input.opportunityId,
        metadata: {
          ...input.metadata,
          invoiceId: input.invoiceId || '',
          quoteId: input.quoteId || '',
          opportunityId: input.opportunityId || '',
        },
        statement_descriptor: input.statementDescriptor?.substring(0, 22),
        payment_method_id: input.paymentMethodId,
        capture: false, // Create as authorized, capture later
      }),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      paymentIntentId: result.data.id.toString(),
      clientSecret: `mp_${result.data.id}`,
    };
  }

  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; payment?: Payment; error?: string }> {
    // In MercadoPago, we capture the payment to confirm it
    const result = await this.request<MPPayment>(`/v1/payments/${paymentIntentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        capture: true,
        payment_method_id: paymentMethodId,
      }),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, payment: this.mapPayment(result.data) };
  }

  async capturePayment(
    paymentIntentId: string,
    _amount?: number
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.request<MPPayment>(`/v1/payments/${paymentIntentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        capture: true,
      }),
    });

    return { success: result.success, error: result.error };
  }

  async cancelPayment(paymentIntentId: string): Promise<{ success: boolean; error?: string }> {
    const result = await this.request<MPPayment>(`/v1/payments/${paymentIntentId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'cancelled',
      }),
    });

    return { success: result.success, error: result.error };
  }

  async getPayment(
    paymentId: string
  ): Promise<{ success: boolean; payment?: Payment; error?: string }> {
    const result = await this.request<MPPayment>(`/v1/payments/${paymentId}`);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, payment: this.mapPayment(result.data) };
  }

  // Refunds
  async createRefund(
    input: RefundInput
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    const result = await this.request<{ id: number }>(`/v1/payments/${input.paymentId}/refunds`, {
      method: 'POST',
      body: JSON.stringify({
        amount: input.amount ? input.amount / 100 : undefined, // Full refund if no amount
        metadata: input.metadata,
      }),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, refundId: result.data.id.toString() };
  }

  // Checkout
  async createCheckoutSession(
    tenantId: string,
    input: CreateCheckoutInput
  ): Promise<{ success: boolean; session?: CheckoutSession; error?: string }> {
    const items = input.lineItems.map((item, index) => ({
      id: `item_${index}`,
      title: item.name,
      description: item.description,
      currency_id: this.mapCurrency(item.currency),
      quantity: item.quantity,
      unit_price: item.amount / 100, // Convert cents to full units
      picture_url: item.imageUrl,
    }));

    const result = await this.request<MPPreference>('/checkout/preferences', {
      method: 'POST',
      body: JSON.stringify({
        items,
        payer: {
          email: input.customerEmail,
        },
        back_urls: {
          success: input.successUrl,
          failure: input.cancelUrl,
          pending: input.successUrl,
        },
        auto_return: 'approved',
        external_reference: input.metadata?.reference,
        metadata: {
          tenantId,
          ...input.metadata,
        },
        expires: true,
        expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours
      }),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const preference = result.data;
    return {
      success: true,
      session: {
        id: preference.id,
        provider: 'mercadopago',
        providerSessionId: preference.id,
        url: this.isSandbox ? preference.sandbox_init_point : preference.init_point,
        expiresAt: preference.expiration_date_to
          ? new Date(preference.expiration_date_to)
          : new Date(Date.now() + 24 * 60 * 60 * 1000),
        mode: input.mode,
        customerEmail: input.customerEmail,
        lineItems: input.lineItems,
        successUrl: input.successUrl,
        cancelUrl: input.cancelUrl,
        metadata: input.metadata,
        status: 'open',
        createdAt: new Date(),
      },
    };
  }

  async getCheckoutSession(
    sessionId: string
  ): Promise<{ success: boolean; session?: CheckoutSession; error?: string }> {
    const result = await this.request<MPPreference>(`/checkout/preferences/${sessionId}`);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const preference = result.data;
    const isExpired = preference.expiration_date_to
      ? new Date(preference.expiration_date_to) < new Date()
      : false;

    return {
      success: true,
      session: {
        id: preference.id,
        provider: 'mercadopago',
        providerSessionId: preference.id,
        url: this.isSandbox ? preference.sandbox_init_point : preference.init_point,
        expiresAt: preference.expiration_date_to
          ? new Date(preference.expiration_date_to)
          : new Date(Date.now() + 24 * 60 * 60 * 1000),
        mode: 'payment',
        customerEmail: preference.payer?.email,
        lineItems: preference.items.map((item) => ({
          name: item.title,
          description: item.description,
          amount: item.unit_price * 100, // Convert back to cents
          currency: this.reverseCurrencyMap(item.currency_id),
          quantity: item.quantity,
          imageUrl: item.picture_url,
        })),
        successUrl: preference.back_urls?.success || '',
        cancelUrl: preference.back_urls?.failure || '',
        metadata: preference.metadata,
        status: isExpired ? 'expired' : 'open',
        createdAt: new Date(),
      },
    };
  }

  // Subscriptions
  async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    const result = await this.request<MPSubscription>('/preapproval', {
      method: 'POST',
      body: JSON.stringify({
        preapproval_plan_id: input.planId,
        payer_email: input.customerId, // In MP, we use email as payer identifier
        card_token_id: input.paymentMethodId,
        external_reference: input.customerId,
        metadata: input.metadata,
      }),
    });

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, subscription: this.mapSubscription(result.data) };
  }

  async cancelSubscription(
    subscriptionId: string,
    _cancelImmediately?: boolean
  ): Promise<{ success: boolean; error?: string }> {
    const result = await this.request<MPSubscription>(`/preapproval/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        status: 'cancelled',
      }),
    });

    return { success: result.success, error: result.error };
  }

  async updateSubscription(
    subscriptionId: string,
    planId: string
  ): Promise<{ success: boolean; error?: string }> {
    // Get the new plan details
    const planResult = await this.request<MPPlan>(`/preapproval_plan/${planId}`);
    if (!planResult.success || !planResult.data) {
      return { success: false, error: planResult.error || 'Plan not found' };
    }

    const result = await this.request<MPSubscription>(`/preapproval/${subscriptionId}`, {
      method: 'PUT',
      body: JSON.stringify({
        auto_recurring: planResult.data.auto_recurring,
      }),
    });

    return { success: result.success, error: result.error };
  }

  async getSubscription(
    subscriptionId: string
  ): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    const result = await this.request<MPSubscription>(`/preapproval/${subscriptionId}`);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return { success: true, subscription: this.mapSubscription(result.data) };
  }

  // Invoices - MercadoPago doesn't have built-in invoices like Stripe
  async getInvoice(
    _invoiceId: string
  ): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    return { success: false, error: 'MercadoPago does not support invoices directly' };
  }

  async listInvoices(
    _customerId: string,
    _options?: { limit?: number; startingAfter?: string }
  ): Promise<{ success: boolean; invoices?: Invoice[]; error?: string }> {
    return { success: false, error: 'MercadoPago does not support invoices directly' };
  }

  // Webhooks
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.webhookSecret) {
      return false;
    }

    try {
      // MercadoPago uses x-signature header with ts and v1 hash
      const parts = signature.split(',');
      const tsMatch = parts.find((p) => p.startsWith('ts='));
      const v1Match = parts.find((p) => p.startsWith('v1='));

      if (!tsMatch || !v1Match) {
        return false;
      }

      const ts = tsMatch.split('=')[1];
      const v1 = v1Match.split('=')[1];

      // Build manifest string
      const manifest = `id:${this.extractIdFromPayload(payload)};request-id:;ts:${ts};`;

      // Create HMAC-SHA256
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', this.webhookSecret);
      hmac.update(manifest);
      const expectedSignature = hmac.digest('hex');

      return v1 === expectedSignature;
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload: unknown): PaymentWebhookEvent | null {
    const event = payload as {
      id: string;
      type: string;
      data: { id: string };
      date_created: string;
    };

    if (!event || !event.id || !event.type) {
      return null;
    }

    return {
      id: event.id,
      provider: 'mercadopago',
      type: event.type,
      data: event.data as unknown as Record<string, unknown>,
      createdAt: new Date(event.date_created),
    };
  }

  // Private helper methods
  private mapPayment(mp: MPPayment): Payment {
    const fees = mp.fee_details?.reduce((sum, fee) => sum + fee.amount, 0) || 0;

    return {
      id: mp.id.toString(),
      tenantId: (mp.metadata?.tenantId as string) || '',
      customerId: mp.payer?.id,
      provider: 'mercadopago',
      providerPaymentId: mp.id.toString(),
      amount: Math.round(mp.transaction_amount * 100), // Convert to cents
      currency: this.reverseCurrencyMap(mp.currency_id),
      status: this.mapPaymentStatus(mp.status),
      description: mp.description,
      metadata: mp.metadata,
      invoiceId: mp.metadata?.invoiceId,
      quoteId: mp.metadata?.quoteId,
      opportunityId: mp.metadata?.opportunityId,
      feeAmount: Math.round(fees * 100),
      netAmount: mp.transaction_details
        ? Math.round(mp.transaction_details.net_received_amount * 100)
        : undefined,
      receiptUrl: mp.point_of_interaction?.transaction_data?.ticket_url,
      failureCode: mp.status === 'rejected' ? mp.status_detail : undefined,
      failureMessage: mp.status === 'rejected' ? this.getStatusDetailMessage(mp.status_detail) : undefined,
      paidAt: mp.date_approved ? new Date(mp.date_approved) : undefined,
      createdAt: new Date(mp.date_created),
      updatedAt: new Date(mp.date_last_updated),
    };
  }

  private mapPaymentStatus(status: string): PaymentStatus {
    switch (status) {
      case 'approved':
        return 'succeeded';
      case 'pending':
      case 'in_process':
        return 'processing';
      case 'authorized':
        return 'pending';
      case 'rejected':
        return 'failed';
      case 'cancelled':
        return 'canceled';
      case 'refunded':
        return 'refunded';
      default:
        return 'pending';
    }
  }

  private mapSubscription(sub: MPSubscription): Subscription {
    const startDate = new Date(sub.auto_recurring.start_date);
    const periodEnd = this.calculatePeriodEnd(
      startDate,
      sub.auto_recurring.frequency,
      sub.auto_recurring.frequency_type
    );

    return {
      id: sub.id,
      tenantId: (sub.metadata?.tenantId as string) || '',
      customerId: sub.payer_id,
      planId: sub.preapproval_plan_id,
      provider: 'mercadopago',
      providerSubscriptionId: sub.id,
      status: this.mapSubscriptionStatus(sub.status),
      currentPeriodStart: startDate,
      currentPeriodEnd: periodEnd,
      trialStart: sub.auto_recurring.free_trial
        ? startDate
        : undefined,
      trialEnd: sub.auto_recurring.free_trial
        ? this.calculatePeriodEnd(
            startDate,
            sub.auto_recurring.free_trial.frequency,
            sub.auto_recurring.free_trial.frequency_type
          )
        : undefined,
      cancelAtPeriodEnd: sub.status === 'cancelled',
      canceledAt: sub.status === 'cancelled' ? new Date(sub.last_modified) : undefined,
      metadata: sub.metadata,
      createdAt: new Date(sub.date_created),
      updatedAt: new Date(sub.last_modified),
    };
  }

  private mapSubscriptionStatus(status: string): SubscriptionStatus {
    switch (status) {
      case 'authorized':
      case 'active':
        return 'active';
      case 'pending':
        return 'incomplete';
      case 'paused':
        return 'paused';
      case 'cancelled':
        return 'canceled';
      default:
        return 'active';
    }
  }

  private mapCurrency(currency: CurrencyCode): string {
    const currencyMap: Record<CurrencyCode, string> = {
      USD: 'USD',
      EUR: 'EUR',
      BRL: 'BRL',
      MXN: 'MXN',
      ARS: 'ARS',
      CLP: 'CLP',
      COP: 'COP',
      PEN: 'PEN',
    };
    return currencyMap[currency] || 'USD';
  }

  private reverseCurrencyMap(mpCurrency: string): CurrencyCode {
    const reverseMap: Record<string, CurrencyCode> = {
      USD: 'USD',
      EUR: 'EUR',
      BRL: 'BRL',
      MXN: 'MXN',
      ARS: 'ARS',
      CLP: 'CLP',
      COP: 'COP',
      PEN: 'PEN',
    };
    return reverseMap[mpCurrency] || 'USD';
  }

  private mapCardFunding(paymentTypeId: string): 'credit' | 'debit' | 'prepaid' {
    switch (paymentTypeId) {
      case 'credit_card':
        return 'credit';
      case 'debit_card':
        return 'debit';
      case 'prepaid_card':
        return 'prepaid';
      default:
        return 'credit';
    }
  }

  private calculatePeriodEnd(
    startDate: Date,
    frequency: number,
    frequencyType: 'days' | 'months'
  ): Date {
    const endDate = new Date(startDate);
    if (frequencyType === 'days') {
      endDate.setDate(endDate.getDate() + frequency);
    } else {
      endDate.setMonth(endDate.getMonth() + frequency);
    }
    return endDate;
  }

  private getStatusDetailMessage(statusDetail: string): string {
    const messages: Record<string, string> = {
      cc_rejected_bad_filled_card_number: 'Invalid card number',
      cc_rejected_bad_filled_date: 'Invalid expiration date',
      cc_rejected_bad_filled_other: 'Invalid card details',
      cc_rejected_bad_filled_security_code: 'Invalid security code',
      cc_rejected_blacklist: 'Card rejected',
      cc_rejected_call_for_authorize: 'Call for authorization required',
      cc_rejected_card_disabled: 'Card is disabled',
      cc_rejected_duplicated_payment: 'Duplicate payment',
      cc_rejected_high_risk: 'Payment rejected due to high risk',
      cc_rejected_insufficient_amount: 'Insufficient funds',
      cc_rejected_invalid_installments: 'Invalid installments',
      cc_rejected_max_attempts: 'Maximum attempts exceeded',
      cc_rejected_other_reason: 'Payment rejected',
    };
    return messages[statusDetail] || 'Payment was rejected';
  }

  private extractIdFromPayload(payload: string): string {
    try {
      const parsed = JSON.parse(payload);
      return parsed.data?.id?.toString() || '';
    } catch {
      return '';
    }
  }
}

/**
 * Stripe Payment Provider
 * Integration with Stripe for payment processing
 */

import Stripe from 'stripe';
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

/**
 * Stripe Payment Provider
 */
export class StripeProvider implements IPaymentProvider {
  readonly name: PaymentProvider = 'stripe';
  private client: Stripe | null = null;
  private webhookSecret: string;

  constructor(config?: { secretKey?: string; webhookSecret?: string }) {
    const secretKey = config?.secretKey || process.env.STRIPE_SECRET_KEY;
    this.webhookSecret = config?.webhookSecret || process.env.STRIPE_WEBHOOK_SECRET || '';

    if (secretKey) {
      this.client = new Stripe(secretKey);
    }
  }

  isAvailable(): boolean {
    return this.client !== null;
  }

  // Customer methods
  async createCustomer(
    tenantId: string,
    data: { email: string; name?: string; metadata?: Record<string, string> }
  ): Promise<{ success: boolean; customerId?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const customer = await this.client.customers.create({
        email: data.email,
        name: data.name,
        metadata: {
          tenantId,
          ...data.metadata,
        },
      });

      return { success: true, customerId: customer.id };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateCustomer(
    customerId: string,
    data: Partial<{ email: string; name?: string; metadata?: Record<string, string> }>
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      await this.client.customers.update(customerId, {
        email: data.email,
        name: data.name,
        metadata: data.metadata,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      await this.client.customers.del(customerId);
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Payment Methods
  async createSetupIntent(
    customerId: string
  ): Promise<{ success: boolean; clientSecret?: string; setupIntentId?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const setupIntent = await this.client.setupIntents.create({
        customer: customerId,
        payment_method_types: ['card'],
      });

      return {
        success: true,
        clientSecret: setupIntent.client_secret || undefined,
        setupIntentId: setupIntent.id,
      };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async attachPaymentMethod(
    customerId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      await this.client.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      await this.client.paymentMethods.detach(paymentMethodId);
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async listPaymentMethods(
    customerId: string
  ): Promise<{ success: boolean; methods?: PaymentMethod[]; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const paymentMethods = await this.client.paymentMethods.list({
        customer: customerId,
        type: 'card',
      });

      const methods: PaymentMethod[] = paymentMethods.data.map((pm) => ({
        id: pm.id,
        tenantId: (pm.metadata?.tenantId as string) || '',
        customerId,
        provider: 'stripe',
        type: 'card',
        providerMethodId: pm.id,
        card: pm.card
          ? {
              brand: pm.card.brand,
              last4: pm.card.last4,
              expMonth: pm.card.exp_month,
              expYear: pm.card.exp_year,
              funding: pm.card.funding as 'credit' | 'debit' | 'prepaid',
            }
          : undefined,
        isDefault: false,
        billingDetails: pm.billing_details
          ? {
              name: pm.billing_details.name || undefined,
              email: pm.billing_details.email || undefined,
              phone: pm.billing_details.phone || undefined,
              address: pm.billing_details.address
                ? {
                    line1: pm.billing_details.address.line1 || undefined,
                    line2: pm.billing_details.address.line2 || undefined,
                    city: pm.billing_details.address.city || undefined,
                    state: pm.billing_details.address.state || undefined,
                    postalCode: pm.billing_details.address.postal_code || undefined,
                    country: pm.billing_details.address.country || undefined,
                  }
                : undefined,
            }
          : undefined,
        createdAt: new Date(pm.created * 1000),
        updatedAt: new Date(pm.created * 1000),
      }));

      return { success: true, methods };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Payments
  async createPaymentIntent(
    input: CreatePaymentInput
  ): Promise<{ success: boolean; clientSecret?: string; paymentIntentId?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const paymentIntent = await this.client.paymentIntents.create({
        amount: input.amount,
        currency: input.currency.toLowerCase(),
        customer: input.customerId,
        description: input.description,
        metadata: {
          ...input.metadata,
          invoiceId: input.invoiceId || '',
          quoteId: input.quoteId || '',
          opportunityId: input.opportunityId || '',
        },
        payment_method: input.paymentMethodId,
        statement_descriptor: input.statementDescriptor?.substring(0, 22),
        return_url: input.returnUrl,
        automatic_payment_methods: input.paymentMethodId
          ? undefined
          : { enabled: true },
      });

      return {
        success: true,
        clientSecret: paymentIntent.client_secret || undefined,
        paymentIntentId: paymentIntent.id,
      };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async confirmPayment(
    paymentIntentId: string,
    paymentMethodId: string
  ): Promise<{ success: boolean; payment?: Payment; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const paymentIntent = await this.client.paymentIntents.confirm(paymentIntentId, {
        payment_method: paymentMethodId,
      });

      return { success: true, payment: this.mapPaymentIntent(paymentIntent) };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async capturePayment(
    paymentIntentId: string,
    amount?: number
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      await this.client.paymentIntents.capture(paymentIntentId, {
        amount_to_capture: amount,
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async cancelPayment(paymentIntentId: string): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      await this.client.paymentIntents.cancel(paymentIntentId);
      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getPayment(
    paymentId: string
  ): Promise<{ success: boolean; payment?: Payment; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const paymentIntent = await this.client.paymentIntents.retrieve(paymentId);
      return { success: true, payment: this.mapPaymentIntent(paymentIntent) };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Refunds
  async createRefund(
    input: RefundInput
  ): Promise<{ success: boolean; refundId?: string; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const refund = await this.client.refunds.create({
        payment_intent: input.paymentId,
        amount: input.amount,
        reason: input.reason as Stripe.RefundCreateParams.Reason,
        metadata: input.metadata,
      });

      return { success: true, refundId: refund.id };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Checkout
  async createCheckoutSession(
    tenantId: string,
    input: CreateCheckoutInput
  ): Promise<{ success: boolean; session?: CheckoutSession; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = input.lineItems.map(
        (item) => ({
          price_data: {
            currency: item.currency.toLowerCase(),
            product_data: {
              name: item.name,
              description: item.description,
              images: item.imageUrl ? [item.imageUrl] : undefined,
            },
            unit_amount: item.amount,
          },
          quantity: item.quantity,
        })
      );

      const session = await this.client.checkout.sessions.create({
        mode: input.mode,
        line_items: lineItems,
        success_url: input.successUrl,
        cancel_url: input.cancelUrl,
        customer: input.customerId,
        customer_email: input.customerEmail,
        metadata: {
          tenantId,
          ...input.metadata,
        },
      });

      return {
        success: true,
        session: {
          id: session.id,
          provider: 'stripe',
          providerSessionId: session.id,
          url: session.url || '',
          expiresAt: new Date(session.expires_at * 1000),
          mode: input.mode,
          customerId: session.customer as string | undefined,
          customerEmail: session.customer_email || undefined,
          lineItems: input.lineItems,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          metadata: input.metadata,
          status: session.status as 'open' | 'complete' | 'expired',
          createdAt: new Date(session.created * 1000),
        },
      };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getCheckoutSession(
    sessionId: string
  ): Promise<{ success: boolean; session?: CheckoutSession; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const session = await this.client.checkout.sessions.retrieve(sessionId);

      return {
        success: true,
        session: {
          id: session.id,
          provider: 'stripe',
          providerSessionId: session.id,
          url: session.url || '',
          expiresAt: new Date(session.expires_at * 1000),
          mode: session.mode as 'payment' | 'subscription' | 'setup',
          customerId: session.customer as string | undefined,
          customerEmail: session.customer_email || undefined,
          lineItems: [],
          successUrl: session.success_url || '',
          cancelUrl: session.cancel_url || '',
          metadata: session.metadata as Record<string, string> | undefined,
          status: session.status as 'open' | 'complete' | 'expired',
          paymentId: session.payment_intent as string | undefined,
          subscriptionId: session.subscription as string | undefined,
          createdAt: new Date(session.created * 1000),
        },
      };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Subscriptions
  async createSubscription(
    input: CreateSubscriptionInput
  ): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const subscription = await this.client.subscriptions.create({
        customer: input.customerId,
        items: [{ price: input.planId }],
        default_payment_method: input.paymentMethodId,
        trial_period_days: input.trialDays,
        metadata: input.metadata,
      });

      return { success: true, subscription: this.mapSubscription(subscription) };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async cancelSubscription(
    subscriptionId: string,
    cancelImmediately?: boolean
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      if (cancelImmediately) {
        await this.client.subscriptions.cancel(subscriptionId);
      } else {
        await this.client.subscriptions.update(subscriptionId, {
          cancel_at_period_end: true,
        });
      }

      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async updateSubscription(
    subscriptionId: string,
    planId: string
  ): Promise<{ success: boolean; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const subscription = await this.client.subscriptions.retrieve(subscriptionId);
      await this.client.subscriptions.update(subscriptionId, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: planId,
          },
        ],
      });

      return { success: true };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async getSubscription(
    subscriptionId: string
  ): Promise<{ success: boolean; subscription?: Subscription; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const subscription = await this.client.subscriptions.retrieve(subscriptionId);
      return { success: true, subscription: this.mapSubscription(subscription) };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Invoices
  async getInvoice(
    invoiceId: string
  ): Promise<{ success: boolean; invoice?: Invoice; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const invoice = await this.client.invoices.retrieve(invoiceId);
      return { success: true, invoice: this.mapInvoice(invoice) };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  async listInvoices(
    customerId: string,
    options?: { limit?: number; startingAfter?: string }
  ): Promise<{ success: boolean; invoices?: Invoice[]; error?: string }> {
    if (!this.client) {
      return { success: false, error: 'Stripe not configured' };
    }

    try {
      const invoices = await this.client.invoices.list({
        customer: customerId,
        limit: options?.limit || 10,
        starting_after: options?.startingAfter,
      });

      return {
        success: true,
        invoices: invoices.data.map((inv) => this.mapInvoice(inv)),
      };
    } catch (error) {
      return { success: false, error: this.getErrorMessage(error) };
    }
  }

  // Webhooks
  verifyWebhookSignature(payload: string, signature: string): boolean {
    if (!this.client || !this.webhookSecret) {
      return false;
    }

    try {
      this.client.webhooks.constructEvent(payload, signature, this.webhookSecret);
      return true;
    } catch {
      return false;
    }
  }

  parseWebhookEvent(payload: unknown): PaymentWebhookEvent | null {
    const event = payload as Stripe.Event;
    if (!event || !event.id || !event.type) {
      return null;
    }

    return {
      id: event.id,
      provider: 'stripe',
      type: event.type,
      data: event.data.object as unknown as Record<string, unknown>,
      createdAt: new Date(event.created * 1000),
    };
  }

  // Private helper methods
  private mapPaymentIntent(pi: Stripe.PaymentIntent): Payment {
    return {
      id: pi.id,
      tenantId: (pi.metadata?.tenantId as string) || '',
      customerId: typeof pi.customer === 'string' ? pi.customer : pi.customer?.id,
      provider: 'stripe',
      providerPaymentId: pi.id,
      providerPaymentIntentId: pi.id,
      amount: pi.amount,
      currency: pi.currency.toUpperCase() as CurrencyCode,
      status: this.mapPaymentStatus(pi.status),
      description: pi.description || undefined,
      statementDescriptor: pi.statement_descriptor || undefined,
      metadata: pi.metadata as Record<string, string>,
      invoiceId: pi.metadata?.invoiceId || undefined,
      quoteId: pi.metadata?.quoteId || undefined,
      opportunityId: pi.metadata?.opportunityId || undefined,
      receiptUrl: (pi.latest_charge as Stripe.Charge | null)?.receipt_url || undefined,
      failureCode: pi.last_payment_error?.code || undefined,
      failureMessage: pi.last_payment_error?.message || undefined,
      paidAt: pi.status === 'succeeded' ? new Date() : undefined,
      createdAt: new Date(pi.created * 1000),
      updatedAt: new Date(),
    };
  }

  private mapPaymentStatus(status: Stripe.PaymentIntent.Status): PaymentStatus {
    switch (status) {
      case 'succeeded':
        return 'succeeded';
      case 'processing':
        return 'processing';
      case 'requires_payment_method':
      case 'requires_confirmation':
      case 'requires_action':
        return 'pending';
      case 'canceled':
        return 'canceled';
      default:
        return 'pending';
    }
  }

  private mapSubscription(sub: Stripe.Subscription): Subscription {
    const subAny = sub as unknown as {
      current_period_start?: number;
      current_period_end?: number;
      created: number;
    };
    return {
      id: sub.id,
      tenantId: (sub.metadata?.tenantId as string) || '',
      customerId: typeof sub.customer === 'string' ? sub.customer : sub.customer.id,
      planId: sub.items.data[0]?.price.id || '',
      provider: 'stripe',
      providerSubscriptionId: sub.id,
      status: this.mapSubscriptionStatus(sub.status),
      currentPeriodStart: subAny.current_period_start ? new Date(subAny.current_period_start * 1000) : new Date(),
      currentPeriodEnd: subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : new Date(),
      trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : undefined,
      trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : undefined,
      cancelReason: sub.cancellation_details?.reason || undefined,
      defaultPaymentMethodId: typeof sub.default_payment_method === 'string'
        ? sub.default_payment_method
        : sub.default_payment_method?.id,
      latestInvoiceId: typeof sub.latest_invoice === 'string'
        ? sub.latest_invoice
        : sub.latest_invoice?.id,
      metadata: sub.metadata as Record<string, string>,
      createdAt: new Date(subAny.created * 1000),
      updatedAt: new Date(),
    };
  }

  private mapSubscriptionStatus(status: Stripe.Subscription.Status): SubscriptionStatus {
    switch (status) {
      case 'active':
        return 'active';
      case 'past_due':
        return 'past_due';
      case 'unpaid':
        return 'unpaid';
      case 'canceled':
        return 'canceled';
      case 'incomplete':
        return 'incomplete';
      case 'incomplete_expired':
        return 'incomplete_expired';
      case 'trialing':
        return 'trialing';
      case 'paused':
        return 'paused';
      default:
        return 'active';
    }
  }

  private mapInvoice(inv: Stripe.Invoice): Invoice {
    // Use type assertion to access properties that might have changed in the API
    const invAny = inv as unknown as {
      subscription?: string | { id: string };
      tax?: number;
      payment_intent?: string | { id: string };
    };
    return {
      id: inv.id,
      tenantId: (inv.metadata?.tenantId as string) || '',
      customerId: typeof inv.customer === 'string' ? inv.customer : inv.customer?.id || '',
      subscriptionId: typeof invAny.subscription === 'string'
        ? invAny.subscription
        : invAny.subscription?.id,
      provider: 'stripe',
      providerInvoiceId: inv.id,
      invoiceNumber: inv.number || '',
      status: inv.status as 'draft' | 'open' | 'paid' | 'uncollectible' | 'void',
      subtotal: inv.subtotal || 0,
      tax: invAny.tax || undefined,
      discount: inv.total_discount_amounts?.reduce((sum: number, d: { amount: number }) => sum + d.amount, 0) || undefined,
      total: inv.total || 0,
      amountPaid: inv.amount_paid || 0,
      amountDue: inv.amount_due || 0,
      currency: (inv.currency?.toUpperCase() || 'USD') as CurrencyCode,
      lineItems:
        inv.lines?.data.map((line: Stripe.InvoiceLineItem) => ({
          description: line.description || '',
          quantity: line.quantity || 1,
          unitAmount: line.amount,
          amount: line.amount,
        })) || [],
      dueDate: inv.due_date ? new Date(inv.due_date * 1000) : undefined,
      paidAt: inv.status_transitions?.paid_at
        ? new Date(inv.status_transitions.paid_at * 1000)
        : undefined,
      invoiceUrl: inv.hosted_invoice_url || undefined,
      invoicePdfUrl: inv.invoice_pdf || undefined,
      paymentIntentId: typeof invAny.payment_intent === 'string'
        ? invAny.payment_intent
        : invAny.payment_intent?.id,
      createdAt: new Date(inv.created * 1000),
      updatedAt: new Date(),
    };
  }

  private getErrorMessage(error: unknown): string {
    if (error instanceof Stripe.errors.StripeError) {
      return error.message;
    }
    return error instanceof Error ? error.message : 'Unknown error';
  }
}

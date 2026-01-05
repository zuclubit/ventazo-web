/**
 * Payment Module Types
 * Types for payment processing with Stripe and MercadoPago
 */

/**
 * Supported payment providers
 */
export type PaymentProvider = 'stripe' | 'mercadopago';

/**
 * Payment status
 */
export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded';

/**
 * Subscription status
 */
export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'paused';

/**
 * Payment method types
 */
export type PaymentMethodType =
  | 'card'
  | 'bank_transfer'
  | 'pix'
  | 'boleto'
  | 'sepa_debit'
  | 'ach_debit';

/**
 * Currency codes (ISO 4217)
 */
export type CurrencyCode = 'USD' | 'EUR' | 'BRL' | 'MXN' | 'ARS' | 'CLP' | 'COP' | 'PEN';

/**
 * Customer for payment processing
 */
export interface PaymentCustomer {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  phone?: string;
  metadata?: Record<string, string>;

  // Provider-specific IDs
  stripeCustomerId?: string;
  mercadopagoCustomerId?: string;

  // Billing address
  billingAddress?: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  };

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment method stored for a customer
 */
export interface PaymentMethod {
  id: string;
  tenantId: string;
  customerId: string;
  provider: PaymentProvider;
  type: PaymentMethodType;

  // Provider-specific ID
  providerMethodId: string;

  // Card details (masked)
  card?: {
    brand: string;
    last4: string;
    expMonth: number;
    expYear: number;
    funding?: 'credit' | 'debit' | 'prepaid';
  };

  // Bank details
  bank?: {
    bankName: string;
    last4: string;
    accountType?: string;
  };

  isDefault: boolean;
  billingDetails?: {
    name?: string;
    email?: string;
    phone?: string;
    address?: PaymentCustomer['billingAddress'];
  };

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Payment intent/transaction
 */
export interface Payment {
  id: string;
  tenantId: string;
  customerId?: string;
  provider: PaymentProvider;

  // Provider-specific IDs
  providerPaymentId: string;
  providerPaymentIntentId?: string;

  // Amount
  amount: number; // In smallest currency unit (cents)
  currency: CurrencyCode;

  // Status
  status: PaymentStatus;

  // Description
  description?: string;
  statementDescriptor?: string;

  // Metadata
  metadata?: Record<string, string>;

  // CRM linkage
  invoiceId?: string;
  quoteId?: string;
  opportunityId?: string;

  // Fees
  feeAmount?: number;
  netAmount?: number;

  // Refund info
  refundedAmount?: number;
  refundReason?: string;

  // Receipt
  receiptUrl?: string;
  receiptNumber?: string;

  // Error info
  failureCode?: string;
  failureMessage?: string;

  // Timestamps
  paidAt?: Date;
  failedAt?: Date;
  refundedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription plan
 */
export interface SubscriptionPlan {
  id: string;
  tenantId: string;
  provider: PaymentProvider;
  providerPlanId: string;
  providerPriceId: string;

  // Plan details
  name: string;
  description?: string;

  // Pricing
  amount: number;
  currency: CurrencyCode;
  interval: 'day' | 'week' | 'month' | 'year';
  intervalCount: number;

  // Trial
  trialDays?: number;

  // Features
  features?: string[];

  // Limits
  limits?: Record<string, number>;

  // Status
  isActive: boolean;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Subscription
 */
export interface Subscription {
  id: string;
  tenantId: string;
  customerId: string;
  planId: string;
  provider: PaymentProvider;

  // Provider-specific ID
  providerSubscriptionId: string;

  // Status
  status: SubscriptionStatus;

  // Period
  currentPeriodStart: Date;
  currentPeriodEnd: Date;

  // Trial
  trialStart?: Date;
  trialEnd?: Date;

  // Cancellation
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  cancelReason?: string;

  // Billing
  defaultPaymentMethodId?: string;
  latestInvoiceId?: string;

  // Metadata
  metadata?: Record<string, string>;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Invoice
 */
export interface Invoice {
  id: string;
  tenantId: string;
  customerId: string;
  subscriptionId?: string;
  provider: PaymentProvider;

  // Provider-specific ID
  providerInvoiceId: string;

  // Invoice details
  invoiceNumber: string;
  status: 'draft' | 'open' | 'paid' | 'uncollectible' | 'void';

  // Amounts
  subtotal: number;
  tax?: number;
  discount?: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: CurrencyCode;

  // Line items
  lineItems: Array<{
    description: string;
    quantity: number;
    unitAmount: number;
    amount: number;
  }>;

  // Dates
  dueDate?: Date;
  paidAt?: Date;

  // URLs
  invoiceUrl?: string;
  invoicePdfUrl?: string;

  // Payment
  paymentIntentId?: string;

  createdAt: Date;
  updatedAt: Date;
}

/**
 * Checkout session
 */
export interface CheckoutSession {
  id: string;
  provider: PaymentProvider;
  providerSessionId: string;

  url: string;
  expiresAt: Date;

  // Mode
  mode: 'payment' | 'subscription' | 'setup';

  // Customer
  customerId?: string;
  customerEmail?: string;

  // Line items
  lineItems: Array<{
    name: string;
    description?: string;
    amount: number;
    currency: CurrencyCode;
    quantity: number;
    imageUrl?: string;
  }>;

  // Success/Cancel URLs
  successUrl: string;
  cancelUrl: string;

  // Metadata
  metadata?: Record<string, string>;

  // Status
  status: 'open' | 'complete' | 'expired';

  // Result
  paymentId?: string;
  subscriptionId?: string;

  createdAt: Date;
}

/**
 * Webhook event
 */
export interface PaymentWebhookEvent {
  id: string;
  provider: PaymentProvider;
  type: string;
  data: Record<string, unknown>;
  processedAt?: Date;
  createdAt: Date;
}

/**
 * Create payment input
 */
export interface CreatePaymentInput {
  amount: number;
  currency: CurrencyCode;
  customerId?: string;
  description?: string;
  metadata?: Record<string, string>;
  invoiceId?: string;
  quoteId?: string;
  opportunityId?: string;
  paymentMethodId?: string;
  returnUrl?: string;
  statementDescriptor?: string;
}

/**
 * Create checkout session input
 */
export interface CreateCheckoutInput {
  mode: 'payment' | 'subscription' | 'setup';
  lineItems: Array<{
    name: string;
    description?: string;
    amount: number;
    currency: CurrencyCode;
    quantity: number;
    imageUrl?: string;
  }>;
  successUrl: string;
  cancelUrl: string;
  customerId?: string;
  customerEmail?: string;
  metadata?: Record<string, string>;
  subscriptionPlanId?: string;
}

/**
 * Create subscription input
 */
export interface CreateSubscriptionInput {
  customerId: string;
  planId: string;
  paymentMethodId?: string;
  trialDays?: number;
  metadata?: Record<string, string>;
}

/**
 * Refund input
 */
export interface RefundInput {
  paymentId: string;
  amount?: number; // Full refund if not specified
  reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';
  metadata?: Record<string, string>;
}

/**
 * Payment provider interface
 */
export interface IPaymentProvider {
  name: PaymentProvider;
  isAvailable(): boolean;

  // Customers
  createCustomer(tenantId: string, data: { email: string; name?: string; metadata?: Record<string, string> }): Promise<{ success: boolean; customerId?: string; error?: string }>;
  updateCustomer(customerId: string, data: Partial<{ email: string; name?: string; metadata?: Record<string, string> }>): Promise<{ success: boolean; error?: string }>;
  deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }>;

  // Payment Methods
  createSetupIntent(customerId: string): Promise<{ success: boolean; clientSecret?: string; setupIntentId?: string; error?: string }>;
  attachPaymentMethod(customerId: string, paymentMethodId: string): Promise<{ success: boolean; error?: string }>;
  detachPaymentMethod(paymentMethodId: string): Promise<{ success: boolean; error?: string }>;
  listPaymentMethods(customerId: string): Promise<{ success: boolean; methods?: PaymentMethod[]; error?: string }>;

  // Payments
  createPaymentIntent(input: CreatePaymentInput): Promise<{ success: boolean; clientSecret?: string; paymentIntentId?: string; error?: string }>;
  confirmPayment(paymentIntentId: string, paymentMethodId: string): Promise<{ success: boolean; payment?: Payment; error?: string }>;
  capturePayment(paymentIntentId: string, amount?: number): Promise<{ success: boolean; error?: string }>;
  cancelPayment(paymentIntentId: string): Promise<{ success: boolean; error?: string }>;
  getPayment(paymentId: string): Promise<{ success: boolean; payment?: Payment; error?: string }>;

  // Refunds
  createRefund(input: RefundInput): Promise<{ success: boolean; refundId?: string; error?: string }>;

  // Checkout
  createCheckoutSession(tenantId: string, input: CreateCheckoutInput): Promise<{ success: boolean; session?: CheckoutSession; error?: string }>;
  getCheckoutSession(sessionId: string): Promise<{ success: boolean; session?: CheckoutSession; error?: string }>;

  // Subscriptions
  createSubscription(input: CreateSubscriptionInput): Promise<{ success: boolean; subscription?: Subscription; error?: string }>;
  cancelSubscription(subscriptionId: string, cancelImmediately?: boolean): Promise<{ success: boolean; error?: string }>;
  updateSubscription(subscriptionId: string, planId: string): Promise<{ success: boolean; error?: string }>;
  getSubscription(subscriptionId: string): Promise<{ success: boolean; subscription?: Subscription; error?: string }>;

  // Invoices
  getInvoice(invoiceId: string): Promise<{ success: boolean; invoice?: Invoice; error?: string }>;
  listInvoices(customerId: string, options?: { limit?: number; startingAfter?: string }): Promise<{ success: boolean; invoices?: Invoice[]; error?: string }>;

  // Webhooks
  verifyWebhookSignature(payload: string, signature: string): boolean;
  parseWebhookEvent(payload: unknown): PaymentWebhookEvent | null;
}

/**
 * Payment provider configuration
 */
export interface PaymentProviderConfig {
  stripe?: {
    secretKey: string;
    publishableKey: string;
    webhookSecret: string;
  };
  mercadopago?: {
    accessToken: string;
    publicKey: string;
    webhookSecret: string;
  };
}

/**
 * Payment analytics
 */
export interface PaymentAnalytics {
  totalRevenue: number;
  totalTransactions: number;
  averageTransactionValue: number;
  successRate: number;
  refundRate: number;
  revenueByPeriod: Array<{
    period: string;
    revenue: number;
    transactions: number;
  }>;
  topPaymentMethods: Array<{
    method: PaymentMethodType;
    count: number;
    amount: number;
  }>;
  subscriptionMetrics?: {
    activeSubscriptions: number;
    mrr: number; // Monthly Recurring Revenue
    churnRate: number;
  };
}

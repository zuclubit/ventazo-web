/**
 * Subscription Types
 * Aligned with backend payment system
 */

// ============================================
// Plan Types
// ============================================

export type PlanTier = 'free' | 'starter' | 'pro' | 'enterprise';

export type BillingInterval = 'monthly' | 'quarterly' | 'yearly';

export type SubscriptionStatus =
  | 'active'
  | 'past_due'
  | 'unpaid'
  | 'canceled'
  | 'incomplete'
  | 'incomplete_expired'
  | 'trialing'
  | 'paused';

export type PaymentStatus =
  | 'pending'
  | 'processing'
  | 'succeeded'
  | 'failed'
  | 'canceled'
  | 'refunded'
  | 'partially_refunded';

// ============================================
// Plan Definition
// ============================================

export interface PlanFeature {
  key: string;
  name: string;
  description?: string;
  included: boolean;
  limit?: number | 'unlimited';
}

export interface PlanLimits {
  users: number | 'unlimited';
  leads: number | 'unlimited';
  storage: number; // in GB
  apiCalls: number | 'unlimited';
  automations: number | 'unlimited';
  customFields: number | 'unlimited';
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  tier: PlanTier;
  description: string;
  price: {
    monthly: number;
    yearly: number;
    currency: string;
  };
  features: PlanFeature[];
  limits: PlanLimits;
  trialDays: number;
  isPopular?: boolean;
  isEnterprise?: boolean;
}

// ============================================
// Subscription
// ============================================

export interface Subscription {
  id: string;
  tenantId: string;
  planId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  billingInterval: BillingInterval;

  // Period info
  currentPeriodStart: string;
  currentPeriodEnd: string;

  // Trial info
  trialStart?: string;
  trialEnd?: string;
  isInTrial: boolean;
  trialDaysRemaining?: number;

  // Cancellation info
  cancelAtPeriodEnd: boolean;
  canceledAt?: string;
  cancelReason?: string;

  // Payment info
  defaultPaymentMethodId?: string;
  latestInvoiceId?: string;

  // Metadata
  createdAt: string;
  updatedAt: string;
}

// ============================================
// Payment Method
// ============================================

export type PaymentMethodType = 'card' | 'bank_transfer' | 'sepa_debit' | 'oxxo' | 'spei';

export interface PaymentMethod {
  id: string;
  type: PaymentMethodType;
  isDefault: boolean;

  // Card details (if type === 'card')
  card?: {
    brand: string; // visa, mastercard, amex, etc.
    last4: string;
    expMonth: number;
    expYear: number;
  };

  // Bank details (if type === 'bank_transfer')
  bank?: {
    bankName: string;
    last4: string;
  };

  createdAt: string;
}

// ============================================
// Invoice
// ============================================

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface InvoiceLineItem {
  id: string;
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  currency: string;
}

export interface Invoice {
  id: string;
  number: string;
  status: InvoiceStatus;

  // Amounts
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;

  // Dates
  periodStart: string;
  periodEnd: string;
  dueDate?: string;
  paidAt?: string;

  // Details
  lineItems: InvoiceLineItem[];
  hostedInvoiceUrl?: string;
  invoicePdf?: string;

  createdAt: string;
}

// ============================================
// Usage & Billing
// ============================================

export interface UsageMetric {
  metric: string;
  label: string;
  used: number;
  limit: number | 'unlimited';
  percentage?: number;
}

export interface BillingOverview {
  subscription: Subscription | null;
  upcomingInvoice?: {
    amount: number;
    currency: string;
    dueDate: string;
  };
  usage: UsageMetric[];
  paymentMethods: PaymentMethod[];
  recentInvoices: Invoice[];
}

// ============================================
// API Request/Response Types
// ============================================

export interface CreateCheckoutSessionRequest {
  planId: string;
  billingInterval: BillingInterval;
  successUrl: string;
  cancelUrl: string;
}

export interface CreateCheckoutSessionResponse {
  sessionId: string;
  url: string;
}

export interface UpdateSubscriptionRequest {
  planId?: string;
  billingInterval?: BillingInterval;
}

export interface CancelSubscriptionRequest {
  cancelAtPeriodEnd?: boolean;
  reason?: string;
}

export interface AddPaymentMethodRequest {
  type: PaymentMethodType;
  setAsDefault?: boolean;
}

export interface SetupIntentResponse {
  clientSecret: string;
}

// ============================================
// Plan Comparison
// ============================================

export interface PlanComparison {
  feature: string;
  category: string;
  free: boolean | string | number;
  starter: boolean | string | number;
  pro: boolean | string | number;
  enterprise: boolean | string | number;
}

// ============================================
// Trial Info
// ============================================

export interface TrialInfo {
  isInTrial: boolean;
  trialEndsAt?: string;
  daysRemaining: number;
  isExpired: boolean;
  canExtend: boolean;
}

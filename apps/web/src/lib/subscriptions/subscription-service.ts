/**
 * Subscription Service
 * Handles all subscription-related API calls
 */

import { apiClient } from '@/lib/api/api-client';

import type {
  Subscription,
  SubscriptionPlan,
  PaymentMethod,
  Invoice,
  BillingOverview,
  CreateCheckoutSessionRequest,
  CreateCheckoutSessionResponse,
  UpdateSubscriptionRequest,
  CancelSubscriptionRequest,
  SetupIntentResponse,
  TrialInfo,
  UsageMetric,
} from './types';

// ============================================
// Plans
// ============================================

/**
 * Get all available subscription plans
 */
export async function getPlans(): Promise<SubscriptionPlan[]> {
  return apiClient.get<SubscriptionPlan[]>('/payments/plans');
}

/**
 * Get a specific plan by ID
 */
export async function getPlan(planId: string): Promise<SubscriptionPlan> {
  return apiClient.get<SubscriptionPlan>(`/payments/plans/${planId}`);
}

// ============================================
// Current Subscription
// ============================================

/**
 * Get current tenant's subscription
 */
export async function getCurrentSubscription(): Promise<Subscription | null> {
  try {
    const subscriptions = await apiClient.get<Subscription[]>('/payments/subscriptions', {
      params: { status: 'active,trialing,past_due' },
    });
    return subscriptions[0] || null;
  } catch (error) {
    console.error('[SubscriptionService] Error fetching subscription:', error);
    return null;
  }
}

/**
 * Get subscription by ID
 */
export async function getSubscription(subscriptionId: string): Promise<Subscription> {
  return apiClient.get<Subscription>(`/payments/subscriptions/${subscriptionId}`);
}

/**
 * Get trial info for current subscription
 */
export async function getTrialInfo(): Promise<TrialInfo> {
  const subscription = await getCurrentSubscription();

  if (!subscription) {
    return {
      isInTrial: false,
      daysRemaining: 0,
      isExpired: false,
      canExtend: false,
    };
  }

  const now = new Date();
  const trialEnd = subscription.trialEnd ? new Date(subscription.trialEnd) : null;

  if (!trialEnd || subscription.status !== 'trialing') {
    return {
      isInTrial: false,
      daysRemaining: 0,
      isExpired: false,
      canExtend: false,
    };
  }

  const daysRemaining = Math.max(0, Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
  const isExpired = now > trialEnd;

  return {
    isInTrial: !isExpired,
    trialEndsAt: subscription.trialEnd,
    daysRemaining,
    isExpired,
    canExtend: daysRemaining <= 3 && !isExpired, // Can extend in last 3 days
  };
}

// ============================================
// Subscription Actions
// ============================================

/**
 * Create a checkout session for new subscription
 */
export async function createCheckoutSession(
  request: CreateCheckoutSessionRequest
): Promise<CreateCheckoutSessionResponse> {
  return apiClient.post<CreateCheckoutSessionResponse>('/payments/checkout/sessions', request);
}

/**
 * Update subscription (change plan or billing interval)
 */
export async function updateSubscription(
  subscriptionId: string,
  request: UpdateSubscriptionRequest
): Promise<Subscription> {
  return apiClient.patch<Subscription>(`/payments/subscriptions/${subscriptionId}`, request);
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(
  subscriptionId: string,
  request: CancelSubscriptionRequest = {}
): Promise<Subscription> {
  return apiClient.post<Subscription>(`/payments/subscriptions/${subscriptionId}/cancel`, request);
}

/**
 * Reactivate a canceled subscription (before period end)
 */
export async function reactivateSubscription(subscriptionId: string): Promise<Subscription> {
  return apiClient.post<Subscription>(`/payments/subscriptions/${subscriptionId}/reactivate`);
}

// ============================================
// Payment Methods
// ============================================

/**
 * Get payment methods for current customer
 */
export async function getPaymentMethods(customerId: string): Promise<PaymentMethod[]> {
  return apiClient.get<PaymentMethod[]>(`/payments/customers/${customerId}/payment-methods`);
}

/**
 * Create setup intent for adding payment method
 */
export async function createSetupIntent(customerId: string): Promise<SetupIntentResponse> {
  return apiClient.post<SetupIntentResponse>(`/payments/customers/${customerId}/setup-intent`);
}

/**
 * Set default payment method
 */
export async function setDefaultPaymentMethod(
  customerId: string,
  paymentMethodId: string
): Promise<void> {
  return apiClient.post(`/payments/customers/${customerId}/default-payment-method`, {
    paymentMethodId,
  });
}

/**
 * Remove payment method
 */
export async function removePaymentMethod(paymentMethodId: string): Promise<void> {
  return apiClient.delete(`/payments/payment-methods/${paymentMethodId}`);
}

// ============================================
// Invoices
// ============================================

/**
 * Get invoices for current customer
 */
export async function getInvoices(
  customerId: string,
  options?: { limit?: number; status?: string }
): Promise<Invoice[]> {
  return apiClient.get<Invoice[]>(`/payments/customers/${customerId}/invoices`, {
    params: options,
  });
}

/**
 * Get a specific invoice
 */
export async function getInvoice(invoiceId: string): Promise<Invoice> {
  return apiClient.get<Invoice>(`/payments/invoices/${invoiceId}`);
}

// ============================================
// Usage & Billing Overview
// ============================================

/**
 * Get current usage metrics
 */
export async function getUsageMetrics(): Promise<UsageMetric[]> {
  try {
    // This would come from a dedicated endpoint
    // For now, return mock data based on tenant settings
    return [
      { metric: 'users', label: 'Usuarios', used: 3, limit: 10, percentage: 30 },
      { metric: 'leads', label: 'Leads', used: 250, limit: 1000, percentage: 25 },
      { metric: 'storage', label: 'Almacenamiento', used: 2.5, limit: 10, percentage: 25 },
      { metric: 'automations', label: 'Automatizaciones', used: 5, limit: 20, percentage: 25 },
    ];
  } catch (error) {
    console.error('[SubscriptionService] Error fetching usage:', error);
    return [];
  }
}

/**
 * Get complete billing overview
 */
export async function getBillingOverview(customerId?: string): Promise<BillingOverview> {
  const subscription = await getCurrentSubscription();

  let paymentMethods: PaymentMethod[] = [];
  let recentInvoices: Invoice[] = [];

  if (customerId) {
    try {
      [paymentMethods, recentInvoices] = await Promise.all([
        getPaymentMethods(customerId),
        getInvoices(customerId, { limit: 5 }),
      ]);
    } catch (error) {
      console.error('[SubscriptionService] Error fetching billing details:', error);
    }
  }

  const usage = await getUsageMetrics();

  // Calculate upcoming invoice from current subscription
  let upcomingInvoice;
  if (subscription && subscription.status !== 'canceled') {
    upcomingInvoice = {
      amount: subscription.plan?.price?.monthly || 0,
      currency: subscription.plan?.price?.currency || 'USD',
      dueDate: subscription.currentPeriodEnd,
    };
  }

  return {
    subscription,
    upcomingInvoice,
    usage,
    paymentMethods,
    recentInvoices,
  };
}

// ============================================
// Customer Portal
// ============================================

/**
 * Create a customer portal session (Stripe Billing Portal)
 */
export async function createPortalSession(returnUrl: string): Promise<{ url: string }> {
  return apiClient.post<{ url: string }>('/payments/portal/sessions', { returnUrl });
}

// ============================================
// Plan Helpers
// ============================================

/**
 * Check if user can upgrade to a plan
 */
export function canUpgradeToPlan(currentPlan: string, targetPlan: string): boolean {
  const hierarchy = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = hierarchy.indexOf(currentPlan);
  const targetIndex = hierarchy.indexOf(targetPlan);
  return targetIndex > currentIndex;
}

/**
 * Check if user can downgrade to a plan
 */
export function canDowngradeToPlan(currentPlan: string, targetPlan: string): boolean {
  const hierarchy = ['free', 'starter', 'pro', 'enterprise'];
  const currentIndex = hierarchy.indexOf(currentPlan);
  const targetIndex = hierarchy.indexOf(targetPlan);
  return targetIndex < currentIndex;
}

/**
 * Get plan change type
 */
export function getPlanChangeType(
  currentPlan: string,
  targetPlan: string
): 'upgrade' | 'downgrade' | 'same' {
  if (canUpgradeToPlan(currentPlan, targetPlan)) return 'upgrade';
  if (canDowngradeToPlan(currentPlan, targetPlan)) return 'downgrade';
  return 'same';
}

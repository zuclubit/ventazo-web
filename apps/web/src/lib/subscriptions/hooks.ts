/**
 * Subscription Hooks
 * React hooks for subscription management
 */

'use client';

import * as React from 'react';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import * as subscriptionService from './subscription-service';
import type {
  Subscription,
  SubscriptionPlan,
  BillingOverview,
  TrialInfo,
  CreateCheckoutSessionRequest,
  UpdateSubscriptionRequest,
  CancelSubscriptionRequest,
} from './types';

// ============================================
// Query Keys
// ============================================

export const subscriptionKeys = {
  all: ['subscriptions'] as const,
  current: () => [...subscriptionKeys.all, 'current'] as const,
  plans: () => [...subscriptionKeys.all, 'plans'] as const,
  plan: (id: string) => [...subscriptionKeys.plans(), id] as const,
  trial: () => [...subscriptionKeys.all, 'trial'] as const,
  billing: () => [...subscriptionKeys.all, 'billing'] as const,
  invoices: (customerId: string) => [...subscriptionKeys.all, 'invoices', customerId] as const,
  paymentMethods: (customerId: string) =>
    [...subscriptionKeys.all, 'payment-methods', customerId] as const,
};

// ============================================
// Plans Hooks
// ============================================

/**
 * Get all available subscription plans
 */
export function usePlans() {
  return useQuery({
    queryKey: subscriptionKeys.plans(),
    queryFn: subscriptionService.getPlans,
    staleTime: 1000 * 60 * 60, // 1 hour - plans don't change often
  });
}

/**
 * Get a specific plan
 */
export function usePlan(planId: string) {
  return useQuery({
    queryKey: subscriptionKeys.plan(planId),
    queryFn: () => subscriptionService.getPlan(planId),
    enabled: !!planId,
    staleTime: 1000 * 60 * 60,
  });
}

// ============================================
// Current Subscription Hook
// ============================================

/**
 * Get current tenant's subscription
 */
export function useSubscription() {
  return useQuery({
    queryKey: subscriptionKeys.current(),
    queryFn: subscriptionService.getCurrentSubscription,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Get trial information
 */
export function useTrialInfo() {
  return useQuery({
    queryKey: subscriptionKeys.trial(),
    queryFn: subscriptionService.getTrialInfo,
    staleTime: 1000 * 60 * 5,
  });
}

/**
 * Get complete billing overview
 */
export function useBillingOverview(customerId?: string) {
  return useQuery({
    queryKey: subscriptionKeys.billing(),
    queryFn: () => subscriptionService.getBillingOverview(customerId),
    staleTime: 1000 * 60 * 5,
  });
}

// ============================================
// Subscription Actions
// ============================================

/**
 * Create checkout session for new subscription
 */
export function useCreateCheckoutSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateCheckoutSessionRequest) =>
      subscriptionService.createCheckoutSession(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
    },
  });
}

/**
 * Update subscription (plan change)
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      request,
    }: {
      subscriptionId: string;
      request: UpdateSubscriptionRequest;
    }) => subscriptionService.updateSubscription(subscriptionId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.billing() });
    },
  });
}

/**
 * Cancel subscription
 */
export function useCancelSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      subscriptionId,
      request,
    }: {
      subscriptionId: string;
      request?: CancelSubscriptionRequest;
    }) => subscriptionService.cancelSubscription(subscriptionId, request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.billing() });
    },
  });
}

/**
 * Reactivate subscription
 */
export function useReactivateSubscription() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (subscriptionId: string) =>
      subscriptionService.reactivateSubscription(subscriptionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.current() });
    },
  });
}

// ============================================
// Payment Methods
// ============================================

/**
 * Get payment methods
 */
export function usePaymentMethods(customerId?: string) {
  return useQuery({
    queryKey: subscriptionKeys.paymentMethods(customerId || ''),
    queryFn: () => subscriptionService.getPaymentMethods(customerId!),
    enabled: !!customerId,
  });
}

/**
 * Create setup intent for adding payment method
 */
export function useCreateSetupIntent() {
  return useMutation({
    mutationFn: (customerId: string) => subscriptionService.createSetupIntent(customerId),
  });
}

/**
 * Set default payment method
 */
export function useSetDefaultPaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ customerId, paymentMethodId }: { customerId: string; paymentMethodId: string }) =>
      subscriptionService.setDefaultPaymentMethod(customerId, paymentMethodId),
    onSuccess: (_, { customerId }) => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.paymentMethods(customerId) });
    },
  });
}

/**
 * Remove payment method
 */
export function useRemovePaymentMethod() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (paymentMethodId: string) =>
      subscriptionService.removePaymentMethod(paymentMethodId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.all });
    },
  });
}

// ============================================
// Invoices
// ============================================

/**
 * Get invoices
 */
export function useInvoices(customerId?: string, options?: { limit?: number; status?: string }) {
  return useQuery({
    queryKey: subscriptionKeys.invoices(customerId || ''),
    queryFn: () => subscriptionService.getInvoices(customerId!, options),
    enabled: !!customerId,
  });
}

// ============================================
// Customer Portal
// ============================================

/**
 * Create customer portal session
 */
export function useCreatePortalSession() {
  return useMutation({
    mutationFn: (returnUrl: string) => subscriptionService.createPortalSession(returnUrl),
  });
}

// ============================================
// Derived State Hooks
// ============================================

/**
 * Check if user is on trial
 */
export function useIsOnTrial(): boolean {
  const { data: trialInfo } = useTrialInfo();
  return trialInfo?.isInTrial ?? false;
}

/**
 * Get current plan tier
 */
export function useCurrentPlanTier(): string {
  const { data: subscription } = useSubscription();
  return subscription?.plan?.tier || 'free';
}

/**
 * Check if subscription is active (not canceled)
 */
export function useIsSubscriptionActive(): boolean {
  const { data: subscription } = useSubscription();

  if (!subscription) return false;

  return ['active', 'trialing', 'past_due'].includes(subscription.status);
}

/**
 * Check if user can access premium features
 */
export function useHasPremiumAccess(): boolean {
  const { data: subscription } = useSubscription();

  if (!subscription) return false;

  const premiumPlans = ['pro', 'enterprise'];
  const activeStatuses = ['active', 'trialing'];

  return (
    premiumPlans.includes(subscription.plan?.tier || '') &&
    activeStatuses.includes(subscription.status)
  );
}

// ============================================
// Trial Banner Hook
// ============================================

/**
 * Get trial banner data (for displaying trial countdown)
 */
export function useTrialBanner() {
  const { data: trialInfo, isLoading } = useTrialInfo();
  const { data: subscription } = useSubscription();

  const shouldShow = React.useMemo(() => {
    if (!trialInfo) return false;
    return trialInfo.isInTrial && trialInfo.daysRemaining <= 7; // Show when 7 days or less remaining
  }, [trialInfo]);

  const urgencyLevel = React.useMemo(() => {
    if (!trialInfo) return 'low';
    if (trialInfo.daysRemaining <= 1) return 'critical';
    if (trialInfo.daysRemaining <= 3) return 'high';
    if (trialInfo.daysRemaining <= 7) return 'medium';
    return 'low';
  }, [trialInfo]);

  return {
    shouldShow,
    daysRemaining: trialInfo?.daysRemaining || 0,
    urgencyLevel,
    isLoading,
    planName: subscription?.plan?.name,
  };
}

'use client';

/**
 * useCustomerHealth Hook - Customer Health Score Calculation v1.0
 *
 * Calculates a customer health score (0-100) based on multiple factors:
 * - Days since last activity (25%)
 * - Payment/revenue status (30%)
 * - Proximity to renewal (20%)
 * - Engagement level (15%)
 * - MRR trend (10%)
 *
 * @module hooks/useCustomerHealth
 */

import * as React from 'react';
import type { Customer, CustomerStatus } from '@/lib/customers';

// ============================================
// Types
// ============================================

export type HealthLevel = 'excellent' | 'good' | 'at_risk' | 'critical';

export interface HealthFactors {
  activityScore: number;      // 0-100, based on days since last activity
  revenueScore: number;       // 0-100, based on MRR and payment status
  renewalScore: number;       // 0-100, based on proximity to renewal
  engagementScore: number;    // 0-100, based on interaction frequency
  trendScore: number;         // 0-100, based on revenue trend
}

export interface CustomerHealthResult {
  score: number;              // Overall score 0-100
  level: HealthLevel;         // Categorical level
  factors: HealthFactors;     // Individual factor scores
  primaryConcern: string | null;  // Main issue if any
  recommendations: string[];  // Actionable recommendations
}

export interface CustomerHealthHook {
  calculateHealth: (customer: Customer) => CustomerHealthResult;
  getHealthLevel: (score: number) => HealthLevel;
  getHealthColor: (level: HealthLevel) => string;
  getHealthBgColor: (level: HealthLevel) => string;
  getHealthBorderColor: (level: HealthLevel) => string;
  getHealthGradient: (level: HealthLevel) => string;
}

// ============================================
// Constants
// ============================================

const WEIGHTS = {
  activity: 0.25,
  revenue: 0.30,
  renewal: 0.20,
  engagement: 0.15,
  trend: 0.10,
};

const THRESHOLDS = {
  excellent: 80,
  good: 60,
  atRisk: 40,
  // Below 40 is critical
};

// Days thresholds for activity scoring
const ACTIVITY_THRESHOLDS = {
  excellent: 7,    // Active within last 7 days
  good: 30,        // Active within last 30 days
  atRisk: 60,      // Active within last 60 days
  // Beyond 60 days is critical
};

// Days thresholds for renewal urgency
const RENEWAL_THRESHOLDS = {
  urgent: 7,       // Less than 7 days
  warning: 30,     // Less than 30 days
  notice: 90,      // Less than 90 days
  // Beyond 90 days is safe
};

// ============================================
// Utility Functions
// ============================================

function daysSince(dateStr: string | undefined | null): number {
  if (!dateStr) return Infinity;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return Infinity;
  }
}

function daysUntil(dateStr: string | undefined | null): number {
  if (!dateStr) return Infinity;
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffTime = date.getTime() - now.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
  } catch {
    return Infinity;
  }
}

// ============================================
// Score Calculation Functions
// ============================================

/**
 * Calculate activity score based on last activity date
 */
function calculateActivityScore(customer: Customer): number {
  const daysSinceActivity = daysSince(customer.updatedAt);

  if (daysSinceActivity <= ACTIVITY_THRESHOLDS.excellent) {
    return 100;
  } else if (daysSinceActivity <= ACTIVITY_THRESHOLDS.good) {
    // Linear interpolation between 100 and 70
    const progress = (daysSinceActivity - ACTIVITY_THRESHOLDS.excellent) /
                     (ACTIVITY_THRESHOLDS.good - ACTIVITY_THRESHOLDS.excellent);
    return Math.round(100 - (progress * 30));
  } else if (daysSinceActivity <= ACTIVITY_THRESHOLDS.atRisk) {
    // Linear interpolation between 70 and 40
    const progress = (daysSinceActivity - ACTIVITY_THRESHOLDS.good) /
                     (ACTIVITY_THRESHOLDS.atRisk - ACTIVITY_THRESHOLDS.good);
    return Math.round(70 - (progress * 30));
  } else {
    // Beyond 60 days, score drops rapidly
    const daysOver = daysSinceActivity - ACTIVITY_THRESHOLDS.atRisk;
    return Math.max(0, Math.round(40 - (daysOver * 0.5)));
  }
}

/**
 * Calculate revenue score based on MRR and contract value
 */
function calculateRevenueScore(customer: Customer): number {
  const { mrr, contractValue, totalRevenue, status } = customer;

  // If churned, revenue score is 0
  if (status === 'churned') return 0;

  // Base score on presence of recurring revenue
  let score = 50;

  // Has MRR - good sign
  if (mrr > 0) {
    score += 25;
  }

  // Has contract value - good sign
  if (contractValue > 0) {
    score += 15;
  }

  // Has generated revenue - very good
  if (totalRevenue > 0) {
    score += 10;
  }

  // Status-based adjustments
  if (status === 'active') {
    score = Math.min(100, score);
  } else if (status === 'at_risk') {
    score = Math.min(60, score * 0.7);
  } else if (status === 'inactive') {
    score = Math.min(40, score * 0.5);
  }

  return Math.round(score);
}

/**
 * Calculate renewal score based on proximity to renewal date
 */
function calculateRenewalScore(customer: Customer): number {
  const { renewalDate, contractEndDate, status } = customer;

  // If churned, renewal is not applicable
  if (status === 'churned') return 0;

  // Use renewal date or contract end date
  const effectiveRenewalDate = renewalDate || contractEndDate;

  // If no renewal date, neutral score
  if (!effectiveRenewalDate) return 70;

  const daysToRenewal = daysUntil(effectiveRenewalDate);

  // Past due - critical
  if (daysToRenewal < 0) {
    return 10;
  }

  // Urgent - within 7 days
  if (daysToRenewal <= RENEWAL_THRESHOLDS.urgent) {
    return 20;
  }

  // Warning - within 30 days
  if (daysToRenewal <= RENEWAL_THRESHOLDS.warning) {
    const progress = daysToRenewal / RENEWAL_THRESHOLDS.warning;
    return Math.round(20 + (progress * 30)); // 20-50
  }

  // Notice - within 90 days
  if (daysToRenewal <= RENEWAL_THRESHOLDS.notice) {
    const progress = (daysToRenewal - RENEWAL_THRESHOLDS.warning) /
                     (RENEWAL_THRESHOLDS.notice - RENEWAL_THRESHOLDS.warning);
    return Math.round(50 + (progress * 30)); // 50-80
  }

  // Beyond 90 days - safe
  return 100;
}

/**
 * Calculate engagement score based on various factors
 */
function calculateEngagementScore(customer: Customer): number {
  const { opportunityCount = 0, taskCount = 0, tags = [], notes } = customer;

  let score = 50; // Base score

  // Has opportunities - engaged
  if (opportunityCount > 0) {
    score += Math.min(20, opportunityCount * 5);
  }

  // Has tasks - active relationship
  if (taskCount > 0) {
    score += Math.min(15, taskCount * 3);
  }

  // Has tags - well categorized
  if (tags.length > 0) {
    score += Math.min(10, tags.length * 2);
  }

  // Has notes - documented relationship
  if (notes && notes.trim().length > 0) {
    score += 5;
  }

  return Math.min(100, Math.round(score));
}

/**
 * Calculate trend score based on revenue trajectory
 * For now, this is simplified - in production would compare against historical data
 */
function calculateTrendScore(customer: Customer): number {
  const { mrr, lifetimeValue, status } = customer;

  // If churned, trend is negative
  if (status === 'churned') return 0;

  // If at risk, trend is concerning
  if (status === 'at_risk') return 30;

  // Base score on LTV/MRR ratio (indicates growth over time)
  if (mrr > 0 && lifetimeValue > 0) {
    const months = lifetimeValue / mrr;
    // More months of value = more stable relationship
    if (months >= 24) return 100;
    if (months >= 12) return 85;
    if (months >= 6) return 70;
    return 55;
  }

  // If no MRR data, neutral score
  return 60;
}

/**
 * Determine primary concern based on factors
 */
function determinePrimaryConcern(factors: HealthFactors, status: CustomerStatus): string | null {
  if (status === 'churned') {
    return 'Cliente perdido';
  }

  const concerns: { factor: keyof HealthFactors; threshold: number; message: string }[] = [
    { factor: 'renewalScore', threshold: 40, message: 'Renovación próxima' },
    { factor: 'activityScore', threshold: 40, message: 'Sin actividad reciente' },
    { factor: 'revenueScore', threshold: 40, message: 'Ingresos en riesgo' },
    { factor: 'engagementScore', threshold: 30, message: 'Bajo engagement' },
    { factor: 'trendScore', threshold: 30, message: 'Tendencia negativa' },
  ];

  for (const concern of concerns) {
    if (factors[concern.factor] < concern.threshold) {
      return concern.message;
    }
  }

  return null;
}

/**
 * Generate recommendations based on health factors
 */
function generateRecommendations(factors: HealthFactors, status: CustomerStatus): string[] {
  const recommendations: string[] = [];

  if (status === 'churned') {
    recommendations.push('Analizar razones del churn');
    recommendations.push('Considerar campaña de win-back');
    return recommendations;
  }

  if (factors.activityScore < 50) {
    recommendations.push('Programar llamada de seguimiento');
  }

  if (factors.renewalScore < 50) {
    recommendations.push('Iniciar proceso de renovación');
  }

  if (factors.engagementScore < 50) {
    recommendations.push('Aumentar touchpoints con el cliente');
  }

  if (factors.revenueScore < 50) {
    recommendations.push('Revisar oportunidades de upsell');
  }

  if (factors.trendScore < 50) {
    recommendations.push('Monitorear satisfacción del cliente');
  }

  if (recommendations.length === 0) {
    recommendations.push('Mantener relación actual');
  }

  return recommendations;
}

// ============================================
// Main Hook
// ============================================

export function useCustomerHealth(): CustomerHealthHook {
  /**
   * Calculate overall health for a customer
   */
  const calculateHealth = React.useCallback((customer: Customer): CustomerHealthResult => {
    // Calculate individual factors
    const factors: HealthFactors = {
      activityScore: calculateActivityScore(customer),
      revenueScore: calculateRevenueScore(customer),
      renewalScore: calculateRenewalScore(customer),
      engagementScore: calculateEngagementScore(customer),
      trendScore: calculateTrendScore(customer),
    };

    // Calculate weighted score
    const score = Math.round(
      factors.activityScore * WEIGHTS.activity +
      factors.revenueScore * WEIGHTS.revenue +
      factors.renewalScore * WEIGHTS.renewal +
      factors.engagementScore * WEIGHTS.engagement +
      factors.trendScore * WEIGHTS.trend
    );

    // Determine level
    const level = getHealthLevel(score);

    // Get primary concern
    const primaryConcern = determinePrimaryConcern(factors, customer.status);

    // Generate recommendations
    const recommendations = generateRecommendations(factors, customer.status);

    return {
      score,
      level,
      factors,
      primaryConcern,
      recommendations,
    };
  }, []);

  /**
   * Get health level from numeric score
   */
  const getHealthLevel = React.useCallback((score: number): HealthLevel => {
    if (score >= THRESHOLDS.excellent) return 'excellent';
    if (score >= THRESHOLDS.good) return 'good';
    if (score >= THRESHOLDS.atRisk) return 'at_risk';
    return 'critical';
  }, []);

  /**
   * Get text color for health level (uses CSS variables)
   */
  const getHealthColor = React.useCallback((level: HealthLevel): string => {
    const colors: Record<HealthLevel, string> = {
      excellent: 'var(--health-excellent)',
      good: 'var(--health-good)',
      at_risk: 'var(--health-at-risk)',
      critical: 'var(--health-critical)',
    };
    return colors[level];
  }, []);

  /**
   * Get background color for health level (uses CSS variables)
   */
  const getHealthBgColor = React.useCallback((level: HealthLevel): string => {
    const colors: Record<HealthLevel, string> = {
      excellent: 'var(--health-excellent-bg)',
      good: 'var(--health-good-bg)',
      at_risk: 'var(--health-at-risk-bg)',
      critical: 'var(--health-critical-bg)',
    };
    return colors[level];
  }, []);

  /**
   * Get border color for health level (uses CSS variables)
   */
  const getHealthBorderColor = React.useCallback((level: HealthLevel): string => {
    const colors: Record<HealthLevel, string> = {
      excellent: 'var(--health-excellent-border)',
      good: 'var(--health-good-border)',
      at_risk: 'var(--health-at-risk-border)',
      critical: 'var(--health-critical-border)',
    };
    return colors[level];
  }, []);

  /**
   * Get gradient for health level (uses CSS variables)
   */
  const getHealthGradient = React.useCallback((level: HealthLevel): string => {
    const gradients: Record<HealthLevel, string> = {
      excellent: 'var(--health-excellent-gradient)',
      good: 'var(--health-good-gradient)',
      at_risk: 'var(--health-at-risk-gradient)',
      critical: 'var(--health-critical-gradient)',
    };
    return gradients[level];
  }, []);

  return {
    calculateHealth,
    getHealthLevel,
    getHealthColor,
    getHealthBgColor,
    getHealthBorderColor,
    getHealthGradient,
  };
}

// ============================================
// Export Types
// ============================================

export type { Customer };

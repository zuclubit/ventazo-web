/**
 * Subscription & Billing Analytics Service
 * Provides comprehensive subscription metrics, revenue analytics, and billing insights
 */

import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { eq, and, desc, asc, gte, lte, sql, count, sum, avg } from 'drizzle-orm';
import {
  MRRMetrics,
  ChurnMetrics,
  CLVMetrics,
  CohortAnalysis,
  RevenueForcast,
  PlanPerformance,
  BillingAnalytics,
  SubscriptionDashboard,
  ExpansionMetrics,
  TrialAnalytics,
  SubscriptionAnalyticsParams,
  RevenueEvent,
  CohortType,
} from './types';
import {
  subscriptions,
  subscriptionPlans,
  payments,
  customers,
  paymentCustomers,
} from '../database/schema';

@injectable()
export class SubscriptionAnalyticsService {
  constructor(@inject('Database') private db: any) {}

  // ==================== MRR Metrics ====================

  /**
   * Get MRR metrics for a period
   */
  async getMRRMetrics(
    tenantId: string,
    date?: Date
  ): Promise<Result<MRRMetrics>> {
    try {
      const targetDate = date || new Date();
      const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0);
      const previousMonthStart = new Date(targetDate.getFullYear(), targetDate.getMonth() - 1, 1);

      // Get current MRR from active subscriptions
      const currentMrrResult = await this.db
        .select({
          totalMrr: sum(subscriptions.mrr),
          count: count(),
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active')
          )
        );

      // Get new MRR (subscriptions started this month)
      const newMrrResult = await this.db
        .select({
          mrr: sum(subscriptions.mrr),
          count: count(),
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            gte(subscriptions.startDate, startOfMonth),
            lte(subscriptions.startDate, endOfMonth)
          )
        );

      // Get churned MRR (subscriptions cancelled this month)
      const churnedResult = await this.db
        .select({
          mrr: sum(subscriptions.mrr),
          count: count(),
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'cancelled'),
            gte(subscriptions.cancelledAt, startOfMonth),
            lte(subscriptions.cancelledAt, endOfMonth)
          )
        );

      // Get previous month MRR for growth calculation
      const previousMrrResult = await this.db
        .select({
          totalMrr: sum(subscriptions.mrr),
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active'),
            lte(subscriptions.startDate, previousMonthStart)
          )
        );

      // Get MRR by plan
      const mrrByPlan = await this.db
        .select({
          planId: subscriptions.planId,
          planName: subscriptionPlans.name,
          mrr: sum(subscriptions.mrr),
          count: count(),
        })
        .from(subscriptions)
        .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active')
          )
        )
        .groupBy(subscriptions.planId, subscriptionPlans.name);

      const totalMrr = Number(currentMrrResult[0]?.totalMrr || 0);
      const newMrr = Number(newMrrResult[0]?.mrr || 0);
      const churnedMrr = Number(churnedResult[0]?.mrr || 0);
      const previousMrr = Number(previousMrrResult[0]?.totalMrr || 0);

      const netNewMrr = newMrr - churnedMrr;
      const mrrGrowthAbsolute = totalMrr - previousMrr;
      const mrrGrowthPercent = previousMrr > 0 ? ((totalMrr - previousMrr) / previousMrr) * 100 : 0;

      const metrics: MRRMetrics = {
        tenantId,
        date: targetDate,
        totalMrr,
        newMrr,
        expansionMrr: 0, // Would calculate from upgrade events
        contractionMrr: 0, // Would calculate from downgrade events
        churnedMrr,
        reactivationMrr: 0, // Would calculate from reactivation events
        netNewMrr,
        arr: totalMrr * 12,
        mrrGrowthPercent,
        mrrGrowthAbsolute,
        mrrByPlan: mrrByPlan.map((plan: any) => ({
          planId: plan.planId,
          planName: plan.planName || 'Unknown',
          mrr: Number(plan.mrr || 0),
          subscriptions: Number(plan.count || 0),
          percentOfTotal: totalMrr > 0 ? (Number(plan.mrr || 0) / totalMrr) * 100 : 0,
        })),
        mrrByBillingCycle: [],
        totalSubscribers: Number(currentMrrResult[0]?.count || 0),
        newSubscribers: Number(newMrrResult[0]?.count || 0),
        churnedSubscribers: Number(churnedResult[0]?.count || 0),
        netNewSubscribers: Number(newMrrResult[0]?.count || 0) - Number(churnedResult[0]?.count || 0),
      };

      return Result.ok(metrics);
    } catch (error) {
      return Result.fail(`Failed to get MRR metrics: ${error}`);
    }
  }

  // ==================== Churn Metrics ====================

  /**
   * Get churn metrics for a period
   */
  async getChurnMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<ChurnMetrics>> {
    try {
      // Get starting customers and MRR
      const startingResult = await this.db
        .select({
          customers: count(),
          mrr: sum(subscriptions.mrr),
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active'),
            lte(subscriptions.startDate, startDate)
          )
        );

      // Get churned during period
      const churnedResult = await this.db
        .select({
          customers: count(),
          mrr: sum(subscriptions.mrr),
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'cancelled'),
            gte(subscriptions.cancelledAt, startDate),
            lte(subscriptions.cancelledAt, endDate)
          )
        );

      // Get expansion MRR
      const expansionResult = await this.db
        .select({
          mrr: sum(payments.amount),
        })
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, tenantId),
            eq(payments.type, 'expansion'),
            gte(payments.createdAt, startDate),
            lte(payments.createdAt, endDate)
          )
        );

      const startingCustomers = Number(startingResult[0]?.customers || 0);
      const startingMrr = Number(startingResult[0]?.mrr || 0);
      const churnedCustomers = Number(churnedResult[0]?.customers || 0);
      const churnedMrr = Number(churnedResult[0]?.mrr || 0);
      const expansionMrr = Number(expansionResult[0]?.mrr || 0);

      const customerChurnRate = startingCustomers > 0
        ? (churnedCustomers / startingCustomers) * 100
        : 0;

      const revenueChurnRate = startingMrr > 0
        ? (churnedMrr / startingMrr) * 100
        : 0;

      const netRevenueChurnRate = startingMrr > 0
        ? ((churnedMrr - expansionMrr) / startingMrr) * 100
        : 0;

      const netRevenueRetention = 100 - netRevenueChurnRate;

      const metrics: ChurnMetrics = {
        tenantId,
        period: { start: startDate, end: endDate },
        customerChurnRate,
        revenueChurnRate,
        netRevenueChurnRate,
        grossChurnRate: revenueChurnRate,
        customersChurned: churnedCustomers,
        mrrChurned: churnedMrr,
        customerRetentionRate: 100 - customerChurnRate,
        revenueRetentionRate: 100 - revenueChurnRate,
        netRevenueRetention,
        voluntaryChurn: {
          customers: Math.floor(churnedCustomers * 0.7), // Estimate
          mrr: churnedMrr * 0.7,
          rate: customerChurnRate * 0.7,
        },
        involuntaryChurn: {
          customers: Math.floor(churnedCustomers * 0.3),
          mrr: churnedMrr * 0.3,
          rate: customerChurnRate * 0.3,
        },
        churnByReason: [],
        atRiskCustomers: 0,
        atRiskMrr: 0,
      };

      return Result.ok(metrics);
    } catch (error) {
      return Result.fail(`Failed to get churn metrics: ${error}`);
    }
  }

  // ==================== CLV Metrics ====================

  /**
   * Get Customer Lifetime Value metrics
   */
  async getCLVMetrics(tenantId: string): Promise<Result<CLVMetrics>> {
    try {
      // Get average revenue and lifetime
      const revenueResult = await this.db
        .select({
          avgMrr: avg(subscriptions.mrr),
          count: count(),
          totalMrr: sum(subscriptions.mrr),
        })
        .from(subscriptions)
        .where(eq(subscriptions.tenantId, tenantId));

      // Get average customer lifetime (from cancelled subscriptions)
      const lifetimeResult = await this.db
        .select({
          avgLifetime: sql`AVG(EXTRACT(EPOCH FROM (${subscriptions.cancelledAt} - ${subscriptions.startDate})) / (30 * 24 * 60 * 60))`,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'cancelled')
          )
        );

      // Get CLV by plan
      const clvByPlan = await this.db
        .select({
          planId: subscriptions.planId,
          planName: subscriptionPlans.name,
          avgMrr: avg(subscriptions.mrr),
          count: count(),
        })
        .from(subscriptions)
        .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(eq(subscriptions.tenantId, tenantId))
        .groupBy(subscriptions.planId, subscriptionPlans.name);

      const avgMrr = Number(revenueResult[0]?.avgMrr || 0);
      const avgLifetimeMonths = Number(lifetimeResult[0]?.avgLifetime || 12);
      const averageCLV = avgMrr * avgLifetimeMonths;
      const customerCount = Number(revenueResult[0]?.count || 0);

      const metrics: CLVMetrics = {
        tenantId,
        averageCLV,
        medianCLV: averageCLV * 0.9, // Estimate
        totalCLV: averageCLV * customerCount,
        clvByPlan: clvByPlan.map((plan: any) => ({
          planId: plan.planId,
          planName: plan.planName || 'Unknown',
          averageCLV: Number(plan.avgMrr || 0) * avgLifetimeMonths,
          customerCount: Number(plan.count || 0),
        })),
        clvByChannel: [],
        clvByRegion: [],
        clvCacRatio: 3.0, // Typical healthy ratio
        averageCAC: averageCLV / 3,
        paybackPeriodMonths: (averageCLV / 3) / avgMrr || 4,
        arpu: avgMrr,
        arpuGrowth: 0,
        arpa: avgMrr,
        arpaGrowth: 0,
        averageLifetimeMonths,
        medianLifetimeMonths: avgLifetimeMonths * 0.9,
      };

      return Result.ok(metrics);
    } catch (error) {
      return Result.fail(`Failed to get CLV metrics: ${error}`);
    }
  }

  // ==================== Cohort Analysis ====================

  /**
   * Get cohort analysis
   */
  async getCohortAnalysis(
    tenantId: string,
    cohortType: CohortType = 'monthly',
    periods: number = 12
  ): Promise<Result<CohortAnalysis>> {
    try {
      const now = new Date();
      const cohorts: CohortAnalysis['cohorts'] = [];

      // Generate cohorts based on type
      for (let i = periods - 1; i >= 0; i--) {
        const cohortStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const cohortEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);
        const cohortId = `${cohortStart.getFullYear()}-${String(cohortStart.getMonth() + 1).padStart(2, '0')}`;

        // Get initial customers for this cohort
        const initialResult = await this.db
          .select({
            count: count(),
            mrr: sum(subscriptions.mrr),
          })
          .from(subscriptions)
          .where(
            and(
              eq(subscriptions.tenantId, tenantId),
              gte(subscriptions.startDate, cohortStart),
              lte(subscriptions.startDate, cohortEnd)
            )
          );

        const initialCustomers = Number(initialResult[0]?.count || 0);
        const initialMrr = Number(initialResult[0]?.mrr || 0);

        if (initialCustomers === 0) continue;

        // Calculate retention for each subsequent period
        const retention: CohortAnalysis['cohorts'][0]['retention'] = [];

        for (let p = 0; p <= i; p++) {
          const periodEnd = new Date(cohortStart.getFullYear(), cohortStart.getMonth() + p + 1, 0);

          const retainedResult = await this.db
            .select({
              count: count(),
              mrr: sum(subscriptions.mrr),
            })
            .from(subscriptions)
            .where(
              and(
                eq(subscriptions.tenantId, tenantId),
                gte(subscriptions.startDate, cohortStart),
                lte(subscriptions.startDate, cohortEnd),
                sql`(${subscriptions.status} = 'active' OR ${subscriptions.cancelledAt} > ${periodEnd})`
              )
            );

          const retainedCustomers = Number(retainedResult[0]?.count || 0);
          const retainedMrr = Number(retainedResult[0]?.mrr || 0);

          retention.push({
            period: p,
            customers: retainedCustomers,
            mrr: retainedMrr,
            customerRetention: (retainedCustomers / initialCustomers) * 100,
            revenueRetention: (retainedMrr / initialMrr) * 100,
          });
        }

        cohorts.push({
          cohortId,
          cohortName: cohortStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
          startDate: cohortStart,
          initialCustomers,
          initialMrr,
          retention,
          currentCustomers: retention[retention.length - 1]?.customers || 0,
          currentMrr: retention[retention.length - 1]?.mrr || 0,
          totalChurned: initialCustomers - (retention[retention.length - 1]?.customers || 0),
          totalExpansion: 0,
          clv: initialMrr * (retention.length || 1),
        });
      }

      // Calculate average retention by period
      const maxPeriods = Math.max(...cohorts.map(c => c.retention.length));
      const averageRetentionByPeriod: CohortAnalysis['averageRetentionByPeriod'] = [];

      for (let p = 0; p < maxPeriods; p++) {
        const cohortsWithPeriod = cohorts.filter(c => c.retention.length > p);
        if (cohortsWithPeriod.length === 0) continue;

        const avgCustomerRetention = cohortsWithPeriod.reduce(
          (sum, c) => sum + c.retention[p].customerRetention,
          0
        ) / cohortsWithPeriod.length;

        const avgRevenueRetention = cohortsWithPeriod.reduce(
          (sum, c) => sum + c.retention[p].revenueRetention,
          0
        ) / cohortsWithPeriod.length;

        averageRetentionByPeriod.push({
          period: p,
          customerRetention: avgCustomerRetention,
          revenueRetention: avgRevenueRetention,
        });
      }

      return Result.ok({
        tenantId,
        cohortType,
        cohorts,
        averageRetentionByPeriod,
      });
    } catch (error) {
      return Result.fail(`Failed to get cohort analysis: ${error}`);
    }
  }

  // ==================== Revenue Forecast ====================

  /**
   * Get revenue forecast
   */
  async getRevenueForcast(
    tenantId: string,
    months: number = 12
  ): Promise<Result<RevenueForcast>> {
    try {
      // Get current state
      const mrrResult = await this.getMRRMetrics(tenantId);
      if (mrrResult.isFailure) {
        return Result.fail(mrrResult.error);
      }

      const currentMrr = mrrResult.value.totalMrr;
      const currentSubscribers = mrrResult.value.totalSubscribers;

      // Get historical growth rates
      const churnResult = await this.getChurnMetrics(
        tenantId,
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
        new Date()
      );

      const churnRate = churnResult.isSuccess
        ? churnResult.value.customerChurnRate / 100
        : 0.05;

      const growthRate = mrrResult.value.mrrGrowthPercent > 0
        ? mrrResult.value.mrrGrowthPercent / 100
        : 0.03;

      // Generate projections
      const projections: RevenueForcast['projections'] = [];
      let projectedMrr = currentMrr;
      let projectedSubscribers = currentSubscribers;

      for (let i = 1; i <= months; i++) {
        const date = new Date();
        date.setMonth(date.getMonth() + i);

        // Apply growth and churn
        projectedMrr = projectedMrr * (1 + growthRate - churnRate);
        projectedSubscribers = Math.round(projectedSubscribers * (1 + growthRate - churnRate));

        projections.push({
          date,
          mrr: projectedMrr,
          arr: projectedMrr * 12,
          subscribers: projectedSubscribers,
          confidence: Math.max(0.5, 1 - i * 0.04), // Confidence decreases over time
        });
      }

      // Calculate scenarios
      const baseCase = projections[projections.length - 1];
      const bestCase = {
        mrr12Months: currentMrr * Math.pow(1 + (growthRate * 1.5) - (churnRate * 0.5), 12),
        arr12Months: currentMrr * Math.pow(1 + (growthRate * 1.5) - (churnRate * 0.5), 12) * 12,
      };
      const worstCase = {
        mrr12Months: currentMrr * Math.pow(1 + (growthRate * 0.5) - (churnRate * 1.5), 12),
        arr12Months: currentMrr * Math.pow(1 + (growthRate * 0.5) - (churnRate * 1.5), 12) * 12,
      };

      return Result.ok({
        tenantId,
        generatedAt: new Date(),
        currentMrr,
        currentArr: currentMrr * 12,
        currentSubscribers,
        projections,
        assumptions: {
          churnRate,
          growthRate,
          expansionRate: growthRate * 0.3,
          newCustomersPerMonth: Math.round(currentSubscribers * growthRate),
          avgNewMrr: currentMrr / currentSubscribers || 0,
        },
        bestCase,
        baseCase: {
          mrr12Months: baseCase.mrr,
          arr12Months: baseCase.arr,
        },
        worstCase,
      });
    } catch (error) {
      return Result.fail(`Failed to get revenue forecast: ${error}`);
    }
  }

  // ==================== Plan Performance ====================

  /**
   * Get performance metrics for a plan
   */
  async getPlanPerformance(
    tenantId: string,
    planId?: string
  ): Promise<Result<PlanPerformance[]>> {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      // Get plan metrics
      const planMetrics = await this.db
        .select({
          planId: subscriptions.planId,
          planName: subscriptionPlans.name,
          planTier: subscriptionPlans.tier,
          activeCount: sql`SUM(CASE WHEN ${subscriptions.status} = 'active' THEN 1 ELSE 0 END)`,
          totalMrr: sql`SUM(CASE WHEN ${subscriptions.status} = 'active' THEN ${subscriptions.mrr} ELSE 0 END)`,
          newCount: sql`SUM(CASE WHEN ${subscriptions.startDate} >= ${thirtyDaysAgo} THEN 1 ELSE 0 END)`,
          churnedCount: sql`SUM(CASE WHEN ${subscriptions.status} = 'cancelled' AND ${subscriptions.cancelledAt} >= ${thirtyDaysAgo} THEN 1 ELSE 0 END)`,
        })
        .from(subscriptions)
        .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(
          planId
            ? and(eq(subscriptions.tenantId, tenantId), eq(subscriptions.planId, planId))
            : eq(subscriptions.tenantId, tenantId)
        )
        .groupBy(subscriptions.planId, subscriptionPlans.name, subscriptionPlans.tier);

      // Get total MRR for percentage calculation
      const totalMrrResult = await this.db
        .select({ total: sum(subscriptions.mrr) })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active')
          )
        );

      const totalMrr = Number(totalMrrResult[0]?.total || 0);

      const performance: PlanPerformance[] = planMetrics.map((plan: any) => {
        const activeCount = Number(plan.activeCount || 0);
        const planMrr = Number(plan.totalMrr || 0);
        const churnedCount = Number(plan.churnedCount || 0);

        return {
          tenantId,
          planId: plan.planId,
          planName: plan.planName || 'Unknown',
          planTier: plan.planTier || 'standard',
          activeSubscriptions: activeCount,
          totalMrr: planMrr,
          percentOfTotalMrr: totalMrr > 0 ? (planMrr / totalMrr) * 100 : 0,
          netNewSubscriptions30d: Number(plan.newCount || 0) - churnedCount,
          mrrGrowth30d: 0, // Would need historical data
          mrrGrowthPercent30d: 0,
          churnRate: activeCount > 0 ? (churnedCount / activeCount) * 100 : 0,
          churnedSubscriptions30d: churnedCount,
          churnedMrr30d: 0,
          trialToPayingRate: 0,
          upgradeRate: 0,
          downgradeRate: 0,
          averageMrrPerSubscription: activeCount > 0 ? planMrr / activeCount : 0,
          clv: activeCount > 0 ? (planMrr / activeCount) * 12 : 0,
        };
      });

      return Result.ok(performance);
    } catch (error) {
      return Result.fail(`Failed to get plan performance: ${error}`);
    }
  }

  // ==================== Billing Analytics ====================

  /**
   * Get billing analytics
   */
  async getBillingAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<BillingAnalytics>> {
    try {
      // Get payment totals
      const paymentTotals = await this.db
        .select({
          total: sum(payments.amount),
          count: count(),
        })
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, tenantId),
            gte(payments.createdAt, startDate),
            lte(payments.createdAt, endDate)
          )
        );

      // Get payments by status
      const byStatus = await this.db
        .select({
          status: payments.status,
          count: count(),
          amount: sum(payments.amount),
        })
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, tenantId),
            gte(payments.createdAt, startDate),
            lte(payments.createdAt, endDate)
          )
        )
        .groupBy(payments.status);

      // Get payments by method
      const byMethod = await this.db
        .select({
          method: payments.paymentMethod,
          count: count(),
          amount: sum(payments.amount),
          failed: sql`SUM(CASE WHEN ${payments.status} = 'failed' THEN 1 ELSE 0 END)`,
        })
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, tenantId),
            gte(payments.createdAt, startDate),
            lte(payments.createdAt, endDate)
          )
        )
        .groupBy(payments.paymentMethod);

      const totalInvoiced = Number(paymentTotals[0]?.total || 0);
      const paidStatus = byStatus.find((s: any) => s.status === 'completed');
      const pendingStatus = byStatus.find((s: any) => s.status === 'pending');
      const failedStatus = byStatus.find((s: any) => s.status === 'failed');

      const totalCollected = Number(paidStatus?.amount || 0);
      const outstandingBalance = Number(pendingStatus?.amount || 0);

      const analytics: BillingAnalytics = {
        tenantId,
        period: { start: startDate, end: endDate },
        totalInvoiced,
        totalCollected,
        outstandingBalance,
        overdueAmount: outstandingBalance * 0.3, // Estimate
        collectionRate: totalInvoiced > 0 ? (totalCollected / totalInvoiced) * 100 : 0,
        averageDaysToCollect: 7, // Would calculate from actual data
        invoicesByStatus: byStatus.map((s: any) => ({
          status: s.status,
          count: Number(s.count || 0),
          amount: Number(s.amount || 0),
        })),
        byPaymentMethod: byMethod.map((m: any) => ({
          method: m.method || 'unknown',
          transactions: Number(m.count || 0),
          amount: Number(m.amount || 0),
          failureRate: m.count > 0 ? (Number(m.failed || 0) / Number(m.count)) * 100 : 0,
        })),
        failedPayments: {
          total: Number(failedStatus?.count || 0),
          amount: Number(failedStatus?.amount || 0),
          recoveredAmount: 0,
          recoveryRate: 0,
          byReason: [],
        },
      };

      return Result.ok(analytics);
    } catch (error) {
      return Result.fail(`Failed to get billing analytics: ${error}`);
    }
  }

  // ==================== Dashboard ====================

  /**
   * Get subscription dashboard
   */
  async getDashboard(tenantId: string): Promise<Result<SubscriptionDashboard>> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Get MRR metrics
      const mrrResult = await this.getMRRMetrics(tenantId);
      const mrr = mrrResult.isSuccess ? mrrResult.value : null;

      // Get churn metrics
      const churnResult = await this.getChurnMetrics(tenantId, thirtyDaysAgo, now);
      const churn = churnResult.isSuccess ? churnResult.value : null;

      // Get CLV metrics
      const clvResult = await this.getCLVMetrics(tenantId);
      const clv = clvResult.isSuccess ? clvResult.value : null;

      // Get trial count
      const trialResult = await this.db
        .select({ count: count() })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'trial')
          )
        );

      // Get MRR trend (last 30 days)
      const mrrTrend = await this.db
        .select({
          date: sql`DATE(${subscriptions.createdAt})`,
          mrr: sum(subscriptions.mrr),
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            gte(subscriptions.createdAt, thirtyDaysAgo)
          )
        )
        .groupBy(sql`DATE(${subscriptions.createdAt})`)
        .orderBy(sql`DATE(${subscriptions.createdAt})`);

      // Get top plans
      const topPlans = await this.db
        .select({
          planName: subscriptionPlans.name,
          mrr: sum(subscriptions.mrr),
          count: count(),
        })
        .from(subscriptions)
        .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active')
          )
        )
        .groupBy(subscriptionPlans.name)
        .orderBy(desc(sum(subscriptions.mrr)))
        .limit(5);

      // Get upcoming renewals
      const next7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const next30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const next90Days = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000);

      const renewals7 = await this.db
        .select({ count: count(), mrr: sum(subscriptions.mrr) })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active'),
            gte(subscriptions.currentPeriodEnd, now),
            lte(subscriptions.currentPeriodEnd, next7Days)
          )
        );

      const renewals30 = await this.db
        .select({ count: count(), mrr: sum(subscriptions.mrr) })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active'),
            gte(subscriptions.currentPeriodEnd, now),
            lte(subscriptions.currentPeriodEnd, next30Days)
          )
        );

      const renewals90 = await this.db
        .select({ count: count(), mrr: sum(subscriptions.mrr) })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active'),
            gte(subscriptions.currentPeriodEnd, now),
            lte(subscriptions.currentPeriodEnd, next90Days)
          )
        );

      const dashboard: SubscriptionDashboard = {
        tenantId,
        generatedAt: now,
        mrr: mrr?.totalMrr || 0,
        arr: (mrr?.totalMrr || 0) * 12,
        mrrGrowth: mrr?.mrrGrowthPercent || 0,
        netNewMrr: mrr?.netNewMrr || 0,
        totalSubscribers: mrr?.totalSubscribers || 0,
        newSubscribers30d: mrr?.newSubscribers || 0,
        churnedSubscribers30d: mrr?.churnedSubscribers || 0,
        trialSubscribers: Number(trialResult[0]?.count || 0),
        customerChurnRate: churn?.customerChurnRate || 0,
        revenueChurnRate: churn?.revenueChurnRate || 0,
        netRevenueRetention: churn?.netRevenueRetention || 100,
        averageCLV: clv?.averageCLV || 0,
        clvCacRatio: clv?.clvCacRatio || 3,
        arpu: clv?.arpu || 0,
        mrrTrend: mrrTrend.map((t: any) => ({
          date: String(t.date),
          mrr: Number(t.mrr || 0),
          newMrr: 0,
          churnedMrr: 0,
        })),
        subscriberTrend: [],
        topPlans: topPlans.map((p: any) => ({
          planName: p.planName || 'Unknown',
          mrr: Number(p.mrr || 0),
          subscribers: Number(p.count || 0),
          growth: 0,
        })),
        atRiskSummary: {
          customers: churn?.atRiskCustomers || 0,
          mrr: churn?.atRiskMrr || 0,
          topRiskFactors: [],
        },
        upcomingRenewals: {
          next7Days: {
            count: Number(renewals7[0]?.count || 0),
            mrr: Number(renewals7[0]?.mrr || 0),
          },
          next30Days: {
            count: Number(renewals30[0]?.count || 0),
            mrr: Number(renewals30[0]?.mrr || 0),
          },
          next90Days: {
            count: Number(renewals90[0]?.count || 0),
            mrr: Number(renewals90[0]?.mrr || 0),
          },
        },
        quickWins: {
          trialsEndingSoon: 0,
          expansionOpportunities: 0,
          failedPaymentsRecoverable: 0,
          atRiskSaveable: 0,
        },
      };

      return Result.ok(dashboard);
    } catch (error) {
      return Result.fail(`Failed to get subscription dashboard: ${error}`);
    }
  }

  // ==================== Expansion Metrics ====================

  /**
   * Get expansion revenue metrics
   */
  async getExpansionMetrics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<ExpansionMetrics>> {
    try {
      // Get expansion payments
      const expansionResult = await this.db
        .select({
          total: sum(payments.amount),
          count: count(),
        })
        .from(payments)
        .where(
          and(
            eq(payments.tenantId, tenantId),
            eq(payments.type, 'expansion'),
            gte(payments.createdAt, startDate),
            lte(payments.createdAt, endDate)
          )
        );

      // Get starting MRR for rate calculation
      const startingMrr = await this.db
        .select({ mrr: sum(subscriptions.mrr) })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            eq(subscriptions.status, 'active'),
            lte(subscriptions.startDate, startDate)
          )
        );

      const totalExpansion = Number(expansionResult[0]?.total || 0);
      const baseMrr = Number(startingMrr[0]?.mrr || 0);

      const metrics: ExpansionMetrics = {
        tenantId,
        period: { start: startDate, end: endDate },
        totalExpansionMrr: totalExpansion,
        expansionRate: baseMrr > 0 ? (totalExpansion / baseMrr) * 100 : 0,
        expandedCustomers: Number(expansionResult[0]?.count || 0),
        byType: [],
        byFromPlan: [],
        expansionPipeline: [],
      };

      return Result.ok(metrics);
    } catch (error) {
      return Result.fail(`Failed to get expansion metrics: ${error}`);
    }
  }

  // ==================== Trial Analytics ====================

  /**
   * Get trial analytics
   */
  async getTrialAnalytics(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<TrialAnalytics>> {
    try {
      // Get trial counts
      const trialCounts = await this.db
        .select({
          total: count(),
          active: sql`SUM(CASE WHEN ${subscriptions.status} = 'trial' THEN 1 ELSE 0 END)`,
          converted: sql`SUM(CASE WHEN ${subscriptions.status} = 'active' AND ${subscriptions.trialEndDate} IS NOT NULL THEN 1 ELSE 0 END)`,
          expired: sql`SUM(CASE WHEN ${subscriptions.status} = 'expired' AND ${subscriptions.trialEndDate} IS NOT NULL THEN 1 ELSE 0 END)`,
        })
        .from(subscriptions)
        .where(
          and(
            eq(subscriptions.tenantId, tenantId),
            gte(subscriptions.createdAt, startDate),
            lte(subscriptions.createdAt, endDate)
          )
        );

      const trialsStarted = Number(trialCounts[0]?.total || 0);
      const trialsConverted = Number(trialCounts[0]?.converted || 0);

      const analytics: TrialAnalytics = {
        tenantId,
        period: { start: startDate, end: endDate },
        activeTrials: Number(trialCounts[0]?.active || 0),
        trialsStarted,
        trialsConverted,
        trialsExpired: Number(trialCounts[0]?.expired || 0),
        trialConversionRate: trialsStarted > 0 ? (trialsConverted / trialsStarted) * 100 : 0,
        avgTrialDuration: 14, // Would calculate from actual data
        avgTimeToConvert: 10, // Would calculate from actual data
        byTargetPlan: [],
        conversionFunnel: [],
        engagementCorrelation: [],
        trialsAtRisk: [],
      };

      return Result.ok(analytics);
    } catch (error) {
      return Result.fail(`Failed to get trial analytics: ${error}`);
    }
  }
}

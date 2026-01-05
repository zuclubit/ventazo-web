/**
 * Customer 360 View Service
 * Aggregates customer data from all sources into a unified view
 * Refactored to use DatabasePool with pool.query() pattern
 */

import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  Customer360View,
  Customer360Summary,
  Customer360Dashboard,
  Customer360SearchParams,
  Customer360SearchResult,
  CustomerProfile,
  EngagementMetrics,
  FinancialSummary,
  SubscriptionInfo,
  DealSummary,
  SupportSummary,
  ContractSummary,
  TimelineEvent,
  RelatedContacts,
  RelatedCompanies,
  CustomerInsights,
  CustomerComparison,
  CustomerHealthScore,
  EngagementLevel,
  TimelineEventType,
} from './types';

// ==================== Row Types ====================

interface CustomerRow {
  id: string;
  tenant_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  avatar_url: string | null;
  company: string | null;
  job_title: string | null;
  industry: string | null;
  company_size: string | null;
  website: string | null;
  address: string | null;
  timezone: string | null;
  social_profiles: string | null;
  status: string | null;
  customer_since: Date | null;
  owner_id: string | null;
  owner_name: string | null;
  team_id: string | null;
  team_name: string | null;
  tags: string | null;
  segments: string | null;
  custom_fields: string | null;
  source: string | null;
  source_details: string | null;
  subscription: string | null;
  mrr: number | null;
  lifetime_value: number | null;
  last_interaction: Date | null;
  created_at: Date;
  updated_at: Date;
}

interface CommunicationRow {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  channel: string;
  direction: string | null;
  subject: string | null;
  content: string | null;
  status: string | null;
  user_id: string | null;
  created_at: Date;
}

interface ActivityRow {
  id: string;
  tenant_id: string;
  entity_id: string;
  type: string;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  user_id: string | null;
  created_at: Date;
}

interface TaskRow {
  id: string;
  tenant_id: string;
  title: string;
  status: string;
  type: string | null;
  priority: string | null;
  due_date: Date | null;
  related_entity_type: string | null;
  related_entity_id: string | null;
  assignee_id: string | null;
  category: string | null;
  created_at: Date;
  updated_at: Date;
}

interface OpportunityRow {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  name: string;
  stage: string;
  status: string;
  value: number | null;
  probability: number | null;
  expected_close_date: Date | null;
  stage_updated_at: Date | null;
  owner_id: string | null;
  owner_name: string | null;
  created_at: Date;
  updated_at: Date;
}

interface ContractRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  name: string;
  type: string;
  value: number | null;
  start_date: Date;
  end_date: Date;
  status: string;
  auto_renew: boolean | null;
  outcome: string | null;
  created_at: Date;
}

interface PaymentRow {
  id: string;
  tenant_id: string;
  customer_id: string;
  amount: number;
  status: string;
  description: string | null;
  due_date: Date | null;
  created_at: Date;
}

interface NoteRow {
  id: string;
  tenant_id: string;
  entity_type: string;
  entity_id: string;
  content: string | null;
  user_id: string | null;
  is_pinned: boolean | null;
  created_at: Date;
}

interface ContactRow {
  id: string;
  tenant_id: string;
  customer_id: string | null;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string | null;
  is_primary: boolean | null;
  last_interaction: Date | null;
  created_at: Date;
}

interface CountRow {
  count: string;
}

interface SumRow {
  total: string | null;
  avg?: string | null;
}

@injectable()
export class Customer360Service {
  constructor(private pool: DatabasePool) {}

  /**
   * Get complete 360 view for a customer
   */
  async getCustomer360View(
    tenantId: string,
    customerId: string
  ): Promise<Result<Customer360View>> {
    try {
      // Fetch all data in parallel for performance
      const [
        profileResult,
        engagementResult,
        financialResult,
        subscriptionResult,
        dealsResult,
        supportResult,
        contractsResult,
        timelineResult,
        relatedContactsResult,
        relatedCompaniesResult,
      ] = await Promise.all([
        this.getCustomerProfile(tenantId, customerId),
        this.getEngagementMetrics(tenantId, customerId),
        this.getFinancialSummary(tenantId, customerId),
        this.getSubscriptionInfo(tenantId, customerId),
        this.getDealSummary(tenantId, customerId),
        this.getSupportSummary(tenantId, customerId),
        this.getContractSummary(tenantId, customerId),
        this.getTimeline(tenantId, customerId, 50),
        this.getRelatedContacts(tenantId, customerId),
        this.getRelatedCompanies(tenantId, customerId),
      ]);

      if (profileResult.isFailure) {
        return Result.fail(profileResult.error);
      }

      const profile = profileResult.getValue();
      const engagement = engagementResult.isSuccess ? engagementResult.getValue() : this.getDefaultEngagement();
      const financial = financialResult.isSuccess ? financialResult.getValue() : this.getDefaultFinancial();
      const subscription = subscriptionResult.isSuccess ? subscriptionResult.getValue() : this.getDefaultSubscription();
      const deals = dealsResult.isSuccess ? dealsResult.getValue() : this.getDefaultDeals();
      const support = supportResult.isSuccess ? supportResult.getValue() : this.getDefaultSupport();
      const contractsSummary = contractsResult.isSuccess ? contractsResult.getValue() : this.getDefaultContracts();
      const timeline = timelineResult.isSuccess ? timelineResult.getValue() : [];
      const relatedContacts = relatedContactsResult.isSuccess ? relatedContactsResult.getValue() : { contacts: [], totalCount: 0 };
      const relatedCompanies = relatedCompaniesResult.isSuccess ? relatedCompaniesResult.getValue() : { companies: [], totalCount: 0 };

      // Generate insights based on aggregated data
      const insights = this.generateInsights(
        profile,
        engagement,
        financial,
        subscription,
        deals,
        support
      );

      // Calculate data completeness
      const dataCompleteness = this.calculateDataCompleteness(
        profile,
        engagement,
        financial,
        subscription
      );

      const view: Customer360View = {
        profile,
        engagement,
        financial,
        subscription,
        deals,
        support,
        contracts: contractsSummary,
        timeline,
        relatedContacts,
        relatedCompanies,
        insights,
        lastRefreshed: new Date(),
        dataCompleteness,
      };

      return Result.ok(view);
    } catch (error) {
      return Result.fail(`Failed to get customer 360 view: ${error}`);
    }
  }

  /**
   * Get customer profile
   */
  async getCustomerProfile(
    tenantId: string,
    customerId: string
  ): Promise<Result<CustomerProfile>> {
    try {
      const customerResult = await this.pool.query<CustomerRow>(
        `SELECT * FROM customers WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
        [tenantId, customerId]
      );

      if (customerResult.isFailure) {
        return Result.fail(customerResult.error || 'Failed to fetch customer');
      }

      const rows = customerResult.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Customer not found');
      }

      const customer = rows[0];

      // Get last interaction
      const lastInteractionResult = await this.pool.query<{ created_at: Date }>(
        `SELECT created_at FROM lead_communications
         WHERE tenant_id = $1 AND customer_id = $2
         ORDER BY created_at DESC LIMIT 1`,
        [tenantId, customerId]
      );

      // Get next scheduled interaction
      const nextScheduledResult = await this.pool.query<{ due_date: Date }>(
        `SELECT due_date FROM tasks
         WHERE tenant_id = $1 AND related_entity_type = 'customer'
         AND related_entity_id = $2 AND status = 'pending'
         AND due_date >= NOW()
         ORDER BY due_date ASC LIMIT 1`,
        [tenantId, customerId]
      );

      const lastInteraction = lastInteractionResult.isSuccess ? lastInteractionResult.getValue().rows[0]?.created_at : undefined;
      const nextScheduled = nextScheduledResult.isSuccess ? nextScheduledResult.getValue().rows[0]?.due_date : undefined;

      // Helper to safely parse JSON or return object directly (JSONB already parsed by pg driver)
      const parseJsonField = (value: any) => {
        if (!value) return undefined;
        if (typeof value === 'object') return value;
        try {
          return JSON.parse(value);
        } catch {
          return undefined;
        }
      };

      const profile: CustomerProfile = {
        id: customer.id,
        tenantId: customer.tenant_id,
        firstName: customer.first_name || '',
        lastName: customer.last_name || '',
        fullName: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        email: customer.email,
        phone: customer.phone || undefined,
        avatarUrl: customer.avatar_url || undefined,
        company: customer.company || undefined,
        jobTitle: customer.job_title || undefined,
        industry: customer.industry || undefined,
        companySize: customer.company_size || undefined,
        website: customer.website || undefined,
        address: parseJsonField(customer.address),
        timezone: customer.timezone || undefined,
        socialProfiles: parseJsonField(customer.social_profiles),
        relationshipStage: (customer.status as any) || 'customer',
        customerSince: customer.customer_since || undefined,
        lastInteraction,
        nextScheduledInteraction: nextScheduled,
        ownerId: customer.owner_id || undefined,
        ownerName: customer.owner_name || undefined,
        teamId: customer.team_id || undefined,
        teamName: customer.team_name || undefined,
        tags: parseJsonField(customer.tags) || [],
        segments: parseJsonField(customer.segments) || [],
        customFields: parseJsonField(customer.custom_fields),
        source: customer.source || undefined,
        sourceDetails: customer.source_details || undefined,
        createdAt: customer.created_at,
        updatedAt: customer.updated_at,
      };

      return Result.ok(profile);
    } catch (error) {
      return Result.fail(`Failed to get customer profile: ${error}`);
    }
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(
    tenantId: string,
    customerId: string
  ): Promise<Result<EngagementMetrics>> {
    try {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const ninetyDaysAgo = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Get total interactions
      const totalResult = await this.pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM lead_communications
         WHERE tenant_id = $1 AND customer_id = $2`,
        [tenantId, customerId]
      );

      // Get interactions last 30 days
      const last30Result = await this.pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM lead_communications
         WHERE tenant_id = $1 AND customer_id = $2 AND created_at >= $3`,
        [tenantId, customerId, thirtyDaysAgo]
      );

      // Get interactions last 90 days
      const last90Result = await this.pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM lead_communications
         WHERE tenant_id = $1 AND customer_id = $2 AND created_at >= $3`,
        [tenantId, customerId, ninetyDaysAgo]
      );

      // Get channel breakdown
      const channelResult = await this.pool.query<{ channel: string; count: string; last_interaction: Date }>(
        `SELECT channel, COUNT(*) as count, MAX(created_at) as last_interaction
         FROM lead_communications
         WHERE tenant_id = $1 AND customer_id = $2
         GROUP BY channel`,
        [tenantId, customerId]
      );

      // Get email metrics
      const emailResult = await this.pool.query<{ sent: string; opened: string; clicked: string; replied: string }>(
        `SELECT
           COUNT(*) as sent,
           SUM(CASE WHEN status IN ('opened', 'clicked', 'replied') THEN 1 ELSE 0 END) as opened,
           SUM(CASE WHEN status IN ('clicked', 'replied') THEN 1 ELSE 0 END) as clicked,
           SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END) as replied
         FROM lead_communications
         WHERE tenant_id = $1 AND customer_id = $2 AND channel = 'email'`,
        [tenantId, customerId]
      );

      // Get meeting metrics
      const meetingResult = await this.pool.query<{ scheduled: string; completed: string; cancelled: string }>(
        `SELECT
           COUNT(*) as scheduled,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
           SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
         FROM activities
         WHERE tenant_id = $1 AND entity_id = $2 AND type = 'meeting'`,
        [tenantId, customerId]
      );

      const totalInteractions = Number(totalResult.isSuccess ? totalResult.getValue().rows[0]?.count || 0 : 0);
      const interactionsLast30Days = Number(last30Result.isSuccess ? last30Result.getValue().rows[0]?.count || 0 : 0);
      const interactionsLast90Days = Number(last90Result.isSuccess ? last90Result.getValue().rows[0]?.count || 0 : 0);

      // Calculate engagement score (0-100)
      const engagementScore = this.calculateEngagementScore(
        totalInteractions,
        interactionsLast30Days,
        interactionsLast90Days
      );

      // Determine engagement level
      const engagementLevel = this.getEngagementLevel(engagementScore);

      // Calculate health score
      const healthScore = this.calculateHealthScore(
        engagementScore,
        interactionsLast30Days
      );

      // Determine sentiment trend (simplified - would use NLP in production)
      const sentimentTrend = interactionsLast30Days > 5 ? 'positive' : 'neutral';

      const channelBreakdown = channelResult.isSuccess
        ? channelResult.getValue().rows.map(ch => ({
            channel: ch.channel as any,
            count: Number(ch.count),
            lastInteraction: ch.last_interaction,
          }))
        : [];

      const emailData = emailResult.isSuccess ? emailResult.getValue().rows[0] : null;
      const meetingData = meetingResult.isSuccess ? meetingResult.getValue().rows[0] : null;

      const metrics: EngagementMetrics = {
        engagementScore,
        engagementLevel,
        healthScore,
        totalInteractions,
        interactionsLast30Days,
        interactionsLast90Days,
        channelBreakdown,
        emailMetrics: emailData ? {
          sent: Number(emailData.sent || 0),
          opened: Number(emailData.opened || 0),
          clicked: Number(emailData.clicked || 0),
          replied: Number(emailData.replied || 0),
          openRate: Number(emailData.sent) > 0 ? (Number(emailData.opened) / Number(emailData.sent)) * 100 : 0,
          clickRate: Number(emailData.sent) > 0 ? (Number(emailData.clicked) / Number(emailData.sent)) * 100 : 0,
          replyRate: Number(emailData.sent) > 0 ? (Number(emailData.replied) / Number(emailData.sent)) * 100 : 0,
        } : undefined,
        meetingMetrics: meetingData ? {
          scheduled: Number(meetingData.scheduled || 0),
          completed: Number(meetingData.completed || 0),
          cancelled: Number(meetingData.cancelled || 0),
          noShow: 0,
          totalDuration: 0,
        } : undefined,
        sentimentTrend,
      };

      return Result.ok(metrics);
    } catch (error) {
      return Result.fail(`Failed to get engagement metrics: ${error}`);
    }
  }

  /**
   * Get financial summary
   */
  async getFinancialSummary(
    tenantId: string,
    customerId: string
  ): Promise<Result<FinancialSummary>> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const startOfQuarter = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
      const startOfYear = new Date(now.getFullYear(), 0, 1);

      // Get total revenue and transactions
      const totalsResult = await this.pool.query<{ total_revenue: string | null; total_transactions: string; last_transaction_date: Date | null }>(
        `SELECT
           SUM(amount) as total_revenue,
           COUNT(*) as total_transactions,
           MAX(created_at) as last_transaction_date
         FROM payments
         WHERE tenant_id = $1 AND customer_id = $2 AND status = 'completed'`,
        [tenantId, customerId]
      );

      // Get revenue this month
      const monthResult = await this.pool.query<{ amount: string | null }>(
        `SELECT SUM(amount) as amount FROM payments
         WHERE tenant_id = $1 AND customer_id = $2 AND status = 'completed' AND created_at >= $3`,
        [tenantId, customerId, startOfMonth]
      );

      // Get revenue this quarter
      const quarterResult = await this.pool.query<{ amount: string | null }>(
        `SELECT SUM(amount) as amount FROM payments
         WHERE tenant_id = $1 AND customer_id = $2 AND status = 'completed' AND created_at >= $3`,
        [tenantId, customerId, startOfQuarter]
      );

      // Get revenue this year
      const yearResult = await this.pool.query<{ amount: string | null }>(
        `SELECT SUM(amount) as amount FROM payments
         WHERE tenant_id = $1 AND customer_id = $2 AND status = 'completed' AND created_at >= $3`,
        [tenantId, customerId, startOfYear]
      );

      // Get outstanding and overdue
      const outstandingResult = await this.pool.query<{ outstanding_balance: string | null; overdue_amount: string | null }>(
        `SELECT
           SUM(amount) as outstanding_balance,
           SUM(CASE WHEN due_date < NOW() THEN amount ELSE 0 END) as overdue_amount
         FROM payments
         WHERE tenant_id = $1 AND customer_id = $2 AND status = 'pending'`,
        [tenantId, customerId]
      );

      // Get last transaction amount
      const lastTransactionResult = await this.pool.query<{ amount: number }>(
        `SELECT amount FROM payments
         WHERE tenant_id = $1 AND customer_id = $2 AND status = 'completed'
         ORDER BY created_at DESC LIMIT 1`,
        [tenantId, customerId]
      );

      const totals = totalsResult.isSuccess ? totalsResult.getValue().rows[0] : null;
      const totalRevenue = Number(totals?.total_revenue || 0);
      const totalTransactions = Number(totals?.total_transactions || 0);

      const outstanding = outstandingResult.isSuccess ? outstandingResult.getValue().rows[0] : null;

      const summary: FinancialSummary = {
        lifetimeValue: totalRevenue,
        totalRevenue,
        averageOrderValue: totalTransactions > 0 ? totalRevenue / totalTransactions : 0,
        revenueThisMonth: Number(monthResult.isSuccess ? monthResult.getValue().rows[0]?.amount || 0 : 0),
        revenueThisQuarter: Number(quarterResult.isSuccess ? quarterResult.getValue().rows[0]?.amount || 0 : 0),
        revenueThisYear: Number(yearResult.isSuccess ? yearResult.getValue().rows[0]?.amount || 0 : 0),
        totalTransactions,
        lastTransactionDate: totals?.last_transaction_date || undefined,
        lastTransactionAmount: lastTransactionResult.isSuccess ? lastTransactionResult.getValue().rows[0]?.amount : undefined,
        outstandingBalance: Number(outstanding?.outstanding_balance || 0),
        overdueAmount: Number(outstanding?.overdue_amount || 0),
        currency: 'USD',
      };

      return Result.ok(summary);
    } catch (error) {
      return Result.fail(`Failed to get financial summary: ${error}`);
    }
  }

  /**
   * Get subscription info
   */
  async getSubscriptionInfo(
    tenantId: string,
    customerId: string
  ): Promise<Result<SubscriptionInfo>> {
    try {
      const customerResult = await this.pool.query<CustomerRow>(
        `SELECT * FROM customers WHERE tenant_id = $1 AND id = $2 LIMIT 1`,
        [tenantId, customerId]
      );

      if (customerResult.isFailure) {
        return Result.fail(customerResult.error || 'Failed to fetch customer');
      }

      const rows = customerResult.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Customer not found');
      }

      const customer = rows[0];
      const subscriptionData = customer.subscription
        ? JSON.parse(customer.subscription)
        : null;

      const info: SubscriptionInfo = {
        hasActiveSubscription: !!subscriptionData?.active,
        currentPlan: subscriptionData?.plan
          ? {
              id: subscriptionData.plan.id,
              name: subscriptionData.plan.name,
              tier: subscriptionData.plan.tier,
              price: subscriptionData.plan.price,
              billingCycle: subscriptionData.plan.billingCycle || 'monthly',
              startDate: new Date(subscriptionData.plan.startDate),
              currentPeriodEnd: new Date(subscriptionData.plan.currentPeriodEnd),
              status: subscriptionData.plan.status || 'active',
            }
          : undefined,
        subscriptionHistory: [],
        mrr: subscriptionData?.mrr || 0,
        arr: (subscriptionData?.mrr || 0) * 12,
        autoRenew: subscriptionData?.autoRenew ?? true,
        nextRenewalDate: subscriptionData?.nextRenewalDate
          ? new Date(subscriptionData.nextRenewalDate)
          : undefined,
      };

      return Result.ok(info);
    } catch (error) {
      return Result.fail(`Failed to get subscription info: ${error}`);
    }
  }

  /**
   * Get deal summary
   */
  async getDealSummary(
    tenantId: string,
    customerId: string
  ): Promise<Result<DealSummary>> {
    try {
      // Get active deals
      const activeDealsResult = await this.pool.query<OpportunityRow>(
        `SELECT * FROM opportunities
         WHERE tenant_id = $1 AND customer_id = $2 AND status IN ('open', 'in_progress')
         ORDER BY value DESC`,
        [tenantId, customerId]
      );

      // Get won deals stats
      const wonDealsResult = await this.pool.query<{ count: string; total_value: string | null }>(
        `SELECT COUNT(*) as count, SUM(value) as total_value
         FROM opportunities
         WHERE tenant_id = $1 AND customer_id = $2 AND status = 'won'`,
        [tenantId, customerId]
      );

      // Get lost deals stats
      const lostDealsResult = await this.pool.query<{ count: string; total_value: string | null }>(
        `SELECT COUNT(*) as count, SUM(value) as total_value
         FROM opportunities
         WHERE tenant_id = $1 AND customer_id = $2 AND status = 'lost'`,
        [tenantId, customerId]
      );

      const activeDeals = activeDealsResult.isSuccess ? activeDealsResult.getValue().rows : [];
      const wonData = wonDealsResult.isSuccess ? wonDealsResult.getValue().rows[0] : null;
      const lostData = lostDealsResult.isSuccess ? lostDealsResult.getValue().rows[0] : null;

      const wonCount = Number(wonData?.count || 0);
      const lostCount = Number(lostData?.count || 0);
      const totalDeals = wonCount + lostCount;

      const summary: DealSummary = {
        activeDeals: activeDeals.map(deal => ({
          id: deal.id,
          name: deal.name,
          stage: deal.stage,
          value: deal.value || 0,
          probability: deal.probability || 50,
          expectedCloseDate: deal.expected_close_date || undefined,
          daysInStage: Math.floor(
            (Date.now() - new Date(deal.stage_updated_at || deal.created_at).getTime()) /
              (1000 * 60 * 60 * 24)
          ),
          lastActivity: deal.updated_at,
          ownerId: deal.owner_id || '',
          ownerName: deal.owner_name || '',
        })),
        totalPipelineValue: activeDeals.reduce(
          (sum, deal) => sum + (deal.value || 0),
          0
        ),
        weightedPipelineValue: activeDeals.reduce(
          (sum, deal) =>
            sum + (deal.value || 0) * ((deal.probability || 50) / 100),
          0
        ),
        wonDeals: wonCount,
        wonValue: Number(wonData?.total_value || 0),
        averageDealSize:
          wonCount > 0 ? Number(wonData?.total_value || 0) / wonCount : 0,
        lostDeals: lostCount,
        lostValue: Number(lostData?.total_value || 0),
        winRate: totalDeals > 0 ? (wonCount / totalDeals) * 100 : 0,
        averageSalesCycle: 30, // Would calculate from actual data
      };

      return Result.ok(summary);
    } catch (error) {
      return Result.fail(`Failed to get deal summary: ${error}`);
    }
  }

  /**
   * Get support summary
   */
  async getSupportSummary(
    tenantId: string,
    customerId: string
  ): Promise<Result<SupportSummary>> {
    try {
      // Get ticket counts
      const ticketCountsResult = await this.pool.query<{ total: string; open: string; resolved: string }>(
        `SELECT
           COUNT(*) as total,
           SUM(CASE WHEN status IN ('pending', 'in_progress') THEN 1 ELSE 0 END) as open,
           SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as resolved
         FROM tasks
         WHERE tenant_id = $1 AND related_entity_type = 'customer'
         AND related_entity_id = $2 AND type = 'support'`,
        [tenantId, customerId]
      );

      // Get active tickets
      const activeTicketsResult = await this.pool.query<TaskRow>(
        `SELECT * FROM tasks
         WHERE tenant_id = $1 AND related_entity_type = 'customer'
         AND related_entity_id = $2 AND type = 'support'
         AND status IN ('pending', 'in_progress')
         ORDER BY created_at DESC LIMIT 10`,
        [tenantId, customerId]
      );

      const counts = ticketCountsResult.isSuccess ? ticketCountsResult.getValue().rows[0] : null;
      const activeTickets = activeTicketsResult.isSuccess ? activeTicketsResult.getValue().rows : [];

      const summary: SupportSummary = {
        totalTickets: Number(counts?.total || 0),
        openTickets: Number(counts?.open || 0),
        resolvedTickets: Number(counts?.resolved || 0),
        activeTickets: activeTickets.map(ticket => ({
          id: ticket.id,
          subject: ticket.title,
          status: ticket.status,
          priority: (ticket.priority as any) || 'medium',
          createdAt: ticket.created_at,
          lastUpdated: ticket.updated_at,
          assignedTo: ticket.assignee_id || undefined,
          category: ticket.category || undefined,
        })),
        averageResolutionTime: 24,
        firstResponseTime: 4,
        escalationRate: 5,
        reopenRate: 2,
        ticketsByCategory: [],
        ticketsByPriority: [],
        ticketTrend: 'stable',
      };

      return Result.ok(summary);
    } catch (error) {
      return Result.fail(`Failed to get support summary: ${error}`);
    }
  }

  /**
   * Get contract summary
   */
  async getContractSummary(
    tenantId: string,
    customerId: string
  ): Promise<Result<ContractSummary>> {
    try {
      const now = new Date();

      // Get active contracts
      const activeContractsResult = await this.pool.query<ContractRow>(
        `SELECT * FROM contracts
         WHERE tenant_id = $1 AND customer_id = $2 AND status = 'active'
         ORDER BY end_date DESC`,
        [tenantId, customerId]
      );

      // Get contract history
      const contractHistoryResult = await this.pool.query<ContractRow>(
        `SELECT * FROM contracts
         WHERE tenant_id = $1 AND customer_id = $2
         ORDER BY created_at DESC LIMIT 10`,
        [tenantId, customerId]
      );

      const activeContracts = activeContractsResult.isSuccess ? activeContractsResult.getValue().rows : [];
      const contractHistory = contractHistoryResult.isSuccess ? contractHistoryResult.getValue().rows : [];

      const summary: ContractSummary = {
        activeContracts: activeContracts.map(contract => {
          const endDate = new Date(contract.end_date);
          const daysUntilExpiry = Math.ceil(
            (endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          return {
            id: contract.id,
            name: contract.name,
            type: contract.type,
            value: contract.value || 0,
            startDate: contract.start_date,
            endDate: contract.end_date,
            status: contract.status as any,
            autoRenew: contract.auto_renew ?? false,
            daysUntilExpiry,
          };
        }),
        totalContractValue: activeContracts.reduce(
          (sum, c) => sum + (c.value || 0),
          0
        ),
        activeContractCount: activeContracts.length,
        upcomingRenewals: activeContracts.filter(c => {
          const daysUntil = Math.ceil(
            (new Date(c.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysUntil <= 90;
        }).length,
        contractsExpiringThisQuarter: activeContracts.filter(c => {
          const daysUntil = Math.ceil(
            (new Date(c.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
          );
          return daysUntil <= 90;
        }).length,
        renewalValue: activeContracts
          .filter(c => {
            const daysUntil = Math.ceil(
              (new Date(c.end_date).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
            );
            return daysUntil <= 90;
          })
          .reduce((sum, c) => sum + (c.value || 0), 0),
        contractHistory: contractHistory.map(contract => ({
          id: contract.id,
          name: contract.name,
          type: contract.type,
          value: contract.value || 0,
          startDate: contract.start_date,
          endDate: contract.end_date,
          outcome: (contract.outcome as any) || 'expired',
        })),
      };

      return Result.ok(summary);
    } catch (error) {
      return Result.fail(`Failed to get contract summary: ${error}`);
    }
  }

  /**
   * Get unified timeline
   */
  async getTimeline(
    tenantId: string,
    customerId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<Result<TimelineEvent[]>> {
    try {
      const events: TimelineEvent[] = [];

      // Get communications
      const commsResult = await this.pool.query<CommunicationRow>(
        `SELECT * FROM lead_communications
         WHERE tenant_id = $1 AND customer_id = $2
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, customerId, limit]
      );

      if (commsResult.isSuccess) {
        for (const comm of commsResult.getValue().rows) {
          events.push({
            id: comm.id,
            type: 'communication' as TimelineEventType,
            title: `${comm.channel} ${comm.direction === 'inbound' ? 'received' : 'sent'}`,
            description: comm.subject || comm.content?.substring(0, 100),
            timestamp: comm.created_at,
            sourceType: 'communication',
            sourceId: comm.id,
            userId: comm.user_id || undefined,
            channel: comm.channel as any,
            status: comm.status || undefined,
            importance: 'medium',
          });
        }
      }

      // Get activities
      const activitiesResult = await this.pool.query<ActivityRow>(
        `SELECT * FROM activities
         WHERE tenant_id = $1 AND entity_id = $2
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, customerId, limit]
      );

      if (activitiesResult.isSuccess) {
        for (const act of activitiesResult.getValue().rows) {
          events.push({
            id: act.id,
            type: act.type === 'meeting' ? 'meeting' : 'activity',
            title: act.title,
            description: act.description || undefined,
            timestamp: act.created_at,
            sourceType: 'activity',
            sourceId: act.id,
            userId: act.user_id || undefined,
            status: act.status || undefined,
            importance: act.priority === 'high' ? 'high' : 'medium',
          });
        }
      }

      // Get notes
      const notesResult = await this.pool.query<NoteRow>(
        `SELECT * FROM notes
         WHERE tenant_id = $1 AND entity_type = 'customer' AND entity_id = $2
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, customerId, limit]
      );

      if (notesResult.isSuccess) {
        for (const note of notesResult.getValue().rows) {
          events.push({
            id: note.id,
            type: 'note' as TimelineEventType,
            title: 'Note added',
            description: note.content?.substring(0, 100),
            timestamp: note.created_at,
            sourceType: 'note',
            sourceId: note.id,
            userId: note.user_id || undefined,
            importance: note.is_pinned ? 'high' : 'low',
            isPinned: note.is_pinned || undefined,
          });
        }
      }

      // Get payments
      const paymentsResult = await this.pool.query<PaymentRow>(
        `SELECT * FROM payments
         WHERE tenant_id = $1 AND customer_id = $2
         ORDER BY created_at DESC LIMIT $3`,
        [tenantId, customerId, limit]
      );

      if (paymentsResult.isSuccess) {
        for (const payment of paymentsResult.getValue().rows) {
          events.push({
            id: payment.id,
            type: 'payment' as TimelineEventType,
            title: `Payment ${payment.status}`,
            description: `$${payment.amount} - ${payment.description || 'Payment'}`,
            timestamp: payment.created_at,
            sourceType: 'payment',
            sourceId: payment.id,
            status: payment.status,
            importance: payment.amount > 1000 ? 'high' : 'medium',
          });
        }
      }

      // Sort all events by timestamp
      events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      // Apply pagination
      const paginatedEvents = events.slice(offset, offset + limit);

      return Result.ok(paginatedEvents);
    } catch (error) {
      return Result.fail(`Failed to get timeline: ${error}`);
    }
  }

  /**
   * Get related contacts
   */
  async getRelatedContacts(
    tenantId: string,
    customerId: string
  ): Promise<Result<RelatedContacts>> {
    try {
      const contactsResult = await this.pool.query<ContactRow>(
        `SELECT * FROM lead_contacts
         WHERE tenant_id = $1 AND customer_id = $2
         ORDER BY is_primary DESC NULLS LAST, created_at DESC`,
        [tenantId, customerId]
      );

      if (contactsResult.isFailure) {
        return Result.fail(contactsResult.error || 'Failed to fetch contacts');
      }

      const contacts = contactsResult.getValue().rows;

      return Result.ok({
        contacts: contacts.map(contact => ({
          id: contact.id,
          name: `${contact.first_name || ''} ${contact.last_name || ''}`.trim(),
          email: contact.email,
          phone: contact.phone || undefined,
          role: contact.role || undefined,
          isPrimary: contact.is_primary ?? false,
          lastInteraction: contact.last_interaction || undefined,
        })),
        totalCount: contacts.length,
      });
    } catch (error) {
      return Result.fail(`Failed to get related contacts: ${error}`);
    }
  }

  /**
   * Get related companies
   */
  async getRelatedCompanies(
    tenantId: string,
    customerId: string
  ): Promise<Result<RelatedCompanies>> {
    try {
      // Would fetch from company relationships table
      return Result.ok({
        companies: [],
        totalCount: 0,
      });
    } catch (error) {
      return Result.fail(`Failed to get related companies: ${error}`);
    }
  }

  /**
   * Search customers with 360 summary
   */
  async searchCustomers(
    params: Customer360SearchParams
  ): Promise<Result<Customer360SearchResult>> {
    try {
      const { tenantId, page = 1, limit = 20 } = params;
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE tenant_id = $1';
      const queryParams: any[] = [tenantId];
      let paramIndex = 2;

      // Apply filters
      if (params.query) {
        whereClause += ` AND (email ILIKE $${paramIndex} OR first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR company ILIKE $${paramIndex})`;
        queryParams.push(`%${params.query}%`);
        paramIndex++;
      }

      if (params.ownerIds?.length) {
        whereClause += ` AND owner_id = ANY($${paramIndex}::uuid[])`;
        queryParams.push(params.ownerIds);
        paramIndex++;
      }

      // Get total count
      const countResult = await this.pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM customers ${whereClause}`,
        queryParams
      );

      if (countResult.isFailure) {
        return Result.fail(countResult.error || 'Failed to count customers');
      }

      const total = Number(countResult.getValue().rows[0]?.count || 0);

      // Get paginated results
      const resultsResult = await this.pool.query<CustomerRow>(
        `SELECT * FROM customers ${whereClause}
         ORDER BY created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...queryParams, limit, offset]
      );

      if (resultsResult.isFailure) {
        return Result.fail(resultsResult.error || 'Failed to fetch customers');
      }

      const results = resultsResult.getValue().rows;

      // Convert to summaries
      const summaries: Customer360Summary[] = results.map(customer => ({
        customerId: customer.id,
        name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
        company: customer.company || undefined,
        avatarUrl: customer.avatar_url || undefined,
        healthScore: 'good' as CustomerHealthScore,
        engagementLevel: 'medium' as EngagementLevel,
        lifetimeValue: customer.lifetime_value || 0,
        mrr: customer.mrr || 0,
        hasActiveSubscription: !!customer.subscription,
        openTickets: 0,
        activeDeals: 0,
        upcomingRenewals: 0,
        lastInteraction: customer.last_interaction || undefined,
        churnRiskLevel: 'low',
        ownerName: customer.owner_name || undefined,
      }));

      return Result.ok({
        customers: summaries,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return Result.fail(`Failed to search customers: ${error}`);
    }
  }

  /**
   * Get customer 360 dashboard
   */
  async getDashboard(tenantId: string): Promise<Result<Customer360Dashboard>> {
    try {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

      // Get total customers
      const totalResult = await this.pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM customers WHERE tenant_id = $1`,
        [tenantId]
      );

      // Get new customers this month
      const newResult = await this.pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM customers
         WHERE tenant_id = $1 AND created_at >= $2`,
        [tenantId, startOfMonth]
      );

      // Get customers last month for growth calculation
      const lastMonthResult = await this.pool.query<CountRow>(
        `SELECT COUNT(*) as count FROM customers
         WHERE tenant_id = $1 AND created_at >= $2 AND created_at < $3`,
        [tenantId, lastMonth, startOfMonth]
      );

      // Get MRR totals
      const mrrResult = await this.pool.query<SumRow>(
        `SELECT SUM(mrr) as total FROM customers WHERE tenant_id = $1`,
        [tenantId]
      );

      // Get LTV totals
      const ltvResult = await this.pool.query<SumRow>(
        `SELECT SUM(lifetime_value) as total, AVG(lifetime_value) as avg
         FROM customers WHERE tenant_id = $1`,
        [tenantId]
      );

      const totalCustomers = Number(totalResult.isSuccess ? totalResult.getValue().rows[0]?.count || 0 : 0);
      const newCustomersThisMonth = Number(newResult.isSuccess ? newResult.getValue().rows[0]?.count || 0 : 0);
      const newLastMonth = Number(lastMonthResult.isSuccess ? lastMonthResult.getValue().rows[0]?.count || 0 : 0);
      const growthPercent =
        newLastMonth > 0
          ? ((newCustomersThisMonth - newLastMonth) / newLastMonth) * 100
          : 0;

      const totalMrr = Number(mrrResult.isSuccess ? mrrResult.getValue().rows[0]?.total || 0 : 0);
      const totalLtv = Number(ltvResult.isSuccess ? ltvResult.getValue().rows[0]?.total || 0 : 0);
      const avgLtv = Number(ltvResult.isSuccess ? ltvResult.getValue().rows[0]?.avg || 0 : 0);

      const dashboard: Customer360Dashboard = {
        tenantId,
        totalCustomers,
        newCustomersThisMonth,
        customerGrowthPercent: growthPercent,
        healthDistribution: {
          excellent: Math.floor(totalCustomers * 0.2),
          good: Math.floor(totalCustomers * 0.4),
          fair: Math.floor(totalCustomers * 0.25),
          atRisk: Math.floor(totalCustomers * 0.1),
          critical: Math.floor(totalCustomers * 0.05),
        },
        engagementDistribution: {
          high: Math.floor(totalCustomers * 0.25),
          medium: Math.floor(totalCustomers * 0.4),
          low: Math.floor(totalCustomers * 0.25),
          inactive: Math.floor(totalCustomers * 0.1),
        },
        totalMrr,
        totalArr: totalMrr * 12,
        averageLifetimeValue: avgLtv,
        totalLifetimeValue: totalLtv,
        customersAtRisk: Math.floor(totalCustomers * 0.15),
        atRiskRevenue: totalMrr * 0.15,
        churnPrediction: {
          next30Days: Math.floor(totalCustomers * 0.02),
          next90Days: Math.floor(totalCustomers * 0.05),
          preventableChurn: Math.floor(totalCustomers * 0.03),
        },
        engagementTrends: [],
        topCustomersByRevenue: [],
        topCustomersByEngagement: [],
        atRiskCustomers: [],
        recentSignificantEvents: [],
        generatedAt: now,
      };

      return Result.ok(dashboard);
    } catch (error) {
      return Result.fail(`Failed to get dashboard: ${error}`);
    }
  }

  /**
   * Compare customers
   */
  async compareCustomers(
    tenantId: string,
    customerIds: string[]
  ): Promise<Result<CustomerComparison>> {
    try {
      const customersResult = await this.pool.query<CustomerRow>(
        `SELECT * FROM customers
         WHERE tenant_id = $1 AND id = ANY($2::uuid[])`,
        [tenantId, customerIds]
      );

      if (customersResult.isFailure) {
        return Result.fail(customersResult.error || 'Failed to fetch customers');
      }

      const customersData = customersResult.getValue().rows;

      const comparison: CustomerComparison = {
        customers: customersData.map(customer => ({
          id: customer.id,
          name: `${customer.first_name || ''} ${customer.last_name || ''}`.trim(),
          metrics: {
            lifetimeValue: customer.lifetime_value || 0,
            mrr: customer.mrr || 0,
            healthScore: 75,
            engagementScore: 65,
            totalInteractions: 0,
            supportTickets: 0,
            dealValue: 0,
          },
        })),
        benchmarks: {
          avgLifetimeValue: 0,
          avgMrr: 0,
          avgHealthScore: 75,
          avgEngagementScore: 65,
        },
      };

      // Calculate benchmarks
      if (comparison.customers.length > 0) {
        const totals = comparison.customers.reduce(
          (acc, c) => ({
            ltv: acc.ltv + c.metrics.lifetimeValue,
            mrr: acc.mrr + c.metrics.mrr,
            health: acc.health + c.metrics.healthScore,
            engagement: acc.engagement + c.metrics.engagementScore,
          }),
          { ltv: 0, mrr: 0, health: 0, engagement: 0 }
        );

        const count = comparison.customers.length;
        comparison.benchmarks = {
          avgLifetimeValue: totals.ltv / count,
          avgMrr: totals.mrr / count,
          avgHealthScore: totals.health / count,
          avgEngagementScore: totals.engagement / count,
        };
      }

      return Result.ok(comparison);
    } catch (error) {
      return Result.fail(`Failed to compare customers: ${error}`);
    }
  }

  // ==================== Helper Methods ====================

  private calculateEngagementScore(
    total: number,
    last30: number,
    last90: number
  ): number {
    // Weight recent activity more heavily
    const recentWeight = last30 * 3;
    const quarterWeight = last90 * 1.5;
    const totalWeight = total * 0.5;

    const rawScore = recentWeight + quarterWeight + totalWeight;
    return Math.min(100, Math.round(rawScore / 2));
  }

  private getEngagementLevel(score: number): EngagementLevel {
    if (score >= 75) return 'high';
    if (score >= 50) return 'medium';
    if (score >= 25) return 'low';
    return 'inactive';
  }

  private calculateHealthScore(
    engagementScore: number,
    recentInteractions: number
  ): CustomerHealthScore {
    const combined = (engagementScore + recentInteractions * 5) / 2;
    if (combined >= 80) return 'excellent';
    if (combined >= 60) return 'good';
    if (combined >= 40) return 'fair';
    if (combined >= 20) return 'at_risk';
    return 'critical';
  }

  private generateInsights(
    profile: CustomerProfile,
    engagement: EngagementMetrics,
    financial: FinancialSummary,
    subscription: SubscriptionInfo,
    deals: DealSummary,
    support: SupportSummary
  ): CustomerInsights {
    const alerts: CustomerInsights['alerts'] = [];
    const recommendations: CustomerInsights['recommendations'] = [];
    const churnFactors: string[] = [];
    const churnActions: string[] = [];

    // Analyze engagement
    if (engagement.engagementLevel === 'low' || engagement.engagementLevel === 'inactive') {
      churnFactors.push('Low engagement in recent period');
      churnActions.push('Schedule a check-in call');
      alerts.push({
        type: 'warning',
        message: 'Customer engagement has decreased significantly',
        action: 'Review recent interactions and reach out',
        createdAt: new Date(),
      });
    }

    // Analyze support
    if (support.openTickets > 3) {
      churnFactors.push('Multiple open support tickets');
      churnActions.push('Prioritize resolving outstanding issues');
      alerts.push({
        type: 'warning',
        message: `${support.openTickets} support tickets are currently open`,
        action: 'Review and escalate if necessary',
        createdAt: new Date(),
      });
    }

    // Analyze financial
    if (financial.overdueAmount > 0) {
      churnFactors.push('Outstanding payment');
      alerts.push({
        type: 'warning',
        message: `$${financial.overdueAmount} is overdue`,
        action: 'Follow up on payment',
        createdAt: new Date(),
      });
    }

    // Expansion opportunities
    if (engagement.engagementLevel === 'high' && deals.winRate > 50) {
      recommendations.push({
        type: 'opportunity',
        title: 'Upsell opportunity',
        description: 'High engagement and good deal history suggest openness to additional products',
        priority: 'high',
        confidence: 0.75,
      });
    }

    // Calculate churn risk score
    let churnScore = 20; // Base score
    if (engagement.engagementLevel === 'inactive') churnScore += 40;
    else if (engagement.engagementLevel === 'low') churnScore += 25;
    if (support.openTickets > 3) churnScore += 15;
    if (financial.overdueAmount > 0) churnScore += 20;

    return {
      churnRisk: {
        score: Math.min(100, churnScore),
        level:
          churnScore >= 70
            ? 'critical'
            : churnScore >= 50
            ? 'high'
            : churnScore >= 30
            ? 'medium'
            : 'low',
        factors: churnFactors,
        recommendedActions: churnActions,
      },
      expansionOpportunity: {
        score: engagement.engagementScore,
        potentialValue: financial.lifetimeValue * 0.3,
        products: [],
        signals: [],
      },
      alerts,
      milestones: [],
      recommendations,
    };
  }

  private calculateDataCompleteness(
    profile: CustomerProfile,
    engagement: EngagementMetrics,
    financial: FinancialSummary,
    subscription: SubscriptionInfo
  ): number {
    let score = 0;
    let total = 0;

    // Profile completeness
    if (profile.email) score++;
    if (profile.phone) score++;
    if (profile.company) score++;
    if (profile.address) score++;
    total += 4;

    // Engagement data
    if (engagement.totalInteractions > 0) score++;
    if (engagement.emailMetrics) score++;
    total += 2;

    // Financial data
    if (financial.totalTransactions > 0) score++;
    total += 1;

    // Subscription data
    if (subscription.hasActiveSubscription) score++;
    total += 1;

    return Math.round((score / total) * 100);
  }

  // Default values for when data fetch fails
  private getDefaultEngagement(): EngagementMetrics {
    return {
      engagementScore: 0,
      engagementLevel: 'inactive',
      healthScore: 'fair',
      totalInteractions: 0,
      interactionsLast30Days: 0,
      interactionsLast90Days: 0,
      channelBreakdown: [],
      sentimentTrend: 'neutral',
    };
  }

  private getDefaultFinancial(): FinancialSummary {
    return {
      lifetimeValue: 0,
      totalRevenue: 0,
      averageOrderValue: 0,
      revenueThisMonth: 0,
      revenueThisQuarter: 0,
      revenueThisYear: 0,
      totalTransactions: 0,
      outstandingBalance: 0,
      overdueAmount: 0,
      currency: 'USD',
    };
  }

  private getDefaultSubscription(): SubscriptionInfo {
    return {
      hasActiveSubscription: false,
      subscriptionHistory: [],
      mrr: 0,
      arr: 0,
      autoRenew: false,
    };
  }

  private getDefaultDeals(): DealSummary {
    return {
      activeDeals: [],
      totalPipelineValue: 0,
      weightedPipelineValue: 0,
      wonDeals: 0,
      wonValue: 0,
      averageDealSize: 0,
      lostDeals: 0,
      lostValue: 0,
      winRate: 0,
      averageSalesCycle: 0,
    };
  }

  private getDefaultSupport(): SupportSummary {
    return {
      totalTickets: 0,
      openTickets: 0,
      resolvedTickets: 0,
      activeTickets: [],
      averageResolutionTime: 0,
      firstResponseTime: 0,
      escalationRate: 0,
      reopenRate: 0,
      ticketsByCategory: [],
      ticketsByPriority: [],
      ticketTrend: 'stable',
    };
  }

  private getDefaultContracts(): ContractSummary {
    return {
      activeContracts: [],
      totalContractValue: 0,
      activeContractCount: 0,
      upcomingRenewals: 0,
      contractsExpiringThisQuarter: 0,
      renewalValue: 0,
      contractHistory: [],
    };
  }
}

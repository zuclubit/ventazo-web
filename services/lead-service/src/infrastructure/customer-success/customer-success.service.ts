/**
 * Customer Success / Health Scoring Service
 *
 * Comprehensive service for:
 * - Multi-dimensional health score calculation
 * - Risk factor detection and tracking
 * - Expansion opportunity identification
 * - Success playbook management
 * - Customer lifecycle management
 * - Historical trend analysis
 */

import { injectable, inject } from 'tsyringe';
import { eq, and, desc, gte, lte, sql, asc, isNull, or, inArray } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '@zuclubit/domain';
import {
  customerHealthScores,
  healthScoreHistory,
  riskFactors,
  expansionOpportunities,
  healthThresholds,
  successPlaybooks,
  playbookExecutions,
  successTasks,
  customerTouchpoints,
  healthScoreWeights,
  customerSegments,
  customers,
  CustomerHealthScoreRow,
  HealthScoreHistoryRow,
  RiskFactorRow,
  ExpansionOpportunityRow,
  HealthThresholdRow,
  SuccessPlaybookRow,
  PlaybookExecutionRow,
  SuccessTaskRow,
  CustomerTouchpointRow,
  HealthScoreWeightRow,
  CustomerSegmentRow,
  CustomerRow,
} from '../database/schema';
import type {
  HealthStatus,
  HealthTrend,
  LifecycleStage,
  RiskLevel,
  ExpansionPotential,
  ProductUsageMetrics,
  EngagementMetrics,
  SupportMetrics,
  FinancialMetrics,
  RelationshipMetrics,
  CustomerHealthScore,
  RiskFactor,
  ExpansionOpportunity,
  SuccessPlaybook,
  PlaybookExecution,
  SuccessTask,
  CustomerTouchpoint,
  HealthDashboard,
  SuccessMetrics,
  CustomerSegment,
  HealthScoreWeights,
  PlaybookStep,
  CompletedStep,
} from './types';

@injectable()
export class CustomerSuccessService {
  private db: any;

  constructor(@inject('Database') db: any) {
    this.db = db;
  }

  // ============================================================================
  // HEALTH SCORE CALCULATION
  // ============================================================================

  /**
   * Calculate and store health score for a customer
   */
  async calculateHealthScore(
    customerId: string,
    tenantId: string,
    metrics: {
      productUsage?: Partial<ProductUsageMetrics>;
      engagement?: Partial<EngagementMetrics>;
      support?: Partial<SupportMetrics>;
      financial?: Partial<FinancialMetrics>;
      relationship?: Partial<RelationshipMetrics>;
    }
  ): Promise<Result<CustomerHealthScore>> {
    try {
      // Get weights for this tenant
      const weights = await this.getHealthScoreWeights(tenantId);

      // Calculate component scores
      const productUsageScore = this.calculateProductUsageScore(metrics.productUsage || {});
      const engagementScore = this.calculateEngagementScore(metrics.engagement || {});
      const supportScore = this.calculateSupportScore(metrics.support || {});
      const financialScore = this.calculateFinancialScore(metrics.financial || {});
      const relationshipScore = this.calculateRelationshipScore(metrics.relationship || {});

      // Calculate weighted overall score
      const overallScore = Math.round(
        (productUsageScore * weights.productUsage +
          engagementScore * weights.engagement +
          supportScore * weights.support +
          financialScore * weights.financial +
          relationshipScore * weights.relationship) / 100
      );

      // Determine health status
      const healthStatus = this.determineHealthStatus(overallScore);

      // Get previous score for trend calculation
      const previousScore = await this.getPreviousScore(customerId, tenantId);
      const healthTrend = this.determineHealthTrend(overallScore, previousScore);

      // Determine lifecycle stage
      const lifecycleStage = await this.determineLifecycleStage(customerId, tenantId, metrics.financial || {});
      const daysInStage = await this.getDaysInStage(customerId, tenantId, lifecycleStage);

      // Identify risk factors
      const identifiedRisks = await this.identifyRiskFactors(
        customerId,
        tenantId,
        {
          productUsage: { ...this.getDefaultProductUsageMetrics(), ...metrics.productUsage },
          engagement: { ...this.getDefaultEngagementMetrics(), ...metrics.engagement },
          support: { ...this.getDefaultSupportMetrics(), ...metrics.support },
          financial: { ...this.getDefaultFinancialMetrics(), ...metrics.financial },
          relationship: { ...this.getDefaultRelationshipMetrics(), ...metrics.relationship },
        },
        healthStatus
      );

      // Calculate risk level
      const riskLevel = this.calculateRiskLevel(identifiedRisks);

      // Calculate expansion potential
      const expansionPotential = this.calculateExpansionPotential(
        healthStatus,
        metrics.productUsage || {},
        metrics.financial || {}
      );

      // Calculate AI churn prediction (simplified model)
      const aiPrediction = this.predictChurn(
        overallScore,
        healthTrend,
        identifiedRisks,
        metrics.engagement || {}
      );

      // Upsert health score
      const id = uuidv4();
      const now = new Date();

      const existingScore = await this.db.select()
        .from(customerHealthScores)
        .where(and(
          eq(customerHealthScores.customerId, customerId),
          eq(customerHealthScores.tenantId, tenantId)
        ))
        .limit(1);

      const healthScoreData = {
        overallScore,
        healthStatus,
        healthTrend,
        productUsageScore,
        engagementScore,
        supportScore,
        financialScore,
        relationshipScore,
        productUsageMetrics: { ...this.getDefaultProductUsageMetrics(), ...metrics.productUsage },
        engagementMetrics: { ...this.getDefaultEngagementMetrics(), ...metrics.engagement },
        supportMetrics: { ...this.getDefaultSupportMetrics(), ...metrics.support },
        financialMetrics: { ...this.getDefaultFinancialMetrics(), ...metrics.financial },
        relationshipMetrics: { ...this.getDefaultRelationshipMetrics(), ...metrics.relationship },
        aiPredictedChurnRisk: aiPrediction.churnRisk,
        aiConfidenceLevel: aiPrediction.confidence,
        aiRecommendations: aiPrediction.recommendations,
        lifecycleStage,
        daysInStage,
        riskLevel,
        expansionPotential,
        calculatedAt: now,
        nextCalculation: new Date(now.getTime() + 24 * 60 * 60 * 1000), // 24 hours
        updatedAt: now,
      };

      let scoreRow: CustomerHealthScoreRow;

      if (existingScore.length > 0) {
        const [updated] = await this.db.update(customerHealthScores)
          .set(healthScoreData)
          .where(eq(customerHealthScores.id, existingScore[0].id))
          .returning();
        scoreRow = updated;
      } else {
        const [inserted] = await this.db.insert(customerHealthScores)
          .values({
            id,
            customerId,
            tenantId,
            ...healthScoreData,
            createdAt: now,
          })
          .returning();
        scoreRow = inserted;
      }

      // Save to history
      await this.saveHealthScoreHistory(customerId, tenantId, scoreRow);

      // Trigger playbooks if needed
      await this.checkAndTriggerPlaybooks(customerId, tenantId, scoreRow);

      return Result.ok(this.mapRowToHealthScore(scoreRow, identifiedRisks, []));
    } catch (error) {
      return Result.fail(`Failed to calculate health score: ${error}`);
    }
  }

  /**
   * Get health score for a customer
   */
  async getHealthScore(customerId: string, tenantId: string): Promise<Result<CustomerHealthScore | null>> {
    try {
      const [score] = await this.db.select()
        .from(customerHealthScores)
        .where(and(
          eq(customerHealthScores.customerId, customerId),
          eq(customerHealthScores.tenantId, tenantId)
        ))
        .limit(1);

      if (!score) {
        return Result.ok(null);
      }

      // Get risk factors
      const risks = await this.db.select()
        .from(riskFactors)
        .where(and(
          eq(riskFactors.customerId, customerId),
          eq(riskFactors.tenantId, tenantId),
          eq(riskFactors.isActive, true)
        ));

      // Get expansion opportunities
      const expansions = await this.db.select()
        .from(expansionOpportunities)
        .where(and(
          eq(expansionOpportunities.customerId, customerId),
          eq(expansionOpportunities.tenantId, tenantId),
          inArray(expansionOpportunities.status, ['identified', 'qualified', 'pursuing'])
        ));

      return Result.ok(this.mapRowToHealthScore(score, risks, expansions));
    } catch (error) {
      return Result.fail(`Failed to get health score: ${error}`);
    }
  }

  /**
   * Get health scores for all customers in tenant
   */
  async getAllHealthScores(
    tenantId: string,
    filters?: {
      healthStatus?: HealthStatus;
      riskLevel?: RiskLevel;
      lifecycleStage?: LifecycleStage;
      minScore?: number;
      maxScore?: number;
    },
    pagination?: { limit?: number; offset?: number }
  ): Promise<Result<{ scores: CustomerHealthScoreRow[]; total: number }>> {
    try {
      const conditions = [eq(customerHealthScores.tenantId, tenantId)];

      if (filters?.healthStatus) {
        conditions.push(eq(customerHealthScores.healthStatus, filters.healthStatus));
      }
      if (filters?.riskLevel) {
        conditions.push(eq(customerHealthScores.riskLevel, filters.riskLevel));
      }
      if (filters?.lifecycleStage) {
        conditions.push(eq(customerHealthScores.lifecycleStage, filters.lifecycleStage));
      }
      if (filters?.minScore !== undefined) {
        conditions.push(gte(customerHealthScores.overallScore, filters.minScore));
      }
      if (filters?.maxScore !== undefined) {
        conditions.push(lte(customerHealthScores.overallScore, filters.maxScore));
      }

      const query = this.db.select()
        .from(customerHealthScores)
        .where(and(...conditions))
        .orderBy(asc(customerHealthScores.overallScore));

      if (pagination?.limit) {
        query.limit(pagination.limit);
      }
      if (pagination?.offset) {
        query.offset(pagination.offset);
      }

      const scores = await query;

      const [{ count }] = await this.db.select({ count: sql<number>`count(*)` })
        .from(customerHealthScores)
        .where(and(...conditions));

      return Result.ok({ scores, total: Number(count) });
    } catch (error) {
      return Result.fail(`Failed to get health scores: ${error}`);
    }
  }

  /**
   * Get health score history for trend analysis
   */
  async getHealthScoreHistory(
    customerId: string,
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<HealthScoreHistoryRow[]>> {
    try {
      const history = await this.db.select()
        .from(healthScoreHistory)
        .where(and(
          eq(healthScoreHistory.customerId, customerId),
          eq(healthScoreHistory.tenantId, tenantId),
          gte(healthScoreHistory.periodEnd, startDate),
          lte(healthScoreHistory.periodEnd, endDate)
        ))
        .orderBy(asc(healthScoreHistory.periodEnd));

      return Result.ok(history);
    } catch (error) {
      return Result.fail(`Failed to get health score history: ${error}`);
    }
  }

  // ============================================================================
  // RISK FACTOR MANAGEMENT
  // ============================================================================

  /**
   * Get active risk factors for a customer
   */
  async getRiskFactors(customerId: string, tenantId: string): Promise<Result<RiskFactorRow[]>> {
    try {
      const risks = await this.db.select()
        .from(riskFactors)
        .where(and(
          eq(riskFactors.customerId, customerId),
          eq(riskFactors.tenantId, tenantId),
          eq(riskFactors.isActive, true)
        ))
        .orderBy(desc(riskFactors.severity));

      return Result.ok(risks);
    } catch (error) {
      return Result.fail(`Failed to get risk factors: ${error}`);
    }
  }

  /**
   * Resolve a risk factor
   */
  async resolveRiskFactor(riskId: string, tenantId: string): Promise<Result<RiskFactorRow>> {
    try {
      const [updated] = await this.db.update(riskFactors)
        .set({
          isActive: false,
          resolvedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(and(
          eq(riskFactors.id, riskId),
          eq(riskFactors.tenantId, tenantId)
        ))
        .returning();

      if (!updated) {
        return Result.fail('Risk factor not found');
      }

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to resolve risk factor: ${error}`);
    }
  }

  /**
   * Get all risk factors for tenant (for dashboard)
   */
  async getAllRiskFactors(
    tenantId: string,
    options?: {
      severity?: RiskLevel;
      category?: string;
      activeOnly?: boolean;
    }
  ): Promise<Result<RiskFactorRow[]>> {
    try {
      const conditions = [eq(riskFactors.tenantId, tenantId)];

      if (options?.severity) {
        conditions.push(eq(riskFactors.severity, options.severity));
      }
      if (options?.category) {
        conditions.push(eq(riskFactors.category, options.category));
      }
      if (options?.activeOnly !== false) {
        conditions.push(eq(riskFactors.isActive, true));
      }

      const risks = await this.db.select()
        .from(riskFactors)
        .where(and(...conditions))
        .orderBy(desc(riskFactors.severity), desc(riskFactors.detectedAt));

      return Result.ok(risks);
    } catch (error) {
      return Result.fail(`Failed to get risk factors: ${error}`);
    }
  }

  // ============================================================================
  // EXPANSION OPPORTUNITIES
  // ============================================================================

  /**
   * Get expansion opportunities for a customer
   */
  async getExpansionOpportunities(
    customerId: string,
    tenantId: string
  ): Promise<Result<ExpansionOpportunityRow[]>> {
    try {
      const opportunities = await this.db.select()
        .from(expansionOpportunities)
        .where(and(
          eq(expansionOpportunities.customerId, customerId),
          eq(expansionOpportunities.tenantId, tenantId)
        ))
        .orderBy(desc(expansionOpportunities.confidence));

      return Result.ok(opportunities);
    } catch (error) {
      return Result.fail(`Failed to get expansion opportunities: ${error}`);
    }
  }

  /**
   * Create expansion opportunity
   */
  async createExpansionOpportunity(
    data: {
      customerId: string;
      tenantId: string;
      type: 'upsell' | 'cross_sell' | 'upgrade' | 'seats' | 'add_on';
      product: string;
      estimatedValue: number;
      confidence: number;
      signals: string[];
      reasoning?: string;
      suggestedApproach?: string;
    }
  ): Promise<Result<ExpansionOpportunityRow>> {
    try {
      const [opportunity] = await this.db.insert(expansionOpportunities)
        .values({
          id: uuidv4(),
          ...data,
          status: 'identified',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(opportunity);
    } catch (error) {
      return Result.fail(`Failed to create expansion opportunity: ${error}`);
    }
  }

  /**
   * Update expansion opportunity status
   */
  async updateExpansionOpportunityStatus(
    opportunityId: string,
    tenantId: string,
    status: 'identified' | 'qualified' | 'pursuing' | 'won' | 'lost'
  ): Promise<Result<ExpansionOpportunityRow>> {
    try {
      const [updated] = await this.db.update(expansionOpportunities)
        .set({ status, updatedAt: new Date() })
        .where(and(
          eq(expansionOpportunities.id, opportunityId),
          eq(expansionOpportunities.tenantId, tenantId)
        ))
        .returning();

      if (!updated) {
        return Result.fail('Expansion opportunity not found');
      }

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to update expansion opportunity: ${error}`);
    }
  }

  // ============================================================================
  // PLAYBOOK MANAGEMENT
  // ============================================================================

  /**
   * Create success playbook
   */
  async createPlaybook(
    data: {
      tenantId: string;
      name: string;
      description?: string;
      triggerType: 'health_score' | 'risk_factor' | 'lifecycle' | 'manual' | 'scheduled';
      triggerConditions: Array<{ field: string; operator: string; value: string | number | boolean | string[] }>;
      steps: PlaybookStep[];
      targetLifecycleStages?: LifecycleStage[];
      targetHealthStatuses?: HealthStatus[];
      priority?: number;
    }
  ): Promise<Result<SuccessPlaybookRow>> {
    try {
      const [playbook] = await this.db.insert(successPlaybooks)
        .values({
          id: uuidv4(),
          tenantId: data.tenantId,
          name: data.name,
          description: data.description,
          triggerType: data.triggerType,
          triggerConditions: data.triggerConditions,
          steps: data.steps,
          targetLifecycleStages: data.targetLifecycleStages || [],
          targetHealthStatuses: data.targetHealthStatuses || [],
          priority: data.priority || 100,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(playbook);
    } catch (error) {
      return Result.fail(`Failed to create playbook: ${error}`);
    }
  }

  /**
   * Get playbooks for tenant
   */
  async getPlaybooks(tenantId: string, activeOnly = true): Promise<Result<SuccessPlaybookRow[]>> {
    try {
      const conditions = [eq(successPlaybooks.tenantId, tenantId)];
      if (activeOnly) {
        conditions.push(eq(successPlaybooks.isActive, true));
      }

      const playbooks = await this.db.select()
        .from(successPlaybooks)
        .where(and(...conditions))
        .orderBy(asc(successPlaybooks.priority));

      return Result.ok(playbooks);
    } catch (error) {
      return Result.fail(`Failed to get playbooks: ${error}`);
    }
  }

  /**
   * Start playbook execution for a customer
   */
  async startPlaybookExecution(
    playbookId: string,
    customerId: string,
    tenantId: string,
    triggeredBy?: string,
    assignedTo?: string
  ): Promise<Result<PlaybookExecutionRow>> {
    try {
      // Check if already running for this customer
      const existing = await this.db.select()
        .from(playbookExecutions)
        .where(and(
          eq(playbookExecutions.playbookId, playbookId),
          eq(playbookExecutions.customerId, customerId),
          eq(playbookExecutions.tenantId, tenantId),
          eq(playbookExecutions.status, 'active')
        ))
        .limit(1);

      if (existing.length > 0) {
        return Result.fail('Playbook already running for this customer');
      }

      const [execution] = await this.db.insert(playbookExecutions)
        .values({
          id: uuidv4(),
          playbookId,
          customerId,
          tenantId,
          status: 'active',
          currentStep: 1,
          completedSteps: [],
          triggeredBy,
          assignedTo,
          startedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(execution);
    } catch (error) {
      return Result.fail(`Failed to start playbook execution: ${error}`);
    }
  }

  /**
   * Complete playbook step
   */
  async completePlaybookStep(
    executionId: string,
    tenantId: string,
    stepOrder: number,
    completedBy: string,
    outcome?: string,
    notes?: string
  ): Promise<Result<PlaybookExecutionRow>> {
    try {
      const [execution] = await this.db.select()
        .from(playbookExecutions)
        .where(and(
          eq(playbookExecutions.id, executionId),
          eq(playbookExecutions.tenantId, tenantId)
        ))
        .limit(1);

      if (!execution) {
        return Result.fail('Playbook execution not found');
      }

      // Get playbook to check total steps
      const [playbook] = await this.db.select()
        .from(successPlaybooks)
        .where(eq(successPlaybooks.id, execution.playbookId))
        .limit(1);

      const completedSteps = execution.completedSteps as CompletedStep[] || [];
      completedSteps.push({
        stepOrder,
        completedAt: new Date(),
        completedBy,
        outcome: outcome || '',
        notes: notes || '',
      });

      const steps = playbook?.steps as PlaybookStep[] || [];
      const isComplete = stepOrder >= steps.length;

      const [updated] = await this.db.update(playbookExecutions)
        .set({
          currentStep: isComplete ? stepOrder : stepOrder + 1,
          completedSteps,
          status: isComplete ? 'completed' : 'active',
          completedAt: isComplete ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(eq(playbookExecutions.id, executionId))
        .returning();

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to complete playbook step: ${error}`);
    }
  }

  /**
   * Get playbook executions for a customer
   */
  async getPlaybookExecutions(
    customerId: string,
    tenantId: string,
    status?: 'active' | 'completed' | 'paused' | 'cancelled'
  ): Promise<Result<PlaybookExecutionRow[]>> {
    try {
      const conditions = [
        eq(playbookExecutions.customerId, customerId),
        eq(playbookExecutions.tenantId, tenantId),
      ];

      if (status) {
        conditions.push(eq(playbookExecutions.status, status));
      }

      const executions = await this.db.select()
        .from(playbookExecutions)
        .where(and(...conditions))
        .orderBy(desc(playbookExecutions.startedAt));

      return Result.ok(executions);
    } catch (error) {
      return Result.fail(`Failed to get playbook executions: ${error}`);
    }
  }

  // ============================================================================
  // SUCCESS TASKS
  // ============================================================================

  /**
   * Create success task
   */
  async createTask(
    data: {
      customerId: string;
      tenantId: string;
      type: 'check_in' | 'qbr' | 'onboarding' | 'training' | 'renewal' | 'escalation' | 'custom';
      title: string;
      description?: string;
      priority?: RiskLevel;
      dueDate?: Date;
      assignedTo?: string;
      playbookExecutionId?: string;
    }
  ): Promise<Result<SuccessTaskRow>> {
    try {
      const [task] = await this.db.insert(successTasks)
        .values({
          id: uuidv4(),
          customerId: data.customerId,
          tenantId: data.tenantId,
          playbookExecutionId: data.playbookExecutionId,
          type: data.type,
          title: data.title,
          description: data.description,
          priority: data.priority || 'medium',
          dueDate: data.dueDate,
          assignedTo: data.assignedTo,
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(task);
    } catch (error) {
      return Result.fail(`Failed to create task: ${error}`);
    }
  }

  /**
   * Get tasks for customer
   */
  async getTasks(
    tenantId: string,
    filters?: {
      customerId?: string;
      assignedTo?: string;
      status?: string;
      type?: string;
      dueBefore?: Date;
    }
  ): Promise<Result<SuccessTaskRow[]>> {
    try {
      const conditions = [eq(successTasks.tenantId, tenantId)];

      if (filters?.customerId) {
        conditions.push(eq(successTasks.customerId, filters.customerId));
      }
      if (filters?.assignedTo) {
        conditions.push(eq(successTasks.assignedTo, filters.assignedTo));
      }
      if (filters?.status) {
        conditions.push(eq(successTasks.status, filters.status));
      }
      if (filters?.type) {
        conditions.push(eq(successTasks.type, filters.type));
      }
      if (filters?.dueBefore) {
        conditions.push(lte(successTasks.dueDate, filters.dueBefore));
      }

      const tasks = await this.db.select()
        .from(successTasks)
        .where(and(...conditions))
        .orderBy(asc(successTasks.dueDate));

      return Result.ok(tasks);
    } catch (error) {
      return Result.fail(`Failed to get tasks: ${error}`);
    }
  }

  /**
   * Update task status
   */
  async updateTaskStatus(
    taskId: string,
    tenantId: string,
    status: 'pending' | 'in_progress' | 'completed' | 'cancelled',
    outcome?: string
  ): Promise<Result<SuccessTaskRow>> {
    try {
      const [updated] = await this.db.update(successTasks)
        .set({
          status,
          outcome,
          completedAt: status === 'completed' ? new Date() : null,
          updatedAt: new Date(),
        })
        .where(and(
          eq(successTasks.id, taskId),
          eq(successTasks.tenantId, tenantId)
        ))
        .returning();

      if (!updated) {
        return Result.fail('Task not found');
      }

      return Result.ok(updated);
    } catch (error) {
      return Result.fail(`Failed to update task status: ${error}`);
    }
  }

  // ============================================================================
  // CUSTOMER TOUCHPOINTS
  // ============================================================================

  /**
   * Record customer touchpoint
   */
  async recordTouchpoint(
    data: {
      customerId: string;
      tenantId: string;
      type: 'call' | 'meeting' | 'email' | 'chat' | 'support' | 'event' | 'qbr';
      subject: string;
      summary?: string;
      sentiment?: 'positive' | 'neutral' | 'negative';
      participants?: string[];
      duration?: number;
      nextSteps?: string[];
      recordedBy?: string;
      occurredAt: Date;
    }
  ): Promise<Result<CustomerTouchpointRow>> {
    try {
      const [touchpoint] = await this.db.insert(customerTouchpoints)
        .values({
          id: uuidv4(),
          customerId: data.customerId,
          tenantId: data.tenantId,
          type: data.type,
          subject: data.subject,
          summary: data.summary,
          sentiment: data.sentiment,
          participants: data.participants || [],
          duration: data.duration,
          nextSteps: data.nextSteps || [],
          recordedBy: data.recordedBy,
          occurredAt: data.occurredAt,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();

      return Result.ok(touchpoint);
    } catch (error) {
      return Result.fail(`Failed to record touchpoint: ${error}`);
    }
  }

  /**
   * Get touchpoints for customer
   */
  async getTouchpoints(
    customerId: string,
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Result<CustomerTouchpointRow[]>> {
    try {
      const conditions = [
        eq(customerTouchpoints.customerId, customerId),
        eq(customerTouchpoints.tenantId, tenantId),
      ];

      if (startDate) {
        conditions.push(gte(customerTouchpoints.occurredAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(customerTouchpoints.occurredAt, endDate));
      }

      const touchpoints = await this.db.select()
        .from(customerTouchpoints)
        .where(and(...conditions))
        .orderBy(desc(customerTouchpoints.occurredAt));

      return Result.ok(touchpoints);
    } catch (error) {
      return Result.fail(`Failed to get touchpoints: ${error}`);
    }
  }

  // ============================================================================
  // DASHBOARD & ANALYTICS
  // ============================================================================

  /**
   * Get health dashboard data
   */
  async getHealthDashboard(tenantId: string): Promise<Result<HealthDashboard>> {
    try {
      // Get summary stats
      const allScores = await this.db.select()
        .from(customerHealthScores)
        .where(eq(customerHealthScores.tenantId, tenantId));

      const totalCustomers = allScores.length;
      const healthyCount = allScores.filter((s: CustomerHealthScoreRow) => s.healthStatus === 'healthy').length;
      const atRiskCount = allScores.filter((s: CustomerHealthScoreRow) => s.healthStatus === 'at_risk').length;
      const criticalCount = allScores.filter((s: CustomerHealthScoreRow) => s.healthStatus === 'critical').length;
      const avgHealthScore = totalCustomers > 0
        ? Math.round(allScores.reduce((sum: number, s: CustomerHealthScoreRow) => sum + s.overallScore, 0) / totalCustomers)
        : 0;

      // Get 30-day score change
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const historicalScores = await this.db.select()
        .from(healthScoreHistory)
        .where(and(
          eq(healthScoreHistory.tenantId, tenantId),
          gte(healthScoreHistory.periodEnd, thirtyDaysAgo)
        ))
        .orderBy(asc(healthScoreHistory.periodEnd));

      const oldAvg = historicalScores.length > 0
        ? historicalScores.slice(0, Math.floor(historicalScores.length / 2))
            .reduce((sum: number, s: HealthScoreHistoryRow) => sum + s.overallScore, 0) / Math.floor(historicalScores.length / 2)
        : avgHealthScore;

      const scoreChange30d = Math.round(avgHealthScore - oldAvg);

      // Score distribution
      const distribution = [
        { score: '0-20', count: allScores.filter((s: CustomerHealthScoreRow) => s.overallScore >= 0 && s.overallScore < 20).length },
        { score: '20-40', count: allScores.filter((s: CustomerHealthScoreRow) => s.overallScore >= 20 && s.overallScore < 40).length },
        { score: '40-60', count: allScores.filter((s: CustomerHealthScoreRow) => s.overallScore >= 40 && s.overallScore < 60).length },
        { score: '60-80', count: allScores.filter((s: CustomerHealthScoreRow) => s.overallScore >= 60 && s.overallScore < 80).length },
        { score: '80-100', count: allScores.filter((s: CustomerHealthScoreRow) => s.overallScore >= 80).length },
      ];

      // Get top risks
      const topRisks = await this.db.select()
        .from(riskFactors)
        .where(and(
          eq(riskFactors.tenantId, tenantId),
          eq(riskFactors.isActive, true)
        ))
        .orderBy(desc(riskFactors.severity))
        .limit(10);

      // Get top expansion opportunities
      const topExpansions = await this.db.select()
        .from(expansionOpportunities)
        .where(and(
          eq(expansionOpportunities.tenantId, tenantId),
          inArray(expansionOpportunities.status, ['identified', 'qualified', 'pursuing'])
        ))
        .orderBy(desc(expansionOpportunities.estimatedValue))
        .limit(10);

      // Get upcoming renewals (from customers table)
      const ninetyDaysFromNow = new Date();
      ninetyDaysFromNow.setDate(ninetyDaysFromNow.getDate() + 90);

      const renewingCustomers = await this.db.select({
        customer: customers,
        health: customerHealthScores,
      })
        .from(customers)
        .leftJoin(customerHealthScores, and(
          eq(customers.id, customerHealthScores.customerId),
          eq(customers.tenantId, customerHealthScores.tenantId)
        ))
        .where(and(
          eq(customers.tenantId, tenantId),
          lte(customers.renewalDate, ninetyDaysFromNow),
          gte(customers.renewalDate, new Date())
        ))
        .orderBy(asc(customers.renewalDate))
        .limit(10);

      const upcomingRenewals = renewingCustomers.map((r: { customer: CustomerRow; health: CustomerHealthScoreRow | null }) => ({
        customerId: r.customer.id,
        customerName: r.customer.name,
        renewalDate: r.customer.renewalDate!,
        mrr: r.customer.mrr || 0,
        healthScore: r.health?.overallScore || 0,
        healthStatus: (r.health?.healthStatus || 'unknown') as HealthStatus,
      }));

      // Recent playbook executions
      const recentPlaybooks = await this.db.select()
        .from(playbookExecutions)
        .where(eq(playbookExecutions.tenantId, tenantId))
        .orderBy(desc(playbookExecutions.startedAt))
        .limit(10);

      // Build trend data (simplified - would need more complex aggregation in production)
      const trendData: { date: string; avgScore: number; healthyPct: number; atRiskPct: number; criticalPct: number }[] = [];

      return Result.ok({
        tenantId,
        summary: {
          totalCustomers,
          healthyCount,
          atRiskCount,
          criticalCount,
          avgHealthScore,
          scoreChange30d,
        },
        distribution,
        trendData,
        topRisks,
        topExpansions,
        upcomingRenewals,
        recentPlaybooks,
      });
    } catch (error) {
      return Result.fail(`Failed to get health dashboard: ${error}`);
    }
  }

  /**
   * Get success metrics for a period
   */
  async getSuccessMetrics(
    tenantId: string,
    period: 'day' | 'week' | 'month' | 'quarter' | 'year',
    startDate: Date,
    endDate: Date
  ): Promise<Result<SuccessMetrics>> {
    try {
      // Get all customers for tenant
      const allCustomers = await this.db.select()
        .from(customers)
        .where(eq(customers.tenantId, tenantId));

      // Get health scores
      const healthScores = await this.db.select()
        .from(customerHealthScores)
        .where(eq(customerHealthScores.tenantId, tenantId));

      // Calculate metrics (simplified)
      const totalMrr = allCustomers.reduce((sum: number, c: CustomerRow) => sum + (c.mrr || 0), 0);
      const activeCustomers = allCustomers.filter((c: CustomerRow) => c.status === 'active').length;

      // Get churned customers in period
      const churnedCustomers = allCustomers.filter((c: CustomerRow) =>
        c.status === 'churned' &&
        c.churnedAt &&
        c.churnedAt >= startDate &&
        c.churnedAt <= endDate
      );

      const churnedMrr = churnedCustomers.reduce((sum: number, c: CustomerRow) => sum + (c.mrr || 0), 0);

      // Get expansion opportunities won in period
      const wonExpansions = await this.db.select()
        .from(expansionOpportunities)
        .where(and(
          eq(expansionOpportunities.tenantId, tenantId),
          eq(expansionOpportunities.status, 'won'),
          gte(expansionOpportunities.updatedAt, startDate),
          lte(expansionOpportunities.updatedAt, endDate)
        ));

      const expansionMrr = wonExpansions.reduce((sum: number, e: ExpansionOpportunityRow) => sum + e.estimatedValue, 0);

      // Calculate retention rates
      const grossRetentionRate = activeCustomers > 0
        ? Math.round(((totalMrr - churnedMrr) / totalMrr) * 100)
        : 100;

      const netRetentionRate = activeCustomers > 0
        ? Math.round(((totalMrr - churnedMrr + expansionMrr) / totalMrr) * 100)
        : 100;

      // Health score metrics
      const avgHealthScore = healthScores.length > 0
        ? Math.round(healthScores.reduce((sum: number, s: CustomerHealthScoreRow) => sum + s.overallScore, 0) / healthScores.length)
        : 0;

      // Get risk metrics
      const activeRisks = await this.db.select({ count: sql<number>`count(*)` })
        .from(riskFactors)
        .where(and(
          eq(riskFactors.tenantId, tenantId),
          eq(riskFactors.isActive, true)
        ));

      const resolvedRisks = await this.db.select({ count: sql<number>`count(*)` })
        .from(riskFactors)
        .where(and(
          eq(riskFactors.tenantId, tenantId),
          eq(riskFactors.isActive, false),
          gte(riskFactors.resolvedAt, startDate),
          lte(riskFactors.resolvedAt, endDate)
        ));

      return Result.ok({
        tenantId,
        period,
        periodStart: startDate,
        periodEnd: endDate,
        grossRetentionRate,
        netRetentionRate,
        churnRate: 100 - grossRetentionRate,
        churnedCustomers: churnedCustomers.length,
        churnedMrr,
        expansionMrr,
        expansionCustomers: wonExpansions.length,
        upsellRevenue: wonExpansions
          .filter((e: ExpansionOpportunityRow) => e.type === 'upsell' || e.type === 'upgrade')
          .reduce((sum: number, e: ExpansionOpportunityRow) => sum + e.estimatedValue, 0),
        crossSellRevenue: wonExpansions
          .filter((e: ExpansionOpportunityRow) => e.type === 'cross_sell' || e.type === 'add_on')
          .reduce((sum: number, e: ExpansionOpportunityRow) => sum + e.estimatedValue, 0),
        avgHealthScore,
        healthScoreImprovement: 0, // Would calculate from history
        customersImproved: 0,
        customersDeclined: 0,
        avgNps: 0, // Would aggregate from engagement metrics
        avgCsat: 0,
        qbrsCompleted: 0,
        trainingCompleted: 0,
        activeRisks: Number(activeRisks[0]?.count || 0),
        risksResolved: Number(resolvedRisks[0]?.count || 0),
        avgTimeToResolve: 0,
      });
    } catch (error) {
      return Result.fail(`Failed to get success metrics: ${error}`);
    }
  }

  // ============================================================================
  // CONFIGURATION
  // ============================================================================

  /**
   * Get or create default health score weights
   */
  async getHealthScoreWeights(tenantId: string): Promise<HealthScoreWeights> {
    const [weights] = await this.db.select()
      .from(healthScoreWeights)
      .where(eq(healthScoreWeights.tenantId, tenantId))
      .limit(1);

    if (weights) {
      return {
        productUsage: weights.productUsageWeight,
        engagement: weights.engagementWeight,
        support: weights.supportWeight,
        financial: weights.financialWeight,
        relationship: weights.relationshipWeight,
      };
    }

    // Return defaults
    return {
      productUsage: 25,
      engagement: 20,
      support: 20,
      financial: 20,
      relationship: 15,
    };
  }

  /**
   * Update health score weights
   */
  async updateHealthScoreWeights(
    tenantId: string,
    weights: HealthScoreWeights
  ): Promise<Result<HealthScoreWeightRow>> {
    try {
      // Validate weights sum to 100
      const total = weights.productUsage + weights.engagement + weights.support +
                   weights.financial + weights.relationship;
      if (Math.abs(total - 100) > 0.01) {
        return Result.fail('Weights must sum to 100');
      }

      const existing = await this.db.select()
        .from(healthScoreWeights)
        .where(eq(healthScoreWeights.tenantId, tenantId))
        .limit(1);

      let result: HealthScoreWeightRow;

      if (existing.length > 0) {
        const [updated] = await this.db.update(healthScoreWeights)
          .set({
            productUsageWeight: weights.productUsage,
            engagementWeight: weights.engagement,
            supportWeight: weights.support,
            financialWeight: weights.financial,
            relationshipWeight: weights.relationship,
            updatedAt: new Date(),
          })
          .where(eq(healthScoreWeights.tenantId, tenantId))
          .returning();
        result = updated;
      } else {
        const [inserted] = await this.db.insert(healthScoreWeights)
          .values({
            id: uuidv4(),
            tenantId,
            productUsageWeight: weights.productUsage,
            engagementWeight: weights.engagement,
            supportWeight: weights.support,
            financialWeight: weights.financial,
            relationshipWeight: weights.relationship,
            createdAt: new Date(),
            updatedAt: new Date(),
          })
          .returning();
        result = inserted;
      }

      return Result.ok(result);
    } catch (error) {
      return Result.fail(`Failed to update weights: ${error}`);
    }
  }

  /**
   * Configure health threshold
   */
  async setHealthThreshold(
    data: {
      tenantId: string;
      name: string;
      metric: string;
      healthyMin: number;
      atRiskMin: number;
      criticalMax: number;
      weight?: number;
      lifecycleStage?: LifecycleStage;
    }
  ): Promise<Result<HealthThresholdRow>> {
    try {
      const [threshold] = await this.db.insert(healthThresholds)
        .values({
          id: uuidv4(),
          tenantId: data.tenantId,
          name: data.name,
          metric: data.metric,
          healthyMin: data.healthyMin,
          atRiskMin: data.atRiskMin,
          criticalMax: data.criticalMax,
          weight: data.weight || 1,
          lifecycleStage: data.lifecycleStage,
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [healthThresholds.tenantId, healthThresholds.metric, healthThresholds.lifecycleStage],
          set: {
            name: data.name,
            healthyMin: data.healthyMin,
            atRiskMin: data.atRiskMin,
            criticalMax: data.criticalMax,
            weight: data.weight || 1,
            updatedAt: new Date(),
          },
        })
        .returning();

      return Result.ok(threshold);
    } catch (error) {
      return Result.fail(`Failed to set threshold: ${error}`);
    }
  }

  // ============================================================================
  // PRIVATE HELPER METHODS
  // ============================================================================

  private calculateProductUsageScore(metrics: Partial<ProductUsageMetrics>): number {
    let score = 50; // Base score

    // License utilization (0-30 points)
    if (metrics.licenseUtilization !== undefined) {
      score += Math.min(30, metrics.licenseUtilization * 0.3);
    }

    // Feature adoption (0-25 points)
    if (metrics.featureAdoptionRate !== undefined) {
      score += Math.min(25, metrics.featureAdoptionRate * 0.25);
    }

    // Login frequency (0-20 points)
    if (metrics.loginFrequency !== undefined) {
      score += Math.min(20, metrics.loginFrequency * 4);
    }

    // Recency penalty
    if (metrics.lastActivityDate) {
      const daysSinceActivity = Math.round(
        (Date.now() - new Date(metrics.lastActivityDate).getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysSinceActivity > 14) {
        score -= Math.min(30, (daysSinceActivity - 14) * 2);
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateEngagementScore(metrics: Partial<EngagementMetrics>): number {
    let score = 50;

    // NPS contribution (-30 to +30)
    if (metrics.npsScore !== undefined && metrics.npsScore !== null) {
      score += Math.round((metrics.npsScore / 100) * 30);
    }

    // CSAT contribution (0-20)
    if (metrics.csatScore !== undefined && metrics.csatScore !== null) {
      score += Math.round((metrics.csatScore / 100) * 20);
    }

    // Training completion (0-15)
    if (metrics.trainingCompletion !== undefined) {
      score += Math.round(metrics.trainingCompletion * 0.15);
    }

    // Executive sponsor (0-10)
    if (metrics.executiveSponsorEngagement) {
      score += 10;
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateSupportScore(metrics: Partial<SupportMetrics>): number {
    let score = 80; // Start high, deduct for issues

    // Open tickets penalty
    if (metrics.openTickets !== undefined) {
      score -= Math.min(20, metrics.openTickets * 4);
    }

    // Escalated tickets penalty
    if (metrics.escalatedTickets !== undefined) {
      score -= Math.min(20, metrics.escalatedTickets * 10);
    }

    // Critical issues penalty
    if (metrics.criticalIssues !== undefined) {
      score -= Math.min(30, metrics.criticalIssues * 15);
    }

    // Support satisfaction bonus
    if (metrics.supportSatisfaction !== undefined) {
      score += Math.round((metrics.supportSatisfaction - 50) * 0.4);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateFinancialScore(metrics: Partial<FinancialMetrics>): number {
    let score = 70;

    // Payment history (0-20)
    if (metrics.paymentHistory !== undefined) {
      score += Math.round((metrics.paymentHistory - 50) * 0.4);
    }

    // Expansion revenue bonus (0-15)
    if (metrics.expansionRevenue !== undefined && metrics.currentMrr !== undefined && metrics.currentMrr > 0) {
      const expansionRate = metrics.expansionRevenue / metrics.currentMrr;
      score += Math.min(15, Math.round(expansionRate * 100));
    }

    // Billing issues penalty
    if (metrics.billingIssues !== undefined) {
      score -= Math.min(15, metrics.billingIssues * 5);
    }

    // Days to renewal consideration
    if (metrics.daysToRenewal !== undefined && metrics.daysToRenewal <= 30) {
      // Close to renewal, slightly reduce score if other metrics aren't great
      if (score < 60) {
        score -= 10;
      }
    }

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private calculateRelationshipScore(metrics: Partial<RelationshipMetrics>): number {
    let score = 50;

    // Champion count (0-20)
    if (metrics.championCount !== undefined) {
      score += Math.min(20, metrics.championCount * 5);
    }

    // Stakeholder coverage (0-15)
    if (metrics.stakeholderCoverage !== undefined) {
      score += Math.round(metrics.stakeholderCoverage * 0.15);
    }

    // Communication frequency (0-15)
    if (metrics.communicationFrequency !== undefined) {
      score += Math.min(15, metrics.communicationFrequency * 3);
    }

    // Referrals bonus (0-10)
    if (metrics.referralsMade !== undefined) {
      score += Math.min(10, metrics.referralsMade * 5);
    }

    // Case study / advisory board (0-10)
    if (metrics.caseStudyParticipant) score += 5;
    if (metrics.advisoryBoardMember) score += 5;

    return Math.max(0, Math.min(100, Math.round(score)));
  }

  private determineHealthStatus(score: number): HealthStatus {
    if (score >= 70) return 'healthy';
    if (score >= 40) return 'at_risk';
    return 'critical';
  }

  private determineHealthTrend(currentScore: number, previousScore: number | null): HealthTrend {
    if (previousScore === null) return 'stable';
    const diff = currentScore - previousScore;
    if (diff >= 5) return 'improving';
    if (diff <= -5) return 'declining';
    return 'stable';
  }

  private async getPreviousScore(customerId: string, tenantId: string): Promise<number | null> {
    const [previous] = await this.db.select()
      .from(healthScoreHistory)
      .where(and(
        eq(healthScoreHistory.customerId, customerId),
        eq(healthScoreHistory.tenantId, tenantId)
      ))
      .orderBy(desc(healthScoreHistory.periodEnd))
      .limit(1);

    return previous?.overallScore || null;
  }

  private async determineLifecycleStage(
    customerId: string,
    tenantId: string,
    financialMetrics: Partial<FinancialMetrics>
  ): Promise<LifecycleStage> {
    // Get customer data
    const [customer] = await this.db.select()
      .from(customers)
      .where(and(
        eq(customers.id, customerId),
        eq(customers.tenantId, tenantId)
      ))
      .limit(1);

    if (!customer) return 'onboarding';

    const daysSinceCreation = Math.round(
      (Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Renewal approaching?
    if (financialMetrics.daysToRenewal !== undefined && financialMetrics.daysToRenewal <= 60) {
      return 'renewal';
    }

    // Based on tenure
    if (daysSinceCreation < 30) return 'onboarding';
    if (daysSinceCreation < 90) return 'adoption';
    if (daysSinceCreation < 365) return 'growth';
    return 'maturity';
  }

  private async getDaysInStage(
    customerId: string,
    tenantId: string,
    currentStage: LifecycleStage
  ): Promise<number> {
    // Get last score with different stage
    const [lastDifferentStage] = await this.db.select()
      .from(healthScoreHistory)
      .where(and(
        eq(healthScoreHistory.customerId, customerId),
        eq(healthScoreHistory.tenantId, tenantId)
      ))
      .orderBy(desc(healthScoreHistory.periodEnd))
      .limit(1);

    if (!lastDifferentStage) return 0;

    return Math.round(
      (Date.now() - new Date(lastDifferentStage.periodEnd).getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  private async identifyRiskFactors(
    customerId: string,
    tenantId: string,
    metrics: {
      productUsage: ProductUsageMetrics;
      engagement: EngagementMetrics;
      support: SupportMetrics;
      financial: FinancialMetrics;
      relationship: RelationshipMetrics;
    },
    healthStatus: HealthStatus
  ): Promise<RiskFactorRow[]> {
    const risks: Array<{
      category: string;
      severity: RiskLevel;
      description: string;
      metric: string;
      currentValue: number;
      thresholdValue: number;
      impact: number;
      suggestedAction: string;
    }> = [];

    // Check product usage risks
    if (metrics.productUsage.licenseUtilization < 50) {
      risks.push({
        category: 'usage',
        severity: metrics.productUsage.licenseUtilization < 25 ? 'high' : 'medium',
        description: 'Low license utilization indicates underadoption',
        metric: 'licenseUtilization',
        currentValue: metrics.productUsage.licenseUtilization,
        thresholdValue: 50,
        impact: 15,
        suggestedAction: 'Schedule adoption review meeting to identify blockers',
      });
    }

    if (metrics.productUsage.loginFrequency < 2) {
      risks.push({
        category: 'usage',
        severity: 'medium',
        description: 'Low login frequency suggests reduced engagement',
        metric: 'loginFrequency',
        currentValue: metrics.productUsage.loginFrequency,
        thresholdValue: 2,
        impact: 10,
        suggestedAction: 'Initiate re-engagement campaign with value proposition',
      });
    }

    // Check engagement risks
    if (metrics.engagement.npsScore !== null && metrics.engagement.npsScore < 0) {
      risks.push({
        category: 'engagement',
        severity: metrics.engagement.npsScore < -30 ? 'critical' : 'high',
        description: 'Negative NPS indicates customer dissatisfaction',
        metric: 'npsScore',
        currentValue: metrics.engagement.npsScore,
        thresholdValue: 0,
        impact: 20,
        suggestedAction: 'Immediate executive outreach to understand concerns',
      });
    }

    // Check support risks
    if (metrics.support.escalatedTickets > 0) {
      risks.push({
        category: 'support',
        severity: metrics.support.escalatedTickets > 2 ? 'high' : 'medium',
        description: 'Escalated support tickets indicate unresolved issues',
        metric: 'escalatedTickets',
        currentValue: metrics.support.escalatedTickets,
        thresholdValue: 0,
        impact: 15,
        suggestedAction: 'Review and prioritize resolution of escalated tickets',
      });
    }

    if (metrics.support.criticalIssues > 0) {
      risks.push({
        category: 'support',
        severity: 'critical',
        description: 'Critical issues require immediate attention',
        metric: 'criticalIssues',
        currentValue: metrics.support.criticalIssues,
        thresholdValue: 0,
        impact: 25,
        suggestedAction: 'Escalate to engineering team for urgent resolution',
      });
    }

    // Check financial risks
    if (metrics.financial.paymentHistory < 80) {
      risks.push({
        category: 'financial',
        severity: metrics.financial.paymentHistory < 60 ? 'high' : 'medium',
        description: 'Payment delays may indicate financial difficulties',
        metric: 'paymentHistory',
        currentValue: metrics.financial.paymentHistory,
        thresholdValue: 80,
        impact: 10,
        suggestedAction: 'Connect with finance to understand situation and offer flexibility',
      });
    }

    if (metrics.financial.daysToRenewal <= 30 && healthStatus !== 'healthy') {
      risks.push({
        category: 'financial',
        severity: 'critical',
        description: 'At-risk customer approaching renewal',
        metric: 'daysToRenewal',
        currentValue: metrics.financial.daysToRenewal,
        thresholdValue: 30,
        impact: 30,
        suggestedAction: 'Immediate executive involvement for renewal discussion',
      });
    }

    // Check relationship risks
    if (metrics.relationship.championCount === 0) {
      risks.push({
        category: 'relationship',
        severity: 'medium',
        description: 'No identified champion increases churn risk',
        metric: 'championCount',
        currentValue: 0,
        thresholdValue: 1,
        impact: 12,
        suggestedAction: 'Identify and cultivate potential champions in the account',
      });
    }

    // Deactivate old risks and create new ones
    await this.db.update(riskFactors)
      .set({ isActive: false, resolvedAt: new Date(), updatedAt: new Date() })
      .where(and(
        eq(riskFactors.customerId, customerId),
        eq(riskFactors.tenantId, tenantId),
        eq(riskFactors.isActive, true)
      ));

    const createdRisks: RiskFactorRow[] = [];

    for (const risk of risks) {
      const [created] = await this.db.insert(riskFactors)
        .values({
          id: uuidv4(),
          customerId,
          tenantId,
          ...risk,
          detectedAt: new Date(),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning();
      createdRisks.push(created);
    }

    return createdRisks;
  }

  private calculateRiskLevel(risks: RiskFactorRow[]): RiskLevel {
    if (risks.some(r => r.severity === 'critical')) return 'critical';
    if (risks.filter(r => r.severity === 'high').length >= 2) return 'critical';
    if (risks.some(r => r.severity === 'high')) return 'high';
    if (risks.some(r => r.severity === 'medium')) return 'medium';
    return 'low';
  }

  private calculateExpansionPotential(
    healthStatus: HealthStatus,
    productUsage: Partial<ProductUsageMetrics>,
    financial: Partial<FinancialMetrics>
  ): ExpansionPotential {
    // Only healthy customers are good expansion candidates
    if (healthStatus !== 'healthy') return 'none';

    let signals = 0;

    // High license utilization suggests need for more seats
    if (productUsage.licenseUtilization && productUsage.licenseUtilization > 80) {
      signals += 2;
    }

    // High feature adoption suggests readiness for advanced features
    if (productUsage.featureAdoptionRate && productUsage.featureAdoptionRate > 70) {
      signals += 2;
    }

    // Growing data volume suggests increased usage
    if (productUsage.dataVolumeGrowth && productUsage.dataVolumeGrowth > 20) {
      signals += 1;
    }

    // Good payment history
    if (financial.paymentHistory && financial.paymentHistory > 90) {
      signals += 1;
    }

    if (signals >= 5) return 'high';
    if (signals >= 3) return 'medium';
    if (signals >= 1) return 'low';
    return 'none';
  }

  private predictChurn(
    overallScore: number,
    trend: HealthTrend,
    risks: RiskFactorRow[],
    engagement: Partial<EngagementMetrics>
  ): { churnRisk: number; confidence: number; recommendations: string[] } {
    let churnRisk = 100 - overallScore;

    // Adjust for trend
    if (trend === 'declining') churnRisk += 15;
    if (trend === 'improving') churnRisk -= 10;

    // Adjust for critical risks
    const criticalRisks = risks.filter(r => r.severity === 'critical').length;
    churnRisk += criticalRisks * 10;

    // Adjust for NPS
    if (engagement.npsScore !== undefined && engagement.npsScore !== null) {
      if (engagement.npsScore < -30) churnRisk += 15;
      if (engagement.npsScore > 50) churnRisk -= 10;
    }

    churnRisk = Math.max(0, Math.min(100, churnRisk));

    // Confidence based on data completeness
    let confidence = 60;
    if (engagement.npsScore !== undefined) confidence += 10;
    if (risks.length > 0) confidence += 10;
    if (trend !== 'stable') confidence += 10;

    // Generate recommendations
    const recommendations: string[] = [];

    if (churnRisk > 70) {
      recommendations.push('Immediate executive intervention recommended');
    }
    if (risks.some(r => r.category === 'usage')) {
      recommendations.push('Schedule adoption review to address usage concerns');
    }
    if (risks.some(r => r.category === 'support')) {
      recommendations.push('Prioritize resolution of open support issues');
    }
    if (trend === 'declining') {
      recommendations.push('Investigate recent changes causing score decline');
    }

    return { churnRisk, confidence, recommendations };
  }

  private async saveHealthScoreHistory(
    customerId: string,
    tenantId: string,
    score: CustomerHealthScoreRow
  ): Promise<void> {
    const periodEnd = new Date();
    const periodStart = new Date(periodEnd);
    periodStart.setDate(periodStart.getDate() - 1);

    await this.db.insert(healthScoreHistory)
      .values({
        id: uuidv4(),
        customerId,
        tenantId,
        overallScore: score.overallScore,
        healthStatus: score.healthStatus,
        productUsageScore: score.productUsageScore,
        engagementScore: score.engagementScore,
        supportScore: score.supportScore,
        financialScore: score.financialScore,
        relationshipScore: score.relationshipScore,
        periodStart,
        periodEnd,
        createdAt: new Date(),
      })
      .onConflictDoNothing();
  }

  private async checkAndTriggerPlaybooks(
    customerId: string,
    tenantId: string,
    score: CustomerHealthScoreRow
  ): Promise<void> {
    // Get active playbooks for this tenant
    const playbooks = await this.db.select()
      .from(successPlaybooks)
      .where(and(
        eq(successPlaybooks.tenantId, tenantId),
        eq(successPlaybooks.isActive, true)
      ))
      .orderBy(asc(successPlaybooks.priority));

    for (const playbook of playbooks) {
      // Check if playbook should trigger
      const targetStatuses = playbook.targetHealthStatuses as HealthStatus[] || [];
      const targetStages = playbook.targetLifecycleStages as LifecycleStage[] || [];

      const statusMatch = targetStatuses.length === 0 ||
                         targetStatuses.includes(score.healthStatus as HealthStatus);
      const stageMatch = targetStages.length === 0 ||
                        targetStages.includes(score.lifecycleStage as LifecycleStage);

      if (statusMatch && stageMatch) {
        // Check if already running
        const existing = await this.db.select()
          .from(playbookExecutions)
          .where(and(
            eq(playbookExecutions.playbookId, playbook.id),
            eq(playbookExecutions.customerId, customerId),
            eq(playbookExecutions.status, 'active')
          ))
          .limit(1);

        if (existing.length === 0) {
          // Start playbook
          await this.startPlaybookExecution(playbook.id, customerId, tenantId);
        }
      }
    }
  }

  private mapRowToHealthScore(
    row: CustomerHealthScoreRow,
    risks: RiskFactorRow[],
    expansions: ExpansionOpportunityRow[]
  ): CustomerHealthScore {
    return {
      id: row.id,
      customerId: row.customerId,
      tenantId: row.tenantId,
      overallScore: row.overallScore,
      healthStatus: row.healthStatus as HealthStatus,
      healthTrend: row.healthTrend as HealthTrend,
      productUsageScore: row.productUsageScore,
      engagementScore: row.engagementScore,
      supportScore: row.supportScore,
      financialScore: row.financialScore,
      relationshipScore: row.relationshipScore,
      productUsageMetrics: row.productUsageMetrics as ProductUsageMetrics,
      engagementMetrics: row.engagementMetrics as EngagementMetrics,
      supportMetrics: row.supportMetrics as SupportMetrics,
      financialMetrics: row.financialMetrics as FinancialMetrics,
      relationshipMetrics: row.relationshipMetrics as RelationshipMetrics,
      aiPredictedChurnRisk: row.aiPredictedChurnRisk || 0,
      aiConfidenceLevel: row.aiConfidenceLevel || 0,
      aiRecommendations: row.aiRecommendations as string[] || [],
      lifecycleStage: row.lifecycleStage as LifecycleStage,
      daysInStage: row.daysInStage,
      riskLevel: row.riskLevel as RiskLevel,
      riskFactors: risks.map(r => ({
        id: r.id,
        customerId: r.customerId,
        tenantId: r.tenantId,
        category: r.category as 'usage' | 'engagement' | 'support' | 'financial' | 'relationship',
        severity: r.severity as RiskLevel,
        description: r.description,
        metric: r.metric,
        currentValue: r.currentValue,
        thresholdValue: r.thresholdValue,
        impact: r.impact,
        suggestedAction: r.suggestedAction || '',
        detectedAt: r.detectedAt,
        resolvedAt: r.resolvedAt,
        isActive: r.isActive,
      })),
      expansionPotential: row.expansionPotential as ExpansionPotential,
      expansionOpportunities: expansions.map(e => ({
        id: e.id,
        customerId: e.customerId,
        tenantId: e.tenantId,
        type: e.type as 'upsell' | 'cross_sell' | 'upgrade' | 'seats' | 'add_on',
        product: e.product,
        estimatedValue: e.estimatedValue,
        confidence: e.confidence,
        signals: e.signals as string[],
        reasoning: e.reasoning || '',
        suggestedApproach: e.suggestedApproach || '',
        status: e.status as 'identified' | 'qualified' | 'pursuing' | 'won' | 'lost',
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
      calculatedAt: row.calculatedAt,
      nextCalculation: row.nextCalculation || new Date(),
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private getDefaultProductUsageMetrics(): ProductUsageMetrics {
    return {
      dailyActiveUsers: 0,
      monthlyActiveUsers: 0,
      licenseUtilization: 0,
      featureAdoptionRate: 0,
      coreFeatureUsage: 0,
      loginFrequency: 0,
      sessionDuration: 0,
      apiCallVolume: 0,
      dataVolumeGrowth: 0,
      integrationCount: 0,
      lastActivityDate: new Date(),
    };
  }

  private getDefaultEngagementMetrics(): EngagementMetrics {
    return {
      npsScore: null,
      csatScore: null,
      surveyResponseRate: 0,
      emailOpenRate: 0,
      meetingAttendance: 0,
      trainingCompletion: 0,
      communityParticipation: 0,
      eventAttendance: 0,
      feedbackSubmissions: 0,
      executiveSponsorEngagement: false,
    };
  }

  private getDefaultSupportMetrics(): SupportMetrics {
    return {
      totalTickets: 0,
      openTickets: 0,
      escalatedTickets: 0,
      avgResolutionTime: 0,
      firstResponseTime: 0,
      ticketSentiment: 50,
      repeatIssues: 0,
      criticalIssues: 0,
      supportSatisfaction: 50,
      documentationUsage: 0,
    };
  }

  private getDefaultFinancialMetrics(): FinancialMetrics {
    return {
      currentMrr: 0,
      contractValue: 0,
      paymentHistory: 100,
      daysToRenewal: 365,
      expansionRevenue: 0,
      contractionRisk: 0,
      lifetimeValue: 0,
      billingIssues: 0,
      discountLevel: 0,
      priceIncreaseAcceptance: true,
    };
  }

  private getDefaultRelationshipMetrics(): RelationshipMetrics {
    return {
      executiveSponsorLevel: '',
      championCount: 0,
      decisionMakerEngagement: 0,
      stakeholderCoverage: 0,
      lastExecutiveMeeting: null,
      communicationFrequency: 0,
      relationshipAge: 0,
      referralsMade: 0,
      caseStudyParticipant: false,
      advisoryBoardMember: false,
    };
  }
}

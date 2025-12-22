/**
 * Forecasting Service
 * Sales forecasting with weighted pipeline, trend analysis, and revenue projections
 */

import { injectable, inject } from 'tsyringe';
import { eq, and, gte, lte, sql, desc, asc, between } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '@zuclubit/domain';
import {
  forecasts,
  forecastLineItems,
  forecastAdjustments,
  pipelineSnapshots,
  stageProbabilities,
  dealVelocitySnapshots,
  aiPredictions,
  opportunities,
  ForecastRow,
  ForecastLineItemRow,
  ForecastAdjustmentRow,
  PipelineSnapshotRow,
  StageProbabilityRow,
  OpportunityRow,
} from '../database/schema';
import type {
  Forecast,
  ForecastLineItem,
  ForecastAdjustment,
  PipelineSnapshot,
  StageMetrics,
  CategoryMetrics,
  StageProbability,
  ForecastTrend,
  WinLossAnalysis,
  RevenueProjection,
  PeriodProjection,
  OpportunityInsight,
  RiskFactor,
  DealVelocity,
  ForecastRollup,
  AIPrediction,
  CreateForecastInput,
  UpdateForecastInput,
  OverrideForecastItemInput,
  AdjustForecastInput,
  SetStageProbabilityInput,
  GetForecastsInput,
  GetPipelineAnalysisInput,
  GetProjectionInput,
  GetVelocityInput,
  GetWinLossInput,
  GetRollupInput,
  ForecastCategory,
  ForecastPeriod,
  ForecastStatus,
} from './types';

@injectable()
export class ForecastingService {
  private db: any;

  constructor(@inject('Database') db: any) {
    this.db = db;
  }

  // ==================== Forecast CRUD ====================

  /**
   * Create a new forecast for a period
   */
  async createForecast(
    tenantId: string,
    userId: string,
    input: CreateForecastInput
  ): Promise<Result<Forecast>> {
    try {
      const forecastId = uuidv4();

      // Get period name if not provided
      const periodName = input.name || this.generatePeriodName(input.period, input.periodStart);

      // Create forecast
      const [forecastRow] = await this.db.insert(forecasts).values({
        id: forecastId,
        tenantId,
        userId,
        name: periodName,
        period: input.period,
        periodStart: input.periodStart,
        periodEnd: input.periodEnd,
        quota: input.quota || 0,
        notes: input.notes,
        status: 'draft',
      }).returning();

      // Populate with opportunities from the period
      await this.populateForecastLineItems(tenantId, userId, forecastId, input.periodStart, input.periodEnd);

      // Calculate totals
      await this.recalculateForecastTotals(forecastId);

      // Fetch the updated forecast
      return this.getForecast(tenantId, forecastId);
    } catch (error) {
      return Result.fail(`Failed to create forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get forecast by ID
   */
  async getForecast(tenantId: string, forecastId: string): Promise<Result<Forecast>> {
    try {
      const [forecastRow] = await this.db.select()
        .from(forecasts)
        .where(and(eq(forecasts.tenantId, tenantId), eq(forecasts.id, forecastId)));

      if (!forecastRow) {
        return Result.fail('Forecast not found');
      }

      // Get adjustments
      const adjustments = await this.db.select()
        .from(forecastAdjustments)
        .where(eq(forecastAdjustments.forecastId, forecastId))
        .orderBy(desc(forecastAdjustments.adjustedAt));

      return Result.ok(this.mapForecastRowToForecast(forecastRow, adjustments));
    } catch (error) {
      return Result.fail(`Failed to get forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List forecasts
   */
  async listForecasts(
    tenantId: string,
    input: GetForecastsInput
  ): Promise<Result<{ forecasts: Forecast[]; total: number }>> {
    try {
      const conditions = [eq(forecasts.tenantId, tenantId)];

      if (input.userId) {
        conditions.push(eq(forecasts.userId, input.userId));
      }
      if (input.period) {
        conditions.push(eq(forecasts.period, input.period));
      }
      if (input.status) {
        conditions.push(eq(forecasts.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(forecasts.periodStart, input.startDate));
      }
      if (input.endDate) {
        conditions.push(lte(forecasts.periodEnd, input.endDate));
      }

      const [countResult] = await this.db.select({ count: sql<number>`count(*)` })
        .from(forecasts)
        .where(and(...conditions));

      const forecastRows = await this.db.select()
        .from(forecasts)
        .where(and(...conditions))
        .orderBy(desc(forecasts.periodStart))
        .limit(input.limit || 50)
        .offset(input.offset || 0);

      const result: Forecast[] = [];
      for (const row of forecastRows) {
        const adjustments = await this.db.select()
          .from(forecastAdjustments)
          .where(eq(forecastAdjustments.forecastId, row.id));
        result.push(this.mapForecastRowToForecast(row, adjustments));
      }

      return Result.ok({
        forecasts: result,
        total: Number(countResult.count),
      });
    } catch (error) {
      return Result.fail(`Failed to list forecasts: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Update forecast
   */
  async updateForecast(
    tenantId: string,
    forecastId: string,
    input: UpdateForecastInput
  ): Promise<Result<Forecast>> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.quota !== undefined) updateData.quota = input.quota;
      if (input.notes !== undefined) updateData.notes = input.notes;
      if (input.status !== undefined) {
        updateData.status = input.status;
        if (input.status === 'submitted') {
          updateData.submittedAt = new Date();
        } else if (input.status === 'approved') {
          updateData.approvedAt = new Date();
        }
      }

      await this.db.update(forecasts)
        .set(updateData)
        .where(and(eq(forecasts.tenantId, tenantId), eq(forecasts.id, forecastId)));

      // Recalculate quota attainment if quota changed
      if (input.quota !== undefined) {
        await this.recalculateForecastTotals(forecastId);
      }

      return this.getForecast(tenantId, forecastId);
    } catch (error) {
      return Result.fail(`Failed to update forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Submit forecast for approval
   */
  async submitForecast(tenantId: string, forecastId: string): Promise<Result<Forecast>> {
    return this.updateForecast(tenantId, forecastId, { status: 'submitted' });
  }

  /**
   * Approve forecast
   */
  async approveForecast(tenantId: string, forecastId: string, approverId: string): Promise<Result<Forecast>> {
    try {
      await this.db.update(forecasts)
        .set({
          status: 'approved',
          approvedAt: new Date(),
          approvedBy: approverId,
          updatedAt: new Date(),
        })
        .where(and(eq(forecasts.tenantId, tenantId), eq(forecasts.id, forecastId)));

      return this.getForecast(tenantId, forecastId);
    } catch (error) {
      return Result.fail(`Failed to approve forecast: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Forecast Line Items ====================

  /**
   * Get forecast line items
   */
  async getForecastLineItems(
    tenantId: string,
    forecastId: string,
    options?: { category?: ForecastCategory; ownerUserId?: string }
  ): Promise<Result<ForecastLineItem[]>> {
    try {
      // Verify forecast belongs to tenant
      const [forecastRow] = await this.db.select()
        .from(forecasts)
        .where(and(eq(forecasts.tenantId, tenantId), eq(forecasts.id, forecastId)));

      if (!forecastRow) {
        return Result.fail('Forecast not found');
      }

      const conditions = [eq(forecastLineItems.forecastId, forecastId)];

      if (options?.category) {
        conditions.push(eq(forecastLineItems.category, options.category));
      }
      if (options?.ownerUserId) {
        conditions.push(eq(forecastLineItems.ownerUserId, options.ownerUserId));
      }

      const items = await this.db.select()
        .from(forecastLineItems)
        .where(and(...conditions))
        .orderBy(desc(forecastLineItems.expectedCloseDate));

      return Result.ok(items.map((item: ForecastLineItemRow) => this.mapLineItemRowToLineItem(item)));
    } catch (error) {
      return Result.fail(`Failed to get forecast line items: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Override a forecast line item
   */
  async overrideForecastItem(
    tenantId: string,
    forecastId: string,
    itemId: string,
    userId: string,
    input: OverrideForecastItemInput
  ): Promise<Result<ForecastLineItem>> {
    try {
      // Verify forecast belongs to tenant
      const [forecastRow] = await this.db.select()
        .from(forecasts)
        .where(and(eq(forecasts.tenantId, tenantId), eq(forecasts.id, forecastId)));

      if (!forecastRow) {
        return Result.fail('Forecast not found');
      }

      const updateData: Record<string, unknown> = {
        overrideReason: input.reason,
        updatedAt: new Date(),
      };

      if (input.category) {
        updateData.overrideCategory = input.category;
      }
      if (input.amount !== undefined) {
        updateData.overrideAmount = input.amount;
      }

      await this.db.update(forecastLineItems)
        .set(updateData)
        .where(and(eq(forecastLineItems.forecastId, forecastId), eq(forecastLineItems.id, itemId)));

      // Recalculate totals
      await this.recalculateForecastTotals(forecastId);

      const [updated] = await this.db.select()
        .from(forecastLineItems)
        .where(eq(forecastLineItems.id, itemId));

      return Result.ok(this.mapLineItemRowToLineItem(updated));
    } catch (error) {
      return Result.fail(`Failed to override forecast item: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Add adjustment to forecast
   */
  async addForecastAdjustment(
    tenantId: string,
    forecastId: string,
    userId: string,
    input: AdjustForecastInput
  ): Promise<Result<Forecast>> {
    try {
      // Verify forecast belongs to tenant
      const [forecastRow] = await this.db.select()
        .from(forecasts)
        .where(and(eq(forecasts.tenantId, tenantId), eq(forecasts.id, forecastId)));

      if (!forecastRow) {
        return Result.fail('Forecast not found');
      }

      await this.db.insert(forecastAdjustments).values({
        id: uuidv4(),
        forecastId,
        category: input.category,
        amount: input.amount,
        reason: input.reason,
        adjustedBy: userId,
        adjustedAt: new Date(),
      });

      // Recalculate totals
      await this.recalculateForecastTotals(forecastId);

      return this.getForecast(tenantId, forecastId);
    } catch (error) {
      return Result.fail(`Failed to add adjustment: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Pipeline Analysis ====================

  /**
   * Get current pipeline analysis
   */
  async getPipelineAnalysis(
    tenantId: string,
    input: GetPipelineAnalysisInput
  ): Promise<Result<PipelineSnapshot>> {
    try {
      // Get opportunities in period
      const conditions = [
        eq(opportunities.tenantId, tenantId),
        gte(opportunities.expectedCloseDate, input.startDate),
        lte(opportunities.expectedCloseDate, input.endDate),
      ];

      if (input.userId) {
        conditions.push(eq(opportunities.ownerId, input.userId));
      }

      const opps = await this.db.select()
        .from(opportunities)
        .where(and(...conditions));

      // Get stage probabilities
      const probs = await this.db.select()
        .from(stageProbabilities)
        .where(eq(stageProbabilities.tenantId, tenantId));

      const probMap = new Map(probs.map((p: StageProbabilityRow) => [p.stageName, p]));

      // Calculate metrics
      let totalValue = 0;
      let weightedValue = 0;
      const stageMap = new Map<string, StageMetrics>();
      const categoryMap = new Map<string, CategoryMetrics>();

      for (const opp of opps as OpportunityRow[]) {
        const prob = probMap.get(opp.stage) as StageProbabilityRow | undefined;
        const probability = prob?.adjustedProbability || prob?.defaultProbability || 50;
        const amount = opp.amount || 0;
        const weighted = Math.round(amount * (probability / 100));

        totalValue += amount;
        weightedValue += weighted;

        // By stage
        if (!stageMap.has(opp.stage)) {
          stageMap.set(opp.stage, {
            stageName: opp.stage,
            stageOrder: prob?.stageOrder || 0,
            dealCount: 0,
            totalValue: 0,
            weightedValue: 0,
            probability,
            avgAge: 0,
          });
        }
        const stageMetrics = stageMap.get(opp.stage)!;
        stageMetrics.dealCount++;
        stageMetrics.totalValue += amount;
        stageMetrics.weightedValue += weighted;

        // By category (based on stage probability)
        const category = this.determineForecastCategory(probability);
        if (!categoryMap.has(category)) {
          categoryMap.set(category, {
            category: category as ForecastCategory,
            dealCount: 0,
            totalValue: 0,
            weightedValue: 0,
          });
        }
        const categoryMetrics = categoryMap.get(category)!;
        categoryMetrics.dealCount++;
        categoryMetrics.totalValue += amount;
        categoryMetrics.weightedValue += weighted;
      }

      const snapshot: PipelineSnapshot = {
        id: uuidv4(),
        tenantId,
        snapshotDate: new Date(),
        totalValue,
        totalDeals: opps.length,
        weightedValue,
        avgDealSize: opps.length > 0 ? Math.round(totalValue / opps.length) : 0,
        byStage: Array.from(stageMap.values()).sort((a, b) => a.stageOrder - b.stageOrder),
        byCategory: Array.from(categoryMap.values()),
        addedValue: 0,
        addedDeals: 0,
        removedValue: 0,
        removedDeals: 0,
        movedUpValue: 0,
        movedDownValue: 0,
        createdAt: new Date(),
      };

      return Result.ok(snapshot);
    } catch (error) {
      return Result.fail(`Failed to get pipeline analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Take a pipeline snapshot (for historical tracking)
   */
  async takePipelineSnapshot(tenantId: string): Promise<Result<PipelineSnapshot>> {
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfQuarter = this.getQuarterEnd(now);

      const analysisResult = await this.getPipelineAnalysis(tenantId, {
        startDate: startOfDay,
        endDate: endOfQuarter,
      });

      if (analysisResult.isFailure || !analysisResult.value) {
        return Result.fail('Failed to get pipeline analysis');
      }

      const analysis = analysisResult.value;

      // Save snapshot
      const [snapshotRow] = await this.db.insert(pipelineSnapshots).values({
        id: uuidv4(),
        tenantId,
        snapshotDate: startOfDay,
        totalValue: analysis.totalValue,
        totalDeals: analysis.totalDeals,
        weightedValue: analysis.weightedValue,
        avgDealSize: analysis.avgDealSize,
        byStage: analysis.byStage,
        byCategory: analysis.byCategory,
        addedValue: 0,
        addedDeals: 0,
        removedValue: 0,
        removedDeals: 0,
        movedUpValue: 0,
        movedDownValue: 0,
      }).returning();

      return Result.ok(this.mapSnapshotRowToSnapshot(snapshotRow));
    } catch (error) {
      return Result.fail(`Failed to take snapshot: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get pipeline history (snapshots over time)
   */
  async getPipelineHistory(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<PipelineSnapshot[]>> {
    try {
      const snapshots = await this.db.select()
        .from(pipelineSnapshots)
        .where(and(
          eq(pipelineSnapshots.tenantId, tenantId),
          gte(pipelineSnapshots.snapshotDate, startDate),
          lte(pipelineSnapshots.snapshotDate, endDate)
        ))
        .orderBy(asc(pipelineSnapshots.snapshotDate));

      return Result.ok(snapshots.map((s: PipelineSnapshotRow) => this.mapSnapshotRowToSnapshot(s)));
    } catch (error) {
      return Result.fail(`Failed to get pipeline history: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Stage Probabilities ====================

  /**
   * Set stage probability
   */
  async setStageProbability(
    tenantId: string,
    input: SetStageProbabilityInput
  ): Promise<Result<StageProbability>> {
    try {
      const [existing] = await this.db.select()
        .from(stageProbabilities)
        .where(and(
          eq(stageProbabilities.tenantId, tenantId),
          eq(stageProbabilities.pipelineId, input.pipelineId),
          eq(stageProbabilities.stageName, input.stageName)
        ));

      if (existing) {
        // Update existing
        await this.db.update(stageProbabilities)
          .set({
            adjustedProbability: input.probability,
            updatedAt: new Date(),
          })
          .where(eq(stageProbabilities.id, existing.id));

        const [updated] = await this.db.select()
          .from(stageProbabilities)
          .where(eq(stageProbabilities.id, existing.id));

        return Result.ok(this.mapProbabilityRowToProbability(updated));
      } else {
        // Create new
        const [created] = await this.db.insert(stageProbabilities).values({
          id: uuidv4(),
          tenantId,
          pipelineId: input.pipelineId,
          stageName: input.stageName,
          stageOrder: 0,
          defaultProbability: input.probability,
          adjustedProbability: input.probability,
        }).returning();

        return Result.ok(this.mapProbabilityRowToProbability(created));
      }
    } catch (error) {
      return Result.fail(`Failed to set stage probability: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get stage probabilities for a pipeline
   */
  async getStageProbabilities(
    tenantId: string,
    pipelineId: string
  ): Promise<Result<StageProbability[]>> {
    try {
      const probs = await this.db.select()
        .from(stageProbabilities)
        .where(and(
          eq(stageProbabilities.tenantId, tenantId),
          eq(stageProbabilities.pipelineId, pipelineId)
        ))
        .orderBy(asc(stageProbabilities.stageOrder));

      return Result.ok(probs.map((p: StageProbabilityRow) => this.mapProbabilityRowToProbability(p)));
    } catch (error) {
      return Result.fail(`Failed to get stage probabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculate historical win rates and update probabilities
   */
  async calculateHistoricalProbabilities(
    tenantId: string,
    pipelineId: string
  ): Promise<Result<StageProbability[]>> {
    try {
      // Get all closed opportunities to calculate win rates
      const closedOpps = await this.db.select()
        .from(opportunities)
        .where(and(
          eq(opportunities.tenantId, tenantId),
          sql`${opportunities.status} IN ('won', 'lost')`
        ));

      // Group by stage and calculate win rate
      const stageStats = new Map<string, { won: number; lost: number; totalDays: number; count: number }>();

      for (const opp of closedOpps) {
        // This would need stage history tracking for accurate calculation
        // For now, use final stage
        const stage = opp.stage;
        if (!stageStats.has(stage)) {
          stageStats.set(stage, { won: 0, lost: 0, totalDays: 0, count: 0 });
        }
        const stats = stageStats.get(stage)!;
        if (opp.status === 'won') {
          stats.won++;
        } else {
          stats.lost++;
        }
        stats.count++;
      }

      // Update probabilities
      for (const [stageName, stats] of stageStats) {
        const winRate = stats.count > 0 ? Math.round((stats.won / stats.count) * 100) : 0;

        const [existing] = await this.db.select()
          .from(stageProbabilities)
          .where(and(
            eq(stageProbabilities.tenantId, tenantId),
            eq(stageProbabilities.pipelineId, pipelineId),
            eq(stageProbabilities.stageName, stageName)
          ));

        if (existing) {
          await this.db.update(stageProbabilities)
            .set({
              historicalWinRate: winRate,
              totalDeals: stats.count,
              wonDeals: stats.won,
              lostDeals: stats.lost,
              calculatedAt: new Date(),
              updatedAt: new Date(),
            })
            .where(eq(stageProbabilities.id, existing.id));
        }
      }

      return this.getStageProbabilities(tenantId, pipelineId);
    } catch (error) {
      return Result.fail(`Failed to calculate historical probabilities: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Revenue Projections ====================

  /**
   * Get revenue projection
   */
  async getRevenueProjection(
    tenantId: string,
    input: GetProjectionInput
  ): Promise<Result<RevenueProjection>> {
    try {
      const now = input.targetDate || new Date();

      // Get current month projection
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const currentMonth = await this.calculatePeriodProjection(tenantId, monthStart, monthEnd, input);

      // Get current quarter projection
      const quarterStart = this.getQuarterStart(now);
      const quarterEnd = this.getQuarterEnd(now);
      const currentQuarter = await this.calculatePeriodProjection(tenantId, quarterStart, quarterEnd, input);

      // Get current year projection
      const yearStart = new Date(now.getFullYear(), 0, 1);
      const yearEnd = new Date(now.getFullYear(), 11, 31);
      const currentYear = await this.calculatePeriodProjection(tenantId, yearStart, yearEnd, input);

      // Get next quarter projection
      const nextQuarterStart = new Date(quarterEnd);
      nextQuarterStart.setDate(nextQuarterStart.getDate() + 1);
      const nextQuarterEnd = this.getQuarterEnd(nextQuarterStart);
      const nextQuarter = await this.calculatePeriodProjection(tenantId, nextQuarterStart, nextQuarterEnd, input);

      // Determine confidence level
      const confidenceLevel = this.calculateConfidenceLevel(currentQuarter);

      const projection: RevenueProjection = {
        tenantId,
        projectionDate: now,
        currentMonth,
        currentQuarter,
        currentYear,
        nextQuarter,
        bySource: [],
        confidenceLevel,
        assumptions: [
          'Based on current pipeline weighted by stage probabilities',
          'Assumes historical conversion rates continue',
          'Does not account for seasonal variations',
        ],
      };

      return Result.ok(projection);
    } catch (error) {
      return Result.fail(`Failed to get revenue projection: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Deal Velocity ====================

  /**
   * Get deal velocity metrics
   */
  async getDealVelocity(tenantId: string, input: GetVelocityInput): Promise<Result<DealVelocity>> {
    try {
      // Get closed won opportunities in period
      const conditions = [
        eq(opportunities.tenantId, tenantId),
        eq(opportunities.status, 'won'),
        gte(opportunities.actualCloseDate, input.startDate),
        lte(opportunities.actualCloseDate, input.endDate),
      ];

      if (input.userId) {
        conditions.push(eq(opportunities.ownerId, input.userId));
      }

      const wonOpps = await this.db.select()
        .from(opportunities)
        .where(and(...conditions));

      if (wonOpps.length === 0) {
        return Result.ok({
          period: { start: input.startDate, end: input.endDate },
          avgCycleTime: 0,
          avgDealSize: 0,
          avgDealsPerRep: 0,
          velocity: 0,
          stageVelocity: [],
          repVelocity: [],
          velocityTrend: 'stable',
          cycleTimeTrend: 'stable',
        });
      }

      // Calculate metrics
      let totalCycleTime = 0;
      let totalAmount = 0;
      const repDeals = new Map<string, { count: number; totalAmount: number; totalCycleTime: number }>();

      for (const opp of wonOpps) {
        const cycleTime = opp.createdAt && opp.actualCloseDate
          ? Math.round((opp.actualCloseDate.getTime() - opp.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        totalCycleTime += cycleTime;
        totalAmount += opp.amount;

        if (!repDeals.has(opp.ownerId)) {
          repDeals.set(opp.ownerId, { count: 0, totalAmount: 0, totalCycleTime: 0 });
        }
        const repStats = repDeals.get(opp.ownerId)!;
        repStats.count++;
        repStats.totalAmount += opp.amount;
        repStats.totalCycleTime += cycleTime;
      }

      const avgCycleTime = Math.round(totalCycleTime / wonOpps.length);
      const avgDealSize = Math.round(totalAmount / wonOpps.length);
      const avgDealsPerRep = Math.round(wonOpps.length / Math.max(repDeals.size, 1));
      const velocity = avgCycleTime > 0 ? Math.round((wonOpps.length * avgDealSize) / avgCycleTime) : 0;

      const repVelocity = Array.from(repDeals.entries()).map(([userId, stats]) => ({
        userId,
        userName: '', // Would need user lookup
        avgCycleTime: Math.round(stats.totalCycleTime / stats.count),
        avgDealSize: Math.round(stats.totalAmount / stats.count),
        closedDeals: stats.count,
        velocity: stats.totalCycleTime > 0
          ? Math.round((stats.count * (stats.totalAmount / stats.count)) / (stats.totalCycleTime / stats.count))
          : 0,
      }));

      return Result.ok({
        period: { start: input.startDate, end: input.endDate },
        avgCycleTime,
        avgDealSize,
        avgDealsPerRep,
        velocity,
        stageVelocity: [],
        repVelocity,
        velocityTrend: 'stable',
        cycleTimeTrend: 'stable',
      });
    } catch (error) {
      return Result.fail(`Failed to get deal velocity: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Win/Loss Analysis ====================

  /**
   * Get win/loss analysis
   */
  async getWinLossAnalysis(tenantId: string, input: GetWinLossInput): Promise<Result<WinLossAnalysis>> {
    try {
      // Get closed opportunities in period
      const closedOpps = await this.db.select()
        .from(opportunities)
        .where(and(
          eq(opportunities.tenantId, tenantId),
          sql`${opportunities.status} IN ('won', 'lost')`,
          gte(opportunities.actualCloseDate, input.startDate),
          lte(opportunities.actualCloseDate, input.endDate)
        ));

      const won = closedOpps.filter((o: any) => o.status === 'won');
      const lost = closedOpps.filter((o: any) => o.status === 'lost');

      const wonValue = won.reduce((sum: number, o: any) => sum + o.amount, 0);
      const lostValue = lost.reduce((sum: number, o: any) => sum + o.amount, 0);

      // Calculate cycle time for won deals
      let totalCycleTime = 0;
      for (const opp of won) {
        if (opp.createdAt && opp.actualCloseDate) {
          totalCycleTime += Math.round((opp.actualCloseDate.getTime() - opp.createdAt.getTime()) / (1000 * 60 * 60 * 24));
        }
      }

      // Lost by reason
      const lostByReasonMap = new Map<string, { count: number; value: number }>();
      for (const opp of lost) {
        const reason = opp.lostReason || 'Unknown';
        if (!lostByReasonMap.has(reason)) {
          lostByReasonMap.set(reason, { count: 0, value: 0 });
        }
        const stats = lostByReasonMap.get(reason)!;
        stats.count++;
        stats.value += opp.amount;
      }

      return Result.ok({
        period: { start: input.startDate, end: input.endDate },
        totalWon: won.length,
        totalLost: lost.length,
        wonValue,
        lostValue,
        winRate: closedOpps.length > 0 ? Math.round((won.length / closedOpps.length) * 100) : 0,
        lostByStage: [],
        lostByReason: Array.from(lostByReasonMap.entries()).map(([reason, stats]) => ({
          reason,
          count: stats.count,
          value: stats.value,
        })),
        avgCycleTime: won.length > 0 ? Math.round(totalCycleTime / won.length) : 0,
        avgDealSize: won.length > 0 ? Math.round(wonValue / won.length) : 0,
        avgStagesBeforeClose: 0,
      });
    } catch (error) {
      return Result.fail(`Failed to get win/loss analysis: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Forecast Rollup ====================

  /**
   * Get hierarchical forecast rollup
   */
  async getForecastRollup(tenantId: string, input: GetRollupInput): Promise<Result<ForecastRollup[]>> {
    try {
      // Get all forecasts for the period
      const forecastList = await this.db.select()
        .from(forecasts)
        .where(and(
          eq(forecasts.tenantId, tenantId),
          eq(forecasts.period, input.period),
          eq(forecasts.periodStart, input.periodStart)
        ));

      if (input.level === 'company') {
        // Aggregate all forecasts
        const totals = forecastList.reduce((acc: any, f: ForecastRow) => ({
          quota: acc.quota + f.quota,
          committed: acc.committed + f.committed,
          bestCase: acc.bestCase + f.bestCase,
          pipeline: acc.pipeline + f.totalPipeline,
          closedWon: acc.closedWon + f.closedWon,
        }), { quota: 0, committed: 0, bestCase: 0, pipeline: 0, closedWon: 0 });

        return Result.ok([{
          level: 'company',
          entityId: tenantId,
          entityName: 'Company',
          period: input.period,
          periodStart: input.periodStart,
          periodEnd: input.periodEnd,
          quota: totals.quota,
          committed: totals.committed,
          bestCase: totals.bestCase,
          pipeline: totals.pipeline,
          closedWon: totals.closedWon,
          attainment: totals.quota > 0 ? Math.round((totals.closedWon / totals.quota) * 100) : 0,
        }]);
      }

      // For user level, return individual forecasts
      if (input.level === 'user') {
        return Result.ok(forecastList.map((f: ForecastRow) => ({
          level: 'user' as const,
          entityId: f.userId,
          entityName: f.name,
          period: f.period as ForecastPeriod,
          periodStart: f.periodStart,
          periodEnd: f.periodEnd,
          quota: f.quota,
          committed: f.committed,
          bestCase: f.bestCase,
          pipeline: f.totalPipeline,
          closedWon: f.closedWon,
          attainment: f.quota > 0 ? Math.round((f.closedWon / f.quota) * 100) : 0,
        })));
      }

      return Result.ok([]);
    } catch (error) {
      return Result.fail(`Failed to get forecast rollup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Opportunity Insights ====================

  /**
   * Get insights for an opportunity
   */
  async getOpportunityInsight(
    tenantId: string,
    opportunityId: string
  ): Promise<Result<OpportunityInsight>> {
    try {
      const [opp] = await this.db.select()
        .from(opportunities)
        .where(and(eq(opportunities.tenantId, tenantId), eq(opportunities.id, opportunityId)));

      if (!opp) {
        return Result.fail('Opportunity not found');
      }

      // Get stage probability
      const [prob] = await this.db.select()
        .from(stageProbabilities)
        .where(and(
          eq(stageProbabilities.tenantId, tenantId),
          eq(stageProbabilities.stageName, opp.stage)
        ));

      const stageProbability = prob?.adjustedProbability || prob?.defaultProbability || 50;

      // Analyze risk factors
      const riskFactors: RiskFactor[] = [];
      let riskScore = 0;

      // Check for stalled deal
      if (opp.lastActivityAt) {
        const daysSinceActivity = Math.round((Date.now() - opp.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceActivity > 14) {
          riskFactors.push({
            type: 'no_activity',
            severity: daysSinceActivity > 30 ? 'high' : 'medium',
            description: `No activity in ${daysSinceActivity} days`,
            suggestedAction: 'Schedule a follow-up call or email',
          });
          riskScore += daysSinceActivity > 30 ? 30 : 15;
        }
      }

      // Check for pushed close date
      if (opp.expectedCloseDate && opp.originalCloseDate) {
        const pushDays = Math.round((opp.expectedCloseDate.getTime() - opp.originalCloseDate.getTime()) / (1000 * 60 * 60 * 24));
        if (pushDays > 30) {
          riskFactors.push({
            type: 'pushed_date',
            severity: pushDays > 60 ? 'high' : 'medium',
            description: `Close date pushed by ${pushDays} days`,
            suggestedAction: 'Verify timeline with customer',
          });
          riskScore += pushDays > 60 ? 25 : 15;
        }
      }

      // Calculate health score (inverse of risk)
      const healthScore = Math.max(0, 100 - riskScore);

      // Determine predicted probability (simplified)
      const predictedProbability = Math.round(stageProbability * (healthScore / 100));

      return Result.ok({
        opportunityId: opp.id,
        opportunityName: opp.name,
        amount: opp.amount,
        stage: opp.stage,
        expectedCloseDate: opp.expectedCloseDate,
        ownerName: '',
        riskScore,
        riskFactors,
        healthScore,
        healthIndicators: [],
        recommendations: riskFactors.map(r => r.suggestedAction).filter(Boolean) as string[],
        predictedProbability,
        stageProbability,
        probabilityDelta: predictedProbability - stageProbability,
      });
    } catch (error) {
      return Result.fail(`Failed to get opportunity insight: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Helper Methods ====================

  private async populateForecastLineItems(
    tenantId: string,
    userId: string,
    forecastId: string,
    periodStart: Date,
    periodEnd: Date
  ): Promise<void> {
    // Get opportunities closing in period
    const opps = await this.db.select()
      .from(opportunities)
      .where(and(
        eq(opportunities.tenantId, tenantId),
        eq(opportunities.ownerId, userId),
        gte(opportunities.expectedCloseDate, periodStart),
        lte(opportunities.expectedCloseDate, periodEnd),
        sql`${opportunities.status} NOT IN ('won', 'lost')`
      ));

    // Get stage probabilities
    const probs = await this.db.select()
      .from(stageProbabilities)
      .where(eq(stageProbabilities.tenantId, tenantId));

    const probMap = new Map(probs.map((p: StageProbabilityRow) => [p.stageName, p]));

    // Create line items
    for (const opp of opps as OpportunityRow[]) {
      const prob = probMap.get(opp.stage) as StageProbabilityRow | undefined;
      const probability = prob?.adjustedProbability || prob?.defaultProbability || 50;
      const amount = opp.amount || 0;
      const weightedAmount = Math.round(amount * (probability / 100));
      const category = this.determineForecastCategory(probability);

      // Calculate risk level
      const daysSinceActivity = opp.lastActivityAt
        ? Math.round((Date.now() - opp.lastActivityAt.getTime()) / (1000 * 60 * 60 * 24))
        : 999;
      const riskLevel = daysSinceActivity > 30 ? 'high' : daysSinceActivity > 14 ? 'medium' : 'low';

      await this.db.insert(forecastLineItems).values({
        id: uuidv4(),
        forecastId,
        opportunityId: opp.id,
        opportunityName: opp.name,
        amount,
        weightedAmount,
        probability,
        stage: opp.stage,
        stageWeight: probability,
        category,
        expectedCloseDate: opp.expectedCloseDate,
        ownerUserId: opp.ownerId,
        lastActivityDate: opp.lastActivityAt,
        daysSinceActivity,
        riskLevel,
      });
    }
  }

  private async recalculateForecastTotals(forecastId: string): Promise<void> {
    const items = await this.db.select()
      .from(forecastLineItems)
      .where(eq(forecastLineItems.forecastId, forecastId));

    const adjustments = await this.db.select()
      .from(forecastAdjustments)
      .where(eq(forecastAdjustments.forecastId, forecastId));

    let totalPipeline = 0;
    let weightedPipeline = 0;
    let committed = 0;
    let bestCase = 0;

    for (const item of items) {
      const effectiveCategory = item.overrideCategory || item.category;
      const effectiveAmount = item.overrideAmount ?? item.amount;
      const effectiveWeighted = item.overrideAmount
        ? Math.round(item.overrideAmount * (item.probability / 100))
        : item.weightedAmount;

      totalPipeline += effectiveAmount;
      weightedPipeline += effectiveWeighted;

      if (effectiveCategory === 'commit') {
        committed += effectiveAmount;
      } else if (effectiveCategory === 'best_case') {
        bestCase += effectiveAmount;
      }
    }

    // Apply adjustments
    for (const adj of adjustments) {
      if (adj.category === 'commit') {
        committed += adj.amount;
      } else if (adj.category === 'best_case') {
        bestCase += adj.amount;
      } else if (adj.category === 'pipeline') {
        totalPipeline += adj.amount;
        weightedPipeline += adj.amount;
      }
    }

    // Get quota for attainment calculation
    const [forecast] = await this.db.select()
      .from(forecasts)
      .where(eq(forecasts.id, forecastId));

    const quotaAttainment = forecast?.quota > 0
      ? Math.round((forecast.closedWon / forecast.quota) * 100)
      : 0;

    await this.db.update(forecasts)
      .set({
        totalPipeline,
        weightedPipeline,
        committed,
        bestCase,
        quotaAttainment,
        updatedAt: new Date(),
      })
      .where(eq(forecasts.id, forecastId));
  }

  private determineForecastCategory(probability: number): ForecastCategory {
    if (probability >= 90) return 'commit';
    if (probability >= 70) return 'best_case';
    if (probability >= 30) return 'pipeline';
    return 'omitted';
  }

  private async calculatePeriodProjection(
    tenantId: string,
    periodStart: Date,
    periodEnd: Date,
    input: GetProjectionInput
  ): Promise<PeriodProjection> {
    const conditions = [
      eq(opportunities.tenantId, tenantId),
      gte(opportunities.expectedCloseDate, periodStart),
      lte(opportunities.expectedCloseDate, periodEnd),
    ];

    const opps = await this.db.select()
      .from(opportunities)
      .where(and(...conditions));

    // Get stage probabilities
    const probs = await this.db.select()
      .from(stageProbabilities)
      .where(eq(stageProbabilities.tenantId, tenantId));

    const probMap = new Map(probs.map((p: StageProbabilityRow) => [p.stageName, p]));

    let committed = 0;
    let bestCase = 0;
    let pipeline = 0;
    let predicted = 0;
    let closedWon = 0;

    for (const opp of opps as OpportunityRow[]) {
      if (opp.status === 'won') {
        closedWon += opp.amount || 0;
        continue;
      }

      const prob = probMap.get(opp.stage) as StageProbabilityRow | undefined;
      const probability = prob?.adjustedProbability || prob?.defaultProbability || 50;
      const category = this.determineForecastCategory(probability);

      pipeline += opp.amount || 0;
      predicted += Math.round((opp.amount || 0) * (probability / 100));

      if (category === 'commit') {
        committed += opp.amount || 0;
      } else if (category === 'best_case') {
        bestCase += opp.amount || 0;
      }
    }

    // Add closed won to committed
    committed += closedWon;

    // Estimate ranges (simplified)
    const lowEstimate = committed;
    const midEstimate = committed + Math.round(bestCase * 0.5);
    const highEstimate = committed + bestCase + Math.round(pipeline * 0.3);

    // Assume target is sum of quotas (would need quota lookup)
    const target = 0;
    const gapToTarget = target - committed;
    const attainmentPercent = target > 0 ? Math.round((committed / target) * 100) : 0;

    return {
      periodStart,
      periodEnd,
      committed,
      bestCase,
      pipeline,
      predicted,
      target,
      gapToTarget,
      attainmentPercent,
      lowEstimate,
      midEstimate,
      highEstimate,
    };
  }

  private calculateConfidenceLevel(projection: PeriodProjection): 'low' | 'medium' | 'high' {
    const commitRatio = projection.committed / (projection.committed + projection.bestCase + projection.pipeline);
    if (commitRatio > 0.6) return 'high';
    if (commitRatio > 0.3) return 'medium';
    return 'low';
  }

  private generatePeriodName(period: ForecastPeriod, periodStart: Date): string {
    const year = periodStart.getFullYear();
    const month = periodStart.toLocaleString('default', { month: 'short' });

    switch (period) {
      case 'weekly':
        return `Week of ${month} ${periodStart.getDate()}, ${year}`;
      case 'monthly':
        return `${month} ${year}`;
      case 'quarterly':
        const quarter = Math.ceil((periodStart.getMonth() + 1) / 3);
        return `Q${quarter} ${year}`;
      case 'yearly':
        return `FY ${year}`;
      default:
        return `${month} ${year}`;
    }
  }

  private getQuarterStart(date: Date): Date {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), quarter * 3, 1);
  }

  private getQuarterEnd(date: Date): Date {
    const quarter = Math.floor(date.getMonth() / 3);
    return new Date(date.getFullYear(), (quarter + 1) * 3, 0);
  }

  // ==================== Mapping Methods ====================

  private mapForecastRowToForecast(row: ForecastRow, adjustments: ForecastAdjustmentRow[]): Forecast {
    return {
      id: row.id,
      tenantId: row.tenantId,
      userId: row.userId,
      name: row.name,
      period: row.period as ForecastPeriod,
      periodStart: row.periodStart,
      periodEnd: row.periodEnd,
      totalPipeline: row.totalPipeline,
      weightedPipeline: row.weightedPipeline,
      committed: row.committed,
      bestCase: row.bestCase,
      closedWon: row.closedWon,
      closedLost: row.closedLost,
      quota: row.quota,
      quotaAttainment: row.quotaAttainment,
      status: row.status as ForecastStatus,
      submittedAt: row.submittedAt || undefined,
      approvedAt: row.approvedAt || undefined,
      approvedBy: row.approvedBy || undefined,
      notes: row.notes || undefined,
      adjustments: adjustments.map((a: ForecastAdjustmentRow) => ({
        id: a.id,
        forecastId: a.forecastId,
        category: a.category as ForecastCategory,
        amount: a.amount,
        reason: a.reason,
        adjustedBy: a.adjustedBy,
        adjustedAt: a.adjustedAt,
      })),
      currency: row.currency,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapLineItemRowToLineItem(row: ForecastLineItemRow): ForecastLineItem {
    return {
      id: row.id,
      forecastId: row.forecastId,
      opportunityId: row.opportunityId,
      opportunityName: row.opportunityName,
      amount: row.amount,
      weightedAmount: row.weightedAmount,
      probability: row.probability,
      stage: row.stage,
      stageWeight: row.stageWeight,
      category: row.category as ForecastCategory,
      overrideCategory: row.overrideCategory as ForecastCategory | undefined,
      overrideAmount: row.overrideAmount || undefined,
      overrideReason: row.overrideReason || undefined,
      expectedCloseDate: row.expectedCloseDate,
      originalCloseDate: row.originalCloseDate || undefined,
      ownerUserId: row.ownerUserId,
      ownerName: row.ownerName || undefined,
      lastActivityDate: row.lastActivityDate || undefined,
      daysSinceActivity: row.daysSinceActivity || undefined,
      riskLevel: row.riskLevel as 'low' | 'medium' | 'high',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapSnapshotRowToSnapshot(row: PipelineSnapshotRow): PipelineSnapshot {
    return {
      id: row.id,
      tenantId: row.tenantId,
      snapshotDate: row.snapshotDate,
      totalValue: row.totalValue,
      totalDeals: row.totalDeals,
      weightedValue: row.weightedValue,
      avgDealSize: row.avgDealSize,
      byStage: row.byStage as StageMetrics[],
      byCategory: row.byCategory as CategoryMetrics[],
      addedValue: row.addedValue,
      addedDeals: row.addedDeals,
      removedValue: row.removedValue,
      removedDeals: row.removedDeals,
      movedUpValue: row.movedUpValue,
      movedDownValue: row.movedDownValue,
      createdAt: row.createdAt,
    };
  }

  private mapProbabilityRowToProbability(row: StageProbabilityRow): StageProbability {
    return {
      id: row.id,
      tenantId: row.tenantId,
      pipelineId: row.pipelineId,
      stageName: row.stageName,
      stageOrder: row.stageOrder,
      defaultProbability: row.defaultProbability,
      historicalWinRate: row.historicalWinRate || undefined,
      adjustedProbability: row.adjustedProbability || undefined,
      totalDeals: row.totalDeals,
      wonDeals: row.wonDeals,
      lostDeals: row.lostDeals,
      avgDaysInStage: row.avgDaysInStage,
      calculatedAt: row.calculatedAt || undefined,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}

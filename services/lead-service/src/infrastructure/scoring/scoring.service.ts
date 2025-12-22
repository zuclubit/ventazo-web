/**
 * Lead Scoring Service
 * Handles automated lead scoring based on configurable rules
 */

import { randomUUID } from 'crypto';
import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  ScoringRule,
  ScoringRuleSet,
  ScoringCondition,
  ScoringOperator,
  ScoringAction,
  ScoringContext,
  ScoreCalculationResult,
  AppliedRule,
  ScoreBreakdown,
  CreateScoringRuleInput,
  UpdateScoringRuleInput,
  DEFAULT_SCORING_RULES,
} from './types';

@injectable()
export class ScoringService {
  constructor(@inject('DatabasePool') private readonly pool: DatabasePool) {}

  /**
   * Calculate score for a lead based on rules
   */
  async calculateScore(context: ScoringContext): Promise<Result<ScoreCalculationResult>> {
    try {
      // Get active rules for tenant, sorted by priority
      const rulesResult = await this.getActiveRules(context.lead.tenantId);
      if (rulesResult.isFailure) {
        return Result.fail(rulesResult.error!);
      }

      const rules = rulesResult.getValue();
      const appliedRules: AppliedRule[] = [];
      const breakdown: ScoreBreakdown = {
        baseScore: 50, // Default base score
        attributeScore: 0,
        behaviorScore: 0,
        engagementScore: 0,
        decayScore: 0,
        bonusScore: 0,
        totalScore: 0,
      };

      // Enrich context with computed fields
      const enrichedContext = this.enrichContext(context);

      // Apply each rule
      for (const rule of rules) {
        if (!this.isRuleValid(rule)) continue;

        const matchResult = this.evaluateRule(rule, enrichedContext);
        if (matchResult.matches) {
          const appliedRule: AppliedRule = {
            ruleId: rule.id,
            ruleName: rule.name,
            action: rule.action,
            points: rule.points,
            reason: `Rule "${rule.name}" matched`,
            matchedConditions: matchResult.matchedConditions,
          };
          appliedRules.push(appliedRule);

          // Update breakdown by category
          this.updateBreakdown(breakdown, rule);
        }
      }

      // Calculate total score
      breakdown.totalScore = Math.max(
        0,
        Math.min(
          100,
          breakdown.baseScore +
            breakdown.attributeScore +
            breakdown.behaviorScore +
            breakdown.engagementScore +
            breakdown.decayScore +
            breakdown.bonusScore
        )
      );

      const result: ScoreCalculationResult = {
        leadId: context.lead.id,
        previousScore: context.lead.score,
        newScore: breakdown.totalScore,
        appliedRules,
        breakdown,
        calculatedAt: new Date(),
      };

      return Result.ok(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to calculate score: ${message}`);
    }
  }

  /**
   * Create a new scoring rule
   */
  async createRule(input: CreateScoringRuleInput): Promise<Result<ScoringRule>> {
    try {
      const id = randomUUID();
      const now = new Date();

      const rule: ScoringRule = {
        id,
        tenantId: input.tenantId,
        name: input.name,
        description: input.description,
        type: input.type,
        conditions: input.conditions,
        conditionLogic: input.conditionLogic || 'AND',
        action: input.action,
        points: input.points,
        maxApplications: input.maxApplications,
        priority: input.priority || 100,
        isActive: true,
        category: input.category,
        tags: input.tags,
        validFrom: input.validFrom,
        validUntil: input.validUntil,
        createdAt: now,
        updatedAt: now,
      };

      const query = `
        INSERT INTO scoring_rules (
          id, tenant_id, name, description, type, conditions, condition_logic,
          action, points, max_applications, priority, is_active, category,
          tags, valid_from, valid_until, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      `;

      const result = await this.pool.query(query, [
        rule.id,
        rule.tenantId,
        rule.name,
        rule.description,
        rule.type,
        JSON.stringify(rule.conditions),
        rule.conditionLogic,
        rule.action,
        rule.points,
        rule.maxApplications,
        rule.priority,
        rule.isActive,
        rule.category,
        JSON.stringify(rule.tags || []),
        rule.validFrom?.toISOString(),
        rule.validUntil?.toISOString(),
        rule.createdAt.toISOString(),
        rule.updatedAt.toISOString(),
      ]);

      if (result.isFailure) {
        return Result.fail(result.error!);
      }

      console.log(`[ScoringService] Created rule: ${rule.id} (${rule.name})`);
      return Result.ok(rule);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to create rule: ${message}`);
    }
  }

  /**
   * Update an existing scoring rule
   */
  async updateRule(
    id: string,
    tenantId: string,
    input: UpdateScoringRuleInput
  ): Promise<Result<ScoringRule>> {
    try {
      const existing = await this.getRule(id, tenantId);
      if (existing.isFailure) return Result.fail(existing.error ?? 'Failed to get rule');
      if (!existing.getValue()) {
        return Result.fail('Rule not found');
      }

      const rule = existing.getValue()!;
      const updated: ScoringRule = {
        ...rule,
        name: input.name ?? rule.name,
        description: input.description ?? rule.description,
        conditions: input.conditions ?? rule.conditions,
        conditionLogic: input.conditionLogic ?? rule.conditionLogic,
        action: input.action ?? rule.action,
        points: input.points ?? rule.points,
        maxApplications: input.maxApplications ?? rule.maxApplications,
        priority: input.priority ?? rule.priority,
        isActive: input.isActive ?? rule.isActive,
        category: input.category ?? rule.category,
        tags: input.tags ?? rule.tags,
        validFrom: input.validFrom ?? rule.validFrom,
        validUntil: input.validUntil ?? rule.validUntil,
        updatedAt: new Date(),
      };

      const query = `
        UPDATE scoring_rules SET
          name = $3, description = $4, conditions = $5, condition_logic = $6,
          action = $7, points = $8, max_applications = $9, priority = $10,
          is_active = $11, category = $12, tags = $13, valid_from = $14,
          valid_until = $15, updated_at = $16
        WHERE id = $1 AND tenant_id = $2
      `;

      await this.pool.query(query, [
        id,
        tenantId,
        updated.name,
        updated.description,
        JSON.stringify(updated.conditions),
        updated.conditionLogic,
        updated.action,
        updated.points,
        updated.maxApplications,
        updated.priority,
        updated.isActive,
        updated.category,
        JSON.stringify(updated.tags || []),
        updated.validFrom?.toISOString(),
        updated.validUntil?.toISOString(),
        updated.updatedAt.toISOString(),
      ]);

      return Result.ok(updated);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to update rule: ${message}`);
    }
  }

  /**
   * Get a specific rule
   */
  async getRule(id: string, tenantId: string): Promise<Result<ScoringRule | null>> {
    try {
      const query = `SELECT * FROM scoring_rules WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [id, tenantId]);

      if (result.isFailure) return Result.fail(result.error!);
      if (result.getValue().rows.length === 0) return Result.ok(null);

      return Result.ok(this.mapRowToRule(result.getValue().rows[0]));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to get rule: ${message}`);
    }
  }

  /**
   * List rules for a tenant
   */
  async listRules(
    tenantId: string,
    options?: {
      isActive?: boolean;
      category?: string;
      page?: number;
      limit?: number;
    }
  ): Promise<Result<{ items: ScoringRule[]; total: number }>> {
    try {
      const { isActive, category, page = 1, limit = 50 } = options || {};
      const offset = (page - 1) * limit;

      let whereClause = 'tenant_id = $1';
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (isActive !== undefined) {
        whereClause += ` AND is_active = $${paramIndex}`;
        params.push(isActive);
        paramIndex++;
      }

      if (category) {
        whereClause += ` AND category = $${paramIndex}`;
        params.push(category);
        paramIndex++;
      }

      // Count
      const countQuery = `SELECT COUNT(*) as total FROM scoring_rules WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      if (countResult.isFailure) return Result.fail(countResult.error!);
      const total = parseInt(countResult.getValue().rows[0].total, 10);

      // Data
      const dataQuery = `
        SELECT * FROM scoring_rules
        WHERE ${whereClause}
        ORDER BY priority ASC, created_at DESC
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;
      params.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, params);
      if (dataResult.isFailure) return Result.fail(dataResult.error!);

      const items = dataResult.getValue().rows.map(this.mapRowToRule);
      return Result.ok({ items, total });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to list rules: ${message}`);
    }
  }

  /**
   * Delete a rule
   */
  async deleteRule(id: string, tenantId: string): Promise<Result<void>> {
    try {
      await this.pool.query(
        `DELETE FROM scoring_rules WHERE id = $1 AND tenant_id = $2`,
        [id, tenantId]
      );
      return Result.ok();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to delete rule: ${message}`);
    }
  }

  /**
   * Initialize default rules for a tenant
   */
  async initializeDefaultRules(tenantId: string): Promise<Result<ScoringRule[]>> {
    try {
      const createdRules: ScoringRule[] = [];

      for (const ruleTemplate of DEFAULT_SCORING_RULES) {
        const result = await this.createRule({
          ...ruleTemplate,
          tenantId,
          conditionLogic: ruleTemplate.conditionLogic || 'AND',
        });

        if (result.isSuccess) {
          createdRules.push(result.getValue());
        }
      }

      console.log(
        `[ScoringService] Initialized ${createdRules.length} default rules for tenant: ${tenantId}`
      );
      return Result.ok(createdRules);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to initialize default rules: ${message}`);
    }
  }

  /**
   * Get score history for a lead
   */
  async getScoreHistory(
    leadId: string,
    tenantId: string,
    options?: { limit?: number; startDate?: Date; endDate?: Date }
  ): Promise<Result<ScoreCalculationResult[]>> {
    try {
      const { limit = 50, startDate, endDate } = options || {};

      let query = `
        SELECT * FROM score_history
        WHERE lead_id = $1 AND tenant_id = $2
      `;
      const params: unknown[] = [leadId, tenantId];
      let paramIndex = 3;

      if (startDate) {
        query += ` AND calculated_at >= $${paramIndex}`;
        params.push(startDate.toISOString());
        paramIndex++;
      }

      if (endDate) {
        query += ` AND calculated_at <= $${paramIndex}`;
        params.push(endDate.toISOString());
        paramIndex++;
      }

      query += ` ORDER BY calculated_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await this.pool.query(query, params);
      if (result.isFailure) return Result.fail(result.error!);

      const history = result.getValue().rows.map((row) => ({
        leadId: row.lead_id,
        previousScore: row.previous_score,
        newScore: row.new_score,
        appliedRules: JSON.parse(row.applied_rules || '[]'),
        breakdown: JSON.parse(row.breakdown || '{}'),
        calculatedAt: new Date(row.calculated_at),
      }));

      return Result.ok(history);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to get score history: ${message}`);
    }
  }

  /**
   * Save score calculation to history
   */
  async saveScoreHistory(
    tenantId: string,
    result: ScoreCalculationResult
  ): Promise<Result<void>> {
    try {
      const query = `
        INSERT INTO score_history (
          id, lead_id, tenant_id, previous_score, new_score,
          applied_rules, breakdown, calculated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;

      await this.pool.query(query, [
        randomUUID(),
        result.leadId,
        tenantId,
        result.previousScore,
        result.newScore,
        JSON.stringify(result.appliedRules),
        JSON.stringify(result.breakdown),
        result.calculatedAt.toISOString(),
      ]);

      return Result.ok();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return Result.fail(`Failed to save score history: ${message}`);
    }
  }

  // ============ Private Helper Methods ============

  private async getActiveRules(tenantId: string): Promise<Result<ScoringRule[]>> {
    const query = `
      SELECT * FROM scoring_rules
      WHERE tenant_id = $1 AND is_active = true
      ORDER BY priority ASC
    `;

    const result = await this.pool.query(query, [tenantId]);
    if (result.isFailure) return Result.fail(result.error!);

    return Result.ok(result.getValue().rows.map(this.mapRowToRule));
  }

  private enrichContext(context: ScoringContext): Record<string, unknown> {
    const { lead } = context;
    const now = new Date();

    // Calculate days since last activity
    const daysSinceLastActivity = lead.lastActivityAt
      ? Math.floor(
          (now.getTime() - new Date(lead.lastActivityAt).getTime()) / (1000 * 60 * 60 * 24)
        )
      : 999;

    // Check if follow-up is overdue
    const followUpOverdue =
      lead.nextFollowUpAt && new Date(lead.nextFollowUpAt) < now;

    return {
      ...lead,
      daysSinceLastActivity,
      followUpOverdue,
      ...(context.activity || {}),
      ...(context.metadata || {}),
    };
  }

  private isRuleValid(rule: ScoringRule): boolean {
    const now = new Date();

    if (rule.validFrom && new Date(rule.validFrom) > now) return false;
    if (rule.validUntil && new Date(rule.validUntil) < now) return false;

    return true;
  }

  private evaluateRule(
    rule: ScoringRule,
    context: Record<string, unknown>
  ): { matches: boolean; matchedConditions: string[] } {
    const matchedConditions: string[] = [];
    const conditionResults: boolean[] = [];

    for (const condition of rule.conditions) {
      const matches = this.evaluateCondition(condition, context);
      conditionResults.push(matches);

      if (matches) {
        matchedConditions.push(
          `${condition.field} ${condition.operator} ${condition.value}`
        );
      }
    }

    const overallMatch =
      rule.conditionLogic === 'AND'
        ? conditionResults.every((r) => r)
        : conditionResults.some((r) => r);

    return { matches: overallMatch, matchedConditions };
  }

  private evaluateCondition(
    condition: ScoringCondition,
    context: Record<string, unknown>
  ): boolean {
    const fieldValue = this.getNestedValue(context, condition.field);
    const { operator, value, secondaryValue } = condition;

    switch (operator) {
      case ScoringOperator.EQUALS:
        return fieldValue === value;

      case ScoringOperator.NOT_EQUALS:
        return fieldValue !== value;

      case ScoringOperator.CONTAINS:
        return String(fieldValue).toLowerCase().includes(String(value).toLowerCase());

      case ScoringOperator.NOT_CONTAINS:
        return !String(fieldValue).toLowerCase().includes(String(value).toLowerCase());

      case ScoringOperator.STARTS_WITH:
        return String(fieldValue).toLowerCase().startsWith(String(value).toLowerCase());

      case ScoringOperator.ENDS_WITH:
        return String(fieldValue).toLowerCase().endsWith(String(value).toLowerCase());

      case ScoringOperator.GREATER_THAN:
        return Number(fieldValue) > Number(value);

      case ScoringOperator.LESS_THAN:
        return Number(fieldValue) < Number(value);

      case ScoringOperator.GREATER_THAN_OR_EQUAL:
        return Number(fieldValue) >= Number(value);

      case ScoringOperator.LESS_THAN_OR_EQUAL:
        return Number(fieldValue) <= Number(value);

      case ScoringOperator.BETWEEN:
        return (
          Number(fieldValue) >= Number(value) &&
          Number(fieldValue) <= Number(secondaryValue)
        );

      case ScoringOperator.IN:
        return Array.isArray(value) && value.includes(fieldValue);

      case ScoringOperator.NOT_IN:
        return Array.isArray(value) && !value.includes(fieldValue);

      case ScoringOperator.IS_EMPTY:
        return fieldValue === null || fieldValue === undefined || fieldValue === '';

      case ScoringOperator.IS_NOT_EMPTY:
        return fieldValue !== null && fieldValue !== undefined && fieldValue !== '';

      case ScoringOperator.MATCHES_REGEX:
        try {
          const regex = new RegExp(String(value), 'i');
          return regex.test(String(fieldValue));
        } catch {
          return false;
        }

      default:
        return false;
    }
  }

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((acc: unknown, part) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[part];
      }
      return undefined;
    }, obj);
  }

  private updateBreakdown(breakdown: ScoreBreakdown, rule: ScoringRule): void {
    const points =
      rule.action === ScoringAction.SUBTRACT ? -rule.points : rule.points;

    switch (rule.category?.toLowerCase()) {
      case 'demographics':
      case 'profile':
        breakdown.attributeScore += points;
        break;

      case 'behavior':
      case 'activity':
        breakdown.behaviorScore += points;
        break;

      case 'engagement':
      case 'follow-up':
        breakdown.engagementScore += points;
        break;

      case 'decay':
        breakdown.decayScore += points;
        break;

      default:
        breakdown.bonusScore += points;
    }
  }

  private mapRowToRule(row: Record<string, unknown>): ScoringRule {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as ScoringRule['type'],
      conditions: JSON.parse(row.conditions as string),
      conditionLogic: row.condition_logic as 'AND' | 'OR',
      action: row.action as ScoringAction,
      points: row.points as number,
      maxApplications: row.max_applications as number | undefined,
      priority: row.priority as number,
      isActive: row.is_active as boolean,
      category: row.category as string | undefined,
      tags: JSON.parse((row.tags as string) || '[]'),
      validFrom: row.valid_from ? new Date(row.valid_from as string) : undefined,
      validUntil: row.valid_until ? new Date(row.valid_until as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

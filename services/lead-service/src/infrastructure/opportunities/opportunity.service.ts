/**
 * Opportunity Service
 * Handles sales opportunity/deal management operations
 */
import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  OpportunityDTO,
  OpportunityStatus,
  OpportunitySource,
  CreateOpportunityRequest,
  UpdateOpportunityRequest,
  WinOpportunityRequest,
  LoseOpportunityRequest,
  OpportunityFilterOptions,
  OpportunitySortOptions,
  OpportunityStatistics,
  PipelineForecast,
  BulkOpportunityOperation,
  BulkOpportunityResult,
  ConvertLeadToOpportunityRequest,
} from './types';
import { ResendProvider } from '../email/resend.provider';
import { EmailTemplate } from '../email/types';
import { getResendConfig, getAppConfig } from '../../config/environment';
import { getMessagingService, MessageTemplate } from '../messaging';

@injectable()
export class OpportunityService {
  private emailProvider: ResendProvider | null = null;
  private emailInitialized = false;

  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {
    this.initializeEmailProvider().catch(err => {
      console.error('[OpportunityService] Failed to initialize email provider:', err);
    });
  }

  private async initializeEmailProvider(): Promise<void> {
    if (this.emailInitialized) return;

    try {
      const config = getResendConfig();
      if (config.isEnabled) {
        this.emailProvider = new ResendProvider();
        const result = await this.emailProvider.initialize({
          apiKey: config.apiKey,
          defaultFrom: config.fromEmail,
          defaultFromName: config.fromName,
        });
        if (result.isSuccess) {
          this.emailInitialized = true;
          console.log('[OpportunityService] Email provider initialized successfully');
        }
      }
    } catch (error) {
      console.error('[OpportunityService] Email initialization error:', error);
    }
  }

  private formatCurrency(amount: number, currency: string = 'USD'): string {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: currency,
    }).format(amount);
  }

  /**
   * Create a new opportunity
   */
  async createOpportunity(
    tenantId: string,
    request: CreateOpportunityRequest,
    createdBy?: string
  ): Promise<Result<OpportunityDTO>> {
    try {
      const id = crypto.randomUUID();
      const now = new Date();

      // Database columns: id, tenant_id, lead_id, customer_id, pipeline_id, name, description,
      // value, currency, stage, status, probability, expected_close_date, owner_id,
      // custom_fields, tags, metadata, created_at, updated_at
      // Note: 'source' and 'last_activity_at' columns don't exist in actual database
      const query = `
        INSERT INTO opportunities (
          id, tenant_id, lead_id, customer_id, pipeline_id,
          name, description, status, stage,
          value, currency, probability,
          owner_id, expected_close_date,
          tags, metadata,
          created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING *
      `;

      const values = [
        id,
        tenantId,
        request.leadId || null,
        request.customerId || null,
        request.pipelineId || null,
        request.name,
        request.description || null,
        OpportunityStatus.OPEN,
        request.stage,
        request.amount || null,
        request.currency || 'USD',
        request.probability ?? 50,
        request.ownerId || createdBy || null,
        request.expectedCloseDate || null,
        JSON.stringify(request.tags || []),
        JSON.stringify(request.metadata || {}),
        now,
        now,
      ];

      const result = await this.pool.query(query, values);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const row = result.getValue().rows[0];
      return Result.ok(this.mapRowToDTO(row));
    } catch (error) {
      return Result.fail(`Failed to create opportunity: ${(error as Error).message}`);
    }
  }

  /**
   * Get opportunity by ID
   */
  async getOpportunityById(
    tenantId: string,
    opportunityId: string
  ): Promise<Result<OpportunityDTO>> {
    try {
      const query = `
        SELECT o.*,
          (SELECT COUNT(*) FROM tasks WHERE opportunity_id = o.id) as task_count,
          CASE
            WHEN o.expected_close_date < CURRENT_DATE AND o.status = 'open' THEN true
            ELSE false
          END as is_overdue
        FROM opportunities o
        WHERE o.id = $1 AND o.tenant_id = $2
      `;

      const result = await this.pool.query(query, [opportunityId, tenantId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Opportunity not found');
      }

      return Result.ok(this.mapRowToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get opportunity: ${(error as Error).message}`);
    }
  }

  /**
   * Get opportunities with filters and pagination
   */
  async getOpportunities(
    tenantId: string,
    filters?: OpportunityFilterOptions,
    sort?: OpportunitySortOptions,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ opportunities: OpportunityDTO[]; total: number; page: number; limit: number }>> {
    try {
      const conditions: string[] = ['o.tenant_id = $1'];
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      // Apply filters
      if (filters) {
        if (filters.status) {
          const statuses = Array.isArray(filters.status) ? filters.status : [filters.status];
          conditions.push(`o.status = ANY($${paramIndex})`);
          params.push(statuses);
          paramIndex++;
        }

        if (filters.stage) {
          const stages = Array.isArray(filters.stage) ? filters.stage : [filters.stage];
          conditions.push(`o.stage = ANY($${paramIndex})`);
          params.push(stages);
          paramIndex++;
        }

        if (filters.ownerId) {
          conditions.push(`o.owner_id = $${paramIndex}`);
          params.push(filters.ownerId);
          paramIndex++;
        }

        if (filters.leadId) {
          conditions.push(`o.lead_id = $${paramIndex}`);
          params.push(filters.leadId);
          paramIndex++;
        }

        if (filters.customerId) {
          conditions.push(`o.customer_id = $${paramIndex}`);
          params.push(filters.customerId);
          paramIndex++;
        }

        if (filters.pipelineId) {
          conditions.push(`o.pipeline_id = $${paramIndex}`);
          params.push(filters.pipelineId);
          paramIndex++;
        }

        // Note: source column doesn't exist in actual database, filter ignored
        // if (filters.source) { ... }

        if (filters.amountMin !== undefined) {
          conditions.push(`o.value >= $${paramIndex}`);
          params.push(filters.amountMin);
          paramIndex++;
        }

        if (filters.amountMax !== undefined) {
          conditions.push(`o.value <= $${paramIndex}`);
          params.push(filters.amountMax);
          paramIndex++;
        }

        if (filters.probabilityMin !== undefined) {
          conditions.push(`o.probability >= $${paramIndex}`);
          params.push(filters.probabilityMin);
          paramIndex++;
        }

        if (filters.probabilityMax !== undefined) {
          conditions.push(`o.probability <= $${paramIndex}`);
          params.push(filters.probabilityMax);
          paramIndex++;
        }

        if (filters.expectedCloseDateFrom) {
          conditions.push(`o.expected_close_date >= $${paramIndex}`);
          params.push(filters.expectedCloseDateFrom);
          paramIndex++;
        }

        if (filters.expectedCloseDateTo) {
          conditions.push(`o.expected_close_date <= $${paramIndex}`);
          params.push(filters.expectedCloseDateTo);
          paramIndex++;
        }

        if (filters.isOverdue === true) {
          conditions.push(`o.expected_close_date < CURRENT_DATE AND o.status = 'open'`);
        }

        if (filters.searchTerm) {
          conditions.push(`(o.name ILIKE $${paramIndex} OR o.description ILIKE $${paramIndex})`);
          params.push(`%${filters.searchTerm}%`);
          paramIndex++;
        }
      }

      // Build ORDER BY
      const sortColumn = this.getSortColumn(sort?.sortBy || 'createdAt');
      const sortOrder = sort?.sortOrder === 'asc' ? 'ASC' : 'DESC';

      // Pagination
      const safeLimit = Math.min(limit, 100);
      const offset = (page - 1) * safeLimit;

      // Count query
      const countQuery = `
        SELECT COUNT(*) as total
        FROM opportunities o
        WHERE ${conditions.join(' AND ')}
      `;

      const countResult = await this.pool.query(countQuery, params);
      if (countResult.isFailure) {
        return Result.fail(`Database error: ${countResult.error}`);
      }

      const total = parseInt(countResult.getValue().rows[0].total, 10);

      // Data query
      const dataQuery = `
        SELECT o.*,
          (SELECT COUNT(*) FROM tasks WHERE opportunity_id = o.id) as task_count,
          CASE
            WHEN o.expected_close_date < CURRENT_DATE AND o.status = 'open' THEN true
            ELSE false
          END as is_overdue,
          CASE
            WHEN o.value IS NOT NULL AND o.probability IS NOT NULL
            THEN o.value * (o.probability::decimal / 100)
            ELSE null
          END as weighted_amount
        FROM opportunities o
        WHERE ${conditions.join(' AND ')}
        ORDER BY ${sortColumn} ${sortOrder}
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      params.push(safeLimit, offset);

      const dataResult = await this.pool.query(dataQuery, params);
      if (dataResult.isFailure) {
        return Result.fail(`Database error: ${dataResult.error}`);
      }

      const opportunities = dataResult.getValue().rows.map((row: Record<string, unknown>) => this.mapRowToDTO(row));

      return Result.ok({
        opportunities,
        total,
        page,
        limit: safeLimit,
      });
    } catch (error) {
      return Result.fail(`Failed to get opportunities: ${(error as Error).message}`);
    }
  }

  /**
   * Update opportunity
   */
  async updateOpportunity(
    tenantId: string,
    opportunityId: string,
    request: UpdateOpportunityRequest,
    updatedBy?: string
  ): Promise<Result<OpportunityDTO>> {
    try {
      // Check if opportunity exists
      const existsResult = await this.getOpportunityById(tenantId, opportunityId);
      if (existsResult.isFailure) {
        return Result.fail('Opportunity not found');
      }

      const updates: string[] = [];
      const params: unknown[] = [];
      let paramIndex = 1;

      if (request.name !== undefined) {
        updates.push(`name = $${paramIndex}`);
        params.push(request.name);
        paramIndex++;
      }

      if (request.description !== undefined) {
        updates.push(`description = $${paramIndex}`);
        params.push(request.description);
        paramIndex++;
      }

      if (request.stage !== undefined) {
        updates.push(`stage = $${paramIndex}`);
        params.push(request.stage);
        paramIndex++;
      }

      if (request.amount !== undefined) {
        updates.push(`value = $${paramIndex}`);
        params.push(request.amount);
        paramIndex++;
      }

      if (request.currency !== undefined) {
        updates.push(`currency = $${paramIndex}`);
        params.push(request.currency);
        paramIndex++;
      }

      if (request.probability !== undefined) {
        updates.push(`probability = $${paramIndex}`);
        params.push(request.probability);
        paramIndex++;
      }

      if (request.ownerId !== undefined) {
        updates.push(`owner_id = $${paramIndex}`);
        params.push(request.ownerId);
        paramIndex++;
      }

      if (request.expectedCloseDate !== undefined) {
        updates.push(`expected_close_date = $${paramIndex}`);
        params.push(request.expectedCloseDate);
        paramIndex++;
      }

      if (request.pipelineId !== undefined) {
        updates.push(`pipeline_id = $${paramIndex}`);
        params.push(request.pipelineId);
        paramIndex++;
      }

      if (request.tags !== undefined) {
        updates.push(`tags = $${paramIndex}`);
        params.push(JSON.stringify(request.tags));
        paramIndex++;
      }

      if (request.metadata !== undefined) {
        updates.push(`metadata = $${paramIndex}`);
        params.push(JSON.stringify(request.metadata));
        paramIndex++;
      }

      if (updates.length === 0) {
        return Result.fail('No fields to update');
      }

      // Add updated_at (last_activity_at column doesn't exist in DB)
      updates.push(`updated_at = NOW()`);

      // Add WHERE clause params
      params.push(opportunityId, tenantId);

      const query = `
        UPDATE opportunities
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex} AND tenant_id = $${paramIndex + 1}
        RETURNING *
      `;

      const result = await this.pool.query(query, params);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Failed to update opportunity');
      }

      return Result.ok(this.mapRowToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update opportunity: ${(error as Error).message}`);
    }
  }

  /**
   * Win opportunity
   */
  async winOpportunity(
    tenantId: string,
    opportunityId: string,
    request: WinOpportunityRequest,
    updatedBy?: string
  ): Promise<Result<OpportunityDTO>> {
    try {
      const query = `
        UPDATE opportunities
        SET
          status = $1,
          stage = 'closed_won',
          won_reason = $2,
          actual_close_date = COALESCE($3, CURRENT_DATE),
          probability = 100,
          updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5 AND status = 'open'
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        OpportunityStatus.WON,
        request.wonReason || null,
        request.actualCloseDate || null,
        opportunityId,
        tenantId,
      ]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Opportunity not found or already closed');
      }

      const opportunity = this.mapRowToDTO(rows[0]);

      // Send opportunity won notification email
      if (this.emailProvider && opportunity.ownerId) {
        try {
          const appConfig = getAppConfig();

          // Get owner email
          const ownerQuery = `SELECT email, first_name FROM users WHERE id = $1`;
          const ownerResult = await this.pool.query(ownerQuery, [opportunity.ownerId]);
          const ownerEmail = ownerResult.isSuccess && ownerResult.getValue().rows[0]?.email;
          const ownerName = ownerResult.isSuccess && ownerResult.getValue().rows[0]?.first_name || 'Usuario';

          if (ownerEmail) {
            await this.emailProvider.send({
              to: ownerEmail,
              subject: `🎉 ¡Oportunidad Ganada! - ${opportunity.name}`,
              template: EmailTemplate.OPPORTUNITY_WON,
              variables: {
                ownerName,
                opportunityName: opportunity.name,
                opportunityAmount: opportunity.amount ? this.formatCurrency(opportunity.amount, opportunity.currency) : 'N/A',
                wonReason: request.wonReason || 'No especificado',
                closeDate: opportunity.actualCloseDate?.toLocaleDateString('es-ES') || new Date().toLocaleDateString('es-ES'),
                actionUrl: `${appConfig.appUrl}/opportunities/${opportunity.id}`,
              },
              tags: [
                { name: 'type', value: 'opportunity-won' },
                { name: 'opportunityId', value: opportunity.id },
              ],
            });
            console.log(`[OpportunityService] Opportunity won email sent to ${ownerEmail}`);

            // Send SMS notification if owner has phone
            const ownerPhone = ownerResult.getValue().rows[0]?.phone;
            if (ownerPhone) {
              try {
                const messagingService = getMessagingService();
                if (messagingService.isSmsAvailable()) {
                  await messagingService.sendTemplate(
                    ownerPhone,
                    MessageTemplate.OPPORTUNITY_WON,
                    {
                      opportunityName: opportunity.name,
                      amount: opportunity.amount ? this.formatCurrency(opportunity.amount, opportunity.currency) : 'N/A',
                    },
                    'sms',
                    { entityType: 'opportunity', entityId: opportunity.id }
                  );
                  console.log(`[OpportunityService] Opportunity won SMS sent to ${ownerPhone}`);
                }
              } catch (smsError) {
                console.error('[OpportunityService] Failed to send opportunity won SMS:', smsError);
              }
            }
          }
        } catch (emailError) {
          console.error('[OpportunityService] Failed to send opportunity won email:', emailError);
        }
      }

      return Result.ok(opportunity);
    } catch (error) {
      return Result.fail(`Failed to win opportunity: ${(error as Error).message}`);
    }
  }

  /**
   * Lose opportunity
   */
  async loseOpportunity(
    tenantId: string,
    opportunityId: string,
    request: LoseOpportunityRequest,
    updatedBy?: string
  ): Promise<Result<OpportunityDTO>> {
    try {
      // Note: competitor_id column doesn't exist in actual database
      const query = `
        UPDATE opportunities
        SET
          status = $1,
          stage = 'closed_lost',
          lost_reason = $2,
          actual_close_date = COALESCE($3, CURRENT_DATE),
          probability = 0,
          updated_at = NOW()
        WHERE id = $4 AND tenant_id = $5 AND status = 'open'
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        OpportunityStatus.LOST,
        request.lostReason,
        request.actualCloseDate || null,
        opportunityId,
        tenantId,
      ]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Opportunity not found or already closed');
      }

      const opportunity = this.mapRowToDTO(rows[0]);

      // Send opportunity lost notification email
      if (this.emailProvider && opportunity.ownerId) {
        try {
          const appConfig = getAppConfig();

          // Get owner email
          const ownerQuery = `SELECT email, first_name FROM users WHERE id = $1`;
          const ownerResult = await this.pool.query(ownerQuery, [opportunity.ownerId]);
          const ownerEmail = ownerResult.isSuccess && ownerResult.getValue().rows[0]?.email;
          const ownerName = ownerResult.isSuccess && ownerResult.getValue().rows[0]?.first_name || 'Usuario';

          if (ownerEmail) {
            await this.emailProvider.send({
              to: ownerEmail,
              subject: `Oportunidad Perdida - ${opportunity.name}`,
              template: EmailTemplate.OPPORTUNITY_LOST,
              variables: {
                ownerName,
                opportunityName: opportunity.name,
                opportunityAmount: opportunity.amount ? this.formatCurrency(opportunity.amount, opportunity.currency) : 'N/A',
                lostReason: request.lostReason || 'No especificado',
                closeDate: opportunity.actualCloseDate?.toLocaleDateString('es-ES') || new Date().toLocaleDateString('es-ES'),
                actionUrl: `${appConfig.appUrl}/opportunities/${opportunity.id}`,
              },
              tags: [
                { name: 'type', value: 'opportunity-lost' },
                { name: 'opportunityId', value: opportunity.id },
              ],
            });
            console.log(`[OpportunityService] Opportunity lost email sent to ${ownerEmail}`);

            // Send SMS notification if owner has phone
            const ownerPhone = ownerResult.getValue().rows[0]?.phone;
            if (ownerPhone) {
              try {
                const messagingService = getMessagingService();
                if (messagingService.isSmsAvailable()) {
                  await messagingService.sendTemplate(
                    ownerPhone,
                    MessageTemplate.OPPORTUNITY_LOST,
                    {
                      opportunityName: opportunity.name,
                      reason: request.lostReason || 'No especificado',
                    },
                    'sms',
                    { entityType: 'opportunity', entityId: opportunity.id }
                  );
                  console.log(`[OpportunityService] Opportunity lost SMS sent to ${ownerPhone}`);
                }
              } catch (smsError) {
                console.error('[OpportunityService] Failed to send opportunity lost SMS:', smsError);
              }
            }
          }
        } catch (emailError) {
          console.error('[OpportunityService] Failed to send opportunity lost email:', emailError);
        }
      }

      return Result.ok(opportunity);
    } catch (error) {
      return Result.fail(`Failed to lose opportunity: ${(error as Error).message}`);
    }
  }

  /**
   * Reopen opportunity
   */
  async reopenOpportunity(
    tenantId: string,
    opportunityId: string,
    stage?: string,
    updatedBy?: string
  ): Promise<Result<OpportunityDTO>> {
    try {
      // Note: competitor_id column doesn't exist in actual database
      const query = `
        UPDATE opportunities
        SET
          status = $1,
          stage = COALESCE($2, 'qualification'),
          won_reason = NULL,
          lost_reason = NULL,
          actual_close_date = NULL,
          probability = 50,
          updated_at = NOW()
        WHERE id = $3 AND tenant_id = $4 AND status IN ('won', 'lost')
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        OpportunityStatus.OPEN,
        stage || null,
        opportunityId,
        tenantId,
      ]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Opportunity not found or not closed');
      }

      return Result.ok(this.mapRowToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to reopen opportunity: ${(error as Error).message}`);
    }
  }

  /**
   * Delete opportunity
   */
  async deleteOpportunity(
    tenantId: string,
    opportunityId: string
  ): Promise<Result<void>> {
    try {
      const query = `
        DELETE FROM opportunities
        WHERE id = $1 AND tenant_id = $2
        RETURNING id
      `;

      const result = await this.pool.query(query, [opportunityId, tenantId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail('Opportunity not found');
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(`Failed to delete opportunity: ${(error as Error).message}`);
    }
  }

  /**
   * Get opportunity statistics
   */
  async getOpportunityStatistics(
    tenantId: string,
    filters?: { ownerId?: string; pipelineId?: string; dateFrom?: Date; dateTo?: Date }
  ): Promise<Result<OpportunityStatistics>> {
    try {
      const conditions: string[] = ['tenant_id = $1'];
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (filters?.ownerId) {
        conditions.push(`owner_id = $${paramIndex}`);
        params.push(filters.ownerId);
        paramIndex++;
      }

      if (filters?.pipelineId) {
        conditions.push(`pipeline_id = $${paramIndex}`);
        params.push(filters.pipelineId);
        paramIndex++;
      }

      if (filters?.dateFrom) {
        conditions.push(`created_at >= $${paramIndex}`);
        params.push(filters.dateFrom);
        paramIndex++;
      }

      if (filters?.dateTo) {
        conditions.push(`created_at <= $${paramIndex}`);
        params.push(filters.dateTo);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');

      const query = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'open') as open_count,
          COUNT(*) FILTER (WHERE status = 'won') as won_count,
          COUNT(*) FILTER (WHERE status = 'lost') as lost_count,
          COUNT(*) FILTER (WHERE status = 'on_hold') as on_hold_count,
          COALESCE(SUM(value) FILTER (WHERE status = 'open'), 0) as total_value,
          COALESCE(SUM(value * probability / 100.0) FILTER (WHERE status = 'open'), 0) as weighted_value,
          COALESCE(AVG(value) FILTER (WHERE status IN ('won', 'open')), 0) as avg_deal_size,
          CASE
            WHEN COUNT(*) FILTER (WHERE status IN ('won', 'lost')) > 0
            THEN COUNT(*) FILTER (WHERE status = 'won') * 100.0 /
                 COUNT(*) FILTER (WHERE status IN ('won', 'lost'))
            ELSE 0
          END as win_rate,
          COALESCE(
            AVG(EXTRACT(EPOCH FROM (actual_close_date - created_at)) / 86400)
            FILTER (WHERE status IN ('won', 'lost') AND actual_close_date IS NOT NULL),
            0
          ) as avg_time_to_close,
          COUNT(*) FILTER (
            WHERE status = 'open'
            AND expected_close_date >= DATE_TRUNC('month', CURRENT_DATE)
            AND expected_close_date < DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month'
          ) as closing_this_month,
          COUNT(*) FILTER (
            WHERE status = 'open'
            AND expected_close_date >= DATE_TRUNC('quarter', CURRENT_DATE)
            AND expected_close_date < DATE_TRUNC('quarter', CURRENT_DATE) + INTERVAL '3 months'
          ) as closing_this_quarter,
          COUNT(*) FILTER (
            WHERE status = 'open'
            AND expected_close_date < CURRENT_DATE
          ) as overdue_count
        FROM opportunities
        WHERE ${whereClause}
      `;

      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const row = result.getValue().rows[0];

      // Get by stage breakdown
      const stageQuery = `
        SELECT stage, COUNT(*) as count
        FROM opportunities
        WHERE ${whereClause}
        GROUP BY stage
      `;

      const stageResult = await this.pool.query(stageQuery, params);
      if (stageResult.isFailure) {
        return Result.fail(`Database error: ${stageResult.error}`);
      }

      const byStage: Record<string, number> = {};
      for (const stageRow of stageResult.getValue().rows) {
        byStage[stageRow.stage] = parseInt(stageRow.count, 10);
      }

      const stats: OpportunityStatistics = {
        total: parseInt(row.total, 10),
        byStatus: {
          open: parseInt(row.open_count, 10),
          won: parseInt(row.won_count, 10),
          lost: parseInt(row.lost_count, 10),
          onHold: parseInt(row.on_hold_count, 10),
        },
        byStage,
        totalValue: parseFloat(row.total_value),
        weightedValue: parseFloat(row.weighted_value),
        averageDealSize: parseFloat(row.avg_deal_size),
        winRate: parseFloat(row.win_rate),
        averageTimeToClose: parseFloat(row.avg_time_to_close),
        closingThisMonth: parseInt(row.closing_this_month, 10),
        closingThisQuarter: parseInt(row.closing_this_quarter, 10),
        overdueCount: parseInt(row.overdue_count, 10),
      };

      return Result.ok(stats);
    } catch (error) {
      return Result.fail(`Failed to get statistics: ${(error as Error).message}`);
    }
  }

  /**
   * Get pipeline forecast
   */
  async getPipelineForecast(
    tenantId: string,
    months: number = 6,
    pipelineId?: string
  ): Promise<Result<PipelineForecast[]>> {
    try {
      const conditions: string[] = ['tenant_id = $1', "status = 'open'"];
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (pipelineId) {
        conditions.push(`pipeline_id = $${paramIndex}`);
        params.push(pipelineId);
        paramIndex++;
      }

      params.push(months);

      const query = `
        WITH months AS (
          SELECT generate_series(
            DATE_TRUNC('month', CURRENT_DATE),
            DATE_TRUNC('month', CURRENT_DATE) + ($${paramIndex} - 1) * INTERVAL '1 month',
            INTERVAL '1 month'
          ) as month_start
        )
        SELECT
          TO_CHAR(m.month_start, 'YYYY-MM') as period,
          COUNT(o.id) as open_opportunities,
          COALESCE(SUM(o.value), 0) as total_value,
          COALESCE(SUM(o.value * o.probability / 100.0), 0) as weighted_value,
          COUNT(o.id) FILTER (
            WHERE o.expected_close_date >= m.month_start
            AND o.expected_close_date < m.month_start + INTERVAL '1 month'
          ) as expected_closes,
          COALESCE(SUM(o.value) FILTER (
            WHERE o.expected_close_date >= m.month_start
            AND o.expected_close_date < m.month_start + INTERVAL '1 month'
          ), 0) as expected_value
        FROM months m
        LEFT JOIN opportunities o ON o.expected_close_date >= m.month_start
          AND o.expected_close_date < m.month_start + INTERVAL '1 month'
          AND ${conditions.join(' AND ')}
        GROUP BY m.month_start
        ORDER BY m.month_start
      `;

      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const forecast: PipelineForecast[] = result.getValue().rows.map((row: Record<string, unknown>) => ({
        period: row.period as string,
        openOpportunities: parseInt(row.open_opportunities as string, 10),
        totalValue: parseFloat(row.total_value as string),
        weightedValue: parseFloat(row.weighted_value as string),
        expectedCloses: parseInt(row.expected_closes as string, 10),
        expectedValue: parseFloat(row.expected_value as string),
      }));

      return Result.ok(forecast);
    } catch (error) {
      return Result.fail(`Failed to get forecast: ${(error as Error).message}`);
    }
  }

  /**
   * Bulk operation on opportunities
   */
  async bulkOperation(
    tenantId: string,
    operation: BulkOpportunityOperation,
    performedBy?: string
  ): Promise<Result<BulkOpportunityResult>> {
    const successful: string[] = [];
    const failed: { opportunityId: string; error: string }[] = [];

    for (const opportunityId of operation.opportunityIds) {
      try {
        let result: Result<unknown>;

        switch (operation.action) {
          case 'reassign':
            if (!operation.ownerId) {
              failed.push({ opportunityId, error: 'Owner ID required for reassign' });
              continue;
            }
            result = await this.updateOpportunity(
              tenantId,
              opportunityId,
              { ownerId: operation.ownerId },
              performedBy
            );
            break;

          case 'updateStage':
            if (!operation.stage) {
              failed.push({ opportunityId, error: 'Stage required for updateStage' });
              continue;
            }
            result = await this.updateOpportunity(
              tenantId,
              opportunityId,
              { stage: operation.stage },
              performedBy
            );
            break;

          case 'updatePipeline':
            if (!operation.pipelineId) {
              failed.push({ opportunityId, error: 'Pipeline ID required for updatePipeline' });
              continue;
            }
            result = await this.updateOpportunity(
              tenantId,
              opportunityId,
              { pipelineId: operation.pipelineId },
              performedBy
            );
            break;

          case 'delete':
            result = await this.deleteOpportunity(tenantId, opportunityId);
            break;

          default:
            failed.push({ opportunityId, error: `Unknown action: ${operation.action}` });
            continue;
        }

        if (result.isSuccess) {
          successful.push(opportunityId);
        } else {
          failed.push({ opportunityId, error: result.error || 'Unknown error' });
        }
      } catch (error) {
        failed.push({ opportunityId, error: (error as Error).message });
      }
    }

    return Result.ok({ successful, failed });
  }

  /**
   * Convert lead to opportunity
   */
  async convertLeadToOpportunity(
    tenantId: string,
    request: ConvertLeadToOpportunityRequest,
    convertedBy?: string
  ): Promise<Result<OpportunityDTO>> {
    try {
      // Verify lead exists
      const leadQuery = `
        SELECT id, company_name, first_name, last_name
        FROM leads
        WHERE id = $1 AND tenant_id = $2
      `;

      const leadResult = await this.pool.query(leadQuery, [request.leadId, tenantId]);

      if (leadResult.isFailure) {
        return Result.fail(`Database error: ${leadResult.error}`);
      }

      if (leadResult.getValue().rows.length === 0) {
        return Result.fail('Lead not found');
      }

      // Create opportunity from lead
      const opportunityResult = await this.createOpportunity(
        tenantId,
        {
          leadId: request.leadId,
          name: request.opportunityName,
          stage: request.stage || 'qualification',
          amount: request.amount,
          probability: request.probability,
          expectedCloseDate: request.expectedCloseDate,
          pipelineId: request.pipelineId,
          source: OpportunitySource.LEAD_CONVERSION,
        },
        convertedBy
      );

      if (opportunityResult.isFailure) {
        return opportunityResult;
      }

      // Update lead status to converted
      await this.pool.query(
        `UPDATE leads SET status = 'converted', converted_at = NOW(), updated_at = NOW() WHERE id = $1 AND tenant_id = $2`,
        [request.leadId, tenantId]
      );

      return opportunityResult;
    } catch (error) {
      return Result.fail(`Failed to convert lead: ${(error as Error).message}`);
    }
  }

  /**
   * Get opportunities by entity (lead or customer)
   */
  async getOpportunitiesByEntity(
    tenantId: string,
    entityType: 'lead' | 'customer',
    entityId: string
  ): Promise<Result<OpportunityDTO[]>> {
    try {
      const column = entityType === 'lead' ? 'lead_id' : 'customer_id';

      const query = `
        SELECT o.*,
          CASE
            WHEN o.expected_close_date < CURRENT_DATE AND o.status = 'open' THEN true
            ELSE false
          END as is_overdue,
          CASE
            WHEN o.value IS NOT NULL AND o.probability IS NOT NULL
            THEN o.value * (o.probability::decimal / 100)
            ELSE null
          END as weighted_amount
        FROM opportunities o
        WHERE o.${column} = $1 AND o.tenant_id = $2
        ORDER BY o.created_at DESC
      `;

      const result = await this.pool.query(query, [entityId, tenantId]);

      if (result.isFailure) {
        return Result.fail(`Database error: ${result.error}`);
      }

      const opportunities = result.getValue().rows.map((row: Record<string, unknown>) => this.mapRowToDTO(row));

      return Result.ok(opportunities);
    } catch (error) {
      return Result.fail(`Failed to get opportunities: ${(error as Error).message}`);
    }
  }

  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      name: 'o.name',
      amount: 'o.value',
      probability: 'o.probability',
      expectedCloseDate: 'o.expected_close_date',
      createdAt: 'o.created_at',
      updatedAt: 'o.updated_at',
      stage: 'o.stage',
    };
    return columnMap[sortBy] || 'o.created_at';
  }

  private mapRowToDTO(row: Record<string, unknown>): OpportunityDTO {
    // Database uses 'value' column but DTO uses 'amount'
    const amount = (row.value !== undefined ? row.value : row.amount) as number | null;
    const probability = row.probability as number;

    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      leadId: row.lead_id as string | undefined,
      customerId: row.customer_id as string | undefined,
      pipelineId: row.pipeline_id as string | undefined,
      name: row.name as string,
      description: row.description as string | undefined,
      status: row.status as OpportunityStatus,
      stage: row.stage as string,
      amount: amount ?? undefined,
      currency: row.currency as string,
      probability,
      ownerId: row.owner_id as string | undefined,
      expectedCloseDate: row.expected_close_date ? new Date(row.expected_close_date as string) : undefined,
      actualCloseDate: row.actual_close_date ? new Date(row.actual_close_date as string) : undefined,
      wonReason: row.won_reason as string | undefined,
      lostReason: row.lost_reason as string | undefined,
      competitorId: row.competitor_id as string | undefined,
      source: row.source as OpportunityDTO['source'],
      tags: this.parseJsonField<string[]>(row.tags, []),
      metadata: this.parseJsonField<Record<string, unknown>>(row.metadata, {}),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      lastActivityAt: row.last_activity_at ? new Date(row.last_activity_at as string) : undefined,
      weightedAmount: row.weighted_amount !== undefined && row.weighted_amount !== null
        ? parseFloat(row.weighted_amount as string)
        : amount && probability
          ? amount * (probability / 100)
          : undefined,
      isOverdue: row.is_overdue as boolean | undefined,
      taskCount: row.task_count !== undefined ? parseInt(row.task_count as string, 10) : undefined,
    };
  }

  private parseJsonField<T>(value: unknown, defaultValue: T): T {
    if (value === null || value === undefined) {
      return defaultValue;
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T;
      } catch {
        return defaultValue;
      }
    }
    return value as T;
  }
}

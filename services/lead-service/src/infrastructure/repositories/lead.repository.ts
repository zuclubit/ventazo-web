import { injectable } from 'tsyringe';
import { PoolClient } from 'pg';
import { BaseRepository, DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { IEventPublisher } from '@zuclubit/events';
import { Lead } from '../../domain/aggregates';
import {
  ILeadRepository,
  FindLeadsQuery,
  PaginatedResult,
} from '../../domain/repositories';
import { LeadStatusEnum } from '../../domain/value-objects';
import { LeadRow } from '../database';

/**
 * PostgreSQL implementation of Lead Repository
 * Follows Repository pattern with Outbox pattern for reliable event publishing
 */
@injectable()
export class LeadRepository extends BaseRepository implements ILeadRepository {
  constructor(
    pool: DatabasePool,
    private readonly eventPublisher: IEventPublisher
  ) {
    super(pool);
  }

  async findById(id: string, tenantId: string): Promise<Result<Lead | null>> {
    const result = await this.queryOne<LeadRow>(
      `SELECT * FROM leads WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const row = result.getValue();
    if (!row) {
      return Result.ok(null);
    }

    return this.mapRowToLead(row);
  }

  async findAll(query: FindLeadsQuery): Promise<Result<PaginatedResult<Lead>>> {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const offset = (page - 1) * limit;

    // Build WHERE clause
    const conditions: string[] = ['tenant_id = $1'];
    const params: unknown[] = [query.tenantId];
    let paramIndex = 2;

    if (query.status) {
      conditions.push(`status = $${paramIndex}`);
      params.push(query.status);
      paramIndex++;
    }

    if (query.ownerId) {
      conditions.push(`owner_id = $${paramIndex}`);
      params.push(query.ownerId);
      paramIndex++;
    }

    if (query.source) {
      conditions.push(`source = $${paramIndex}`);
      params.push(query.source);
      paramIndex++;
    }

    if (query.minScore !== undefined) {
      conditions.push(`score >= $${paramIndex}`);
      params.push(query.minScore);
      paramIndex++;
    }

    if (query.maxScore !== undefined) {
      conditions.push(`score <= $${paramIndex}`);
      params.push(query.maxScore);
      paramIndex++;
    }

    if (query.industry) {
      conditions.push(`industry = $${paramIndex}`);
      params.push(query.industry);
      paramIndex++;
    }

    if (query.searchTerm) {
      conditions.push(
        `(company_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`
      );
      params.push(`%${query.searchTerm}%`);
      paramIndex++;
    }

    const whereClause = conditions.join(' AND ');

    // Build ORDER BY clause
    const sortBy = query.sortBy || 'createdAt';
    const sortOrder = query.sortOrder || 'desc';
    const orderByClause = `ORDER BY ${this.escapeIdentifier(this.toSnakeCase(sortBy))} ${sortOrder}`;

    // Get total count
    const countResult = await this.count('leads', whereClause, params);
    if (countResult.isFailure) {
      return Result.fail(countResult.error as string);
    }
    const total = countResult.getValue();

    // Get paginated results
    const dataResult = await this.query<LeadRow>(
      `SELECT * FROM leads WHERE ${whereClause} ${orderByClause} LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    if (dataResult.isFailure) {
      return Result.fail(dataResult.error as string);
    }

    const rows = dataResult.getValue();
    const leads: Lead[] = [];

    for (const row of rows) {
      const leadResult = this.mapRowToLead(row);
      if (leadResult.isFailure) {
        return Result.fail(leadResult.error as string);
      }
      const lead = leadResult.getValue();
      if (lead) {
        leads.push(lead);
      }
    }

    return Result.ok({
      items: leads,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  async findByOwner(ownerId: string, tenantId: string): Promise<Result<Lead[]>> {
    const result = await this.query<LeadRow>(
      `SELECT * FROM leads WHERE owner_id = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
      [ownerId, tenantId]
    );

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const rows = result.getValue();
    return this.mapRowsToLeads(rows);
  }

  async findByStatus(status: LeadStatusEnum, tenantId: string): Promise<Result<Lead[]>> {
    const result = await this.query<LeadRow>(
      `SELECT * FROM leads WHERE status = $1 AND tenant_id = $2 ORDER BY created_at DESC`,
      [status, tenantId]
    );

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const rows = result.getValue();
    return this.mapRowsToLeads(rows);
  }

  async findOverdueFollowUps(tenantId: string): Promise<Result<Lead[]>> {
    const result = await this.query<LeadRow>(
      `SELECT * FROM leads
       WHERE tenant_id = $1
         AND next_follow_up_at IS NOT NULL
         AND next_follow_up_at < NOW()
         AND status NOT IN ('won', 'lost')
       ORDER BY next_follow_up_at ASC`,
      [tenantId]
    );

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const rows = result.getValue();
    return this.mapRowsToLeads(rows);
  }

  async save(lead: Lead): Promise<Result<void>> {
    return this.executeInTransaction(async (client: PoolClient) => {
      // Upsert lead
      const upsertResult = await this.upsertLead(client, lead);
      if (upsertResult.isFailure) {
        return Result.fail(upsertResult.error as string);
      }

      // Save domain events to outbox
      const events = lead.getDomainEvents();
      for (const event of events) {
        const outboxResult = await this.saveEventToOutbox(client, event, lead.id);
        if (outboxResult.isFailure) {
          return Result.fail(outboxResult.error as string);
        }
      }

      // Publish events (after commit - eventual consistency)
      for (const event of events) {
        await this.eventPublisher.publish(event);
      }

      // Clear domain events
      lead.clearDomainEvents();

      return Result.ok();
    });
  }

  async delete(id: string, tenantId: string): Promise<Result<void>> {
    const result = await this.query(
      `DELETE FROM leads WHERE id = $1 AND tenant_id = $2`,
      [id, tenantId]
    );

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    return Result.ok();
  }

  async exists(id: string, tenantId: string): Promise<Result<boolean>> {
    return this.exists('leads', id);
  }

  async countByStatus(tenantId: string): Promise<Result<Record<string, number>>> {
    const result = await this.query<{ status: string; count: string }>(
      `SELECT status, COUNT(*) as count
       FROM leads
       WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId]
    );

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const rows = result.getValue();
    const counts: Record<string, number> = {};
    for (const row of rows) {
      counts[row.status] = parseInt(row.count, 10);
    }

    return Result.ok(counts);
  }

  async getAverageScoreByStatus(
    tenantId: string
  ): Promise<Result<Record<string, number>>> {
    const result = await this.query<{ status: string; avg_score: string }>(
      `SELECT status, AVG(score)::numeric(10,2) as avg_score
       FROM leads
       WHERE tenant_id = $1
       GROUP BY status`,
      [tenantId]
    );

    if (result.isFailure) {
      return Result.fail(result.error as string);
    }

    const rows = result.getValue();
    const averages: Record<string, number> = {};
    for (const row of rows) {
      averages[row.status] = parseFloat(row.avg_score);
    }

    return Result.ok(averages);
  }

  /**
   * Private helper methods
   */

  private async upsertLead(client: PoolClient, lead: Lead): Promise<Result<void>> {
    try {
      await client.query(
        `INSERT INTO leads (
          id, tenant_id, company_name, email, phone, website, industry,
          employee_count, annual_revenue, status, score, source, owner_id,
          notes, custom_fields, created_at, updated_at, last_activity_at, next_follow_up_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (id) DO UPDATE SET
          company_name = EXCLUDED.company_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          website = EXCLUDED.website,
          industry = EXCLUDED.industry,
          employee_count = EXCLUDED.employee_count,
          annual_revenue = EXCLUDED.annual_revenue,
          status = EXCLUDED.status,
          score = EXCLUDED.score,
          owner_id = EXCLUDED.owner_id,
          notes = EXCLUDED.notes,
          custom_fields = EXCLUDED.custom_fields,
          updated_at = EXCLUDED.updated_at,
          last_activity_at = EXCLUDED.last_activity_at,
          next_follow_up_at = EXCLUDED.next_follow_up_at`,
        [
          lead.id,
          lead.tenantId,
          lead.getCompanyName(),
          lead.getEmail().value,
          lead.getPhone(),
          lead.getWebsite(),
          lead.getIndustry(),
          lead.getEmployeeCount(),
          lead.getAnnualRevenue(),
          lead.getStatus().value,
          lead.getScore().value,
          lead.getSource(),
          lead.getOwnerId(),
          lead.getNotes(),
          JSON.stringify(lead.getCustomFields()),
          lead.createdAt,
          lead.getUpdatedAt(),
          lead.getLastActivityAt(),
          lead.getNextFollowUpAt(),
        ]
      );

      return Result.ok();
    } catch (error) {
      return Result.fail(
        `Failed to upsert lead: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async saveEventToOutbox(
    client: PoolClient,
    event: unknown,
    aggregateId: string
  ): Promise<Result<void>> {
    try {
      const eventObj = event as { type: string; data: { tenantId: string } };
      await client.query(
        `INSERT INTO outbox_events (event_type, event_data, tenant_id, aggregate_id)
         VALUES ($1, $2, $3, $4)`,
        [eventObj.type, JSON.stringify(event), eventObj.data.tenantId, aggregateId]
      );

      return Result.ok();
    } catch (error) {
      return Result.fail(
        `Failed to save event to outbox: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private mapRowToLead(row: LeadRow): Result<Lead> {
    return Lead.reconstitute({
      id: row.id,
      tenantId: row.tenantId,
      companyName: row.companyName,
      email: row.email,
      phone: row.phone,
      website: row.website,
      industry: row.industry,
      employeeCount: row.employeeCount,
      annualRevenue: row.annualRevenue,
      status: row.status,
      score: row.score,
      source: row.source,
      ownerId: row.ownerId,
      notes: row.notes,
      customFields: (row.customFields as Record<string, unknown>) || {},
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
      lastActivityAt: row.lastActivityAt ? new Date(row.lastActivityAt) : null,
      nextFollowUpAt: row.nextFollowUpAt ? new Date(row.nextFollowUpAt) : null,
    });
  }

  private async mapRowsToLeads(rows: LeadRow[]): Promise<Result<Lead[]>> {
    const leads: Lead[] = [];

    for (const row of rows) {
      const leadResult = this.mapRowToLead(row);
      if (leadResult.isFailure) {
        return Result.fail(leadResult.error as string);
      }
      const lead = leadResult.getValue();
      leads.push(lead);
    }

    return Result.ok(leads);
  }

  private toSnakeCase(str: string): string {
    return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
  }
}

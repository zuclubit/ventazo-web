import { injectable, inject } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { DatabasePool } from '@zuclubit/database';
import {
  CommunicationType,
  CommunicationDirection,
  CommunicationStatus,
  CommunicationDTO,
  CreateCommunicationRequest,
  UpdateCommunicationRequest,
  CommunicationFilterOptions,
  CommunicationStats,
  CommunicationTimelineEntry,
  PaginatedCommunicationsResult,
  CommunicationParticipant,
  CommunicationAttachment,
} from './types';

/**
 * Communication Service
 * Manages communication tracking with leads
 */
@injectable()
export class CommunicationService {
  constructor(@inject('DatabasePool') private readonly pool: DatabasePool) {}

  /**
   * Log a new communication
   */
  async logCommunication(
    tenantId: string,
    request: CreateCommunicationRequest,
    createdBy: string
  ): Promise<Result<CommunicationDTO>> {
    try {
      // Verify lead exists
      const leadExists = await this.verifyLeadExists(request.leadId, tenantId);
      if (!leadExists) {
        return Result.fail('Lead not found');
      }

      // Verify contact exists if provided
      if (request.contactId) {
        const contactExists = await this.verifyContactExists(
          request.contactId,
          request.leadId,
          tenantId
        );
        if (!contactExists) {
          return Result.fail('Contact not found');
        }
      }

      const id = crypto.randomUUID();
      const now = new Date();
      const occurredAt = request.occurredAt || now;
      const status = request.status || CommunicationStatus.COMPLETED;

      const query = `
        INSERT INTO lead_communications (
          id, lead_id, contact_id, tenant_id, communication_type, direction,
          status, subject, body, summary, scheduled_at, occurred_at, completed_at,
          duration, created_by, assigned_to, call_details, email_details,
          meeting_details, participants, attachments, tags, metadata, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16,
          $17, $18, $19, $20, $21, $22, $23, $24, $25
        )
        RETURNING *
      `;

      const values = [
        id,
        request.leadId,
        request.contactId || null,
        tenantId,
        request.type,
        request.direction,
        status,
        request.subject || null,
        request.body || null,
        request.summary || null,
        request.scheduledAt || null,
        occurredAt,
        status === CommunicationStatus.COMPLETED ? now : null,
        request.duration || null,
        createdBy,
        request.assignedTo || null,
        request.callDetails ? JSON.stringify(request.callDetails) : null,
        request.emailDetails ? JSON.stringify(request.emailDetails) : null,
        request.meetingDetails ? JSON.stringify(request.meetingDetails) : null,
        JSON.stringify(request.participants || []),
        JSON.stringify(request.attachments || []),
        request.tags || [],
        request.metadata ? JSON.stringify(request.metadata) : '{}',
        now,
        now,
      ];

      const queryResult = await this.pool.query(query, values);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      // Update lead's last activity
      await this.updateLeadActivity(request.leadId, tenantId);

      return Result.ok(this.mapToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to log communication: ${(error as Error).message}`);
    }
  }

  /**
   * Get communication by ID
   */
  async getCommunicationById(
    communicationId: string,
    tenantId: string
  ): Promise<Result<CommunicationDTO | null>> {
    try {
      const query = `
        SELECT * FROM lead_communications
        WHERE id = $1 AND tenant_id = $2
      `;

      const queryResult = await this.pool.query(query, [communicationId, tenantId]);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get communication: ${(error as Error).message}`);
    }
  }

  /**
   * Get communications for a lead
   */
  async getCommunicationsByLead(
    leadId: string,
    tenantId: string,
    filters?: CommunicationFilterOptions
  ): Promise<Result<PaginatedCommunicationsResult>> {
    try {
      const page = filters?.page || 1;
      const limit = Math.min(filters?.limit || 20, 100);
      const offset = (page - 1) * limit;

      let whereClause = 'WHERE lead_id = $1 AND tenant_id = $2';
      const values: unknown[] = [leadId, tenantId];
      let paramIndex = 3;

      if (filters?.type) {
        whereClause += ` AND communication_type = $${paramIndex++}`;
        values.push(filters.type);
      }

      if (filters?.direction) {
        whereClause += ` AND direction = $${paramIndex++}`;
        values.push(filters.direction);
      }

      if (filters?.status) {
        whereClause += ` AND status = $${paramIndex++}`;
        values.push(filters.status);
      }

      if (filters?.dateFrom) {
        whereClause += ` AND occurred_at >= $${paramIndex++}`;
        values.push(filters.dateFrom);
      }

      if (filters?.dateTo) {
        whereClause += ` AND occurred_at <= $${paramIndex++}`;
        values.push(filters.dateTo);
      }

      if (filters?.createdBy) {
        whereClause += ` AND created_by = $${paramIndex++}`;
        values.push(filters.createdBy);
      }

      if (filters?.assignedTo) {
        whereClause += ` AND assigned_to = $${paramIndex++}`;
        values.push(filters.assignedTo);
      }

      if (filters?.contactId) {
        whereClause += ` AND contact_id = $${paramIndex++}`;
        values.push(filters.contactId);
      }

      if (filters?.tags && filters.tags.length > 0) {
        whereClause += ` AND tags && $${paramIndex++}`;
        values.push(filters.tags);
      }

      if (filters?.searchTerm) {
        whereClause += ` AND (
          subject ILIKE $${paramIndex} OR
          body ILIKE $${paramIndex} OR
          summary ILIKE $${paramIndex}
        )`;
        values.push(`%${filters.searchTerm}%`);
        paramIndex++;
      }

      // Count total
      const countQuery = `SELECT COUNT(*) as total FROM lead_communications ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);

      if (countResult.isFailure) {
        return Result.fail(`Database error: ${countResult.error}`);
      }

      const total = parseInt(countResult.getValue().rows[0].total as string, 10);

      // Get paginated results
      const sortBy = filters?.sortBy || 'occurredAt';
      const sortOrder = filters?.sortOrder || 'desc';
      const sortColumn =
        sortBy === 'occurredAt'
          ? 'occurred_at'
          : sortBy === 'scheduledAt'
            ? 'scheduled_at'
            : 'created_at';

      const dataQuery = `
        SELECT * FROM lead_communications
        ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      values.push(limit, offset);

      const dataResult = await this.pool.query(dataQuery, values);

      if (dataResult.isFailure) {
        return Result.fail(`Database error: ${dataResult.error}`);
      }

      const items = dataResult
        .getValue()
        .rows.map((row: Record<string, unknown>) => this.mapToDTO(row));

      return Result.ok({
        items,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (error) {
      return Result.fail(`Failed to get communications: ${(error as Error).message}`);
    }
  }

  /**
   * Get communication timeline for a lead
   */
  async getTimeline(
    leadId: string,
    tenantId: string,
    limit?: number
  ): Promise<Result<CommunicationTimelineEntry[]>> {
    try {
      const query = `
        SELECT
          lc.id,
          lc.communication_type,
          lc.direction,
          lc.status,
          lc.subject,
          lc.summary,
          lc.occurred_at,
          lc.created_by,
          lc.duration,
          CONCAT(c.first_name, ' ', c.last_name) as contact_name
        FROM lead_communications lc
        LEFT JOIN lead_contacts c ON lc.contact_id = c.id
        WHERE lc.lead_id = $1 AND lc.tenant_id = $2
        ORDER BY lc.occurred_at DESC
        LIMIT $3
      `;

      const queryResult = await this.pool.query(query, [leadId, tenantId, limit || 50]);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const entries = queryResult.getValue().rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        type: row.communication_type as CommunicationType,
        direction: row.direction as CommunicationDirection,
        status: row.status as CommunicationStatus,
        subject: row.subject as string | undefined,
        summary: row.summary as string | undefined,
        occurredAt: row.occurred_at as Date,
        createdBy: row.created_by as string,
        contactName: row.contact_name as string | undefined,
        duration: row.duration as number | undefined,
      }));

      return Result.ok(entries);
    } catch (error) {
      return Result.fail(`Failed to get timeline: ${(error as Error).message}`);
    }
  }

  /**
   * Update communication
   */
  async updateCommunication(
    communicationId: string,
    tenantId: string,
    request: UpdateCommunicationRequest,
    updatedBy: string
  ): Promise<Result<CommunicationDTO>> {
    try {
      // Verify communication exists
      const existingResult = await this.getCommunicationById(communicationId, tenantId);
      if (existingResult.isFailure) {
        return Result.fail(existingResult.error as string);
      }

      const existing = existingResult.getValue();
      if (!existing) {
        return Result.fail('Communication not found');
      }

      // Build update query
      const setClauses: string[] = ['updated_at = NOW()'];
      const values: unknown[] = [];
      let paramIndex = 1;

      if (request.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        values.push(request.status);

        // If completing, set completed_at
        if (request.status === CommunicationStatus.COMPLETED && !existing.completedAt) {
          setClauses.push(`completed_at = NOW()`);
        }
      }

      if (request.subject !== undefined) {
        setClauses.push(`subject = $${paramIndex++}`);
        values.push(request.subject);
      }

      if (request.body !== undefined) {
        setClauses.push(`body = $${paramIndex++}`);
        values.push(request.body);
      }

      if (request.summary !== undefined) {
        setClauses.push(`summary = $${paramIndex++}`);
        values.push(request.summary);
      }

      if (request.scheduledAt !== undefined) {
        setClauses.push(`scheduled_at = $${paramIndex++}`);
        values.push(request.scheduledAt);
      }

      if (request.occurredAt !== undefined) {
        setClauses.push(`occurred_at = $${paramIndex++}`);
        values.push(request.occurredAt);
      }

      if (request.completedAt !== undefined) {
        setClauses.push(`completed_at = $${paramIndex++}`);
        values.push(request.completedAt);
      }

      if (request.duration !== undefined) {
        setClauses.push(`duration = $${paramIndex++}`);
        values.push(request.duration);
      }

      if (request.assignedTo !== undefined) {
        setClauses.push(`assigned_to = $${paramIndex++}`);
        values.push(request.assignedTo);
      }

      if (request.callDetails !== undefined) {
        setClauses.push(`call_details = $${paramIndex++}`);
        values.push(request.callDetails ? JSON.stringify(request.callDetails) : null);
      }

      if (request.emailDetails !== undefined) {
        setClauses.push(`email_details = $${paramIndex++}`);
        values.push(request.emailDetails ? JSON.stringify(request.emailDetails) : null);
      }

      if (request.meetingDetails !== undefined) {
        setClauses.push(`meeting_details = $${paramIndex++}`);
        values.push(request.meetingDetails ? JSON.stringify(request.meetingDetails) : null);
      }

      if (request.participants !== undefined) {
        setClauses.push(`participants = $${paramIndex++}`);
        values.push(JSON.stringify(request.participants));
      }

      if (request.attachments !== undefined) {
        setClauses.push(`attachments = $${paramIndex++}`);
        values.push(JSON.stringify(request.attachments));
      }

      if (request.tags !== undefined) {
        setClauses.push(`tags = $${paramIndex++}`);
        values.push(request.tags);
      }

      if (request.metadata !== undefined) {
        setClauses.push(`metadata = $${paramIndex++}`);
        values.push(JSON.stringify(request.metadata));
      }

      values.push(communicationId, tenantId);

      const query = `
        UPDATE lead_communications
        SET ${setClauses.join(', ')}
        WHERE id = $${paramIndex++} AND tenant_id = $${paramIndex}
        RETURNING *
      `;

      const queryResult = await this.pool.query(query, values);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      // Update lead's last activity
      await this.updateLeadActivity(existing.leadId, tenantId);

      return Result.ok(this.mapToDTO(rows[0]));
    } catch (error) {
      return Result.fail(`Failed to update communication: ${(error as Error).message}`);
    }
  }

  /**
   * Delete communication
   */
  async deleteCommunication(
    communicationId: string,
    tenantId: string,
    deletedBy: string
  ): Promise<Result<void>> {
    try {
      const query = `
        DELETE FROM lead_communications
        WHERE id = $1 AND tenant_id = $2
        RETURNING lead_id
      `;

      const queryResult = await this.pool.query(query, [communicationId, tenantId]);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const rows = queryResult.getValue().rows;

      if (rows.length === 0) {
        return Result.fail('Communication not found');
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to delete communication: ${(error as Error).message}`);
    }
  }

  /**
   * Get communication statistics for a lead
   */
  async getStats(leadId: string, tenantId: string): Promise<Result<CommunicationStats>> {
    try {
      // Total and by type
      const typeQuery = `
        SELECT
          communication_type,
          COUNT(*) as count
        FROM lead_communications
        WHERE lead_id = $1 AND tenant_id = $2
        GROUP BY communication_type
      `;

      const typeResult = await this.pool.query(typeQuery, [leadId, tenantId]);

      if (typeResult.isFailure) {
        return Result.fail(`Database error: ${typeResult.error}`);
      }

      const byType = Object.values(CommunicationType).reduce(
        (acc, type) => {
          acc[type] = 0;
          return acc;
        },
        {} as Record<CommunicationType, number>
      );

      let total = 0;
      for (const row of typeResult.getValue().rows) {
        const count = parseInt(row.count as string, 10);
        byType[row.communication_type as CommunicationType] = count;
        total += count;
      }

      // By direction
      const directionQuery = `
        SELECT
          direction,
          COUNT(*) as count
        FROM lead_communications
        WHERE lead_id = $1 AND tenant_id = $2
        GROUP BY direction
      `;

      const directionResult = await this.pool.query(directionQuery, [leadId, tenantId]);

      const byDirection = Object.values(CommunicationDirection).reduce(
        (acc, dir) => {
          acc[dir] = 0;
          return acc;
        },
        {} as Record<CommunicationDirection, number>
      );

      if (directionResult.isSuccess) {
        for (const row of directionResult.getValue().rows) {
          byDirection[row.direction as CommunicationDirection] = parseInt(row.count as string, 10);
        }
      }

      // By status
      const statusQuery = `
        SELECT
          status,
          COUNT(*) as count
        FROM lead_communications
        WHERE lead_id = $1 AND tenant_id = $2
        GROUP BY status
      `;

      const statusResult = await this.pool.query(statusQuery, [leadId, tenantId]);

      const byStatus = Object.values(CommunicationStatus).reduce(
        (acc, status) => {
          acc[status] = 0;
          return acc;
        },
        {} as Record<CommunicationStatus, number>
      );

      if (statusResult.isSuccess) {
        for (const row of statusResult.getValue().rows) {
          byStatus[row.status as CommunicationStatus] = parseInt(row.count as string, 10);
        }
      }

      // Call duration stats
      const callStatsQuery = `
        SELECT
          AVG(duration) as avg_duration,
          SUM(duration) as total_duration
        FROM lead_communications
        WHERE lead_id = $1 AND tenant_id = $2
          AND communication_type = 'call'
          AND duration IS NOT NULL
      `;

      const callStatsResult = await this.pool.query(callStatsQuery, [leadId, tenantId]);

      let averageCallDuration: number | undefined;
      let totalCallDuration: number | undefined;

      if (callStatsResult.isSuccess && callStatsResult.getValue().rows[0]) {
        const row = callStatsResult.getValue().rows[0];
        if (row.avg_duration) {
          averageCallDuration = Math.round(parseFloat(row.avg_duration as string));
        }
        if (row.total_duration) {
          totalCallDuration = parseInt(row.total_duration as string, 10);
        }
      }

      // Last communication and next scheduled
      const datesQuery = `
        SELECT
          MAX(occurred_at) as last_communication,
          MIN(CASE WHEN scheduled_at > NOW() AND status = 'scheduled' THEN scheduled_at END) as next_scheduled
        FROM lead_communications
        WHERE lead_id = $1 AND tenant_id = $2
      `;

      const datesResult = await this.pool.query(datesQuery, [leadId, tenantId]);

      let lastCommunication: Date | undefined;
      let nextScheduled: Date | undefined;

      if (datesResult.isSuccess && datesResult.getValue().rows[0]) {
        const row = datesResult.getValue().rows[0];
        if (row.last_communication) {
          lastCommunication = new Date(row.last_communication as string);
        }
        if (row.next_scheduled) {
          nextScheduled = new Date(row.next_scheduled as string);
        }
      }

      return Result.ok({
        total,
        byType,
        byDirection,
        byStatus,
        averageCallDuration,
        totalCallDuration,
        lastCommunication,
        nextScheduled,
      });
    } catch (error) {
      return Result.fail(`Failed to get stats: ${(error as Error).message}`);
    }
  }

  /**
   * Schedule a follow-up communication
   */
  async scheduleFollowUp(
    leadId: string,
    tenantId: string,
    request: {
      type: CommunicationType;
      scheduledAt: Date;
      subject?: string;
      body?: string;
      assignedTo?: string;
      contactId?: string;
    },
    createdBy: string
  ): Promise<Result<CommunicationDTO>> {
    return this.logCommunication(
      tenantId,
      {
        leadId,
        contactId: request.contactId,
        type: request.type,
        direction: CommunicationDirection.OUTBOUND,
        status: CommunicationStatus.SCHEDULED,
        scheduledAt: request.scheduledAt,
        subject: request.subject,
        body: request.body,
        assignedTo: request.assignedTo,
      },
      createdBy
    );
  }

  /**
   * Get upcoming scheduled communications
   */
  async getUpcomingCommunications(
    tenantId: string,
    userId?: string,
    days: number = 7
  ): Promise<Result<CommunicationDTO[]>> {
    try {
      let query = `
        SELECT * FROM lead_communications
        WHERE tenant_id = $1
          AND status = 'scheduled'
          AND scheduled_at >= NOW()
          AND scheduled_at <= NOW() + INTERVAL '${days} days'
      `;

      const values: unknown[] = [tenantId];

      if (userId) {
        query += ` AND (assigned_to = $2 OR created_by = $2)`;
        values.push(userId);
      }

      query += ` ORDER BY scheduled_at ASC`;

      const queryResult = await this.pool.query(query, values);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const items = queryResult
        .getValue()
        .rows.map((row: Record<string, unknown>) => this.mapToDTO(row));

      return Result.ok(items);
    } catch (error) {
      return Result.fail(`Failed to get upcoming communications: ${(error as Error).message}`);
    }
  }

  /**
   * Get overdue communications
   */
  async getOverdueCommunications(
    tenantId: string,
    userId?: string
  ): Promise<Result<CommunicationDTO[]>> {
    try {
      let query = `
        SELECT * FROM lead_communications
        WHERE tenant_id = $1
          AND status = 'scheduled'
          AND scheduled_at < NOW()
      `;

      const values: unknown[] = [tenantId];

      if (userId) {
        query += ` AND (assigned_to = $2 OR created_by = $2)`;
        values.push(userId);
      }

      query += ` ORDER BY scheduled_at ASC`;

      const queryResult = await this.pool.query(query, values);

      if (queryResult.isFailure) {
        return Result.fail(`Database error: ${queryResult.error}`);
      }

      const items = queryResult
        .getValue()
        .rows.map((row: Record<string, unknown>) => this.mapToDTO(row));

      return Result.ok(items);
    } catch (error) {
      return Result.fail(`Failed to get overdue communications: ${(error as Error).message}`);
    }
  }

  // Private helper methods

  private async verifyLeadExists(leadId: string, tenantId: string): Promise<boolean> {
    const query = `SELECT 1 FROM leads WHERE id = $1 AND tenant_id = $2`;
    const result = await this.pool.query(query, [leadId, tenantId]);
    return result.isSuccess && result.getValue().rows.length > 0;
  }

  private async verifyContactExists(
    contactId: string,
    leadId: string,
    tenantId: string
  ): Promise<boolean> {
    const query = `SELECT 1 FROM lead_contacts WHERE id = $1 AND lead_id = $2 AND tenant_id = $3`;
    const result = await this.pool.query(query, [contactId, leadId, tenantId]);
    return result.isSuccess && result.getValue().rows.length > 0;
  }

  private async updateLeadActivity(leadId: string, tenantId: string): Promise<void> {
    const query = `
      UPDATE leads
      SET last_activity_at = NOW(), updated_at = NOW()
      WHERE id = $1 AND tenant_id = $2
    `;
    await this.pool.query(query, [leadId, tenantId]);
  }

  private mapToDTO(row: Record<string, unknown>): CommunicationDTO {
    return {
      id: row.id as string,
      leadId: row.lead_id as string,
      contactId: row.contact_id as string | null,
      tenantId: row.tenant_id as string,
      type: row.communication_type as CommunicationType,
      direction: row.direction as CommunicationDirection,
      status: row.status as CommunicationStatus,
      subject: row.subject as string | null,
      body: row.body as string | null,
      summary: row.summary as string | null,
      scheduledAt: row.scheduled_at ? new Date(row.scheduled_at as string) : null,
      occurredAt: new Date(row.occurred_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : null,
      duration: row.duration as number | null,
      createdBy: row.created_by as string,
      assignedTo: row.assigned_to as string | null,
      callDetails:
        typeof row.call_details === 'string' ? JSON.parse(row.call_details) : row.call_details,
      emailDetails:
        typeof row.email_details === 'string' ? JSON.parse(row.email_details) : row.email_details,
      meetingDetails:
        typeof row.meeting_details === 'string'
          ? JSON.parse(row.meeting_details)
          : row.meeting_details,
      participants: this.parseJsonArray<CommunicationParticipant>(row.participants),
      attachments: this.parseJsonArray<CommunicationAttachment>(row.attachments),
      tags: (row.tags as string[]) || [],
      metadata:
        typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : (row.metadata as Record<string, unknown>) || {},
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private parseJsonArray<T>(value: unknown): T[] {
    if (Array.isArray(value)) {
      return value as T[];
    }
    if (typeof value === 'string') {
      try {
        return JSON.parse(value) as T[];
      } catch {
        return [];
      }
    }
    return [];
  }
}

/**
 * GDPR Compliance Service
 * Handles data subject requests, consent management, and data export/deletion
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  DsrType,
  DsrStatus,
  ExportFormat,
  DataSubjectRequest,
  ConsentRecord,
  DataExportResult,
  DataDeletionResult,
  PersonalDataExport,
  CreateDsrInput,
  RecordConsentInput,
  GdprComplianceSummary,
  DsrAuditEntry,
} from './types';

/**
 * GDPR Compliance Service
 */
@injectable()
export class GdprService {
  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {}

  // ==================== Data Subject Requests (DSR) ====================

  /**
   * Create a new data subject request
   */
  async createDsr(
    tenantId: string,
    input: CreateDsrInput
  ): Promise<Result<DataSubjectRequest>> {
    try {
      const id = uuidv4();
      const verificationToken = this.generateVerificationToken();
      const receivedAt = new Date();
      const dueDate = new Date(receivedAt);
      dueDate.setDate(dueDate.getDate() + 30); // GDPR 30-day deadline

      const auditLog: DsrAuditEntry[] = [{
        timestamp: new Date(),
        action: 'request_created',
        performedBy: 'system',
        details: `DSR type: ${input.type}`,
      }];

      const query = `
        INSERT INTO data_subject_requests (
          id, tenant_id, type, status, priority,
          subject_email, subject_name, verification_method,
          verification_token, request_source, request_notes,
          export_format, erasure_scope, erasure_exclusions,
          received_at, due_date, audit_log, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        input.type,
        'pending',
        'medium',
        input.subjectEmail.toLowerCase(),
        input.subjectName,
        input.verificationMethod || 'email',
        verificationToken,
        input.requestSource,
        input.requestNotes,
        input.exportFormat || 'json',
        input.erasureScope || 'all',
        JSON.stringify(input.erasureExclusions || []),
        receivedAt,
        dueDate,
        JSON.stringify(auditLog),
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to create data subject request');
      }

      return Result.ok(this.mapRowToDsr(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to create DSR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get DSR by ID
   */
  async getDsr(
    id: string,
    tenantId: string
  ): Promise<Result<DataSubjectRequest | null>> {
    try {
      const query = `
        SELECT * FROM data_subject_requests
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [id, tenantId]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToDsr(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get DSR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Verify a DSR using token
   */
  async verifyDsr(
    id: string,
    token: string,
    tenantId: string
  ): Promise<Result<DataSubjectRequest>> {
    try {
      const dsrResult = await this.getDsr(id, tenantId);
      if (dsrResult.isFailure || !dsrResult.value) {
        return Result.fail('DSR not found');
      }

      const dsr = dsrResult.value;
      if (dsr.verificationToken !== token) {
        return Result.fail('Invalid verification token');
      }

      if (dsr.verifiedAt) {
        return Result.fail('DSR already verified');
      }

      const auditLog = [...dsr.auditLog, {
        timestamp: new Date(),
        action: 'verified',
        performedBy: 'data_subject',
        details: 'Email verification completed',
      }];

      const query = `
        UPDATE data_subject_requests
        SET verified_at = NOW(),
            status = 'in_progress',
            audit_log = $1,
            updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        JSON.stringify(auditLog),
        id,
        tenantId,
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to verify DSR');
      }

      return Result.ok(this.mapRowToDsr(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to verify DSR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Process a DSR (execute the request)
   */
  async processDsr(
    id: string,
    tenantId: string,
    userId: string
  ): Promise<Result<{ dsr: DataSubjectRequest; result: DataExportResult | DataDeletionResult }>> {
    try {
      const dsrResult = await this.getDsr(id, tenantId);
      if (dsrResult.isFailure || !dsrResult.value) {
        return Result.fail('DSR not found');
      }

      const dsr = dsrResult.value;

      if (dsr.status !== 'in_progress' && dsr.status !== 'pending') {
        return Result.fail('DSR is not in a processable state');
      }

      let processingResult: DataExportResult | DataDeletionResult;

      switch (dsr.type) {
        case 'access':
        case 'portability':
          processingResult = await this.exportPersonalData(
            tenantId,
            dsr.subjectEmail,
            dsr.exportFormat || 'json'
          );
          break;

        case 'erasure':
          processingResult = await this.deletePersonalData(
            tenantId,
            dsr.subjectEmail,
            dsr.erasureScope || 'all',
            dsr.erasureExclusions
          );
          break;

        default:
          return Result.fail(`DSR type ${dsr.type} not yet implemented`);
      }

      // Update DSR with result
      const auditLog = [...dsr.auditLog, {
        timestamp: new Date(),
        action: 'processed',
        performedBy: userId,
        details: processingResult.success ? 'Request processed successfully' : `Failed: ${processingResult.error}`,
      }];

      const updateQuery = `
        UPDATE data_subject_requests
        SET status = $1,
            completed_at = $2,
            export_url = $3,
            export_expires_at = $4,
            processing_notes = $5,
            audit_log = $6,
            updated_at = NOW()
        WHERE id = $7 AND tenant_id = $8
        RETURNING *
      `;

      const exportResult = processingResult as DataExportResult;
      const updateResult = await this.pool.query(updateQuery, [
        processingResult.success ? 'completed' : 'rejected',
        processingResult.success ? new Date() : null,
        exportResult.downloadUrl || null,
        exportResult.expiresAt || null,
        processingResult.success ? 'Request processed successfully' : processingResult.error,
        JSON.stringify(auditLog),
        id,
        tenantId,
      ]);

      if (updateResult.isFailure || !updateResult.value?.rows?.[0]) {
        return Result.fail('Failed to update DSR status');
      }

      return Result.ok({
        dsr: this.mapRowToDsr(updateResult.value.rows[0]),
        result: processingResult,
      });
    } catch (error) {
      return Result.fail(`Failed to process DSR: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List DSRs for a tenant
   */
  async listDsrs(
    tenantId: string,
    options?: {
      status?: DsrStatus;
      type?: DsrType;
      page?: number;
      limit?: number;
    }
  ): Promise<Result<{ requests: DataSubjectRequest[]; total: number }>> {
    try {
      const page = options?.page || 1;
      const limit = Math.min(options?.limit || 50, 100);
      const offset = (page - 1) * limit;

      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options?.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(options.status);
      }

      if (options?.type) {
        conditions.push(`type = $${paramIndex++}`);
        values.push(options.type);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM data_subject_requests WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);
      const total = parseInt(countResult.value?.rows[0]?.total || '0', 10);

      // Get requests
      const query = `
        SELECT * FROM data_subject_requests
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to list DSRs');
      }

      const requests = result.value.rows.map((row: Record<string, unknown>) =>
        this.mapRowToDsr(row)
      );

      return Result.ok({ requests, total });
    } catch (error) {
      return Result.fail(`Failed to list DSRs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Data Export ====================

  /**
   * Export personal data for a data subject
   */
  async exportPersonalData(
    tenantId: string,
    email: string,
    format: ExportFormat = 'json'
  ): Promise<DataExportResult> {
    try {
      const normalizedEmail = email.toLowerCase();

      // Collect data from all tables
      const [leads, contacts, communications, activities, notes, consents] = await Promise.all([
        this.getLeadsForSubject(tenantId, normalizedEmail),
        this.getContactsForSubject(tenantId, normalizedEmail),
        this.getCommunicationsForSubject(tenantId, normalizedEmail),
        this.getActivitiesForSubject(tenantId, normalizedEmail),
        this.getNotesForSubject(tenantId, normalizedEmail),
        this.getConsentsForSubject(tenantId, normalizedEmail),
      ]);

      const exportData: PersonalDataExport = {
        exportedAt: new Date().toISOString(),
        dataSubject: {
          email: normalizedEmail,
          identifiers: [],
        },
        leads,
        contacts,
        communications,
        activities,
        notes,
        consents: consents.map((c) => ({
          purpose: c.purpose,
          consentBasis: c.consentBasis,
          givenAt: c.consentGivenAt.toISOString(),
          withdrawnAt: c.withdrawnAt?.toISOString(),
          isActive: c.isActive,
        })),
        processingPurposes: [
          'Lead management',
          'Sales communication',
          'Customer relationship management',
        ],
        dataRetention: {
          policy: 'Data retained for business operations and legal compliance',
        },
      };

      // Generate export file (simplified - in production, would upload to S3)
      const exportJson = JSON.stringify(exportData, null, 2);
      const checksum = crypto.createHash('sha256').update(exportJson).digest('hex');

      return {
        success: true,
        format,
        exportedAt: new Date(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        checksum,
        sizeBytes: Buffer.byteLength(exportJson),
        recordCounts: {
          leads: leads?.length || 0,
          contacts: contacts?.length || 0,
          communications: communications?.length || 0,
          activities: activities?.length || 0,
          notes: notes?.length || 0,
          attachments: 0,
          consents: consents?.length || 0,
        },
        data: exportData,
      };
    } catch (error) {
      return {
        success: false,
        format,
        exportedAt: new Date(),
        expiresAt: new Date(),
        recordCounts: {
          leads: 0,
          contacts: 0,
          communications: 0,
          activities: 0,
          notes: 0,
          attachments: 0,
          consents: 0,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== Data Deletion ====================

  /**
   * Delete personal data for a data subject
   */
  async deletePersonalData(
    tenantId: string,
    email: string,
    scope: 'all' | 'specific' = 'all',
    exclusions?: string[]
  ): Promise<DataDeletionResult> {
    try {
      const normalizedEmail = email.toLowerCase();
      const deletedRecords = {
        leads: 0,
        contacts: 0,
        communications: 0,
        activities: 0,
        notes: 0,
        attachments: 0,
        consents: 0,
      };

      // Start transaction
      await this.pool.query('BEGIN', []);

      try {
        // Get lead IDs first
        const leadsQuery = `SELECT id FROM leads WHERE tenant_id = $1 AND email = $2`;
        const leadsResult = await this.pool.query(leadsQuery, [tenantId, normalizedEmail]);
        const leadIds = leadsResult.value?.rows?.map((r: Record<string, unknown>) => r.id as string) || [];

        // Delete in reverse order of dependencies

        // 1. Delete communications
        if (!exclusions?.includes('communications')) {
          const commResult = await this.pool.query(
            `DELETE FROM lead_communications WHERE tenant_id = $1 AND lead_id = ANY($2)`,
            [tenantId, leadIds]
          );
          deletedRecords.communications = commResult.value?.rowCount || 0;
        }

        // 2. Delete notes
        if (!exclusions?.includes('notes')) {
          const notesResult = await this.pool.query(
            `DELETE FROM notes WHERE tenant_id = $1 AND entity_type = 'lead' AND entity_id = ANY($2)`,
            [tenantId, leadIds]
          );
          deletedRecords.notes = notesResult.value?.rowCount || 0;
        }

        // 3. Delete activity logs
        if (!exclusions?.includes('activities')) {
          const actResult = await this.pool.query(
            `DELETE FROM activity_logs WHERE tenant_id = $1 AND entity_type = 'lead' AND entity_id = ANY($2)`,
            [tenantId, leadIds]
          );
          deletedRecords.activities = actResult.value?.rowCount || 0;
        }

        // 4. Delete contacts
        if (!exclusions?.includes('contacts')) {
          const contactsResult = await this.pool.query(
            `DELETE FROM lead_contacts WHERE tenant_id = $1 AND (lead_id = ANY($2) OR email = $3)`,
            [tenantId, leadIds, normalizedEmail]
          );
          deletedRecords.contacts = contactsResult.value?.rowCount || 0;
        }

        // 5. Delete leads
        if (!exclusions?.includes('leads')) {
          const deleteLeadsResult = await this.pool.query(
            `DELETE FROM leads WHERE tenant_id = $1 AND email = $2`,
            [tenantId, normalizedEmail]
          );
          deletedRecords.leads = deleteLeadsResult.value?.rowCount || 0;
        }

        // 6. Update consents (mark as withdrawn, don't delete for audit)
        const consentUpdateResult = await this.pool.query(
          `UPDATE consent_records
           SET is_active = false, withdrawn_at = NOW(), updated_at = NOW()
           WHERE tenant_id = $1 AND email = $2`,
          [tenantId, normalizedEmail]
        );
        deletedRecords.consents = consentUpdateResult.value?.rowCount || 0;

        // Commit transaction
        await this.pool.query('COMMIT', []);

        // Generate deletion certificate
        const certificate = `DEL-${tenantId.substring(0, 8)}-${Date.now()}`;

        return {
          success: true,
          deletedAt: new Date(),
          deletedRecords,
          deletionCertificate: certificate,
        };
      } catch (error) {
        // Rollback on error
        await this.pool.query('ROLLBACK', []);
        throw error;
      }
    } catch (error) {
      return {
        success: false,
        deletedRecords: {
          leads: 0,
          contacts: 0,
          communications: 0,
          activities: 0,
          notes: 0,
          attachments: 0,
          consents: 0,
        },
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // ==================== Consent Management ====================

  /**
   * Record consent
   */
  async recordConsent(
    tenantId: string,
    input: RecordConsentInput
  ): Promise<Result<ConsentRecord>> {
    try {
      const id = uuidv4();
      const verificationToken = this.generateVerificationToken();

      const query = `
        INSERT INTO consent_records (
          id, tenant_id, subject_id, subject_type, email,
          purpose, consent_basis, data_categories, is_active,
          consent_given_at, consent_method, consent_source, consent_version,
          expires_at, ip_address, user_agent, verification_token,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW(), NOW())
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        input.subjectId,
        input.subjectType || 'external',
        input.email.toLowerCase(),
        input.purpose,
        input.consentBasis,
        JSON.stringify(input.dataCategories),
        true,
        new Date(),
        input.consentMethod,
        input.consentSource,
        input.consentVersion,
        input.expiresAt,
        input.ipAddress,
        input.userAgent,
        verificationToken,
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Failed to record consent');
      }

      return Result.ok(this.mapRowToConsent(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to record consent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Withdraw consent
   */
  async withdrawConsent(
    consentId: string,
    tenantId: string,
    withdrawalMethod: string
  ): Promise<Result<ConsentRecord>> {
    try {
      const query = `
        UPDATE consent_records
        SET is_active = false,
            withdrawn_at = NOW(),
            withdrawal_method = $1,
            updated_at = NOW()
        WHERE id = $2 AND tenant_id = $3
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        withdrawalMethod,
        consentId,
        tenantId,
      ]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.fail('Consent not found or already withdrawn');
      }

      return Result.ok(this.mapRowToConsent(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to withdraw consent: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get consents for a subject
   */
  async getConsentsForSubject(
    tenantId: string,
    email: string
  ): Promise<ConsentRecord[]> {
    try {
      const query = `
        SELECT * FROM consent_records
        WHERE tenant_id = $1 AND email = $2
        ORDER BY created_at DESC
      `;

      const result = await this.pool.query(query, [tenantId, email.toLowerCase()]);

      if (result.isFailure || !result.value?.rows) {
        return [];
      }

      return result.value.rows.map((row: Record<string, unknown>) =>
        this.mapRowToConsent(row)
      );
    } catch {
      return [];
    }
  }

  /**
   * List all consent records for tenant
   */
  async listConsents(
    tenantId: string,
    options: { limit?: number; offset?: number; status?: string } = {}
  ): Promise<ConsentRecord[]> {
    try {
      const { limit = 20, offset = 0 } = options;

      let query = `
        SELECT * FROM consent_records
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2 OFFSET $3
      `;
      const params: unknown[] = [tenantId, limit, offset];

      const result = await this.pool.query(query, params);

      if (result.isFailure || !result.value?.rows) {
        return [];
      }

      return result.value.rows.map((row: Record<string, unknown>) =>
        this.mapRowToConsent(row)
      );
    } catch {
      return [];
    }
  }

  /**
   * Check if subject has valid consent for purpose
   */
  async hasValidConsent(
    tenantId: string,
    email: string,
    purpose: string
  ): Promise<boolean> {
    try {
      const query = `
        SELECT COUNT(*) as count FROM consent_records
        WHERE tenant_id = $1
          AND email = $2
          AND purpose = $3
          AND is_active = true
          AND (expires_at IS NULL OR expires_at > NOW())
      `;

      const result = await this.pool.query(query, [tenantId, email.toLowerCase(), purpose]);

      return parseInt(result.value?.rows?.[0]?.count || '0', 10) > 0;
    } catch {
      return false;
    }
  }

  // ==================== Compliance Reports ====================

  /**
   * Get GDPR compliance summary
   */
  async getComplianceSummary(tenantId: string): Promise<Result<GdprComplianceSummary>> {
    try {
      // Get consent stats
      const consentQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE is_active = true AND (expires_at IS NULL OR expires_at > NOW())) as active,
          COUNT(*) FILTER (WHERE withdrawn_at IS NOT NULL) as withdrawn,
          COUNT(*) FILTER (WHERE expires_at IS NOT NULL AND expires_at <= NOW()) as expired
        FROM consent_records
        WHERE tenant_id = $1
      `;
      const consentResult = await this.pool.query(consentQuery, [tenantId]);
      const consentStats = consentResult.value?.rows?.[0] || {};

      // Get DSR stats
      const dsrQuery = `
        SELECT
          COUNT(*) as total,
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'in_progress') as in_progress,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status != 'completed' AND due_date < NOW()) as overdue,
          AVG(EXTRACT(DAY FROM (completed_at - received_at))) FILTER (WHERE completed_at IS NOT NULL) as avg_days
        FROM data_subject_requests
        WHERE tenant_id = $1
      `;
      const dsrResult = await this.pool.query(dsrQuery, [tenantId]);
      const dsrStats = dsrResult.value?.rows?.[0] || {};

      // Get data inventory
      const inventoryQuery = `
        SELECT
          (SELECT COUNT(*) FROM leads WHERE tenant_id = $1) as leads,
          (SELECT COUNT(*) FROM lead_contacts WHERE tenant_id = $1) as contacts,
          (SELECT COUNT(*) FROM lead_communications WHERE tenant_id = $1) as communications
      `;
      const inventoryResult = await this.pool.query(inventoryQuery, [tenantId]);
      const inventory = inventoryResult.value?.rows?.[0] || {};

      return Result.ok({
        tenantId,
        generatedAt: new Date(),
        consents: {
          total: parseInt(consentStats.total || '0', 10),
          active: parseInt(consentStats.active || '0', 10),
          withdrawn: parseInt(consentStats.withdrawn || '0', 10),
          expired: parseInt(consentStats.expired || '0', 10),
          byPurpose: {},
        },
        requests: {
          total: parseInt(dsrStats.total || '0', 10),
          pending: parseInt(dsrStats.pending || '0', 10),
          inProgress: parseInt(dsrStats.in_progress || '0', 10),
          completed: parseInt(dsrStats.completed || '0', 10),
          overdue: parseInt(dsrStats.overdue || '0', 10),
          byType: {} as Record<DsrType, number>,
          averageCompletionDays: parseFloat(dsrStats.avg_days || '0'),
        },
        dataInventory: {
          leads: parseInt(inventory.leads || '0', 10),
          contacts: parseInt(inventory.contacts || '0', 10),
          communications: parseInt(inventory.communications || '0', 10),
          withConsentBasis: 0,
          withoutConsentBasis: 0,
        },
        retention: {
          policiesActive: 0,
          recordsDueForAction: 0,
          recordsExpired: 0,
        },
      });
    } catch (error) {
      return Result.fail(`Failed to get compliance summary: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Helper Methods ====================

  /**
   * Generate verification token
   */
  private generateVerificationToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Get leads for a data subject
   */
  private async getLeadsForSubject(
    tenantId: string,
    email: string
  ): Promise<PersonalDataExport['leads']> {
    try {
      const query = `
        SELECT id, company_name, email, phone, status, source, created_at, custom_fields
        FROM leads
        WHERE tenant_id = $1 AND email = $2
      `;

      const result = await this.pool.query(query, [tenantId, email]);

      return result.value?.rows?.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        companyName: row.company_name as string,
        email: row.email as string,
        phone: row.phone as string | undefined,
        status: row.status as string,
        source: row.source as string,
        createdAt: (row.created_at as Date).toISOString(),
        customFields: row.custom_fields as Record<string, unknown>,
      })) || [];
    } catch {
      return [];
    }
  }

  /**
   * Get contacts for a data subject
   */
  private async getContactsForSubject(
    tenantId: string,
    email: string
  ): Promise<PersonalDataExport['contacts']> {
    try {
      const query = `
        SELECT id, first_name, last_name, email, phone, job_title, created_at
        FROM lead_contacts
        WHERE tenant_id = $1 AND email = $2
      `;

      const result = await this.pool.query(query, [tenantId, email]);

      return result.value?.rows?.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        firstName: row.first_name as string,
        lastName: row.last_name as string,
        email: row.email as string,
        phone: row.phone as string | undefined,
        jobTitle: row.job_title as string | undefined,
        createdAt: (row.created_at as Date).toISOString(),
      })) || [];
    } catch {
      return [];
    }
  }

  /**
   * Get communications for a data subject
   */
  private async getCommunicationsForSubject(
    tenantId: string,
    email: string
  ): Promise<PersonalDataExport['communications']> {
    try {
      // Get lead IDs first
      const leadsQuery = `SELECT id FROM leads WHERE tenant_id = $1 AND email = $2`;
      const leadsResult = await this.pool.query(leadsQuery, [tenantId, email]);
      const leadIds = leadsResult.value?.rows?.map((r: Record<string, unknown>) => r.id as string) || [];

      if (leadIds.length === 0) return [];

      const query = `
        SELECT id, communication_type, direction, subject, occurred_at
        FROM lead_communications
        WHERE tenant_id = $1 AND lead_id = ANY($2)
      `;

      const result = await this.pool.query(query, [tenantId, leadIds]);

      return result.value?.rows?.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        type: row.communication_type as string,
        direction: row.direction as string,
        subject: row.subject as string | undefined,
        occurredAt: (row.occurred_at as Date).toISOString(),
      })) || [];
    } catch {
      return [];
    }
  }

  /**
   * Get activities for a data subject
   */
  private async getActivitiesForSubject(
    tenantId: string,
    email: string
  ): Promise<PersonalDataExport['activities']> {
    try {
      // Get lead IDs first
      const leadsQuery = `SELECT id FROM leads WHERE tenant_id = $1 AND email = $2`;
      const leadsResult = await this.pool.query(leadsQuery, [tenantId, email]);
      const leadIds = leadsResult.value?.rows?.map((r: Record<string, unknown>) => r.id as string) || [];

      if (leadIds.length === 0) return [];

      const query = `
        SELECT id, action, entity_type, created_at
        FROM activity_logs
        WHERE tenant_id = $1 AND entity_type = 'lead' AND entity_id = ANY($2)
      `;

      const result = await this.pool.query(query, [tenantId, leadIds]);

      return result.value?.rows?.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        action: row.action as string,
        entityType: row.entity_type as string,
        timestamp: (row.created_at as Date).toISOString(),
      })) || [];
    } catch {
      return [];
    }
  }

  /**
   * Get notes for a data subject
   */
  private async getNotesForSubject(
    tenantId: string,
    email: string
  ): Promise<PersonalDataExport['notes']> {
    try {
      // Get lead IDs first
      const leadsQuery = `SELECT id FROM leads WHERE tenant_id = $1 AND email = $2`;
      const leadsResult = await this.pool.query(leadsQuery, [tenantId, email]);
      const leadIds = leadsResult.value?.rows?.map((r: Record<string, unknown>) => r.id as string) || [];

      if (leadIds.length === 0) return [];

      const query = `
        SELECT id, content, created_at
        FROM notes
        WHERE tenant_id = $1 AND entity_type = 'lead' AND entity_id = ANY($2)
      `;

      const result = await this.pool.query(query, [tenantId, leadIds]);

      return result.value?.rows?.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        content: row.content as string,
        createdAt: (row.created_at as Date).toISOString(),
      })) || [];
    } catch {
      return [];
    }
  }

  /**
   * Map database row to DSR
   */
  private mapRowToDsr(row: Record<string, unknown>): DataSubjectRequest {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      type: row.type as DsrType,
      status: row.status as DsrStatus,
      priority: row.priority as DataSubjectRequest['priority'],
      subjectEmail: row.subject_email as string,
      subjectName: row.subject_name as string | undefined,
      subjectId: row.subject_id as string | undefined,
      subjectType: row.subject_type as DataSubjectRequest['subjectType'],
      verificationMethod: row.verification_method as DataSubjectRequest['verificationMethod'],
      verificationToken: row.verification_token as string | undefined,
      verifiedAt: row.verified_at ? new Date(row.verified_at as string) : undefined,
      requestSource: row.request_source as DataSubjectRequest['requestSource'],
      requestNotes: row.request_notes as string | undefined,
      assignedTo: row.assigned_to as string | undefined,
      processingNotes: row.processing_notes as string | undefined,
      dataLocations: row.data_locations as string[] | undefined,
      erasureScope: row.erasure_scope as DataSubjectRequest['erasureScope'],
      erasureExclusions: row.erasure_exclusions as string[] | undefined,
      exportFormat: row.export_format as ExportFormat | undefined,
      exportUrl: row.export_url as string | undefined,
      exportExpiresAt: row.export_expires_at ? new Date(row.export_expires_at as string) : undefined,
      responseNotes: row.response_notes as string | undefined,
      rejectionReason: row.rejection_reason as string | undefined,
      receivedAt: new Date(row.received_at as string),
      acknowledgedAt: row.acknowledged_at ? new Date(row.acknowledged_at as string) : undefined,
      dueDate: new Date(row.due_date as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      auditLog: typeof row.audit_log === 'string'
        ? JSON.parse(row.audit_log)
        : (row.audit_log as DsrAuditEntry[] || []),
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Map database row to Consent
   */
  private mapRowToConsent(row: Record<string, unknown>): ConsentRecord {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      subjectId: row.subject_id as string,
      subjectType: row.subject_type as ConsentRecord['subjectType'],
      email: row.email as string,
      purpose: row.purpose as string,
      consentBasis: row.consent_basis as ConsentRecord['consentBasis'],
      dataCategories: typeof row.data_categories === 'string'
        ? JSON.parse(row.data_categories)
        : (row.data_categories as ConsentRecord['dataCategories'] || []),
      isActive: row.is_active as boolean,
      consentGivenAt: new Date(row.consent_given_at as string),
      consentMethod: row.consent_method as ConsentRecord['consentMethod'],
      consentSource: row.consent_source as string,
      consentVersion: row.consent_version as string,
      withdrawnAt: row.withdrawn_at ? new Date(row.withdrawn_at as string) : undefined,
      withdrawalMethod: row.withdrawal_method as string | undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
      ipAddress: row.ip_address as string | undefined,
      userAgent: row.user_agent as string | undefined,
      verificationToken: row.verification_token as string | undefined,
      verifiedAt: row.verified_at ? new Date(row.verified_at as string) : undefined,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }
}

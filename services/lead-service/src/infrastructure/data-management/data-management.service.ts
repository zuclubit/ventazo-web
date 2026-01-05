/**
 * Data Management Service
 * Handles data export, import, and storage management
 *
 * @module infrastructure/data-management/data-management.service
 */

import { injectable, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';

import { DatabasePool } from '@zuclubit/database';
import { Result } from '../../shared/domain/result';
import {
  ExportJob,
  ExportJobRequest,
  ExportJobResponse,
  ExportHistoryItem,
  ImportJob,
  ImportJobRequest,
  ImportJobResponse,
  ImportValidationResult,
  StorageStats,
  DeleteDataRequest,
  DeleteDataResponse,
  ExportStatus,
  ImportStatus,
  ExportEntity,
} from './types';

// ============================================
// Constants
// ============================================

const EXPORT_EXPIRY_HOURS = 24;
const MAX_EXPORT_HISTORY = 50;

// ============================================
// Data Management Service
// ============================================

@injectable()
export class DataManagementService {
  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {}

  // ============================================
  // Export Operations
  // ============================================

  /**
   * Create a new data export job
   */
  async createExportJob(
    tenantId: string,
    userId: string,
    request: ExportJobRequest
  ): Promise<Result<ExportJobResponse>> {
    try {
      const id = uuidv4();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + EXPORT_EXPIRY_HOURS * 60 * 60 * 1000);

      const sql = `
        INSERT INTO data_export_jobs (
          id, tenant_id, user_id, entities, format, status, progress,
          date_range_from, date_range_to, filters, created_at, expires_at
        ) VALUES ($1, $2, $3, $4, $5, 'queued', 0, $6, $7, $8, $9, $10)
        RETURNING *
      `;

      const result = await this.pool.query(sql, [
        id,
        tenantId,
        userId,
        request.entities,
        request.format,
        request.dateRange?.from || null,
        request.dateRange?.to || null,
        request.filters ? JSON.stringify(request.filters) : null,
        now,
        expiresAt,
      ]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      // Queue the export job for background processing
      await this.queueExportJob(id);

      const job = this.mapRowToExportJob(result.getValue().rows[0]);
      return Result.ok(this.mapExportJobToResponse(job));
    } catch (error) {
      return Result.fail(`Failed to create export job: ${error}`);
    }
  }

  /**
   * Get export job status
   */
  async getExportJob(
    jobId: string,
    tenantId: string
  ): Promise<Result<ExportJobResponse>> {
    try {
      const sql = `
        SELECT * FROM data_export_jobs
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(sql, [jobId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      if (result.getValue().rows.length === 0) {
        return Result.fail('Export job not found');
      }

      const job = this.mapRowToExportJob(result.getValue().rows[0]);
      return Result.ok(this.mapExportJobToResponse(job));
    } catch (error) {
      return Result.fail(`Failed to get export job: ${error}`);
    }
  }

  /**
   * Get export job history for tenant
   */
  async getExportHistory(
    tenantId: string,
    limit: number = MAX_EXPORT_HISTORY
  ): Promise<Result<ExportHistoryItem[]>> {
    try {
      const sql = `
        SELECT id, entities, format, status, file_size, file_url, expires_at, created_at, completed_at
        FROM data_export_jobs
        WHERE tenant_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;

      const result = await this.pool.query(sql, [tenantId, limit]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      const history: ExportHistoryItem[] = result.getValue().rows.map((row: Record<string, unknown>) => ({
        id: row.id as string,
        entities: row.entities as ExportEntity[],
        format: row.format as ExportJobResponse['format'],
        status: row.status as ExportStatus,
        fileSize: row.file_size as number | undefined,
        downloadUrl: row.file_url as string | undefined,
        expiresAt: (row.expires_at as Date)?.toISOString(),
        createdAt: (row.created_at as Date).toISOString(),
        completedAt: (row.completed_at as Date)?.toISOString(),
      }));

      return Result.ok(history);
    } catch (error) {
      return Result.fail(`Failed to get export history: ${error}`);
    }
  }

  /**
   * Cancel an export job
   */
  async cancelExportJob(
    jobId: string,
    tenantId: string
  ): Promise<Result<void>> {
    try {
      const sql = `
        UPDATE data_export_jobs
        SET status = 'failed', error_message = 'Cancelled by user'
        WHERE id = $1 AND tenant_id = $2 AND status IN ('queued', 'processing')
      `;

      const result = await this.pool.query(sql, [jobId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      if (result.getValue().rowCount === 0) {
        return Result.fail('Export job not found or cannot be cancelled');
      }

      return Result.ok();
    } catch (error) {
      return Result.fail(`Failed to cancel export job: ${error}`);
    }
  }

  // ============================================
  // Import Operations
  // ============================================

  /**
   * Create a new data import job
   */
  async createImportJob(
    tenantId: string,
    userId: string,
    request: ImportJobRequest,
    fileData: Buffer,
    fileName: string
  ): Promise<Result<ImportJobResponse>> {
    try {
      const id = uuidv4();

      // Validate the import file first
      const validationResult = await this.validateImportFile(fileData, fileName, request.entityType);

      if (request.validateOnly) {
        return Result.ok({
          id: '',
          status: 'validating',
          progress: 100,
          totalRecords: validationResult.totalRecords,
          processedRecords: 0,
          successCount: validationResult.validRecords,
          errorCount: validationResult.errors.length,
          errors: validationResult.errors,
          createdAt: new Date().toISOString(),
        });
      }

      const sql = `
        INSERT INTO data_import_jobs (
          id, tenant_id, user_id, entity_type, mode, status, progress,
          total_records, processed_records, success_count, error_count,
          mapping, file_name, created_at
        ) VALUES ($1, $2, $3, $4, $5, 'queued', 0, $6, 0, 0, 0, $7, $8, NOW())
        RETURNING *
      `;

      const result = await this.pool.query(sql, [
        id,
        tenantId,
        userId,
        request.entityType,
        request.mode,
        validationResult.totalRecords,
        request.mapping ? JSON.stringify(request.mapping) : null,
        fileName,
      ]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      // Queue the import job for background processing
      await this.queueImportJob(id, fileData);

      const job = this.mapRowToImportJob(result.getValue().rows[0]);
      return Result.ok(this.mapImportJobToResponse(job));
    } catch (error) {
      return Result.fail(`Failed to create import job: ${error}`);
    }
  }

  /**
   * Get import job status
   */
  async getImportJob(
    jobId: string,
    tenantId: string
  ): Promise<Result<ImportJobResponse>> {
    try {
      const sql = `
        SELECT * FROM data_import_jobs
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(sql, [jobId, tenantId]);

      if (result.isFailure) {
        return Result.fail(result.getError());
      }

      if (result.getValue().rows.length === 0) {
        return Result.fail('Import job not found');
      }

      const job = this.mapRowToImportJob(result.getValue().rows[0]);
      return Result.ok(this.mapImportJobToResponse(job));
    } catch (error) {
      return Result.fail(`Failed to get import job: ${error}`);
    }
  }

  // ============================================
  // Storage Operations
  // ============================================

  /**
   * Get storage statistics for tenant
   */
  async getStorageStats(tenantId: string): Promise<Result<StorageStats>> {
    try {
      // Get document storage
      const docResult = await this.pool.query(
        `SELECT COALESCE(SUM(file_size), 0) as total FROM documents WHERE tenant_id = $1`,
        [tenantId]
      );

      // Get attachment storage
      const attachResult = await this.pool.query(
        `SELECT COALESCE(SUM(file_size), 0) as total FROM attachments WHERE tenant_id = $1`,
        [tenantId]
      );

      // Get export storage
      const exportResult = await this.pool.query(
        `SELECT COALESCE(SUM(file_size), 0) as total FROM data_export_jobs WHERE tenant_id = $1 AND status = 'completed'`,
        [tenantId]
      );

      const documents = parseInt(docResult.getValue()?.rows[0]?.total || '0', 10);
      const attachments = parseInt(attachResult.getValue()?.rows[0]?.total || '0', 10);
      const exports = parseInt(exportResult.getValue()?.rows[0]?.total || '0', 10);
      const totalUsed = documents + attachments + exports;

      // Get tenant quota (default 10GB)
      const tenantResult = await this.pool.query(
        `SELECT metadata->>'storageQuota' as quota FROM tenants WHERE id = $1`,
        [tenantId]
      );
      const totalQuota = parseInt(tenantResult.getValue()?.rows[0]?.quota || '10737418240', 10); // 10GB default

      return Result.ok({
        totalUsed,
        totalQuota,
        usagePercentage: Math.round((totalUsed / totalQuota) * 100),
        breakdown: {
          documents,
          attachments,
          exports,
          other: 0,
        },
        lastUpdated: new Date().toISOString(),
      });
    } catch (error) {
      return Result.fail(`Failed to get storage stats: ${error}`);
    }
  }

  // ============================================
  // Data Deletion Operations
  // ============================================

  /**
   * Delete tenant data (DANGEROUS - Owner only)
   */
  async deleteAllData(
    tenantId: string,
    userId: string,
    request: DeleteDataRequest
  ): Promise<Result<DeleteDataResponse>> {
    try {
      // Verify tenant name matches confirmation
      const tenantResult = await this.pool.query(
        `SELECT name FROM tenants WHERE id = $1`,
        [tenantId]
      );

      if (tenantResult.isFailure || tenantResult.getValue().rows.length === 0) {
        return Result.fail('Tenant not found');
      }

      const tenantName = tenantResult.getValue().rows[0].name;
      if (request.confirmation !== tenantName) {
        return Result.fail('Confirmation does not match tenant name');
      }

      const deletedCounts: Record<string, number> = {};
      const entities = request.entities || ['leads', 'customers', 'opportunities', 'tasks', 'contacts'];

      // Delete data based on scope
      for (const entity of entities) {
        let tableName = '';
        switch (entity) {
          case 'leads':
            tableName = 'leads';
            break;
          case 'customers':
            tableName = 'customers';
            break;
          case 'opportunities':
            tableName = 'opportunities';
            break;
          case 'tasks':
            tableName = 'tasks';
            break;
          case 'contacts':
            tableName = 'lead_contacts';
            break;
          default:
            continue;
        }

        let deleteResult;
        if (request.scope === 'soft') {
          deleteResult = await this.pool.query(
            `UPDATE ${tableName} SET deleted_at = NOW() WHERE tenant_id = $1 AND deleted_at IS NULL`,
            [tenantId]
          );
        } else {
          deleteResult = await this.pool.query(
            `DELETE FROM ${tableName} WHERE tenant_id = $1`,
            [tenantId]
          );
        }

        deletedCounts[entity] = deleteResult.getValue()?.rowCount || 0;
      }

      // Log the deletion
      await this.pool.query(
        `INSERT INTO activity_logs (tenant_id, user_id, entity_type, entity_id, action, changes, created_at)
         VALUES ($1, $2, 'tenant', $1, 'bulk_delete', $3, NOW())`,
        [tenantId, userId, JSON.stringify({ deletedCounts, scope: request.scope })]
      );

      return Result.ok({
        success: true,
        deletedCounts,
        message: `Successfully deleted data from ${Object.keys(deletedCounts).join(', ')}`,
      });
    } catch (error) {
      return Result.fail(`Failed to delete data: ${error}`);
    }
  }

  // ============================================
  // Private Helper Methods
  // ============================================

  private async queueExportJob(_jobId: string): Promise<void> {
    // In production, this would queue to BullMQ or similar
    // For now, we'll process synchronously in background
    console.log(`Export job ${_jobId} queued for processing`);
  }

  private async queueImportJob(_jobId: string, _fileData: Buffer): Promise<void> {
    // In production, this would queue to BullMQ or similar
    console.log(`Import job ${_jobId} queued for processing`);
  }

  private async validateImportFile(
    _fileData: Buffer,
    fileName: string,
    _entityType: ExportEntity
  ): Promise<ImportValidationResult> {
    // Basic validation - in production, this would parse and validate the file
    const extension = fileName.split('.').pop()?.toLowerCase();
    const supportedFormats = ['json', 'csv', 'xlsx'];

    if (!extension || !supportedFormats.includes(extension)) {
      return {
        isValid: false,
        totalRecords: 0,
        validRecords: 0,
        errors: [{ row: 0, field: 'file', message: `Unsupported file format: ${extension}` }],
        warnings: [],
      };
    }

    // Mock validation result
    return {
      isValid: true,
      totalRecords: 100,
      validRecords: 100,
      errors: [],
      warnings: [],
    };
  }

  private mapRowToExportJob(row: Record<string, unknown>): ExportJob {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      entities: row.entities as ExportEntity[],
      format: row.format as ExportJob['format'],
      status: row.status as ExportStatus,
      progress: row.progress as number,
      fileUrl: row.file_url as string | undefined,
      fileSize: row.file_size as number | undefined,
      errorMessage: row.error_message as string | undefined,
      startedAt: row.started_at as Date | undefined,
      completedAt: row.completed_at as Date | undefined,
      expiresAt: row.expires_at as Date | undefined,
      createdAt: row.created_at as Date,
    };
  }

  private mapExportJobToResponse(job: ExportJob): ExportJobResponse {
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      downloadUrl: job.fileUrl,
      expiresAt: job.expiresAt?.toISOString(),
      error: job.errorMessage,
      entities: job.entities,
      format: job.format,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    };
  }

  private mapRowToImportJob(row: Record<string, unknown>): ImportJob {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      entityType: row.entity_type as ExportEntity,
      mode: row.mode as ImportJob['mode'],
      status: row.status as ImportStatus,
      progress: row.progress as number,
      totalRecords: row.total_records as number,
      processedRecords: row.processed_records as number,
      successCount: row.success_count as number,
      errorCount: row.error_count as number,
      errors: row.errors ? JSON.parse(row.errors as string) : undefined,
      mapping: row.mapping ? JSON.parse(row.mapping as string) : undefined,
      startedAt: row.started_at as Date | undefined,
      completedAt: row.completed_at as Date | undefined,
      createdAt: row.created_at as Date,
    };
  }

  private mapImportJobToResponse(job: ImportJob): ImportJobResponse {
    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      totalRecords: job.totalRecords,
      processedRecords: job.processedRecords,
      successCount: job.successCount,
      errorCount: job.errorCount,
      errors: job.errors,
      createdAt: job.createdAt.toISOString(),
      completedAt: job.completedAt?.toISOString(),
    };
  }
}

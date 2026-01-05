/**
 * Import/Export Service
 * Handles bulk import and export of leads in various formats
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import {
  ImportConfig,
  ImportFormat,
  ImportJob,
  ImportJobStatus,
  ImportResult,
  ImportError,
  ImportRowResult,
  ExportConfig,
  ExportFormat,
  ExportJob,
  ExportJobStatus,
  ExportFilters,
  DEFAULT_EXPORT_FIELDS,
  COMMON_FIELD_MAPPINGS,
  ColumnMapping,
} from './types';
import { ILeadRepository } from '../../domain/repositories';
import { Lead } from '../../domain/aggregates';

@injectable()
export class ImportExportService {
  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool,
    @inject('ILeadRepository') private readonly leadRepository: ILeadRepository
  ) {}

  // ==========================================
  // Import Methods
  // ==========================================

  /**
   * Create a new import job
   */
  async createImportJob(
    tenantId: string,
    config: ImportConfig,
    fileName: string,
    fileSize: number,
    createdBy: string
  ): Promise<Result<ImportJob>> {
    const job: ImportJob = {
      id: uuidv4(),
      tenantId,
      status: ImportJobStatus.PENDING,
      config,
      fileName,
      fileSize,
      totalRows: 0,
      processedRows: 0,
      successCount: 0,
      failureCount: 0,
      duplicateCount: 0,
      errors: [],
      createdBy,
      createdAt: new Date(),
    };

    // In production, this would be persisted to database
    // For now, return the job object
    return Result.ok(job);
  }

  /**
   * Parse CSV data into rows
   */
  parseCsv(
    data: string,
    options?: { delimiter?: string; skipFirstRow?: boolean }
  ): string[][] {
    const delimiter = options?.delimiter || ',';
    const lines = data.split('\n').filter(line => line.trim().length > 0);

    const rows: string[][] = [];
    let startIndex = options?.skipFirstRow ? 1 : 0;

    for (let i = startIndex; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i], delimiter);
      rows.push(row);
    }

    return rows;
  }

  /**
   * Parse a single CSV line handling quotes
   */
  private parseCSVLine(line: string, delimiter: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === delimiter && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    result.push(current.trim());
    return result;
  }

  /**
   * Parse JSON data into lead objects
   */
  parseJson(data: string): Record<string, unknown>[] {
    const parsed = JSON.parse(data);
    return Array.isArray(parsed) ? parsed : [parsed];
  }

  /**
   * Get header row from CSV
   */
  getHeaders(data: string, delimiter: string = ','): string[] {
    const lines = data.split('\n');
    if (lines.length === 0) return [];
    return this.parseCSVLine(lines[0], delimiter);
  }

  /**
   * Auto-detect column mappings based on header names
   */
  autoDetectMappings(headers: string[]): ColumnMapping[] {
    const mappings: ColumnMapping[] = [];
    const normalizedHeaders = headers.map(h => h.toLowerCase().trim());

    for (const [targetField, sourceNames] of Object.entries(COMMON_FIELD_MAPPINGS)) {
      for (let i = 0; i < normalizedHeaders.length; i++) {
        if (sourceNames.includes(normalizedHeaders[i])) {
          mappings.push({
            sourceColumn: headers[i],
            targetField,
            required: targetField === 'companyName' || targetField === 'email',
          });
          break;
        }
      }
    }

    return mappings;
  }

  /**
   * Process import job
   */
  async processImport(
    tenantId: string,
    data: string,
    config: ImportConfig,
    createdBy: string
  ): Promise<Result<ImportResult>> {
    const startTime = Date.now();
    const jobId = uuidv4();
    const results: ImportRowResult[] = [];
    const leadIds: string[] = [];
    const errors: ImportError[] = [];
    let successCount = 0;
    let failureCount = 0;
    let duplicateCount = 0;

    try {
      // Parse data based on format
      let rows: Record<string, string>[];

      if (config.format === ImportFormat.CSV) {
        const headers = this.getHeaders(data, ',');
        const dataRows = this.parseCsv(data, {
          skipFirstRow: config.skipFirstRow !== false,
          delimiter: ',',
        });

        rows = dataRows.map(row => {
          const obj: Record<string, string> = {};
          headers.forEach((header, index) => {
            obj[header] = row[index] || '';
          });
          return obj;
        });
      } else if (config.format === ImportFormat.JSON) {
        rows = this.parseJson(data) as Record<string, string>[];
      } else {
        return Result.fail(`Unsupported import format: ${config.format}`);
      }

      // Build existing records set for duplicate check
      const existingEmails = new Set<string>();
      const existingCompanies = new Set<string>();

      if (config.skipDuplicates) {
        const existingResult = await this.leadRepository.findAll({
          tenantId,
          page: 1,
          limit: 50000,
        });

        if (existingResult.isSuccess && existingResult.getValue()) {
          const existing = existingResult.getValue()!;
          for (const lead of existing.items) {
            existingEmails.add(lead.getEmail().value.toLowerCase());
            existingCompanies.add(lead.getCompanyName().toLowerCase());
          }
        }
      }

      // Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowNumber = config.skipFirstRow !== false ? i + 2 : i + 1;

        try {
          // Map columns to lead data
          const leadData = this.mapRowToLeadData(row, config.columnMappings);

          // Apply defaults
          if (!leadData.source && config.defaultSource) {
            leadData.source = config.defaultSource;
          }
          if (!leadData.ownerId && config.defaultOwnerId) {
            leadData.ownerId = config.defaultOwnerId;
          }

          // Validate required fields
          const validationErrors = this.validateLeadData(leadData, rowNumber);
          if (validationErrors.length > 0) {
            failureCount++;
            errors.push(...validationErrors);
            results.push({
              row: rowNumber,
              success: false,
              errors: validationErrors,
            });
            continue;
          }

          // Check duplicates
          if (config.skipDuplicates) {
            const checkFields = config.duplicateCheckFields || ['email'];
            let isDuplicate = false;

            if (checkFields.includes('email') && leadData.email) {
              const normalizedEmail = leadData.email.toLowerCase();
              if (existingEmails.has(normalizedEmail)) {
                isDuplicate = true;
              }
            }

            if (checkFields.includes('companyName') && leadData.companyName) {
              const normalizedCompany = leadData.companyName.toLowerCase();
              if (existingCompanies.has(normalizedCompany)) {
                isDuplicate = true;
              }
            }

            if (isDuplicate) {
              duplicateCount++;
              results.push({
                row: rowNumber,
                success: false,
                isDuplicate: true,
              });
              continue;
            }
          }

          // Skip actual creation in dry run mode
          if (config.dryRun) {
            successCount++;
            results.push({
              row: rowNumber,
              success: true,
            });
            continue;
          }

          // Create lead
          const leadResult = Lead.create({
            tenantId,
            companyName: leadData.companyName!,
            email: leadData.email!,
            source: leadData.source || 'import',
            phone: leadData.phone,
            website: leadData.website,
            industry: leadData.industry,
            employeeCount: leadData.employeeCount ? parseInt(leadData.employeeCount, 10) : undefined,
            annualRevenue: leadData.annualRevenue ? parseFloat(leadData.annualRevenue) : undefined,
            notes: leadData.notes,
            ownerId: leadData.ownerId,
          });

          if (leadResult.isFailure) {
            failureCount++;
            errors.push({
              row: rowNumber,
              message: leadResult.error || 'Failed to create lead',
            });
            results.push({
              row: rowNumber,
              success: false,
              errors: [{ row: rowNumber, message: leadResult.error || 'Failed to create lead' }],
            });
            continue;
          }

          const lead = leadResult.getValue();

          // Save lead
          const saveResult = await this.leadRepository.save(lead);

          if (saveResult.isFailure) {
            failureCount++;
            errors.push({
              row: rowNumber,
              message: saveResult.error || 'Failed to save lead',
            });
            results.push({
              row: rowNumber,
              success: false,
              errors: [{ row: rowNumber, message: saveResult.error || 'Failed to save lead' }],
            });
            continue;
          }

          successCount++;
          leadIds.push(lead.id);
          results.push({
            row: rowNumber,
            success: true,
            leadId: lead.id,
          });

          // Update duplicate check sets
          if (config.skipDuplicates && leadData.email) {
            existingEmails.add(leadData.email.toLowerCase());
          }
          if (config.skipDuplicates && leadData.companyName) {
            existingCompanies.add(leadData.companyName.toLowerCase());
          }
        } catch (error) {
          failureCount++;
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          errors.push({
            row: rowNumber,
            message: errorMessage,
          });
          results.push({
            row: rowNumber,
            success: false,
            errors: [{ row: rowNumber, message: errorMessage }],
          });
        }
      }

      const duration = Date.now() - startTime;

      return Result.ok({
        jobId,
        status: ImportJobStatus.COMPLETED,
        totalRows: rows.length,
        processedRows: rows.length,
        successCount,
        failureCount,
        duplicateCount,
        errors,
        leadIds,
        duration,
      });
    } catch (error) {
      return Result.fail(
        `Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Map a row of data to lead fields using column mappings
   */
  private mapRowToLeadData(
    row: Record<string, string>,
    mappings: ColumnMapping[]
  ): Record<string, string | undefined> {
    const leadData: Record<string, string | undefined> = {};

    for (const mapping of mappings) {
      let value = row[mapping.sourceColumn];

      // Apply transforms
      if (value && mapping.transform) {
        switch (mapping.transform) {
          case 'lowercase':
            value = value.toLowerCase();
            break;
          case 'uppercase':
            value = value.toUpperCase();
            break;
          case 'trim':
            value = value.trim();
            break;
          case 'phone':
            value = this.normalizePhone(value);
            break;
          case 'email':
            value = value.toLowerCase().trim();
            break;
        }
      }

      // Apply default if empty
      if (!value && mapping.defaultValue) {
        value = mapping.defaultValue;
      }

      if (value) {
        leadData[mapping.targetField] = value;
      }
    }

    return leadData;
  }

  /**
   * Validate lead data
   */
  private validateLeadData(
    data: Record<string, string | undefined>,
    rowNumber: number
  ): ImportError[] {
    const errors: ImportError[] = [];

    if (!data.companyName || data.companyName.trim().length === 0) {
      errors.push({
        row: rowNumber,
        field: 'companyName',
        message: 'Company name is required',
      });
    }

    if (!data.email) {
      errors.push({
        row: rowNumber,
        field: 'email',
        message: 'Email is required',
      });
    } else if (!this.isValidEmail(data.email)) {
      errors.push({
        row: rowNumber,
        field: 'email',
        value: data.email,
        message: 'Invalid email format',
      });
    }

    if (data.website && !this.isValidUrl(data.website)) {
      errors.push({
        row: rowNumber,
        field: 'website',
        value: data.website,
        message: 'Invalid website URL',
      });
    }

    return errors;
  }

  // ==========================================
  // Export Methods
  // ==========================================

  /**
   * Create export job
   */
  async createExportJob(
    tenantId: string,
    config: ExportConfig,
    createdBy: string
  ): Promise<Result<ExportJob>> {
    const job: ExportJob = {
      id: uuidv4(),
      tenantId,
      status: ExportJobStatus.PENDING,
      config,
      totalRecords: 0,
      exportedRecords: 0,
      createdBy,
      createdAt: new Date(),
    };

    return Result.ok(job);
  }

  /**
   * Export leads to specified format
   */
  async exportLeads(
    tenantId: string,
    config: ExportConfig
  ): Promise<Result<{ data: string; recordCount: number; format: ExportFormat }>> {
    try {
      // Build filters for query
      const queryFilters: Record<string, unknown> = {};

      if (config.filters) {
        if (config.filters.status?.length) {
          queryFilters.status = config.filters.status;
        }
        if (config.filters.source?.length) {
          queryFilters.source = config.filters.source;
        }
        if (config.filters.ownerId?.length) {
          queryFilters.ownerId = config.filters.ownerId;
        }
        if (config.filters.industry?.length) {
          queryFilters.industry = config.filters.industry;
        }
        if (config.filters.scoreMin !== undefined) {
          queryFilters.scoreMin = config.filters.scoreMin;
        }
        if (config.filters.scoreMax !== undefined) {
          queryFilters.scoreMax = config.filters.scoreMax;
        }
      }

      // Fetch all leads matching filters
      const leadsResult = await this.leadRepository.findAll({
        tenantId,
        page: 1,
        limit: 100000, // Large limit for export
        ...queryFilters,
      });

      if (leadsResult.isFailure) {
        return Result.fail(`Failed to fetch leads: ${leadsResult.error}`);
      }

      const { items: leads } = leadsResult.getValue()!;

      // Convert leads to exportable format
      const fields = config.fields || DEFAULT_EXPORT_FIELDS.map(f => f.field);
      const exportData = leads.map(lead => this.leadToExportRow(lead, fields, config.includeCustomFields));

      // Format output
      let output: string;

      switch (config.format) {
        case ExportFormat.CSV:
          output = this.toCsv(exportData, fields, config.delimiter);
          break;
        case ExportFormat.JSON:
          output = JSON.stringify(exportData, null, 2);
          break;
        default:
          return Result.fail(`Unsupported export format: ${config.format}`);
      }

      return Result.ok({
        data: output,
        recordCount: leads.length,
        format: config.format,
      });
    } catch (error) {
      return Result.fail(
        `Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }

  /**
   * Convert lead to export row
   */
  private leadToExportRow(
    lead: Lead,
    fields: string[],
    includeCustomFields?: boolean
  ): Record<string, unknown> {
    const row: Record<string, unknown> = {};

    for (const field of fields) {
      switch (field) {
        case 'id':
          row.id = lead.id;
          break;
        case 'companyName':
          row.companyName = lead.getCompanyName();
          break;
        case 'email':
          row.email = lead.getEmail().value;
          break;
        case 'phone':
          row.phone = lead.getPhone();
          break;
        case 'website':
          row.website = lead.getWebsite();
          break;
        case 'industry':
          row.industry = lead.getIndustry();
          break;
        case 'employeeCount':
          row.employeeCount = lead.getEmployeeCount();
          break;
        case 'annualRevenue':
          row.annualRevenue = lead.getAnnualRevenue();
          break;
        case 'status':
          row.status = lead.getStatus().value;
          break;
        case 'score':
          row.score = lead.getScore().value;
          break;
        case 'source':
          row.source = lead.getSource();
          break;
        case 'ownerId':
          row.ownerId = lead.getOwnerId();
          break;
        case 'notes':
          row.notes = lead.getNotes();
          break;
        case 'createdAt':
          row.createdAt = lead.createdAt.toISOString();
          break;
        case 'updatedAt':
          row.updatedAt = lead.getUpdatedAt().toISOString();
          break;
        case 'lastActivityAt':
          row.lastActivityAt = lead.getLastActivityAt()?.toISOString();
          break;
        case 'nextFollowUpAt':
          row.nextFollowUpAt = lead.getNextFollowUpAt()?.toISOString();
          break;
      }
    }

    if (includeCustomFields) {
      row.customFields = lead.getCustomFields();
    }

    return row;
  }

  /**
   * Convert data to CSV format
   */
  private toCsv(
    data: Record<string, unknown>[],
    fields: string[],
    delimiter: string = ','
  ): string {
    if (data.length === 0) {
      return fields.join(delimiter);
    }

    // Header row
    const headers = fields.map(f => this.escapeCsvField(f, delimiter));
    const rows = [headers.join(delimiter)];

    // Data rows
    for (const row of data) {
      const values = fields.map(field => {
        const value = row[field];
        if (value === null || value === undefined) {
          return '';
        }
        if (typeof value === 'object') {
          return this.escapeCsvField(JSON.stringify(value), delimiter);
        }
        return this.escapeCsvField(String(value), delimiter);
      });
      rows.push(values.join(delimiter));
    }

    return rows.join('\n');
  }

  /**
   * Escape CSV field value
   */
  private escapeCsvField(value: string, delimiter: string): string {
    if (value.includes(delimiter) || value.includes('"') || value.includes('\n')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }

  // ==========================================
  // Helper Methods
  // ==========================================

  /**
   * Normalize phone number
   */
  private normalizePhone(phone: string): string {
    return phone.replace(/[\s\-\(\)\.]/g, '');
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate URL format
   */
  private isValidUrl(url: string): boolean {
    try {
      new URL(url.startsWith('http') ? url : `https://${url}`);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get import template (CSV with headers)
   */
  getImportTemplate(): string {
    const headers = [
      'company_name',
      'email',
      'phone',
      'website',
      'industry',
      'source',
      'employee_count',
      'annual_revenue',
      'notes',
    ];
    return headers.join(',') + '\n';
  }

  /**
   * Get sample import data
   */
  getSampleImportData(): string {
    const headers = [
      'company_name',
      'email',
      'phone',
      'website',
      'industry',
      'source',
      'employee_count',
      'annual_revenue',
      'notes',
    ];

    const sampleRows = [
      ['Acme Corp', 'contact@acme.com', '+1-555-0100', 'https://acme.com', 'Technology', 'website', '50', '1000000', 'Key account'],
      ['Beta Industries', 'info@beta.io', '+1-555-0200', 'https://beta.io', 'Manufacturing', 'referral', '200', '5000000', ''],
      ['Gamma Solutions', 'sales@gamma.net', '+1-555-0300', 'https://gamma.net', 'Consulting', 'linkedin', '25', '500000', 'Follow up Q2'],
    ];

    const csv = [headers.join(',')];
    for (const row of sampleRows) {
      csv.push(row.map(v => this.escapeCsvField(v, ',')).join(','));
    }

    return csv.join('\n');
  }
}

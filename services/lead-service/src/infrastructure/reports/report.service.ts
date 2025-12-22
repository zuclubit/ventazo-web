/**
 * Report Export Service
 * Generates reports in PDF, Excel, CSV formats
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import {
  ReportFormat,
  ReportType,
  ReportStatus,
  GenerateReportInput,
  ReportJob,
  ReportData,
  ExportResult,
  ReportColumn,
  LeadReportOptions,
} from './types';

/**
 * Report Export Service
 */
@injectable()
export class ReportService {
  constructor(
    @inject('DatabasePool') private readonly pool: DatabasePool
  ) {}

  // ==================== Report Generation ====================

  /**
   * Generate a report
   */
  async generateReport(
    tenantId: string,
    input: GenerateReportInput,
    userId?: string
  ): Promise<Result<ExportResult>> {
    try {
      // Create report job
      const jobId = uuidv4();
      await this.createReportJob(jobId, tenantId, input, userId);

      // Generate report data based on type
      let reportData: ReportData;
      switch (input.type) {
        case 'leads':
          reportData = await this.generateLeadReportData(
            tenantId,
            input.options as LeadReportOptions
          );
          break;
        case 'pipeline':
          reportData = await this.generatePipelineReportData(tenantId, input.options as Record<string, unknown> | undefined);
          break;
        case 'activity':
          reportData = await this.generateActivityReportData(tenantId, input.options as Record<string, unknown> | undefined);
          break;
        default:
          return Result.fail(`Report type ${input.type} not yet implemented`);
      }

      reportData.title = input.title || this.getDefaultTitle(input.type);

      // Generate file based on format
      let exportResult: ExportResult;
      switch (input.format) {
        case 'csv':
          exportResult = await this.exportToCsv(reportData);
          break;
        case 'json':
          exportResult = await this.exportToJson(reportData);
          break;
        case 'excel':
          exportResult = await this.exportToExcel(reportData);
          break;
        case 'pdf':
          exportResult = await this.exportToPdf(reportData);
          break;
        default:
          return Result.fail(`Export format ${input.format} not supported`);
      }

      // Update job status
      await this.updateReportJob(jobId, exportResult);

      exportResult.jobId = jobId;

      return Result.ok(exportResult);
    } catch (error) {
      return Result.fail(`Failed to generate report: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get report job by ID
   */
  async getReportJob(
    jobId: string,
    tenantId: string
  ): Promise<Result<ReportJob | null>> {
    try {
      const query = `
        SELECT * FROM report_jobs
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [jobId, tenantId]);

      if (result.isFailure || !result.value?.rows?.[0]) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToJob(result.value.rows[0]));
    } catch (error) {
      return Result.fail(`Failed to get report job: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * List report jobs
   */
  async listReportJobs(
    tenantId: string,
    options?: {
      type?: ReportType;
      status?: ReportStatus;
      page?: number;
      limit?: number;
    }
  ): Promise<Result<{ jobs: ReportJob[]; total: number }>> {
    try {
      const page = options?.page || 1;
      const limit = Math.min(options?.limit || 50, 100);
      const offset = (page - 1) * limit;

      const conditions: string[] = ['tenant_id = $1'];
      const values: unknown[] = [tenantId];
      let paramIndex = 2;

      if (options?.type) {
        conditions.push(`type = $${paramIndex++}`);
        values.push(options.type);
      }

      if (options?.status) {
        conditions.push(`status = $${paramIndex++}`);
        values.push(options.status);
      }

      const whereClause = conditions.join(' AND ');

      // Get total count
      const countQuery = `SELECT COUNT(*) as total FROM report_jobs WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, values);
      const total = parseInt(countResult.value?.rows[0]?.total || '0', 10);

      // Get jobs
      const query = `
        SELECT * FROM report_jobs
        WHERE ${whereClause}
        ORDER BY created_at DESC
        LIMIT $${paramIndex++} OFFSET $${paramIndex++}
      `;

      values.push(limit, offset);

      const result = await this.pool.query(query, values);

      if (result.isFailure || !result.value) {
        return Result.fail('Failed to list report jobs');
      }

      const jobs = result.value.rows.map((row: Record<string, unknown>) =>
        this.mapRowToJob(row)
      );

      return Result.ok({ jobs, total });
    } catch (error) {
      return Result.fail(`Failed to list report jobs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ==================== Export Functions ====================

  /**
   * Export data to CSV
   */
  private async exportToCsv(data: ReportData): Promise<ExportResult> {
    try {
      const lines: string[] = [];

      // Header row
      const headers = data.columns.map(col => `"${col.label}"`);
      lines.push(headers.join(','));

      // Data rows
      for (const row of data.rows) {
        const values = data.columns.map(col => {
          const value = row[col.key];
          if (value === null || value === undefined) return '""';
          if (typeof value === 'string') return `"${value.replace(/"/g, '""')}"`;
          if (value instanceof Date) return `"${value.toISOString()}"`;
          return `"${String(value)}"`;
        });
        lines.push(values.join(','));
      }

      const csvContent = lines.join('\n');
      const checksum = crypto.createHash('sha256').update(csvContent).digest('hex');

      return {
        success: true,
        format: 'csv',
        fileName: `${data.reportType}_report_${Date.now()}.csv`,
        data: Buffer.from(csvContent, 'utf-8'),
        mimeType: 'text/csv',
        fileSizeBytes: Buffer.byteLength(csvContent),
      };
    } catch (error) {
      return {
        success: false,
        format: 'csv',
        error: error instanceof Error ? error.message : 'Failed to export CSV',
      };
    }
  }

  /**
   * Export data to JSON
   */
  private async exportToJson(data: ReportData): Promise<ExportResult> {
    try {
      const jsonContent = JSON.stringify(data, null, 2);

      return {
        success: true,
        format: 'json',
        fileName: `${data.reportType}_report_${Date.now()}.json`,
        data: Buffer.from(jsonContent, 'utf-8'),
        mimeType: 'application/json',
        fileSizeBytes: Buffer.byteLength(jsonContent),
      };
    } catch (error) {
      return {
        success: false,
        format: 'json',
        error: error instanceof Error ? error.message : 'Failed to export JSON',
      };
    }
  }

  /**
   * Export data to Excel (XLSX)
   * Note: In production, use a library like exceljs or xlsx
   */
  private async exportToExcel(data: ReportData): Promise<ExportResult> {
    try {
      // Simple Excel XML format (SpreadsheetML)
      // For production, use exceljs library for proper XLSX support
      const xmlParts: string[] = [];

      xmlParts.push('<?xml version="1.0" encoding="UTF-8"?>');
      xmlParts.push('<?mso-application progid="Excel.Sheet"?>');
      xmlParts.push('<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"');
      xmlParts.push(' xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">');

      // Styles
      xmlParts.push('<Styles>');
      xmlParts.push('<Style ss:ID="Header"><Font ss:Bold="1"/><Interior ss:Color="#4472C4" ss:Pattern="Solid"/><Font ss:Color="#FFFFFF"/></Style>');
      xmlParts.push('<Style ss:ID="Date"><NumberFormat ss:Format="yyyy-mm-dd"/></Style>');
      xmlParts.push('<Style ss:ID="Currency"><NumberFormat ss:Format="$#,##0.00"/></Style>');
      xmlParts.push('</Styles>');

      xmlParts.push(`<Worksheet ss:Name="${data.reportType}">`);
      xmlParts.push('<Table>');

      // Column widths
      for (const col of data.columns) {
        xmlParts.push(`<Column ss:AutoFitWidth="1" ss:Width="${col.width || 100}"/>`);
      }

      // Header row
      xmlParts.push('<Row>');
      for (const col of data.columns) {
        xmlParts.push(`<Cell ss:StyleID="Header"><Data ss:Type="String">${this.escapeXml(col.label)}</Data></Cell>`);
      }
      xmlParts.push('</Row>');

      // Data rows
      for (const row of data.rows) {
        xmlParts.push('<Row>');
        for (const col of data.columns) {
          const value = row[col.key];
          const cellType = this.getExcelType(col.type);
          const cellValue = this.formatExcelValue(value, col.type);
          const styleId = col.type === 'date' ? ' ss:StyleID="Date"' : col.type === 'currency' ? ' ss:StyleID="Currency"' : '';
          xmlParts.push(`<Cell${styleId}><Data ss:Type="${cellType}">${this.escapeXml(cellValue)}</Data></Cell>`);
        }
        xmlParts.push('</Row>');
      }

      xmlParts.push('</Table>');
      xmlParts.push('</Worksheet>');
      xmlParts.push('</Workbook>');

      const excelContent = xmlParts.join('\n');

      return {
        success: true,
        format: 'excel',
        fileName: `${data.reportType}_report_${Date.now()}.xml`,
        data: Buffer.from(excelContent, 'utf-8'),
        mimeType: 'application/vnd.ms-excel',
        fileSizeBytes: Buffer.byteLength(excelContent),
      };
    } catch (error) {
      return {
        success: false,
        format: 'excel',
        error: error instanceof Error ? error.message : 'Failed to export Excel',
      };
    }
  }

  /**
   * Export data to PDF
   * Note: In production, use a library like pdfkit or puppeteer
   */
  private async exportToPdf(data: ReportData): Promise<ExportResult> {
    try {
      // Generate HTML that can be converted to PDF
      // In production, use pdfkit or puppeteer for actual PDF generation
      const htmlParts: string[] = [];

      htmlParts.push('<!DOCTYPE html>');
      htmlParts.push('<html><head>');
      htmlParts.push('<meta charset="UTF-8">');
      htmlParts.push(`<title>${this.escapeHtml(data.title)}</title>`);
      htmlParts.push('<style>');
      htmlParts.push(`
        body { font-family: Arial, sans-serif; margin: 40px; color: #333; }
        h1 { color: #2563eb; border-bottom: 2px solid #2563eb; padding-bottom: 10px; }
        h2 { color: #4b5563; }
        .meta { color: #6b7280; font-size: 12px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #2563eb; color: white; padding: 12px 8px; text-align: left; font-weight: 600; }
        td { padding: 10px 8px; border-bottom: 1px solid #e5e7eb; }
        tr:nth-child(even) { background-color: #f9fafb; }
        .summary { background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .metric { display: inline-block; margin-right: 40px; }
        .metric-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        .metric-label { font-size: 12px; color: #6b7280; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 10px; color: #9ca3af; }
      `);
      htmlParts.push('</style>');
      htmlParts.push('</head><body>');

      // Header
      htmlParts.push(`<h1>${this.escapeHtml(data.title)}</h1>`);
      if (data.subtitle) {
        htmlParts.push(`<h2>${this.escapeHtml(data.subtitle)}</h2>`);
      }
      htmlParts.push(`<div class="meta">Generated: ${data.generatedAt.toISOString()}</div>`);

      // Summary section
      if (data.summary) {
        htmlParts.push('<div class="summary">');
        htmlParts.push(`<strong>Total Records: ${data.summary.totalRecords}</strong><br><br>`);
        for (const metric of data.summary.metrics) {
          htmlParts.push('<div class="metric">');
          htmlParts.push(`<div class="metric-value">${metric.value}</div>`);
          htmlParts.push(`<div class="metric-label">${this.escapeHtml(metric.label)}</div>`);
          htmlParts.push('</div>');
        }
        htmlParts.push('</div>');
      }

      // Data table
      htmlParts.push('<table>');
      htmlParts.push('<thead><tr>');
      for (const col of data.columns) {
        htmlParts.push(`<th>${this.escapeHtml(col.label)}</th>`);
      }
      htmlParts.push('</tr></thead>');

      htmlParts.push('<tbody>');
      for (const row of data.rows) {
        htmlParts.push('<tr>');
        for (const col of data.columns) {
          const value = this.formatDisplayValue(row[col.key], col.type);
          htmlParts.push(`<td>${this.escapeHtml(value)}</td>`);
        }
        htmlParts.push('</tr>');
      }
      htmlParts.push('</tbody>');
      htmlParts.push('</table>');

      // Footer
      htmlParts.push('<div class="footer">');
      htmlParts.push('Generated by ZuClub CRM - Lead Service');
      htmlParts.push('</div>');

      htmlParts.push('</body></html>');

      const htmlContent = htmlParts.join('\n');

      // Note: In production, convert HTML to PDF using puppeteer or pdfkit
      // For now, return HTML that can be printed to PDF
      return {
        success: true,
        format: 'pdf',
        fileName: `${data.reportType}_report_${Date.now()}.html`,
        data: Buffer.from(htmlContent, 'utf-8'),
        mimeType: 'text/html', // Would be application/pdf in production
        fileSizeBytes: Buffer.byteLength(htmlContent),
      };
    } catch (error) {
      return {
        success: false,
        format: 'pdf',
        error: error instanceof Error ? error.message : 'Failed to export PDF',
      };
    }
  }

  // ==================== Report Data Generation ====================

  /**
   * Generate lead report data
   */
  private async generateLeadReportData(
    tenantId: string,
    options?: LeadReportOptions
  ): Promise<ReportData> {
    const conditions: string[] = ['tenant_id = $1'];
    const values: unknown[] = [tenantId];
    let paramIndex = 2;

    // Apply filters
    if (options?.status?.length) {
      conditions.push(`status = ANY($${paramIndex++})`);
      values.push(options.status);
    }

    if (options?.source?.length) {
      conditions.push(`source = ANY($${paramIndex++})`);
      values.push(options.source);
    }

    if (options?.assignedTo?.length) {
      conditions.push(`assigned_to = ANY($${paramIndex++})`);
      values.push(options.assignedTo);
    }

    if (options?.dateRange) {
      conditions.push(`created_at >= $${paramIndex++} AND created_at <= $${paramIndex++}`);
      values.push(options.dateRange.startDate, options.dateRange.endDate);
    }

    const whereClause = conditions.join(' AND ');
    const orderBy = options?.sortBy
      ? `ORDER BY ${options.sortBy} ${options.sortOrder || 'ASC'}`
      : 'ORDER BY created_at DESC';

    const query = `
      SELECT
        id, company_name, email, phone, status, source,
        score, assigned_to, pipeline_stage_id,
        created_at, updated_at
      FROM leads
      WHERE ${whereClause}
      ${orderBy}
      LIMIT 1000
    `;

    const result = await this.pool.query(query, values);
    const rows = result.value?.rows || [];

    // Define columns
    const columns: ReportColumn[] = [
      { key: 'company_name', label: 'Company', type: 'string', width: 150 },
      { key: 'email', label: 'Email', type: 'string', width: 180 },
      { key: 'phone', label: 'Phone', type: 'string', width: 120 },
      { key: 'status', label: 'Status', type: 'string', width: 100 },
      { key: 'source', label: 'Source', type: 'string', width: 100 },
      { key: 'score', label: 'Score', type: 'number', width: 60 },
      { key: 'created_at', label: 'Created', type: 'date', width: 100 },
    ];

    // Calculate summary metrics
    const totalLeads = rows.length;
    const statusCounts = this.countByField(rows, 'status');
    const sourceCounts = this.countByField(rows, 'source');
    const avgScore = rows.length > 0
      ? Math.round(rows.reduce((sum: number, r: Record<string, unknown>) =>
          sum + (Number(r.score) || 0), 0) / rows.length)
      : 0;

    return {
      title: 'Lead Report',
      generatedAt: new Date(),
      tenantId,
      reportType: 'leads',
      columns,
      rows: rows.map((row: Record<string, unknown>) => ({
        ...row,
        created_at: row.created_at ? new Date(row.created_at as string) : null,
        updated_at: row.updated_at ? new Date(row.updated_at as string) : null,
      })),
      summary: options?.includeSummary !== false ? {
        totalRecords: totalLeads,
        metrics: [
          { label: 'Total Leads', value: totalLeads },
          { label: 'Average Score', value: avgScore },
          { label: 'Top Status', value: this.getTopKey(statusCounts) || 'N/A' },
          { label: 'Top Source', value: this.getTopKey(sourceCounts) || 'N/A' },
        ],
      } : undefined,
    };
  }

  /**
   * Generate pipeline report data
   */
  private async generatePipelineReportData(
    tenantId: string,
    options?: Record<string, unknown>
  ): Promise<ReportData> {
    const query = `
      SELECT
        ps.id, ps.name, ps.position,
        COUNT(l.id) as lead_count,
        COALESCE(SUM(CASE WHEN l.score IS NOT NULL THEN l.score ELSE 0 END), 0) as total_score,
        COALESCE(AVG(l.score), 0) as avg_score
      FROM pipeline_stages ps
      LEFT JOIN leads l ON l.pipeline_stage_id = ps.id AND l.tenant_id = $1
      WHERE ps.tenant_id = $1
      GROUP BY ps.id, ps.name, ps.position
      ORDER BY ps.position
    `;

    const result = await this.pool.query(query, [tenantId]);
    const rows = result.value?.rows || [];

    const columns: ReportColumn[] = [
      { key: 'name', label: 'Stage', type: 'string', width: 150 },
      { key: 'lead_count', label: 'Leads', type: 'number', width: 80 },
      { key: 'avg_score', label: 'Avg Score', type: 'number', width: 80 },
      { key: 'total_score', label: 'Total Score', type: 'number', width: 100 },
    ];

    const totalLeads = rows.reduce((sum: number, r: Record<string, unknown>) =>
      sum + Number(r.lead_count || 0), 0);

    return {
      title: 'Pipeline Report',
      generatedAt: new Date(),
      tenantId,
      reportType: 'pipeline',
      columns,
      rows: rows.map((row: Record<string, unknown>) => ({
        ...row,
        lead_count: Number(row.lead_count),
        avg_score: Math.round(Number(row.avg_score) * 100) / 100,
        total_score: Number(row.total_score),
      })),
      summary: {
        totalRecords: rows.length,
        metrics: [
          { label: 'Pipeline Stages', value: rows.length },
          { label: 'Total Leads', value: totalLeads },
        ],
      },
    };
  }

  /**
   * Generate activity report data
   */
  private async generateActivityReportData(
    tenantId: string,
    options?: Record<string, unknown>
  ): Promise<ReportData> {
    const query = `
      SELECT
        action,
        COUNT(*) as count,
        DATE_TRUNC('day', created_at) as date
      FROM activity_logs
      WHERE tenant_id = $1
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY action, DATE_TRUNC('day', created_at)
      ORDER BY date DESC, count DESC
      LIMIT 500
    `;

    const result = await this.pool.query(query, [tenantId]);
    const rows = result.value?.rows || [];

    const columns: ReportColumn[] = [
      { key: 'action', label: 'Activity', type: 'string', width: 150 },
      { key: 'count', label: 'Count', type: 'number', width: 80 },
      { key: 'date', label: 'Date', type: 'date', width: 100 },
    ];

    const totalActivities = rows.reduce((sum: number, r: Record<string, unknown>) =>
      sum + Number(r.count || 0), 0);

    return {
      title: 'Activity Report',
      subtitle: 'Last 30 Days',
      generatedAt: new Date(),
      tenantId,
      reportType: 'activity',
      columns,
      rows: rows.map((row: Record<string, unknown>) => ({
        ...row,
        count: Number(row.count),
        date: row.date ? new Date(row.date as string) : null,
      })),
      summary: {
        totalRecords: totalActivities,
        metrics: [
          { label: 'Total Activities', value: totalActivities },
          { label: 'Activity Types', value: new Set(rows.map((r: Record<string, unknown>) => r.action)).size },
        ],
      },
    };
  }

  // ==================== Helper Methods ====================

  /**
   * Create report job
   */
  private async createReportJob(
    jobId: string,
    tenantId: string,
    input: GenerateReportInput,
    userId?: string
  ): Promise<void> {
    try {
      const query = `
        INSERT INTO report_jobs (
          id, tenant_id, type, format, status,
          title, description, options, created_by,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), NOW())
      `;

      await this.pool.query(query, [
        jobId,
        tenantId,
        input.type,
        input.format,
        'processing',
        input.title,
        input.description,
        JSON.stringify(input.options || {}),
        userId,
      ]);
    } catch (error) {
      console.error('Failed to create report job:', error);
    }
  }

  /**
   * Update report job
   */
  private async updateReportJob(
    jobId: string,
    result: ExportResult
  ): Promise<void> {
    try {
      const query = `
        UPDATE report_jobs
        SET status = $1,
            file_name = $2,
            file_size_bytes = $3,
            error_message = $4,
            completed_at = $5,
            expires_at = $6,
            updated_at = NOW()
        WHERE id = $7
      `;

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days expiry

      await this.pool.query(query, [
        result.success ? 'completed' : 'failed',
        result.fileName,
        result.fileSizeBytes,
        result.error,
        result.success ? new Date() : null,
        result.success ? expiresAt : null,
        jobId,
      ]);
    } catch (error) {
      console.error('Failed to update report job:', error);
    }
  }

  /**
   * Map database row to ReportJob
   */
  private mapRowToJob(row: Record<string, unknown>): ReportJob {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      type: row.type as ReportType,
      format: row.format as ReportFormat,
      status: row.status as ReportStatus,
      title: row.title as string | undefined,
      description: row.description as string | undefined,
      options: typeof row.options === 'string'
        ? JSON.parse(row.options)
        : (row.options as Record<string, unknown> || {}),
      fileUrl: row.file_url as string | undefined,
      fileName: row.file_name as string | undefined,
      fileSizeBytes: row.file_size_bytes as number | undefined,
      checksum: row.checksum as string | undefined,
      expiresAt: row.expires_at ? new Date(row.expires_at as string) : undefined,
      progress: row.progress as number | undefined,
      recordsProcessed: row.records_processed as number | undefined,
      totalRecords: row.total_records as number | undefined,
      errorMessage: row.error_message as string | undefined,
      createdBy: row.created_by as string | undefined,
      createdAt: new Date(row.created_at as string),
      completedAt: row.completed_at ? new Date(row.completed_at as string) : undefined,
      updatedAt: new Date(row.updated_at as string),
    };
  }

  /**
   * Get default report title
   */
  private getDefaultTitle(type: ReportType): string {
    const titles: Record<ReportType, string> = {
      leads: 'Lead Report',
      pipeline: 'Pipeline Report',
      sales: 'Sales Report',
      activity: 'Activity Report',
      conversion: 'Conversion Report',
      performance: 'Performance Report',
      custom: 'Custom Report',
    };
    return titles[type] || 'Report';
  }

  /**
   * Count occurrences by field
   */
  private countByField(
    rows: Record<string, unknown>[],
    field: string
  ): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const row of rows) {
      const value = String(row[field] || 'unknown');
      counts[value] = (counts[value] || 0) + 1;
    }
    return counts;
  }

  /**
   * Get key with highest count
   */
  private getTopKey(counts: Record<string, number>): string | null {
    let topKey: string | null = null;
    let topCount = 0;
    for (const [key, count] of Object.entries(counts)) {
      if (count > topCount) {
        topKey = key;
        topCount = count;
      }
    }
    return topKey;
  }

  /**
   * Get Excel data type
   */
  private getExcelType(type: ReportColumn['type']): string {
    switch (type) {
      case 'number':
      case 'currency':
      case 'percentage':
        return 'Number';
      case 'boolean':
        return 'Boolean';
      case 'date':
        return 'DateTime';
      default:
        return 'String';
    }
  }

  /**
   * Format value for Excel
   */
  private formatExcelValue(value: unknown, type: ReportColumn['type']): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'boolean') return value ? '1' : '0';
    return String(value);
  }

  /**
   * Format value for display
   */
  private formatDisplayValue(value: unknown, type: ReportColumn['type']): string {
    if (value === null || value === undefined) return '';
    if (value instanceof Date) return value.toLocaleDateString();
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    if (type === 'currency') return `$${Number(value).toLocaleString()}`;
    if (type === 'percentage') return `${Number(value).toFixed(1)}%`;
    return String(value);
  }

  /**
   * Escape XML special characters
   */
  private escapeXml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

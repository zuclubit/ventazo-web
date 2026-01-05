/**
 * Advanced Reporting Service
 * Comprehensive reporting engine with custom reports and scheduling
 */

import { injectable, inject } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { Result } from '@zuclubit/domain';
import { randomUUID } from 'crypto';
import {
  Report,
  Dashboard,
  ReportWidget,
  ReportResult,
  ReportExport,
  ReportSchedule,
  ReportQuery,
  ReportFilter,
  ReportSorting,
  ReportGrouping,
  ReportColumn,
  CalculatedField,
  ReportStatus,
  ReportType,
  CreateReportRequest,
  UpdateReportRequest,
  CreateDashboardRequest,
  ReportQueryOptions,
  ReportTemplate,
  ReportMetric,
  ExportFormat,
  ScheduleFrequency,
  FilterOperator,
  AggregationFunction,
  DEFAULT_METRICS,
  DEFAULT_REPORT_TEMPLATES,
  getDateRangeForPreset,
  DateRangePreset,
} from './types';

@injectable()
export class AdvancedReportService {
  constructor(
    @inject(DatabasePool) private readonly pool: DatabasePool
  ) {}

  // ============ Report CRUD ============

  /**
   * Create a new report
   */
  async createReport(
    tenantId: string,
    userId: string,
    request: CreateReportRequest
  ): Promise<Result<Report>> {
    try {
      const id = randomUUID();
      const now = new Date();

      const query = `
        INSERT INTO reports (
          id, tenant_id, name, description, type, status, query, visualization,
          tags, is_public, shared_with, created_by, created_at, updated_at, run_count
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        request.name,
        request.description || null,
        request.type,
        'draft',
        JSON.stringify(request.query),
        JSON.stringify(request.visualization || null),
        request.tags || [],
        request.isPublic || false,
        request.sharedWith || [],
        userId,
        now,
        now,
        0,
      ]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      return Result.ok(this.mapRowToReport(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create report'));
    }
  }

  /**
   * Get report by ID
   */
  async getReport(tenantId: string, reportId: string): Promise<Result<Report | null>> {
    try {
      const query = `
        SELECT * FROM reports
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [reportId, tenantId]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToReport(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get report'));
    }
  }

  /**
   * List reports with filtering
   */
  async listReports(
    tenantId: string,
    options: ReportQueryOptions = {}
  ): Promise<Result<{ reports: Report[]; total: number }>> {
    try {
      const {
        status,
        type,
        tags,
        search,
        page = 1,
        limit = 20,
        sortBy = 'updatedAt',
        sortOrder = 'desc',
      } = options;

      const conditions: string[] = ['tenant_id = $1'];
      const params: unknown[] = [tenantId];
      let paramIndex = 2;

      if (status) {
        conditions.push(`status = $${paramIndex++}`);
        params.push(status);
      }

      if (type) {
        conditions.push(`type = $${paramIndex++}`);
        params.push(type);
      }

      if (tags && tags.length > 0) {
        conditions.push(`tags && $${paramIndex++}`);
        params.push(tags);
      }

      if (search) {
        conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = conditions.join(' AND ');
      const sortColumn = this.getSortColumn(sortBy);

      // Get total count
      const countQuery = `SELECT COUNT(*) FROM reports WHERE ${whereClause}`;
      const countResult = await this.pool.query(countQuery, params);
      const total = countResult.isSuccess ? parseInt(countResult.getValue().rows[0].count, 10) : 0;

      // Get paginated results
      const offset = (page - 1) * limit;
      const listQuery = `
        SELECT * FROM reports
        WHERE ${whereClause}
        ORDER BY ${sortColumn} ${sortOrder.toUpperCase()}
        LIMIT $${paramIndex++} OFFSET $${paramIndex}
      `;

      params.push(limit, offset);
      const result = await this.pool.query(listQuery, params);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const reports = result.getValue().rows.map((row: Record<string, unknown>) =>
        this.mapRowToReport(row)
      );

      return Result.ok({ reports, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to list reports'));
    }
  }

  /**
   * Update report
   */
  async updateReport(
    tenantId: string,
    reportId: string,
    request: UpdateReportRequest
  ): Promise<Result<Report>> {
    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [reportId, tenantId];
      let paramIndex = 3;

      if (request.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        params.push(request.name);
      }

      if (request.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        params.push(request.description);
      }

      if (request.status !== undefined) {
        setClauses.push(`status = $${paramIndex++}`);
        params.push(request.status);
      }

      if (request.query !== undefined) {
        setClauses.push(`query = $${paramIndex++}`);
        params.push(JSON.stringify(request.query));
      }

      if (request.visualization !== undefined) {
        setClauses.push(`visualization = $${paramIndex++}`);
        params.push(JSON.stringify(request.visualization));
      }

      if (request.tags !== undefined) {
        setClauses.push(`tags = $${paramIndex++}`);
        params.push(request.tags);
      }

      if (request.isPublic !== undefined) {
        setClauses.push(`is_public = $${paramIndex++}`);
        params.push(request.isPublic);
      }

      if (request.sharedWith !== undefined) {
        setClauses.push(`shared_with = $${paramIndex++}`);
        params.push(request.sharedWith);
      }

      const query = `
        UPDATE reports
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;

      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail(new Error('Report not found'));
      }

      return Result.ok(this.mapRowToReport(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to update report'));
    }
  }

  /**
   * Delete report
   */
  async deleteReport(tenantId: string, reportId: string): Promise<Result<void>> {
    try {
      // Delete schedules first
      await this.pool.query('DELETE FROM report_schedules WHERE report_id = $1', [reportId]);

      // Delete report
      const query = `DELETE FROM reports WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [reportId, tenantId]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to delete report'));
    }
  }

  // ============ Report Execution ============

  /**
   * Execute report query
   */
  async executeReport(
    tenantId: string,
    reportId: string,
    overrideFilters?: ReportFilter[]
  ): Promise<Result<ReportResult>> {
    const startTime = Date.now();

    try {
      // Get report
      const reportResult = await this.getReport(tenantId, reportId);
      if (reportResult.isFailure || !reportResult.value) {
        return Result.fail(new Error('Report not found'));
      }

      const report = reportResult.value;
      const queryDef = report.query;

      // Merge filters
      const filters = overrideFilters
        ? [...(queryDef.filters || []), ...overrideFilters]
        : queryDef.filters;

      // Build and execute SQL
      const sql = this.buildSqlQuery(tenantId, queryDef, filters);
      const sqlResult = await this.pool.query(sql.query, sql.params);

      if (sqlResult.isFailure) {
        return Result.fail(new Error(sqlResult.error!));
      }

      const rows = sqlResult.getValue().rows;
      const executionTime = Date.now() - startTime;

      // Update run count
      await this.pool.query(
        `UPDATE reports SET run_count = run_count + 1, last_run_at = NOW() WHERE id = $1`,
        [reportId]
      );

      // Calculate totals if needed
      const totals = this.calculateTotals(rows, queryDef.columns);

      return Result.ok({
        reportId,
        columns: queryDef.columns.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
        })),
        rows,
        totals,
        metadata: {
          rowCount: rows.length,
          executionTime,
          generatedAt: new Date(),
          filters,
        },
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to execute report'));
    }
  }

  /**
   * Execute ad-hoc query
   */
  async executeQuery(
    tenantId: string,
    query: ReportQuery
  ): Promise<Result<ReportResult>> {
    const startTime = Date.now();

    try {
      const sql = this.buildSqlQuery(tenantId, query);
      const result = await this.pool.query(sql.query, sql.params);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      const executionTime = Date.now() - startTime;

      return Result.ok({
        reportId: 'adhoc',
        columns: query.columns.map(c => ({
          id: c.id,
          name: c.name,
          type: c.type,
        })),
        rows,
        totals: this.calculateTotals(rows, query.columns),
        metadata: {
          rowCount: rows.length,
          executionTime,
          generatedAt: new Date(),
          filters: query.filters,
        },
      });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to execute query'));
    }
  }

  /**
   * Build SQL query from report definition
   */
  private buildSqlQuery(
    tenantId: string,
    query: ReportQuery,
    overrideFilters?: ReportFilter[]
  ): { query: string; params: unknown[] } {
    const params: unknown[] = [];
    let paramIndex = 1;

    // Build SELECT clause
    const selectClauses = query.columns.map(col => {
      if (col.aggregation) {
        return `${this.getAggregationSql(col.aggregation, col.field)} AS ${col.id}`;
      }
      return `${col.field} AS ${col.id}`;
    });

    // Build FROM clause
    let fromClause = query.dataSource.table;
    if (query.dataSource.alias) {
      fromClause += ` AS ${query.dataSource.alias}`;
    }

    // Build JOINs
    const joins = query.dataSource.joins?.map(join => {
      const joinType = join.type.toUpperCase();
      const tableName = join.alias ? `${join.table} AS ${join.alias}` : join.table;
      return `${joinType} JOIN ${tableName} ON ${join.on}`;
    }).join('\n') || '';

    // Build WHERE clause
    const filters = overrideFilters || query.filters || [];
    const whereClauses: string[] = [`${query.dataSource.table}.tenant_id = $${paramIndex++}`];
    params.push(tenantId);

    for (const filter of filters) {
      const filterSql = this.buildFilterSql(filter, paramIndex);
      if (filterSql) {
        whereClauses.push(filterSql.sql);
        params.push(...filterSql.params);
        paramIndex += filterSql.params.length;
      }
    }

    // Build GROUP BY clause
    let groupByClause = '';
    if (query.groupBy && query.groupBy.length > 0) {
      const groupFields = query.groupBy.map(g => {
        if (g.granularity) {
          return this.getDateTruncSql(g.field, g.granularity);
        }
        return g.field;
      });
      groupByClause = `GROUP BY ${groupFields.join(', ')}`;
    }

    // Build ORDER BY clause
    let orderByClause = '';
    if (query.orderBy && query.orderBy.length > 0) {
      const orderFields = query.orderBy.map(o => `${o.field} ${o.order.toUpperCase()}`);
      orderByClause = `ORDER BY ${orderFields.join(', ')}`;
    }

    // Build LIMIT/OFFSET
    let limitClause = '';
    if (query.limit) {
      limitClause = `LIMIT ${query.limit}`;
      if (query.offset) {
        limitClause += ` OFFSET ${query.offset}`;
      }
    }

    // Combine all parts
    const sql = `
      SELECT ${selectClauses.join(', ')}
      FROM ${fromClause}
      ${joins}
      WHERE ${whereClauses.join(' AND ')}
      ${groupByClause}
      ${orderByClause}
      ${limitClause}
    `.trim();

    return { query: sql, params };
  }

  /**
   * Get aggregation SQL
   */
  private getAggregationSql(aggregation: AggregationFunction, field: string): string {
    switch (aggregation) {
      case 'count':
        return `COUNT(${field})`;
      case 'count_distinct':
        return `COUNT(DISTINCT ${field})`;
      case 'sum':
        return `SUM(${field})`;
      case 'avg':
        return `AVG(${field})`;
      case 'min':
        return `MIN(${field})`;
      case 'max':
        return `MAX(${field})`;
      case 'first':
        return `FIRST_VALUE(${field}) OVER ()`;
      case 'last':
        return `LAST_VALUE(${field}) OVER ()`;
      default:
        return field;
    }
  }

  /**
   * Get date truncation SQL
   */
  private getDateTruncSql(field: string, granularity: string): string {
    return `DATE_TRUNC('${granularity}', ${field})`;
  }

  /**
   * Build filter SQL
   */
  private buildFilterSql(
    filter: ReportFilter,
    paramIndex: number
  ): { sql: string; params: unknown[] } | null {
    const params: unknown[] = [];

    switch (filter.operator) {
      case 'equals':
        params.push(filter.value);
        return { sql: `${filter.field} = $${paramIndex}`, params };

      case 'not_equals':
        params.push(filter.value);
        return { sql: `${filter.field} != $${paramIndex}`, params };

      case 'greater_than':
        params.push(filter.value);
        return { sql: `${filter.field} > $${paramIndex}`, params };

      case 'less_than':
        params.push(filter.value);
        return { sql: `${filter.field} < $${paramIndex}`, params };

      case 'greater_or_equal':
        params.push(filter.value);
        return { sql: `${filter.field} >= $${paramIndex}`, params };

      case 'less_or_equal':
        params.push(filter.value);
        return { sql: `${filter.field} <= $${paramIndex}`, params };

      case 'between':
        params.push(filter.value, filter.secondValue);
        return { sql: `${filter.field} BETWEEN $${paramIndex} AND $${paramIndex + 1}`, params };

      case 'in':
        if (Array.isArray(filter.value)) {
          const placeholders = filter.value.map((_, i) => `$${paramIndex + i}`).join(', ');
          params.push(...filter.value);
          return { sql: `${filter.field} IN (${placeholders})`, params };
        }
        return null;

      case 'not_in':
        if (Array.isArray(filter.value)) {
          const placeholders = filter.value.map((_, i) => `$${paramIndex + i}`).join(', ');
          params.push(...filter.value);
          return { sql: `${filter.field} NOT IN (${placeholders})`, params };
        }
        return null;

      case 'contains':
        params.push(`%${filter.value}%`);
        return { sql: `${filter.field} ILIKE $${paramIndex}`, params };

      case 'not_contains':
        params.push(`%${filter.value}%`);
        return { sql: `${filter.field} NOT ILIKE $${paramIndex}`, params };

      case 'starts_with':
        params.push(`${filter.value}%`);
        return { sql: `${filter.field} ILIKE $${paramIndex}`, params };

      case 'ends_with':
        params.push(`%${filter.value}`);
        return { sql: `${filter.field} ILIKE $${paramIndex}`, params };

      case 'is_null':
        return { sql: `${filter.field} IS NULL`, params: [] };

      case 'is_not_null':
        return { sql: `${filter.field} IS NOT NULL`, params: [] };

      default:
        return null;
    }
  }

  /**
   * Calculate totals from rows
   */
  private calculateTotals(
    rows: Record<string, unknown>[],
    columns: ReportColumn[]
  ): Record<string, unknown> {
    const totals: Record<string, unknown> = {};

    for (const column of columns) {
      if (column.aggregation && column.type === 'number') {
        const values = rows.map(r => Number(r[column.id]) || 0);

        switch (column.aggregation) {
          case 'sum':
            totals[column.id] = values.reduce((a, b) => a + b, 0);
            break;
          case 'avg':
            totals[column.id] = values.length > 0
              ? values.reduce((a, b) => a + b, 0) / values.length
              : 0;
            break;
          case 'min':
            totals[column.id] = Math.min(...values);
            break;
          case 'max':
            totals[column.id] = Math.max(...values);
            break;
          case 'count':
          case 'count_distinct':
            totals[column.id] = values.length;
            break;
        }
      }
    }

    return totals;
  }

  // ============ Dashboard Management ============

  /**
   * Create dashboard
   */
  async createDashboard(
    tenantId: string,
    userId: string,
    request: CreateDashboardRequest
  ): Promise<Result<Dashboard>> {
    try {
      const id = randomUUID();
      const now = new Date();

      const query = `
        INSERT INTO dashboards (
          id, tenant_id, name, description, widgets, layout, grid_columns,
          refresh_interval, filters, tags, is_public, shared_with, created_by, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15
        )
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        tenantId,
        request.name,
        request.description || null,
        JSON.stringify(request.widgets || []),
        request.layout || 'grid',
        request.gridColumns || 12,
        request.refreshInterval || null,
        JSON.stringify(request.filters || []),
        request.tags || [],
        request.isPublic || false,
        request.sharedWith || [],
        userId,
        now,
        now,
      ]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      return Result.ok(this.mapRowToDashboard(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create dashboard'));
    }
  }

  /**
   * Get dashboard by ID
   */
  async getDashboard(tenantId: string, dashboardId: string): Promise<Result<Dashboard | null>> {
    try {
      const query = `
        SELECT * FROM dashboards
        WHERE id = $1 AND tenant_id = $2
      `;

      const result = await this.pool.query(query, [dashboardId, tenantId]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.ok(null);
      }

      return Result.ok(this.mapRowToDashboard(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get dashboard'));
    }
  }

  /**
   * List dashboards
   */
  async listDashboards(
    tenantId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<Result<{ dashboards: Dashboard[]; total: number }>> {
    try {
      const countResult = await this.pool.query(
        'SELECT COUNT(*) FROM dashboards WHERE tenant_id = $1',
        [tenantId]
      );
      const total = countResult.isSuccess ? parseInt(countResult.getValue().rows[0].count, 10) : 0;

      const offset = (page - 1) * limit;
      const query = `
        SELECT * FROM dashboards
        WHERE tenant_id = $1
        ORDER BY updated_at DESC
        LIMIT $2 OFFSET $3
      `;

      const result = await this.pool.query(query, [tenantId, limit, offset]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const dashboards = result.getValue().rows.map((row: Record<string, unknown>) =>
        this.mapRowToDashboard(row)
      );

      return Result.ok({ dashboards, total });
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to list dashboards'));
    }
  }

  /**
   * Update dashboard
   */
  async updateDashboard(
    tenantId: string,
    dashboardId: string,
    updates: Partial<CreateDashboardRequest>
  ): Promise<Result<Dashboard>> {
    try {
      const setClauses: string[] = ['updated_at = NOW()'];
      const params: unknown[] = [dashboardId, tenantId];
      let paramIndex = 3;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex++}`);
        params.push(updates.name);
      }

      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex++}`);
        params.push(updates.description);
      }

      if (updates.widgets !== undefined) {
        setClauses.push(`widgets = $${paramIndex++}`);
        params.push(JSON.stringify(updates.widgets));
      }

      if (updates.layout !== undefined) {
        setClauses.push(`layout = $${paramIndex++}`);
        params.push(updates.layout);
      }

      if (updates.gridColumns !== undefined) {
        setClauses.push(`grid_columns = $${paramIndex++}`);
        params.push(updates.gridColumns);
      }

      if (updates.refreshInterval !== undefined) {
        setClauses.push(`refresh_interval = $${paramIndex++}`);
        params.push(updates.refreshInterval);
      }

      if (updates.filters !== undefined) {
        setClauses.push(`filters = $${paramIndex++}`);
        params.push(JSON.stringify(updates.filters));
      }

      if (updates.tags !== undefined) {
        setClauses.push(`tags = $${paramIndex++}`);
        params.push(updates.tags);
      }

      const query = `
        UPDATE dashboards
        SET ${setClauses.join(', ')}
        WHERE id = $1 AND tenant_id = $2
        RETURNING *
      `;

      const result = await this.pool.query(query, params);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const rows = result.getValue().rows;
      if (rows.length === 0) {
        return Result.fail(new Error('Dashboard not found'));
      }

      return Result.ok(this.mapRowToDashboard(rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to update dashboard'));
    }
  }

  /**
   * Delete dashboard
   */
  async deleteDashboard(tenantId: string, dashboardId: string): Promise<Result<void>> {
    try {
      const query = `DELETE FROM dashboards WHERE id = $1 AND tenant_id = $2`;
      const result = await this.pool.query(query, [dashboardId, tenantId]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to delete dashboard'));
    }
  }

  // ============ Scheduling ============

  /**
   * Create report schedule
   */
  async createSchedule(
    tenantId: string,
    reportId: string,
    schedule: Omit<ReportSchedule, 'id' | 'reportId' | 'lastRunAt' | 'nextRunAt'>
  ): Promise<Result<ReportSchedule>> {
    try {
      // Verify report exists
      const reportResult = await this.getReport(tenantId, reportId);
      if (reportResult.isFailure || !reportResult.value) {
        return Result.fail(new Error('Report not found'));
      }

      const id = randomUUID();
      const nextRunAt = this.calculateNextRun(schedule);

      const query = `
        INSERT INTO report_schedules (
          id, report_id, frequency, day_of_week, day_of_month, hour, minute,
          timezone, enabled, recipients, format, filters, next_run_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
        )
        RETURNING *
      `;

      const result = await this.pool.query(query, [
        id,
        reportId,
        schedule.frequency,
        schedule.dayOfWeek || null,
        schedule.dayOfMonth || null,
        schedule.hour,
        schedule.minute,
        schedule.timezone,
        schedule.enabled,
        JSON.stringify(schedule.recipients),
        schedule.format,
        JSON.stringify(schedule.filters || []),
        nextRunAt,
      ]);

      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      return Result.ok(this.mapRowToSchedule(result.getValue().rows[0]));
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to create schedule'));
    }
  }

  /**
   * Get report schedules
   */
  async getSchedules(tenantId: string, reportId: string): Promise<Result<ReportSchedule[]>> {
    try {
      // Verify report exists
      const reportResult = await this.getReport(tenantId, reportId);
      if (reportResult.isFailure || !reportResult.value) {
        return Result.fail(new Error('Report not found'));
      }

      const query = `
        SELECT * FROM report_schedules
        WHERE report_id = $1
        ORDER BY created_at DESC
      `;

      const result = await this.pool.query(query, [reportId]);
      if (result.isFailure) {
        return Result.fail(new Error(result.error!));
      }

      const schedules = result.getValue().rows.map((row: Record<string, unknown>) =>
        this.mapRowToSchedule(row)
      );

      return Result.ok(schedules);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to get schedules'));
    }
  }

  /**
   * Delete schedule
   */
  async deleteSchedule(scheduleId: string): Promise<Result<void>> {
    try {
      await this.pool.query('DELETE FROM report_schedules WHERE id = $1', [scheduleId]);
      return Result.ok(undefined);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error('Failed to delete schedule'));
    }
  }

  /**
   * Calculate next run time
   */
  private calculateNextRun(
    schedule: Pick<ReportSchedule, 'frequency' | 'dayOfWeek' | 'dayOfMonth' | 'hour' | 'minute' | 'timezone'>
  ): Date {
    const now = new Date();
    let next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), schedule.hour, schedule.minute);

    if (next <= now) {
      // Move to next occurrence
      switch (schedule.frequency) {
        case 'daily':
          next.setDate(next.getDate() + 1);
          break;
        case 'weekly':
          const daysUntilNext = schedule.dayOfWeek !== undefined
            ? (schedule.dayOfWeek - now.getDay() + 7) % 7 || 7
            : 7;
          next.setDate(next.getDate() + daysUntilNext);
          break;
        case 'monthly':
          next.setMonth(next.getMonth() + 1);
          if (schedule.dayOfMonth) {
            next.setDate(Math.min(schedule.dayOfMonth, new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate()));
          }
          break;
        case 'quarterly':
          next.setMonth(next.getMonth() + 3);
          break;
      }
    }

    return next;
  }

  // ============ Templates & Metrics ============

  /**
   * Get available metrics
   */
  getAvailableMetrics(): ReportMetric[] {
    return DEFAULT_METRICS;
  }

  /**
   * Get report templates
   */
  getTemplates(): ReportTemplate[] {
    return DEFAULT_REPORT_TEMPLATES;
  }

  /**
   * Create report from template
   */
  async createFromTemplate(
    tenantId: string,
    userId: string,
    templateId: string,
    name?: string
  ): Promise<Result<Report>> {
    const template = DEFAULT_REPORT_TEMPLATES.find(t => t.id === templateId);
    if (!template) {
      return Result.fail(new Error('Template not found'));
    }

    return this.createReport(tenantId, userId, {
      name: name || template.name,
      description: template.description,
      type: template.type,
      query: template.query,
      visualization: template.visualization,
      tags: [template.category],
    });
  }

  /**
   * Get date range filter for preset
   */
  getDateRangeFilter(preset: DateRangePreset, field: string): ReportFilter[] {
    const range = getDateRangeForPreset(preset);
    return [
      { id: 'date_start', field, operator: 'greater_or_equal', value: range.start.toISOString() },
      { id: 'date_end', field, operator: 'less_or_equal', value: range.end.toISOString() },
    ];
  }

  // ============ Helper Methods ============

  private mapRowToReport(row: Record<string, unknown>): Report {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      type: row.type as ReportType,
      status: row.status as ReportStatus,
      query: typeof row.query === 'string' ? JSON.parse(row.query) : row.query as ReportQuery,
      visualization: row.visualization
        ? (typeof row.visualization === 'string' ? JSON.parse(row.visualization) : row.visualization)
        : undefined,
      tags: row.tags as string[] | undefined,
      isPublic: row.is_public as boolean,
      sharedWith: row.shared_with as string[] | undefined,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
      lastRunAt: row.last_run_at ? new Date(row.last_run_at as string) : undefined,
      runCount: row.run_count as number,
    };
  }

  private mapRowToDashboard(row: Record<string, unknown>): Dashboard {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      name: row.name as string,
      description: row.description as string | undefined,
      widgets: typeof row.widgets === 'string' ? JSON.parse(row.widgets) : row.widgets as ReportWidget[],
      layout: row.layout as 'grid' | 'free',
      gridColumns: row.grid_columns as number,
      refreshInterval: row.refresh_interval as number | undefined,
      filters: row.filters
        ? (typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters as ReportFilter[])
        : undefined,
      tags: row.tags as string[] | undefined,
      isDefault: row.is_default as boolean | undefined,
      isPublic: row.is_public as boolean,
      sharedWith: row.shared_with as string[] | undefined,
      createdBy: row.created_by as string,
      createdAt: new Date(row.created_at as string),
      updatedAt: new Date(row.updated_at as string),
    };
  }

  private mapRowToSchedule(row: Record<string, unknown>): ReportSchedule {
    return {
      id: row.id as string,
      reportId: row.report_id as string,
      frequency: row.frequency as ScheduleFrequency,
      dayOfWeek: row.day_of_week as number | undefined,
      dayOfMonth: row.day_of_month as number | undefined,
      hour: row.hour as number,
      minute: row.minute as number,
      timezone: row.timezone as string,
      enabled: row.enabled as boolean,
      recipients: typeof row.recipients === 'string' ? JSON.parse(row.recipients) : row.recipients as Array<{ email: string; name?: string }>,
      format: row.format as ExportFormat,
      filters: row.filters
        ? (typeof row.filters === 'string' ? JSON.parse(row.filters) : row.filters as ReportFilter[])
        : undefined,
      lastRunAt: row.last_run_at ? new Date(row.last_run_at as string) : undefined,
      nextRunAt: row.next_run_at ? new Date(row.next_run_at as string) : undefined,
    };
  }

  private getSortColumn(sortBy: string): string {
    const columnMap: Record<string, string> = {
      name: 'name',
      createdAt: 'created_at',
      updatedAt: 'updated_at',
      runCount: 'run_count',
    };
    return columnMap[sortBy] || 'updated_at';
  }
}

/**
 * Create advanced report service instance
 */
export function createAdvancedReportService(pool: DatabasePool): AdvancedReportService {
  return new AdvancedReportService(pool);
}

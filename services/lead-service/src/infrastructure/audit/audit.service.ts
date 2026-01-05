/**
 * Audit Service
 * Comprehensive audit logging for all CRM operations
 */
import { injectable, inject } from 'tsyringe';
import { v4 as uuidv4 } from 'uuid';
import { Result } from '@zuclubit/domain';
import {
  AuditLogEntry,
  AuditAction,
  AuditEntityType,
  AuditChange,
  AuditQueryOptions,
  AuditQueryResult,
  AuditStats,
  AuditRetentionPolicy,
  AuditConfig,
  AuditContext,
  AuditExportOptions,
  ComplianceReport,
  RealTimeAuditEvent,
  AuditAlertRule,
  DEFAULT_AUDIT_CONFIG,
  SENSITIVE_FIELDS,
  EXCLUDED_FIELDS,
} from './types';

@injectable()
export class AuditService {
  private config: AuditConfig = DEFAULT_AUDIT_CONFIG;
  private buffer: AuditLogEntry[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private alertRules: Map<string, AuditAlertRule> = new Map();
  private listeners: ((event: RealTimeAuditEvent) => void)[] = [];

  constructor(
    @inject('DatabasePool') private db: any
  ) {
    this.startFlushTimer();
  }

  /**
   * Configure audit service
   */
  configure(config: Partial<AuditConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Log an audit entry
   */
  async log(
    entry: Omit<AuditLogEntry, 'id' | 'timestamp'>
  ): Promise<Result<AuditLogEntry>> {
    if (!this.config.enabled) {
      return Result.ok({} as AuditLogEntry);
    }

    // Don't log reads if disabled
    if (entry.action === 'read' && !this.config.logReads) {
      return Result.ok({} as AuditLogEntry);
    }

    const fullEntry: AuditLogEntry = {
      ...entry,
      id: uuidv4(),
      timestamp: new Date(),
      changes: entry.changes ? this.maskSensitiveData(entry.changes) : undefined,
    };

    // Determine severity if not provided
    if (!fullEntry.severity) {
      fullEntry.severity = this.determineSeverity(entry.action, entry.success);
    }

    if (this.config.asyncLogging) {
      this.buffer.push(fullEntry);
      if (this.buffer.length >= this.config.batchSize) {
        await this.flush();
      }
    } else {
      await this.writeEntry(fullEntry);
    }

    // Check alert rules
    await this.checkAlertRules(fullEntry);

    // Notify real-time listeners
    this.notifyListeners({
      type: 'new_entry',
      entry: fullEntry,
    });

    return Result.ok(fullEntry);
  }

  /**
   * Log a create action
   */
  async logCreate(
    context: AuditContext,
    entityType: AuditEntityType,
    entityId: string,
    entityName?: string,
    data?: Record<string, unknown>
  ): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'create',
      entityType,
      entityId,
      entityName,
      success: true,
      metadata: data ? { createdData: this.sanitizeData(data) } : undefined,
      severity: 'low',
    });
  }

  /**
   * Log an update action
   */
  async logUpdate(
    context: AuditContext,
    entityType: AuditEntityType,
    entityId: string,
    changes: AuditChange[],
    entityName?: string
  ): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'update',
      entityType,
      entityId,
      entityName,
      changes,
      success: true,
      severity: 'low',
    });
  }

  /**
   * Log a delete action
   */
  async logDelete(
    context: AuditContext,
    entityType: AuditEntityType,
    entityId: string,
    entityName?: string
  ): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'delete',
      entityType,
      entityId,
      entityName,
      success: true,
      severity: 'medium',
    });
  }

  /**
   * Log a read/data access action
   */
  async logRead(
    context: AuditContext,
    entityType: AuditEntityType,
    entityId?: string,
    entityName?: string
  ): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'data_access',
      entityType,
      entityId,
      entityName,
      success: true,
      severity: 'low',
    });
  }

  /**
   * Log a status change
   */
  async logStatusChange(
    context: AuditContext,
    entityType: AuditEntityType,
    entityId: string,
    oldStatus: string,
    newStatus: string,
    entityName?: string
  ): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'status_change',
      entityType,
      entityId,
      entityName,
      changes: [
        {
          field: 'status',
          oldValue: oldStatus,
          newValue: newStatus,
          displayName: 'Status',
        },
      ],
      success: true,
      severity: 'medium',
    });
  }

  /**
   * Log a permission change
   */
  async logPermissionChange(
    context: AuditContext,
    targetUserId: string,
    changes: AuditChange[]
  ): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'permission_change',
      entityType: 'permission',
      entityId: targetUserId,
      changes,
      success: true,
      severity: 'high',
    });
  }

  /**
   * Log a login attempt
   */
  async logLogin(
    context: AuditContext,
    success: boolean,
    errorMessage?: string
  ): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'login',
      entityType: 'user',
      entityId: context.userId,
      success,
      errorMessage,
      severity: success ? 'low' : 'high',
    });
  }

  /**
   * Log a logout
   */
  async logLogout(context: AuditContext): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'logout',
      entityType: 'user',
      entityId: context.userId,
      success: true,
      severity: 'low',
    });
  }

  /**
   * Log an API call
   */
  async logApiCall(
    context: AuditContext,
    method: string,
    endpoint: string,
    statusCode: number,
    duration: number
  ): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'api_call',
      entityType: 'system',
      success: statusCode >= 200 && statusCode < 400,
      duration,
      metadata: { method, endpoint, statusCode },
      severity: statusCode >= 500 ? 'high' : 'low',
    });
  }

  /**
   * Log an integration sync
   */
  async logIntegrationSync(
    context: AuditContext,
    integrationId: string,
    integrationName: string,
    recordsProcessed: number,
    success: boolean,
    errorMessage?: string
  ): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'integration_sync',
      entityType: 'integration',
      entityId: integrationId,
      entityName: integrationName,
      success,
      errorMessage,
      metadata: { recordsProcessed },
      severity: success ? 'low' : 'high',
    });
  }

  /**
   * Log a GDPR request
   */
  async logGdprRequest(
    context: AuditContext,
    requestType: 'access' | 'deletion' | 'export' | 'rectification',
    subjectId: string,
    success: boolean
  ): Promise<Result<AuditLogEntry>> {
    return this.log({
      ...context,
      action: 'gdpr_request',
      entityType: 'user',
      entityId: subjectId,
      success,
      metadata: { requestType },
      severity: 'critical',
    });
  }

  /**
   * Query audit logs
   */
  async query(options: AuditQueryOptions): Promise<Result<AuditQueryResult>> {
    try {
      // Build query based on options
      const page = options.page || 1;
      const pageSize = Math.min(
        options.pageSize || 50,
        this.config.maxEntriesPerQuery
      );

      // In production, query from database
      // For now, return mock data structure
      const entries: AuditLogEntry[] = [];
      const total = 0;

      return Result.ok({
        entries,
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      });
    } catch (error) {
      return Result.fail(`Failed to query audit logs: ${error}`);
    }
  }

  /**
   * Get audit statistics
   */
  async getStats(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<Result<AuditStats>> {
    try {
      // In production, aggregate from database
      const stats: AuditStats = {
        totalEntries: 0,
        entriesByAction: {},
        entriesByEntityType: {},
        entriesByUser: [],
        entriesBySeverity: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0,
        },
        successRate: 100,
        avgDuration: 0,
        peakHour: 10,
        mostActiveDay: 'Monday',
      };

      return Result.ok(stats);
    } catch (error) {
      return Result.fail(`Failed to get audit stats: ${error}`);
    }
  }

  /**
   * Get audit trail for a specific entity
   */
  async getEntityAuditTrail(
    tenantId: string,
    entityType: AuditEntityType,
    entityId: string,
    options?: { page?: number; pageSize?: number }
  ): Promise<Result<AuditQueryResult>> {
    return this.query({
      tenantId,
      entityTypes: [entityType],
      entityId,
      page: options?.page,
      pageSize: options?.pageSize,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
  }

  /**
   * Get user activity log
   */
  async getUserActivityLog(
    tenantId: string,
    userId: string,
    options?: { page?: number; pageSize?: number; startDate?: Date; endDate?: Date }
  ): Promise<Result<AuditQueryResult>> {
    return this.query({
      tenantId,
      userId,
      page: options?.page,
      pageSize: options?.pageSize,
      startDate: options?.startDate,
      endDate: options?.endDate,
      sortBy: 'timestamp',
      sortOrder: 'desc',
    });
  }

  /**
   * Export audit logs
   */
  async export(
    options: AuditQueryOptions,
    exportOptions: AuditExportOptions
  ): Promise<Result<Buffer>> {
    try {
      const queryResult = await this.query({
        ...options,
        pageSize: this.config.maxEntriesPerQuery,
      });

      if (queryResult.isFailure) {
        return Result.fail(queryResult.error);
      }

      const entries = queryResult.value.entries;

      switch (exportOptions.format) {
        case 'json':
          return Result.ok(Buffer.from(JSON.stringify(entries, null, 2)));
        case 'csv':
          return Result.ok(Buffer.from(this.toCsv(entries, exportOptions)));
        case 'xlsx':
          // Would use xlsx library in production
          return Result.ok(Buffer.from(this.toCsv(entries, exportOptions)));
        default:
          return Result.fail('Unsupported export format');
      }
    } catch (error) {
      return Result.fail(`Failed to export audit logs: ${error}`);
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<Result<ComplianceReport>> {
    try {
      const report: ComplianceReport = {
        reportId: uuidv4(),
        tenantId,
        generatedAt: new Date(),
        period: { start: startDate, end: endDate },
        summary: {
          totalActions: 0,
          uniqueUsers: 0,
          dataAccessCount: 0,
          sensitiveDataAccess: 0,
          failedOperations: 0,
          criticalActions: 0,
        },
        dataAccessLog: [],
        securityEvents: [],
        gdprEvents: [],
      };

      return Result.ok(report);
    } catch (error) {
      return Result.fail(`Failed to generate compliance report: ${error}`);
    }
  }

  /**
   * Create retention policy
   */
  async createRetentionPolicy(
    tenantId: string,
    policy: Omit<AuditRetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<Result<AuditRetentionPolicy>> {
    const fullPolicy: AuditRetentionPolicy = {
      ...policy,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return Result.ok(fullPolicy);
  }

  /**
   * Apply retention policies (cleanup old logs)
   */
  async applyRetentionPolicies(tenantId: string): Promise<Result<number>> {
    try {
      // In production, delete entries older than retention period
      const deletedCount = 0;
      return Result.ok(deletedCount);
    } catch (error) {
      return Result.fail(`Failed to apply retention policies: ${error}`);
    }
  }

  /**
   * Create alert rule
   */
  async createAlertRule(
    rule: Omit<AuditAlertRule, 'id'>
  ): Promise<Result<AuditAlertRule>> {
    const fullRule: AuditAlertRule = {
      ...rule,
      id: uuidv4(),
    };

    this.alertRules.set(fullRule.id, fullRule);
    return Result.ok(fullRule);
  }

  /**
   * Get alert rules
   */
  async getAlertRules(): Promise<Result<AuditAlertRule[]>> {
    return Result.ok(Array.from(this.alertRules.values()));
  }

  /**
   * Delete alert rule
   */
  async deleteAlertRule(ruleId: string): Promise<Result<void>> {
    if (!this.alertRules.has(ruleId)) {
      return Result.fail('Alert rule not found');
    }
    this.alertRules.delete(ruleId);
    return Result.ok(undefined);
  }

  /**
   * Add real-time listener
   */
  addListener(listener: (event: RealTimeAuditEvent) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove real-time listener
   */
  removeListener(listener: (event: RealTimeAuditEvent) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Calculate changes between two objects
   */
  calculateChanges(
    oldData: Record<string, unknown>,
    newData: Record<string, unknown>
  ): AuditChange[] {
    const changes: AuditChange[] = [];
    const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

    for (const key of allKeys) {
      // Skip excluded fields
      if (this.config.excludedFields.includes(key)) continue;

      const oldValue = oldData[key];
      const newValue = newData[key];

      // Check if values are different
      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          oldValue,
          newValue,
          displayName: this.formatFieldName(key),
          masked: this.config.sensitiveFields.includes(key.toLowerCase()),
        });
      }
    }

    return this.maskSensitiveData(changes);
  }

  // Private methods

  /**
   * Write entry to storage
   */
  private async writeEntry(entry: AuditLogEntry): Promise<void> {
    // In production, write to database
    console.log(`[AUDIT] ${entry.action} on ${entry.entityType}:${entry.entityId} by ${entry.userId}`);
  }

  /**
   * Flush buffer to storage
   */
  private async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const entries = [...this.buffer];
    this.buffer = [];

    try {
      // In production, batch insert to database
      for (const entry of entries) {
        await this.writeEntry(entry);
      }

      this.notifyListeners({
        type: 'bulk_insert',
        count: entries.length,
      });
    } catch (error) {
      // Re-add to buffer on failure
      this.buffer.unshift(...entries);
      console.error('Failed to flush audit buffer:', error);
    }
  }

  /**
   * Start flush timer
   */
  private startFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    this.flushTimer = setInterval(() => {
      this.flush().catch(console.error);
    }, this.config.flushInterval);
  }

  /**
   * Stop flush timer
   */
  async stop(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    await this.flush();
  }

  /**
   * Mask sensitive data in changes
   */
  private maskSensitiveData(changes: AuditChange[]): AuditChange[] {
    return changes.map((change) => {
      if (this.config.sensitiveFields.some((f) =>
        change.field.toLowerCase().includes(f.toLowerCase())
      )) {
        return {
          ...change,
          oldValue: change.oldValue ? '***MASKED***' : null,
          newValue: change.newValue ? '***MASKED***' : null,
          masked: true,
        };
      }
      return change;
    });
  }

  /**
   * Sanitize data for logging
   */
  private sanitizeData(data: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (this.config.excludedFields.includes(key)) continue;

      if (this.config.sensitiveFields.some((f) =>
        key.toLowerCase().includes(f.toLowerCase())
      )) {
        sanitized[key] = '***MASKED***';
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Determine severity based on action
   */
  private determineSeverity(
    action: AuditAction,
    success: boolean
  ): 'low' | 'medium' | 'high' | 'critical' {
    if (!success) {
      if (['login', 'permission_change', 'gdpr_request'].includes(action)) {
        return 'critical';
      }
      return 'high';
    }

    const criticalActions: AuditAction[] = [
      'permission_change',
      'gdpr_request',
      'bulk_delete',
    ];
    const highActions: AuditAction[] = [
      'delete',
      'payment_processed',
      'export',
    ];
    const mediumActions: AuditAction[] = [
      'update',
      'status_change',
      'assignment',
      'conversion',
    ];

    if (criticalActions.includes(action)) return 'critical';
    if (highActions.includes(action)) return 'high';
    if (mediumActions.includes(action)) return 'medium';
    return 'low';
  }

  /**
   * Check alert rules
   */
  private async checkAlertRules(entry: AuditLogEntry): Promise<void> {
    for (const rule of this.alertRules.values()) {
      if (!rule.isActive) continue;

      // Check cooldown
      if (rule.lastTriggered) {
        const cooldownMs = rule.cooldown * 60 * 1000;
        if (Date.now() - rule.lastTriggered.getTime() < cooldownMs) {
          continue;
        }
      }

      // Check conditions
      let matches = true;

      if (rule.condition.actions && !rule.condition.actions.includes(entry.action)) {
        matches = false;
      }
      if (rule.condition.entityTypes && !rule.condition.entityTypes.includes(entry.entityType)) {
        matches = false;
      }
      if (rule.condition.userIds && !rule.condition.userIds.includes(entry.userId)) {
        matches = false;
      }
      if (rule.condition.successOnly && !entry.success) {
        matches = false;
      }
      if (rule.condition.failureOnly && entry.success) {
        matches = false;
      }

      if (matches) {
        rule.lastTriggered = new Date();

        this.notifyListeners({
          type: 'alert',
          alert: {
            severity: rule.severity,
            message: rule.name,
            action: entry.action,
            userId: entry.userId,
          },
        });

        // In production, send notifications via configured channels
        console.log(`[AUDIT ALERT] ${rule.name}: ${entry.action} by ${entry.userId}`);
      }
    }
  }

  /**
   * Notify real-time listeners
   */
  private notifyListeners(event: RealTimeAuditEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in audit listener:', error);
      }
    }
  }

  /**
   * Format field name for display
   */
  private formatFieldName(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, (str) => str.toUpperCase())
      .trim();
  }

  /**
   * Convert entries to CSV
   */
  private toCsv(entries: AuditLogEntry[], options: AuditExportOptions): string {
    if (entries.length === 0) return '';

    const headers = [
      'timestamp',
      'action',
      'entityType',
      'entityId',
      'entityName',
      'userId',
      'userName',
      'success',
      'severity',
      'source',
    ];

    if (options.includeMetadata) {
      headers.push('metadata');
    }
    if (options.includeChanges) {
      headers.push('changes');
    }

    const rows = entries.map((entry) => {
      const row = [
        entry.timestamp.toISOString(),
        entry.action,
        entry.entityType,
        entry.entityId || '',
        entry.entityName || '',
        entry.userId,
        entry.userName || '',
        entry.success.toString(),
        entry.severity,
        entry.source,
      ];

      if (options.includeMetadata) {
        row.push(JSON.stringify(entry.metadata || {}));
      }
      if (options.includeChanges) {
        row.push(JSON.stringify(entry.changes || []));
      }

      return row.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(',');
    });

    return [headers.join(','), ...rows].join('\n');
  }
}

/**
 * AI Audit Logger Service
 * Comprehensive logging for AI actions and conversations
 */

import { injectable } from 'tsyringe';
import { DatabasePool } from '@zuclubit/database';
import { v4 as uuid } from 'uuid';
import {
  IAIAuditLogger,
  AIAuditLog,
  AIAuditEventType,
  AIConversationSummary,
  AIActivityReport,
} from '../types/audit.types';
import { ClassifiedIntent, ExecutedAction } from '../types/orchestrator.types';
import {
  ConfirmationRequest,
  ConfirmationResolution,
} from '../types/confirmation.types';
import { AIUserContext, AIMessage, AIEntityType, AIOperation } from '../types/common.types';

/**
 * AI Audit Logger implementation
 */
@injectable()
export class AIAuditLoggerService implements IAIAuditLogger {
  private logs: Map<string, AIAuditLog[]> = new Map(); // In-memory for now
  private conversationStats: Map<
    string,
    { messageCount: number; actionsExecuted: number }
  > = new Map();

  constructor(private pool: DatabasePool) {}

  /**
   * Log a conversation start
   */
  async logConversationStart(
    conversationId: string,
    user: AIUserContext,
    source: string,
    initialMessage?: string
  ): Promise<void> {
    const log = this.createBaseLog(
      conversationId,
      'conversation_started',
      user
    );

    log.data = {
      type: 'conversation_started',
      source,
      initialMessage: initialMessage?.substring(0, 500),
    };

    await this.persistLog(log);
    this.conversationStats.set(conversationId, {
      messageCount: 0,
      actionsExecuted: 0,
    });
  }

  /**
   * Log a conversation end
   */
  async logConversationEnd(
    conversationId: string,
    reason: 'user_ended' | 'timeout' | 'error' | 'completed',
    stats: { messageCount: number; actionsExecuted: number }
  ): Promise<void> {
    const log = this.createBaseLogForConversation(
      conversationId,
      'conversation_ended'
    );

    log.data = {
      type: 'conversation_ended',
      reason,
      messageCount: stats.messageCount,
      actionsExecuted: stats.actionsExecuted,
    };

    await this.persistLog(log);
    this.conversationStats.delete(conversationId);
  }

  /**
   * Log a message received
   */
  async logMessageReceived(
    conversationId: string,
    requestId: string,
    message: AIMessage
  ): Promise<void> {
    const log = this.createBaseLogForConversation(
      conversationId,
      'message_received'
    );

    log.requestId = requestId;
    log.data = {
      type: 'message_received',
      messageId: message.id,
      content: message.content.substring(0, 1000),
      contentLength: message.content.length,
    };

    await this.persistLog(log);

    // Update stats
    const stats = this.conversationStats.get(conversationId);
    if (stats) {
      stats.messageCount++;
    }
  }

  /**
   * Log a message sent
   */
  async logMessageSent(
    conversationId: string,
    requestId: string,
    message: AIMessage,
    llmUsage?: AIAuditLog['llmUsage']
  ): Promise<void> {
    const log = this.createBaseLogForConversation(
      conversationId,
      'message_sent'
    );

    log.requestId = requestId;
    log.data = {
      type: 'message_sent',
      messageId: message.id,
      content: message.content.substring(0, 1000),
      contentLength: message.content.length,
    };
    log.llmUsage = llmUsage;

    await this.persistLog(log);
  }

  /**
   * Log intent classification
   */
  async logIntentClassified(
    conversationId: string,
    requestId: string,
    intent: ClassifiedIntent,
    rawMessage: string
  ): Promise<void> {
    const log = this.createBaseLogForConversation(
      conversationId,
      'intent_classified'
    );

    log.requestId = requestId;
    log.data = {
      type: 'intent_classified',
      intent,
      rawMessage: rawMessage.substring(0, 500),
    };

    await this.persistLog(log);
  }

  /**
   * Log action planned
   */
  async logActionPlanned(
    conversationId: string,
    requestId: string,
    planId: string,
    tools: string[],
    requiresConfirmation: boolean
  ): Promise<void> {
    const log = this.createBaseLogForConversation(
      conversationId,
      'action_planned'
    );

    log.requestId = requestId;
    log.data = {
      type: 'action_planned',
      planId,
      actionsCount: tools.length,
      requiresConfirmation,
      tools,
    };

    await this.persistLog(log);
  }

  /**
   * Log action executed
   */
  async logActionExecuted(
    conversationId: string,
    requestId: string,
    action: ExecutedAction,
    user: AIUserContext
  ): Promise<void> {
    const eventType: AIAuditEventType =
      action.status === 'success' ? 'action_executed' : 'action_failed';

    const log = this.createBaseLog(conversationId, eventType, user);

    log.requestId = requestId;
    log.data = {
      type: 'action_executed',
      toolName: action.toolName,
      parameters: this.sanitizeParameters(action.parameters),
      result: action,
    };
    log.affectedEntity = action.affectedEntity
      ? {
          type: action.affectedEntity.type as AIEntityType,
          id: action.affectedEntity.id,
        }
      : undefined;
    log.result = {
      status: action.status,
      message: action.status === 'failure' ? action.error?.message : undefined,
      errorCode: action.error?.code,
    };
    log.durationMs = action.durationMs;

    await this.persistLog(log);

    // Update stats
    const stats = this.conversationStats.get(conversationId);
    if (stats && action.status === 'success') {
      stats.actionsExecuted++;
    }
  }

  /**
   * Log confirmation requested
   */
  async logConfirmationRequested(
    conversationId: string,
    requestId: string,
    confirmation: ConfirmationRequest
  ): Promise<void> {
    const log = this.createBaseLogForConversation(
      conversationId,
      'confirmation_requested'
    );

    log.requestId = requestId;
    log.data = {
      type: 'confirmation_requested',
      confirmationId: confirmation.id,
      action: confirmation.action.toolName,
      impact: confirmation.impact,
      expiresAt: confirmation.expiresAt,
    };

    await this.persistLog(log);
  }

  /**
   * Log confirmation received
   */
  async logConfirmationReceived(
    conversationId: string,
    requestId: string,
    confirmationId: string,
    resolution: ConfirmationResolution
  ): Promise<void> {
    const log = this.createBaseLogForConversation(
      conversationId,
      'confirmation_received'
    );

    log.requestId = requestId;
    log.data = {
      type: 'confirmation_received',
      confirmationId,
      decision: resolution.outcome === 'confirmed' ? 'confirmed' : 'denied',
      resolution,
    };

    await this.persistLog(log);
  }

  /**
   * Log permission denied
   */
  async logPermissionDenied(
    conversationId: string,
    requestId: string,
    action: string,
    requiredPermissions: string[],
    user: AIUserContext
  ): Promise<void> {
    const log = this.createBaseLog(conversationId, 'permission_denied', user);

    log.requestId = requestId;
    log.data = {
      type: 'permission_denied',
      action,
      requiredPermissions,
      userPermissions: user.permissions,
      reason: `User lacks required permissions: ${requiredPermissions.join(', ')}`,
    };

    await this.persistLog(log);
  }

  /**
   * Log an error
   */
  async logError(
    conversationId: string,
    requestId: string,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void> {
    const log = this.createBaseLogForConversation(
      conversationId,
      'error_occurred'
    );

    log.requestId = requestId;
    log.data = {
      type: 'error_occurred',
      errorCode: (error as any).code || 'UNKNOWN_ERROR',
      errorMessage: error.message,
      stackTrace: error.stack?.substring(0, 2000),
      context,
    };
    log.result = {
      status: 'failure',
      message: error.message,
      errorCode: (error as any).code || 'UNKNOWN_ERROR',
    };

    await this.persistLog(log);
  }

  /**
   * Get audit logs for a conversation
   */
  async getConversationLogs(conversationId: string): Promise<AIAuditLog[]> {
    // Try memory first
    const memoryLogs = this.logs.get(conversationId);
    if (memoryLogs && memoryLogs.length > 0) {
      return memoryLogs;
    }

    // Try database
    try {
      const result = await this.pool.query(
        `SELECT * FROM ai_audit_logs
         WHERE conversation_id = $1
         ORDER BY timestamp ASC`,
        [conversationId]
      );

      if (result.isFailure || !result.value?.rows) {
        return [];
      }

      return result.value.rows.map((row: Record<string, unknown>) => this.rowToLog(row));
    } catch (error) {
      console.error('Failed to get conversation logs:', error);
      return [];
    }
  }

  /**
   * Get audit logs for a user
   */
  async getUserLogs(
    userId: string,
    tenantId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<AIAuditLog[]> {
    try {
      const limit = options?.limit || 100;
      const offset = options?.offset || 0;

      let query = `
        SELECT * FROM ai_audit_logs
        WHERE user_id = $1 AND tenant_id = $2
      `;
      const params: unknown[] = [userId, tenantId];
      let paramCount = 2;

      if (options?.startDate) {
        paramCount++;
        query += ` AND timestamp >= $${paramCount}`;
        params.push(options.startDate);
      }

      if (options?.endDate) {
        paramCount++;
        query += ` AND timestamp <= $${paramCount}`;
        params.push(options.endDate);
      }

      query += ` ORDER BY timestamp DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(limit, offset);

      const result = await this.pool.query(query, params);

      if (result.isFailure || !result.value?.rows) {
        return [];
      }

      return result.value.rows.map((row: Record<string, unknown>) => this.rowToLog(row));
    } catch (error) {
      console.error('Failed to get user logs:', error);
      return [];
    }
  }

  /**
   * Get conversation summary
   */
  async getConversationSummary(
    conversationId: string
  ): Promise<AIConversationSummary> {
    const logs = await this.getConversationLogs(conversationId);

    if (logs.length === 0) {
      throw new Error(`No logs found for conversation ${conversationId}`);
    }

    const firstLog = logs[0];
    const lastLog = logs[logs.length - 1];

    // Count various metrics
    const messagesSent = logs.filter((l) => l.eventType === 'message_sent').length;
    const messagesReceived = logs.filter((l) => l.eventType === 'message_received').length;
    const actionsExecuted = logs.filter((l) => l.eventType === 'action_executed').length;
    const actionsFailed = logs.filter((l) => l.eventType === 'action_failed').length;
    const confirmationsRequested = logs.filter(
      (l) => l.eventType === 'confirmation_requested'
    ).length;
    const confirmationsApproved = logs.filter(
      (l) =>
        l.eventType === 'confirmation_received' &&
        (l.data as any)?.decision === 'confirmed'
    ).length;
    const errors = logs.filter((l) => l.eventType === 'error_occurred').length;

    // Aggregate entities affected
    const entityCounts = new Map<AIEntityType, { count: number; operations: Set<AIOperation> }>();
    for (const log of logs) {
      if (log.affectedEntity) {
        const existing = entityCounts.get(log.affectedEntity.type) || {
          count: 0,
          operations: new Set(),
        };
        existing.count++;
        if (log.data && 'result' in log.data && (log.data as any).result?.affectedEntity?.action) {
          existing.operations.add((log.data as any).result.affectedEntity.action);
        }
        entityCounts.set(log.affectedEntity.type, existing);
      }
    }

    // Aggregate tools used
    const toolCounts = new Map<string, { count: number; successes: number }>();
    for (const log of logs) {
      if (log.eventType === 'action_executed' || log.eventType === 'action_failed') {
        const toolName = (log.data as any)?.toolName;
        if (toolName) {
          const existing = toolCounts.get(toolName) || { count: 0, successes: 0 };
          existing.count++;
          if (log.eventType === 'action_executed') {
            existing.successes++;
          }
          toolCounts.set(toolName, existing);
        }
      }
    }

    // Aggregate LLM usage
    let totalTokens = 0;
    let totalCost = 0;
    const providers: Record<string, number> = {};
    for (const log of logs) {
      if (log.llmUsage) {
        totalTokens += log.llmUsage.totalTokens;
        totalCost += log.llmUsage.cost || 0;
        providers[log.llmUsage.provider] =
          (providers[log.llmUsage.provider] || 0) + log.llmUsage.totalTokens;
      }
    }

    const endedLog = logs.find((l) => l.eventType === 'conversation_ended');

    return {
      conversationId,
      tenantId: firstLog.tenantId,
      userId: firstLog.userId,
      userDisplayName: '', // Would need to join with users table
      startedAt: firstLog.timestamp,
      endedAt: endedLog?.timestamp,
      durationSeconds: Math.floor(
        (lastLog.timestamp.getTime() - firstLog.timestamp.getTime()) / 1000
      ),
      messageCount: messagesSent + messagesReceived,
      actionsExecuted,
      actionsFailed,
      confirmationsRequested,
      confirmationsApproved,
      entitiesAffected: Array.from(entityCounts.entries()).map(([type, data]) => ({
        type,
        count: data.count,
        operations: Array.from(data.operations),
      })),
      toolsUsed: Array.from(toolCounts.entries()).map(([name, data]) => ({
        name,
        count: data.count,
        successRate: data.count > 0 ? data.successes / data.count : 0,
      })),
      llmUsage: {
        totalTokens,
        totalCost: totalCost > 0 ? totalCost : undefined,
        providers,
      },
      errors,
      status: endedLog
        ? ((endedLog.data as any)?.reason === 'error' ? 'error' : 'completed')
        : 'active',
    };
  }

  /**
   * Generate activity report
   */
  async generateActivityReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AIActivityReport> {
    // This would typically query the database
    // For now, return a placeholder
    return {
      period: { start: startDate, end: endDate },
      tenantId,
      totalConversations: 0,
      totalMessages: 0,
      totalActionsExecuted: 0,
      actionsByEntity: {} as any,
      topTools: [],
      topUsers: [],
      llmUsage: {
        totalTokens: 0,
        byProvider: {},
        byModel: {},
      },
      errors: {
        total: 0,
        byType: {},
        topErrors: [],
      },
      confirmations: {
        total: 0,
        approved: 0,
        denied: 0,
        expired: 0,
        avgResponseTimeSeconds: 0,
      },
    };
  }

  // ==================== Private Methods ====================

  /**
   * Create base log entry
   */
  private createBaseLog(
    conversationId: string,
    eventType: AIAuditEventType,
    user: AIUserContext
  ): AIAuditLog {
    return {
      id: uuid(),
      tenantId: user.tenantId,
      userId: user.userId,
      conversationId,
      requestId: uuid(),
      eventType,
      timestamp: new Date(),
      source: 'ai_assistant',
      data: {} as any,
    };
  }

  /**
   * Create base log for conversation (without user context)
   */
  private createBaseLogForConversation(
    conversationId: string,
    eventType: AIAuditEventType
  ): AIAuditLog {
    // Get tenant/user from stored conversation or use placeholder
    return {
      id: uuid(),
      tenantId: '',
      userId: '',
      conversationId,
      requestId: uuid(),
      eventType,
      timestamp: new Date(),
      source: 'ai_assistant',
      data: {} as any,
    };
  }

  /**
   * Persist log to storage
   */
  private async persistLog(log: AIAuditLog): Promise<void> {
    // Store in memory
    const conversationLogs = this.logs.get(log.conversationId) || [];
    conversationLogs.push(log);
    this.logs.set(log.conversationId, conversationLogs);

    // Keep only last 1000 logs per conversation in memory
    if (conversationLogs.length > 1000) {
      this.logs.set(log.conversationId, conversationLogs.slice(-1000));
    }

    // Persist to database asynchronously
    this.persistToDatabase(log).catch((error) => {
      console.error('Failed to persist audit log to database:', error);
    });
  }

  /**
   * Persist log to database
   */
  private async persistToDatabase(log: AIAuditLog): Promise<void> {
    try {
      await this.pool.query(
        `INSERT INTO ai_audit_logs (
          id, tenant_id, user_id, conversation_id, session_id,
          request_id, event_type, timestamp, source, data,
          affected_entity, changes, result, duration_ms, llm_usage, metadata
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        ON CONFLICT (id) DO NOTHING`,
        [
          log.id,
          log.tenantId,
          log.userId,
          log.conversationId,
          log.sessionId || null,
          log.requestId,
          log.eventType,
          log.timestamp,
          log.source,
          JSON.stringify(log.data),
          log.affectedEntity ? JSON.stringify(log.affectedEntity) : null,
          log.changes ? JSON.stringify(log.changes) : null,
          log.result ? JSON.stringify(log.result) : null,
          log.durationMs || null,
          log.llmUsage ? JSON.stringify(log.llmUsage) : null,
          log.metadata ? JSON.stringify(log.metadata) : null,
        ]
      );
    } catch (error) {
      // Log but don't throw - audit logging shouldn't break the main flow
      console.error('Database insert failed for audit log:', error);
    }
  }

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParameters(
    params: Record<string, unknown>
  ): Record<string, unknown> {
    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'api_key'];
    const sanitized: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(params)) {
      if (sensitiveFields.some((f) => key.toLowerCase().includes(f))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'object' && value !== null) {
        sanitized[key] = this.sanitizeParameters(value as Record<string, unknown>);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Convert database row to AIAuditLog
   */
  private rowToLog(row: Record<string, unknown>): AIAuditLog {
    return {
      id: row.id as string,
      tenantId: row.tenant_id as string,
      userId: row.user_id as string,
      conversationId: row.conversation_id as string,
      sessionId: row.session_id as string | undefined,
      requestId: row.request_id as string,
      eventType: row.event_type as AIAuditEventType,
      timestamp: new Date(row.timestamp as string),
      source: 'ai_assistant',
      data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
      affectedEntity: row.affected_entity
        ? typeof row.affected_entity === 'string'
          ? JSON.parse(row.affected_entity)
          : row.affected_entity
        : undefined,
      changes: row.changes
        ? typeof row.changes === 'string'
          ? JSON.parse(row.changes)
          : row.changes
        : undefined,
      result: row.result
        ? typeof row.result === 'string'
          ? JSON.parse(row.result)
          : row.result
        : undefined,
      durationMs: row.duration_ms as number | undefined,
      llmUsage: row.llm_usage
        ? typeof row.llm_usage === 'string'
          ? JSON.parse(row.llm_usage)
          : row.llm_usage
        : undefined,
      metadata: row.metadata
        ? typeof row.metadata === 'string'
          ? JSON.parse(row.metadata)
          : row.metadata
        : undefined,
    } as AIAuditLog;
  }
}

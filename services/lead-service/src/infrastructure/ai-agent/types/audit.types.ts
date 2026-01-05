/**
 * AI Audit Types
 * Types for comprehensive AI action auditing and traceability
 */

import {
  AIEntityType,
  AIOperation,
  ActionImpact,
  ActionResultStatus,
  AIUserContext,
  AIMessage,
} from './common.types';
import { ClassifiedIntent, ExecutedAction } from './orchestrator.types';
import { ConfirmationRequest, ConfirmationResolution } from './confirmation.types';

// ============================================================================
// AI Audit Log Types
// ============================================================================

/**
 * AI audit log entry types
 */
export type AIAuditEventType =
  // Conversation events
  | 'conversation_started'
  | 'conversation_ended'
  | 'message_received'
  | 'message_sent'
  // Intent events
  | 'intent_classified'
  | 'intent_clarification_requested'
  // Action events
  | 'action_planned'
  | 'action_validated'
  | 'action_executed'
  | 'action_failed'
  | 'action_rollback'
  // Confirmation events
  | 'confirmation_requested'
  | 'confirmation_received'
  | 'confirmation_expired'
  // Security events
  | 'permission_denied'
  | 'rate_limited'
  | 'suspicious_activity'
  // Error events
  | 'error_occurred'
  | 'llm_error'
  | 'tool_error';

/**
 * AI audit log entry
 */
export interface AIAuditLog {
  /** Unique log entry ID */
  id: string;

  /** Tenant ID */
  tenantId: string;

  /** User on whose behalf AI is acting */
  userId: string;

  /** Conversation ID */
  conversationId: string;

  /** Session ID (groups related conversations) */
  sessionId?: string;

  /** Request ID (for single request tracing) */
  requestId: string;

  /** Event type */
  eventType: AIAuditEventType;

  /** Event timestamp */
  timestamp: Date;

  /** Source of the action */
  source: 'ai_assistant';

  /** Event-specific data */
  data: AIAuditEventData;

  /** Affected entity */
  affectedEntity?: {
    type: AIEntityType;
    id: string;
    name?: string;
  };

  /** Changes made (for action events) */
  changes?: AIAuditChange[];

  /** Result of the event */
  result?: {
    status: ActionResultStatus;
    message?: string;
    errorCode?: string;
  };

  /** Duration in ms */
  durationMs?: number;

  /** LLM usage stats */
  llmUsage?: {
    provider: string;
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };

  /** Request metadata */
  metadata?: {
    ipAddress?: string;
    userAgent?: string;
    clientSource?: string;
    traceId?: string;
  };
}

/**
 * AI audit change record
 */
export interface AIAuditChange {
  /** Field that was changed */
  field: string;

  /** Previous value */
  previousValue: unknown;

  /** New value */
  newValue: unknown;

  /** Change type */
  changeType: 'create' | 'update' | 'delete';
}

/**
 * Event-specific data types
 */
export type AIAuditEventData =
  | ConversationStartedData
  | ConversationEndedData
  | MessageReceivedData
  | MessageSentData
  | IntentClassifiedData
  | ActionPlannedData
  | ActionExecutedData
  | ConfirmationRequestedData
  | ConfirmationReceivedData
  | PermissionDeniedData
  | ErrorOccurredData;

export interface ConversationStartedData {
  type: 'conversation_started';
  source: string;
  initialMessage?: string;
}

export interface ConversationEndedData {
  type: 'conversation_ended';
  reason: 'user_ended' | 'timeout' | 'error' | 'completed';
  messageCount: number;
  actionsExecuted: number;
}

export interface MessageReceivedData {
  type: 'message_received';
  messageId: string;
  content: string;
  contentLength: number;
}

export interface MessageSentData {
  type: 'message_sent';
  messageId: string;
  content: string;
  contentLength: number;
}

export interface IntentClassifiedData {
  type: 'intent_classified';
  intent: ClassifiedIntent;
  rawMessage: string;
}

export interface ActionPlannedData {
  type: 'action_planned';
  planId: string;
  actionsCount: number;
  requiresConfirmation: boolean;
  tools: string[];
}

export interface ActionExecutedData {
  type: 'action_executed';
  toolName: string;
  parameters: Record<string, unknown>;
  result: ExecutedAction;
}

export interface ConfirmationRequestedData {
  type: 'confirmation_requested';
  confirmationId: string;
  action: string;
  impact: ActionImpact;
  expiresAt: Date;
}

export interface ConfirmationReceivedData {
  type: 'confirmation_received';
  confirmationId: string;
  decision: 'confirmed' | 'denied';
  resolution: ConfirmationResolution;
}

export interface PermissionDeniedData {
  type: 'permission_denied';
  action: string;
  requiredPermissions: string[];
  userPermissions: string[];
  reason: string;
}

export interface ErrorOccurredData {
  type: 'error_occurred';
  errorCode: string;
  errorMessage: string;
  stackTrace?: string;
  context?: Record<string, unknown>;
}

// ============================================================================
// AI Activity Summary Types
// ============================================================================

/**
 * AI activity summary for a conversation
 */
export interface AIConversationSummary {
  /** Conversation ID */
  conversationId: string;

  /** Tenant ID */
  tenantId: string;

  /** User ID */
  userId: string;

  /** User display name */
  userDisplayName: string;

  /** Conversation started at */
  startedAt: Date;

  /** Conversation ended at */
  endedAt?: Date;

  /** Duration in seconds */
  durationSeconds: number;

  /** Number of messages exchanged */
  messageCount: number;

  /** Number of actions executed */
  actionsExecuted: number;

  /** Number of actions failed */
  actionsFailed: number;

  /** Number of confirmations requested */
  confirmationsRequested: number;

  /** Number of confirmations approved */
  confirmationsApproved: number;

  /** Entities affected */
  entitiesAffected: Array<{
    type: AIEntityType;
    count: number;
    operations: AIOperation[];
  }>;

  /** Tools used */
  toolsUsed: Array<{
    name: string;
    count: number;
    successRate: number;
  }>;

  /** LLM usage summary */
  llmUsage: {
    totalTokens: number;
    totalCost?: number;
    providers: Record<string, number>;
  };

  /** Errors encountered */
  errors: number;

  /** Overall status */
  status: 'active' | 'completed' | 'error' | 'abandoned';
}

/**
 * AI activity report for a time period
 */
export interface AIActivityReport {
  /** Report period */
  period: {
    start: Date;
    end: Date;
  };

  /** Tenant ID */
  tenantId: string;

  /** Total conversations */
  totalConversations: number;

  /** Total messages */
  totalMessages: number;

  /** Total actions executed */
  totalActionsExecuted: number;

  /** Actions by entity type */
  actionsByEntity: Record<AIEntityType, {
    total: number;
    created: number;
    updated: number;
    deleted: number;
    other: number;
  }>;

  /** Top tools used */
  topTools: Array<{
    name: string;
    count: number;
    avgDurationMs: number;
    successRate: number;
  }>;

  /** Top users */
  topUsers: Array<{
    userId: string;
    displayName: string;
    conversationCount: number;
    actionsExecuted: number;
  }>;

  /** LLM usage */
  llmUsage: {
    totalTokens: number;
    totalCost?: number;
    byProvider: Record<string, {
      tokens: number;
      cost?: number;
    }>;
    byModel: Record<string, {
      tokens: number;
      cost?: number;
    }>;
  };

  /** Error summary */
  errors: {
    total: number;
    byType: Record<string, number>;
    topErrors: Array<{
      code: string;
      count: number;
      lastOccurred: Date;
    }>;
  };

  /** Confirmation summary */
  confirmations: {
    total: number;
    approved: number;
    denied: number;
    expired: number;
    avgResponseTimeSeconds: number;
  };
}

// ============================================================================
// AI Audit Service Interface
// ============================================================================

/**
 * AI Audit Logger interface
 */
export interface IAIAuditLogger {
  /**
   * Log a conversation start
   */
  logConversationStart(
    conversationId: string,
    user: AIUserContext,
    source: string,
    initialMessage?: string
  ): Promise<void>;

  /**
   * Log a conversation end
   */
  logConversationEnd(
    conversationId: string,
    reason: 'user_ended' | 'timeout' | 'error' | 'completed',
    stats: { messageCount: number; actionsExecuted: number }
  ): Promise<void>;

  /**
   * Log a message received
   */
  logMessageReceived(
    conversationId: string,
    requestId: string,
    message: AIMessage
  ): Promise<void>;

  /**
   * Log a message sent
   */
  logMessageSent(
    conversationId: string,
    requestId: string,
    message: AIMessage,
    llmUsage?: AIAuditLog['llmUsage']
  ): Promise<void>;

  /**
   * Log intent classification
   */
  logIntentClassified(
    conversationId: string,
    requestId: string,
    intent: ClassifiedIntent,
    rawMessage: string
  ): Promise<void>;

  /**
   * Log action planned
   */
  logActionPlanned(
    conversationId: string,
    requestId: string,
    planId: string,
    tools: string[],
    requiresConfirmation: boolean
  ): Promise<void>;

  /**
   * Log action executed
   */
  logActionExecuted(
    conversationId: string,
    requestId: string,
    action: ExecutedAction,
    user: AIUserContext
  ): Promise<void>;

  /**
   * Log confirmation requested
   */
  logConfirmationRequested(
    conversationId: string,
    requestId: string,
    confirmation: ConfirmationRequest
  ): Promise<void>;

  /**
   * Log confirmation received
   */
  logConfirmationReceived(
    conversationId: string,
    requestId: string,
    confirmationId: string,
    resolution: ConfirmationResolution
  ): Promise<void>;

  /**
   * Log permission denied
   */
  logPermissionDenied(
    conversationId: string,
    requestId: string,
    action: string,
    requiredPermissions: string[],
    user: AIUserContext
  ): Promise<void>;

  /**
   * Log an error
   */
  logError(
    conversationId: string,
    requestId: string,
    error: Error,
    context?: Record<string, unknown>
  ): Promise<void>;

  /**
   * Get audit logs for a conversation
   */
  getConversationLogs(conversationId: string): Promise<AIAuditLog[]>;

  /**
   * Get audit logs for a user
   */
  getUserLogs(
    userId: string,
    tenantId: string,
    options?: {
      startDate?: Date;
      endDate?: Date;
      limit?: number;
      offset?: number;
    }
  ): Promise<AIAuditLog[]>;

  /**
   * Get conversation summary
   */
  getConversationSummary(conversationId: string): Promise<AIConversationSummary>;

  /**
   * Generate activity report
   */
  generateActivityReport(
    tenantId: string,
    startDate: Date,
    endDate: Date
  ): Promise<AIActivityReport>;
}

// ============================================================================
// Audit Query Types
// ============================================================================

/**
 * Audit log query filters
 */
export interface AIAuditLogQuery {
  tenantId: string;
  userId?: string;
  conversationId?: string;
  sessionId?: string;
  eventTypes?: AIAuditEventType[];
  entityType?: AIEntityType;
  entityId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: ActionResultStatus;
  hasErrors?: boolean;
  limit?: number;
  offset?: number;
  sortBy?: 'timestamp' | 'eventType' | 'userId';
  sortOrder?: 'asc' | 'desc';
}

/**
 * Audit log query result
 */
export interface AIAuditLogQueryResult {
  logs: AIAuditLog[];
  total: number;
  hasMore: boolean;
  page: number;
  pageSize: number;
}

// ============================================================================
// Compliance & Export Types
// ============================================================================

/**
 * Audit export format
 */
export type AuditExportFormat = 'json' | 'csv' | 'pdf';

/**
 * Audit export request
 */
export interface AuditExportRequest {
  tenantId: string;
  query: AIAuditLogQuery;
  format: AuditExportFormat;
  includeUserDetails: boolean;
  includeEntityDetails: boolean;
  includeChanges: boolean;
}

/**
 * Audit export result
 */
export interface AuditExportResult {
  exportId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  downloadUrl?: string;
  expiresAt?: Date;
  recordCount?: number;
  errorMessage?: string;
}

/**
 * GDPR-related audit functions
 */
export interface IAIAuditGDPRCompliance {
  /**
   * Export all AI activity for a user (GDPR data portability)
   */
  exportUserAIActivity(
    userId: string,
    tenantId: string
  ): Promise<AuditExportResult>;

  /**
   * Anonymize AI audit logs for a user (GDPR erasure)
   */
  anonymizeUserAIActivity(
    userId: string,
    tenantId: string
  ): Promise<{ recordsAnonymized: number }>;

  /**
   * Get AI data retention status
   */
  getDataRetentionStatus(
    tenantId: string
  ): Promise<{
    retentionPeriodDays: number;
    oldestRecord: Date;
    recordCount: number;
    storageUsedBytes: number;
  }>;
}

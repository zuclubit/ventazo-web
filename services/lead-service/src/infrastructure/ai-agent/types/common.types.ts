/**
 * AI Agent Common Types
 * Base types shared across the AI Agent framework
 */

import { Permission, UserRole } from '../../auth/types';
import { ResourceType, PermissionAction } from '../../permissions/types';

// ============================================================================
// Core Enums
// ============================================================================

/**
 * Entity types the AI can operate on
 */
export type AIEntityType =
  | 'lead'
  | 'customer'
  | 'opportunity'
  | 'task'
  | 'quote'
  | 'contact'
  | 'note'
  | 'activity'
  | 'pipeline'
  | 'campaign';

/**
 * Operations the AI can perform
 */
export type AIOperation =
  | 'create'
  | 'read'
  | 'update'
  | 'delete'
  | 'search'
  | 'list'
  | 'assign'
  | 'qualify'
  | 'convert'
  | 'send'
  | 'complete'
  | 'cancel'
  | 'analyze';

/**
 * AI action impact levels
 */
export type ActionImpact = 'low' | 'medium' | 'high' | 'critical';

/**
 * AI action result status
 */
export type ActionResultStatus =
  | 'success'
  | 'failure'
  | 'partial'
  | 'pending_confirmation'
  | 'cancelled'
  | 'timeout';

// ============================================================================
// Context Types
// ============================================================================

/**
 * User context for AI operations
 * Represents the user on whose behalf the AI is acting
 */
export interface AIUserContext {
  /** User's unique identifier */
  userId: string;

  /** Tenant identifier */
  tenantId: string;

  /** User's email */
  email: string;

  /** User's display name */
  displayName: string;

  /** User's name (alias for displayName) */
  userName?: string;

  /** User's role */
  role: UserRole;

  /** User's permissions */
  permissions: Permission[];

  /** User's timezone */
  timezone?: string;

  /** User's locale/language */
  locale?: string;
}

/**
 * Conversation context
 * Maintains state across multi-turn conversations
 */
export interface AIConversationContext {
  /** Unique conversation identifier */
  conversationId: string;

  /** Session identifier (groups related conversations) */
  sessionId?: string;

  /** User context */
  user?: AIUserContext;

  /** Tenant ID (can also be obtained from user.tenantId) */
  tenantId?: string;

  /** User ID (can also be obtained from user.userId) */
  userId?: string;

  /** Conversation started at */
  startedAt: Date;

  /** Last activity timestamp */
  lastActivityAt?: Date;

  /** Number of messages exchanged */
  messageCount?: number;

  /** Current conversation state */
  state?: ConversationState;

  /** Messages in the conversation */
  messages: AIMessage[];

  /** Entities mentioned in conversation */
  mentionedEntities?: MentionedEntity[];

  /** Active filters/context for queries */
  activeFilters?: Record<string, unknown>;

  /** Custom metadata */
  metadata?: Record<string, unknown>;

  /** Pending confirmation request */
  pendingConfirmation?: unknown;
}

/**
 * Conversation state machine states
 */
export type ConversationState =
  | 'idle'
  | 'awaiting_input'
  | 'processing'
  | 'awaiting_confirmation'
  | 'executing'
  | 'completed'
  | 'error'
  | 'timeout';

/**
 * Entity mentioned during conversation
 */
export interface MentionedEntity {
  type: AIEntityType;
  id: string;
  name?: string;
  mentionedAt: Date;
  context?: string;
}

// ============================================================================
// Message Types
// ============================================================================

/**
 * AI message role
 */
export type AIMessageRole = 'user' | 'assistant' | 'system' | 'tool';

/**
 * AI message in conversation
 */
export interface AIMessage {
  /** Unique message identifier */
  id: string;

  /** Message role */
  role: AIMessageRole;

  /** Message content */
  content: string;

  /** Timestamp (creation time) */
  timestamp?: Date;

  /** Created at (alias for timestamp) */
  createdAt?: Date;

  /** Associated tool calls (if role is 'assistant') */
  toolCalls?: AIToolCall[];

  /** Tool result (if role is 'tool') */
  toolResult?: AIToolResult;

  /** Metadata */
  metadata?: {
    /** Token usage */
    tokens?: {
      prompt: number;
      completion: number;
      total: number;
    };
    /** Processing time in ms */
    latencyMs?: number;
    /** Model used */
    model?: string;
    /** Provider used */
    provider?: string;
    /** Confirmation ID if requesting confirmation */
    confirmationId?: string;
    /** Confirmation type */
    confirmationType?: string;
    /** Expiration time for confirmation */
    expiresAt?: string;
  };
}

/**
 * Tool call from AI
 */
export interface AIToolCall {
  /** Unique call identifier */
  id: string;

  /** Tool name */
  toolName: string;

  /** Tool arguments as JSON */
  arguments: Record<string, unknown>;

  /** Parsed and validated arguments */
  parsedArguments?: unknown;
}

/**
 * Tool execution result
 */
export interface AIToolResult {
  /** Corresponding tool call ID */
  toolCallId: string;

  /** Tool name */
  toolName: string;

  /** Execution status */
  status: ActionResultStatus;

  /** Result data */
  data?: unknown;

  /** Error if failed */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };

  /** Execution duration in ms */
  durationMs: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * AI Agent error codes
 */
export enum AIAgentErrorCode {
  // Authentication/Authorization errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  PERMISSION_DENIED = 'PERMISSION_DENIED',

  // Validation errors
  INVALID_INPUT = 'INVALID_INPUT',
  INVALID_PARAMETERS = 'INVALID_PARAMETERS',
  MISSING_REQUIRED_FIELD = 'MISSING_REQUIRED_FIELD',

  // Tool errors
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  TOOL_EXECUTION_FAILED = 'TOOL_EXECUTION_FAILED',
  TOOL_TIMEOUT = 'TOOL_TIMEOUT',

  // Intent errors
  INTENT_CLASSIFICATION_FAILED = 'INTENT_CLASSIFICATION_FAILED',
  AMBIGUOUS_INTENT = 'AMBIGUOUS_INTENT',
  UNSUPPORTED_INTENT = 'UNSUPPORTED_INTENT',

  // Entity errors
  ENTITY_NOT_FOUND = 'ENTITY_NOT_FOUND',
  ENTITY_ALREADY_EXISTS = 'ENTITY_ALREADY_EXISTS',
  ENTITY_VALIDATION_FAILED = 'ENTITY_VALIDATION_FAILED',

  // Confirmation errors
  CONFIRMATION_TIMEOUT = 'CONFIRMATION_TIMEOUT',
  CONFIRMATION_DENIED = 'CONFIRMATION_DENIED',
  CONFIRMATION_ERROR = 'CONFIRMATION_ERROR',

  // Conversation errors
  CONVERSATION_NOT_FOUND = 'CONVERSATION_NOT_FOUND',

  // System errors
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  RATE_LIMITED = 'RATE_LIMITED',
  CONTEXT_EXPIRED = 'CONTEXT_EXPIRED',

  // LLM errors
  LLM_ERROR = 'LLM_ERROR',
  LLM_TIMEOUT = 'LLM_TIMEOUT',
  LLM_RATE_LIMITED = 'LLM_RATE_LIMITED',
}

/**
 * AI Agent error
 */
export class AIAgentError extends Error {
  constructor(
    public readonly code: AIAgentErrorCode,
    message: string,
    public readonly details?: Record<string, unknown>,
    public readonly userMessage?: string
  ) {
    super(message);
    this.name = 'AIAgentError';
  }

  /**
   * Get user-friendly message
   */
  getUserMessage(): string {
    return this.userMessage || this.getDefaultUserMessage();
  }

  /**
   * Get default user-friendly message based on error code
   */
  private getDefaultUserMessage(): string {
    const messages: Record<AIAgentErrorCode, string> = {
      [AIAgentErrorCode.UNAUTHORIZED]: 'No tienes acceso para realizar esta acción.',
      [AIAgentErrorCode.FORBIDDEN]: 'No tienes permiso para realizar esta acción.',
      [AIAgentErrorCode.INSUFFICIENT_PERMISSIONS]: 'Tu rol no tiene los permisos necesarios.',
      [AIAgentErrorCode.PERMISSION_DENIED]: 'No tienes permiso para realizar esta operación.',
      [AIAgentErrorCode.INVALID_INPUT]: 'La información proporcionada no es válida.',
      [AIAgentErrorCode.INVALID_PARAMETERS]: 'Los parámetros no son correctos.',
      [AIAgentErrorCode.MISSING_REQUIRED_FIELD]: 'Falta información requerida.',
      [AIAgentErrorCode.TOOL_NOT_FOUND]: 'No puedo realizar esa acción.',
      [AIAgentErrorCode.TOOL_EXECUTION_FAILED]: 'Ocurrió un error al ejecutar la acción.',
      [AIAgentErrorCode.TOOL_TIMEOUT]: 'La acción tardó demasiado tiempo.',
      [AIAgentErrorCode.INTENT_CLASSIFICATION_FAILED]: 'No entendí lo que quieres hacer.',
      [AIAgentErrorCode.AMBIGUOUS_INTENT]: '¿Podrías ser más específico?',
      [AIAgentErrorCode.UNSUPPORTED_INTENT]: 'Esa acción no está disponible.',
      [AIAgentErrorCode.ENTITY_NOT_FOUND]: 'No encontré el registro que buscas.',
      [AIAgentErrorCode.ENTITY_ALREADY_EXISTS]: 'Ese registro ya existe.',
      [AIAgentErrorCode.ENTITY_VALIDATION_FAILED]: 'Los datos del registro no son válidos.',
      [AIAgentErrorCode.CONFIRMATION_TIMEOUT]: 'El tiempo para confirmar expiró.',
      [AIAgentErrorCode.CONFIRMATION_DENIED]: 'La acción fue cancelada.',
      [AIAgentErrorCode.CONFIRMATION_ERROR]: 'Error en el proceso de confirmación.',
      [AIAgentErrorCode.CONVERSATION_NOT_FOUND]: 'No se encontró la conversación.',
      [AIAgentErrorCode.INTERNAL_ERROR]: 'Ocurrió un error interno. Por favor intenta de nuevo.',
      [AIAgentErrorCode.SERVICE_UNAVAILABLE]: 'El servicio no está disponible temporalmente.',
      [AIAgentErrorCode.RATE_LIMITED]: 'Has realizado demasiadas solicitudes. Espera un momento.',
      [AIAgentErrorCode.CONTEXT_EXPIRED]: 'Tu sesión ha expirado. Por favor inicia una nueva conversación.',
      [AIAgentErrorCode.LLM_ERROR]: 'Hubo un problema procesando tu solicitud.',
      [AIAgentErrorCode.LLM_TIMEOUT]: 'La solicitud tardó demasiado. Intenta de nuevo.',
      [AIAgentErrorCode.LLM_RATE_LIMITED]: 'El servicio de IA está ocupado. Intenta en unos segundos.',
    };
    return messages[this.code] || 'Ocurrió un error inesperado.';
  }
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Result type for operations that can fail
 */
export type AIResult<T, E = AIAgentError> =
  | { success: true; data: T }
  | { success: false; error: E };

/**
 * Paginated result
 */
export interface AIPaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

/**
 * JSON Schema type for tool parameters
 */
export interface JSONSchema {
  type: 'object' | 'array' | 'string' | 'number' | 'boolean' | 'null';
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  additionalProperties?: boolean;
  items?: JSONSchemaProperty;
  description?: string;
}

export interface JSONSchemaProperty {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'null' | string[];
  description?: string;
  enum?: (string | number)[];
  format?: string;
  pattern?: string;
  minLength?: number;
  maxLength?: number;
  minimum?: number;
  maximum?: number;
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
  default?: unknown;
}

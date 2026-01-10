/**
 * AI Streaming Types
 *
 * Type definitions for Server-Sent Events (SSE) streaming
 * from AI providers to frontend clients.
 *
 * @module infrastructure/ai/streaming/types
 */

// ============================================
// SSE Event Types
// ============================================

/**
 * Base SSE event structure
 */
export interface SSEEvent<T = unknown> {
  event: SSEEventType;
  data: T;
  id?: string;
  retry?: number;
}

/**
 * All possible SSE event types
 */
export type SSEEventType =
  | 'token'
  | 'metadata'
  | 'tool_start'
  | 'tool_args'
  | 'tool_end'
  | 'confirmation'
  | 'usage'
  | 'done'
  | 'error'
  | 'ping';

// ============================================
// Event Payloads
// ============================================

/**
 * Token event - single generated token
 */
export interface TokenEventData {
  /** Token content */
  t: string;
  /** Token index in sequence */
  i: number;
}

/**
 * Metadata event - sent at stream start
 */
export interface MetadataEventData {
  /** Model used */
  model: string;
  /** Provider name */
  provider: string;
  /** Conversation ID (if applicable) */
  conversationId?: string;
  /** Request ID for correlation */
  requestId: string;
}

/**
 * Tool start event - beginning of function call
 */
export interface ToolStartEventData {
  /** Tool call ID */
  id: string;
  /** Tool name */
  name: string;
  /** Tool index (for parallel calls) */
  index: number;
}

/**
 * Tool args event - streaming tool arguments
 */
export interface ToolArgsEventData {
  /** Tool call ID */
  id: string;
  /** Argument delta (partial JSON string) */
  delta: string;
}

/**
 * Tool end event - tool execution complete
 */
export interface ToolEndEventData {
  /** Tool call ID */
  id: string;
  /** Tool name */
  name: string;
  /** Execution result */
  result?: unknown;
  /** Whether execution succeeded */
  success: boolean;
  /** Error message if failed */
  error?: string;
  /** Execution time in ms */
  executionTimeMs: number;
}

/**
 * Confirmation event - requires user confirmation
 */
export interface ConfirmationEventData {
  /** Request ID for confirmation response */
  requestId: string;
  /** Action being confirmed */
  action: string;
  /** Human-readable description */
  description: string;
  /** Impact level */
  impact: 'low' | 'medium' | 'high' | 'critical';
  /** Parameters of the action */
  parameters: Record<string, unknown>;
  /** Expiration timestamp */
  expiresAt: string;
}

/**
 * Usage event - token usage statistics
 */
export interface UsageEventData {
  /** Prompt tokens */
  prompt: number;
  /** Completion tokens */
  completion: number;
  /** Total tokens */
  total: number;
  /** Estimated cost (USD) */
  cost?: number;
}

/**
 * Done event - stream completed successfully
 */
export interface DoneEventData {
  /** Conversation ID */
  conversationId: string;
  /** Finish reason */
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  /** Total response content (for verification) */
  contentLength: number;
}

/**
 * Error event - error during streaming
 */
export interface ErrorEventData {
  /** Error code */
  code: StreamErrorCode;
  /** Human-readable message */
  message: string;
  /** Whether client should retry */
  retryable: boolean;
  /** Suggested retry delay in ms */
  retryAfterMs?: number;
  /** Request ID for support */
  requestId: string;
}

/**
 * Ping event - keep-alive
 */
export interface PingEventData {
  /** Server timestamp */
  ts: number;
}

// ============================================
// Error Codes
// ============================================

export type StreamErrorCode =
  | 'RATE_LIMIT'
  | 'CONTEXT_LENGTH'
  | 'INVALID_REQUEST'
  | 'PROVIDER_ERROR'
  | 'TIMEOUT'
  | 'CANCELLED'
  | 'INTERNAL_ERROR'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN';

// ============================================
// Stream Request/Response
// ============================================

/**
 * Streaming chat request
 */
export interface StreamChatRequest {
  /** User message */
  message: string;
  /** Conversation ID (optional, creates new if not provided) */
  conversationId?: string;
  /** System prompt override */
  systemPrompt?: string;
  /** Preferred provider */
  provider?: 'openai' | 'anthropic' | 'groq' | 'bot-helper';
  /** Preferred model */
  model?: string;
  /** Temperature (0-2) */
  temperature?: number;
  /** Max tokens to generate */
  maxTokens?: number;
  /** Context from CRM (lead, customer, etc.) */
  context?: StreamChatContext;
  /** Enable tool use */
  enableTools?: boolean;
  /** Abort signal ID (for cancellation) */
  abortId?: string;
}

/**
 * CRM context for AI requests
 */
export interface StreamChatContext {
  /** Entity type */
  entityType?: 'lead' | 'customer' | 'opportunity' | 'task' | 'quote';
  /** Entity ID */
  entityId?: string;
  /** Additional context data */
  data?: Record<string, unknown>;
}

// ============================================
// Internal Types
// ============================================

/**
 * OpenAI stream chunk (from API)
 */
export interface OpenAIStreamChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string;
      tool_calls?: Array<{
        index: number;
        id?: string;
        type?: string;
        function?: {
          name?: string;
          arguments?: string;
        };
      }>;
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

/**
 * Accumulated stream state
 */
export interface StreamAccumulator {
  /** Full content accumulated */
  content: string;
  /** Token count */
  tokenCount: number;
  /** Tool calls being accumulated */
  toolCalls: Map<string, {
    id: string;
    name: string;
    arguments: string;
    index: number;
  }>;
  /** Whether stream is complete */
  complete: boolean;
  /** Finish reason */
  finishReason?: string;
  /** Usage stats */
  usage?: UsageEventData;
}

// ============================================
// Stream Callback Types
// ============================================

export type OnTokenCallback = (token: string, index: number) => void;
export type OnToolCallCallback = (toolCall: ToolStartEventData) => void;
export type OnToolResultCallback = (result: ToolEndEventData) => void;
export type OnErrorCallback = (error: ErrorEventData) => void;
export type OnDoneCallback = (result: DoneEventData) => void;

export interface StreamCallbacks {
  onToken?: OnTokenCallback;
  onToolCall?: OnToolCallCallback;
  onToolResult?: OnToolResultCallback;
  onError?: OnErrorCallback;
  onDone?: OnDoneCallback;
}

/**
 * AI Streaming Types (Frontend)
 *
 * Type definitions for consuming Server-Sent Events (SSE) streaming
 * from the AI backend.
 *
 * @module lib/ai-assistant/streaming/types
 */

// ============================================
// SSE Event Types (matches backend)
// ============================================

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
// Event Payloads (matches backend)
// ============================================

export interface TokenEventData {
  t: string;
  i: number;
}

export interface MetadataEventData {
  model: string;
  provider: string;
  conversationId?: string;
  requestId: string;
}

export interface ToolStartEventData {
  id: string;
  name: string;
  index: number;
}

export interface ToolArgsEventData {
  id: string;
  delta: string;
}

export interface ToolEndEventData {
  id: string;
  name: string;
  result?: unknown;
  success: boolean;
  error?: string;
  executionTimeMs: number;
}

export interface ConfirmationEventData {
  requestId: string;
  action: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  parameters: Record<string, unknown>;
  expiresAt: string;
}

export interface UsageEventData {
  prompt: number;
  completion: number;
  total: number;
  cost?: number;
}

export interface DoneEventData {
  conversationId: string;
  finishReason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | 'error';
  contentLength: number;
}

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

export interface ErrorEventData {
  code: StreamErrorCode;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
  requestId: string;
}

export interface PingEventData {
  ts: number;
}

// ============================================
// Stream Request
// ============================================

export interface StreamChatRequest {
  message: string;
  conversationId?: string;
  systemPrompt?: string;
  provider?: 'openai' | 'anthropic' | 'groq' | 'bot-helper';
  model?: string;
  temperature?: number;
  maxTokens?: number;
  context?: {
    entityType?: 'lead' | 'customer' | 'opportunity' | 'task' | 'quote';
    entityId?: string;
    data?: Record<string, unknown>;
  };
  enableTools?: boolean;
}

// ============================================
// Stream State
// ============================================

export type StreamStatus =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'tool_calling'
  | 'confirming'
  | 'done'
  | 'error'
  | 'cancelled';

export interface StreamState {
  /** Current status */
  status: StreamStatus;
  /** Accumulated content */
  content: string;
  /** Token count */
  tokenCount: number;
  /** Current model */
  model?: string;
  /** Current provider */
  provider?: string;
  /** Conversation ID */
  conversationId?: string;
  /** Request ID */
  requestId?: string;
  /** Active tool calls */
  toolCalls: Map<string, {
    id: string;
    name: string;
    arguments: string;
    status: 'pending' | 'executing' | 'done' | 'error';
    result?: unknown;
    error?: string;
  }>;
  /** Pending confirmation */
  confirmation?: ConfirmationEventData;
  /** Usage statistics */
  usage?: UsageEventData;
  /** Error if any */
  error?: ErrorEventData;
  /** Finish reason */
  finishReason?: DoneEventData['finishReason'];
}

// ============================================
// Hook Return Types
// ============================================

export interface UseStreamingChatReturn {
  /** Current stream state */
  state: StreamState;
  /** Whether currently streaming */
  isStreaming: boolean;
  /** Whether waiting for confirmation */
  isPendingConfirmation: boolean;
  /** Start streaming a message */
  sendMessage: (request: Omit<StreamChatRequest, 'conversationId'>) => void;
  /** Cancel current stream */
  cancel: () => void;
  /** Confirm pending action */
  confirmAction: (decision: 'confirm' | 'cancel' | 'modify', modifications?: Record<string, unknown>) => void;
  /** Reset state */
  reset: () => void;
}

// ============================================
// Event Handlers
// ============================================

export interface StreamEventHandlers {
  onToken?: (token: string, index: number, content: string) => void;
  onMetadata?: (data: MetadataEventData) => void;
  onToolStart?: (data: ToolStartEventData) => void;
  onToolEnd?: (data: ToolEndEventData) => void;
  onConfirmation?: (data: ConfirmationEventData) => void;
  onUsage?: (data: UsageEventData) => void;
  onDone?: (data: DoneEventData) => void;
  onError?: (data: ErrorEventData) => void;
}

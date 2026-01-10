/**
 * SSE Writer Utility
 *
 * Type-safe Server-Sent Events writer for Fastify responses.
 * Handles formatting, encoding, keep-alive pings, and error handling.
 *
 * @module infrastructure/ai/streaming/sse-writer
 */

import type { FastifyReply } from 'fastify';
import type {
  SSEEventType,
  TokenEventData,
  MetadataEventData,
  ToolStartEventData,
  ToolArgsEventData,
  ToolEndEventData,
  ConfirmationEventData,
  UsageEventData,
  DoneEventData,
  ErrorEventData,
  PingEventData,
  StreamErrorCode,
} from './types';

// ============================================
// Constants
// ============================================

const PING_INTERVAL_MS = 15000; // 15 seconds
const DEFAULT_RETRY_MS = 3000;

// ============================================
// SSE Writer Class
// ============================================

/**
 * Server-Sent Events writer with type-safe event emission
 */
export class SSEWriter {
  private reply: FastifyReply;
  private pingInterval: NodeJS.Timeout | null = null;
  private tokenIndex = 0;
  private requestId: string;
  private closed = false;

  constructor(reply: FastifyReply, requestId: string) {
    this.reply = reply;
    this.requestId = requestId;
  }

  /**
   * Initialize SSE headers and start connection
   */
  async initialize(): Promise<void> {
    if (this.closed) return;

    // Set SSE headers
    this.reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable nginx buffering
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Start keep-alive pings
    this.startPingInterval();

    // Handle client disconnect
    this.reply.raw.on('close', () => {
      this.close();
    });
  }

  /**
   * Write a raw SSE event
   */
  private writeEvent<T>(event: SSEEventType, data: T): void {
    if (this.closed) return;

    try {
      const payload = JSON.stringify(data);
      const message = `event: ${event}\ndata: ${payload}\n\n`;
      this.reply.raw.write(message);
    } catch (error) {
      console.error('[SSEWriter] Failed to write event:', error);
    }
  }

  // ============================================
  // Public Event Methods
  // ============================================

  /**
   * Send a token event
   */
  token(content: string): void {
    const data: TokenEventData = {
      t: content,
      i: this.tokenIndex++,
    };
    this.writeEvent('token', data);
  }

  /**
   * Send metadata event (at stream start)
   */
  metadata(model: string, provider: string, conversationId?: string): void {
    const data: MetadataEventData = {
      model,
      provider,
      conversationId,
      requestId: this.requestId,
    };
    this.writeEvent('metadata', data);
  }

  /**
   * Send tool start event
   */
  toolStart(id: string, name: string, index: number): void {
    const data: ToolStartEventData = { id, name, index };
    this.writeEvent('tool_start', data);
  }

  /**
   * Send tool arguments delta event
   */
  toolArgs(id: string, delta: string): void {
    const data: ToolArgsEventData = { id, delta };
    this.writeEvent('tool_args', data);
  }

  /**
   * Send tool end event
   */
  toolEnd(
    id: string,
    name: string,
    result: unknown,
    success: boolean,
    executionTimeMs: number,
    error?: string
  ): void {
    const data: ToolEndEventData = {
      id,
      name,
      result,
      success,
      error,
      executionTimeMs,
    };
    this.writeEvent('tool_end', data);
  }

  /**
   * Send confirmation required event
   */
  confirmation(
    requestId: string,
    action: string,
    description: string,
    impact: 'low' | 'medium' | 'high' | 'critical',
    parameters: Record<string, unknown>,
    expiresAt: Date
  ): void {
    const data: ConfirmationEventData = {
      requestId,
      action,
      description,
      impact,
      parameters,
      expiresAt: expiresAt.toISOString(),
    };
    this.writeEvent('confirmation', data);
  }

  /**
   * Send usage statistics event
   */
  usage(prompt: number, completion: number, cost?: number): void {
    const data: UsageEventData = {
      prompt,
      completion,
      total: prompt + completion,
      cost,
    };
    this.writeEvent('usage', data);
  }

  /**
   * Send done event and close stream
   */
  done(
    conversationId: string,
    finishReason: DoneEventData['finishReason'],
    contentLength: number
  ): void {
    const data: DoneEventData = {
      conversationId,
      finishReason,
      contentLength,
    };
    this.writeEvent('done', data);
    this.close();
  }

  /**
   * Send error event and close stream
   */
  error(
    code: StreamErrorCode,
    message: string,
    retryable: boolean,
    retryAfterMs?: number
  ): void {
    const data: ErrorEventData = {
      code,
      message,
      retryable,
      retryAfterMs,
      requestId: this.requestId,
    };
    this.writeEvent('error', data);
    this.close();
  }

  /**
   * Send ping event (keep-alive)
   */
  private ping(): void {
    if (this.closed) return;
    const data: PingEventData = { ts: Date.now() };
    this.writeEvent('ping', data);
  }

  // ============================================
  // Lifecycle Methods
  // ============================================

  /**
   * Start keep-alive ping interval
   */
  private startPingInterval(): void {
    if (this.pingInterval) return;
    this.pingInterval = setInterval(() => {
      this.ping();
    }, PING_INTERVAL_MS);
  }

  /**
   * Stop keep-alive ping interval
   */
  private stopPingInterval(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval);
      this.pingInterval = null;
    }
  }

  /**
   * Close the SSE connection
   */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    this.stopPingInterval();

    try {
      this.reply.raw.end();
    } catch {
      // Ignore errors on close
    }
  }

  /**
   * Check if writer is closed
   */
  isClosed(): boolean {
    return this.closed;
  }

  /**
   * Get current token index
   */
  getTokenIndex(): number {
    return this.tokenIndex;
  }
}

// ============================================
// Factory Function
// ============================================

/**
 * Create a new SSE writer for a Fastify reply
 */
export function createSSEWriter(reply: FastifyReply, requestId: string): SSEWriter {
  return new SSEWriter(reply, requestId);
}

// ============================================
// Error Mapping
// ============================================

/**
 * Map common errors to SSE error codes
 */
export function mapErrorToSSE(error: Error): {
  code: StreamErrorCode;
  message: string;
  retryable: boolean;
  retryAfterMs?: number;
} {
  const errorMessage = error.message.toLowerCase();

  // Rate limiting
  if (errorMessage.includes('rate') || errorMessage.includes('429')) {
    return {
      code: 'RATE_LIMIT',
      message: 'Rate limit exceeded. Please wait before retrying.',
      retryable: true,
      retryAfterMs: 60000,
    };
  }

  // Context length
  if (errorMessage.includes('context') || errorMessage.includes('token')) {
    return {
      code: 'CONTEXT_LENGTH',
      message: 'Message too long. Please shorten your message.',
      retryable: false,
    };
  }

  // Timeout
  if (errorMessage.includes('timeout') || errorMessage.includes('timed out')) {
    return {
      code: 'TIMEOUT',
      message: 'Request timed out. Please try again.',
      retryable: true,
      retryAfterMs: DEFAULT_RETRY_MS,
    };
  }

  // Authentication
  if (errorMessage.includes('unauthorized') || errorMessage.includes('401')) {
    return {
      code: 'UNAUTHORIZED',
      message: 'Authentication required.',
      retryable: false,
    };
  }

  // Forbidden
  if (errorMessage.includes('forbidden') || errorMessage.includes('403')) {
    return {
      code: 'FORBIDDEN',
      message: 'Access denied.',
      retryable: false,
    };
  }

  // Provider errors
  if (
    errorMessage.includes('openai') ||
    errorMessage.includes('anthropic') ||
    errorMessage.includes('provider')
  ) {
    return {
      code: 'PROVIDER_ERROR',
      message: 'AI provider error. Please try again.',
      retryable: true,
      retryAfterMs: DEFAULT_RETRY_MS,
    };
  }

  // Default internal error
  return {
    code: 'INTERNAL_ERROR',
    message: 'An unexpected error occurred.',
    retryable: true,
    retryAfterMs: DEFAULT_RETRY_MS,
  };
}

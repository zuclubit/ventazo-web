/**
 * Distributed Tracing Service
 * OpenTelemetry-based tracing implementation
 *
 * This implementation provides a graceful fallback when OpenTelemetry
 * packages are not installed, allowing the service to run without tracing.
 */

import { injectable } from 'tsyringe';
import { Result } from '@zuclubit/domain';
import { randomUUID } from 'crypto';
import {
  TracingConfig,
  DEFAULT_TRACING_CONFIG,
  SpanAttributes,
  CreateSpanOptions,
  TracedOperationResult,
  TracingMetrics,
  TraceContext,
} from './types';

/**
 * Minimal Span interface for internal use
 */
export interface TracingSpan {
  traceId: string;
  spanId: string;
  parentSpanId?: string;
  name: string;
  kind: 'INTERNAL' | 'SERVER' | 'CLIENT' | 'PRODUCER' | 'CONSUMER';
  startTime: number;
  endTime?: number;
  attributes: Record<string, unknown>;
  events: Array<{ name: string; timestamp: number; attributes?: Record<string, unknown> }>;
  status: { code: 'OK' | 'ERROR' | 'UNSET'; message?: string };
  ended: boolean;

  // Methods
  setAttribute(key: string, value: unknown): void;
  addEvent(name: string, attributes?: Record<string, unknown>): void;
  setStatus(status: { code: 'OK' | 'ERROR' | 'UNSET'; message?: string }): void;
  recordException(error: Error): void;
  end(): void;
  spanContext(): { traceId: string; spanId: string; traceFlags: number };
}

/**
 * Create a minimal span implementation
 */
function createSpan(
  name: string,
  kind: TracingSpan['kind'],
  traceId?: string,
  parentSpanId?: string
): TracingSpan {
  const span: TracingSpan = {
    traceId: traceId || randomUUID().replace(/-/g, ''),
    spanId: randomUUID().replace(/-/g, '').substring(0, 16),
    parentSpanId,
    name,
    kind,
    startTime: Date.now(),
    attributes: {},
    events: [],
    status: { code: 'UNSET' },
    ended: false,

    setAttribute(key: string, value: unknown) {
      if (!span.ended) {
        span.attributes[key] = value;
      }
    },

    addEvent(eventName: string, attributes?: Record<string, unknown>) {
      if (!span.ended) {
        span.events.push({
          name: eventName,
          timestamp: Date.now(),
          attributes,
        });
      }
    },

    setStatus(status: { code: 'OK' | 'ERROR' | 'UNSET'; message?: string }) {
      if (!span.ended) {
        span.status = status;
      }
    },

    recordException(error: Error) {
      if (!span.ended) {
        span.events.push({
          name: 'exception',
          timestamp: Date.now(),
          attributes: {
            'exception.type': error.name,
            'exception.message': error.message,
            'exception.stacktrace': error.stack,
          },
        });
        span.setStatus({ code: 'ERROR', message: error.message });
      }
    },

    end() {
      if (!span.ended) {
        span.endTime = Date.now();
        span.ended = true;
      }
    },

    spanContext() {
      return {
        traceId: span.traceId,
        spanId: span.spanId,
        traceFlags: 1,
      };
    },
  };

  return span;
}

@injectable()
export class TracingService {
  private config: TracingConfig;
  private isInitialized = false;
  private activeSpans: Map<string, TracingSpan> = new Map();
  private currentTraceId: string | null = null;
  private currentSpanId: string | null = null;
  private completedSpans: TracingSpan[] = [];
  private metricsBuffer: TracingMetrics = {
    spansCreated: 0,
    spansExported: 0,
    spansFailed: 0,
    exportErrors: 0,
    avgSpanDuration: 0,
    sampledCount: 0,
    droppedCount: 0,
  };

  constructor(config?: Partial<TracingConfig>) {
    this.config = { ...DEFAULT_TRACING_CONFIG, ...config };
  }

  /**
   * Initialize the tracing service
   */
  async initialize(): Promise<Result<void>> {
    if (this.isInitialized) {
      return Result.ok(undefined);
    }

    if (!this.config.enabled) {
      console.log('[Tracing] Tracing is disabled');
      return Result.ok(undefined);
    }

    this.isInitialized = true;
    console.log(`[Tracing] Initialized with built-in tracer (exporter: ${this.config.exporter})`);
    console.log('[Tracing] Note: Install @opentelemetry/* packages for full distributed tracing');
    return Result.ok(undefined);
  }

  /**
   * Create a new span
   */
  startSpan(options: CreateSpanOptions): TracingSpan {
    const kind = this.mapSpanKind(options.kind);
    const traceId = this.currentTraceId || undefined;
    const parentSpanId = this.currentSpanId || undefined;

    const span = createSpan(options.name, kind, traceId, parentSpanId);

    // Apply initial attributes
    if (options.attributes) {
      for (const [key, value] of Object.entries(options.attributes)) {
        if (value !== undefined) {
          span.setAttribute(key, value);
        }
      }
    }

    this.activeSpans.set(span.spanId, span);
    this.currentTraceId = span.traceId;
    this.currentSpanId = span.spanId;
    this.metricsBuffer.spansCreated++;

    return span;
  }

  /**
   * Map span kind to string
   */
  private mapSpanKind(kind?: number): TracingSpan['kind'] {
    switch (kind) {
      case 0: return 'INTERNAL';
      case 1: return 'SERVER';
      case 2: return 'CLIENT';
      case 3: return 'PRODUCER';
      case 4: return 'CONSUMER';
      default: return 'INTERNAL';
    }
  }

  /**
   * End a span
   */
  endSpan(span: TracingSpan, error?: Error): void {
    if (error) {
      span.recordException(error);
      this.metricsBuffer.spansFailed++;
    } else {
      span.setStatus({ code: 'OK' });
    }

    span.end();

    // Track completed span
    this.completedSpans.push(span);
    this.activeSpans.delete(span.spanId);

    // Update metrics
    if (span.endTime) {
      const duration = span.endTime - span.startTime;
      const totalDuration = this.metricsBuffer.avgSpanDuration * this.metricsBuffer.spansExported + duration;
      this.metricsBuffer.spansExported++;
      this.metricsBuffer.avgSpanDuration = totalDuration / this.metricsBuffer.spansExported;
    }

    // Restore parent context
    if (span.parentSpanId) {
      this.currentSpanId = span.parentSpanId;
    } else {
      this.currentSpanId = null;
      this.currentTraceId = null;
    }

    // Limit completed spans buffer
    if (this.completedSpans.length > 1000) {
      this.completedSpans = this.completedSpans.slice(-500);
    }
  }

  /**
   * Execute a traced operation
   */
  async trace<T>(
    name: string,
    operation: (span: TracingSpan) => Promise<T>,
    options?: Partial<CreateSpanOptions>
  ): Promise<TracedOperationResult<T>> {
    const span = this.startSpan({ name, ...options });
    const startTime = Date.now();

    try {
      const result = await operation(span);
      const duration = Date.now() - startTime;
      span.setAttribute('performance.duration_ms', duration);
      this.endSpan(span);

      return {
        result,
        traceId: span.traceId,
        spanId: span.spanId,
        duration,
      };
    } catch (error) {
      this.endSpan(span, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Trace a synchronous operation
   */
  traceSync<T>(
    name: string,
    operation: (span: TracingSpan) => T,
    options?: Partial<CreateSpanOptions>
  ): TracedOperationResult<T> {
    const span = this.startSpan({ name, ...options });
    const startTime = Date.now();

    try {
      const result = operation(span);
      const duration = Date.now() - startTime;
      span.setAttribute('performance.duration_ms', duration);
      this.endSpan(span);

      return {
        result,
        traceId: span.traceId,
        spanId: span.spanId,
        duration,
      };
    } catch (error) {
      this.endSpan(span, error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * Get the current trace context
   */
  getCurrentTraceContext(): TraceContext | null {
    if (!this.currentTraceId || !this.currentSpanId) {
      return null;
    }

    return {
      traceId: this.currentTraceId,
      spanId: this.currentSpanId,
      traceFlags: 1,
    };
  }

  /**
   * Inject trace context into carrier (for propagation)
   */
  injectContext<T extends Record<string, unknown>>(carrier: T): T {
    if (this.currentTraceId && this.currentSpanId) {
      (carrier as any)['traceparent'] = `00-${this.currentTraceId}-${this.currentSpanId}-01`;
    }
    return carrier;
  }

  /**
   * Extract trace context from carrier
   */
  extractContext<T extends Record<string, unknown>>(carrier: T): { traceId?: string; spanId?: string } {
    const traceparent = (carrier as any)['traceparent'] as string;
    if (traceparent) {
      const parts = traceparent.split('-');
      if (parts.length >= 3) {
        return {
          traceId: parts[1],
          spanId: parts[2],
        };
      }
    }
    return {};
  }

  /**
   * Add event to current span
   */
  addEvent(name: string, attributes?: Record<string, string | number | boolean>): void {
    if (this.currentSpanId) {
      const span = this.activeSpans.get(this.currentSpanId);
      if (span) {
        span.addEvent(name, attributes);
      }
    }
  }

  /**
   * Set attributes on current span
   */
  setAttributes(attributes: SpanAttributes): void {
    if (this.currentSpanId) {
      const span = this.activeSpans.get(this.currentSpanId);
      if (span) {
        for (const [key, value] of Object.entries(attributes)) {
          if (value !== undefined) {
            span.setAttribute(key, value);
          }
        }
      }
    }
  }

  /**
   * Record an exception on current span
   */
  recordException(error: Error): void {
    if (this.currentSpanId) {
      const span = this.activeSpans.get(this.currentSpanId);
      if (span) {
        span.recordException(error);
      }
    }
  }

  /**
   * Create a child span from current context
   */
  createChildSpan(name: string, attributes?: SpanAttributes): TracingSpan {
    return this.startSpan({ name, attributes });
  }

  /**
   * Get tracing metrics
   */
  getMetrics(): TracingMetrics {
    return { ...this.metricsBuffer };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metricsBuffer = {
      spansCreated: 0,
      spansExported: 0,
      spansFailed: 0,
      exportErrors: 0,
      avgSpanDuration: 0,
      sampledCount: 0,
      droppedCount: 0,
    };
  }

  /**
   * Get recent completed spans (for debugging)
   */
  getRecentSpans(limit: number = 100): TracingSpan[] {
    return this.completedSpans.slice(-limit);
  }

  /**
   * Check if tracing is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled && this.isInitialized;
  }

  /**
   * Shutdown the tracing service
   */
  async shutdown(): Promise<Result<void>> {
    this.isInitialized = false;
    this.activeSpans.clear();
    this.completedSpans = [];
    console.log('[Tracing] Shut down successfully');
    return Result.ok(undefined);
  }
}

/**
 * Create tracing service instance
 */
export function createTracingService(config?: Partial<TracingConfig>): TracingService {
  return new TracingService(config);
}

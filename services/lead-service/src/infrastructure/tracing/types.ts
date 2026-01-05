/**
 * Distributed Tracing Types
 * OpenTelemetry-compatible tracing configuration and types
 */

// Span kinds matching OpenTelemetry specification
export enum SpanKind {
  INTERNAL = 0,
  SERVER = 1,
  CLIENT = 2,
  PRODUCER = 3,
  CONSUMER = 4,
}

// Span status codes matching OpenTelemetry specification
export enum SpanStatusCode {
  UNSET = 0,
  OK = 1,
  ERROR = 2,
}

/**
 * Trace exporter type
 */
export type TracingExporter =
  | 'console'
  | 'jaeger'
  | 'zipkin'
  | 'otlp'
  | 'datadog'
  | 'honeycomb'
  | 'none';

/**
 * Sampling strategy
 */
export type SamplingStrategy =
  | 'always_on'
  | 'always_off'
  | 'trace_id_ratio'
  | 'parent_based';

/**
 * Tracing configuration
 */
export interface TracingConfig {
  // Service identification
  serviceName: string;
  serviceVersion: string;
  environment: string;

  // Exporter configuration
  exporter: TracingExporter;
  exporterEndpoint?: string;
  exporterHeaders?: Record<string, string>;

  // Sampling configuration
  samplingStrategy: SamplingStrategy;
  samplingRatio: number;

  // Feature flags
  enabled: boolean;
  traceDatabaseQueries: boolean;
  traceHttpRequests: boolean;
  traceRedisOperations: boolean;
  traceMessageQueue: boolean;

  // Performance
  batchSize: number;
  exportInterval: number;

  // Baggage and context propagation
  propagators: ('w3c' | 'b3' | 'jaeger')[];

  // Additional resource attributes
  resourceAttributes?: Record<string, string>;
}

/**
 * Default tracing configuration
 */
export const DEFAULT_TRACING_CONFIG: TracingConfig = {
  serviceName: 'lead-service',
  serviceVersion: '1.0.0',
  environment: process.env.NODE_ENV || 'development',

  exporter: 'otlp',
  exporterEndpoint: process.env.OTEL_EXPORTER_OTLP_ENDPOINT || 'http://localhost:4318',

  samplingStrategy: 'trace_id_ratio',
  samplingRatio: 0.1, // 10% sampling in production

  enabled: true,
  traceDatabaseQueries: true,
  traceHttpRequests: true,
  traceRedisOperations: true,
  traceMessageQueue: true,

  batchSize: 512,
  exportInterval: 5000, // 5 seconds

  propagators: ['w3c', 'b3'],
};

/**
 * Span attributes for common operations
 */
export interface SpanAttributes {
  // HTTP attributes
  'http.method'?: string;
  'http.url'?: string;
  'http.target'?: string;
  'http.route'?: string;
  'http.status_code'?: number;
  'http.request_content_length'?: number;
  'http.response_content_length'?: number;
  'http.user_agent'?: string;
  'http.client_ip'?: string;

  // Database attributes
  'db.system'?: string;
  'db.name'?: string;
  'db.statement'?: string;
  'db.operation'?: string;
  'db.sql.table'?: string;

  // Message queue attributes
  'messaging.system'?: string;
  'messaging.destination'?: string;
  'messaging.destination_kind'?: string;
  'messaging.message_id'?: string;

  // Error attributes
  'error'?: boolean;
  'error.type'?: string;
  'error.message'?: string;
  'error.stack'?: string;

  // Custom CRM attributes
  'crm.tenant_id'?: string;
  'crm.user_id'?: string;
  'crm.operation'?: string;
  'crm.entity_type'?: string;
  'crm.entity_id'?: string;
  'crm.correlation_id'?: string;

  // Performance metrics
  'performance.duration_ms'?: number;
  'performance.db_query_count'?: number;
  'performance.cache_hit'?: boolean;

  [key: string]: string | number | boolean | undefined;
}

/**
 * Trace context for propagation
 */
export interface TraceContext {
  traceId: string;
  spanId: string;
  traceFlags: number;
  traceState?: string;
  baggage?: Record<string, string>;
}

/**
 * Span event
 */
export interface SpanEvent {
  name: string;
  timestamp?: number;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Span link
 */
export interface SpanLink {
  traceId: string;
  spanId: string;
  attributes?: Record<string, string | number | boolean>;
}

/**
 * Span creation options
 */
export interface CreateSpanOptions {
  name: string;
  kind?: SpanKind;
  attributes?: SpanAttributes;
  links?: SpanLink[];
  parent?: Context;
}

/**
 * Traced operation result
 */
export interface TracedOperationResult<T> {
  result: T;
  traceId: string;
  spanId: string;
  duration: number;
}

/**
 * Metrics for tracing
 */
export interface TracingMetrics {
  spansCreated: number;
  spansExported: number;
  spansFailed: number;
  exportErrors: number;
  avgSpanDuration: number;
  sampledCount: number;
  droppedCount: number;
}

/**
 * HTTP instrumentation options
 */
export interface HttpInstrumentationOptions {
  ignoreIncomingPaths?: string[];
  ignoreOutgoingUrls?: string[];
  requestHook?: (span: unknown, request: unknown) => void;
  responseHook?: (span: unknown, response: unknown) => void;
}

/**
 * Database instrumentation options
 */
export interface DbInstrumentationOptions {
  enhancedDatabaseReporting?: boolean;
  sanitizeSqlStatements?: boolean;
  maxQueryLength?: number;
}

/**
 * Standard span names for CRM operations
 */
export const SpanNames = {
  // HTTP operations
  HTTP_REQUEST: 'http.request',
  HTTP_RESPONSE: 'http.response',

  // Database operations
  DB_QUERY: 'db.query',
  DB_CONNECT: 'db.connect',
  DB_TRANSACTION: 'db.transaction',

  // Cache operations
  CACHE_GET: 'cache.get',
  CACHE_SET: 'cache.set',
  CACHE_DELETE: 'cache.delete',

  // Message queue operations
  MQ_PUBLISH: 'mq.publish',
  MQ_CONSUME: 'mq.consume',

  // CRM domain operations
  LEAD_CREATE: 'crm.lead.create',
  LEAD_UPDATE: 'crm.lead.update',
  LEAD_DELETE: 'crm.lead.delete',
  LEAD_GET: 'crm.lead.get',
  LEAD_SEARCH: 'crm.lead.search',
  LEAD_SCORE: 'crm.lead.score',
  LEAD_QUALIFY: 'crm.lead.qualify',

  PIPELINE_MOVE: 'crm.pipeline.move',
  PIPELINE_STAGE_CHANGE: 'crm.pipeline.stage_change',

  WEBHOOK_TRIGGER: 'crm.webhook.trigger',
  WEBHOOK_DELIVER: 'crm.webhook.deliver',

  WORKFLOW_EXECUTE: 'crm.workflow.execute',
  WORKFLOW_STEP: 'crm.workflow.step',

  AI_SCORE: 'crm.ai.score',
  AI_PREDICT: 'crm.ai.predict',
  AI_ENRICH: 'crm.ai.enrich',

  // External service calls
  EXTERNAL_API_CALL: 'external.api.call',
  EMAIL_SEND: 'external.email.send',
  SMS_SEND: 'external.sms.send',
};

/**
 * Semantic conventions for attributes
 */
export const SemanticAttributes = {
  // Service attributes
  SERVICE_NAME: 'service.name',
  SERVICE_VERSION: 'service.version',
  SERVICE_INSTANCE_ID: 'service.instance.id',

  // Deployment attributes
  DEPLOYMENT_ENVIRONMENT: 'deployment.environment',

  // Request context
  TENANT_ID: 'crm.tenant_id',
  USER_ID: 'crm.user_id',
  CORRELATION_ID: 'crm.correlation_id',
  REQUEST_ID: 'crm.request_id',

  // Operation metadata
  OPERATION_NAME: 'crm.operation.name',
  OPERATION_TYPE: 'crm.operation.type',
  ENTITY_TYPE: 'crm.entity.type',
  ENTITY_ID: 'crm.entity.id',

  // Result metadata
  RESULT_COUNT: 'crm.result.count',
  CACHE_HIT: 'crm.cache.hit',
  QUERY_COUNT: 'crm.query.count',
};

/**
 * Error types for tracing
 */
export enum TracingErrorType {
  VALIDATION_ERROR = 'validation_error',
  NOT_FOUND = 'not_found',
  UNAUTHORIZED = 'unauthorized',
  FORBIDDEN = 'forbidden',
  CONFLICT = 'conflict',
  INTERNAL_ERROR = 'internal_error',
  EXTERNAL_SERVICE_ERROR = 'external_service_error',
  TIMEOUT = 'timeout',
  RATE_LIMITED = 'rate_limited',
}

/**
 * Map error to tracing error type
 */
export function mapErrorToType(error: Error, statusCode?: number): TracingErrorType {
  if (statusCode) {
    switch (statusCode) {
      case 400:
        return TracingErrorType.VALIDATION_ERROR;
      case 401:
        return TracingErrorType.UNAUTHORIZED;
      case 403:
        return TracingErrorType.FORBIDDEN;
      case 404:
        return TracingErrorType.NOT_FOUND;
      case 409:
        return TracingErrorType.CONFLICT;
      case 429:
        return TracingErrorType.RATE_LIMITED;
      case 504:
        return TracingErrorType.TIMEOUT;
    }
  }

  const message = error.message.toLowerCase();
  if (message.includes('timeout')) return TracingErrorType.TIMEOUT;
  if (message.includes('not found')) return TracingErrorType.NOT_FOUND;
  if (message.includes('unauthorized')) return TracingErrorType.UNAUTHORIZED;
  if (message.includes('forbidden')) return TracingErrorType.FORBIDDEN;
  if (message.includes('validation')) return TracingErrorType.VALIDATION_ERROR;

  return TracingErrorType.INTERNAL_ERROR;
}

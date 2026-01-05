/**
 * Base Domain Event interface
 * Follows CloudEvents 1.0 specification
 */
export interface DomainEvent<T = unknown> {
  /** Event type (e.g., "Lead.Created") */
  type: string;
  /** Event data payload */
  data: T;
  /** Event ID (UUID v4) */
  id?: string;
  /** Source service/aggregate */
  source?: string;
  /** Timestamp (ISO 8601) */
  timestamp?: string;
  /** Tenant ID for multi-tenancy */
  tenantId?: string;
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** Causation ID (ID of the event that caused this one) */
  causationId?: string;
  /** User ID who triggered the event */
  userId?: string;
  /** Event metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Event metadata for tracing and auditing
 */
export interface EventMetadata {
  /** Correlation ID for distributed tracing */
  correlationId?: string;
  /** Causation ID */
  causationId?: string;
  /** User who triggered the event */
  userId?: string;
  /** Tenant ID */
  tenantId?: string;
  /** Additional metadata */
  [key: string]: unknown;
}

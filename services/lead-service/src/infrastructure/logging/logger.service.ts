/**
 * Logger Service
 *
 * Structured logging service with correlation ID support for distributed tracing.
 * Built on top of Pino for high performance JSON logging.
 *
 * @version 1.0.0
 * @module infrastructure/logging
 */

import pino, { Logger as PinoLogger } from 'pino';
import { singleton } from 'tsyringe';

/**
 * Log context for structured logging
 */
export interface LogContext {
  correlationId?: string;
  tenantId?: string;
  userId?: string;
  entityType?: string;
  entityId?: string;
  operation?: string;
  duration?: number;
  [key: string]: unknown;
}

/**
 * Logger Service
 *
 * Provides structured logging with:
 * - Correlation ID tracking for distributed tracing
 * - Multi-tenant context
 * - Operation timing
 * - Configurable log levels
 */
@singleton()
export class LoggerService {
  private readonly logger: PinoLogger;

  constructor() {
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, use standard JSON logging (no pino-pretty transport)
    // pino-pretty is only used for local development
    this.logger = pino({
      level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
      formatters: {
        level: (label) => ({ level: label }),
        bindings: (bindings) => ({
          pid: bindings.pid,
          hostname: bindings.hostname,
          service: 'lead-service',
        }),
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      // NOTE: pino-pretty transport removed to avoid issues in production bundling
      // For local development, pipe output: node app.js | npx pino-pretty
    });
  }

  /**
   * Create a child logger with default context
   */
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this.logger.child(context));
  }

  /**
   * Log at info level
   */
  info(message: string, context?: LogContext): void {
    if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
  }

  /**
   * Log at debug level
   */
  debug(message: string, context?: LogContext): void {
    if (context) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(message);
    }
  }

  /**
   * Log at warn level
   */
  warn(message: string, context?: LogContext): void {
    if (context) {
      this.logger.warn(context, message);
    } else {
      this.logger.warn(message);
    }
  }

  /**
   * Log at error level
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error
        ? {
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack,
            },
          }
        : { error }),
    };
    this.logger.error(errorContext, message);
  }

  /**
   * Log Kanban move operation
   */
  logMove(
    correlationId: string,
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    fromStage: string,
    toStage: string,
    success: boolean,
    duration: number,
    metadata?: Record<string, unknown>
  ): void {
    const context: LogContext = {
      correlationId,
      tenantId,
      userId,
      entityType,
      entityId,
      operation: 'kanban:move',
      fromStage,
      toStage,
      success,
      duration,
      ...metadata,
    };

    if (success) {
      this.logger.info(
        context,
        `Kanban move: ${entityType}/${entityId} ${fromStage} → ${toStage}`
      );
    } else {
      this.logger.warn(
        context,
        `Kanban move failed: ${entityType}/${entityId} ${fromStage} → ${toStage}`
      );
    }
  }

  /**
   * Log Kanban undo/redo operation
   */
  logUndoRedo(
    correlationId: string,
    tenantId: string,
    userId: string,
    entityType: string,
    operation: 'undo' | 'redo',
    moveId: string,
    success: boolean
  ): void {
    const context: LogContext = {
      correlationId,
      tenantId,
      userId,
      entityType,
      operation: `kanban:${operation}`,
      moveId,
      success,
    };

    if (success) {
      this.logger.info(context, `Kanban ${operation} completed: ${moveId}`);
    } else {
      this.logger.warn(context, `Kanban ${operation} failed: ${moveId}`);
    }
  }

  /**
   * Log lock acquisition/release
   */
  logLock(
    correlationId: string,
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string,
    action: 'acquire' | 'release' | 'conflict',
    success: boolean,
    conflictingUser?: string
  ): void {
    const context: LogContext = {
      correlationId,
      tenantId,
      userId,
      entityType,
      entityId,
      operation: `kanban:lock:${action}`,
      success,
      ...(conflictingUser && { conflictingUser }),
    };

    if (action === 'conflict') {
      this.logger.warn(
        context,
        `Lock conflict: ${entityType}/${entityId} held by ${conflictingUser}`
      );
    } else if (success) {
      this.logger.debug(context, `Lock ${action}: ${entityType}/${entityId}`);
    } else {
      this.logger.warn(context, `Lock ${action} failed: ${entityType}/${entityId}`);
    }
  }

  /**
   * Log configuration change
   */
  logConfigChange(
    correlationId: string,
    tenantId: string,
    entityType: string,
    changes: string[],
    version: number
  ): void {
    this.logger.info(
      {
        correlationId,
        tenantId,
        entityType,
        operation: 'kanban:config:update',
        changes,
        version,
      },
      `Kanban config updated: ${entityType} v${version}`
    );
  }

  /**
   * Log metrics calculation
   */
  logMetricsCalculation(
    correlationId: string,
    tenantId: string,
    entityType: string,
    periodType: string,
    stageCount: number,
    duration: number
  ): void {
    this.logger.info(
      {
        correlationId,
        tenantId,
        entityType,
        operation: 'kanban:metrics:calculate',
        periodType,
        stageCount,
        duration,
      },
      `Kanban metrics calculated: ${entityType} ${periodType} (${stageCount} stages)`
    );
  }

  /**
   * Log consistency verification
   */
  logConsistencyCheck(
    correlationId: string,
    tenantId: string,
    entityType: string,
    isConsistent: boolean,
    inconsistencies: number,
    duration: number
  ): void {
    const context: LogContext = {
      correlationId,
      tenantId,
      entityType,
      operation: 'kanban:consistency:verify',
      isConsistent,
      inconsistencies,
      duration,
    };

    if (isConsistent) {
      this.logger.info(context, `Kanban consistency verified: ${entityType} OK`);
    } else {
      this.logger.warn(
        context,
        `Kanban inconsistencies found: ${entityType} (${inconsistencies} issues)`
      );
    }
  }

  /**
   * Log WIP limit warning
   */
  logWIPWarning(
    correlationId: string,
    tenantId: string,
    entityType: string,
    stageId: string,
    current: number,
    limit: number,
    level: 'soft' | 'hard'
  ): void {
    this.logger.warn(
      {
        correlationId,
        tenantId,
        entityType,
        stageId,
        operation: 'kanban:wip:exceeded',
        current,
        limit,
        level,
      },
      `WIP ${level} limit exceeded: ${stageId} (${current}/${limit})`
    );
  }
}

/**
 * Child Logger with default context
 */
class ChildLogger {
  constructor(private readonly logger: PinoLogger) {}

  info(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.info(context, message);
    } else {
      this.logger.info(message);
    }
  }

  debug(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.debug(context, message);
    } else {
      this.logger.debug(message);
    }
  }

  warn(message: string, context?: Record<string, unknown>): void {
    if (context) {
      this.logger.warn(context, message);
    } else {
      this.logger.warn(message);
    }
  }

  error(message: string, error?: Error | unknown, context?: Record<string, unknown>): void {
    const errorContext = {
      ...context,
      ...(error instanceof Error
        ? {
            error: {
              message: error.message,
              name: error.name,
              stack: error.stack,
            },
          }
        : { error }),
    };
    this.logger.error(errorContext, message);
  }
}

export { ChildLogger };

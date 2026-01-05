/**
 * Audit Decorators
 * TypeScript decorators for automatic audit logging
 */
import { container } from 'tsyringe';
import { AuditService } from './audit.service';
import {
  AuditDecoratorOptions,
  AuditContext,
  AuditAction,
  AuditEntityType,
  AuditChange,
} from './types';

/**
 * Global audit context storage (per async context)
 */
let currentAuditContext: AuditContext | null = null;

/**
 * Set the current audit context
 */
export function setAuditContext(context: AuditContext): void {
  currentAuditContext = context;
}

/**
 * Get the current audit context
 */
export function getAuditContext(): AuditContext | null {
  return currentAuditContext;
}

/**
 * Clear the current audit context
 */
export function clearAuditContext(): void {
  currentAuditContext = null;
}

/**
 * Audited decorator
 * Automatically logs method calls to the audit service
 *
 * @example
 * ```typescript
 * @Audited({
 *   action: 'update',
 *   entityType: 'lead',
 *   getEntityId: (tenantId, leadId) => leadId,
 * })
 * async updateLead(tenantId: string, leadId: string, data: UpdateData): Promise<Lead> {
 *   // ...
 * }
 * ```
 */
export function Audited(options: AuditDecoratorOptions) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (...args: unknown[]) {
      // Check condition
      if (options.condition && !options.condition(...args)) {
        return originalMethod.apply(this, args);
      }

      // Get audit service
      let auditService: AuditService;
      try {
        auditService = container.resolve(AuditService);
      } catch {
        // Audit service not available, execute method directly
        return originalMethod.apply(this, args);
      }

      // Get audit context
      const context = getAuditContext();
      if (!context) {
        // No context, execute without auditing
        return originalMethod.apply(this, args);
      }

      const startTime = Date.now();
      let success = true;
      let errorMessage: string | undefined;
      let result: unknown;

      try {
        result = await originalMethod.apply(this, args);
        return result;
      } catch (error) {
        success = false;
        errorMessage = (error as Error).message;
        throw error;
      } finally {
        // Get entity info
        const entityId = options.getEntityId
          ? options.getEntityId(...args)
          : undefined;
        const entityName = options.getEntityName
          ? options.getEntityName(...args)
          : undefined;

        // Get changes
        let changes: AuditChange[] | undefined;
        if (options.getChanges) {
          try {
            changes = options.getChanges(args, result);
          } catch {
            // Ignore change calculation errors
          }
        }

        // Get metadata
        let metadata: Record<string, unknown> | undefined;
        if (options.metadata) {
          metadata =
            typeof options.metadata === 'function'
              ? options.metadata(...args)
              : options.metadata;
        }

        // Log audit entry
        await auditService.log({
          ...context,
          action: options.action,
          entityType: options.entityType,
          entityId,
          entityName,
          changes,
          metadata: {
            ...metadata,
            method: propertyKey,
            class: target.constructor.name,
          },
          success,
          errorMessage,
          duration: Date.now() - startTime,
          severity: options.severity,
        });
      }
    };

    return descriptor;
  };
}

/**
 * AuditCreate decorator - shorthand for create actions
 */
export function AuditCreate(
  entityType: AuditEntityType,
  options?: Partial<Omit<AuditDecoratorOptions, 'action' | 'entityType'>>
) {
  return Audited({
    action: 'create',
    entityType,
    ...options,
  });
}

/**
 * AuditUpdate decorator - shorthand for update actions
 */
export function AuditUpdate(
  entityType: AuditEntityType,
  options?: Partial<Omit<AuditDecoratorOptions, 'action' | 'entityType'>>
) {
  return Audited({
    action: 'update',
    entityType,
    ...options,
  });
}

/**
 * AuditDelete decorator - shorthand for delete actions
 */
export function AuditDelete(
  entityType: AuditEntityType,
  options?: Partial<Omit<AuditDecoratorOptions, 'action' | 'entityType'>>
) {
  return Audited({
    action: 'delete',
    entityType,
    severity: 'medium',
    ...options,
  });
}

/**
 * AuditRead decorator - shorthand for read/data access actions
 */
export function AuditRead(
  entityType: AuditEntityType,
  options?: Partial<Omit<AuditDecoratorOptions, 'action' | 'entityType'>>
) {
  return Audited({
    action: 'data_access',
    entityType,
    ...options,
  });
}

/**
 * AuditStatusChange decorator - shorthand for status change actions
 */
export function AuditStatusChange(
  entityType: AuditEntityType,
  options?: Partial<Omit<AuditDecoratorOptions, 'action' | 'entityType'>>
) {
  return Audited({
    action: 'status_change',
    entityType,
    severity: 'medium',
    ...options,
  });
}

/**
 * AuditSensitive decorator - for operations on sensitive data
 */
export function AuditSensitive(
  action: AuditAction,
  entityType: AuditEntityType,
  options?: Partial<Omit<AuditDecoratorOptions, 'action' | 'entityType'>>
) {
  return Audited({
    action,
    entityType,
    severity: 'critical',
    ...options,
  });
}

/**
 * Create an audit context middleware for Fastify
 */
export function createAuditMiddleware() {
  return async (request: any, reply: any) => {
    const context: AuditContext = {
      tenantId: request.headers['x-tenant-id'] || 'default',
      userId: request.user?.id || 'anonymous',
      userName: request.user?.name,
      userEmail: request.user?.email,
      userRole: request.user?.role,
      ipAddress: request.ip || request.headers['x-forwarded-for'],
      userAgent: request.headers['user-agent'],
      sessionId: request.headers['x-session-id'],
      correlationId: request.headers['x-correlation-id'] || request.id,
      source: 'api',
    };

    setAuditContext(context);

    // Clear context after request
    reply.raw.on('finish', () => {
      clearAuditContext();
    });
  };
}

/**
 * Audit context wrapper for async operations
 */
export async function withAuditContext<T>(
  context: AuditContext,
  fn: () => Promise<T>
): Promise<T> {
  const previousContext = currentAuditContext;
  setAuditContext(context);

  try {
    return await fn();
  } finally {
    if (previousContext) {
      setAuditContext(previousContext);
    } else {
      clearAuditContext();
    }
  }
}

/**
 * Helper to create a system audit context
 */
export function createSystemContext(
  tenantId: string,
  operationName: string
): AuditContext {
  return {
    tenantId,
    userId: 'system',
    userName: 'System',
    source: 'system',
    correlationId: `system-${operationName}-${Date.now()}`,
  };
}

/**
 * Helper to create a batch operation audit context
 */
export function createBatchContext(
  tenantId: string,
  userId: string,
  batchId: string
): AuditContext {
  return {
    tenantId,
    userId,
    source: 'batch',
    correlationId: batchId,
  };
}

/**
 * Helper to create an integration audit context
 */
export function createIntegrationContext(
  tenantId: string,
  integrationId: string,
  integrationName: string
): AuditContext {
  return {
    tenantId,
    userId: `integration:${integrationId}`,
    userName: integrationName,
    source: 'integration',
    correlationId: `integration-${integrationId}-${Date.now()}`,
  };
}

/**
 * Audit Module
 * Comprehensive audit logging for all CRM operations
 */

export { AuditService } from './audit.service';
export { auditRoutes } from './audit.routes';
export {
  Audited,
  AuditCreate,
  AuditUpdate,
  AuditDelete,
  AuditRead,
  AuditStatusChange,
  AuditSensitive,
  setAuditContext,
  getAuditContext,
  clearAuditContext,
  createAuditMiddleware,
  withAuditContext,
  createSystemContext,
  createBatchContext,
  createIntegrationContext,
} from './audit-decorators';
export * from './types';

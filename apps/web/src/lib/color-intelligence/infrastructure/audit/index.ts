// ============================================
// Audit Module - Public Exports
// Phase 5: Regulatory & Compliance Layer
// ============================================

// Re-export domain types for convenience
export {
  type AuditEntryId,
  createAuditEntryId,
} from '../../domain/specification/types';

export {
  AuditTrailService,
  createAuditTrailService,
  type IAuditStoragePort,
  type AuditTrailConfig,
} from './AuditTrailService';

export {
  InMemoryAuditStorage,
  createInMemoryAuditStorage,
} from './InMemoryAuditStorage';

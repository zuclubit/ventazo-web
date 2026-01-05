/**
 * @fileoverview UX Entities Index
 * @module ui-kit/domain/ux/entities
 */

export {
  UXDecision,
  DEFAULT_CONFIG,
} from './UXDecision';
export type {
  DecisionToken,
  TokenRequest,
  DecisionConfig,
  DecisionSnapshot,
} from './UXDecision';

// NOTE: PerceptualPolicy and DecisionAuditEntry were removed as they don't exist
// in UXDecision.ts. Import from domain/types for policy types.

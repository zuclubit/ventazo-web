// ============================================
// Perceptual Specification Domain - Phase 5
// Standardization, Ecosystem & Perceptual Authority
// ============================================
//
// This module provides the formal specification layer that
// transforms Color Intelligence from a library into a
// referenceable standard.
//
// Key Capabilities:
// - Formal specification definitions
// - Conformance validation & certification
// - Plugin & extension ecosystem
// - Regulatory audit readiness
// - Reproducible decision chains
//
// Version: 5.0.0
//
// ============================================

// ============================================
// Re-export all types
// ============================================

export * from './types';

// ============================================
// Re-export reference implementations & golden sets
// ============================================

export * from './reference';

// ============================================
// Version Information
// ============================================

export const SPECIFICATION_VERSION = '5.0.0';
export const SPECIFICATION_DATE = '2026-01-04';

/**
 * Get specification module information
 */
export function getSpecificationInfo(): {
  version: string;
  date: string;
  capabilities: ReadonlyArray<string>;
} {
  return {
    version: SPECIFICATION_VERSION,
    date: SPECIFICATION_DATE,
    capabilities: [
      'perceptual-specification',
      'conformance-validation',
      'certification-engine',
      'plugin-ecosystem',
      'audit-trail',
      'reproducibility',
      'regulatory-compliance',
    ],
  };
}

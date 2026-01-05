/**
 * @fileoverview Theme Hooks Public API
 *
 * Exports all React hooks for theme and governance integration.
 *
 * @module web/lib/theme/hooks
 */

// Conformance Validation Hooks
export {
  useColorConformance,
  useBatchConformance,
  useLiveConformance,
  useComponentAudit,
  useTokenConformance,
  useAccessibilityScore,
} from './useConformance';

export type {
  WcagLevel,
  TextSize,
  ConformanceResult,
  TokenConformanceResult,
  ComponentAuditResult,
} from './useConformance';

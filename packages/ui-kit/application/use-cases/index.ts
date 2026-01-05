/**
 * @fileoverview Use Cases Index
 *
 * Exporta todos los use cases del Application Layer.
 *
 * Use cases implementados:
 * - GenerateComponentTokens: Genera tokens para componentes
 * - EvaluateComponentAccessibility: Evalúa accesibilidad WCAG/APCA
 * - ApplyPerceptualPolicy: Aplica políticas perceptuales
 * - ExportDesignTokens: Exporta tokens a múltiples formatos
 * - AuditVisualDecisions: Audita decisiones visuales
 *
 * @module ui-kit/application/use-cases
 */

// ─────────────────────────────────────────────────────────────────────────────
// USE CASES
// ─────────────────────────────────────────────────────────────────────────────

export {
  GenerateComponentTokens,
  type GenerateComponentTokensInput,
  type GenerateComponentTokensOutput,
} from './GenerateComponentTokens';

export {
  EvaluateComponentAccessibility,
  type EvaluateAccessibilityInput,
  type EvaluateAccessibilityOutput,
  type ColorPair,
  type PairEvaluationResult,
  type AccessibilityViolation,
} from './EvaluateComponentAccessibility';

export {
  ApplyPerceptualPolicy,
  type ApplyPerceptualPolicyInput,
  type ApplyPerceptualPolicyOutput,
  type LightnessPolicy,
  type ChromaPolicy,
  type ContrastPolicy,
  type HarmonyPolicy,
  PRESET_POLICIES,
} from './ApplyPerceptualPolicy';

// NOTE: PerceptualPolicy and PolicyViolation are NOT re-exported here to avoid
// ambiguity with domain/types definitions. Import from domain/types for canonical types,
// or directly from './ApplyPerceptualPolicy' for use-case-specific types.

export {
  ExportDesignTokens,
  type ExportDesignTokensInput,
  type ExportDesignTokensOutput,
  type TokenTransformation,
  type ExportPreset,
  type FormatExportResult,
  type ExportManifest,
  EXPORT_PRESETS,
} from './ExportDesignTokens';

export {
  AuditVisualDecisions,
  type AuditVisualDecisionsInput,
  type AuditVisualDecisionsOutput,
  type AuditType,
  type ReportDetail,
  type AccessibilityAuditConfig,
  type ColorDecisionAuditConfig,
  type TokenUsageAuditConfig,
  type PerformanceAuditConfig,
  type AccessibilityAuditResult,
  type ColorDecisionAuditResult,
  type TokenUsageAuditResult,
  type PerformanceAuditResult,
  type QualityScore,
} from './AuditVisualDecisions';

// NOTE: ReportFormat is NOT re-exported here to avoid ambiguity with
// validation/report-generator. Import from validation for canonical type,
// or directly from './AuditVisualDecisions' for use-case-specific type.

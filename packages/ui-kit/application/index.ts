/**
 * @fileoverview Application Layer - UI Kit
 *
 * Capa de aplicación del sistema de diseño gobernado por Color Intelligence.
 *
 * Esta capa contiene:
 * - Use Cases: Casos de uso que orquestan la lógica de dominio
 * - Ports: Interfaces para comunicación con el mundo exterior
 *   - Inbound: Interfaces expuestas por el dominio
 *   - Outbound: Interfaces requeridas por el dominio
 *
 * Principios de diseño:
 * 1. Los use cases son el punto de entrada a la lógica de negocio
 * 2. Los ports definen contratos estables para adaptadores
 * 3. La capa es agnóstica a frameworks y UI
 * 4. Todos los errores se manejan con Result<T,E>
 *
 * @module ui-kit/application
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import {
 *   GenerateComponentTokens,
 *   EvaluateComponentAccessibility,
 *   ApplyPerceptualPolicy,
 *   ExportDesignTokens,
 *   AuditVisualDecisions,
 *   PRESET_POLICIES,
 *   EXPORT_PRESETS,
 * } from '@ui-kit/application';
 *
 * // Generate tokens for a button component
 * const generateTokens = new GenerateComponentTokens();
 * const tokensResult = await generateTokens.execute({
 *   componentName: 'button',
 *   brandColorHex: '#3B82F6',
 *   intent: 'action',
 *   variants: ['solid', 'outline', 'ghost'],
 *   states: ['idle', 'hover', 'active', 'disabled'],
 * });
 *
 * // Evaluate accessibility
 * const evaluateA11y = new EvaluateComponentAccessibility();
 * const a11yResult = await evaluateA11y.execute({
 *   tokenCollection: tokensResult.value?.collection,
 *   requiredWcagLevel: 'AA',
 *   requiredApcaLevel: 60,
 * });
 *
 * // Apply perceptual policy
 * const applyPolicy = new ApplyPerceptualPolicy();
 * const policyResult = await applyPolicy.execute({
 *   collection: tokensResult.value?.collection!,
 *   policy: PRESET_POLICIES.wcagAA,
 *   applyCorrections: true,
 * });
 *
 * // Export tokens
 * const exportTokens = new ExportDesignTokens(exporter);
 * const exportResult = await exportTokens.execute({
 *   collection: policyResult.value?.correctedCollection!,
 *   preset: 'web',
 *   generateManifest: true,
 * });
 * ```
 */

// =============================================================================
// USE CASES
// =============================================================================

export * from './use-cases';

// =============================================================================
// PORTS
// =============================================================================

export * from './ports';

// =============================================================================
// CONVENIENCE RE-EXPORTS
// =============================================================================

// Use Cases
export { GenerateComponentTokens } from './use-cases/GenerateComponentTokens';
export { EvaluateComponentAccessibility } from './use-cases/EvaluateComponentAccessibility';
export { ApplyPerceptualPolicy, PRESET_POLICIES } from './use-cases/ApplyPerceptualPolicy';
export { ExportDesignTokens, EXPORT_PRESETS } from './use-cases/ExportDesignTokens';
export { AuditVisualDecisions } from './use-cases/AuditVisualDecisions';

// Enterprise Governance Use Case
export {
  EnforceEnterpriseGovernance,
  checkColorGovernance,
  checkAccessibilityGovernance,
  type GovernanceConfig,
  type GovernanceEnforcementInput,
  type GovernanceEnforcementOutput,
  type GovernanceSubject,
  type GovernanceSummary,
} from './use-cases/EnforceEnterpriseGovernance';

// Inbound Ports
export type { ColorDecisionPort } from './ports/inbound/ColorDecisionPort';
export type {
  EnterpriseGovernancePort,
  ColorGovernanceInput,
  AccessibilityGovernanceInput,
  TokenGovernanceInput,
  ThemeGovernanceInput,
  ComponentGovernanceInput,
  GovernanceResult,
  GovernanceViolation,
  GovernanceReport,
} from './ports/inbound/EnterpriseGovernancePort';

// Outbound Ports
export type { TokenRepositoryPort } from './ports/outbound/TokenRepositoryPort';
export type { AuditPort } from './ports/outbound/AuditPort';
export type { ThemeAdapterPort } from './ports/outbound/ThemeAdapterPort';
export type { ExporterPort } from './ports/outbound/ExporterPort';
export type {
  GovernanceAuditPort,
  GovernanceDecision,
  AuditContext,
  AutoFixAttempt,
  AuditFilter,
  AuditEntry,
  AuditReport,
} from './ports/outbound/GovernanceAuditPort';
export {
  NoOpAuditAdapter,
  ConsoleAuditAdapter,
  noOpAuditAdapter,
  consoleAuditAdapter,
} from './ports/outbound/GovernanceAuditPort';

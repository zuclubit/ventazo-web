/**
 * @fileoverview UI Kit - Color Intelligence Design System
 *
 * Sistema de diseño gobernado por Color Intelligence con arquitectura hexagonal.
 *
 * Este paquete expone:
 * - Domain Layer: Tipos, value objects, entities y servicios de dominio
 * - Application Layer: Use cases, services y ports
 * - Adapters: React, CSS, Tailwind bindings
 * - Infrastructure: Audit, exporters
 * - Components: Reference implementations
 * - Validation: Conformance checking
 *
 * Principios fundamentales:
 * 1. Sin colores hardcodeados - Todo pasa por Color Intelligence
 * 2. Percepción sobre valores estáticos - OKLCH, HCT, APCA
 * 3. Accesibilidad nativa - WCAG 2.1 y APCA integrados
 * 4. Tokens W3C DTCG - Interoperabilidad con herramientas de diseño
 * 5. Arquitectura hexagonal - Separación clara de concerns
 *
 * @module ui-kit
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import {
 *   // Domain
 *   OklchColor,
 *   HctColor,
 *   DesignToken,
 *   TokenCollection,
 *
 *   // Application
 *   DeriveColorPalette,
 *   ValidateAccessibility,
 *   ColorIntelligenceService,
 *
 *   // Adapters
 *   ThemeProvider,
 *   useTheme,
 *   CssVariablesAdapter,
 *   TailwindConfigAdapter,
 *
 *   // Infrastructure
 *   W3CTokenExporter,
 *   InMemoryAuditAdapter,
 *
 *   // Validation
 *   ConformanceChecker,
 *   ReportGenerator,
 * } from '@zuclubit/ui-kit';
 *
 * // 1. Create brand color
 * const brandColor = OklchColor.fromHex('#3B82F6');
 *
 * // 2. Generate accessible palette
 * const derive = new DeriveColorPalette();
 * const palette = await derive.execute({
 *   baseColor: brandColor,
 *   steps: [100, 200, 300, 400, 500, 600, 700, 800, 900],
 *   accessibilityLevel: 'AA',
 * });
 *
 * // 3. Export to Tailwind
 * const adapter = new TailwindConfigAdapter({ useCssVariables: true });
 * const config = await adapter.generate(tokenCollection);
 *
 * // 4. Validate conformance
 * const checker = new ConformanceChecker();
 * const report = await checker.runAll({ tokenCollection, colors });
 * ```
 */

// =============================================================================
// DOMAIN LAYER
// =============================================================================

export * from './domain';

// =============================================================================
// APPLICATION LAYER
// =============================================================================

export * from './application';

// =============================================================================
// QUICK ACCESS EXPORTS
// =============================================================================

// Core Domain Value Objects
export { PerceptualColor } from './domain/perceptual/value-objects/PerceptualColor';
export { UIState, UIStateMachine } from './domain/ux/value-objects/UIState';
export { UIRole, RolePair } from './domain/ux/value-objects/UIRole';
export { ComponentIntent } from './domain/ux/value-objects/ComponentIntent';

// Core Domain Entities
export { UXDecision } from './domain/ux/entities/UXDecision';
export { DesignToken } from './domain/tokens/value-objects/DesignToken';
export { TokenCollection } from './domain/tokens/entities/TokenCollection';

// Core Domain Services
export { TokenDerivationService } from './domain/tokens/services/TokenDerivationService';

// Core Use Cases
export { GenerateComponentTokens } from './application/use-cases/GenerateComponentTokens';
export { EvaluateComponentAccessibility } from './application/use-cases/EvaluateComponentAccessibility';
export { ApplyPerceptualPolicy, PRESET_POLICIES } from './application/use-cases/ApplyPerceptualPolicy';
export { ExportDesignTokens, EXPORT_PRESETS } from './application/use-cases/ExportDesignTokens';
export { AuditVisualDecisions } from './application/use-cases/AuditVisualDecisions';

// Enterprise Governance Use Case
export {
  EnforceEnterpriseGovernance,
  checkColorGovernance,
  checkAccessibilityGovernance,
} from './application/use-cases/EnforceEnterpriseGovernance';

// Governance Domain
export {
  EnterprisePolicy,
  PolicySet,
  GovernanceEvaluator,
  createDefaultPolicySet,
  createStrictPolicySet,
  createLenientPolicySet,
  ENTERPRISE_POLICIES,
} from './domain/governance';

// Core Types
export type { Result, UIState as UIStateType, ComponentVariant } from './domain/types';
export { success, failure } from './domain/types';

// =============================================================================
// ADAPTERS LAYER
// =============================================================================

export * from './adapters';

// Quick access to adapters
export { CssVariablesAdapter } from './adapters/css';
export {
  ThemeProvider,
  useTheme,
  useDarkMode,
  useThemeSwitcher,
  useThemeVariable,
  useSystemPreferences,
} from './adapters/react';
export { TailwindConfigAdapter } from './adapters/tailwind';

// Governance adapters
export {
  GovernanceProvider,
  useGovernance,
  useColorGovernance,
  useAccessibilityGovernance,
  useComplianceStatus,
} from './adapters/react/providers/GovernanceProvider';

// =============================================================================
// INFRASTRUCTURE LAYER
// =============================================================================

export * from './infrastructure';

// Quick access to infrastructure
export { InMemoryAuditAdapter } from './infrastructure/audit';
export { W3CTokenExporter } from './infrastructure/exporters';

// =============================================================================
// COMPONENTS LAYER
// =============================================================================

export * from './components';

// Quick access to components
export { ColorSwatch, ColorSwatchGroup, ColorScale, TokenDisplay } from './components/primitives';
export { AccessibleButton } from './components/composed';

// =============================================================================
// VALIDATION LAYER
// =============================================================================

export * from './validation';

// Quick access to validation
export {
  ConformanceChecker,
  ReportGenerator,
  // Individual checks
  ContrastRatioCheck,
  ColorBlindnessCheck,
  PerceptualUniformityCheck,
  GamutBoundaryCheck,
  HardcodedColorCheck,
  TokenNamingConventionCheck,
  TokenCompletenessCheck,
  TokenTypeValidationCheck,
  DependencyDirectionCheck,
  PortContractCheck,
} from './validation';

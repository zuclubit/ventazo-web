/**
 * @fileoverview Domain Layer - UI Kit
 *
 * Capa de dominio del sistema de diseño gobernado por Color Intelligence.
 *
 * Este módulo expone:
 * - Types: Tipos fundamentales y branded types
 * - Perceptual: Sistema de color perceptual (OKLCH, HCT, APCA)
 * - UX: Estados, roles, intenciones y decisiones de UX
 * - Tokens: Sistema de tokens de diseño W3C DTCG
 *
 * Principios:
 * 1. Inmutabilidad - Todos los value objects son inmutables
 * 2. Type Safety - Branded types para seguridad en tiempo de compilación
 * 3. Domain-Driven - Modela el dominio de diseño visual con precisión
 * 4. Perceptual-First - Colores basados en percepción humana
 * 5. Accessibility-Native - WCAG y APCA integrados desde el núcleo
 *
 * @module ui-kit/domain
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import {
 *   PerceptualColor,
 *   UIState,
 *   UIRole,
 *   ComponentIntent,
 *   UXDecision,
 *   DesignToken,
 *   TokenCollection,
 *   TokenDerivationService,
 * } from '@ui-kit/domain';
 *
 * // Crear color perceptual
 * const brandColor = PerceptualColor.fromHex('#3B82F6').value!;
 *
 * // Crear decisión de UX
 * const decision = UXDecision.create(brandColor);
 *
 * // Generar tokens para estado
 * const hoverToken = decision.request({
 *   role: UIRole.accent(),
 *   state: UIState.hover(),
 *   intent: ComponentIntent.action(),
 * });
 *
 * // Derivar colección completa
 * const derivation = new TokenDerivationService();
 * const collection = derivation.deriveTheme('brand', brandColor);
 *
 * // Exportar a CSS
 * console.log(collection.export({ format: 'css' }));
 * ```
 */

// =============================================================================
// TYPES
// =============================================================================

export * from './types';
export * from './types/branded';

// =============================================================================
// PERCEPTUAL DOMAIN
// =============================================================================

export * from './perceptual';

// =============================================================================
// UX DOMAIN
// =============================================================================

export * from './ux';

// =============================================================================
// TOKENS DOMAIN
// =============================================================================

export * from './tokens';

// =============================================================================
// GOVERNANCE DOMAIN
// =============================================================================

export * from './governance';

// =============================================================================
// CONVENIENCE RE-EXPORTS
// =============================================================================

// Core value objects
export { PerceptualColor } from './perceptual/value-objects/PerceptualColor';
export { UIState, UIStateMachine } from './ux/value-objects/UIState';
export { UIRole, RolePair } from './ux/value-objects/UIRole';
export { ComponentIntent } from './ux/value-objects/ComponentIntent';

// Core entities
export { UXDecision } from './ux/entities/UXDecision';
export { DesignToken } from './tokens/value-objects/DesignToken';
export { TokenCollection } from './tokens/entities/TokenCollection';

// Core services
export { TokenDerivationService } from './tokens/services/TokenDerivationService';

// Governance
export { EnterprisePolicy, PolicySet } from './governance/value-objects/EnterprisePolicy';
export { GovernanceEvaluator, governanceEvaluator } from './governance/services/GovernanceEvaluator';
export {
  createDefaultPolicySet,
  createStrictPolicySet,
  createLenientPolicySet,
  ENTERPRISE_POLICIES,
} from './governance';

/**
 * @fileoverview UXDecision Entity
 *
 * Entidad que representa una decisión perceptual gobernada.
 * Es el resultado de Color Intelligence procesando una solicitud
 * de tokens para un componente.
 *
 * UXDecision es el contrato entre el dominio y la aplicación:
 * - Contiene todos los tokens necesarios para un componente
 * - Incluye metadatos de accesibilidad
 * - Registra la procedencia y confianza de cada decisión
 * - Es auditable y trazable
 *
 * @module ui-kit/domain/ux/entities/UXDecision
 * @version 1.0.0
 */

import type {
  DecisionId,
  PolicyId,
} from '../../types/branded';
import { BrandConstructors } from '../../types/branded';

import type {
  UIState as UIStateType,
  UIRole as UIRoleType,
  DecisionStatus,
  AccessibilityMetadata,
  GovernanceEvaluation,
  AuditInfo,
} from '../../types';

import { PerceptualColor } from '../../perceptual/value-objects/PerceptualColor';
import { UIState } from '../value-objects/UIState';
import { UIRole } from '../value-objects/UIRole';
import { ComponentIntent } from '../value-objects/ComponentIntent';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Token individual dentro de una decisión.
 */
export interface DecisionToken {
  readonly role: UIRoleType;
  readonly state: UIStateType;
  readonly color: PerceptualColor;
  readonly cssValue: string;
  readonly accessibility: AccessibilityMetadata;
  readonly derivedFrom?: string;
  readonly adjustedBy?: PolicyId;
}

/**
 * Solicitud de decisión de tokens.
 */
export interface TokenRequest {
  readonly componentId: string;
  readonly intent: ComponentIntent;
  readonly brandColor: PerceptualColor;
  readonly states: readonly UIState[];
  readonly roles: readonly UIRole[];
  readonly variant?: string;
  readonly context?: Record<string, unknown>;
}

/**
 * Configuración de decisión.
 */
export interface DecisionConfig {
  readonly enforcementLevel: 'strict' | 'moderate' | 'lenient';
  readonly accessibilityTarget: 'aa' | 'aaa' | 'apca-gold';
  readonly allowOverrides: boolean;
  readonly auditEnabled: boolean;
}

/**
 * Snapshot de una decisión para auditoría.
 */
export interface DecisionSnapshot {
  readonly id: DecisionId;
  readonly timestamp: Date;
  readonly request: TokenRequest;
  readonly tokens: readonly DecisionToken[];
  readonly governance: GovernanceEvaluation;
  readonly config: DecisionConfig;
}

// ============================================================================
// UX DECISION ENTITY
// ============================================================================

/**
 * UXDecision - Entidad que encapsula una decisión perceptual.
 *
 * Esta es la entidad central del sistema de tokens gobernado.
 * Cuando un componente necesita colores, no los define directamente.
 * En su lugar, solicita una UXDecision que contiene todos los tokens
 * necesarios, validados y gobernados.
 *
 * @example
 * ```typescript
 * // Crear una decisión para un botón
 * const decision = UXDecision.create({
 *   componentId: 'btn-primary',
 *   intent: ComponentIntent.action(),
 *   brandColor: PerceptualColor.fromHex('#0EB58C'),
 *   states: [UIState.idle(), UIState.hover(), UIState.active()],
 *   roles: [UIRole.accent(), UIRole.textInverse(), UIRole.border()],
 * });
 *
 * // Obtener token específico
 * const hoverBg = decision.getToken('accent', 'hover');
 * console.log(hoverBg?.cssValue); // "oklch(72.3% 0.18 164.5)"
 *
 * // Verificar accesibilidad
 * console.log(decision.isFullyAccessible); // true
 *
 * // Exportar como variables CSS
 * const cssVars = decision.toCssVariables();
 * ```
 */
export class UXDecision {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE STATE
  // ─────────────────────────────────────────────────────────────────────────

  private readonly _id: DecisionId;
  private readonly _request: TokenRequest;
  private readonly _tokens: Map<string, DecisionToken>;
  private readonly _governance: GovernanceEvaluation;
  private readonly _config: DecisionConfig;
  private readonly _createdAt: Date;
  private _status: DecisionStatus;
  private readonly _auditTrail: AuditInfo[];

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR (Private)
  // ─────────────────────────────────────────────────────────────────────────

  private constructor(
    id: DecisionId,
    request: TokenRequest,
    tokens: DecisionToken[],
    governance: GovernanceEvaluation,
    config: DecisionConfig
  ) {
    this._id = id;
    this._request = request;
    this._governance = governance;
    this._config = config;
    this._createdAt = new Date();
    this._status = 'pending';
    this._auditTrail = [];

    // Indexar tokens por role+state
    this._tokens = new Map();
    for (const token of tokens) {
      const key = this.tokenKey(token.role, token.state);
      this._tokens.set(key, token);
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATIC FACTORIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea una nueva decisión.
   * Nota: En producción, esto delegaría a Color Intelligence.
   */
  static create(
    request: TokenRequest,
    config: DecisionConfig = DEFAULT_CONFIG
  ): UXDecision {
    const id = BrandConstructors.decisionId();

    // Generar tokens para cada combinación state+role
    const tokens = UXDecision.generateTokens(request);

    // Evaluar gobernanza
    const governance = UXDecision.evaluateGovernance(tokens, config);

    return new UXDecision(id, request, tokens, governance, config);
  }

  /**
   * Genera tokens para la solicitud.
   * Esto es una implementación simplificada - en producción usaría Color Intelligence.
   */
  private static generateTokens(request: TokenRequest): DecisionToken[] {
    const tokens: DecisionToken[] = [];
    const { brandColor, states, roles, intent } = request;

    for (const state of states) {
      for (const role of roles) {
        // Generar color basado en rol, estado e intención
        const color = UXDecision.deriveColor(brandColor, role, state, intent);

        // Calcular accesibilidad (simplificado)
        const accessibility = UXDecision.calculateAccessibility(color, role);

        tokens.push({
          role: role.value,
          state: state.value,
          color,
          cssValue: color.toCssOklch(),
          accessibility,
          derivedFrom: brandColor.hex,
        });
      }
    }

    return tokens;
  }

  /**
   * Deriva un color basado en rol, estado e intención.
   */
  private static deriveColor(
    brand: PerceptualColor,
    role: UIRole,
    state: UIState,
    intent: ComponentIntent
  ): PerceptualColor {
    let color = brand;

    // Ajustes por rol
    switch (role.value) {
      case 'accent':
        // Mantener color de marca
        break;
      case 'text-inverse':
        // Determinar si necesita texto claro u oscuro
        const analysis = brand.analyze();
        color = analysis.contrastMode === 'light-content'
          ? PerceptualColor.fromOklch(0.98, 0, 0)  // Blanco
          : PerceptualColor.fromOklch(0.15, 0, 0); // Negro
        break;
      case 'border':
        color = brand.darken(0.1).desaturate(0.05);
        break;
      case 'background':
        color = brand.lighten(0.4).desaturate(0.15);
        break;
      case 'surface':
        color = PerceptualColor.fromOklch(0.98, 0.01, brand.hue);
        break;
      case 'text-primary':
        color = PerceptualColor.fromOklch(0.2, 0.02, brand.hue);
        break;
      case 'text-secondary':
        color = PerceptualColor.fromOklch(0.4, 0.02, brand.hue);
        break;
      case 'text-muted':
        color = PerceptualColor.fromOklch(0.55, 0.01, brand.hue);
        break;
      case 'icon':
        color = brand.desaturate(0.02);
        break;
      case 'accent-muted':
        color = brand.withAlpha(0.15);
        break;
      case 'focus-ring':
        color = brand.saturate(0.05).withAlpha(0.5);
        break;
      default:
        break;
    }

    // Ajustes por estado
    const metadata = state.metadata;
    if (metadata.suggestedLightnessShift !== 0) {
      color = metadata.suggestedLightnessShift > 0
        ? color.lighten(Math.abs(metadata.suggestedLightnessShift))
        : color.darken(Math.abs(metadata.suggestedLightnessShift));
    }
    if (metadata.suggestedChromaShift !== 0) {
      color = metadata.suggestedChromaShift > 0
        ? color.saturate(Math.abs(metadata.suggestedChromaShift))
        : color.desaturate(Math.abs(metadata.suggestedChromaShift));
    }
    if (metadata.suggestedOpacity < 1) {
      color = color.withAlpha(metadata.suggestedOpacity);
    }

    // Ajustes por intención destructiva
    if (intent.isDestructive && role.isAccent) {
      // Cambiar a rojo
      color = PerceptualColor.fromOklch(0.55, 0.22, 25); // Rojo accesible
    }

    return color;
  }

  /**
   * Calcula metadatos de accesibilidad para un color.
   */
  private static calculateAccessibility(
    color: PerceptualColor,
    role: UIRole
  ): AccessibilityMetadata {
    // Simplificado - en producción usaría APCA de Color Intelligence
    const l = color.lightness;

    // Simular cálculos APCA básicos
    const estimatedLc = Math.abs(l - 0.5) * 150;
    const apcaLevel =
      estimatedLc >= 90 ? 'excellent' :
      estimatedLc >= 75 ? 'fluent' :
      estimatedLc >= 60 ? 'body' :
      estimatedLc >= 45 ? 'large' :
      estimatedLc >= 30 ? 'spot' :
      estimatedLc >= 15 ? 'minimum' : 'fail';

    const meetsRequirement = (() => {
      const required = role.minApcaLevel;
      const levels = ['fail', 'minimum', 'spot', 'large', 'body', 'fluent', 'excellent'];
      return levels.indexOf(apcaLevel) >= levels.indexOf(required);
    })();

    return {
      wcagLevel: estimatedLc >= 70 ? 'AAA' : estimatedLc >= 45 ? 'AA' : 'Fail',
      wcag3Tier: estimatedLc >= 90 ? 'Platinum' :
                 estimatedLc >= 75 ? 'Gold' :
                 estimatedLc >= 60 ? 'Silver' :
                 estimatedLc >= 45 ? 'Bronze' : 'Fail',
      apcaLc: estimatedLc,
      apcaLevel,
      contrastRatio: Math.min(21, Math.max(1, estimatedLc / 5)),
      meetsRequirement,
    };
  }

  /**
   * Evalúa gobernanza de tokens.
   */
  private static evaluateGovernance(
    tokens: DecisionToken[],
    config: DecisionConfig
  ): GovernanceEvaluation {
    const violations = [];
    const warnings = [];

    for (const token of tokens) {
      if (!token.accessibility.meetsRequirement) {
        if (config.enforcementLevel === 'strict') {
          violations.push({
            id: BrandConstructors.violationId(),
            policyId: 'apca-minimum',
            policyName: 'APCA Minimum Contrast',
            severity: 'error' as const,
            message: `Token ${token.role}/${token.state} does not meet APCA requirements`,
            affectedTokens: [`${token.role}-${token.state}`],
            suggestedFix: 'Increase contrast by adjusting lightness',
          });
        } else {
          warnings.push({
            id: BrandConstructors.violationId(),
            policyId: 'apca-minimum',
            policyName: 'APCA Minimum Contrast',
            severity: 'warning' as const,
            message: `Token ${token.role}/${token.state} has suboptimal contrast`,
            affectedTokens: [`${token.role}-${token.state}`],
          });
        }
      }
    }

    const isCompliant = violations.length === 0;
    const score = Math.max(0, 100 - violations.length * 20 - warnings.length * 5);

    return {
      isCompliant,
      score,
      violations,
      warnings,
      appliedAdjustments: [],
      timestamp: new Date(),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GETTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * ID único de la decisión.
   */
  get id(): DecisionId {
    return this._id;
  }

  /**
   * Solicitud original.
   */
  get request(): TokenRequest {
    return this._request;
  }

  /**
   * Evaluación de gobernanza.
   */
  get governance(): GovernanceEvaluation {
    return this._governance;
  }

  /**
   * Configuración aplicada.
   */
  get config(): DecisionConfig {
    return this._config;
  }

  /**
   * Estado actual de la decisión.
   */
  get status(): DecisionStatus {
    return this._status;
  }

  /**
   * Fecha de creación.
   */
  get createdAt(): Date {
    return this._createdAt;
  }

  /**
   * Trail de auditoría.
   */
  get auditTrail(): readonly AuditInfo[] {
    return [...this._auditTrail];
  }

  /**
   * Todos los tokens.
   */
  get tokens(): readonly DecisionToken[] {
    return Array.from(this._tokens.values());
  }

  /**
   * Número de tokens.
   */
  get tokenCount(): number {
    return this._tokens.size;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREDICADOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica si la decisión es compliant.
   */
  get isCompliant(): boolean {
    return this._governance.isCompliant;
  }

  /**
   * Verifica si todos los tokens son accesibles.
   */
  get isFullyAccessible(): boolean {
    return this.tokens.every(t => t.accessibility.meetsRequirement);
  }

  /**
   * Verifica si tiene advertencias.
   */
  get hasWarnings(): boolean {
    return this._governance.warnings.length > 0;
  }

  /**
   * Verifica si fue aplicada.
   */
  get isApplied(): boolean {
    return this._status === 'applied';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MÉTODOS DE ACCESO A TOKENS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Genera la clave para un token.
   */
  private tokenKey(role: UIRoleType, state: UIStateType): string {
    return `${role}::${state}`;
  }

  /**
   * Obtiene un token específico.
   */
  getToken(role: UIRoleType, state: UIStateType): DecisionToken | undefined {
    return this._tokens.get(this.tokenKey(role, state));
  }

  /**
   * Obtiene tokens por rol.
   */
  getTokensByRole(role: UIRoleType): DecisionToken[] {
    return this.tokens.filter(t => t.role === role);
  }

  /**
   * Obtiene tokens por estado.
   */
  getTokensByState(state: UIStateType): DecisionToken[] {
    return this.tokens.filter(t => t.state === state);
  }

  /**
   * Obtiene el color CSS para un rol y estado.
   */
  getCssValue(role: UIRoleType, state: UIStateType): string | undefined {
    return this.getToken(role, state)?.cssValue;
  }

  /**
   * Obtiene todos los tokens para un estado como mapa de roles.
   */
  getStateTokens(state: UIStateType): Map<UIRoleType, string> {
    const result = new Map<UIRoleType, string>();
    for (const token of this.getTokensByState(state)) {
      result.set(token.role, token.cssValue);
    }
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MUTADORES (con auditoría)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Marca la decisión como aplicada.
   */
  markApplied(): void {
    if (this._status === 'applied') return;

    const previousStatus = this._status;
    this._status = 'applied';

    if (this._config.auditEnabled) {
      this._auditTrail.push({
        id: BrandConstructors.auditId(),
        timestamp: new Date(),
        action: 'status_change',
        source: 'component-default',
        details: { from: previousStatus, to: 'applied' },
        previousValue: previousStatus,
        newValue: 'applied',
      });
    }
  }

  /**
   * Rechaza la decisión.
   */
  reject(reason: string): void {
    this._status = 'rejected';

    if (this._config.auditEnabled) {
      this._auditTrail.push({
        id: BrandConstructors.auditId(),
        timestamp: new Date(),
        action: 'rejected',
        source: 'user-override',
        details: { reason },
        previousValue: this._status,
        newValue: 'rejected',
      });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXPORTACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Exporta como variables CSS.
   */
  toCssVariables(prefix = 'ux'): Record<string, string> {
    const vars: Record<string, string> = {};

    for (const token of this.tokens) {
      const varName = `--${prefix}-${token.role}-${token.state}`;
      vars[varName] = token.cssValue;
    }

    return vars;
  }

  /**
   * Exporta como string CSS.
   */
  toCssString(prefix = 'ux', selector = ':root'): string {
    const vars = this.toCssVariables(prefix);
    const lines = Object.entries(vars).map(([k, v]) => `  ${k}: ${v};`);
    return `${selector} {\n${lines.join('\n')}\n}`;
  }

  /**
   * Exporta como design tokens (W3C DTCG format).
   */
  toDesignTokens(): Record<string, unknown> {
    const tokens: Record<string, unknown> = {};

    for (const token of this.tokens) {
      const path = `${token.role}.${token.state}`;
      tokens[path] = {
        $type: 'color',
        $value: token.cssValue,
        $description: `${token.role} color for ${token.state} state`,
        $extensions: {
          'ui-kit': {
            role: token.role,
            state: token.state,
            accessibility: token.accessibility,
          },
        },
      };
    }

    return {
      color: tokens,
    };
  }

  /**
   * Crea un snapshot para auditoría.
   */
  toSnapshot(): DecisionSnapshot {
    return {
      id: this._id,
      timestamp: this._createdAt,
      request: this._request,
      tokens: this.tokens,
      governance: this._governance,
      config: this._config,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SERIALIZACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  toJSON(): Record<string, unknown> {
    return {
      id: this._id,
      request: {
        componentId: this._request.componentId,
        intent: this._request.intent.value,
        brandColor: this._request.brandColor.hex,
        states: this._request.states.map(s => s.value),
        roles: this._request.roles.map(r => r.value),
      },
      tokens: this.tokens.map(t => ({
        role: t.role,
        state: t.state,
        cssValue: t.cssValue,
        accessibility: t.accessibility,
      })),
      governance: this._governance,
      status: this._status,
      createdAt: this._createdAt.toISOString(),
    };
  }
}

// ============================================================================
// DEFAULTS
// ============================================================================

const DEFAULT_CONFIG: DecisionConfig = {
  enforcementLevel: 'moderate',
  accessibilityTarget: 'aaa',
  allowOverrides: true,
  auditEnabled: true,
};

// ============================================================================
// EXPORTS
// ============================================================================

export default UXDecision;
export { DEFAULT_CONFIG };

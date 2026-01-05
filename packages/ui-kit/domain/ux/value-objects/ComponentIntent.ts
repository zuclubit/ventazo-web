/**
 * @fileoverview ComponentIntent Value Object
 *
 * Value Object que representa la intención semántica de un componente.
 * Define QUÉ hace el componente, no CÓMO se ve.
 *
 * @module ui-kit/domain/ux/value-objects/ComponentIntent
 * @version 1.0.0
 */

import type {
  ComponentIntent as ComponentIntentType,
  Severity,
  ComponentVariant,
  UIRole as UIRoleType,
  Result,
} from '../../types';
import { success, failure } from '../../types';
import { UIRole } from './UIRole';
import { UIState } from './UIState';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Intenciones válidas de componente.
 */
export const COMPONENT_INTENTS = [
  'navigation',
  'action',
  'action-destructive',
  'action-secondary',
  'status-info',
  'status-success',
  'status-warning',
  'status-error',
  'data-entry',
  'data-display',
  'feedback',
  'decoration',
] as const;

/**
 * Categoría de intención.
 */
export type IntentCategory =
  | 'navigation'
  | 'action'
  | 'status'
  | 'data'
  | 'feedback'
  | 'decoration';

/**
 * Mapeo de intención a categoría.
 */
const INTENT_CATEGORIES: Record<ComponentIntentType, IntentCategory> = {
  'navigation': 'navigation',
  'action': 'action',
  'action-destructive': 'action',
  'action-secondary': 'action',
  'status-info': 'status',
  'status-success': 'status',
  'status-warning': 'status',
  'status-error': 'status',
  'data-entry': 'data',
  'data-display': 'data',
  'feedback': 'feedback',
  'decoration': 'decoration',
} as const;

/**
 * Severidad por intención.
 */
const INTENT_SEVERITY: Record<ComponentIntentType, Severity> = {
  'navigation': 'neutral',
  'action': 'info',
  'action-destructive': 'error',
  'action-secondary': 'neutral',
  'status-info': 'info',
  'status-success': 'success',
  'status-warning': 'warning',
  'status-error': 'error',
  'data-entry': 'neutral',
  'data-display': 'neutral',
  'feedback': 'info',
  'decoration': 'neutral',
} as const;

/**
 * Variantes recomendadas por intención.
 */
const INTENT_VARIANTS: Record<ComponentIntentType, readonly ComponentVariant[]> = {
  'navigation': ['ghost', 'soft'],
  'action': ['solid', 'outline', 'soft'],
  'action-destructive': ['solid', 'outline'],
  'action-secondary': ['outline', 'ghost', 'soft'],
  'status-info': ['soft', 'outline'],
  'status-success': ['soft', 'outline'],
  'status-warning': ['soft', 'outline'],
  'status-error': ['soft', 'outline', 'solid'],
  'data-entry': ['outline', 'soft'],
  'data-display': ['ghost', 'soft'],
  'feedback': ['soft', 'glass'],
  'decoration': ['ghost', 'soft', 'gradient'],
} as const;

/**
 * Roles principales asociados a cada intención.
 */
const INTENT_ROLES: Record<ComponentIntentType, readonly UIRoleType[]> = {
  'navigation': ['text-secondary', 'icon', 'background'],
  'action': ['accent', 'text-inverse', 'border'],
  'action-destructive': ['accent', 'text-inverse'],
  'action-secondary': ['border', 'text-primary'],
  'status-info': ['accent-muted', 'text-primary', 'border'],
  'status-success': ['accent-muted', 'text-primary', 'border'],
  'status-warning': ['accent-muted', 'text-primary', 'border'],
  'status-error': ['accent-muted', 'text-primary', 'border'],
  'data-entry': ['border', 'text-primary', 'surface'],
  'data-display': ['text-primary', 'text-secondary', 'surface'],
  'feedback': ['surface-elevated', 'text-primary', 'shadow'],
  'decoration': ['background', 'border-subtle'],
} as const;

/**
 * Estados relevantes por intención.
 */
const INTENT_STATES: Record<ComponentIntentType, readonly (typeof UIState.prototype.value)[]> = {
  'navigation': ['idle', 'hover', 'active', 'focus', 'disabled'],
  'action': ['idle', 'hover', 'active', 'focus', 'disabled', 'loading'],
  'action-destructive': ['idle', 'hover', 'active', 'focus', 'disabled', 'loading'],
  'action-secondary': ['idle', 'hover', 'active', 'focus', 'disabled'],
  'status-info': ['idle'],
  'status-success': ['idle'],
  'status-warning': ['idle'],
  'status-error': ['idle', 'active'],
  'data-entry': ['idle', 'focus', 'error', 'disabled'],
  'data-display': ['idle'],
  'feedback': ['idle', 'success', 'error', 'loading'],
  'decoration': ['idle'],
} as const;

/**
 * Interactividad por intención.
 */
interface IntentInteractivity {
  readonly isInteractive: boolean;
  readonly isFocusable: boolean;
  readonly supportsKeyboard: boolean;
  readonly requiresPointer: boolean;
}

const INTENT_INTERACTIVITY: Record<ComponentIntentType, IntentInteractivity> = {
  'navigation': {
    isInteractive: true,
    isFocusable: true,
    supportsKeyboard: true,
    requiresPointer: false,
  },
  'action': {
    isInteractive: true,
    isFocusable: true,
    supportsKeyboard: true,
    requiresPointer: false,
  },
  'action-destructive': {
    isInteractive: true,
    isFocusable: true,
    supportsKeyboard: true,
    requiresPointer: false,
  },
  'action-secondary': {
    isInteractive: true,
    isFocusable: true,
    supportsKeyboard: true,
    requiresPointer: false,
  },
  'status-info': {
    isInteractive: false,
    isFocusable: false,
    supportsKeyboard: false,
    requiresPointer: false,
  },
  'status-success': {
    isInteractive: false,
    isFocusable: false,
    supportsKeyboard: false,
    requiresPointer: false,
  },
  'status-warning': {
    isInteractive: false,
    isFocusable: false,
    supportsKeyboard: false,
    requiresPointer: false,
  },
  'status-error': {
    isInteractive: false,
    isFocusable: false,
    supportsKeyboard: false,
    requiresPointer: false,
  },
  'data-entry': {
    isInteractive: true,
    isFocusable: true,
    supportsKeyboard: true,
    requiresPointer: false,
  },
  'data-display': {
    isInteractive: false,
    isFocusable: false,
    supportsKeyboard: false,
    requiresPointer: false,
  },
  'feedback': {
    isInteractive: false,
    isFocusable: true,  // For accessibility
    supportsKeyboard: true, // Dismiss with Escape
    requiresPointer: false,
  },
  'decoration': {
    isInteractive: false,
    isFocusable: false,
    supportsKeyboard: false,
    requiresPointer: false,
  },
} as const;

// ============================================================================
// COMPONENT INTENT VALUE OBJECT
// ============================================================================

/**
 * ComponentIntent - Value Object para intención de componente.
 *
 * Define el propósito semántico de un componente, lo que permite
 * al sistema de tokens generar estilos apropiados automáticamente.
 *
 * @example
 * ```typescript
 * const actionIntent = ComponentIntent.action();
 * const navIntent = ComponentIntent.navigation();
 *
 * // Obtener metadatos
 * console.log(actionIntent.severity); // 'info'
 * console.log(actionIntent.recommendedVariants); // ['solid', 'outline', 'soft']
 *
 * // Verificar interactividad
 * console.log(actionIntent.isInteractive); // true
 *
 * // Roles asociados
 * console.log(actionIntent.primaryRoles); // ['accent', 'text-inverse', 'border']
 * ```
 */
export class ComponentIntent {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE STATE
  // ─────────────────────────────────────────────────────────────────────────

  private readonly _value: ComponentIntentType;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR (Private)
  // ─────────────────────────────────────────────────────────────────────────

  private constructor(value: ComponentIntentType) {
    this._value = value;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATIC FACTORIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea desde un string.
   */
  static from(value: string): Result<ComponentIntent, Error> {
    if (!COMPONENT_INTENTS.includes(value as ComponentIntentType)) {
      return failure(new Error(`Invalid component intent: ${value}`));
    }
    return success(new ComponentIntent(value as ComponentIntentType));
  }

  /**
   * Crea sin validación.
   */
  static of(value: ComponentIntentType): ComponentIntent {
    return new ComponentIntent(value);
  }

  // Named constructors
  static navigation(): ComponentIntent { return new ComponentIntent('navigation'); }
  static action(): ComponentIntent { return new ComponentIntent('action'); }
  static actionDestructive(): ComponentIntent { return new ComponentIntent('action-destructive'); }
  static actionSecondary(): ComponentIntent { return new ComponentIntent('action-secondary'); }
  static statusInfo(): ComponentIntent { return new ComponentIntent('status-info'); }
  static statusSuccess(): ComponentIntent { return new ComponentIntent('status-success'); }
  static statusWarning(): ComponentIntent { return new ComponentIntent('status-warning'); }
  static statusError(): ComponentIntent { return new ComponentIntent('status-error'); }
  static dataEntry(): ComponentIntent { return new ComponentIntent('data-entry'); }
  static dataDisplay(): ComponentIntent { return new ComponentIntent('data-display'); }
  static feedback(): ComponentIntent { return new ComponentIntent('feedback'); }
  static decoration(): ComponentIntent { return new ComponentIntent('decoration'); }

  /**
   * Obtiene todas las intenciones.
   */
  static all(): readonly ComponentIntent[] {
    return COMPONENT_INTENTS.map(i => new ComponentIntent(i));
  }

  /**
   * Obtiene intenciones por categoría.
   */
  static byCategory(category: IntentCategory): readonly ComponentIntent[] {
    return COMPONENT_INTENTS
      .filter(i => INTENT_CATEGORIES[i] === category)
      .map(i => new ComponentIntent(i));
  }

  /**
   * Crea intención de status desde severidad.
   */
  static fromSeverity(severity: Severity): ComponentIntent {
    switch (severity) {
      case 'info': return ComponentIntent.statusInfo();
      case 'success': return ComponentIntent.statusSuccess();
      case 'warning': return ComponentIntent.statusWarning();
      case 'error': return ComponentIntent.statusError();
      case 'neutral': return ComponentIntent.dataDisplay();
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GETTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valor de la intención.
   */
  get value(): ComponentIntentType {
    return this._value;
  }

  /**
   * Categoría de la intención.
   */
  get category(): IntentCategory {
    return INTENT_CATEGORIES[this._value];
  }

  /**
   * Severidad asociada.
   */
  get severity(): Severity {
    return INTENT_SEVERITY[this._value];
  }

  /**
   * Variantes recomendadas.
   */
  get recommendedVariants(): readonly ComponentVariant[] {
    return INTENT_VARIANTS[this._value];
  }

  /**
   * Variante por defecto.
   */
  get defaultVariant(): ComponentVariant {
    return INTENT_VARIANTS[this._value][0];
  }

  /**
   * Roles primarios asociados.
   */
  get primaryRoles(): readonly UIRoleType[] {
    return INTENT_ROLES[this._value];
  }

  /**
   * Estados relevantes.
   */
  get relevantStates(): readonly (typeof UIState.prototype.value)[] {
    return INTENT_STATES[this._value];
  }

  /**
   * Información de interactividad.
   */
  get interactivity(): IntentInteractivity {
    return INTENT_INTERACTIVITY[this._value];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREDICADOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Es una acción.
   */
  get isAction(): boolean {
    return this.category === 'action';
  }

  /**
   * Es un estado/status.
   */
  get isStatus(): boolean {
    return this.category === 'status';
  }

  /**
   * Es navegación.
   */
  get isNavigation(): boolean {
    return this.category === 'navigation';
  }

  /**
   * Es interactivo.
   */
  get isInteractive(): boolean {
    return INTENT_INTERACTIVITY[this._value].isInteractive;
  }

  /**
   * Es focusable.
   */
  get isFocusable(): boolean {
    return INTENT_INTERACTIVITY[this._value].isFocusable;
  }

  /**
   * Es destructivo.
   */
  get isDestructive(): boolean {
    return this._value === 'action-destructive';
  }

  /**
   * Requiere confirmación (acciones peligrosas).
   */
  get requiresConfirmation(): boolean {
    return this._value === 'action-destructive';
  }

  /**
   * Soporta estado de carga.
   */
  get supportsLoading(): boolean {
    return this.relevantStates.includes('loading');
  }

  /**
   * Soporta estado de error.
   */
  get supportsError(): boolean {
    return this.relevantStates.includes('error');
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MÉTODOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Verifica si una variante es válida para esta intención.
   */
  supportsVariant(variant: ComponentVariant): boolean {
    return this.recommendedVariants.includes(variant);
  }

  /**
   * Verifica si un estado es relevante para esta intención.
   */
  hasState(state: UIState): boolean {
    return this.relevantStates.includes(state.value);
  }

  /**
   * Obtiene los UIRoles como Value Objects.
   */
  getRoles(): readonly UIRole[] {
    return this.primaryRoles.map(r => UIRole.of(r));
  }

  /**
   * Obtiene los UIStates como Value Objects.
   */
  getStates(): readonly UIState[] {
    return this.relevantStates.map(s => UIState.of(s));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPARACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  equals(other: ComponentIntent): boolean {
    return this._value === other._value;
  }

  /**
   * Verifica si comparten categoría.
   */
  sameCategory(other: ComponentIntent): boolean {
    return this.category === other.category;
  }

  /**
   * Verifica si comparten severidad.
   */
  sameSeverity(other: ComponentIntent): boolean {
    return this.severity === other.severity;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SERIALIZACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  toString(): string {
    return this._value;
  }

  toJSON(): ComponentIntentType {
    return this._value;
  }

  /**
   * Genera un nombre de clase CSS.
   */
  toCssClass(): string {
    return `intent-${this._value}`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ComponentIntent;
// COMPONENT_INTENTS and IntentCategory are exported inline; these are not:
export { INTENT_CATEGORIES, INTENT_SEVERITY, INTENT_VARIANTS };
export type { IntentInteractivity };

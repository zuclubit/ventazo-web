/**
 * @fileoverview UIRole Value Object
 *
 * Value Object que representa el rol semántico de un color en la UI.
 * Define el PROPÓSITO del color, no su valor específico.
 *
 * Principio fundamental: "El color no tiene significado inherente,
 * su significado viene de su rol en el contexto."
 *
 * @module ui-kit/domain/ux/value-objects/UIRole
 * @version 1.0.0
 */

import type { UIRole as UIRoleType, ApcaLevel, Result } from '../../types';
import { success, failure } from '../../types';

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Roles válidos de UI.
 */
export const UI_ROLES = [
  'background',
  'surface',
  'surface-elevated',
  'text-primary',
  'text-secondary',
  'text-muted',
  'text-inverse',
  'icon',
  'icon-muted',
  'accent',
  'accent-muted',
  'border',
  'border-subtle',
  'divider',
  'overlay',
  'shadow',
  'focus-ring',
] as const;

/**
 * Categorías de roles.
 */
export type RoleCategory =
  | 'background'
  | 'text'
  | 'icon'
  | 'accent'
  | 'structural'
  | 'decorative';

/**
 * Mapeo de rol a categoría.
 */
const ROLE_CATEGORIES: Record<UIRoleType, RoleCategory> = {
  'background': 'background',
  'surface': 'background',
  'surface-elevated': 'background',
  'text-primary': 'text',
  'text-secondary': 'text',
  'text-muted': 'text',
  'text-inverse': 'text',
  'icon': 'icon',
  'icon-muted': 'icon',
  'accent': 'accent',
  'accent-muted': 'accent',
  'border': 'structural',
  'border-subtle': 'structural',
  'divider': 'structural',
  'overlay': 'decorative',
  'shadow': 'decorative',
  'focus-ring': 'structural',
} as const;

/**
 * Requisitos de accesibilidad por rol.
 */
interface RoleAccessibilityRequirements {
  readonly minApcaLevel: ApcaLevel;
  readonly requiresContrastAgainst: readonly UIRoleType[];
  readonly isDecorative: boolean;
  readonly fontSizeDependent: boolean;
}

const ROLE_ACCESSIBILITY: Record<UIRoleType, RoleAccessibilityRequirements> = {
  'background': {
    minApcaLevel: 'minimum',
    requiresContrastAgainst: [],
    isDecorative: true,
    fontSizeDependent: false,
  },
  'surface': {
    minApcaLevel: 'minimum',
    requiresContrastAgainst: ['background'],
    isDecorative: false,
    fontSizeDependent: false,
  },
  'surface-elevated': {
    minApcaLevel: 'minimum',
    requiresContrastAgainst: ['surface', 'background'],
    isDecorative: false,
    fontSizeDependent: false,
  },
  'text-primary': {
    minApcaLevel: 'body',
    requiresContrastAgainst: ['background', 'surface', 'surface-elevated'],
    isDecorative: false,
    fontSizeDependent: true,
  },
  'text-secondary': {
    minApcaLevel: 'body',
    requiresContrastAgainst: ['background', 'surface'],
    isDecorative: false,
    fontSizeDependent: true,
  },
  'text-muted': {
    minApcaLevel: 'large',
    requiresContrastAgainst: ['background', 'surface'],
    isDecorative: false,
    fontSizeDependent: true,
  },
  'text-inverse': {
    minApcaLevel: 'body',
    requiresContrastAgainst: ['accent'],
    isDecorative: false,
    fontSizeDependent: true,
  },
  'icon': {
    minApcaLevel: 'spot',
    requiresContrastAgainst: ['background', 'surface'],
    isDecorative: false,
    fontSizeDependent: false,
  },
  'icon-muted': {
    minApcaLevel: 'minimum',
    requiresContrastAgainst: ['background', 'surface'],
    isDecorative: true,
    fontSizeDependent: false,
  },
  'accent': {
    minApcaLevel: 'spot',
    requiresContrastAgainst: ['background', 'surface'],
    isDecorative: false,
    fontSizeDependent: false,
  },
  'accent-muted': {
    minApcaLevel: 'minimum',
    requiresContrastAgainst: ['background'],
    isDecorative: true,
    fontSizeDependent: false,
  },
  'border': {
    minApcaLevel: 'minimum',
    requiresContrastAgainst: ['background', 'surface'],
    isDecorative: false,
    fontSizeDependent: false,
  },
  'border-subtle': {
    minApcaLevel: 'minimum',
    requiresContrastAgainst: [],
    isDecorative: true,
    fontSizeDependent: false,
  },
  'divider': {
    minApcaLevel: 'minimum',
    requiresContrastAgainst: [],
    isDecorative: true,
    fontSizeDependent: false,
  },
  'overlay': {
    minApcaLevel: 'minimum',
    requiresContrastAgainst: [],
    isDecorative: true,
    fontSizeDependent: false,
  },
  'shadow': {
    minApcaLevel: 'fail', // No contrast requirements
    requiresContrastAgainst: [],
    isDecorative: true,
    fontSizeDependent: false,
  },
  'focus-ring': {
    minApcaLevel: 'spot',
    requiresContrastAgainst: ['background', 'surface', 'accent'],
    isDecorative: false,
    fontSizeDependent: false,
  },
} as const;

/**
 * Relaciones semánticas entre roles.
 * Define qué roles "van juntos" o deben considerarse en conjunto.
 */
interface RoleRelationships {
  readonly pairedWith: readonly UIRoleType[];
  readonly derivableFrom: readonly UIRoleType[];
  readonly overrides: readonly UIRoleType[];
}

const ROLE_RELATIONSHIPS: Record<UIRoleType, RoleRelationships> = {
  'background': {
    pairedWith: ['text-primary', 'text-secondary', 'border'],
    derivableFrom: [],
    overrides: [],
  },
  'surface': {
    pairedWith: ['text-primary', 'border'],
    derivableFrom: ['background'],
    overrides: ['background'],
  },
  'surface-elevated': {
    pairedWith: ['text-primary', 'shadow'],
    derivableFrom: ['surface'],
    overrides: ['surface'],
  },
  'text-primary': {
    pairedWith: ['background', 'surface'],
    derivableFrom: [],
    overrides: [],
  },
  'text-secondary': {
    pairedWith: ['background', 'surface'],
    derivableFrom: ['text-primary'],
    overrides: [],
  },
  'text-muted': {
    pairedWith: ['background'],
    derivableFrom: ['text-secondary'],
    overrides: [],
  },
  'text-inverse': {
    pairedWith: ['accent'],
    derivableFrom: ['text-primary'],
    overrides: [],
  },
  'icon': {
    pairedWith: ['background', 'surface'],
    derivableFrom: ['text-primary'],
    overrides: [],
  },
  'icon-muted': {
    pairedWith: ['background'],
    derivableFrom: ['icon'],
    overrides: [],
  },
  'accent': {
    pairedWith: ['text-inverse', 'background'],
    derivableFrom: [],
    overrides: [],
  },
  'accent-muted': {
    pairedWith: ['background'],
    derivableFrom: ['accent'],
    overrides: [],
  },
  'border': {
    pairedWith: ['surface', 'background'],
    derivableFrom: ['text-muted'],
    overrides: [],
  },
  'border-subtle': {
    pairedWith: ['surface'],
    derivableFrom: ['border'],
    overrides: [],
  },
  'divider': {
    pairedWith: ['surface'],
    derivableFrom: ['border-subtle'],
    overrides: [],
  },
  'overlay': {
    pairedWith: ['background'],
    derivableFrom: [],
    overrides: [],
  },
  'shadow': {
    pairedWith: ['surface-elevated'],
    derivableFrom: [],
    overrides: [],
  },
  'focus-ring': {
    pairedWith: ['accent'],
    derivableFrom: ['accent'],
    overrides: [],
  },
} as const;

// ============================================================================
// UI ROLE VALUE OBJECT
// ============================================================================

/**
 * UIRole - Value Object para roles semánticos de color.
 *
 * El rol define el PROPÓSITO de un color, no su valor.
 * Esto permite que el sistema de tokens genere valores apropiados
 * basándose en el contexto y las políticas de accesibilidad.
 *
 * @example
 * ```typescript
 * const textRole = UIRole.textPrimary();
 * const bgRole = UIRole.background();
 *
 * // Verificar requisitos de accesibilidad
 * console.log(textRole.minApcaLevel); // 'body'
 * console.log(textRole.requiresContrastAgainst); // ['background', 'surface', ...]
 *
 * // Verificar relaciones
 * console.log(textRole.isPairedWith(bgRole)); // true
 *
 * // Categoría
 * console.log(textRole.category); // 'text'
 * ```
 */
export class UIRole {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE STATE
  // ─────────────────────────────────────────────────────────────────────────

  private readonly _value: UIRoleType;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR (Private)
  // ─────────────────────────────────────────────────────────────────────────

  private constructor(value: UIRoleType) {
    this._value = value;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATIC FACTORIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea desde un string.
   */
  static from(value: string): Result<UIRole, Error> {
    if (!UI_ROLES.includes(value as UIRoleType)) {
      return failure(new Error(`Invalid UI role: ${value}`));
    }
    return success(new UIRole(value as UIRoleType));
  }

  /**
   * Crea un UIRole sin validación.
   */
  static of(value: UIRoleType): UIRole {
    return new UIRole(value);
  }

  // Named constructors
  static background(): UIRole { return new UIRole('background'); }
  static surface(): UIRole { return new UIRole('surface'); }
  static surfaceElevated(): UIRole { return new UIRole('surface-elevated'); }
  static textPrimary(): UIRole { return new UIRole('text-primary'); }
  static textSecondary(): UIRole { return new UIRole('text-secondary'); }
  static textMuted(): UIRole { return new UIRole('text-muted'); }
  static textInverse(): UIRole { return new UIRole('text-inverse'); }
  static icon(): UIRole { return new UIRole('icon'); }
  static iconMuted(): UIRole { return new UIRole('icon-muted'); }
  static accent(): UIRole { return new UIRole('accent'); }
  static accentMuted(): UIRole { return new UIRole('accent-muted'); }
  static border(): UIRole { return new UIRole('border'); }
  static borderSubtle(): UIRole { return new UIRole('border-subtle'); }
  static divider(): UIRole { return new UIRole('divider'); }
  static overlay(): UIRole { return new UIRole('overlay'); }
  static shadow(): UIRole { return new UIRole('shadow'); }
  static focusRing(): UIRole { return new UIRole('focus-ring'); }

  /**
   * Obtiene todos los roles.
   */
  static all(): readonly UIRole[] {
    return UI_ROLES.map(r => new UIRole(r));
  }

  /**
   * Obtiene roles por categoría.
   */
  static byCategory(category: RoleCategory): readonly UIRole[] {
    return UI_ROLES
      .filter(r => ROLE_CATEGORIES[r] === category)
      .map(r => new UIRole(r));
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GETTERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Valor del rol.
   */
  get value(): UIRoleType {
    return this._value;
  }

  /**
   * Categoría del rol.
   */
  get category(): RoleCategory {
    return ROLE_CATEGORIES[this._value];
  }

  /**
   * Requisitos de accesibilidad.
   */
  get accessibilityRequirements(): RoleAccessibilityRequirements {
    return ROLE_ACCESSIBILITY[this._value];
  }

  /**
   * Nivel APCA mínimo requerido.
   */
  get minApcaLevel(): ApcaLevel {
    return ROLE_ACCESSIBILITY[this._value].minApcaLevel;
  }

  /**
   * Roles contra los que debe contrastar.
   */
  get requiresContrastAgainst(): readonly UIRoleType[] {
    return ROLE_ACCESSIBILITY[this._value].requiresContrastAgainst;
  }

  /**
   * Relaciones con otros roles.
   */
  get relationships(): RoleRelationships {
    return ROLE_RELATIONSHIPS[this._value];
  }

  /**
   * Roles con los que suele usarse en conjunto.
   */
  get pairedWith(): readonly UIRoleType[] {
    return ROLE_RELATIONSHIPS[this._value].pairedWith;
  }

  /**
   * Roles de los que puede derivarse.
   */
  get derivableFrom(): readonly UIRoleType[] {
    return ROLE_RELATIONSHIPS[this._value].derivableFrom;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PREDICADOS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Es un rol de fondo.
   */
  get isBackground(): boolean {
    return this.category === 'background';
  }

  /**
   * Es un rol de texto.
   */
  get isText(): boolean {
    return this.category === 'text';
  }

  /**
   * Es un rol de icono.
   */
  get isIcon(): boolean {
    return this.category === 'icon';
  }

  /**
   * Es un rol de acento.
   */
  get isAccent(): boolean {
    return this.category === 'accent';
  }

  /**
   * Es decorativo (no requiere contraste estricto).
   */
  get isDecorative(): boolean {
    return ROLE_ACCESSIBILITY[this._value].isDecorative;
  }

  /**
   * Depende del tamaño de fuente para requisitos de contraste.
   */
  get isFontSizeDependent(): boolean {
    return ROLE_ACCESSIBILITY[this._value].fontSizeDependent;
  }

  /**
   * Verifica si está emparejado con otro rol.
   */
  isPairedWith(other: UIRole): boolean {
    return this.pairedWith.includes(other.value);
  }

  /**
   * Verifica si puede derivarse de otro rol.
   */
  canDeriveFrom(other: UIRole): boolean {
    return this.derivableFrom.includes(other.value);
  }

  /**
   * Verifica si debe contrastar con otro rol.
   */
  mustContrastWith(other: UIRole): boolean {
    return this.requiresContrastAgainst.includes(other.value);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // TRANSFORMACIONES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Obtiene el rol "muted" correspondiente.
   */
  toMuted(): UIRole | null {
    switch (this._value) {
      case 'text-primary':
      case 'text-secondary':
        return UIRole.textMuted();
      case 'icon':
        return UIRole.iconMuted();
      case 'accent':
        return UIRole.accentMuted();
      case 'border':
        return UIRole.borderSubtle();
      default:
        return null;
    }
  }

  /**
   * Obtiene el rol "inverso" (para uso sobre accent).
   */
  toInverse(): UIRole | null {
    switch (this._value) {
      case 'text-primary':
      case 'text-secondary':
        return UIRole.textInverse();
      default:
        return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPARACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  equals(other: UIRole): boolean {
    return this._value === other._value;
  }

  /**
   * Verifica si comparten categoría.
   */
  sameCategory(other: UIRole): boolean {
    return this.category === other.category;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SERIALIZACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  toString(): string {
    return this._value;
  }

  toJSON(): UIRoleType {
    return this._value;
  }

  /**
   * Convierte a nombre de variable CSS.
   */
  toCssVar(): string {
    return `--${this._value}`;
  }

  /**
   * Convierte a nombre de token.
   */
  toTokenName(): string {
    return `color.${this._value.replace(/-/g, '.')}`;
  }
}

// ============================================================================
// ROLE PAIR
// ============================================================================

/**
 * Representa un par de roles foreground/background.
 * Útil para validación de contraste.
 */
export class RolePair {
  constructor(
    public readonly foreground: UIRole,
    public readonly background: UIRole
  ) {}

  /**
   * Verifica si el par requiere validación de contraste.
   */
  get requiresContrastValidation(): boolean {
    return this.foreground.mustContrastWith(this.background);
  }

  /**
   * Obtiene el nivel APCA mínimo requerido para este par.
   */
  get requiredApcaLevel(): ApcaLevel {
    return this.foreground.minApcaLevel;
  }

  /**
   * Verifica si es un par válido (roles que van juntos).
   */
  get isValidPair(): boolean {
    return this.foreground.isPairedWith(this.background);
  }

  equals(other: RolePair): boolean {
    return (
      this.foreground.equals(other.foreground) &&
      this.background.equals(other.background)
    );
  }

  /**
   * Invierte el par (útil para verificación bidireccional).
   */
  invert(): RolePair {
    return new RolePair(this.background, this.foreground);
  }

  toString(): string {
    return `${this.foreground.value}/${this.background.value}`;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default UIRole;
// UI_ROLES and RoleCategory are exported inline; these are not:
export { ROLE_CATEGORIES, ROLE_ACCESSIBILITY, ROLE_RELATIONSHIPS };
export type { RoleAccessibilityRequirements, RoleRelationships };

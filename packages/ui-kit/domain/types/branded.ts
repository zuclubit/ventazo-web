/**
 * @fileoverview Branded Types para el UI Kit
 *
 * Tipos con "brand" que proporcionan type-safety en tiempo de compilación
 * para prevenir mezcla accidental de valores semánticamente diferentes.
 *
 * @module ui-kit/domain/types/branded
 * @version 1.0.0
 */

// ============================================================================
// BRAND SYMBOL
// ============================================================================

declare const __brand: unique symbol;

type Brand<T, TBrand extends string> = T & { [__brand]: TBrand };

// ============================================================================
// COLOR BRANDED TYPES
// ============================================================================

/**
 * Valor hexadecimal de color con brand protection.
 * Garantiza que solo strings validados como hex colors pueden usarse.
 */
export type HexColor = Brand<string, 'HexColor'>;

/**
 * Valor de luminancia OKLCH (0-1).
 * Representa la luminancia perceptual en el espacio OKLCH.
 */
export type OklchLightness = Brand<number, 'OklchLightness'>;

/**
 * Valor de chroma OKLCH (0-0.4 típico).
 * Representa la saturación perceptual en el espacio OKLCH.
 */
export type OklchChroma = Brand<number, 'OklchChroma'>;

/**
 * Valor de hue OKLCH (0-360).
 * Representa el tono en grados en el espacio OKLCH.
 */
export type OklchHue = Brand<number, 'OklchHue'>;

/**
 * Valor de tono HCT (0-100).
 * Escala de luminancia Material Design 3.
 */
export type HctTone = Brand<number, 'HctTone'>;

/**
 * Valor de contraste APCA Lc (-108 a +108).
 * Lightness Contrast según WCAG 3.0 Working Draft.
 */
export type ApcaLc = Brand<number, 'ApcaLc'>;

/**
 * Ratio de contraste WCAG 2.1 (1-21).
 */
export type WcagRatio = Brand<number, 'WcagRatio'>;

// ============================================================================
// TOKEN BRANDED TYPES
// ============================================================================

/**
 * Identificador único de token.
 */
export type TokenId = Brand<string, 'TokenId'>;

/**
 * Nombre de token siguiendo naming convention.
 * Formato: category-role-variant-state
 */
export type TokenName = Brand<string, 'TokenName'>;

/**
 * Categoría de token (color, spacing, typography, etc.).
 */
export type TokenCategory = Brand<string, 'TokenCategory'>;

/**
 * Referencia a otro token (para aliases).
 */
export type TokenReference = Brand<string, 'TokenReference'>;

// ============================================================================
// UX BRANDED TYPES
// ============================================================================

/**
 * Identificador de componente UI.
 */
export type ComponentId = Brand<string, 'ComponentId'>;

/**
 * Identificador de decisión perceptual.
 */
export type DecisionId = Brand<string, 'DecisionId'>;

/**
 * Nivel de confianza (0-1).
 */
export type ConfidenceLevel = Brand<number, 'ConfidenceLevel'>;

/**
 * Prioridad de política (1-1000).
 */
export type PolicyPriority = Brand<number, 'PolicyPriority'>;

// ============================================================================
// GOVERNANCE BRANDED TYPES
// ============================================================================

/**
 * Identificador de política.
 */
export type PolicyId = Brand<string, 'PolicyId'>;

/**
 * Versión de política (semver).
 */
export type PolicyVersion = Brand<string, 'PolicyVersion'>;

/**
 * Identificador de violación.
 */
export type ViolationId = Brand<string, 'ViolationId'>;

/**
 * Identificador de auditoría.
 */
export type AuditId = Brand<string, 'AuditId'>;

// ============================================================================
// BRAND CONSTRUCTORS
// ============================================================================

/**
 * Funciones para crear branded types con validación.
 * Estas funciones actúan como "smart constructors" que validan
 * los valores antes de aplicar el brand.
 */
export const BrandConstructors = {
  /**
   * Crea un HexColor validado.
   * @throws {Error} Si el string no es un hex color válido.
   */
  hexColor(value: string): HexColor {
    const hexRegex = /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/;
    if (!hexRegex.test(value)) {
      throw new Error(`Invalid hex color: ${value}`);
    }
    return value as HexColor;
  },

  /**
   * Crea un OklchLightness validado.
   * @throws {Error} Si el valor está fuera del rango [0, 1].
   */
  oklchLightness(value: number): OklchLightness {
    if (value < 0 || value > 1) {
      throw new Error(`OKLCH Lightness must be in range [0, 1], got: ${value}`);
    }
    return value as OklchLightness;
  },

  /**
   * Crea un OklchChroma validado.
   * @throws {Error} Si el valor es negativo.
   */
  oklchChroma(value: number): OklchChroma {
    if (value < 0) {
      throw new Error(`OKLCH Chroma must be non-negative, got: ${value}`);
    }
    return value as OklchChroma;
  },

  /**
   * Crea un OklchHue validado (normalizado a 0-360).
   */
  oklchHue(value: number): OklchHue {
    // Normalizar a rango [0, 360)
    const normalized = ((value % 360) + 360) % 360;
    return normalized as OklchHue;
  },

  /**
   * Crea un HctTone validado.
   * @throws {Error} Si el valor está fuera del rango [0, 100].
   */
  hctTone(value: number): HctTone {
    if (value < 0 || value > 100) {
      throw new Error(`HCT Tone must be in range [0, 100], got: ${value}`);
    }
    return value as HctTone;
  },

  /**
   * Crea un ApcaLc validado.
   * @throws {Error} Si el valor está fuera del rango [-108, 108].
   */
  apcaLc(value: number): ApcaLc {
    if (value < -108 || value > 108) {
      throw new Error(`APCA Lc must be in range [-108, 108], got: ${value}`);
    }
    return value as ApcaLc;
  },

  /**
   * Crea un WcagRatio validado.
   * @throws {Error} Si el valor está fuera del rango [1, 21].
   */
  wcagRatio(value: number): WcagRatio {
    if (value < 1 || value > 21) {
      throw new Error(`WCAG Ratio must be in range [1, 21], got: ${value}`);
    }
    return value as WcagRatio;
  },

  /**
   * Crea un TokenId validado.
   */
  tokenId(value: string): TokenId {
    if (!value || value.length === 0) {
      throw new Error('TokenId cannot be empty');
    }
    return value as TokenId;
  },

  /**
   * Crea un TokenName siguiendo naming convention.
   * Formato esperado: lowercase con guiones, ej: "color-primary-hover"
   */
  tokenName(value: string): TokenName {
    const tokenNameRegex = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
    if (!tokenNameRegex.test(value)) {
      throw new Error(
        `TokenName must be lowercase with hyphens, got: ${value}`
      );
    }
    return value as TokenName;
  },

  /**
   * Crea un ConfidenceLevel validado.
   * @throws {Error} Si el valor está fuera del rango [0, 1].
   */
  confidenceLevel(value: number): ConfidenceLevel {
    if (value < 0 || value > 1) {
      throw new Error(`ConfidenceLevel must be in range [0, 1], got: ${value}`);
    }
    return value as ConfidenceLevel;
  },

  /**
   * Crea un PolicyPriority validado.
   * @throws {Error} Si el valor está fuera del rango [1, 1000].
   */
  policyPriority(value: number): PolicyPriority {
    if (value < 1 || value > 1000) {
      throw new Error(`PolicyPriority must be in range [1, 1000], got: ${value}`);
    }
    return value as PolicyPriority;
  },

  /**
   * Crea un PolicyId validado.
   */
  policyId(value: string): PolicyId {
    if (!value || value.length === 0) {
      throw new Error('PolicyId cannot be empty');
    }
    return value as PolicyId;
  },

  /**
   * Crea un PolicyVersion validado (semver).
   */
  policyVersion(value: string): PolicyVersion {
    const semverRegex = /^\d+\.\d+\.\d+(-[a-zA-Z0-9]+)?$/;
    if (!semverRegex.test(value)) {
      throw new Error(`PolicyVersion must be semver format, got: ${value}`);
    }
    return value as PolicyVersion;
  },

  /**
   * Crea IDs únicos.
   */
  generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  },

  /**
   * Crea un DecisionId único.
   */
  decisionId(): DecisionId {
    return this.generateId('dec') as DecisionId;
  },

  /**
   * Crea un AuditId único.
   */
  auditId(): AuditId {
    return this.generateId('aud') as AuditId;
  },

  /**
   * Crea un ViolationId único.
   */
  violationId(): ViolationId {
    return this.generateId('vio') as ViolationId;
  },

  /**
   * Crea un ComponentId único.
   */
  componentId(name: string): ComponentId {
    return `cmp_${name}_${Date.now()}` as ComponentId;
  },
} as const;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Type guards para verificar branded types en runtime.
 */
export const TypeGuards = {
  isHexColor(value: unknown): value is HexColor {
    if (typeof value !== 'string') return false;
    return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(value);
  },

  isOklchLightness(value: unknown): value is OklchLightness {
    return typeof value === 'number' && value >= 0 && value <= 1;
  },

  isApcaLc(value: unknown): value is ApcaLc {
    return typeof value === 'number' && value >= -108 && value <= 108;
  },

  isConfidenceLevel(value: unknown): value is ConfidenceLevel {
    return typeof value === 'number' && value >= 0 && value <= 1;
  },

  isTokenName(value: unknown): value is TokenName {
    if (typeof value !== 'string') return false;
    return /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(value);
  },
} as const;

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Extrae el tipo base de un branded type.
 */
export type UnwrapBrand<T> = T extends Brand<infer U, string> ? U : T;

/**
 * Hace que todas las propiedades sean branded.
 */
export type BrandedRecord<T, TBrand extends string> = {
  [K in keyof T]: Brand<T[K], TBrand>;
};

/**
 * Resultado de validación.
 */
export interface ValidationResult<T> {
  readonly success: boolean;
  readonly value?: T;
  readonly error?: string;
}

/**
 * Crea un ValidationResult exitoso.
 */
export function validationSuccess<T>(value: T): ValidationResult<T> {
  return { success: true, value };
}

/**
 * Crea un ValidationResult fallido.
 */
export function validationFailure<T>(error: string): ValidationResult<T> {
  return { success: false, error };
}

/**
 * Intenta crear un branded type, retornando ValidationResult.
 */
export function tryBrand<T>(
  constructor: (value: unknown) => T,
  value: unknown
): ValidationResult<T> {
  try {
    return validationSuccess(constructor(value));
  } catch (e) {
    return validationFailure((e as Error).message);
  }
}

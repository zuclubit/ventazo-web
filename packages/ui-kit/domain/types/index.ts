/**
 * @fileoverview Domain Types - Tipos fundamentales del UI Kit
 *
 * Este módulo exporta todos los tipos de dominio usados en el UI Kit.
 * Incluye branded types, enums, interfaces y tipos utilitarios.
 *
 * @module ui-kit/domain/types
 * @version 1.0.0
 */

export * from './branded';

// ============================================================================
// UI STATE TYPES
// ============================================================================

/**
 * Estados de interacción de un componente UI.
 * Cada estado puede tener tokens de color diferentes.
 */
export type UIState =
  | 'idle'
  | 'hover'
  | 'active'
  | 'focus'
  | 'disabled'
  | 'loading'
  | 'error'
  | 'success';

/**
 * Roles semánticos de color en la UI.
 * Define el propósito de un color, no su valor.
 */
export type UIRole =
  | 'background'
  | 'surface'
  | 'surface-elevated'
  | 'text-primary'
  | 'text-secondary'
  | 'text-muted'
  | 'text-inverse'
  | 'icon'
  | 'icon-muted'
  | 'accent'
  | 'accent-muted'
  | 'border'
  | 'border-subtle'
  | 'divider'
  | 'overlay'
  | 'shadow'
  | 'focus-ring';

/**
 * Intención de un componente.
 * Define qué tipo de acción o información representa.
 */
export type ComponentIntent =
  | 'navigation'
  | 'action'
  | 'action-destructive'
  | 'action-secondary'
  | 'status-info'
  | 'status-success'
  | 'status-warning'
  | 'status-error'
  | 'data-entry'
  | 'data-display'
  | 'feedback'
  | 'decoration';

/**
 * Severidad de un componente de estado.
 */
export type Severity = 'info' | 'success' | 'warning' | 'error' | 'neutral';

/**
 * Tamaños estándar de componentes.
 */
export type ComponentSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

/**
 * Variantes de estilo visual.
 */
export type ComponentVariant =
  | 'solid'
  | 'outline'
  | 'ghost'
  | 'soft'
  | 'glass'
  | 'gradient';

// ============================================================================
// ACCESSIBILITY TYPES
// ============================================================================

/**
 * Nivel de conformidad WCAG 2.1.
 */
export type WcagLevel = 'Fail' | 'A' | 'AA' | 'AAA';

/**
 * Tier de conformidad WCAG 3.0 (Working Draft).
 */
export type Wcag3Tier = 'Fail' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';

/**
 * Nivel de conformidad APCA.
 */
export type ApcaLevel =
  | 'fail'
  | 'minimum'
  | 'spot'
  | 'large'
  | 'body'
  | 'fluent'
  | 'excellent';

/**
 * Caso de uso de accesibilidad.
 */
export type AccessibilityUseCase =
  | 'body-text'
  | 'large-text'
  | 'headline'
  | 'ui-component'
  | 'decorative'
  | 'icon'
  | 'badge-text'
  | 'link'
  | 'placeholder'
  | 'disabled-text';

/**
 * Modo de contraste detectado.
 */
export type ContrastMode = 'light-content' | 'dark-content';

/**
 * Polaridad de contraste APCA.
 */
export type ContrastPolarity = 'dark-on-light' | 'light-on-dark';

// ============================================================================
// TOKEN TYPES
// ============================================================================

/**
 * Tipo de token de diseño.
 */
export type TokenType =
  | 'color'
  | 'spacing'
  | 'typography'
  | 'shadow'
  | 'border'
  | 'radius'
  | 'opacity'
  | 'duration'
  | 'easing'
  | 'z-index'
  | 'breakpoint'
  | 'composite';

/**
 * Origen de un token.
 */
export type TokenOrigin =
  | 'brand'       // Definido por la marca
  | 'derived'     // Derivado de otro token
  | 'computed'    // Calculado por Color Intelligence
  | 'governance'  // Ajustado por políticas de gobernanza
  | 'override';   // Override manual

/**
 * Formato de exportación de tokens.
 */
export type ExportFormat =
  | 'css-variables'
  | 'scss-variables'
  | 'less-variables'
  | 'tailwind'
  | 'design-tokens'  // W3C DTCG
  | 'style-dictionary'
  | 'figma-tokens'
  | 'json'
  | 'typescript';

// ============================================================================
// GOVERNANCE TYPES
// ============================================================================

/**
 * Categoría de política perceptual.
 */
export type PolicyCategory =
  | 'accessibility'
  | 'brand-consistency'
  | 'perceptual-harmony'
  | 'contrast'
  | 'color-blindness'
  | 'motion-sensitivity'
  | 'custom';

/**
 * Nivel de enforcement de política.
 */
export type PolicyEnforcement =
  | 'required'    // Must comply, blocks if violated
  | 'recommended' // Should comply, warns if violated
  | 'optional';   // Nice to have, logs if violated

/**
 * Resultado de evaluación de política.
 */
export type PolicyResult = 'pass' | 'warn' | 'fail';

/**
 * Acción tomada después de violación.
 */
export type ViolationAction =
  | 'block'     // Bloquear la operación
  | 'adjust'    // Ajustar automáticamente
  | 'warn'      // Advertir pero permitir
  | 'log';      // Solo registrar

// ============================================================================
// PERCEPTUAL TYPES
// ============================================================================

/**
 * Espacio de color soportado.
 */
export type ColorSpace =
  | 'srgb'
  | 'display-p3'
  | 'oklch'
  | 'oklab'
  | 'hct'
  | 'cam16';

/**
 * Tipo de interpolación de color.
 */
export type ColorInterpolation =
  | 'linear'
  | 'bezier'
  | 'catmull-rom'
  | 'perceptual';

/**
 * Dirección de interpolación de hue.
 */
export type HueInterpolation =
  | 'shorter'
  | 'longer'
  | 'increasing'
  | 'decreasing';

/**
 * Armonía de color.
 */
export type ColorHarmony =
  | 'complementary'
  | 'analogous'
  | 'triadic'
  | 'tetradic'
  | 'split-complementary'
  | 'monochromatic';

/**
 * Temperatura perceptual de color.
 */
export type ColorTemperature = 'cold' | 'cool' | 'neutral' | 'warm' | 'hot';

// ============================================================================
// DECISION TYPES
// ============================================================================

/**
 * Tipo de decisión perceptual.
 */
export type DecisionType =
  | 'contrast-mode'
  | 'color-adjustment'
  | 'accessibility-fix'
  | 'harmony-suggestion'
  | 'gradient-generation'
  | 'palette-derivation';

/**
 * Fuente de una decisión.
 */
export type DecisionSource =
  | 'color-intelligence'
  | 'governance-engine'
  | 'user-override'
  | 'theme-provider'
  | 'component-default';

/**
 * Estado de una decisión.
 */
export type DecisionStatus =
  | 'pending'
  | 'applied'
  | 'rejected'
  | 'overridden'
  | 'expired';

// ============================================================================
// COMPOSITE INTERFACES
// ============================================================================

/**
 * Rango numérico.
 */
export interface NumericRange {
  readonly min: number;
  readonly max: number;
}

/**
 * Coordenadas OKLCH.
 */
export interface OklchCoordinates {
  readonly l: number;  // 0-1
  readonly c: number;  // 0-0.4+
  readonly h: number;  // 0-360
  readonly alpha?: number; // 0-1
}

/**
 * Coordenadas HCT (Material Design 3).
 */
export interface HctCoordinates {
  readonly h: number;  // 0-360
  readonly c: number;  // 0-150+
  readonly t: number;  // 0-100
  readonly alpha?: number; // 0-1
}

/**
 * Coordenadas RGB.
 */
export interface RgbCoordinates {
  readonly r: number;  // 0-255
  readonly g: number;  // 0-255
  readonly b: number;  // 0-255
  readonly alpha?: number; // 0-1
}

/**
 * Coordenadas HSL.
 */
export interface HslCoordinates {
  readonly h: number;  // 0-360
  readonly s: number;  // 0-100
  readonly l: number;  // 0-100
  readonly alpha?: number; // 0-1
}

/**
 * Metadatos de accesibilidad.
 */
export interface AccessibilityMetadata {
  readonly wcagLevel: WcagLevel;
  readonly wcag3Tier: Wcag3Tier;
  readonly apcaLc: number;
  readonly apcaLevel: ApcaLevel;
  readonly contrastRatio: number;
  readonly meetsRequirement: boolean;
  readonly minimumFontSize?: number;
  readonly recommendedFontWeight?: number;
}

/**
 * Factores de detección de contraste.
 */
export interface ContrastDetectionFactors {
  readonly oklchLightness: number;
  readonly hctTone: number;
  readonly apcaPreference: ContrastMode;
  readonly warmthAdjustment: number;
  readonly chromaInfluence: number;
}

/**
 * Resultado de detección de modo de contraste.
 */
export interface ContrastModeResult {
  readonly mode: ContrastMode;
  readonly confidence: number;
  readonly factors: ContrastDetectionFactors;
  readonly recommendations: readonly string[];
}

/**
 * Metadata perceptual de un color.
 */
export interface PerceptualMetadata {
  readonly warmth: ColorTemperature;
  readonly brightness: 'dark' | 'medium' | 'light';
  readonly saturation: 'desaturated' | 'muted' | 'saturated' | 'vivid';
  readonly dominantWavelength?: number;
  readonly purity: number;
}

/**
 * Definición de estado de componente con tokens.
 */
export interface StateTokens {
  readonly background?: string;
  readonly foreground?: string;
  readonly border?: string;
  readonly shadow?: string;
  readonly outline?: string;
}

/**
 * Mapa completo de tokens por estado.
 */
export type StateTokenMap = Record<UIState, StateTokens>;

/**
 * Configuración de componente.
 */
export interface ComponentConfig {
  readonly id: string;
  readonly intent: ComponentIntent;
  readonly variant: ComponentVariant;
  readonly size: ComponentSize;
  readonly states: readonly UIState[];
  readonly roles: readonly UIRole[];
}

/**
 * Información de auditoría.
 */
export interface AuditInfo {
  readonly id: string;
  readonly timestamp: Date;
  readonly action: string;
  readonly source: DecisionSource;
  readonly details: Record<string, unknown>;
  readonly previousValue?: unknown;
  readonly newValue: unknown;
}

/**
 * Violación de política.
 */
export interface PolicyViolation {
  readonly id: string;
  readonly policyId: string;
  readonly policyName: string;
  readonly severity: 'error' | 'warning' | 'info';
  readonly message: string;
  readonly affectedTokens: readonly string[];
  readonly suggestedFix?: string;
}

/**
 * Resultado de evaluación de gobernanza.
 */
export interface GovernanceEvaluation {
  readonly isCompliant: boolean;
  readonly score: number;
  readonly violations: readonly PolicyViolation[];
  readonly warnings: readonly PolicyViolation[];
  readonly appliedAdjustments: readonly string[];
  readonly timestamp: Date;
}

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Hace todas las propiedades readonly de forma profunda.
 */
export type DeepReadonly<T> = {
  readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

/**
 * Hace todas las propiedades opcionales de forma profunda.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Extrae las keys de un tipo que son de un tipo específico.
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

/**
 * Resultado de operación que puede fallar.
 */
export type Result<T, E = Error> =
  | { readonly success: true; readonly value: T }
  | { readonly success: false; readonly error: E };

/**
 * Crea un resultado exitoso.
 */
export function success<T>(value: T): Result<T, never> {
  return { success: true, value };
}

/**
 * Crea un resultado fallido.
 */
export function failure<E>(error: E): Result<never, E> {
  return { success: false, error };
}

/**
 * Unwrap un Result, lanzando si es error.
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.success) {
    return result.value;
  }
  throw result.error;
}

/**
 * Unwrap un Result con valor por defecto.
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  return result.success ? result.value : defaultValue;
}

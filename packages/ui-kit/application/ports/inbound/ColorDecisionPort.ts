/**
 * @fileoverview ColorDecisionPort - Inbound Port for Color Decisions
 *
 * Puerto de entrada que define el contrato para tomar decisiones de color
 * basadas en contexto UX, accesibilidad y percepción.
 *
 * Este puerto es implementado por los adaptadores que necesitan
 * solicitar decisiones de color al sistema Color Intelligence.
 *
 * @module ui-kit/application/ports/inbound/ColorDecisionPort
 * @version 1.0.0
 */

import type { Result, UIState, ComponentVariant } from '../../../domain/types';
import type { PerceptualColor } from '../../../domain/perceptual';
import type { UIRole, ComponentIntent } from '../../../domain/ux';
import type { DesignToken } from '../../../domain/tokens';

// ============================================================================
// PORT TYPES
// ============================================================================

/**
 * Contexto para una solicitud de decisión de color.
 */
export interface ColorDecisionContext {
  /** Rol del elemento en la UI */
  readonly role: UIRole;
  /** Estado actual del elemento */
  readonly state: UIState;
  /** Intención del componente */
  readonly intent: ComponentIntent;
  /** Variante del componente */
  readonly variant?: ComponentVariant;
  /** Si el fondo es oscuro */
  readonly isDarkBackground?: boolean;
  /** Nivel de contraste requerido */
  readonly contrastRequirement?: 'AA' | 'AAA' | 'APCA-60' | 'APCA-75' | 'APCA-90';
  /** Metadata adicional */
  readonly metadata?: Record<string, unknown>;
}

/**
 * Resultado de una decisión de color.
 */
export interface ColorDecisionResult {
  /** Color principal decidido */
  readonly color: PerceptualColor;
  /** Color de texto para este fondo */
  readonly textColor: PerceptualColor;
  /** Color de borde si aplica */
  readonly borderColor?: PerceptualColor;
  /** Color de sombra si aplica */
  readonly shadowColor?: PerceptualColor;
  /** Ratio de contraste WCAG */
  readonly wcagContrast: number;
  /** Nivel de contraste APCA */
  readonly apcaContrast: number;
  /** Si cumple el requisito de accesibilidad */
  readonly meetsAccessibility: boolean;
  /** Token generado */
  readonly token: DesignToken;
  /** Justificación de la decisión */
  readonly rationale: string;
}

/**
 * Solicitud de decisión de escala de colores.
 */
export interface ColorScaleRequest {
  /** Nombre base para la escala */
  readonly baseName: string;
  /** Color base */
  readonly baseColor: PerceptualColor;
  /** Número de pasos en la escala */
  readonly steps?: number;
  /** Si incluir colores oscuros */
  readonly includeDark?: boolean;
  /** Si incluir colores claros */
  readonly includeLight?: boolean;
}

/**
 * Resultado de una escala de colores.
 */
export interface ColorScaleResult {
  /** Escala de colores generada (índice 0-1000) */
  readonly scale: Map<number, PerceptualColor>;
  /** Tokens generados para cada paso */
  readonly tokens: DesignToken[];
  /** Pares de accesibilidad identificados */
  readonly accessiblePairs: Array<{
    background: number;
    foreground: number;
    contrast: number;
  }>;
}

/**
 * Solicitud de tema completo.
 */
export interface ThemeRequest {
  /** Nombre del tema */
  readonly themeName: string;
  /** Color de marca primario */
  readonly brandColor: PerceptualColor;
  /** Colores semánticos opcionales */
  readonly semanticColors?: {
    readonly success?: PerceptualColor;
    readonly warning?: PerceptualColor;
    readonly error?: PerceptualColor;
    readonly info?: PerceptualColor;
  };
  /** Si generar variante oscura */
  readonly generateDarkVariant?: boolean;
  /** Contexto de la marca */
  readonly brandContext?: 'corporate' | 'playful' | 'luxury' | 'tech' | 'natural';
}

/**
 * Resultado de generación de tema.
 */
export interface ThemeResult {
  /** Colores primarios del tema */
  readonly primary: ColorScaleResult;
  /** Colores neutrales */
  readonly neutral: ColorScaleResult;
  /** Colores semánticos */
  readonly semantic: {
    readonly success: PerceptualColor;
    readonly warning: PerceptualColor;
    readonly error: PerceptualColor;
    readonly info: PerceptualColor;
  };
  /** Todos los tokens del tema */
  readonly tokens: DesignToken[];
  /** CSS generado */
  readonly css: string;
  /** Si es tema oscuro */
  readonly isDark: boolean;
}

// ============================================================================
// PORT INTERFACE
// ============================================================================

/**
 * ColorDecisionPort - Puerto de entrada para decisiones de color.
 *
 * Este puerto define el contrato que los adaptadores externos deben usar
 * para solicitar decisiones de color al sistema Color Intelligence.
 *
 * @example
 * ```typescript
 * class ReactColorAdapter implements ColorDecisionPort {
 *   async decideColor(context: ColorDecisionContext): Promise<Result<ColorDecisionResult, Error>> {
 *     // Implementación usando el UXDecision del dominio
 *     const decision = UXDecision.create(this.brandColor);
 *     return decision.request({
 *       role: context.role,
 *       state: context.state,
 *       intent: context.intent,
 *     });
 *   }
 * }
 * ```
 */
export interface ColorDecisionPort {
  /**
   * Solicita una decisión de color para un contexto específico.
   *
   * @param context - Contexto completo de la decisión
   * @returns Resultado con el color decidido o error
   */
  decideColor(context: ColorDecisionContext): Promise<Result<ColorDecisionResult, Error>>;

  /**
   * Genera una escala completa de colores.
   *
   * @param request - Parámetros de la escala
   * @returns Escala de colores con tokens
   */
  generateScale(request: ColorScaleRequest): Promise<Result<ColorScaleResult, Error>>;

  /**
   * Genera un tema completo basado en un color de marca.
   *
   * @param request - Parámetros del tema
   * @returns Tema completo con todos los tokens
   */
  generateTheme(request: ThemeRequest): Promise<Result<ThemeResult, Error>>;

  /**
   * Evalúa si dos colores cumplen requisitos de accesibilidad.
   *
   * @param foreground - Color de primer plano
   * @param background - Color de fondo
   * @param level - Nivel de accesibilidad requerido
   * @returns Resultado de la evaluación
   */
  evaluateAccessibility(
    foreground: PerceptualColor,
    background: PerceptualColor,
    level: 'AA' | 'AAA' | 'APCA-60' | 'APCA-75' | 'APCA-90'
  ): Promise<Result<{
    passes: boolean;
    wcagRatio: number;
    apcaLevel: number;
    recommendation?: PerceptualColor;
  }, Error>>;

  /**
   * Obtiene el color de texto óptimo para un fondo dado.
   *
   * @param background - Color de fondo
   * @param preferDark - Si se prefiere texto oscuro cuando sea posible
   * @returns Color de texto óptimo
   */
  getOptimalTextColor(
    background: PerceptualColor,
    preferDark?: boolean
  ): Promise<Result<PerceptualColor, Error>>;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ColorDecisionPort;

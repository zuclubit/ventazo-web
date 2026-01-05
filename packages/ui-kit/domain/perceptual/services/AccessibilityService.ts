/**
 * @fileoverview AccessibilityService - Domain Service for Contrast Calculations
 *
 * Servicio de dominio puro para cálculos de accesibilidad de color.
 * Implementa WCAG 2.1 y APCA (Accessible Perceptual Contrast Algorithm).
 *
 * Principios:
 * - Sin dependencias externas (pure domain logic)
 * - Inmutable (stateless)
 * - Algoritmos documentados con fuentes
 *
 * @module ui-kit/domain/perceptual/services/AccessibilityService
 * @version 1.0.0
 */

// ============================================================================
// TYPES
// ============================================================================

/**
 * Representación RGB normalizada (0-255).
 */
export interface RgbColor {
  readonly r: number;
  readonly g: number;
  readonly b: number;
}

/**
 * Niveles WCAG 2.1 para contraste.
 */
export type WcagLevel = 'AAA' | 'AA' | 'AA-large' | 'Fail';

/**
 * Niveles APCA para diferentes usos de texto.
 * Lc = Lightness Contrast
 */
export type ApcaLevel = 'Lc75' | 'Lc60' | 'Lc45' | 'Lc30' | 'Lc15' | 'Fail';

/**
 * Resultado de evaluación de contraste.
 */
export interface ContrastEvaluation {
  readonly wcagRatio: number;
  readonly wcagLevel: WcagLevel;
  readonly apcaValue: number;
  readonly apcaLevel: ApcaLevel;
  readonly meetsWcagAA: boolean;
  readonly meetsWcagAAA: boolean;
  readonly meetsApcaBody: boolean;
  readonly meetsApcaHeading: boolean;
  readonly meetsApcaUI: boolean;
}

/**
 * Thresholds para WCAG.
 */
export const WCAG_THRESHOLDS = Object.freeze({
  AAA: 7,
  AA: 4.5,
  'AA-large': 3,
} as const);

/**
 * Thresholds para APCA.
 * @see https://www.myndex.com/APCA/
 */
export const APCA_THRESHOLDS = Object.freeze({
  Lc75: 75,  // Body text (12px+)
  Lc60: 60,  // Large text (18px+), sub-fluent text
  Lc45: 45,  // Headings, large icons
  Lc30: 30,  // Spot text, non-essential
  Lc15: 15,  // Minimum discernible
} as const);

// ============================================================================
// ACCESSIBILITY SERVICE
// ============================================================================

/**
 * AccessibilityService - Servicio de dominio para cálculos de accesibilidad.
 *
 * Implementa:
 * - WCAG 2.1 Relative Luminance y Contrast Ratio
 * - APCA (Accessible Perceptual Contrast Algorithm)
 *
 * @example
 * ```typescript
 * const service = new AccessibilityService();
 *
 * const bg = { r: 255, g: 255, b: 255 };
 * const fg = { r: 0, g: 0, b: 0 };
 *
 * const evaluation = service.evaluate(bg, fg);
 * console.log(evaluation.wcagLevel); // 'AAA'
 * console.log(evaluation.apcaLevel); // 'Lc75'
 * ```
 */
export class AccessibilityService {
  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Evalúa el contraste entre dos colores.
   * Retorna métricas WCAG y APCA.
   */
  evaluate(background: RgbColor, foreground: RgbColor): ContrastEvaluation {
    const wcagRatio = this.calculateWcagContrast(background, foreground);
    const apcaValue = this.calculateApcaContrast(background, foreground);

    return Object.freeze({
      wcagRatio,
      wcagLevel: this.getWcagLevel(wcagRatio),
      apcaValue,
      apcaLevel: this.getApcaLevel(apcaValue),
      meetsWcagAA: wcagRatio >= WCAG_THRESHOLDS.AA,
      meetsWcagAAA: wcagRatio >= WCAG_THRESHOLDS.AAA,
      meetsApcaBody: Math.abs(apcaValue) >= APCA_THRESHOLDS.Lc60,
      meetsApcaHeading: Math.abs(apcaValue) >= APCA_THRESHOLDS.Lc45,
      meetsApcaUI: Math.abs(apcaValue) >= APCA_THRESHOLDS.Lc30,
    });
  }

  /**
   * Calcula ratio de contraste WCAG 2.1.
   * @see https://www.w3.org/WAI/WCAG21/Understanding/contrast-minimum.html
   */
  calculateWcagContrast(background: RgbColor, foreground: RgbColor): number {
    const l1 = this.relativeLuminance(background);
    const l2 = this.relativeLuminance(foreground);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Calcula valor de contraste APCA.
   *
   * Implementación simplificada del algoritmo APCA.
   * Para producción, considerar usar la librería oficial apca-w3.
   *
   * @see https://github.com/Myndex/SAPC-APCA
   * @see https://www.myndex.com/APCA/
   */
  calculateApcaContrast(background: RgbColor, foreground: RgbColor): number {
    const yBg = this.apcaLuminance(background);
    const yFg = this.apcaLuminance(foreground);

    // Polarity: positive = dark text on light bg, negative = light text on dark bg
    const polarity = yBg > yFg ? 1 : -1;

    // SAPC calculation with simplified exponents
    // Based on APCA-W3 0.0.98G-4g
    const normBG = Math.pow(yBg, 0.56);
    const normTXT = Math.pow(yFg, 0.57);

    const SAPC = (normBG - normTXT) * 1.14;

    // Scale to Lc (0-100+)
    return SAPC * 100 * polarity;
  }

  /**
   * Determina nivel WCAG basado en ratio de contraste.
   */
  getWcagLevel(ratio: number): WcagLevel {
    if (ratio >= WCAG_THRESHOLDS.AAA) return 'AAA';
    if (ratio >= WCAG_THRESHOLDS.AA) return 'AA';
    if (ratio >= WCAG_THRESHOLDS['AA-large']) return 'AA-large';
    return 'Fail';
  }

  /**
   * Determina nivel APCA basado en valor Lc.
   */
  getApcaLevel(lc: number): ApcaLevel {
    const absLc = Math.abs(lc);
    if (absLc >= APCA_THRESHOLDS.Lc75) return 'Lc75';
    if (absLc >= APCA_THRESHOLDS.Lc60) return 'Lc60';
    if (absLc >= APCA_THRESHOLDS.Lc45) return 'Lc45';
    if (absLc >= APCA_THRESHOLDS.Lc30) return 'Lc30';
    if (absLc >= APCA_THRESHOLDS.Lc15) return 'Lc15';
    return 'Fail';
  }

  /**
   * Sugiere color de texto óptimo para un fondo dado.
   */
  suggestTextColor(
    background: RgbColor,
    preferDark: boolean = true
  ): { color: RgbColor; evaluation: ContrastEvaluation } {
    const white: RgbColor = { r: 255, g: 255, b: 255 };
    const black: RgbColor = { r: 0, g: 0, b: 0 };

    const whiteEval = this.evaluate(background, white);
    const blackEval = this.evaluate(background, black);

    // Use APCA contrast, with preferDark as tiebreaker
    const whiteBetter = Math.abs(whiteEval.apcaValue) > Math.abs(blackEval.apcaValue);
    const blackBetter = Math.abs(blackEval.apcaValue) > Math.abs(whiteEval.apcaValue);
    const useWhite = whiteBetter || (!blackBetter && !preferDark);

    if (useWhite) {
      return { color: white, evaluation: whiteEval };
    } else {
      return { color: black, evaluation: blackEval };
    }
  }

  /**
   * Verifica si un par de colores cumple requisitos mínimos.
   */
  meetsMinimumRequirements(
    background: RgbColor,
    foreground: RgbColor,
    options: {
      wcagLevel?: 'AA' | 'AAA';
      apcaMinimum?: number;
    } = {}
  ): boolean {
    const { wcagLevel = 'AA', apcaMinimum = APCA_THRESHOLDS.Lc45 } = options;
    const evaluation = this.evaluate(background, foreground);

    const wcagThreshold = wcagLevel === 'AAA' ? WCAG_THRESHOLDS.AAA : WCAG_THRESHOLDS.AA;

    return (
      evaluation.wcagRatio >= wcagThreshold &&
      Math.abs(evaluation.apcaValue) >= apcaMinimum
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calcula luminancia relativa WCAG.
   * @see https://www.w3.org/WAI/GL/wiki/Relative_luminance
   */
  private relativeLuminance(rgb: RgbColor): number {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(channel => {
      const normalized = channel / 255;
      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  /**
   * Calcula luminancia perceptual APCA (Y).
   * Coeficientes específicos de APCA.
   */
  private apcaLuminance(rgb: RgbColor): number {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(channel =>
      Math.pow(channel / 255, 2.4)
    );

    return 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Instancia singleton para uso conveniente.
 */
export const accessibilityService = new AccessibilityService();

// ============================================================================
// EXPORTS
// ============================================================================

export default AccessibilityService;

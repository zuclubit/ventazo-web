/**
 * @fileoverview EvaluateComponentAccessibility Use Case
 *
 * Use case para evaluar la accesibilidad de los colores de un componente
 * según estándares WCAG 2.1 y APCA.
 *
 * @module ui-kit/application/use-cases/EvaluateComponentAccessibility
 * @version 1.0.0
 */

import type { Result, WcagLevel, ApcaLevel } from '../../domain/types';
import { success, failure } from '../../domain/types';
import { PerceptualColor } from '../../domain/perceptual';
import { TokenCollection } from '../../domain/tokens';
import type { AuditPort } from '../ports/outbound/AuditPort';

// ============================================================================
// LOCAL TYPES
// ============================================================================

/**
 * Accessibility violation for audit logging.
 * Defined locally as it's specific to this use case.
 */
export interface AccessibilityViolation {
  readonly type: 'contrast' | 'color-blind' | 'motion';
  readonly severity: 'error' | 'warning' | 'info';
  readonly element: string;
  readonly message: string;
  readonly wcagCriteria?: string;
  readonly foreground?: string;
  readonly background?: string;
  readonly actualRatio?: number;
  readonly requiredRatio?: number;
  readonly suggestion?: string;
}

// ============================================================================
// TYPES
// ============================================================================

/**
 * Par de colores a evaluar.
 */
export interface ColorPair {
  readonly name: string;
  readonly foreground: string;
  readonly background: string;
  readonly role?: string;
  readonly minimumWcagLevel?: WcagLevel;
  readonly minimumApcaLevel?: ApcaLevel;
}

/**
 * Input para el use case.
 */
export interface EvaluateAccessibilityInput {
  /** Pares de colores a evaluar */
  readonly colorPairs?: ColorPair[];
  /** Colección de tokens a evaluar */
  readonly tokenCollection?: TokenCollection;
  /** Nivel WCAG requerido */
  readonly requiredWcagLevel: WcagLevel;
  /** Nivel APCA requerido */
  readonly requiredApcaLevel: ApcaLevel;
  /** Si debe fallar en la primera violación */
  readonly failFast?: boolean;
}

/**
 * Resultado de evaluación de un par.
 */
export interface PairEvaluationResult {
  readonly pairName: string;
  readonly foreground: string;
  readonly background: string;
  readonly wcag: {
    readonly ratio: number;
    readonly level: WcagLevel;
    readonly passesAA: boolean;
    readonly passesAAA: boolean;
    readonly passesAALarge: boolean;
  };
  readonly apca: {
    readonly contrast: number;
    readonly level: ApcaLevel;
    readonly passesBodyText: boolean;
    readonly passesHeading: boolean;
    readonly passesNonText: boolean;
  };
  readonly passes: boolean;
  readonly violations: string[];
  readonly recommendations: string[];
}

/**
 * Output del use case.
 */
export interface EvaluateAccessibilityOutput {
  /** Si pasa todos los criterios */
  readonly passes: boolean;
  /** Número de pares evaluados */
  readonly totalPairs: number;
  /** Número de pares que pasan */
  readonly passingPairs: number;
  /** Número de violaciones */
  readonly violationCount: number;
  /** Resultados por par */
  readonly results: PairEvaluationResult[];
  /** Resumen de violaciones */
  readonly violations: AccessibilityViolation[];
  /** Score general (0-100) */
  readonly score: number;
  /** Recomendaciones generales */
  readonly recommendations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/**
 * Ratios mínimos WCAG mapped to WcagLevel type.
 */
const WCAG_RATIOS: Record<WcagLevel, number> = {
  'Fail': 0,     // Below minimum
  'A': 3.0,      // Minimum for large text
  'AA': 4.5,     // Standard requirement
  'AAA': 7.0,    // Enhanced requirement
} as const;

/**
 * Contrastes mínimos APCA mapped to ApcaLevel type.
 */
const APCA_LEVELS: Record<ApcaLevel, number> = {
  'fail': 0,        // Below minimum
  'minimum': 15,    // Decorative only
  'spot': 30,       // Non-text, icons
  'large': 45,      // Large text, headings
  'body': 60,       // Standard body text
  'fluent': 75,     // Optimal reading
  'excellent': 90,  // Maximum readability
} as const;

/**
 * Thresholds for AA-large (legacy support).
 */
const WCAG_AA_LARGE_RATIO = 3.0;

// ============================================================================
// USE CASE
// ============================================================================

/**
 * EvaluateComponentAccessibility - Evalúa accesibilidad de colores.
 *
 * Evalúa pares de colores foreground/background según:
 * - WCAG 2.1 contrast ratio (AA, AAA)
 * - APCA (Accessible Perceptual Contrast Algorithm)
 *
 * @example
 * ```typescript
 * const useCase = new EvaluateComponentAccessibility();
 *
 * const result = await useCase.execute({
 *   colorPairs: [
 *     { name: 'button', foreground: '#FFFFFF', background: '#3B82F6' },
 *     { name: 'text', foreground: '#1F2937', background: '#FFFFFF' },
 *   ],
 *   requiredWcagLevel: 'AA',
 *   requiredApcaLevel: 'Lc60',
 * });
 *
 * if (result.success && result.value.passes) {
 *   console.log('All pairs pass accessibility requirements');
 * } else {
 *   console.log('Violations:', result.value.violations);
 * }
 * ```
 */
export class EvaluateComponentAccessibility {
  // ─────────────────────────────────────────────────────────────────────────
  // DEPENDENCIES
  // ─────────────────────────────────────────────────────────────────────────

  private readonly auditPort?: AuditPort;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor(auditPort?: AuditPort) {
    this.auditPort = auditPort;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EXECUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Ejecuta la evaluación de accesibilidad.
   */
  async execute(
    input: EvaluateAccessibilityInput
  ): Promise<Result<EvaluateAccessibilityOutput, Error>> {
    try {
      // 1. Obtener pares a evaluar
      const pairs = this.resolvePairs(input);
      if (pairs.length === 0) {
        return failure(new Error('No color pairs to evaluate'));
      }

      // 2. Evaluar cada par
      const results: PairEvaluationResult[] = [];
      const violations: AccessibilityViolation[] = [];

      for (const pair of pairs) {
        const result = this.evaluatePair(pair, input);
        results.push(result);

        if (!result.passes) {
          violations.push(...this.createViolations(result, input));

          if (input.failFast) {
            break;
          }
        }
      }

      // 3. Calcular estadísticas
      const passingPairs = results.filter(r => r.passes).length;
      const score = Math.round((passingPairs / results.length) * 100);

      // 4. Generar recomendaciones
      const recommendations = this.generateRecommendations(results, input);

      // 5. Log audit si está disponible
      if (this.auditPort && results.length > 0) {
        // Log each evaluation individually
        for (const result of results) {
          const fgResult = PerceptualColor.tryFromHex(result.foreground);
          const bgResult = PerceptualColor.tryFromHex(result.background);
          if (fgResult.success && bgResult.success) {
            await this.auditPort.logAccessibilityEvaluation({
              foreground: fgResult.value,
              background: bgResult.value,
              wcagRatio: result.wcag.ratio,
              apcaLevel: result.apca.contrast,
              requiredLevel: input.requiredWcagLevel,
              passes: result.passes,
              component: result.pairName,
            });
          }
        }
      }

      const output: EvaluateAccessibilityOutput = {
        passes: violations.length === 0,
        totalPairs: pairs.length,
        passingPairs,
        violationCount: violations.length,
        results,
        violations,
        score,
        recommendations,
      };

      return success(output);
    } catch (error) {
      return failure(
        error instanceof Error
          ? error
          : new Error('Unknown error during accessibility evaluation')
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PAIR RESOLUTION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Resuelve los pares a evaluar desde input.
   */
  private resolvePairs(input: EvaluateAccessibilityInput): ColorPair[] {
    const pairs: ColorPair[] = [];

    // Agregar pares directos
    if (input.colorPairs) {
      pairs.push(...input.colorPairs);
    }

    // Extraer pares de colección de tokens
    if (input.tokenCollection) {
      const tokenPairs = this.extractPairsFromCollection(input.tokenCollection);
      pairs.push(...tokenPairs);
    }

    return pairs;
  }

  /**
   * Extrae pares de colores de una colección de tokens.
   */
  private extractPairsFromCollection(collection: TokenCollection): ColorPair[] {
    const pairs: ColorPair[] = [];
    const colorTokens = collection.byType('color');

    // Buscar pares de background/text
    const backgrounds = colorTokens.filter(t =>
      t.context.role === 'background' ||
      t.context.role === 'surface' ||
      t.name.includes('.bg')
    );

    const texts = colorTokens.filter(t =>
      t.context.role?.startsWith('text') ||
      t.name.includes('.text')
    );

    for (const bg of backgrounds) {
      for (const text of texts) {
        // Solo emparejar si pertenecen al mismo componente o namespace
        if (bg.namespace === text.namespace || bg.context.component === text.context.component) {
          pairs.push({
            name: `${bg.name} / ${text.name}`,
            background: bg.toCssValue(),
            foreground: text.toCssValue(),
            role: text.context.role,
          });
        }
      }
    }

    return pairs;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // EVALUATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Evalúa un par de colores.
   */
  private evaluatePair(
    pair: ColorPair,
    input: EvaluateAccessibilityInput
  ): PairEvaluationResult {
    const fgResult = PerceptualColor.tryFromHex(pair.foreground);
    const bgResult = PerceptualColor.tryFromHex(pair.background);

    if (!fgResult.success || !bgResult.success) {
      return this.createErrorResult(pair, 'Invalid color value');
    }

    const fgColor = fgResult.value;
    const bgColor = bgResult.value;

    // Calcular WCAG
    const wcagRatio = this.calculateWcagRatio(fgColor, bgColor);
    const wcagLevel = this.determineWcagLevel(wcagRatio);
    const passesAA = wcagRatio >= WCAG_RATIOS.AA;
    const passesAAA = wcagRatio >= WCAG_RATIOS.AAA;
    const passesAALarge = wcagRatio >= WCAG_AA_LARGE_RATIO;

    // Calcular APCA
    const apcaContrast = this.calculateApcaContrast(fgColor, bgColor);
    const apcaLevel = this.determineApcaLevel(apcaContrast);
    const passesBodyText = Math.abs(apcaContrast) >= APCA_LEVELS.fluent;
    const passesHeading = Math.abs(apcaContrast) >= APCA_LEVELS.body;
    const passesNonText = Math.abs(apcaContrast) >= APCA_LEVELS.spot;

    // Determinar si pasa según requisitos
    const violations: string[] = [];
    const recommendations: string[] = [];

    // Verificar WCAG
    if (input.requiredWcagLevel === 'AAA' && !passesAAA) {
      violations.push(`WCAG AAA requires ratio >= 7.0, got ${wcagRatio.toFixed(2)}`);
    } else if (input.requiredWcagLevel === 'AA' && !passesAA) {
      violations.push(`WCAG AA requires ratio >= 4.5, got ${wcagRatio.toFixed(2)}`);
    }

    // Verificar APCA
    const requiredApca = APCA_LEVELS[input.requiredApcaLevel];
    if (Math.abs(apcaContrast) < requiredApca) {
      violations.push(
        `APCA ${input.requiredApcaLevel} requires |Lc| >= ${requiredApca}, got ${apcaContrast.toFixed(1)}`
      );
    }

    // Generar recomendaciones
    if (!passesAA && passesAALarge) {
      recommendations.push('Consider using this combination only for large text (18pt+ or 14pt bold)');
    }

    if (!passesBodyText && passesHeading) {
      recommendations.push('This contrast is suitable for headings but not body text');
    }

    return {
      pairName: pair.name,
      foreground: pair.foreground,
      background: pair.background,
      wcag: {
        ratio: wcagRatio,
        level: wcagLevel,
        passesAA,
        passesAAA,
        passesAALarge,
      },
      apca: {
        contrast: apcaContrast,
        level: apcaLevel,
        passesBodyText,
        passesHeading,
        passesNonText,
      },
      passes: violations.length === 0,
      violations,
      recommendations,
    };
  }

  /**
   * Crea resultado de error.
   */
  private createErrorResult(pair: ColorPair, error: string): PairEvaluationResult {
    return {
      pairName: pair.name,
      foreground: pair.foreground,
      background: pair.background,
      wcag: {
        ratio: 0,
        level: 'Fail',
        passesAA: false,
        passesAAA: false,
        passesAALarge: false,
      },
      apca: {
        contrast: 0,
        level: 'fail',
        passesBodyText: false,
        passesHeading: false,
        passesNonText: false,
      },
      passes: false,
      violations: [error],
      recommendations: [],
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CALCULATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calcula ratio de contraste WCAG 2.1.
   */
  private calculateWcagRatio(fg: PerceptualColor, bg: PerceptualColor): number {
    const fgRgb = fg.rgb;
    const bgRgb = bg.rgb;

    const luminance = (rgb: { r: number; g: number; b: number }) => {
      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => {
        v = v / 255;
        return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
      });
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };

    const l1 = luminance(fgRgb);
    const l2 = luminance(bgRgb);
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
  }

  /**
   * Calcula contraste APCA.
   */
  private calculateApcaContrast(fg: PerceptualColor, bg: PerceptualColor): number {
    const fgRgb = fg.rgb;
    const bgRgb = bg.rgb;

    const toY = (rgb: { r: number; g: number; b: number }) => {
      const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(v => Math.pow(v / 255, 2.4));
      return 0.2126729 * r + 0.7151522 * g + 0.0721750 * b;
    };

    const yBg = toY(bgRgb);
    const yFg = toY(fgRgb);

    const polarity = yBg > yFg ? 1 : -1;
    const normBG = Math.pow(yBg, 0.56);
    const normTXT = Math.pow(yFg, 0.57);
    const SAPC = (normBG - normTXT) * 1.14;

    return SAPC * 100 * polarity;
  }

  /**
   * Determina nivel WCAG.
   */
  private determineWcagLevel(ratio: number): WcagLevel {
    if (ratio >= WCAG_RATIOS.AAA) return 'AAA';
    if (ratio >= WCAG_RATIOS.AA) return 'AA';
    if (ratio >= WCAG_RATIOS.A) return 'A';
    return 'Fail';
  }

  /**
   * Determina nivel APCA.
   */
  private determineApcaLevel(contrast: number): ApcaLevel {
    const absContrast = Math.abs(contrast);
    if (absContrast >= APCA_LEVELS.excellent) return 'excellent';
    if (absContrast >= APCA_LEVELS.fluent) return 'fluent';
    if (absContrast >= APCA_LEVELS.body) return 'body';
    if (absContrast >= APCA_LEVELS.large) return 'large';
    if (absContrast >= APCA_LEVELS.spot) return 'spot';
    if (absContrast >= APCA_LEVELS.minimum) return 'minimum';
    return 'fail';
  }

  // ─────────────────────────────────────────────────────────────────────────
  // VIOLATIONS & RECOMMENDATIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea objetos de violación para audit.
   */
  private createViolations(
    result: PairEvaluationResult,
    input: EvaluateAccessibilityInput
  ): AccessibilityViolation[] {
    return result.violations.map(message => ({
      type: 'contrast',
      severity: 'error',
      element: result.pairName,
      message,
      wcagCriteria: input.requiredWcagLevel === 'AAA' ? '1.4.6' : '1.4.3',
      foreground: result.foreground,
      background: result.background,
      actualRatio: result.wcag.ratio,
      requiredRatio: WCAG_RATIOS[input.requiredWcagLevel],
      suggestion: this.generateFixSuggestion(result),
    }));
  }

  /**
   * Genera sugerencia de corrección.
   */
  private generateFixSuggestion(result: PairEvaluationResult): string {
    const bgColor = PerceptualColor.tryFromHex(result.background);
    const fgColor = PerceptualColor.tryFromHex(result.foreground);

    if (!bgColor.success || !fgColor.success) {
      return 'Adjust colors to meet contrast requirements';
    }

    const bgL = bgColor.value.oklch.l;
    const fgL = fgColor.value.oklch.l;

    if (bgL > 0.5) {
      // Fondo claro - oscurecer texto
      return `Try darkening the foreground. Current lightness: ${(fgL * 100).toFixed(0)}%. Suggested: ${Math.max(0, (fgL - 0.2) * 100).toFixed(0)}%`;
    } else {
      // Fondo oscuro - aclarar texto
      return `Try lightening the foreground. Current lightness: ${(fgL * 100).toFixed(0)}%. Suggested: ${Math.min(100, (fgL + 0.2) * 100).toFixed(0)}%`;
    }
  }

  /**
   * Genera recomendaciones generales.
   */
  private generateRecommendations(
    results: PairEvaluationResult[],
    _input: EvaluateAccessibilityInput
  ): string[] {
    const recommendations: string[] = [];
    const failingCount = results.filter(r => !r.passes).length;

    if (failingCount > results.length / 2) {
      recommendations.push(
        'More than half of color pairs fail accessibility requirements. Consider reviewing the color palette.'
      );
    }

    const lowContrastPairs = results.filter(r => r.wcag.ratio < 3.0);
    if (lowContrastPairs.length > 0) {
      recommendations.push(
        `${lowContrastPairs.length} pair(s) have very low contrast (< 3:1). These should be used only for decorative purposes.`
      );
    }

    const apcaOnlyPairs = results.filter(r =>
      !r.wcag.passesAA && r.apca.passesHeading
    );
    if (apcaOnlyPairs.length > 0) {
      recommendations.push(
        `${apcaOnlyPairs.length} pair(s) pass APCA but fail WCAG. Consider APCA for perceptual accuracy, but WCAG for legal compliance.`
      );
    }

    return recommendations;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default EvaluateComponentAccessibility;

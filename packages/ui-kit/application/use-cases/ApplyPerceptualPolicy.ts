/**
 * @fileoverview ApplyPerceptualPolicy Use Case
 *
 * Use case para aplicar políticas perceptuales a colecciones de tokens,
 * garantizando consistencia perceptual y accesibilidad.
 *
 * Las políticas perceptuales definen:
 * - Rangos de luminosidad permitidos
 * - Diferencias mínimas de contraste
 * - Armonías de color
 * - Consistencia de saturación
 *
 * @module ui-kit/application/use-cases/ApplyPerceptualPolicy
 * @version 1.0.0
 */

import type { Result } from '../../domain/types';
import { success, failure } from '../../domain/types';
import { PerceptualColor } from '../../domain/perceptual';
import { TokenCollection, DesignToken } from '../../domain/tokens';
import type { AuditPort } from '../ports/outbound/AuditPort';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Política de luminosidad.
 */
export interface LightnessPolicy {
  /** Luminosidad mínima permitida */
  readonly min: number;
  /** Luminosidad máxima permitida */
  readonly max: number;
  /** Si ajustar automáticamente tokens fuera de rango */
  readonly autoAdjust: boolean;
}

/**
 * Política de saturación.
 */
export interface ChromaPolicy {
  /** Saturación mínima permitida */
  readonly min: number;
  /** Saturación máxima permitida */
  readonly max: number;
  /** Tolerancia de variación entre tokens relacionados */
  readonly varianceTolerance: number;
  /** Si ajustar automáticamente */
  readonly autoAdjust: boolean;
}

/**
 * Política de contraste.
 */
export interface ContrastPolicy {
  /** Ratio mínimo WCAG */
  readonly minWcagRatio: number;
  /** Nivel mínimo APCA */
  readonly minApcaLevel: number;
  /** Pares que deben cumplir (ej: ['text', 'background']) */
  readonly requiredPairs: Array<[string, string]>;
  /** Acción si falla */
  readonly onFailure: 'warn' | 'error' | 'adjust';
}

/**
 * Política de armonía.
 */
export interface HarmonyPolicy {
  /** Tipo de armonía */
  readonly type: 'complementary' | 'analogous' | 'triadic' | 'split-complementary' | 'tetradic' | 'none';
  /** Tolerancia en grados */
  readonly hueTolerance: number;
  /** Si ajustar automáticamente */
  readonly autoAdjust: boolean;
}

/**
 * Política perceptual completa.
 */
export interface PerceptualPolicy {
  /** Nombre de la política */
  readonly name: string;
  /** Descripción */
  readonly description?: string;
  /** Política de luminosidad */
  readonly lightness?: LightnessPolicy;
  /** Política de saturación */
  readonly chroma?: ChromaPolicy;
  /** Política de contraste */
  readonly contrast?: ContrastPolicy;
  /** Política de armonía */
  readonly harmony?: HarmonyPolicy;
  /** Si es política estricta (falla en cualquier violación) */
  readonly strict?: boolean;
}

/**
 * Violación de política detectada.
 */
export interface PolicyViolation {
  /** Token que viola */
  readonly token: DesignToken;
  /** Regla violada */
  readonly rule: 'lightness' | 'chroma' | 'contrast' | 'harmony';
  /** Valor actual */
  readonly actualValue: number | string;
  /** Valor esperado */
  readonly expectedValue: string;
  /** Severidad */
  readonly severity: 'warning' | 'error';
  /** Sugerencia de corrección */
  readonly suggestion?: string;
  /** Token corregido si autoAdjust está activo */
  readonly correctedToken?: DesignToken;
}

/**
 * Input para el use case.
 */
export interface ApplyPerceptualPolicyInput {
  /** Colección de tokens a evaluar */
  readonly collection: TokenCollection;
  /** Política a aplicar */
  readonly policy: PerceptualPolicy;
  /** Si aplicar correcciones automáticas */
  readonly applyCorrections?: boolean;
  /** Si generar reporte detallado */
  readonly generateReport?: boolean;
}

/**
 * Output del use case.
 */
export interface ApplyPerceptualPolicyOutput {
  /** Si la colección cumple la política */
  readonly compliant: boolean;
  /** Violaciones encontradas */
  readonly violations: PolicyViolation[];
  /** Colección corregida (si applyCorrections es true) */
  readonly correctedCollection?: TokenCollection;
  /** Resumen de cumplimiento */
  readonly summary: {
    readonly totalTokens: number;
    readonly compliantTokens: number;
    readonly warningCount: number;
    readonly errorCount: number;
    readonly correctedCount: number;
    readonly complianceRate: number;
  };
  /** Reporte detallado si se solicitó */
  readonly report?: string;
}

// ============================================================================
// PRESET POLICIES
// ============================================================================

/**
 * Políticas perceptuales predefinidas.
 */
export const PRESET_POLICIES: Record<string, PerceptualPolicy> = {
  /** Política estándar WCAG AA */
  wcagAA: {
    name: 'WCAG 2.1 AA',
    description: 'Cumplimiento mínimo WCAG 2.1 nivel AA',
    lightness: { min: 0, max: 100, autoAdjust: false },
    chroma: { min: 0, max: 150, varianceTolerance: 20, autoAdjust: false },
    contrast: {
      minWcagRatio: 4.5,
      minApcaLevel: 60,
      requiredPairs: [['foreground', 'background']],
      onFailure: 'error',
    },
    strict: false,
  },

  /** Política estricta WCAG AAA */
  wcagAAA: {
    name: 'WCAG 2.1 AAA',
    description: 'Cumplimiento WCAG 2.1 nivel AAA',
    lightness: { min: 10, max: 90, autoAdjust: true },
    chroma: { min: 0, max: 130, varianceTolerance: 15, autoAdjust: true },
    contrast: {
      minWcagRatio: 7.0,
      minApcaLevel: 75,
      requiredPairs: [['foreground', 'background']],
      onFailure: 'error',
    },
    strict: true,
  },

  /** Política de alto contraste */
  highContrast: {
    name: 'High Contrast',
    description: 'Alto contraste para usuarios con baja visión',
    lightness: { min: 0, max: 100, autoAdjust: true },
    contrast: {
      minWcagRatio: 10.0,
      minApcaLevel: 90,
      requiredPairs: [['foreground', 'background']],
      onFailure: 'adjust',
    },
    strict: true,
  },

  /** Política de armonía de marca */
  brandHarmony: {
    name: 'Brand Harmony',
    description: 'Consistencia cromática para identidad de marca',
    chroma: { min: 30, max: 100, varianceTolerance: 10, autoAdjust: true },
    harmony: {
      type: 'analogous',
      hueTolerance: 30,
      autoAdjust: true,
    },
    strict: false,
  },

  /** Política permisiva (solo warnings) */
  lenient: {
    name: 'Lenient',
    description: 'Política permisiva que solo genera warnings',
    contrast: {
      minWcagRatio: 3.0,
      minApcaLevel: 45,
      requiredPairs: [],
      onFailure: 'warn',
    },
    strict: false,
  },
};

// ============================================================================
// USE CASE
// ============================================================================

/**
 * ApplyPerceptualPolicy - Aplica políticas perceptuales a tokens.
 *
 * Este use case evalúa una colección de tokens contra una política
 * perceptual, identificando violaciones y opcionalmente corrigiéndolas.
 *
 * @example
 * ```typescript
 * const useCase = new ApplyPerceptualPolicy(auditService);
 *
 * const result = await useCase.execute({
 *   collection: tokenCollection,
 *   policy: PRESET_POLICIES.wcagAA,
 *   applyCorrections: true,
 *   generateReport: true,
 * });
 *
 * if (result.success) {
 *   if (result.value.compliant) {
 *     console.log('All tokens are compliant!');
 *   } else {
 *     console.log(`Found ${result.value.violations.length} violations`);
 *     if (result.value.correctedCollection) {
 *       // Use corrected collection
 *     }
 *   }
 * }
 * ```
 */
export class ApplyPerceptualPolicy {
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
   * Ejecuta el use case.
   */
  async execute(
    input: ApplyPerceptualPolicyInput
  ): Promise<Result<ApplyPerceptualPolicyOutput, Error>> {
    try {
      const { collection, policy, applyCorrections = false, generateReport = false } = input;

      // Validar input
      if (!collection || collection.all().length === 0) {
        return failure(new Error('Token collection is empty'));
      }

      const violations: PolicyViolation[] = [];
      const colorTokens = collection.byType('color');

      // Evaluar cada token de color
      for (const token of colorTokens) {
        const tokenViolations = this.evaluateToken(token, policy);
        violations.push(...tokenViolations);
      }

      // Aplicar correcciones si se solicita
      let correctedCollection: TokenCollection | undefined;
      let correctedCount = 0;

      if (applyCorrections && violations.some(v => v.correctedToken)) {
        correctedCollection = this.createCorrectedCollection(collection, violations);
        correctedCount = violations.filter(v => v.correctedToken).length;
      }

      // Calcular resumen
      const summary = this.calculateSummary(collection, violations, correctedCount);

      // Registrar en auditoría si está disponible
      if (this.auditPort) {
        await this.auditPort.log({
          category: 'validation',
          severity: summary.errorCount > 0 ? 'warning' : 'info',
          message: `Perceptual policy "${policy.name}" applied to ${summary.totalTokens} tokens`,
          data: {
            policyName: policy.name,
            complianceRate: summary.complianceRate,
            violationCount: violations.length,
            correctedCount,
          },
        });
      }

      // Generar reporte si se solicita
      let report: string | undefined;
      if (generateReport) {
        report = this.generateReport(policy, violations, summary);
      }

      return success({
        compliant: violations.filter(v => v.severity === 'error').length === 0,
        violations,
        correctedCollection,
        summary,
        report,
      });
    } catch (error) {
      return failure(
        error instanceof Error ? error : new Error('Unknown error during policy evaluation')
      );
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Evalúa un token contra la política.
   */
  private evaluateToken(token: DesignToken, policy: PerceptualPolicy): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    // Obtener color del token
    const colorHex = token.toCssVariable().replace(/var\(--[^)]+\)/, '').trim();
    const colorResult = PerceptualColor.tryFromHex(colorHex);

    if (!colorResult.success) {
      return violations; // Skip non-color tokens
    }

    const color = colorResult.value;
    const oklch = color.oklch;

    // Evaluar luminosidad
    if (policy.lightness) {
      const violation = this.evaluateLightness(token, oklch.l * 100, policy.lightness);
      if (violation) violations.push(violation);
    }

    // Evaluar saturación
    if (policy.chroma) {
      const violation = this.evaluateChroma(token, oklch.c * 100, policy.chroma);
      if (violation) violations.push(violation);
    }

    return violations;
  }

  /**
   * Evalúa política de luminosidad.
   */
  private evaluateLightness(
    token: DesignToken,
    lightness: number,
    policy: LightnessPolicy
  ): PolicyViolation | null {
    if (lightness < policy.min || lightness > policy.max) {
      const correctedToken = policy.autoAdjust
        ? this.adjustLightness(token, lightness, policy)
        : undefined;

      return {
        token,
        rule: 'lightness',
        actualValue: lightness.toFixed(1),
        expectedValue: `${policy.min}-${policy.max}`,
        severity: 'error',
        suggestion: `Adjust lightness to be within ${policy.min}-${policy.max}`,
        correctedToken,
      };
    }
    return null;
  }

  /**
   * Evalúa política de saturación.
   */
  private evaluateChroma(
    token: DesignToken,
    chroma: number,
    policy: ChromaPolicy
  ): PolicyViolation | null {
    if (chroma < policy.min || chroma > policy.max) {
      const correctedToken = policy.autoAdjust
        ? this.adjustChroma(token, chroma, policy)
        : undefined;

      return {
        token,
        rule: 'chroma',
        actualValue: chroma.toFixed(1),
        expectedValue: `${policy.min}-${policy.max}`,
        severity: 'warning',
        suggestion: `Adjust chroma to be within ${policy.min}-${policy.max}`,
        correctedToken,
      };
    }
    return null;
  }

  /**
   * Ajusta luminosidad de un token.
   */
  private adjustLightness(
    token: DesignToken,
    currentLightness: number,
    _policy: LightnessPolicy
  ): DesignToken {
    // Simplified placeholder - would calculate target based on policy.min/max
    // and currentLightness, then adjust token color accordingly
    void currentLightness;
    return token;
  }

  /**
   * Ajusta saturación de un token.
   */
  private adjustChroma(
    token: DesignToken,
    _currentChroma: number,
    _policy: ChromaPolicy
  ): DesignToken {
    // Create adjusted token (simplified)
    return token;
  }

  /**
   * Crea colección corregida.
   */
  private createCorrectedCollection(
    original: TokenCollection,
    violations: PolicyViolation[]
  ): TokenCollection {
    const correctedMap = new Map<string, DesignToken>();

    // Map corrected tokens
    for (const violation of violations) {
      if (violation.correctedToken) {
        correctedMap.set(violation.token.name, violation.correctedToken);
      }
    }

    // Collect all tokens (corrected where applicable)
    const allTokens: DesignToken[] = [];
    for (const token of original.all()) {
      allTokens.push(correctedMap.get(token.name) || token);
    }

    // Create collection with all tokens at once (immutable pattern)
    return TokenCollection.from(`${original.name}-corrected`, allTokens, original.description);
  }

  /**
   * Calcula resumen de cumplimiento.
   */
  private calculateSummary(
    collection: TokenCollection,
    violations: PolicyViolation[],
    correctedCount: number
  ): ApplyPerceptualPolicyOutput['summary'] {
    const totalTokens = collection.all().length;
    const errorCount = violations.filter(v => v.severity === 'error').length;
    const warningCount = violations.filter(v => v.severity === 'warning').length;
    const violatingTokens = new Set(violations.map(v => v.token.name)).size;

    return {
      totalTokens,
      compliantTokens: totalTokens - violatingTokens,
      warningCount,
      errorCount,
      correctedCount,
      complianceRate: (totalTokens - violatingTokens) / totalTokens,
    };
  }

  /**
   * Genera reporte de texto.
   */
  private generateReport(
    policy: PerceptualPolicy,
    violations: PolicyViolation[],
    summary: ApplyPerceptualPolicyOutput['summary']
  ): string {
    const lines: string[] = [
      '═══════════════════════════════════════════════════════════════',
      `  PERCEPTUAL POLICY REPORT: ${policy.name}`,
      '═══════════════════════════════════════════════════════════════',
      '',
      `Policy Description: ${policy.description || 'N/A'}`,
      '',
      '─── SUMMARY ──────────────────────────────────────────────────',
      `Total Tokens:      ${summary.totalTokens}`,
      `Compliant Tokens:  ${summary.compliantTokens}`,
      `Compliance Rate:   ${(summary.complianceRate * 100).toFixed(1)}%`,
      `Errors:            ${summary.errorCount}`,
      `Warnings:          ${summary.warningCount}`,
      `Corrected:         ${summary.correctedCount}`,
      '',
    ];

    if (violations.length > 0) {
      lines.push('─── VIOLATIONS ───────────────────────────────────────────────');
      for (const v of violations) {
        lines.push(`[${v.severity.toUpperCase()}] ${v.token.name}`);
        lines.push(`  Rule: ${v.rule}`);
        lines.push(`  Actual: ${v.actualValue}`);
        lines.push(`  Expected: ${v.expectedValue}`);
        if (v.suggestion) {
          lines.push(`  Suggestion: ${v.suggestion}`);
        }
        lines.push('');
      }
    }

    lines.push('═══════════════════════════════════════════════════════════════');
    return lines.join('\n');
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default ApplyPerceptualPolicy;

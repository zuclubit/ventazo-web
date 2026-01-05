/**
 * @fileoverview Token Derivation Service
 *
 * Servicio de dominio para derivar tokens automáticamente basándose
 * en reglas perceptuales y semánticas.
 *
 * @module ui-kit/domain/tokens/services/TokenDerivationService
 * @version 1.0.0
 */

import { PerceptualColor } from '../../perceptual/value-objects/PerceptualColor';
import { accessibilityService } from '../../perceptual/services/AccessibilityService';
import { UIRole } from '../../ux/value-objects/UIRole';
import { ComponentIntent } from '../../ux/value-objects/ComponentIntent';
import { DesignToken, TokenContext } from '../value-objects/DesignToken';
import { TokenCollection } from '../entities/TokenCollection';
import type { UIState as UIStateType, UIRole as UIRoleType, ComponentVariant } from '../../types';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Configuración de derivación.
 */
export interface DerivationConfig {
  readonly states: readonly UIStateType[];
  readonly roles: readonly UIRoleType[];
  readonly variants: readonly ComponentVariant[];
  readonly generateAccessibilityPairs: boolean;
  readonly generateScaleSteps: boolean;
  readonly scaleSteps: number;
}

/**
 * Regla de derivación de estado.
 */
export interface StateDerivationRule {
  readonly state: UIStateType;
  readonly lightnessAdjust: number;
  readonly chromaAdjust: number;
  readonly opacityMultiplier: number;
}

/**
 * Regla de derivación de escala.
 */
export interface ScaleDerivationRule {
  readonly step: number;
  readonly lightnessTarget: number;
  readonly chromaMultiplier: number;
}

/**
 * Par de accesibilidad generado.
 */
export interface AccessibilityPair {
  readonly background: DesignToken;
  readonly foreground: DesignToken;
  readonly apcaContrast: number;
  readonly wcagRatio: number;
  readonly passes: {
    readonly apcaBody: boolean;
    readonly apcaHeading: boolean;
    readonly wcagAA: boolean;
    readonly wcagAAA: boolean;
  };
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Configuración por defecto de derivación.
 */
export const DEFAULT_DERIVATION_CONFIG: DerivationConfig = {
  states: ['idle', 'hover', 'active', 'focus', 'disabled'],
  roles: ['background', 'surface', 'accent', 'text-primary', 'text-secondary', 'border'],
  variants: ['solid', 'soft', 'outline', 'ghost'],
  generateAccessibilityPairs: true,
  generateScaleSteps: true,
  scaleSteps: 9,
};

/**
 * Reglas de derivación por estado.
 */
const STATE_DERIVATION_RULES: Record<UIStateType, StateDerivationRule> = {
  idle: {
    state: 'idle',
    lightnessAdjust: 0,
    chromaAdjust: 0,
    opacityMultiplier: 1,
  },
  hover: {
    state: 'hover',
    lightnessAdjust: 0.05,
    chromaAdjust: 0.02,
    opacityMultiplier: 1,
  },
  active: {
    state: 'active',
    lightnessAdjust: -0.08,
    chromaAdjust: 0.03,
    opacityMultiplier: 1,
  },
  focus: {
    state: 'focus',
    lightnessAdjust: 0,
    chromaAdjust: 0.01,
    opacityMultiplier: 1,
  },
  disabled: {
    state: 'disabled',
    lightnessAdjust: 0.2,
    chromaAdjust: -0.08,
    opacityMultiplier: 0.5,
  },
  loading: {
    state: 'loading',
    lightnessAdjust: 0,
    chromaAdjust: -0.05,
    opacityMultiplier: 0.7,
  },
  error: {
    state: 'error',
    lightnessAdjust: 0,
    chromaAdjust: 0.1,
    opacityMultiplier: 1,
  },
  success: {
    state: 'success',
    lightnessAdjust: 0,
    chromaAdjust: 0.05,
    opacityMultiplier: 1,
  },
};

/**
 * Pasos de escala de luminosidad (similar a Tailwind 50-950).
 */
const LIGHTNESS_SCALE: Record<number, number> = {
  50: 0.97,
  100: 0.94,
  200: 0.88,
  300: 0.80,
  400: 0.70,
  500: 0.55,  // Base
  600: 0.45,
  700: 0.35,
  800: 0.25,
  900: 0.18,
  950: 0.12,
};

// ============================================================================
// TOKEN DERIVATION SERVICE
// ============================================================================

/**
 * TokenDerivationService - Servicio para derivación automática de tokens.
 *
 * Genera tokens derivados basándose en:
 * - Estados de interacción (hover, active, etc.)
 * - Escalas de luminosidad (50-950)
 * - Pares de accesibilidad (foreground/background)
 * - Variantes de componente (solid, soft, outline, ghost)
 *
 * @example
 * ```typescript
 * const service = new TokenDerivationService();
 *
 * // Derivar estados para un color base
 * const baseColor = PerceptualColor.fromHex('#3B82F6').value!;
 * const stateTokens = service.deriveStates('button.primary', baseColor);
 *
 * // Generar escala completa
 * const scale = service.deriveScale('blue', baseColor);
 *
 * // Generar colección completa para componente
 * const collection = service.deriveComponentTokens('button', baseColor, 'action');
 * ```
 */
export class TokenDerivationService {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE STATE
  // ─────────────────────────────────────────────────────────────────────────

  private readonly _config: DerivationConfig;
  private readonly _stateRules: Map<UIStateType, StateDerivationRule>;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor(config: Partial<DerivationConfig> = {}) {
    this._config = { ...DEFAULT_DERIVATION_CONFIG, ...config };
    this._stateRules = new Map(
      Object.entries(STATE_DERIVATION_RULES) as [UIStateType, StateDerivationRule][]
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATE DERIVATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Deriva tokens de estado desde un color base.
   */
  deriveStates(
    baseName: string,
    baseColor: PerceptualColor,
    context: Partial<TokenContext> = {}
  ): DesignToken[] {
    const tokens: DesignToken[] = [];

    for (const state of this._config.states) {
      const rule = this._stateRules.get(state);
      if (!rule) continue;

      const derivedColor = this.applyStateRule(baseColor, rule);
      const tokenName = `${baseName}.${state}`;

      tokens.push(
        DesignToken.color(
          tokenName,
          derivedColor,
          { ...context, state },
          `${baseName} in ${state} state`
        )
      );
    }

    return tokens;
  }

  /**
   * Aplica regla de estado a un color.
   */
  private applyStateRule(
    color: PerceptualColor,
    rule: StateDerivationRule
  ): PerceptualColor {
    let result = color;

    if (rule.lightnessAdjust !== 0) {
      result = rule.lightnessAdjust > 0
        ? result.lighten(Math.abs(rule.lightnessAdjust))
        : result.darken(Math.abs(rule.lightnessAdjust));
    }

    if (rule.chromaAdjust !== 0) {
      result = rule.chromaAdjust > 0
        ? result.saturate(Math.abs(rule.chromaAdjust))
        : result.desaturate(Math.abs(rule.chromaAdjust));
    }

    // Opacity se manejará en el token o CSS
    return result;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SCALE DERIVATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Deriva una escala completa de luminosidad (50-950).
   */
  deriveScale(
    baseName: string,
    baseColor: PerceptualColor,
    context: Partial<TokenContext> = {}
  ): DesignToken[] {
    const tokens: DesignToken[] = [];
    const baseOklch = baseColor.oklch;

    for (const [step, lightness] of Object.entries(LIGHTNESS_SCALE)) {
      // Ajustar croma para mantener viveza perceptual
      const chromaMultiplier = this.calculateChromaMultiplier(lightness, baseOklch.l);
      const adjustedChroma = baseOklch.c * chromaMultiplier;

      const scaledColor = PerceptualColor.fromOklch(
        lightness,
        Math.min(adjustedChroma, 0.4), // Cap chroma
        baseOklch.h
      );

      const tokenName = `${baseName}.${step}`;

      tokens.push(
        DesignToken.color(
          tokenName,
          scaledColor,
          context,
          `${baseName} at ${step} lightness`
        )
      );
    }

    return tokens;
  }

  /**
   * Calcula multiplicador de croma para preservar percepción.
   */
  private calculateChromaMultiplier(targetL: number, _baseL: number): number {
    // Los extremos de luminosidad necesitan menos croma
    if (targetL > 0.9 || targetL < 0.2) {
      return 0.5;
    }
    // Cerca del medio, mantener croma similar
    if (targetL > 0.4 && targetL < 0.7) {
      return 1.0;
    }
    // Transición suave
    return 0.75;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ACCESSIBILITY PAIR DERIVATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Genera pares de colores con contraste garantizado.
   */
  deriveAccessibilityPairs(
    baseName: string,
    baseColor: PerceptualColor,
    context: Partial<TokenContext> = {}
  ): AccessibilityPair[] {
    const pairs: AccessibilityPair[] = [];
    const scale = this.deriveScale(baseName, baseColor);

    // Generar pares: backgrounds claros con texts oscuros y viceversa
    const lightSteps = [50, 100, 200];
    const darkSteps = [800, 900, 950];

    // Pares claros (fondo claro, texto oscuro)
    for (const bgStep of lightSteps) {
      for (const fgStep of darkSteps) {
        const bgToken = scale.find(t => t.name.endsWith(`.${bgStep}`));
        const fgToken = scale.find(t => t.name.endsWith(`.${fgStep}`));

        if (bgToken && fgToken) {
          const pair = this.createAccessibilityPair(
            `${baseName}.pair.${bgStep}-${fgStep}`,
            bgToken,
            fgToken,
            context
          );
          if (pair) pairs.push(pair);
        }
      }
    }

    // Pares oscuros (fondo oscuro, texto claro)
    for (const bgStep of darkSteps) {
      for (const fgStep of lightSteps) {
        const bgToken = scale.find(t => t.name.endsWith(`.${bgStep}`));
        const fgToken = scale.find(t => t.name.endsWith(`.${fgStep}`));

        if (bgToken && fgToken) {
          const pair = this.createAccessibilityPair(
            `${baseName}.pair.${bgStep}-${fgStep}`,
            bgToken,
            fgToken,
            context
          );
          if (pair) pairs.push(pair);
        }
      }
    }

    return pairs;
  }

  /**
   * Crea un par de accesibilidad con métricas.
   */
  private createAccessibilityPair(
    _name: string,
    bgToken: DesignToken,
    fgToken: DesignToken,
    _context: Partial<TokenContext>
  ): AccessibilityPair | null {
    const bgColorResult = PerceptualColor.tryFromHex(bgToken.toCssValue());
    const fgColorResult = PerceptualColor.tryFromHex(fgToken.toCssValue());

    if (!bgColorResult.success || !fgColorResult.success) {
      return null;
    }

    const bgColor = bgColorResult.value;
    const fgColor = fgColorResult.value;

    // Calcular contrastes using AccessibilityService
    const bgRgb = bgColor.rgb;
    const fgRgb = fgColor.rgb;

    const wcagRatio = accessibilityService.calculateWcagContrast(bgRgb, fgRgb);
    const apcaContrast = accessibilityService.calculateApcaContrast(bgRgb, fgRgb);

    return {
      background: bgToken,
      foreground: fgToken,
      apcaContrast,
      wcagRatio,
      passes: {
        apcaBody: Math.abs(apcaContrast) >= 60,
        apcaHeading: Math.abs(apcaContrast) >= 45,
        wcagAA: wcagRatio >= 4.5,
        wcagAAA: wcagRatio >= 7.0,
      },
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPONENT TOKEN DERIVATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Deriva una colección completa de tokens para un componente.
   */
  deriveComponentTokens(
    componentName: string,
    brandColor: PerceptualColor,
    intent: ComponentIntent
  ): TokenCollection {
    // Collect all tokens first (immutable pattern)
    const allTokens: DesignToken[] = [];
    const baseName = `${componentName}.${intent.value}`;

    // Tokens de estado
    const stateTokens = this.deriveStates(baseName, brandColor, {
      component: componentName,
      intent: intent.value,
    });
    allTokens.push(...stateTokens);

    // Tokens por variante
    for (const variant of intent.recommendedVariants) {
      const variantTokens = this.deriveVariantTokens(
        componentName,
        brandColor,
        intent,
        variant
      );
      allTokens.push(...variantTokens);
    }

    // Tokens de rol semántico
    for (const role of intent.primaryRoles) {
      const roleColor = this.deriveRoleColor(brandColor, UIRole.of(role));
      const roleToken = DesignToken.color(
        `${baseName}.${role}`,
        roleColor,
        { role, component: componentName, intent: intent.value },
        `${componentName} ${role} color`
      );
      allTokens.push(roleToken);
    }

    // Create collection with all tokens at once
    return TokenCollection.from(componentName, allTokens);
  }

  /**
   * Deriva tokens para una variante específica.
   */
  private deriveVariantTokens(
    componentName: string,
    brandColor: PerceptualColor,
    intent: ComponentIntent,
    variant: ComponentVariant
  ): DesignToken[] {
    const tokens: DesignToken[] = [];
    const baseName = `${componentName}.${intent.value}.${variant}`;

    switch (variant) {
      case 'solid': {
        // Background sólido, texto invertido
        tokens.push(
          DesignToken.color(baseName + '.bg', brandColor, {
            component: componentName,
            variant,
            role: 'accent',
          }),
          DesignToken.color(baseName + '.text', this.deriveContrastText(brandColor), {
            component: componentName,
            variant,
            role: 'text-inverse',
          })
        );
        break;
      }

      case 'soft': {
        // Background suave (alta luminosidad), texto del color
        const softBg = brandColor.lighten(0.35);
        const softText = brandColor.darken(0.15);
        tokens.push(
          DesignToken.color(baseName + '.bg', softBg, {
            component: componentName,
            variant,
            role: 'accent-muted',
          }),
          DesignToken.color(baseName + '.text', softText, {
            component: componentName,
            variant,
            role: 'text-primary',
          })
        );
        break;
      }

      case 'outline': {
        // Sin background, borde del color
        tokens.push(
          DesignToken.color(baseName + '.border', brandColor, {
            component: componentName,
            variant,
            role: 'border',
          }),
          DesignToken.color(baseName + '.text', brandColor, {
            component: componentName,
            variant,
            role: 'text-primary',
          })
        );
        break;
      }

      case 'ghost': {
        // Sin background visible, solo texto
        tokens.push(
          DesignToken.color(baseName + '.text', brandColor, {
            component: componentName,
            variant,
            role: 'text-primary',
          }),
          DesignToken.color(baseName + '.bg-hover', brandColor.lighten(0.4), {
            component: componentName,
            variant,
            role: 'background',
            state: 'hover',
          })
        );
        break;
      }

      case 'glass': {
        // Efecto glassmorphism
        const glassBg = brandColor.lighten(0.3);
        tokens.push(
          DesignToken.color(baseName + '.bg', glassBg, {
            component: componentName,
            variant,
            role: 'surface-elevated',
          }),
          DesignToken.color(baseName + '.border', brandColor.lighten(0.2), {
            component: componentName,
            variant,
            role: 'border-subtle',
          })
        );
        break;
      }

      case 'gradient': {
        // Gradiente
        const gradientEnd = PerceptualColor.fromOklch(
          brandColor.oklch.l,
          brandColor.oklch.c,
          (brandColor.oklch.h + 30) % 360
        );

        tokens.push(
          DesignToken.gradient(
            baseName + '.bg',
            {
              type: 'linear',
              angle: 135,
              stops: [
                { color: brandColor.hex, position: 0 },
                { color: gradientEnd.hex, position: 1 },
              ],
            },
            { component: componentName, variant }
          )
        );
        break;
      }
    }

    return tokens;
  }

  /**
   * Deriva color de texto con contraste adecuado.
   */
  private deriveContrastText(backgroundColor: PerceptualColor): PerceptualColor {
    const bgL = backgroundColor.oklch.l;

    // Si el fondo es oscuro, texto claro; si es claro, texto oscuro
    if (bgL < 0.55) {
      return PerceptualColor.fromOklch(0.98, 0, 0); // Blanco
    } else {
      return PerceptualColor.fromOklch(0.15, 0, 0); // Negro
    }
  }

  /**
   * Deriva color para un rol específico.
   */
  private deriveRoleColor(brandColor: PerceptualColor, role: UIRole): PerceptualColor {
    const oklch = brandColor.oklch;

    switch (role.value) {
      case 'background':
        return PerceptualColor.fromOklch(0.99, 0.005, oklch.h);
      case 'surface':
        return PerceptualColor.fromOklch(0.97, 0.008, oklch.h);
      case 'surface-elevated':
        return PerceptualColor.fromOklch(0.98, 0.01, oklch.h);
      case 'accent':
        return brandColor;
      case 'accent-muted':
        return brandColor.lighten(0.25);
      case 'text-primary':
        return PerceptualColor.fromOklch(0.2, 0.01, oklch.h);
      case 'text-secondary':
        return PerceptualColor.fromOklch(0.45, 0.02, oklch.h);
      case 'text-muted':
        return PerceptualColor.fromOklch(0.6, 0.015, oklch.h);
      case 'text-inverse':
        return PerceptualColor.fromOklch(0.98, 0.005, oklch.h);
      case 'border':
        return PerceptualColor.fromOklch(0.85, 0.02, oklch.h);
      case 'border-subtle':
        return PerceptualColor.fromOklch(0.92, 0.01, oklch.h);
      case 'icon':
        return PerceptualColor.fromOklch(0.4, oklch.c * 0.5, oklch.h);
      case 'shadow':
        return PerceptualColor.fromOklch(0.1, 0.02, oklch.h);
      case 'overlay':
        return PerceptualColor.fromOklch(0.15, 0.01, oklch.h);
      case 'focus-ring':
        return brandColor.saturate(0.1);
      default:
        return brandColor;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // FULL THEME DERIVATION
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Deriva un tema completo desde un color de marca.
   */
  deriveTheme(
    themeName: string,
    brandColor: PerceptualColor,
    options: {
      includeSemanticColors?: boolean;
      includeShadows?: boolean;
      includeSpacing?: boolean;
    } = {}
  ): TokenCollection {
    // Collect all tokens first (immutable pattern)
    const allTokens: DesignToken[] = [];

    // 1. Escala del color de marca
    const brandScale = this.deriveScale('brand', brandColor);
    allTokens.push(...brandScale);

    // 2. Colores semánticos
    if (options.includeSemanticColors !== false) {
      const semanticColors = this.deriveSemanticColors(brandColor);
      allTokens.push(...semanticColors);
    }

    // 3. Colores neutrales (grises derivados del brand)
    const neutrals = this.deriveNeutrals(brandColor);
    allTokens.push(...neutrals);

    // 4. Sombras
    if (options.includeShadows !== false) {
      const shadows = this.deriveShadows(brandColor);
      allTokens.push(...shadows);
    }

    // Create collection with all tokens at once
    return TokenCollection.from(themeName, allTokens);
  }

  /**
   * Deriva colores semánticos (success, warning, error, info).
   */
  private deriveSemanticColors(brandColor: PerceptualColor): DesignToken[] {
    const tokens: DesignToken[] = [];
    const brandH = brandColor.oklch.h;

    // Success (verde)
    const successBase = PerceptualColor.fromOklch(0.55, 0.15, 145);
    tokens.push(...this.deriveScale('success', successBase));

    // Warning (amarillo/naranja)
    const warningBase = PerceptualColor.fromOklch(0.55, 0.15, 85);
    tokens.push(...this.deriveScale('warning', warningBase));

    // Error (rojo)
    const errorBase = PerceptualColor.fromOklch(0.55, 0.2, 25);
    tokens.push(...this.deriveScale('error', errorBase));

    // Info (azul, cercano al brand si brand es azul)
    const infoH = Math.abs(brandH - 250) < 40 ? brandH : 250;
    const infoBase = PerceptualColor.fromOklch(0.55, 0.15, infoH);
    tokens.push(...this.deriveScale('info', infoBase));

    return tokens;
  }

  /**
   * Deriva grises con tinte del brand.
   */
  private deriveNeutrals(brandColor: PerceptualColor): DesignToken[] {
    const tokens: DesignToken[] = [];
    const brandH = brandColor.oklch.h;

    // Grises con muy leve tinte del color de marca
    for (const [step, lightness] of Object.entries(LIGHTNESS_SCALE)) {
      const neutralColor = PerceptualColor.fromOklch(
        lightness,
        0.005, // Casi sin saturación
        brandH
      );

      tokens.push(
        DesignToken.color(
          `neutral.${step}`,
          neutralColor,
          { role: lightness > 0.5 ? 'background' : 'text-primary' },
          `Neutral gray at ${step}`
        )
      );
    }

    return tokens;
  }

  /**
   * Deriva sombras coherentes con el tema.
   */
  private deriveShadows(brandColor: PerceptualColor): DesignToken[] {
    const shadowColor = PerceptualColor.fromOklch(
      0.15,
      0.02,
      brandColor.oklch.h
    ).hex;

    return [
      DesignToken.shadow('shadow.xs', [
        { offsetX: 0, offsetY: 1, blur: 2, spread: 0, color: `${shadowColor}10` },
      ]),
      DesignToken.shadow('shadow.sm', [
        { offsetX: 0, offsetY: 1, blur: 3, spread: 0, color: `${shadowColor}15` },
        { offsetX: 0, offsetY: 1, blur: 2, spread: -1, color: `${shadowColor}10` },
      ]),
      DesignToken.shadow('shadow.md', [
        { offsetX: 0, offsetY: 4, blur: 6, spread: -1, color: `${shadowColor}15` },
        { offsetX: 0, offsetY: 2, blur: 4, spread: -2, color: `${shadowColor}10` },
      ]),
      DesignToken.shadow('shadow.lg', [
        { offsetX: 0, offsetY: 10, blur: 15, spread: -3, color: `${shadowColor}15` },
        { offsetX: 0, offsetY: 4, blur: 6, spread: -4, color: `${shadowColor}10` },
      ]),
      DesignToken.shadow('shadow.xl', [
        { offsetX: 0, offsetY: 20, blur: 25, spread: -5, color: `${shadowColor}20` },
        { offsetX: 0, offsetY: 8, blur: 10, spread: -6, color: `${shadowColor}10` },
      ]),
      DesignToken.shadow('shadow.2xl', [
        { offsetX: 0, offsetY: 25, blur: 50, spread: -12, color: `${shadowColor}30` },
      ]),
    ];
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export default TokenDerivationService;
export {
  STATE_DERIVATION_RULES,
  LIGHTNESS_SCALE,
};

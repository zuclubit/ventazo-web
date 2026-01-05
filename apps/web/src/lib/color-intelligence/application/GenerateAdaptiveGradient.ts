// ============================================
// GenerateAdaptiveGradient Use Case
// Perceptually Uniform Gradient Generation with Smart Adaptation
// ============================================

import OKLCH from '../domain/value-objects/OKLCH';
import APCAContrast from '../domain/value-objects/APCAContrast';
import { Gradient, ColorStop, HuePath, GamutStrategy, LightnessCurve } from '../domain/entities/Gradient';
import { detectContrastMode, ContrastMode } from './DetectContrastMode';

/**
 * Gradient generation preset
 */
export type GradientPreset =
  | 'brand-surface'      // Brand color to transparent surface
  | 'brand-accent'       // Brand to accent color
  | 'glass-overlay'      // Glass effect with depth
  | 'depth-shadow'       // For shadow effects
  | 'status-indicator'   // Status color gradients
  | 'text-fade'          // Text fade effects
  | 'button-hover'       // Interactive button states
  | 'card-highlight'     // Card highlight effects
  | 'custom';            // Fully custom

/**
 * Smart gradient configuration
 */
export interface AdaptiveGradientConfig {
  preset?: GradientPreset;

  // Color inputs (hex or OKLCH)
  primaryColor: string | OKLCH;
  secondaryColor?: string | OKLCH;

  // Gradient behavior
  angle?: number;              // CSS angle in degrees
  type?: 'linear' | 'radial' | 'conic';

  // Quality settings
  steps?: number;              // Number of color stops (more = smoother)
  huePath?: HuePath;           // How to interpolate hue
  gamutStrategy?: GamutStrategy;
  lightnessCurve?: LightnessCurve;

  // Adaptation settings
  adaptToContrast?: boolean;   // Auto-adjust based on contrast mode
  adaptToSurface?: string;     // Surface color to adapt against

  // Output settings
  includeFallback?: boolean;   // Include RGB fallback
  includeVars?: boolean;       // Output as CSS custom properties
}

/**
 * Generated gradient result
 */
export interface AdaptiveGradientResult {
  // CSS output
  css: string;
  cssWithFallback?: string;
  cssVars?: Record<string, string>;

  // Gradient entity for further manipulation
  gradient: Gradient;

  // Analysis
  analysis: {
    contrastMode: ContrastMode;
    problemAreas: ReturnType<Gradient['analyzeProblemAreas']>;
    smoothnessScore: number;
    accessibilityNotes: string[];
  };

  // Debug info
  stops: Array<{
    position: number;
    color: string;
    oklch: { l: number; c: number; h: number };
  }>;
}

// ============================================
// Preset Configurations
// ============================================

const PRESET_CONFIGS: Record<GradientPreset, Partial<AdaptiveGradientConfig>> = {
  'brand-surface': {
    steps: 5,
    huePath: 'shorter',
    lightnessCurve: 'ease',
    gamutStrategy: 'adaptive',
    adaptToContrast: true,
  },
  'brand-accent': {
    steps: 7,
    huePath: 'shorter',
    lightnessCurve: 'linear',
    gamutStrategy: 'reduce-chroma',
  },
  'glass-overlay': {
    steps: 3,
    huePath: 'none',
    lightnessCurve: 'ease',
    gamutStrategy: 'clamp',
  },
  'depth-shadow': {
    steps: 5,
    huePath: 'none',
    lightnessCurve: 'ease',
    gamutStrategy: 'adjust-lightness',
  },
  'status-indicator': {
    steps: 3,
    huePath: 'shorter',
    lightnessCurve: 'linear',
    gamutStrategy: 'reduce-chroma',
  },
  'text-fade': {
    steps: 3,
    huePath: 'none',
    lightnessCurve: 'ease',
    gamutStrategy: 'clamp',
  },
  'button-hover': {
    steps: 2,
    huePath: 'none',
    lightnessCurve: 'linear',
    gamutStrategy: 'reduce-chroma',
  },
  'card-highlight': {
    steps: 4,
    huePath: 'shorter',
    lightnessCurve: 'ease',
    gamutStrategy: 'adaptive',
  },
  'custom': {},
};

// ============================================
// Main Use Case Function
// ============================================

/**
 * GenerateAdaptiveGradient Use Case
 *
 * Creates perceptually uniform gradients that adapt to brand colors
 * and ensure accessibility compliance.
 *
 * @example
 * ```typescript
 * const result = generateAdaptiveGradient({
 *   preset: 'brand-surface',
 *   primaryColor: '#0EB58C',
 *   angle: 135,
 * });
 * // result.css = "linear-gradient(135deg, oklch(...)...)"
 * ```
 */
export function generateAdaptiveGradient(
  config: AdaptiveGradientConfig
): AdaptiveGradientResult {
  // Merge preset with config
  const preset = config.preset ?? 'custom';
  const presetConfig = PRESET_CONFIGS[preset];

  const cfg: Required<Omit<AdaptiveGradientConfig, 'secondaryColor' | 'adaptToSurface'>> &
    Pick<AdaptiveGradientConfig, 'secondaryColor' | 'adaptToSurface'> = {
    preset,
    primaryColor: config.primaryColor,
    secondaryColor: config.secondaryColor,
    angle: config.angle ?? 180,
    type: config.type ?? 'linear',
    steps: config.steps ?? presetConfig.steps ?? 5,
    huePath: config.huePath ?? presetConfig.huePath ?? 'shorter',
    gamutStrategy: config.gamutStrategy ?? presetConfig.gamutStrategy ?? 'adaptive',
    lightnessCurve: config.lightnessCurve ?? presetConfig.lightnessCurve ?? 'linear',
    adaptToContrast: config.adaptToContrast ?? presetConfig.adaptToContrast ?? true,
    adaptToSurface: config.adaptToSurface,
    includeFallback: config.includeFallback ?? true,
    includeVars: config.includeVars ?? false,
  };

  // Parse primary color
  const primary = typeof cfg.primaryColor === 'string'
    ? OKLCH.fromHex(cfg.primaryColor)
    : cfg.primaryColor;

  if (!primary) {
    throw new Error(`Invalid primary color: ${cfg.primaryColor}`);
  }

  // Detect contrast mode
  const contrastResult = detectContrastMode(primary);
  const isLightMode = contrastResult.mode === 'light-content';

  // Generate secondary color if not provided
  let secondary: OKLCH;

  if (cfg.secondaryColor) {
    const parsed = typeof cfg.secondaryColor === 'string'
      ? OKLCH.fromHex(cfg.secondaryColor)
      : cfg.secondaryColor;

    if (!parsed) {
      throw new Error(`Invalid secondary color: ${cfg.secondaryColor}`);
    }
    secondary = parsed;
  } else {
    // Auto-generate based on preset
    secondary = generateSecondaryColor(primary, preset, isLightMode);
  }

  // Create gradient stops
  const stops = createGradientStops(primary, secondary, cfg);

  // Build gradient entity
  // Note: type and angle are CSS output concerns, not entity concerns
  const gradient = Gradient.fromStops(stops, {
    huePath: cfg.huePath,
    gamutStrategy: cfg.gamutStrategy,
    lightnessCurve: cfg.lightnessCurve,
  });

  // Analyze gradient
  const problemAreas = gradient.analyzeProblemAreas();
  const smoothnessScore = calculateSmoothnessScore(gradient, cfg.steps);

  // Generate accessibility notes
  const accessibilityNotes = generateAccessibilityNotes(
    gradient,
    contrastResult.mode,
    cfg.adaptToSurface
  );

  // Generate CSS output
  const css = gradient.toCss();
  const cssWithFallback = cfg.includeFallback
    ? gradient.toCssWithFallback()
    : undefined;

  // Generate CSS vars if requested
  const cssVars = cfg.includeVars
    ? generateCssVars(gradient, stops)
    : undefined;

  // Build result
  return {
    css,
    cssWithFallback,
    cssVars,
    gradient,
    analysis: {
      contrastMode: contrastResult.mode,
      problemAreas,
      smoothnessScore,
      accessibilityNotes,
    },
    stops: stops.map((stop, i) => {
      const color = gradient.colorAt(stop.position);
      return {
        position: stop.position,
        color: color.toHex(),
        oklch: { l: color.l, c: color.c, h: color.h },
      };
    }),
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Generate secondary color based on preset and primary
 */
function generateSecondaryColor(
  primary: OKLCH,
  preset: GradientPreset,
  isLightMode: boolean
): OKLCH {
  switch (preset) {
    case 'brand-surface':
      // Fade to transparent-like (very low alpha simulated via lightness)
      return isLightMode
        ? primary.withLightness(0.98).withChroma(primary.c * 0.1)
        : primary.withLightness(0.08).withChroma(primary.c * 0.1);

    case 'brand-accent':
      // Shift hue by ~30° for analogous accent
      return primary
        .withHue((primary.h + 30) % 360)
        .withChroma(Math.min(primary.c * 1.1, 0.3));

    case 'glass-overlay':
      // Subtle transparency effect
      return isLightMode
        ? OKLCH.create(0.99, 0, primary.h)
        : OKLCH.create(0.1, 0, primary.h);

    case 'depth-shadow':
      // Deep shadow
      return OKLCH.create(
        Math.max(0, primary.l - 0.4),
        primary.c * 0.3,
        primary.h
      );

    case 'status-indicator':
      // Lighter version
      return primary.lighten(0.2).saturate(-0.3);

    case 'text-fade':
      // Fade to transparent (simulated)
      return primary.withChroma(0).withLightness(isLightMode ? 0.95 : 0.1);

    case 'button-hover':
      // Slight lightness shift
      return isLightMode
        ? primary.darken(0.1)
        : primary.lighten(0.1);

    case 'card-highlight':
      // Subtle highlight
      return isLightMode
        ? primary.lighten(0.15).withChroma(primary.c * 0.5)
        : primary.lighten(0.2).withChroma(primary.c * 0.6);

    default:
      // Default: complementary
      return primary.withHue((primary.h + 180) % 360);
  }
}

/**
 * Create gradient stops with proper distribution
 */
function createGradientStops(
  primary: OKLCH,
  secondary: OKLCH,
  config: { steps: number; lightnessCurve: LightnessCurve }
): ColorStop[] {
  const { steps, lightnessCurve } = config;
  const stops: ColorStop[] = [];

  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);

    // Apply lightness curve
    let adjustedT: number;
    switch (lightnessCurve) {
      case 'ease':
        // Ease in-out
        adjustedT = t < 0.5
          ? 2 * t * t
          : 1 - Math.pow(-2 * t + 2, 2) / 2;
        break;
      case 'preserve':
        // Preserve mid-point lightness
        adjustedT = Math.sin(t * Math.PI / 2);
        break;
      default:
        adjustedT = t;
    }

    stops.push({
      position: t,
      color: OKLCH.interpolate(primary, secondary, adjustedT, 'shorter'),
    });
  }

  return stops;
}

/**
 * Calculate smoothness score (0-100)
 */
function calculateSmoothnessScore(gradient: Gradient, steps: number): number {
  const problemAreas = gradient.analyzeProblemAreas();

  // Base score from step count
  let score = Math.min(100, steps * 15);

  // Penalize problem areas
  for (const problem of problemAreas) {
    switch (problem.severity) {
      case 'high':
        score -= 20;
        break;
      case 'medium':
        score -= 10;
        break;
      case 'low':
        score -= 5;
        break;
    }
  }

  return Math.max(0, Math.min(100, score));
}

/**
 * Generate accessibility notes
 */
function generateAccessibilityNotes(
  gradient: Gradient,
  mode: ContrastMode,
  surfaceColor?: string
): string[] {
  const notes: string[] = [];
  const stops = gradient.stops;

  // Check contrast against surface
  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];

  if (surfaceColor && firstStop && lastStop) {
    const startContrast = APCAContrast.calculate(firstStop.color.toHex(), surfaceColor);
    const endContrast = APCAContrast.calculate(lastStop.color.toHex(), surfaceColor);

    if (startContrast.absoluteLc < 45) {
      notes.push('Gradient start may have low contrast against the surface');
    }
    if (endContrast.absoluteLc < 45) {
      notes.push('Gradient end may have low contrast against the surface');
    }
  }

  // Check for problem areas
  const problems = gradient.analyzeProblemAreas();

  if (problems.some(p => p.issue === 'muddy')) {
    notes.push('Gradient may appear muddy in the middle - consider increasing steps');
  }

  if (problems.some(p => p.issue === 'out-of-gamut')) {
    notes.push('Some colors are out of sRGB gamut and will be clamped');
  }

  // Mode-specific advice
  if (mode === 'light-content') {
    notes.push('Using dark content on light gradient - ensure sufficient contrast');
  } else {
    notes.push('Using light content on dark gradient - ensure sufficient contrast');
  }

  return notes;
}

/**
 * Generate CSS custom properties for gradient
 */
function generateCssVars(
  gradient: Gradient,
  stops: ColorStop[]
): Record<string, string> {
  const vars: Record<string, string> = {};

  // Main gradient
  vars['--gradient'] = gradient.toCss();

  // Individual stops
  stops.forEach((stop, i) => {
    vars[`--gradient-stop-${i}`] = stop.color.toCss();
    vars[`--gradient-stop-${i}-hex`] = stop.color.toHex();
    vars[`--gradient-stop-${i}-position`] = `${stop.position * 100}%`;
  });

  // Start and end colors
  const firstStop = stops[0];
  const lastStop = stops[stops.length - 1];
  if (firstStop) {
    vars['--gradient-start'] = firstStop.color.toHex();
  }
  if (lastStop) {
    vars['--gradient-end'] = lastStop.color.toHex();
  }

  return vars;
}

// ============================================
// Specialized Generators
// ============================================

/**
 * Generate a Smart Glass gradient for sidebar/navbar
 */
export function generateSmartGlassGradient(
  brandColor: string,
  options: {
    direction?: 'horizontal' | 'vertical';
    intensity?: 'subtle' | 'medium' | 'strong';
  } = {}
): AdaptiveGradientResult {
  const { direction = 'vertical', intensity = 'medium' } = options;

  const primary = OKLCH.fromHex(brandColor);
  if (!primary) throw new Error(`Invalid brand color: ${brandColor}`);

  const contrastMode = detectContrastMode(primary);
  const isLight = contrastMode.mode === 'light-content';

  // Intensity-based opacity
  const opacityMap = {
    subtle: { start: 0.03, end: 0.08 },
    medium: { start: 0.05, end: 0.12 },
    strong: { start: 0.08, end: 0.18 },
  };

  const opacity = opacityMap[intensity];

  // Create glass gradient colors
  const glassStart = isLight
    ? OKLCH.create(0.05, primary.c * 0.1, primary.h)
    : OKLCH.create(0.95, primary.c * 0.1, primary.h);

  const glassEnd = isLight
    ? OKLCH.create(0.1, primary.c * 0.15, primary.h)
    : OKLCH.create(0.9, primary.c * 0.15, primary.h);

  return generateAdaptiveGradient({
    preset: 'glass-overlay',
    primaryColor: glassStart,
    secondaryColor: glassEnd,
    angle: direction === 'vertical' ? 180 : 90,
    steps: 3,
  });
}

/**
 * Generate a brand-consistent button gradient
 */
export function generateButtonGradient(
  brandColor: string,
  state: 'default' | 'hover' | 'active' | 'disabled' = 'default'
): AdaptiveGradientResult {
  const primary = OKLCH.fromHex(brandColor);
  if (!primary) throw new Error(`Invalid brand color: ${brandColor}`);

  const stateModifiers = {
    default: { lightness: 0, chroma: 0 },
    hover: { lightness: 0.05, chroma: 0.02 },
    active: { lightness: -0.1, chroma: -0.02 },
    disabled: { lightness: 0.1, chroma: -0.15 },
  };

  const mod = stateModifiers[state];

  const adjustedPrimary = OKLCH.create(
    Math.max(0, Math.min(1, primary.l + mod.lightness)),
    Math.max(0, primary.c + mod.chroma),
    primary.h
  );

  return generateAdaptiveGradient({
    preset: 'button-hover',
    primaryColor: adjustedPrimary,
    angle: 180,
    steps: 2,
  });
}

/**
 * Generate a card highlight gradient
 */
export function generateCardHighlightGradient(
  brandColor: string,
  position: 'top' | 'left' | 'corner' = 'top'
): AdaptiveGradientResult {
  const angleMap = {
    top: 180,
    left: 90,
    corner: 135,
  };

  return generateAdaptiveGradient({
    preset: 'card-highlight',
    primaryColor: brandColor,
    angle: angleMap[position],
    steps: 4,
    adaptToContrast: true,
  });
}

export default generateAdaptiveGradient;

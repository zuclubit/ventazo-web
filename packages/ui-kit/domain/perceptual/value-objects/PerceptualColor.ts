/**
 * @fileoverview PerceptualColor Value Object
 *
 * Value Object inmutable que representa un color en múltiples espacios
 * perceptuales. Es el objeto fundamental del UI Kit, actuando como
 * puente entre Color Intelligence y el sistema de tokens.
 *
 * Principios:
 * - Inmutabilidad total
 * - Conversiones lazy con memoization
 * - No conoce React, DOM ni CSS
 * - Delega cálculos a Color Intelligence
 *
 * @module ui-kit/domain/perceptual/value-objects/PerceptualColor
 * @version 1.0.0
 */

import type {
  OklchCoordinates,
  HctCoordinates,
  RgbCoordinates,
  HslCoordinates,
  ColorTemperature,
  ContrastMode,
  Result,
} from '../../types';

import {
  type HexColor,
  type OklchLightness,
  type OklchChroma,
  type OklchHue,
  type ConfidenceLevel,
  BrandConstructors,
  TypeGuards,
} from '../../types/branded';

// ============================================================================
// INTERFACES
// ============================================================================

/**
 * Opciones para crear un PerceptualColor.
 */
export interface PerceptualColorOptions {
  readonly alpha?: number;
  readonly gamutMapped?: boolean;
}

/**
 * Resultado de análisis perceptual.
 */
export interface PerceptualAnalysis {
  readonly warmth: ColorTemperature;
  readonly brightness: 'dark' | 'medium' | 'light';
  readonly saturation: 'desaturated' | 'muted' | 'saturated' | 'vivid';
  readonly contrastMode: ContrastMode;
  readonly contrastConfidence: ConfidenceLevel;
}

/**
 * Opciones de interpolación.
 */
export interface InterpolationOptions {
  readonly steps?: number;
  readonly hueDirection?: 'shorter' | 'longer' | 'increasing' | 'decreasing';
  readonly chromaPreservation?: boolean;
}

// ============================================================================
// PERCEPTUAL COLOR VALUE OBJECT
// ============================================================================

/**
 * PerceptualColor - Value Object inmutable para colores perceptuales.
 *
 * Este es el objeto de color fundamental del UI Kit. Almacena el color
 * en formato OKLCH (perceptualmente uniforme) y proporciona conversiones
 * lazy a otros espacios.
 *
 * @example
 * ```typescript
 * // Crear desde hex
 * const color = PerceptualColor.fromHex('#0EB58C');
 *
 * // Operaciones inmutables (retornan nuevos objetos)
 * const lighter = color.lighten(0.1);
 * const moreVivid = color.saturate(0.2);
 *
 * // Acceso a coordenadas
 * console.log(color.oklch.l); // 0.72 (luminancia)
 *
 * // Análisis perceptual
 * const analysis = color.analyze();
 * console.log(analysis.contrastMode); // 'light-content'
 * ```
 */
export class PerceptualColor {
  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE STATE
  // ─────────────────────────────────────────────────────────────────────────

  private readonly _oklch: OklchCoordinates;
  private readonly _alpha: number;
  private readonly _gamutMapped: boolean;

  // Lazy-evaluated caches
  private _hexCache?: HexColor;
  private _rgbCache?: RgbCoordinates;
  private _hslCache?: HslCoordinates;
  private _hctCache?: HctCoordinates;
  private _analysisCache?: PerceptualAnalysis;

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR (Private - use static factories)
  // ─────────────────────────────────────────────────────────────────────────

  private constructor(
    oklch: OklchCoordinates,
    options: PerceptualColorOptions = {}
  ) {
    this._oklch = Object.freeze({
      l: Math.max(0, Math.min(1, oklch.l)),
      c: Math.max(0, oklch.c),
      h: ((oklch.h % 360) + 360) % 360,
    });
    this._alpha = options.alpha ?? 1;
    this._gamutMapped = options.gamutMapped ?? false;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STATIC FACTORIES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Crea un PerceptualColor desde un valor hexadecimal.
   */
  static fromHex(hex: string): PerceptualColor {
    const rgb = hexToRgb(hex);
    const oklch = rgbToOklch(rgb);
    return new PerceptualColor(oklch);
  }

  /**
   * Crea un PerceptualColor desde coordenadas OKLCH.
   */
  static fromOklch(
    l: number,
    c: number,
    h: number,
    alpha = 1
  ): PerceptualColor {
    return new PerceptualColor({ l, c, h }, { alpha });
  }

  /**
   * Crea un PerceptualColor desde coordenadas RGB.
   */
  static fromRgb(r: number, g: number, b: number, alpha = 1): PerceptualColor {
    const oklch = rgbToOklch({ r, g, b });
    return new PerceptualColor(oklch, { alpha });
  }

  /**
   * Crea un PerceptualColor desde coordenadas HCT.
   */
  static fromHct(h: number, c: number, t: number): PerceptualColor {
    // HCT tone to OKLCH lightness approximation
    // Nota: En producción, esto usaría Color Intelligence para conversión precisa
    const l = t / 100;
    const oklchC = c / 100 * 0.4; // Normalize to OKLCH chroma range
    return new PerceptualColor({ l, c: oklchC, h });
  }

  /**
   * Intenta crear un PerceptualColor, retornando Result.
   */
  static tryFromHex(hex: string): Result<PerceptualColor, Error> {
    try {
      if (!TypeGuards.isHexColor(hex)) {
        return { success: false, error: new Error(`Invalid hex color: ${hex}`) };
      }
      return { success: true, value: PerceptualColor.fromHex(hex) };
    } catch (e) {
      return { success: false, error: e as Error };
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // GETTERS (Coordenadas)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Coordenadas OKLCH (fuente de verdad).
   */
  get oklch(): Readonly<OklchCoordinates> {
    return this._oklch;
  }

  /**
   * Luminancia OKLCH (0-1).
   */
  get lightness(): OklchLightness {
    return BrandConstructors.oklchLightness(this._oklch.l);
  }

  /**
   * Chroma OKLCH.
   */
  get chroma(): OklchChroma {
    return BrandConstructors.oklchChroma(this._oklch.c);
  }

  /**
   * Hue OKLCH (0-360).
   */
  get hue(): OklchHue {
    return BrandConstructors.oklchHue(this._oklch.h);
  }

  /**
   * Alpha (transparencia).
   */
  get alpha(): number {
    return this._alpha;
  }

  /**
   * Indica si el color fue mapeado al gamut sRGB.
   */
  get isGamutMapped(): boolean {
    return this._gamutMapped;
  }

  /**
   * Coordenadas RGB (lazy-evaluated).
   */
  get rgb(): Readonly<RgbCoordinates> {
    if (!this._rgbCache) {
      this._rgbCache = oklchToRgb(this._oklch);
    }
    return this._rgbCache;
  }

  /**
   * Coordenadas HSL (lazy-evaluated).
   */
  get hsl(): Readonly<HslCoordinates> {
    if (!this._hslCache) {
      this._hslCache = rgbToHsl(this.rgb);
    }
    return this._hslCache;
  }

  /**
   * Coordenadas HCT aproximadas (lazy-evaluated).
   */
  get hct(): Readonly<HctCoordinates> {
    if (!this._hctCache) {
      // Aproximación HCT desde OKLCH
      // Nota: En producción usaría Color Intelligence para precisión
      this._hctCache = {
        h: this._oklch.h,
        c: this._oklch.c * 250, // Scale to HCT range
        t: this._oklch.l * 100,
      };
    }
    return this._hctCache;
  }

  /**
   * Valor hexadecimal (lazy-evaluated).
   */
  get hex(): HexColor {
    if (!this._hexCache) {
      this._hexCache = rgbToHex(this.rgb);
    }
    return this._hexCache;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // OPERACIONES INMUTABLES
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Aclara el color.
   * @param amount - Cantidad (0-1) para aclarar
   */
  lighten(amount: number): PerceptualColor {
    const newL = Math.min(1, this._oklch.l + amount);
    return new PerceptualColor({
      l: newL,
      c: this._oklch.c,
      h: this._oklch.h,
    }, { alpha: this._alpha });
  }

  /**
   * Oscurece el color.
   * @param amount - Cantidad (0-1) para oscurecer
   */
  darken(amount: number): PerceptualColor {
    const newL = Math.max(0, this._oklch.l - amount);
    return new PerceptualColor({
      l: newL,
      c: this._oklch.c,
      h: this._oklch.h,
    }, { alpha: this._alpha });
  }

  /**
   * Aumenta la saturación.
   * @param amount - Cantidad para aumentar chroma
   */
  saturate(amount: number): PerceptualColor {
    const newC = this._oklch.c + amount;
    return new PerceptualColor({
      l: this._oklch.l,
      c: newC,
      h: this._oklch.h,
    }, { alpha: this._alpha });
  }

  /**
   * Reduce la saturación.
   * @param amount - Cantidad para reducir chroma
   */
  desaturate(amount: number): PerceptualColor {
    const newC = Math.max(0, this._oklch.c - amount);
    return new PerceptualColor({
      l: this._oklch.l,
      c: newC,
      h: this._oklch.h,
    }, { alpha: this._alpha });
  }

  /**
   * Rota el hue.
   * @param degrees - Grados para rotar
   */
  rotateHue(degrees: number): PerceptualColor {
    const newH = ((this._oklch.h + degrees) % 360 + 360) % 360;
    return new PerceptualColor({
      l: this._oklch.l,
      c: this._oklch.c,
      h: newH,
    }, { alpha: this._alpha });
  }

  /**
   * Ajusta la transparencia.
   * @param alpha - Nuevo valor alpha (0-1)
   */
  withAlpha(alpha: number): PerceptualColor {
    return new PerceptualColor(this._oklch, {
      alpha: Math.max(0, Math.min(1, alpha)),
      gamutMapped: this._gamutMapped,
    });
  }

  /**
   * Interpola hacia otro color.
   * @param target - Color destino
   * @param t - Factor de interpolación (0-1)
   * @param options - Opciones de interpolación
   */
  interpolate(
    target: PerceptualColor,
    t: number,
    options: InterpolationOptions = {}
  ): PerceptualColor {
    const { hueDirection = 'shorter' } = options;

    // Interpolar lightness y chroma linealmente
    const l = this._oklch.l + (target._oklch.l - this._oklch.l) * t;
    const c = this._oklch.c + (target._oklch.c - this._oklch.c) * t;

    // Interpolar hue según dirección
    const h = interpolateHue(
      this._oklch.h,
      target._oklch.h,
      t,
      hueDirection
    );

    // Interpolar alpha
    const alpha = this._alpha + (target._alpha - this._alpha) * t;

    return new PerceptualColor({ l, c, h }, { alpha });
  }

  /**
   * Genera un gradiente hacia otro color.
   * @param target - Color destino
   * @param steps - Número de pasos (incluye inicio y fin)
   */
  gradient(
    target: PerceptualColor,
    steps: number,
    options: InterpolationOptions = {}
  ): PerceptualColor[] {
    const result: PerceptualColor[] = [];
    for (let i = 0; i < steps; i++) {
      const t = i / (steps - 1);
      result.push(this.interpolate(target, t, options));
    }
    return result;
  }

  /**
   * Obtiene el color complementario.
   */
  complement(): PerceptualColor {
    return this.rotateHue(180);
  }

  /**
   * Obtiene colores análogos.
   * @param angle - Ángulo de separación (default 30°)
   */
  analogous(angle = 30): [PerceptualColor, PerceptualColor] {
    return [this.rotateHue(-angle), this.rotateHue(angle)];
  }

  /**
   * Obtiene colores triádicos.
   */
  triadic(): [PerceptualColor, PerceptualColor] {
    return [this.rotateHue(120), this.rotateHue(240)];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ANÁLISIS PERCEPTUAL
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Analiza las propiedades perceptuales del color.
   */
  analyze(): PerceptualAnalysis {
    if (!this._analysisCache) {
      this._analysisCache = this.computeAnalysis();
    }
    return this._analysisCache;
  }

  private computeAnalysis(): PerceptualAnalysis {
    const { l, c, h } = this._oklch;

    // Determinar warmth basado en hue
    const warmth = this.computeWarmth(h);

    // Determinar brightness basado en lightness
    const brightness = l < 0.35 ? 'dark' : l > 0.7 ? 'light' : 'medium';

    // Determinar saturation basado en chroma
    const saturation =
      c < 0.03 ? 'desaturated' :
      c < 0.1 ? 'muted' :
      c < 0.2 ? 'saturated' : 'vivid';

    // Calcular modo de contraste preferido
    // (En producción, esto llamaría a Color Intelligence)
    const contrastResult = this.computeContrastMode();

    return {
      warmth,
      brightness,
      saturation,
      contrastMode: contrastResult.mode,
      contrastConfidence: contrastResult.confidence,
    };
  }

  private computeWarmth(hue: number): ColorTemperature {
    // Hue ranges aproximados para temperatura
    // Warm: 0-60, 300-360 (rojos, naranjas, amarillos, magentas)
    // Cold: 180-240 (cyans, azules)
    // Neutral: 60-180, 240-300 (verdes, violetas)

    if ((hue >= 0 && hue < 30) || hue >= 330) return 'hot';
    if (hue >= 30 && hue < 60) return 'warm';
    if (hue >= 60 && hue < 150) return 'neutral';
    if (hue >= 150 && hue < 210) return 'cool';
    if (hue >= 210 && hue < 270) return 'cold';
    return 'cool';
  }

  private computeContrastMode(): { mode: ContrastMode; confidence: ConfidenceLevel } {
    const { l, c, h } = this._oklch;

    // Multi-factor analysis (simplified version)
    // En producción usaría Color Intelligence completo

    // Factor 1: OKLCH Lightness (peso 40%)
    const lightnessScore = l;

    // Factor 2: Warmth adjustment (colores cálidos parecen más claros)
    const warmth = this.computeWarmth(h);
    const warmthAdjustment =
      warmth === 'hot' ? 0.08 :
      warmth === 'warm' ? 0.05 :
      warmth === 'cold' ? -0.05 :
      warmth === 'cool' ? -0.03 : 0;

    // Factor 3: Chroma influence (alta saturación puede afectar)
    const chromaAdjustment = c > 0.15 ? -0.02 : 0;

    // Score combinado
    const combinedScore = lightnessScore + warmthAdjustment + chromaAdjustment;

    // Threshold con zona de incertidumbre
    const threshold = 0.6;
    const uncertaintyZone = 0.1;

    const mode: ContrastMode = combinedScore > threshold ? 'light-content' : 'dark-content';

    // Confianza basada en distancia al threshold
    const distanceToThreshold = Math.abs(combinedScore - threshold);
    const confidence = Math.min(1, distanceToThreshold / uncertaintyZone);

    return {
      mode,
      confidence: BrandConstructors.confidenceLevel(confidence),
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CONVERSIONES A STRING
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Convierte a string CSS OKLCH.
   */
  toCssOklch(): string {
    const { l, c, h } = this._oklch;
    if (this._alpha < 1) {
      return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)} / ${this._alpha})`;
    }
    return `oklch(${(l * 100).toFixed(1)}% ${c.toFixed(3)} ${h.toFixed(1)})`;
  }

  /**
   * Convierte a string CSS RGB.
   */
  toCssRgb(): string {
    const { r, g, b } = this.rgb;
    if (this._alpha < 1) {
      return `rgba(${r}, ${g}, ${b}, ${this._alpha})`;
    }
    return `rgb(${r}, ${g}, ${b})`;
  }

  /**
   * Convierte a string CSS HSL.
   */
  toCssHsl(): string {
    const { h, s, l } = this.hsl;
    if (this._alpha < 1) {
      return `hsla(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%, ${this._alpha})`;
    }
    return `hsl(${h.toFixed(0)}, ${s.toFixed(0)}%, ${l.toFixed(0)}%)`;
  }

  /**
   * Representación por defecto es hex.
   */
  toString(): string {
    return this.hex;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // COMPARACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Calcula la diferencia perceptual (Delta E OKLCH).
   */
  deltaE(other: PerceptualColor): number {
    const dL = this._oklch.l - other._oklch.l;
    const dC = this._oklch.c - other._oklch.c;

    // Diferencia de hue en radianes
    const h1 = (this._oklch.h * Math.PI) / 180;
    const h2 = (other._oklch.h * Math.PI) / 180;
    const dH = 2 * Math.sqrt(this._oklch.c * other._oklch.c) *
               Math.sin((h1 - h2) / 2);

    return Math.sqrt(dL * dL + dC * dC + dH * dH);
  }

  /**
   * Verifica si dos colores son perceptualmente similares.
   * @param other - Otro color
   * @param threshold - Umbral de Delta E (default 0.02)
   */
  isSimilarTo(other: PerceptualColor, threshold = 0.02): boolean {
    return this.deltaE(other) < threshold;
  }

  /**
   * Verifica igualdad estructural.
   */
  equals(other: PerceptualColor): boolean {
    return (
      this._oklch.l === other._oklch.l &&
      this._oklch.c === other._oklch.c &&
      this._oklch.h === other._oklch.h &&
      this._alpha === other._alpha
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // SERIALIZACIÓN
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Serializa a objeto JSON.
   */
  toJSON(): {
    oklch: OklchCoordinates;
    hex: string;
    alpha: number;
    gamutMapped: boolean;
  } {
    return {
      oklch: { ...this._oklch },
      hex: this.hex,
      alpha: this._alpha,
      gamutMapped: this._gamutMapped,
    };
  }

  /**
   * Crea desde objeto JSON.
   */
  static fromJSON(json: { oklch: OklchCoordinates; alpha?: number }): PerceptualColor {
    return new PerceptualColor(json.oklch, { alpha: json.alpha });
  }
}

// ============================================================================
// HELPER FUNCTIONS (Conversiones de color)
// ============================================================================

/**
 * Convierte hex a RGB.
 */
function hexToRgb(hex: string): RgbCoordinates {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;

  const num = parseInt(expanded, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}

/**
 * Convierte RGB a hex.
 */
function rgbToHex(rgb: RgbCoordinates): HexColor {
  const toHex = (n: number) => Math.round(n).toString(16).padStart(2, '0');
  return `#${toHex(rgb.r)}${toHex(rgb.g)}${toHex(rgb.b)}` as HexColor;
}

/**
 * Convierte RGB a OKLCH.
 * Implementación simplificada - en producción usaría Color Intelligence.
 */
function rgbToOklch(rgb: RgbCoordinates): OklchCoordinates {
  // Normalizar a 0-1
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  // RGB lineal (gamma correction inversa)
  const toLinear = (c: number) =>
    c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  const lr = toLinear(r);
  const lg = toLinear(g);
  const lb = toLinear(b);

  // RGB a OKLab
  const l_ = 0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb;
  const m_ = 0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb;
  const s_ = 0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb;

  const l = Math.cbrt(l_);
  const m = Math.cbrt(m_);
  const s = Math.cbrt(s_);

  const L = 0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s;
  const a = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const bOk = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;

  // OKLab a OKLCH
  const C = Math.sqrt(a * a + bOk * bOk);
  let h = (Math.atan2(bOk, a) * 180) / Math.PI;
  if (h < 0) h += 360;

  return { l: L, c: C, h };
}

/**
 * Convierte OKLCH a RGB.
 * Implementación simplificada - en producción usaría Color Intelligence.
 */
function oklchToRgb(oklch: OklchCoordinates): RgbCoordinates {
  const { l: L, c: C, h } = oklch;

  // OKLCH a OKLab
  const hRad = (h * Math.PI) / 180;
  const a = C * Math.cos(hRad);
  const b = C * Math.sin(hRad);

  // OKLab a RGB lineal
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.2914855480 * b;

  const l = l_ * l_ * l_;
  const m = m_ * m_ * m_;
  const s = s_ * s_ * s_;

  let lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
  let lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
  let lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

  // Gamma correction y clamp
  const toGamma = (c: number) =>
    c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055;

  lr = Math.max(0, Math.min(1, toGamma(lr)));
  lg = Math.max(0, Math.min(1, toGamma(lg)));
  lb = Math.max(0, Math.min(1, toGamma(lb)));

  return {
    r: Math.round(lr * 255),
    g: Math.round(lg * 255),
    b: Math.round(lb * 255),
  };
}

/**
 * Convierte RGB a HSL.
 */
function rgbToHsl(rgb: RgbCoordinates): HslCoordinates {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;

  if (max === min) {
    return { h: 0, s: 0, l: l * 100 };
  }

  const d = max - min;
  const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

  let h = 0;
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
      break;
    case g:
      h = ((b - r) / d + 2) / 6;
      break;
    case b:
      h = ((r - g) / d + 4) / 6;
      break;
  }

  return {
    h: h * 360,
    s: s * 100,
    l: l * 100,
  };
}

/**
 * Interpola hue según dirección.
 */
function interpolateHue(
  h1: number,
  h2: number,
  t: number,
  direction: 'shorter' | 'longer' | 'increasing' | 'decreasing'
): number {
  let diff = h2 - h1;

  switch (direction) {
    case 'shorter':
      if (diff > 180) diff -= 360;
      else if (diff < -180) diff += 360;
      break;
    case 'longer':
      if (diff > 0 && diff < 180) diff -= 360;
      else if (diff < 0 && diff > -180) diff += 360;
      break;
    case 'increasing':
      if (diff < 0) diff += 360;
      break;
    case 'decreasing':
      if (diff > 0) diff -= 360;
      break;
  }

  let result = h1 + diff * t;
  return ((result % 360) + 360) % 360;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default PerceptualColor;

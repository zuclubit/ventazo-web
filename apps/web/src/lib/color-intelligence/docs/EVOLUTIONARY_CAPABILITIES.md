# Color Intelligence Domain: Evolutionary Capabilities

## Executive Summary

This document outlines the architectural provisions for future capabilities including HDR displays, wide-gamut color spaces, and plugin extensibility. The Color Intelligence domain was designed with evolutionary principles allowing seamless adoption of emerging standards.

---

## 1. HDR Display Support

### 1.1 Current Foundation

Our OKLCH implementation already provides the foundation for HDR:

```typescript
// OKLCH Lightness (L) is unbounded by design
// Standard displays: L ∈ [0, 1]
// HDR displays: L ∈ [0, ~4.0] for 10,000 nits peak

interface HDRColorSpace {
  peakLuminance: number;      // Display peak nits (e.g., 1000, 4000, 10000)
  blackLevel: number;         // Display black level nits
  colorVolume: 'sRGB' | 'P3' | 'Rec2020' | 'Rec2100';
  transferFunction: 'PQ' | 'HLG' | 'sRGB';
}
```

### 1.2 Planned HDR Value Object

```typescript
// domain/value-objects/HDRColor.ts

import { Luminance, Nits } from '../types/branded';
import OKLCH from './OKLCH';

/**
 * HDR Color with absolute luminance
 * Extends OKLCH with physical luminance values
 */
export class HDRColor {
  private readonly oklch: OKLCH;
  private readonly peakNits: Nits;
  private readonly encoding: 'PQ' | 'HLG';

  private constructor(
    oklch: OKLCH,
    peakNits: Nits,
    encoding: 'PQ' | 'HLG' = 'PQ'
  ) {
    this.oklch = oklch;
    this.peakNits = peakNits;
    this.encoding = encoding;
  }

  /**
   * Create HDR color with explicit luminance
   */
  static create(
    luminanceNits: Nits,
    chroma: number,
    hue: number,
    peakNits: Nits = 1000 as Nits
  ): HDRColor {
    // Convert absolute nits to OKLCH L
    // Using Perceptual Quantizer (PQ) EOTF
    const normalizedL = pqEotf(luminanceNits / peakNits);
    const oklch = OKLCH.create(normalizedL, chroma, hue);

    return new HDRColor(oklch, peakNits);
  }

  /**
   * Get absolute luminance in nits
   */
  get luminanceNits(): Nits {
    return (pqEotfInverse(this.oklch.l) * this.peakNits) as Nits;
  }

  /**
   * Map to SDR for fallback
   */
  toSDR(): OKLCH {
    // Apply tone mapping for SDR displays
    const mappedL = Math.min(1, this.oklch.l);
    return OKLCH.create(mappedL, this.oklch.c, this.oklch.h);
  }

  /**
   * Encode for CSS HDR
   */
  toCss(): string {
    // Using Rec.2100 PQ encoding
    return `color(rec2100-pq ${this.r} ${this.g} ${this.b})`;
  }
}

// PQ EOTF (Perceptual Quantizer Electro-Optical Transfer Function)
function pqEotf(E: number): number {
  const c1 = 0.8359375;
  const c2 = 18.8515625;
  const c3 = 18.6875;
  const m1 = 0.1593017578125;
  const m2 = 78.84375;

  const EPow = Math.pow(Math.max(0, E), 1 / m2);
  const numerator = Math.max(0, EPow - c1);
  const denominator = c2 - c3 * EPow;

  return Math.pow(numerator / denominator, 1 / m1);
}
```

### 1.3 Migration Path

1. **Phase 1**: Add HDRColor value object (non-breaking)
2. **Phase 2**: Extend APCA for HDR luminance ranges
3. **Phase 3**: Add HDR-aware tone mapping
4. **Phase 4**: CSS Level 5 color() function support

---

## 2. Wide Gamut Color Spaces

### 2.1 Gamut Hierarchy

```
┌─────────────────────────────────────────────────────────────┐
│                       Rec.2100/2020                         │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    Display P3                          │  │
│  │  ┌─────────────────────────────────────────────────┐  │  │
│  │  │                    sRGB                          │  │  │
│  │  │  (Current web standard)                          │  │  │
│  │  └─────────────────────────────────────────────────┘  │  │
│  │  (Apple devices, modern monitors)                      │  │  │
│  └───────────────────────────────────────────────────────┘  │
│  (HDR TVs, professional monitors)                           │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Gamut Interface

```typescript
// domain/interfaces/ColorGamut.ts

/**
 * Represents a color gamut with conversion capabilities
 */
export interface ColorGamut {
  readonly name: string;
  readonly whitePoint: [number, number];  // xy chromaticity
  readonly primaries: {
    red: [number, number];
    green: [number, number];
    blue: [number, number];
  };
  readonly transferFunction: TransferFunction;

  /**
   * Check if a color is within this gamut
   */
  contains(color: OKLCH): boolean;

  /**
   * Map an out-of-gamut color to nearest in-gamut
   */
  mapToGamut(color: OKLCH, algorithm: GamutMappingAlgorithm): OKLCH;

  /**
   * Convert to this gamut's RGB
   */
  toRGB(color: OKLCH): [number, number, number];

  /**
   * Convert from this gamut's RGB
   */
  fromRGB(r: number, g: number, b: number): OKLCH;
}

type GamutMappingAlgorithm =
  | 'clamp'           // Simple clipping (lossy)
  | 'chroma-reduce'   // Reduce chroma until in gamut (preserves L, H)
  | 'lightness-shift' // Adjust lightness (preserves C, H)
  | 'delta-e'         // Minimize perceptual difference
  | 'css-color-4';    // Per CSS Color 4 spec
```

### 2.3 Implemented Gamuts

```typescript
// infrastructure/gamuts/DisplayP3.ts

import { ColorGamut } from '../../domain/interfaces/ColorGamut';

export const DisplayP3: ColorGamut = {
  name: 'display-p3',
  whitePoint: [0.31270, 0.32900], // D65
  primaries: {
    red: [0.680, 0.320],
    green: [0.265, 0.690],
    blue: [0.150, 0.060],
  },
  transferFunction: sRGBTransfer, // Same gamma as sRGB

  contains(color: OKLCH): boolean {
    const [r, g, b] = this.toRGB(color);
    return r >= 0 && r <= 1 && g >= 0 && g <= 1 && b >= 0 && b <= 1;
  },

  mapToGamut(color: OKLCH, algorithm = 'css-color-4'): OKLCH {
    if (this.contains(color)) return color;

    switch (algorithm) {
      case 'css-color-4':
        return cssColor4GamutMap(color, this);
      case 'chroma-reduce':
        return binarySearchChroma(color, this);
      default:
        return clampToGamut(color, this);
    }
  },

  toRGB(color: OKLCH): [number, number, number] {
    // OKLCH → XYZ → Display P3 RGB
    const xyz = oklchToXYZ(color);
    return xyzToDisplayP3(xyz);
  },

  fromRGB(r: number, g: number, b: number): OKLCH {
    const xyz = displayP3ToXYZ([r, g, b]);
    return xyzToOKLCH(xyz);
  },
};
```

### 2.4 CSS Wide-Gamut Support

```typescript
// application/WideGamutCSS.ts

export function toCssWideGamut(
  color: OKLCH,
  targetGamut: 'srgb' | 'display-p3' | 'rec2020' = 'display-p3'
): string {
  switch (targetGamut) {
    case 'display-p3':
      if (DisplayP3.contains(color)) {
        const [r, g, b] = DisplayP3.toRGB(color);
        return `color(display-p3 ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)})`;
      }
      // Fall through to sRGB

    case 'srgb':
    default:
      return color.toCss();
  }
}

/**
 * Create fallback chain for progressive enhancement
 */
export function withFallback(color: OKLCH): CSSFallbackChain {
  return {
    srgb: color.toHex(),
    p3: toCssWideGamut(color, 'display-p3'),
    oklch: color.toCss(),

    toCSS(): string {
      return `
        color: ${this.srgb};
        color: ${this.p3};
        color: ${this.oklch};
      `;
    },
  };
}
```

---

## 3. Plugin Architecture

### 3.1 Plugin Interface

```typescript
// domain/interfaces/ColorPlugin.ts

/**
 * Plugin registration interface
 */
export interface ColorPlugin {
  readonly id: string;
  readonly name: string;
  readonly version: string;

  /**
   * Called when plugin is registered
   */
  initialize(context: PluginContext): void;

  /**
   * Called when plugin is removed
   */
  dispose(): void;
}

/**
 * Plugin context with access to core services
 */
export interface PluginContext {
  /**
   * Register a new color space
   */
  registerColorSpace(space: ColorSpace): void;

  /**
   * Register a contrast algorithm
   */
  registerContrastAlgorithm(algorithm: ContrastAlgorithm): void;

  /**
   * Register a gamut mapping strategy
   */
  registerGamutMapper(mapper: GamutMapper): void;

  /**
   * Access the color cache
   */
  getCache(): ColorCache;

  /**
   * Register CSS output format
   */
  registerCssFormat(format: CssFormat): void;
}
```

### 3.2 Example Plugin: Lab Color Space

```typescript
// plugins/lab-color-space/index.ts

import { ColorPlugin, PluginContext } from '../../domain/interfaces/ColorPlugin';

export const LabColorSpacePlugin: ColorPlugin = {
  id: 'lab-color-space',
  name: 'CIE Lab Color Space',
  version: '1.0.0',

  initialize(context: PluginContext): void {
    context.registerColorSpace({
      name: 'lab',

      fromOKLCH(oklch: OKLCH): LabColor {
        // OKLCH → XYZ → Lab
        const xyz = oklchToXYZ(oklch);
        return xyzToLab(xyz);
      },

      toOKLCH(lab: LabColor): OKLCH {
        const xyz = labToXYZ(lab);
        return xyzToOKLCH(xyz);
      },

      toCss(lab: LabColor): string {
        return `lab(${lab.L}% ${lab.a} ${lab.b})`;
      },
    });

    // Also register LCH (polar Lab)
    context.registerColorSpace({
      name: 'lch',
      // ... implementation
    });
  },

  dispose(): void {
    // Cleanup if needed
  },
};
```

### 3.3 Example Plugin: WCAG 2.1 Contrast

```typescript
// plugins/wcag21-contrast/index.ts

export const WCAG21ContrastPlugin: ColorPlugin = {
  id: 'wcag21-contrast',
  name: 'WCAG 2.1 Contrast Ratio',
  version: '1.0.0',

  initialize(context: PluginContext): void {
    context.registerContrastAlgorithm({
      name: 'wcag21',

      calculate(foreground: string, background: string): ContrastResult {
        const fgLum = relativeLuminance(foreground);
        const bgLum = relativeLuminance(background);

        const lighter = Math.max(fgLum, bgLum);
        const darker = Math.min(fgLum, bgLum);
        const ratio = (lighter + 0.05) / (darker + 0.05);

        return {
          value: ratio,
          unit: ':1',
          meetsAA: ratio >= 4.5,
          meetsAAA: ratio >= 7,
          meetsAALarge: ratio >= 3,
          meetsAAALarge: ratio >= 4.5,
        };
      },

      findOptimalForeground(
        background: string,
        minRatio: number
      ): string {
        // Binary search for optimal foreground
        // ... implementation
      },
    });
  },

  dispose(): void {},
};
```

### 3.4 Plugin Registry

```typescript
// infrastructure/plugins/PluginRegistry.ts

class PluginRegistry {
  private plugins = new Map<string, ColorPlugin>();
  private colorSpaces = new Map<string, ColorSpace>();
  private contrastAlgorithms = new Map<string, ContrastAlgorithm>();

  register(plugin: ColorPlugin): void {
    if (this.plugins.has(plugin.id)) {
      throw new Error(`Plugin ${plugin.id} already registered`);
    }

    const context = this.createContext();
    plugin.initialize(context);
    this.plugins.set(plugin.id, plugin);
  }

  unregister(pluginId: string): void {
    const plugin = this.plugins.get(pluginId);
    if (plugin) {
      plugin.dispose();
      this.plugins.delete(pluginId);
    }
  }

  private createContext(): PluginContext {
    return {
      registerColorSpace: (space) => {
        this.colorSpaces.set(space.name, space);
      },
      registerContrastAlgorithm: (algo) => {
        this.contrastAlgorithms.set(algo.name, algo);
      },
      // ... other methods
    };
  }

  getColorSpace(name: string): ColorSpace | undefined {
    return this.colorSpaces.get(name);
  }

  getContrastAlgorithm(name: string): ContrastAlgorithm | undefined {
    return this.contrastAlgorithms.get(name);
  }
}

export const pluginRegistry = new PluginRegistry();
```

---

## 4. Future CSS Features

### 4.1 CSS Color Level 5 Preparation

```typescript
// application/CssLevel5.ts

/**
 * Relative color syntax support
 * @see https://www.w3.org/TR/css-color-5/#relative-colors
 */
export function relativeColor(
  base: OKLCH,
  transform: {
    l?: (l: number) => number;
    c?: (c: number) => number;
    h?: (h: number) => number;
    alpha?: (a: number) => number;
  }
): string {
  // oklch(from var(--brand) calc(l * 1.2) c h)
  const newL = transform.l?.(base.l) ?? base.l;
  const newC = transform.c?.(base.c) ?? base.c;
  const newH = transform.h?.(base.h) ?? base.h;
  const newA = transform.alpha?.(1) ?? 1;

  return `oklch(${newL * 100}% ${newC} ${newH} / ${newA})`;
}

/**
 * Color mixing support
 * @see https://www.w3.org/TR/css-color-5/#color-mix
 */
export function colorMix(
  color1: OKLCH,
  color2: OKLCH,
  ratio: number = 0.5,
  colorSpace: 'oklch' | 'srgb' | 'display-p3' = 'oklch'
): string {
  return `color-mix(in ${colorSpace}, ${color1.toCss()} ${ratio * 100}%, ${color2.toCss()})`;
}

/**
 * Contrast color function
 * @see https://www.w3.org/TR/css-color-5/#contrast
 */
export function contrastColor(
  background: OKLCH,
  candidates: OKLCH[] = [OKLCH.WHITE, OKLCH.BLACK]
): string {
  // color-contrast(var(--bg) vs white, black)
  const candidatesCss = candidates.map(c => c.toCss()).join(', ');
  return `color-contrast(${background.toCss()} vs ${candidatesCss})`;
}
```

### 4.2 CSS Color Level 6 Forward Compatibility

```typescript
// application/CssLevel6.ts

/**
 * Color modification functions (CSS Level 6 draft)
 */
export interface ColorModifier {
  lighten(color: OKLCH, amount: number): OKLCH;
  darken(color: OKLCH, amount: number): OKLCH;
  saturate(color: OKLCH, amount: number): OKLCH;
  desaturate(color: OKLCH, amount: number): OKLCH;
  rotate(color: OKLCH, degrees: number): OKLCH;
  complement(color: OKLCH): OKLCH;
}

// Our OKLCH already supports all these natively!
export const colorModifiers: ColorModifier = {
  lighten: (color, amount) => color.lighten(amount),
  darken: (color, amount) => color.darken(amount),
  saturate: (color, amount) => color.saturate(amount),
  desaturate: (color, amount) => color.desaturate(amount),
  rotate: (color, degrees) => color.rotate(degrees),
  complement: (color) => color.rotate(180),
};
```

---

## 5. Performance Optimizations

### 5.1 WASM Module (Future)

```typescript
// infrastructure/wasm/ColorWasm.ts

/**
 * WebAssembly acceleration for heavy color operations
 */
export interface ColorWasmModule {
  // CAM16 forward transform (batch)
  cam16Forward(
    xyz: Float64Array,
    viewingConditions: ViewingConditionsPtr
  ): Float64Array;

  // CAM16 inverse transform (batch)
  cam16Inverse(
    cam16: Float64Array,
    viewingConditions: ViewingConditionsPtr
  ): Float64Array;

  // OKLCH gamut mapping (batch)
  gamutMapBatch(
    colors: Float64Array,
    targetGamut: GamutPtr
  ): Float64Array;

  // Memory management
  allocate(bytes: number): number;
  free(ptr: number): void;
}

/**
 * Lazy-load WASM module
 */
let wasmModule: ColorWasmModule | null = null;

export async function getWasmModule(): Promise<ColorWasmModule | null> {
  if (wasmModule) return wasmModule;

  try {
    const module = await import('./color_intelligence_bg.wasm');
    wasmModule = module.default;
    return wasmModule;
  } catch {
    // WASM not available, fall back to JS
    return null;
  }
}

/**
 * Hybrid execution with WASM fallback
 */
export async function cam16ForwardHybrid(
  colors: OKLCH[],
  vc: ViewingConditions
): Promise<CAM16Color[]> {
  const wasm = await getWasmModule();

  if (wasm && colors.length > 100) {
    // WASM for large batches
    const xyzArray = new Float64Array(colors.length * 3);
    colors.forEach((c, i) => {
      const xyz = c.toXYZ();
      xyzArray[i * 3] = xyz[0];
      xyzArray[i * 3 + 1] = xyz[1];
      xyzArray[i * 3 + 2] = xyz[2];
    });

    const result = wasm.cam16Forward(xyzArray, vc.toPtr());
    // ... parse result
  } else {
    // JS for small batches
    return colors.map(c => CAM16.fromOKLCH(c, vc));
  }
}
```

### 5.2 Worker Thread Support

```typescript
// infrastructure/workers/ColorWorker.ts

/**
 * Web Worker for heavy color operations
 */
export class ColorWorker {
  private worker: Worker;
  private pendingTasks = new Map<string, TaskResolver>();

  constructor() {
    this.worker = new Worker(
      new URL('./color.worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event) => {
      const { taskId, result, error } = event.data;
      const resolver = this.pendingTasks.get(taskId);
      if (resolver) {
        if (error) resolver.reject(error);
        else resolver.resolve(result);
        this.pendingTasks.delete(taskId);
      }
    };
  }

  /**
   * Generate palette in worker thread
   */
  async generatePalette(
    sourceHex: string,
    options: PaletteOptions
  ): Promise<TonalPalette> {
    const taskId = crypto.randomUUID();

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(taskId, { resolve, reject });
      this.worker.postMessage({
        taskId,
        type: 'generatePalette',
        payload: { sourceHex, options },
      });
    });
  }

  /**
   * Batch contrast calculations
   */
  async batchContrast(
    pairs: Array<[string, string]>
  ): Promise<APCAContrast[]> {
    // ... similar implementation
  }

  terminate(): void {
    this.worker.terminate();
  }
}
```

---

## 6. Testing Strategy for New Features

### 6.1 HDR Testing

```typescript
// __tests__/hdr.test.ts

describe('HDR Color Support', () => {
  it('should preserve luminance through round-trip', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0, max: 4000, noNaN: true }), // 4000 nits
        fc.double({ min: 0, max: 0.4, noNaN: true }),
        fc.double({ min: 0, max: 360, noNaN: true }),
        (nits, chroma, hue) => {
          const hdr = HDRColor.create(nits as Nits, chroma, hue);
          const roundTrip = HDRColor.fromPQ(hdr.toPQ());

          expect(roundTrip.luminanceNits).toBeCloseTo(nits, 1);
        }
      )
    );
  });

  it('should map to SDR correctly', () => {
    const hdrWhite = HDRColor.create(1000 as Nits, 0, 0);
    const sdr = hdrWhite.toSDR();

    expect(sdr.l).toBeLessThanOrEqual(1);
  });
});
```

### 6.2 Wide Gamut Testing

```typescript
// __tests__/wide-gamut.test.ts

describe('Wide Gamut Support', () => {
  it('should correctly identify out-of-sRGB colors', () => {
    // P3 red is outside sRGB
    const p3Red = OKLCH.create(0.65, 0.29, 27);

    expect(sRGB.contains(p3Red)).toBe(false);
    expect(DisplayP3.contains(p3Red)).toBe(true);
  });

  it('should preserve hue during gamut mapping', () => {
    const outOfGamut = OKLCH.create(0.7, 0.35, 150);
    const mapped = sRGB.mapToGamut(outOfGamut, 'chroma-reduce');

    expect(mapped.h).toBeCloseTo(outOfGamut.h, 1);
  });
});
```

---

## 7. Adoption Roadmap

### Phase 1: Foundation (Current)
- ✅ OKLCH value object
- ✅ HCT with CAM16
- ✅ APCA contrast
- ✅ Property-based tests
- ✅ Benchmark suite

### Phase 2: Wide Gamut (Q2 2026)
- [ ] Display P3 gamut
- [ ] Rec.2020 gamut
- [ ] CSS color() function output
- [ ] Gamut mapping strategies

### Phase 3: HDR (Q3 2026)
- [ ] HDRColor value object
- [ ] PQ transfer function
- [ ] Tone mapping
- [ ] CSS rec2100-pq output

### Phase 4: Extensibility (Q4 2026)
- [ ] Plugin architecture
- [ ] Lab/LCH plugin
- [ ] WCAG 2.1 plugin
- [ ] WASM acceleration

### Phase 5: Advanced (2027)
- [ ] Worker thread support
- [ ] CSS Color Level 5/6 features
- [ ] Real-time palette generation
- [ ] AI-assisted color selection

---

## Conclusion

The Color Intelligence domain architecture anticipates major industry shifts:

1. **HDR Displays**: Growing adoption of HDR monitors and TVs requires perceptual color spaces that can handle luminance beyond sRGB.

2. **Wide Gamut**: Display P3 is already standard on Apple devices and increasingly common elsewhere.

3. **CSS Evolution**: Color Level 4 is shipping, Level 5 is stable, and our architecture already supports these features.

4. **Performance**: WASM and Worker support will enable real-time color operations for complex applications.

5. **Extensibility**: The plugin architecture allows adding new color spaces and algorithms without modifying core code.

By building on OKLCH (perceptually uniform, HDR-ready) and CAM16 (scientifically rigorous), we have a foundation that will serve for years to come.

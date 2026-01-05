# Color Intelligence

> **The Perceptual Color Standard for Accessible Design Systems**

[![Conformance Level](https://img.shields.io/badge/APCA-Platinum-gold)]()
[![WCAG 2.1](https://img.shields.io/badge/WCAG-2.1%20AAA-green)]()
[![Version](https://img.shields.io/badge/version-5.0.0-blue)]()

A state-of-the-art color perception and accessibility system implementing modern color science algorithms with hexagonal architecture.

## Overview

Color Intelligence provides:
- **APCA** (Accessible Perceptual Contrast Algorithm) - WCAG 3.0
- **OKLCH/OKLab** - Perceptually uniform color space (Björn Ottosson, CIE 2019)
- **HCT** (Hue/Chroma/Tone) - Material Design 3 (Google)
- **CAM16** - Color Appearance Model CIE 2016

## Architecture

```
color-intelligence/
├── domain/
│   └── value-objects/         # Immutable color representations
│       ├── OKLCH.ts           # OKLCH color space
│       ├── HCT.ts             # Material Design HCT
│       └── APCAContrast.ts    # APCA contrast calculation
├── application/               # Use cases and business logic
│   ├── DetectContrastMode.ts  # Determine light/dark content mode
│   └── ValidateAccessibility.ts # Accessibility validation
├── infrastructure/
│   └── cache/
│       └── ColorCache.ts      # LRU Cache with TTL
└── presentation/
    └── useColorIntelligence.ts # React hook
```

---

## Quick Start

### Basic Usage

```typescript
import {
  detectContrastMode,
  validateColorPair,
  analyzeBrandColor,
} from '@/lib/color-intelligence';

// Detect optimal text color mode for a background
const mode = detectContrastMode('#3B82F6');
// → { mode: 'light-content', confidence: 0.87, ... }

// Validate accessibility between two colors
const validation = validateColorPair('#FFFFFF', '#3B82F6');
// → { passes: { wcagAA: true, wcagAAA: false, apcaBody: true }, ... }

// Analyze a brand color for UI generation
const analysis = analyzeBrandColor('#3B82F6');
// → { foreground: { primary: '#FFFFFF', ... }, glass: { ... }, ... }
```

### React Integration

```tsx
import { useColorIntelligence } from '@/lib/color-intelligence';

function BrandedComponent({ brandColor }: { brandColor: string }) {
  const { contrastMode, analysis, isAccessible } = useColorIntelligence(brandColor);

  return (
    <div
      style={{
        background: brandColor,
        color: analysis.foreground.primary,
      }}
    >
      {contrastMode === 'light-content' ? 'Light text' : 'Dark text'}
    </div>
  );
}
```

---

## API Reference

### Value Objects

#### OKLCH

Perceptually uniform color space optimized for color manipulation.

```typescript
import OKLCH from '@/lib/color-intelligence/domain/value-objects/OKLCH';

// Create from hex
const color = OKLCH.fromHex('#3B82F6');

// Properties
color.l;  // Lightness: 0-1
color.c;  // Chroma: 0-0.4 (typically)
color.h;  // Hue: 0-360

// Transformations (immutable)
const lighter = color.lighten(0.1);
const darker = color.darken(0.1);
const saturated = color.saturate(1.2);
const rotated = color.rotateHue(30);

// Conversion
color.toHex();     // → '#3B82F6'
color.toCss();     // → 'oklch(0.62 0.21 255)'
color.toRGB();     // → { r: 59, g: 130, b: 246 }

// Analysis
color.deltaE(otherColor);           // Color difference
color.isSimilarTo(otherColor, 5);   // Similarity check
color.getWarmth();                  // -1 (cold) to +1 (warm)

// Interpolation
const mid = OKLCH.interpolate(colorA, colorB, 0.5);
const gradient = OKLCH.gradient(colorA, colorB, 5);
```

#### HCT

Material Design 3's Hue-Chroma-Tone color space for accessible palette generation.

```typescript
import HCT from '@/lib/color-intelligence/domain/value-objects/HCT';

// Create from hex
const color = HCT.fromHex('#3B82F6');

// Properties
color.h;  // Hue: 0-360
color.c;  // Chroma: 0-120+ (relative saturation)
color.t;  // Tone: 0-100 (perceptual lightness)

// Contrast Operations
color.meetsContrastAA(other);   // Tone difference >= 40
color.meetsContrastAAA(other);  // Tone difference >= 50
color.meetsApcaBody(other);     // Tone difference >= 45

// Get contrasting variant
const aaText = color.getContrastingAA(true);   // preferLighter = true
const aaaText = color.getContrastingAAA(false);

// Optimal text color
const textTone = color.getOptimalTextTone();  // 0 (black) or 100 (white)
const textHCT = color.getOptimalTextHCT();

// Tonal Palette (Material Design 3)
const palette = color.generateTonalPalette();
// → { 0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 99, 100 }

// Key Color Roles
const roles = color.getKeyColorRoles();
// → { primary, onPrimary, primaryContainer, onPrimaryContainer }

// Color Harmonies
const complement = HCT.complement(color);
const analogous = HCT.analogous(color, 30);
const triadic = HCT.triadic(color);
```

#### APCAContrast

WCAG 3.0 contrast calculation with context-aware thresholds.

```typescript
import APCAContrast, { APCA_REQUIREMENTS } from '@/lib/color-intelligence/domain/value-objects/APCAContrast';

// Calculate contrast
const contrast = APCAContrast.calculate('#FFFFFF', '#3B82F6');

// Properties
contrast.lc;           // Lightness Contrast: -108 to +108
contrast.absoluteLc;   // Absolute value
contrast.polarity;     // 'light-on-dark' | 'dark-on-light'
contrast.level;        // 'fail' | 'minimum' | 'body' | 'fluent' | 'excellent'

// Validation
contrast.isValidForBodyText();   // Lc >= 75
contrast.isValidForLargeText();  // Lc >= 60
contrast.isValidForHeadlines();  // Lc >= 45
contrast.isValidForSpotText();   // Lc >= 30
contrast.isReadable();           // Lc >= 30

// Use case validation
contrast.validate('bodyText');    // true/false
contrast.getPassingUseCases();    // ['bodyText', 'largeText', ...]

// Font size recommendations
const fonts = contrast.getMinimumFontSize();
// → { regular: 16, bold: 14 } | null

// Find optimal text color
const result = APCAContrast.findOptimalTextColor('#3B82F6');
// → { color: '#FFFFFF', contrast: APCAContrast }

// Requirements constants
APCA_REQUIREMENTS.bodyText;    // 75
APCA_REQUIREMENTS.largeText;   // 60
APCA_REQUIREMENTS.headlines;   // 45
APCA_REQUIREMENTS.spotText;    // 30
APCA_REQUIREMENTS.nonText;     // 15
```

---

### Use Cases

#### DetectContrastMode

Determines whether a color should display light or dark content.

```typescript
import {
  detectContrastMode,
  detectContrastModeQuick,
  detectContrastModeBatch,
  getOptimalForegroundPair,
  analyzeBrandColor,
} from '@/lib/color-intelligence/application/DetectContrastMode';

// Full detection with confidence and factors
const result = detectContrastMode('#3B82F6');
/*
{
  mode: 'light-content',
  confidence: 0.87,
  factors: {
    oklchLightness: 0.62,
    hctTone: 53,
    apcaPreference: 'light',
    warmthAdjustment: 0,
    chromaAdjustment: -0.02,
  },
  recommendations: [],
}
*/

// Quick detection (for performance-critical paths)
const quickMode = detectContrastModeQuick('#3B82F6');
// → 'light-content'

// Batch processing
const modes = detectContrastModeBatch(['#3B82F6', '#10B981', '#EF4444']);

// Get optimal foreground pair
const pair = getOptimalForegroundPair('#3B82F6');
/*
{
  primary: '#FFFFFF',
  secondary: '#E0E9FF',
  contrast: { apca: APCAContrast, wcagRatio: 4.8 },
}
*/

// Full brand color analysis
const brand = analyzeBrandColor('#3B82F6', {
  accent: '#10B981',  // Optional accent color
});
/*
{
  mode: 'light-content',
  confidence: 0.87,
  foreground: { primary, secondary, muted, disabled },
  surface: { base, elevated, pressed },
  glass: { background, border, backdrop },
  badge: { background, text, border },
  iconPair: { active, inactive },
  border: '#3B82F640',
  shadow: '#3B82F630',
  hoverShift: 'lighten',
}
*/
```

**Configuration Options:**

```typescript
detectContrastMode('#3B82F6', {
  threshold: 0.5,                    // Decision threshold (0-1)
  weights: {
    oklchLightness: 0.45,           // Weight for OKLCH L
    hctTone: 0.35,                  // Weight for HCT T
    apcaContrast: 0.20,             // Weight for APCA
  },
  enableWarmthCorrection: true,     // Adjust for yellow/lime hues
  enableChromaCorrection: true,     // Adjust for high saturation
});
```

#### ValidateAccessibility

Comprehensive accessibility validation for color combinations.

```typescript
import {
  validateColorPair,
  validateBrandColorSystem,
  findAccessibleAlternative,
  suggestAccessibleAlternatives,
} from '@/lib/color-intelligence/application/ValidateAccessibility';

// Validate a color pair
const validation = validateColorPair('#FFFFFF', '#3B82F6');
/*
{
  foreground: '#FFFFFF',
  background: '#3B82F6',
  passes: {
    wcagAA: true,           // 4.5:1 ratio
    wcagAAA: false,         // 7:1 ratio
    wcagAALarge: true,      // 3:1 ratio
    apcaBody: true,         // Lc >= 75
    apcaLarge: true,        // Lc >= 60
    apcaSpot: true,         // Lc >= 30
  },
  wcagRatio: 4.8,
  apcaContrast: APCAContrast,
  level: 'AA',
  recommendations: [],
}
*/

// Validate entire brand color system
const system = validateBrandColorSystem('#3B82F6');
/*
{
  isAccessible: true,
  primaryAnalysis: { ... },
  surfaceAnalysis: { light: ..., dark: ... },
  issues: [],
  recommendations: [],
  score: 0.92,
}
*/

// Find accessible alternative
const alternative = findAccessibleAlternative('#888888', '#AAAAAA', {
  target: 'wcagAA',
  adjustBackground: false,
});
// → { foreground: '#4A4A4A', ... }

// Get multiple suggestions
const suggestions = suggestAccessibleAlternatives('#888888', '#AAAAAA', 'body');
/*
{
  originalValidation: { ... },
  adjustedForeground: { hex: '#4A4A4A', validation: ... },
  adjustedBackground: { hex: '#FFFFFF', validation: ... },
  bestAlternative: 'adjustForeground',
}
*/
```

---

### Infrastructure

#### ColorCache

High-performance LRU cache with TTL for color operations.

```typescript
import { getColorCache, resetColorCache } from '@/lib/color-intelligence/infrastructure/cache/ColorCache';

// Get singleton instance
const cache = getColorCache({ maxSize: 500, ttlMs: 300000 });

// Automatic caching (used internally)
const oklch = cache.getOklch('#3B82F6');  // Cached after first call
const hct = cache.getHct('#3B82F6');
const apca = cache.getApca('#FFFFFF', '#3B82F6');

// Manual caching
cache.set('myKey', computedValue);
const value = cache.get('myKey');

// Compute-if-absent pattern
const result = cache.getOrCompute('expensiveCalc', () => {
  return expensiveCalculation();
});

// Cache statistics
const stats = cache.getStats();
// → { hits: 150, misses: 20, hitRate: 0.88, size: 170, evictions: 5 }

// Maintenance
cache.clearExpired();
cache.preloadCommonColors(['#FFFFFF', '#000000', '#3B82F6']);
resetColorCache();  // Clear and reset singleton
```

---

## Best Practices

### 1. Use APCA for Modern Accessibility

APCA provides more accurate contrast perception than WCAG 2.1 ratios:

```typescript
// APCA accounts for polarity (light-on-dark vs dark-on-light)
const lightOnDark = APCAContrast.calculate('#FFFFFF', '#000000');
const darkOnLight = APCAContrast.calculate('#000000', '#FFFFFF');

// These have different Lc values despite same "ratio"
console.log(lightOnDark.lc);  // ~+106 (positive = light on dark)
console.log(darkOnLight.lc);  // ~-108 (negative = dark on light)
```

### 2. Leverage HCT for Palette Generation

HCT guarantees perceptual uniformity across tones:

```typescript
const brand = HCT.fromHex('#3B82F6');
const palette = brand.generateTonalPalette();

// All tones maintain the same hue and relative chroma
palette[40];  // Primary color
palette[90];  // Light container
palette[10];  // Dark container
```

### 3. Handle Edge Cases

```typescript
// Always validate brand colors
const system = validateBrandColorSystem(userProvidedColor);
if (!system.isAccessible) {
  console.warn('Brand color accessibility issues:', system.issues);
}

// Handle challenging colors (yellows, limes)
const mode = detectContrastMode('#FFEB3B', {
  enableWarmthCorrection: true,  // Critical for yellow/lime hues
});
```

### 4. Performance Optimization

```typescript
// Use quick mode for real-time updates
const handleColorChange = (color: string) => {
  const mode = detectContrastModeQuick(color);  // ~0.1ms vs ~1ms
  updateUI(mode);
};

// Batch process for multiple colors
const modes = detectContrastModeBatch(colorArray);
```

---

## Design Principles

1. **Inmutabilidad**: All Value Objects are immutable
2. **Pureza**: Pure functions without side effects
3. **Type Safety**: Strict TypeScript with branded types
4. **Testabilidad**: Dependency injection at all levels
5. **Performance**: Memoization and lazy calculations
6. **Accesibilidad**: WCAG 3.0 (APCA) as first-class citizen

---

## Testing

Run the test suite:

```bash
npm run test:run src/lib/color-intelligence/__tests__
```

Test coverage includes:
- 290+ unit tests
- Value object immutability
- APCA accuracy validation
- HCT contrast operations
- Cache LRU/TTL behavior
- Edge cases (yellows, near-threshold colors)

---

## References

- [OKLCH in CSS](https://evilmartians.com/chronicles/oklch-in-css-why-quit-rgb-hsl)
- [APCA Readability Criterion](https://readtech.org/ARC/)
- [Material Design 3 HCT](https://material.io/blog/science-of-color-design)
- [WCAG 3.0 Draft](https://www.w3.org/WAI/standards-guidelines/wcag/wcag3-intro/)

---

## Phase 5: Standardization Layer

Version 5.0 introduces the **Standardization Layer** - transforming Color Intelligence from a library into a referenceable standard.

### New Capabilities

- 🏛️ **Formal Specification** - Documented perceptual specification enabling third-party reimplementation
- ✅ **Conformance Certification** - Bronze/Silver/Gold/Platinum certification levels
- 🔌 **Plugin Ecosystem** - Extensible architecture with lifecycle hooks
- 📋 **Regulatory Audit Trails** - Compliance reporting for WCAG, Section 508, EN 301 549
- 🤖 **AI Contracts** - LLM-ready decision constraints
- 📚 **Golden Sets** - Canonical test vectors for conformance testing

### Specification Documents

| Document | Description |
|----------|-------------|
| [SPECIFICATION.md](./domain/specification/SPECIFICATION.md) | Formal perceptual specification |
| [DECISION_MODEL.md](./domain/specification/DECISION_MODEL.md) | Decision chain documentation |
| [GOVERNANCE_MODEL.md](./domain/specification/GOVERNANCE_MODEL.md) | Policy architecture |
| [CONFORMANCE_LEVELS.md](./domain/specification/CONFORMANCE_LEVELS.md) | Certification requirements |

### Conformance & Certification

```typescript
import { createConformanceEngine } from '@/lib/color-intelligence';

const engine = createConformanceEngine();
const report = await engine.evaluate({
  subject: myImplementation,
  targetLevel: 'gold',
});

if (report.passed) {
  const certificate = await engine.generateCertificate(report);
  console.log(certificate.id); // 'cert-xxx'
}
```

### Plugin System

```typescript
import { createPluginManager } from '@/lib/color-intelligence';

const plugin: ColorIntelligencePlugin = {
  id: 'analytics-plugin',
  name: 'Analytics Plugin',
  version: '1.0.0',
  hooks: {
    afterDecision: async (decision) => {
      await trackDecision(decision);
      return decision;
    },
  },
};

const manager = createPluginManager();
await manager.register(plugin);
await manager.load('analytics-plugin');
```

### Audit Trail

```typescript
import { createAuditTrailService, createInMemoryAuditStorage } from '@/lib/color-intelligence';

const audit = createAuditTrailService({
  storageAdapter: createInMemoryAuditStorage(),
});

await audit.logDecision({
  decisionId: 'dec-123',
  decisionType: 'contrast',
  input: { foreground, background },
  output: decision,
});

const report = await audit.generateComplianceReport({
  framework: 'wcag',
  dateRange: { from: '2026-01-01', to: '2026-01-31' },
});
```

---

## License

MIT © 2026 Zuclubit

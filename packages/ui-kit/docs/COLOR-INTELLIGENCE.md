# Color Intelligence Documentation

> Perceptual-first color management system for design systems

## What is Color Intelligence?

Color Intelligence is the **core engine** of @zuclubit/ui-kit that manages all color operations through perceptual science. It guarantees:

- **Perceptual Uniformity**: Colors look as expected across the spectrum
- **Automatic Accessibility**: WCAG/APCA compliance built-in
- **Consistent Derivation**: Predictable color variations
- **Brand Fidelity**: Accurate color reproduction

## Perceptual Color Spaces

### Why Not RGB/HSL?

Traditional color spaces have significant problems:

```
RGB/HSL Problems:
┌─────────────────────────────────────────────────────────────────┐
│ Same "Lightness" values look completely different:              │
│                                                                 │
│  HSL(60°, 100%, 50%)  = Yellow  → Looks VERY bright            │
│  HSL(240°, 100%, 50%) = Blue    → Looks much darker            │
│                                                                 │
│ Both have L=50% but perceptually very different!               │
└─────────────────────────────────────────────────────────────────┘
```

### OKLCH Color Space

**OKLCH** (OK Lightness Chroma Hue) is a perceptually uniform color space:

```typescript
interface OklchComponents {
  lightness: number;  // 0-1 (perceptual brightness)
  chroma: number;     // 0-0.4 (color saturation)
  hue: number;        // 0-360 (color wheel position)
  alpha?: number;     // 0-1 (transparency)
}
```

**Key Benefits**:

1. **Uniform Lightness**: L=50% looks equally bright for all hues
2. **Predictable Chroma**: Same chroma = same perceived saturation
3. **Wide Gamut**: Supports P3 and Rec.2020 color spaces
4. **CSS Native**: `oklch()` is supported in modern browsers

```typescript
import { OklchColor } from '@zuclubit/ui-kit/domain';

// Create from components
const blue = OklchColor.create({
  lightness: 0.65,
  chroma: 0.15,
  hue: 250
});

// Create from hex
const brand = OklchColor.fromHex('#3B82F6');

// Output formats
blue.toCss();     // 'oklch(65% 0.15 250)'
blue.toHex();     // '#5588EE'
blue.toRgb();     // { r: 85, g: 136, b: 238 }
blue.toHsl();     // { h: 220, s: 80, l: 63 }
```

### HCT Color Space

**HCT** (Hue Chroma Tone) is Google's Material Design color system:

```typescript
interface HctComponents {
  hue: number;     // 0-360
  chroma: number;  // 0-150 (wider range than OKLCH)
  tone: number;    // 0-100 (similar to L* in LAB)
}
```

**Key Benefits**:

1. **Optimized for UI**: Designed specifically for interface design
2. **Tone System**: 0-100 scale matches Material Design guidelines
3. **Higher Chroma Range**: More vivid colors possible
4. **Accessibility Focused**: Built-in contrast calculations

```typescript
import { HctColor } from '@zuclubit/ui-kit/domain';

// Create from components
const primary = HctColor.create({
  hue: 220,
  chroma: 48,
  tone: 65
});

// Create from hex
const accent = HctColor.fromHex('#8B5CF6');

// Get tone variants
const light = primary.withTone(90);  // Light surface
const dark = primary.withTone(30);   // Dark surface
```

## Color Operations

### Lightness Manipulation

```typescript
const base = OklchColor.fromHex('#3B82F6');

// Absolute lightness
const light = base.withLightness(0.9);   // Near white
const dark = base.withLightness(0.2);    // Very dark

// Relative adjustment
const lighter = base.adjustLightness(0.1);  // +10% lightness
const darker = base.adjustLightness(-0.1);  // -10% lightness

// Perceptually uniform scale
const scale = base.generateLightnessScale([10, 20, 30, 40, 50, 60, 70, 80, 90]);
```

### Chroma Manipulation

```typescript
const base = OklchColor.fromHex('#3B82F6');

// Vivid/Muted variations
const vivid = base.withChroma(0.25);   // More saturated
const muted = base.withChroma(0.05);   // Desaturated

// Grayscale (zero chroma)
const gray = base.withChroma(0);
```

### Hue Manipulation

```typescript
const base = OklchColor.fromHex('#3B82F6');

// Complementary (opposite hue)
const complement = base.withHue((base.hue + 180) % 360);

// Analogous colors (adjacent hues)
const analogous1 = base.withHue((base.hue + 30) % 360);
const analogous2 = base.withHue((base.hue - 30 + 360) % 360);

// Triadic colors (120° apart)
const triadic1 = base.withHue((base.hue + 120) % 360);
const triadic2 = base.withHue((base.hue + 240) % 360);
```

### Color Interpolation

```typescript
import { interpolateColors } from '@zuclubit/ui-kit/domain';

const from = OklchColor.fromHex('#3B82F6');
const to = OklchColor.fromHex('#8B5CF6');

// Generate gradient stops
const gradient = interpolateColors(from, to, 5);
// Returns array of 5 colors from blue to purple
```

## Accessibility

### WCAG 2.1 Contrast

```typescript
import { ValidateAccessibility } from '@zuclubit/ui-kit/application';

const validator = new ValidateAccessibility();

// Check text contrast
const result = await validator.execute({
  foreground: textColor,
  background: bgColor,
  level: 'AA',        // or 'AAA'
  standard: 'WCAG21',
  context: {
    fontSize: 16,     // px
    fontWeight: 400,
  }
});

if (result.success) {
  console.log(result.value.contrastRatio);  // e.g., 4.72
  console.log(result.value.passes);         // true/false
  console.log(result.value.level);          // 'AA' | 'AAA' | 'fail'
}
```

**WCAG Requirements**:

| Level | Normal Text | Large Text |
|-------|-------------|------------|
| AA    | 4.5:1       | 3:1        |
| AAA   | 7:1         | 4.5:1      |

### APCA Contrast

**APCA** (Accessible Perceptual Contrast Algorithm) is the next-generation contrast standard:

```typescript
const result = await validator.execute({
  foreground: textColor,
  background: bgColor,
  standard: 'APCA',
  context: {
    fontSize: 16,
    fontWeight: 400,
    useCase: 'body-text',
  }
});

if (result.success) {
  console.log(result.value.apcaLc);  // Lightness Contrast value
  console.log(result.value.passes);   // Based on use case requirements
}
```

**APCA Benefits**:

- More accurate for real-world perception
- Considers font size and weight
- Better for dark mode interfaces
- Context-aware requirements

### Automatic Contrast Derivation

Color Intelligence can automatically derive accessible colors:

```typescript
const bgColor = OklchColor.fromHex('#1E293B');

// Auto-derive text color
const textColor = bgColor.deriveContrastingText({
  minContrast: 4.5,    // WCAG AA
  preferLight: true,   // Prefer light text on dark bg
});

// Auto-derive accessible variations
const accessible = bgColor.ensureAccessibleWith(brandColor, {
  role: 'foreground',  // Which color to adjust
  level: 'AA',
});
```

## Palette Generation

### Tonal Palettes

Generate perceptually uniform color scales:

```typescript
import { DeriveColorPalette } from '@zuclubit/ui-kit/application';

const derive = new DeriveColorPalette();

const result = await derive.execute({
  baseColor: OklchColor.fromHex('#3B82F6'),
  steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  preserveHue: true,
  accessibilityLevel: 'AA',
});

// Result: Full palette with guaranteed accessibility
// {
//   50:  OklchColor { L: 0.97, C: 0.02, H: 220 },
//   100: OklchColor { L: 0.93, C: 0.04, H: 220 },
//   ...
//   900: OklchColor { L: 0.25, C: 0.15, H: 220 },
// }
```

### Semantic Color Sets

Generate colors for specific UI purposes:

```typescript
import { GenerateComponentTokens } from '@zuclubit/ui-kit/application';

const generator = new GenerateComponentTokens();

// Generate button colors
const buttonTokens = await generator.execute({
  component: 'button',
  baseColor: brandPrimary,
  states: ['default', 'hover', 'active', 'disabled'],
  variants: ['solid', 'outline', 'ghost'],
});

// Result includes all state variations with accessibility guarantees
// {
//   solid: {
//     default: { background: ..., text: ... },
//     hover: { background: ..., text: ... },
//     ...
//   },
//   outline: { ... },
//   ghost: { ... },
// }
```

### Dark Mode Derivation

```typescript
import { ColorIntelligenceService } from '@zuclubit/ui-kit/application';

const ci = new ColorIntelligenceService();

// Generate dark mode palette from light mode
const darkPalette = await ci.deriveDarkMode(lightPalette, {
  strategy: 'tone-shift',  // or 'chroma-adjust' or 'hue-rotate'
  preserveChroma: true,
  minContrast: 4.5,
});
```

## Design Tokens

### Token Structure

```typescript
interface DesignToken {
  path: string;                    // 'color.brand.primary'
  value: string | number | object; // '#3B82F6'
  type: TokenType;                 // 'color'
  description?: string;            // 'Primary brand color'
  metadata?: {
    source?: PerceptualColor;      // Original perceptual color
    derivedFrom?: string;          // Parent token path
    accessibility?: AccessibilityData;
  };
}
```

### Token Collections

```typescript
import { TokenCollection } from '@zuclubit/ui-kit/domain';

const tokens = TokenCollection.create('brand');

// Add tokens
tokens.add({
  path: 'color.brand.primary',
  value: '#3B82F6',
  type: 'color',
  metadata: {
    source: OklchColor.fromHex('#3B82F6'),
  },
});

// Query tokens
const colors = tokens.getByType('color');
const brandTokens = tokens.getByPath('color.brand');
const primary = tokens.get('color.brand.primary');
```

### Token Export

```typescript
import { ExportDesignTokens } from '@zuclubit/ui-kit/application';
import { W3CTokenExporter } from '@zuclubit/ui-kit/infrastructure';

const exporter = new W3CTokenExporter();
const exportUseCase = new ExportDesignTokens(exporter);

// Export to W3C format
const w3cResult = await exportUseCase.execute({
  collection: tokens,
  format: 'w3c',
  options: { includeMetadata: true },
});

// Export to CSS
const cssResult = await exportUseCase.execute({
  collection: tokens,
  format: 'css',
  options: { prefix: '--brand-' },
});

// Export to Tailwind
const twResult = await exportUseCase.execute({
  collection: tokens,
  format: 'tailwind',
  options: { useCssVariables: true },
});
```

## Best Practices

### 1. Always Use Perceptual Operations

```typescript
// ❌ Wrong: RGB manipulation
const darker = `rgb(${r * 0.8}, ${g * 0.8}, ${b * 0.8})`;

// ✅ Correct: Perceptual manipulation
const darker = color.withLightness(color.lightness * 0.8);
```

### 2. Verify Accessibility

```typescript
// ❌ Wrong: Assume colors are accessible
const button = { bg: brandColor, text: white };

// ✅ Correct: Verify or derive
const textColor = brandColor.deriveContrastingText({ minContrast: 4.5 });
const button = { bg: brandColor, text: textColor };
```

### 3. Use Semantic Tokens

```typescript
// ❌ Wrong: Hardcoded color references
const error = tokens.get('color.red.500');

// ✅ Correct: Semantic tokens
const error = tokens.get('color.semantic.error');
```

### 4. Preserve Perceptual Data

```typescript
// ❌ Wrong: Lose perceptual information
const hex = color.toHex();
saveToDatabase(hex);

// ✅ Correct: Keep perceptual data
saveToDatabase({
  display: color.toHex(),
  oklch: { l: color.lightness, c: color.chroma, h: color.hue },
});
```

### 5. Batch Color Operations

```typescript
// ❌ Wrong: Individual calculations
colors.forEach(c => {
  validateAccessibility(c, bg);  // N API calls
});

// ✅ Correct: Batch processing
const results = await validator.validateBatch(colors, bg);
```

## Troubleshooting

### Color Looks Different Than Expected

1. Check your display's color profile
2. Verify CSS color-gamut support
3. Use fallback for older browsers:

```css
.element {
  background: #3B82F6; /* sRGB fallback */
  background: oklch(65% 0.15 250); /* Modern browsers */
}
```

### Contrast Validation Fails

1. Verify you're using the correct standard (WCAG vs APCA)
2. Check if you're testing with the right context (font size, weight)
3. Consider using `ensureAccessibleWith()` for auto-correction

### Performance Issues

1. Cache perceptual color instances
2. Use batch operations for large palettes
3. Debounce theme changes
4. Consider web workers for heavy calculations

## API Reference

See [API.md](./API.md) for complete API documentation.

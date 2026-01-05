# @zuclubit/ui-kit

> A design system library powered by Color Intelligence with hexagonal architecture.

[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg)](https://reactjs.org/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

## Overview

`@zuclubit/ui-kit` is a comprehensive design token system built on **Color Intelligence** - a perceptual-first approach to color management that guarantees accessibility, consistency, and beautiful interfaces across any brand or theme.

### Key Features

- **Perceptual Color Science**: OKLCH and HCT color spaces for accurate, uniform color manipulation
- **Automatic Accessibility**: WCAG 2.1 AA/AAA and APCA compliance built-in
- **Hexagonal Architecture**: Clean separation of concerns with ports and adapters
- **Framework Agnostic Core**: Pure TypeScript domain with React, CSS, and Tailwind adapters
- **Token-First Design**: W3C DTCG compatible design tokens
- **Zero Hardcoded Colors**: All colors derived through Color Intelligence

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              ADAPTERS (UI)                                  │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │    React    │  │     CSS     │  │   Tailwind  │  │  Components │        │
│  │   Provider  │  │  Variables  │  │   Config    │  │  Primitives │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PORTS (Contracts)                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ ThemePort   │  │AccessibilityPort│ │ ExporterPort │ │  AuditPort  │        │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
└─────────┼────────────────┼────────────────┼────────────────┼────────────────┘
          │                │                │                │
          ▼                ▼                ▼                ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                      APPLICATION (Use Cases)                                │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐              │
│  │ DeriveColorPalette │ │ ValidateAccessibility │ │ ExportDesignTokens │              │
│  └─────────┬───────┘  └─────────┬───────┘  └─────────┬───────┘              │
│            │                    │                    │                      │
│            ▼                    ▼                    ▼                      │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    Color Intelligence Service                          ││
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               ││
│  │  │ PaletteService │  │ ContrastService │  │ TokenService  │               ││
│  │  └───────────────┘  └───────────────┘  └───────────────┘               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                         DOMAIN (Core)                                       │
│  ┌─────────────────────────────────────────────────────────────────────────┐│
│  │                    Perceptual Color Engine                              ││
│  │  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐               ││
│  │  │PerceptualColor│  │    OklchColor │  │    HctColor   │               ││
│  │  │  (Interface)  │  │ (Value Object)│  │ (Value Object)│               ││
│  │  └───────────────┘  └───────────────┘  └───────────────┘               ││
│  └─────────────────────────────────────────────────────────────────────────┘│
│  ┌───────────────┐  ┌───────────────┐  ┌───────────────┐                   │
│  │  DesignToken  │  │TokenCollection│  │  UXDecision   │                   │
│  │   (Entity)    │  │  (Aggregate)  │  │   (Policy)    │                   │
│  └───────────────┘  └───────────────┘  └───────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

## Installation

```bash
npm install @zuclubit/ui-kit
# or
yarn add @zuclubit/ui-kit
# or
pnpm add @zuclubit/ui-kit
```

## Quick Start

### 1. Basic Color Operations

```typescript
import { OklchColor, HctColor } from '@zuclubit/ui-kit/domain';

// Create a brand color using OKLCH
const brandColor = OklchColor.create({
  lightness: 0.65,
  chroma: 0.15,
  hue: 220,
});

// Access perceptual properties
console.log(brandColor.lightness);  // 0.65
console.log(brandColor.chroma);     // 0.15
console.log(brandColor.hue);        // 220

// Convert to CSS
console.log(brandColor.toCss());    // oklch(65% 0.15 220)
console.log(brandColor.toHex());    // #3B82F6

// Derive accessible variants
const lighter = brandColor.withLightness(0.85);
const darker = brandColor.withLightness(0.35);
```

### 2. Generate Accessible Color Palettes

```typescript
import { DeriveColorPalette } from '@zuclubit/ui-kit/application';
import { OklchColor } from '@zuclubit/ui-kit/domain';

const deriveUseCase = new DeriveColorPalette();

const result = await deriveUseCase.execute({
  baseColor: OklchColor.fromHex('#3B82F6'),
  steps: [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950],
  preserveHue: true,
  accessibilityLevel: 'AA',
});

if (result.success) {
  const palette = result.value;
  // {
  //   50: OklchColor { lightness: 0.97, ... },
  //   100: OklchColor { lightness: 0.93, ... },
  //   ...
  //   900: OklchColor { lightness: 0.25, ... },
  // }
}
```

### 3. React Theme Provider

```tsx
import { ThemeProvider, useTheme } from '@zuclubit/ui-kit/adapters/react';
import { OklchColor } from '@zuclubit/ui-kit/domain';

// Define your theme
const lightTheme = {
  id: 'light',
  name: 'Light Theme',
  mode: 'light' as const,
  colors: {
    primary: OklchColor.fromHex('#3B82F6'),
    secondary: OklchColor.fromHex('#8B5CF6'),
    background: OklchColor.fromHex('#FFFFFF'),
    surface: OklchColor.fromHex('#F8FAFC'),
    text: OklchColor.fromHex('#0F172A'),
  },
};

// Wrap your app
function App() {
  return (
    <ThemeProvider
      initialTheme={lightTheme}
      followSystem={true}
    >
      <YourApp />
    </ThemeProvider>
  );
}

// Use in components
function MyComponent() {
  const { theme, isDark, toggleDark } = useTheme();

  return (
    <button
      style={{ backgroundColor: theme.colors.primary.toCss() }}
      onClick={toggleDark}
    >
      Toggle Theme
    </button>
  );
}
```

### 4. Generate Tailwind Config

```typescript
import { TailwindConfigAdapter } from '@zuclubit/ui-kit/adapters/tailwind';
import { TokenCollection } from '@zuclubit/ui-kit/domain';

const adapter = new TailwindConfigAdapter({
  prefix: 'brand-',
  useCssVariables: true,
  outputFormat: 'ts',
});

const result = await adapter.generateFull(tokenCollection);

if (result.success) {
  // Write to tailwind.config.ts
  console.log(result.value.content);
}
```

### 5. Export to W3C Design Tokens

```typescript
import { W3CTokenExporter } from '@zuclubit/ui-kit/infrastructure';
import { TokenCollection } from '@zuclubit/ui-kit/domain';

const exporter = new W3CTokenExporter({
  includeType: true,
  includeDescription: true,
  groupByPath: true,
});

const result = await exporter.export(tokenCollection, {
  format: 'w3c',
  namespace: 'brand',
});

if (result.success) {
  console.log(result.value.content);
  // {
  //   "$schema": "https://design-tokens.github.io/community-group/format/",
  //   "color": {
  //     "brand": {
  //       "500": {
  //         "$value": "#3B82F6",
  //         "$type": "color"
  //       }
  //     }
  //   }
  // }
}
```

## Core Concepts

### Perceptual Color Spaces

The library uses **perceptually uniform** color spaces:

- **OKLCH**: Modern, wide-gamut color space with excellent perceptual uniformity
- **HCT**: Google's color space optimized for UI design and accessibility

```typescript
// OKLCH: Lightness (0-1), Chroma (0-0.4), Hue (0-360)
const oklch = OklchColor.create({ lightness: 0.65, chroma: 0.15, hue: 220 });

// HCT: Hue (0-360), Chroma (0-150), Tone (0-100)
const hct = HctColor.create({ hue: 220, chroma: 48, tone: 65 });
```

### Accessibility First

All color operations consider accessibility:

```typescript
import { ValidateAccessibility } from '@zuclubit/ui-kit/application';

const validator = new ValidateAccessibility();

const result = await validator.execute({
  foreground: textColor,
  background: bgColor,
  level: 'AA',      // or 'AAA'
  standard: 'WCAG21', // or 'APCA'
});

if (result.success) {
  console.log(result.value.passes);       // true/false
  console.log(result.value.contrastRatio); // 4.5
  console.log(result.value.recommendation); // suggestions if fails
}
```

### Design Tokens

Tokens are the atomic units of your design system:

```typescript
import { DesignToken, TokenCollection } from '@zuclubit/ui-kit/domain';

// Create tokens
const primaryToken = DesignToken.create({
  path: 'color.brand.primary',
  value: '#3B82F6',
  type: 'color',
  description: 'Primary brand color',
});

// Organize in collections
const collection = TokenCollection.create('brand');
collection.add(primaryToken);

// Query tokens
const colors = collection.getByType('color');
const brandColors = collection.getByPath('color.brand');
```

## API Reference

### Domain Layer

| Export | Description |
|--------|-------------|
| `PerceptualColor` | Interface for all perceptual color types |
| `OklchColor` | OKLCH color space implementation |
| `HctColor` | HCT color space implementation |
| `DesignToken` | Design token entity |
| `TokenCollection` | Token aggregate with query capabilities |
| `UXDecision` | UX policy value objects |

### Application Layer

| Export | Description |
|--------|-------------|
| `DeriveColorPalette` | Generate accessible color scales |
| `ValidateAccessibility` | Check contrast compliance |
| `ExportDesignTokens` | Export tokens to various formats |
| `GenerateComponentTokens` | Create component-specific tokens |
| `ColorIntelligenceService` | Central orchestration service |
| `PaletteService` | Palette generation utilities |
| `ContrastService` | Contrast calculation utilities |

### Adapters

| Export | Description |
|--------|-------------|
| `ThemeProvider` | React context provider |
| `useTheme` | React hook for theme access |
| `useDarkMode` | React hook for dark mode |
| `CssVariablesAdapter` | CSS custom properties adapter |
| `TailwindConfigAdapter` | Tailwind configuration generator |

### Infrastructure

| Export | Description |
|--------|-------------|
| `W3CTokenExporter` | W3C DTCG format exporter |
| `InMemoryAuditAdapter` | Development/testing audit adapter |

## Best Practices

### 1. Never Hardcode Colors

```typescript
// ❌ Don't do this
const button = { backgroundColor: '#3B82F6' };

// ✅ Do this
const button = { backgroundColor: theme.colors.primary.toCss() };
```

### 2. Use Perceptual Derivation

```typescript
// ❌ Don't do this (arbitrary darkening)
const hover = color.darken(10);

// ✅ Do this (perceptually consistent)
const hover = color.withLightness(color.lightness - 0.1);
```

### 3. Always Check Accessibility

```typescript
// ❌ Don't assume contrast is OK
const text = white;

// ✅ Verify or derive automatically
const text = surface.deriveContrastingText({ minContrast: 4.5 });
```

### 4. Use Tokens for Consistency

```typescript
// ❌ Don't use magic values
const spacing = '16px';

// ✅ Use tokens
const spacing = tokens.spacing.md;
```

## Browser Support

- Chrome 111+
- Firefox 113+
- Safari 16.4+
- Edge 111+

(Requires OKLCH support or polyfill for older browsers)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup and guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

---

Built with Color Intelligence by [Zuclubit](https://zuclubit.com)

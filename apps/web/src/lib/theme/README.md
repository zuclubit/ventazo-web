# Ventazo Design System - Theme & Tokens

Sistema de theming dinámico para el CRM Ventazo 2025, con integración completa de `@zuclubit/ui-kit`:
- **Multi-tenant branding** (colores personalizados por tenant)
- **Dark/Light mode** automático
- **CSS Variables** como fuente de verdad
- **TypeScript tokens** exportables
- **Perceptual color operations** (OKLCH color space)
- **WCAG 2.1 + APCA contrast validation**
- **W3C DTCG token management**
- **Governance-aware accessibility enforcement**

---

## Architecture

```
lib/theme/
├── index.ts                    # Public exports
├── tokens.ts                   # Design tokens + TokenBridge integration
├── types.ts                    # TypeScript types
├── color-utils.ts              # Color utilities + PerceptualColor
├── adaptive-contrast.ts        # OKLCH + APCA adaptive system
├── tenant-theme-provider.tsx   # Tenant theming provider
├── GovernanceProvider.tsx      # Accessibility governance
├── ThemeOrchestrator.ts        # Theme derivation + validation
├── z-index.ts                  # Z-index management
├── hooks/
│   ├── index.ts                # Hooks exports
│   └── useConformance.ts       # Conformance validation hooks
└── README.md                   # This documentation
```

### Bridge Architecture (UI-Kit Integration)

```
                    ┌─────────────────────────────────────────┐
                    │           @zuclubit/ui-kit              │
                    │  ┌─────────────┐  ┌─────────────────┐   │
                    │  │PerceptualColor│ │ TokenCollection │   │
                    │  │   (OKLCH)   │  │   (W3C DTCG)   │   │
                    │  └──────┬──────┘  └────────┬────────┘   │
                    └─────────┼──────────────────┼────────────┘
                              │                  │
              ┌───────────────▼──────────────────▼───────────────┐
              │                Bridge Adapters                   │
              │  ┌─────────────────┐  ┌─────────────────────┐   │
              │  │  ColorBridge    │  │    TokenBridge      │   │
              │  │ (hex ↔ OKLCH)  │  │ (legacy ↔ W3C DTCG)│   │
              │  └────────┬────────┘  └──────────┬──────────┘   │
              └───────────┼──────────────────────┼───────────────┘
                          │                      │
    ┌─────────────────────▼──────────────────────▼─────────────────────┐
    │                    Theme Layer (web app)                         │
    │  ┌────────────────┐ ┌──────────────────┐ ┌────────────────────┐ │
    │  │  color-utils   │ │     tokens       │ │ ThemeOrchestrator  │ │
    │  │ (perceptual)   │ │ (collection API) │ │  (governance)      │ │
    │  └────────────────┘ └──────────────────┘ └────────────────────┘ │
    │                                                                  │
    │  ┌────────────────────────────────────────────────────────────┐ │
    │  │                      Providers                              │ │
    │  │  GovernanceProvider → TenantThemeProvider → NextThemes     │ │
    │  └────────────────────────────────────────────────────────────┘ │
    │                                                                  │
    │  ┌────────────────────────────────────────────────────────────┐ │
    │  │                   Conformance Hooks                         │ │
    │  │  useColorConformance | useBatchConformance | useComponentAudit │
    │  └────────────────────────────────────────────────────────────┘ │
    └──────────────────────────────────────────────────────────────────┘
```

---

## Quick Start

### Basic Color Validation

```tsx
import { useColorConformance } from '@/lib/theme';

function MyComponent() {
  const result = useColorConformance('#1a1a2e', '#ffffff', 'AA', 'normal');

  if (!result?.passes) {
    console.warn('Contrast insufficient:', result?.contrastRatio);
  }

  return <div style={{ color: '#ffffff', background: '#1a1a2e' }}>...</div>;
}
```

### Perceptual Color Operations

```tsx
import {
  perceptualLighten,
  perceptualDarken,
  getPerceptualApcaContrast,
} from '@/lib/theme';

// Lighten by 15% in perceptually uniform space
const lighter = perceptualLighten('#3B82F6', 15);

// Get APCA contrast (WCAG 3.0)
const apcaContrast = getPerceptualApcaContrast('#ffffff', '#1a1a2e');
// Returns Lc value (e.g., 98.2)
```

### Token Derivation

```tsx
import { deriveColorScale, deriveThemeTokens } from '@/lib/theme';

// Generate a 10-step color scale from a single color
const blueScale = deriveColorScale('brand', '#3B82F6');
// Returns: { 'brand-50': {...}, 'brand-100': {...}, ..., 'brand-900': {...} }

// Generate full theme tokens from primary brand color
const themeTokens = deriveThemeTokens('acme', '#3B82F6', {
  generateSemantics: true,
  generateStates: true,
});
```

---

## Sistema de 4 Colores Semánticos

El sistema de theming se basa en 4 colores principales que definen toda la identidad visual:

| Variable | Descripción | Uso Principal |
|----------|-------------|---------------|
| `--tenant-primary` | Color primario de marca | Botones, acentos, CTAs |
| `--tenant-accent` | Color secundario | Badges, highlights |
| `--tenant-sidebar` | Color de sidebar | Navegación principal |
| `--tenant-surface` | Color de superficie | Fondos, cards glass |

### Variaciones Automáticas

Cada color primario genera variaciones automáticas:
- `--tenant-primary-hover`: Estado hover
- `--tenant-primary-light`: Versión clara
- `--tenant-primary-lighter`: Versión más clara
- `--tenant-primary-glow`: Efecto glow (color-mix)

---

## Color Utilities

### Perceptual Color Operations (OKLCH)

The system uses OKLCH color space for perceptually uniform operations:

```tsx
import {
  // Conversion
  perceptualHexToOklch,
  perceptualOklchToHex,

  // Manipulation (perceptually uniform)
  perceptualLighten,
  perceptualDarken,
  perceptualSaturate,
  perceptualDesaturate,
  perceptualRotateHue,

  // Analysis
  getPerceptualInfo,
} from '@/lib/theme';

// Convert to OKLCH
const oklch = perceptualHexToOklch('#3B82F6');
// { L: 0.628, C: 0.182, H: 264.1 }

// Perceptual manipulation
const lighter = perceptualLighten('#3B82F6', 20);  // 20% lighter
const warmer = perceptualRotateHue('#3B82F6', 30); // Rotate hue 30°

// Get full perceptual info
const info = getPerceptualInfo('#3B82F6');
// { oklch, isLight, perceivedLightness, saturation, hueCategory }
```

### WCAG 2.1 Contrast Validation

```tsx
import {
  getContrastRatio,
  checkWcagContrast,
  getWcagLevel,
  getOptimalForeground,
} from '@/lib/theme';

// Get contrast ratio
const ratio = getContrastRatio('#ffffff', '#1a1a2e'); // 16.8

// Check WCAG compliance
const passes = checkWcagContrast('#ffffff', '#1a1a2e', 'AA', 'normal'); // true

// Get achieved level
const level = getWcagLevel(ratio); // 'AAA'

// Auto-select optimal foreground
const fg = getOptimalForeground('#3B82F6'); // '#ffffff' or '#000000'
```

### APCA Contrast (WCAG 3.0)

```tsx
import {
  getApcaContrast,
  checkApcaContrast,
  getOptimalForegroundApca,
  validateAccessibility,
} from '@/lib/theme';

// Get APCA Lc value
const lc = getApcaContrast('#ffffff', '#1a1a2e'); // 98.2

// Check minimum contrast for text size
const passesBody = checkApcaContrast('#ffffff', '#1a1a2e', 'body');     // true
const passesLarge = checkApcaContrast('#cccccc', '#1a1a2e', 'headline'); // check

// Comprehensive validation
const validation = validateAccessibility('#3B82F6', '#ffffff');
// { wcag21: {...}, apca: {...}, recommendations: [...] }
```

### Palette Generation

```tsx
import {
  generatePalette,
  generateSemanticVariants,
  generatePerceptualPalette,
  deriveFullPaletteFromPrimary,
  suggest4ColorPalette,
} from '@/lib/theme';

// Generate 10-step palette
const palette = generatePalette('#3B82F6');
// { 50: '#eff6ff', 100: '#dbeafe', ..., 900: '#1e3a8a' }

// Generate semantic variants (success, warning, error)
const semantic = generateSemanticVariants('#3B82F6');

// Perceptual palette (OKLCH-based, uniform lightness steps)
const perceptualPalette = generatePerceptualPalette('#3B82F6', 10);

// Full 4-color semantic palette from primary
const fullPalette = deriveFullPaletteFromPrimary('#3B82F6');
// { primary, secondary, accent, neutral }
```

---

## Token Management

### Accessing Tokens

```tsx
import {
  getTokenCollection,
  getToken,
  queryTokens,
} from '@/lib/theme';

// Get all tokens
const allTokens = getTokenCollection('all');

// Get specific token
const primaryColor = getToken('color.primary.500');

// Query tokens by criteria
const colorTokens = queryTokens({
  namespace: 'color',
  tags: ['brand'],
});
```

### Deriving Tokens

```tsx
import {
  deriveColorScale,
  deriveStateTokens,
  deriveComponentTokens,
  deriveThemeTokens,
} from '@/lib/theme';

// Derive color scale (50-900)
const brandScale = deriveColorScale('brand', '#3B82F6');

// Derive state variants (hover, active, disabled)
const buttonStates = deriveStateTokens('button', '#3B82F6');

// Derive component-specific tokens
const cardTokens = deriveComponentTokens('card', '#3B82F6', 'surface');

// Derive full theme
const theme = deriveThemeTokens('acme-theme', '#3B82F6', {
  generateSemantics: true,
  generateStates: true,
  darkMode: true,
});
```

### Exporting Tokens

```tsx
import {
  exportTokensToCss,
  exportTokensToTailwind,
  exportTokensToW3C,
  exportTokensToFigma,
} from '@/lib/theme';

// Export to CSS custom properties
const css = exportTokensToCss({ prefix: '--acme' });

// Export to Tailwind config
const tailwind = exportTokensToTailwind();

// Export to W3C DTCG format
const w3c = exportTokensToW3C();

// Export to Figma variables
const figma = exportTokensToFigma();
```

### React Hooks for Tokens

```tsx
import {
  useTokenCollection,
  useDerivedTokens,
  useStaticTokens,
  useBreakpoint,
} from '@/lib/theme';

function MyComponent() {
  // Access full collection (memoized)
  const tokens = useTokenCollection('color');

  // Derive tokens from brand color
  const derived = useDerivedTokens('#3B82F6', {
    generateScale: true,
    generateStates: true,
  });

  // Access static tokens
  const { colors, spacing, radius } = useStaticTokens();

  // Responsive breakpoint detection
  const breakpoint = useBreakpoint(); // 'sm' | 'md' | 'lg' | 'xl' | '2xl'

  return <div>...</div>;
}
```

---

## Conformance Validation Hooks

### Single Color Pair Validation

```tsx
import { useColorConformance } from '@/lib/theme';

function ColorPicker({ fg, bg }) {
  const result = useColorConformance(fg, bg, 'AA', 'normal');

  return (
    <div>
      <div style={{ color: fg, background: bg }}>Preview</div>
      {result && (
        <div>
          Contrast: {result.contrastRatio.toFixed(2)}:1
          {result.passes ? ' ✓ Passes' : ' ✗ Fails'} {result.requiredLevel}
          {result.apcaLc && <span> (APCA: {result.apcaLc.toFixed(1)})</span>}
        </div>
      )}
    </div>
  );
}
```

### Batch Validation

```tsx
import { useBatchConformance } from '@/lib/theme';

function ThemeValidator({ theme }) {
  const colorPairs = [
    { id: 'text-bg', fg: theme.text, bg: theme.background, level: 'AA' },
    { id: 'link-bg', fg: theme.link, bg: theme.background, level: 'AA' },
    { id: 'heading-bg', fg: theme.heading, bg: theme.background, level: 'AAA' },
  ];

  const results = useBatchConformance(colorPairs);
  const allPass = results.every(r => r.passes);

  return (
    <div>
      <h3>Theme Validation: {allPass ? '✓ All Pass' : '✗ Issues Found'}</h3>
      {results.map(r => (
        <div key={r.id}>
          {r.id}: {r.contrastRatio.toFixed(2)}:1 - {r.passes ? 'Pass' : 'Fail'}
        </div>
      ))}
    </div>
  );
}
```

### Real-time Live Validation

```tsx
import { useLiveConformance } from '@/lib/theme';

function LiveColorEditor() {
  const [fg, setFg] = useState('#ffffff');
  const [bg, setBg] = useState('#3B82F6');

  const { feedback, isValidating } = useLiveConformance(fg, bg, 150);

  return (
    <div>
      <input value={fg} onChange={e => setFg(e.target.value)} />
      <input value={bg} onChange={e => setBg(e.target.value)} />

      {isValidating && <span>Validating...</span>}
      {feedback && (
        <div className={feedback.passes ? 'text-green-500' : 'text-red-500'}>
          {feedback.contrastRatio.toFixed(2)}:1 - {feedback.achievedLevel}
        </div>
      )}
    </div>
  );
}
```

### Component Accessibility Audit

```tsx
import { useComponentAudit } from '@/lib/theme';

function CardComponent({ colors }) {
  const audit = useComponentAudit('Card', {
    'title-bg': { fg: colors.title, bg: colors.background },
    'body-bg': { fg: colors.body, bg: colors.background },
    'link-bg': { fg: colors.link, bg: colors.background },
  });

  // Log issues in development
  if (process.env.NODE_ENV === 'development' && !audit.passes) {
    console.warn(`[${audit.componentName}] Accessibility issues:`, audit.failures);
  }

  return <div>...</div>;
}
```

### Token Conformance

```tsx
import { useTokenConformance } from '@/lib/theme';

function TokenAuditor() {
  const brandColors = [
    { name: 'primary', value: '#3B82F6' },
    { name: 'secondary', value: '#10B981' },
    { name: 'accent', value: '#F59E0B' },
  ];

  const results = useTokenConformance(brandColors);

  return (
    <div>
      {results.map(r => (
        <div key={r.name}>
          {r.name}:
          Light BG: {r.contrastOnLight.toFixed(2)}:1 ({r.passesOnLight ? '✓' : '✗'})
          Dark BG: {r.contrastOnDark.toFixed(2)}:1 ({r.passesOnDark ? '✓' : '✗'})
          Recommended: {r.recommendedUsage}
        </div>
      ))}
    </div>
  );
}
```

### Accessibility Score

```tsx
import { useAccessibilityScore } from '@/lib/theme';

function AccessibilityDashboard({ theme }) {
  const colorPairs = [
    { fg: theme.text, bg: theme.background, weight: 3 },      // High importance
    { fg: theme.muted, bg: theme.background, weight: 1 },     // Lower importance
    { fg: theme.link, bg: theme.background, weight: 2 },
  ];

  const { score, grade, details } = useAccessibilityScore(colorPairs);

  return (
    <div>
      <h2>Accessibility Score: {score}/100 (Grade {grade})</h2>
      <ul>
        {details.map((d, i) => (
          <li key={i}>
            Pair {i + 1}: {d.ratio.toFixed(2)}:1
            ({d.passes ? 'Pass' : 'Fail'}, weighted {d.weight}x)
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---

## Uso en Componentes

### Con CSS Variables (Tailwind)

```tsx
// Uso directo en clases Tailwind
<div className="bg-[var(--tenant-primary)] text-[var(--tenant-primary-foreground)]">
  Botón con color del tenant
</div>

// Con color-mix para transparencias
<div className="bg-[color-mix(in_srgb,var(--tenant-primary)_15%,transparent)]">
  Fondo con 15% del color primario
</div>
```

### Con Tokens TypeScript

```tsx
import { colors, statusClasses, priorityClasses } from '@/lib/theme';

// Acceso a colores
const primaryColor = colors.tenant.primary; // 'var(--tenant-primary)'

// Clases para status de tareas
<Badge className={statusClasses.completed}>
  Completada
</Badge>

// Clases para prioridad
<Badge className={priorityClasses.high}>
  Alta
</Badge>
```

---

## Task Module Tokens

### Status Colors

| Status | Variable | Uso |
|--------|----------|-----|
| Pending | `--status-pending` | Tareas pendientes |
| In Progress | `--status-in-progress` | Tareas en progreso |
| Completed | `--status-completed` | Tareas completadas |
| Cancelled | `--status-cancelled` | Tareas canceladas |
| Deferred | `--status-deferred` | Tareas diferidas |

Cada status tiene 3 variantes:
- `--status-{name}`: Color de texto
- `--status-{name}-bg`: Color de fondo (12% alpha)
- `--status-{name}-border`: Color de borde (25% alpha)

### Priority Colors

| Priority | Variable | Color |
|----------|----------|-------|
| Low | `--priority-low` | Slate |
| Medium | `--priority-medium` | Blue |
| High | `--priority-high` | Orange |
| Urgent | `--priority-urgent` | Red |

---

## Kanban Tokens

```css
--kanban-column-width: 320px;
--kanban-column-min-height: 200px;
--kanban-card-gap: 0.75rem;
--kanban-header-height: 3.5rem;
--kanban-empty-height: 120px;
```

---

## Theme Orchestrator

### Deriving Complete Themes

```tsx
import { deriveThemeFromPrimary, validateTheme } from '@/lib/theme';

// Derive full theme from primary color
const theme = deriveThemeFromPrimary('#3B82F6', {
  targetContrast: 'AA',
  darkModeStrategy: 'invert-lightness',
});

// Validate theme accessibility
const validation = validateTheme(theme);
if (!validation.passes) {
  console.warn('Theme issues:', validation.issues);
}
```

### Export Theme as CSS

```tsx
import { exportTokensAsCss } from '@/lib/theme';

const css = exportTokensAsCss(themeTokens, {
  prefix: '--app',
  includeComments: true,
});

// Output:
// /* Primary Colors */
// --app-color-primary-50: #eff6ff;
// --app-color-primary-100: #dbeafe;
// ...
```

---

## Governance Provider

The `GovernanceProvider` enforces accessibility policies across the app:

```tsx
import { GovernanceProvider, useGovernance, GovernanceGate } from '@/lib/theme';

// App-level setup (already in providers.tsx)
<GovernanceProvider defaultEnabled={true} defaultPolicyLevel="default">
  <App />
</GovernanceProvider>

// Access governance context
function MyComponent() {
  const {
    enabled,
    policyLevel,
    validateColor,
    getViolations,
  } = useGovernance();

  // Validate a color pair
  const isValid = validateColor('#ffffff', '#1a1a2e');

  return <div>...</div>;
}

// Gate content based on accessibility
function ConditionalFeature() {
  return (
    <GovernanceGate requiredLevel="AAA" fallback={<BasicVersion />}>
      <EnhancedVersion />
    </GovernanceGate>
  );
}
```

---

## TenantThemeProvider

Envuelve tu app para habilitar theming dinámico:

```tsx
import { TenantThemeProvider } from '@/lib/theme';

<TenantThemeProvider branding={tenantBranding}>
  <App />
</TenantThemeProvider>
```

### useTenantTheme Hook

```tsx
import { useTenantTheme } from '@/lib/theme';

function Component() {
  const { branding, colors, updatePrimaryColor } = useTenantTheme();

  return (
    <div style={{ color: colors.primary }}>
      Usando color del tenant
    </div>
  );
}
```

---

## Z-Index Management

```tsx
import { zIndex, getZIndex, getZIndexClass } from '@/lib/theme';

// Numeric values
<div style={{ zIndex: zIndex.modal }}>Modal</div>
<div style={{ zIndex: zIndex.dropdown }}>Dropdown</div>

// Get by token name
const tooltipZ = getZIndex('tooltip'); // 50

// Tailwind classes
<div className={getZIndexClass('modal')}>Modal</div>
```

---

## Adaptive Contrast System

For smart glass/blur effects with adaptive text colors:

```tsx
import { getAdaptiveColors, getAdaptiveCssVars } from '@/lib/theme';

// Get adaptive colors based on background
const adaptive = getAdaptiveColors('#1a1a2e', {
  preferDarkText: false,
  minContrast: 60, // APCA Lc
});
// { text, textMuted, border, overlay, ... }

// Get as CSS variables
const cssVars = getAdaptiveCssVars('#1a1a2e');
// Apply to element: element.style.cssText = cssVars;
```

---

## Dark Mode

El sistema soporta dark mode automáticamente. Los colores se ajustan en `.dark`:

```css
.dark {
  --status-pending: #FACC15;        /* Más brillante */
  --status-pending-bg: rgba(250, 204, 21, 0.15); /* Más alpha */
  /* ... */
}
```

---

## Migration Guide

### From Legacy Color Functions

```tsx
// Before (legacy)
import { lighten, darken } from '@/lib/theme';
const lighter = lighten('#3B82F6', 20);

// After (perceptual - recommended)
import { perceptualLighten, perceptualDarken } from '@/lib/theme';
const lighter = perceptualLighten('#3B82F6', 20);
// More uniform perception across different hues
```

### From Manual Contrast Checks

```tsx
// Before
const ratio = getContrastRatio(fg, bg);
const passes = ratio >= 4.5;

// After (using hooks)
const { passes, contrastRatio, achievedLevel } = useColorConformance(fg, bg, 'AA');
```

### From Static Tokens to Dynamic

```tsx
// Before (static)
const primary = 'var(--color-primary)';

// After (dynamic derivation)
const tokens = useDerivedTokens(brandColor, { generateScale: true });
const primary = tokens['primary-500'].value;
```

### Migración de Colores Hardcodeados

Si tienes componentes con colores hardcodeados:

**Antes:**
```tsx
className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
```

**Después:**
```tsx
className="bg-[var(--status-pending-bg)] text-[var(--status-pending)]"
```

O usando tokens:
```tsx
import { statusClasses } from '@/lib/theme';
className={statusClasses.pending}
```

---

## Best Practices

1. **Always validate contrast** - Use `useColorConformance` or `useBatchConformance` for any user-facing color combinations.

2. **Prefer perceptual operations** - Use `perceptualLighten/Darken` over legacy `lighten/darken` for more consistent results across hues.

3. **Use APCA for new designs** - WCAG 3.0's APCA provides better real-world contrast predictions. Use `getApcaContrast` and target Lc >= 60 for body text.

4. **Derive tokens from brand colors** - Use `deriveThemeTokens` to generate consistent design tokens from a single brand color.

5. **Audit components** - Use `useComponentAudit` in development to catch accessibility issues early.

6. **Export to multiple formats** - Use `exportTokensToTailwind`, `exportTokensToFigma` etc. to maintain consistency across tools.

7. **Leverage governance** - Keep `GovernanceProvider` enabled to automatically validate accessibility across the app.

---

## Estructura de globals.css

```css
@layer base {
  :root {
    /* Ventazo Brand */
    --ventazo-green: #0EB58C;

    /* Tenant Dynamic */
    --tenant-primary: var(--ventazo-green);

    /* Task Module */
    --status-pending: #EAB308;
    --priority-high: #F97316;

    /* Kanban */
    --kanban-column-width: 320px;
  }

  .dark {
    /* Dark mode overrides */
    --status-pending: #FACC15;
  }
}
```

---

## API Reference

See the TypeScript definitions in:
- `/lib/theme/index.ts` - Main exports
- `/lib/theme/types.ts` - Type definitions
- `/lib/theme/hooks/useConformance.ts` - Conformance hooks
- `/lib/bridges/ColorBridge.ts` - Color bridge adapter
- `/lib/bridges/TokenBridge.ts` - Token bridge adapter
- `/lib/theme/ThemeOrchestrator.ts` - Theme orchestration
- `/lib/theme/GovernanceProvider.tsx` - Governance context

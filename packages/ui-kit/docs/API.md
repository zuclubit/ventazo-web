# API Reference

> Complete API documentation for @zuclubit/ui-kit

## Table of Contents

- [Domain Layer](#domain-layer)
  - [OklchColor](#oklchcolor)
  - [HctColor](#hctcolor)
  - [DesignToken](#designtoken)
  - [TokenCollection](#tokencollection)
- [Application Layer](#application-layer)
  - [Use Cases](#use-cases)
  - [Services](#services)
- [Adapters](#adapters)
  - [React](#react-adapters)
  - [CSS](#css-adapters)
  - [Tailwind](#tailwind-adapters)
- [Infrastructure](#infrastructure)
  - [Exporters](#exporters)
  - [Audit](#audit)
- [Types](#types)

---

## Domain Layer

### OklchColor

OKLCH perceptual color implementation.

#### Static Methods

```typescript
// Create from components
OklchColor.create(params: OklchParams): OklchColor

interface OklchParams {
  lightness: number;  // 0-1
  chroma: number;     // 0-0.4
  hue: number;        // 0-360
  alpha?: number;     // 0-1, default 1
}

// Create from hex
OklchColor.fromHex(hex: string): OklchColor

// Create from RGB
OklchColor.fromRgb(r: number, g: number, b: number, a?: number): OklchColor

// Create from HSL
OklchColor.fromHsl(h: number, s: number, l: number, a?: number): OklchColor
```

#### Instance Properties

```typescript
readonly lightness: number;  // 0-1
readonly chroma: number;     // 0-0.4
readonly hue: number;        // 0-360
readonly alpha: number;      // 0-1
```

#### Instance Methods

```typescript
// Conversion
toCss(): string              // 'oklch(65% 0.15 250)'
toHex(): string              // '#3B82F6'
toRgb(): { r: number; g: number; b: number; a: number }
toHsl(): { h: number; s: number; l: number; a: number }
toArray(): [number, number, number, number]

// Transformations (return new OklchColor)
withLightness(l: number): OklchColor
withChroma(c: number): OklchColor
withHue(h: number): OklchColor
withAlpha(a: number): OklchColor
adjustLightness(delta: number): OklchColor
adjustChroma(delta: number): OklchColor
adjustHue(delta: number): OklchColor

// Derivation
deriveContrastingText(options?: ContrastOptions): OklchColor
ensureAccessibleWith(other: OklchColor, options?: AccessibilityOptions): OklchColor
generateLightnessScale(steps: number[]): Map<number, OklchColor>

// Comparison
equals(other: PerceptualColor): boolean
contrastWith(other: PerceptualColor): number
distanceFrom(other: PerceptualColor): number
```

#### Example

```typescript
import { OklchColor } from '@zuclubit/ui-kit/domain';

const brand = OklchColor.fromHex('#3B82F6');
const lighter = brand.withLightness(0.9);
const text = brand.deriveContrastingText({ minContrast: 4.5 });

console.log(brand.toCss());    // 'oklch(62.8% 0.187 261.2)'
console.log(lighter.toHex());  // '#E0ECFF'
```

---

### HctColor

Google's HCT (Hue Chroma Tone) color implementation.

#### Static Methods

```typescript
HctColor.create(params: HctParams): HctColor

interface HctParams {
  hue: number;     // 0-360
  chroma: number;  // 0-150
  tone: number;    // 0-100
  alpha?: number;  // 0-1
}

HctColor.fromHex(hex: string): HctColor
HctColor.fromArgb(argb: number): HctColor
```

#### Instance Properties

```typescript
readonly hue: number;     // 0-360
readonly chroma: number;  // 0-150
readonly tone: number;    // 0-100
readonly alpha: number;   // 0-1
```

#### Instance Methods

```typescript
// Conversion
toCss(): string
toHex(): string
toArgb(): number
toOklch(): OklchColor

// Transformations
withHue(h: number): HctColor
withChroma(c: number): HctColor
withTone(t: number): HctColor
withAlpha(a: number): HctColor

// Material Design utilities
getTonalPalette(): TonalPalette
```

---

### DesignToken

Design token entity.

#### Creation

```typescript
interface DesignTokenParams {
  path: string;
  value: TokenValue;
  type: TokenType;
  description?: string;
  metadata?: TokenMetadata;
}

DesignToken.create(params: DesignTokenParams): DesignToken
```

#### Properties

```typescript
readonly path: string;              // 'color.brand.primary'
readonly value: TokenValue;         // The token value
readonly type: TokenType;           // 'color' | 'dimension' | etc.
readonly description?: string;
readonly metadata?: TokenMetadata;
```

#### Token Types

```typescript
type TokenType =
  | 'color'
  | 'dimension'
  | 'fontFamily'
  | 'fontWeight'
  | 'fontStyle'
  | 'duration'
  | 'cubicBezier'
  | 'number'
  | 'string'
  | 'shadow'
  | 'border'
  | 'gradient'
  | 'typography'
  | 'composite';
```

---

### TokenCollection

Aggregate for managing design tokens.

#### Creation

```typescript
TokenCollection.create(name: string): TokenCollection
TokenCollection.fromArray(name: string, tokens: DesignToken[]): TokenCollection
```

#### Methods

```typescript
// Mutation
add(token: DesignToken): void
addAll(tokens: DesignToken[]): void
remove(path: string): boolean
update(path: string, updates: Partial<DesignTokenParams>): boolean
clear(): void

// Query
get(path: string): DesignToken | undefined
has(path: string): boolean
getAll(): DesignToken[]
getByType(type: TokenType): DesignToken[]
getByPath(pathPrefix: string): DesignToken[]
filter(predicate: (token: DesignToken) => boolean): DesignToken[]
find(predicate: (token: DesignToken) => boolean): DesignToken | undefined

// Iteration
forEach(callback: (token: DesignToken) => void): void
map<T>(callback: (token: DesignToken) => T): T[]

// Info
readonly name: string
readonly size: number
isEmpty(): boolean

// Export
toArray(): DesignToken[]
toMap(): Map<string, DesignToken>
toJSON(): Record<string, TokenValue>
```

---

## Application Layer

### Use Cases

#### DeriveColorPalette

Generate perceptually uniform color palettes.

```typescript
import { DeriveColorPalette } from '@zuclubit/ui-kit/application';

const useCase = new DeriveColorPalette(contrastService?, auditPort?);

interface DeriveColorPaletteInput {
  baseColor: PerceptualColor;
  steps: number[];                    // [50, 100, 200, ..., 900]
  preserveHue?: boolean;              // default: true
  accessibilityLevel?: 'AA' | 'AAA';  // default: 'AA'
  chromaStrategy?: 'preserve' | 'adaptive';
}

interface ColorPalette {
  [step: number]: PerceptualColor;
}

const result = await useCase.execute(input);
// Result<ColorPalette, Error>
```

#### ValidateAccessibility

Check color contrast compliance.

```typescript
import { ValidateAccessibility } from '@zuclubit/ui-kit/application';

const useCase = new ValidateAccessibility(contrastService?, auditPort?);

interface ValidateAccessibilityInput {
  foreground: PerceptualColor;
  background: PerceptualColor;
  level: 'AA' | 'AAA';
  standard: 'WCAG21' | 'APCA';
  context?: {
    fontSize?: number;
    fontWeight?: number;
    useCase?: string;
  };
}

interface AccessibilityResult {
  passes: boolean;
  contrastRatio: number;
  level: 'AAA' | 'AA' | 'fail';
  recommendation?: string;
  apcaLc?: number;  // For APCA standard
}

const result = await useCase.execute(input);
// Result<AccessibilityResult, Error>
```

#### ExportDesignTokens

Export tokens to various formats.

```typescript
import { ExportDesignTokens } from '@zuclubit/ui-kit/application';

const useCase = new ExportDesignTokens(exporterPort, auditPort?);

interface ExportDesignTokensInput {
  collection: TokenCollection;
  format: ExportFormat;
  options?: ExportOptions;
}

interface ExportResult {
  format: ExportFormat;
  content: string;
  metadata: {
    tokenCount: number;
    generatedAt: Date;
    version: string;
  };
}

const result = await useCase.execute(input);
// Result<ExportResult, Error>
```

#### GenerateComponentTokens

Generate component-specific token sets.

```typescript
import { GenerateComponentTokens } from '@zuclubit/ui-kit/application';

const useCase = new GenerateComponentTokens(paletteService?, auditPort?);

interface GenerateComponentTokensInput {
  component: string;              // 'button' | 'input' | etc.
  baseColor: PerceptualColor;
  states?: string[];              // ['default', 'hover', 'active', 'disabled']
  variants?: string[];            // ['solid', 'outline', 'ghost']
  accessibilityLevel?: 'AA' | 'AAA';
}

const result = await useCase.execute(input);
// Result<ComponentTokenSet, Error>
```

### Services

#### ColorIntelligenceService

Central service for Color Intelligence operations.

```typescript
import { ColorIntelligenceService } from '@zuclubit/ui-kit/application';

const service = new ColorIntelligenceService(
  paletteService,
  contrastService,
  tokenService
);

// Methods
async generateThemeTokens(config: ThemeConfig): Promise<Result<TokenCollection, Error>>
async deriveDarkMode(lightPalette: ColorPalette, options?: DarkModeOptions): Promise<Result<ColorPalette, Error>>
async validateTheme(theme: ThemeConfig): Promise<Result<ValidationReport, Error>>
```

#### PaletteService

Palette generation utilities.

```typescript
import { PaletteService } from '@zuclubit/ui-kit/application';

const service = new PaletteService();

generateTonalPalette(base: PerceptualColor, steps: number[]): ColorPalette
generateAnalogousPalette(base: PerceptualColor, count: number): PerceptualColor[]
generateComplementaryPalette(base: PerceptualColor): PerceptualColor[]
generateTriadicPalette(base: PerceptualColor): PerceptualColor[]
interpolate(from: PerceptualColor, to: PerceptualColor, steps: number): PerceptualColor[]
```

#### ContrastService

Contrast calculation utilities.

```typescript
import { ContrastService } from '@zuclubit/ui-kit/application';

const service = new ContrastService();

calculateWcagContrast(fg: PerceptualColor, bg: PerceptualColor): number
calculateApcaContrast(fg: PerceptualColor, bg: PerceptualColor): number
meetsWcagLevel(contrast: number, level: 'AA' | 'AAA', isLargeText?: boolean): boolean
meetsApcaLevel(lc: number, context: ApcaContext): boolean
suggestForeground(bg: PerceptualColor, targetContrast: number): PerceptualColor
suggestBackground(fg: PerceptualColor, targetContrast: number): PerceptualColor
```

---

## Adapters

### React Adapters

#### ThemeProvider

React context provider for theming.

```typescript
import { ThemeProvider } from '@zuclubit/ui-kit/adapters/react';

interface ThemeProviderProps {
  children: ReactNode;
  initialTheme?: ThemeConfig;
  themes?: ThemeConfig[];
  cssOptions?: CssAdapterOptions;
  followSystem?: boolean;
  onThemeChange?: (state: ThemeState) => void;
  onSystemPreferencesChange?: (prefs: SystemPreferences) => void;
}

<ThemeProvider
  initialTheme={lightTheme}
  themes={[lightTheme, darkTheme]}
  followSystem={true}
>
  <App />
</ThemeProvider>
```

#### useTheme

Hook for accessing theme state.

```typescript
import { useTheme } from '@zuclubit/ui-kit/adapters/react';

const {
  theme,           // Current ThemeConfig
  isDark,          // boolean
  isLight,         // boolean
  toggleDark,      // () => void
  setTheme,        // (id: string) => void
  appliedTokens,   // Applied CSS variable tokens
} = useTheme();
```

#### useDarkMode

Hook for dark mode control.

```typescript
import { useDarkMode } from '@zuclubit/ui-kit/adapters/react';

const {
  isDark,          // boolean
  toggle,          // () => void
  enable,          // () => void
  disable,         // () => void
  setMode,         // (mode: 'light' | 'dark') => void
} = useDarkMode();
```

#### useThemeVariable

Hook for accessing CSS variables.

```typescript
import { useThemeVariable } from '@zuclubit/ui-kit/adapters/react';

const primaryColor = useThemeVariable('--color-primary');
// Returns current CSS value or undefined
```

#### useSystemPreferences

Hook for system preference detection.

```typescript
import { useSystemPreferences } from '@zuclubit/ui-kit/adapters/react';

const {
  prefersDark,           // boolean
  prefersReducedMotion,  // boolean
  prefersHighContrast,   // boolean
} = useSystemPreferences();
```

### CSS Adapters

#### CssVariablesAdapter

Generate and apply CSS custom properties.

```typescript
import { CssVariablesAdapter } from '@zuclubit/ui-kit/adapters/css';

interface CssAdapterOptions {
  prefix?: string;              // '--brand-'
  targetElement?: HTMLElement;  // default: document.documentElement
  useOklch?: boolean;           // Output OKLCH values
  generateMediaQueries?: boolean;
  darkModeStrategy?: 'class' | 'media' | 'both';
  darkModeClass?: string;       // 'dark'
}

const adapter = new CssVariablesAdapter(options);

// Apply theme
const result = adapter.apply(themeConfig);
// Result<AppliedTokens, Error>

// Generate CSS string
const css = adapter.generateCss(themeConfig);
// string - CSS content

// Clear applied styles
adapter.clear();
```

### Tailwind Adapters

#### TailwindConfigAdapter

Generate Tailwind CSS configuration from tokens.

```typescript
import { TailwindConfigAdapter } from '@zuclubit/ui-kit/adapters/tailwind';

interface TailwindAdapterOptions {
  prefix?: string;          // 'brand-'
  useCssVariables?: boolean;
  outputFormat?: 'js' | 'ts' | 'json' | 'esm' | 'cjs';
  colorFormat?: 'hex' | 'rgb' | 'oklch';
  includeComments?: boolean;
}

const adapter = new TailwindConfigAdapter(options);

// Generate theme config
const result = await adapter.generate(tokenCollection);
// Result<TailwindConfigResult, Error>

// Generate full config file
const fullResult = await adapter.generateFull(tokenCollection, baseConfig);
// Result<{ config: FullTailwindConfig; content: string }, Error>

// Generate only colors
const colors = await adapter.generateColors(tokenCollection);
// Result<TailwindColorConfig, Error>

// Generate plugin
const plugin = await adapter.generatePlugin(tokenCollection);
// Result<string, Error>

// Validate config
const validation = await adapter.validate(config);
// Result<{ valid: boolean; warnings: string[] }, Error>
```

---

## Infrastructure

### Exporters

#### W3CTokenExporter

Export tokens to W3C Design Tokens format.

```typescript
import { W3CTokenExporter } from '@zuclubit/ui-kit/infrastructure';

interface W3CExporterOptions {
  includeType?: boolean;
  includeDescription?: boolean;
  includeExtensions?: boolean;
  extensionNamespace?: string;
  groupByPath?: boolean;
  includeFileMetadata?: boolean;
}

const exporter = new W3CTokenExporter(options);

// Export to W3C JSON
const result = await exporter.export(collection, {
  format: 'w3c',
  namespace: 'brand',
});

// Export to CSS
const cssResult = await exporter.export(collection, {
  format: 'css',
  prefix: '--brand-',
});

// Export to SCSS
const scssResult = await exporter.export(collection, {
  format: 'scss',
});

// Export to TypeScript
const tsResult = await exporter.export(collection, {
  format: 'typescript',
});

// Preview export
const preview = await exporter.preview(collection, options, maxLines);

// Get supported formats
const formats = exporter.getSupportedFormats();
// ['w3c', 'json', 'css', 'scss', 'typescript']
```

### Audit

#### InMemoryAuditAdapter

In-memory audit logging for development.

```typescript
import { InMemoryAuditAdapter } from '@zuclubit/ui-kit/infrastructure';

interface InMemoryAuditOptions {
  maxEntries?: number;       // default: 1000
  consoleLogging?: boolean;  // default: false
  logLevel?: 'debug' | 'info' | 'warn' | 'error';
}

const adapter = new InMemoryAuditAdapter(options);

// Log operations
await adapter.log({ type: 'color-decision', data: {...} });
await adapter.logColorDecision(decision, correlationId);
await adapter.logAccessibilityEvaluation(evaluation, correlationId);
await adapter.logTokenGeneration(generation, correlationId);
await adapter.logValidation(validation, correlationId);
await adapter.logPerformance(metrics, correlationId);

// Query logs
const entries = await adapter.query({
  type: 'color-decision',
  startDate: new Date('2024-01-01'),
  endDate: new Date(),
});

// Generate report
const report = await adapter.generateReport(startDate, endDate);

// Export
const json = await adapter.exportToJson(filter);
const csv = await adapter.exportToCsv(filter);

// Clear
adapter.clear();
```

---

## Types

### Result Type

```typescript
type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

// Helpers
function success<T>(value: T): Result<T, never>
function failure<E>(error: E): Result<never, E>
```

### ThemeConfig

```typescript
interface ThemeConfig {
  id: string;
  name: string;
  mode: 'light' | 'dark' | 'auto';
  colors: {
    primary: PerceptualColor;
    secondary?: PerceptualColor;
    accent?: PerceptualColor;
    background: PerceptualColor;
    surface: PerceptualColor;
    text: PerceptualColor;
    // ... extensible
  };
  tokens?: TokenCollection;
  metadata?: Record<string, unknown>;
}
```

### ComponentIntent

```typescript
interface ComponentIntent {
  type: 'primary' | 'secondary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';
  emphasis?: 'high' | 'medium' | 'low';
  interactive?: boolean;
}
```

### ExportFormat

```typescript
type ExportFormat =
  | 'w3c'        // W3C Design Tokens Community Group
  | 'json'       // Plain JSON
  | 'css'        // CSS Custom Properties
  | 'scss'       // SCSS Variables
  | 'typescript' // TypeScript constants
  | 'tailwind';  // Tailwind config
```

---

## Error Codes

| Code | Description |
|------|-------------|
| `INVALID_COLOR` | Invalid color value or format |
| `OUT_OF_GAMUT` | Color outside displayable range |
| `CONTRAST_FAILURE` | Accessibility contrast not achievable |
| `TOKEN_NOT_FOUND` | Requested token doesn't exist |
| `INVALID_TOKEN_PATH` | Token path format is invalid |
| `EXPORT_FAILED` | Token export operation failed |
| `THEME_INVALID` | Theme configuration is invalid |
| `ADAPTER_ERROR` | Framework adapter error |

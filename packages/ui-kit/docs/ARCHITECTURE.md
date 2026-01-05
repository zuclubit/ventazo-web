# Architecture Documentation

> Hexagonal Architecture implementation for @zuclubit/ui-kit

## Overview

This library implements **Hexagonal Architecture** (also known as Ports & Adapters) to achieve:

- **Separation of Concerns**: Business logic isolated from infrastructure
- **Testability**: Easy to test with mock adapters
- **Flexibility**: Swap implementations without changing core logic
- **Framework Independence**: Core works without React, CSS, or any framework

## Layer Structure

```
packages/ui-kit/
├── domain/                 # Core business logic (innermost)
│   ├── colors/            # Perceptual color implementations
│   ├── tokens/            # Design token entities
│   └── types/             # Shared domain types
├── application/           # Use cases and services
│   ├── use-cases/         # Business operations
│   ├── services/          # Domain service orchestration
│   └── ports/             # Contract definitions
│       ├── inbound/       # Driving ports (API)
│       └── outbound/      # Driven ports (SPI)
├── adapters/              # Framework implementations
│   ├── react/             # React bindings
│   ├── css/               # CSS variables adapter
│   └── tailwind/          # Tailwind config adapter
├── infrastructure/        # External concerns
│   ├── audit/             # Logging & compliance
│   └── exporters/         # Token export formats
└── components/            # Reference implementations
    ├── primitives/        # Basic UI elements
    └── composed/          # Complex components
```

## The Dependency Rule

Dependencies point **inward only**:

```
                    ┌─────────────────┐
                    │   DOMAIN        │ ← No external dependencies
                    │  (Pure Logic)   │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  APPLICATION    │ ← Depends only on Domain
                    │  (Use Cases)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │   ADAPTERS      │ ← Depends on Application
                    │  (Framework)    │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │ INFRASTRUCTURE  │ ← Outermost layer
                    │ (External I/O)  │
                    └─────────────────┘
```

## Domain Layer

The **innermost layer** containing pure business logic with zero external dependencies.

### Value Objects

Immutable objects defined by their attributes:

```typescript
// OklchColor - Perceptual color value object
class OklchColor implements PerceptualColor {
  private constructor(
    readonly lightness: number,  // 0-1
    readonly chroma: number,     // 0-0.4
    readonly hue: number,        // 0-360
    readonly alpha: number       // 0-1
  ) {}

  // Factory method with validation
  static create(params: OklchParams): OklchColor {
    // Validates and clamps values
    return new OklchColor(l, c, h, a);
  }

  // Immutable transformations
  withLightness(l: number): OklchColor {
    return OklchColor.create({ ...this, lightness: l });
  }
}
```

### Entities

Objects with identity that persist over time:

```typescript
// DesignToken - Entity with unique path
interface DesignToken {
  readonly path: string;           // Identity
  readonly value: unknown;         // Token value
  readonly type: TokenType;        // Semantic type
  readonly metadata?: TokenMetadata;
}
```

### Aggregates

Clusters of entities treated as a unit:

```typescript
// TokenCollection - Aggregate root
class TokenCollection {
  private tokens: Map<string, DesignToken>;

  add(token: DesignToken): void;
  get(path: string): DesignToken | undefined;
  getByType(type: TokenType): DesignToken[];
  getAll(): DesignToken[];
}
```

### Domain Services

Stateless operations that don't belong to entities:

```typescript
// Perceptual operations
function deriveContrastingColor(
  base: PerceptualColor,
  options: ContrastOptions
): PerceptualColor;

function interpolateColors(
  from: PerceptualColor,
  to: PerceptualColor,
  steps: number
): PerceptualColor[];
```

## Application Layer

**Orchestrates** use cases using domain objects and defines ports.

### Use Cases

Single-purpose operations implementing business requirements:

```typescript
class DeriveColorPalette implements UseCase<DeriveColorPaletteInput, ColorPalette> {
  // Dependencies injected via constructor
  constructor(
    private readonly contrastService: ContrastService,
    private readonly auditPort: AuditPort
  ) {}

  async execute(input: DeriveColorPaletteInput): Promise<Result<ColorPalette, Error>> {
    // 1. Validate input
    // 2. Perform domain operations
    // 3. Audit the operation
    // 4. Return result
  }
}
```

### Services

Coordinate multiple domain operations:

```typescript
class ColorIntelligenceService {
  constructor(
    private readonly paletteService: PaletteService,
    private readonly contrastService: ContrastService,
    private readonly tokenService: TokenService
  ) {}

  async generateThemeTokens(config: ThemeConfig): Promise<Result<TokenCollection, Error>> {
    // Orchestrates palette generation, contrast validation, and tokenization
  }
}
```

### Ports

**Contracts** that define how the application interacts with the outside world.

#### Inbound Ports (Driving)

Define what the application **can do**:

```typescript
// ThemePort - How external systems request theme operations
interface ThemePort {
  applyTheme(config: ThemeConfig): Promise<Result<AppliedTheme, Error>>;
  getActiveTheme(): ThemeConfig | null;
  subscribeToChanges(callback: ThemeChangeCallback): () => void;
}
```

#### Outbound Ports (Driven)

Define what the application **needs**:

```typescript
// AuditPort - How application logs operations
interface AuditPort {
  log(entry: AuditEntry): Promise<Result<string, Error>>;
  query(filter: AuditFilter): Promise<Result<AuditEntry[], Error>>;
}

// ExporterPort - How application exports tokens
interface ExporterPort {
  export(collection: TokenCollection, options: ExportOptions): Promise<Result<ExportResult, Error>>;
  getSupportedFormats(): ExportFormat[];
}
```

## Adapters Layer

**Implements ports** for specific frameworks/technologies.

### Primary Adapters (Driving)

Translate external input to port operations:

```typescript
// React ThemeProvider - Adapts React to ThemePort
export function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  // Implements ThemePort using React Context
  const applyTheme = async (config: ThemeConfig) => {
    // Convert React-friendly API to port operation
    return themePort.applyTheme(config);
  };

  return (
    <ThemeContext.Provider value={{ applyTheme, ... }}>
      {children}
    </ThemeContext.Provider>
  );
}
```

### Secondary Adapters (Driven)

Implement ports for external systems:

```typescript
// CssVariablesAdapter - Implements theme application via CSS
class CssVariablesAdapter {
  apply(config: ThemeConfig): Result<AppliedTokens, Error> {
    // Convert tokens to CSS custom properties
    const cssVars = this.generateCssVariables(config.tokens);

    // Apply to DOM
    Object.entries(cssVars).forEach(([name, value]) => {
      document.documentElement.style.setProperty(name, value);
    });

    return success(appliedTokens);
  }
}
```

## Infrastructure Layer

**Technical concerns** that support the application.

### Audit Adapter

```typescript
class InMemoryAuditAdapter implements AuditPort {
  private entries: AuditEntry[] = [];

  async log(entry: AuditEntry): Promise<Result<string, Error>> {
    const id = generateId();
    this.entries.push({ ...entry, id, timestamp: new Date() });
    return success(id);
  }

  async query(filter: AuditFilter): Promise<Result<AuditEntry[], Error>> {
    const filtered = this.entries.filter(e => matchesFilter(e, filter));
    return success(filtered);
  }
}
```

### Token Exporter

```typescript
class W3CTokenExporter implements ExporterPort {
  async export(collection: TokenCollection, options: ExportOptions): Promise<Result<ExportResult, Error>> {
    const tokens = collection.getAll();
    const w3cFormat = this.convertToW3C(tokens);

    return success({
      format: 'w3c',
      content: JSON.stringify(w3cFormat, null, 2),
      metadata: { tokenCount: tokens.length, generatedAt: new Date() }
    });
  }
}
```

## Dependency Injection

Dependencies flow through **constructor injection**:

```typescript
// Composition root - Wire everything together
function createColorIntelligenceSystem(config: SystemConfig) {
  // Infrastructure
  const auditAdapter = new InMemoryAuditAdapter(config.audit);
  const exporter = new W3CTokenExporter(config.export);

  // Services
  const paletteService = new PaletteService();
  const contrastService = new ContrastService();
  const tokenService = new TokenService();

  // Application
  const colorIntelligence = new ColorIntelligenceService(
    paletteService,
    contrastService,
    tokenService
  );

  // Use Cases
  const deriveColorPalette = new DeriveColorPalette(contrastService, auditAdapter);
  const validateAccessibility = new ValidateAccessibility(contrastService, auditAdapter);
  const exportTokens = new ExportDesignTokens(exporter, auditAdapter);

  // Adapters
  const cssAdapter = new CssVariablesAdapter(config.css);
  const tailwindAdapter = new TailwindConfigAdapter(config.tailwind);

  return {
    colorIntelligence,
    useCases: { deriveColorPalette, validateAccessibility, exportTokens },
    adapters: { css: cssAdapter, tailwind: tailwindAdapter },
  };
}
```

## Error Handling

All operations return **Result types** for explicit error handling:

```typescript
type Result<T, E> =
  | { success: true; value: T }
  | { success: false; error: E };

// Usage
const result = await deriveColorPalette.execute(input);

if (result.success) {
  console.log('Palette:', result.value);
} else {
  console.error('Error:', result.error.message);
}
```

## Testing Strategy

### Unit Tests (Domain)

Test pure functions and value objects:

```typescript
describe('OklchColor', () => {
  it('should create valid color', () => {
    const color = OklchColor.create({ lightness: 0.5, chroma: 0.1, hue: 220 });
    expect(color.lightness).toBe(0.5);
  });

  it('should clamp invalid values', () => {
    const color = OklchColor.create({ lightness: 1.5, chroma: -0.1, hue: 400 });
    expect(color.lightness).toBe(1);
    expect(color.chroma).toBe(0);
    expect(color.hue).toBe(40);
  });
});
```

### Integration Tests (Application)

Test use cases with mock adapters:

```typescript
describe('DeriveColorPalette', () => {
  it('should generate accessible palette', async () => {
    const mockAudit = new MockAuditAdapter();
    const useCase = new DeriveColorPalette(new ContrastService(), mockAudit);

    const result = await useCase.execute({
      baseColor: OklchColor.fromHex('#3B82F6'),
      steps: [100, 500, 900],
      accessibilityLevel: 'AA',
    });

    expect(result.success).toBe(true);
    expect(result.value[500]).toBeDefined();
    expect(mockAudit.logs).toHaveLength(1);
  });
});
```

### E2E Tests (Adapters)

Test real framework integration:

```typescript
describe('ReactThemeProvider', () => {
  it('should apply theme to document', () => {
    render(
      <ThemeProvider initialTheme={lightTheme}>
        <TestComponent />
      </ThemeProvider>
    );

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--color-primary')).toBe('#3B82F6');
  });
});
```

## Design Decisions

### Why Hexagonal Architecture?

1. **Framework Independence**: Core logic works without React
2. **Testability**: Easy to mock external dependencies
3. **Flexibility**: Add new adapters (Vue, Svelte) without changing core
4. **Maintainability**: Clear boundaries prevent spaghetti code

### Why Perceptual Color Spaces?

1. **Uniform Lightness**: L=50 looks equally bright across hues
2. **Predictable Derivation**: -10% lightness is consistently darker
3. **Wide Gamut**: Support for modern displays (P3, Rec.2020)
4. **Accessibility**: Contrast calculations are more accurate

### Why Result Types?

1. **Explicit Errors**: No hidden exceptions
2. **Type Safety**: Compiler enforces error handling
3. **Composition**: Easy to chain operations
4. **Testing**: Errors are just another return value

## Performance Considerations

### Color Calculations

- OKLCH conversions are optimized with caching
- Batch operations for palette generation
- Lazy evaluation where possible

### Token Application

- CSS variables minimize reflows
- Debounced theme switches
- Incremental updates for partial changes

### Memory

- Token collections use Maps for O(1) lookup
- Audit entries have configurable limits
- Weak references for subscriptions

## Future Roadmap

- [ ] Vue adapter
- [ ] Svelte adapter
- [ ] Figma plugin adapter
- [ ] Style Dictionary integration
- [ ] Real-time collaboration support
- [ ] Visual regression testing adapter

# @zuclubit/ui-kit Documentation

> Design system library powered by Color Intelligence

## Documentation Index

### Getting Started

- [README](../README.md) - Overview, installation, and quick start
- [Architecture](./ARCHITECTURE.md) - Hexagonal architecture deep dive

### Core Concepts

- [Color Intelligence](./COLOR-INTELLIGENCE.md) - Perceptual color system
- [API Reference](./API.md) - Complete API documentation

### Package Structure

```
@zuclubit/ui-kit
├── domain/           # Core business logic
│   ├── colors/       # Perceptual color implementations
│   ├── tokens/       # Design token entities
│   └── types/        # Shared types
├── application/      # Use cases and services
│   ├── use-cases/    # Business operations
│   ├── services/     # Domain services
│   └── ports/        # Interface contracts
├── adapters/         # Framework bindings
│   ├── react/        # React components & hooks
│   ├── css/          # CSS custom properties
│   └── tailwind/     # Tailwind config generator
├── infrastructure/   # External integrations
│   ├── audit/        # Logging & compliance
│   └── exporters/    # Token export formats
└── components/       # Reference implementations
    ├── primitives/   # Basic UI elements
    └── composed/     # Complex components
```

### Import Paths

```typescript
// Domain Layer
import { OklchColor, HctColor } from '@zuclubit/ui-kit/domain';
import { DesignToken, TokenCollection } from '@zuclubit/ui-kit/domain';

// Application Layer
import { DeriveColorPalette, ValidateAccessibility } from '@zuclubit/ui-kit/application';
import { ColorIntelligenceService } from '@zuclubit/ui-kit/application';

// Adapters
import { ThemeProvider, useTheme } from '@zuclubit/ui-kit/adapters/react';
import { CssVariablesAdapter } from '@zuclubit/ui-kit/adapters/css';
import { TailwindConfigAdapter } from '@zuclubit/ui-kit/adapters/tailwind';

// Infrastructure
import { W3CTokenExporter } from '@zuclubit/ui-kit/infrastructure';
import { InMemoryAuditAdapter } from '@zuclubit/ui-kit/infrastructure';

// Components
import { ColorSwatch, TokenDisplay } from '@zuclubit/ui-kit/components';
import { AccessibleButton } from '@zuclubit/ui-kit/components';
```

### Quick Links

| Topic | Description |
|-------|-------------|
| [OKLCH Colors](./COLOR-INTELLIGENCE.md#oklch-color-space) | Perceptually uniform color space |
| [HCT Colors](./COLOR-INTELLIGENCE.md#hct-color-space) | Google's Material Design colors |
| [Accessibility](./COLOR-INTELLIGENCE.md#accessibility) | WCAG and APCA contrast |
| [Palette Generation](./COLOR-INTELLIGENCE.md#palette-generation) | Creating color scales |
| [React Integration](./API.md#react-adapters) | ThemeProvider and hooks |
| [Tailwind Integration](./API.md#tailwind-adapters) | Config generation |
| [Token Export](./API.md#exporters) | W3C DTCG format |

### Design Principles

1. **Perceptual First** - All colors through perceptual science
2. **Accessibility Built-In** - WCAG/APCA compliance automatic
3. **Framework Agnostic** - Core works without any framework
4. **Token-Driven** - Everything expressed as design tokens
5. **Zero Hardcoded Colors** - All colors derived through Color Intelligence

### Browser Support

| Browser | Version |
|---------|---------|
| Chrome  | 111+    |
| Firefox | 113+    |
| Safari  | 16.4+   |
| Edge    | 111+    |

Requires OKLCH support or polyfill for older browsers.

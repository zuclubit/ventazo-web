# Color Intelligence - Decision & Intelligence Layer

## Architecture Overview

The Decision & Intelligence Layer (Phase 3) provides advanced decision-making capabilities for color accessibility and design system integration. It builds upon the domain primitives (Phase 1) and application services (Phase 2) to deliver production-ready, enterprise-grade color intelligence.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        Decision & Intelligence Layer                     │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐ │
│  │ ContrastDecision    │  │   WCAG3Simulator    │  │   Perceptual     │ │
│  │      Engine         │  │                     │  │TokenGenerator    │ │
│  │                     │  │                     │  │                  │ │
│  │ • Multi-factor      │  │ • APCA scoring      │  │ • Brand-based    │ │
│  │   analysis          │  │ • Progressive tiers │  │   generation     │ │
│  │ • Viewing conditions│  │ • Font metrics      │  │ • Tonal palettes │ │
│  │ • Recommendations   │  │ • Polarity aware    │  │ • Role mapping   │ │
│  └─────────────────────┘  └─────────────────────┘  └──────────────────┘ │
│                                                                          │
│  ┌─────────────────────────────────────────────────────────────────────┐ │
│  │                      AI-Readable Contracts                          │ │
│  │                                                                      │ │
│  │  • Structured decisions with reasoning                              │ │
│  │  • Multi-level summaries (brief → technical)                        │ │
│  │  • JSON-LD semantic markup                                          │ │
│  │  • LLM-interpretable format                                         │ │
│  └─────────────────────────────────────────────────────────────────────┘ │
│                                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│                         Design System Adapters                           │
│                                                                          │
│  ┌─────────────────────┐  ┌─────────────────────┐  ┌──────────────────┐ │
│  │  Material Design 3  │  │     Fluent UI       │  │     Custom       │ │
│  │      Adapter        │  │      Adapter        │  │    (Extensible)  │ │
│  │                     │  │                     │  │                  │ │
│  │ • HCT-based tones   │  │ • Semantic slots    │  │ • Base class     │ │
│  │ • 24-step palette   │  │ • Neutral ramps     │  │ • Interface      │ │
│  │ • Surface tinting   │  │ • Shade mapping     │  │ • Contracts      │ │
│  └─────────────────────┘  └─────────────────────┘  └──────────────────┘ │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                        Application Layer (Phase 2)                       │
│                                                                          │
│  AccessibilityAnalyzer  │  ColorHarmonyEngine  │  ThemeGenerator       │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                         Domain Layer (Phase 1)                           │
│                                                                          │
│  OKLCH  │  HCT  │  APCAContrast  │  ColorDifference  │  Gamut          │
└─────────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Contrast Decision Engine

The Contrast Decision Engine provides multi-factor accessibility analysis that goes beyond simple contrast ratios.

#### Key Capabilities

- **Multi-Factor Analysis**: Considers font size, weight, viewing conditions, ambient light, and text polarity
- **Structured Decisions**: Returns typed decisions with confidence scores and reasoning
- **Recommendation Engine**: Suggests improvements to achieve target accessibility levels
- **Viewing Conditions**: Models real-world display environments

#### Factor Model

```typescript
interface ReadabilityContext {
  fontSize: number;          // px
  fontWeight: FontWeight;    // 100-900
  textType: TextType;        // 'body' | 'heading' | 'caption' | 'ui'
  viewingConditions?: ViewingConditions;
}

interface ViewingConditions {
  ambientLight: number;      // lux (0-10000+)
  displayGamma: number;      // typically 2.2
  viewingDistance?: number;  // cm
  displayLuminance?: number; // cd/m²
}
```

#### Decision Output

```typescript
interface ContrastDecision {
  readonly score: APCAScore;              // -108 to +106
  readonly level: AccessibilityLevel;     // 'Fail' | 'AA' | 'AAA'
  readonly confidence: Confidence;        // 0-1
  readonly factors: ReadonlyArray<Factor>;
  readonly reasoning: string;
  readonly recommendation?: Recommendation;
}
```

### 2. WCAG 3.0 Simulator

Implements the draft WCAG 3.0 APCA (Accessible Perceptual Contrast Algorithm) with progressive scoring tiers.

#### Tier System

| Tier     | APCA Threshold | Use Case                    |
|----------|---------------|------------------------------|
| Fail     | < 15          | Not accessible               |
| Bronze   | ≥ 15          | Minimum for large text       |
| Silver   | ≥ 45          | Body text minimum            |
| Gold     | ≥ 60          | Recommended for body         |
| Platinum | ≥ 75          | Optimal readability          |

#### Font Size Adjustments

The simulator adjusts thresholds based on font size following APCA guidelines:

```
Font Size (px)  |  Threshold Adjustment
----------------|----------------------
< 14            |  +15 (stricter)
14-17           |  +10
18-23           |  +5
24-35           |  0 (baseline)
36-47           |  -5
≥ 48            |  -10 (more lenient)
```

### 3. Perceptual Token Generator

Generates design tokens from brand colors using perceptually uniform color spaces.

#### Token Roles

```typescript
type TokenRole =
  | 'primary'
  | 'secondary'
  | 'tertiary'
  | 'error'
  | 'warning'
  | 'success'
  | 'info'
  | 'surface'
  | 'background'
  | 'outline';
```

#### Generation Pipeline

1. **Parse Input**: Convert hex to OKLCH
2. **Derive Hue Family**: Extract hue angle
3. **Generate Tonal Palette**: Create lightness variations
4. **Map to Roles**: Assign semantic roles
5. **Validate Accessibility**: Ensure contrast requirements
6. **Export Tokens**: Output in requested format

### 4. Design System Adapters

Hexagonal architecture adapters for major design systems.

#### Material Design 3 Adapter

Implements Google's Material You color system:

- **24-Step Tonal Palette**: [0, 4, 6, 10, 12, 17, 20, 22, 24, 30, 40, 50, 60, 70, 80, 87, 90, 92, 94, 95, 96, 98, 99, 100]
- **HCT Color Space**: Hue, Chroma, Tone for perceptual uniformity
- **Surface Tinting**: Elevation-based surface colors
- **Dynamic Color**: Source color → Full theme

#### Fluent UI Adapter

Implements Microsoft's Fluent Design System:

- **Semantic Slots**: Button, input, menu, list colors
- **Neutral Ramps**: 14-step neutral palette
- **Shade Mapping**: Primary → shade50 through shade160
- **High Contrast**: Accessibility mode support

### 5. AI-Readable Contracts

Structured contracts for LLM interpretation and automated accessibility auditing.

#### Contract Structure

```typescript
interface AIReadableContract {
  readonly verdict: 'PASS' | 'FAIL' | 'CONDITIONAL';
  readonly confidence: number;
  readonly wcagLevel: 'A' | 'AA' | 'AAA';
  readonly contrastRatio: number;
  readonly apcaScore: number;
  readonly reasoning: string;
  readonly actionItems: ReadonlyArray<string>;
}
```

#### Extended Contracts

For deep analysis, extended contracts provide:

- **Color Context**: Foreground/background analysis with polarity
- **Factor Analysis**: Weighted contribution of each factor
- **Recommendations**: Prioritized action items with expected impact
- **Compliance Matrix**: WCAG 2.1, WCAG 3.0 draft, APCA status
- **Multi-Level Summaries**: Brief (1 sentence) to technical (full analysis)
- **JSON-LD**: Semantic web markup for machine consumption

## Decision Model

### Factor Weighting

The decision engine uses empirically-derived weights:

| Factor           | Weight | Rationale                              |
|------------------|--------|----------------------------------------|
| APCA Contrast    | 0.40   | Primary perceptual measure             |
| Font Size        | 0.20   | Larger text more readable              |
| Font Weight      | 0.15   | Bolder text more visible               |
| Text Polarity    | 0.10   | Dark-on-light vs light-on-dark         |
| Ambient Light    | 0.10   | Environmental viewing conditions       |
| Display Gamma    | 0.05   | Display calibration                    |

### Confidence Calculation

Confidence is derived from:

1. **Factor Coverage**: How many factors were provided
2. **Value Certainty**: Distance from thresholds
3. **Consistency**: Agreement between WCAG 2.1 and APCA
4. **Calibration**: Historical accuracy on test sets

```typescript
confidence =
  factorCoverage * 0.3 +
  thresholdDistance * 0.3 +
  methodAgreement * 0.25 +
  calibration * 0.15;
```

## Evolution and Roadmap

### Phase 3.1 - Current

- ✅ Contrast Decision Engine
- ✅ WCAG 3.0 Simulator
- ✅ Perceptual Token Generator
- ✅ Material Design 3 Adapter
- ✅ Fluent UI Adapter
- ✅ AI-Readable Contracts
- ✅ Property-based tests
- ✅ Performance benchmarks

### Phase 3.2 - Planned

- [ ] Carbon Design Adapter (IBM)
- [ ] Ant Design Adapter
- [ ] Real-time contrast monitoring
- [ ] Browser extension integration
- [ ] Figma plugin support

### Phase 4 - Future

- [ ] Machine learning-based preference modeling
- [ ] Colorblind simulation with CAM16
- [ ] Automated remediation suggestions
- [ ] Design system migration tools
- [ ] A/B testing integration

## Performance Characteristics

Based on benchmark testing:

| Operation                  | Ops/sec  | P99 Latency |
|---------------------------|----------|-------------|
| Contrast evaluation       | 5,000+   | < 2ms       |
| APCA calculation          | 10,000+  | < 1ms       |
| Tier determination        | 5,000+   | < 2ms       |
| Tonal palette generation  | 1,000+   | < 5ms       |
| Full theme generation     | 100+     | < 30ms      |
| Contract generation       | 1,000+   | < 3ms       |

## Testing Strategy

### Property-Based Testing

Using fast-check for invariant verification:

1. **Contrast Invariants**: APCA scores in valid range
2. **Level Consistency**: AA implies not AAA violation
3. **Tier Ordering**: Fail < Bronze < Silver < Gold < Platinum
4. **Roundtrip**: Serialize → Deserialize = Identity

### Benchmark Testing

Performance regression prevention:

1. **Throughput**: Minimum ops/sec per operation
2. **Latency**: P50, P95, P99 thresholds
3. **Memory**: No leaks under sustained load

## Integration Guide

### Basic Usage

```typescript
import { ContrastDecisionEngine } from '@/lib/color-intelligence';

const engine = new ContrastDecisionEngine();

const decision = engine.evaluate('#1E293B', '#FFFFFF', {
  fontSize: 16,
  fontWeight: 400,
  textType: 'body',
});

console.log(decision.level);    // 'AAA'
console.log(decision.reasoning); // Detailed explanation
```

### Theme Generation

```typescript
import { MaterialDesign3Adapter } from '@/lib/color-intelligence';

const adapter = new MaterialDesign3Adapter();

const theme = adapter.generateTokens({
  sourceColor: '#3B82F6',
  scheme: 'light',
});

// Export to CSS
const css = adapter.toCssVariables(theme.tokens);
```

### AI Contracts

```typescript
import {
  ContrastDecisionEngine,
  AIReadableContractsService
} from '@/lib/color-intelligence';

const engine = new ContrastDecisionEngine();
const contracts = new AIReadableContractsService();

const decision = engine.evaluate('#333', '#FFF');
const contract = contracts.generateExtendedContract(decision, {
  foreground: '#333',
  background: '#FFF',
  fontSize: 16,
  fontWeight: 400,
});

// For LLM consumption
console.log(contract.summaries.technical);
console.log(JSON.stringify(contract.jsonLd, null, 2));
```

## Architecture Principles

### 1. No Hardcoded Thresholds

All thresholds are configurable and derived from standards:

```typescript
// ✅ Good: Configurable
const engine = new ContrastDecisionEngine({
  thresholds: {
    aa: 45,
    aaa: 60,
  },
});

// ❌ Bad: Hardcoded
if (score > 45) { /* ... */ }
```

### 2. Hexagonal Architecture

Adapters isolate design system specifics:

```
        ┌─────────────────┐
        │   Application   │
        │     (Ports)     │
        └────────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
    ▼            ▼            ▼
┌───────┐   ┌───────┐   ┌───────┐
│  MD3  │   │Fluent │   │Custom │
│Adapter│   │Adapter│   │Adapter│
└───────┘   └───────┘   └───────┘
```

### 3. Branded Types

Type safety through nominal typing:

```typescript
// Can't accidentally pass a ratio where APCA expected
type APCAScore = number & { readonly brand: 'APCA' };
type ContrastRatio = number & { readonly brand: 'Ratio' };
```

### 4. Immutable Data

All outputs are readonly:

```typescript
interface ContrastDecision {
  readonly score: APCAScore;
  readonly factors: ReadonlyArray<Factor>;
  // ...
}
```

## Appendix: Color Science References

- **APCA**: [Myndex APCA W3](https://github.com/Myndex/SAPC-APCA)
- **HCT**: [Material Color Utilities](https://github.com/material-foundation/material-color-utilities)
- **OKLCH**: [Björn Ottosson](https://bottosson.github.io/posts/oklab/)
- **CAM16**: [CIE 159:2004](https://cie.co.at/publications/chromatic-adaptation-under-mixed-illumination-conditions)
- **WCAG 2.1**: [W3C Recommendation](https://www.w3.org/TR/WCAG21/)
- **WCAG 3.0 Draft**: [W3C Working Draft](https://www.w3.org/TR/wcag-3.0/)

# Benchmark Methodology Specification

**Version:** 1.0.0
**Date:** 2026-01-04
**Status:** Formal Specification
**Compliance:** Designed for external audit

---

## 1. Introduction

This document specifies the formal methodology for benchmarking Color Intelligence v5.0 against comparable color libraries. The methodology is designed to be:

1. **Reproducible**: Any party can replicate results
2. **Fair**: Equivalent operations compared across tools
3. **Comprehensive**: Covers accuracy, accessibility, performance, and DX
4. **Transparent**: Raw data published alongside analysis

---

## 2. Benchmark Dimensions

### 2.1 Dimension 1: Scientific Accuracy

Measures the correctness of color space conversions and calculations against known reference values.

#### 2.1.1 sRGB ↔ OKLCH Conversion Accuracy

**Reference**: Björn Ottosson's original OKLCH specification (2020)

**Test Protocol**:
1. Use a fixed set of 100 test colors spanning the sRGB gamut
2. Convert sRGB → OKLCH → sRGB (round-trip)
3. Measure maximum and mean Delta E (CIEDE2000) between original and result
4. Tolerance: ΔE < 0.01 for perceptual equivalence

**Golden Set Source**:
- sRGB primaries and secondaries
- Web-safe colors subset
- Grayscale ramp (0, 25, 50, 75, 100% luminance)
- Edge cases (near-black, near-white, high chroma)

#### 2.1.2 HCT/CAM16 Fidelity

**Reference**: CIE 248:2022 (CAM16 specification)

**Test Protocol**:
1. Use CIE CAM16 reference test vectors
2. Compare J (lightness), C (chroma), h (hue) values
3. Tolerance: J ±0.1, C ±0.5, h ±0.5°

**Golden Set Source**:
- CIE 248:2022 Annex examples
- Material Design 3 reference palettes

#### 2.1.3 APCA Lc Accuracy

**Reference**: Myndex SAPC-APCA official test vectors

**Test Protocol**:
1. Use official apca-w3 test cases
2. Calculate Lc for each color pair
3. Tolerance: ±0.5 Lc for general cases, ±1.0 Lc for edge cases

**Golden Set**:
```javascript
// From Myndex SAPC-APCA
const APCA_TEST_VECTORS = [
  { fg: '#000000', bg: '#FFFFFF', expected: 106.04 },
  { fg: '#FFFFFF', bg: '#000000', expected: -107.89 },
  { fg: '#888888', bg: '#FFFFFF', expected: 63.06 },
  { fg: '#888888', bg: '#000000', expected: -68.54 },
  { fg: '#FFFF00', bg: '#000000', expected: -91.67 },  // Yellow edge case
  { fg: '#0000FF', bg: '#FFFFFF', expected: 54.62 },
  { fg: '#112233', bg: '#DDEEFF', expected: 91.34 },
  { fg: '#223344', bg: '#112233', expected: -6.77 },   // Dark-on-dark
];
```

#### 2.1.4 Round-Trip Integrity

**Test Protocol**:
1. For each color space pair (sRGB ↔ OKLCH, sRGB ↔ HCT, etc.)
2. Perform A → B → A conversion
3. Measure maximum component deviation
4. Tolerance: < 1/255 for 8-bit sRGB, < 0.001 for normalized values

---

### 2.2 Dimension 2: Accessibility Compliance

Measures the correctness and comprehensiveness of accessibility calculations.

#### 2.2.1 WCAG 2.1 Ratio Calculation

**Reference**: W3C WCAG 2.1 Recommendation

**Test Protocol**:
1. Calculate contrast ratios for 50 color pairs
2. Compare against reference implementation (baseline: axe-core formula)
3. Tolerance: ±0.01 ratio units

**Test Cases**:
- AA Normal text threshold (4.5:1)
- AA Large text threshold (3:1)
- AAA Normal text threshold (7:1)
- Edge cases (1.0:1 exact, 21:1 exact)

#### 2.2.2 APCA Implementation Conformance

**Reference**: SAPC-4g / APCA-W3 0.1.9

**Test Protocol**:
1. Verify blkThrs (0.022) soft clamp threshold
2. Verify blkClmp (1.414) exponent
3. Verify sRGB coefficients (0.2126729, 0.7151522, 0.0721750)
4. Verify TRC (2.4 piecewise gamma)
5. Test polarity detection (dark-on-light vs light-on-dark)

**Conformance Criteria**:
- All constants match SAPC-4g specification
- Output matches reference implementation within tolerance

#### 2.2.3 Edge Case Handling

**Test Cases**:
1. **Yellow text**: #FFFF00 on various backgrounds (known WCAG weakness)
2. **Dark-on-dark**: Low contrast dark color pairs
3. **Near-threshold**: Colors at exactly 4.5:1 ratio
4. **Identical colors**: Same foreground/background
5. **Maximum contrast**: Pure black on pure white

#### 2.2.4 Progressive vs Binary Scoring

**Evaluation Criteria**:
- Does the library provide pass/fail only?
- Does it provide Lc/ratio values for progressive assessment?
- Does it suggest minimum font sizes for given contrast?
- Does it provide confidence intervals or uncertainty?

---

### 2.3 Dimension 3: Performance

Measures throughput, latency, and scalability.

#### 2.3.1 Throughput (ops/sec)

**Test Protocol**:
1. Warm-up phase: 1000 iterations (discarded)
2. Measurement phase: 10,000 iterations
3. Calculate operations per second
4. Report: mean, median, std deviation

**Operations Tested**:
- Single color conversion (sRGB → OKLCH)
- Contrast calculation (single pair)
- Palette generation (5 colors)
- Full accessibility validation (pair with all metrics)

#### 2.3.2 Latency Percentiles

**Test Protocol**:
1. Collect timing for 10,000 individual operations
2. Calculate P50, P95, P99, P99.9
3. Report in milliseconds

**Significance**: P99 latency affects perceived responsiveness in UI applications.

#### 2.3.3 Memory Allocation

**Test Protocol**:
1. Measure heap size before batch operation
2. Execute 1000 operations
3. Force GC, measure heap after
4. Calculate per-operation allocation

**Note**: JavaScript memory measurement has limitations. Use process.memoryUsage() in Node.js.

#### 2.3.4 Scalability

**Test Protocol**:
1. Test with n = 10, 100, 1000, 10000 colors
2. For O(n) operations: palette generation
3. For O(n²) operations: all-pairs contrast validation
4. Verify linear/quadratic scaling

---

### 2.4 Dimension 4: Decision Capabilities

Measures the library's ability to make or assist with accessibility decisions.

#### 2.4.1 Multi-Variable Contrast Decisions

**Evaluation Criteria**:
- Does it consider font size?
- Does it consider font weight?
- Does it consider text vs non-text use?
- Does it consider ambient lighting conditions?

**Scoring**:
- 0 points: Binary pass/fail only
- 1 point: Provides metric values
- 2 points: Considers font size
- 3 points: Considers font weight
- 4 points: Full context-aware decision

#### 2.4.2 Auto-Fix / Suggestion Generation

**Evaluation Criteria**:
- Can suggest accessible alternatives?
- Preserves color intent (hue)?
- Provides multiple options?
- Explains trade-offs?

**Test Cases**:
1. Given: #666666 on #999999 (fails AA)
2. Expected: Suggest darker/lighter alternatives
3. Bonus: Suggest minimum adjustment

#### 2.4.3 Explanation Quality

**Evaluation Criteria**:
- Human-readable explanations?
- Machine-readable structured output?
- Actionable recommendations?
- Severity/priority indication?

---

### 2.5 Dimension 5: Architecture & Developer Experience

Measures code quality, API design, and integration ease.

#### 2.5.1 API Ergonomics

**Evaluation Rubric**:
- Method chaining support
- Consistent naming conventions
- Predictable return types
- Error handling clarity

**Example Comparison**:
```javascript
// Operation: Convert hex to OKLCH and adjust lightness

// Style A (functional)
adjustLightness(hexToOklch('#3B82F6'), 0.1)

// Style B (OOP/chaining)
Color.from('#3B82F6').toOklch().lighten(0.1)

// Style C (builder)
new ColorBuilder('#3B82F6').oklch().lighten(0.1).build()
```

#### 2.5.2 Type Safety

**Evaluation Criteria**:
- Full TypeScript definitions?
- Generic type parameters?
- Branded types for color spaces?
- Compile-time validation?

#### 2.5.3 Tree-Shaking Support

**Test Protocol**:
1. Import single function
2. Build with webpack/rollup (production mode)
3. Measure final bundle size
4. Compare against full library size

**Scoring**:
- Excellent: < 20% of full bundle for single import
- Good: 20-50% of full bundle
- Poor: > 50% of full bundle

#### 2.5.4 Bundle Size

**Test Protocol**:
1. Install package
2. Measure minified size
3. Measure minified + gzipped size
4. Report both

---

## 3. Test Environment Specification

### 3.1 Hardware Baseline

All performance benchmarks run on standardized configuration:

```
Node.js: 20.x LTS
RAM: 8GB minimum (16GB recommended)
CPU: Single-threaded execution (no parallelization)
OS: macOS 14+ / Ubuntu 22.04+ / Windows 11+
```

### 3.2 Execution Environment

```javascript
// Disable JIT optimizations for fair comparison
// (or ensure all libraries benefit equally)

// Warm-up
for (let i = 0; i < 1000; i++) operation();

// Measurement
const start = performance.now();
for (let i = 0; i < iterations; i++) operation();
const elapsed = performance.now() - start;
```

### 3.3 Isolation

- Each library tested in separate process
- No shared state between tests
- Clean require/import for each run

---

## 4. Golden Sets Specification

### 4.1 APCA Contrast Golden Set

```typescript
export const APCA_GOLDEN_SET = {
  version: '1.0.0',
  source: 'Myndex SAPC-APCA',
  testCases: [
    {
      name: 'Black on White',
      foreground: { r: 0, g: 0, b: 0 },
      background: { r: 255, g: 255, b: 255 },
      expected: { lc: 106.04, tolerance: 0.5 },
    },
    {
      name: 'White on Black',
      foreground: { r: 255, g: 255, b: 255 },
      background: { r: 0, g: 0, b: 0 },
      expected: { lc: -107.89, tolerance: 0.5 },
    },
    {
      name: 'Mid Gray on White',
      foreground: { r: 136, g: 136, b: 136 },
      background: { r: 255, g: 255, b: 255 },
      expected: { lc: 63.06, tolerance: 0.5 },
    },
    {
      name: 'Yellow on Black (edge case)',
      foreground: { r: 255, g: 255, b: 0 },
      background: { r: 0, g: 0, b: 0 },
      expected: { lc: -91.67, tolerance: 1.0 },
    },
    {
      name: 'Dark on Dark (low contrast)',
      foreground: { r: 34, g: 51, b: 68 },
      background: { r: 17, g: 34, b: 51 },
      expected: { lc: -6.77, tolerance: 1.0 },
    },
  ],
};
```

### 4.2 OKLCH Conversion Golden Set

```typescript
export const OKLCH_GOLDEN_SET = {
  version: '1.0.0',
  source: 'Björn Ottosson reference',
  testCases: [
    {
      name: 'Pure Red',
      srgb: { r: 255, g: 0, b: 0 },
      oklch: { l: 0.6279, c: 0.2577, h: 29.23 },
      tolerance: { l: 0.001, c: 0.001, h: 0.1 },
    },
    {
      name: 'Pure Green',
      srgb: { r: 0, g: 255, b: 0 },
      oklch: { l: 0.8664, c: 0.2948, h: 142.50 },
      tolerance: { l: 0.001, c: 0.001, h: 0.1 },
    },
    {
      name: 'Pure Blue',
      srgb: { r: 0, g: 0, b: 255 },
      oklch: { l: 0.4520, c: 0.3132, h: 264.05 },
      tolerance: { l: 0.001, c: 0.001, h: 0.1 },
    },
    {
      name: 'White',
      srgb: { r: 255, g: 255, b: 255 },
      oklch: { l: 1.0, c: 0.0, h: 0 }, // hue undefined for achromatic
      tolerance: { l: 0.001, c: 0.001, h: 360 }, // any hue acceptable
    },
    {
      name: 'Black',
      srgb: { r: 0, g: 0, b: 0 },
      oklch: { l: 0.0, c: 0.0, h: 0 },
      tolerance: { l: 0.001, c: 0.001, h: 360 },
    },
  ],
};
```

### 4.3 HCT Conversion Golden Set

```typescript
export const HCT_GOLDEN_SET = {
  version: '1.0.0',
  source: 'Material Design 3 reference',
  testCases: [
    {
      name: 'Material Blue Primary',
      hex: '#1976D2',
      hct: { h: 252, c: 55, t: 45 },
      tolerance: { h: 1, c: 2, t: 1 },
    },
    {
      name: 'Material Red Error',
      hex: '#D32F2F',
      hct: { h: 27, c: 80, t: 40 },
      tolerance: { h: 1, c: 2, t: 1 },
    },
    {
      name: 'Tone 0 (Black)',
      hex: '#000000',
      hct: { h: 0, c: 0, t: 0 },
      tolerance: { h: 360, c: 1, t: 0.5 },
    },
    {
      name: 'Tone 100 (White)',
      hex: '#FFFFFF',
      hct: { h: 0, c: 0, t: 100 },
      tolerance: { h: 360, c: 1, t: 0.5 },
    },
  ],
};
```

---

## 5. Reporting Format

### 5.1 Raw Results Structure

```typescript
interface BenchmarkResult {
  library: string;
  version: string;
  dimension: 'accuracy' | 'accessibility' | 'performance' | 'decision' | 'dx';
  testName: string;
  timestamp: string;
  environment: {
    node: string;
    os: string;
    arch: string;
  };
  result: {
    passed: boolean;
    value: number | string | object;
    expected: number | string | object;
    deviation?: number;
    unit?: string;
  };
  metadata?: Record<string, unknown>;
}
```

### 5.2 Summary Report Structure

```typescript
interface BenchmarkSummary {
  generatedAt: string;
  libraries: string[];
  dimensions: {
    accuracy: DimensionScore;
    accessibility: DimensionScore;
    performance: DimensionScore;
    decision: DimensionScore;
    dx: DimensionScore;
  };
  overallRanking: LibraryRanking[];
  rawDataPath: string;
}

interface DimensionScore {
  tests: number;
  passed: number;
  failed: number;
  score: number; // 0-100
  ranking: LibraryRanking[];
}

interface LibraryRanking {
  library: string;
  score: number;
  rank: number;
}
```

---

## 6. Fairness Principles

### 6.1 Equivalent Operations

When comparing libraries, operations must be semantically equivalent:

```javascript
// CORRECT: Equivalent operations
// Color Intelligence
APCAContrast.calculate('#000000', '#FFFFFF').lc

// apca-w3
APCAcontrast(sRGBtoY([0,0,0]), sRGBtoY([255,255,255]))

// INCORRECT: Non-equivalent
// Color Intelligence with extra features
APCAContrast.calculateWithGuidance('#000000', '#FFFFFF')
```

### 6.2 Feature Availability

If a library doesn't support a feature:
- Mark as "N/A" (not applicable)
- Do not penalize in scoring for missing features
- Note the gap in the report

### 6.3 Version Pinning

All libraries tested at specific versions:
- Lock versions in package.json
- Document exact versions in results
- Re-run if versions update significantly

---

## 7. Statistical Rigor

### 7.1 Performance Measurements

- Minimum 10,000 iterations for timing
- Report standard deviation
- Identify and note outliers (> 3σ)
- Use high-resolution timer (performance.now())

### 7.2 Accuracy Measurements

- Use exact tolerance bounds (not approximations)
- Report deviation from expected value
- Distinguish between rounding errors and algorithm errors

### 7.3 Confidence Reporting

For all claims:
- State confidence level (definite, likely, uncertain)
- Provide evidence or reference
- Mark hypotheses clearly

---

## 8. Appendix: Test Data Files

### 8.1 Required Data Files

```
benchmark/
├── data/
│   ├── golden-sets/
│   │   ├── apca-vectors.json
│   │   ├── oklch-vectors.json
│   │   ├── hct-vectors.json
│   │   └── wcag-vectors.json
│   ├── palettes/
│   │   ├── material-design.json
│   │   ├── tailwind-colors.json
│   │   └── web-safe.json
│   └── edge-cases/
│       ├── low-contrast.json
│       ├── high-chroma.json
│       └── near-threshold.json
├── results/
│   └── (generated)
└── reports/
    └── (generated)
```

---

## 9. Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-04 | Initial methodology specification |

---

**Document ID:** CI-METHODOLOGY-2026-01-04-001
**Author:** Claude Opus 4.5
**Status:** APPROVED FOR EXECUTION

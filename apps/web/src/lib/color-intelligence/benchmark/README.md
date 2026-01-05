# Color Intelligence v5.0 - Public Benchmark Suite

**Version:** 1.0.0
**Date:** 2026-01-04
**Status:** Benchmark Complete - APCA Accuracy Under Investigation

---

## Quick Results Summary

| Dimension | Verdict | Details |
|-----------|---------|---------|
| **Performance** | EXCELLENT | 1.4M+ ops/sec |
| **OKLCH Accuracy** | PASS | 100% round-trip, 66.7% golden vectors |
| **APCA Accuracy** | NEEDS FIX | 33.3% pass rate, max deviation 31 Lc |
| **Architecture** | EXCELLENT | DDD, TypeScript, immutable |

**Recommendation:** Use for design tokens and color manipulation. Cross-validate accessibility decisions with `apca-w3` until APCA accuracy is resolved.

---

## Overview

This benchmark suite provides a rigorous, reproducible comparison of Color Intelligence v5.0 against leading open-source color libraries. All tests are designed to withstand external technical audit.

## Systems Compared

| Library | Version | Language | Primary Focus |
|---------|---------|----------|---------------|
| Color Intelligence | 5.0.0 | TypeScript | Full perceptual color system |
| @material/material-color-utilities | 0.3.0 | TypeScript | HCT/Material Design 3 |
| culori | 4.0.2 | JavaScript | CSS Color 4 manipulation |
| colorjs.io | 0.5.2+ | JavaScript | Color science reference |
| @adobe/leonardo-contrast-colors | 1.0.0 | JavaScript | Contrast-based generation |
| @texel/color | 0.1.x | JavaScript | High-performance OKLCH |
| apca-w3 | 0.1.9 | JavaScript | APCA reference implementation |

## Benchmark Dimensions

### 1. Scientific Accuracy
- sRGB → OKLCH conversion precision
- HCT/CAM16 fidelity against reference
- APCA Lc accuracy against golden set
- Round-trip conversion integrity

### 2. Accessibility Compliance
- WCAG 2.1 ratio calculation
- WCAG 3.0/APCA implementation
- Edge case handling (yellows, dark-on-dark)
- Progressive vs binary scoring

### 3. Performance
- Throughput (ops/sec)
- Latency percentiles (P50, P95, P99)
- Memory allocation patterns
- Scalability (n colors, n² validations)

### 4. Decision Capabilities
- Multi-variable contrast decisions
- Font size/weight consideration
- Auto-fix/suggestion generation
- Explanation quality

### 5. Architecture & DX
- API ergonomics
- Type safety
- Tree-shaking support
- Bundle size

## Running Benchmarks

```bash
# Install dependencies
npm install

# Run full benchmark suite
npm run benchmark

# Run specific category
npm run benchmark:accuracy
npm run benchmark:performance
npm run benchmark:accessibility

# Generate report
npm run benchmark:report
```

## Methodology

All benchmarks follow these principles:

1. **Reproducibility**: Fixed random seeds, controlled environments
2. **Statistical Rigor**: Multiple iterations, percentile reporting
3. **Fair Comparison**: Equivalent operations, same input data
4. **Transparency**: Raw results published alongside analysis

## Hardware Specification

Tests are run on standardized hardware:
- Node.js 20.x LTS
- 8GB RAM minimum
- Single-threaded execution
- No external network dependencies

## Golden Sets

Reference values are derived from:
- APCA: Myndex/SAPC-APCA official test vectors
- OKLCH: Björn Ottosson reference implementation
- CAM16: CIE 248:2022 specification
- WCAG 2.1: W3C official algorithm

## Benchmark Results (2026-01-04)

### Performance Benchmarks

```
┌────────────────────────────────────┬──────────┬──────────┬──────────┐
│ Operation                          │ Ops/sec  │ Avg (ms) │ P99 (ms) │
├────────────────────────────────────┼──────────┼──────────┼──────────┤
│ sRGB → OKLCH Conversion            │ 1,406,280│   0.0007 │   0.0005 │
│ OKLCH → sRGB Conversion            │ 1,612,903│   0.0006 │   0.0004 │
│ sRGB → HCT Conversion              │   328,947│   0.0030 │   0.0021 │
│ APCA Contrast Calculation          │ 1,487,606│   0.0007 │   0.0005 │
│ OKLCH Interpolation                │ 7,358,579│   0.0001 │   0.0002 │
│ Cache Hit (OKLCH)                  │ 3,698,110│   0.0003 │   0.0003 │
│ Full Accessibility Validation      │   186,219│   0.0054 │   0.0038 │
│ Tonal Palette Generation           │    26,455│   0.0378 │   0.0268 │
└────────────────────────────────────┴──────────┴──────────┴──────────┘
```

### Accuracy Results

**OKLCH:**
- Round-trip integrity: 100% (15/15 tests)
- Golden vector accuracy: 66.7% (10/15 tests)
- Edge case failures in high-chroma blues (gamut boundary)

**APCA:**
- Pass rate: 33.3% (4/12 tests)
- Maximum deviation: 31.2 Lc (Blue on White)
- **Status: Under Investigation**

## File Structure

```
benchmark/
├── README.md                 # This file
├── METHODOLOGY.md            # Formal benchmark methodology
├── TOOL_LANDSCAPE.md         # Comparative tool analysis
├── CRITICAL_ANALYSIS.md      # Honest wins/losses analysis
├── WHITEPAPER.md             # Technical whitepaper
├── data/
│   └── golden-sets/
│       ├── apca-vectors.ts   # APCA golden test vectors
│       └── oklch-vectors.ts  # OKLCH golden test vectors
├── suites/
│   ├── accuracy.benchmark.ts # Accuracy test suite
│   └── performance.benchmark.ts # Performance test suite
└── index.ts                  # Main benchmark runner
```

## Key Documents

| Document | Purpose |
|----------|---------|
| [METHODOLOGY.md](./METHODOLOGY.md) | Formal benchmark methodology specification |
| [TOOL_LANDSCAPE.md](./TOOL_LANDSCAPE.md) | Comparative analysis of color libraries |
| [CRITICAL_ANALYSIS.md](./CRITICAL_ANALYSIS.md) | Honest assessment of wins, ties, and losses |
| [WHITEPAPER.md](./WHITEPAPER.md) | Academic-style technical whitepaper |

## License

MIT License - See LICENSE file for details.

## References

1. APCA-W3: https://github.com/Myndex/apca-w3
2. Oklab: https://bottosson.github.io/posts/oklab/
3. CAM16: CIE 248:2022
4. CSS Color 4: https://www.w3.org/TR/css-color-4/
5. Material Design 3: https://m3.material.io/

---

## Audit Trail

| Date | Event |
|------|-------|
| 2026-01-04 | Initial benchmark suite created |
| 2026-01-04 | APCA accuracy issues identified (33.3% pass rate) |
| 2026-01-04 | Whitepaper and critical analysis published |

**Prepared for external technical audit.**

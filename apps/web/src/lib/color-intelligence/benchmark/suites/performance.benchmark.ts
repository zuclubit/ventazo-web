/**
 * Performance Benchmark Suite
 *
 * Measures throughput, latency, and scalability of color operations.
 *
 * Methodology:
 * - Warm-up phase: 1000 iterations (discarded)
 * - Measurement phase: 10,000+ iterations
 * - Statistical reporting: mean, P50, P95, P99
 */

// Import Color Intelligence modules
import OKLCH from '../../domain/value-objects/OKLCH';
import HCT from '../../domain/value-objects/HCT';
import APCAContrast from '../../domain/value-objects/APCAContrast';
import { detectContrastMode } from '../../application/DetectContrastMode';
import { validateColorPair } from '../../application/ValidateAccessibility';
import { getColorCache, resetColorCache } from '../../infrastructure/cache/ColorCache';

// ============================================
// Types
// ============================================

export interface PerformanceTestResult {
  readonly testName: string;
  readonly operation: string;
  readonly iterations: number;
  readonly warmupIterations: number;
  readonly totalMs: number;
  readonly avgMs: number;
  readonly opsPerSecond: number;
  readonly percentiles: {
    readonly p50: number;
    readonly p95: number;
    readonly p99: number;
    readonly p999: number;
  };
  readonly memoryDelta?: number;
}

export interface PerformanceSuiteResult {
  readonly suiteName: string;
  readonly timestamp: string;
  readonly environment: {
    readonly nodeVersion: string;
    readonly platform: string;
    readonly arch: string;
  };
  readonly results: readonly PerformanceTestResult[];
  readonly summary: {
    readonly totalOperations: number;
    readonly totalTimeMs: number;
    readonly aggregateOpsPerSec: number;
  };
}

// ============================================
// Test Data Generation
// ============================================

const TEST_COLORS = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
  '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#3B82F6',
  '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899',
  '#1E3A8A', '#7C3AED', '#059669', '#DC2626', '#2563EB',
  '#111827', '#F3F4F6', '#1F2937', '#374151', '#4B5563',
];

const COLOR_PAIRS = TEST_COLORS.flatMap((fg, i) =>
  TEST_COLORS.slice(i + 1).map(bg => [fg, bg] as const)
);

// ============================================
// Benchmark Utilities
// ============================================

function runBenchmark(
  name: string,
  operation: () => void,
  options: {
    warmup?: number;
    iterations?: number;
    collectTimings?: boolean;
  } = {}
): PerformanceTestResult {
  const { warmup = 1000, iterations = 10000, collectTimings = true } = options;

  // Warm-up phase
  for (let i = 0; i < warmup; i++) {
    operation();
  }

  // Collect individual timings for percentile calculation
  const timings: number[] = collectTimings ? new Array(iterations) : [];

  const start = performance.now();

  if (collectTimings) {
    for (let i = 0; i < iterations; i++) {
      const opStart = performance.now();
      operation();
      timings[i] = performance.now() - opStart;
    }
  } else {
    for (let i = 0; i < iterations; i++) {
      operation();
    }
  }

  const totalMs = performance.now() - start;

  // Calculate percentiles
  let percentiles = { p50: 0, p95: 0, p99: 0, p999: 0 };

  if (collectTimings && timings.length > 0) {
    const sorted = [...timings].sort((a, b) => a - b);
    percentiles = {
      p50: sorted[Math.floor(sorted.length * 0.5)] ?? 0,
      p95: sorted[Math.floor(sorted.length * 0.95)] ?? 0,
      p99: sorted[Math.floor(sorted.length * 0.99)] ?? 0,
      p999: sorted[Math.floor(sorted.length * 0.999)] ?? sorted[sorted.length - 1] ?? 0,
    };
  }

  return {
    testName: name,
    operation: name,
    iterations,
    warmupIterations: warmup,
    totalMs,
    avgMs: totalMs / iterations,
    opsPerSecond: (iterations / totalMs) * 1000,
    percentiles,
  };
}

// ============================================
// Benchmark Tests
// ============================================

/**
 * Test: sRGB → OKLCH conversion
 */
function benchmarkOKLCHConversion(): PerformanceTestResult {
  let colorIndex = 0;

  return runBenchmark(
    'sRGB → OKLCH Conversion',
    () => {
      OKLCH.fromHex(TEST_COLORS[colorIndex % TEST_COLORS.length]!);
      colorIndex++;
    }
  );
}

/**
 * Test: OKLCH → sRGB conversion
 */
function benchmarkOKLCHToHex(): PerformanceTestResult {
  // Pre-create OKLCH instances
  const oklchColors = TEST_COLORS
    .map(hex => OKLCH.fromHex(hex))
    .filter((c): c is OKLCH => c !== null);

  let colorIndex = 0;

  return runBenchmark(
    'OKLCH → sRGB Conversion',
    () => {
      oklchColors[colorIndex % oklchColors.length]!.toHex();
      colorIndex++;
    }
  );
}

/**
 * Test: HCT creation
 */
function benchmarkHCTConversion(): PerformanceTestResult {
  let colorIndex = 0;

  return runBenchmark(
    'sRGB → HCT Conversion',
    () => {
      HCT.fromHex(TEST_COLORS[colorIndex % TEST_COLORS.length]!);
      colorIndex++;
    }
  );
}

/**
 * Test: APCA contrast calculation
 */
function benchmarkAPCAContrast(): PerformanceTestResult {
  let pairIndex = 0;

  return runBenchmark(
    'APCA Contrast Calculation',
    () => {
      const [fg, bg] = COLOR_PAIRS[pairIndex % COLOR_PAIRS.length]!;
      APCAContrast.calculate(fg, bg);
      pairIndex++;
    }
  );
}

/**
 * Test: Full accessibility validation
 */
function benchmarkAccessibilityValidation(): PerformanceTestResult {
  let pairIndex = 0;

  return runBenchmark(
    'Full Accessibility Validation',
    () => {
      const [fg, bg] = COLOR_PAIRS[pairIndex % COLOR_PAIRS.length]!;
      validateColorPair(fg, bg);
      pairIndex++;
    },
    { iterations: 5000 } // Fewer iterations for complex operation
  );
}

/**
 * Test: Contrast mode detection
 */
function benchmarkContrastModeDetection(): PerformanceTestResult {
  let colorIndex = 0;

  return runBenchmark(
    'Contrast Mode Detection',
    () => {
      detectContrastMode(TEST_COLORS[colorIndex % TEST_COLORS.length]!);
      colorIndex++;
    }
  );
}

/**
 * Test: Tonal palette generation
 */
function benchmarkTonalPalette(): PerformanceTestResult {
  const hctColors = TEST_COLORS
    .map(hex => HCT.fromHex(hex))
    .filter((c): c is HCT => c !== null);

  let colorIndex = 0;

  return runBenchmark(
    'Tonal Palette Generation',
    () => {
      hctColors[colorIndex % hctColors.length]!.generateTonalPalette();
      colorIndex++;
    },
    { iterations: 1000 } // Fewer iterations for expensive operation
  );
}

/**
 * Test: Color interpolation
 */
function benchmarkColorInterpolation(): PerformanceTestResult {
  const oklchColors = TEST_COLORS
    .map(hex => OKLCH.fromHex(hex))
    .filter((c): c is OKLCH => c !== null);

  let pairIndex = 0;

  return runBenchmark(
    'OKLCH Interpolation',
    () => {
      const start = oklchColors[pairIndex % oklchColors.length]!;
      const end = oklchColors[(pairIndex + 1) % oklchColors.length]!;
      OKLCH.interpolate(start, end, 0.5, 'shorter');
      pairIndex++;
    }
  );
}

/**
 * Test: Cache performance
 */
function benchmarkCacheHit(): PerformanceTestResult {
  // Pre-populate cache
  const cache = getColorCache();
  for (const color of TEST_COLORS) {
    cache.getOklch(color);
    cache.getHct(color);
  }

  let colorIndex = 0;

  const result = runBenchmark(
    'Cache Hit (OKLCH)',
    () => {
      cache.getOklch(TEST_COLORS[colorIndex % TEST_COLORS.length]!);
      colorIndex++;
    }
  );

  // Reset cache after test
  resetColorCache();

  return result;
}

/**
 * Test: Cache miss (cold cache)
 */
function benchmarkCacheMiss(): PerformanceTestResult {
  resetColorCache();
  const cache = getColorCache();

  let colorIndex = 0;

  return runBenchmark(
    'Cache Miss (OKLCH)',
    () => {
      // Create unique color each time to miss cache
      const r = (colorIndex * 7) % 256;
      const g = (colorIndex * 11) % 256;
      const b = (colorIndex * 13) % 256;
      const hex = `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
      cache.getOklch(hex);
      colorIndex++;
    }
  );
}

// ============================================
// Scalability Tests
// ============================================

export interface ScalabilityTestResult {
  readonly testName: string;
  readonly sizes: readonly number[];
  readonly results: readonly {
    readonly n: number;
    readonly timeMs: number;
    readonly opsPerSec: number;
    readonly timePerOp: number;
  }[];
  readonly scalingFactor: 'linear' | 'quadratic' | 'unknown';
}

function benchmarkScalability(): ScalabilityTestResult {
  const sizes = [10, 100, 1000, 5000];
  const results: {
    n: number;
    timeMs: number;
    opsPerSec: number;
    timePerOp: number;
  }[] = [];

  for (const n of sizes) {
    // Generate n colors
    const colors = Array.from({ length: n }, (_, i) => {
      const r = (i * 7) % 256;
      const g = (i * 11) % 256;
      const b = (i * 13) % 256;
      return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    });

    // Warm-up
    for (let i = 0; i < Math.min(100, n); i++) {
      OKLCH.fromHex(colors[i]!);
    }

    // Measure
    const start = performance.now();
    for (const color of colors) {
      OKLCH.fromHex(color);
    }
    const timeMs = performance.now() - start;

    results.push({
      n,
      timeMs,
      opsPerSec: (n / timeMs) * 1000,
      timePerOp: timeMs / n,
    });
  }

  // Determine scaling factor
  // If time doubles when n doubles, it's linear
  // If time quadruples when n doubles, it's quadratic
  let scalingFactor: 'linear' | 'quadratic' | 'unknown' = 'unknown';

  if (results.length >= 2) {
    const ratios = [];
    for (let i = 1; i < results.length; i++) {
      const sizeRatio = results[i]!.n / results[i - 1]!.n;
      const timeRatio = results[i]!.timeMs / results[i - 1]!.timeMs;
      ratios.push(timeRatio / sizeRatio);
    }

    const avgRatio = ratios.reduce((a, b) => a + b, 0) / ratios.length;

    if (avgRatio < 1.5) {
      scalingFactor = 'linear';
    } else if (avgRatio < 3) {
      scalingFactor = 'quadratic';
    }
  }

  return {
    testName: 'OKLCH Conversion Scalability',
    sizes,
    results,
    scalingFactor,
  };
}

// ============================================
// Full Performance Suite
// ============================================

export function runPerformanceSuite(): PerformanceSuiteResult {
  const results: PerformanceTestResult[] = [];

  // Reset cache for fair testing
  resetColorCache();

  // Run all benchmarks
  results.push(benchmarkOKLCHConversion());
  results.push(benchmarkOKLCHToHex());
  results.push(benchmarkHCTConversion());
  results.push(benchmarkAPCAContrast());
  results.push(benchmarkContrastModeDetection());
  results.push(benchmarkColorInterpolation());
  results.push(benchmarkCacheHit());
  results.push(benchmarkCacheMiss());
  results.push(benchmarkAccessibilityValidation());
  results.push(benchmarkTonalPalette());

  // Calculate summary
  const totalOperations = results.reduce((sum, r) => sum + r.iterations, 0);
  const totalTimeMs = results.reduce((sum, r) => sum + r.totalMs, 0);

  return {
    suiteName: 'Color Intelligence Performance',
    timestamp: new Date().toISOString(),
    environment: {
      nodeVersion: typeof process !== 'undefined' ? process.version : 'browser',
      platform: typeof process !== 'undefined' ? process.platform : 'browser',
      arch: typeof process !== 'undefined' ? process.arch : 'unknown',
    },
    results,
    summary: {
      totalOperations,
      totalTimeMs,
      aggregateOpsPerSec: (totalOperations / totalTimeMs) * 1000,
    },
  };
}

// ============================================
// Report Formatting
// ============================================

export function formatPerformanceReport(result: PerformanceSuiteResult): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '                   PERFORMANCE BENCHMARK REPORT',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Timestamp: ${result.timestamp}`,
    `Environment: Node ${result.environment.nodeVersion} on ${result.environment.platform}/${result.environment.arch}`,
    '',
    '───────────────────────────────────────────────────────────────',
    '                         RESULTS',
    '───────────────────────────────────────────────────────────────',
    '',
  ];

  // Table header
  lines.push(
    '┌────────────────────────────────────┬──────────┬──────────┬──────────┬──────────┐',
    '│ Operation                          │ Ops/sec  │ Avg (ms) │ P95 (ms) │ P99 (ms) │',
    '├────────────────────────────────────┼──────────┼──────────┼──────────┼──────────┤'
  );

  for (const r of result.results) {
    const name = r.testName.padEnd(36).slice(0, 36);
    const ops = r.opsPerSecond.toFixed(0).padStart(8);
    const avg = r.avgMs.toFixed(4).padStart(8);
    const p95 = r.percentiles.p95.toFixed(4).padStart(8);
    const p99 = r.percentiles.p99.toFixed(4).padStart(8);

    lines.push(`│ ${name} │ ${ops} │ ${avg} │ ${p95} │ ${p99} │`);
  }

  lines.push(
    '└────────────────────────────────────┴──────────┴──────────┴──────────┴──────────┘',
    '',
    '───────────────────────────────────────────────────────────────',
    '                         SUMMARY',
    '───────────────────────────────────────────────────────────────',
    '',
    `Total Operations:     ${result.summary.totalOperations.toLocaleString()}`,
    `Total Time:           ${result.summary.totalTimeMs.toFixed(2)} ms`,
    `Aggregate Throughput: ${result.summary.aggregateOpsPerSec.toFixed(0).toLocaleString()} ops/sec`,
    '',
    '═══════════════════════════════════════════════════════════════',
    ''
  );

  return lines.join('\n');
}

export default {
  runPerformanceSuite,
  benchmarkScalability,
  formatPerformanceReport,
};

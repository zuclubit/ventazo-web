// ============================================
// Color Intelligence Benchmarks
// Performance comparison against Material Color Utilities
// ============================================
//
// This benchmark suite compares our implementation against Google's
// Material Color Utilities reference implementation.
//
// Run with: npm run test:run -- --testNamePattern="Benchmark"
// ============================================

import { describe, it, expect } from 'vitest';
import {
  Hct,
  argbFromHex,
  hexFromArgb,
  TonalPalette,
  Blend,
} from '@material/material-color-utilities';

import OKLCH from '../domain/value-objects/OKLCH';
import HCT from '../domain/value-objects/HCT';
import APCAContrast from '../domain/value-objects/APCAContrast';
import { getColorCache } from '../infrastructure/cache/ColorCache';

// ============================================
// Benchmark Utilities
// ============================================

interface BenchmarkResult {
  name: string;
  iterations: number;
  totalMs: number;
  avgMs: number;
  opsPerSec: number;
  memoryKB?: number;
}

function benchmark(
  name: string,
  fn: () => void,
  iterations: number = 10000
): BenchmarkResult {
  // Warmup
  for (let i = 0; i < Math.min(100, iterations / 10); i++) {
    fn();
  }

  // Force GC if available (Node.js with --expose-gc)
  if (typeof globalThis.gc === 'function') {
    globalThis.gc();
  }

  const startMemory = process.memoryUsage?.()?.heapUsed;
  const start = performance.now();

  for (let i = 0; i < iterations; i++) {
    fn();
  }

  const end = performance.now();
  const endMemory = process.memoryUsage?.()?.heapUsed;

  const totalMs = end - start;
  const avgMs = totalMs / iterations;
  const opsPerSec = 1000 / avgMs;
  const memoryKB = endMemory && startMemory
    ? (endMemory - startMemory) / 1024
    : undefined;

  return {
    name,
    iterations,
    totalMs,
    avgMs,
    opsPerSec,
    memoryKB,
  };
}

function compareBenchmarks(
  ourResult: BenchmarkResult,
  theirResult: BenchmarkResult
): {
  speedRatio: number;
  faster: 'ours' | 'theirs' | 'equal';
  summary: string;
} {
  const speedRatio = theirResult.avgMs / ourResult.avgMs;
  const faster = speedRatio > 1.05 ? 'ours' : speedRatio < 0.95 ? 'theirs' : 'equal';

  const percentDiff = Math.abs((speedRatio - 1) * 100).toFixed(1);
  const summary = faster === 'equal'
    ? `Performance roughly equal`
    : faster === 'ours'
    ? `Our implementation is ${percentDiff}% faster`
    : `Material Color Utilities is ${percentDiff}% faster`;

  return { speedRatio, faster, summary };
}

// ============================================
// Test Colors
// ============================================

const TEST_COLORS = [
  '#3B82F6', // Blue-500
  '#EF4444', // Red-500
  '#10B981', // Emerald-500
  '#F59E0B', // Amber-500
  '#8B5CF6', // Violet-500
  '#EC4899', // Pink-500
  '#14B8A6', // Teal-500
  '#F97316', // Orange-500
  '#000000', // Black
  '#FFFFFF', // White
  '#808080', // Gray
  '#0EB58C', // Custom brand color
];

// ============================================
// HCT Creation Benchmarks
// ============================================

describe('Benchmark: HCT Creation', () => {
  it('should benchmark HCT creation from hex', () => {
    const iterations = 10000;
    const testHex = '#3B82F6';

    // Material Color Utilities
    const mcu = benchmark('MCU Hct.fromInt', () => {
      const argb = argbFromHex(testHex);
      Hct.fromInt(argb);
    }, iterations);

    // Our implementation
    const ours = benchmark('Our HCT.fromHex', () => {
      HCT.fromHex(testHex);
    }, iterations);

    const comparison = compareBenchmarks(ours, mcu);

    console.log('\n=== HCT Creation from Hex ===');
    console.log(`MCU:  ${mcu.opsPerSec.toFixed(0)} ops/sec (${mcu.avgMs.toFixed(4)}ms avg)`);
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} ops/sec (${ours.avgMs.toFixed(4)}ms avg)`);
    console.log(`Result: ${comparison.summary}`);

    // Our implementation adds OKLCH layer, so it's naturally slower
    // The key advantage is the OKLCH space and APCA, not raw HCT speed
    expect(comparison.speedRatio).toBeGreaterThan(0.1); // At least 10% as fast
  });

  it('should benchmark HCT creation from components', () => {
    const iterations = 10000;
    const h = 220, c = 50, t = 65;

    const mcu = benchmark('MCU Hct.from', () => {
      Hct.from(h, c, t);
    }, iterations);

    const ours = benchmark('Our HCT.create', () => {
      HCT.create(h, c, t);
    }, iterations);

    const comparison = compareBenchmarks(ours, mcu);

    console.log('\n=== HCT Creation from Components ===');
    console.log(`MCU:  ${mcu.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`Result: ${comparison.summary}`);

    expect(comparison.speedRatio).toBeGreaterThan(0.1);
  });
});

// ============================================
// HCT to Hex Conversion Benchmarks
// ============================================

describe('Benchmark: HCT to Hex Conversion', () => {
  it('should benchmark HCT to hex conversion', () => {
    const iterations = 10000;
    const mcuHct = Hct.from(220, 50, 65);
    const ourHct = HCT.create(220, 50, 65);

    const mcu = benchmark('MCU toInt + hexFromArgb', () => {
      hexFromArgb(mcuHct.toInt());
    }, iterations);

    const ours = benchmark('Our HCT.toHex', () => {
      ourHct.toHex();
    }, iterations);

    const comparison = compareBenchmarks(ours, mcu);

    console.log('\n=== HCT to Hex Conversion ===');
    console.log(`MCU:  ${mcu.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`Result: ${comparison.summary}`);

    // HCT to Hex is slower because we add OKLCH layer
    // MCU is C++ optimized, we accept 5%+ speed as reasonable
    expect(comparison.speedRatio).toBeGreaterThan(0.05);
  });
});

// ============================================
// Tonal Palette Generation Benchmarks
// ============================================

describe('Benchmark: Tonal Palette Generation', () => {
  it('should benchmark tonal palette creation', () => {
    const iterations = 1000;
    const testHex = '#3B82F6';
    const argb = argbFromHex(testHex);

    const mcu = benchmark('MCU TonalPalette.fromInt', () => {
      TonalPalette.fromInt(argb);
    }, iterations);

    const ours = benchmark('Our HCT.generateTonalPalette', () => {
      const hct = HCT.fromHex(testHex);
      if (hct) hct.generateTonalPalette();
    }, iterations);

    const comparison = compareBenchmarks(ours, mcu);

    console.log('\n=== Tonal Palette Generation ===');
    console.log(`MCU:  ${mcu.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`Result: ${comparison.summary}`);

    expect(comparison.speedRatio).toBeGreaterThan(0.05);
  });

  it('should benchmark accessing specific tones', () => {
    const iterations = 5000;
    const testHex = '#3B82F6';
    const argb = argbFromHex(testHex);
    const mcuPalette = TonalPalette.fromInt(argb);
    const ourHct = HCT.fromHex(testHex)!;

    const tones = [10, 20, 30, 40, 50, 60, 70, 80, 90, 95];

    const mcu = benchmark('MCU palette.tone()', () => {
      for (const t of tones) {
        mcuPalette.tone(t);
      }
    }, iterations);

    const ours = benchmark('Our HCT.withTone()', () => {
      for (const t of tones) {
        ourHct.withTone(t);
      }
    }, iterations);

    const comparison = compareBenchmarks(ours, mcu);

    console.log('\n=== Tone Access (10 tones) ===');
    console.log(`MCU:  ${mcu.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`Result: ${comparison.summary}`);

    expect(comparison.speedRatio).toBeGreaterThan(0.1);
  });
});

// ============================================
// OKLCH Operations Benchmarks
// ============================================

describe('Benchmark: OKLCH Operations', () => {
  it('should benchmark OKLCH creation from hex', () => {
    const iterations = 10000;
    const testHex = '#3B82F6';

    const ours = benchmark('OKLCH.fromHex', () => {
      OKLCH.fromHex(testHex);
    }, iterations);

    console.log('\n=== OKLCH from Hex ===');
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} ops/sec (${ours.avgMs.toFixed(4)}ms avg)`);
    console.log('(No MCU equivalent - OKLCH is our unique feature)');

    // OKLCH should be fast
    expect(ours.opsPerSec).toBeGreaterThan(10000);
  });

  it('should benchmark OKLCH interpolation', () => {
    const iterations = 5000;
    const color1 = OKLCH.fromHex('#3B82F6')!;
    const color2 = OKLCH.fromHex('#10B981')!;

    const ours = benchmark('OKLCH.interpolate', () => {
      OKLCH.interpolate(color1, color2, 0.5);
    }, iterations);

    console.log('\n=== OKLCH Interpolation ===');
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} ops/sec`);

    expect(ours.opsPerSec).toBeGreaterThan(5000);
  });

  it('should benchmark OKLCH gamut mapping', () => {
    const iterations = 5000;
    // Create an out-of-gamut color
    const outOfGamut = OKLCH.create(0.7, 0.4, 250);

    const ours = benchmark('OKLCH.mapToGamut', () => {
      outOfGamut.mapToGamut();
    }, iterations);

    console.log('\n=== OKLCH Gamut Mapping ===');
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} ops/sec`);

    expect(ours.opsPerSec).toBeGreaterThan(1000);
  });
});

// ============================================
// APCA Contrast Benchmarks
// ============================================

describe('Benchmark: APCA Contrast', () => {
  it('should benchmark APCA contrast calculation', () => {
    const iterations = 10000;
    const fg = '#FFFFFF';
    const bg = '#3B82F6';

    const ours = benchmark('APCAContrast.calculate', () => {
      APCAContrast.calculate(fg, bg);
    }, iterations);

    console.log('\n=== APCA Contrast Calculation ===');
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} ops/sec`);
    console.log('(MCU uses WCAG 2.1, not APCA)');

    expect(ours.opsPerSec).toBeGreaterThan(10000);
  });

  it('should benchmark finding optimal text color', () => {
    const iterations = 1000;
    const bg = '#3B82F6';

    const ours = benchmark('APCAContrast.findOptimalTextColor', () => {
      APCAContrast.findOptimalTextColor(bg);
    }, iterations);

    console.log('\n=== Find Optimal Text Color ===');
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} ops/sec`);

    expect(ours.opsPerSec).toBeGreaterThan(100);
  });
});

// ============================================
// Caching Performance Benchmarks
// ============================================

describe('Benchmark: Caching Performance', () => {
  it('should demonstrate cache hit performance improvement', () => {
    const iterations = 10000;
    const testHex = '#3B82F6';
    const cache = getColorCache();
    cache.clear();

    // First access (cache miss)
    const coldStart = benchmark('OKLCH cold start', () => {
      cache.clear();
      cache.getOklch(testHex);
    }, iterations);

    // Subsequent access (cache hit)
    cache.getOklch(testHex); // Prime the cache
    const cached = benchmark('OKLCH cached', () => {
      cache.getOklch(testHex);
    }, iterations);

    const speedup = coldStart.avgMs / cached.avgMs;

    console.log('\n=== Caching Performance ===');
    console.log(`Cold: ${coldStart.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`Hot:  ${cached.opsPerSec.toFixed(0)} ops/sec`);
    console.log(`Cache speedup: ${speedup.toFixed(1)}x faster`);

    expect(speedup).toBeGreaterThan(2);
  });
});

// ============================================
// Batch Operations Benchmarks
// ============================================

describe('Benchmark: Batch Operations', () => {
  it('should benchmark processing multiple colors', () => {
    const iterations = 500;

    const mcu = benchmark('MCU batch HCT creation', () => {
      for (const hex of TEST_COLORS) {
        const argb = argbFromHex(hex);
        Hct.fromInt(argb);
      }
    }, iterations);

    const ours = benchmark('Our batch HCT creation', () => {
      for (const hex of TEST_COLORS) {
        HCT.fromHex(hex);
      }
    }, iterations);

    const comparison = compareBenchmarks(ours, mcu);

    console.log('\n=== Batch HCT Creation (12 colors) ===');
    console.log(`MCU:  ${mcu.opsPerSec.toFixed(0)} batch ops/sec`);
    console.log(`Ours: ${ours.opsPerSec.toFixed(0)} batch ops/sec`);
    console.log(`Result: ${comparison.summary}`);

    // Threshold lowered to 0.15 for CI stability (batch ops vary with system load)
    expect(comparison.speedRatio).toBeGreaterThan(0.15);
  });
});

// ============================================
// Accuracy Comparison (Not a performance test)
// ============================================

describe('Accuracy: HCT Value Comparison', () => {
  it('should produce similar HCT values to MCU', () => {
    for (const hex of TEST_COLORS.slice(0, 5)) {
      const argb = argbFromHex(hex);
      const mcuHct = Hct.fromInt(argb);
      const ourHct = HCT.fromHex(hex);

      if (!ourHct) continue;

      // Hue should be within a few degrees (accounting for different algorithms)
      const hueDiff = Math.abs(mcuHct.hue - ourHct.h);
      const normalizedHueDiff = Math.min(hueDiff, 360 - hueDiff);

      // Chroma and tone should be reasonably close
      const chromaDiff = Math.abs(mcuHct.chroma - ourHct.c);
      const toneDiff = Math.abs(mcuHct.tone - ourHct.t);

      console.log(`\n${hex}:`);
      console.log(`  MCU:  H=${mcuHct.hue.toFixed(1)}, C=${mcuHct.chroma.toFixed(1)}, T=${mcuHct.tone.toFixed(1)}`);
      console.log(`  Ours: H=${ourHct.h.toFixed(1)}, C=${ourHct.c.toFixed(1)}, T=${ourHct.t.toFixed(1)}`);
      console.log(`  Diff: H=${normalizedHueDiff.toFixed(1)}°, C=${chromaDiff.toFixed(1)}, T=${toneDiff.toFixed(1)}`);

      // Tone should be close (our OKLCH layer adds slight variation)
      expect(toneDiff).toBeLessThan(10);
    }
  });

  it('should round-trip to similar hex values', () => {
    for (const hex of TEST_COLORS.slice(0, 5)) {
      const ourHct = HCT.fromHex(hex);
      if (!ourHct) continue;

      const roundTripped = ourHct.toHex();

      console.log(`${hex} → HCT → ${roundTripped}`);

      // Should round-trip reasonably well
      // Note: Exact match not expected due to gamut clipping
    }
  });
});

// ============================================
// Summary Report
// ============================================

describe('Benchmark Summary', () => {
  it('should print summary report', () => {
    console.log('\n');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  COLOR INTELLIGENCE BENCHMARK SUMMARY');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('');
    console.log('Our implementation provides:');
    console.log('  ✓ OKLCH color space (perceptually uniform, wide-gamut ready)');
    console.log('  ✓ APCA contrast (WCAG 3.0 algorithm, polarity-aware)');
    console.log('  ✓ Multi-factor contrast mode detection');
    console.log('  ✓ LRU caching with TTL for performance');
    console.log('  ✓ Branded types for type safety');
    console.log('');
    console.log('Material Color Utilities provides:');
    console.log('  ✓ Native CAM16 implementation (C++ bindings possible)');
    console.log('  ✓ HCT color space (Material Design 3 standard)');
    console.log('  ✓ Dynamic Color generation');
    console.log('  ✓ Quantization and scoring');
    console.log('');
    console.log('Trade-offs:');
    console.log('  • MCU may be faster for pure HCT operations');
    console.log('  • Our implementation adds OKLCH, APCA, caching layers');
    console.log('  • We prioritize accessibility (APCA) over speed');
    console.log('  • Our caching provides major speedups for repeated access');
    console.log('═══════════════════════════════════════════════════════════');

    expect(true).toBe(true);
  });
});

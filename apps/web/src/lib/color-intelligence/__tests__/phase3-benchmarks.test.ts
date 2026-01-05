/**
 * Phase 3 - Decision & Intelligence Layer Benchmarks
 *
 * Performance benchmarks for all Phase 3 components.
 * Ensures decision-making operations remain performant at scale.
 *
 * @module color-intelligence/tests/phase3-benchmarks
 */

import { describe, it, expect, beforeAll } from 'vitest';

// Domain value objects
import OKLCH from '../domain/value-objects/OKLCH';
import HCT from '../domain/value-objects/HCT';
import APCAContrast from '../domain/value-objects/APCAContrast';

// Phase 3 components
import { ContrastDecisionEngine } from '../application/ContrastDecisionEngine';
import { WCAG3Simulator } from '../application/WCAG3Simulator';
import { PerceptualTokenGenerator } from '../application/PerceptualTokenGenerator';
import { AIReadableContractsService } from '../application/AIReadableContracts';
import { MaterialDesign3Adapter } from '../infrastructure/adapters/MaterialDesign3Adapter';
import { FluentUIAdapter } from '../infrastructure/adapters/FluentUIAdapter';

// Domain types
import { createReadabilityContext, createViewingConditions } from '../domain/types/decision';

// ============================================
// Benchmark Utilities
// ============================================

interface BenchmarkResult {
  readonly name: string;
  readonly iterations: number;
  readonly totalMs: number;
  readonly avgMs: number;
  readonly opsPerSecond: number;
  readonly p50Ms: number;
  readonly p95Ms: number;
  readonly p99Ms: number;
}

/**
 * Run benchmark with specified iterations
 */
function benchmark(
  name: string,
  fn: () => void,
  iterations: number = 1000
): BenchmarkResult {
  const times: number[] = [];

  // Warmup
  for (let i = 0; i < Math.min(100, iterations / 10); i++) {
    fn();
  }

  // Actual benchmark
  for (let i = 0; i < iterations; i++) {
    const start = performance.now();
    fn();
    const end = performance.now();
    times.push(end - start);
  }

  times.sort((a, b) => a - b);

  const totalMs = times.reduce((a, b) => a + b, 0);
  const avgMs = totalMs / iterations;

  return {
    name,
    iterations,
    totalMs,
    avgMs,
    opsPerSecond: 1000 / avgMs,
    p50Ms: times[Math.floor(iterations * 0.5)] ?? 0,
    p95Ms: times[Math.floor(iterations * 0.95)] ?? 0,
    p99Ms: times[Math.floor(iterations * 0.99)] ?? 0,
  };
}

/**
 * Format benchmark result for logging
 */
function formatBenchmark(result: BenchmarkResult): string {
  return [
    `${result.name}:`,
    `  Iterations: ${result.iterations}`,
    `  Avg: ${result.avgMs.toFixed(4)}ms`,
    `  Ops/sec: ${result.opsPerSecond.toFixed(0)}`,
    `  P50: ${result.p50Ms.toFixed(4)}ms`,
    `  P95: ${result.p95Ms.toFixed(4)}ms`,
    `  P99: ${result.p99Ms.toFixed(4)}ms`,
  ].join('\n');
}

// ============================================
// Test Data
// ============================================

const testColors = {
  brandPrimary: '#3B82F6',
  brandSecondary: '#10B981',
  brandAccent: '#F59E0B',
  white: '#FFFFFF',
  black: '#000000',
  darkSurface: '#1E293B',
  lightSurface: '#F8FAFC',
  neutralGray: '#64748B',
};

const colorPairs = [
  { fg: testColors.black, bg: testColors.white },
  { fg: testColors.white, bg: testColors.darkSurface },
  { fg: testColors.brandPrimary, bg: testColors.white },
  { fg: testColors.white, bg: testColors.brandPrimary },
  { fg: testColors.neutralGray, bg: testColors.lightSurface },
];

// ============================================
// Contrast Decision Engine Benchmarks
// ============================================

describe('ContrastDecisionEngine Benchmarks', () => {
  let engine: ContrastDecisionEngine;

  beforeAll(() => {
    engine = new ContrastDecisionEngine();
  });

  it('should evaluate contrast efficiently (1000 iterations)', () => {
    const result = benchmark(
      'ContrastDecisionEngine.evaluate()',
      () => {
        for (const pair of colorPairs) {
          engine.evaluate({
            foreground: pair.fg,
            background: pair.bg,
            readabilityContext: createReadabilityContext(16, 400),
          });
        }
      },
      1000
    );

    console.log(formatBenchmark(result));

    // Performance threshold: average should be under 5ms per batch
    expect(result.avgMs).toBeLessThan(5);
    // P99 should be under 10ms
    expect(result.p99Ms).toBeLessThan(10);
  });

  it('should handle viewing conditions efficiently', () => {
    const conditions = [
      createViewingConditions('average'),
      createViewingConditions('bright'),
      createViewingConditions('dim'),
    ];

    const result = benchmark(
      'ContrastDecisionEngine.evaluate() with conditions',
      () => {
        for (const pair of colorPairs) {
          for (const condition of conditions) {
            engine.evaluate({
              foreground: pair.fg,
              background: pair.bg,
              readabilityContext: createReadabilityContext(16, 400),
              viewingConditions: condition,
            });
          }
        }
      },
      500
    );

    console.log(formatBenchmark(result));

    // With conditions should still be under 15ms per batch
    expect(result.avgMs).toBeLessThan(15);
  });

  it('should generate decisions with suggestions efficiently', () => {
    const result = benchmark(
      'ContrastDecisionEngine.evaluate() with suggestions',
      () => {
        for (const pair of colorPairs) {
          const decision = engine.evaluate({
            foreground: pair.fg,
            background: pair.bg,
            readabilityContext: createReadabilityContext(16, 400),
          });
          // Access suggestions if available
          decision.suggestions;
        }
      },
      500
    );

    console.log(formatBenchmark(result));

    // Decisions with suggestions should be under 10ms per batch
    expect(result.avgMs).toBeLessThan(10);
  });
});

// ============================================
// WCAG 3.0 Simulator Benchmarks
// ============================================

describe('WCAG3Simulator Benchmarks', () => {
  let simulator: WCAG3Simulator;

  beforeAll(() => {
    simulator = new WCAG3Simulator();
  });

  it('should calculate APCA scores efficiently (1000 iterations)', () => {
    const result = benchmark(
      'WCAG3Simulator.evaluate() for APCA',
      () => {
        for (const pair of colorPairs) {
          const score = simulator.evaluate(pair.fg, pair.bg, { size: 16, weight: 400 });
          score.apcaLc; // Access APCA value
        }
      },
      1000
    );

    console.log(formatBenchmark(result));

    // APCA calculation should be very fast: under 2ms per batch
    expect(result.avgMs).toBeLessThan(2);
  });

  it('should determine tiers efficiently', () => {
    const fontSizes = [12, 14, 16, 18, 24, 32];

    const result = benchmark(
      'WCAG3Simulator.evaluate() for tiers',
      () => {
        for (const pair of colorPairs) {
          for (const fontSize of fontSizes) {
            const score = simulator.evaluate(pair.fg, pair.bg, { size: fontSize, weight: 400 });
            score.tier; // Access tier
          }
        }
      },
      500
    );

    console.log(formatBenchmark(result));

    // Tier determination should be under 5ms per batch
    expect(result.avgMs).toBeLessThan(5);
  });

  it('should evaluate with full context efficiently', () => {
    const result = benchmark(
      'WCAG3Simulator.evaluate() full context',
      () => {
        for (const pair of colorPairs) {
          const score = simulator.evaluate(pair.fg, pair.bg, { size: 16, weight: 400 });
          // Access all properties
          score.tier;
          score.apcaLc;
          score.continuousScore;
          score.explanation;
        }
      },
      500
    );

    console.log(formatBenchmark(result));

    // Full evaluation should be under 10ms per batch
    expect(result.avgMs).toBeLessThan(10);
  });
});

// ============================================
// Perceptual Token Generator Benchmarks
// ============================================

describe('PerceptualTokenGenerator Benchmarks', () => {
  let generator: PerceptualTokenGenerator;

  beforeAll(() => {
    generator = new PerceptualTokenGenerator();
  });

  it('should generate token sets efficiently (500 iterations)', () => {
    const result = benchmark(
      'PerceptualTokenGenerator.generate() light',
      () => {
        generator.generate(testColors.brandPrimary, 'light');
      },
      500
    );

    console.log(formatBenchmark(result));

    // Token generation should be under 5ms
    expect(result.avgMs).toBeLessThan(5);
  });

  it('should generate dual mode tokens efficiently', () => {
    const result = benchmark(
      'PerceptualTokenGenerator.generateDualMode()',
      () => {
        generator.generateDualMode(testColors.brandPrimary);
      },
      500
    );

    console.log(formatBenchmark(result));

    // Dual mode (light + dark) should be under 15ms
    expect(result.avgMs).toBeLessThan(15);
  });

  it('should generate multiple brand colors efficiently', () => {
    const result = benchmark(
      'PerceptualTokenGenerator.generate() multiple brands',
      () => {
        generator.generate(testColors.brandPrimary, 'light');
        generator.generate(testColors.brandSecondary, 'light');
        generator.generate(testColors.brandAccent, 'light');
      },
      500
    );

    console.log(formatBenchmark(result));

    // Three brand generations should be under 15ms
    expect(result.avgMs).toBeLessThan(15);
  });
});

// ============================================
// Material Design 3 Adapter Benchmarks
// ============================================

describe('MaterialDesign3Adapter Benchmarks', () => {
  let adapter: MaterialDesign3Adapter;

  beforeAll(() => {
    adapter = new MaterialDesign3Adapter();
  });

  it('should generate tonal palettes efficiently (500 iterations)', () => {
    const result = benchmark(
      'MaterialDesign3Adapter.generateTonalPalette()',
      () => {
        adapter.generateTonalPalette(testColors.brandPrimary, 'primary');
      },
      500
    );

    console.log(formatBenchmark(result));

    // MD3 palette (24 tones) should be under 3ms
    expect(result.avgMs).toBeLessThan(3);
  });

  it('should generate full theme efficiently', () => {
    const result = benchmark(
      'MaterialDesign3Adapter.generateTokens() light',
      () => {
        adapter.generateTokens({
          primaryColor: testColors.brandPrimary,
          scheme: 'light',
        });
      },
      200
    );

    console.log(formatBenchmark(result));

    // Full theme generation should be under 15ms
    expect(result.avgMs).toBeLessThan(15);
  });

  it('should generate both schemes efficiently', () => {
    const result = benchmark(
      'MaterialDesign3Adapter.generateTokens() both schemes',
      () => {
        adapter.generateTokens({
          primaryColor: testColors.brandPrimary,
          scheme: 'light',
        });
        adapter.generateTokens({
          primaryColor: testColors.brandPrimary,
          scheme: 'dark',
        });
      },
      200
    );

    console.log(formatBenchmark(result));

    // Both schemes should be under 30ms
    expect(result.avgMs).toBeLessThan(30);
  });

  it('should export to CSS efficiently', () => {
    const { tokens } = adapter.generateTokens({
      primaryColor: testColors.brandPrimary,
      scheme: 'light',
    });

    const result = benchmark(
      'MaterialDesign3Adapter.toCssVariables()',
      () => {
        adapter.toCssVariables(tokens);
      },
      500
    );

    console.log(formatBenchmark(result));

    // CSS export should be under 2ms
    expect(result.avgMs).toBeLessThan(2);
  });
});

// ============================================
// Fluent UI Adapter Benchmarks
// ============================================

describe('FluentUIAdapter Benchmarks', () => {
  let adapter: FluentUIAdapter;

  beforeAll(() => {
    adapter = new FluentUIAdapter();
  });

  it('should generate theme slots efficiently (500 iterations)', () => {
    const result = benchmark(
      'FluentUIAdapter.generateTonalPalette()',
      () => {
        adapter.generateTonalPalette(testColors.brandPrimary, 'primary');
      },
      500
    );

    console.log(formatBenchmark(result));

    // Fluent palette should be under 3ms
    expect(result.avgMs).toBeLessThan(3);
  });

  it('should generate full theme efficiently', () => {
    const result = benchmark(
      'FluentUIAdapter.generateTokens() light',
      () => {
        adapter.generateTokens({
          primaryColor: testColors.brandPrimary,
          scheme: 'light',
        });
      },
      200
    );

    console.log(formatBenchmark(result));

    // Full Fluent theme should be under 20ms
    expect(result.avgMs).toBeLessThan(20);
  });

  it('should validate accessibility efficiently', () => {
    const { tokens } = adapter.generateTokens({
      primaryColor: testColors.brandPrimary,
      scheme: 'light',
    });

    const result = benchmark(
      'FluentUIAdapter.validateAccessibility()',
      () => {
        adapter.validateAccessibility(tokens, 'light');
      },
      200
    );

    console.log(formatBenchmark(result));

    // Validation should be under 10ms
    expect(result.avgMs).toBeLessThan(10);
  });
});

// ============================================
// AI-Readable Contracts Benchmarks
// ============================================

describe('AIReadableContractsService Benchmarks', () => {
  let service: AIReadableContractsService;
  let engine: ContrastDecisionEngine;

  beforeAll(() => {
    service = new AIReadableContractsService();
    engine = new ContrastDecisionEngine();
  });

  it('should generate contracts efficiently (500 iterations)', () => {
    const result = benchmark(
      'AIReadableContractsService.generateContract()',
      () => {
        for (const pair of colorPairs) {
          const decision = engine.evaluate({
            foreground: pair.fg,
            background: pair.bg,
            readabilityContext: createReadabilityContext(16, 400),
          });
          service.generateContract(decision);
        }
      },
      500
    );

    console.log(formatBenchmark(result));

    // Contract generation should be under 10ms per batch
    expect(result.avgMs).toBeLessThan(10);
  });

  it('should generate extended contracts efficiently', () => {
    const result = benchmark(
      'AIReadableContractsService.generateExtendedContract()',
      () => {
        for (const pair of colorPairs) {
          const decision = engine.evaluate({
            foreground: pair.fg,
            background: pair.bg,
            readabilityContext: createReadabilityContext(16, 400),
          });
          service.generateExtendedContract(decision);
        }
      },
      300
    );

    console.log(formatBenchmark(result));

    // Extended contracts should be under 15ms per batch
    expect(result.avgMs).toBeLessThan(15);
  });

  it('should serialize/deserialize efficiently', () => {
    const decisions = colorPairs.map((pair) =>
      engine.evaluate({
        foreground: pair.fg,
        background: pair.bg,
        readabilityContext: createReadabilityContext(16, 400),
      })
    );
    const contracts = decisions.map((d) => service.generateContract(d));

    const result = benchmark(
      'AIReadableContractsService.serialize()/deserialize()',
      () => {
        for (const contract of contracts) {
          const json = service.serialize(contract);
          service.deserialize(json);
        }
      },
      500
    );

    console.log(formatBenchmark(result));

    // Serialization roundtrip should be under 5ms per batch
    expect(result.avgMs).toBeLessThan(5);
  });

  it('should compare contracts efficiently', () => {
    const decision1 = engine.evaluate({
      foreground: testColors.black,
      background: testColors.white,
      readabilityContext: createReadabilityContext(16, 400),
    });
    const decision2 = engine.evaluate({
      foreground: testColors.neutralGray,
      background: testColors.white,
      readabilityContext: createReadabilityContext(16, 400),
    });
    const contract1 = service.generateContract(decision1);
    const contract2 = service.generateContract(decision2);

    const result = benchmark(
      'AIReadableContractsService.compareContracts()',
      () => {
        service.compareContracts(contract1, contract2);
      },
      500
    );

    console.log(formatBenchmark(result));

    // Contract comparison should be under 1ms
    expect(result.avgMs).toBeLessThan(1);
  });
});

// ============================================
// Integration Benchmarks
// ============================================

describe('Integration Benchmarks', () => {
  it('should handle full pipeline efficiently', () => {
    const engine = new ContrastDecisionEngine();
    const simulator = new WCAG3Simulator();
    const contractService = new AIReadableContractsService();

    const result = benchmark(
      'Full decision pipeline',
      () => {
        for (const pair of colorPairs) {
          // Step 1: Evaluate contrast
          const decision = engine.evaluate({
            foreground: pair.fg,
            background: pair.bg,
            viewingConditions: createViewingConditions('average'),
          });

          // Step 2: Get WCAG 3.0 tier
          const wcagResult = simulator.evaluate(pair.fg, pair.bg, { size: 16, weight: 400 });

          // Step 3: Generate AI contract
          const contract = contractService.generateContract(decision);
        }
      },
      300
    );

    console.log(formatBenchmark(result));

    // Full pipeline should be under 20ms per batch
    expect(result.avgMs).toBeLessThan(20);
  });

  it('should handle theme generation pipeline efficiently', () => {
    const md3Adapter = new MaterialDesign3Adapter();
    const fluentAdapter = new FluentUIAdapter();

    const result = benchmark(
      'Theme generation pipeline (MD3 + Fluent)',
      () => {
        // Generate MD3 theme
        const md3Light = md3Adapter.generateTokens({
          primaryColor: testColors.brandPrimary,
          scheme: 'light',
        });
        const md3Dark = md3Adapter.generateTokens({
          primaryColor: testColors.brandPrimary,
          scheme: 'dark',
        });

        // Generate Fluent theme
        const fluentLight = fluentAdapter.generateTokens({
          primaryColor: testColors.brandPrimary,
          scheme: 'light',
        });
        const fluentDark = fluentAdapter.generateTokens({
          primaryColor: testColors.brandPrimary,
          scheme: 'dark',
        });

        // Export both to CSS
        md3Adapter.toCssVariables(md3Light.tokens);
        md3Adapter.toCssVariables(md3Dark.tokens);
        fluentAdapter.toCssVariables(fluentLight.tokens);
        fluentAdapter.toCssVariables(fluentDark.tokens);
      },
      100
    );

    console.log(formatBenchmark(result));

    // Full theme pipeline should be under 100ms
    expect(result.avgMs).toBeLessThan(100);
  });

  it('should handle batch color analysis efficiently', () => {
    const engine = new ContrastDecisionEngine();
    const colors = [
      '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
      '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
    ];

    const result = benchmark(
      'Batch analysis (100 color pairs)',
      () => {
        for (const fg of colors) {
          for (const bg of colors) {
            if (fg !== bg) {
              engine.evaluate({ foreground: fg, background: bg });
            }
          }
        }
      },
      50
    );

    console.log(formatBenchmark(result));

    // 90 pairs (10*10-10 diagonal) should be under 100ms
    expect(result.avgMs).toBeLessThan(100);
  });
});

// ============================================
// Memory Benchmarks
// ============================================

describe('Memory Efficiency', () => {
  it('should not leak memory during repeated operations', () => {
    const engine = new ContrastDecisionEngine();
    const initialMemory = process.memoryUsage().heapUsed;

    // Run many iterations
    for (let i = 0; i < 10000; i++) {
      engine.evaluate({ foreground: testColors.black, background: testColors.white });
    }

    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable (less than 50MB)
    expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
  });

  it('should efficiently reuse adapter instances', () => {
    const adapter = new MaterialDesign3Adapter();
    const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

    const initialMemory = process.memoryUsage().heapUsed;

    // Generate many palettes with same adapter
    for (let i = 0; i < 1000; i++) {
      for (const color of colors) {
        adapter.generateTonalPalette(color, 'primary');
      }
    }

    if (global.gc) {
      global.gc();
    }

    const finalMemory = process.memoryUsage().heapUsed;
    const memoryIncrease = finalMemory - initialMemory;

    // Memory increase should be reasonable
    expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024);
  });
});

// ============================================
// Throughput Summary
// ============================================

describe('Throughput Summary', () => {
  it('should meet minimum throughput requirements', () => {
    const engine = new ContrastDecisionEngine();
    const simulator = new WCAG3Simulator();
    const md3Adapter = new MaterialDesign3Adapter();

    const operations = {
      'Contrast evaluation': () => engine.evaluate({ foreground: testColors.black, background: testColors.white }),
      'WCAG3 evaluation': () => simulator.evaluate(testColors.black, testColors.white, { size: 16, weight: 400 }),
      'Tonal palette': () => md3Adapter.generateTonalPalette(testColors.brandPrimary, 'primary'),
    };

    const minimumOpsPerSecond: Record<string, number> = {
      'Contrast evaluation': 5000,
      'WCAG3 evaluation': 5000,
      'Tonal palette': 1000,
    };

    console.log('\n=== Throughput Summary ===\n');

    for (const [name, fn] of Object.entries(operations)) {
      const result = benchmark(name, fn, 1000);
      console.log(`${name}: ${result.opsPerSecond.toFixed(0)} ops/sec`);

      expect(result.opsPerSecond).toBeGreaterThan(minimumOpsPerSecond[name] ?? 0);
    }
  });
});

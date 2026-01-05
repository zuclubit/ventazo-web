/**
 * Accuracy Benchmark Suite
 *
 * Tests scientific accuracy of color space conversions and calculations
 * against golden reference values.
 *
 * Methodology: Compare Color Intelligence outputs against canonical test vectors
 */

import { APCA_GOLDEN_VECTORS, APCA_CONSTANTS } from '../data/golden-sets/apca-vectors';
import { OKLCH_GOLDEN_VECTORS, OKLCH_ROUNDTRIP_TOLERANCE } from '../data/golden-sets/oklch-vectors';

// Import Color Intelligence modules
import OKLCH from '../../domain/value-objects/OKLCH';
import APCAContrast from '../../domain/value-objects/APCAContrast';

// ============================================
// Types
// ============================================

export interface AccuracyTestResult {
  readonly testName: string;
  readonly category: string;
  readonly passed: boolean;
  readonly expected: number | string | object;
  readonly actual: number | string | object | null;
  readonly deviation: number;
  readonly tolerance: number;
  readonly details?: string;
}

export interface AccuracySuiteResult {
  readonly suiteName: string;
  readonly timestamp: string;
  readonly totalTests: number;
  readonly passed: number;
  readonly failed: number;
  readonly passRate: number;
  readonly results: readonly AccuracyTestResult[];
  readonly summary: {
    readonly maxDeviation: number;
    readonly meanDeviation: number;
    readonly p95Deviation: number;
  };
}

// ============================================
// APCA Accuracy Tests
// ============================================

export function runAPCAAccuracyTests(): AccuracySuiteResult {
  const results: AccuracyTestResult[] = [];
  const deviations: number[] = [];

  for (const vector of APCA_GOLDEN_VECTORS) {
    const contrast = APCAContrast.calculate(vector.foreground.hex, vector.background.hex);
    const actualLc = contrast.lc;
    const expectedLc = vector.expected.lc;
    const deviation = Math.abs(actualLc - expectedLc);
    const passed = deviation <= vector.expected.tolerance;

    deviations.push(deviation);

    results.push({
      testName: vector.name,
      category: vector.category,
      passed,
      expected: expectedLc,
      actual: actualLc,
      deviation,
      tolerance: vector.expected.tolerance,
      details: vector.description,
    });
  }

  // Calculate summary statistics
  const sortedDeviations = [...deviations].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedDeviations.length * 0.95);

  const passed = results.filter(r => r.passed).length;

  return {
    suiteName: 'APCA Accuracy',
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed: results.length - passed,
    passRate: (passed / results.length) * 100,
    results,
    summary: {
      maxDeviation: Math.max(...deviations, 0),
      meanDeviation: deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0,
      p95Deviation: sortedDeviations[p95Index] ?? sortedDeviations[sortedDeviations.length - 1] ?? 0,
    },
  };
}

/**
 * Verify APCA implementation uses correct constants
 */
export function verifyAPCAConstants(): AccuracyTestResult[] {
  const results: AccuracyTestResult[] = [];

  // We can't directly access private constants, but we can verify behavior
  // Test the soft clamp threshold effect

  // Test 1: Very dark color should trigger soft clamp at 0.022
  const nearBlackContrast = APCAContrast.calculate('#050505', '#000000');

  // If blkThrs is correct (0.022), the Lc should be approximately -2.18
  // If blkThrs were wrong (0.001), the Lc would be different
  const expectedNearBlack = -2.18;
  const nearBlackDeviation = Math.abs(nearBlackContrast.lc - expectedNearBlack);

  results.push({
    testName: 'blkThrs Soft Clamp Verification',
    category: 'constants',
    passed: nearBlackDeviation < 1.0,
    expected: expectedNearBlack,
    actual: nearBlackContrast.lc,
    deviation: nearBlackDeviation,
    tolerance: 1.0,
    details: `Verifies blkThrs = ${APCA_CONSTANTS.blkThrs} is correctly applied`,
  });

  return results;
}

// ============================================
// OKLCH Accuracy Tests
// ============================================

export function runOKLCHAccuracyTests(): AccuracySuiteResult {
  const results: AccuracyTestResult[] = [];
  const deviations: number[] = [];

  for (const vector of OKLCH_GOLDEN_VECTORS) {
    const oklch = OKLCH.fromHex(vector.srgb.hex);

    if (!oklch) {
      results.push({
        testName: vector.name,
        category: vector.category,
        passed: false,
        expected: vector.oklch,
        actual: null,
        deviation: Infinity,
        tolerance: 0,
        details: 'Failed to parse hex color',
      });
      continue;
    }

    // Calculate deviations for L, C, H
    const lDeviation = Math.abs(oklch.l - vector.oklch.l);
    const cDeviation = Math.abs(oklch.c - vector.oklch.c);

    // Handle hue wrap-around for chromatic colors
    let hDeviation = 0;
    if (vector.oklch.c > 0.001) {
      // Only check hue for chromatic colors
      hDeviation = Math.min(
        Math.abs(oklch.h - vector.oklch.h),
        360 - Math.abs(oklch.h - vector.oklch.h)
      );
    }

    const lPassed = lDeviation <= vector.tolerance.l;
    const cPassed = cDeviation <= vector.tolerance.c;
    const hPassed = hDeviation <= vector.tolerance.h || vector.oklch.c < 0.001;
    const passed = lPassed && cPassed && hPassed;

    // Use maximum deviation for summary
    const maxDeviation = Math.max(
      lDeviation / vector.tolerance.l,
      cDeviation / (vector.tolerance.c || 1),
      vector.oklch.c > 0.001 ? hDeviation / (vector.tolerance.h || 1) : 0
    );

    deviations.push(maxDeviation);

    results.push({
      testName: vector.name,
      category: vector.category,
      passed,
      expected: vector.oklch,
      actual: { l: oklch.l, c: oklch.c, h: oklch.h },
      deviation: maxDeviation,
      tolerance: 1.0, // Normalized
      details: `L: ${lDeviation.toFixed(4)} (tol: ${vector.tolerance.l}), C: ${cDeviation.toFixed(4)} (tol: ${vector.tolerance.c}), H: ${hDeviation.toFixed(2)}° (tol: ${vector.tolerance.h})`,
    });
  }

  const sortedDeviations = [...deviations].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedDeviations.length * 0.95);
  const passed = results.filter(r => r.passed).length;

  return {
    suiteName: 'OKLCH Accuracy',
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed: results.length - passed,
    passRate: (passed / results.length) * 100,
    results,
    summary: {
      maxDeviation: Math.max(...deviations, 0),
      meanDeviation: deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0,
      p95Deviation: sortedDeviations[p95Index] ?? sortedDeviations[sortedDeviations.length - 1] ?? 0,
    },
  };
}

/**
 * Test round-trip conversion integrity
 * sRGB → OKLCH → sRGB should be identity (within tolerance)
 */
export function runOKLCHRoundtripTests(): AccuracySuiteResult {
  const results: AccuracyTestResult[] = [];
  const deviations: number[] = [];

  // Test all golden vectors for round-trip
  for (const vector of OKLCH_GOLDEN_VECTORS) {
    const oklch = OKLCH.fromHex(vector.srgb.hex);
    if (!oklch) continue;

    const roundtrip = oklch.toHex();
    const roundtripOklch = OKLCH.fromHex(roundtrip);
    if (!roundtripOklch) continue;

    // Compare original hex to roundtrip hex
    // Parse both to RGB for comparison
    const parseHex = (hex: string): [number, number, number] => {
      const clean = hex.replace('#', '');
      return [
        parseInt(clean.slice(0, 2), 16),
        parseInt(clean.slice(2, 4), 16),
        parseInt(clean.slice(4, 6), 16),
      ];
    };

    const original = parseHex(vector.srgb.hex);
    const result = parseHex(roundtrip);

    const rDev = Math.abs(original[0] - result[0]);
    const gDev = Math.abs(original[1] - result[1]);
    const bDev = Math.abs(original[2] - result[2]);
    const maxDeviation = Math.max(rDev, gDev, bDev);

    const passed = maxDeviation <= OKLCH_ROUNDTRIP_TOLERANCE.maxRgbDeviation;
    deviations.push(maxDeviation);

    results.push({
      testName: `Roundtrip: ${vector.name}`,
      category: 'roundtrip',
      passed,
      expected: vector.srgb.hex,
      actual: roundtrip,
      deviation: maxDeviation,
      tolerance: OKLCH_ROUNDTRIP_TOLERANCE.maxRgbDeviation,
      details: `RGB deviation: R=${rDev}, G=${gDev}, B=${bDev}`,
    });
  }

  const sortedDeviations = [...deviations].sort((a, b) => a - b);
  const p95Index = Math.floor(sortedDeviations.length * 0.95);
  const passed = results.filter(r => r.passed).length;

  return {
    suiteName: 'OKLCH Round-Trip',
    timestamp: new Date().toISOString(),
    totalTests: results.length,
    passed,
    failed: results.length - passed,
    passRate: (passed / results.length) * 100,
    results,
    summary: {
      maxDeviation: Math.max(...deviations, 0),
      meanDeviation: deviations.length > 0 ? deviations.reduce((a, b) => a + b, 0) / deviations.length : 0,
      p95Deviation: sortedDeviations[p95Index] ?? sortedDeviations[sortedDeviations.length - 1] ?? 0,
    },
  };
}

// ============================================
// Combined Accuracy Suite
// ============================================

export interface FullAccuracyReport {
  readonly timestamp: string;
  readonly suites: {
    readonly apca: AccuracySuiteResult;
    readonly oklch: AccuracySuiteResult;
    readonly roundtrip: AccuracySuiteResult;
  };
  readonly overall: {
    readonly totalTests: number;
    readonly passed: number;
    readonly failed: number;
    readonly passRate: number;
  };
}

export function runFullAccuracySuite(): FullAccuracyReport {
  const apca = runAPCAAccuracyTests();
  const oklch = runOKLCHAccuracyTests();
  const roundtrip = runOKLCHRoundtripTests();

  const totalTests = apca.totalTests + oklch.totalTests + roundtrip.totalTests;
  const passed = apca.passed + oklch.passed + roundtrip.passed;

  return {
    timestamp: new Date().toISOString(),
    suites: {
      apca,
      oklch,
      roundtrip,
    },
    overall: {
      totalTests,
      passed,
      failed: totalTests - passed,
      passRate: (passed / totalTests) * 100,
    },
  };
}

// ============================================
// Report Formatting
// ============================================

export function formatAccuracyReport(report: FullAccuracyReport): string {
  const lines: string[] = [
    '═══════════════════════════════════════════════════════════════',
    '                    ACCURACY BENCHMARK REPORT',
    '═══════════════════════════════════════════════════════════════',
    '',
    `Timestamp: ${report.timestamp}`,
    '',
    '───────────────────────────────────────────────────────────────',
    '                         OVERALL SUMMARY',
    '───────────────────────────────────────────────────────────────',
    '',
    `Total Tests:  ${report.overall.totalTests}`,
    `Passed:       ${report.overall.passed}`,
    `Failed:       ${report.overall.failed}`,
    `Pass Rate:    ${report.overall.passRate.toFixed(2)}%`,
    '',
  ];

  // Add suite summaries
  for (const [name, suite] of Object.entries(report.suites)) {
    lines.push(
      '───────────────────────────────────────────────────────────────',
      `  ${suite.suiteName.toUpperCase()}`,
      '───────────────────────────────────────────────────────────────',
      '',
      `  Tests: ${suite.totalTests} | Pass: ${suite.passed} | Fail: ${suite.failed} | Rate: ${suite.passRate.toFixed(1)}%`,
      `  Max Deviation: ${suite.summary.maxDeviation.toFixed(4)}`,
      `  Mean Deviation: ${suite.summary.meanDeviation.toFixed(4)}`,
      `  P95 Deviation: ${suite.summary.p95Deviation.toFixed(4)}`,
      ''
    );

    // Show failed tests
    const failed = suite.results.filter(r => !r.passed);
    if (failed.length > 0) {
      lines.push('  Failed Tests:');
      for (const test of failed) {
        lines.push(
          `    ✗ ${test.testName}`,
          `      Expected: ${JSON.stringify(test.expected)}`,
          `      Actual: ${JSON.stringify(test.actual)}`,
          `      Deviation: ${test.deviation.toFixed(4)} (tolerance: ${test.tolerance})`
        );
      }
      lines.push('');
    }
  }

  lines.push(
    '═══════════════════════════════════════════════════════════════',
    ''
  );

  return lines.join('\n');
}

export default {
  runAPCAAccuracyTests,
  runOKLCHAccuracyTests,
  runOKLCHRoundtripTests,
  runFullAccuracySuite,
  formatAccuracyReport,
};

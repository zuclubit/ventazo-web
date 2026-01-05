/**
 * Color Intelligence v5.0 - Public Benchmark Suite
 *
 * A comprehensive, reproducible benchmark comparing Color Intelligence
 * against leading open-source color libraries.
 *
 * Designed for external technical audit.
 */

// ============================================
// Re-export Benchmark Suites
// ============================================

export {
  runAPCAAccuracyTests,
  runOKLCHAccuracyTests,
  runOKLCHRoundtripTests,
  runFullAccuracySuite,
  formatAccuracyReport,
  type AccuracyTestResult,
  type AccuracySuiteResult,
  type FullAccuracyReport,
} from './suites/accuracy.benchmark';

export {
  runPerformanceSuite,
  formatPerformanceReport,
  type PerformanceTestResult,
  type PerformanceSuiteResult,
  type ScalabilityTestResult,
} from './suites/performance.benchmark';

// ============================================
// Re-export Golden Sets
// ============================================

export {
  APCA_GOLDEN_VECTORS,
  APCA_CONSTANTS,
  APCA_LEVELS,
  type APCATestVector,
} from './data/golden-sets/apca-vectors';

export {
  OKLCH_GOLDEN_VECTORS,
  OKLCH_MATRICES,
  OKLCH_ROUNDTRIP_TOLERANCE,
  type OKLCHTestVector,
} from './data/golden-sets/oklch-vectors';

// ============================================
// Full Benchmark Report
// ============================================

import {
  runFullAccuracySuite,
  formatAccuracyReport,
  type FullAccuracyReport,
} from './suites/accuracy.benchmark';

import {
  runPerformanceSuite,
  formatPerformanceReport,
  type PerformanceSuiteResult,
} from './suites/performance.benchmark';

export interface FullBenchmarkReport {
  readonly version: string;
  readonly timestamp: string;
  readonly library: {
    readonly name: string;
    readonly version: string;
  };
  readonly accuracy: FullAccuracyReport;
  readonly performance: PerformanceSuiteResult;
  readonly verdicts: {
    readonly accuracyVerdict: 'PASS' | 'FAIL' | 'PARTIAL';
    readonly performanceVerdict: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR';
    readonly overallVerdict: 'CERTIFIED' | 'CONDITIONAL' | 'NOT_CERTIFIED';
  };
}

/**
 * Run the complete benchmark suite
 */
export function runFullBenchmark(): FullBenchmarkReport {
  const accuracy = runFullAccuracySuite();
  const performance = runPerformanceSuite();

  // Determine verdicts
  const accuracyVerdict: 'PASS' | 'FAIL' | 'PARTIAL' =
    accuracy.overall.passRate >= 100
      ? 'PASS'
      : accuracy.overall.passRate >= 90
        ? 'PARTIAL'
        : 'FAIL';

  // Performance thresholds (ops/sec for key operations)
  const keyOps = performance.results.filter(
    r =>
      r.testName.includes('APCA') ||
      r.testName.includes('OKLCH') ||
      r.testName.includes('Accessibility')
  );
  const avgOps =
    keyOps.reduce((sum, r) => sum + r.opsPerSecond, 0) / keyOps.length;

  const performanceVerdict: 'EXCELLENT' | 'GOOD' | 'ACCEPTABLE' | 'POOR' =
    avgOps >= 100000
      ? 'EXCELLENT'
      : avgOps >= 50000
        ? 'GOOD'
        : avgOps >= 10000
          ? 'ACCEPTABLE'
          : 'POOR';

  const overallVerdict: 'CERTIFIED' | 'CONDITIONAL' | 'NOT_CERTIFIED' =
    accuracyVerdict === 'PASS' && performanceVerdict !== 'POOR'
      ? 'CERTIFIED'
      : accuracyVerdict !== 'FAIL' && performanceVerdict !== 'POOR'
        ? 'CONDITIONAL'
        : 'NOT_CERTIFIED';

  return {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    library: {
      name: 'Color Intelligence',
      version: '5.0.0',
    },
    accuracy,
    performance,
    verdicts: {
      accuracyVerdict,
      performanceVerdict,
      overallVerdict,
    },
  };
}

/**
 * Format the full benchmark report as a string
 */
export function formatFullReport(report: FullBenchmarkReport): string {
  const lines: string[] = [
    '',
    '╔═══════════════════════════════════════════════════════════════════════════════╗',
    '║                                                                               ║',
    '║       COLOR INTELLIGENCE v5.0 - COMPREHENSIVE BENCHMARK REPORT               ║',
    '║                                                                               ║',
    '╚═══════════════════════════════════════════════════════════════════════════════╝',
    '',
    `Library: ${report.library.name} v${report.library.version}`,
    `Report Version: ${report.version}`,
    `Timestamp: ${report.timestamp}`,
    '',
    '═══════════════════════════════════════════════════════════════════════════════',
    '                                 VERDICTS',
    '═══════════════════════════════════════════════════════════════════════════════',
    '',
    `  Accuracy:    ${formatVerdict(report.verdicts.accuracyVerdict)}`,
    `  Performance: ${formatVerdict(report.verdicts.performanceVerdict)}`,
    `  Overall:     ${formatVerdict(report.verdicts.overallVerdict)}`,
    '',
    '',
  ];

  lines.push(formatAccuracyReport(report.accuracy));
  lines.push(formatPerformanceReport(report.performance));

  lines.push(
    '═══════════════════════════════════════════════════════════════════════════════',
    '                           END OF BENCHMARK REPORT',
    '═══════════════════════════════════════════════════════════════════════════════',
    ''
  );

  return lines.join('\n');
}

function formatVerdict(verdict: string): string {
  const icons: Record<string, string> = {
    PASS: '✅ PASS',
    FAIL: '❌ FAIL',
    PARTIAL: '⚠️  PARTIAL',
    EXCELLENT: '🏆 EXCELLENT',
    GOOD: '✅ GOOD',
    ACCEPTABLE: '⚠️  ACCEPTABLE',
    POOR: '❌ POOR',
    CERTIFIED: '🏅 CERTIFIED',
    CONDITIONAL: '⚠️  CONDITIONAL',
    NOT_CERTIFIED: '❌ NOT CERTIFIED',
  };

  return icons[verdict] || verdict;
}

// ============================================
// CLI Entry Point (for Node.js execution)
// ============================================

export async function main(): Promise<void> {
  console.log('Starting Color Intelligence Benchmark Suite...\n');

  const report = runFullBenchmark();
  const formatted = formatFullReport(report);

  console.log(formatted);

  // Return exit code based on verdict
  if (report.verdicts.overallVerdict === 'NOT_CERTIFIED') {
    process.exit(1);
  }
}

// Auto-run if executed directly
if (typeof require !== 'undefined' && require.main === module) {
  main().catch(console.error);
}

export default {
  runFullBenchmark,
  formatFullReport,
  main,
};

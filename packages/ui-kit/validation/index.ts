/**
 * @fileoverview Validation Layer - UI Kit
 *
 * Sistema de validación y conformidad para el sistema de diseño.
 *
 * Este módulo proporciona herramientas para validar:
 * - Conformidad arquitectónica (hexagonal architecture)
 * - Cumplimiento de accesibilidad (WCAG, APCA)
 * - Principios de Color Intelligence
 * - Estándares de tokens de diseño
 *
 * @module ui-kit/validation
 * @version 1.0.0
 *
 * @example
 * ```typescript
 * import {
 *   ConformanceChecker,
 *   ReportGenerator,
 * } from '@zuclubit/ui-kit/validation';
 *
 * // Run conformance checks
 * const checker = new ConformanceChecker();
 * const report = await checker.runAll({
 *   tokenCollection: tokens,
 *   colors: themeColors,
 * });
 *
 * // Generate report
 * const generator = new ReportGenerator();
 * const markdown = generator.generate(report, {
 *   format: 'markdown',
 *   includeSuggestions: true,
 * });
 *
 * console.log(markdown);
 * ```
 */

// ============================================================================
// CONFORMANCE
// ============================================================================

export {
  ConformanceChecker,
  type ConformanceSeverity,
  type ConformanceCategory,
  type ConformanceIssue,
  type ConformanceCheckResult,
  type ConformanceReport,
  type ConformanceOptions,
  type ConformanceContext,
  type ConformanceCheck,
  // Individual checks
  ContrastRatioCheck,
  ColorBlindnessCheck,
  PerceptualUniformityCheck,
  GamutBoundaryCheck,
  HardcodedColorCheck,
  TokenNamingConventionCheck,
  TokenCompletenessCheck,
  TokenTypeValidationCheck,
  DependencyDirectionCheck,
  PortContractCheck,
} from './conformance';

// ============================================================================
// REPORT GENERATION
// ============================================================================

export {
  ReportGenerator,
  type ReportFormat,
  type ReportOptions,
} from './report-generator';

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export { default as ConformanceCheckerDefault } from './conformance';
export { default as ReportGeneratorDefault } from './report-generator';

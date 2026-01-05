/**
 * @fileoverview Conformance Validation System
 *
 * Sistema de validación para verificar conformidad con la arquitectura
 * hexagonal y los principios de Color Intelligence.
 *
 * @module ui-kit/validation/conformance
 * @version 1.0.0
 */

import type { Result } from '../domain/types';
import { success, failure } from '../domain/types';
import type { PerceptualColor } from '../domain/perceptual';
import type { TokenCollection, DesignToken } from '../domain/tokens';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Severity levels for conformance issues.
 */
export type ConformanceSeverity = 'error' | 'warning' | 'info';

/**
 * Categories of conformance checks.
 */
export type ConformanceCategory =
  | 'architecture'
  | 'accessibility'
  | 'color-intelligence'
  | 'tokens'
  | 'performance';

/**
 * A single conformance issue.
 */
export interface ConformanceIssue {
  readonly id: string;
  readonly category: ConformanceCategory;
  readonly severity: ConformanceSeverity;
  readonly message: string;
  readonly details?: string;
  readonly location?: string;
  readonly suggestion?: string;
}

/**
 * Result of a conformance check.
 */
export interface ConformanceCheckResult {
  readonly checkId: string;
  readonly checkName: string;
  readonly passed: boolean;
  readonly issues: ConformanceIssue[];
  readonly metadata?: Record<string, unknown>;
}

/**
 * Complete conformance report.
 */
export interface ConformanceReport {
  readonly timestamp: Date;
  readonly version: string;
  readonly summary: {
    readonly totalChecks: number;
    readonly passed: number;
    readonly failed: number;
    readonly errors: number;
    readonly warnings: number;
    readonly infos: number;
  };
  readonly checks: ConformanceCheckResult[];
  readonly overallPassed: boolean;
  readonly complianceScore: number;
}

/**
 * Options for running conformance checks.
 */
export interface ConformanceOptions {
  readonly includeInfos?: boolean;
  readonly failOnWarnings?: boolean;
  readonly categories?: ConformanceCategory[];
  readonly skipChecks?: string[];
}

// ============================================================================
// CONFORMANCE CHECKER
// ============================================================================

/**
 * ConformanceChecker - Validates conformance with design system standards.
 *
 * Runs various checks to ensure:
 * - Architectural boundaries are respected
 * - Color Intelligence principles are followed
 * - Accessibility requirements are met
 * - Token standards are maintained
 *
 * @example
 * ```typescript
 * const checker = new ConformanceChecker();
 *
 * const report = await checker.runAll({
 *   tokenCollection: tokens,
 *   colors: themeColors,
 * });
 *
 * if (!report.overallPassed) {
 *   console.log('Conformance issues found:', report.summary);
 * }
 * ```
 */
export class ConformanceChecker {
  // ─────────────────────────────────────────────────────────────────────────
  // PROPERTIES
  // ─────────────────────────────────────────────────────────────────────────

  private readonly checks: Map<string, ConformanceCheck> = new Map();

  // ─────────────────────────────────────────────────────────────────────────
  // CONSTRUCTOR
  // ─────────────────────────────────────────────────────────────────────────

  constructor() {
    this.registerDefaultChecks();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC METHODS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Run all registered conformance checks.
   */
  async runAll(
    context: ConformanceContext,
    options: ConformanceOptions = {}
  ): Promise<ConformanceReport> {
    const results: ConformanceCheckResult[] = [];
    const categoriesToRun = options.categories ?? [
      'architecture',
      'accessibility',
      'color-intelligence',
      'tokens',
      'performance',
    ];
    const skipSet = new Set(options.skipChecks ?? []);

    for (const [id, check] of this.checks) {
      if (skipSet.has(id)) continue;
      if (!categoriesToRun.includes(check.category)) continue;

      const result = await check.run(context);
      results.push(result);
    }

    return this.generateReport(results, options);
  }

  /**
   * Run a specific conformance check.
   */
  async runCheck(
    checkId: string,
    context: ConformanceContext
  ): Promise<Result<ConformanceCheckResult, Error>> {
    const check = this.checks.get(checkId);
    if (!check) {
      return failure(new Error(`Check not found: ${checkId}`));
    }

    const result = await check.run(context);
    return success(result);
  }

  /**
   * Register a custom conformance check.
   */
  registerCheck(check: ConformanceCheck): void {
    this.checks.set(check.id, check);
  }

  /**
   * Get all registered check IDs.
   */
  getCheckIds(): string[] {
    return Array.from(this.checks.keys());
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PRIVATE METHODS
  // ─────────────────────────────────────────────────────────────────────────

  private registerDefaultChecks(): void {
    // Accessibility checks
    this.registerCheck(new ContrastRatioCheck());
    this.registerCheck(new ColorBlindnessCheck());

    // Color Intelligence checks
    this.registerCheck(new PerceptualUniformityCheck());
    this.registerCheck(new GamutBoundaryCheck());
    this.registerCheck(new HardcodedColorCheck());

    // Token checks
    this.registerCheck(new TokenNamingConventionCheck());
    this.registerCheck(new TokenCompletenessCheck());
    this.registerCheck(new TokenTypeValidationCheck());

    // Architecture checks
    this.registerCheck(new DependencyDirectionCheck());
    this.registerCheck(new PortContractCheck());
  }

  private generateReport(
    results: ConformanceCheckResult[],
    options: ConformanceOptions
  ): ConformanceReport {
    let errors = 0;
    let warnings = 0;
    let infos = 0;

    for (const result of results) {
      for (const issue of result.issues) {
        switch (issue.severity) {
          case 'error':
            errors++;
            break;
          case 'warning':
            warnings++;
            break;
          case 'info':
            infos++;
            break;
        }
      }
    }

    const passed = results.filter((r) => r.passed).length;
    const failed = results.filter((r) => !r.passed).length;

    const overallPassed = options.failOnWarnings
      ? errors === 0 && warnings === 0
      : errors === 0;

    const complianceScore = this.calculateComplianceScore(results);

    return {
      timestamp: new Date(),
      version: '1.0.0',
      summary: {
        totalChecks: results.length,
        passed,
        failed,
        errors,
        warnings,
        infos,
      },
      checks: results,
      overallPassed,
      complianceScore,
    };
  }

  private calculateComplianceScore(results: ConformanceCheckResult[]): number {
    if (results.length === 0) return 100;

    let totalWeight = 0;
    let earnedScore = 0;

    for (const result of results) {
      const weight = this.getCheckWeight(result.checkId);
      totalWeight += weight;

      if (result.passed) {
        earnedScore += weight;
      } else {
        // Partial credit based on issue severity
        const errorCount = result.issues.filter(
          (i) => i.severity === 'error'
        ).length;
        const warningCount = result.issues.filter(
          (i) => i.severity === 'warning'
        ).length;
        const totalIssues = result.issues.length;

        if (totalIssues > 0) {
          const severityPenalty =
            (errorCount * 1.0 + warningCount * 0.5) / totalIssues;
          earnedScore += weight * Math.max(0, 1 - severityPenalty);
        }
      }
    }

    return Math.round((earnedScore / totalWeight) * 100);
  }

  private getCheckWeight(checkId: string): number {
    const weights: Record<string, number> = {
      'contrast-ratio': 10,
      'color-blindness': 5,
      'perceptual-uniformity': 8,
      'gamut-boundary': 5,
      'hardcoded-colors': 10,
      'token-naming': 5,
      'token-completeness': 5,
      'token-type-validation': 5,
      'dependency-direction': 8,
      'port-contract': 8,
    };

    return weights[checkId] ?? 5;
  }
}

// ============================================================================
// CONFORMANCE CONTEXT
// ============================================================================

/**
 * Context provided to conformance checks.
 */
export interface ConformanceContext {
  readonly tokenCollection?: TokenCollection;
  readonly colors?: Map<string, PerceptualColor>;
  readonly themeConfig?: unknown;
  readonly sourceCode?: string[];
  readonly cssVariables?: Map<string, string>;
}

// ============================================================================
// BASE CHECK
// ============================================================================

/**
 * Base interface for conformance checks.
 */
export interface ConformanceCheck {
  readonly id: string;
  readonly name: string;
  readonly category: ConformanceCategory;
  readonly description: string;
  run(context: ConformanceContext): Promise<ConformanceCheckResult>;
}

// ============================================================================
// ACCESSIBILITY CHECKS
// ============================================================================

/**
 * Check for WCAG contrast ratio compliance.
 */
class ContrastRatioCheck implements ConformanceCheck {
  readonly id = 'contrast-ratio';
  readonly name = 'WCAG Contrast Ratio';
  readonly category: ConformanceCategory = 'accessibility';
  readonly description = 'Validates color combinations meet WCAG 2.1 AA contrast requirements';

  async run(context: ConformanceContext): Promise<ConformanceCheckResult> {
    const issues: ConformanceIssue[] = [];
    const colors = context.colors;

    if (!colors || colors.size === 0) {
      return {
        checkId: this.id,
        checkName: this.name,
        passed: true,
        issues: [],
        metadata: { skipped: true, reason: 'No colors provided' },
      };
    }

    // Check text on background combinations
    const bg = colors.get('background');
    const text = colors.get('text');
    const primary = colors.get('primary');

    if (bg && text) {
      const contrast = this.calculateContrast(bg, text);
      if (contrast < 4.5) {
        issues.push({
          id: `${this.id}-text-bg`,
          category: this.category,
          severity: 'error',
          message: `Text/background contrast ratio (${contrast.toFixed(2)}) is below WCAG AA minimum (4.5:1)`,
          location: 'colors.text / colors.background',
          suggestion: 'Increase lightness difference between text and background colors',
        });
      }
    }

    if (bg && primary) {
      const contrast = this.calculateContrast(bg, primary);
      if (contrast < 3.0) {
        issues.push({
          id: `${this.id}-primary-bg`,
          category: this.category,
          severity: 'warning',
          message: `Primary/background contrast ratio (${contrast.toFixed(2)}) may be insufficient for UI elements`,
          location: 'colors.primary / colors.background',
          suggestion: 'Consider adjusting primary color lightness for better visibility',
        });
      }
    }

    return {
      checkId: this.id,
      checkName: this.name,
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
    };
  }

  private calculateContrast(color1: PerceptualColor, color2: PerceptualColor): number {
    // Simplified contrast calculation using relative luminance
    const l1 = color1.lightness;
    const l2 = color2.lightness;
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }
}

/**
 * Check for color blindness accessibility.
 */
class ColorBlindnessCheck implements ConformanceCheck {
  readonly id = 'color-blindness';
  readonly name = 'Color Blindness Accessibility';
  readonly category: ConformanceCategory = 'accessibility';
  readonly description = 'Validates colors are distinguishable for color-blind users';

  async run(context: ConformanceContext): Promise<ConformanceCheckResult> {
    const issues: ConformanceIssue[] = [];
    const colors = context.colors;

    if (!colors || colors.size < 2) {
      return {
        checkId: this.id,
        checkName: this.name,
        passed: true,
        issues: [],
        metadata: { skipped: true, reason: 'Insufficient colors for comparison' },
      };
    }

    // Check for red/green combinations (deuteranopia/protanopia)
    const colorArray = Array.from(colors.entries());
    for (let i = 0; i < colorArray.length; i++) {
      for (let j = i + 1; j < colorArray.length; j++) {
        const [name1, color1] = colorArray[i];
        const [name2, color2] = colorArray[j];

        // Check if both are in problematic hue ranges
        if (this.isRedGreenPair(color1, color2)) {
          const lightnessDiff = Math.abs(color1.lightness - color2.lightness);
          if (lightnessDiff < 0.3) {
            issues.push({
              id: `${this.id}-${name1}-${name2}`,
              category: this.category,
              severity: 'warning',
              message: `${name1} and ${name2} may be indistinguishable for red-green color blind users`,
              location: `colors.${name1} / colors.${name2}`,
              suggestion: 'Increase lightness difference between these colors or use different hues',
            });
          }
        }
      }
    }

    return {
      checkId: this.id,
      checkName: this.name,
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
    };
  }

  private isRedGreenPair(c1: PerceptualColor, c2: PerceptualColor): boolean {
    const isRedish = (h: number) => h < 30 || h > 330;
    const isGreenish = (h: number) => h > 80 && h < 160;

    return (
      (isRedish(c1.hue) && isGreenish(c2.hue)) ||
      (isGreenish(c1.hue) && isRedish(c2.hue))
    );
  }
}

// ============================================================================
// COLOR INTELLIGENCE CHECKS
// ============================================================================

/**
 * Check for perceptual uniformity in color scales.
 */
class PerceptualUniformityCheck implements ConformanceCheck {
  readonly id = 'perceptual-uniformity';
  readonly name = 'Perceptual Uniformity';
  readonly category: ConformanceCategory = 'color-intelligence';
  readonly description = 'Validates color scales have perceptually uniform steps';

  async run(context: ConformanceContext): Promise<ConformanceCheckResult> {
    const issues: ConformanceIssue[] = [];
    const tokens = context.tokenCollection;

    if (!tokens) {
      return {
        checkId: this.id,
        checkName: this.name,
        passed: true,
        issues: [],
        metadata: { skipped: true, reason: 'No token collection provided' },
      };
    }

    // Look for color scale tokens (e.g., color.brand.100, color.brand.200, etc.)
    // First filter by type using TokenFilter, then filter for scale pattern
    const colorTokens = tokens.filter({ type: 'color' });
    const scaleTokens = colorTokens.filter(t => /\.\d{2,3}$/.test(t.name));

    // Group by prefix
    const scales = new Map<string, DesignToken[]>();
    for (const token of scaleTokens) {
      const prefix = token.name.replace(/\.\d{2,3}$/, '');
      if (!scales.has(prefix)) {
        scales.set(prefix, []);
      }
      scales.get(prefix)!.push(token);
    }

    // Check each scale for uniformity
    for (const [prefix, tokens] of scales) {
      if (tokens.length < 3) continue;

      // Sort by step number
      const sorted = tokens.sort((a, b) => {
        const stepA = parseInt(a.name.match(/\.(\d{2,3})$/)?.[1] ?? '0');
        const stepB = parseInt(b.name.match(/\.(\d{2,3})$/)?.[1] ?? '0');
        return stepA - stepB;
      });

      // Check lightness progression - extract from ColorTokenValue perceptual data
      const lightnesses = sorted.map((t) => {
        const colorValue = t.value as { type: 'color'; perceptual?: { oklch: { l: number } } };
        return colorValue.perceptual?.oklch.l ?? 0.5;
      });

      const diffs: number[] = [];
      for (let i = 1; i < lightnesses.length; i++) {
        diffs.push(Math.abs(lightnesses[i] - lightnesses[i - 1]));
      }

      const avgDiff = diffs.reduce((a, b) => a + b, 0) / diffs.length;
      const maxDeviation = Math.max(...diffs.map((d) => Math.abs(d - avgDiff)));

      if (maxDeviation > avgDiff * 0.5) {
        issues.push({
          id: `${this.id}-${prefix}`,
          category: this.category,
          severity: 'warning',
          message: `Color scale '${prefix}' has non-uniform perceptual steps`,
          details: `Max deviation: ${(maxDeviation * 100).toFixed(1)}% from average step`,
          location: prefix,
          suggestion: 'Use Color Intelligence palette generation for uniform scales',
        });
      }
    }

    return {
      checkId: this.id,
      checkName: this.name,
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
    };
  }
}

/**
 * Check for colors outside displayable gamut.
 */
class GamutBoundaryCheck implements ConformanceCheck {
  readonly id = 'gamut-boundary';
  readonly name = 'Gamut Boundary';
  readonly category: ConformanceCategory = 'color-intelligence';
  readonly description = 'Validates colors are within displayable gamut';

  async run(context: ConformanceContext): Promise<ConformanceCheckResult> {
    const issues: ConformanceIssue[] = [];
    const colors = context.colors;

    if (!colors) {
      return {
        checkId: this.id,
        checkName: this.name,
        passed: true,
        issues: [],
        metadata: { skipped: true, reason: 'No colors provided' },
      };
    }

    for (const [name, color] of colors) {
      // Check OKLCH gamut boundaries
      if (color.chroma > 0.37) {
        issues.push({
          id: `${this.id}-${name}`,
          category: this.category,
          severity: 'warning',
          message: `Color '${name}' has very high chroma (${color.chroma.toFixed(3)}) which may be outside sRGB gamut`,
          location: `colors.${name}`,
          suggestion: 'Reduce chroma or use gamut mapping for wider compatibility',
        });
      }

      // Check for invalid ranges
      if (color.lightness < 0 || color.lightness > 1) {
        issues.push({
          id: `${this.id}-${name}-lightness`,
          category: this.category,
          severity: 'error',
          message: `Color '${name}' has invalid lightness value: ${color.lightness}`,
          location: `colors.${name}`,
          suggestion: 'Lightness must be between 0 and 1',
        });
      }
    }

    return {
      checkId: this.id,
      checkName: this.name,
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
    };
  }
}

/**
 * Check for hardcoded color values.
 */
class HardcodedColorCheck implements ConformanceCheck {
  readonly id = 'hardcoded-colors';
  readonly name = 'No Hardcoded Colors';
  readonly category: ConformanceCategory = 'color-intelligence';
  readonly description = 'Validates no hardcoded color values exist outside the design system';

  async run(context: ConformanceContext): Promise<ConformanceCheckResult> {
    const issues: ConformanceIssue[] = [];
    const sourceCode = context.sourceCode ?? [];

    const hexPattern = /#[0-9A-Fa-f]{3,8}\b/g;
    const rgbPattern = /rgba?\s*\(\s*\d+/g;
    const hslPattern = /hsla?\s*\(\s*\d+/g;

    for (const code of sourceCode) {
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // Skip comments
        if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
          continue;
        }

        // Skip CSS variable definitions (these are OK)
        if (line.includes('--') && line.includes(':')) {
          continue;
        }

        // Check for hex colors
        const hexMatches = line.match(hexPattern);
        if (hexMatches) {
          for (const match of hexMatches) {
            issues.push({
              id: `${this.id}-line${i + 1}`,
              category: this.category,
              severity: 'error',
              message: `Hardcoded hex color found: ${match}`,
              location: `Line ${i + 1}`,
              suggestion: 'Use a design token or CSS variable instead',
            });
          }
        }

        // Check for rgb colors
        const rgbMatches = line.match(rgbPattern);
        if (rgbMatches) {
          issues.push({
            id: `${this.id}-rgb-line${i + 1}`,
            category: this.category,
            severity: 'error',
            message: 'Hardcoded RGB color found',
            location: `Line ${i + 1}`,
            suggestion: 'Use a design token or CSS variable instead',
          });
        }

        // Check for hsl colors
        const hslMatches = line.match(hslPattern);
        if (hslMatches) {
          issues.push({
            id: `${this.id}-hsl-line${i + 1}`,
            category: this.category,
            severity: 'error',
            message: 'Hardcoded HSL color found',
            location: `Line ${i + 1}`,
            suggestion: 'Use a design token or CSS variable instead',
          });
        }
      }
    }

    return {
      checkId: this.id,
      checkName: this.name,
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
      metadata: { filesScanned: sourceCode.length },
    };
  }
}

// ============================================================================
// TOKEN CHECKS
// ============================================================================

/**
 * Check token naming conventions.
 */
class TokenNamingConventionCheck implements ConformanceCheck {
  readonly id = 'token-naming';
  readonly name = 'Token Naming Convention';
  readonly category: ConformanceCategory = 'tokens';
  readonly description = 'Validates token paths follow naming conventions';

  async run(context: ConformanceContext): Promise<ConformanceCheckResult> {
    const issues: ConformanceIssue[] = [];
    const tokens = context.tokenCollection;

    if (!tokens) {
      return {
        checkId: this.id,
        checkName: this.name,
        passed: true,
        issues: [],
        metadata: { skipped: true, reason: 'No token collection provided' },
      };
    }

    const allTokens = tokens.getAll();
    const validPathPattern = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/;

    for (const token of allTokens) {
      // Check name format (using name which is the string, not path which is string[])
      if (!validPathPattern.test(token.name)) {
        issues.push({
          id: `${this.id}-${token.name}`,
          category: this.category,
          severity: 'warning',
          message: `Token name '${token.name}' doesn't follow naming convention`,
          suggestion: 'Use lowercase dot-separated names (e.g., color.brand.primary)',
        });
      }

      // Check for overly deep nesting (path is already string[])
      const depth = token.path.length;
      if (depth > 5) {
        issues.push({
          id: `${this.id}-depth-${token.name}`,
          category: this.category,
          severity: 'info',
          message: `Token '${token.name}' has deep nesting (${depth} levels)`,
          suggestion: 'Consider flattening token structure for easier maintenance',
        });
      }
    }

    return {
      checkId: this.id,
      checkName: this.name,
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
    };
  }
}

/**
 * Check for token completeness.
 */
class TokenCompletenessCheck implements ConformanceCheck {
  readonly id = 'token-completeness';
  readonly name = 'Token Completeness';
  readonly category: ConformanceCategory = 'tokens';
  readonly description = 'Validates required token categories are present';

  private readonly requiredCategories = [
    'color.primary',
    'color.background',
    'color.text',
  ];

  async run(context: ConformanceContext): Promise<ConformanceCheckResult> {
    const issues: ConformanceIssue[] = [];
    const tokens = context.tokenCollection;

    if (!tokens) {
      return {
        checkId: this.id,
        checkName: this.name,
        passed: true,
        issues: [],
        metadata: { skipped: true, reason: 'No token collection provided' },
      };
    }

    for (const requiredPrefix of this.requiredCategories) {
      // Use filter with name pattern since find() takes TokenFilter, not callback
      const matchingTokens = tokens.filter({ name: new RegExp(`^${requiredPrefix}`) });
      if (matchingTokens.length === 0) {
        issues.push({
          id: `${this.id}-missing-${requiredPrefix}`,
          category: this.category,
          severity: 'error',
          message: `Required token category '${requiredPrefix}' is missing`,
          suggestion: `Add tokens with names starting with '${requiredPrefix}'`,
        });
      }
    }

    return {
      checkId: this.id,
      checkName: this.name,
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
    };
  }
}

/**
 * Check token type validation.
 */
class TokenTypeValidationCheck implements ConformanceCheck {
  readonly id = 'token-type-validation';
  readonly name = 'Token Type Validation';
  readonly category: ConformanceCategory = 'tokens';
  readonly description = 'Validates token values match their declared types';

  async run(context: ConformanceContext): Promise<ConformanceCheckResult> {
    const issues: ConformanceIssue[] = [];
    const tokens = context.tokenCollection;

    if (!tokens) {
      return {
        checkId: this.id,
        checkName: this.name,
        passed: true,
        issues: [],
        metadata: { skipped: true, reason: 'No token collection provided' },
      };
    }

    const allTokens = tokens.getAll();

    for (const token of allTokens) {
      const typeError = this.validateTokenType(token);
      if (typeError) {
        issues.push({
          id: `${this.id}-${token.name}`,
          category: this.category,
          severity: 'error',
          message: typeError,
          location: token.name,
        });
      }
    }

    return {
      checkId: this.id,
      checkName: this.name,
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
    };
  }

  private validateTokenType(token: DesignToken): string | null {
    const tokenValue = token.value;
    const type = token.type;

    // TokenValue is an object with a 'type' field and type-specific properties
    // Access the actual value based on token type
    switch (type) {
      case 'color': {
        const colorVal = tokenValue as { type: 'color'; value: string };
        if (typeof colorVal.value !== 'string') {
          return `Color token must have string value, got ${typeof colorVal.value}`;
        }
        if (!/^(#|rgb|hsl|oklch|lch|lab)/.test(colorVal.value)) {
          return `Invalid color format: ${colorVal.value}`;
        }
        break;
      }

      case 'dimension': {
        const dimVal = tokenValue as { type: 'dimension'; value: number; unit: string };
        if (typeof dimVal.value !== 'number') {
          return `Dimension token must have numeric value, got ${typeof dimVal.value}`;
        }
        if (!['px', 'rem', 'em', '%', 'vw', 'vh'].includes(dimVal.unit)) {
          return `Invalid dimension unit: ${dimVal.unit}`;
        }
        break;
      }

      case 'fontFamily':
        // fontFamily tokens would have string value - validation depends on schema
        break;

      case 'fontWeight':
        // fontWeight tokens - validation depends on schema
        break;

      case 'shadow':
      case 'gradient':
      case 'composite':
        // Complex types have object values - validated by structure
        break;
    }

    return null;
  }
}

// ============================================================================
// ARCHITECTURE CHECKS
// ============================================================================

/**
 * Check dependency direction in hexagonal architecture.
 */
class DependencyDirectionCheck implements ConformanceCheck {
  readonly id = 'dependency-direction';
  readonly name = 'Dependency Direction';
  readonly category: ConformanceCategory = 'architecture';
  readonly description = 'Validates dependencies point inward (hexagonal architecture)';

  async run(context: ConformanceContext): Promise<ConformanceCheckResult> {
    const issues: ConformanceIssue[] = [];
    const sourceCode = context.sourceCode ?? [];

    // Check for imports that violate dependency direction
    // Note: domainImportInAdapter and appImportInAdapter are valid imports
    // (adapters CAN import from domain and application - they implement ports)
    const adapterImportInDomain = /from\s+['"].*\/adapters?\//;
    const infraImportInDomain = /from\s+['"].*\/infrastructure\//;

    for (const code of sourceCode) {
      const lines = code.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        // These patterns would need actual file path context to work properly
        // This is a simplified check
        if (
          line.includes('/domain/') &&
          (adapterImportInDomain.test(line) || infraImportInDomain.test(line))
        ) {
          issues.push({
            id: `${this.id}-line${i + 1}`,
            category: this.category,
            severity: 'error',
            message: 'Domain layer should not import from adapters or infrastructure',
            location: `Line ${i + 1}`,
            suggestion: 'Dependencies should point inward only',
          });
        }
      }
    }

    return {
      checkId: this.id,
      checkName: this.name,
      passed: issues.filter((i) => i.severity === 'error').length === 0,
      issues,
      metadata: { note: 'Requires source code context for full validation' },
    };
  }
}

/**
 * Check port contracts are properly defined.
 *
 * Validates:
 * - Port files export interfaces (not classes)
 * - Port interfaces use Result types for error handling
 * - Port methods are documented
 *
 * Note: Full AST validation requires TypeScript compiler API.
 * This implementation performs static analysis via regex patterns.
 */
class PortContractCheck implements ConformanceCheck {
  readonly id = 'port-contract';
  readonly name = 'Port Contract Definition';
  readonly category: ConformanceCategory = 'architecture';
  readonly description = 'Validates ports define proper contracts with Result types';

  /**
   * Pattern to detect class exports (ports should be interfaces)
   */
  private readonly classExportPattern = /export\s+class\s+\w+Port/;

  /**
   * Pattern to detect interface exports (expected for ports)
   */
  private readonly interfaceExportPattern = /export\s+interface\s+(\w+Port)/g;

  /**
   * Pattern to detect Promise returns without Result wrapper
   */
  private readonly barePromisePattern = /:\s*Promise<(?!Result)[^>]+>/;

  /**
   * Pattern to detect Result type usage
   */
  private readonly resultTypePattern = /Result<[^>]+>/;

  async run(context: ConformanceContext): Promise<ConformanceCheckResult> {
    const issues: ConformanceIssue[] = [];
    const sourceCode = context.sourceCode ?? [];

    // If no source code provided, explicitly skip with clear indication
    if (sourceCode.length === 0) {
      return {
        checkId: this.id,
        checkName: this.name,
        passed: false,  // Not passed - we didn't validate anything
        issues: [{
          id: `${this.id}-no-source`,
          category: this.category,
          severity: 'warning',
          message: 'Port contract validation skipped: no source code provided',
          details: 'Provide port file contents in context.sourceCode for validation',
          suggestion: 'Run validation with sourceCode context populated',
        }],
        metadata: {
          skipped: true,
          reason: 'No source code provided for analysis',
        },
      };
    }

    // Analyze each source file for port contract violations
    for (let fileIndex = 0; fileIndex < sourceCode.length; fileIndex++) {
      const code = sourceCode[fileIndex];

      // Check 1: Ports should be interfaces, not classes
      if (this.classExportPattern.test(code)) {
        issues.push({
          id: `${this.id}-class-port-file${fileIndex}`,
          category: this.category,
          severity: 'error',
          message: 'Port defined as class instead of interface',
          details: 'Ports in hexagonal architecture must be interfaces to enable dependency inversion',
          location: `File ${fileIndex + 1}`,
          suggestion: 'Convert "export class XxxPort" to "export interface XxxPort"',
        });
      }

      // Check 2: Find all port interfaces
      const interfaceMatches = code.matchAll(this.interfaceExportPattern);
      for (const match of interfaceMatches) {
        const portName = match[1];
        const startIndex = match.index ?? 0;

        // Extract the interface body (simplified - looks for matching braces)
        const interfaceBody = this.extractInterfaceBody(code, startIndex);

        if (interfaceBody) {
          // Check 3: Port methods should return Result types (not bare Promises)
          const methodLines = interfaceBody.split('\n');
          for (let i = 0; i < methodLines.length; i++) {
            const line = methodLines[i];

            // Skip empty lines, comments, and lines without method signatures
            if (!line.includes(':') || line.trim().startsWith('//') || line.trim().startsWith('*')) {
              continue;
            }

            // Check for bare Promise returns (should use Result<T, E>)
            if (this.barePromisePattern.test(line) && !this.resultTypePattern.test(line)) {
              issues.push({
                id: `${this.id}-bare-promise-${portName}`,
                category: this.category,
                severity: 'warning',
                message: `Port '${portName}' has method with bare Promise return type`,
                details: 'Port methods should return Result<T, E> for explicit error handling',
                location: portName,
                suggestion: 'Use Promise<Result<SuccessType, Error>> instead of Promise<SuccessType>',
              });
              break; // One warning per interface is enough
            }
          }
        }
      }

      // Check 4: Look for adapter implementations that don't implement all methods
      // (Basic check - looks for "implements XxxPort" and verifies class isn't empty)
      const implementsPattern = /class\s+\w+\s+implements\s+(\w+Port)/g;
      const implementsMatches = code.matchAll(implementsPattern);

      for (const match of implementsMatches) {
        const portName = match[1];
        const classBody = this.extractInterfaceBody(code, match.index ?? 0);

        if (classBody && classBody.split('\n').filter(l => l.trim()).length < 3) {
          issues.push({
            id: `${this.id}-empty-adapter-${portName}`,
            category: this.category,
            severity: 'error',
            message: `Adapter implementing '${portName}' appears to be empty or incomplete`,
            location: `File ${fileIndex + 1}`,
            suggestion: 'Implement all required port methods',
          });
        }
      }
    }

    // Determine pass/fail based on errors (not warnings)
    const errorCount = issues.filter(i => i.severity === 'error').length;

    return {
      checkId: this.id,
      checkName: this.name,
      passed: errorCount === 0,
      issues,
      metadata: {
        filesAnalyzed: sourceCode.length,
        validationType: 'static-regex',
        note: 'Full AST validation available via TypeScript compiler API integration',
      },
    };
  }

  /**
   * Extract interface/class body starting from a given position.
   * Simplified implementation using brace counting.
   */
  private extractInterfaceBody(code: string, startIndex: number): string | null {
    const openBrace = code.indexOf('{', startIndex);
    if (openBrace === -1) return null;

    let depth = 1;
    let pos = openBrace + 1;

    while (depth > 0 && pos < code.length) {
      if (code[pos] === '{') depth++;
      if (code[pos] === '}') depth--;
      pos++;
    }

    if (depth === 0) {
      return code.slice(openBrace + 1, pos - 1);
    }

    return null;
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
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
};

export default ConformanceChecker;

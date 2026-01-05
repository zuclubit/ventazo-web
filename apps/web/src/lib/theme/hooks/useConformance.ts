'use client';

/**
 * @fileoverview Conformance Validation Hooks
 *
 * React hooks for validating component conformance against
 * the design system governance policies. Integrates with
 * GovernanceProvider for real-time accessibility feedback.
 *
 * Features:
 * - WCAG 2.1 AA/AAA contrast validation
 * - APCA (WCAG 3.0) contrast validation
 * - Color token conformance checking
 * - Component accessibility auditing
 * - Real-time violation feedback
 *
 * @module web/lib/theme/hooks/useConformance
 * @version 1.0.0
 */

import * as React from 'react';
import {
  useGovernanceOptional,
  useAccessibilityValidation,
  useApcaContrast,
  type GovernanceViolation,
  type PerceptualAccessibility,
} from '../GovernanceProvider';
import { validateAccessibility, getApcaContrast } from '../color-utils';

// ============================================================================
// TYPES
// ============================================================================

/**
 * WCAG conformance level.
 */
export type WcagLevel = 'A' | 'AA' | 'AAA';

/**
 * Text size category for WCAG validation.
 */
export type TextSize = 'normal' | 'large';

/**
 * Conformance result for a color pair.
 */
export interface ConformanceResult {
  /** Whether the color pair passes */
  passes: boolean;
  /** WCAG 2.1 contrast ratio */
  wcagRatio: number;
  /** APCA Lc (Lightness Contrast) value */
  apcaLc: number;
  /** Achieved WCAG level */
  wcagLevel: WcagLevel | null;
  /** APCA passes for body text */
  apcaBodyText: boolean;
  /** APCA passes for large text */
  apcaLargeText: boolean;
  /** Specific issues found */
  issues: string[];
  /** Suggestions for improvement */
  suggestions: string[];
}

/**
 * Token conformance result.
 */
export interface TokenConformanceResult {
  /** Token name */
  tokenName: string;
  /** Token value */
  value: string;
  /** Whether the token conforms */
  conforms: boolean;
  /** Violations found */
  violations: GovernanceViolation[];
  /** Warnings */
  warnings: string[];
}

/**
 * Component audit result.
 */
export interface ComponentAuditResult {
  /** Component name */
  componentName: string;
  /** Total checks performed */
  totalChecks: number;
  /** Passed checks */
  passedChecks: number;
  /** Failed checks */
  failedChecks: number;
  /** Conformance score (0-100) */
  score: number;
  /** Individual check results */
  checks: {
    name: string;
    passed: boolean;
    message: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
  }[];
}

// ============================================================================
// CONFORMANCE HOOKS
// ============================================================================

/**
 * Hook for validating color pair conformance.
 * Provides comprehensive accessibility validation including WCAG 2.1 and APCA.
 *
 * @example
 * ```tsx
 * function ColorPicker({ foreground, background }) {
 *   const conformance = useColorConformance(foreground, background, 'AA');
 *
 *   return (
 *     <div>
 *       {!conformance.passes && (
 *         <Warning>{conformance.suggestions[0]}</Warning>
 *       )}
 *     </div>
 *   );
 * }
 * ```
 */
export function useColorConformance(
  foreground: string | undefined,
  background: string | undefined,
  requiredLevel: WcagLevel = 'AA',
  textSize: TextSize = 'normal'
): ConformanceResult | null {
  const accessibility = useAccessibilityValidation(foreground, background);

  return React.useMemo(() => {
    if (!foreground || !background || !accessibility) {
      return null;
    }

    const issues: string[] = [];
    const suggestions: string[] = [];

    // Determine required ratios based on level and text size
    const requiredRatios = {
      A: { normal: 3.0, large: 3.0 },
      AA: { normal: 4.5, large: 3.0 },
      AAA: { normal: 7.0, large: 4.5 },
    };

    const requiredRatio = requiredRatios[requiredLevel][textSize];
    const wcagRatio = accessibility.wcag21.contrastRatio;
    const apcaLc = accessibility.apca.absoluteLc;

    // Check WCAG compliance
    let wcagLevel: WcagLevel | null = null;
    if (wcagRatio >= 7.0) wcagLevel = 'AAA';
    else if (wcagRatio >= 4.5) wcagLevel = 'AA';
    else if (wcagRatio >= 3.0) wcagLevel = 'A';

    const wcagPasses = wcagRatio >= requiredRatio;

    // Check APCA compliance (using Lc thresholds)
    // Body text: Lc >= 60, Large text: Lc >= 45
    const apcaBodyThreshold = 60;
    const apcaLargeThreshold = 45;
    const apcaBodyText = apcaLc >= apcaBodyThreshold;
    const apcaLargeText = apcaLc >= apcaLargeThreshold;
    const apcaPasses = textSize === 'large' ? apcaLargeText : apcaBodyText;

    // Collect issues
    if (!wcagPasses) {
      issues.push(
        `WCAG ${requiredLevel}: Contrast ratio ${wcagRatio.toFixed(2)} is below required ${requiredRatio.toFixed(1)}`
      );
      suggestions.push(
        wcagRatio < requiredRatio * 0.7
          ? 'Consider significantly adjusting colors for better contrast'
          : 'Slight adjustment needed to meet contrast requirements'
      );
    }

    if (!apcaPasses) {
      issues.push(
        `APCA: Lc value ${apcaLc.toFixed(1)} is below threshold for ${textSize} text`
      );
      suggestions.push('Consider using darker text or lighter background');
    }

    // Overall pass requires both WCAG and APCA
    const passes = wcagPasses && apcaPasses;

    if (passes && issues.length === 0) {
      suggestions.push('Color combination meets accessibility requirements');
    }

    return {
      passes,
      wcagRatio,
      apcaLc,
      wcagLevel,
      apcaBodyText,
      apcaLargeText,
      issues,
      suggestions,
    };
  }, [foreground, background, accessibility, requiredLevel, textSize]);
}

/**
 * Hook for batch validating multiple color pairs.
 * Useful for validating an entire component's color scheme.
 *
 * @example
 * ```tsx
 * function ThemeValidator({ colors }) {
 *   const results = useBatchConformance([
 *     { fg: colors.text, bg: colors.background, name: 'Body text' },
 *     { fg: colors.heading, bg: colors.background, name: 'Heading' },
 *   ]);
 *
 *   const failedPairs = results.filter(r => !r.result?.passes);
 *   // Show warnings for failed pairs...
 * }
 * ```
 */
export function useBatchConformance(
  colorPairs: Array<{
    fg: string;
    bg: string;
    name: string;
    level?: WcagLevel;
    textSize?: TextSize;
  }>
): Array<{
  name: string;
  fg: string;
  bg: string;
  result: ConformanceResult | null;
}> {
  return React.useMemo(() => {
    return colorPairs.map((pair) => {
      const accessibility = validateAccessibility(pair.fg, pair.bg);

      const issues: string[] = [];
      const suggestions: string[] = [];
      const level = pair.level ?? 'AA';
      const textSize = pair.textSize ?? 'normal';

      const requiredRatios = {
        A: { normal: 3.0, large: 3.0 },
        AA: { normal: 4.5, large: 3.0 },
        AAA: { normal: 7.0, large: 4.5 },
      };

      const requiredRatio = requiredRatios[level][textSize];
      const wcagRatio = accessibility.wcag21.contrastRatio;
      const apcaLc = accessibility.apca.absoluteLc;

      let wcagLevel: WcagLevel | null = null;
      if (wcagRatio >= 7.0) wcagLevel = 'AAA';
      else if (wcagRatio >= 4.5) wcagLevel = 'AA';
      else if (wcagRatio >= 3.0) wcagLevel = 'A';

      const wcagPasses = wcagRatio >= requiredRatio;
      const apcaBodyText = apcaLc >= 60;
      const apcaLargeText = apcaLc >= 45;
      const apcaPasses = textSize === 'large' ? apcaLargeText : apcaBodyText;

      if (!wcagPasses) {
        issues.push(`WCAG ${level}: ${wcagRatio.toFixed(2)} < ${requiredRatio}`);
      }
      if (!apcaPasses) {
        issues.push(`APCA: Lc ${apcaLc.toFixed(1)} below threshold`);
      }

      return {
        name: pair.name,
        fg: pair.fg,
        bg: pair.bg,
        result: {
          passes: wcagPasses && apcaPasses,
          wcagRatio,
          apcaLc,
          wcagLevel,
          apcaBodyText,
          apcaLargeText,
          issues,
          suggestions,
        },
      };
    });
  }, [colorPairs]);
}

/**
 * Hook for real-time conformance feedback during color editing.
 * Provides debounced validation to prevent excessive calculations.
 *
 * @example
 * ```tsx
 * function ColorEditor({ onChange }) {
 *   const [color, setColor] = useState('#3B82F6');
 *   const { feedback, isValidating } = useLiveConformance(color, '#FFFFFF');
 *
 *   return (
 *     <div>
 *       <input value={color} onChange={e => setColor(e.target.value)} />
 *       {isValidating && <Spinner />}
 *       {feedback && <FeedbackPanel {...feedback} />}
 *     </div>
 *   );
 * }
 * ```
 */
export function useLiveConformance(
  foreground: string | undefined,
  background: string | undefined,
  debounceMs: number = 150
): {
  feedback: ConformanceResult | null;
  isValidating: boolean;
} {
  const [feedback, setFeedback] = React.useState<ConformanceResult | null>(null);
  const [isValidating, setIsValidating] = React.useState(false);

  React.useEffect(() => {
    if (!foreground || !background) {
      setFeedback(null);
      return;
    }

    setIsValidating(true);

    const timeoutId = setTimeout(() => {
      try {
        const accessibility = validateAccessibility(foreground, background);
        const wcagRatio = accessibility.wcag21.contrastRatio;
        const apcaLc = accessibility.apca.absoluteLc;

        let wcagLevel: WcagLevel | null = null;
        if (wcagRatio >= 7.0) wcagLevel = 'AAA';
        else if (wcagRatio >= 4.5) wcagLevel = 'AA';
        else if (wcagRatio >= 3.0) wcagLevel = 'A';

        const passes = wcagRatio >= 4.5 && apcaLc >= 60;
        const issues: string[] = [];
        const suggestions: string[] = [];

        if (wcagRatio < 4.5) {
          issues.push(`Contrast ratio ${wcagRatio.toFixed(2)} below 4.5:1`);
          suggestions.push('Increase contrast for better readability');
        }

        if (apcaLc < 60) {
          issues.push(`APCA Lc ${apcaLc.toFixed(1)} below 60`);
          suggestions.push('Adjust colors for perceptual contrast');
        }

        setFeedback({
          passes,
          wcagRatio,
          apcaLc,
          wcagLevel,
          apcaBodyText: apcaLc >= 60,
          apcaLargeText: apcaLc >= 45,
          issues,
          suggestions,
        });
      } catch {
        setFeedback(null);
      } finally {
        setIsValidating(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timeoutId);
      setIsValidating(false);
    };
  }, [foreground, background, debounceMs]);

  return { feedback, isValidating };
}

/**
 * Hook for auditing a component's color scheme against governance policies.
 * Returns a comprehensive audit report.
 *
 * @example
 * ```tsx
 * function ComponentPreview({ component }) {
 *   const audit = useComponentAudit('Button', {
 *     'text-on-primary': { fg: colors.white, bg: colors.primary },
 *     'text-on-surface': { fg: colors.text, bg: colors.surface },
 *   });
 *
 *   return (
 *     <div>
 *       <ScoreBadge score={audit.score} />
 *       {audit.checks.filter(c => !c.passed).map(c => (
 *         <Warning key={c.name}>{c.message}</Warning>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useComponentAudit(
  componentName: string,
  colorPairs: Record<string, { fg: string; bg: string }>
): ComponentAuditResult {
  const governance = useGovernanceOptional();

  return React.useMemo(() => {
    const checks: ComponentAuditResult['checks'] = [];
    let passedChecks = 0;

    // Validate each color pair
    for (const [pairName, { fg, bg }] of Object.entries(colorPairs)) {
      try {
        const accessibility = validateAccessibility(fg, bg);
        const wcagRatio = accessibility.wcag21.contrastRatio;
        const apcaLc = accessibility.apca.absoluteLc;

        // WCAG AA check
        const wcagPasses = wcagRatio >= 4.5;
        checks.push({
          name: `${pairName}: WCAG AA`,
          passed: wcagPasses,
          message: wcagPasses
            ? `Contrast ${wcagRatio.toFixed(2)}:1 meets AA`
            : `Contrast ${wcagRatio.toFixed(2)}:1 fails AA (needs 4.5:1)`,
          severity: wcagPasses ? 'info' : 'error',
        });
        if (wcagPasses) passedChecks++;

        // APCA body text check
        const apcaPasses = apcaLc >= 60;
        checks.push({
          name: `${pairName}: APCA Body`,
          passed: apcaPasses,
          message: apcaPasses
            ? `APCA Lc ${apcaLc.toFixed(1)} meets body text`
            : `APCA Lc ${apcaLc.toFixed(1)} fails body text (needs 60)`,
          severity: apcaPasses ? 'info' : 'warning',
        });
        if (apcaPasses) passedChecks++;

        // WCAG AAA check (aspirational)
        const wcagAAA = wcagRatio >= 7.0;
        checks.push({
          name: `${pairName}: WCAG AAA`,
          passed: wcagAAA,
          message: wcagAAA
            ? `Contrast ${wcagRatio.toFixed(2)}:1 meets AAA`
            : `Contrast ${wcagRatio.toFixed(2)}:1 below AAA (7.0:1)`,
          severity: wcagAAA ? 'info' : 'info', // AAA is aspirational
        });
        if (wcagAAA) passedChecks++;
      } catch {
        checks.push({
          name: `${pairName}: Validation`,
          passed: false,
          message: 'Invalid color format',
          severity: 'critical',
        });
      }
    }

    // Check governance if available
    if (governance?.lastEvaluation) {
      const violations = governance.lastEvaluation.governance.violations;
      const componentViolations = violations.filter((v) =>
        v.component === componentName || v.message.toLowerCase().includes(componentName.toLowerCase())
      );

      for (const violation of componentViolations) {
        checks.push({
          name: `Governance: ${violation.code}`,
          passed: false,
          message: violation.message,
          severity: violation.severity === 'critical' ? 'critical' : 'error',
        });
      }
    }

    const totalChecks = checks.length;
    const score = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 100;

    return {
      componentName,
      totalChecks,
      passedChecks,
      failedChecks: totalChecks - passedChecks,
      score,
      checks,
    };
  }, [componentName, colorPairs, governance]);
}

/**
 * Hook for checking if colors conform to design tokens.
 * Validates that used colors match the design system.
 *
 * @example
 * ```tsx
 * function ColorUsageValidator({ usedColors }) {
 *   const conformance = useTokenConformance(usedColors);
 *
 *   const nonConforming = conformance.filter(c => !c.conforms);
 *   if (nonConforming.length > 0) {
 *     console.warn('Non-standard colors detected:', nonConforming);
 *   }
 * }
 * ```
 */
export function useTokenConformance(
  colors: Array<{ name: string; value: string }>
): TokenConformanceResult[] {
  const governance = useGovernanceOptional();

  return React.useMemo(() => {
    return colors.map((color) => {
      const violations: GovernanceViolation[] = [];
      const warnings: string[] = [];

      // Check if color is a CSS variable reference
      const isCssVar = color.value.startsWith('var(');

      if (!isCssVar) {
        // Check if it's a valid hex color
        const isValidHex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color.value);

        if (!isValidHex) {
          violations.push({
            code: 'INVALID_COLOR_FORMAT',
            message: `${color.name}: Invalid color format "${color.value}"`,
            severity: 'high',
            path: color.name,
          });
        } else {
          // Warn about hardcoded colors
          warnings.push(
            `${color.name}: Consider using CSS variable instead of hardcoded "${color.value}"`
          );
        }
      }

      // Check governance violations if available
      if (governance?.lastEvaluation) {
        const relatedViolations = governance.lastEvaluation.governance.violations.filter(
          (v) => v.path === color.name || v.message.includes(color.value)
        );
        violations.push(...relatedViolations);
      }

      return {
        tokenName: color.name,
        value: color.value,
        conforms: violations.length === 0,
        violations,
        warnings,
      };
    });
  }, [colors, governance]);
}

/**
 * Hook for accessibility score calculation.
 * Returns an overall accessibility score for a set of color pairs.
 *
 * @example
 * ```tsx
 * function AccessibilityScoreCard({ colorScheme }) {
 *   const { score, grade, details } = useAccessibilityScore(colorScheme);
 *
 *   return (
 *     <Card>
 *       <h3>Accessibility Score</h3>
 *       <Score value={score} grade={grade} />
 *       <Details items={details} />
 *     </Card>
 *   );
 * }
 * ```
 */
export function useAccessibilityScore(
  colorPairs: Array<{ fg: string; bg: string; weight?: number }>
): {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  details: Array<{
    wcagRatio: number;
    apcaLc: number;
    weight: number;
    contribution: number;
  }>;
} {
  return React.useMemo(() => {
    if (colorPairs.length === 0) {
      return {
        score: 100,
        grade: 'A' as const,
        details: [],
      };
    }

    const details: Array<{
      wcagRatio: number;
      apcaLc: number;
      weight: number;
      contribution: number;
    }> = [];

    let totalWeight = 0;
    let weightedScore = 0;

    for (const pair of colorPairs) {
      try {
        const accessibility = validateAccessibility(pair.fg, pair.bg);
        const wcagRatio = accessibility.wcag21.contrastRatio;
        const apcaLc = accessibility.apca.absoluteLc;
        const weight = pair.weight ?? 1;

        // Calculate score (0-100) based on both WCAG and APCA
        // WCAG: 4.5 = 70 points, 7.0 = 100 points
        // APCA: 60 = 30 points bonus
        let pairScore = Math.min(100, (wcagRatio / 7.0) * 70);
        if (apcaLc >= 60) pairScore += 30;
        pairScore = Math.min(100, pairScore);

        const contribution = pairScore * weight;
        weightedScore += contribution;
        totalWeight += weight;

        details.push({
          wcagRatio,
          apcaLc,
          weight,
          contribution,
        });
      } catch {
        // Invalid color pair, score 0
        const weight = pair.weight ?? 1;
        totalWeight += weight;
        details.push({
          wcagRatio: 0,
          apcaLc: 0,
          weight,
          contribution: 0,
        });
      }
    }

    const score = totalWeight > 0 ? Math.round(weightedScore / totalWeight) : 0;

    // Assign grade
    let grade: 'A' | 'B' | 'C' | 'D' | 'F';
    if (score >= 90) grade = 'A';
    else if (score >= 80) grade = 'B';
    else if (score >= 70) grade = 'C';
    else if (score >= 60) grade = 'D';
    else grade = 'F';

    return { score, grade, details };
  }, [colorPairs]);
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  WcagLevel,
  TextSize,
  ConformanceResult,
  TokenConformanceResult,
  ComponentAuditResult,
};

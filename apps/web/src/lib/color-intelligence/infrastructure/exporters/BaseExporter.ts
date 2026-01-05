// ============================================
// Base Exporter
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Abstract base class for all token exporters.
// Provides common functionality:
// - Metadata generation
// - Policy compliance checking
// - Color space conversion helpers
// - Validation utilities
//
// ============================================

import type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  ExportMetadata,
  ExportFile,
  GovernedExportResult,
  ValidationResult,
  PolicyComplianceReport,
  TokenPalette,
  ColorToken,
  Token,
  ColorSpaceExport,
  ITokenExporter,
} from './types';
import type { PerceptualPolicy } from '../../domain/governance/types/policy';
import type { CompositePolicy } from '../../domain/governance/types/policy-composition';

// ============================================
// Constants
// ============================================

const GENERATOR_VERSION = '1.0.0';
const APCA_VERSION = '0.1.9';

const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  colorSpace: 'hex',
  includeAccessibility: true,
  includeDeprecated: false,
  minify: false,
  includeHeaders: true,
};

// ============================================
// Base Exporter Class
// ============================================

/**
 * Abstract base class for token exporters
 *
 * Subclasses must implement:
 * - export(): Generate format-specific output
 * - validate(): Validate imported tokens
 * - getSupportedColorSpaces(): Return supported spaces
 */
export abstract class BaseExporter implements ITokenExporter {
  abstract readonly format: ExportFormat;
  abstract readonly version: string;

  /**
   * Export tokens to format (must be implemented by subclass)
   */
  abstract export(palette: TokenPalette, options?: ExportOptions): ExportResult;

  /**
   * Validate token structure (must be implemented by subclass)
   */
  abstract validate(tokens: unknown): ValidationResult;

  /**
   * Get supported color spaces (must be implemented by subclass)
   */
  abstract getSupportedColorSpaces(): ReadonlyArray<ColorSpaceExport>;

  /**
   * Export with governance policy enforcement
   */
  exportWithGovernance(
    palette: TokenPalette,
    policy: PerceptualPolicy | CompositePolicy,
    options?: ExportOptions
  ): GovernedExportResult {
    // Check compliance first
    const complianceReport = this.checkCompliance(palette, policy);

    // If not compliant and policy is strict, block
    const isStrict = policy.enforcement === 'strict';
    const blocked = !complianceReport.compliant && isStrict;

    // Get base export
    const baseExport = this.export(palette, options);

    return {
      ...baseExport,
      policyCompliance: complianceReport,
      blocked,
      adjustments: [], // Adjustments would be applied by governance engine
    };
  }

  // ============================================
  // Protected Helper Methods
  // ============================================

  /**
   * Merge options with defaults
   */
  protected mergeOptions(options?: ExportOptions): Required<ExportOptions> {
    return {
      ...DEFAULT_EXPORT_OPTIONS,
      ...options,
      platform: {
        ...DEFAULT_EXPORT_OPTIONS.platform,
        ...options?.platform,
      },
    } as Required<ExportOptions>;
  }

  /**
   * Generate export metadata
   */
  protected generateMetadata(
    palette: TokenPalette,
    options: Required<ExportOptions>,
    policy?: PerceptualPolicy | CompositePolicy
  ): ExportMetadata {
    const tokenCount = this.countTokens(palette);
    const colorSpaces: ColorSpaceExport[] = [options.colorSpace || 'hex'];

    // Determine accessibility levels from tokens
    const accessibilityInfo = this.analyzeAccessibility(palette);

    return {
      format: this.format,
      generatedAt: new Date().toISOString(),
      generatorVersion: GENERATOR_VERSION,
      policyId: policy?.id,
      policyVersion: policy?.version,
      apcaVersion: APCA_VERSION,
      colorSpaces,
      accessibilityLevel: accessibilityInfo.wcagLevel,
      wcag3Tier: accessibilityInfo.wcag3Tier,
      tokenCount,
    };
  }

  /**
   * Count total tokens in palette
   */
  protected countTokens(palette: TokenPalette): number {
    let count = 0;

    const countGroup = (group: TokenPalette['groups'][number]): void => {
      count += group.tokens.length;
      group.subgroups?.forEach(countGroup);
    };

    palette.groups.forEach(countGroup);
    return count;
  }

  /**
   * Analyze accessibility levels of color tokens
   */
  protected analyzeAccessibility(palette: TokenPalette): {
    wcagLevel?: 'A' | 'AA' | 'AAA';
    wcag3Tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  } {
    const colorTokens = this.extractColorTokens(palette);

    if (colorTokens.length === 0) {
      return {};
    }

    // Find minimum levels across all tokens
    let minWcagLevel: 'A' | 'AA' | 'AAA' | undefined;
    let minWcag3Tier: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' | undefined;

    const wcagOrder = { Fail: 0, A: 1, AA: 2, AAA: 3 };
    const tierOrder = { Fail: 0, Bronze: 1, Silver: 2, Gold: 3, Platinum: 4 };

    for (const token of colorTokens) {
      if (token.accessibility?.wcagLevel && token.accessibility.wcagLevel !== 'Fail') {
        const level = token.accessibility.wcagLevel;
        if (!minWcagLevel || wcagOrder[level] < wcagOrder[minWcagLevel]) {
          minWcagLevel = level;
        }
      }

      if (token.accessibility?.wcag3Tier && token.accessibility.wcag3Tier !== 'Fail') {
        const tier = token.accessibility.wcag3Tier;
        if (!minWcag3Tier || tierOrder[tier] < tierOrder[minWcag3Tier]) {
          minWcag3Tier = tier;
        }
      }
    }

    return {
      wcagLevel: minWcagLevel,
      wcag3Tier: minWcag3Tier,
    };
  }

  /**
   * Extract all color tokens from palette
   */
  protected extractColorTokens(palette: TokenPalette): ReadonlyArray<ColorToken> {
    const colorTokens: ColorToken[] = [];

    const extractFromGroup = (group: TokenPalette['groups'][number]): void => {
      for (const token of group.tokens) {
        if (token.type === 'color') {
          colorTokens.push(token);
        }
      }
      group.subgroups?.forEach(extractFromGroup);
    };

    palette.groups.forEach(extractFromGroup);
    return colorTokens;
  }

  /**
   * Check policy compliance for palette
   */
  protected checkCompliance(
    palette: TokenPalette,
    policy: PerceptualPolicy | CompositePolicy
  ): PolicyComplianceReport {
    // Use mutable array for collection, will be readonly in return type
    const violations: Array<{
      tokenName: string;
      rule: string;
      expected: string;
      actual: string;
      severity: 'error' | 'warning' | 'info';
    }> = [];
    const colorTokens = this.extractColorTokens(palette);

    // Check requirements from policy
    const requirements = policy.requirements as Record<string, unknown>;

    for (const token of colorTokens) {
      // Check minimum contrast ratio
      if (
        requirements['minContrastRatio'] &&
        token.accessibility?.contrastRatio !== undefined
      ) {
        const minRatio = requirements['minContrastRatio'] as number;
        if (token.accessibility.contrastRatio < minRatio) {
          violations.push({
            tokenName: token.name,
            rule: 'minContrastRatio',
            expected: `≥ ${minRatio}:1`,
            actual: `${token.accessibility.contrastRatio.toFixed(2)}:1`,
            severity: 'error',
          });
        }
      }

      // Check minimum APCA Lc
      if (requirements['minApcaLc'] && token.accessibility?.apcaLc !== undefined) {
        const minLc = requirements['minApcaLc'] as number;
        if (token.accessibility.apcaLc < minLc) {
          violations.push({
            tokenName: token.name,
            rule: 'minApcaLc',
            expected: `≥ Lc ${minLc}`,
            actual: `Lc ${token.accessibility.apcaLc.toFixed(1)}`,
            severity: 'error',
          });
        }
      }

      // Check minimum WCAG level
      if (requirements['minWcagLevel'] && token.accessibility?.wcagLevel) {
        const wcagOrder = { Fail: 0, A: 1, AA: 2, AAA: 3 };
        const minLevel = requirements['minWcagLevel'] as keyof typeof wcagOrder;
        const actualLevel = token.accessibility.wcagLevel;

        if (wcagOrder[actualLevel] < wcagOrder[minLevel]) {
          violations.push({
            tokenName: token.name,
            rule: 'minWcagLevel',
            expected: minLevel,
            actual: actualLevel,
            severity: 'error',
          });
        }
      }
    }

    return {
      policyId: policy.id,
      policyVersion: policy.version,
      compliant: violations.length === 0,
      violations,
      checkedAt: new Date().toISOString(),
    };
  }

  /**
   * Generate header comment
   */
  protected generateHeader(metadata: ExportMetadata): string {
    const lines = [
      '/**',
      ` * Generated by Color Intelligence v${GENERATOR_VERSION}`,
      ` * Format: ${metadata.format}`,
      ` * Generated: ${metadata.generatedAt}`,
    ];

    if (metadata.policyId) {
      lines.push(` * Policy: ${metadata.policyId} v${metadata.policyVersion}`);
    }

    if (metadata.accessibilityLevel) {
      lines.push(` * WCAG Level: ${metadata.accessibilityLevel}`);
    }

    if (metadata.wcag3Tier) {
      lines.push(` * WCAG 3.0 Tier: ${metadata.wcag3Tier}`);
    }

    lines.push(` * Token Count: ${metadata.tokenCount}`);
    lines.push(' */');

    return lines.join('\n');
  }

  /**
   * Convert token name to various cases
   */
  protected convertCase(
    name: string,
    targetCase: 'camel' | 'pascal' | 'kebab' | 'snake' | 'constant'
  ): string {
    // Split on common separators
    const parts = name
      .replace(/([a-z])([A-Z])/g, '$1-$2')
      .toLowerCase()
      .split(/[-_\s]+/)
      .filter(Boolean);

    switch (targetCase) {
      case 'camel':
        return parts
          .map((p, i) => (i === 0 ? p : p.charAt(0).toUpperCase() + p.slice(1)))
          .join('');

      case 'pascal':
        return parts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join('');

      case 'kebab':
        return parts.join('-');

      case 'snake':
        return parts.join('_');

      case 'constant':
        return parts.join('_').toUpperCase();

      default:
        return name;
    }
  }

  /**
   * Convert color to specified format
   */
  protected formatColor(token: ColorToken, colorSpace: ColorSpaceExport): string {
    const { value } = token;

    switch (colorSpace) {
      case 'hex':
        return value.hex;

      case 'rgb':
        if (value.rgb) {
          const { r, g, b } = value.rgb;
          return `rgb(${r}, ${g}, ${b})`;
        }
        return value.hex;

      case 'hsl':
        if (value.hsl) {
          const { h, s, l } = value.hsl;
          return `hsl(${h}, ${s}%, ${l}%)`;
        }
        return value.hex;

      case 'oklch':
        if (value.oklch) {
          const { L, C, h } = value.oklch;
          return `oklch(${(L * 100).toFixed(1)}% ${C.toFixed(3)} ${h.toFixed(1)})`;
        }
        return value.hex;

      case 'hct':
        if (value.hct) {
          const { H, C, T } = value.hct;
          return `hct(${H.toFixed(1)} ${C.toFixed(1)} ${T.toFixed(1)})`;
        }
        return value.hex;

      case 'srgb':
        if (value.rgb) {
          const { r, g, b } = value.rgb;
          return `color(srgb ${(r / 255).toFixed(4)} ${(g / 255).toFixed(4)} ${(b / 255).toFixed(4)})`;
        }
        return value.hex;

      default:
        return value.hex;
    }
  }

  /**
   * Create a validation error
   */
  protected createValidationError(
    path: string,
    message: string,
    code: string
  ): ValidationResult['errors'][number] {
    return { path, message, code };
  }

  /**
   * Create a validation warning
   */
  protected createValidationWarning(
    path: string,
    message: string,
    code: string
  ): ValidationResult['warnings'][number] {
    return { path, message, code };
  }

  /**
   * Create empty export result
   */
  protected createEmptyResult(
    metadata: ExportMetadata,
    warning: string
  ): ExportResult {
    return {
      format: this.format,
      content: '',
      metadata,
      files: [],
      warnings: [warning],
    };
  }

  /**
   * Create export file
   */
  protected createFile(
    path: string,
    content: string,
    format: ExportFile['format']
  ): ExportFile {
    return {
      path,
      content,
      format,
      encoding: 'utf-8',
    };
  }
}

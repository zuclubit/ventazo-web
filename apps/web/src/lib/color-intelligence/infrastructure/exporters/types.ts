// ============================================
// Exporter Types
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Types for design token exporters supporting:
// - W3C Design Token Community Group (DTCG)
// - Amazon Style Dictionary
// - Figma Tokens
// - Tailwind CSS
// - Plain CSS Variables
//
// ============================================

import type { PerceptualPolicy } from '../../domain/governance/types/policy';
import type { CompositePolicy } from '../../domain/governance/types/policy-composition';
import type { ContrastDecision } from '../../application/governance';

// ============================================
// Export Formats
// ============================================

/**
 * Supported export formats
 */
export type ExportFormat =
  | 'design-tokens'      // W3C DTCG (Design Token Community Group)
  | 'style-dictionary'   // Amazon Style Dictionary
  | 'figma-tokens'       // Figma Tokens plugin
  | 'tailwind'           // Tailwind CSS config
  | 'css-variables';     // Plain CSS custom properties

/**
 * Color space options for export
 */
export type ColorSpaceExport = 'oklch' | 'hct' | 'srgb' | 'hex' | 'rgb' | 'hsl';

// ============================================
// Token Types
// ============================================

/**
 * Base token structure
 */
export interface BaseToken {
  readonly name: string;
  readonly description?: string;
  readonly deprecated?: boolean;
  readonly extensions?: Record<string, unknown>;
}

/**
 * Color token value
 */
export interface ColorTokenValue {
  readonly hex: string;
  readonly rgb?: { r: number; g: number; b: number };
  readonly hsl?: { h: number; s: number; l: number };
  readonly oklch?: { L: number; C: number; h: number };
  readonly hct?: { H: number; C: number; T: number };
}

/**
 * Color token with full metadata
 */
export interface ColorToken extends BaseToken {
  readonly type: 'color';
  readonly value: ColorTokenValue;
  readonly accessibility?: {
    readonly contrastRatio?: number;
    readonly apcaLc?: number;
    readonly wcagLevel?: 'Fail' | 'A' | 'AA' | 'AAA';
    readonly wcag3Tier?: 'Fail' | 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
    readonly pairedWith?: string; // Token name of paired color
  };
}

/**
 * Dimension token (spacing, sizing)
 */
export interface DimensionToken extends BaseToken {
  readonly type: 'dimension';
  readonly value: number;
  readonly unit: 'px' | 'rem' | 'em' | '%';
}

/**
 * Typography token
 */
export interface TypographyToken extends BaseToken {
  readonly type: 'typography';
  readonly value: {
    readonly fontFamily: string;
    readonly fontSize: string;
    readonly fontWeight: number | string;
    readonly lineHeight: string | number;
    readonly letterSpacing?: string;
  };
}

/**
 * Shadow token
 */
export interface ShadowToken extends BaseToken {
  readonly type: 'shadow';
  readonly value: {
    readonly offsetX: string;
    readonly offsetY: string;
    readonly blur: string;
    readonly spread: string;
    readonly color: string;
    readonly inset?: boolean;
  };
}

/**
 * Any token type
 */
export type Token = ColorToken | DimensionToken | TypographyToken | ShadowToken;

/**
 * Token group (collection of tokens)
 */
export interface TokenGroup {
  readonly name: string;
  readonly description?: string;
  readonly tokens: ReadonlyArray<Token>;
  readonly subgroups?: ReadonlyArray<TokenGroup>;
}

/**
 * Complete token palette
 */
export interface TokenPalette {
  readonly name: string;
  readonly description?: string;
  readonly version: string;
  readonly groups: ReadonlyArray<TokenGroup>;
  readonly metadata?: TokenPaletteMetadata;
}

/**
 * Palette metadata
 */
export interface TokenPaletteMetadata {
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly author?: string;
  readonly license?: string;
  readonly source?: string;
}

// ============================================
// Export Options
// ============================================

/**
 * Export options
 */
export interface ExportOptions {
  /** Output color space */
  readonly colorSpace?: ColorSpaceExport;
  /** Include accessibility metadata */
  readonly includeAccessibility?: boolean;
  /** Include deprecated tokens */
  readonly includeDeprecated?: boolean;
  /** Minify output */
  readonly minify?: boolean;
  /** Add header comments */
  readonly includeHeaders?: boolean;
  /** Custom file extension */
  readonly extension?: string;
  /** Platform-specific options */
  readonly platform?: PlatformOptions;
}

/**
 * Platform-specific export options
 */
export interface PlatformOptions {
  readonly web?: {
    readonly cssPrefix?: string;
    readonly useCustomProperties?: boolean;
    readonly fallbackColors?: boolean;
  };
  readonly ios?: {
    readonly useAssetCatalog?: boolean;
    readonly swiftVersion?: '5.0' | '5.5' | '5.9';
  };
  readonly android?: {
    readonly useCompose?: boolean;
    readonly minSdk?: number;
  };
}

// ============================================
// Export Results
// ============================================

/**
 * Export metadata
 */
export interface ExportMetadata {
  readonly format: ExportFormat;
  readonly generatedAt: string;
  readonly generatorVersion: string;
  readonly policyId?: string;
  readonly policyVersion?: string;
  readonly apcaVersion: string;
  readonly colorSpaces: ReadonlyArray<ColorSpaceExport>;
  readonly accessibilityLevel?: 'A' | 'AA' | 'AAA';
  readonly wcag3Tier?: 'Bronze' | 'Silver' | 'Gold' | 'Platinum';
  readonly tokenCount: number;
  readonly checksum?: string;
}

/**
 * Export result file
 */
export interface ExportFile {
  readonly path: string;
  readonly content: string;
  readonly format: 'json' | 'js' | 'ts' | 'css' | 'scss';
  readonly encoding: 'utf-8';
}

/**
 * Export result
 */
export interface ExportResult {
  readonly format: ExportFormat;
  readonly content: string;
  readonly metadata: ExportMetadata;
  readonly files: ReadonlyArray<ExportFile>;
  readonly warnings: ReadonlyArray<string>;
}

/**
 * Policy compliance report
 */
export interface PolicyComplianceReport {
  readonly policyId: string;
  readonly policyVersion: string;
  readonly compliant: boolean;
  readonly violations: ReadonlyArray<{
    readonly tokenName: string;
    readonly rule: string;
    readonly expected: string;
    readonly actual: string;
    readonly severity: 'error' | 'warning' | 'info';
  }>;
  readonly checkedAt: string;
}

/**
 * Governed export result
 */
export interface GovernedExportResult extends ExportResult {
  readonly policyCompliance: PolicyComplianceReport;
  readonly blocked: boolean;
  readonly adjustments: ReadonlyArray<{
    readonly tokenName: string;
    readonly originalValue: string;
    readonly adjustedValue: string;
    readonly reason: string;
  }>;
}

/**
 * Validation error
 */
export interface ValidationError {
  readonly path: string;
  readonly message: string;
  readonly code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
  readonly path: string;
  readonly message: string;
  readonly code: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: ReadonlyArray<ValidationError>;
  readonly warnings: ReadonlyArray<ValidationWarning>;
}

// ============================================
// Exporter Interface
// ============================================

/**
 * Token exporter interface
 */
export interface ITokenExporter {
  /** Export format identifier */
  readonly format: ExportFormat;
  /** Exporter version */
  readonly version: string;

  /**
   * Export tokens to format
   */
  export(palette: TokenPalette, options?: ExportOptions): ExportResult;

  /**
   * Export with governance policy enforcement
   */
  exportWithGovernance(
    palette: TokenPalette,
    policy: PerceptualPolicy | CompositePolicy,
    options?: ExportOptions
  ): GovernedExportResult;

  /**
   * Validate token structure
   */
  validate(tokens: unknown): ValidationResult;

  /**
   * Get supported color spaces
   */
  getSupportedColorSpaces(): ReadonlyArray<ColorSpaceExport>;
}

// ============================================
// DTCG (W3C Design Tokens) Types
// ============================================

/**
 * W3C DTCG Token structure
 */
export interface DTCGToken {
  readonly $value: unknown;
  readonly $type?: string;
  readonly $description?: string;
  readonly $extensions?: Record<string, unknown>;
}

/**
 * DTCG Token Group
 */
export interface DTCGTokenGroup {
  readonly [key: string]: DTCGToken | DTCGTokenGroup | string | Record<string, unknown> | undefined;
  readonly $description?: string;
  readonly $extensions?: Record<string, unknown>;
}

/**
 * DTCG Root structure
 */
export interface DTCGRoot {
  readonly $name?: string;
  readonly $description?: string;
  readonly [key: string]: DTCGToken | DTCGTokenGroup | string | undefined;
}

// ============================================
// Style Dictionary Types
// ============================================

/**
 * Style Dictionary token structure
 */
export interface StyleDictionaryToken {
  readonly value: unknown;
  readonly type?: string;
  readonly comment?: string;
  readonly attributes?: Record<string, unknown>;
  readonly original?: unknown;
  readonly name?: string;
  readonly path?: string[];
}

/**
 * Style Dictionary properties
 */
export interface StyleDictionaryProperties {
  readonly [key: string]: StyleDictionaryToken | StyleDictionaryProperties;
}

/**
 * Style Dictionary config
 */
export interface StyleDictionaryConfig {
  readonly source: string[];
  readonly platforms: Record<string, StyleDictionaryPlatform>;
}

/**
 * Style Dictionary platform config
 */
export interface StyleDictionaryPlatform {
  readonly transformGroup?: string;
  readonly transforms?: string[];
  readonly buildPath: string;
  readonly files: StyleDictionaryFile[];
}

/**
 * Style Dictionary file output
 */
export interface StyleDictionaryFile {
  readonly destination: string;
  readonly format: string;
  readonly filter?: string | object;
  readonly options?: Record<string, unknown>;
}

// ============================================
// Figma Tokens Types
// ============================================

/**
 * Figma Token structure
 */
export interface FigmaToken {
  readonly value: string | number | object;
  readonly type: string;
  readonly description?: string;
  readonly extensions?: {
    readonly 'org.tokens.studio'?: FigmaTokenExtension;
  };
}

/**
 * Figma Token extension (Tokens Studio)
 */
export interface FigmaTokenExtension {
  readonly modify?: {
    readonly type: 'lighten' | 'darken' | 'mix' | 'alpha';
    readonly value: string;
    readonly space?: string;
  };
  readonly '$figma.mode'?: string;
}

/**
 * Figma Token Set
 */
export interface FigmaTokenSet {
  readonly [key: string]: FigmaToken | FigmaTokenSet;
}

// ============================================
// Tailwind Types
// ============================================

/**
 * Tailwind color config
 */
export interface TailwindColorConfig {
  readonly [key: string]: string | TailwindColorConfig;
}

/**
 * Tailwind theme extend
 */
export interface TailwindThemeExtend {
  readonly colors?: TailwindColorConfig;
  readonly spacing?: Record<string, string>;
  readonly fontSize?: Record<string, string | [string, object]>;
  readonly fontFamily?: Record<string, string[]>;
  readonly boxShadow?: Record<string, string>;
}

/**
 * Tailwind config export
 */
export interface TailwindConfig {
  readonly theme?: {
    readonly extend?: TailwindThemeExtend;
  };
  readonly plugins?: unknown[];
}

// ============================================
// CSS Variables Types
// ============================================

/**
 * CSS variable entry
 */
export interface CSSVariable {
  readonly name: string; // Without -- prefix
  readonly value: string;
  readonly fallback?: string;
  readonly comment?: string;
}

/**
 * CSS variables block
 */
export interface CSSVariablesBlock {
  readonly selector: string;
  readonly variables: ReadonlyArray<CSSVariable>;
  readonly mediaQuery?: string;
}

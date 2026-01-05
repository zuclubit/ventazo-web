// ============================================
// Design Tooling Exporters
// Phase 4: Governance & Adoption Layer
// ============================================
//
// Multi-platform token export infrastructure.
// Supports design tools, CSS frameworks, and token standards.
//
// Supported Formats:
// - W3C Design Tokens (DTCG)
// - Amazon Style Dictionary
// - Figma Tokens (Tokens Studio)
// - Tailwind CSS
// - CSS Custom Properties
//
// ============================================

// ============================================
// Type Exports
// ============================================

export type {
  // Core interfaces
  ITokenExporter,
  ExportFormat,
  ExportOptions,
  ExportResult,
  GovernedExportResult,
  ExportMetadata,
  ExportFile,
  ValidationResult,
  ValidationError,
  ValidationWarning,

  // Token types
  TokenPalette,
  TokenGroup,
  Token,
  ColorToken,
  DimensionToken,
  TypographyToken,
  ShadowToken,
  ColorSpaceExport,

  // DTCG types
  DTCGRoot,
  DTCGToken,
  DTCGTokenGroup,

  // Style Dictionary types
  StyleDictionaryToken,
  StyleDictionaryProperties,
  StyleDictionaryConfig,
  StyleDictionaryPlatform,

  // Figma types
  FigmaToken,
  FigmaTokenSet,

  // Tailwind types
  TailwindConfig,
  TailwindThemeExtend,
  TailwindColorConfig,

  // CSS Variables types
  CSSVariable,
  CSSVariablesBlock,
} from './types';

// ============================================
// Exporter Class Exports
// ============================================

export { BaseExporter } from './BaseExporter';
export { DesignTokensExporter, createDesignTokensExporter } from './DesignTokensExporter';
export { StyleDictionaryExporter, createStyleDictionaryExporter } from './StyleDictionaryExporter';
export { FigmaTokensExporter, createFigmaTokensExporter } from './FigmaTokensExporter';
export { TailwindExporter, createTailwindExporter } from './TailwindExporter';
export { CSSVariablesExporter, createCSSVariablesExporter } from './CSSVariablesExporter';

// ============================================
// Exporter Factory
// ============================================

import type { ITokenExporter, ExportFormat } from './types';
import { DesignTokensExporter } from './DesignTokensExporter';
import { StyleDictionaryExporter } from './StyleDictionaryExporter';
import { FigmaTokensExporter } from './FigmaTokensExporter';
import { TailwindExporter } from './TailwindExporter';
import { CSSVariablesExporter } from './CSSVariablesExporter';

/**
 * Exporter factory registry
 */
const exporterRegistry = new Map<ExportFormat, () => ITokenExporter>([
  ['design-tokens', () => new DesignTokensExporter()],
  ['style-dictionary', () => new StyleDictionaryExporter()],
  ['figma-tokens', () => new FigmaTokensExporter()],
  ['tailwind', () => new TailwindExporter()],
  ['css-variables', () => new CSSVariablesExporter()],
]);

/**
 * Get all supported export formats
 */
export function getSupportedFormats(): ReadonlyArray<ExportFormat> {
  return Array.from(exporterRegistry.keys());
}

/**
 * Check if a format is supported
 */
export function isFormatSupported(format: string): format is ExportFormat {
  return exporterRegistry.has(format as ExportFormat);
}

/**
 * Create an exporter instance by format
 *
 * @param format - The export format to use
 * @returns An exporter instance
 * @throws Error if format is not supported
 *
 * @example
 * ```typescript
 * const exporter = createExporter('tailwind');
 * const result = exporter.export(palette);
 * ```
 */
export function createExporter(format: ExportFormat): ITokenExporter {
  const factory = exporterRegistry.get(format);

  if (!factory) {
    const supported = getSupportedFormats().join(', ');
    throw new Error(
      `Unsupported export format: "${format}". Supported formats: ${supported}`
    );
  }

  return factory();
}

/**
 * Register a custom exporter
 *
 * @param format - The format identifier
 * @param factory - Factory function to create the exporter
 *
 * @example
 * ```typescript
 * registerExporter('custom-format', () => new CustomExporter());
 * ```
 */
export function registerExporter(
  format: ExportFormat,
  factory: () => ITokenExporter
): void {
  exporterRegistry.set(format, factory);
}

/**
 * Unregister an exporter
 *
 * @param format - The format to unregister
 * @returns true if the exporter was removed, false if it didn't exist
 */
export function unregisterExporter(format: ExportFormat): boolean {
  return exporterRegistry.delete(format);
}

// ============================================
// Batch Export Utilities
// ============================================

import type { TokenPalette, ExportOptions, ExportResult } from './types';

/**
 * Export options for batch operations
 */
export interface BatchExportOptions extends ExportOptions {
  /** Formats to export to (defaults to all) */
  readonly formats?: ReadonlyArray<ExportFormat>;
  /** Continue on error (defaults to false) */
  readonly continueOnError?: boolean;
}

/**
 * Result of a batch export operation
 */
export interface BatchExportResult {
  readonly success: boolean;
  readonly results: ReadonlyMap<ExportFormat, ExportResult>;
  readonly errors: ReadonlyMap<ExportFormat, Error>;
  readonly totalFormats: number;
  readonly successfulFormats: number;
  readonly failedFormats: number;
}

/**
 * Export tokens to multiple formats at once
 *
 * @param palette - The token palette to export
 * @param options - Batch export options
 * @returns Results for each format
 *
 * @example
 * ```typescript
 * const result = await batchExport(palette, {
 *   formats: ['tailwind', 'css-variables', 'figma-tokens'],
 *   colorSpace: 'oklch',
 * });
 *
 * for (const [format, exportResult] of result.results) {
 *   console.log(`${format}: ${exportResult.files.length} files`);
 * }
 * ```
 */
export function batchExport(
  palette: TokenPalette,
  options?: BatchExportOptions
): BatchExportResult {
  const formats = options?.formats ?? getSupportedFormats();
  const continueOnError = options?.continueOnError ?? false;

  const results = new Map<ExportFormat, ExportResult>();
  const errors = new Map<ExportFormat, Error>();

  for (const format of formats) {
    try {
      const exporter = createExporter(format);
      const result = exporter.export(palette, options);
      results.set(format, result);
    } catch (error) {
      errors.set(format, error instanceof Error ? error : new Error(String(error)));

      if (!continueOnError) {
        break;
      }
    }
  }

  return {
    success: errors.size === 0,
    results,
    errors,
    totalFormats: formats.length,
    successfulFormats: results.size,
    failedFormats: errors.size,
  };
}

// ============================================
// Validation Utilities
// ============================================

/**
 * Validate tokens for a specific format
 *
 * @param format - The format to validate against
 * @param tokens - The tokens to validate
 * @returns Validation result
 */
export function validateTokens(
  format: ExportFormat,
  tokens: unknown
): import('./types').ValidationResult {
  const exporter = createExporter(format);
  return exporter.validate(tokens);
}

/**
 * Validate tokens against all formats
 *
 * @param tokens - The tokens to validate
 * @returns Map of format to validation result
 */
export function validateAllFormats(
  tokens: unknown
): ReadonlyMap<ExportFormat, import('./types').ValidationResult> {
  const results = new Map<ExportFormat, import('./types').ValidationResult>();

  for (const format of getSupportedFormats()) {
    const exporter = createExporter(format);
    results.set(format, exporter.validate(tokens));
  }

  return results;
}

// ============================================
// Format Info Utilities
// ============================================

/**
 * Information about an export format
 */
export interface FormatInfo {
  readonly format: ExportFormat;
  readonly version: string;
  readonly supportedColorSpaces: ReadonlyArray<string>;
  readonly description: string;
  readonly documentation?: string;
}

/**
 * Get format descriptions
 */
const formatDescriptions: Record<ExportFormat, { description: string; documentation?: string }> = {
  'design-tokens': {
    description: 'W3C Design Token Community Group (DTCG) format for standardized token interchange',
    documentation: 'https://design-tokens.github.io/community-group/format/',
  },
  'style-dictionary': {
    description: 'Amazon Style Dictionary format for multi-platform token transformation',
    documentation: 'https://amzn.github.io/style-dictionary/',
  },
  'figma-tokens': {
    description: 'Figma Tokens (Tokens Studio) format for design-development sync',
    documentation: 'https://tokens.studio/',
  },
  'tailwind': {
    description: 'Tailwind CSS configuration format for utility-first CSS frameworks',
    documentation: 'https://tailwindcss.com/docs/configuration',
  },
  'css-variables': {
    description: 'Native CSS Custom Properties for browser-native theming',
    documentation: 'https://developer.mozilla.org/en-US/docs/Web/CSS/--*',
  },
};

/**
 * Get information about an export format
 *
 * @param format - The format to get info for
 * @returns Format information
 */
export function getFormatInfo(format: ExportFormat): FormatInfo {
  const exporter = createExporter(format);
  const desc = formatDescriptions[format];

  return {
    format,
    version: exporter.version,
    supportedColorSpaces: [...exporter.getSupportedColorSpaces()],
    description: desc.description,
    documentation: desc.documentation,
  };
}

/**
 * Get information about all supported formats
 *
 * @returns Array of format information
 */
export function getAllFormatInfo(): ReadonlyArray<FormatInfo> {
  return getSupportedFormats().map(getFormatInfo);
}

// ============================================
// Constants
// ============================================

/**
 * Module version
 */
export const EXPORTERS_VERSION = '1.0.0';

/**
 * Default export options
 */
export const DEFAULT_EXPORT_OPTIONS: Readonly<import('./types').ExportOptions> = {
  colorSpace: 'hex',
  includeDeprecated: false,
  includeAccessibility: true,
  minify: false,
  includeHeaders: true,
};

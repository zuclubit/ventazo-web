/**
 * @fileoverview Theme Orchestrator
 *
 * Unified theme orchestration layer that bridges @zuclubit/ui-kit with
 * the web application's TenantThemeProvider. Provides governance-aware
 * theme operations with perceptual color intelligence.
 *
 * Key responsibilities:
 * - Coordinate theme derivation using ColorBridge
 * - Enforce enterprise governance policies
 * - Provide accessibility validation (WCAG 2.1 + APCA)
 * - Generate perceptually uniform token collections
 * - Export tokens in multiple formats
 *
 * @module web/lib/theme/ThemeOrchestrator
 * @version 1.0.0
 */

import { ColorBridge, TokenBridge } from '@/lib/bridges';
import type { SemanticBrandPalette } from './color-utils';
import {
  derivePerceptualPaletteFromPrimary,
  generatePerceptualPalette,
  validateAccessibility,
  getPerceptualInfo,
  perceptualLighten,
  perceptualDarken,
} from './color-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface ThemeOrchestratorConfig {
  /** Enable governance policy enforcement */
  enableGovernance?: boolean;
  /** Governance policy level: 'strict' | 'default' | 'lenient' */
  policyLevel?: 'strict' | 'default' | 'lenient';
  /** Enable accessibility validation */
  enableAccessibilityValidation?: boolean;
  /** WCAG level requirement */
  wcagLevel?: 'AA' | 'AAA';
  /** APCA minimum contrast for body text */
  apcaMinContrast?: number;
  /** Enable auto-fix for violations */
  enableAutoFix?: boolean;
  /** Enable audit logging */
  enableAudit?: boolean;
}

export interface ThemeDerivedResult {
  /** The derived palette */
  palette: SemanticBrandPalette;
  /** Full color scale (50-950) */
  scale: Record<string, string>;
  /** Semantic variants (hover, active, disabled, etc.) */
  variants: Record<string, string>;
  /** Accessibility validation results */
  accessibility: ThemeAccessibilityReport;
  /** Governance evaluation results */
  governance?: GovernanceReport;
  /** Token collection for export */
  tokens: ThemeTokenCollection;
}

export interface ThemeAccessibilityReport {
  /** Overall accessibility pass/fail */
  passes: boolean;
  /** WCAG 2.1 compliance */
  wcag21: {
    passes: boolean;
    level: 'AAA' | 'AA' | 'Fail';
    issues: AccessibilityIssue[];
  };
  /** APCA (WCAG 3.0) compliance */
  apca: {
    passes: boolean;
    minLc: number;
    issues: AccessibilityIssue[];
  };
}

export interface AccessibilityIssue {
  type: 'wcag21' | 'apca';
  foreground: string;
  background: string;
  measured: number;
  required: number;
  suggestion?: string;
}

export interface GovernanceReport {
  /** Overall governance pass/fail */
  passes: boolean;
  /** Number of violations */
  violationCount: number;
  /** Detailed violations */
  violations: GovernanceViolation[];
  /** Auto-fixes applied */
  autoFixesApplied: number;
}

export interface GovernanceViolation {
  policyId: string;
  policyName: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  message: string;
  suggestion?: string;
  autoFixable: boolean;
  fixed: boolean;
}

export interface ThemeTokenCollection {
  /** Primary color tokens */
  primary: Record<string, string>;
  /** Sidebar color tokens */
  sidebar: Record<string, string>;
  /** Accent color tokens */
  accent: Record<string, string>;
  /** Surface color tokens */
  surface: Record<string, string>;
  /** Semantic state tokens */
  states: Record<string, string>;
}

export interface TokenExportOptions {
  /** Export format */
  format: 'css' | 'tailwind' | 'w3c' | 'figma';
  /** Namespace prefix */
  namespace?: string;
  /** Include metadata */
  includeMetadata?: boolean;
}

// ============================================================================
// DEFAULT CONFIGURATION
// ============================================================================

const DEFAULT_CONFIG: Required<ThemeOrchestratorConfig> = {
  enableGovernance: true,
  policyLevel: 'default',
  enableAccessibilityValidation: true,
  wcagLevel: 'AA',
  apcaMinContrast: 60,
  enableAutoFix: true,
  enableAudit: false,
};

// ============================================================================
// THEME ORCHESTRATOR
// ============================================================================

/**
 * Theme Orchestrator - Unified theme management with governance
 *
 * Orchestrates theme operations across the UI-Kit domain layer
 * and the web application's existing theme system.
 */
export class ThemeOrchestrator {
  private config: Required<ThemeOrchestratorConfig>;
  private governanceEnabled: boolean;

  constructor(config: ThemeOrchestratorConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.governanceEnabled = this.config.enableGovernance;
  }

  // ==========================================================================
  // THEME DERIVATION
  // ==========================================================================

  /**
   * Derive a complete theme from a primary brand color
   *
   * @param primaryHex - Primary brand color in hex format
   * @returns Fully derived theme with validation results
   */
  deriveTheme(primaryHex: string): ThemeDerivedResult {
    // 1. Derive semantic palette using perceptual color intelligence
    const palette = derivePerceptualPaletteFromPrimary(primaryHex);

    // 2. Generate full color scale
    const scale = generatePerceptualPalette(primaryHex);

    // 3. Generate semantic variants for each palette color
    const variants = this.deriveSemanticVariants(palette);

    // 4. Validate accessibility
    const accessibility = this.validateThemeAccessibility(palette);

    // 5. Evaluate governance policies (if enabled)
    let governance: GovernanceReport | undefined;
    if (this.governanceEnabled) {
      governance = this.evaluateGovernance(palette, accessibility);
    }

    // 6. Build token collection
    const tokens = this.buildTokenCollection(palette, scale, variants);

    return {
      palette,
      scale,
      variants,
      accessibility,
      governance,
      tokens,
    };
  }

  /**
   * Derive semantic variants for all palette colors
   */
  private deriveSemanticVariants(palette: SemanticBrandPalette): Record<string, string> {
    const variants: Record<string, string> = {};

    // Primary variants
    variants['primary-hover'] = perceptualDarken(palette.primaryColor, 0.08);
    variants['primary-active'] = perceptualDarken(palette.primaryColor, 0.12);
    variants['primary-light'] = perceptualLighten(palette.primaryColor, 0.25);
    variants['primary-dark'] = perceptualDarken(palette.primaryColor, 0.2);

    // Accent variants
    variants['accent-hover'] = perceptualDarken(palette.accentColor, 0.06);
    variants['accent-active'] = perceptualDarken(palette.accentColor, 0.10);
    variants['accent-light'] = perceptualLighten(palette.accentColor, 0.15);

    // Sidebar variants
    variants['sidebar-hover'] = perceptualLighten(palette.sidebarColor, 0.05);
    variants['sidebar-active'] = perceptualLighten(palette.sidebarColor, 0.08);
    variants['sidebar-border'] = perceptualLighten(palette.sidebarColor, 0.12);

    // Surface variants
    variants['surface-hover'] = perceptualLighten(palette.surfaceColor, 0.04);
    variants['surface-elevated'] = perceptualLighten(palette.surfaceColor, 0.08);
    variants['surface-border'] = perceptualLighten(palette.surfaceColor, 0.15);

    return variants;
  }

  // ==========================================================================
  // ACCESSIBILITY VALIDATION
  // ==========================================================================

  /**
   * Validate theme accessibility against WCAG 2.1 and APCA standards
   */
  private validateThemeAccessibility(palette: SemanticBrandPalette): ThemeAccessibilityReport {
    const wcag21Issues: AccessibilityIssue[] = [];
    const apcaIssues: AccessibilityIssue[] = [];

    // Common text/background pairs to validate
    const pairs: Array<{ fg: string; bg: string; context: string }> = [
      { fg: '#FFFFFF', bg: palette.primaryColor, context: 'primary-button' },
      { fg: '#FFFFFF', bg: palette.sidebarColor, context: 'sidebar-text' },
      { fg: palette.primaryColor, bg: palette.surfaceColor, context: 'accent-on-surface' },
      { fg: '#FFFFFF', bg: palette.accentColor, context: 'accent-button' },
    ];

    for (const pair of pairs) {
      const validation = validateAccessibility(pair.fg, pair.bg);

      // WCAG 2.1 check
      const requiredRatio = this.config.wcagLevel === 'AAA' ? 7 : 4.5;
      if (validation.wcag21.ratio < requiredRatio) {
        wcag21Issues.push({
          type: 'wcag21',
          foreground: pair.fg,
          background: pair.bg,
          measured: validation.wcag21.ratio,
          required: requiredRatio,
          suggestion: `Increase contrast ratio from ${validation.wcag21.ratio.toFixed(2)} to ${requiredRatio}:1`,
        });
      }

      // APCA check
      if (validation.apca.absoluteLc < this.config.apcaMinContrast) {
        apcaIssues.push({
          type: 'apca',
          foreground: pair.fg,
          background: pair.bg,
          measured: validation.apca.absoluteLc,
          required: this.config.apcaMinContrast,
          suggestion: `Increase APCA contrast from Lc ${validation.apca.absoluteLc.toFixed(0)} to ${this.config.apcaMinContrast}`,
        });
      }
    }

    const wcagPasses = wcag21Issues.length === 0;
    const apcaPasses = apcaIssues.length === 0;

    return {
      passes: wcagPasses && apcaPasses,
      wcag21: {
        passes: wcagPasses,
        level: wcagPasses ? this.config.wcagLevel : 'Fail',
        issues: wcag21Issues,
      },
      apca: {
        passes: apcaPasses,
        minLc: this.config.apcaMinContrast,
        issues: apcaIssues,
      },
    };
  }

  // ==========================================================================
  // GOVERNANCE
  // ==========================================================================

  /**
   * Evaluate theme against enterprise governance policies
   */
  private evaluateGovernance(
    palette: SemanticBrandPalette,
    accessibility: ThemeAccessibilityReport
  ): GovernanceReport {
    const violations: GovernanceViolation[] = [];
    let autoFixesApplied = 0;

    // Policy 1: WCAG AA Compliance (from accessibility results)
    if (!accessibility.wcag21.passes) {
      for (const issue of accessibility.wcag21.issues) {
        violations.push({
          policyId: 'accessibility-wcag-aa',
          policyName: 'WCAG AA Compliance',
          severity: 'critical',
          message: `Contrast ratio ${issue.measured.toFixed(2)}:1 is below required ${issue.required}:1`,
          suggestion: issue.suggestion,
          autoFixable: this.config.enableAutoFix,
          fixed: false,
        });
      }
    }

    // Policy 2: APCA Body Text (from accessibility results)
    if (!accessibility.apca.passes) {
      for (const issue of accessibility.apca.issues) {
        violations.push({
          policyId: 'accessibility-apca-body',
          policyName: 'APCA Body Text Compliance',
          severity: 'high',
          message: `APCA contrast Lc ${issue.measured.toFixed(0)} is below required Lc ${issue.required}`,
          suggestion: issue.suggestion,
          autoFixable: this.config.enableAutoFix,
          fixed: false,
        });
      }
    }

    // Policy 3: Minimum Color Saturation
    const primaryInfo = getPerceptualInfo(palette.primaryColor);
    if (primaryInfo && primaryInfo.oklch.c < 0.05) {
      violations.push({
        policyId: 'color-minimum-saturation',
        policyName: 'Minimum Color Saturation',
        severity: 'low',
        message: `Primary color chroma ${(primaryInfo.oklch.c * 100).toFixed(1)}% is below recommended 5%`,
        suggestion: 'Increase the saturation/chroma of the primary color for better visual impact',
        autoFixable: true,
        fixed: false,
      });
    }

    // Policy 4: Dark Mode Contrast (sidebar should have sufficient contrast with surface)
    const sidebarInfo = getPerceptualInfo(palette.sidebarColor);
    const surfaceInfo = getPerceptualInfo(palette.surfaceColor);
    if (sidebarInfo && surfaceInfo) {
      const lightnessDiff = Math.abs(sidebarInfo.oklch.l - surfaceInfo.oklch.l);
      if (lightnessDiff < 0.05) {
        violations.push({
          policyId: 'theme-contrast-hierarchy',
          policyName: 'Theme Contrast Hierarchy',
          severity: 'medium',
          message: 'Sidebar and surface colors are too similar (lightness diff < 5%)',
          suggestion: 'Increase the lightness difference between sidebar and surface colors',
          autoFixable: true,
          fixed: false,
        });
      }
    }

    return {
      passes: violations.filter(v => v.severity === 'critical' || v.severity === 'high').length === 0,
      violationCount: violations.length,
      violations,
      autoFixesApplied,
    };
  }

  // ==========================================================================
  // TOKEN COLLECTION
  // ==========================================================================

  /**
   * Build token collection from palette and variants
   */
  private buildTokenCollection(
    palette: SemanticBrandPalette,
    scale: Record<string, string>,
    variants: Record<string, string>
  ): ThemeTokenCollection {
    return {
      primary: {
        'primary-50': scale['50'] || perceptualLighten(palette.primaryColor, 0.47),
        'primary-100': scale['100'] || perceptualLighten(palette.primaryColor, 0.43),
        'primary-200': scale['200'] || perceptualLighten(palette.primaryColor, 0.35),
        'primary-300': scale['300'] || perceptualLighten(palette.primaryColor, 0.25),
        'primary-400': scale['400'] || perceptualLighten(palette.primaryColor, 0.12),
        'primary-500': palette.primaryColor,
        'primary-600': scale['600'] || perceptualDarken(palette.primaryColor, 0.08),
        'primary-700': scale['700'] || perceptualDarken(palette.primaryColor, 0.15),
        'primary-800': scale['800'] || perceptualDarken(palette.primaryColor, 0.23),
        'primary-900': scale['900'] || perceptualDarken(palette.primaryColor, 0.30),
        'primary-950': scale['950'] || perceptualDarken(palette.primaryColor, 0.38),
      },
      sidebar: {
        'sidebar-background': palette.sidebarColor,
        'sidebar-foreground': '#FFFFFF',
        'sidebar-hover': variants['sidebar-hover'] || perceptualLighten(palette.sidebarColor, 0.05),
        'sidebar-active': variants['sidebar-active'] || perceptualLighten(palette.sidebarColor, 0.08),
        'sidebar-border': variants['sidebar-border'] || perceptualLighten(palette.sidebarColor, 0.12),
        'sidebar-muted': perceptualLighten(palette.sidebarColor, 0.15),
      },
      accent: {
        'accent-base': palette.accentColor,
        'accent-hover': variants['accent-hover'] || perceptualDarken(palette.accentColor, 0.06),
        'accent-active': variants['accent-active'] || perceptualDarken(palette.accentColor, 0.10),
        'accent-light': variants['accent-light'] || perceptualLighten(palette.accentColor, 0.15),
        'accent-muted': perceptualLighten(palette.accentColor, 0.35),
      },
      surface: {
        'surface-base': palette.surfaceColor,
        'surface-hover': variants['surface-hover'] || perceptualLighten(palette.surfaceColor, 0.04),
        'surface-elevated': variants['surface-elevated'] || perceptualLighten(palette.surfaceColor, 0.08),
        'surface-border': variants['surface-border'] || perceptualLighten(palette.surfaceColor, 0.15),
        'surface-muted': perceptualLighten(palette.surfaceColor, 0.25),
      },
      states: {
        'state-primary-hover': variants['primary-hover'] || perceptualDarken(palette.primaryColor, 0.08),
        'state-primary-active': variants['primary-active'] || perceptualDarken(palette.primaryColor, 0.12),
        'state-primary-disabled': perceptualLighten(palette.primaryColor, 0.3),
        'state-focus-ring': palette.accentColor,
      },
    };
  }

  // ==========================================================================
  // TOKEN EXPORT
  // ==========================================================================

  /**
   * Export theme tokens in the specified format
   */
  exportTokens(tokens: ThemeTokenCollection, options: TokenExportOptions): string {
    const { format, namespace = 'brand', includeMetadata = false } = options;

    // Flatten tokens
    const flatTokens: Record<string, string> = {};
    for (const category of Object.values(tokens)) {
      for (const [key, value] of Object.entries(category)) {
        flatTokens[key] = value;
      }
    }

    switch (format) {
      case 'css':
        return this.exportToCss(flatTokens, namespace, includeMetadata);
      case 'tailwind':
        return this.exportToTailwind(flatTokens, namespace);
      case 'w3c':
        return this.exportToW3C(flatTokens, namespace, includeMetadata);
      case 'figma':
        return this.exportToFigma(flatTokens, namespace);
      default:
        return this.exportToCss(flatTokens, namespace, includeMetadata);
    }
  }

  private exportToCss(tokens: Record<string, string>, namespace: string, includeMetadata: boolean): string {
    let css = `/* ${namespace.charAt(0).toUpperCase() + namespace.slice(1)} Theme Tokens */\n`;
    css += `/* Generated by ThemeOrchestrator */\n\n`;
    css += `:root {\n`;

    for (const [key, value] of Object.entries(tokens)) {
      css += `  --${namespace}-${key}: ${value};\n`;
    }

    css += `}\n`;

    if (includeMetadata) {
      css += `\n/* Token count: ${Object.keys(tokens).length} */\n`;
      css += `/* Generated: ${new Date().toISOString()} */\n`;
    }

    return css;
  }

  private exportToTailwind(tokens: Record<string, string>, namespace: string): string {
    const config: Record<string, Record<string, string>> = {
      colors: {},
    };

    for (const [key, value] of Object.entries(tokens)) {
      const parts = key.split('-');
      const category = parts[0];
      const variant = parts.slice(1).join('-') || 'DEFAULT';

      if (!config.colors[category]) {
        config.colors[category] = {};
      }
      config.colors[category][variant] = value;
    }

    return JSON.stringify({ theme: { extend: config } }, null, 2);
  }

  private exportToW3C(tokens: Record<string, string>, namespace: string, includeMetadata: boolean): string {
    const w3cTokens: Record<string, { $value: string; $type: string; $description?: string }> = {};

    for (const [key, value] of Object.entries(tokens)) {
      w3cTokens[key] = {
        $value: value,
        $type: 'color',
        ...(includeMetadata && { $description: `${namespace} design token` }),
      };
    }

    return JSON.stringify(w3cTokens, null, 2);
  }

  private exportToFigma(tokens: Record<string, string>, namespace: string): string {
    const figmaTokens: Record<string, { name: string; color: string; description: string }[]> = {
      [namespace]: [],
    };

    for (const [key, value] of Object.entries(tokens)) {
      figmaTokens[namespace].push({
        name: key,
        color: value,
        description: `${namespace}/${key}`,
      });
    }

    return JSON.stringify(figmaTokens, null, 2);
  }

  // ==========================================================================
  // CONFIGURATION
  // ==========================================================================

  /**
   * Update orchestrator configuration
   */
  updateConfig(config: Partial<ThemeOrchestratorConfig>): void {
    this.config = { ...this.config, ...config };
    this.governanceEnabled = this.config.enableGovernance;
  }

  /**
   * Get current configuration
   */
  getConfig(): Readonly<Required<ThemeOrchestratorConfig>> {
    return { ...this.config };
  }

  /**
   * Enable/disable governance
   */
  setGovernanceEnabled(enabled: boolean): void {
    this.governanceEnabled = enabled;
    this.config.enableGovernance = enabled;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

/**
 * Default ThemeOrchestrator instance
 */
export const themeOrchestrator = new ThemeOrchestrator();

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

/**
 * Quick theme derivation with default settings
 */
export function deriveThemeFromPrimary(primaryHex: string): ThemeDerivedResult {
  return themeOrchestrator.deriveTheme(primaryHex);
}

/**
 * Quick accessibility validation
 */
export function validateTheme(palette: SemanticBrandPalette): ThemeAccessibilityReport {
  const orchestrator = new ThemeOrchestrator({
    enableGovernance: false,
  });
  const result = orchestrator.deriveTheme(palette.primaryColor);
  return result.accessibility;
}

/**
 * Export tokens with CSS format (convenience)
 */
export function exportTokensAsCss(tokens: ThemeTokenCollection, namespace = 'brand'): string {
  return themeOrchestrator.exportTokens(tokens, {
    format: 'css',
    namespace,
    includeMetadata: true,
  });
}

'use client';

/**
 * @fileoverview Governance Provider
 *
 * React context provider for enterprise governance policy enforcement.
 * Integrates ThemeOrchestrator with the application's theme system,
 * providing governance-aware theme validation and policy evaluation.
 *
 * Key responsibilities:
 * - Provide governance state to the application
 * - Expose hooks for governance validation
 * - Coordinate with TenantThemeProvider for theme updates
 * - Enable real-time accessibility feedback
 *
 * @module web/lib/theme/GovernanceProvider
 * @version 1.0.0
 */

import * as React from 'react';
import {
  ThemeOrchestrator,
  themeOrchestrator,
  type ThemeOrchestratorConfig,
  type ThemeDerivedResult,
  type ThemeAccessibilityReport,
  type GovernanceReport,
  type GovernanceViolation,
  type ThemeTokenCollection,
} from './ThemeOrchestrator';
import type { SemanticBrandPalette } from './color-utils';
import { validateAccessibility, type ApcaContrastResult, type PerceptualAccessibility } from './color-utils';

// ============================================================================
// TYPES
// ============================================================================

export interface GovernanceContextValue {
  /** Whether governance enforcement is enabled */
  isEnabled: boolean;
  /** Current governance policy level */
  policyLevel: 'strict' | 'default' | 'lenient';
  /** Last governance evaluation result */
  lastEvaluation: GovernanceEvaluationState | null;
  /** Whether the current theme passes governance */
  passes: boolean;
  /** Number of violations */
  violationCount: number;
  /** Critical violations that must be fixed */
  criticalViolations: GovernanceViolation[];
  /** Enable/disable governance */
  setEnabled: (enabled: boolean) => void;
  /** Update policy level */
  setPolicyLevel: (level: 'strict' | 'default' | 'lenient') => void;
  /** Evaluate a color palette */
  evaluatePalette: (primaryHex: string) => GovernanceEvaluationState;
  /** Validate a color pair for accessibility */
  validateColorPair: (foreground: string, background: string) => PerceptualAccessibility;
  /** Get full theme derivation with governance */
  deriveTheme: (primaryHex: string) => ThemeDerivedResult;
  /** Export current tokens */
  exportTokens: (format: 'css' | 'tailwind' | 'w3c' | 'figma') => string;
  /** Refresh governance evaluation */
  refresh: () => void;
}

export interface GovernanceEvaluationState {
  /** Timestamp of evaluation */
  timestamp: Date;
  /** Input primary color */
  primaryColor: string;
  /** Derived theme result */
  theme: ThemeDerivedResult;
  /** Governance report */
  governance: GovernanceReport;
  /** Accessibility report */
  accessibility: ThemeAccessibilityReport;
  /** Whether evaluation passed */
  passes: boolean;
}

export interface GovernanceProviderProps {
  children: React.ReactNode;
  /** Initial configuration */
  config?: Partial<ThemeOrchestratorConfig>;
  /** Enable governance by default */
  defaultEnabled?: boolean;
  /** Default policy level */
  defaultPolicyLevel?: 'strict' | 'default' | 'lenient';
  /** Callback when governance violation is detected */
  onViolation?: (violations: GovernanceViolation[]) => void;
  /** Callback when theme passes governance */
  onPass?: (result: ThemeDerivedResult) => void;
}

// ============================================================================
// CONTEXT
// ============================================================================

const GovernanceContext = React.createContext<GovernanceContextValue | undefined>(undefined);

// ============================================================================
// PROVIDER
// ============================================================================

/**
 * Governance Provider Component
 *
 * Wraps the application to provide governance context for theme validation.
 * Works alongside TenantThemeProvider to ensure brand colors meet
 * accessibility and enterprise policy requirements.
 *
 * @example
 * ```tsx
 * <GovernanceProvider defaultEnabled={true} defaultPolicyLevel="strict">
 *   <TenantThemeProvider>
 *     <App />
 *   </TenantThemeProvider>
 * </GovernanceProvider>
 * ```
 */
export function GovernanceProvider({
  children,
  config,
  defaultEnabled = true,
  defaultPolicyLevel = 'default',
  onViolation,
  onPass,
}: GovernanceProviderProps) {
  // State
  const [isEnabled, setIsEnabled] = React.useState(defaultEnabled);
  const [policyLevel, setPolicyLevelState] = React.useState<'strict' | 'default' | 'lenient'>(defaultPolicyLevel);
  const [lastEvaluation, setLastEvaluation] = React.useState<GovernanceEvaluationState | null>(null);

  // Orchestrator instance ref (stable across renders)
  const orchestratorRef = React.useRef<ThemeOrchestrator>(
    new ThemeOrchestrator({
      enableGovernance: defaultEnabled,
      policyLevel: defaultPolicyLevel,
      ...config,
    })
  );

  // Update orchestrator when config changes
  React.useEffect(() => {
    orchestratorRef.current.updateConfig({
      enableGovernance: isEnabled,
      policyLevel,
      ...config,
    });
  }, [isEnabled, policyLevel, config]);

  // Derived state
  const passes = React.useMemo(() => {
    if (!lastEvaluation) return true;
    return lastEvaluation.passes;
  }, [lastEvaluation]);

  const violationCount = React.useMemo(() => {
    if (!lastEvaluation?.governance) return 0;
    return lastEvaluation.governance.violationCount;
  }, [lastEvaluation]);

  const criticalViolations = React.useMemo(() => {
    if (!lastEvaluation?.governance) return [];
    return lastEvaluation.governance.violations.filter(
      v => v.severity === 'critical' || v.severity === 'high'
    );
  }, [lastEvaluation]);

  // Set enabled handler
  const setEnabled = React.useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    orchestratorRef.current.setGovernanceEnabled(enabled);
  }, []);

  // Set policy level handler
  const setPolicyLevel = React.useCallback((level: 'strict' | 'default' | 'lenient') => {
    setPolicyLevelState(level);
    orchestratorRef.current.updateConfig({ policyLevel: level });
  }, []);

  // Evaluate palette handler
  const evaluatePalette = React.useCallback((primaryHex: string): GovernanceEvaluationState => {
    const theme = orchestratorRef.current.deriveTheme(primaryHex);

    const evaluationState: GovernanceEvaluationState = {
      timestamp: new Date(),
      primaryColor: primaryHex,
      theme,
      governance: theme.governance || {
        passes: true,
        violationCount: 0,
        violations: [],
        autoFixesApplied: 0,
      },
      accessibility: theme.accessibility,
      passes: theme.governance?.passes ?? theme.accessibility.passes,
    };

    setLastEvaluation(evaluationState);

    // Fire callbacks
    if (!evaluationState.passes && onViolation) {
      onViolation(evaluationState.governance.violations);
    }
    if (evaluationState.passes && onPass) {
      onPass(theme);
    }

    return evaluationState;
  }, [onViolation, onPass]);

  // Validate color pair handler
  const validateColorPair = React.useCallback((foreground: string, background: string): PerceptualAccessibility => {
    return validateAccessibility(foreground, background);
  }, []);

  // Derive theme handler
  const deriveTheme = React.useCallback((primaryHex: string): ThemeDerivedResult => {
    return orchestratorRef.current.deriveTheme(primaryHex);
  }, []);

  // Export tokens handler
  const exportTokens = React.useCallback((format: 'css' | 'tailwind' | 'w3c' | 'figma'): string => {
    if (!lastEvaluation?.theme.tokens) {
      return '/* No tokens available - run evaluatePalette first */';
    }
    return orchestratorRef.current.exportTokens(lastEvaluation.theme.tokens, {
      format,
      namespace: 'brand',
      includeMetadata: true,
    });
  }, [lastEvaluation]);

  // Refresh handler
  const refresh = React.useCallback(() => {
    if (lastEvaluation?.primaryColor) {
      evaluatePalette(lastEvaluation.primaryColor);
    }
  }, [lastEvaluation, evaluatePalette]);

  // Context value
  const value = React.useMemo<GovernanceContextValue>(() => ({
    isEnabled,
    policyLevel,
    lastEvaluation,
    passes,
    violationCount,
    criticalViolations,
    setEnabled,
    setPolicyLevel,
    evaluatePalette,
    validateColorPair,
    deriveTheme,
    exportTokens,
    refresh,
  }), [
    isEnabled,
    policyLevel,
    lastEvaluation,
    passes,
    violationCount,
    criticalViolations,
    setEnabled,
    setPolicyLevel,
    evaluatePalette,
    validateColorPair,
    deriveTheme,
    exportTokens,
    refresh,
  ]);

  return (
    <GovernanceContext.Provider value={value}>
      {children}
    </GovernanceContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Access the governance context
 * Must be used within a GovernanceProvider
 *
 * @throws Error if used outside GovernanceProvider
 */
export function useGovernance(): GovernanceContextValue {
  const context = React.useContext(GovernanceContext);
  if (context === undefined) {
    throw new Error('useGovernance must be used within a GovernanceProvider');
  }
  return context;
}

/**
 * Safe hook that returns null if not in provider
 * Useful for optional governance features
 */
export function useGovernanceOptional(): GovernanceContextValue | null {
  const context = React.useContext(GovernanceContext);
  return context ?? null;
}

/**
 * Hook for quick accessibility validation of a color pair
 *
 * @example
 * ```tsx
 * const validation = useAccessibilityValidation('#FFFFFF', '#0066CC');
 * if (!validation.wcag21.levelAA) {
 *   // Show warning
 * }
 * ```
 */
export function useAccessibilityValidation(
  foreground: string | undefined,
  background: string | undefined
): PerceptualAccessibility | null {
  const governance = useGovernanceOptional();

  return React.useMemo(() => {
    if (!foreground || !background) return null;
    if (governance) {
      return governance.validateColorPair(foreground, background);
    }
    // Fallback to direct validation
    return validateAccessibility(foreground, background);
  }, [foreground, background, governance]);
}

/**
 * Hook for governance violation state
 * Returns simplified violation info for UI display
 */
export function useGovernanceViolations(): {
  hasViolations: boolean;
  count: number;
  critical: GovernanceViolation[];
  all: GovernanceViolation[];
} {
  const governance = useGovernanceOptional();

  return React.useMemo(() => {
    if (!governance || !governance.lastEvaluation) {
      return {
        hasViolations: false,
        count: 0,
        critical: [],
        all: [],
      };
    }

    const violations = governance.lastEvaluation.governance.violations;
    const critical = violations.filter(v => v.severity === 'critical' || v.severity === 'high');

    return {
      hasViolations: violations.length > 0,
      count: violations.length,
      critical,
      all: violations,
    };
  }, [governance]);
}

/**
 * Hook for real-time theme derivation
 * Automatically derives theme when primary color changes
 *
 * @example
 * ```tsx
 * const { theme, passes, violations } = useThemeDerivation('#3B82F6');
 * ```
 */
export function useThemeDerivation(primaryHex: string | undefined): {
  theme: ThemeDerivedResult | null;
  passes: boolean;
  violations: GovernanceViolation[];
  isLoading: boolean;
} {
  const governance = useGovernanceOptional();
  const [isLoading, setIsLoading] = React.useState(false);
  const [result, setResult] = React.useState<ThemeDerivedResult | null>(null);

  React.useEffect(() => {
    if (!primaryHex) {
      setResult(null);
      return;
    }

    setIsLoading(true);

    // Use requestIdleCallback for non-blocking derivation
    const idleId = requestIdleCallback(() => {
      const theme = governance
        ? governance.deriveTheme(primaryHex)
        : themeOrchestrator.deriveTheme(primaryHex);

      setResult(theme);
      setIsLoading(false);
    });

    return () => {
      cancelIdleCallback(idleId);
    };
  }, [primaryHex, governance]);

  return React.useMemo(() => ({
    theme: result,
    passes: result?.governance?.passes ?? result?.accessibility.passes ?? true,
    violations: result?.governance?.violations ?? [],
    isLoading,
  }), [result, isLoading]);
}

/**
 * Hook for APCA contrast calculation between two colors
 *
 * @example
 * ```tsx
 * const apca = useApcaContrast('#FFFFFF', '#000000');
 * console.log(apca.absoluteLc); // ~106
 * ```
 */
export function useApcaContrast(
  foreground: string | undefined,
  background: string | undefined
): ApcaContrastResult | null {
  const validation = useAccessibilityValidation(foreground, background);
  return validation?.apca ?? null;
}

// ============================================================================
// UTILITY COMPONENTS
// ============================================================================

interface GovernanceGateProps {
  children: React.ReactNode;
  /** Content to show when governance fails */
  fallback?: React.ReactNode;
  /** Require governance to pass */
  requirePass?: boolean;
  /** Minimum policy level required */
  minPolicyLevel?: 'lenient' | 'default' | 'strict';
}

/**
 * Conditional rendering based on governance state
 *
 * @example
 * ```tsx
 * <GovernanceGate requirePass fallback={<AccessibilityWarning />}>
 *   <PrimaryButton />
 * </GovernanceGate>
 * ```
 */
export function GovernanceGate({
  children,
  fallback = null,
  requirePass = false,
  minPolicyLevel,
}: GovernanceGateProps) {
  const governance = useGovernanceOptional();

  if (!governance) {
    return <>{children}</>;
  }

  // Check policy level requirement
  if (minPolicyLevel) {
    const levelOrder = { lenient: 0, default: 1, strict: 2 };
    const currentLevel = levelOrder[governance.policyLevel];
    const requiredLevel = levelOrder[minPolicyLevel];

    if (currentLevel < requiredLevel) {
      return <>{fallback}</>;
    }
  }

  // Check pass requirement
  if (requirePass && !governance.passes) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  ThemeOrchestratorConfig,
  ThemeDerivedResult,
  ThemeAccessibilityReport,
  GovernanceReport,
  GovernanceViolation,
  ThemeTokenCollection,
};

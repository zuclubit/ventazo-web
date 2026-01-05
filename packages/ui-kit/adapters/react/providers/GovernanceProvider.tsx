/**
 * @fileoverview GovernanceProvider - React Adapter
 *
 * React provider and hooks for enterprise design governance.
 * This adapter makes governance enforcement accessible throughout
 * a React application via Context.
 *
 * @module ui-kit/adapters/react/providers/GovernanceProvider
 * @version 1.0.0
 */

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  useEffect,
  type ReactNode,
  type ReactElement,
} from 'react';

import {
  EnforceEnterpriseGovernance,
  type GovernanceConfig,
  type GovernanceEnforcementOutput,
} from '../../../application/use-cases/EnforceEnterpriseGovernance';
import {
  PolicySet,
  EnterprisePolicy,
  createDefaultPolicySet,
  createStrictPolicySet,
  createLenientPolicySet,
  type PolicyScope,
} from '../../../domain/governance';
import { PerceptualColor } from '../../../domain/perceptual';
import type { TokenCollection } from '../../../domain/tokens';
import {
  ConsoleAuditAdapter,
  NoOpAuditAdapter,
} from '../../../application/ports/outbound/GovernanceAuditPort';

// ============================================================================
// TYPES
// ============================================================================

/**
 * Governance mode determines policy strictness.
 */
export type GovernanceMode = 'strict' | 'default' | 'lenient' | 'disabled';

/**
 * Configuration for the GovernanceProvider.
 */
export interface GovernanceProviderConfig {
  /** Governance mode */
  mode?: GovernanceMode;
  /** Enable console logging */
  enableAuditLog?: boolean;
  /** Custom policies to add */
  customPolicies?: EnterprisePolicy[];
  /** Whether to fail-fast on blocking violations */
  failFast?: boolean;
  /** Auto-fix violations when possible */
  autoFix?: boolean;
}

/**
 * Governance context value.
 */
export interface GovernanceContextValue {
  // State
  readonly mode: GovernanceMode;
  readonly policySet: PolicySet;
  readonly isEnabled: boolean;

  // Actions
  readonly setMode: (mode: GovernanceMode) => void;
  readonly addPolicy: (policy: EnterprisePolicy) => void;
  readonly removePolicy: (policyId: string) => void;
  readonly enablePolicy: (policyId: string) => void;
  readonly disablePolicy: (policyId: string) => void;

  // Enforcement
  readonly checkColor: (
    colorHex: string,
    purpose?: 'brand' | 'text' | 'background' | 'border'
  ) => Promise<GovernanceEnforcementOutput | null>;

  readonly checkAccessibility: (
    foregroundHex: string,
    backgroundHex: string
  ) => Promise<GovernanceEnforcementOutput | null>;

  readonly checkTokens: (
    tokens: TokenCollection
  ) => Promise<GovernanceEnforcementOutput | null>;

  readonly checkTheme: (config: {
    hasLightMode: boolean;
    hasDarkMode: boolean;
    brandColorHex?: string;
  }) => Promise<GovernanceEnforcementOutput | null>;

  readonly checkComponent: (
    componentName: string,
    tokens?: TokenCollection,
    brandColorHex?: string
  ) => Promise<GovernanceEnforcementOutput | null>;

  // Quick checks
  readonly isColorCompliant: (colorHex: string) => Promise<boolean>;
  readonly isAccessibilityCompliant: (fg: string, bg: string) => Promise<boolean>;

  // Utilities
  readonly getPoliciesByScope: (scope: PolicyScope) => readonly EnterprisePolicy[];
  readonly getComplianceScore: () => number;
}

// ============================================================================
// CONTEXT
// ============================================================================

const GovernanceContext = createContext<GovernanceContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

/**
 * GovernanceProvider - React provider for enterprise governance.
 *
 * Wrap your application with this provider to enable governance
 * checks throughout your component tree.
 *
 * @example
 * ```tsx
 * // Basic usage
 * <GovernanceProvider>
 *   <App />
 * </GovernanceProvider>
 *
 * // Strict mode with audit logging
 * <GovernanceProvider mode="strict" enableAuditLog>
 *   <App />
 * </GovernanceProvider>
 *
 * // With custom policies
 * <GovernanceProvider customPolicies={[myCustomPolicy]}>
 *   <App />
 * </GovernanceProvider>
 * ```
 */
export function GovernanceProvider({
  children,
  mode: initialMode = 'default',
  enableAuditLog = false,
  customPolicies = [],
  failFast = true,
  autoFix = false,
}: GovernanceProviderConfig & { children: ReactNode }): ReactElement {
  // ─────────────────────────────────────────────────────────────────────────
  // STATE
  // ─────────────────────────────────────────────────────────────────────────

  const [mode, setMode] = useState<GovernanceMode>(initialMode);
  const [policySet, setPolicySet] = useState<PolicySet>(() => {
    const baseSet = getPolicySetForMode(initialMode);
    let result = baseSet;
    for (const policy of customPolicies) {
      result = result.add(policy);
    }
    return result;
  });
  const [complianceHistory, setComplianceHistory] = useState<number[]>([]);

  // ─────────────────────────────────────────────────────────────────────────
  // GOVERNANCE INSTANCE
  // ─────────────────────────────────────────────────────────────────────────

  const governance = useMemo(() => {
    if (mode === 'disabled') return null;

    const config: GovernanceConfig = {
      policySet,
      failFast,
      autoFix,
      auditPort: enableAuditLog ? new ConsoleAuditAdapter() : new NoOpAuditAdapter(),
    };

    return new EnforceEnterpriseGovernance(config);
  }, [mode, policySet, failFast, autoFix, enableAuditLog]);

  // ─────────────────────────────────────────────────────────────────────────
  // MODE CHANGE HANDLER
  // ─────────────────────────────────────────────────────────────────────────

  const handleSetMode = useCallback((newMode: GovernanceMode) => {
    setMode(newMode);
    if (newMode !== 'disabled') {
      const baseSet = getPolicySetForMode(newMode);
      let result = baseSet;
      for (const policy of customPolicies) {
        result = result.add(policy);
      }
      setPolicySet(result);
    }
  }, [customPolicies]);

  // ─────────────────────────────────────────────────────────────────────────
  // POLICY MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────

  const addPolicy = useCallback((policy: EnterprisePolicy) => {
    setPolicySet(prev => prev.add(policy));
  }, []);

  const removePolicy = useCallback((policyId: string) => {
    setPolicySet(prev => prev.remove(policyId));
  }, []);

  const enablePolicy = useCallback((policyId: string) => {
    setPolicySet(prev => {
      const policy = prev.get(policyId);
      if (!policy) return prev;
      return prev.remove(policyId).add(policy.withEnabled(true));
    });
  }, []);

  const disablePolicy = useCallback((policyId: string) => {
    setPolicySet(prev => {
      const policy = prev.get(policyId);
      if (!policy) return prev;
      return prev.remove(policyId).add(policy.withEnabled(false));
    });
  }, []);

  // ─────────────────────────────────────────────────────────────────────────
  // ENFORCEMENT METHODS
  // ─────────────────────────────────────────────────────────────────────────

  const checkColor = useCallback(async (
    colorHex: string,
    purpose?: 'brand' | 'text' | 'background' | 'border'
  ): Promise<GovernanceEnforcementOutput | null> => {
    if (!governance) return null;

    const colorResult = PerceptualColor.tryFromHex(colorHex);
    if (!colorResult.success) return null;

    const result = await governance.execute({
      subject: {
        type: 'color',
        color: colorResult.value,
        purpose,
      },
    });

    if (result.success) {
      setComplianceHistory(prev => [...prev.slice(-99), result.value.complianceScore]);
      return result.value;
    }
    return null;
  }, [governance]);

  const checkAccessibility = useCallback(async (
    foregroundHex: string,
    backgroundHex: string
  ): Promise<GovernanceEnforcementOutput | null> => {
    if (!governance) return null;

    const fgResult = PerceptualColor.tryFromHex(foregroundHex);
    const bgResult = PerceptualColor.tryFromHex(backgroundHex);
    if (!fgResult.success || !bgResult.success) return null;

    const fg = fgResult.value;
    const bg = bgResult.value;

    // Calculate contrast
    const fgLum = fg.oklch.l;
    const bgLum = bg.oklch.l;
    const lighter = Math.max(fgLum, bgLum);
    const darker = Math.min(fgLum, bgLum);
    const contrastRatio = (lighter + 0.05) / (darker + 0.05);
    const apcaValue = Math.abs(bgLum - fgLum) * 100;

    const result = await governance.execute({
      subject: {
        type: 'accessibility',
        foreground: fg,
        background: bg,
        contrastRatio,
        apcaValue,
      },
    });

    if (result.success) {
      setComplianceHistory(prev => [...prev.slice(-99), result.value.complianceScore]);
      return result.value;
    }
    return null;
  }, [governance]);

  const checkTokens = useCallback(async (
    tokens: TokenCollection
  ): Promise<GovernanceEnforcementOutput | null> => {
    if (!governance) return null;

    const result = await governance.execute({
      subject: {
        type: 'tokens',
        tokens,
      },
    });

    if (result.success) {
      setComplianceHistory(prev => [...prev.slice(-99), result.value.complianceScore]);
      return result.value;
    }
    return null;
  }, [governance]);

  const checkTheme = useCallback(async (config: {
    hasLightMode: boolean;
    hasDarkMode: boolean;
    brandColorHex?: string;
  }): Promise<GovernanceEnforcementOutput | null> => {
    if (!governance) return null;

    let brandColor: PerceptualColor | undefined;
    if (config.brandColorHex) {
      const colorResult = PerceptualColor.tryFromHex(config.brandColorHex);
      if (colorResult.success) {
        brandColor = colorResult.value;
      }
    }

    const result = await governance.execute({
      subject: {
        type: 'theme',
        hasLightMode: config.hasLightMode,
        hasDarkMode: config.hasDarkMode,
        brandColor,
      },
    });

    if (result.success) {
      setComplianceHistory(prev => [...prev.slice(-99), result.value.complianceScore]);
      return result.value;
    }
    return null;
  }, [governance]);

  const checkComponent = useCallback(async (
    componentName: string,
    tokens?: TokenCollection,
    brandColorHex?: string
  ): Promise<GovernanceEnforcementOutput | null> => {
    if (!governance) return null;

    let brandColor: PerceptualColor | undefined;
    if (brandColorHex) {
      const colorResult = PerceptualColor.tryFromHex(brandColorHex);
      if (colorResult.success) {
        brandColor = colorResult.value;
      }
    }

    const result = await governance.execute({
      subject: {
        type: 'component',
        componentName,
        tokens,
        brandColor,
      },
    });

    if (result.success) {
      setComplianceHistory(prev => [...prev.slice(-99), result.value.complianceScore]);
      return result.value;
    }
    return null;
  }, [governance]);

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK CHECKS
  // ─────────────────────────────────────────────────────────────────────────

  const isColorCompliant = useCallback(async (colorHex: string): Promise<boolean> => {
    const result = await checkColor(colorHex);
    return result?.compliant ?? true;
  }, [checkColor]);

  const isAccessibilityCompliant = useCallback(async (fg: string, bg: string): Promise<boolean> => {
    const result = await checkAccessibility(fg, bg);
    return result?.compliant ?? true;
  }, [checkAccessibility]);

  // ─────────────────────────────────────────────────────────────────────────
  // UTILITIES
  // ─────────────────────────────────────────────────────────────────────────

  const getPoliciesByScope = useCallback((scope: PolicyScope): readonly EnterprisePolicy[] => {
    return policySet.byScope(scope);
  }, [policySet]);

  const getComplianceScore = useCallback((): number => {
    if (complianceHistory.length === 0) return 100;
    const sum = complianceHistory.reduce((a, b) => a + b, 0);
    return sum / complianceHistory.length;
  }, [complianceHistory]);

  // ─────────────────────────────────────────────────────────────────────────
  // CONTEXT VALUE
  // ─────────────────────────────────────────────────────────────────────────

  const contextValue: GovernanceContextValue = useMemo(() => ({
    // State
    mode,
    policySet,
    isEnabled: mode !== 'disabled',

    // Actions
    setMode: handleSetMode,
    addPolicy,
    removePolicy,
    enablePolicy,
    disablePolicy,

    // Enforcement
    checkColor,
    checkAccessibility,
    checkTokens,
    checkTheme,
    checkComponent,

    // Quick checks
    isColorCompliant,
    isAccessibilityCompliant,

    // Utilities
    getPoliciesByScope,
    getComplianceScore,
  }), [
    mode,
    policySet,
    handleSetMode,
    addPolicy,
    removePolicy,
    enablePolicy,
    disablePolicy,
    checkColor,
    checkAccessibility,
    checkTokens,
    checkTheme,
    checkComponent,
    isColorCompliant,
    isAccessibilityCompliant,
    getPoliciesByScope,
    getComplianceScore,
  ]);

  return (
    <GovernanceContext.Provider value={contextValue}>
      {children}
    </GovernanceContext.Provider>
  );
}

// ============================================================================
// HOOKS
// ============================================================================

/**
 * Hook to access the governance context.
 *
 * @throws Error if used outside GovernanceProvider
 */
export function useGovernance(): GovernanceContextValue {
  const context = useContext(GovernanceContext);
  if (!context) {
    throw new Error('useGovernance must be used within a GovernanceProvider');
  }
  return context;
}

/**
 * Hook for color governance checks.
 *
 * @example
 * ```tsx
 * function ColorPicker({ color }: { color: string }) {
 *   const { isCompliant, result, check } = useColorGovernance(color);
 *
 *   return (
 *     <div>
 *       <div style={{ backgroundColor: color }} />
 *       {!isCompliant && <span>This color has issues</span>}
 *     </div>
 *   );
 * }
 * ```
 */
export function useColorGovernance(
  colorHex: string,
  purpose?: 'brand' | 'text' | 'background' | 'border'
) {
  const { checkColor, isEnabled } = useGovernance();
  const [result, setResult] = useState<GovernanceEnforcementOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    if (!isEnabled) return;
    setLoading(true);
    const res = await checkColor(colorHex, purpose);
    setResult(res);
    setLoading(false);
  }, [checkColor, colorHex, purpose, isEnabled]);

  useEffect(() => {
    check();
  }, [check]);

  return {
    isCompliant: result?.compliant ?? true,
    result,
    loading,
    check,
  };
}

/**
 * Hook for accessibility governance checks.
 */
export function useAccessibilityGovernance(foregroundHex: string, backgroundHex: string) {
  const { checkAccessibility, isEnabled } = useGovernance();
  const [result, setResult] = useState<GovernanceEnforcementOutput | null>(null);
  const [loading, setLoading] = useState(false);

  const check = useCallback(async () => {
    if (!isEnabled) return;
    setLoading(true);
    const res = await checkAccessibility(foregroundHex, backgroundHex);
    setResult(res);
    setLoading(false);
  }, [checkAccessibility, foregroundHex, backgroundHex, isEnabled]);

  useEffect(() => {
    check();
  }, [check]);

  return {
    isCompliant: result?.compliant ?? true,
    result,
    loading,
    check,
  };
}

/**
 * Hook to get overall compliance status.
 */
export function useComplianceStatus() {
  const { getComplianceScore, policySet, mode } = useGovernance();

  const score = getComplianceScore();
  const status = score >= 90 ? 'excellent' : score >= 70 ? 'good' : score >= 50 ? 'fair' : 'poor';

  return {
    score,
    status,
    mode,
    totalPolicies: policySet.size,
    enabledPolicies: policySet.enabled().length,
  };
}

// ============================================================================
// HELPERS
// ============================================================================

function getPolicySetForMode(mode: GovernanceMode): PolicySet {
  switch (mode) {
    case 'strict':
      return createStrictPolicySet();
    case 'lenient':
      return createLenientPolicySet();
    case 'disabled':
      return new PolicySet([]);
    default:
      return createDefaultPolicySet();
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { GovernanceContext };
export default GovernanceProvider;

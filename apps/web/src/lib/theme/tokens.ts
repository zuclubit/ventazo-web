// ============================================
// Design Tokens - Ventazo Design System 2025
// ============================================
// Exportable tokens for JS/TS usage
// All values reference CSS variables for dynamic theming
//
// This module provides:
// - Static tokens referencing CSS variables
// - Integration with @zuclubit/ui-kit TokenCollection
// - Type-safe access to the design system
// - React hooks for dynamic token access
// - Token derivation from brand colors
//
// Architecture:
// - Static tokens: CSS variable references (backward compatible)
// - TokenCollection: W3C DTCG compliant token management
// - TokenBridge: Bidirectional adapter for both systems
// ============================================

import * as React from 'react';
import { TokenBridge, type TokenNamespace } from '@/lib/bridges/TokenBridge';

// ============================================
// STATIC TOKENS (CSS Variable References)
// ============================================

/**
 * Semantic color tokens referencing CSS variables
 * These automatically adapt to light/dark mode and tenant branding
 */
export const colors = {
  // Tenant-aware semantic colors
  tenant: {
    primary: 'var(--tenant-primary)',
    primaryHover: 'var(--tenant-primary-hover)',
    primaryLight: 'var(--tenant-primary-light)',
    primaryLighter: 'var(--tenant-primary-lighter)',
    primaryGlow: 'var(--tenant-primary-glow)',
    accent: 'var(--tenant-accent)',
    accentHover: 'var(--tenant-accent-hover)',
    accentLight: 'var(--tenant-accent-light)',
    accentGlow: 'var(--tenant-accent-glow)',
    surface: 'var(--tenant-surface)',
    surfaceLight: 'var(--tenant-surface-light)',
    surfaceBorder: 'var(--tenant-surface-border)',
    sidebar: 'var(--tenant-sidebar)',
  },

  // Task Status colors
  status: {
    pending: {
      text: 'var(--status-pending)',
      bg: 'var(--status-pending-bg)',
      border: 'var(--status-pending-border)',
    },
    inProgress: {
      text: 'var(--status-in-progress)',
      bg: 'var(--status-in-progress-bg)',
      border: 'var(--status-in-progress-border)',
    },
    completed: {
      text: 'var(--status-completed)',
      bg: 'var(--status-completed-bg)',
      border: 'var(--status-completed-border)',
    },
    cancelled: {
      text: 'var(--status-cancelled)',
      bg: 'var(--status-cancelled-bg)',
      border: 'var(--status-cancelled-border)',
    },
    deferred: {
      text: 'var(--status-deferred)',
      bg: 'var(--status-deferred-bg)',
      border: 'var(--status-deferred-border)',
    },
  },

  // Task Priority colors
  priority: {
    low: {
      text: 'var(--priority-low)',
      bg: 'var(--priority-low-bg)',
      border: 'var(--priority-low-border)',
    },
    medium: {
      text: 'var(--priority-medium)',
      bg: 'var(--priority-medium-bg)',
      border: 'var(--priority-medium-border)',
    },
    high: {
      text: 'var(--priority-high)',
      bg: 'var(--priority-high-bg)',
      border: 'var(--priority-high-border)',
    },
    urgent: {
      text: 'var(--priority-urgent)',
      bg: 'var(--priority-urgent-bg)',
      border: 'var(--priority-urgent-border)',
    },
  },

  // Lead score temperature
  score: {
    hot: {
      gradient: 'var(--score-hot-gradient)',
      shadow: 'var(--score-hot-shadow)',
      bg: 'var(--score-hot-bg)',
      border: 'var(--score-hot-border)',
    },
    warm: {
      gradient: 'var(--score-warm-gradient)',
      shadow: 'var(--score-warm-shadow)',
      bg: 'var(--score-warm-bg)',
      border: 'var(--score-warm-border)',
    },
    cold: {
      gradient: 'var(--score-cold-gradient)',
      shadow: 'var(--score-cold-shadow)',
      bg: 'var(--score-cold-bg)',
      border: 'var(--score-cold-border)',
    },
  },

  // Kanban stage colors
  stage: {
    new: 'var(--stage-new)',
    contacted: 'var(--stage-contacted)',
    qualified: 'var(--stage-qualified)',
    proposal: 'var(--stage-proposal)',
    won: 'var(--stage-won)',
    lost: 'var(--stage-lost)',
  },

  // Customer health
  health: {
    excellent: {
      text: 'var(--health-excellent)',
      bg: 'var(--health-excellent-bg)',
      border: 'var(--health-excellent-border)',
      glow: 'var(--health-excellent-glow)',
    },
    good: {
      text: 'var(--health-good)',
      bg: 'var(--health-good-bg)',
      border: 'var(--health-good-border)',
      glow: 'var(--health-good-glow)',
    },
    atRisk: {
      text: 'var(--health-at-risk)',
      bg: 'var(--health-at-risk-bg)',
      border: 'var(--health-at-risk-border)',
      glow: 'var(--health-at-risk-glow)',
    },
    critical: {
      text: 'var(--health-critical)',
      bg: 'var(--health-critical-bg)',
      border: 'var(--health-critical-border)',
      glow: 'var(--health-critical-glow)',
    },
  },

  // Channel colors
  channel: {
    whatsapp: 'var(--channel-whatsapp)',
    social: 'var(--channel-social)',
    email: 'var(--channel-email)',
    phone: 'var(--channel-phone)',
    website: 'var(--channel-website)',
    organic: 'var(--channel-organic)',
    referral: 'var(--channel-referral)',
    ad: 'var(--channel-ad)',
  },
} as const;

/**
 * Spacing tokens following 4px grid
 */
export const spacing = {
  card: {
    sm: 'var(--card-padding-sm)',
    md: 'var(--card-padding-md)',
    lg: 'var(--card-padding-lg)',
  },
  gap: {
    sm: 'var(--card-gap-sm)',
    md: 'var(--card-gap)',
  },
  kanban: {
    columnWidth: 'var(--kanban-column-width)',
    columnMinHeight: 'var(--kanban-column-min-height)',
    cardGap: 'var(--kanban-card-gap)',
    headerHeight: 'var(--kanban-header-height)',
    emptyHeight: 'var(--kanban-empty-height)',
  },
  sidebar: {
    width: 'var(--sidebar-width)',
    collapsedWidth: 'var(--sidebar-collapsed-width)',
    expandedWidth: 'var(--sidebar-expanded-width)',
    headerHeight: 'var(--sidebar-header-height)',
    footerHeight: 'var(--sidebar-footer-height)',
    itemHeight: 'var(--sidebar-item-height)',
    paddingX: 'var(--sidebar-padding-x)',
    paddingY: 'var(--sidebar-padding-y)',
  },
  touch: {
    min: 'var(--touch-target-min)',
    comfortable: 'var(--touch-target-comfortable)',
    large: 'var(--touch-target-large)',
  },
} as const;

/**
 * Border radius tokens
 */
export const radius = {
  card: 'var(--radius-card)',
  modal: 'var(--radius-modal)',
  button: 'var(--radius-button)',
  input: 'var(--radius-input)',
  badge: 'var(--radius-badge)',
  chip: 'var(--radius-chip)',
  cardSm: 'var(--card-radius-sm)',
  cardMd: 'var(--card-radius-md)',
  cardLg: 'var(--card-radius-lg)',
  cardInternal: 'var(--card-radius-internal)',
} as const;

/**
 * Shadow tokens
 */
export const shadows = {
  // Scale
  xs: 'var(--shadow-xs)',
  sm: 'var(--shadow-sm)',
  md: 'var(--shadow-md)',
  lg: 'var(--shadow-lg)',
  xl: 'var(--shadow-xl)',
  '2xl': 'var(--shadow-2xl)',
  // Card-specific
  card: {
    base: 'var(--card-shadow-base)',
    hover: 'var(--card-shadow-hover)',
    elevated: 'var(--card-shadow-elevated)',
    dragging: 'var(--card-shadow-dragging)',
  },
  // Glass
  glass: 'var(--glass-shadow)',
  glassHover: 'var(--glass-shadow-hover)',
} as const;

/**
 * Animation/transition tokens
 */
export const transitions = {
  micro: 'var(--transition-micro)',
  fast: 'var(--transition-fast)',
  normal: 'var(--transition-normal)',
  slow: 'var(--transition-slow)',
  spring: 'var(--spring)',
  sidebarFast: 'var(--sidebar-transition-fast)',
  sidebarNormal: 'var(--sidebar-transition-normal)',
  sidebarSlow: 'var(--sidebar-transition-slow)',
  sidebarSpring: 'var(--sidebar-spring)',
} as const;

/**
 * Glass/blur tokens
 */
export const glass = {
  blur: 'var(--glass-blur)',
  background: 'var(--glass-background)',
  backgroundLight: 'var(--glass-background-light)',
  border: 'var(--glass-border-color)',
  borderHover: 'var(--glass-border-hover)',
} as const;

/**
 * Typography tokens
 */
export const typography = {
  text: {
    bright: 'var(--text-bright)',
    secondary: 'var(--text-secondary)',
    muted: 'var(--text-muted)',
    accent: 'var(--text-accent)',
    accentHover: 'var(--text-accent-hover)',
  },
  metric: {
    iconSize: 'var(--metric-icon-size)',
    valueSize: 'var(--metric-value-size)',
    labelSize: 'var(--metric-label-size)',
  },
  badge: {
    height: 'var(--badge-height)',
    paddingX: 'var(--badge-padding-x)',
    radius: 'var(--badge-radius)',
    fontSize: 'var(--badge-font-size)',
  },
} as const;

/**
 * Tailwind class mappings for status colors
 * Use these in components with cn() for dynamic status styling
 */
export const statusClasses = {
  pending: 'bg-[var(--status-pending-bg)] text-[var(--status-pending)] border-[var(--status-pending-border)]',
  in_progress: 'bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress)] border-[var(--status-in-progress-border)]',
  completed: 'bg-[var(--status-completed-bg)] text-[var(--status-completed)] border-[var(--status-completed-border)]',
  cancelled: 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)] border-[var(--status-cancelled-border)]',
  deferred: 'bg-[var(--status-deferred-bg)] text-[var(--status-deferred)] border-[var(--status-deferred-border)]',
} as const;

/**
 * Tailwind class mappings for priority colors
 */
export const priorityClasses = {
  low: 'bg-[var(--priority-low-bg)] text-[var(--priority-low)] border-[var(--priority-low-border)]',
  medium: 'bg-[var(--priority-medium-bg)] text-[var(--priority-medium)] border-[var(--priority-medium-border)]',
  high: 'bg-[var(--priority-high-bg)] text-[var(--priority-high)] border-[var(--priority-high-border)]',
  urgent: 'bg-[var(--priority-urgent-bg)] text-[var(--priority-urgent)] border-[var(--priority-urgent-border)]',
} as const;

/**
 * Breakpoint tokens matching Tailwind config
 * Use these for JS-based responsive logic
 */
export const breakpoints = {
  xs: 375,   // iPhone SE/Mini
  sm: 640,   // Small tablets
  md: 768,   // Tablets
  lg: 1024,  // Small laptops
  xl: 1280,  // Desktops
  '2xl': 1536, // Large screens
} as const;

/**
 * Responsive spacing utilities
 * Returns appropriate spacing based on screen size context
 */
export const responsiveSpacing = {
  // Card padding that adapts
  cardPadding: {
    mobile: 'p-3',        // 12px
    tablet: 'sm:p-4',     // 16px
    desktop: 'md:p-5',    // 20px
  },
  // Gap between items
  gap: {
    mobile: 'gap-2',      // 8px
    tablet: 'sm:gap-3',   // 12px
    desktop: 'md:gap-4',  // 16px
  },
  // Kanban-specific responsive
  kanban: {
    columnPadding: 'p-2.5 sm:p-3',
    cardGap: 'space-y-2.5 sm:space-y-3',
    headerPadding: 'px-3 py-2.5 sm:px-4 sm:py-3',
  },
} as const;

/**
 * Touch target sizes (WCAG 2.5.5 compliant)
 */
export const touchTargets = {
  min: 'min-h-[44px] min-w-[44px]',  // WCAG minimum
  button: 'h-11 w-11',               // 44px
  buttonSm: 'h-9 w-9',               // 36px (with padding)
  iconButton: 'h-8 w-8 sm:h-7 sm:w-7', // Responsive icon button
  comfortable: 'min-h-[48px]',       // Comfortable touch
} as const;

/**
 * Responsive visibility utilities
 */
export const responsiveVisibility = {
  mobileOnly: 'flex sm:hidden',
  tabletUp: 'hidden sm:flex',
  desktopOnly: 'hidden lg:flex',
  mobileHidden: 'hidden sm:block',
} as const;

/**
 * Integration provider color tokens
 * Used by ConnectedCalendarCard, email integrations, etc.
 */
export const integrationColors = {
  google: {
    base: 'var(--integration-google)',
    light: 'var(--integration-google-light)',
    bg: 'var(--integration-google-bg)',
    text: 'var(--integration-google-text)',
  },
  microsoft: {
    base: 'var(--integration-microsoft)',
    light: 'var(--integration-microsoft-light)',
    bg: 'var(--integration-microsoft-bg)',
    text: 'var(--integration-microsoft-text)',
  },
  status: {
    connected: 'var(--integration-status-connected)',
    connectedBg: 'var(--integration-status-connected-bg)',
    connectedHover: 'var(--integration-status-connected-hover)',
    warning: 'var(--integration-status-warning)',
    warningBg: 'var(--integration-status-warning-bg)',
    warningBorder: 'var(--integration-status-warning-border)',
    warningText: 'var(--integration-status-warning-text)',
  },
} as const;

/**
 * Tailwind class mappings for integration providers
 */
export const integrationClasses = {
  google: {
    text: 'text-[var(--integration-google-text)]',
    bg: 'bg-[var(--integration-google)]',
    bgLight: 'bg-[var(--integration-google-bg)]',
  },
  microsoft: {
    text: 'text-[var(--integration-microsoft-text)]',
    bg: 'bg-[var(--integration-microsoft)]',
    bgLight: 'bg-[var(--integration-microsoft-bg)]',
  },
  connected: {
    badge: 'bg-[var(--integration-status-connected)] hover:bg-[var(--integration-status-connected-hover)]',
  },
  warning: {
    container: 'bg-[var(--integration-status-warning-bg)] border-[var(--integration-status-warning-border)]',
    text: 'text-[var(--integration-status-warning-text)]',
  },
} as const;

/**
 * Responsive card class compositions
 * Pre-built responsive class strings for common patterns
 */
export const responsiveCardClasses = {
  // Base card with responsive padding
  base: 'rounded-xl border bg-card p-3 sm:p-4 md:p-5 transition-all duration-200',
  // Interactive card (clickable)
  interactive: 'hover:shadow-md hover:border-primary/20 cursor-pointer',
  // Card with touch-friendly sizing
  touchFriendly: 'min-h-[44px] active:scale-[0.98] transition-transform',
  // Kanban card
  kanban: 'rounded-xl border bg-card p-3 transition-all duration-200 hover:shadow-md',
  // Form card
  form: 'rounded-xl border bg-card p-4 sm:p-6',
} as const;

/**
 * Combined tokens export
 */
export const tokens = {
  colors,
  spacing,
  radius,
  shadows,
  transitions,
  glass,
  typography,
  statusClasses,
  priorityClasses,
  // New responsive tokens
  breakpoints,
  responsiveSpacing,
  touchTargets,
  responsiveVisibility,
  integrationColors,
  integrationClasses,
  responsiveCardClasses,
} as const;

export type StatusKey = keyof typeof statusClasses;
export type PriorityKey = keyof typeof priorityClasses;
export type ColorTokens = typeof colors;
export type SpacingTokens = typeof spacing;
export type RadiusTokens = typeof radius;
export type ShadowTokens = typeof shadows;
export type TransitionTokens = typeof transitions;
export type BreakpointKey = keyof typeof breakpoints;
export type IntegrationProvider = keyof typeof integrationColors;

// ============================================
// TOKEN COLLECTION INTEGRATION
// ============================================

/**
 * Get TokenCollection for a specific namespace.
 * Uses TokenBridge for W3C DTCG compliant token access.
 *
 * @example
 * ```typescript
 * const typographyTokens = getTokenCollection('typography');
 * const allTokens = getTokenCollection('all');
 * ```
 */
export function getTokenCollection(namespace: TokenNamespace | 'all' = 'all') {
  return TokenBridge.getAllTokens();
}

/**
 * Get a specific token by name from TokenBridge.
 *
 * @example
 * ```typescript
 * const fontSize = getToken('typography.fontSize.lg');
 * ```
 */
export function getToken(name: string) {
  return TokenBridge.getToken(name);
}

/**
 * Query tokens by filter criteria.
 *
 * @example
 * ```typescript
 * const buttonTokens = queryTokens({ component: 'button' });
 * ```
 */
export function queryTokens(criteria: Parameters<typeof TokenBridge.query>[0]) {
  return TokenBridge.query(criteria);
}

// ============================================
// TOKEN DERIVATION HELPERS
// ============================================

/**
 * Derive a color scale (50-950) from a base color.
 * Uses perceptually uniform OKLCH color space.
 *
 * @example
 * ```typescript
 * const brandScale = deriveColorScale('brand', '#3B82F6');
 * // Returns tokens: brand.50, brand.100, ... brand.950
 * ```
 */
export function deriveColorScale(baseName: string, baseHex: string) {
  return TokenBridge.deriveColorScale(baseName, baseHex);
}

/**
 * Derive state variants for a color (idle, hover, active, disabled).
 *
 * @example
 * ```typescript
 * const buttonStates = deriveStateTokens('button-primary', '#3B82F6');
 * ```
 */
export function deriveStateTokens(baseName: string, baseHex: string) {
  return TokenBridge.deriveStateTokens(baseName, baseHex);
}

/**
 * Derive component tokens from a brand color.
 *
 * @example
 * ```typescript
 * const cardTokens = deriveComponentTokens('card', '#3B82F6');
 * ```
 */
export function deriveComponentTokens(componentName: string, brandHex: string, intent?: string) {
  return TokenBridge.deriveComponentTokens(componentName, brandHex, intent);
}

/**
 * Derive a complete theme from a brand color.
 *
 * @example
 * ```typescript
 * const theme = deriveThemeTokens('ventazo', '#3B82F6', {
 *   includeSemanticColors: true,
 *   includeShadows: true,
 * });
 * ```
 */
export function deriveThemeTokens(
  themeName: string,
  brandHex: string,
  options?: {
    includeSemanticColors?: boolean;
    includeShadows?: boolean;
    includeSpacing?: boolean;
  }
) {
  return TokenBridge.deriveTheme(themeName, brandHex, options);
}

// ============================================
// TOKEN EXPORT HELPERS
// ============================================

/**
 * Export tokens to CSS variables.
 *
 * @example
 * ```typescript
 * const cssVars = exportTokensToCss('typography', { prefix: 'vz' });
 * ```
 */
export function exportTokensToCss(
  namespace: TokenNamespace | 'all' = 'all',
  options?: { prefix?: string; includeDeprecated?: boolean }
) {
  return TokenBridge.exportToCss(namespace, options);
}

/**
 * Export tokens to Tailwind config format.
 */
export function exportTokensToTailwind(namespace: TokenNamespace | 'all' = 'all') {
  return TokenBridge.exportToTailwind(namespace);
}

/**
 * Export tokens to W3C DTCG format (JSON).
 */
export function exportTokensToW3C(namespace: TokenNamespace | 'all' = 'all') {
  return TokenBridge.exportToW3C(namespace);
}

/**
 * Export tokens to Figma Tokens plugin format.
 */
export function exportTokensToFigma(namespace: TokenNamespace | 'all' = 'all') {
  return TokenBridge.exportToFigma(namespace);
}

// ============================================
// REACT HOOKS FOR TOKEN ACCESS
// ============================================

/**
 * React hook for accessing TokenCollection.
 * Provides memoized access to design tokens with optional namespace filtering.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { tokens, getToken, query, stats } = useTokenCollection('typography');
 *
 *   const fontSize = getToken('typography.fontSize.lg');
 *   return <div style={{ fontSize: fontSize?.value }}>...</div>;
 * }
 * ```
 */
export function useTokenCollection(namespace: TokenNamespace | 'all' = 'all') {
  const collection = React.useMemo(() => {
    switch (namespace) {
      case 'typography':
        return TokenBridge.getTypographyCollection();
      case 'spacing':
        return TokenBridge.getSpacingCollection();
      case 'component':
        return TokenBridge.getComponentCollection();
      case 'animation':
        return TokenBridge.getAnimationCollection();
      case 'breakpoint':
        return TokenBridge.getBreakpointCollection();
      case 'all':
      default:
        return TokenBridge.getAllTokens();
    }
  }, [namespace]);

  const getTokenByName = React.useCallback(
    (name: string) => collection.get(name),
    [collection]
  );

  const queryCollection = React.useCallback(
    (criteria: Parameters<typeof TokenBridge.query>[0]) => collection.filter(criteria),
    [collection]
  );

  const stats = React.useMemo(() => collection.stats(), [collection]);

  return {
    /** The TokenCollection instance */
    collection,
    /** All tokens in the collection */
    tokens: collection.all,
    /** Get a specific token by name */
    getToken: getTokenByName,
    /** Query tokens by criteria */
    query: queryCollection,
    /** Collection statistics */
    stats,
    /** Export to CSS */
    exportToCss: (options?: { prefix?: string }) => collection.export({ format: 'css', ...options }),
    /** Export to Tailwind */
    exportToTailwind: () => collection.export({ format: 'tailwind' }),
    /** Export to W3C DTCG */
    exportToW3C: () => collection.export({ format: 'w3c', includeMetadata: true }),
  };
}

/**
 * React hook for deriving tokens from a brand color.
 * Automatically re-derives when the brand color changes.
 *
 * @example
 * ```tsx
 * function BrandedComponent({ brandColor }) {
 *   const { scale, states, theme } = useDerivedTokens(brandColor);
 *
 *   // Use derived tokens for styling
 *   return <div style={{
 *     background: scale.find(t => t.name.endsWith('.500'))?.value
 *   }}>...</div>;
 * }
 * ```
 */
export function useDerivedTokens(
  brandHex: string | undefined,
  options?: {
    scaleName?: string;
    themeName?: string;
    includeSemanticColors?: boolean;
    includeShadows?: boolean;
  }
) {
  const {
    scaleName = 'brand',
    themeName = 'derived',
    includeSemanticColors = true,
    includeShadows = true,
  } = options ?? {};

  const derivedScale = React.useMemo(() => {
    if (!brandHex) return [];
    return TokenBridge.deriveColorScale(scaleName, brandHex);
  }, [brandHex, scaleName]);

  const derivedStates = React.useMemo(() => {
    if (!brandHex) return [];
    return TokenBridge.deriveStateTokens(scaleName, brandHex);
  }, [brandHex, scaleName]);

  const derivedTheme = React.useMemo(() => {
    if (!brandHex) return null;
    return TokenBridge.deriveTheme(themeName, brandHex, {
      includeSemanticColors,
      includeShadows,
    });
  }, [brandHex, themeName, includeSemanticColors, includeShadows]);

  return {
    /** Color scale from 50-950 */
    scale: derivedScale,
    /** State variants (idle, hover, active, disabled) */
    states: derivedStates,
    /** Complete theme TokenCollection */
    theme: derivedTheme,
    /** Whether derivation is ready */
    isReady: Boolean(brandHex),
  };
}

/**
 * React hook for accessing legacy static tokens with type safety.
 * Provides the same interface as static tokens but with React memoization.
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { typography, spacing, breakpoints } = useStaticTokens();
 *   return <div style={{ fontSize: typography.fontSize.lg }}>...</div>;
 * }
 * ```
 */
export function useStaticTokens() {
  return React.useMemo(() => ({
    colors,
    spacing,
    radius,
    shadows,
    transitions,
    glass,
    typography,
    statusClasses,
    priorityClasses,
    breakpoints,
    responsiveSpacing,
    touchTargets,
    responsiveVisibility,
    integrationColors,
    integrationClasses,
    responsiveCardClasses,
  }), []);
}

/**
 * React hook for responsive breakpoint detection.
 * Returns current breakpoint and helper functions.
 *
 * @example
 * ```tsx
 * function ResponsiveComponent() {
 *   const { current, isAbove, isBelow } = useBreakpoint();
 *
 *   return (
 *     <div style={{
 *       padding: isAbove('md') ? '24px' : '12px'
 *     }}>
 *       Current: {current}
 *     </div>
 *   );
 * }
 * ```
 */
export function useBreakpoint() {
  const [windowWidth, setWindowWidth] = React.useState<number>(
    typeof window !== 'undefined' ? window.innerWidth : 1024
  );

  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const current = React.useMemo((): BreakpointKey => {
    if (windowWidth >= breakpoints['2xl']) return '2xl';
    if (windowWidth >= breakpoints.xl) return 'xl';
    if (windowWidth >= breakpoints.lg) return 'lg';
    if (windowWidth >= breakpoints.md) return 'md';
    if (windowWidth >= breakpoints.sm) return 'sm';
    return 'xs';
  }, [windowWidth]);

  const isAbove = React.useCallback(
    (bp: BreakpointKey) => windowWidth >= breakpoints[bp],
    [windowWidth]
  );

  const isBelow = React.useCallback(
    (bp: BreakpointKey) => windowWidth < breakpoints[bp],
    [windowWidth]
  );

  const isBetween = React.useCallback(
    (minBp: BreakpointKey, maxBp: BreakpointKey) =>
      windowWidth >= breakpoints[minBp] && windowWidth < breakpoints[maxBp],
    [windowWidth]
  );

  return {
    /** Current breakpoint key */
    current,
    /** Window width in pixels */
    width: windowWidth,
    /** Check if above breakpoint */
    isAbove,
    /** Check if below breakpoint */
    isBelow,
    /** Check if between breakpoints */
    isBetween,
    /** Is mobile (below sm) */
    isMobile: windowWidth < breakpoints.sm,
    /** Is tablet (sm to lg) */
    isTablet: windowWidth >= breakpoints.sm && windowWidth < breakpoints.lg,
    /** Is desktop (lg and above) */
    isDesktop: windowWidth >= breakpoints.lg,
  };
}

// ============================================
// TOKEN VALIDATION
// ============================================

/**
 * Validate all token collections.
 * Returns validation results with errors and warnings.
 */
export function validateTokens() {
  return TokenBridge.validate();
}

/**
 * Get token statistics.
 */
export function getTokenStats() {
  return TokenBridge.getStats();
}

/**
 * Preload all token collections into cache.
 * Call during app initialization for optimal performance.
 */
export function preloadTokens() {
  TokenBridge.preload();
}

/**
 * Clear token cache. Call when tokens change at runtime.
 */
export function clearTokenCache() {
  TokenBridge.clearCache();
}

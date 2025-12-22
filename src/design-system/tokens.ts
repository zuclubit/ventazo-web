// ============================================
// Design Tokens - FASE 4
// Core design system values
// ============================================

// ============================================
// Colors
// ============================================

export const colors = {
  // Brand colors
  brand: {
    primary: 'hsl(var(--primary))',
    primaryForeground: 'hsl(var(--primary-foreground))',
    secondary: 'hsl(var(--secondary))',
    secondaryForeground: 'hsl(var(--secondary-foreground))',
  },

  // Semantic colors
  semantic: {
    success: 'hsl(var(--success))',
    successForeground: 'hsl(var(--success-foreground))',
    warning: 'hsl(var(--warning))',
    warningForeground: 'hsl(var(--warning-foreground))',
    destructive: 'hsl(var(--destructive))',
    destructiveForeground: 'hsl(var(--destructive-foreground))',
    info: 'hsl(var(--info))',
    infoForeground: 'hsl(var(--info-foreground))',
  },

  // UI colors
  ui: {
    background: 'hsl(var(--background))',
    foreground: 'hsl(var(--foreground))',
    card: 'hsl(var(--card))',
    cardForeground: 'hsl(var(--card-foreground))',
    popover: 'hsl(var(--popover))',
    popoverForeground: 'hsl(var(--popover-foreground))',
    muted: 'hsl(var(--muted))',
    mutedForeground: 'hsl(var(--muted-foreground))',
    accent: 'hsl(var(--accent))',
    accentForeground: 'hsl(var(--accent-foreground))',
    border: 'hsl(var(--border))',
    input: 'hsl(var(--input))',
    ring: 'hsl(var(--ring))',
  },

  // Chart colors
  chart: {
    1: 'hsl(var(--chart-1))',
    2: 'hsl(var(--chart-2))',
    3: 'hsl(var(--chart-3))',
    4: 'hsl(var(--chart-4))',
    5: 'hsl(var(--chart-5))',
  },

  // Lead status colors (CRM specific)
  leadStatus: {
    new: '#3B82F6', // blue
    contacted: '#8B5CF6', // purple
    qualified: '#10B981', // green
    proposal: '#F59E0B', // amber
    negotiation: '#EC4899', // pink
    won: '#22C55E', // success green
    lost: '#EF4444', // red
  },

  // Priority colors
  priority: {
    low: '#6B7280', // gray
    medium: '#F59E0B', // amber
    high: '#EF4444', // red
    urgent: '#DC2626', // dark red
  },
} as const;

// ============================================
// Typography
// ============================================

export const typography = {
  // Font families
  fontFamily: {
    sans: 'var(--font-sans)',
    mono: 'var(--font-mono)',
  },

  // Font sizes (tailwind scale)
  fontSize: {
    xs: '0.75rem', // 12px
    sm: '0.875rem', // 14px
    base: '1rem', // 16px
    lg: '1.125rem', // 18px
    xl: '1.25rem', // 20px
    '2xl': '1.5rem', // 24px
    '3xl': '1.875rem', // 30px
    '4xl': '2.25rem', // 36px
    '5xl': '3rem', // 48px
  },

  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },

  // Line heights
  lineHeight: {
    none: '1',
    tight: '1.25',
    snug: '1.375',
    normal: '1.5',
    relaxed: '1.625',
    loose: '2',
  },

  // Letter spacing
  letterSpacing: {
    tighter: '-0.05em',
    tight: '-0.025em',
    normal: '0em',
    wide: '0.025em',
    wider: '0.05em',
  },
} as const;

// ============================================
// Spacing
// ============================================

export const spacing = {
  px: '1px',
  0: '0',
  0.5: '0.125rem', // 2px
  1: '0.25rem', // 4px
  1.5: '0.375rem', // 6px
  2: '0.5rem', // 8px
  2.5: '0.625rem', // 10px
  3: '0.75rem', // 12px
  3.5: '0.875rem', // 14px
  4: '1rem', // 16px
  5: '1.25rem', // 20px
  6: '1.5rem', // 24px
  7: '1.75rem', // 28px
  8: '2rem', // 32px
  9: '2.25rem', // 36px
  10: '2.5rem', // 40px
  11: '2.75rem', // 44px
  12: '3rem', // 48px
  14: '3.5rem', // 56px
  16: '4rem', // 64px
  20: '5rem', // 80px
  24: '6rem', // 96px
  28: '7rem', // 112px
  32: '8rem', // 128px
  36: '9rem', // 144px
  40: '10rem', // 160px
  44: '11rem', // 176px
  48: '12rem', // 192px
  52: '13rem', // 208px
  56: '14rem', // 224px
  60: '15rem', // 240px
  64: '16rem', // 256px
  72: '18rem', // 288px
  80: '20rem', // 320px
  96: '24rem', // 384px
} as const;

// ============================================
// Border Radius
// ============================================

export const borderRadius = {
  none: '0',
  sm: 'calc(var(--radius) - 4px)',
  md: 'calc(var(--radius) - 2px)',
  lg: 'var(--radius)',
  xl: 'calc(var(--radius) + 4px)',
  '2xl': 'calc(var(--radius) + 8px)',
  '3xl': 'calc(var(--radius) + 12px)',
  full: '9999px',
} as const;

// ============================================
// Shadows
// ============================================

export const shadows = {
  sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
  DEFAULT: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
  md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
  xl: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
  '2xl': '0 25px 50px -12px rgb(0 0 0 / 0.25)',
  inner: 'inset 0 2px 4px 0 rgb(0 0 0 / 0.05)',
  none: 'none',
} as const;

// ============================================
// Z-Index
// ============================================

export const zIndex = {
  auto: 'auto',
  0: '0',
  10: '10',
  20: '20',
  30: '30',
  40: '40',
  50: '50', // Default overlays
  60: '60', // Dropdowns, popovers
  70: '70', // Modals
  80: '80', // Toasts
  90: '90', // Tooltips
  100: '100', // Maximum
} as const;

// ============================================
// Breakpoints
// ============================================

export const breakpoints = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// Transitions
// ============================================

export const transitions = {
  duration: {
    fastest: '50ms',
    faster: '100ms',
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
    slowest: '700ms',
  },
  easing: {
    linear: 'linear',
    in: 'cubic-bezier(0.4, 0, 1, 1)',
    out: 'cubic-bezier(0, 0, 0.2, 1)',
    inOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
  },
} as const;

// ============================================
// Component-specific tokens
// ============================================

export const components = {
  // Button sizes
  button: {
    sm: {
      height: '2rem', // 32px
      paddingX: '0.75rem', // 12px
      fontSize: '0.875rem', // 14px
    },
    md: {
      height: '2.5rem', // 40px
      paddingX: '1rem', // 16px
      fontSize: '0.875rem', // 14px
    },
    lg: {
      height: '3rem', // 48px
      paddingX: '1.5rem', // 24px
      fontSize: '1rem', // 16px
    },
    icon: {
      sm: '2rem', // 32px
      md: '2.5rem', // 40px
      lg: '3rem', // 48px
    },
  },

  // Input sizes
  input: {
    sm: {
      height: '2rem', // 32px
      paddingX: '0.5rem', // 8px
      fontSize: '0.875rem', // 14px
    },
    md: {
      height: '2.5rem', // 40px
      paddingX: '0.75rem', // 12px
      fontSize: '0.875rem', // 14px
    },
    lg: {
      height: '3rem', // 48px
      paddingX: '1rem', // 16px
      fontSize: '1rem', // 16px
    },
  },

  // Card
  card: {
    padding: {
      sm: '1rem', // 16px
      md: '1.5rem', // 24px
      lg: '2rem', // 32px
    },
    borderRadius: 'var(--radius)',
  },

  // Avatar sizes
  avatar: {
    xs: '1.5rem', // 24px
    sm: '2rem', // 32px
    md: '2.5rem', // 40px
    lg: '3rem', // 48px
    xl: '4rem', // 64px
    '2xl': '5rem', // 80px
  },

  // Badge sizes
  badge: {
    sm: {
      height: '1.25rem', // 20px
      paddingX: '0.375rem', // 6px
      fontSize: '0.625rem', // 10px
    },
    md: {
      height: '1.5rem', // 24px
      paddingX: '0.5rem', // 8px
      fontSize: '0.75rem', // 12px
    },
    lg: {
      height: '1.75rem', // 28px
      paddingX: '0.625rem', // 10px
      fontSize: '0.875rem', // 14px
    },
  },
} as const;

// ============================================
// Export all tokens
// ============================================

export const tokens = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  zIndex,
  breakpoints,
  transitions,
  components,
} as const;

export type DesignTokens = typeof tokens;

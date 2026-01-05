// ============================================
// Design Tokens - FASE 5.12
// Centralized design system tokens for consistency
// ============================================

// ============================================
// Typography Scale
// ============================================

export const TYPOGRAPHY = {
  // Font sizes following a consistent scale
  fontSize: {
    '2xs': '0.625rem',   // 10px
    xs: '0.75rem',       // 12px
    sm: '0.875rem',      // 14px
    base: '1rem',        // 16px
    lg: '1.125rem',      // 18px
    xl: '1.25rem',       // 20px
    '2xl': '1.5rem',     // 24px
    '3xl': '1.875rem',   // 30px
    '4xl': '2.25rem',    // 36px
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
  // Font weights
  fontWeight: {
    normal: '400',
    medium: '500',
    semibold: '600',
    bold: '700',
  },
} as const;

// ============================================
// Spacing Scale
// ============================================

export const SPACING = {
  // Consistent spacing scale (in rem)
  0: '0',
  0.5: '0.125rem',   // 2px
  1: '0.25rem',      // 4px
  1.5: '0.375rem',   // 6px
  2: '0.5rem',       // 8px
  2.5: '0.625rem',   // 10px
  3: '0.75rem',      // 12px
  3.5: '0.875rem',   // 14px
  4: '1rem',         // 16px
  5: '1.25rem',      // 20px
  6: '1.5rem',       // 24px
  7: '1.75rem',      // 28px
  8: '2rem',         // 32px
  9: '2.25rem',      // 36px
  10: '2.5rem',      // 40px
  11: '2.75rem',     // 44px
  12: '3rem',        // 48px
  14: '3.5rem',      // 56px
  16: '4rem',        // 64px
  20: '5rem',        // 80px
  24: '6rem',        // 96px
} as const;

// ============================================
// Component Tokens
// ============================================

export const COMPONENTS = {
  // Card variants
  card: {
    padding: {
      sm: SPACING[4],
      md: SPACING[6],
      lg: SPACING[8],
    },
    borderRadius: 'var(--radius)',
    shadow: '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
    shadowHover: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
  },
  // Button sizes
  button: {
    height: {
      sm: '2rem',       // 32px
      default: '2.5rem', // 40px
      lg: '2.75rem',    // 44px
      xl: '3rem',       // 48px
    },
    padding: {
      sm: '0.75rem',
      default: '1rem',
      lg: '1.5rem',
    },
    fontSize: {
      sm: TYPOGRAPHY.fontSize.xs,
      default: TYPOGRAPHY.fontSize.sm,
      lg: TYPOGRAPHY.fontSize.base,
    },
  },
  // Input sizes
  input: {
    height: {
      sm: '2rem',       // 32px
      default: '2.5rem', // 40px
      lg: '2.75rem',    // 44px
    },
    padding: '0.75rem',
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  // Badge sizes
  badge: {
    height: {
      sm: '1.25rem',    // 20px
      default: '1.5rem', // 24px
      lg: '1.75rem',    // 28px
    },
    padding: {
      sm: '0.375rem',
      default: '0.5rem',
      lg: '0.625rem',
    },
    fontSize: {
      sm: TYPOGRAPHY.fontSize['2xs'],
      default: TYPOGRAPHY.fontSize.xs,
      lg: TYPOGRAPHY.fontSize.sm,
    },
  },
  // Avatar sizes
  avatar: {
    sm: '2rem',        // 32px
    default: '2.5rem', // 40px
    lg: '3rem',        // 48px
    xl: '4rem',        // 64px
  },
  // Icon sizes
  icon: {
    xs: '0.75rem',     // 12px
    sm: '1rem',        // 16px
    default: '1.25rem', // 20px
    lg: '1.5rem',      // 24px
    xl: '2rem',        // 32px
  },
} as const;

// ============================================
// Animation Tokens
// ============================================

export const ANIMATION = {
  // Durations
  duration: {
    instant: '0ms',
    fast: '100ms',
    normal: '200ms',
    slow: '300ms',
    slower: '500ms',
  },
  // Easing functions
  easing: {
    linear: 'linear',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
  },
} as const;

// ============================================
// Z-Index Scale
// ============================================

export const Z_INDEX = {
  dropdown: 1000,
  sticky: 1020,
  fixed: 1030,
  modalBackdrop: 1040,
  modal: 1050,
  popover: 1060,
  tooltip: 1070,
  toast: 1080,
} as const;

// ============================================
// Breakpoints
// ============================================

export const BREAKPOINTS = {
  sm: '640px',
  md: '768px',
  lg: '1024px',
  xl: '1280px',
  '2xl': '1536px',
} as const;

// ============================================
// Status Colors (for consistent status indicators)
// Using CSS variables for dynamic theming
// ============================================

export const STATUS_COLORS = {
  // Lead/Opportunity Status - Using pipeline CSS vars (already exist)
  new: {
    bg: 'bg-[var(--pipeline-new-bg)]',
    text: 'text-[var(--pipeline-new-text)]',
    border: 'border-[var(--pipeline-new-border)]',
    dot: 'bg-[var(--stage-new)]',
  },
  contacted: {
    bg: 'bg-[var(--pipeline-contacted-bg)]',
    text: 'text-[var(--pipeline-contacted-text)]',
    border: 'border-[var(--pipeline-contacted-border)]',
    dot: 'bg-[var(--stage-contacted)]',
  },
  qualified: {
    bg: 'bg-[var(--pipeline-qualified-bg)]',
    text: 'text-[var(--pipeline-qualified-text)]',
    border: 'border-[var(--pipeline-qualified-border)]',
    dot: 'bg-[var(--stage-qualified)]',
  },
  proposal: {
    bg: 'bg-[var(--pipeline-proposal-bg)]',
    text: 'text-[var(--pipeline-proposal-text)]',
    border: 'border-[var(--pipeline-proposal-border)]',
    dot: 'bg-[var(--stage-proposal)]',
  },
  negotiation: {
    bg: 'bg-[var(--pipeline-negotiation-bg)]',
    text: 'text-[var(--pipeline-negotiation-text)]',
    border: 'border-[var(--pipeline-negotiation-border)]',
    dot: 'bg-[var(--stage-negotiation)]',
  },
  won: {
    bg: 'bg-[var(--pipeline-won-bg)]',
    text: 'text-[var(--pipeline-won-text)]',
    border: 'border-[var(--pipeline-won-border)]',
    dot: 'bg-[var(--stage-won)]',
  },
  lost: {
    bg: 'bg-[var(--pipeline-lost-bg)]',
    text: 'text-[var(--pipeline-lost-text)]',
    border: 'border-[var(--pipeline-lost-border)]',
    dot: 'bg-[var(--stage-lost)]',
  },
  // Task Status - Using status CSS vars
  pending: {
    bg: 'bg-[var(--status-pending-bg)]',
    text: 'text-[var(--status-pending)]',
    border: 'border-[var(--status-pending-border)]',
    dot: 'bg-[var(--status-pending)]',
  },
  in_progress: {
    bg: 'bg-[var(--status-in-progress-bg)]',
    text: 'text-[var(--status-in-progress)]',
    border: 'border-[var(--status-in-progress-border)]',
    dot: 'bg-[var(--status-in-progress)]',
  },
  completed: {
    bg: 'bg-[var(--status-completed-bg)]',
    text: 'text-[var(--status-completed)]',
    border: 'border-[var(--status-completed-border)]',
    dot: 'bg-[var(--status-completed)]',
  },
  cancelled: {
    bg: 'bg-[var(--status-cancelled-bg)]',
    text: 'text-[var(--status-cancelled)]',
    border: 'border-[var(--status-cancelled-border)]',
    dot: 'bg-[var(--status-cancelled)]',
  },
  overdue: {
    bg: 'bg-[var(--status-cancelled-bg)]',
    text: 'text-[var(--status-cancelled)]',
    border: 'border-[var(--status-cancelled-border)]',
    dot: 'bg-[var(--status-cancelled)]',
  },
} as const;

// ============================================
// Priority Colors - Using CSS variables
// ============================================

export const PRIORITY_COLORS = {
  low: {
    bg: 'bg-[var(--priority-low-bg)]',
    text: 'text-[var(--priority-low)]',
    border: 'border-[var(--priority-low-border)]',
  },
  medium: {
    bg: 'bg-[var(--priority-medium-bg)]',
    text: 'text-[var(--priority-medium)]',
    border: 'border-[var(--priority-medium-border)]',
  },
  high: {
    bg: 'bg-[var(--priority-high-bg)]',
    text: 'text-[var(--priority-high)]',
    border: 'border-[var(--priority-high-border)]',
  },
  urgent: {
    bg: 'bg-[var(--priority-urgent-bg)]',
    text: 'text-[var(--priority-urgent)]',
    border: 'border-[var(--priority-urgent-border)]',
  },
} as const;

// ============================================
// Score Colors - Using CSS variables
// Note: Score uses orange for hot (high priority feel), not green
// ============================================

export const SCORE_COLORS = {
  hot: {
    range: [70, 100],
    bg: 'bg-[var(--score-hot-bg)]',
    text: 'text-[var(--score-hot)]',
    label: 'Hot',
  },
  warm: {
    range: [40, 69],
    bg: 'bg-[var(--score-warm-bg)]',
    text: 'text-[var(--score-warm)]',
    label: 'Warm',
  },
  cold: {
    range: [0, 39],
    bg: 'bg-[var(--score-cold-bg)]',
    text: 'text-[var(--score-cold)]',
    label: 'Cold',
  },
} as const;

// ============================================
// Helper Functions
// ============================================

/**
 * Get status color classes by status key
 */
export function getStatusClasses(status: keyof typeof STATUS_COLORS): {
  bg: string;
  text: string;
  border: string;
  dot: string;
} {
  return STATUS_COLORS[status] ?? STATUS_COLORS.pending;
}

/**
 * Get priority color classes
 */
export function getPriorityClasses(priority: keyof typeof PRIORITY_COLORS): {
  bg: string;
  text: string;
  border: string;
} {
  return PRIORITY_COLORS[priority] ?? PRIORITY_COLORS.medium;
}

/**
 * Get score color info based on numeric score
 */
export function getScoreInfo(score: number): {
  bg: string;
  text: string;
  label: string;
} {
  if (score >= 70) return SCORE_COLORS.hot;
  if (score >= 40) return SCORE_COLORS.warm;
  return SCORE_COLORS.cold;
}

/**
 * Combine status classes into a single string
 */
export function statusBadgeClass(status: keyof typeof STATUS_COLORS): string {
  const colors = getStatusClasses(status);
  return `${colors.bg} ${colors.text}`;
}

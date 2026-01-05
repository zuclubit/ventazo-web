/**
 * Pipeline Design System Tokens - v1.0
 *
 * Centralized design tokens for all pipeline/kanban views.
 * These tokens ensure visual consistency across:
 * - Leads Pipeline
 * - Opportunities Pipeline
 * - Customers Lifecycle
 * - Any future pipeline views
 *
 * @module components/pipeline/tokens
 */

// ============================================
// Column Tokens
// ============================================

export const COLUMN_TOKENS = {
  /** Column width - responsive */
  width: {
    min: '280px',
    default: '300px',
    max: '320px',
  },

  /** Column height calculation */
  height: {
    viewport: 'calc(100vh - 200px)',
    min: '400px',
  },

  /** Internal spacing */
  padding: {
    header: '0.75rem', // 12px
    body: '0.5rem', // 8px
    card: '0.5rem', // 8px gap between cards
  },

  /** Border radius */
  radius: {
    column: '0.75rem', // 12px
    header: '0.75rem 0.75rem 0 0', // top rounded
    card: '0.5rem', // 8px
  },

  /** Accent bar thickness */
  accentBar: '3px',

  /** Header height */
  headerHeight: '3.5rem', // 56px

  /** Stats bar height */
  statsBarHeight: '2.25rem', // 36px
} as const;

// ============================================
// Empty State Tokens
// ============================================

export const EMPTY_STATE_TOKENS = {
  /** Icon container size */
  iconSize: {
    sm: '2.5rem', // 40px
    md: '3rem', // 48px
    lg: '4rem', // 64px
  },

  /** Icon size */
  icon: {
    sm: '1.25rem', // 20px
    md: '1.5rem', // 24px
    lg: '2rem', // 32px
  },

  /** Padding */
  padding: {
    compact: '1.5rem', // 24px
    default: '2rem', // 32px
    expanded: '3rem', // 48px
  },

  /** Min height */
  minHeight: '120px',

  /** Border style */
  borderStyle: '2px dashed',
} as const;

// ============================================
// Typography Tokens
// ============================================

export const TYPOGRAPHY_TOKENS = {
  /** Stage name */
  stageName: {
    size: '0.875rem', // 14px
    weight: '600',
    lineHeight: '1.25',
  },

  /** Count badge */
  countBadge: {
    size: '0.75rem', // 12px
    weight: '500',
    minWidth: '1.25rem', // 20px
    height: '1.25rem', // 20px
  },

  /** Percentage */
  percentage: {
    size: '0.75rem', // 12px
    weight: '500',
  },

  /** Stats values */
  statsValue: {
    size: '0.75rem', // 12px
    weight: '600',
  },

  /** Empty state title */
  emptyTitle: {
    size: '0.8125rem', // 13px
    weight: '500',
  },

  /** Empty state subtitle */
  emptySubtitle: {
    size: '0.6875rem', // 11px
    weight: '400',
  },
} as const;

// ============================================
// Color Tokens (CSS Variables)
// ============================================

export const COLOR_TOKENS = {
  /** Column background */
  columnBg: 'hsl(var(--muted) / 0.3)',
  columnBgHover: 'hsl(var(--muted) / 0.4)',

  /** Header background with stage color */
  headerBgOpacity: '0.12',
  accentBarOpacity: '1',

  /** Stats bar */
  statsBarBg: 'hsl(var(--card) / 0.5)',

  /** Empty state */
  emptyBorderColor: 'hsl(var(--border) / 0.5)',
  emptyBgColor: 'hsl(var(--muted) / 0.2)',
  emptyIconBg: 'hsl(var(--muted) / 0.5)',

  /** Drop zone feedback */
  dropValidBorder: 'hsl(142 76% 36%)', // green-500
  dropValidBg: 'hsl(142 76% 36% / 0.08)',
  dropInvalidBorder: 'hsl(0 84% 60%)', // red-500
  dropInvalidBg: 'hsl(0 84% 60% / 0.08)',
  dropNeutralBorder: 'hsl(var(--primary))',
  dropNeutralBg: 'hsl(var(--primary) / 0.08)',
} as const;

// ============================================
// Animation Tokens
// ============================================

export const ANIMATION_TOKENS = {
  /** Duration */
  duration: {
    fast: '150ms',
    normal: '200ms',
    slow: '300ms',
  },

  /** Easing */
  easing: {
    default: 'cubic-bezier(0.4, 0, 0.2, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    smooth: 'cubic-bezier(0.4, 0, 0.6, 1)',
  },

  /** Float animation for empty states */
  float: {
    duration: '3s',
    distance: '4px',
  },
} as const;

// ============================================
// Semantic Stage Icons
// ============================================

export const STAGE_ICONS = {
  // Sales Pipeline (Opportunities)
  prospecting: 'Search',
  qualification: 'ClipboardCheck',
  proposal: 'FileText',
  negotiation: 'MessageSquare',
  closing: 'Handshake',
  won: 'Trophy',
  lost: 'XCircle',

  // Lead Pipeline
  new: 'Sparkles',
  contacted: 'Phone',
  in_progress: 'Clock',
  qualified: 'BadgeCheck',

  // Customer Lifecycle
  prospect: 'UserPlus',
  onboarding: 'Rocket',
  active: 'Activity',
  at_risk: 'AlertTriangle',
  renewal: 'RefreshCw',
  churned: 'UserMinus',

  // Generic fallback
  default: 'Target',
} as const;

// ============================================
// Stage Context Messages
// ============================================

export const STAGE_MESSAGES: Record<
  string,
  { title: string; hint: string; action: string }
> = {
  // Opportunities Pipeline
  prospecting: {
    title: 'Sin oportunidades',
    hint: 'Identifica nuevos prospectos',
    action: 'Agregar prospecto',
  },
  qualification: {
    title: 'Sin calificaciones',
    hint: 'Mueve prospectos aquí para evaluar',
    action: 'Calificar',
  },
  proposal: {
    title: 'Sin propuestas',
    hint: 'Crea propuestas comerciales',
    action: 'Nueva propuesta',
  },
  negotiation: {
    title: 'Sin negociaciones',
    hint: 'Negocia términos con clientes',
    action: 'Iniciar negociación',
  },
  won: {
    title: '¡Aún sin victorias!',
    hint: 'Cierra tu primera venta',
    action: '',
  },
  lost: {
    title: 'Ninguna pérdida',
    hint: 'Mantén el buen trabajo',
    action: '',
  },

  // Leads Pipeline
  new: {
    title: 'Sin leads nuevos',
    hint: 'Los nuevos leads aparecerán aquí',
    action: 'Agregar lead',
  },
  contacted: {
    title: 'Sin contactar',
    hint: 'Mueve leads después de contactar',
    action: '',
  },
  in_progress: {
    title: 'Sin progreso',
    hint: 'Leads en seguimiento activo',
    action: '',
  },
  qualified: {
    title: 'Sin calificados',
    hint: 'Leads listos para conversión',
    action: '',
  },

  // Default
  default: {
    title: 'Sin elementos',
    hint: 'Arrastra elementos aquí',
    action: 'Agregar',
  },
};

// ============================================
// Export All Tokens
// ============================================

export const pipelineTokens = {
  column: COLUMN_TOKENS,
  emptyState: EMPTY_STATE_TOKENS,
  typography: TYPOGRAPHY_TOKENS,
  colors: COLOR_TOKENS,
  animation: ANIMATION_TOKENS,
  stageIcons: STAGE_ICONS,
  stageMessages: STAGE_MESSAGES,
} as const;

export type PipelineTokens = typeof pipelineTokens;

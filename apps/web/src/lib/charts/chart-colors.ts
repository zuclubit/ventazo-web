/**
 * Chart Colors - Ventazo Design System
 *
 * Centralized color definitions for Recharts that align with CSS variables.
 * Recharts requires actual color values, so we provide semantic names
 * that can be swapped for theming.
 *
 * @phase FASE 6 - Design Governance
 * @version 1.0.0
 */

/**
 * Semantic chart colors aligned with the design system.
 * These should match the CSS variable values in globals.css.
 */
export const CHART_COLORS = {
  // Primary palette (teal)
  primary: 'hsl(174, 58%, 29%)',      // --tenant-primary
  primaryLight: 'hsl(173, 58%, 39%)', // --tenant-primary-light
  primaryMuted: 'hsl(172, 66%, 50%)', // --chart-accent
  primaryPale: 'hsl(171, 77%, 75%)',  // Lighter accent

  // Semantic aliases for charts (secondary/tertiary)
  secondary: 'hsl(173, 58%, 39%)',    // Alias for primaryLight
  tertiary: 'hsl(172, 66%, 50%)',     // Alias for primaryMuted

  // Status colors
  success: 'hsl(160, 84%, 39%)',      // --status-completed
  warning: 'hsl(32, 95%, 53%)',       // --status-pending / orange
  danger: 'hsl(0, 84%, 60%)',         // --status-cancelled / red
  info: 'hsl(199, 89%, 48%)',         // Blue info

  // Extended palette for multi-series charts
  purple: 'hsl(258, 90%, 66%)',
  pink: 'hsl(330, 81%, 60%)',
  cyan: 'hsl(187, 92%, 69%)',
  indigo: 'hsl(234, 89%, 74%)',

  // Neutrals
  muted: 'hsl(174, 10%, 55%)',        // --muted-foreground equivalent
  mutedLight: 'hsl(174, 8%, 65%)',
} as const;

/**
 * Funnel chart gradient colors (light to dark progression)
 */
export const FUNNEL_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.primaryLight,
  CHART_COLORS.primaryMuted,
  CHART_COLORS.primaryPale,
  'hsl(170, 82%, 88%)',
] as const;

/**
 * Pie/Donut chart colors (distinct categorical colors)
 */
export const PIE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.primaryLight,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.purple,
] as const;

/**
 * Status-based bar chart colors
 */
export const STATUS_CHART_COLORS = {
  completed: CHART_COLORS.success,
  pending: CHART_COLORS.warning,
  overdue: CHART_COLORS.danger,
  inProgress: CHART_COLORS.primaryLight,
} as const;

/**
 * Line chart color palette for multi-series
 */
export const LINE_COLORS = [
  CHART_COLORS.primary,
  CHART_COLORS.warning,
  CHART_COLORS.danger,
  CHART_COLORS.purple,
  CHART_COLORS.pink,
] as const;

/**
 * Get a color by index with wraparound for any number of series
 */
export function getChartColor(index: number, palette: readonly string[] = PIE_COLORS): string {
  return palette[index % palette.length] ?? '#6366f1';
}

/**
 * Tooltip styles for consistent chart tooltips
 */
export const TOOLTIP_STYLES = {
  contentStyle: {
    backgroundColor: 'hsl(180, 73%, 8%)',  // Dark teal background
    border: '1px solid hsla(180, 50%, 50%, 0.2)',
    borderRadius: '8px',
    padding: '8px 12px',
  },
  labelStyle: {
    color: 'hsl(174, 20%, 70%)',
    fontWeight: 500,
  },
  itemStyle: {
    color: 'white',
  },
} as const;

/**
 * Grid styles for charts
 */
export const GRID_STYLES = {
  stroke: 'hsla(180, 50%, 50%, 0.1)',
  strokeDasharray: '3 3',
} as const;

/**
 * Axis styles for charts
 */
export const AXIS_STYLES = {
  tick: {
    fill: 'hsl(174, 10%, 55%)',
    fontSize: 12,
  },
  axisLine: {
    stroke: 'hsla(180, 50%, 50%, 0.2)',
  },
} as const;

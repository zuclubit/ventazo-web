/**
 * StatusBadge Component - Ventazo 2025 Design System
 *
 * @description Premium status badge component with full semantic color system
 * for pipeline stages, with support for dark/light modes and custom styling.
 *
 * @version 2.0.0
 */

'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Status Badge Variants
// ============================================

const statusBadgeVariants = cva(
  // Base styles - All badges
  'inline-flex items-center justify-center font-semibold rounded-md border transition-all duration-200 select-none',
  {
    variants: {
      // Pipeline Status Variants
      status: {
        new: [
          'bg-blue-500/15 text-blue-600 border-blue-500/30',
          'dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40',
        ],
        contacted: [
          'bg-cyan-500/15 text-cyan-600 border-cyan-500/30',
          'dark:bg-cyan-500/20 dark:text-cyan-400 dark:border-cyan-500/40',
        ],
        'in-progress': [
          'bg-purple-500/15 text-purple-600 border-purple-500/30',
          'dark:bg-purple-500/20 dark:text-purple-400 dark:border-purple-500/40',
        ],
        qualified: [
          'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
          'dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/40',
        ],
        proposal: [
          'bg-pink-500/15 text-pink-600 border-pink-500/30',
          'dark:bg-pink-500/20 dark:text-pink-400 dark:border-pink-500/40',
        ],
        negotiation: [
          'bg-orange-500/15 text-orange-600 border-orange-500/30',
          'dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/40',
        ],
        won: [
          'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
          'dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40',
        ],
        lost: [
          'bg-red-500/15 text-red-600 border-red-500/30',
          'dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40',
        ],
        unassigned: [
          'bg-slate-500/15 text-slate-600 border-slate-500/30',
          'dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/40',
        ],
        // Semantic statuses
        pending: [
          'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
          'dark:bg-yellow-500/20 dark:text-yellow-400 dark:border-yellow-500/40',
        ],
        active: [
          'bg-blue-500/15 text-blue-600 border-blue-500/30',
          'dark:bg-blue-500/20 dark:text-blue-400 dark:border-blue-500/40',
        ],
        completed: [
          'bg-emerald-500/15 text-emerald-600 border-emerald-500/30',
          'dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/40',
        ],
        cancelled: [
          'bg-red-500/15 text-red-600 border-red-500/30',
          'dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/40',
        ],
      },
      // Size variants
      size: {
        xs: 'text-[10px] px-1.5 py-0.5 h-5',
        sm: 'text-xs px-2 py-0.5 h-6',
        md: 'text-sm px-3 py-1 h-7',
        lg: 'text-base px-4 py-1.5 h-8',
      },
      // Light mode variant for modals/drawers
      variant: {
        dark: '', // Default, uses the CSS variable based colors
        light: '', // For light backgrounds (modals, drawers)
      },
    },
    compoundVariants: [
      // Light variant overrides for modal/drawer contexts
      { status: 'new', variant: 'light', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      { status: 'contacted', variant: 'light', className: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
      { status: 'in-progress', variant: 'light', className: 'bg-purple-100 text-purple-700 border-purple-200' },
      { status: 'qualified', variant: 'light', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      { status: 'proposal', variant: 'light', className: 'bg-pink-100 text-pink-700 border-pink-200' },
      { status: 'negotiation', variant: 'light', className: 'bg-orange-100 text-orange-700 border-orange-200' },
      { status: 'won', variant: 'light', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      { status: 'lost', variant: 'light', className: 'bg-red-100 text-red-700 border-red-200' },
      { status: 'unassigned', variant: 'light', className: 'bg-slate-100 text-slate-700 border-slate-200' },
      { status: 'pending', variant: 'light', className: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
      { status: 'active', variant: 'light', className: 'bg-blue-100 text-blue-700 border-blue-200' },
      { status: 'completed', variant: 'light', className: 'bg-emerald-100 text-emerald-700 border-emerald-200' },
      { status: 'cancelled', variant: 'light', className: 'bg-red-100 text-red-700 border-red-200' },
    ],
    defaultVariants: {
      status: 'unassigned',
      size: 'sm',
      variant: 'dark',
    },
  }
);

// ============================================
// Status Labels - Spanish
// ============================================

export const STATUS_LABELS: Record<string, string> = {
  new: 'Nuevo',
  contacted: 'Contactado',
  'in-progress': 'En Progreso',
  in_progress: 'En Progreso',
  qualified: 'Calificado',
  proposal: 'Propuesta',
  negotiation: 'Negociación',
  won: 'Ganado',
  lost: 'Perdido',
  unassigned: 'Sin Etapa',
  pending: 'Pendiente',
  active: 'Activo',
  completed: 'Completado',
  cancelled: 'Cancelado',
};

// ============================================
// Component Props
// ============================================

export interface StatusBadgeProps
  extends Omit<React.HTMLAttributes<HTMLSpanElement>, 'children'>,
    VariantProps<typeof statusBadgeVariants> {
  /** Text to display - if not provided, uses STATUS_LABELS[status] */
  children?: React.ReactNode;
  /** Show checkmark icon for selected state */
  showCheck?: boolean;
  /** Custom color override (hex format) */
  customColor?: string;
  /** Accessible label for screen readers (e.g., "Lead status") */
  accessiblePrefix?: string;
}

// ============================================
// StatusBadge Component
// ============================================

export const StatusBadge = React.memo<StatusBadgeProps>(function StatusBadge({
  status,
  size,
  variant,
  children,
  showCheck = false,
  customColor,
  accessiblePrefix,
  className,
  style,
  ...props
}) {
  // If custom color is provided, compute dynamic styles
  const customStyles: React.CSSProperties | undefined = React.useMemo(() => {
    if (!customColor) return style;

    // Parse hex color
    const hex = customColor.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);

    // Calculate luminance for text color contrast
    const toLinear = (c: number) => {
      const sRGB = c / 255;
      return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
    };
    const luminance = 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);

    // Adjust text color based on luminance for proper contrast
    const isDarkColor = luminance < 0.4;
    const textColor = isDarkColor
      ? customColor
      : `rgb(${Math.max(0, r - 60)}, ${Math.max(0, g - 60)}, ${Math.max(0, b - 60)})`;

    return {
      ...style,
      backgroundColor: `rgba(${r}, ${g}, ${b}, 0.12)`,
      borderColor: `rgba(${r}, ${g}, ${b}, 0.35)`,
      color: textColor,
    };
  }, [customColor, style]);

  // Determine label
  const label = children ?? STATUS_LABELS[status ?? 'unassigned'] ?? status;

  // Build accessible label (e.g., "Lead status: Nuevo")
  const ariaLabel = accessiblePrefix
    ? `${accessiblePrefix}: ${label}`
    : undefined;

  return (
    <span
      role="status"
      aria-label={ariaLabel}
      style={customStyles}
      className={cn(
        statusBadgeVariants({ status, size, variant }),
        customColor && 'bg-transparent border', // Reset if using custom color
        className
      )}
      {...props}
    >
      {label}
      {showCheck && <Check className="w-3 h-3 ml-1" aria-hidden="true" />}
    </span>
  );
});

StatusBadge.displayName = 'StatusBadge';

// ============================================
// Utility Types
// ============================================

export type StatusType = NonNullable<VariantProps<typeof statusBadgeVariants>['status']>;
export type StatusSize = NonNullable<VariantProps<typeof statusBadgeVariants>['size']>;
export type StatusVariant = NonNullable<VariantProps<typeof statusBadgeVariants>['variant']>;

export { statusBadgeVariants };

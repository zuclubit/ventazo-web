'use client';

/**
 * Sheet Content Components - Modular Content Building Blocks (v1.1)
 *
 * Reusable content components for sheet/modal panels.
 * Follows Ventazo Design System 2025.
 *
 * Components:
 * - SheetSection: Section with icon and title
 * - SheetInfoCard: Information card with icon and label/value
 * - SheetAlertCard: Highlight/alert card with gradient background
 * - SheetInfoGrid: Grid layout for info cards
 * - SheetEmptyState: Empty state with icon and action
 *
 * v1.1 Changes:
 * - Improved dark mode visibility for all components
 * - Explicit text colors for guaranteed contrast
 * - Better background contrast for info cards
 * - Enhanced section header styling
 *
 * @version 1.1.0
 * @module components/sheets/sheet-content-components
 */

import * as React from 'react';
import { motion, type Variants } from 'framer-motion';
import { type LucideIcon } from 'lucide-react';

import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

// ============================================
// Animation Variants
// ============================================

const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// ============================================
// SheetSection
// ============================================

export interface SheetSectionProps {
  /** Section title */
  title: string;
  /** Icon for the section */
  icon?: LucideIcon;
  /** Section content */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
  /** Show separator after section */
  showSeparator?: boolean;
  /** Animate on mount */
  animate?: boolean;
  /** Animation delay */
  animationDelay?: number;
}

export function SheetSection({
  title,
  icon: Icon,
  children,
  className,
  showSeparator = false,
  animate = false,
  animationDelay = 0,
}: SheetSectionProps) {
  const Content = (
    <div className={cn('space-y-4', className)}>
      <div className="flex items-center gap-2">
        {Icon && (
          <div className="p-1 rounded-md bg-[var(--tenant-primary)]/10 dark:bg-[var(--tenant-primary)]/20">
            <Icon className="h-3.5 w-3.5 text-[var(--tenant-primary)]" />
          </div>
        )}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </h3>
      </div>
      {children}
      {showSeparator && <Separator className="mt-6" />}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        transition={{ duration: 0.2, delay: animationDelay }}
      >
        {Content}
      </motion.div>
    );
  }

  return Content;
}

// ============================================
// SheetInfoCard
// ============================================

export interface SheetInfoCardProps {
  /** Label text */
  label: string;
  /** Value text or ReactNode */
  value: React.ReactNode;
  /** Icon to display */
  icon?: LucideIcon;
  /** Icon color variant */
  iconVariant?: 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'info';
  /** Additional className */
  className?: string;
  /** Click handler */
  onClick?: () => void;
  /** Show hover effect */
  hoverable?: boolean;
}

const ICON_VARIANTS: Record<string, { bg: string; text: string }> = {
  default: {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-600 dark:text-slate-400',
  },
  primary: {
    bg: 'bg-[var(--tenant-primary)]/10 dark:bg-[var(--tenant-primary)]/20',
    text: 'text-[var(--tenant-primary)]',
  },
  success: {
    bg: 'bg-emerald-100 dark:bg-emerald-500/20',
    text: 'text-emerald-600 dark:text-emerald-400',
  },
  warning: {
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
  },
  danger: {
    bg: 'bg-red-100 dark:bg-red-500/20',
    text: 'text-red-600 dark:text-red-400',
  },
  info: {
    bg: 'bg-blue-100 dark:bg-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
  },
};

export function SheetInfoCard({
  label,
  value,
  icon: Icon,
  iconVariant = 'default',
  className,
  onClick,
  hoverable = false,
}: SheetInfoCardProps) {
  const defaultIconStyles = { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400' };
  const iconStyles = ICON_VARIANTS[iconVariant] ?? defaultIconStyles;
  const isClickable = !!onClick || hoverable;

  return (
    <div
      className={cn(
        'p-3 rounded-lg',
        // Better background contrast for both themes
        'bg-slate-50/80 dark:bg-slate-800/50',
        'transition-colors duration-150',
        isClickable && 'hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer',
        className
      )}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              'h-9 w-9 rounded-lg flex items-center justify-center shrink-0',
              iconStyles.bg
            )}
          >
            <Icon className={cn('h-4 w-4', iconStyles.text)} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
            {value || '—'}
          </p>
        </div>
      </div>
    </div>
  );
}

// ============================================
// SheetInfoGrid
// ============================================

export interface SheetInfoGridProps {
  /** Number of columns */
  columns?: 1 | 2 | 3;
  /** Grid items */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function SheetInfoGrid({
  columns = 2,
  children,
  className,
}: SheetInfoGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  };

  return (
    <div className={cn('grid gap-3', gridClasses[columns], className)}>
      {children}
    </div>
  );
}

// ============================================
// SheetAlertCard
// ============================================

export interface SheetAlertCardProps {
  /** Title text */
  title: string;
  /** Description/value text */
  description?: string;
  /** Icon to display */
  icon?: LucideIcon;
  /** Alert variant */
  variant?: 'success' | 'warning' | 'danger' | 'info' | 'primary';
  /** Additional className */
  className?: string;
  /** Show decorative blur effect */
  showBlur?: boolean;
  /** Animate on mount */
  animate?: boolean;
}

const ALERT_VARIANTS: Record<string, {
  bg: string;
  border: string;
  iconBg: string;
  titleColor: string;
}> = {
  success: {
    bg: 'bg-gradient-to-br from-emerald-500/5 via-emerald-500/10 to-teal-500/5',
    border: 'border-emerald-500/20',
    iconBg: 'bg-emerald-500/20',
    titleColor: 'text-emerald-700 dark:text-emerald-400',
  },
  warning: {
    bg: 'bg-gradient-to-br from-amber-500/5 via-amber-500/10 to-orange-500/5',
    border: 'border-amber-500/20',
    iconBg: 'bg-amber-500/20',
    titleColor: 'text-amber-700 dark:text-amber-400',
  },
  danger: {
    bg: 'bg-gradient-to-br from-red-500/5 via-red-500/10 to-rose-500/5',
    border: 'border-red-500/20',
    iconBg: 'bg-red-500/20',
    titleColor: 'text-red-700 dark:text-red-400',
  },
  info: {
    bg: 'bg-gradient-to-br from-blue-500/5 via-blue-500/10 to-cyan-500/5',
    border: 'border-blue-500/20',
    iconBg: 'bg-blue-500/20',
    titleColor: 'text-blue-700 dark:text-blue-400',
  },
  primary: {
    bg: 'bg-gradient-to-br from-[var(--tenant-primary)]/5 via-[var(--tenant-primary)]/10 to-[var(--tenant-primary)]/5',
    border: 'border-[var(--tenant-primary)]/20',
    iconBg: 'bg-[var(--tenant-primary)]/20',
    titleColor: 'text-[var(--tenant-primary)]',
  },
};

export function SheetAlertCard({
  title,
  description,
  icon: Icon,
  variant = 'info',
  className,
  showBlur = true,
  animate = false,
}: SheetAlertCardProps) {
  const defaultStyles = {
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    iconBg: 'bg-blue-100 dark:bg-blue-800',
    titleColor: 'text-blue-700 dark:text-blue-400',
  };
  const styles = ALERT_VARIANTS[variant] ?? defaultStyles;

  const Content = (
    <div
      className={cn(
        'p-4 rounded-xl border relative overflow-hidden',
        styles.bg,
        styles.border,
        className
      )}
    >
      {/* Decorative blur effect */}
      {showBlur && (
        <div
          className={cn(
            'absolute top-0 right-0 w-32 h-32 rounded-full blur-3xl',
            variant === 'success' && 'bg-emerald-500/5',
            variant === 'warning' && 'bg-amber-500/5',
            variant === 'danger' && 'bg-red-500/5',
            variant === 'info' && 'bg-blue-500/5',
            variant === 'primary' && 'bg-[var(--tenant-primary)]/5'
          )}
        />
      )}

      <div className="relative flex items-center gap-3">
        {Icon && (
          <div
            className={cn(
              'h-10 w-10 rounded-lg flex items-center justify-center shrink-0',
              styles.iconBg
            )}
          >
            <Icon className={cn('h-5 w-5', styles.titleColor)} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className={cn('text-sm font-medium', styles.titleColor)}>
            {title}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </div>
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.2 }}
      >
        {Content}
      </motion.div>
    );
  }

  return Content;
}

// ============================================
// SheetEmptyState
// ============================================

export interface SheetEmptyStateProps {
  /** Icon to display */
  icon?: LucideIcon;
  /** Title text */
  title: string;
  /** Description text */
  description?: string;
  /** Action button */
  action?: React.ReactNode;
  /** Additional className */
  className?: string;
}

export function SheetEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: SheetEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8 px-4 text-center',
        className
      )}
    >
      {Icon && (
        <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-slate-500 dark:text-slate-400" />
        </div>
      )}
      <h4 className="text-sm font-medium text-slate-900 dark:text-slate-100">{title}</h4>
      {description && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-[200px]">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export default {
  SheetSection,
  SheetInfoCard,
  SheetInfoGrid,
  SheetAlertCard,
  SheetEmptyState,
};

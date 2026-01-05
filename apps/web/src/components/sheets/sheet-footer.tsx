'use client';

/**
 * SheetFooter - Modular Sheet Footer Component (v1.2)
 *
 * Reusable footer component for all sheet/modal panels.
 * Mobile-aware with bottom bar padding support.
 *
 * Features:
 * - Mobile-safe padding (accounts for 64px bottom bar + safe area)
 * - Glassmorphism styling with backdrop blur
 * - Flexible action button layout
 * - Theme-aware styling with high contrast
 * - 44px touch targets
 * - Always positioned at bottom of modal (mt-auto)
 *
 * v1.2 Changes:
 * - Added mt-auto to ensure footer stays at bottom of modal
 *
 * v1.1 Changes:
 * - Improved TotalsSummary dark mode contrast
 * - Explicit text colors for all variants
 * - Better background contrast in footer
 * - Optimized spacing between sections
 * - Compact mode support
 *
 * @version 1.2.0
 * @module components/sheets/sheet-footer
 */

import * as React from 'react';
import { Loader2, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface SheetFooterAction {
  /** Unique key for the action */
  key: string;
  /** Button label */
  label: string;
  /** Icon to show before label */
  icon?: LucideIcon;
  /** Button variant */
  variant?: ButtonProps['variant'];
  /** Click handler */
  onClick?: () => void;
  /** Disable the button */
  disabled?: boolean;
  /** Show loading spinner */
  loading?: boolean;
  /** Use tenant primary color */
  primary?: boolean;
  /** Use destructive styling */
  destructive?: boolean;
  /** Fill available space */
  flex?: boolean;
  /** Additional className */
  className?: string;
}

export interface SheetFooterProps {
  /** Array of action buttons */
  actions?: SheetFooterAction[];
  /** Primary action (shorthand for single primary button) */
  primaryAction?: SheetFooterAction;
  /** Secondary action (shorthand for single secondary button) */
  secondaryAction?: SheetFooterAction;
  /** Cancel action (shorthand for cancel button) */
  cancelAction?: SheetFooterAction;
  /** Additional content above actions (e.g., totals summary) */
  children?: React.ReactNode;
  /** Additional className for container */
  className?: string;
  /** Disable mobile bottom bar padding */
  disableMobilePadding?: boolean;
  /** Show border top */
  showBorder?: boolean;
  /** Animate on mount */
  animate?: boolean;
  /** Use compact spacing */
  compact?: boolean;
}

// ============================================
// Action Button Component
// ============================================

function ActionButton({ action, compact }: { action: SheetFooterAction; compact?: boolean }) {
  const Icon = action.icon;

  const buttonClasses = cn(
    // Compact: smaller height, normal: 44px touch target
    compact ? 'h-9 gap-1.5 text-sm px-3' : 'h-10 gap-2 px-4',
    // Only flex if explicitly set
    action.flex && 'flex-1 min-w-0',
    action.primary && [
      'bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-hover)]',
      'text-white',
      'shadow-md shadow-[var(--tenant-primary)]/20',
    ],
    action.destructive && [
      'text-destructive',
      'hover:bg-destructive/10',
    ],
    action.className
  );

  return (
    <Button
      type="button"
      variant={action.variant || (action.primary ? 'default' : 'outline')}
      size={compact ? 'sm' : 'default'}
      onClick={action.onClick}
      disabled={action.disabled || action.loading}
      className={buttonClasses}
    >
      {action.loading ? (
        <Loader2 className={cn(compact ? 'h-3.5 w-3.5' : 'h-4 w-4', 'animate-spin')} />
      ) : (
        Icon && <Icon className={compact ? 'h-3.5 w-3.5' : 'h-4 w-4'} />
      )}
      <span className="truncate">{action.label}</span>
    </Button>
  );
}

// ============================================
// Component
// ============================================

export function SheetFooter({
  actions,
  primaryAction,
  secondaryAction,
  cancelAction,
  children,
  className,
  disableMobilePadding = false,
  showBorder = true,
  animate = false,
  compact = false,
}: SheetFooterProps) {
  // Build actions array from shorthand props if not provided
  const resolvedActions = React.useMemo(() => {
    if (actions) return actions;

    const builtActions: SheetFooterAction[] = [];

    if (cancelAction) {
      builtActions.push({
        ...cancelAction,
        variant: cancelAction.variant || 'outline',
      });
    }

    if (secondaryAction) {
      builtActions.push({
        ...secondaryAction,
        variant: secondaryAction.variant || 'secondary',
      });
    }

    if (primaryAction) {
      builtActions.push({
        ...primaryAction,
        primary: true,
        flex: primaryAction.flex !== false,
      });
    }

    return builtActions;
  }, [actions, primaryAction, secondaryAction, cancelAction]);

  const FooterContent = (
    <div
      className={cn(
        'shrink-0 mt-auto',
        // Border with better visibility in both themes
        showBorder && 'border-t border-slate-200/60 dark:border-slate-700/50',
        // Glassmorphism v1.1 - improved dark mode contrast
        'bg-gradient-to-t from-white via-white to-slate-50/50',
        'dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/50',
        'backdrop-blur-sm',
        // Mobile: account for bottom bar (64px) + safe area
        !disableMobilePadding && [
          'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px))]',
          'sm:pb-0',
        ],
        className
      )}
    >
      {/* Additional Content (e.g., totals) */}
      {children}

      {/* Action Buttons */}
      {resolvedActions.length > 0 && (
        <div
          className={cn(
            'flex items-center justify-end gap-2',
            // Compact padding for better space usage
            compact ? 'px-4 py-2.5 sm:px-5' : 'px-4 py-3 sm:px-5',
            // Prevent overflow
            'overflow-hidden'
          )}
        >
          {resolvedActions.map((action) => (
            <ActionButton key={action.key} action={action} compact={compact} />
          ))}
        </div>
      )}
    </div>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
      >
        {FooterContent}
      </motion.div>
    );
  }

  return FooterContent;
}

// ============================================
// Totals Summary Sub-component
// ============================================

export interface TotalsSummaryProps {
  items: Array<{
    label: string;
    value: string;
    variant?: 'default' | 'muted' | 'success' | 'primary';
    bold?: boolean;
  }>;
  className?: string;
  /** Use compact spacing */
  compact?: boolean;
}

export function TotalsSummary({ items, className, compact = false }: TotalsSummaryProps) {
  return (
    <div
      className={cn(
        'sm:px-5',
        compact ? 'px-4 py-3 space-y-1.5' : 'px-4 py-4 space-y-2',
        // Border with better visibility
        'border-b border-slate-200/60 dark:border-slate-700/50',
        // Subtle background for better contrast in dark mode
        'bg-slate-50/50 dark:bg-slate-800/30',
        className
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;

        // Explicit color variants for guaranteed visibility in both themes
        const variantClasses = {
          default: 'text-slate-900 dark:text-slate-100',
          muted: 'text-slate-600 dark:text-slate-400',
          success: 'text-emerald-600 dark:text-emerald-400',
          primary: 'text-[var(--tenant-primary)] dark:text-[var(--tenant-primary)]',
        };

        return (
          <div
            key={item.label}
            className={cn(
              'flex justify-between',
              compact ? 'text-xs' : 'text-sm',
              // Total row separator with better dark mode visibility
              isLast && 'pt-2 mt-1 border-t border-slate-200/60 dark:border-slate-600/50'
            )}
          >
            <span
              className={cn(
                // Label colors with explicit dark mode support
                item.bold
                  ? 'font-bold text-slate-900 dark:text-white'
                  : 'text-slate-600 dark:text-slate-400',
                isLast && (compact ? 'text-sm font-semibold' : 'text-base font-semibold')
              )}
            >
              {item.label}
            </span>
            <span
              className={cn(
                'font-medium tabular-nums',
                variantClasses[item.variant || 'default'],
                item.bold && 'font-bold',
                isLast && (compact ? 'text-sm' : 'text-base')
              )}
            >
              {item.value}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default SheetFooter;

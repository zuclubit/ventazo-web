'use client';

/**
 * SheetHeader - Modular Sheet Header Component (v1.1)
 *
 * Reusable header component for all sheet/modal panels.
 * Follows Ventazo Design System 2025 with full dark/light theme support.
 *
 * Features:
 * - Glassmorphism styling with backdrop blur
 * - Optional avatar with status ring
 * - Icon badge with tenant primary color
 * - Optimized spacing (compact mode available)
 * - Theme-aware typography with high contrast
 * - Accessible close button (44px touch target)
 *
 * v1.1 Changes:
 * - Optimized spacing for compact mode
 * - Enhanced dark theme visibility
 * - Close button with better dark mode contrast
 * - Improved icon badge background for dark mode
 *
 * @version 1.1.0
 * @module components/sheets/sheet-header
 */

import * as React from 'react';
import { X, type LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { SheetHeader as BaseSheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface SheetHeaderProps {
  /** Title text */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /** Icon to display in badge (uses tenant primary color) */
  icon?: LucideIcon;
  /** Callback when close button is clicked */
  onClose?: () => void;
  /** Optional avatar configuration */
  avatar?: {
    src?: string;
    fallback: string;
    /** Ring color variant based on status */
    ringVariant?: 'default' | 'hot' | 'warm' | 'cold' | 'success' | 'warning' | 'danger';
  };
  /** Optional status badge to show next to title */
  statusBadge?: React.ReactNode;
  /** Additional content to render below title/description */
  children?: React.ReactNode;
  /** Additional className for the header container */
  className?: string;
  /** Hide the close button */
  hideCloseButton?: boolean;
  /** Animate the header on mount */
  animate?: boolean;
  /** Use compact spacing */
  compact?: boolean;
}

// ============================================
// Ring Color Variants
// ============================================

const RING_VARIANTS: Record<string, string> = {
  default: 'ring-slate-200 dark:ring-slate-700',
  hot: 'ring-orange-500',
  warm: 'ring-amber-500',
  cold: 'ring-blue-500',
  success: 'ring-emerald-500',
  warning: 'ring-amber-500',
  danger: 'ring-red-500',
};

// ============================================
// Component
// ============================================

export function SheetHeader({
  title,
  description,
  icon: Icon,
  onClose,
  avatar,
  statusBadge,
  children,
  className,
  hideCloseButton = false,
  animate = false,
  compact = false,
}: SheetHeaderProps) {
  const defaultRing = 'ring-2 ring-primary/20';
  const ringClass = avatar?.ringVariant
    ? RING_VARIANTS[avatar.ringVariant] ?? RING_VARIANTS['default'] ?? defaultRing
    : RING_VARIANTS['default'] ?? defaultRing;

  const HeaderContent = (
    <BaseSheetHeader
      className={cn(
        'shrink-0',
        // Spacing: compact vs normal
        compact ? 'px-4 py-3 sm:px-5' : 'p-4 sm:px-5 sm:py-4',
        // Border with better dark mode visibility
        'border-b border-slate-200/60 dark:border-slate-700/50',
        // Glassmorphism v2.1 - improved dark mode contrast
        'bg-gradient-to-b from-white via-white to-slate-50/80',
        'dark:from-slate-900 dark:via-slate-900 dark:to-slate-800/80',
        'backdrop-blur-md',
        className
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {/* Left Side: Avatar/Icon + Title */}
        <div className="flex items-start gap-3 flex-1 min-w-0">
          {/* Avatar */}
          {avatar && (
            <Avatar
              className={cn(
                compact ? 'h-10 w-10' : 'h-12 w-12',
                'shrink-0',
                'ring-2 ring-offset-2 ring-offset-background',
                ringClass
              )}
            >
              {avatar.src && <AvatarImage src={avatar.src} alt={title} />}
              <AvatarFallback className="bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold">
                {avatar.fallback}
              </AvatarFallback>
            </Avatar>
          )}

          {/* Icon Badge (when no avatar) - refined sizing */}
          {!avatar && Icon && (
            <div
              className={cn(
                'shrink-0 rounded-lg',
                compact ? 'p-1.5' : 'p-2',
                // Light mode
                'bg-[var(--tenant-primary)]/10',
                // Dark mode - slightly more opacity for visibility
                'dark:bg-[var(--tenant-primary)]/20'
              )}
            >
              <Icon
                className={cn(
                  compact ? 'h-3.5 w-3.5' : 'h-4 w-4',
                  'text-[var(--tenant-primary)]'
                )}
              />
            </div>
          )}

          {/* Title & Description */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <SheetTitle
                className={cn(
                  'font-semibold truncate',
                  compact ? 'text-base' : 'text-lg',
                  // Explicit colors for guaranteed visibility
                  'text-slate-900 dark:text-white'
                )}
              >
                {title}
              </SheetTitle>
              {statusBadge}
            </div>
            {description && (
              <SheetDescription
                className={cn(
                  'mt-0.5 line-clamp-2',
                  compact ? 'text-xs' : 'text-sm',
                  // High contrast muted color
                  'text-slate-600 dark:text-slate-400'
                )}
              >
                {description}
              </SheetDescription>
            )}
          </div>
        </div>

        {/* Close Button - 44px touch target, improved visibility */}
        {!hideCloseButton && onClose && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className={cn(
              // 44px touch target for accessibility
              'h-11 w-11 rounded-full shrink-0 -mr-2',
              // Mobile: lower position (below notch/status bar), Desktop: normal
              'mt-2 sm:mt-0',
              // Light mode
              'hover:bg-slate-100',
              // Dark mode - visible hover state
              'dark:hover:bg-slate-800',
              'transition-colors'
            )}
            aria-label="Cerrar"
          >
            <X className="h-4 w-4 text-slate-500 dark:text-slate-400" />
          </Button>
        )}
      </div>

      {/* Additional Content (children) */}
      {children && <div className={cn(compact ? 'mt-2' : 'mt-3')}>{children}</div>}
    </BaseSheetHeader>
  );

  if (animate) {
    return (
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {HeaderContent}
      </motion.div>
    );
  }

  return HeaderContent;
}

export default SheetHeader;

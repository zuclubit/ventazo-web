'use client';

/**
 * PipelineColumnHeader - Unified Column Header Component
 *
 * Centralized header for all pipeline/kanban columns.
 * Provides consistent visual hierarchy across modules.
 *
 * Features:
 * - Stage color accent bar
 * - Count badge with stage color
 * - Optional percentage display
 * - Optional money total
 * - Collapsible support (future)
 *
 * @module components/pipeline/PipelineColumnHeader
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import {
  COLUMN_TOKENS,
  TYPOGRAPHY_TOKENS,
  COLOR_TOKENS,
} from './tokens';

// ============================================
// Types
// ============================================

export interface PipelineColumnHeaderProps {
  /** Stage/column title */
  title: string;
  /** Number of items in this column */
  count: number;
  /** Stage color (hex) */
  color?: string;
  /** Optional percentage (e.g., win probability) */
  percentage?: number;
  /** Optional money total */
  moneyTotal?: number;
  /** Currency for money display */
  currency?: string;
  /** Whether the column is collapsed */
  isCollapsed?: boolean;
  /** Collapse toggle handler */
  onToggleCollapse?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Helpers
// ============================================

function formatMoney(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ============================================
// Component
// ============================================

export function PipelineColumnHeader({
  title,
  count,
  color = '#6B7280',
  percentage,
  moneyTotal,
  currency = 'MXN',
  isCollapsed = false,
  onToggleCollapse,
  className,
}: PipelineColumnHeaderProps) {
  // Determine if we should show the stats bar
  const hasStats = percentage !== undefined || moneyTotal !== undefined;

  return (
    <div
      className={cn(
        // Container
        'relative',
        // Glass effect background
        'bg-card/80 backdrop-blur-sm',
        // Border radius - top corners only
        'rounded-t-xl',
        // Overflow for accent bar
        'overflow-hidden',
        className
      )}
    >
      {/* Top Accent Bar - Stage Color */}
      <div
        className="absolute top-0 left-0 right-0"
        style={{
          height: COLUMN_TOKENS.accentBar,
          backgroundColor: color,
        }}
        aria-hidden="true"
      />

      {/* Main Header Content */}
      <div
        className={cn(
          'flex items-center justify-between',
          'px-3 pt-4 pb-2',
          // Min height for consistency
          'min-h-[3rem]'
        )}
      >
        {/* Left: Title + Count */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <h3
            className="font-semibold text-foreground truncate"
            style={{
              fontSize: TYPOGRAPHY_TOKENS.stageName.size,
              fontWeight: TYPOGRAPHY_TOKENS.stageName.weight,
              lineHeight: TYPOGRAPHY_TOKENS.stageName.lineHeight,
            }}
          >
            {title}
          </h3>

          {/* Count Badge */}
          <span
            className={cn(
              'inline-flex items-center justify-center',
              'rounded-full',
              'text-white font-medium',
              'shrink-0'
            )}
            style={{
              fontSize: TYPOGRAPHY_TOKENS.countBadge.size,
              fontWeight: TYPOGRAPHY_TOKENS.countBadge.weight,
              minWidth: TYPOGRAPHY_TOKENS.countBadge.minWidth,
              height: TYPOGRAPHY_TOKENS.countBadge.height,
              padding: '0 0.5rem',
              backgroundColor: color,
            }}
          >
            {count}
          </span>
        </div>

        {/* Right: Percentage (if provided) */}
        {percentage !== undefined && (
          <span
            className="text-muted-foreground shrink-0 ml-2"
            style={{
              fontSize: TYPOGRAPHY_TOKENS.percentage.size,
              fontWeight: TYPOGRAPHY_TOKENS.percentage.weight,
            }}
          >
            {percentage}%
          </span>
        )}
      </div>

      {/* Stats Bar - Money Total (if provided) */}
      {moneyTotal !== undefined && moneyTotal > 0 && (
        <div
          className={cn(
            'px-3 pb-2',
            'flex items-center',
            '-mt-1'
          )}
        >
          <span
            className="text-muted-foreground"
            style={{
              fontSize: TYPOGRAPHY_TOKENS.statsValue.size,
              fontWeight: TYPOGRAPHY_TOKENS.statsValue.weight,
            }}
          >
            {formatMoney(moneyTotal, currency)}
          </span>
        </div>
      )}

      {/* Bottom Border Subtle */}
      <div
        className="absolute bottom-0 left-3 right-3 h-px bg-border/30"
        aria-hidden="true"
      />
    </div>
  );
}

// ============================================
// Compact Variant
// ============================================

export function PipelineColumnHeaderCompact({
  title,
  count,
  color = '#6B7280',
  className,
}: Pick<PipelineColumnHeaderProps, 'title' | 'count' | 'color' | 'className'>) {
  return (
    <div
      className={cn(
        'flex items-center gap-2',
        'px-2 py-1.5',
        'bg-muted/30 rounded-md',
        className
      )}
    >
      {/* Color Dot */}
      <span
        className="w-2 h-2 rounded-full shrink-0"
        style={{ backgroundColor: color }}
        aria-hidden="true"
      />

      {/* Title */}
      <span className="text-xs font-medium text-foreground truncate flex-1">
        {title}
      </span>

      {/* Count */}
      <span
        className="text-xs text-muted-foreground shrink-0"
        style={{ minWidth: '1rem', textAlign: 'right' }}
      >
        {count}
      </span>
    </div>
  );
}

export default PipelineColumnHeader;

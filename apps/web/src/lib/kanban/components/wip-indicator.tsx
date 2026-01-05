'use client';

/**
 * WIPIndicator Component
 *
 * Visual indicator for WIP (Work In Progress) status.
 * Shows current count, limits, and warning states.
 *
 * @version 1.0.0
 * @module components/WIPIndicator
 */

import * as React from 'react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { AlertTriangle, Ban, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { WIPStatus } from '../types';

// ============================================
// Types
// ============================================

export interface WIPIndicatorProps {
  /** WIP status data */
  status: WIPStatus;
  /** Show detailed tooltip */
  showTooltip?: boolean;
  /** Compact mode */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// Component
// ============================================

export function WIPIndicator({
  status,
  showTooltip = true,
  compact = false,
  className,
}: WIPIndicatorProps) {
  // Determine icon and colors based on level
  const getIndicatorStyle = () => {
    switch (status.level) {
      case 'blocked':
        return {
          icon: Ban,
          bgColor: 'bg-red-100 dark:bg-red-950',
          textColor: 'text-red-600 dark:text-red-400',
          borderColor: 'border-red-200 dark:border-red-900',
        };
      case 'critical':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-orange-100 dark:bg-orange-950',
          textColor: 'text-orange-600 dark:text-orange-400',
          borderColor: 'border-orange-200 dark:border-orange-900',
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bgColor: 'bg-amber-100 dark:bg-amber-950',
          textColor: 'text-amber-600 dark:text-amber-400',
          borderColor: 'border-amber-200 dark:border-amber-900',
        };
      default:
        return {
          icon: Info,
          bgColor: 'bg-muted',
          textColor: 'text-muted-foreground',
          borderColor: 'border-border',
        };
    }
  };

  const style = getIndicatorStyle();
  const Icon = style.icon;

  // Only show for non-normal states or if explicit
  if (status.level === 'normal' && !showTooltip) {
    return null;
  }

  const indicator = (
    <div
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border',
        compact ? 'px-1.5 py-0.5' : 'px-2 py-1',
        style.bgColor,
        style.borderColor,
        className
      )}
      aria-label={status.message}
    >
      {status.level !== 'normal' && (
        <Icon className={cn('shrink-0', compact ? 'w-3 h-3' : 'w-3.5 h-3.5', style.textColor)} />
      )}
      <span
        className={cn(
          'font-mono font-medium',
          compact ? 'text-[10px]' : 'text-xs',
          style.textColor
        )}
      >
        {status.current}/{status.hardLimit}
      </span>
    </div>
  );

  if (!showTooltip) {
    return indicator;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{indicator}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">
              {status.level === 'blocked'
                ? 'Límite WIP Alcanzado'
                : status.level === 'warning' || status.level === 'critical'
                ? 'Advertencia de Capacidad'
                : 'Límite WIP'}
            </p>
            <div className="text-xs space-y-1">
              <p>
                <span className="text-muted-foreground">Actual:</span>{' '}
                {status.current} elementos
              </p>
              <p>
                <span className="text-muted-foreground">Soft limit:</span>{' '}
                {status.softLimit}
              </p>
              <p>
                <span className="text-muted-foreground">Hard limit:</span>{' '}
                {status.hardLimit}
              </p>
              <p>
                <span className="text-muted-foreground">Capacidad:</span>{' '}
                {status.percentage}%
              </p>
            </div>
            {status.message && (
              <p className="text-xs text-muted-foreground italic">
                {status.message}
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Progress Bar Variant
// ============================================

export interface WIPProgressBarProps {
  /** WIP status data */
  status: WIPStatus;
  /** Custom class name */
  className?: string;
}

export function WIPProgressBar({ status, className }: WIPProgressBarProps) {
  // Clamp percentage to 100 for display
  const displayPercentage = Math.min(status.percentage, 100);

  // Determine color based on level
  const getProgressColor = () => {
    switch (status.level) {
      case 'blocked':
        return 'bg-red-500';
      case 'critical':
        return 'bg-orange-500';
      case 'warning':
        return 'bg-amber-500';
      default:
        return 'bg-primary';
    }
  };

  return (
    <div className={cn('space-y-1', className)}>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn(
            'h-full transition-all duration-300',
            getProgressColor()
          )}
          style={{ width: `${displayPercentage}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>{status.current}</span>
        <span>{status.hardLimit}</span>
      </div>
    </div>
  );
}

export default WIPIndicator;

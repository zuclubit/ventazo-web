'use client';

/**
 * KanbanColumnHeader Component - Premium 2025 Redesign
 *
 * Header for each Kanban column showing:
 * - Gradient color indicator with glow
 * - Stage name with premium typography
 * - Lead count badge with accent border
 *
 * Features glassmorphism, theme-adaptive styling, and subtle animations.
 */

import * as React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface KanbanColumnHeaderProps {
  /** Column title */
  title: string;
  /** Number of leads in column */
  count: number;
  /** Stage color (hex) */
  color: string;
  /** Additional CSS classes */
  className?: string;
}

export function KanbanColumnHeader({
  title,
  count,
  color,
  className,
}: KanbanColumnHeaderProps) {
  return (
    <div
      className={cn(
        'kanban-header-premium',
        'flex items-center justify-between',
        // Responsive padding
        'p-3 sm:p-3.5',
        className
      )}
    >
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        {/* Color indicator - Premium with glow effect */}
        <div className="relative shrink-0">
          <div
            className={cn(
              'h-3 w-3 sm:h-3.5 sm:w-3.5 rounded-full',
              'ring-2 ring-white/20 dark:ring-white/10',
              'shadow-lg'
            )}
            style={{
              backgroundColor: color,
              boxShadow: `0 0 12px ${color}40, 0 2px 4px rgba(0,0,0,0.1)`,
            }}
          />
          {/* Subtle glow behind */}
          <div
            className="absolute inset-0 rounded-full blur-sm opacity-50"
            style={{ backgroundColor: color }}
          />
        </div>

        {/* Title - Premium typography */}
        <h3 className={cn(
          'font-semibold tracking-tight',
          'text-sm sm:text-base',
          'truncate max-w-[130px] sm:max-w-[180px]',
          'text-foreground/90'
        )}>
          {title}
        </h3>
      </div>

      {/* Count badge - Premium with stage color accent */}
      <Badge
        variant="outline"
        className={cn(
          'shrink-0',
          // Sizing
          'h-6 sm:h-7',
          'min-w-[1.5rem] sm:min-w-[1.75rem]',
          'px-2 sm:px-2.5',
          // Typography
          'text-xs sm:text-sm',
          'font-bold tabular-nums',
          // Styling
          'bg-background/50 backdrop-blur-sm',
          'border-2',
          'transition-all duration-200',
          'hover:scale-105'
        )}
        style={{
          borderColor: `${color}60`,
          color: color,
        }}
      >
        {count}
      </Badge>
    </div>
  );
}

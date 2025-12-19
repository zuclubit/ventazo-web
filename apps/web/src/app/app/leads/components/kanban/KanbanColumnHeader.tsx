'use client';

/**
 * KanbanColumnHeader Component
 *
 * Header for each Kanban column showing:
 * - Color indicator dot
 * - Stage name
 * - Lead count badge
 *
 * Responsive with optimized sizes for mobile.
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
        'flex items-center justify-between',
        // Responsive padding
        'p-2.5 sm:p-3',
        // Background for sticky header
        'bg-muted/30 backdrop-blur-sm',
        'rounded-t-xl',
        className
      )}
    >
      <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
        {/* Color indicator - Responsive size */}
        <div
          className="h-2.5 w-2.5 sm:h-3 sm:w-3 rounded-full shrink-0 shadow-sm ring-1 ring-black/5"
          style={{ backgroundColor: color }}
        />
        {/* Title - Truncate on small screens */}
        <h3 className="font-semibold text-xs sm:text-sm truncate max-w-[120px] sm:max-w-[180px]">
          {title}
        </h3>
      </div>

      {/* Count badge - Responsive size */}
      <Badge
        variant="secondary"
        className={cn(
          'shrink-0',
          // Responsive sizing
          'h-5 sm:h-6',
          'min-w-[1.25rem] sm:min-w-[1.5rem]',
          'px-1.5 sm:px-2',
          'text-2xs sm:text-xs',
          'font-semibold'
        )}
      >
        {count}
      </Badge>
    </div>
  );
}

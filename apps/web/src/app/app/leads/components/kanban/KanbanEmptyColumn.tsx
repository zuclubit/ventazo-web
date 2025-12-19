'use client';

/**
 * KanbanEmptyColumn Component
 *
 * Placeholder shown when a Kanban column has no leads.
 * Responsive with touch-friendly sizing.
 */

import * as React from 'react';
import { UserPlus } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface KanbanEmptyColumnProps {
  /** Stage name for context */
  stageName: string;
  /** Whether the column is a valid drop target */
  isOver?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function KanbanEmptyColumn({
  stageName,
  isOver = false,
  className,
}: KanbanEmptyColumnProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        // Responsive padding
        'py-6 sm:py-8 px-3 sm:px-4',
        // Border styles
        'border-2 border-dashed rounded-xl',
        'transition-all duration-200',
        // State-based colors
        isOver
          ? 'border-primary/50 bg-primary/5'
          : 'border-muted-foreground/20 bg-muted/20',
        className
      )}
    >
      {/* Icon container - Responsive size */}
      <div
        className={cn(
          'flex items-center justify-center rounded-full mb-2 sm:mb-3',
          // Responsive sizing
          'h-8 w-8 sm:h-10 sm:w-10',
          'bg-muted/50 transition-colors',
          isOver && 'bg-primary/10'
        )}
      >
        <UserPlus
          className={cn(
            'h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground transition-colors',
            isOver && 'text-primary'
          )}
          strokeWidth={1.5}
        />
      </div>

      {/* Text - Responsive */}
      <p className="text-2xs sm:text-xs text-muted-foreground text-center">
        Sin leads en{' '}
        <span className="font-medium">{stageName}</span>
      </p>

      {/* Drop indicator */}
      {isOver && (
        <p className="text-2xs sm:text-xs text-primary font-medium mt-1 sm:mt-1.5 animate-pulse">
          Suelta aquí
        </p>
      )}
    </div>
  );
}

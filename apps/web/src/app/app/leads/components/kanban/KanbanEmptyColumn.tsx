'use client';

/**
 * KanbanEmptyColumn Component - Premium 2025 Redesign
 *
 * Engaging placeholder with subtle animations and contextual messaging.
 * Features floating icon animation and premium styling.
 */

import * as React from 'react';
import { UserPlus, ArrowDown } from 'lucide-react';
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
        'empty-state-container',
        // Enhanced padding
        'py-8 sm:py-10 px-4 sm:px-5',
        // Override when dropping
        isOver && 'border-primary/50 bg-primary/10',
        className
      )}
    >
      {/* Icon container - Premium with animation */}
      <div
        className={cn(
          'relative flex items-center justify-center rounded-2xl mb-3 sm:mb-4',
          // Responsive sizing
          'h-12 w-12 sm:h-14 sm:w-14',
          // Premium styling
          'bg-gradient-to-br from-muted/80 to-muted/40',
          'backdrop-blur-sm',
          'shadow-inner',
          'transition-all duration-300',
          // Float animation when not dropping
          !isOver && 'animate-float-subtle',
          // Active state when dropping
          isOver && [
            'bg-gradient-to-br from-primary/20 to-primary/10',
            'scale-110',
            'shadow-lg shadow-primary/10',
          ]
        )}
      >
        <UserPlus
          className={cn(
            'h-5 w-5 sm:h-6 sm:w-6 transition-all duration-300',
            isOver ? 'text-primary scale-110' : 'text-muted-foreground/70'
          )}
          strokeWidth={1.5}
        />
      </div>

      {/* Text - Premium typography */}
      <p className={cn(
        'text-xs sm:text-sm text-center transition-colors duration-200',
        isOver ? 'text-primary font-medium' : 'text-muted-foreground'
      )}>
        {isOver ? (
          <span className="flex items-center gap-1.5">
            <ArrowDown className="h-3.5 w-3.5 animate-bounce" />
            Suelta aquí
          </span>
        ) : (
          <>
            Sin leads en{' '}
            <span className="font-semibold text-foreground/80">{stageName}</span>
          </>
        )}
      </p>

      {/* Subtle hint text */}
      {!isOver && (
        <p className="text-2xs text-muted-foreground/60 mt-2">
          Arrastra un lead para agregarlo
        </p>
      )}
    </div>
  );
}

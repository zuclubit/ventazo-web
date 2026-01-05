'use client';

/**
 * TaskStatsBar - Minimal inline stats bar (44px height)
 *
 * Replaces the 4 large stat cards with a compact inline display:
 * "5 abiertas · 3 vencidas · 2 completadas · 0 mías"
 *
 * - Numbers use semantic colors
 * - Each stat is clickable to filter
 * - 44px total height
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import type { TaskStatistics } from '@/lib/tasks/types';

export interface TaskStatsBarProps {
  statistics: TaskStatistics | null | undefined;
  isLoading?: boolean;
  activeFilter?: 'open' | 'overdue' | 'completed' | 'mine' | null;
  onFilterClick?: (filter: 'open' | 'overdue' | 'completed' | 'mine' | null) => void;
  className?: string;
}

interface StatItemProps {
  value: number;
  label: string;
  colorClass: string;
  isActive?: boolean;
  onClick?: () => void;
}

function StatItem({ value, label, colorClass, isActive, onClick }: StatItemProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-center gap-1.5 px-2 py-1 rounded-md transition-all duration-150',
        'hover:bg-muted/50',
        isActive && 'bg-muted ring-1 ring-border'
      )}
    >
      <span className={cn('font-semibold tabular-nums text-sm', colorClass)}>
        {value}
      </span>
      <span className="text-[13px] text-muted-foreground">{label}</span>
    </button>
  );
}

function Separator() {
  return <span className="text-muted-foreground/30 select-none">·</span>;
}

export function TaskStatsBar({
  statistics,
  isLoading = false,
  activeFilter,
  onFilterClick,
  className,
}: TaskStatsBarProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'h-11 flex items-center gap-1 px-2',
          'rounded-lg',
          'bg-muted/30 dark:bg-muted/20',
          'border border-border/50',
          className
        )}
        role="status"
        aria-label="Cargando estadísticas"
      >
        {[1, 2, 3, 4].map((i) => (
          <React.Fragment key={i}>
            <Skeleton className="h-6 w-16 rounded-md" />
            {i < 4 && <span className="text-muted-foreground/30 select-none">·</span>}
          </React.Fragment>
        ))}
      </div>
    );
  }

  const openCount = (statistics?.byStatus?.pending ?? 0) + (statistics?.byStatus?.inProgress ?? 0);
  const overdueCount = statistics?.overdue ?? 0;
  const completedCount = statistics?.completedToday ?? 0;
  const mineCount = statistics?.assignedToMe ?? 0;

  const handleClick = (filter: 'open' | 'overdue' | 'completed' | 'mine') => {
    if (activeFilter === filter) {
      onFilterClick?.(null); // Toggle off
    } else {
      onFilterClick?.(filter);
    }
  };

  return (
    <div
      className={cn(
        'h-11 flex items-center gap-1 px-2',
        'rounded-lg',
        'bg-muted/30 dark:bg-muted/20',
        'border border-border/50',
        className
      )}
    >
      <StatItem
        value={openCount}
        label="abiertas"
        colorClass="text-foreground"
        isActive={activeFilter === 'open'}
        onClick={() => handleClick('open')}
      />

      <Separator />

      <StatItem
        value={overdueCount}
        label="vencidas"
        colorClass={overdueCount > 0 ? 'text-[var(--urgency-overdue-text)]' : 'text-muted-foreground/60'}
        isActive={activeFilter === 'overdue'}
        onClick={() => handleClick('overdue')}
      />

      <Separator />

      <StatItem
        value={completedCount}
        label="completadas"
        colorClass={completedCount > 0 ? 'text-[var(--action-complete)]' : 'text-muted-foreground/60'}
        isActive={activeFilter === 'completed'}
        onClick={() => handleClick('completed')}
      />

      <Separator />

      <StatItem
        value={mineCount}
        label="mías"
        colorClass={mineCount > 0 ? 'text-[var(--link-entity)]' : 'text-muted-foreground/60'}
        isActive={activeFilter === 'mine'}
        onClick={() => handleClick('mine')}
      />
    </div>
  );
}

export default TaskStatsBar;

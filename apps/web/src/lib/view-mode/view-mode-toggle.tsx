'use client';

/**
 * ViewModeToggle Component - Ventazo Design System 2025
 *
 * @description Reusable toggle component for switching between view modes.
 *
 * @features
 * - Compact tabs style
 * - Icon-based with optional labels
 * - Accessible (keyboard navigation)
 * - Integrates with useViewMode hook
 *
 * @version 1.0.0
 */

import * as React from 'react';
import { List, LayoutGrid, Columns, AlignJustify, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { VIEW_MODE_DISPLAY, type ViewMode } from './types';

// ============================================
// Icon Map
// ============================================

const ICON_MAP = {
  List,
  LayoutGrid,
  Columns,
  AlignJustify,
} as const;

type IconName = keyof typeof ICON_MAP;

function getIcon(name: string): LucideIcon {
  return ICON_MAP[name as IconName] || List;
}

// ============================================
// Types
// ============================================

export interface ViewModeToggleProps<T extends ViewMode> {
  /** Current view mode */
  value: T;
  /** Available modes to show */
  modes: readonly T[];
  /** Change handler */
  onChange: (mode: T) => void;
  /** Show labels alongside icons */
  showLabels?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
  /** Disable the toggle */
  disabled?: boolean;
}

// ============================================
// ViewModeToggle Component
// ============================================

export function ViewModeToggle<T extends ViewMode>({
  value,
  modes,
  onChange,
  showLabels = false,
  size = 'sm',
  className,
  disabled = false,
}: ViewModeToggleProps<T>) {
  const sizeClasses = {
    sm: 'h-8',
    md: 'h-9',
  };

  const triggerSizeClasses = {
    sm: 'px-2 h-7',
    md: 'px-3 h-8',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-4 w-4',
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tabs
        value={value}
        onValueChange={(v) => onChange(v as T)}
        className={className}
      >
        <TabsList className={cn(sizeClasses[size], 'p-0.5')}>
          {modes.map((mode) => {
            const config = VIEW_MODE_DISPLAY[mode];
            const Icon = getIcon(config.icon);

            return (
              <Tooltip key={mode}>
                <TooltipTrigger asChild>
                  <TabsTrigger
                    value={mode}
                    disabled={disabled}
                    className={cn(
                      triggerSizeClasses[size],
                      'gap-1.5',
                      'data-[state=active]:bg-background',
                      'data-[state=active]:text-foreground',
                      'data-[state=active]:shadow-sm'
                    )}
                  >
                    <Icon className={iconSizeClasses[size]} />
                    {showLabels && (
                      <span className="text-xs font-medium">
                        {config.label}
                      </span>
                    )}
                  </TabsTrigger>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <p>{config.label}</p>
                </TooltipContent>
              </Tooltip>
            );
          })}
        </TabsList>
      </Tabs>
    </TooltipProvider>
  );
}

// ============================================
// ViewModeButton (Single button variant)
// ============================================

export interface ViewModeButtonProps<T extends ViewMode> {
  /** Current mode to display */
  mode: T;
  /** Whether this mode is active */
  isActive?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

export function ViewModeButton<T extends ViewMode>({
  mode,
  isActive = false,
  onClick,
  size = 'sm',
  className,
}: ViewModeButtonProps<T>) {
  const config = VIEW_MODE_DISPLAY[mode];
  const Icon = getIcon(config.icon);

  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-9 w-9',
  };

  const iconSizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-4.5 w-4.5',
  };

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={onClick}
            className={cn(
              'inline-flex items-center justify-center rounded-md',
              'transition-colors duration-200',
              'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              sizeClasses[size],
              isActive
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted/50',
              className
            )}
            aria-pressed={isActive}
          >
            <Icon className={iconSizeClasses[size]} />
            <span className="sr-only">{config.label}</span>
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          <p>{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

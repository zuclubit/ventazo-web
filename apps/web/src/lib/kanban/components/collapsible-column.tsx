'use client';

/**
 * CollapsibleColumn Component
 *
 * Wrapper component that adds collapse/expand functionality
 * to Kanban columns. Maintains state and provides animations.
 *
 * @version 1.0.0
 * @module components/CollapsibleColumn
 */

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PipelineStageConfig, WIPStatus } from '../types';

// ============================================
// Types
// ============================================

export interface CollapsibleColumnProps {
  /** Stage configuration */
  stage: PipelineStageConfig;
  /** Number of items in column */
  count: number;
  /** WIP status */
  wip?: WIPStatus;
  /** Whether column is collapsed */
  isCollapsed?: boolean;
  /** Callback when collapse state changes */
  onToggleCollapse?: (collapsed: boolean) => void;
  /** Header content when expanded */
  header?: React.ReactNode;
  /** Column content (cards) */
  children: React.ReactNode;
  /** Enable collapse feature */
  collapsible?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// Animation Variants
// ============================================

const columnVariants = {
  expanded: {
    width: 'clamp(260px, 20vw, 300px)',
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    },
  },
  collapsed: {
    width: 48,
    transition: {
      duration: 0.3,
      ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
    },
  },
};

const contentVariants = {
  expanded: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.2,
      delay: 0.1,
    },
  },
  collapsed: {
    opacity: 0,
    scale: 0.95,
    transition: {
      duration: 0.15,
    },
  },
};

// ============================================
// Collapsed Column View
// ============================================

interface CollapsedViewProps {
  stage: PipelineStageConfig;
  count: number;
  wip?: WIPStatus;
  onExpand: () => void;
}

function CollapsedView({ stage, count, wip, onExpand }: CollapsedViewProps) {
  const label = stage.labelEs || stage.label;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onExpand}
            className={cn(
              'h-full w-12 flex flex-col items-center py-3 gap-2',
              'bg-muted/50 hover:bg-muted transition-colors',
              'border-r border-border rounded-lg cursor-pointer'
            )}
          >
            {/* Stage color indicator */}
            <div
              className="w-3 h-3 rounded-full shrink-0"
              style={{ backgroundColor: stage.color }}
            />

            {/* Rotated label */}
            <div
              className="flex-1 flex items-center justify-center"
              style={{
                writingMode: 'vertical-rl',
                textOrientation: 'mixed',
              }}
            >
              <span className="text-xs font-medium text-muted-foreground truncate max-h-[120px]">
                {label}
              </span>
            </div>

            {/* Count badge */}
            <Badge
              variant={
                wip?.level === 'blocked'
                  ? 'destructive'
                  : wip?.level === 'warning'
                  ? 'secondary'
                  : 'outline'
              }
              className="text-[10px] px-1.5"
            >
              {count}
            </Badge>

            {/* Expand icon */}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right">
          <div className="space-y-1">
            <p className="font-medium">{label}</p>
            <p className="text-xs text-muted-foreground">
              {count} elemento{count !== 1 ? 's' : ''}
            </p>
            <p className="text-xs">Clic para expandir</p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Collapsible Column Component
// ============================================

export function CollapsibleColumn({
  stage,
  count,
  wip,
  isCollapsed = false,
  onToggleCollapse,
  header,
  children,
  collapsible = true,
  className,
}: CollapsibleColumnProps) {
  // Internal collapsed state if not controlled
  const [internalCollapsed, setInternalCollapsed] = React.useState(false);
  const collapsed = onToggleCollapse ? isCollapsed : internalCollapsed;

  const handleToggle = () => {
    if (onToggleCollapse) {
      onToggleCollapse(!collapsed);
    } else {
      setInternalCollapsed(!internalCollapsed);
    }
  };

  // If collapsed, render collapsed view
  if (collapsed && collapsible) {
    return (
      <CollapsedView
        stage={stage}
        count={count}
        wip={wip}
        onExpand={handleToggle}
      />
    );
  }

  return (
    <motion.div
      layout
      variants={columnVariants}
      initial={false}
      animate="expanded"
      className={cn(
        'flex flex-col h-full shrink-0',
        'bg-muted/30 rounded-lg border border-border',
        className
      )}
      style={{ width: 'clamp(260px, 20vw, 300px)' }}
    >
      {/* Header with collapse button */}
      <div className="flex items-center gap-2 p-3 border-b border-border">
        {/* Collapse button */}
        {collapsible && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={handleToggle}
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                Colapsar columna
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}

        {/* Custom header or default */}
        <div className="flex-1 min-w-0">{header}</div>
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        <motion.div
          variants={contentVariants}
          initial="collapsed"
          animate="expanded"
          exit="collapsed"
          className="flex-1 overflow-hidden"
        >
          {children}
        </motion.div>
      </AnimatePresence>
    </motion.div>
  );
}

// ============================================
// useColumnCollapse Hook
// ============================================

export interface ColumnCollapseState {
  [stageId: string]: boolean;
}

export function useColumnCollapse(initialState: ColumnCollapseState = {}) {
  const [collapsedColumns, setCollapsedColumns] =
    React.useState<ColumnCollapseState>(initialState);

  const isCollapsed = React.useCallback(
    (stageId: string) => collapsedColumns[stageId] ?? false,
    [collapsedColumns]
  );

  const toggle = React.useCallback((stageId: string) => {
    setCollapsedColumns((prev) => ({
      ...prev,
      [stageId]: !prev[stageId],
    }));
  }, []);

  const collapse = React.useCallback((stageId: string) => {
    setCollapsedColumns((prev) => ({
      ...prev,
      [stageId]: true,
    }));
  }, []);

  const expand = React.useCallback((stageId: string) => {
    setCollapsedColumns((prev) => ({
      ...prev,
      [stageId]: false,
    }));
  }, []);

  const collapseAll = React.useCallback((stageIds: string[]) => {
    setCollapsedColumns(
      stageIds.reduce((acc, id) => ({ ...acc, [id]: true }), {})
    );
  }, []);

  const expandAll = React.useCallback(() => {
    setCollapsedColumns({});
  }, []);

  return {
    collapsedColumns,
    isCollapsed,
    toggle,
    collapse,
    expand,
    collapseAll,
    expandAll,
  };
}

export default CollapsibleColumn;

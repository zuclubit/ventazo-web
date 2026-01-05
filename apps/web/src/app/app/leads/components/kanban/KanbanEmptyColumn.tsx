'use client';

/**
 * KanbanEmptyColumn Component - Leads Pipeline
 *
 * Wrapper around shared PipelineColumnEmptyState for leads-specific use.
 * Uses the centralized design system for visual consistency.
 *
 * @module components/leads/kanban/KanbanEmptyColumn
 */

import * as React from 'react';
import {
  PipelineColumnEmptyState,
  type PipelineColumnEmptyStateProps,
} from '@/components/pipeline';

export interface KanbanEmptyColumnProps {
  /** Stage name for context */
  stageName: string;
  /** Stage ID for contextual messaging */
  stageId?: string;
  /** Stage color for visual feedback */
  stageColor?: string;
  /** Whether the column is a valid drop target */
  isOver?: boolean;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Empty column state for Leads Kanban.
 * Uses shared PipelineColumnEmptyState with leads-specific defaults.
 */
export function KanbanEmptyColumn({
  stageName,
  stageId,
  stageColor,
  isOver = false,
  className,
}: KanbanEmptyColumnProps) {
  // Derive stageId from stageName if not provided
  const derivedStageId = stageId || stageName.toLowerCase().replace(/\s+/g, '_');

  return (
    <PipelineColumnEmptyState
      stageId={derivedStageId}
      stageName={stageName}
      stageColor={stageColor}
      pipelineType="leads"
      isDropTarget={isOver}
      size="md"
      className={className}
    />
  );
}

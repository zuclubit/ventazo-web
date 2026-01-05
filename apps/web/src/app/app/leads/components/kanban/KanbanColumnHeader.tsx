'use client';

/**
 * KanbanColumnHeader Component - Leads Pipeline
 *
 * Wrapper around shared PipelineColumnHeader for leads-specific use.
 * Uses the centralized design system for visual consistency.
 *
 * @module components/leads/kanban/KanbanColumnHeader
 */

import * as React from 'react';
import { PipelineColumnHeader } from '@/components/pipeline';

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

/**
 * Column header for Leads Kanban.
 * Uses shared PipelineColumnHeader with leads-specific defaults.
 */
export function KanbanColumnHeader({
  title,
  count,
  color,
  className,
}: KanbanColumnHeaderProps) {
  return (
    <PipelineColumnHeader
      title={title}
      count={count}
      color={color}
      className={className}
    />
  );
}

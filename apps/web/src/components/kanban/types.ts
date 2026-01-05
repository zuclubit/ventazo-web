// ============================================
// Kanban Shared Types - Design System 2025
// ============================================

import type { ReactNode } from 'react';

/**
 * Base column configuration
 */
export interface KanbanColumnConfig {
  id: string;
  title: string;
  color?: string;
  count: number;
}

/**
 * Drop zone states for visual feedback
 */
export interface DropZoneState {
  isOver: boolean;
  isValidDrop: boolean;
  isInvalidDrop: boolean;
  validationMessage?: string;
}

/**
 * Base kanban column props (without module-specific logic)
 */
export interface BaseKanbanColumnProps {
  /** Column configuration */
  config: KanbanColumnConfig;
  /** Drop zone visual state */
  dropState?: Partial<DropZoneState>;
  /** Children (cards) to render */
  children: ReactNode;
  /** Empty state component or message */
  emptyState?: ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Width override (default uses CSS variable) */
  width?: string;
}

/**
 * Base kanban card props (without module-specific logic)
 */
export interface BaseKanbanCardProps {
  /** Unique identifier */
  id: string;
  /** Primary title */
  title: string;
  /** Secondary text (subtitle, email, etc) */
  subtitle?: string;
  /** Avatar configuration */
  avatar?: {
    name: string;
    src?: string;
  };
  /** Numeric score (0-100) for lead scoring */
  score?: number;
  /** Tags to display */
  tags?: string[];
  /** Monetary amount (for opportunities) */
  amount?: number;
  /** Currency for amount formatting */
  currency?: string;
  /** Priority indicator */
  priority?: 'low' | 'medium' | 'high' | 'urgent';
  /** Whether the card is being dragged */
  isDragging?: boolean;
  /** Whether the card is selected */
  isSelected?: boolean;
  /** Whether the card is in a loading/moving state */
  isLoading?: boolean;
  /** Click handler */
  onClick?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Children for custom content */
  children?: ReactNode;
}

/**
 * Column header props
 */
export interface KanbanColumnHeaderProps {
  title: string;
  count: number;
  color?: string;
  actions?: ReactNode;
  className?: string;
}

/**
 * Empty column props
 */
export interface KanbanEmptyColumnProps {
  title?: string;
  message?: string;
  isDropTarget?: boolean;
  icon?: ReactNode;
  className?: string;
}

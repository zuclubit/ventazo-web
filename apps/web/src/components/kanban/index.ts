// ============================================
// Kanban Components - Public API
// ============================================

// Types
export type {
  KanbanColumnConfig,
  DropZoneState,
  BaseKanbanColumnProps,
  BaseKanbanCardProps,
  KanbanColumnHeaderProps,
  KanbanEmptyColumnProps,
} from './types';

// Column Components
export {
  KanbanColumn,
  KanbanColumnHeader,
  KanbanEmptyColumn,
} from './kanban-column';

// Card Components
export {
  KanbanCard,
  ScoreBadge,
  PriorityBadge,
  getInitials,
  formatCurrency,
  getScoreVariant,
} from './kanban-card';

// Container with scroll indicators (NEW)
export {
  KanbanContainer,
  KanbanContainerSkeleton,
  type KanbanContainerProps,
  type KanbanContainerSkeletonProps,
} from './KanbanContainer';

// Scroll hook (NEW)
export {
  useKanbanScroll,
  type UseKanbanScrollOptions,
  type UseKanbanScrollReturn,
} from './useKanbanScroll';

// Scroll indicators (Legacy - deprecated)
export {
  ScrollIndicator,
  CompactScrollIndicators,
  ScrollProgressBar,
  type ScrollIndicatorProps,
  type ScrollIndicatorDirection,
  type CompactScrollIndicatorProps,
  type ScrollProgressBarProps,
} from './ScrollIndicator';

// Minimalist scroll hints (NEW - v2)
export {
  ScrollHints,
  CompactScrollHints,
  type ScrollHintsProps,
} from './ScrollHints';

// Mobile Kanban View (NEW - v1.0)
export {
  MobileKanbanView,
  MobileDragHandle,
  type MobileKanbanViewProps,
  type MobileKanbanColumn,
  type MobileDragHandleProps,
} from './MobileKanbanView';

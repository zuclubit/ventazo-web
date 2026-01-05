// ============================================
// Kanban Core Types - Enterprise CRM Module
// Version: 2.0.0
// ============================================

import type { ReactNode } from 'react';

// ============================================
// Entity Type Definitions
// ============================================

/**
 * Supported entity types for Kanban boards
 */
export type KanbanEntityType = 'lead' | 'opportunity' | 'customer' | 'task';

/**
 * Stage types for pipeline stages
 */
export type StageType = 'open' | 'won' | 'lost' | 'terminal';

/**
 * Transition validation result types
 */
export type TransitionType =
  | 'allowed'
  | 'warning'
  | 'requires_data'
  | 'blocked';

// ============================================
// Stage & Column Configuration
// ============================================

/**
 * Pipeline stage configuration
 */
export interface PipelineStageConfig {
  id: string;
  label: string;
  labelEs?: string;
  color: string;
  order: number;
  type: StageType;
  probability?: number; // For opportunities
  wipLimit?: WIPLimitConfig;
  autoTriggers?: AutoTrigger[];
}

/**
 * WIP (Work In Progress) limit configuration
 */
export interface WIPLimitConfig {
  /** Soft limit - show warning */
  soft: number;
  /** Hard limit - block new items */
  hard: number;
  /** Override requires justification */
  requiresJustification: boolean;
}

/**
 * Current WIP status for a column
 */
export interface WIPStatus {
  current: number;
  softLimit: number;
  hardLimit: number;
  /** Percentage of hard limit used */
  percentage: number;
  /** Status level */
  level: 'normal' | 'warning' | 'critical' | 'blocked';
  /** Can add more items */
  canAdd: boolean;
  /** Message to display */
  message?: string;
}

// ============================================
// Transition Validation
// ============================================

/**
 * Stage transition validation result
 */
export interface StageTransitionValidation {
  /** Whether the transition is allowed */
  allowed: boolean;
  /** Type of validation result */
  type: TransitionType;
  /** Reason if not allowed or warning */
  reason?: string;
  /** Localized reason in Spanish */
  reasonEs?: string;
  /** Suggested action */
  suggestedAction?: SuggestedAction;
  /** Required data for transition */
  requiredData?: RequiredTransitionData[];
  /** Warning level (for 'warning' type) */
  warningLevel?: 'info' | 'caution' | 'danger';
}

export type SuggestedAction =
  | 'use_convert_dialog'
  | 'use_lose_dialog'
  | 'reopen_first'
  | 'already_there'
  | 'complete_onboarding'
  | 'provide_reason'
  | 'attach_document'
  | 'manager_approval';

export interface RequiredTransitionData {
  field: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'file' | 'reason';
  required: boolean;
  options?: { value: string; label: string }[];
}

// ============================================
// Automatic Triggers
// ============================================

/**
 * Automatic trigger configuration
 */
export interface AutoTrigger {
  id: string;
  condition: TriggerCondition;
  action: TriggerAction;
  enabled: boolean;
}

export type TriggerCondition =
  | { type: 'on_enter' }
  | { type: 'on_exit' }
  | { type: 'time_in_stage'; days: number }
  | { type: 'score_threshold'; operator: 'gt' | 'lt' | 'eq'; value: number }
  | { type: 'field_change'; field: string; value?: unknown };

export type TriggerAction =
  | { type: 'notify'; recipients: string[]; template: string }
  | { type: 'update_field'; field: string; value: unknown }
  | { type: 'create_task'; taskType: string; assignTo?: string }
  | { type: 'send_email'; templateId: string }
  | { type: 'webhook'; url: string }
  | { type: 'move_to_stage'; stageId: string }
  | { type: 'add_tag'; tag: string };

// ============================================
// Kanban Board Configuration
// ============================================

/**
 * Kanban board configuration
 */
export interface KanbanBoardConfig {
  entityType: KanbanEntityType;
  stages: PipelineStageConfig[];
  features: KanbanFeatures;
  validation: ValidationConfig;
  accessibility: AccessibilityConfig;
}

/**
 * Feature flags for Kanban
 */
export interface KanbanFeatures {
  /** Enable drag and drop */
  dragDrop: boolean;
  /** Enable column collapse */
  collapse: boolean;
  /** Enable WIP limits */
  wipLimits: boolean;
  /** Enable keyboard navigation */
  keyboard: boolean;
  /** Enable undo capability */
  undo: boolean;
  /** Undo window in milliseconds */
  undoWindowMs: number;
  /** Enable bulk operations */
  bulkOperations: boolean;
  /** Enable real-time updates */
  realtime: boolean;
  /** Enable stale item highlighting */
  staleHighlighting: boolean;
  /** Days until item is considered stale */
  staleDays: number;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  /** Validate on frontend before API call */
  frontend: boolean;
  /** Backend validation (always true, for reference) */
  backend: boolean;
  /** Show validation feedback on drop zones */
  showDropFeedback: boolean;
  /** Shake animation on invalid drop */
  shakeOnInvalid: boolean;
}

/**
 * Accessibility configuration
 */
export interface AccessibilityConfig {
  /** Enable screen reader announcements */
  announcements: boolean;
  /** Enable keyboard navigation */
  keyboard: boolean;
  /** Provide move-to button alternative */
  moveToButton: boolean;
  /** High contrast mode support */
  highContrast: boolean;
  /** Reduce motion preference */
  respectReducedMotion: boolean;
}

// ============================================
// Kanban Item (Generic)
// ============================================

/**
 * Base interface for any Kanban item
 */
export interface KanbanItem<T = unknown> {
  id: string;
  stageId: string;
  order?: number;
  data: T;
  metadata?: KanbanItemMetadata;
}

export interface KanbanItemMetadata {
  createdAt: string;
  updatedAt: string;
  movedAt?: string;
  staleAt?: string;
  isStale?: boolean;
  isUrgent?: boolean;
  isOverdue?: boolean;
}

// ============================================
// Kanban Column State
// ============================================

/**
 * Column state for rendering
 */
export interface KanbanColumnState<T = unknown> {
  stage: PipelineStageConfig;
  items: KanbanItem<T>[];
  count: number;
  wip: WIPStatus;
  isCollapsed: boolean;
  isDropTarget: boolean;
  dropValidation?: StageTransitionValidation;
}

// ============================================
// Drop Zone State
// ============================================

/**
 * Drop zone visual state
 */
export interface DropZoneState {
  isOver: boolean;
  isValidDrop: boolean;
  isInvalidDrop: boolean;
  validation?: StageTransitionValidation;
  activeItemId?: string;
}

// ============================================
// Drag State
// ============================================

/**
 * Current drag operation state
 */
export interface DragState {
  isDragging: boolean;
  activeId: string | null;
  activeItem: KanbanItem | null;
  overId: string | null;
  overStageId: string | null;
}

// ============================================
// Move Operation
// ============================================

/**
 * Move operation for undo/redo
 */
export interface MoveOperation {
  id: string;
  itemId: string;
  sourceStageId: string;
  targetStageId: string;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

/**
 * Undo state
 */
export interface UndoState {
  operations: MoveOperation[];
  maxOperations: number;
  windowMs: number;
}

// ============================================
// Keyboard Navigation
// ============================================

/**
 * Keyboard shortcut definition
 */
export interface KeyboardShortcut {
  key: string;
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[];
  action: string;
  description: string;
  scope?: 'global' | 'board' | 'card' | 'column';
}

/**
 * Focus state for keyboard navigation
 */
export interface FocusState {
  columnIndex: number;
  itemIndex: number;
  isGrabbed: boolean;
}

// ============================================
// Accessibility Announcements
// ============================================

/**
 * Screen reader announcement
 */
export interface Announcement {
  id: string;
  message: string;
  priority: 'polite' | 'assertive';
  timestamp: number;
}

// ============================================
// Telemetry Events
// ============================================

/**
 * Kanban telemetry event
 */
export interface KanbanTelemetryEvent {
  type: KanbanEventType;
  entityType: KanbanEntityType;
  timestamp: number;
  data: Record<string, unknown>;
  userId?: string;
  tenantId?: string;
  sessionId?: string;
}

export type KanbanEventType =
  | 'drag_start'
  | 'drag_end'
  | 'drag_cancel'
  | 'drop_success'
  | 'drop_invalid'
  | 'drop_blocked'
  | 'keyboard_move'
  | 'move_to_dialog'
  | 'undo'
  | 'column_collapse'
  | 'column_expand'
  | 'wip_warning_shown'
  | 'wip_blocked'
  | 'bulk_select'
  | 'bulk_move'
  | 'card_click'
  | 'quick_action';

// ============================================
// Component Props Types
// ============================================

/**
 * Base column props
 */
export interface BaseKanbanColumnProps<T = unknown> {
  column: KanbanColumnState<T>;
  dropState: DropZoneState;
  onItemClick?: (item: KanbanItem<T>) => void;
  onItemEdit?: (item: KanbanItem<T>) => void;
  onItemDelete?: (item: KanbanItem<T>) => void;
  onCollapse?: () => void;
  renderItem: (item: KanbanItem<T>, index: number) => ReactNode;
  renderEmptyState?: () => ReactNode;
  renderHeader?: () => ReactNode;
  className?: string;
}

/**
 * Base card props
 */
export interface BaseKanbanCardProps {
  id: string;
  isDragging?: boolean;
  isMoving?: boolean;
  isSelected?: boolean;
  isStale?: boolean;
  isUrgent?: boolean;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  className?: string;
  children?: ReactNode;
}

// Note: MoveToDialogProps and WIPWarningDialogProps are defined in their respective component files
// to avoid duplicate exports. See components/move-to-dialog.tsx and components/wip-warning-dialog.tsx

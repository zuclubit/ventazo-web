// ============================================
// Kanban Utilities - Enterprise CRM Module
// Version: 2.0.0
// ============================================

import type {
  KanbanEntityType,
  PipelineStageConfig,
  StageTransitionValidation,
  WIPStatus,
  WIPLimitConfig,
  KanbanColumnState,
  KanbanItem,
  MoveOperation,
} from './types';

import {
  LEAD_TRANSITIONS,
  OPPORTUNITY_TRANSITIONS,
  CUSTOMER_TRANSITIONS,
  SCORE_THRESHOLDS,
  HEALTH_THRESHOLDS,
} from './constants';

// ============================================
// WIP Limit Utilities
// ============================================

/**
 * Calculate WIP status for a column
 */
export function calculateWIPStatus(
  current: number,
  wipLimit?: WIPLimitConfig
): WIPStatus {
  if (!wipLimit) {
    return {
      current,
      softLimit: Infinity,
      hardLimit: Infinity,
      percentage: 0,
      level: 'normal',
      canAdd: true,
    };
  }

  const { soft, hard } = wipLimit;
  const percentage = Math.round((current / hard) * 100);

  let level: WIPStatus['level'] = 'normal';
  let message: string | undefined;

  if (current >= hard) {
    level = 'blocked';
    message = `Límite alcanzado (${current}/${hard}). No se pueden agregar más elementos.`;
  } else if (current >= soft) {
    level = 'warning';
    message = `Cerca del límite (${current}/${hard}). Considera procesar algunos elementos.`;
  } else if (percentage >= 80) {
    level = 'critical';
    message = `${percentage}% de capacidad utilizada.`;
  }

  return {
    current,
    softLimit: soft,
    hardLimit: hard,
    percentage,
    level,
    canAdd: current < hard,
    message,
  };
}

/**
 * Check if an item can be added to a column based on WIP limits
 */
export function canAddToColumn(
  column: KanbanColumnState,
  requiresJustification: boolean = false
): { allowed: boolean; message?: string; requiresJustification: boolean } {
  if (column.wip.canAdd) {
    return { allowed: true, requiresJustification: false };
  }

  return {
    allowed: requiresJustification,
    message: column.wip.message,
    requiresJustification,
  };
}

// ============================================
// Transition Validation
// ============================================

/**
 * Get transition rules based on entity type
 */
function getTransitionRules(
  entityType: KanbanEntityType
): Record<string, 'allowed' | 'warning' | 'requires_data' | 'blocked'> {
  switch (entityType) {
    case 'lead':
      return LEAD_TRANSITIONS;
    case 'opportunity':
      return OPPORTUNITY_TRANSITIONS;
    case 'customer':
      return CUSTOMER_TRANSITIONS;
    case 'task':
      // Tasks have simpler rules - most transitions allowed
      return {};
    default:
      return {};
  }
}

/**
 * Get transition reason message
 */
function getTransitionReason(
  entityType: KanbanEntityType,
  fromStage: PipelineStageConfig,
  toStage: PipelineStageConfig,
  transitionType: 'allowed' | 'warning' | 'requires_data' | 'blocked'
): { reason?: string; reasonEs?: string } {
  if (transitionType === 'allowed') {
    return {};
  }

  // Terminal stage checks
  if (fromStage.type === 'won' || fromStage.type === 'lost') {
    return {
      reason: `Cannot move from ${fromStage.label}. Terminal stage.`,
      reasonEs: `No se puede mover desde ${fromStage.labelEs || fromStage.label}. Etapa terminal.`,
    };
  }

  if (toStage.type === 'won') {
    if (entityType === 'lead') {
      return {
        reason: 'Use the "Convert to Customer" button to mark as won.',
        reasonEs: 'Usa el botón "Convertir a Cliente" para marcar como ganado.',
      };
    }
    return {
      reason: 'Use the "Close Won" dialog to complete this deal.',
      reasonEs: 'Usa el diálogo "Cerrar Ganado" para completar este trato.',
    };
  }

  if (toStage.type === 'lost') {
    return {
      reason: 'Use the actions menu to mark as lost with a reason.',
      reasonEs: 'Usa el menú de acciones para marcar como perdido con una razón.',
    };
  }

  // Skip stage warnings
  if (transitionType === 'warning') {
    const stagesDiff = Math.abs(toStage.order - fromStage.order);
    if (stagesDiff > 1) {
      return {
        reason: `You are skipping ${stagesDiff - 1} stage(s). Are you sure?`,
        reasonEs: `Estás saltando ${stagesDiff - 1} etapa(s). ¿Estás seguro?`,
      };
    }
    if (toStage.order < fromStage.order) {
      return {
        reason: 'Moving backwards in the pipeline. This action will be logged.',
        reasonEs: 'Retrocediendo en el pipeline. Esta acción será registrada.',
      };
    }
  }

  // Requires data
  if (transitionType === 'requires_data') {
    // Note: 'lost' check already handled above, but keeping for semantic clarity
    return {
      reason: 'Additional information required for this transition.',
      reasonEs: 'Se requiere información adicional para esta transición.',
    };
  }

  return {
    reason: 'This transition is not allowed.',
    reasonEs: 'Esta transición no está permitida.',
  };
}

/**
 * Validate a stage transition
 */
export function validateStageTransition(
  entityType: KanbanEntityType,
  fromStage: PipelineStageConfig,
  toStage: PipelineStageConfig,
  targetColumn?: KanbanColumnState
): StageTransitionValidation {
  // Same stage check
  if (fromStage.id === toStage.id) {
    return {
      allowed: false,
      type: 'blocked',
      reason: 'Item is already in this stage.',
      reasonEs: 'El elemento ya está en esta etapa.',
      suggestedAction: 'already_there',
    };
  }

  // Check WIP limit on target column
  if (targetColumn && !targetColumn.wip.canAdd) {
    return {
      allowed: false,
      type: 'blocked',
      reason: `WIP limit reached (${targetColumn.wip.current}/${targetColumn.wip.hardLimit}).`,
      reasonEs: `Límite WIP alcanzado (${targetColumn.wip.current}/${targetColumn.wip.hardLimit}).`,
    };
  }

  // Get transition rules
  const rules = getTransitionRules(entityType);
  const transitionKey = `${fromStage.id}_${toStage.id}`;
  const transitionType = rules[transitionKey] || 'allowed';

  // Get reason messages
  const reasons = getTransitionReason(entityType, fromStage, toStage, transitionType);

  // Build suggested action
  let suggestedAction: StageTransitionValidation['suggestedAction'];
  if (toStage.type === 'won') {
    suggestedAction = 'use_convert_dialog';
  } else if (toStage.type === 'lost') {
    suggestedAction = 'use_lose_dialog';
  } else if (transitionType === 'requires_data') {
    suggestedAction = 'provide_reason';
  }

  return {
    allowed: transitionType === 'allowed' || transitionType === 'warning',
    type: transitionType,
    ...reasons,
    suggestedAction,
    warningLevel:
      transitionType === 'warning'
        ? toStage.order < fromStage.order
          ? 'caution'
          : 'info'
        : undefined,
  };
}

// ============================================
// Score/Health Utilities
// ============================================

/**
 * Get score temperature based on value
 */
export function getScoreTemperature(
  score: number
): 'cold' | 'cool' | 'warm' | 'hot' | 'veryHot' | 'converted' {
  if (score >= SCORE_THRESHOLDS.converted.min) return 'converted';
  if (score >= SCORE_THRESHOLDS.veryHot.min) return 'veryHot';
  if (score >= SCORE_THRESHOLDS.hot.min) return 'hot';
  if (score >= SCORE_THRESHOLDS.warm.min) return 'warm';
  if (score >= SCORE_THRESHOLDS.cool.min) return 'cool';
  return 'cold';
}

/**
 * Get health level based on value
 */
export function getHealthLevel(
  health: number
): 'critical' | 'poor' | 'fair' | 'good' | 'excellent' {
  if (health >= HEALTH_THRESHOLDS.excellent.min) return 'excellent';
  if (health >= HEALTH_THRESHOLDS.good.min) return 'good';
  if (health >= HEALTH_THRESHOLDS.fair.min) return 'fair';
  if (health >= HEALTH_THRESHOLDS.poor.min) return 'poor';
  return 'critical';
}

/**
 * Check if item is stale
 */
export function isItemStale(
  lastActivityAt: string | undefined,
  staleDays: number = 7
): boolean {
  if (!lastActivityAt) return false;

  const lastActivity = new Date(lastActivityAt);
  const now = new Date();
  const diffDays = Math.floor(
    (now.getTime() - lastActivity.getTime()) / (1000 * 60 * 60 * 24)
  );

  return diffDays >= staleDays;
}

/**
 * Check if item is overdue
 */
export function isItemOverdue(dueDate: string | undefined): boolean {
  if (!dueDate) return false;

  const due = new Date(dueDate);
  const now = new Date();

  return due < now;
}

/**
 * Get days until due or days overdue
 */
export function getDueDateStatus(
  dueDate: string | undefined
): { isOverdue: boolean; days: number } | null {
  if (!dueDate) return null;

  const due = new Date(dueDate);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  return {
    isOverdue: diffDays < 0,
    days: Math.abs(diffDays),
  };
}

// ============================================
// Color Utilities
// ============================================

/**
 * Convert hex color to RGB
 */
export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result || !result[1] || !result[2] || !result[3]) {
    return null;
  }
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

/**
 * Convert RGB to hex
 */
export function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

/**
 * Get luminance of a color (for contrast calculations)
 */
export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 0;

  const values = [rgb.r, rgb.g, rgb.b].map((v) => {
    const normalized = v / 255;
    return normalized <= 0.03928 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
  });

  const rVal = values[0] ?? 0;
  const gVal = values[1] ?? 0;
  const bVal = values[2] ?? 0;

  return 0.2126 * rVal + 0.7152 * gVal + 0.0722 * bVal;
}

/**
 * Get optimal text color (light or dark) for a background
 */
export function getOptimalTextColor(bgHex: string): 'light' | 'dark' {
  const luminance = getLuminance(bgHex);
  return luminance > 0.179 ? 'dark' : 'light';
}

/**
 * Lighten a color by a percentage
 */
export function lightenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = percent / 100;
  return rgbToHex(
    rgb.r + (255 - rgb.r) * factor,
    rgb.g + (255 - rgb.g) * factor,
    rgb.b + (255 - rgb.b) * factor
  );
}

/**
 * Darken a color by a percentage
 */
export function darkenColor(hex: string, percent: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const factor = 1 - percent / 100;
  return rgbToHex(rgb.r * factor, rgb.g * factor, rgb.b * factor);
}

/**
 * Generate color palette from a base color
 */
export function generateColorPalette(baseHex: string) {
  return {
    50: lightenColor(baseHex, 95),
    100: lightenColor(baseHex, 85),
    200: lightenColor(baseHex, 70),
    300: lightenColor(baseHex, 50),
    400: lightenColor(baseHex, 25),
    500: baseHex,
    600: darkenColor(baseHex, 10),
    700: darkenColor(baseHex, 25),
    800: darkenColor(baseHex, 40),
    900: darkenColor(baseHex, 55),
  };
}

// ============================================
// Undo/Redo Utilities
// ============================================

/**
 * Create a move operation for undo history
 */
export function createMoveOperation(
  itemId: string,
  sourceStageId: string,
  targetStageId: string,
  metadata?: Record<string, unknown>
): MoveOperation {
  return {
    id: crypto.randomUUID(),
    itemId,
    sourceStageId,
    targetStageId,
    timestamp: Date.now(),
    metadata,
  };
}

/**
 * Check if an operation is still undoable
 */
export function isOperationUndoable(
  operation: MoveOperation,
  windowMs: number = 5000
): boolean {
  return Date.now() - operation.timestamp < windowMs;
}

/**
 * Filter operations within undo window
 */
export function getUndoableOperations(
  operations: MoveOperation[],
  windowMs: number = 5000
): MoveOperation[] {
  const now = Date.now();
  return operations.filter((op) => now - op.timestamp < windowMs);
}

// ============================================
// Drag & Drop Utilities
// ============================================

/**
 * Get item from columns by ID
 */
export function findItemById<T>(
  columns: KanbanColumnState<T>[],
  itemId: string
): { item: KanbanItem<T>; column: KanbanColumnState<T> } | null {
  for (const column of columns) {
    const item = column.items.find((i) => i.id === itemId);
    if (item) {
      return { item, column };
    }
  }
  return null;
}

/**
 * Get column by stage ID
 */
export function findColumnByStageId<T>(
  columns: KanbanColumnState<T>[],
  stageId: string
): KanbanColumnState<T> | undefined {
  return columns.find((c) => c.stage.id === stageId);
}

/**
 * Move item between columns (immutable)
 */
export function moveItemBetweenColumns<T>(
  columns: KanbanColumnState<T>[],
  itemId: string,
  targetStageId: string
): KanbanColumnState<T>[] {
  // Find source
  const source = findItemById(columns, itemId);
  if (!source) return columns;

  // Same column, no change
  if (source.column.stage.id === targetStageId) return columns;

  // Create new columns array
  return columns.map((column) => {
    if (column.stage.id === source.column.stage.id) {
      // Remove from source
      const newItems = column.items.filter((i) => i.id !== itemId);
      return {
        ...column,
        items: newItems,
        count: newItems.length,
        wip: calculateWIPStatus(newItems.length, column.stage.wipLimit),
      };
    }

    if (column.stage.id === targetStageId) {
      // Add to target
      const movedItem = { ...source.item, stageId: targetStageId };
      const newItems = [...column.items, movedItem];
      return {
        ...column,
        items: newItems,
        count: newItems.length,
        wip: calculateWIPStatus(newItems.length, column.stage.wipLimit),
      };
    }

    return column;
  });
}

// ============================================
// Keyboard Navigation Utilities
// ============================================

/**
 * Get next focusable column index
 */
export function getNextColumnIndex(
  currentIndex: number,
  totalColumns: number,
  direction: 'left' | 'right'
): number {
  if (direction === 'right') {
    return currentIndex < totalColumns - 1 ? currentIndex + 1 : 0;
  }
  return currentIndex > 0 ? currentIndex - 1 : totalColumns - 1;
}

/**
 * Get next focusable item index
 */
export function getNextItemIndex(
  currentIndex: number,
  totalItems: number,
  direction: 'up' | 'down'
): number {
  if (totalItems === 0) return -1;

  if (direction === 'down') {
    return currentIndex < totalItems - 1 ? currentIndex + 1 : 0;
  }
  return currentIndex > 0 ? currentIndex - 1 : totalItems - 1;
}

// ============================================
// Formatting Utilities
// ============================================

/**
 * Format currency
 */
export function formatCurrency(
  amount: number,
  currency: string = 'MXN',
  locale: string = 'es-MX'
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format relative time
 */
export function formatRelativeTime(
  date: string | Date,
  locale: string = 'es-MX'
): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });

  if (diffDays > 0) return rtf.format(-diffDays, 'day');
  if (diffHours > 0) return rtf.format(-diffHours, 'hour');
  if (diffMins > 0) return rtf.format(-diffMins, 'minute');
  return rtf.format(-diffSecs, 'second');
}

/**
 * Format compact number
 */
export function formatCompactNumber(
  num: number,
  locale: string = 'es-MX'
): string {
  return new Intl.NumberFormat(locale, {
    notation: 'compact',
    compactDisplay: 'short',
  }).format(num);
}

/**
 * Get transition key for stage-to-stage transitions
 */
export function getTransitionKey(fromStage: string, toStage: string): string {
  return `${fromStage}_to_${toStage}`;
}

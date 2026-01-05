'use client';

/**
 * useKanbanKeyboard Hook
 *
 * Provides comprehensive keyboard navigation for Kanban boards.
 * Implements WCAG 2.2 accessibility requirements for drag operations.
 *
 * @version 1.0.0
 * @module hooks/useKanbanKeyboard
 */

import * as React from 'react';
import type { FocusState, KeyboardShortcut, KanbanColumnState } from '../types';
import { KANBAN_SHORTCUTS } from '../constants';

// ============================================
// Types
// ============================================

export interface UseKanbanKeyboardOptions<T = unknown> {
  /** Columns for navigation */
  columns: KanbanColumnState<T>[];
  /** Enable keyboard navigation */
  enabled?: boolean;
  /** Callback when item is grabbed */
  onGrab?: (itemId: string) => void;
  /** Callback when item is dropped */
  onDrop?: (itemId: string, targetStageId: string) => void;
  /** Callback when grab is cancelled */
  onCancel?: () => void;
  /** Callback to open item details */
  onOpenItem?: (itemId: string) => void;
  /** Callback to edit item */
  onEditItem?: (itemId: string) => void;
  /** Callback to delete item */
  onDeleteItem?: (itemId: string) => void;
  /** Callback to open move dialog */
  onOpenMoveDialog?: (itemId: string) => void;
  /** Callback for undo */
  onUndo?: () => void;
  /** Callback for new item */
  onNewItem?: () => void;
  /** Callback to show shortcuts help */
  onShowShortcuts?: () => void;
}

export interface UseKanbanKeyboardReturn {
  /** Current focus state */
  focusState: FocusState;
  /** Whether an item is currently grabbed */
  isGrabbed: boolean;
  /** ID of currently focused item */
  focusedItemId: string | null;
  /** ID of currently focused column */
  focusedColumnId: string | null;
  /** Set focus to specific column and item */
  setFocus: (columnIndex: number, itemIndex: number) => void;
  /** Clear focus */
  clearFocus: () => void;
  /** Handle keyboard event */
  handleKeyDown: (event: React.KeyboardEvent) => void;
  /** Register keyboard listener on container */
  keyboardProps: {
    onKeyDown: (event: React.KeyboardEvent) => void;
    tabIndex: number;
    role: string;
    'aria-label': string;
  };
  /** Available shortcuts */
  shortcuts: KeyboardShortcut[];
  /** Get shortcut description */
  getShortcutDescription: (action: string) => string | undefined;
}

// ============================================
// Hook Implementation
// ============================================

export function useKanbanKeyboard<T = unknown>(
  options: UseKanbanKeyboardOptions<T>
): UseKanbanKeyboardReturn {
  const {
    columns,
    enabled = true,
    onGrab,
    onDrop,
    onCancel,
    onOpenItem,
    onEditItem,
    onDeleteItem,
    onOpenMoveDialog,
    onUndo,
    onNewItem,
    onShowShortcuts,
  } = options;

  // Focus state
  const [focusState, setFocusState] = React.useState<FocusState>({
    columnIndex: 0,
    itemIndex: 0,
    isGrabbed: false,
  });

  // Grabbed item info
  const [grabbedItemId, setGrabbedItemId] = React.useState<string | null>(null);
  const grabbedSourceColumn = React.useRef<number>(-1);

  // Get current focused item ID
  const focusedItemId = React.useMemo(() => {
    const column = columns[focusState.columnIndex];
    if (!column || column.items.length === 0) return null;
    const item = column.items[focusState.itemIndex];
    return item?.id ?? null;
  }, [columns, focusState.columnIndex, focusState.itemIndex]);

  // Get current focused column ID
  const focusedColumnId = React.useMemo(() => {
    return columns[focusState.columnIndex]?.stage.id ?? null;
  }, [columns, focusState.columnIndex]);

  // Set focus
  const setFocus = React.useCallback(
    (columnIndex: number, itemIndex: number) => {
      const safeColumnIndex = Math.max(
        0,
        Math.min(columnIndex, columns.length - 1)
      );
      const column = columns[safeColumnIndex];
      const safeItemIndex = column
        ? Math.max(0, Math.min(itemIndex, column.items.length - 1))
        : 0;

      setFocusState((prev) => ({
        ...prev,
        columnIndex: safeColumnIndex,
        itemIndex: safeItemIndex,
      }));
    },
    [columns]
  );

  // Clear focus
  const clearFocus = React.useCallback(() => {
    setFocusState({
      columnIndex: 0,
      itemIndex: 0,
      isGrabbed: false,
    });
    setGrabbedItemId(null);
    grabbedSourceColumn.current = -1;
  }, []);

  // Navigate to next/prev column
  const navigateColumn = React.useCallback(
    (direction: 'left' | 'right') => {
      setFocusState((prev) => {
        let newColumnIndex = prev.columnIndex;

        if (direction === 'right') {
          newColumnIndex =
            prev.columnIndex < columns.length - 1 ? prev.columnIndex + 1 : 0;
        } else {
          newColumnIndex =
            prev.columnIndex > 0 ? prev.columnIndex - 1 : columns.length - 1;
        }

        // Adjust item index if new column has fewer items
        const newColumn = columns[newColumnIndex];
        const newItemIndex = newColumn
          ? Math.min(prev.itemIndex, Math.max(0, newColumn.items.length - 1))
          : 0;

        return {
          ...prev,
          columnIndex: newColumnIndex,
          itemIndex: newItemIndex,
        };
      });
    },
    [columns]
  );

  // Navigate to next/prev item
  const navigateItem = React.useCallback(
    (direction: 'up' | 'down') => {
      setFocusState((prev) => {
        const column = columns[prev.columnIndex];
        if (!column || column.items.length === 0) return prev;

        let newItemIndex = prev.itemIndex;

        if (direction === 'down') {
          newItemIndex =
            prev.itemIndex < column.items.length - 1 ? prev.itemIndex + 1 : 0;
        } else {
          newItemIndex =
            prev.itemIndex > 0 ? prev.itemIndex - 1 : column.items.length - 1;
        }

        return {
          ...prev,
          itemIndex: newItemIndex,
        };
      });
    },
    [columns]
  );

  // Toggle grab state
  const toggleGrab = React.useCallback(() => {
    if (!focusedItemId) return;

    if (focusState.isGrabbed) {
      // Drop at current position
      const targetColumn = columns[focusState.columnIndex];
      if (targetColumn && grabbedItemId) {
        onDrop?.(grabbedItemId, targetColumn.stage.id);
      }
      setGrabbedItemId(null);
      grabbedSourceColumn.current = -1;
      setFocusState((prev) => ({ ...prev, isGrabbed: false }));
    } else {
      // Grab current item
      setGrabbedItemId(focusedItemId);
      grabbedSourceColumn.current = focusState.columnIndex;
      setFocusState((prev) => ({ ...prev, isGrabbed: true }));
      onGrab?.(focusedItemId);
    }
  }, [focusedItemId, focusState, columns, grabbedItemId, onGrab, onDrop]);

  // Cancel grab
  const cancelGrab = React.useCallback(() => {
    if (focusState.isGrabbed) {
      // Return to source column
      if (grabbedSourceColumn.current >= 0) {
        setFocusState((prev) => ({
          ...prev,
          columnIndex: grabbedSourceColumn.current,
          isGrabbed: false,
        }));
      }
      setGrabbedItemId(null);
      grabbedSourceColumn.current = -1;
      onCancel?.();
    }
  }, [focusState.isGrabbed, onCancel]);

  // Handle keyboard events
  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent) => {
      if (!enabled) return;

      const { key, ctrlKey, metaKey, shiftKey, altKey } = event;

      // Build modifier string for matching
      const modifiers: string[] = [];
      if (ctrlKey) modifiers.push('ctrl');
      if (metaKey) modifiers.push('meta');
      if (shiftKey) modifiers.push('shift');
      if (altKey) modifiers.push('alt');

      // Find matching shortcut
      const matchShortcut = (shortcut: KeyboardShortcut): boolean => {
        if (shortcut.key.toLowerCase() !== key.toLowerCase()) return false;
        const required = shortcut.modifiers || [];
        return (
          required.length === modifiers.length &&
          required.every((m) => modifiers.includes(m))
        );
      };

      // Navigation
      switch (key) {
        case 'ArrowLeft':
          if (focusState.isGrabbed) {
            // Move grabbed item to previous column
            navigateColumn('left');
          } else {
            navigateColumn('left');
          }
          event.preventDefault();
          return;

        case 'ArrowRight':
          if (focusState.isGrabbed) {
            // Move grabbed item to next column
            navigateColumn('right');
          } else {
            navigateColumn('right');
          }
          event.preventDefault();
          return;

        case 'ArrowUp':
          navigateItem('up');
          event.preventDefault();
          return;

        case 'ArrowDown':
          navigateItem('down');
          event.preventDefault();
          return;

        case 'Home':
          setFocusState((prev) => ({ ...prev, itemIndex: 0 }));
          event.preventDefault();
          return;

        case 'End':
          const column = columns[focusState.columnIndex];
          if (column) {
            setFocusState((prev) => ({
              ...prev,
              itemIndex: Math.max(0, column.items.length - 1),
            }));
          }
          event.preventDefault();
          return;

        case ' ':
          toggleGrab();
          event.preventDefault();
          return;

        case 'Escape':
          cancelGrab();
          event.preventDefault();
          return;

        case 'Enter':
          if (focusedItemId && !focusState.isGrabbed) {
            onOpenItem?.(focusedItemId);
            event.preventDefault();
          }
          return;
      }

      // Shortcuts with modifiers
      if (ctrlKey || metaKey) {
        if (key.toLowerCase() === 'z') {
          onUndo?.();
          event.preventDefault();
          return;
        }
      }

      // Single key shortcuts
      switch (key.toLowerCase()) {
        case 'm':
          if (focusedItemId && !focusState.isGrabbed) {
            onOpenMoveDialog?.(focusedItemId);
            event.preventDefault();
          }
          return;

        case 'e':
          if (focusedItemId && !focusState.isGrabbed) {
            onEditItem?.(focusedItemId);
            event.preventDefault();
          }
          return;

        case 'n':
          onNewItem?.();
          event.preventDefault();
          return;

        case '?':
          onShowShortcuts?.();
          event.preventDefault();
          return;
      }

      // Delete key
      if (key === 'Delete' || key === 'Backspace') {
        if (focusedItemId && !focusState.isGrabbed) {
          onDeleteItem?.(focusedItemId);
          event.preventDefault();
        }
      }
    },
    [
      enabled,
      focusState,
      focusedItemId,
      columns,
      navigateColumn,
      navigateItem,
      toggleGrab,
      cancelGrab,
      onOpenItem,
      onEditItem,
      onDeleteItem,
      onOpenMoveDialog,
      onUndo,
      onNewItem,
      onShowShortcuts,
    ]
  );

  // Get shortcut description
  const getShortcutDescription = React.useCallback((action: string): string | undefined => {
    const shortcut = KANBAN_SHORTCUTS.find((s) => s.action === action);
    if (!shortcut) return undefined;

    const parts: string[] = [];
    if (shortcut.modifiers) {
      parts.push(...shortcut.modifiers.map((m) => m.charAt(0).toUpperCase() + m.slice(1)));
    }
    parts.push(shortcut.key);

    return parts.join(' + ');
  }, []);

  // Keyboard props for container
  const keyboardProps = React.useMemo(
    () => ({
      onKeyDown: handleKeyDown,
      tabIndex: 0,
      role: 'application',
      'aria-label':
        'Tablero Kanban. Usa las flechas para navegar, Espacio para mover, Escape para cancelar.',
    }),
    [handleKeyDown]
  );

  return {
    focusState,
    isGrabbed: focusState.isGrabbed,
    focusedItemId,
    focusedColumnId,
    setFocus,
    clearFocus,
    handleKeyDown,
    keyboardProps,
    shortcuts: KANBAN_SHORTCUTS,
    getShortcutDescription,
  };
}

export default useKanbanKeyboard;

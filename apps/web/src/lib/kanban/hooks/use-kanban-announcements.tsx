'use client';

/**
 * useKanbanAnnouncements Hook
 *
 * Manages screen reader announcements for Kanban operations.
 * Implements ARIA live regions for accessibility.
 *
 * @version 1.0.0
 * @module hooks/useKanbanAnnouncements
 */

import * as React from 'react';
import type { Announcement, PipelineStageConfig } from '../types';
import { ANNOUNCEMENTS } from '../constants';

// ============================================
// Types
// ============================================

export interface UseKanbanAnnouncementsOptions {
  /** Enable announcements */
  enabled?: boolean;
  /** Clear announcements after delay (ms) */
  clearDelay?: number;
  /** Maximum announcements to keep in history */
  maxHistory?: number;
}

export interface UseKanbanAnnouncementsReturn {
  /** Current announcement to render in live region */
  currentAnnouncement: Announcement | null;
  /** Announcement history */
  announcements: Announcement[];
  /** Announce a message */
  announce: (message: string, priority?: 'polite' | 'assertive') => void;
  /** Announce item grabbed */
  announceGrab: (itemTitle: string) => void;
  /** Announce item dropped */
  announceDrop: (itemTitle: string, columnLabel: string) => void;
  /** Announce drag cancelled */
  announceCancel: () => void;
  /** Announce invalid drop */
  announceInvalid: (reason: string) => void;
  /** Announce undo */
  announceUndo: () => void;
  /** Announce WIP warning */
  announceWIPWarning: (columnLabel: string, current: number, limit: number) => void;
  /** Announce custom stage change */
  announceStageChange: (
    itemTitle: string,
    fromStage: PipelineStageConfig,
    toStage: PipelineStageConfig
  ) => void;
  /** Clear current announcement */
  clear: () => void;
  /** Props for the live region container */
  liveRegionProps: {
    role: 'status';
    'aria-live': 'polite' | 'assertive';
    'aria-atomic': 'true';
    className: string;
  };
}

// ============================================
// Hook Implementation
// ============================================

export function useKanbanAnnouncements(
  options: UseKanbanAnnouncementsOptions = {}
): UseKanbanAnnouncementsReturn {
  const { enabled = true, clearDelay = 3000, maxHistory = 50 } = options;

  // Current announcement
  const [currentAnnouncement, setCurrentAnnouncement] =
    React.useState<Announcement | null>(null);

  // Announcement history
  const [announcements, setAnnouncements] = React.useState<Announcement[]>([]);

  // Clear timeout ref
  const clearTimeoutRef = React.useRef<NodeJS.Timeout>();

  // Clear current announcement
  const clear = React.useCallback(() => {
    setCurrentAnnouncement(null);
  }, []);

  // Base announce function
  const announce = React.useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (!enabled) return;

      // Clear previous timeout
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }

      const announcement: Announcement = {
        id: crypto.randomUUID(),
        message,
        priority,
        timestamp: Date.now(),
      };

      // Set current
      setCurrentAnnouncement(announcement);

      // Add to history
      setAnnouncements((prev) => [...prev.slice(-(maxHistory - 1)), announcement]);

      // Auto-clear
      clearTimeoutRef.current = setTimeout(clear, clearDelay);
    },
    [enabled, clearDelay, maxHistory, clear]
  );

  // Announce item grabbed
  const announceGrab = React.useCallback(
    (itemTitle: string) => {
      announce(ANNOUNCEMENTS.grabbed(itemTitle), 'assertive');
    },
    [announce]
  );

  // Announce item dropped
  const announceDrop = React.useCallback(
    (itemTitle: string, columnLabel: string) => {
      announce(ANNOUNCEMENTS.dropped(itemTitle, columnLabel), 'polite');
    },
    [announce]
  );

  // Announce drag cancelled
  const announceCancel = React.useCallback(() => {
    announce(ANNOUNCEMENTS.cancelled, 'polite');
  }, [announce]);

  // Announce invalid drop
  const announceInvalid = React.useCallback(
    (reason: string) => {
      announce(ANNOUNCEMENTS.invalid(reason), 'assertive');
    },
    [announce]
  );

  // Announce undo
  const announceUndo = React.useCallback(() => {
    announce(ANNOUNCEMENTS.undone, 'polite');
  }, [announce]);

  // Announce WIP warning
  const announceWIPWarning = React.useCallback(
    (columnLabel: string, current: number, limit: number) => {
      announce(
        `Advertencia: ${columnLabel} tiene ${current} de ${limit} elementos. Cerca del límite.`,
        'polite'
      );
    },
    [announce]
  );

  // Announce stage change
  const announceStageChange = React.useCallback(
    (
      itemTitle: string,
      fromStage: PipelineStageConfig,
      toStage: PipelineStageConfig
    ) => {
      const fromLabel = fromStage.labelEs || fromStage.label;
      const toLabel = toStage.labelEs || toStage.label;
      announce(
        `${itemTitle} movido de ${fromLabel} a ${toLabel}.`,
        'polite'
      );
    },
    [announce]
  );

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      if (clearTimeoutRef.current) {
        clearTimeout(clearTimeoutRef.current);
      }
    };
  }, []);

  // Live region props
  const liveRegionProps = React.useMemo(
    () => ({
      role: 'status' as const,
      'aria-live': (currentAnnouncement?.priority || 'polite') as
        | 'polite'
        | 'assertive',
      'aria-atomic': 'true' as const,
      className: 'sr-only',
    }),
    [currentAnnouncement?.priority]
  );

  return {
    currentAnnouncement,
    announcements,
    announce,
    announceGrab,
    announceDrop,
    announceCancel,
    announceInvalid,
    announceUndo,
    announceWIPWarning,
    announceStageChange,
    clear,
    liveRegionProps,
  };
}

// ============================================
// Live Region Component
// ============================================

export interface LiveRegionProps {
  announcement: Announcement | null;
}

/**
 * Screen-reader only live region component
 */
export function KanbanLiveRegion({ announcement }: LiveRegionProps) {
  return (
    <div
      role="status"
      aria-live={announcement?.priority || 'polite'}
      aria-atomic="true"
      className="sr-only"
    >
      {announcement?.message}
    </div>
  );
}

export default useKanbanAnnouncements;

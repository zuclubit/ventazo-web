'use client';

/**
 * useWIPLimits Hook
 *
 * Manages Work In Progress (WIP) limits for Kanban columns.
 * Provides real-time status, warnings, and blocking capabilities.
 *
 * @version 1.0.0
 * @module hooks/useWIPLimits
 */

import * as React from 'react';
import type {
  WIPStatus,
  WIPLimitConfig,
  KanbanColumnState,
} from '../types';
import { calculateWIPStatus } from '../utils';

// ============================================
// Types
// ============================================

export interface UseWIPLimitsOptions {
  /** Default WIP limits by stage ID */
  defaultLimits?: Record<string, WIPLimitConfig>;
  /** Callback when soft limit is reached */
  onSoftLimitReached?: (stageId: string, status: WIPStatus) => void;
  /** Callback when hard limit is reached (blocked) */
  onHardLimitReached?: (stageId: string, status: WIPStatus) => void;
  /** Track WIP events for analytics */
  trackEvents?: boolean;
}

export interface UseWIPLimitsReturn {
  /** Get WIP status for a column */
  getWIPStatus: (stageId: string, currentCount: number) => WIPStatus;
  /** Check if adding to column is allowed */
  canAddToColumn: (stageId: string, currentCount: number) => boolean;
  /** Check if column is at warning level */
  isAtWarning: (stageId: string, currentCount: number) => boolean;
  /** Check if column is blocked */
  isBlocked: (stageId: string, currentCount: number) => boolean;
  /** Get WIP limit for a stage */
  getLimit: (stageId: string) => WIPLimitConfig | undefined;
  /** Set custom WIP limit for a stage */
  setLimit: (stageId: string, limit: WIPLimitConfig) => void;
  /** Remove custom WIP limit (revert to default) */
  removeLimit: (stageId: string) => void;
  /** Current custom limits */
  customLimits: Record<string, WIPLimitConfig>;
  /** Record a WIP override (for analytics) */
  recordOverride: (stageId: string, justification: string) => void;
  /** Override history */
  overrides: WIPOverride[];
}

export interface WIPOverride {
  id: string;
  stageId: string;
  justification: string;
  timestamp: number;
  userId?: string;
}

// ============================================
// Hook Implementation
// ============================================

export function useWIPLimits(
  options: UseWIPLimitsOptions = {}
): UseWIPLimitsReturn {
  const {
    defaultLimits = {},
    onSoftLimitReached,
    onHardLimitReached,
    trackEvents = true,
  } = options;

  // Custom limits (override defaults)
  const [customLimits, setCustomLimits] = React.useState<
    Record<string, WIPLimitConfig>
  >({});

  // Override history
  const [overrides, setOverrides] = React.useState<WIPOverride[]>([]);

  // Track which stages have triggered warnings (to avoid repeated callbacks)
  const triggeredWarnings = React.useRef<Set<string>>(new Set());
  const triggeredBlocks = React.useRef<Set<string>>(new Set());

  // Get effective limit for a stage
  const getLimit = React.useCallback(
    (stageId: string): WIPLimitConfig | undefined => {
      return customLimits[stageId] || defaultLimits[stageId];
    },
    [customLimits, defaultLimits]
  );

  // Get WIP status
  const getWIPStatus = React.useCallback(
    (stageId: string, currentCount: number): WIPStatus => {
      const limit = getLimit(stageId);
      const status = calculateWIPStatus(currentCount, limit);

      // Trigger callbacks if needed (only once per threshold crossing)
      if (status.level === 'warning' || status.level === 'critical') {
        const key = `${stageId}-warning`;
        if (!triggeredWarnings.current.has(key)) {
          triggeredWarnings.current.add(key);
          onSoftLimitReached?.(stageId, status);
        }
      } else {
        // Reset warning trigger if below threshold
        triggeredWarnings.current.delete(`${stageId}-warning`);
      }

      if (status.level === 'blocked') {
        const key = `${stageId}-blocked`;
        if (!triggeredBlocks.current.has(key)) {
          triggeredBlocks.current.add(key);
          onHardLimitReached?.(stageId, status);
        }
      } else {
        // Reset block trigger if below threshold
        triggeredBlocks.current.delete(`${stageId}-blocked`);
      }

      return status;
    },
    [getLimit, onSoftLimitReached, onHardLimitReached]
  );

  // Check if adding is allowed
  const canAddToColumn = React.useCallback(
    (stageId: string, currentCount: number): boolean => {
      const status = getWIPStatus(stageId, currentCount);
      return status.canAdd;
    },
    [getWIPStatus]
  );

  // Check if at warning level
  const isAtWarning = React.useCallback(
    (stageId: string, currentCount: number): boolean => {
      const status = getWIPStatus(stageId, currentCount);
      return status.level === 'warning' || status.level === 'critical';
    },
    [getWIPStatus]
  );

  // Check if blocked
  const isBlocked = React.useCallback(
    (stageId: string, currentCount: number): boolean => {
      const status = getWIPStatus(stageId, currentCount);
      return status.level === 'blocked';
    },
    [getWIPStatus]
  );

  // Set custom limit
  const setLimit = React.useCallback(
    (stageId: string, limit: WIPLimitConfig) => {
      setCustomLimits((prev) => ({
        ...prev,
        [stageId]: limit,
      }));
    },
    []
  );

  // Remove custom limit
  const removeLimit = React.useCallback((stageId: string) => {
    setCustomLimits((prev) => {
      const next = { ...prev };
      delete next[stageId];
      return next;
    });
  }, []);

  // Record override
  const recordOverride = React.useCallback(
    (stageId: string, justification: string) => {
      if (!trackEvents) return;

      const override: WIPOverride = {
        id: crypto.randomUUID(),
        stageId,
        justification,
        timestamp: Date.now(),
      };

      setOverrides((prev) => [...prev.slice(-49), override]); // Keep last 50

      // Could send to analytics here
      console.debug('[WIP Override]', override);
    },
    [trackEvents]
  );

  return {
    getWIPStatus,
    canAddToColumn,
    isAtWarning,
    isBlocked,
    getLimit,
    setLimit,
    removeLimit,
    customLimits,
    recordOverride,
    overrides,
  };
}

// ============================================
// WIP Status Component Helper
// ============================================

/**
 * Get CSS classes for WIP status indicator
 */
export function getWIPStatusClasses(status: WIPStatus): {
  container: string;
  badge: string;
  text: string;
  icon: string;
} {
  switch (status.level) {
    case 'blocked':
      return {
        container: 'border-red-500/50 bg-red-500/10',
        badge: 'bg-red-500 text-white',
        text: 'text-red-600 dark:text-red-400',
        icon: 'text-red-500',
      };
    case 'critical':
      return {
        container: 'border-orange-500/50 bg-orange-500/10',
        badge: 'bg-orange-500 text-white',
        text: 'text-orange-600 dark:text-orange-400',
        icon: 'text-orange-500',
      };
    case 'warning':
      return {
        container: 'border-amber-500/50 bg-amber-500/10',
        badge: 'bg-amber-500 text-white',
        text: 'text-amber-600 dark:text-amber-400',
        icon: 'text-amber-500',
      };
    default:
      return {
        container: '',
        badge: 'bg-muted text-muted-foreground',
        text: 'text-muted-foreground',
        icon: 'text-muted-foreground',
      };
  }
}

export default useWIPLimits;

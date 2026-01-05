'use client';

/**
 * CalendarSyncIndicator Component
 *
 * Visual indicator for real-time sync status.
 * Shows connection status, pending changes, and last sync time.
 * Provides smooth, non-intrusive feedback for sync operations.
 *
 * @module app/calendar/components/CalendarSyncIndicator
 */

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Cloud,
  CloudOff,
  RefreshCw,
  Check,
  AlertCircle,
  Wifi,
  WifiOff,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import type { CalendarSyncState } from '@/lib/calendar';

// ============================================
// Types
// ============================================

export interface CalendarSyncIndicatorProps {
  /** Current sync state */
  syncState: CalendarSyncState;
  /** Whether the component is in compact mode (icon only) */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Handler for manual sync trigger */
  onSyncNow?: () => void;
}

// ============================================
// Status Icon Component
// ============================================

function SyncStatusIcon({
  status,
  isConnected,
  className,
}: {
  status: CalendarSyncState['status'];
  isConnected: boolean;
  className?: string;
}) {
  // Connection status takes precedence when disconnected
  if (!isConnected) {
    return (
      <WifiOff
        className={cn('h-4 w-4 text-[var(--calendar-text-muted)]', className)}
      />
    );
  }

  switch (status) {
    case 'syncing':
      return (
        <RefreshCw
          className={cn(
            'h-4 w-4 text-[var(--tenant-primary)] animate-spin',
            className
          )}
        />
      );
    case 'synced':
      return (
        <Check
          className={cn('h-4 w-4 text-emerald-500', className)}
        />
      );
    case 'error':
      return (
        <AlertCircle
          className={cn('h-4 w-4 text-red-500', className)}
        />
      );
    case 'idle':
    default:
      return (
        <Cloud
          className={cn('h-4 w-4 text-[var(--calendar-text-muted)]', className)}
        />
      );
  }
}

// ============================================
// Status Text Component
// ============================================

function SyncStatusText({
  syncState,
  isConnected,
}: {
  syncState: CalendarSyncState;
  isConnected: boolean;
}) {
  if (!isConnected) {
    return (
      <span className="text-[var(--calendar-text-muted)]">
        Sin conexión
      </span>
    );
  }

  switch (syncState.status) {
    case 'syncing':
      return (
        <span className="text-[var(--tenant-primary)]">
          Sincronizando
          {syncState.pendingChanges > 0 && ` (${syncState.pendingChanges})`}
        </span>
      );
    case 'synced':
      return (
        <span className="text-emerald-600 dark:text-emerald-400">
          Sincronizado
        </span>
      );
    case 'error':
      return (
        <span className="text-red-600 dark:text-red-400">
          Error de sincronización
        </span>
      );
    case 'idle':
    default:
      if (syncState.lastSyncedAt) {
        const timeAgo = formatDistanceToNow(syncState.lastSyncedAt, {
          addSuffix: true,
          locale: es,
        });
        return (
          <span className="text-[var(--calendar-text-muted)]">
            Última sync {timeAgo}
          </span>
        );
      }
      return (
        <span className="text-[var(--calendar-text-muted)]">
          En espera
        </span>
      );
  }
}

// ============================================
// Tooltip Content Component
// ============================================

function SyncTooltipContent({
  syncState,
  isConnected,
}: {
  syncState: CalendarSyncState;
  isConnected: boolean;
}) {
  return (
    <div className="space-y-2 text-sm">
      {/* Connection Status */}
      <div className="flex items-center gap-2">
        {isConnected ? (
          <>
            <Wifi className="h-3.5 w-3.5 text-emerald-500" />
            <span>Conectado</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3.5 w-3.5 text-amber-500" />
            <span>Sin conexión - cambios locales</span>
          </>
        )}
      </div>

      {/* Sync Status */}
      <div className="flex items-center gap-2">
        <SyncStatusIcon
          status={syncState.status}
          isConnected={isConnected}
          className="h-3.5 w-3.5"
        />
        <SyncStatusText syncState={syncState} isConnected={isConnected} />
      </div>

      {/* Pending Changes */}
      {syncState.pendingChanges > 0 && (
        <div className="text-amber-600 dark:text-amber-400">
          {syncState.pendingChanges} cambio
          {syncState.pendingChanges > 1 ? 's' : ''} pendiente
          {syncState.pendingChanges > 1 ? 's' : ''}
        </div>
      )}

      {/* Error Message */}
      {syncState.error && (
        <div className="text-red-600 dark:text-red-400 text-xs">
          {syncState.error}
        </div>
      )}

      {/* Last Sync Time */}
      {syncState.lastSyncedAt && (
        <div className="text-xs text-muted-foreground pt-1 border-t border-border/50">
          Última sincronización:{' '}
          {formatDistanceToNow(syncState.lastSyncedAt, {
            addSuffix: true,
            locale: es,
          })}
        </div>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function CalendarSyncIndicator({
  syncState,
  compact = false,
  className,
  onSyncNow,
}: CalendarSyncIndicatorProps) {
  // For now, assume connected (WebSocket connection would provide this)
  const isConnected = true;

  // Determine if we should show activity indicator
  const showActivity = syncState.status === 'syncing';

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onSyncNow}
            disabled={syncState.status === 'syncing'}
            className={cn(
              'flex items-center gap-2 px-2.5 py-1.5 rounded-lg',
              'bg-[var(--calendar-surface-light)]',
              'border border-[var(--calendar-surface-border)]',
              'transition-all duration-200',
              'hover:bg-[var(--calendar-surface-hover)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--tenant-primary)]/20',
              'disabled:opacity-70 disabled:cursor-not-allowed',
              // Subtle pulse animation when syncing
              showActivity && 'animate-pulse',
              className
            )}
          >
            {/* Status Icon */}
            <div className="relative">
              <SyncStatusIcon
                status={syncState.status}
                isConnected={isConnected}
              />

              {/* Activity Ring */}
              {showActivity && (
                <span
                  className={cn(
                    'absolute -inset-1 rounded-full',
                    'border-2 border-[var(--tenant-primary)]/30',
                    'animate-ping'
                  )}
                />
              )}
            </div>

            {/* Status Text (non-compact mode) */}
            {!compact && (
              <span className="text-xs font-medium">
                <SyncStatusText syncState={syncState} isConnected={isConnected} />
              </span>
            )}

            {/* Pending Badge */}
            {syncState.pendingChanges > 0 && (
              <span
                className={cn(
                  'flex items-center justify-center',
                  'min-w-[18px] h-[18px] px-1',
                  'bg-amber-500 text-white',
                  'text-[10px] font-bold rounded-full'
                )}
              >
                {syncState.pendingChanges > 9 ? '9+' : syncState.pendingChanges}
              </span>
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom" align="end" className="max-w-xs">
          <SyncTooltipContent syncState={syncState} isConnected={isConnected} />
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// Minimal Sync Dot (for header use)
// ============================================

export function SyncStatusDot({
  status,
  className,
}: {
  status: CalendarSyncState['status'];
  className?: string;
}) {
  const colors = {
    idle: 'bg-gray-400',
    syncing: 'bg-blue-500 animate-pulse',
    synced: 'bg-emerald-500',
    error: 'bg-red-500',
  };

  return (
    <span
      className={cn(
        'inline-block w-2 h-2 rounded-full',
        colors[status],
        className
      )}
    />
  );
}

export default CalendarSyncIndicator;

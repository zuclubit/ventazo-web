'use client';

/**
 * SyncStatusBadge Component - Sprint 5
 *
 * Displays sync status for calendar events with visual indicators.
 * Shows sync errors and pending states to the user.
 *
 * @module app/calendar/components/SyncStatusBadge
 */

import * as React from 'react';
import {
  Cloud,
  CloudOff,
  Loader2,
  AlertTriangle,
  RefreshCcw,
  Check,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';

import type { EventSyncStatus } from '@/lib/calendar';

// ============================================
// Types
// ============================================

interface SyncStatusBadgeProps {
  status: EventSyncStatus;
  lastSyncedAt?: string;
  onRetry?: () => void;
  isRetrying?: boolean;
  className?: string;
}

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG: Record<
  EventSyncStatus,
  {
    icon: typeof Cloud;
    label: string;
    description: string;
    variant: 'default' | 'secondary' | 'destructive' | 'outline';
    colorVar: string;
    bgVar: string;
    animate?: boolean;
  }
> = {
  synced: {
    icon: Check,
    label: 'Sincronizado',
    description: 'El evento está sincronizado con el calendario externo.',
    variant: 'secondary',
    colorVar: 'var(--calendar-sync-synced, #22c55e)',
    bgVar: 'var(--calendar-sync-synced-bg, rgba(34, 197, 94, 0.1))',
  },
  pending_create: {
    icon: Loader2,
    label: 'Creando...',
    description: 'El evento se está creando en el calendario externo.',
    variant: 'outline',
    colorVar: 'var(--calendar-sync-pending, #3b82f6)',
    bgVar: 'var(--calendar-sync-pending-bg, rgba(59, 130, 246, 0.1))',
    animate: true,
  },
  pending_update: {
    icon: Loader2,
    label: 'Actualizando...',
    description: 'El evento se está actualizando en el calendario externo.',
    variant: 'outline',
    colorVar: 'var(--calendar-sync-pending, #3b82f6)',
    bgVar: 'var(--calendar-sync-pending-bg, rgba(59, 130, 246, 0.1))',
    animate: true,
  },
  pending_delete: {
    icon: Loader2,
    label: 'Eliminando...',
    description: 'El evento se está eliminando del calendario externo.',
    variant: 'outline',
    colorVar: 'var(--calendar-sync-conflict, #f97316)',
    bgVar: 'var(--calendar-sync-conflict-bg, rgba(249, 115, 22, 0.1))',
    animate: true,
  },
  sync_error: {
    icon: AlertTriangle,
    label: 'Error de sincronización',
    description: 'Hubo un error al sincronizar. Intenta de nuevo.',
    variant: 'destructive',
    colorVar: 'var(--calendar-sync-error, #ef4444)',
    bgVar: 'var(--calendar-sync-error-bg, rgba(239, 68, 68, 0.1))',
  },
  conflict: {
    icon: AlertTriangle,
    label: 'Conflicto',
    description: 'Hay un conflicto entre la versión local y la del servidor.',
    variant: 'destructive',
    colorVar: 'var(--calendar-sync-conflict, #f97316)',
    bgVar: 'var(--calendar-sync-conflict-bg, rgba(249, 115, 22, 0.1))',
  },
};

// ============================================
// SyncStatusBadge Component
// ============================================

export function SyncStatusBadge({
  status,
  lastSyncedAt,
  onRetry,
  isRetrying = false,
  className,
}: SyncStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = isRetrying ? Loader2 : config.icon;

  // Format last synced time
  const formattedLastSync = lastSyncedAt
    ? new Date(lastSyncedAt).toLocaleString('es-MX', {
        dateStyle: 'short',
        timeStyle: 'short',
      })
    : null;

  return (
    <TooltipProvider>
      <div className={cn('flex items-center gap-2', className)}>
        <Tooltip>
          <TooltipTrigger asChild>
            <Badge
              variant={config.variant}
              className={cn('flex items-center gap-1.5 py-1 px-2 cursor-default')}
              style={{
                color: config.colorVar,
                backgroundColor: config.bgVar,
              }}
            >
              <Icon
                className={cn('h-3.5 w-3.5', (config.animate || isRetrying) && 'animate-spin')}
              />
              <span className="text-xs">{config.label}</span>
            </Badge>
          </TooltipTrigger>
          <TooltipContent className="max-w-[250px]">
            <p className="text-sm font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground mt-1">{config.description}</p>
            {formattedLastSync && (
              <p className="text-xs text-muted-foreground mt-1">
                Última sincronización: {formattedLastSync}
              </p>
            )}
          </TooltipContent>
        </Tooltip>

        {/* Retry Button for errors */}
        {status === 'sync_error' && onRetry && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={onRetry}
                disabled={isRetrying}
              >
                <RefreshCcw className={cn('h-3.5 w-3.5', isRetrying && 'animate-spin')} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reintentar sincronización</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}

// ============================================
// Compact Version for List Views
// ============================================

interface SyncStatusIndicatorProps {
  status: EventSyncStatus;
  className?: string;
}

export function SyncStatusIndicator({ status, className }: SyncStatusIndicatorProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  if (status === 'synced') {
    // Don't show anything for synced status in compact view
    return null;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={cn(
              'flex items-center justify-center h-5 w-5 rounded-full',
              className
            )}
            style={{ backgroundColor: config.bgVar }}
          >
            <Icon
              className={cn('h-3 w-3', config.animate && 'animate-spin')}
              style={{ color: config.colorVar }}
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">{config.label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default SyncStatusBadge;

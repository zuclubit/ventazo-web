'use client';

/**
 * CampaignStatusBadge Component
 *
 * Visual status indicator for campaigns.
 * Uses dynamic CSS variables from useCampaignTheme.
 */

import * as React from 'react';
import {
  Archive,
  CheckCircle2,
  Clock,
  Loader2,
  Pause,
  Send,
  FileText,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { CampaignStatus } from '@/lib/campaigns';

// ============================================
// Types
// ============================================

export interface CampaignStatusBadgeProps {
  /** Campaign status */
  status: CampaignStatus;
  /** Show icon */
  showIcon?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Configuration
// ============================================

interface StatusConfig {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  colorVar: string;
  bgClass: string;
}

const STATUS_CONFIG: Record<CampaignStatus, StatusConfig> = {
  draft: {
    label: 'Borrador',
    icon: FileText,
    colorVar: '--campaign-status-draft',
    bgClass: 'bg-[var(--campaign-status-draft-bg)] text-[var(--campaign-status-draft)] border-[var(--campaign-status-draft-border)]',
  },
  scheduled: {
    label: 'Programada',
    icon: Clock,
    colorVar: '--campaign-status-scheduled',
    bgClass: 'bg-[var(--campaign-status-scheduled-bg)] text-[var(--campaign-status-scheduled)] border-[var(--campaign-status-scheduled-border)]',
  },
  active: {
    label: 'Activa',
    icon: Loader2,
    colorVar: '--campaign-status-active',
    bgClass: 'bg-[var(--campaign-status-active-bg)] text-[var(--campaign-status-active)] border-[var(--campaign-status-active-border)]',
  },
  paused: {
    label: 'Pausada',
    icon: Pause,
    colorVar: '--campaign-status-paused',
    bgClass: 'bg-[var(--campaign-status-paused-bg)] text-[var(--campaign-status-paused)] border-[var(--campaign-status-paused-border)]',
  },
  completed: {
    label: 'Completada',
    icon: CheckCircle2,
    colorVar: '--campaign-status-completed',
    bgClass: 'bg-[var(--campaign-status-completed-bg)] text-[var(--campaign-status-completed)] border-[var(--campaign-status-completed-border)]',
  },
  cancelled: {
    label: 'Cancelada',
    icon: XCircle,
    colorVar: '--campaign-status-cancelled',
    bgClass: 'bg-[var(--campaign-status-cancelled-bg)] text-[var(--campaign-status-cancelled)] border-[var(--campaign-status-cancelled-border)]',
  },
  archived: {
    label: 'Archivada',
    icon: Archive,
    colorVar: '--campaign-status-archived',
    bgClass: 'bg-[var(--campaign-status-archived-bg)] text-[var(--campaign-status-archived)] border-[var(--campaign-status-archived-border)]',
  },
};

// ============================================
// Component
// ============================================

export function CampaignStatusBadge({
  status,
  showIcon = true,
  size = 'md',
  className,
}: CampaignStatusBadgeProps) {
  const config = STATUS_CONFIG[status];
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-1.5 py-0.5 gap-1',
    md: 'text-sm px-2 py-0.5 gap-1.5',
    lg: 'text-sm px-3 py-1 gap-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-3.5 w-3.5',
    lg: 'h-4 w-4',
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center font-medium border',
        config.bgClass,
        sizeClasses[size],
        className
      )}
    >
      {showIcon && (
        <Icon
          className={cn(
            iconSizes[size],
            status === 'active' && 'animate-spin'
          )}
        />
      )}
      {config.label}
    </Badge>
  );
}

export default CampaignStatusBadge;

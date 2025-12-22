'use client';

/**
 * LeadUrgencyIndicator Component - Premium 2025 Design
 *
 * Visual indicator showing lead urgency based on:
 * - Overdue follow-ups (red alert)
 * - No activity in 48+ hours (yellow warning)
 * - New lead < 24 hours (blue "Nuevo" badge)
 *
 * Helps sales teams prioritize their outreach.
 */

import * as React from 'react';

import { formatDistanceToNow, differenceInHours, isAfter } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export type UrgencyLevel = 'overdue' | 'warning' | 'new' | 'none';

export interface LeadUrgencyIndicatorProps {
  /** When the next follow-up is scheduled */
  nextFollowUpAt?: string | null;
  /** When the last activity occurred */
  lastActivityAt?: string | null;
  /** When the lead was created */
  createdAt?: string | null;
  /** Whether to show a label or just icon */
  showLabel?: boolean;
  /** Size variant */
  size?: 'sm' | 'md';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Urgency Calculation
// ============================================

interface UrgencyResult {
  level: UrgencyLevel;
  message: string;
  icon: React.ElementType;
}

function calculateUrgency(
  nextFollowUpAt?: string | null,
  lastActivityAt?: string | null,
  createdAt?: string | null
): UrgencyResult {
  const now = new Date();

  // 1. Check for overdue follow-up
  if (nextFollowUpAt) {
    const followUpDate = new Date(nextFollowUpAt);
    if (isAfter(now, followUpDate)) {
      const overdueDuration = formatDistanceToNow(followUpDate, {
        addSuffix: false,
        locale: es,
      });
      return {
        level: 'overdue',
        message: `Follow-up vencido hace ${overdueDuration}`,
        icon: AlertCircle,
      };
    }
  }

  // 2. Check for new lead (created < 24 hours ago)
  if (createdAt) {
    const createdDate = new Date(createdAt);
    const hoursOld = differenceInHours(now, createdDate);
    if (hoursOld < 24) {
      return {
        level: 'new',
        message: 'Lead nuevo (menos de 24h)',
        icon: Sparkles,
      };
    }
  }

  // 3. Check for stale lead (no activity in 48+ hours)
  if (lastActivityAt) {
    const lastActivity = new Date(lastActivityAt);
    const hoursInactive = differenceInHours(now, lastActivity);
    if (hoursInactive >= 48) {
      return {
        level: 'warning',
        message: `Sin actividad hace ${formatDistanceToNow(lastActivity, {
          addSuffix: false,
          locale: es,
        })}`,
        icon: Clock,
      };
    }
  }

  return {
    level: 'none',
    message: '',
    icon: Clock,
  };
}

// ============================================
// Label Mapping
// ============================================

const urgencyLabels: Record<UrgencyLevel, string> = {
  overdue: 'Vencido',
  warning: 'Sin actividad',
  new: 'Nuevo',
  none: '',
};

// ============================================
// Main Component
// ============================================

export function LeadUrgencyIndicator({
  nextFollowUpAt,
  lastActivityAt,
  createdAt,
  showLabel = true,
  size = 'sm',
  className,
}: LeadUrgencyIndicatorProps) {
  const { level, message, icon: Icon } = calculateUrgency(
    nextFollowUpAt,
    lastActivityAt,
    createdAt
  );

  // Don't render if no urgency
  if (level === 'none') {
    return null;
  }

  const iconSize = size === 'sm' ? 'h-3 w-3' : 'h-3.5 w-3.5';
  const label = urgencyLabels[level];

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            'urgency-indicator',
            level,
            className
          )}
        >
          <Icon className={iconSize} />
          {showLabel && <span>{label}</span>}
        </span>
      </TooltipTrigger>
      <TooltipContent side="top" className="text-xs max-w-[200px]">
        {message}
      </TooltipContent>
    </Tooltip>
  );
}

// ============================================
// Inline Urgency Banner (for card footers)
// ============================================

export interface UrgencyBannerProps {
  nextFollowUpAt?: string | null;
  lastActivityAt?: string | null;
  createdAt?: string | null;
  className?: string;
}

export function UrgencyBanner({
  nextFollowUpAt,
  lastActivityAt,
  createdAt,
  className,
}: UrgencyBannerProps) {
  const { level, message, icon: Icon } = calculateUrgency(
    nextFollowUpAt,
    lastActivityAt,
    createdAt
  );

  // Only show for overdue
  if (level !== 'overdue') {
    return null;
  }

  return (
    <div
      className={cn(
        'flex items-center gap-1.5',
        'px-2 py-1 rounded-md',
        'text-[10px] font-medium',
        'bg-red-50 text-red-600 border border-red-100',
        'dark:bg-red-500/10 dark:text-red-400 dark:border-red-500/20',
        className
      )}
    >
      <Icon className="h-3 w-3" />
      <span className="truncate">{message}</span>
    </div>
  );
}

// ============================================
// Hook for urgency calculation
// ============================================

export function useLeadUrgency(
  nextFollowUpAt?: string | null,
  lastActivityAt?: string | null,
  createdAt?: string | null
): UrgencyResult {
  return React.useMemo(
    () => calculateUrgency(nextFollowUpAt, lastActivityAt, createdAt),
    [nextFollowUpAt, lastActivityAt, createdAt]
  );
}

export default LeadUrgencyIndicator;

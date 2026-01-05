'use client';

/**
 * EntityCard - Ventazo Design System 2025
 *
 * @description Specialized card for CRM entities (leads, opportunities, customers, tasks).
 * Built on BaseCard, provides standard layout for entity representation.
 *
 * @features
 * - Standard avatar + title/subtitle layout
 * - Score indicator integration
 * - Priority/status badges
 * - Amount display for opportunities
 * - Action slots
 * - View mode responsive layouts
 *
 * @version 1.0.0
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { BaseCard, CardRow, type BaseCardProps } from './base-card';
import { priorityClasses, statusClasses, type PriorityKey, type StatusKey } from '@/lib/theme/tokens';

// ============================================
// Helper Functions
// ============================================

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatCurrency(amount: number, currency = 'USD', locale = 'en-US'): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getScoreLevel(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

// ============================================
// Score Badge Component
// ============================================

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function ScoreBadge({ score, size = 'sm', className }: ScoreBadgeProps) {
  const level = getScoreLevel(score);

  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
    lg: 'h-11 w-11 text-base',
  };

  const levelClasses = {
    hot: 'bg-[var(--score-hot-gradient)] text-white shadow-[var(--score-hot-shadow)]',
    warm: 'bg-[var(--score-warm-gradient)] text-white shadow-[var(--score-warm-shadow)]',
    cold: 'bg-[var(--score-cold-gradient)] text-slate-700 dark:text-white shadow-[var(--score-cold-shadow)]',
  };

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg font-bold shrink-0',
        sizeClasses[size],
        levelClasses[level],
        className
      )}
      title={`Score: ${score}`}
      aria-label={`Score: ${score}`}
    >
      {score}
    </div>
  );
}

// ============================================
// Priority Badge Component
// ============================================

interface PriorityBadgeProps {
  priority: PriorityKey;
  className?: string;
}

const priorityLabels: Record<PriorityKey, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
  urgent: 'Urgente',
};

function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  return (
    <Badge
      className={cn(
        priorityClasses[priority],
        'text-xs px-2 py-0.5 border',
        className
      )}
    >
      {priorityLabels[priority]}
    </Badge>
  );
}

// ============================================
// Status Badge Component
// ============================================

interface StatusBadgeProps {
  status: StatusKey;
  label?: string;
  className?: string;
}

const statusLabels: Record<StatusKey, string> = {
  pending: 'Pendiente',
  in_progress: 'En Progreso',
  completed: 'Completada',
  cancelled: 'Cancelada',
  deferred: 'Aplazada',
};

function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge
      className={cn(
        statusClasses[status],
        'text-xs px-2 py-0.5 border',
        className
      )}
    >
      {label || statusLabels[status]}
    </Badge>
  );
}

// ============================================
// EntityCard Types
// ============================================

export interface EntityCardProps extends Omit<BaseCardProps, 'children'> {
  /** Unique identifier */
  id: string;
  /** Primary title */
  title: string;
  /** Secondary text (email, company, etc) */
  subtitle?: string;
  /** Avatar configuration */
  avatar?: {
    name: string;
    src?: string;
    fallbackColor?: string;
  };
  /** Numeric score (0-100) */
  score?: number;
  /** Monetary amount */
  amount?: number;
  /** Currency for amount */
  currency?: string;
  /** Locale for formatting */
  locale?: string;
  /** Priority level */
  priority?: PriorityKey;
  /** Status */
  status?: StatusKey;
  /** Status label override */
  statusLabel?: string;
  /** Tags to display */
  tags?: string[];
  /** Maximum tags to show */
  maxTags?: number;
  /** Click handler */
  onClick?: () => void;
  /** Custom header content (replaces default) */
  headerContent?: React.ReactNode;
  /** Custom footer content (replaces default) */
  footerContent?: React.ReactNode;
  /** Additional content below main section */
  children?: React.ReactNode;
  /** Actions slot (top-right) */
  actions?: React.ReactNode;
  /** Compact mode for list views */
  compact?: boolean;
  /** Show avatar */
  showAvatar?: boolean;
}

// ============================================
// EntityCard Component
// ============================================

const EntityCard = React.forwardRef<HTMLDivElement, EntityCardProps>(
  (
    {
      id,
      title,
      subtitle,
      avatar,
      score,
      amount,
      currency = 'USD',
      locale = 'en-US',
      priority,
      status,
      statusLabel,
      tags,
      maxTags = 2,
      onClick,
      headerContent,
      footerContent,
      children,
      actions,
      compact = false,
      showAvatar = true,
      variant = 'interactive',
      className,
      ...props
    },
    ref
  ) => {
    const displayTags = tags?.slice(0, maxTags);
    const extraTagsCount = tags ? Math.max(0, tags.length - maxTags) : 0;

    return (
      <BaseCard
        ref={ref}
        variant={variant}
        padding={compact ? 'sm' : 'md'}
        onClick={onClick}
        className={cn(
          'group',
          onClick && 'cursor-pointer',
          className
        )}
        data-entity-card={id}
        role="article"
        {...props}
      >
        {/* Actions overlay (top-right) - visible on hover AND keyboard focus */}
        {actions && (
          <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-[var(--transition-fast)] z-10">
            {actions}
          </div>
        )}

        {/* Custom header or default layout */}
        {headerContent || (
          <CardRow align="start" gap={compact ? 'sm' : 'md'}>
            {/* Avatar */}
            {showAvatar && avatar && (
              <Avatar className={cn(
                'shrink-0 ring-2 ring-background shadow-sm',
                compact ? 'h-8 w-8' : 'h-10 w-10'
              )}>
                <AvatarImage src={avatar.src} alt={avatar.name} />
                <AvatarFallback
                  className={cn(
                    'text-xs font-medium bg-muted',
                    avatar.fallbackColor
                  )}
                >
                  {getInitials(avatar.name)}
                </AvatarFallback>
              </Avatar>
            )}

            {/* Title & Subtitle */}
            <div className="flex-1 min-w-0">
              <p className={cn(
                'font-medium text-foreground line-clamp-1',
                compact ? 'text-sm' : 'text-sm'
              )}>
                {title}
              </p>
              {subtitle && (
                <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>

            {/* Score */}
            {score !== undefined && (
              <ScoreBadge score={score} size={compact ? 'sm' : 'md'} />
            )}
          </CardRow>
        )}

        {/* Amount (for opportunities) */}
        {amount !== undefined && (
          <p className={cn(
            'font-bold text-foreground',
            compact ? 'text-base mt-2' : 'text-lg mt-3'
          )}>
            {formatCurrency(amount, currency, locale)}
          </p>
        )}

        {/* Custom children content */}
        {children}

        {/* Custom footer or default (tags + badges) */}
        {footerContent || (
          (displayTags?.length || priority || status) && (
            <div className={cn(
              'flex items-center gap-2 flex-wrap',
              compact ? 'mt-2' : 'mt-3'
            )}>
              {/* Tags */}
              {displayTags?.map((tag) => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-xs px-2 py-0.5"
                >
                  {tag}
                </Badge>
              ))}
              {extraTagsCount > 0 && (
                <Badge variant="outline" className="text-xs px-2 py-0.5">
                  +{extraTagsCount}
                </Badge>
              )}

              {/* Spacer */}
              {(displayTags?.length || 0) > 0 && (priority || status) && (
                <div className="flex-1" />
              )}

              {/* Status */}
              {status && (
                <StatusBadge status={status} label={statusLabel} />
              )}

              {/* Priority */}
              {priority && !status && (
                <PriorityBadge priority={priority} />
              )}
            </div>
          )
        )}
      </BaseCard>
    );
  }
);

EntityCard.displayName = 'EntityCard';

// ============================================
// EntityCard Skeleton
// ============================================

interface EntityCardSkeletonProps {
  compact?: boolean;
  showAvatar?: boolean;
  showScore?: boolean;
  showAmount?: boolean;
  showTags?: boolean;
  className?: string;
}

function EntityCardSkeleton({
  compact = false,
  showAvatar = true,
  showScore = true,
  showAmount = false,
  showTags = true,
  className,
}: EntityCardSkeletonProps) {
  return (
    <BaseCard
      variant="default"
      padding={compact ? 'sm' : 'md'}
      className={cn('animate-pulse', className)}
    >
      <CardRow align="start" gap={compact ? 'sm' : 'md'}>
        {showAvatar && (
          <div className={cn(
            'rounded-full bg-muted shrink-0',
            compact ? 'h-8 w-8' : 'h-10 w-10'
          )} />
        )}
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-3 bg-muted rounded w-1/2" />
        </div>
        {showScore && (
          <div className={cn(
            'rounded-lg bg-muted shrink-0',
            compact ? 'h-7 w-7' : 'h-9 w-9'
          )} />
        )}
      </CardRow>

      {showAmount && (
        <div className={cn(
          'h-6 bg-muted rounded w-24',
          compact ? 'mt-2' : 'mt-3'
        )} />
      )}

      {showTags && (
        <div className={cn(
          'flex gap-2',
          compact ? 'mt-2' : 'mt-3'
        )}>
          <div className="h-5 bg-muted rounded-full w-16" />
          <div className="h-5 bg-muted rounded-full w-12" />
        </div>
      )}
    </BaseCard>
  );
}

// ============================================
// Exports
// ============================================

export {
  EntityCard,
  EntityCardSkeleton,
  ScoreBadge,
  PriorityBadge,
  StatusBadge,
  getInitials,
  formatCurrency,
  getScoreLevel,
};

export type {
  ScoreBadgeProps,
  PriorityBadgeProps,
  StatusBadgeProps,
  EntityCardSkeletonProps,
};

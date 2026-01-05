'use client';

/**
 * KanbanCard - Unified Base Component
 *
 * Premium styled kanban card with CSS design tokens.
 * Provides consistent styling across all modules (leads, opportunities, customers).
 *
 * This is a base/styled component. Module-specific logic (dnd-kit, actions, etc)
 * should be composed on top of this in each module.
 *
 * @version 1.0.0
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import type { BaseKanbanCardProps } from './types';

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

function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getScoreVariant(score: number): 'hot' | 'warm' | 'cold' {
  if (score >= 70) return 'hot';
  if (score >= 40) return 'warm';
  return 'cold';
}

// ============================================
// Score Badge Component
// ============================================

interface ScoreBadgeProps {
  score: number;
  size?: 'sm' | 'md';
  className?: string;
}

function ScoreBadge({ score, size = 'sm', className }: ScoreBadgeProps) {
  const variant = getScoreVariant(score);

  const sizeClasses = {
    sm: 'h-7 w-7 text-xs',
    md: 'h-9 w-9 text-sm',
  };

  // Labels for accessibility
  const variantLabels = {
    hot: 'Caliente',
    warm: 'Tibio',
    cold: 'Frío',
  };

  // SEMANTIC: hot=orange (high priority), warm=amber (medium), cold=gray (low)
  const variantClasses = {
    hot: 'bg-[var(--score-hot-bg)] text-[var(--score-hot)] border-[var(--score-hot-border)]',
    warm: 'bg-[var(--score-warm-bg)] text-[var(--score-warm)] border-[var(--score-warm-border)]',
    cold: 'bg-[var(--score-cold-bg)] text-[var(--score-cold)] border-[var(--score-cold-border)]',
  };

  return (
    <div
      role="img"
      aria-label={`Score: ${score} - ${variantLabels[variant]}`}
      className={cn(
        'flex items-center justify-center rounded-lg font-bold border',
        sizeClasses[size],
        variantClasses[variant],
        className
      )}
    >
      {score}
    </div>
  );
}

// ============================================
// Priority Badge Component
// ============================================

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high' | 'urgent';
  className?: string;
}

function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config: Record<typeof priority, { label: string; classes: string }> = {
    low: {
      label: 'Baja',
      classes: 'bg-[var(--priority-low-bg)] text-[var(--priority-low)] border border-[var(--priority-low-border)]',
    },
    medium: {
      label: 'Media',
      classes: 'bg-[var(--priority-medium-bg)] text-[var(--priority-medium)] border border-[var(--priority-medium-border)]',
    },
    high: {
      label: 'Alta',
      classes: 'bg-[var(--priority-high-bg)] text-[var(--priority-high)] border border-[var(--priority-high-border)]',
    },
    urgent: {
      label: 'Urgente',
      classes: 'bg-[var(--priority-urgent-bg)] text-[var(--priority-urgent)] border border-[var(--priority-urgent-border)]',
    },
  };

  const { label, classes } = config[priority];

  return (
    <Badge
      role="status"
      aria-label={`Prioridad: ${label}`}
      className={cn(
        classes,
        'text-xs px-2 py-0.5',
        className
      )}
    >
      {label}
    </Badge>
  );
}

// ============================================
// Main Card Component
// ============================================

export function KanbanCard({
  id,
  title,
  subtitle,
  avatar,
  score,
  tags,
  amount,
  currency = 'USD',
  priority,
  isDragging = false,
  isSelected = false,
  isLoading = false,
  onClick,
  className,
  children,
}: BaseKanbanCardProps) {
  return (
    <div
      className={cn(
        // Premium card class from globals.css
        'kanban-card-ventazo',
        // Base styles
        'group relative',
        'p-3.5 sm:p-4',
        'rounded-xl',
        'bg-card',
        'border border-border/50',
        'shadow-[var(--card-shadow-base)]',
        // Transitions
        'transition-all duration-[var(--transition-normal)]',
        // Interactive states
        onClick && 'cursor-pointer',
        'hover:shadow-[var(--card-shadow-hover)] hover:border-[color-mix(in_srgb,var(--tenant-primary)_30%,transparent)]',
        'hover:-translate-y-0.5',
        // Dragging state
        isDragging && [
          'opacity-90',
          'shadow-[var(--card-shadow-dragging)]',
          'border-[var(--tenant-primary)]',
          'rotate-2',
          'scale-105',
          'z-50',
        ],
        // Selected state
        isSelected && [
          'ring-2',
          'ring-[var(--tenant-primary)]',
          'ring-offset-2',
          'ring-offset-background',
        ],
        // Loading state
        isLoading && 'opacity-70 pointer-events-none',
        className
      )}
      onClick={onClick}
      data-kanban-card={id}
      role="listitem"
    >
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-xl">
          <div className="h-5 w-5 border-2 border-[var(--tenant-primary)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Header: Avatar + Title + Score */}
      <div className="flex items-start gap-3">
        {/* Avatar */}
        {avatar && (
          <Avatar className="h-9 w-9 shrink-0 ring-2 ring-background shadow-sm">
            <AvatarImage src={avatar.src} alt={avatar.name} />
            <AvatarFallback className="text-xs font-medium bg-muted">
              {getInitials(avatar.name)}
            </AvatarFallback>
          </Avatar>
        )}

        {/* Title & Subtitle */}
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm text-foreground line-clamp-1">
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
          <ScoreBadge score={score} size="sm" />
        )}
      </div>

      {/* Amount (for opportunities) */}
      {amount !== undefined && (
        <p className="text-lg font-bold text-foreground mt-3">
          {formatCurrency(amount, currency)}
        </p>
      )}

      {/* Custom children content */}
      {children}

      {/* Footer: Tags + Priority */}
      {(tags?.length || priority) && (
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          {/* Tags */}
          {tags?.slice(0, 2).map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              className="text-xs px-2 py-0.5"
            >
              {tag}
            </Badge>
          ))}
          {tags && tags.length > 2 && (
            <Badge
              variant="outline"
              className="text-xs px-2 py-0.5"
            >
              +{tags.length - 2}
            </Badge>
          )}

          {/* Priority */}
          {priority && (
            <PriorityBadge priority={priority} className="ml-auto" />
          )}
        </div>
      )}
    </div>
  );
}

// Re-export helpers for use in module-specific cards
export { ScoreBadge, PriorityBadge, getInitials, formatCurrency, getScoreVariant };

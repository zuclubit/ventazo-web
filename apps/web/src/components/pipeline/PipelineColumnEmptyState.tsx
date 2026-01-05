'use client';

/**
 * PipelineColumnEmptyState - Unified Empty Column Component
 *
 * Centralized empty state for all pipeline/kanban columns.
 * Replaces 3 different implementations with one consistent design.
 *
 * Features:
 * - Stage-aware messaging and icons
 * - Drop zone feedback
 * - Subtle floating animation
 * - Consistent visual hierarchy
 * - Dynamic theming support
 *
 * @module components/pipeline/PipelineColumnEmptyState
 */

import * as React from 'react';
import {
  Target,
  Sparkles,
  Phone,
  Clock,
  BadgeCheck,
  Search,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Trophy,
  XCircle,
  UserPlus,
  Rocket,
  Activity,
  AlertTriangle,
  RefreshCw,
  UserMinus,
  type LucideIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  EMPTY_STATE_TOKENS,
  TYPOGRAPHY_TOKENS,
  ANIMATION_TOKENS,
  STAGE_ICONS,
  STAGE_MESSAGES,
} from './tokens';

// ============================================
// Icon Mapping
// ============================================

const ICON_MAP: Record<string, LucideIcon> = {
  Target,
  Sparkles,
  Phone,
  Clock,
  BadgeCheck,
  Search,
  ClipboardCheck,
  FileText,
  MessageSquare,
  Trophy,
  XCircle,
  UserPlus,
  Rocket,
  Activity,
  AlertTriangle,
  RefreshCw,
  UserMinus,
};

// ============================================
// Types
// ============================================

export type PipelineType = 'leads' | 'opportunities' | 'customers';

export interface PipelineColumnEmptyStateProps {
  /** Stage identifier for contextual messaging */
  stageId: string;
  /** Stage display name */
  stageName: string;
  /** Stage color (hex) for icon background tint */
  stageColor?: string;
  /** Pipeline type for context-aware messaging */
  pipelineType?: PipelineType;
  /** Whether an item is being dragged over this column */
  isDropTarget?: boolean;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

export function PipelineColumnEmptyState({
  stageId,
  stageName,
  stageColor,
  pipelineType = 'leads',
  isDropTarget = false,
  size = 'md',
  className,
}: PipelineColumnEmptyStateProps) {
  // Get stage-specific content
  const stageKey = stageId.toLowerCase().replace(/-/g, '_');
  const defaultMessages = { title: 'Sin elementos', hint: 'Agrega elementos a esta etapa' };
  const messages = STAGE_MESSAGES[stageKey] ?? STAGE_MESSAGES['default'] ?? defaultMessages;
  const iconName = STAGE_ICONS[stageKey as keyof typeof STAGE_ICONS] ?? STAGE_ICONS['default'] ?? 'target';
  const IconComponent = ICON_MAP[iconName] || Target;

  // Size-based dimensions
  const iconContainerSize = EMPTY_STATE_TOKENS.iconSize[size];
  const iconSize = EMPTY_STATE_TOKENS.icon[size];

  return (
    <div
      className={cn(
        // Container
        'flex flex-col items-center justify-center',
        'text-center',
        // Border style - dashed for empty
        'border-2 border-dashed rounded-lg',
        // Background
        'bg-muted/20',
        // Padding based on size
        size === 'sm' && 'py-4 px-3',
        size === 'md' && 'py-6 px-4',
        size === 'lg' && 'py-8 px-6',
        // Minimum height
        'min-h-[100px]',
        // Transition for drop feedback
        'transition-all duration-200',
        // Drop target state
        isDropTarget && [
          'border-primary border-solid',
          'bg-primary/5',
          'scale-[1.02]',
        ],
        // Default state
        !isDropTarget && 'border-border/50',
        className
      )}
      role="status"
      aria-label={`${stageName} - ${messages?.title ?? 'Sin elementos'}`}
    >
      {/* Icon Container with floating animation */}
      <div
        className={cn(
          // Size and shape
          'rounded-full',
          'flex items-center justify-center',
          // Subtle floating animation (only when not drop target)
          !isDropTarget && 'animate-float-subtle',
          // Drop target feedback
          isDropTarget && 'scale-110',
          // Transition
          'transition-transform duration-300'
        )}
        style={{
          width: iconContainerSize,
          height: iconContainerSize,
          // Use stage color with low opacity for tint
          backgroundColor: stageColor
            ? `${stageColor}15`
            : 'hsl(var(--muted) / 0.5)',
        }}
      >
        <IconComponent
          className="transition-colors duration-200"
          style={{
            width: iconSize,
            height: iconSize,
            color: isDropTarget
              ? 'hsl(var(--primary))'
              : stageColor || 'hsl(var(--muted-foreground))',
          }}
        />
      </div>

      {/* Text Content */}
      <div className={cn('mt-3 space-y-1', size === 'sm' && 'mt-2')}>
        {/* Title - changes when dragging */}
        <p
          className={cn(
            'font-medium',
            'text-muted-foreground',
            isDropTarget && 'text-primary'
          )}
          style={{
            fontSize: TYPOGRAPHY_TOKENS.emptyTitle.size,
            fontWeight: TYPOGRAPHY_TOKENS.emptyTitle.weight,
          }}
        >
          {isDropTarget ? 'Suelta aquí' : (messages?.title ?? 'Sin elementos')}
        </p>

        {/* Hint - hidden when dragging */}
        {!isDropTarget && (
          <p
            className="text-muted-foreground/60"
            style={{
              fontSize: TYPOGRAPHY_TOKENS.emptySubtitle.size,
              fontWeight: TYPOGRAPHY_TOKENS.emptySubtitle.weight,
            }}
          >
            {messages?.hint ?? 'Agrega elementos a esta etapa'}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Compact Variant for inline use
// ============================================

export function PipelineColumnEmptyStateCompact({
  stageId,
  stageName,
  stageColor,
  isDropTarget = false,
  className,
}: Omit<PipelineColumnEmptyStateProps, 'size' | 'pipelineType'>) {
  const stageKey = stageId.toLowerCase().replace(/-/g, '_');
  const iconName = STAGE_ICONS[stageKey as keyof typeof STAGE_ICONS] || STAGE_ICONS.default;
  const IconComponent = ICON_MAP[iconName] || Target;

  return (
    <div
      className={cn(
        'flex items-center justify-center gap-2',
        'py-4 px-3',
        'border border-dashed rounded-md',
        'bg-muted/10',
        'transition-all duration-200',
        isDropTarget && [
          'border-primary border-solid',
          'bg-primary/5',
        ],
        !isDropTarget && 'border-border/40',
        className
      )}
    >
      <IconComponent
        className="h-4 w-4"
        style={{
          color: isDropTarget
            ? 'hsl(var(--primary))'
            : stageColor || 'hsl(var(--muted-foreground))',
        }}
      />
      <span
        className={cn(
          'text-xs',
          'text-muted-foreground/70',
          isDropTarget && 'text-primary'
        )}
      >
        {isDropTarget ? 'Suelta aquí' : 'Sin elementos'}
      </span>
    </div>
  );
}

export default PipelineColumnEmptyState;

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * Skeleton Component - Enhanced Loading Placeholder
 *
 * Features:
 * - Shimmer effect for premium feel
 * - Multiple variants: default, pulse, shimmer
 * - Configurable animation speed
 * - Layout-stable (reserves exact space)
 *
 * Best Practices:
 * - Always specify explicit dimensions (h-X, w-X)
 * - Match skeleton dimensions to actual content
 * - Use aspect-ratio for images/charts
 *
 * @example
 * // Basic usage
 * <Skeleton className="h-4 w-32" />
 *
 * // With shimmer
 * <Skeleton variant="shimmer" className="h-16 w-full" />
 *
 * // For charts (maintains aspect ratio)
 * <Skeleton className="w-full aspect-[16/9]" />
 */

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Animation variant */
  variant?: 'default' | 'pulse' | 'shimmer';
  /** Show animation */
  animate?: boolean;
}

function Skeleton({
  className,
  variant = 'default',
  animate = true,
  ...props
}: SkeletonProps) {
  // Variant styles
  const variantStyles = {
    default: 'animate-pulse',
    pulse: 'animate-pulse',
    shimmer: '', // Shimmer handled by overlay
  };

  return (
    <div
      className={cn(
        // Base styles
        'rounded-md bg-muted',
        // Animation based on variant
        animate && variantStyles[variant],
        // Relative for shimmer overlay
        variant === 'shimmer' && 'relative overflow-hidden',
        className
      )}
      aria-hidden="true"
      {...props}
    >
      {/* Shimmer overlay */}
      {variant === 'shimmer' && animate && (
        <div
          className={cn(
            'absolute inset-0',
            'bg-gradient-to-r from-transparent via-white/10 to-transparent',
            'animate-[skeleton-shimmer_2s_ease-in-out_infinite]'
          )}
        />
      )}
    </div>
  );
}

/**
 * SkeletonText - Text placeholder with multiple lines
 */
interface SkeletonTextProps {
  lines?: number;
  className?: string;
  lineClassName?: string;
}

function SkeletonText({
  lines = 3,
  className,
  lineClassName,
}: SkeletonTextProps) {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton
          key={i}
          className={cn(
            'h-3',
            // Last line is shorter for natural look
            i === lines - 1 ? 'w-3/4' : 'w-full',
            lineClassName
          )}
        />
      ))}
    </div>
  );
}

/**
 * SkeletonCard - Card placeholder with header and content
 */
interface SkeletonCardProps {
  className?: string;
  hasHeader?: boolean;
  hasFooter?: boolean;
  contentLines?: number;
}

function SkeletonCard({
  className,
  hasHeader = true,
  hasFooter = false,
  contentLines = 3,
}: SkeletonCardProps) {
  return (
    <div
      className={cn(
        'rounded-xl border border-border/50 bg-card/50',
        'p-4 space-y-4',
        className
      )}
    >
      {hasHeader && (
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="h-5 w-5 rounded-full" />
        </div>
      )}
      <SkeletonText lines={contentLines} />
      {hasFooter && (
        <div className="flex items-center justify-between pt-2 border-t border-border/50">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-24 rounded-md" />
        </div>
      )}
    </div>
  );
}

/**
 * SkeletonAvatar - Avatar placeholder
 */
interface SkeletonAvatarProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function SkeletonAvatar({ size = 'md', className }: SkeletonAvatarProps) {
  const sizeStyles = {
    sm: 'h-6 w-6',
    md: 'h-9 w-9',
    lg: 'h-12 w-12',
  };

  return (
    <Skeleton
      className={cn('rounded-full', sizeStyles[size], className)}
    />
  );
}

/**
 * SkeletonChart - Chart placeholder with aspect ratio
 */
interface SkeletonChartProps {
  aspectRatio?: string;
  className?: string;
}

function SkeletonChart({
  aspectRatio = '16/9',
  className,
}: SkeletonChartProps) {
  return (
    <Skeleton
      variant="shimmer"
      className={cn('w-full rounded-lg', className)}
      style={{ aspectRatio }}
    />
  );
}

export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonAvatar,
  SkeletonChart,
};

export type {
  SkeletonProps,
  SkeletonTextProps,
  SkeletonCardProps,
  SkeletonAvatarProps,
  SkeletonChartProps,
};

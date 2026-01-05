// ============================================
// Page Header Component - FASE 5.11
// Consistent page headers across all modules
// ============================================

'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import { ChevronLeft, type LucideIcon } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

// ============================================
// Page Header
// ============================================

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  badge?: {
    label: string;
    variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  };
  backHref?: string;
  onBack?: () => void;
  actions?: React.ReactNode;
  tabs?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  badge,
  backHref,
  onBack,
  actions,
  tabs,
  className,
  isLoading = false,
}: PageHeaderProps) {
  const router = useRouter();

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  const showBackButton = backHref || onBack;

  if (isLoading) {
    return (
      <div className={cn('mb-6', className)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="h-10 w-10 rounded-lg" />
            <div>
              <Skeleton className="h-7 w-48 mb-2" />
              <Skeleton className="h-4 w-64" />
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-32" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('mb-6', className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          {showBackButton && (
            <Button
              className="flex-shrink-0 mt-0.5"
              size="icon"
              variant="ghost"
              onClick={handleBack}
            >
              <ChevronLeft className="h-5 w-5" />
              <span className="sr-only">Volver</span>
            </Button>
          )}

          {Icon && !showBackButton && (
            <div className="flex-shrink-0 rounded-lg bg-primary/10 p-2.5 mt-0.5">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}

          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
              {badge && (
                <Badge variant={badge.variant}>{badge.label}</Badge>
              )}
            </div>
            {description && (
              <p className="text-muted-foreground mt-1">{description}</p>
            )}
          </div>
        </div>

        {actions && (
          <div className="flex items-center gap-2 flex-shrink-0">
            {actions}
          </div>
        )}
      </div>

      {tabs && <div className="mt-6">{tabs}</div>}
    </div>
  );
}

// ============================================
// Page Section
// ============================================

interface PageSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  collapsible?: boolean;
  defaultOpen?: boolean;
}

export function PageSection({
  title,
  description,
  action,
  children,
  className,
  collapsible = false,
  defaultOpen = true,
}: PageSectionProps) {
  const [isOpen, setIsOpen] = React.useState(defaultOpen);

  return (
    <section className={cn('mb-8', className)}>
      <div className="flex items-start justify-between mb-4">
        <div
          className={cn(collapsible && 'cursor-pointer')}
          onClick={collapsible ? () => setIsOpen(!isOpen) : undefined}
        >
          <h2 className="text-lg font-semibold">{title}</h2>
          {description && (
            <p className="text-sm text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {action && <div>{action}</div>}
      </div>
      {(!collapsible || isOpen) && children}
    </section>
  );
}

// ============================================
// Page Container
// ============================================

interface PageContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
}

const maxWidthClasses = {
  sm: 'max-w-screen-sm',
  md: 'max-w-screen-md',
  lg: 'max-w-screen-lg',
  xl: 'max-w-screen-xl',
  '2xl': 'max-w-screen-2xl',
  full: 'max-w-full',
};

export function PageContainer({
  children,
  className,
  maxWidth = 'full',
}: PageContainerProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-6 p-6',
        maxWidthClasses[maxWidth],
        'mx-auto',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// Stats Card
// ============================================

interface StatsCardProps {
  title: string;
  value: string | number;
  change?: {
    value: number;
    label?: string;
  };
  icon?: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
  isLoading?: boolean;
}

export function StatsCard({
  title,
  value,
  change,
  icon: Icon,
  trend,
  className,
  isLoading = false,
}: StatsCardProps) {
  if (isLoading) {
    return (
      <div className={cn('rounded-lg border bg-card p-4', className)}>
        <div className="flex items-center justify-between mb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-8 w-20 mb-2" />
        <Skeleton className="h-3 w-16" />
      </div>
    );
  }

  const trendColor = {
    up: 'text-green-600 dark:text-green-400',
    down: 'text-red-600 dark:text-red-400',
    neutral: 'text-muted-foreground',
  };

  return (
    <div className={cn('rounded-lg border bg-card p-4', className)}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-muted-foreground">{title}</span>
        {Icon && (
          <div className="rounded-full bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {change && (
        <p className={cn('text-xs mt-1', trendColor[trend || 'neutral'])}>
          {change.value > 0 ? '+' : ''}
          {change.value}%
          {change.label && <span className="text-muted-foreground ml-1">{change.label}</span>}
        </p>
      )}
    </div>
  );
}

// ============================================
// Stats Grid
// ============================================

interface StatsGridProps {
  children: React.ReactNode;
  columns?: 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  const gridCols = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-4', gridCols[columns], className)}>
      {children}
    </div>
  );
}

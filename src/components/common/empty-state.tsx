// ============================================
// Empty State Component - FASE 5.11
// Consistent empty states across all modules
// ============================================

'use client';

import * as React from 'react';

import { AlertCircle, FileX, SearchX } from 'lucide-react';


import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'muted' | 'dashed';
}

const sizeConfig = {
  sm: {
    container: 'py-8',
    icon: 'h-8 w-8',
    iconBg: 'p-2',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-12',
    icon: 'h-10 w-10',
    iconBg: 'p-3',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'h-12 w-12',
    iconBg: 'p-4',
    title: 'text-xl',
    description: 'text-base',
  },
};

const variantConfig = {
  default: 'bg-transparent',
  muted: 'bg-muted/50 rounded-lg',
  dashed: 'border-2 border-dashed border-muted-foreground/25 rounded-lg',
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
  variant = 'default',
}: EmptyStateProps) {
  const sizes = sizeConfig[size];
  const variantClass = variantConfig[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center',
        sizes.container,
        variantClass,
        className
      )}
    >
      <div
        className={cn(
          'rounded-full bg-muted mb-4',
          sizes.iconBg
        )}
      >
        <Icon className={cn('text-muted-foreground', sizes.icon)} />
      </div>

      <h3 className={cn('font-semibold text-foreground mb-1', sizes.title)}>
        {title}
      </h3>

      <p className={cn('text-muted-foreground max-w-sm mb-4', sizes.description)}>
        {description}
      </p>

      {(action || secondaryAction) && (
        <div className="flex items-center gap-3">
          {action && (
            <Button size={size === 'sm' ? 'sm' : 'default'} onClick={action.onClick}>
              {action.icon && <action.icon className="mr-2 h-4 w-4" />}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button
              size={size === 'sm' ? 'sm' : 'default'}
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function NoDataEmpty({
  title = 'Sin datos',
  description = 'No hay datos para mostrar en este momento.',
  icon = FileX,
  ...props
}: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      description={description}
      icon={icon}
      title={title}
      {...props}
    />
  );
}

export function NoResultsEmpty({
  title = 'Sin resultados',
  description = 'No se encontraron resultados para tu búsqueda. Intenta con otros términos.',
  onClearFilters,
  ...props
}: Partial<EmptyStateProps> & { onClearFilters?: () => void }) {
  return (
    <EmptyState
      action={onClearFilters ? { label: 'Limpiar filtros', onClick: onClearFilters } : undefined}
      description={description}
      icon={SearchX}
      title={title}
      {...props}
    />
  );
}

export function ErrorEmpty({
  title = 'Algo salió mal',
  description = 'Ocurrió un error al cargar los datos. Por favor, intenta de nuevo.',
  onRetry,
  ...props
}: Partial<EmptyStateProps> & { onRetry?: () => void }) {
  return (
    <EmptyState
      action={onRetry ? { label: 'Reintentar', onClick: onRetry } : undefined}
      description={description}
      icon={AlertCircle}
      title={title}
      variant="dashed"
      {...props}
    />
  );
}

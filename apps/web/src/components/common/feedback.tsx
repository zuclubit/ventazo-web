// ============================================
// Feedback Components - FASE 5.11
// Consistent feedback patterns across the app
// ============================================

'use client';

import * as React from 'react';

import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Alert Banner
// ============================================

type AlertVariant = 'success' | 'error' | 'warning' | 'info';

interface AlertBannerProps {
  variant: AlertVariant;
  title?: string;
  message: string;
  onDismiss?: () => void;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const alertConfig: Record<AlertVariant, {
  icon: React.ElementType;
  bg: string;
  border: string;
  text: string;
  iconColor: string;
}> = {
  success: {
    icon: CheckCircle2,
    bg: 'bg-green-50 dark:bg-green-950/30',
    border: 'border-green-200 dark:border-green-900',
    text: 'text-green-800 dark:text-green-200',
    iconColor: 'text-green-600 dark:text-green-400',
  },
  error: {
    icon: XCircle,
    bg: 'bg-red-50 dark:bg-red-950/30',
    border: 'border-red-200 dark:border-red-900',
    text: 'text-red-800 dark:text-red-200',
    iconColor: 'text-red-600 dark:text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    bg: 'bg-yellow-50 dark:bg-yellow-950/30',
    border: 'border-yellow-200 dark:border-yellow-900',
    text: 'text-yellow-800 dark:text-yellow-200',
    iconColor: 'text-yellow-600 dark:text-yellow-400',
  },
  info: {
    icon: Info,
    bg: 'bg-blue-50 dark:bg-blue-950/30',
    border: 'border-blue-200 dark:border-blue-900',
    text: 'text-blue-800 dark:text-blue-200',
    iconColor: 'text-blue-600 dark:text-blue-400',
  },
};

export function AlertBanner({
  variant,
  title,
  message,
  onDismiss,
  action,
  className,
}: AlertBannerProps) {
  const config = alertConfig[variant];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex items-start gap-3 p-4 rounded-lg border',
        config.bg,
        config.border,
        className
      )}
      role="alert"
    >
      <Icon className={cn('h-5 w-5 flex-shrink-0 mt-0.5', config.iconColor)} />
      <div className="flex-1 min-w-0">
        {title && (
          <h4 className={cn('font-medium mb-1', config.text)}>{title}</h4>
        )}
        <p className={cn('text-sm', config.text)}>{message}</p>
        {action && (
          <Button
            className={cn('h-auto p-0 mt-2', config.text)}
            size="sm"
            variant="link"
            onClick={action.onClick}
          >
            {action.label}
          </Button>
        )}
      </div>
      {onDismiss && (
        <Button
          className={cn('h-6 w-6 flex-shrink-0', config.text)}
          size="icon"
          variant="ghost"
          onClick={onDismiss}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  );
}

// ============================================
// Status Indicator
// ============================================

type StatusType = 'online' | 'offline' | 'busy' | 'away' | 'success' | 'error' | 'warning' | 'pending';

interface StatusIndicatorProps {
  status: StatusType;
  label?: string;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
  className?: string;
}

const statusColors: Record<StatusType, string> = {
  online: 'bg-green-500',
  success: 'bg-green-500',
  offline: 'bg-gray-400',
  busy: 'bg-red-500',
  error: 'bg-red-500',
  away: 'bg-yellow-500',
  warning: 'bg-yellow-500',
  pending: 'bg-blue-500',
};

const statusSizes = {
  sm: 'h-2 w-2',
  md: 'h-2.5 w-2.5',
  lg: 'h-3 w-3',
};

export function StatusIndicator({
  status,
  label,
  size = 'md',
  pulse = false,
  className,
}: StatusIndicatorProps) {
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="relative flex">
        <span
          className={cn(
            'rounded-full',
            statusColors[status],
            statusSizes[size],
            pulse && 'animate-ping absolute inline-flex h-full w-full opacity-75'
          )}
        />
        <span
          className={cn(
            'relative inline-flex rounded-full',
            statusColors[status],
            statusSizes[size]
          )}
        />
      </span>
      {label && <span className="text-sm text-muted-foreground">{label}</span>}
    </div>
  );
}

// ============================================
// Progress Steps
// ============================================

interface ProgressStep {
  id: string;
  label: string;
  description?: string;
}

interface ProgressStepsProps {
  steps: ProgressStep[];
  currentStep: number;
  className?: string;
}

export function ProgressSteps({ steps, currentStep, className }: ProgressStepsProps) {
  return (
    <nav aria-label="Progress" className={className}>
      <ol className="flex items-center">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;

          return (
            <li
              key={step.id}
              className={cn('flex items-center', index !== steps.length - 1 && 'flex-1')}
            >
              <div className="flex flex-col items-center">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    isCompleted && 'bg-primary text-primary-foreground',
                    isCurrent && 'border-2 border-primary text-primary',
                    !isCompleted && !isCurrent && 'border-2 border-muted text-muted-foreground'
                  )}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    index + 1
                  )}
                </span>
                <span
                  className={cn(
                    'mt-2 text-xs font-medium',
                    (isCompleted || isCurrent) ? 'text-foreground' : 'text-muted-foreground'
                  )}
                >
                  {step.label}
                </span>
              </div>
              {index !== steps.length - 1 && (
                <div
                  className={cn(
                    'mx-4 h-0.5 flex-1',
                    isCompleted ? 'bg-primary' : 'bg-muted'
                  )}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// ============================================
// Confirmation Dialog Content
// ============================================

interface ConfirmationContentProps {
  variant?: 'danger' | 'warning' | 'info';
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ConfirmationContent({
  variant = 'danger',
  title,
  description,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  onConfirm,
  onCancel,
  isLoading = false,
}: ConfirmationContentProps) {
  const variantConfig = {
    danger: {
      icon: XCircle,
      iconBg: 'bg-red-100 dark:bg-red-900/30',
      iconColor: 'text-red-600 dark:text-red-400',
      buttonVariant: 'destructive' as const,
    },
    warning: {
      icon: AlertTriangle,
      iconBg: 'bg-yellow-100 dark:bg-yellow-900/30',
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      buttonVariant: 'default' as const,
    },
    info: {
      icon: Info,
      iconBg: 'bg-blue-100 dark:bg-blue-900/30',
      iconColor: 'text-blue-600 dark:text-blue-400',
      buttonVariant: 'default' as const,
    },
  };

  const config = variantConfig[variant];
  const Icon = config.icon;

  return (
    <div className="flex flex-col items-center text-center p-4">
      <div className={cn('rounded-full p-3 mb-4', config.iconBg)}>
        <Icon className={cn('h-6 w-6', config.iconColor)} />
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-sm">{description}</p>
      <div className="flex gap-3 w-full">
        <Button
          className="flex-1"
          disabled={isLoading}
          variant="outline"
          onClick={onCancel}
        >
          {cancelLabel}
        </Button>
        <Button
          className="flex-1"
          disabled={isLoading}
          variant={config.buttonVariant}
          onClick={onConfirm}
        >
          {isLoading && (
            <span className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          )}
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Tooltip Content Wrapper
// ============================================

interface TooltipContentWrapperProps {
  title?: string;
  description: string;
  shortcut?: string;
  className?: string;
}

export function TooltipContentWrapper({
  title,
  description,
  shortcut,
  className,
}: TooltipContentWrapperProps) {
  return (
    <div className={cn('max-w-xs', className)}>
      {title && <p className="font-medium mb-1">{title}</p>}
      <p className="text-sm text-muted-foreground">{description}</p>
      {shortcut && (
        <div className="mt-2 flex items-center gap-1">
          {shortcut.split('+').map((key, i) => (
            <React.Fragment key={key}>
              {i > 0 && <span className="text-muted-foreground">+</span>}
              <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded border">
                {key.trim()}
              </kbd>
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

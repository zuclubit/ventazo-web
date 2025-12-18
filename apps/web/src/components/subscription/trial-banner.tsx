'use client';

import * as React from 'react';

import Link from 'next/link';

import { ArrowRight, Calendar, Clock, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useTrialBanner } from '@/lib/subscriptions';

/**
 * Trial Banner Component
 * Shows trial countdown in the app header/dashboard
 */

export interface TrialBannerProps {
  /** Whether to show a dismissible close button */
  dismissible?: boolean;
  /** Callback when dismissed */
  onDismiss?: () => void;
  /** Additional CSS classes */
  className?: string;
  /** Variant: 'full' for dashboard, 'compact' for header */
  variant?: 'full' | 'compact';
}

export function TrialBanner({
  dismissible = false,
  onDismiss,
  className,
  variant = 'full',
}: TrialBannerProps) {
  const { shouldShow, daysRemaining, urgencyLevel, isLoading, planName } = useTrialBanner();

  const [isDismissed, setIsDismissed] = React.useState(false);

  if (isLoading || !shouldShow || isDismissed) {
    return null;
  }

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  const urgencyStyles = {
    low: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    medium: {
      bg: 'bg-blue-50 dark:bg-blue-900/20',
      border: 'border-blue-200 dark:border-blue-800',
      text: 'text-blue-800 dark:text-blue-200',
      icon: 'text-blue-600 dark:text-blue-400',
      button: 'bg-blue-600 hover:bg-blue-700 text-white',
    },
    high: {
      bg: 'bg-yellow-50 dark:bg-yellow-900/20',
      border: 'border-yellow-200 dark:border-yellow-800',
      text: 'text-yellow-800 dark:text-yellow-200',
      icon: 'text-yellow-600 dark:text-yellow-400',
      button: 'bg-yellow-600 hover:bg-yellow-700 text-white',
    },
    critical: {
      bg: 'bg-red-50 dark:bg-red-900/20',
      border: 'border-red-200 dark:border-red-800',
      text: 'text-red-800 dark:text-red-200',
      icon: 'text-red-600 dark:text-red-400',
      button: 'bg-red-600 hover:bg-red-700 text-white',
    },
  };

  const styles = urgencyStyles[urgencyLevel as keyof typeof urgencyStyles];

  const getMessage = () => {
    if (daysRemaining === 0) {
      return 'Tu prueba termina hoy';
    }
    if (daysRemaining === 1) {
      return 'Tu prueba termina mañana';
    }
    return `Te quedan ${daysRemaining} días de prueba`;
  };

  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center justify-between gap-4 rounded-lg border px-4 py-2',
          styles.bg,
          styles.border,
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className={cn('h-4 w-4', styles.icon)} />
          <span className={cn('text-sm font-medium', styles.text)}>{getMessage()}</span>
        </div>
        <Button size="sm" className={styles.button} asChild>
          <Link href="/app/settings/billing">
            Mejorar
            <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'relative flex flex-col gap-4 rounded-lg border p-4 sm:flex-row sm:items-center sm:justify-between',
        styles.bg,
        styles.border,
        className
      )}
    >
      {dismissible && (
        <button
          className={cn(
            'absolute right-2 top-2 rounded-full p-1 opacity-70 hover:opacity-100',
            styles.text
          )}
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            urgencyLevel === 'critical'
              ? 'bg-red-100 dark:bg-red-800'
              : urgencyLevel === 'high'
                ? 'bg-yellow-100 dark:bg-yellow-800'
                : 'bg-blue-100 dark:bg-blue-800'
          )}
        >
          <Calendar className={cn('h-5 w-5', styles.icon)} />
        </div>
        <div>
          <p className={cn('font-medium', styles.text)}>{getMessage()}</p>
          <p className={cn('text-sm opacity-80', styles.text)}>
            {planName ? `Probando ${planName}` : 'Desbloquea todas las funcionalidades'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button className={styles.button} asChild>
          <Link href="/app/settings/billing">
            <ArrowRight className="mr-2 h-4 w-4" />
            Mejorar ahora
          </Link>
        </Button>
      </div>
    </div>
  );
}

/**
 * Trial Progress Bar
 * Shows visual progress of trial period
 */
export function TrialProgressBar({ className }: { className?: string }) {
  const { shouldShow, daysRemaining, isLoading } = useTrialBanner();

  if (isLoading || !shouldShow) {
    return null;
  }

  // Assuming 14 day trial
  const totalDays = 14;
  const usedDays = totalDays - daysRemaining;
  const percentage = Math.min(100, Math.round((usedDays / totalDays) * 100));

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Período de prueba</span>
        <span className="font-medium">
          {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'} restantes
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            'h-full transition-all duration-500',
            percentage > 80
              ? 'bg-red-500'
              : percentage > 50
                ? 'bg-yellow-500'
                : 'bg-primary'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

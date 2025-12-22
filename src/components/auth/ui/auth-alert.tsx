'use client';

/**
 * Auth Alert Component
 *
 * A styled alert component for displaying authentication messages.
 * Supports error, warning, success, and info variants with icons.
 * Email-related alerts get special enhanced styling for better visibility.
 *
 * @example
 * ```tsx
 * <AuthAlert
 *   type="error"
 *   title="Email not confirmed"
 *   description="Please check your inbox..."
 * />
 * ```
 */

import { AlertCircle, CheckCircle2, Info, Mail, X, Inbox } from 'lucide-react';

import { cn } from '@/lib/utils';

import type { AlertType, AuthAlertProps } from './types';

// ============================================
// Alert Configuration
// ============================================

const alertConfig: Record<AlertType, {
  containerClass: string;
  iconContainerClass: string;
  iconClass: string;
  titleClass: string;
  descriptionClass: string;
  Icon: typeof AlertCircle;
}> = {
  error: {
    containerClass: 'bg-destructive/10 border-destructive/30',
    iconContainerClass: 'bg-destructive/20',
    iconClass: 'text-destructive',
    titleClass: 'text-destructive',
    descriptionClass: 'text-destructive/80',
    Icon: AlertCircle,
  },
  warning: {
    containerClass: 'bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800/50',
    iconContainerClass: 'bg-amber-100 dark:bg-amber-900/50',
    iconClass: 'text-amber-600 dark:text-amber-400',
    titleClass: 'text-amber-800 dark:text-amber-200',
    descriptionClass: 'text-amber-700 dark:text-amber-300',
    Icon: AlertCircle,
  },
  success: {
    containerClass: 'bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800/50',
    iconContainerClass: 'bg-emerald-100 dark:bg-emerald-900/50',
    iconClass: 'text-emerald-600 dark:text-emerald-400',
    titleClass: 'text-emerald-800 dark:text-emerald-200',
    descriptionClass: 'text-emerald-700 dark:text-emerald-300',
    Icon: CheckCircle2,
  },
  info: {
    containerClass: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800/50',
    iconContainerClass: 'bg-blue-100 dark:bg-blue-900/50',
    iconClass: 'text-blue-600 dark:text-blue-400',
    titleClass: 'text-blue-800 dark:text-blue-200',
    descriptionClass: 'text-blue-700 dark:text-blue-300',
    Icon: Info,
  },
};

// ============================================
// Component
// ============================================

export function AuthAlert({
  type,
  title,
  description,
  hint,
  icon,
  onDismiss,
  className,
}: AuthAlertProps) {
  const config = alertConfig[type];

  // Detect if this is an email-related message
  const isEmailRelated = title.toLowerCase().includes('email') ||
    title.toLowerCase().includes('correo') ||
    title.toLowerCase().includes('e-mail') ||
    title.toLowerCase().includes('confirmado') ||
    title.toLowerCase().includes('confirmed');

  // Use Mail icon for email-related alerts
  const IconComponent = isEmailRelated ? Mail : config.Icon;

  // Enhanced styling for email confirmation alerts (more prominent)
  const isEmailConfirmation = isEmailRelated && description;

  if (isEmailConfirmation) {
    // Special enhanced design for email confirmation messages
    return (
      <div
        className={cn(
          'rounded-xl border-2 overflow-hidden animate-in fade-in-0 slide-in-from-top-2 duration-300',
          'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-300',
          'dark:from-amber-950/40 dark:to-orange-950/40 dark:border-amber-700/60',
          'shadow-sm',
          className
        )}
        role="alert"
      >
        {/* Header with icon */}
        <div className="flex items-center gap-3 px-4 py-3 bg-amber-100/50 dark:bg-amber-900/30 border-b border-amber-200 dark:border-amber-800/50">
          <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-200 dark:bg-amber-800/60">
            <Inbox className="h-5 w-5 text-amber-700 dark:text-amber-300" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-amber-900 dark:text-amber-100">
              {title}
            </h3>
          </div>
          {onDismiss && (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-full p-1.5 text-amber-600 hover:text-amber-800 hover:bg-amber-200/50 dark:text-amber-400 dark:hover:text-amber-200 dark:hover:bg-amber-800/50 transition-colors"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Description */}
        <div className="px-4 py-3">
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">
            {description}
          </p>

          {/* Visual hint */}
          {hint && (
            <div className="mt-3 flex items-center gap-2 text-xs text-amber-600 dark:text-amber-400">
              <Mail className="h-3.5 w-3.5" />
              <span>{hint}</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Standard alert design
  return (
    <div
      className={cn(
        'rounded-lg border p-4 animate-in fade-in-0 slide-in-from-top-2 duration-300',
        config.containerClass,
        className
      )}
      role="alert"
    >
      <div className="flex items-start gap-3">
        {/* Icon with background */}
        <div className={cn(
          'flex items-center justify-center w-8 h-8 rounded-full shrink-0',
          config.iconContainerClass
        )}>
          {icon || (
            <IconComponent
              className={cn('h-4 w-4', config.iconClass)}
              aria-hidden="true"
            />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 pt-0.5">
          <p className={cn('text-sm font-semibold', config.titleClass)}>
            {title}
          </p>
          {description && (
            <p className={cn('mt-1 text-sm leading-relaxed', config.descriptionClass)}>
              {description}
            </p>
          )}
        </div>

        {/* Dismiss Button */}
        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            className={cn(
              'shrink-0 rounded-md p-1 opacity-70 transition-opacity hover:opacity-100',
              'focus:outline-none focus:ring-2 focus:ring-offset-2',
              type === 'error' && 'focus:ring-destructive',
              type === 'warning' && 'focus:ring-amber-500',
              type === 'success' && 'focus:ring-emerald-500',
              type === 'info' && 'focus:ring-blue-500'
            )}
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Display Name for DevTools
// ============================================

AuthAlert.displayName = 'AuthAlert';

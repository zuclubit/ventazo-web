'use client';

/**
 * Form Sections Component - v3.0 (2025 World-Class)
 *
 * Progressive disclosure system with consistent styling.
 *
 * Design Principles:
 * - Consistent sizing: 52px header height for touch
 * - CSS-only responsive where applicable
 * - Reduced motion support
 * - WCAG 2.1 AA compliant
 *
 * @module leads/components/lead-form/form-sections
 */

import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface FormSectionProps {
  /** Section title */
  title: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Whether section is initially expanded */
  defaultExpanded?: boolean;
  /** Children content */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
  /** Whether section is collapsible */
  collapsible?: boolean;
  /** Badge or count to show */
  badge?: React.ReactNode;
  /** Description text */
  description?: string;
}

export interface FormSectionsProps {
  /** Children sections */
  children: React.ReactNode;
  /** Additional class names */
  className?: string;
}

// ============================================
// Form Section Component
// ============================================

export function FormSection({
  title,
  icon: Icon,
  defaultExpanded = true,
  children,
  className,
  collapsible = true,
  badge,
  description,
}: FormSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);
  const contentId = React.useId();
  const headerId = React.useId();

  const handleToggle = () => {
    if (collapsible) {
      setIsExpanded((prev) => !prev);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (collapsible && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <section
      className={cn(
        'w-full min-w-0 overflow-hidden',
        'rounded-xl',
        'border border-border/40',
        'bg-card/30 backdrop-blur-sm',
        className
      )}
      aria-labelledby={headerId}
    >
      {/* Section Header */}
      <button
        type="button"
        id={headerId}
        onClick={handleToggle}
        onKeyDown={handleKeyDown}
        disabled={!collapsible}
        aria-expanded={isExpanded}
        aria-controls={contentId}
        className={cn(
          'w-full flex items-center justify-between gap-3',
          // Consistent 52px height for touch
          'min-h-[52px]',
          'px-4 py-3',
          'text-left',
          collapsible && [
            'hover:bg-muted/30',
            'active:bg-muted/50',
            'cursor-pointer',
          ],
          !collapsible && 'cursor-default',
          'focus:outline-none',
          'focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary/50'
        )}
      >
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {/* Icon */}
          {Icon && (
            <div
              className={cn(
                'flex items-center justify-center shrink-0',
                'h-9 w-9',
                'rounded-lg',
                'bg-primary/10'
              )}
            >
              <Icon className="h-4 w-4 text-primary" />
            </div>
          )}

          {/* Title and description */}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                {title}
              </h3>
              {badge && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary">
                  {badge}
                </span>
              )}
            </div>
            {description && (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                {description}
              </p>
            )}
          </div>
        </div>

        {/* Chevron */}
        {collapsible && (
          <motion.div
            animate={{ rotate: isExpanded ? 180 : 0 }}
            transition={{ duration: 0.2 }}
            className="shrink-0"
          >
            <ChevronDown
              className={cn(
                'h-5 w-5 text-muted-foreground',
                isExpanded && 'text-foreground'
              )}
            />
          </motion.div>
        )}
      </button>

      {/* Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={contentId}
            role="region"
            aria-labelledby={headerId}
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-2 space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

// ============================================
// Form Sections Container
// ============================================

export function FormSections({ children, className }: FormSectionsProps) {
  return (
    <div className={cn('w-full min-w-0 space-y-3', className)}>
      {children}
    </div>
  );
}

// ============================================
// Info Grid Component
// ============================================

export interface InfoGridItem {
  label: string;
  value: React.ReactNode;
  icon?: LucideIcon;
  fullWidth?: boolean;
}

export interface InfoGridProps {
  items: InfoGridItem[];
  columns?: 2 | 3 | 4;
  className?: string;
}

export function InfoGrid({ items, columns = 2, className }: InfoGridProps) {
  const columnClasses = {
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
  };

  return (
    <div className={cn('grid gap-3', columnClasses[columns], className)}>
      {items.map((item, index) => (
        <div
          key={index}
          className={cn('space-y-1', item.fullWidth && 'col-span-full')}
        >
          <div className="flex items-center gap-1.5">
            {item.icon && (
              <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {item.label}
            </span>
          </div>
          <div className="text-sm font-medium text-foreground">
            {item.value || <span className="text-muted-foreground">-</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================
// Activity Item Component
// ============================================

export interface ActivityItemProps {
  title: string;
  description?: string;
  timestamp?: string;
  icon?: LucideIcon;
  statusColor?: 'success' | 'warning' | 'error' | 'info';
  onClick?: () => void;
}

const statusColorClasses = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};

export function ActivityItem({
  title,
  description,
  timestamp,
  icon: Icon,
  statusColor = 'info',
  onClick,
}: ActivityItemProps) {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        'flex items-start gap-3',
        'p-3',
        'rounded-lg',
        'bg-muted/20 border border-border/30',
        onClick && [
          'w-full text-left',
          'hover:bg-muted/40',
          'active:bg-muted/50',
          'cursor-pointer',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary',
        ]
      )}
    >
      <div className={cn('h-2.5 w-2.5 mt-1.5 rounded-full shrink-0', statusColorClasses[statusColor])} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
          <span className="text-sm font-medium truncate">{title}</span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
      </div>
      {timestamp && (
        <time className="text-xs text-muted-foreground shrink-0">
          {timestamp}
        </time>
      )}
    </Component>
  );
}

// ============================================
// Notes Section Component
// ============================================

export interface NotesSectionProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  readOnly?: boolean;
  maxLength?: number;
}

export function NotesSection({
  value = '',
  onChange,
  placeholder = 'Agregar notas...',
  readOnly = false,
  maxLength = 1000,
}: NotesSectionProps) {
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.9;

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        maxLength={maxLength}
        className={cn(
          'w-full min-h-[100px]',
          'p-3',
          'rounded-lg resize-none',
          'bg-muted/20 border border-border/40',
          'text-base',
          'placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
          readOnly && 'opacity-60 cursor-not-allowed'
        )}
      />
      {!readOnly && (
        <div className="flex justify-end">
          <span
            className={cn(
              'text-xs tabular-nums',
              isNearLimit ? 'text-amber-500' : 'text-muted-foreground',
              charCount >= maxLength && 'text-destructive'
            )}
          >
            {charCount}/{maxLength}
          </span>
        </div>
      )}
    </div>
  );
}

// ============================================
// Display Names
// ============================================

FormSection.displayName = 'FormSection';
FormSections.displayName = 'FormSections';
InfoGrid.displayName = 'InfoGrid';
ActivityItem.displayName = 'ActivityItem';
NotesSection.displayName = 'NotesSection';

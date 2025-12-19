'use client';

/**
 * Form Sections Component
 *
 * Progressive disclosure system for organizing form fields.
 * Features collapsible sections with smooth animations.
 *
 * Responsive Design:
 * - Mobile: Full-width sections, larger touch targets
 * - Tablet: Slightly more compact layout
 * - Desktop: Standard sizing with hover states
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
// Animation Variants
// ============================================

const contentVariants = {
  collapsed: {
    height: 0,
    opacity: 0,
    transition: {
      height: { duration: 0.2, ease: 'easeInOut' as const },
      opacity: { duration: 0.15 },
    },
  },
  expanded: {
    height: 'auto',
    opacity: 1,
    transition: {
      height: { duration: 0.25, ease: 'easeInOut' as const },
      opacity: { duration: 0.2, delay: 0.05 },
    },
  },
};

const chevronVariants = {
  collapsed: { rotate: 0 },
  expanded: { rotate: 180 },
};

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
  const sectionId = React.useId();

  const handleToggle = () => {
    if (collapsible) {
      setIsExpanded((prev) => !prev);
    }
  };

  return (
    <div
      className={cn(
        'border border-border/50 rounded-lg overflow-hidden',
        'bg-card/50 backdrop-blur-sm',
        // Responsive shadow
        'shadow-sm sm:shadow-none',
        // Ensure container doesn't exceed parent width
        'w-full max-w-full',
        className
      )}
    >
      {/* Section Header */}
      <button
        type="button"
        onClick={handleToggle}
        disabled={!collapsible}
        aria-expanded={isExpanded}
        aria-controls={sectionId}
        className={cn(
          // Layout
          'w-full flex items-center justify-between',
          // Responsive padding - larger on mobile for touch
          'px-3 py-3.5 sm:px-4 sm:py-3',
          'text-left',
          // Transitions
          'transition-colors duration-200',
          // Interactive states
          collapsible && 'hover:bg-muted/50 cursor-pointer',
          !collapsible && 'cursor-default',
          // Focus for accessibility
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary',
          // Active state for touch feedback
          collapsible && 'active:bg-muted/70'
        )}
      >
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {Icon && (
            <div className={cn(
              'flex items-center justify-center shrink-0',
              // Responsive icon container
              'h-9 w-9 sm:h-8 sm:w-8',
              'rounded-lg bg-primary/10'
            )}>
              <Icon className="h-4 w-4 sm:h-4 sm:w-4 text-primary" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-semibold text-foreground">
                {title}
              </h3>
              {badge && (
                <span className="px-1.5 py-0.5 text-xs font-medium rounded-full bg-primary/10 text-primary shrink-0">
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

        {collapsible && (
          <motion.div
            variants={chevronVariants}
            animate={isExpanded ? 'expanded' : 'collapsed'}
            transition={{ duration: 0.2 }}
            className="shrink-0 ml-2"
          >
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </motion.div>
        )}
      </button>

      {/* Section Content */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            id={sectionId}
            initial="collapsed"
            animate="expanded"
            exit="collapsed"
            variants={contentVariants}
            className="overflow-hidden"
          >
            <div className={cn(
              // Responsive padding
              'px-3 pb-4 pt-1 sm:px-4 sm:pb-4',
              'space-y-4'
            )}>
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Form Sections Container
// ============================================

export function FormSections({ children, className }: FormSectionsProps) {
  return (
    <div className={cn(
      // Responsive spacing between sections
      'space-y-3 sm:space-y-4',
      className
    )}>
      {children}
    </div>
  );
}

// ============================================
// Info Grid Component
// ============================================

export interface InfoGridItem {
  /** Label for the info item */
  label: string;
  /** Value to display */
  value: React.ReactNode;
  /** Icon for the item */
  icon?: LucideIcon;
  /** Whether item spans full width */
  fullWidth?: boolean;
}

export interface InfoGridProps {
  /** Grid items */
  items: InfoGridItem[];
  /** Number of columns */
  columns?: 2 | 3 | 4;
  /** Additional class names */
  className?: string;
}

const columnConfig = {
  2: 'grid-cols-1 xs:grid-cols-2',
  3: 'grid-cols-1 xs:grid-cols-2 md:grid-cols-3',
  4: 'grid-cols-1 xs:grid-cols-2 md:grid-cols-4',
};

export function InfoGrid({ items, columns = 2, className }: InfoGridProps) {
  return (
    <div
      className={cn(
        'grid gap-3 sm:gap-4',
        columnConfig[columns],
        className
      )}
    >
      {items.map((item, index) => (
        <div
          key={index}
          className={cn(
            'space-y-1',
            item.fullWidth && 'col-span-full'
          )}
        >
          <div className="flex items-center gap-1.5">
            {item.icon && (
              <item.icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
            )}
            <span className="text-xs font-medium text-muted-foreground">
              {item.label}
            </span>
          </div>
          <div className="text-sm font-medium text-foreground break-words">
            {item.value || <span className="text-muted-foreground">—</span>}
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
  /** Activity type/title */
  title: string;
  /** Description or subtitle */
  description?: string;
  /** Timestamp */
  timestamp?: string;
  /** Icon */
  icon?: LucideIcon;
  /** Status indicator color */
  statusColor?: 'success' | 'warning' | 'error' | 'info';
  /** Click handler */
  onClick?: () => void;
}

const statusColors = {
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
  const Wrapper = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        // Layout
        'flex items-start gap-3',
        // Responsive padding - larger on mobile for touch
        'p-3 sm:p-3',
        // Shape
        'rounded-lg',
        // Visual
        'bg-muted/30 border border-border/30',
        // Transitions
        'transition-colors duration-200',
        // Interactive states
        onClick && [
          'hover:bg-muted/50 cursor-pointer w-full text-left',
          // Touch feedback
          'active:bg-muted/60',
          // Focus for accessibility
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary'
        ]
      )}
    >
      {/* Status Indicator */}
      <div className="relative mt-1.5 shrink-0">
        <div className={cn('h-2 w-2 rounded-full', statusColors[statusColor])} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          {Icon && (
            <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
          )}
          <span className="text-sm font-medium text-foreground truncate">
            {title}
          </span>
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
            {description}
          </p>
        )}
      </div>

      {/* Timestamp */}
      {timestamp && (
        <span className="text-xs text-muted-foreground shrink-0 mt-0.5">
          {timestamp}
        </span>
      )}
    </Wrapper>
  );
}

// ============================================
// Notes Section Component
// ============================================

export interface NotesSectionProps {
  /** Current notes value */
  value?: string;
  /** Change handler */
  onChange?: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Whether read-only */
  readOnly?: boolean;
  /** Max length */
  maxLength?: number;
}

export function NotesSection({
  value = '',
  onChange,
  placeholder = 'Agregar notas sobre este lead...',
  readOnly = false,
  maxLength = 1000,
}: NotesSectionProps) {
  const charCount = value.length;
  const isNearLimit = charCount > maxLength * 0.9;
  const isAtLimit = charCount >= maxLength;

  return (
    <div className="space-y-2">
      <textarea
        value={value}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        readOnly={readOnly}
        maxLength={maxLength}
        className={cn(
          // Layout
          'w-full',
          // Responsive min-height
          'min-h-[100px] sm:min-h-[80px]',
          // Responsive padding - larger on mobile for touch
          'p-3.5 sm:p-3',
          // Shape
          'rounded-lg resize-none',
          // Visual
          'bg-muted/30 border border-border/50',
          // Typography
          'text-sm text-foreground placeholder:text-muted-foreground',
          // Focus states
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
          // Transitions
          'transition-all duration-200',
          // Disabled state
          readOnly && 'opacity-70 cursor-not-allowed'
        )}
      />
      {!readOnly && (
        <div className="flex justify-end">
          <span
            className={cn(
              'text-xs tabular-nums',
              isAtLimit
                ? 'text-destructive'
                : isNearLimit
                  ? 'text-amber-500'
                  : 'text-muted-foreground'
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

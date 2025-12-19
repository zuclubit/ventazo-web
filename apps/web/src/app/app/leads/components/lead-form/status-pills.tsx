'use client';

/**
 * Status Pills Component
 *
 * Visual status selector inspired by modern CRM designs.
 * Features pill-shaped buttons with color coding and check marks.
 *
 * Responsive Design:
 * - Mobile: Horizontal scroll with touch-friendly sizing
 * - Tablet: Wrapping grid layout
 * - Desktop: Full inline display
 *
 * @module leads/components/lead-form/status-pills
 */

import * as React from 'react';

import { motion } from 'framer-motion';
import { Check, type LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface StatusOption {
  /** Unique identifier */
  id: string;
  /** Display label */
  label: string;
  /** Color (hex or CSS color) */
  color: string;
  /** Optional icon */
  icon?: LucideIcon;
  /** Whether this status is "completed" (shows checkmark) */
  isCompleted?: boolean;
}

export interface StatusPillsProps {
  /** Available status options */
  options: StatusOption[];
  /** Currently selected status ID */
  value?: string;
  /** Callback when status changes */
  onChange: (statusId: string) => void;
  /** Whether the component is disabled */
  disabled?: boolean;
  /** Additional class names */
  className?: string;
  /** Size variant */
  size?: 'sm' | 'md' | 'lg';
  /** Layout mode */
  layout?: 'scroll' | 'wrap' | 'auto';
}

// ============================================
// Responsive Size Configuration
// ============================================

const sizeConfig = {
  sm: {
    // Compact pills for mobile - height 36px (touch friendly but not too tall)
    pill: 'h-9 px-3 py-1.5 text-xs gap-1.5',
    icon: 'h-3.5 w-3.5',
    checkIcon: 'h-3 w-3',
  },
  md: {
    pill: 'h-10 px-4 py-2 text-sm gap-2',
    icon: 'h-4 w-4',
    checkIcon: 'h-3.5 w-3.5',
  },
  lg: {
    pill: 'h-11 px-5 py-2.5 text-sm gap-2',
    icon: 'h-4 w-4',
    checkIcon: 'h-4 w-4',
  },
};

// ============================================
// Single Status Pill
// ============================================

interface StatusPillProps {
  option: StatusOption;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  size: 'sm' | 'md' | 'lg';
}

function StatusPill({
  option,
  isSelected,
  onClick,
  disabled,
  size,
}: StatusPillProps) {
  const config = sizeConfig[size];
  const Icon = option.icon;

  // Generate colors based on the status color
  const baseColor = option.color;
  const bgColor = isSelected ? baseColor : `${baseColor}12`;
  const textColor = isSelected ? '#FFFFFF' : baseColor;
  const borderColor = isSelected ? 'transparent' : `${baseColor}25`;

  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={disabled}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      className={cn(
        // Layout - shrink-0 prevents compression in scroll
        'relative inline-flex items-center justify-center shrink-0',
        // Shape
        'rounded-full border',
        // Typography
        'font-medium whitespace-nowrap',
        // Transitions
        'transition-colors duration-150',
        // Focus states (accessibility)
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        // Sizing
        config.pill,
        // Disabled state
        disabled && 'opacity-50 cursor-not-allowed',
        !disabled && 'cursor-pointer',
        // Selected state shadow
        isSelected && 'shadow-md'
      )}
      style={{
        backgroundColor: bgColor,
        color: textColor,
        borderColor: borderColor,
        // Focus ring color matches status
        '--tw-ring-color': baseColor,
      } as React.CSSProperties}
      aria-pressed={isSelected}
      aria-label={`Estado: ${option.label}${isSelected ? ' (seleccionado)' : ''}`}
    >
      {/* Checkmark for completed statuses */}
      {option.isCompleted && isSelected && (
        <Check className={config.checkIcon} aria-hidden="true" />
      )}

      {/* Custom icon */}
      {Icon && !option.isCompleted && (
        <Icon className={config.icon} aria-hidden="true" />
      )}

      {/* Label */}
      <span>{option.label}</span>
    </motion.button>
  );
}

// ============================================
// Main Component
// ============================================

export function StatusPills({
  options,
  value,
  onChange,
  disabled,
  className,
  size = 'md',
  layout = 'auto',
}: StatusPillsProps) {
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Determine layout based on option count and screen size
  const shouldScroll = layout === 'scroll' || (layout === 'auto' && options.length > 4);

  return (
    <div
      ref={containerRef}
      className={cn(
        // Base container styles
        shouldScroll
          ? [
              // Scrollable container - horizontal scroll
              'flex overflow-x-auto',
              // Gap between pills
              'gap-2',
              // Hide scrollbar on all browsers
              'scrollbar-none',
              '[&::-webkit-scrollbar]:hidden',
              '[-ms-overflow-style:none]',
              '[scrollbar-width:none]',
              // Padding for scroll fade effect - reduced for mobile
              'pr-2 sm:pr-4',
              // Momentum scrolling on iOS
              '-webkit-overflow-scrolling-touch',
              // Ensure container doesn't exceed parent width
              'max-w-full',
            ]
          : [
              // Wrapping grid for desktop/tablet
              'flex flex-wrap gap-2',
              // Ensure container doesn't exceed parent width
              'max-w-full',
            ],
        className
      )}
      role="radiogroup"
      aria-label="Seleccionar estado"
    >
      {options.map((option) => (
        <StatusPill
          key={option.id}
          option={option}
          isSelected={value === option.id}
          onClick={() => onChange(option.id)}
          disabled={disabled}
          size={size}
        />
      ))}
    </div>
  );
}

// ============================================
// Preset Status Options for Leads
// ============================================

export const LEAD_STATUS_OPTIONS: StatusOption[] = [
  { id: 'new', label: 'Nuevo', color: '#10B981', isCompleted: false },
  { id: 'contacted', label: 'Contactado', color: '#10B981', isCompleted: true },
  { id: 'in_progress', label: 'En Progreso', color: '#F97316', isCompleted: false },
  { id: 'qualified', label: 'Calificado', color: '#8B5CF6', isCompleted: false },
  { id: 'proposal', label: 'Propuesta', color: '#3B82F6', isCompleted: false },
  { id: 'negotiation', label: 'Negociacion', color: '#EC4899', isCompleted: false },
  { id: 'won', label: 'Ganado', color: '#10B981', isCompleted: true },
  { id: 'lost', label: 'Perdido', color: '#EF4444', isCompleted: false },
];

// ============================================
// Display Names
// ============================================

StatusPills.displayName = 'StatusPills';
StatusPill.displayName = 'StatusPill';

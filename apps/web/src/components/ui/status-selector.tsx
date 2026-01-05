/**
 * StatusSelector Component - Ventazo 2025 Design System
 *
 * @description Interactive status selector for modals and forms.
 * Displays pipeline statuses as clickable badges with visual selection state.
 *
 * @features
 * - Single or multi-select modes
 * - Dark/light theme variants
 * - Keyboard accessible
 * - Visual selection indicators
 * - Custom status filtering
 *
 * @version 1.0.0
 */

'use client';

import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge, STATUS_LABELS, type StatusType } from './status-badge';

// ============================================
// Types
// ============================================

export type PipelineStatus =
  | 'new'
  | 'contacted'
  | 'in-progress'
  | 'qualified'
  | 'proposal'
  | 'negotiation'
  | 'won'
  | 'lost';

export interface StatusSelectorProps {
  /** Current selected value(s) */
  value: PipelineStatus | PipelineStatus[];
  /** Change handler */
  onChange: (status: PipelineStatus | PipelineStatus[]) => void;
  /** Available statuses to show (defaults to all pipeline statuses) */
  availableStatuses?: PipelineStatus[];
  /** Theme variant */
  variant?: 'dark' | 'light';
  /** Allow multiple selections */
  multiSelect?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Label for accessibility */
  'aria-label'?: string;
}

// ============================================
// Default Available Statuses
// ============================================

const DEFAULT_PIPELINE_STATUSES: PipelineStatus[] = [
  'new',
  'contacted',
  'in-progress',
  'qualified',
  'proposal',
  'negotiation',
  'won',
  'lost',
];

// Status ring colors for focus/selection
const STATUS_RING_COLORS: Record<PipelineStatus, string> = {
  new: 'ring-blue-500',
  contacted: 'ring-cyan-500',
  'in-progress': 'ring-purple-500',
  qualified: 'ring-yellow-500',
  proposal: 'ring-pink-500',
  negotiation: 'ring-orange-500',
  won: 'ring-emerald-500',
  lost: 'ring-red-500',
};

// ============================================
// StatusSelector Component
// ============================================

export const StatusSelector = React.memo<StatusSelectorProps>(function StatusSelector({
  value,
  onChange,
  availableStatuses = DEFAULT_PIPELINE_STATUSES,
  variant = 'light',
  multiSelect = false,
  disabled = false,
  className,
  'aria-label': ariaLabel = 'Seleccionar estado',
}) {
  // Normalize value to array for internal handling
  const selectedValues = Array.isArray(value) ? value : [value];

  // Handle status selection
  const handleSelect = React.useCallback(
    (status: PipelineStatus) => {
      if (disabled) return;

      if (multiSelect) {
        // Toggle selection in multi-select mode
        const isSelected = selectedValues.includes(status);
        const newValues = isSelected
          ? selectedValues.filter((s) => s !== status)
          : [...selectedValues, status];
        onChange(newValues as PipelineStatus[]);
      } else {
        // Single select - just set the value
        onChange(status);
      }
    },
    [disabled, multiSelect, selectedValues, onChange]
  );

  // Handle keyboard navigation
  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent, status: PipelineStatus) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleSelect(status);
      }
    },
    [handleSelect]
  );

  return (
    <div
      role={multiSelect ? 'group' : 'radiogroup'}
      aria-label={ariaLabel}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {availableStatuses.map((status) => {
        const isSelected = selectedValues.includes(status);
        const ringColor = STATUS_RING_COLORS[status];

        return (
          <button
            key={status}
            type="button"
            role={multiSelect ? 'checkbox' : 'radio'}
            aria-checked={isSelected}
            onClick={() => handleSelect(status)}
            onKeyDown={(e) => handleKeyDown(e, status)}
            disabled={disabled}
            className={cn(
              'relative transition-all duration-200 rounded-md',
              // Selection ring
              isSelected && 'ring-2 ring-offset-2',
              variant === 'light' ? 'ring-offset-white' : 'ring-offset-slate-900',
              isSelected && ringColor,
              // Hover effects
              !disabled && 'hover:scale-105 active:scale-95',
              // Disabled state
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <StatusBadge
              status={status as StatusType}
              size="md"
              variant={variant}
              className={cn(
                'cursor-pointer',
                isSelected && 'font-bold'
              )}
            >
              <span className="flex items-center gap-1.5">
                {STATUS_LABELS[status]}
                {isSelected && (
                  <Check className="w-3 h-3" aria-hidden="true" />
                )}
              </span>
            </StatusBadge>
          </button>
        );
      })}
    </div>
  );
});

StatusSelector.displayName = 'StatusSelector';

// ============================================
// StatusSelectorCompact - Dropdown variant
// ============================================

export interface StatusSelectorCompactProps {
  value: PipelineStatus;
  onChange: (status: PipelineStatus) => void;
  availableStatuses?: PipelineStatus[];
  variant?: 'dark' | 'light';
  disabled?: boolean;
  className?: string;
}

export const StatusSelectorCompact = React.memo<StatusSelectorCompactProps>(
  function StatusSelectorCompact({
    value,
    onChange,
    availableStatuses = DEFAULT_PIPELINE_STATUSES,
    variant = 'light',
    disabled = false,
    className,
  }) {
    const [isOpen, setIsOpen] = React.useState(false);
    const containerRef = React.useRef<HTMLDivElement>(null);

    // Close on outside click
    React.useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };

      if (isOpen) {
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
      }
    }, [isOpen]);

    const handleSelect = (status: PipelineStatus) => {
      onChange(status);
      setIsOpen(false);
    };

    return (
      <div ref={containerRef} className={cn('relative inline-block', className)}>
        {/* Trigger Button */}
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'flex items-center gap-2 transition-all duration-200',
            !disabled && 'hover:opacity-80',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
        >
          <StatusBadge
            status={value as StatusType}
            size="md"
            variant={variant}
          >
            {STATUS_LABELS[value]}
          </StatusBadge>
          <svg
            className={cn(
              'w-4 h-4 transition-transform duration-200',
              isOpen && 'rotate-180',
              variant === 'light' ? 'text-slate-500' : 'text-slate-400'
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div
            role="listbox"
            className={cn(
              'absolute z-50 mt-2 py-2 rounded-lg shadow-xl border',
              'min-w-[200px] max-h-[300px] overflow-y-auto',
              'animate-in fade-in-0 zoom-in-95 duration-200',
              variant === 'light'
                ? 'bg-white border-slate-200'
                : 'bg-slate-800 border-slate-700'
            )}
          >
            {availableStatuses.map((status) => {
              const isSelected = value === status;

              return (
                <button
                  key={status}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => handleSelect(status)}
                  className={cn(
                    'w-full flex items-center justify-between px-3 py-2',
                    'transition-colors duration-150',
                    variant === 'light'
                      ? 'hover:bg-slate-100'
                      : 'hover:bg-slate-700',
                    isSelected && (variant === 'light' ? 'bg-slate-50' : 'bg-slate-700/50')
                  )}
                >
                  <StatusBadge
                    status={status as StatusType}
                    size="sm"
                    variant={variant}
                  >
                    {STATUS_LABELS[status]}
                  </StatusBadge>
                  {isSelected && (
                    <Check
                      className={cn(
                        'w-4 h-4',
                        variant === 'light' ? 'text-emerald-600' : 'text-emerald-400'
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }
);

StatusSelectorCompact.displayName = 'StatusSelectorCompact';

// ============================================
// Exports
// ============================================

export { DEFAULT_PIPELINE_STATUSES };

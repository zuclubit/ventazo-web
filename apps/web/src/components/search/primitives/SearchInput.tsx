/**
 * SearchInput Primitive - Ventazo Design System 2025
 *
 * @description Reusable search input with loading state and clear button.
 * Responsive sizing and touch-friendly design.
 *
 * @module components/search/primitives/SearchInput
 */

'use client';

import * as React from 'react';
import { Search, X, Loader2, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SearchInputProps } from '../types';

const sizeStyles = {
  sm: {
    input: 'text-sm',
    icon: 'w-4 h-4',
    padding: 'px-3 py-2.5',
    gap: 'gap-2',
  },
  md: {
    input: 'text-base',
    icon: 'w-5 h-5',
    padding: 'px-4 py-3',
    gap: 'gap-3',
  },
  lg: {
    input: 'text-lg',
    icon: 'w-6 h-6',
    padding: 'px-5 py-4',
    gap: 'gap-3',
  },
};

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      isLoading = false,
      placeholder = 'Buscar...',
      size = 'md',
      autoFocus = false,
      showKeyboardHint = true,
      accentColor,
    },
    ref
  ) => {
    const styles = sizeStyles[size];

    return (
      <div
        className={cn(
          'flex items-center border-b border-white/10 bg-white/[0.02]',
          styles.padding,
          styles.gap
        )}
      >
        {/* Search Icon / Loader */}
        <div className="flex-shrink-0">
          {isLoading ? (
            <Loader2
              className={cn(styles.icon, 'animate-spin')}
              style={{ color: accentColor || 'hsl(var(--primary))' }}
            />
          ) : (
            <Search className={cn(styles.icon, 'text-white/40')} />
          )}
        </div>

        {/* Input */}
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className={cn(
            'flex-1 bg-transparent outline-none',
            'text-white placeholder-white/40',
            'font-medium min-w-0',
            styles.input
          )}
          autoComplete="off"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
        />

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Clear button */}
          {value && (
            <button
              onClick={onClear}
              className={cn(
                'p-2 rounded-lg bg-white/5 hover:bg-white/10',
                'text-white/50 hover:text-white',
                'transition-all duration-150 active:scale-95'
              )}
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Keyboard hint - desktop only */}
          {showKeyboardHint && (
            <kbd
              className={cn(
                'hidden sm:flex items-center gap-0.5',
                'px-2 py-1 text-[11px] font-medium',
                'text-white/40 bg-white/5 rounded-lg',
                'border border-white/10'
              )}
            >
              <Command className="w-3 h-3" />
              <span>K</span>
            </kbd>
          )}
        </div>
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';

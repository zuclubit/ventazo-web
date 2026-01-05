/**
 * SearchFooter Primitive - Ventazo Design System 2025
 *
 * @description Footer with keyboard shortcuts (desktop only).
 *
 * @module components/search/primitives/SearchFooter
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import type { SearchFooterProps } from '../types';

// ============================================
// Translations
// ============================================

const translations = {
  es: {
    navigate: 'Navegar',
    select: 'Seleccionar',
    close: 'Cerrar',
  },
  en: {
    navigate: 'Navigate',
    select: 'Select',
    close: 'Close',
  },
};

// ============================================
// Component
// ============================================

export function SearchFooter({ locale = 'es' }: SearchFooterProps) {
  const t = translations[locale];

  return (
    <div
      className={cn(
        'hidden sm:flex items-center justify-between',
        'px-5 py-3 border-t border-white/10 bg-white/[0.02]'
      )}
    >
      <div className="flex items-center gap-4 text-xs text-white/40">
        {/* Navigate */}
        <span className="flex items-center gap-1.5">
          <kbd
            className={cn(
              'px-1.5 py-0.5 bg-white/5 rounded',
              'border border-white/10 font-mono'
            )}
          >
            ↑
          </kbd>
          <kbd
            className={cn(
              'px-1.5 py-0.5 bg-white/5 rounded',
              'border border-white/10 font-mono'
            )}
          >
            ↓
          </kbd>
          <span>{t.navigate}</span>
        </span>

        {/* Select */}
        <span className="flex items-center gap-1.5">
          <kbd
            className={cn(
              'px-1.5 py-0.5 bg-white/5 rounded',
              'border border-white/10 font-mono'
            )}
          >
            ↵
          </kbd>
          <span>{t.select}</span>
        </span>
      </div>

      {/* Close */}
      <span className="flex items-center gap-1.5 text-xs text-white/40">
        <kbd
          className={cn(
            'px-1.5 py-0.5 bg-white/5 rounded',
            'border border-white/10 font-mono'
          )}
        >
          esc
        </kbd>
        <span>{t.close}</span>
      </span>
    </div>
  );
}

SearchFooter.displayName = 'SearchFooter';

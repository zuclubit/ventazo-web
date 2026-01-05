'use client';

/**
 * EmailHeader Component
 *
 * Modern header with global search, AI assistant, and compose button.
 * Follows the reference design with glassmorphism effects.
 *
 * Features:
 * - Global search with placeholder
 * - Ask AI button with sparkle icon
 * - Compose button with accent color
 * - Dynamic theming support
 */

import * as React from 'react';
import { Search, Sparkles, Send, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface EmailHeaderProps {
  /** Handler for search input */
  onSearch?: (query: string) => void;
  /** Handler for compose click */
  onCompose: () => void;
  /** Handler for Ask AI click */
  onAskAI?: () => void;
  /** Current search query */
  searchQuery?: string;
  /** Is AI feature available */
  hasAIFeature?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

export function EmailHeader({
  onSearch,
  onCompose,
  onAskAI,
  searchQuery = '',
  hasAIFeature = true,
  className,
}: EmailHeaderProps) {
  const [query, setQuery] = React.useState(searchQuery);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Handle search input change
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearch?.(value);
  };

  // Handle keyboard shortcut for search focus
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + K to focus search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <header
      className={cn(
        'flex items-center gap-4 px-6 py-4',
        'bg-[var(--email-header-bg)]',
        'border-b border-[var(--email-surface-border)]',
        className
      )}
    >
      {/* Search Bar - Expands to fill available space */}
      <div className="flex-1 relative">
        <div
          className={cn(
            'relative flex items-center',
            'bg-[var(--email-search-bg)]',
            'border border-[var(--email-search-border)]',
            'rounded-xl overflow-hidden',
            'transition-all duration-200',
            'focus-within:ring-2 focus-within:ring-[var(--tenant-primary)]/20',
            'focus-within:border-[var(--tenant-primary)]/50'
          )}
        >
          <Search className="absolute left-4 h-4 w-4 text-[var(--email-text-muted)]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleSearchChange}
            placeholder="Buscar correos, contactos o etiquetas"
            className={cn(
              'w-full py-3 pl-11 pr-4',
              'bg-transparent',
              'text-sm text-[var(--email-text-primary)]',
              'placeholder:text-[var(--email-text-muted)]',
              'focus:outline-none'
            )}
          />

          {/* Keyboard shortcut hint */}
          <div className="hidden md:flex items-center gap-1 pr-4">
            <kbd
              className={cn(
                'px-1.5 py-0.5 rounded',
                'bg-[var(--email-surface-light)]',
                'text-[10px] font-medium text-[var(--email-text-muted)]',
                'border border-[var(--email-surface-border)]'
              )}
            >
              ⌘K
            </kbd>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        {/* Ask AI Button */}
        {hasAIFeature && (
          <Button
            variant="outline"
            onClick={onAskAI}
            className={cn(
              'gap-2 px-4',
              'bg-[var(--email-surface-light)]',
              'border-[var(--email-surface-border)]',
              'text-[var(--email-text-secondary)]',
              'hover:bg-[var(--email-surface-hover)]',
              'hover:text-[var(--email-text-primary)]',
              'hover:border-[var(--tenant-accent)]/50',
              'transition-all duration-200'
            )}
          >
            <Sparkles className="h-4 w-4 text-[var(--tenant-accent)]" />
            <span className="hidden sm:inline">Preguntar IA</span>
          </Button>
        )}

        {/* Compose Button */}
        <Button
          onClick={onCompose}
          className={cn(
            'gap-2 px-5',
            'bg-[var(--tenant-primary)]',
            'hover:bg-[var(--tenant-primary-hover)]',
            'text-white font-medium',
            'shadow-lg shadow-[var(--tenant-primary)]/25',
            'transition-all duration-200',
            'hover:shadow-xl hover:shadow-[var(--tenant-primary)]/30',
            'hover:scale-[1.02]'
          )}
        >
          <Send className="h-4 w-4" />
          <span className="hidden sm:inline">Redactar</span>
        </Button>
      </div>
    </header>
  );
}

export default EmailHeader;

'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Search, X, ChevronRight, ArrowRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import {
  SETTINGS_CATEGORIES,
  SEARCHABLE_ITEMS,
  searchSettings,
  getColorConfig,
  type SettingsCategory,
  type SettingsItem,
  type SearchableItem,
} from './settings-config';

interface SettingsSearchProps {
  open: boolean;
  onClose: () => void;
}

type SearchResult = SettingsItem | SettingsCategory | (SearchableItem & { parentCategory?: SettingsCategory });

export function SettingsSearch({ open, onClose }: SettingsSearchProps) {
  const [query, setQuery] = React.useState('');
  const [selectedIndex, setSelectedIndex] = React.useState(0);
  const router = useRouter();
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { primaryColor, isCustomBranding } = useTenantBranding();

  // Reset state when opening
  React.useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(0);
      // Focus input after a short delay for animation
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open]);

  // Filter results based on query
  const results = React.useMemo(() => {
    if (!query.trim()) {
      // Show main categories when no query
      return SETTINGS_CATEGORIES.slice(0, 6);
    }

    // Use the new searchSettings function for keyword-based search
    const settingsResults = searchSettings(query);

    // Also search in specific searchable items
    const q = query.toLowerCase();
    const itemMatches = SEARCHABLE_ITEMS.filter((item) =>
      item.name.toLowerCase().includes(q)
    ).map((item) => {
      const parentCategory = SETTINGS_CATEGORIES.find((c) => c.id === item.category);
      return {
        ...item,
        parentCategory,
        icon: parentCategory?.icon,
        color: parentCategory?.color,
      };
    });

    // Combine settings results with item matches, removing duplicates
    const combined: SearchResult[] = [...settingsResults];
    itemMatches.forEach((item) => {
      if (!combined.some((r) => r.href === item.href)) {
        combined.push(item);
      }
    });

    return combined.slice(0, 8);
  }, [query]);

  // Handle keyboard navigation
  React.useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex((i) => (i < results.length - 1 ? i + 1 : 0));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex((i) => (i > 0 ? i - 1 : results.length - 1));
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, results, selectedIndex, onClose]);

  // Reset selected index when results change
  React.useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  const handleSelect = (result: SearchResult) => {
    router.push(result.href);
    onClose();
    setQuery('');
  };

  const isSettingsItem = (result: SearchResult): result is SettingsItem | SettingsCategory => {
    return 'description' in result && 'id' in result;
  };

  const getResultColors = (result: SearchResult) => {
    // Check for direct hex colors first (any result type)
    if ('iconColor' in result && 'bgColor' in result && result.iconColor && result.bgColor) {
      return {
        iconColor: result.iconColor,
        bgColor: result.bgColor,
      };
    }

    // For settings items with color property
    if ('color' in result && result.color) {
      const config = getColorConfig(result.color);
      return {
        iconColor: config.iconHex,
        bgColor: config.bgHex,
      };
    }

    // For searchable items, use parent category colors
    if ('parentCategory' in result && result.parentCategory?.color) {
      const config = getColorConfig(result.parentCategory.color);
      return {
        iconColor: config.iconHex,
        bgColor: config.bgHex,
      };
    }

    // Default fallback
    const config = getColorConfig('profile');
    return {
      iconColor: config.iconHex,
      bgColor: config.bgHex,
    };
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-lg p-0 gap-0 overflow-hidden">
        <DialogTitle className="sr-only">Buscar configuracion</DialogTitle>

        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
          <Search className="w-5 h-5 text-muted-foreground flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar configuracion..."
            className="flex-1 bg-transparent text-foreground placeholder-muted-foreground outline-none text-base"
            autoComplete="off"
            autoCapitalize="off"
            autoCorrect="off"
            spellCheck={false}
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="p-1 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto p-2">
          {results.length > 0 ? (
            <div className="space-y-0.5">
              {results.map((result, index) => {
                const isSetting = isSettingsItem(result);
                const Icon = isSetting ? result.icon : result.parentCategory?.icon;
                const colors = getResultColors(result);

                return (
                  <button
                    key={result.href}
                    onClick={() => handleSelect(result)}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={cn(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-xl',
                      'text-left transition-colors',
                      index === selectedIndex
                        ? 'bg-muted'
                        : 'hover:bg-muted/50'
                    )}
                  >
                    {/* Icon with dynamic colors */}
                    {Icon && (
                      <div
                        className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ backgroundColor: colors.bgColor }}
                      >
                        <Icon
                          className="w-4 h-4"
                          style={{ color: colors.iconColor }}
                        />
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {result.name}
                      </p>
                      {isSetting && (
                        <p className="text-xs text-muted-foreground truncate">
                          {result.description}
                        </p>
                      )}
                      {!isSetting && result.parentCategory && (
                        <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                          {result.parentCategory.name}
                          <ArrowRight className="w-3 h-3" />
                          {result.name}
                        </p>
                      )}
                    </div>

                    {/* Arrow */}
                    <ChevronRight
                      className={cn(
                        'w-4 h-4 flex-shrink-0 transition-colors',
                        index === selectedIndex
                          ? !isCustomBranding ? 'text-primary' : ''
                          : 'text-muted-foreground'
                      )}
                      style={index === selectedIndex && isCustomBranding ? { color: primaryColor } : undefined}
                    />
                  </button>
                );
              })}
            </div>
          ) : query.trim() ? (
            /* Empty Search State */
            <div className="py-12 text-center">
              <div
                className={cn(
                  'w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4',
                  !isCustomBranding && 'bg-muted'
                )}
                style={isCustomBranding ? { backgroundColor: `${primaryColor}15` } : undefined}
              >
                <Search
                  className={cn('w-6 h-6', !isCustomBranding && 'text-muted-foreground')}
                  style={isCustomBranding ? { color: primaryColor } : undefined}
                />
              </div>
              <p className="text-sm font-medium text-foreground mb-1">
                Sin resultados para "{query}"
              </p>
              <p className="text-xs text-muted-foreground mb-4">
                Intenta con otras palabras clave
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {['perfil', 'equipo', 'integraciones'].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setQuery(suggestion)}
                    className="px-3 py-1.5 text-xs rounded-full bg-muted hover:bg-muted/80 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-border bg-muted/30">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">↓</kbd>
                <span className="ml-1">navegar</span>
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">↵</kbd>
                <span className="ml-1">seleccionar</span>
              </span>
            </div>
            <span className="flex items-center gap-1">
              <kbd className="px-1.5 py-0.5 bg-background rounded border border-border">esc</kbd>
              <span className="ml-1">cerrar</span>
            </span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

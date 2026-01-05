'use client';

import { Search, Settings, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenantBranding } from '@/hooks/use-tenant-branding';

interface SettingsEmptySearchProps {
  query: string;
  onClear?: () => void;
}

export function SettingsEmptySearch({ query, onClear }: SettingsEmptySearchProps) {
  const { primaryColor, isCustomBranding } = useTenantBranding();

  const suggestions = [
    { label: 'Mi Perfil', description: 'Cambiar nombre, email o avatar' },
    { label: 'Equipo', description: 'Invitar miembros y gestionar roles' },
    { label: 'Integraciones', description: 'Conectar con otras aplicaciones' },
  ];

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {/* Icon */}
      <div
        className={cn(
          'w-16 h-16 rounded-2xl flex items-center justify-center mb-6',
          !isCustomBranding && 'bg-muted'
        )}
        style={isCustomBranding ? { backgroundColor: `${primaryColor}15` } : undefined}
      >
        <Search
          className={cn('w-8 h-8', !isCustomBranding && 'text-muted-foreground')}
          style={isCustomBranding ? { color: primaryColor } : undefined}
        />
      </div>

      {/* Message */}
      <h3 className="text-lg font-semibold text-foreground mb-2">
        Sin resultados para "{query}"
      </h3>
      <p className="text-sm text-muted-foreground mb-8 max-w-md">
        No encontramos configuraciones que coincidan con tu busqueda.
        Intenta con otras palabras o explora las categorias.
      </p>

      {/* Suggestions */}
      <div className="w-full max-w-sm space-y-2">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
          Sugerencias populares
        </p>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.label}
            onClick={onClear}
            className={cn(
              'w-full flex items-center justify-between p-3 rounded-xl',
              'bg-card border border-border/50',
              'hover:border-border hover:bg-muted/50',
              'transition-colors text-left group'
            )}
          >
            <div className="flex items-center gap-3">
              <Settings className="w-4 h-4 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium text-foreground">{suggestion.label}</p>
                <p className="text-xs text-muted-foreground">{suggestion.description}</p>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:translate-x-1 transition-transform" />
          </button>
        ))}
      </div>

      {/* Clear Button */}
      {onClear && (
        <button
          onClick={onClear}
          className={cn(
            'mt-6 px-4 py-2 rounded-lg text-sm font-medium',
            'transition-colors',
            !isCustomBranding && 'text-primary hover:bg-primary/10'
          )}
          style={isCustomBranding ? { color: primaryColor } : undefined}
        >
          Limpiar busqueda
        </button>
      )}
    </div>
  );
}

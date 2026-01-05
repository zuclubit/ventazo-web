'use client';

/**
 * Settings Header - v2.0 (Homologated)
 *
 * Uses PageContainer pattern for consistency.
 * Integrates tenant branding colors.
 * Proper Spanish typography with tildes.
 */

import { Settings, Search, Command } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { Button } from '@/components/ui/button';

interface SettingsHeaderProps {
  onSearchOpen: () => void;
}

export function SettingsHeader({ onSearchOpen }: SettingsHeaderProps) {
  const { primaryColor, isCustomBranding } = useTenantBranding();

  return (
    <header
      className={cn(
        // Never shrink, maintain natural height
        'shrink-0',
        // Responsive horizontal padding
        'px-3 sm:px-4 md:px-5 lg:px-6',
        // Responsive vertical padding
        'py-3 sm:py-4',
        // Background with subtle blur
        'bg-background/80 backdrop-blur-sm',
        // Z-index for sticky
        'z-20',
        // Border
        'border-b border-border/50'
      )}
    >
      <div className="flex items-center justify-between gap-2 sm:gap-3 min-w-0">
        {/* Title Section */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          {/* Icon */}
          <div
            className={cn(
              'shrink-0',
              'p-2 sm:p-2.5 rounded-xl',
              'transition-colors duration-200',
              !isCustomBranding && 'bg-primary/10'
            )}
            style={
              isCustomBranding
                ? { backgroundColor: `${primaryColor}15` }
                : undefined
            }
          >
            <Settings
              className={cn(
                'w-5 h-5 sm:w-6 sm:h-6',
                !isCustomBranding && 'text-primary'
              )}
              style={isCustomBranding ? { color: primaryColor } : undefined}
            />
          </div>

          {/* Title */}
          <div className="min-w-0 flex-1">
            <h1 className="text-lg sm:text-xl md:text-2xl font-bold tracking-tight truncate text-foreground">
              Configuracion
            </h1>
            <p className="text-xs sm:text-sm text-muted-foreground truncate mt-0.5 hidden sm:block">
              Gestiona tu cuenta, equipo y preferencias
            </p>
          </div>
        </div>

        {/* Search Button */}
        <Button
          variant="outline"
          onClick={onSearchOpen}
          className={cn(
            'shrink-0',
            'h-9 sm:h-10',
            'px-2.5 sm:px-4',
            'gap-2',
            'bg-muted/30 hover:bg-muted/50',
            'border-border/50 hover:border-border',
            'text-muted-foreground hover:text-foreground',
            'transition-all duration-200',
            'rounded-xl'
          )}
        >
          <Search className="w-4 h-4" />
          <span className="text-sm hidden sm:inline">Buscar...</span>
          <kbd
            className={cn(
              'hidden md:inline-flex items-center gap-0.5',
              'px-1.5 py-0.5',
              'text-[10px] font-medium',
              'bg-background/80 rounded border border-border/50',
              'text-muted-foreground'
            )}
          >
            <Command className="w-2.5 h-2.5" />
            <span>K</span>
          </kbd>
        </Button>
      </div>
    </header>
  );
}

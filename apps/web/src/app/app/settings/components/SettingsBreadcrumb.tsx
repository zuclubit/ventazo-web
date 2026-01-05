'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useSettingsTheme } from '../hooks';
import { getCategoryByHref } from './settings-config';

interface SettingsBreadcrumbProps {
  className?: string;
}

export function SettingsBreadcrumb({ className }: SettingsBreadcrumbProps) {
  const pathname = usePathname();
  const { getCategoryColor, isCustomBranding } = useSettingsTheme();

  // Find the current category based on path
  const currentCategory = getCategoryByHref(pathname);

  if (!currentCategory) return null;

  const colorConfig = getCategoryColor(currentCategory.color);
  const Icon = currentCategory.icon;

  return (
    <nav className={cn('flex items-center gap-2 mb-6 text-sm', className)}>
      {/* Settings Root */}
      <Link
        href="/app/settings"
        className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
      >
        <Settings className="w-4 h-4" />
        <span>Configuracion</span>
      </Link>

      {/* Separator */}
      <ChevronRight className="w-4 h-4 text-muted-foreground/50" />

      {/* Current Category with dynamic colors */}
      <span className="flex items-center gap-1.5 text-foreground font-medium">
        <div
          className={cn(
            'w-5 h-5 rounded flex items-center justify-center',
            !isCustomBranding && colorConfig.bg
          )}
          style={isCustomBranding ? {
            backgroundColor: colorConfig.cssBg,
          } : undefined}
        >
          <Icon
            className={cn('w-3 h-3', !isCustomBranding && colorConfig.icon)}
            style={isCustomBranding ? { color: colorConfig.cssColor } : undefined}
          />
        </div>
        {currentCategory.name}
      </span>
    </nav>
  );
}

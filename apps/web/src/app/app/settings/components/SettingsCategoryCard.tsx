'use client';

import Link from 'next/link';
import { ChevronRight, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { getColorConfig, type SettingsItem, type SettingsCategory } from './settings-config';

interface SettingsCategoryCardProps {
  category: SettingsItem | SettingsCategory;
}

export function SettingsCategoryCard({ category }: SettingsCategoryCardProps) {
  const Icon = category.icon;
  const { primaryColor, isCustomBranding } = useTenantBranding();
  const colorConfig = getColorConfig(category.color);

  // Get icon and bg colors - prefer hex values from new config, fallback for old categories
  const iconColor = 'iconColor' in category ? category.iconColor : colorConfig.iconHex;
  const bgColor = 'bgColor' in category ? category.bgColor : colorConfig.bgHex;

  return (
    <Link href={category.href} className="block h-full">
      <div
        className={cn(
          'group relative flex flex-col h-full',
          'p-5 rounded-xl',
          // White background with subtle border
          'bg-white dark:bg-card',
          'border border-border/40',
          // Hover effects
          'hover:border-border hover:shadow-lg hover:-translate-y-0.5',
          'transition-all duration-200',
          'cursor-pointer'
        )}
      >
        {/* New Badge - Top Right */}
        {category.isNew && (
          <span
            className={cn(
              'absolute top-3 right-3',
              'px-2.5 py-1 text-xs font-semibold rounded-full',
              'bg-gradient-to-r from-amber-400 to-orange-500 text-white',
              'shadow-sm'
            )}
          >
            Nuevo
          </span>
        )}

        {/* Admin Lock Badge */}
        {category.requiresAdmin && !category.isNew && (
          <div className="absolute top-3 right-3">
            <Lock className="w-4 h-4 text-muted-foreground/60" />
          </div>
        )}

        {/* Icon Container */}
        <div
          className={cn(
            'w-12 h-12 rounded-xl',
            'flex items-center justify-center',
            'mb-4',
            'transition-all duration-200',
            'group-hover:scale-105'
          )}
          style={{ backgroundColor: bgColor }}
        >
          <Icon
            className="w-6 h-6 transition-transform group-hover:scale-110"
            style={{ color: iconColor }}
          />
        </div>

        {/* Content */}
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <h3
              className={cn(
                'text-base font-semibold text-foreground',
                'transition-colors duration-200'
              )}
              style={isCustomBranding ? {
                // Hover color will be primary color
              } : undefined}
            >
              {category.name}
            </h3>
            <ChevronRight
              className={cn(
                'w-4 h-4 text-muted-foreground/50',
                'transform transition-all duration-200',
                'opacity-0 -translate-x-2',
                'group-hover:opacity-100 group-hover:translate-x-0',
                !isCustomBranding && 'group-hover:text-primary'
              )}
              style={isCustomBranding ? { color: primaryColor } : undefined}
            />
          </div>

          <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
            {category.description}
          </p>
        </div>

        {/* Admin Footer */}
        {category.requiresAdmin && (
          <div className="mt-4 pt-3 border-t border-border/30">
            <span className="text-xs text-muted-foreground/70 flex items-center gap-1.5">
              <Lock className="w-3 h-3" />
              Solo administradores
            </span>
          </div>
        )}

        {/* Hover Gradient Border Effect */}
        <div
          className={cn(
            'absolute inset-0 rounded-xl opacity-0 pointer-events-none',
            'transition-opacity duration-200',
            'group-hover:opacity-100'
          )}
          style={{
            background: `linear-gradient(135deg, ${iconColor}10, transparent)`,
          }}
        />
      </div>
    </Link>
  );
}

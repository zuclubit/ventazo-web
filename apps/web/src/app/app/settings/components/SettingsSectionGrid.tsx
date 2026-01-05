'use client';

import { SettingsCategoryCard } from './SettingsCategoryCard';
import { usePermissions, type UserRole } from '@/lib/auth';
import type { SettingsSection } from './settings-config';

interface SettingsSectionGridProps {
  sections: SettingsSection[];
  showAdminSections?: boolean;
}

export function SettingsSectionGrid({ sections, showAdminSections = true }: SettingsSectionGridProps) {
  const { hasMinRole } = usePermissions();
  const isAdmin = hasMinRole('admin' as UserRole);

  return (
    <div className="space-y-8">
      {sections.map((section) => {
        // Filter items based on user permissions
        const visibleItems = section.items.filter((item) => {
          if (item.requiresAdmin) {
            return showAdminSections && isAdmin;
          }
          return true;
        });

        // Don't render empty sections
        if (visibleItems.length === 0) return null;

        return (
          <div key={section.id} className="space-y-4">
            {/* Section Title */}
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider px-1">
              {section.title}
            </h2>

            {/* Section Items Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {visibleItems.map((item) => (
                <SettingsCategoryCard key={item.id} category={item} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

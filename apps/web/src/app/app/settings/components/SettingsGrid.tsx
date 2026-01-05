'use client';

import { SettingsCategoryCard } from './SettingsCategoryCard';
import { usePermissions, type UserRole } from '@/lib/auth';
import type { SettingsCategory } from './settings-config';

interface SettingsGridProps {
  categories: SettingsCategory[];
}

export function SettingsGrid({ categories }: SettingsGridProps) {
  const { hasMinRole } = usePermissions();

  // Filter categories based on user permissions
  const visibleCategories = categories.filter((cat) => {
    if (cat.requiresAdmin) {
      return hasMinRole('admin' as UserRole);
    }
    return true;
  });

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {visibleCategories.map((category) => (
        <SettingsCategoryCard key={category.id} category={category} />
      ))}
    </div>
  );
}

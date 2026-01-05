'use client';

/**
 * Settings Page - Ventazo CRM
 *
 * Main settings hub organized by sections.
 * Features:
 * - Section-based organization (Cuenta, Empresa, Operaciones, Avanzado)
 * - Role-based filtering (admin-only items)
 * - Coherent color system per category
 * - Spanish typography with proper tildes
 */

import { SettingsSectionGrid, SETTINGS_SECTIONS, ADMIN_SECTIONS } from './components';
import { usePermissions, type UserRole } from '@/lib/auth';

export default function SettingsPage() {
  const { hasMinRole } = usePermissions();
  const isAdmin = hasMinRole('admin' as UserRole);

  // Combine all sections - admin sections only shown to admins
  const allSections = isAdmin
    ? [...SETTINGS_SECTIONS, ...ADMIN_SECTIONS]
    : SETTINGS_SECTIONS;

  return (
    <div className="space-y-2">
      {/* Section-based Grid */}
      <SettingsSectionGrid sections={allSections} showAdminSections={isAdmin} />
    </div>
  );
}

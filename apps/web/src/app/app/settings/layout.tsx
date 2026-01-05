'use client';

/**
 * Settings Layout - v2.0 (Homologated)
 *
 * Uses PageContainer pattern for consistent layout.
 * Supports tenant branding colors.
 * Global keyboard shortcut for search (Cmd+K).
 */

import * as React from 'react';
import { usePathname } from 'next/navigation';
import { PageContainer } from '@/components/layout';
import { SettingsHeader, SettingsSearch, SettingsBreadcrumb } from './components';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { cn } from '@/lib/utils';

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isRootSettings = pathname === '/app/settings';
  const [searchOpen, setSearchOpen] = React.useState(false);
  const { surfaceColor, isCustomBranding } = useTenantBranding();

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  return (
    <PageContainer variant="centered">
      {/* Header */}
      <SettingsHeader onSearchOpen={() => setSearchOpen(true)} />

      {/* Body */}
      <PageContainer.Body>
        <PageContainer.Content
          scroll="vertical"
          padding="md"
          className={cn(
            'transition-colors duration-300',
            // Use tenant surface color when custom branding is active
            isCustomBranding && '[background-color:var(--surface-color,transparent)]'
          )}
        >
          {/* Breadcrumb - Only on sub-pages */}
          {!isRootSettings && <SettingsBreadcrumb />}

          {/* Page Content */}
          {children}
        </PageContainer.Content>
      </PageContainer.Body>

      {/* Search Command Palette */}
      <SettingsSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
    </PageContainer>
  );
}

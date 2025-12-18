'use client';

import * as React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Activity, Settings, User, Users } from 'lucide-react';

import { usePermissions } from '@/lib/auth';
import { cn } from '@/lib/utils';

// ============================================
// Settings Navigation
// ============================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
  minRole?: 'owner' | 'admin' | 'manager' | 'sales_rep' | 'viewer';
}

const settingsNavItems: NavItem[] = [
  {
    href: '/app/settings/profile',
    label: 'Mi Perfil',
    icon: User,
  },
  {
    href: '/app/settings/team',
    label: 'Equipo',
    icon: Users,
    minRole: 'admin',
  },
  {
    href: '/app/settings/activity',
    label: 'Actividad',
    icon: Activity,
  },
];

// ============================================
// Settings Layout
// ============================================

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { hasMinRole } = usePermissions();

  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="border-b bg-background">
        <div className="container flex h-16 items-center px-4">
          <Settings className="mr-2 h-5 w-5" />
          <h1 className="text-lg font-semibold">Configuracion</h1>
        </div>
      </header>

      <div className="container flex-1 items-start md:grid md:grid-cols-[220px_1fr] md:gap-6 lg:grid-cols-[240px_1fr] lg:gap-10">
        {/* Sidebar Navigation */}
        <aside className="fixed top-16 z-30 -ml-2 hidden h-[calc(100vh-4rem)] w-full shrink-0 overflow-y-auto border-r md:sticky md:block">
          <nav className="grid gap-1 py-6 pr-4">
            {settingsNavItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;

              // Check permission
              if (item.minRole && !hasMinRole(item.minRole)) {
                return null;
              }

              return (
                <Link
                  key={item.href}
                  className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                  href={item.href}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex w-full flex-col overflow-hidden py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

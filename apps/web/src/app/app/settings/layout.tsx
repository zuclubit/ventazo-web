'use client';

import * as React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Activity, Columns3, Settings, User, Users, Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { usePermissions, type UserRole } from '@/lib/auth';
import { cn } from '@/lib/utils';

// ============================================
// Settings Navigation
// ============================================

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  permission?: string;
  minRole?: UserRole;
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
    href: '/app/settings/pipeline',
    label: 'Pipeline',
    icon: Columns3,
    minRole: 'admin',
  },
  {
    href: '/app/settings/activity',
    label: 'Actividad',
    icon: Activity,
  },
];

// ============================================
// Navigation Links Component
// ============================================

interface NavLinksProps {
  pathname: string;
  hasMinRole: (role: UserRole) => boolean;
  onItemClick?: () => void;
}

function NavLinks({ pathname, hasMinRole, onItemClick }: NavLinksProps) {
  return (
    <>
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
              'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
            href={item.href}
            onClick={onItemClick}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </>
  );
}

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
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  // Get current page title for mobile
  const currentPage = settingsNavItems.find((item) => pathname === item.href);
  const pageTitle = currentPage?.label || 'Configuracion';

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 sm:h-16 items-center px-4 sm:px-6 lg:px-8">
          {/* Mobile Menu Button */}
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="mr-2 md:hidden h-9 w-9"
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Abrir menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px]">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Configuracion
                </SheetTitle>
              </SheetHeader>
              <nav className="mt-6 grid gap-1">
                <NavLinks
                  pathname={pathname}
                  hasMinRole={hasMinRole}
                  onItemClick={() => setMobileNavOpen(false)}
                />
              </nav>
            </SheetContent>
          </Sheet>

          {/* Title */}
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5 hidden md:block" />
            <h1 className="text-base sm:text-lg font-semibold truncate">
              <span className="hidden md:inline">Configuracion</span>
              <span className="md:hidden">{pageTitle}</span>
            </h1>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex-1 flex flex-col md:flex-row">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:block w-56 lg:w-64 shrink-0 border-r bg-muted/30">
          <nav className="sticky top-14 sm:top-16 p-4 lg:p-6 space-y-1 max-h-[calc(100dvh-4rem)] overflow-y-auto">
            <NavLinks pathname={pathname} hasMinRole={hasMinRole} />
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-4xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

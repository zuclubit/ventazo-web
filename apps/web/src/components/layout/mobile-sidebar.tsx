'use client';

/**
 * Mobile Sidebar Component (Sheet-based)
 *
 * Premium drawer navigation for mobile viewports.
 * Used as a hamburger menu alternative with full navigation access.
 *
 * Features:
 * - Sheet drawer with glass effect
 * - Dynamic tenant branding
 * - Smooth animations
 * - Auto-close on navigation
 * - WCAG accessible
 *
 * Note: For quick access on mobile, use MobileBottomBar instead.
 * This component is for accessing the full navigation menu.
 *
 * @module components/layout/mobile-sidebar
 */

import * as React from 'react';
import { usePathname } from 'next/navigation';

import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckSquare,
  FileText,
  Home,
  Layers,
  Mail,
  Menu,
  MessageSquare,
  Settings,
  Target,
  Users,
  Wallet,
  Workflow,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useSidebar } from './sidebar-context';
import { SidebarBrand } from './sidebar-brand';
import { NavItemPremium, NavSectionHeader } from './nav-item-premium';

// ============================================
// Types
// ============================================

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
  isExternal?: boolean;
  exactMatch?: boolean;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

// ============================================
// Navigation Configuration
// ============================================

const NAVIGATION: NavSection[] = [
  {
    id: 'main',
    title: 'Principal',
    items: [
      { title: 'Dashboard', href: '/app', icon: Home, exactMatch: true },
      { title: 'Leads', href: '/app/leads', icon: Users },
      { title: 'Oportunidades', href: '/app/opportunities', icon: Target },
      { title: 'Clientes', href: '/app/customers', icon: Building2 },
      { title: 'Tareas', href: '/app/tasks', icon: CheckSquare },
    ],
  },
  {
    id: 'sales',
    title: 'Ventas',
    items: [
      { title: 'Pipeline', href: '/app/opportunities/pipeline', icon: Layers },
      { title: 'Cotizaciones', href: '/app/quotes', icon: FileText },
      { title: 'Facturación', href: '/app/settings/billing', icon: Wallet },
    ],
  },
  {
    id: 'communication',
    title: 'Comunicación',
    items: [
      { title: 'Email', href: '/app/email', icon: Mail },
      { title: 'WhatsApp', href: '/app/whatsapp', icon: MessageSquare },
      { title: 'Calendario', href: '/app/calendar', icon: Calendar },
    ],
  },
  {
    id: 'automation',
    title: 'Automatización',
    items: [
      { title: 'Workflows', href: '/app/workflows', icon: Workflow },
      { title: 'Reportes', href: '/app/reports', icon: BarChart3 },
    ],
  },
  {
    id: 'developers',
    title: 'Desarrolladores',
    items: [
      {
        title: 'API Docs',
        href:
          process.env['NEXT_PUBLIC_API_DOCS_URL'] ||
          'https://zuclubit-lead-service.fly.dev/reference',
        icon: BookOpen,
        isExternal: true,
      },
    ],
  },
];

// ============================================
// Main Component
// ============================================

export function MobileSidebar() {
  const { isMobileOpen, setMobileOpen, isMobile } = useSidebar();
  const pathname = usePathname();

  // Section open state
  const [openSections, setOpenSections] = React.useState<string[]>([
    'main',
    'sales',
  ]);

  // Close sheet on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Don't render trigger on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            'md:hidden',
            'text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text-primary)]',
            'hover:bg-[var(--sidebar-hover-bg)]',
            'focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-border)]'
          )}
          aria-label="Abrir menú de navegación"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className={cn(
          'w-[280px] p-0',
          'bg-[var(--sidebar-glass-bg)] backdrop-blur-[var(--sidebar-glass-blur)]',
          'border-r border-[var(--sidebar-divider)]'
        )}
        aria-label="Menú de navegación"
      >
        {/* Header with Brand */}
        <SheetHeader className="border-b border-[var(--sidebar-divider)] px-4 py-4">
          <SheetTitle asChild>
            <SidebarBrand isCollapsed={false} />
          </SheetTitle>
        </SheetHeader>

        {/* Navigation */}
        <ScrollArea className="h-[calc(100vh-140px)]">
          <TooltipProvider delayDuration={0}>
            <nav className="space-y-1 py-3" aria-label="Navegación principal">
              {NAVIGATION.map((section) => (
                <div key={section.id} className="px-2">
                  <NavSectionHeader
                    title={section.title}
                    isCollapsed={false}
                    isOpen={openSections.includes(section.id)}
                    onToggle={() => toggleSection(section.id)}
                  />

                  {openSections.includes(section.id) && (
                    <div className="space-y-1">
                      {section.items.map((item) => (
                        <NavItemPremium
                          key={item.href}
                          {...item}
                          isCollapsed={false}
                          onClick={() => setMobileOpen(false)}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </nav>
          </TooltipProvider>
        </ScrollArea>

        {/* Footer with Settings */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-[var(--sidebar-divider)] p-3">
          <NavItemPremium
            title="Configuración"
            href="/app/settings"
            icon={Settings}
            isCollapsed={false}
            onClick={() => setMobileOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

MobileSidebar.displayName = 'MobileSidebar';

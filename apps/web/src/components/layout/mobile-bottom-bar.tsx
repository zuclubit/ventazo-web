'use client';

/**
 * Mobile Bottom Bar Component - v2.0
 *
 * Premium bottom navigation bar for mobile devices.
 * Single source of truth for mobile navigation (no hamburger menu).
 *
 * Architecture:
 * - 4 main items always visible
 * - "Más" button opens full navigation sheet
 * - Organized by sections like desktop sidebar
 * - WCAG accessible
 *
 * @module components/layout/mobile-bottom-bar
 */

import * as React from 'react';
import Link from 'next/link';
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

import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

import { SidebarBrand } from './sidebar-brand';
import { useSidebar } from './sidebar-context';

// ============================================
// Types
// ============================================

interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  exactMatch?: boolean;
  isExternal?: boolean;
}

interface NavSection {
  id: string;
  title: string;
  items: NavItem[];
}

// ============================================
// Configuration
// ============================================

/**
 * Main bottom bar items - always visible
 * Limited to 4 items for optimal mobile UX
 */
const MAIN_NAV_ITEMS: NavItem[] = [
  { title: 'Inicio', href: '/app', icon: Home, exactMatch: true },
  { title: 'Leads', href: '/app/leads', icon: Users },
  { title: 'Ventas', href: '/app/opportunities', icon: Target },
  { title: 'Tareas', href: '/app/tasks', icon: CheckSquare },
];

/**
 * Full navigation - shown in "Más" sheet
 * Organized by sections like desktop sidebar
 */
const FULL_NAVIGATION: NavSection[] = [
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
// Active State Detection
// ============================================

function isNavItemActive(
  pathname: string,
  href: string,
  exactMatch?: boolean
): boolean {
  if (exactMatch) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ============================================
// Bottom Nav Item Component
// ============================================

interface BottomNavItemProps {
  item: NavItem;
  isActive: boolean;
}

function BottomNavItem({ item, isActive }: BottomNavItemProps) {
  return (
    <Link
      href={item.href}
      className={cn(
        'flex flex-col items-center justify-center gap-1 py-2 px-3',
        'min-w-[64px] rounded-xl transition-all duration-200',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-border)]',
        isActive
          ? 'text-[var(--sidebar-text-accent)]'
          : 'text-[var(--sidebar-text-muted)] active:scale-95'
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <div
        className={cn(
          'relative flex items-center justify-center',
          'h-8 w-8 rounded-full transition-all duration-300',
          isActive && 'bg-[var(--sidebar-active-bg)]'
        )}
      >
        <item.icon
          className={cn(
            'h-5 w-5 transition-transform duration-200',
            isActive && 'scale-110'
          )}
        />
        {/* Active indicator dot */}
        {isActive && (
          <span
            className="absolute -bottom-1 h-1 w-1 rounded-full bg-[var(--sidebar-active-border)]"
            aria-hidden="true"
          />
        )}
      </div>
      <span
        className={cn(
          'text-[10px] font-medium transition-all duration-200',
          isActive ? 'opacity-100' : 'opacity-70'
        )}
      >
        {item.title}
      </span>
    </Link>
  );
}

// ============================================
// Section Header Component
// ============================================

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  return (
    <h3 className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-[var(--sidebar-text-muted)]">
      {title}
    </h3>
  );
}

// ============================================
// Navigation Item in Sheet
// ============================================

interface SheetNavItemProps {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
}

function SheetNavItem({ item, isActive, onClose }: SheetNavItemProps) {
  const linkProps = item.isExternal
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-xl',
        'transition-all duration-200',
        'outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-border)]',
        isActive
          ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-text-accent)]'
          : 'text-[var(--sidebar-text-secondary)] active:bg-white/10 hover:bg-white/5'
      )}
      aria-current={isActive ? 'page' : undefined}
      {...linkProps}
    >
      <div
        className={cn(
          'flex items-center justify-center h-9 w-9 rounded-lg',
          'transition-colors duration-200',
          isActive
            ? 'bg-[var(--sidebar-active-border)]/20'
            : 'bg-white/5'
        )}
      >
        <item.icon className="h-5 w-5" />
      </div>
      <span className="text-sm font-medium">{item.title}</span>
    </Link>
  );
}

// ============================================
// More Menu Button
// ============================================

interface MoreMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function MoreMenu({ isOpen, onOpenChange }: MoreMenuProps) {
  const pathname = usePathname();

  // Check if any item NOT in main nav is active
  const mainHrefs = MAIN_NAV_ITEMS.map((item) => item.href);
  const isMoreActive = FULL_NAVIGATION.some((section) =>
    section.items.some(
      (item) =>
        !mainHrefs.includes(item.href) &&
        isNavItemActive(pathname, item.href, item.exactMatch)
    )
  );

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-2 px-3',
            'min-w-[64px] rounded-xl transition-all duration-200',
            'outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-border)]',
            isMoreActive || isOpen
              ? 'text-[var(--sidebar-text-accent)]'
              : 'text-[var(--sidebar-text-muted)] active:scale-95'
          )}
          aria-label="Menú completo"
          aria-expanded={isOpen}
        >
          <div
            className={cn(
              'relative flex items-center justify-center',
              'h-8 w-8 rounded-full transition-all duration-300',
              (isMoreActive || isOpen) && 'bg-[var(--sidebar-active-bg)]'
            )}
          >
            <Menu
              className={cn(
                'h-5 w-5 transition-transform duration-200',
                isOpen && 'rotate-90'
              )}
            />
          </div>
          <span
            className={cn(
              'text-[10px] font-medium transition-all duration-200',
              isMoreActive || isOpen ? 'opacity-100' : 'opacity-70'
            )}
          >
            Más
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="bottom"
        className={cn(
          'h-[85vh] rounded-t-3xl p-0',
          'bg-[var(--sidebar-glass-bg)] backdrop-blur-[var(--sidebar-glass-blur)]',
          'border-t border-[var(--sidebar-divider)]'
        )}
      >
        {/* Handle bar */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="h-1 w-10 rounded-full bg-[var(--sidebar-divider)]" />
        </div>

        {/* Header with Brand */}
        <SheetHeader className="px-4 pb-3 border-b border-[var(--sidebar-divider)]">
          <SheetTitle asChild>
            <SidebarBrand isCollapsed={false} />
          </SheetTitle>
        </SheetHeader>

        {/* Full Navigation - Scrollable */}
        <ScrollArea className="h-[calc(85vh-140px)]">
          <nav className="py-2" aria-label="Navegación completa">
            {FULL_NAVIGATION.map((section) => (
              <div key={section.id} className="px-2 mb-2">
                <SectionHeader title={section.title} />
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const isActive = isNavItemActive(
                      pathname,
                      item.href,
                      item.exactMatch
                    );
                    return (
                      <SheetNavItem
                        key={item.href}
                        item={item}
                        isActive={isActive}
                        onClose={() => onOpenChange(false)}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </ScrollArea>

        {/* Footer with Settings */}
        <div className="absolute bottom-0 left-0 right-0 p-3 pb-safe-area-inset-bottom border-t border-[var(--sidebar-divider)] bg-[var(--sidebar-glass-bg)]">
          <SheetNavItem
            item={{ title: 'Configuración', href: '/app/settings', icon: Settings }}
            isActive={isNavItemActive(pathname, '/app/settings')}
            onClose={() => onOpenChange(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// Main Component
// ============================================

export function MobileBottomBar() {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);

  // Close more menu on navigation
  React.useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Only render on mobile
  if (!isMobile) return null;

  return (
    <nav
      role="navigation"
      aria-label="Navegación móvil"
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'h-[var(--bottom-bar-height)] pb-safe-area-inset-bottom',
        'bg-[var(--bottom-bar-bg)] backdrop-blur-[var(--bottom-bar-blur)]',
        'border-t border-[var(--sidebar-divider)]',
        // Shadow for depth
        'shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.3)]'
      )}
    >
      <div className="flex h-full items-center justify-around px-2">
        {MAIN_NAV_ITEMS.map((item) => (
          <BottomNavItem
            key={item.href}
            item={item}
            isActive={isNavItemActive(pathname, item.href, item.exactMatch)}
          />
        ))}
        <MoreMenu isOpen={isMoreOpen} onOpenChange={setIsMoreOpen} />
      </div>
    </nav>
  );
}

MobileBottomBar.displayName = 'MobileBottomBar';

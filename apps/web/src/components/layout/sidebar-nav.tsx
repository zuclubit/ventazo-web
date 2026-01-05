'use client';

/**
 * Sidebar Navigation Component
 *
 * Premium 2025 navigation with glass hover states and accent colors.
 * Features proper active state detection for all routes.
 *
 * @phase FASE Y.1 - Migrated to CSS variables for dynamic tenant theming
 * @module components/layout/sidebar-nav
 */

import * as React from 'react';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  BarChart3,
  Bot,
  Calendar,
  CheckSquare,
  ChevronDown,
  Columns3,
  ExternalLink,
  FileText,
  Home,
  Mail,
  Megaphone,
  MessageSquare,
  Package,
  Settings,
  Workflow,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string;
  children?: NavItem[];
  isExternal?: boolean;
  /** If true, only match exact path (not children) */
  exactMatch?: boolean;
}

export interface NavSection {
  title: string;
  items: NavItem[];
}

// ============================================
// Navigation Configuration
// ============================================

const navigation: NavSection[] = [
  {
    title: 'Inicio',
    items: [
      { title: 'Dashboard', href: '/app', icon: Home, exactMatch: true },
      { title: 'Asistente IA', href: '/app/assistant', icon: Bot, badge: 'Nuevo' },
    ],
  },
  {
    title: 'Operaciones',
    items: [
      { title: 'Centro de Ventas', href: '/app/kanban', icon: Columns3 },
      { title: 'Cotizaciones', href: '/app/quotes', icon: FileText },
      { title: 'Tareas', href: '/app/tasks', icon: CheckSquare },
      { title: 'Calendario', href: '/app/calendar', icon: Calendar },
    ],
  },
  {
    title: 'Comunicación',
    items: [
      { title: 'Email', href: '/app/email', icon: Mail },
      { title: 'WhatsApp', href: '/app/whatsapp', icon: MessageSquare },
      { title: 'Campañas', href: '/app/campaigns', icon: Megaphone },
    ],
  },
  {
    title: 'Automatización',
    items: [
      { title: 'Workflows', href: '/app/workflows', icon: Workflow },
      { title: 'Servicios', href: '/app/services', icon: Package },
    ],
  },
  {
    title: 'Análisis',
    items: [
      { title: 'Analytics', href: '/app/analytics', icon: BarChart3 },
    ],
  },
];

// ============================================
// Helper Functions
// ============================================

/**
 * Determines if a navigation item is active based on the current pathname.
 *
 * @param pathname - Current URL pathname
 * @param href - Navigation item href
 * @param exactMatch - If true, only exact matches are considered active
 * @returns boolean indicating if the item is active
 */
function isNavItemActive(
  pathname: string,
  href: string,
  exactMatch?: boolean
): boolean {
  // External links are never active
  if (href.startsWith('http')) {
    return false;
  }

  // Exact match mode (for Dashboard at /app)
  if (exactMatch) {
    return pathname === href;
  }

  // Standard matching:
  // 1. Exact match: /app/leads === /app/leads
  // 2. Child route match: /app/leads/123 starts with /app/leads/
  return pathname === href || pathname.startsWith(`${href}/`);
}

// ============================================
// Component Props
// ============================================

interface SidebarNavProps {
  isCollapsed?: boolean;
}

// ============================================
// NavLink Component (for better organization)
// ============================================

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  isCollapsed: boolean;
}

function NavLink({ item, isActive, isCollapsed }: NavLinkProps) {
  const LinkComponent = item.isExternal ? 'a' : Link;
  const linkProps = item.isExternal
    ? { href: item.href, target: '_blank', rel: 'noopener noreferrer' }
    : { href: item.href };

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <LinkComponent {...linkProps}>
            <Button
              className={cn(
                'h-9 w-9',
                isActive
                  ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] hover:bg-[var(--sidebar-active-bg-hover)]'
                  : 'text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)]'
              )}
              size="icon"
              variant="ghost"
            >
              <item.icon className="h-4 w-4" />
              <span className="sr-only">{item.title}</span>
            </Button>
          </LinkComponent>
        </TooltipTrigger>
        <TooltipContent
          className="flex items-center gap-2 bg-[var(--sidebar-tooltip-bg)] border-[var(--sidebar-border)] text-[var(--sidebar-text)]"
          side="right"
        >
          {item.title}
          {item.isExternal && <ExternalLink className="h-3 w-3" />}
          {item.badge && (
            <span className="ml-auto rounded-full bg-gradient-to-r from-[var(--tenant-primary)] to-[var(--tenant-accent)] px-1.5 py-0.5 text-xs text-white">
              {item.badge}
            </span>
          )}
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <LinkComponent {...linkProps}>
      <Button
        className={cn(
          'w-full justify-start gap-2 transition-all duration-200',
          isActive
            ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] hover:bg-[var(--sidebar-active-bg-hover)]'
            : 'text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-[var(--sidebar-hover-bg)]'
        )}
        variant="ghost"
      >
        <item.icon
          className={cn('h-4 w-4 shrink-0', isActive && 'text-[var(--sidebar-active-text)]')}
        />
        <span className="truncate">{item.title}</span>
        {item.isExternal && (
          <ExternalLink className="ml-auto h-3 w-3 shrink-0 text-[var(--sidebar-text-muted)]" />
        )}
        {item.badge && (
          <span className="ml-auto rounded-full bg-gradient-to-r from-[var(--tenant-primary)] to-[var(--tenant-accent)] px-1.5 py-0.5 text-xs text-white shrink-0">
            {item.badge}
          </span>
        )}
      </Button>
    </LinkComponent>
  );
}

// ============================================
// Settings Link Component
// ============================================

interface SettingsLinkProps {
  isCollapsed: boolean;
  isActive: boolean;
}

function SettingsLink({ isCollapsed, isActive }: SettingsLinkProps) {
  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link href="/app/settings">
            <Button
              className={cn(
                'h-9 w-9',
                isActive
                  ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] hover:bg-[var(--sidebar-active-bg-hover)]'
                  : 'text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] hover:bg-[var(--sidebar-hover-bg)]'
              )}
              size="icon"
              variant="ghost"
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Configuración</span>
            </Button>
          </Link>
        </TooltipTrigger>
        <TooltipContent
          className="bg-[var(--sidebar-tooltip-bg)] border-[var(--sidebar-border)] text-[var(--sidebar-text)]"
          side="right"
        >
          Configuración
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href="/app/settings">
      <Button
        className={cn(
          'w-full justify-start gap-2 transition-all duration-200',
          isActive
            ? 'bg-[var(--sidebar-active-bg)] text-[var(--sidebar-active-text)] hover:bg-[var(--sidebar-active-bg-hover)]'
            : 'text-[var(--sidebar-text)] hover:text-[var(--sidebar-text-hover)] hover:bg-[var(--sidebar-hover-bg)]'
        )}
        variant="ghost"
      >
        <Settings className={cn('h-4 w-4', isActive && 'text-[var(--sidebar-active-text)]')} />
        Configuración
      </Button>
    </Link>
  );
}

// ============================================
// Main Component
// ============================================

export function SidebarNav({ isCollapsed = false }: SidebarNavProps) {
  const pathname = usePathname();
  const [openSections, setOpenSections] = React.useState<string[]>([
    'Inicio',
    'Operaciones',
  ]);

  const toggleSection = (title: string) => {
    setOpenSections((prev) =>
      prev.includes(title)
        ? prev.filter((t) => t !== title)
        : [...prev, title]
    );
  };

  // Check if settings is active
  const isSettingsActive = isNavItemActive(pathname, '/app/settings');

  return (
    <ScrollArea className="flex-1 py-2">
      <TooltipProvider delayDuration={0}>
        <nav className="grid gap-1 px-2" aria-label="Navegación principal">
          {navigation.map((section) => (
            <div key={section.title} className="mb-2">
              {/* Section Header (hidden when collapsed) */}
              {!isCollapsed && (
                <button
                  aria-controls={`section-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                  aria-expanded={openSections.includes(section.title)}
                  className="flex w-full items-center justify-between px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text)] transition-colors"
                  type="button"
                  onClick={() => toggleSection(section.title)}
                >
                  {section.title}
                  <ChevronDown
                    aria-hidden="true"
                    className={cn(
                      'h-3 w-3 transition-transform duration-200',
                      openSections.includes(section.title) && 'rotate-180'
                    )}
                  />
                </button>
              )}

              {/* Section Items */}
              {(isCollapsed || openSections.includes(section.title)) && (
                <div
                  id={`section-${section.title.toLowerCase().replace(/\s+/g, '-')}`}
                  className="grid gap-0.5"
                >
                  {section.items.map((item) => {
                    const isActive = isNavItemActive(
                      pathname,
                      item.href,
                      item.exactMatch
                    );

                    return (
                      <NavLink
                        key={item.href}
                        isActive={isActive}
                        isCollapsed={isCollapsed}
                        item={item}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </nav>
      </TooltipProvider>

      {/* Settings at bottom */}
      <div className="mt-auto border-t border-white/[0.06] px-2 pt-2">
        <SettingsLink isActive={isSettingsActive} isCollapsed={isCollapsed} />
      </div>
    </ScrollArea>
  );
}

// ============================================
// Display Names
// ============================================

SidebarNav.displayName = 'SidebarNav';
NavLink.displayName = 'NavLink';
SettingsLink.displayName = 'SettingsLink';

'use client';

/**
 * Premium Sidebar Component 2025
 *
 * Enterprise-grade sidebar with Glass Dark Neumorphic design.
 * Inspired by Slack, Linear, Raycast, and Notion aesthetics.
 *
 * Features:
 * - Glass Dark neumorphic design
 * - AI-driven navigation suggestions
 * - Dynamic tenant branding
 * - Smooth microinteractions
 * - WCAG 2.1 AA accessible
 * - AMOLED optimized
 * - 30+ items support with virtualization-ready scroll
 * - Responsive: desktop, tablet, mobile
 *
 * @module components/layout/sidebar-premium
 */

import * as React from 'react';
import { usePathname } from 'next/navigation';

import {
  BarChart3,
  BookOpen,
  Building2,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  FileText,
  Home,
  Layers,
  Mail,
  MessageSquare,
  Settings,
  Target,
  Users,
  Wallet,
  Workflow,
  Sparkles,
  Zap,
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
import { useAINavigationPriority, useBrandingCSSVars } from '@/hooks/use-tenant-branding';

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
  badgeVariant?: 'default' | 'warning' | 'success' | 'destructive';
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
// AI Quick Access Section
// ============================================

interface AIQuickAccessProps {
  isCollapsed: boolean;
  topItems: readonly string[];
}

function AIQuickAccess({ isCollapsed, topItems }: AIQuickAccessProps) {
  if (topItems.length === 0) return null;

  // Find nav items that match top items
  const quickItems: NavItem[] = [];
  for (const href of topItems.slice(0, 3)) {
    for (const section of NAVIGATION) {
      const found = section.items.find((item) => item.href === href);
      if (found) {
        quickItems.push(found);
        break;
      }
    }
  }

  if (quickItems.length === 0) return null;

  return (
    <div className="mb-2 px-2">
      {!isCollapsed && (
        <div className="flex items-center gap-2 px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span className="text-[11px] font-semibold uppercase tracking-widest text-amber-400/80">
            Acceso Rápido
          </span>
        </div>
      )}
      <div className="space-y-1">
        {quickItems.map((item) => (
          <NavItemPremium
            key={item.href}
            {...item}
            isCollapsed={isCollapsed}
            isAISuggested
          />
        ))}
      </div>
      <div
        className={cn(
          'my-3 h-px bg-[var(--sidebar-divider)]',
          isCollapsed ? 'mx-2' : 'mx-3'
        )}
      />
    </div>
  );
}

// ============================================
// Settings Item
// ============================================

interface SettingsItemProps {
  isCollapsed: boolean;
  isActive: boolean;
}

function SettingsItem({ isCollapsed, isActive }: SettingsItemProps) {
  return (
    <NavItemPremium
      title="Configuración"
      href="/app/settings"
      icon={Settings}
      isCollapsed={isCollapsed}
    />
  );
}

// ============================================
// Collapse Toggle Button
// ============================================

interface CollapseToggleProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

function CollapseToggle({ isCollapsed, onToggle }: CollapseToggleProps) {
  const Icon = isCollapsed ? ChevronRight : ChevronLeft;

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggle}
            className={cn(
              'h-10 w-10 rounded-xl',
              'text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text-primary)]',
              'hover:bg-[var(--sidebar-hover-bg)]',
              'focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-border)]'
            )}
            aria-label="Expandir sidebar"
          >
            <Icon className="h-5 w-5" />
          </Button>
        </TooltipTrigger>
        <TooltipContent
          side="right"
          sideOffset={12}
          className="border-[var(--sidebar-divider)] bg-[var(--sidebar-glass-bg)] text-[var(--sidebar-text-primary)] backdrop-blur-xl"
        >
          <div className="flex items-center gap-2">
            <span>Expandir</span>
            <kbd className="rounded bg-white/10 px-1.5 py-0.5 text-[10px] font-mono">
              ⌘B
            </kbd>
          </div>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={onToggle}
      className={cn(
        'h-9 w-9 rounded-xl shrink-0',
        'text-[var(--sidebar-text-muted)] hover:text-[var(--sidebar-text-primary)]',
        'hover:bg-[var(--sidebar-hover-bg)]',
        'focus-visible:ring-2 focus-visible:ring-[var(--sidebar-active-border)]'
      )}
      aria-label="Colapsar sidebar"
    >
      <Icon className="h-4 w-4" />
    </Button>
  );
}

// ============================================
// Main Sidebar Component
// ============================================

interface SidebarPremiumProps {
  className?: string;
}

export function SidebarPremium({ className }: SidebarPremiumProps) {
  const { isCollapsed, toggle, config } = useSidebar();
  const pathname = usePathname();
  const { getTopItems, recordAccess } = useAINavigationPriority();

  // Apply branding CSS variables
  useBrandingCSSVars();

  // Section open state
  const [openSections, setOpenSections] = React.useState<string[]>([
    'main',
    'sales',
  ]);

  // Record page access for AI navigation
  React.useEffect(() => {
    recordAccess(pathname);
  }, [pathname, recordAccess]);

  const toggleSection = (id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  };

  // Get AI-suggested top items
  const topItems = getTopItems(3);

  // Check if settings is active
  const isSettingsActive = pathname.startsWith('/app/settings');

  return (
    <aside
      role="navigation"
      aria-label="Navegación principal"
      aria-expanded={!isCollapsed}
      className={cn(
        // Position and sizing
        'fixed left-0 top-0 z-40 flex h-screen flex-col',
        // Transitions
        'transition-[width] duration-300 ease-out',
        'motion-reduce:transition-none',
        // Premium glass styling
        'backdrop-blur-[var(--sidebar-glass-blur)]',
        'bg-[var(--sidebar-glass-bg)]',
        'border-r border-[var(--sidebar-divider)]',
        // Shadows
        'shadow-[var(--sidebar-shadow-outer)]',
        '[box-shadow:var(--sidebar-shadow-inset),var(--sidebar-shadow-outer)]',
        className
      )}
      style={{
        width: isCollapsed ? config.collapsedWidth : config.expandedWidth,
      }}
    >
      {/* Header with Brand */}
      <header
        className={cn(
          'flex shrink-0 items-center border-b border-[var(--sidebar-divider)]',
          'h-[var(--sidebar-header-height)]',
          isCollapsed ? 'justify-center px-2' : 'justify-between px-4'
        )}
      >
        <SidebarBrand isCollapsed={isCollapsed} />
        {!isCollapsed && (
          <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} />
        )}
      </header>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-1" aria-label="Navegación principal">
            {/* AI Quick Access */}
            <AIQuickAccess isCollapsed={isCollapsed} topItems={topItems} />

            {/* Navigation Sections */}
            {NAVIGATION.map((section) => (
              <div key={section.id} className="px-2">
                <NavSectionHeader
                  title={section.title}
                  isCollapsed={isCollapsed}
                  isOpen={openSections.includes(section.id)}
                  onToggle={() => toggleSection(section.id)}
                />

                {(isCollapsed || openSections.includes(section.id)) && (
                  <div className="space-y-1">
                    {section.items.map((item) => (
                      <NavItemPremium
                        key={item.href}
                        {...item}
                        isCollapsed={isCollapsed}
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
      <footer
        className={cn(
          'shrink-0 border-t border-[var(--sidebar-divider)]',
          'h-[var(--sidebar-footer-height)]',
          isCollapsed ? 'px-2 py-2' : 'px-3 py-2'
        )}
      >
        <div className="flex flex-col gap-2">
          <SettingsItem isCollapsed={isCollapsed} isActive={isSettingsActive} />

          {/* Keyboard shortcut hint (expanded only) */}
          {!isCollapsed && (
            <div className="flex items-center justify-center gap-1 py-1">
              <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--sidebar-text-muted)]">
                {typeof navigator !== 'undefined' &&
                navigator.platform?.includes('Mac')
                  ? '⌘'
                  : 'Ctrl'}
              </kbd>
              <span className="text-[10px] text-[var(--sidebar-text-muted)]">
                +
              </span>
              <kbd className="rounded bg-white/5 px-1.5 py-0.5 text-[10px] font-mono text-[var(--sidebar-text-muted)]">
                B
              </kbd>
              <span className="ml-1 text-[10px] text-[var(--sidebar-text-muted)]">
                colapsar
              </span>
            </div>
          )}
        </div>

        {/* Expand button when collapsed */}
        {isCollapsed && (
          <div className="mt-2 flex justify-center">
            <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} />
          </div>
        )}
      </footer>

      {/* Subtle gradient overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.02] via-transparent to-black/10"
        aria-hidden="true"
      />
    </aside>
  );
}

SidebarPremium.displayName = 'SidebarPremium';

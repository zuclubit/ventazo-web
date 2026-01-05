'use client';

/**
 * Mobile Bottom Bar Component - v4.0
 *
 * Premium bottom navigation bar for mobile devices with full Color Intelligence integration.
 * Single source of truth for mobile navigation (no hamburger menu).
 *
 * Architecture:
 * - 4 main items always visible
 * - "Más" button opens full navigation sheet
 * - Organized by sections like desktop sidebar
 * - WCAG 3.0 Gold tier accessibility (Lc ≥ 75)
 *
 * Color Intelligence Integration:
 * - Phase 2-5 APIs: HCT, APCA, OKLCH perceptual color science
 * - Gold tier minimum (Lc ≥ 75) for all navigation elements
 * - Platinum tier (Lc ≥ 90) for active navigation indicators
 * - Auto-remediation for non-compliant colors
 * - AI-readable contracts for color decisions
 *
 * Z-Index Architecture (2025 Best Practices):
 * - Bottom bar: z-[35] (bottomBar) - always below overlays
 * - Sheet overlay: z-50 - covers bottom bar when open
 * - Sheet content: z-[60] - above everything
 *
 * @module components/layout/mobile-bottom-bar
 * @version 4.0.0
 */

import * as React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import {
  BarChart3,
  Bot,
  Calendar,
  CheckSquare,
  Columns3,
  FileText,
  Home,
  Mail,
  Megaphone,
  Menu,
  MessageSquare,
  Package,
  Settings,
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
import { zIndexClasses } from '@/lib/theme/z-index';

// ============================================
// Color Intelligence Integration
// ============================================
import {
  useBottomNavColorIntelligence,
  useBottomNavCSSVariables,
} from './hooks/useBottomNavColorIntelligence';
import {
  useBottomNavGovernance,
  useBottomNavGovernanceCSSVars,
} from './hooks/useBottomNavGovernance';

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
 * Enfocado en el flujo de ventas diario
 */
const MAIN_NAV_ITEMS: NavItem[] = [
  { title: 'Inicio', href: '/app', icon: Home, exactMatch: true },
  { title: 'Kanban', href: '/app/kanban', icon: Columns3 },
  { title: 'Cotizaciones', href: '/app/quotes', icon: FileText },
  { title: 'Tareas', href: '/app/tasks', icon: CheckSquare },
];

/**
 * Full navigation - shown in "Más" sheet
 * Organized by sections like desktop sidebar - Homologado
 */
const FULL_NAVIGATION: NavSection[] = [
  {
    id: 'inicio',
    title: 'Inicio',
    items: [
      { title: 'Dashboard', href: '/app', icon: Home, exactMatch: true },
      { title: 'Asistente IA', href: '/app/assistant', icon: Bot },
    ],
  },
  {
    id: 'operaciones',
    title: 'Operaciones',
    items: [
      { title: 'Centro de Ventas', href: '/app/kanban', icon: Columns3 },
      { title: 'Cotizaciones', href: '/app/quotes', icon: FileText },
      { title: 'Tareas', href: '/app/tasks', icon: CheckSquare },
      { title: 'Calendario', href: '/app/calendar', icon: Calendar },
    ],
  },
  {
    id: 'comunicacion',
    title: 'Comunicación',
    items: [
      { title: 'Email', href: '/app/email', icon: Mail },
      { title: 'WhatsApp', href: '/app/whatsapp', icon: MessageSquare },
      { title: 'Campañas', href: '/app/campaigns', icon: Megaphone },
    ],
  },
  {
    id: 'automatizacion',
    title: 'Automatización',
    items: [
      { title: 'Workflows', href: '/app/workflows', icon: Workflow },
      { title: 'Servicios', href: '/app/services', icon: Package },
    ],
  },
  {
    id: 'analisis',
    title: 'Análisis',
    items: [
      { title: 'Analytics', href: '/app/analytics', icon: BarChart3 },
    ],
  },
  {
    id: 'configuracion',
    title: 'Configuración',
    items: [
      { title: 'Configuración', href: '/app/settings', icon: Settings },
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
// Color Intelligence: Gold tier minimum (Lc ≥ 75)
// Active states: Platinum tier target (Lc ≥ 90)
// ============================================

interface BottomNavItemProps {
  item: NavItem;
  isActive: boolean;
}

function BottomNavItem({ item, isActive }: BottomNavItemProps) {
  // Color Intelligence integration - all colors derived perceptually
  const { items: ciColors, touch } = useBottomNavColorIntelligence();
  const { nav: govColors } = useBottomNavGovernance();

  // Use governance-validated colors (auto-remediated if needed)
  const textColor = isActive
    ? govColors.activeText.color  // Platinum tier
    : govColors.inactiveText.color;  // Gold tier

  const iconColor = isActive
    ? govColors.activeIcon.color  // Platinum tier
    : govColors.inactiveIcon.color;  // Gold tier

  return (
    <Link
      href={item.href}
      className={cn(
        'flex flex-col items-center justify-center gap-1 py-2 px-3',
        'min-w-[64px] rounded-xl transition-all duration-200',
        'outline-none focus-visible:ring-2',
        !isActive && 'active:scale-95'
      )}
      style={{
        color: textColor,
        // Focus ring uses governance-validated color
        ['--tw-ring-color' as string]: ciColors.focusRing,
      }}
      aria-current={isActive ? 'page' : undefined}
    >
      <div
        className={cn(
          'relative flex items-center justify-center',
          'h-8 w-8 rounded-full transition-all duration-300'
        )}
        style={{
          backgroundColor: isActive ? ciColors.activeBg : 'transparent',
        }}
      >
        <item.icon
          className={cn(
            'h-5 w-5 transition-transform duration-200',
            isActive && 'scale-110'
          )}
          style={{ color: iconColor }}
        />
        {/* Active indicator dot - uses brand-derived indicator color */}
        {isActive && (
          <span
            className="absolute -bottom-1 h-1 w-1 rounded-full"
            style={{ backgroundColor: ciColors.activeIndicator }}
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
// Color Intelligence: Gold tier minimum (Lc ≥ 75)
// ============================================

interface SectionHeaderProps {
  title: string;
}

function SectionHeader({ title }: SectionHeaderProps) {
  // Color Intelligence integration for sheet section headers
  const { sheet: sheetColors } = useBottomNavColorIntelligence();

  return (
    <h3
      className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider"
      style={{ color: sheetColors.sectionHeader }}
    >
      {title}
    </h3>
  );
}

// ============================================
// Navigation Item in Sheet
// Color Intelligence: Gold tier (Lc ≥ 75) for items
// Platinum tier (Lc ≥ 90) for active items
// ============================================

interface SheetNavItemProps {
  item: NavItem;
  isActive: boolean;
  onClose: () => void;
}

function SheetNavItem({ item, isActive, onClose }: SheetNavItemProps) {
  // Color Intelligence integration for sheet navigation
  const { sheet: sheetColors, items: ciColors } = useBottomNavColorIntelligence();
  const { nav: govColors } = useBottomNavGovernance();

  const linkProps = item.isExternal
    ? { target: '_blank', rel: 'noopener noreferrer' }
    : {};

  // Use governance-validated colors
  const textColor = isActive
    ? govColors.sheetActiveText.color  // Platinum tier
    : govColors.sheetText.color;  // Gold tier

  return (
    <Link
      href={item.href}
      onClick={onClose}
      className={cn(
        // Layout
        'flex items-center gap-3 px-4 py-3 rounded-xl',
        // Touch target size (minimum 44px for WCAG)
        'min-h-[48px]',
        // Transitions - smooth and responsive
        'transition-all duration-200 ease-out',
        'transform-gpu',
        // Focus states
        'outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        // Touch/press feedback (only for non-active items)
        !isActive && 'active:scale-[0.98]'
      )}
      style={{
        color: textColor,
        backgroundColor: isActive ? sheetColors.itemActiveIconBg : 'transparent',
        ['--tw-ring-color' as string]: ciColors.focusRing,
      }}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = sheetColors.itemHoverBg;
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = 'transparent';
        }
      }}
      aria-current={isActive ? 'page' : undefined}
      {...linkProps}
    >
      <div
        className={cn(
          'flex items-center justify-center h-10 w-10 rounded-xl',
          'transition-all duration-200'
        )}
        style={{
          backgroundColor: isActive ? sheetColors.itemActiveIconBg : sheetColors.itemIconBg,
          color: isActive ? govColors.sheetActiveText.color : sheetColors.itemIcon,
        }}
      >
        <item.icon className="h-5 w-5" />
      </div>
      <span className={cn(
        'text-sm font-medium',
        isActive && 'font-semibold'
      )}>
        {item.title}
      </span>
      {/* Active indicator - uses brand-derived indicator color */}
      {isActive && (
        <div
          className="ml-auto h-2 w-2 rounded-full animate-pulse"
          style={{ backgroundColor: sheetColors.itemActiveIndicator }}
        />
      )}
    </Link>
  );
}

// ============================================
// More Menu Button
// Color Intelligence: Gold tier minimum (Lc ≥ 75)
// ============================================

interface MoreMenuProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

function MoreMenu({ isOpen, onOpenChange }: MoreMenuProps) {
  const pathname = usePathname();

  // Color Intelligence integration for More menu
  const { items: ciColors, bar: barStyles, sheet: sheetColors } = useBottomNavColorIntelligence();
  const { nav: govColors } = useBottomNavGovernance();

  // Check if any item NOT in main nav is active
  const mainHrefs = MAIN_NAV_ITEMS.map((item) => item.href);
  const isMoreActive = FULL_NAVIGATION.some((section) =>
    section.items.some(
      (item) =>
        !mainHrefs.includes(item.href) &&
        isNavItemActive(pathname, item.href, item.exactMatch)
    )
  );

  // Governance-validated colors for More button
  const buttonTextColor = isMoreActive || isOpen
    ? govColors.activeText.color  // Platinum tier
    : govColors.inactiveText.color;  // Gold tier

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <button
          className={cn(
            'flex flex-col items-center justify-center gap-1 py-2 px-3',
            'min-w-[64px] rounded-xl transition-all duration-200',
            'outline-none focus-visible:ring-2',
            !(isMoreActive || isOpen) && 'active:scale-95'
          )}
          style={{
            color: buttonTextColor,
            ['--tw-ring-color' as string]: ciColors.focusRing,
          }}
          aria-label="Menú completo"
          aria-expanded={isOpen}
        >
          <div
            className={cn(
              'relative flex items-center justify-center',
              'h-8 w-8 rounded-full transition-all duration-300'
            )}
            style={{
              backgroundColor: isMoreActive || isOpen ? ciColors.activeBg : 'transparent',
            }}
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
        hideCloseButton
        accessibleTitle="Menú de navegación"
        showDragHandle
        className={cn(
          // Height constraint - leave space for bottom bar
          'max-h-[calc(100vh-var(--bottom-bar-height)-env(safe-area-inset-bottom,0px)-2rem)]',
          // Flex container for proper scroll behavior
          'flex flex-col',
          // Styling
          'rounded-t-3xl p-0'
        )}
        style={{
          // Color Intelligence glass effect for sheet
          background: barStyles.background,
          backdropFilter: `blur(${barStyles.blur})`,
          borderTop: `1px solid ${sheetColors.divider}`,
          boxShadow: '0 -8px 32px -4px rgba(0,0,0,0.25)',
        }}
      >
        {/* Header with Brand */}
        <SheetHeader
          className="px-4 pb-3"
          style={{ borderBottom: `1px solid ${sheetColors.divider}` }}
        >
          <SheetTitle asChild>
            <SidebarBrand isCollapsed={false} />
          </SheetTitle>
        </SheetHeader>

        {/* Full Navigation - Scrollable */}
        <ScrollArea className="flex-1 min-h-0 overflow-y-auto">
          <nav
            className="py-4 px-3 pb-24"
            aria-label="Navegación completa"
          >
            {FULL_NAVIGATION.map((section) => (
              <div key={section.id} className="mb-4">
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
      </SheetContent>
    </Sheet>
  );
}

// ============================================
// CSS Variable Injector Component
// Injects Color Intelligence CSS variables into the DOM
// ============================================

function ColorIntelligenceVarsInjector() {
  // Get CSS variables from both hooks
  const ciVars = useBottomNavCSSVariables();
  const govVars = useBottomNavGovernanceCSSVars();

  // Merge all CSS variables
  const allVars = React.useMemo(() => ({
    ...ciVars,
    ...govVars,
  }), [ciVars, govVars]);

  // Inject CSS variables into :root
  React.useEffect(() => {
    const root = document.documentElement;
    const varsToCleanup: string[] = [];

    // Set all CSS variables
    Object.entries(allVars).forEach(([key, value]) => {
      if (value) {
        root.style.setProperty(key, value);
        varsToCleanup.push(key);
      }
    });

    // Cleanup on unmount
    return () => {
      varsToCleanup.forEach((key) => {
        root.style.removeProperty(key);
      });
    };
  }, [allVars]);

  return null;
}

// ============================================
// Main Component
// Color Intelligence: Full perceptual color integration
// WCAG 3.0 Gold tier minimum (Lc ≥ 75)
// ============================================

export function MobileBottomBar() {
  const { isMobile } = useSidebar();
  const pathname = usePathname();
  const [isMoreOpen, setIsMoreOpen] = React.useState(false);

  // Color Intelligence integration for bar container
  const { bar: barStyles } = useBottomNavColorIntelligence();
  const { conformanceLevel, conformanceScore } = useBottomNavGovernance();

  // Close more menu on navigation
  React.useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Only render on mobile
  if (!isMobile) return null;

  return (
    <>
      {/* Inject Color Intelligence CSS variables */}
      <ColorIntelligenceVarsInjector />

      <nav
        role="navigation"
        aria-label="Navegación móvil"
        className={cn(
          // z-[35] (bottomBar) - below sheet overlays (z-50) so modals cover it properly
          'fixed bottom-0 left-0 right-0',
          zIndexClasses.bottomBar,
          'h-[var(--bottom-bar-height)] pb-safe-area-inset-bottom'
        )}
        style={{
          // Color Intelligence glass effect - all colors derived perceptually
          background: barStyles.background,
          backdropFilter: `blur(${barStyles.blur})`,
          WebkitBackdropFilter: `blur(${barStyles.blur})`,
          borderTop: `1px solid ${barStyles.border}`,
          boxShadow: barStyles.shadow,
        }}
        // Accessibility data attributes for WCAG 3.0 conformance
        data-conformance-level={conformanceLevel}
        data-conformance-score={conformanceScore}
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
    </>
  );
}

MobileBottomBar.displayName = 'MobileBottomBar';

// ============================================
// Export conformance utilities for testing
// ============================================

export { useBottomNavColorIntelligence, useBottomNavGovernance };

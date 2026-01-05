'use client';

/**
 * Premium Sidebar Component 2025 - Homologado
 *
 * Enterprise-grade sidebar with Glass Dark Neumorphic design.
 * Inspired by Slack, Linear, Raycast, and Notion aesthetics.
 *
 * Features:
 * - Glass Dark neumorphic design
 * - Dynamic tenant branding
 * - Smooth microinteractions
 * - WCAG 2.1 AA accessible
 * - AMOLED optimized
 * - Collapsible sections with localStorage persistence
 * - Single active state (no duplicates)
 * - Responsive: desktop, tablet, mobile
 *
 * v2.0 - Color Intelligence Integration
 * - HCT tonal palettes for navigation states
 * - APCA-validated text/icon colors
 * - Smart Glass gradients for glass effects
 * - Semantic color derivation for badges
 * - OKLCH interpolation for smooth transitions
 *
 * @module components/layout/sidebar-premium
 */

import * as React from 'react';
import { usePathname } from 'next/navigation';

import {
  BarChart3,
  Calendar,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Columns3,
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
import { useBrandingCSSVars } from '@/hooks/use-tenant-branding';
import type { ConformanceLevel } from '@/lib/color-intelligence';

import { useSidebar } from './sidebar-context';
import { SidebarBrand } from './sidebar-brand';
import { NavItemPremium, NavSectionHeader } from './nav-item-premium';
import {
  // Unified Color System v2.0 (replaces legacy hooks)
  useSidebarColorSystem,
  useSidebarCSSInjection,
  // Legacy hooks kept for backward compatibility
  useSidebarConformanceReport,
} from './hooks';

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
// Navigation Configuration - Homologada
// ============================================

/**
 * Arquitectura de navegación optimizada:
 * - Flujo natural del embudo de ventas
 * - Secciones colapsables con persistencia
 * - Un solo item activo a la vez
 * - Basado en análisis de funcionalidades reales
 */
const NAVIGATION: NavSection[] = [
  {
    id: 'inicio',
    title: 'Inicio',
    items: [
      { title: 'Dashboard', href: '/app', icon: Home, exactMatch: true },
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
];

// ============================================
// Sections Persistence Hook
// ============================================

const SECTIONS_STORAGE_KEY = 'ventazo-sidebar-sections';

function useSectionsPersistence(defaultOpen: string[] = ['inicio', 'operaciones']) {
  const [openSections, setOpenSections] = React.useState<string[]>(() => {
    if (typeof window === 'undefined') return defaultOpen;
    try {
      const stored = localStorage.getItem(SECTIONS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : defaultOpen;
    } catch {
      return defaultOpen;
    }
  });

  // Persist to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify(openSections));
      } catch {
        // Ignore storage errors
      }
    }
  }, [openSections]);

  const toggleSection = React.useCallback((id: string) => {
    setOpenSections((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]
    );
  }, []);

  const isSectionOpen = React.useCallback(
    (id: string) => openSections.includes(id),
    [openSections]
  );

  return { openSections, toggleSection, isSectionOpen };
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
// Conformance Indicator (Dev Mode)
// ============================================

// Note: ConformanceLevel imported at top of file
// ConformanceLevel: 'Bronze' | 'Silver' | 'Gold' | 'Platinum' (capitalized)

interface ConformanceIndicatorProps {
  level: ConformanceLevel;
  score: number;
  passRate: number;
}

// Use capitalized keys to match ConformanceLevel type from color-intelligence
const CONFORMANCE_COLORS: Record<ConformanceLevel, { bg: string; text: string; border: string }> = {
  Bronze: { bg: 'rgba(205, 127, 50, 0.15)', text: '#CD7F32', border: 'rgba(205, 127, 50, 0.3)' },
  Silver: { bg: 'rgba(192, 192, 192, 0.15)', text: '#C0C0C0', border: 'rgba(192, 192, 192, 0.3)' },
  Gold: { bg: 'rgba(255, 215, 0, 0.15)', text: '#FFD700', border: 'rgba(255, 215, 0, 0.3)' },
  Platinum: { bg: 'rgba(229, 228, 226, 0.15)', text: '#E5E4E2', border: 'rgba(229, 228, 226, 0.3)' },
} as const;

function ConformanceIndicator({ level, score, passRate }: ConformanceIndicatorProps) {
  const colors = CONFORMANCE_COLORS[level];
  const levelLabel = level; // Already capitalized

  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <div
          className="flex items-center justify-center gap-1.5 rounded-md px-2 py-1 transition-colors cursor-help"
          style={{
            backgroundColor: colors.bg,
            borderColor: colors.border,
            borderWidth: '1px',
            borderStyle: 'solid',
          }}
          aria-label={`WCAG 3.0 Conformance: ${levelLabel} (${score.toFixed(0)}%)`}
        >
          <span
            className="text-[9px] font-semibold uppercase tracking-wider"
            style={{ color: colors.text }}
          >
            {levelLabel}
          </span>
          <span
            className="text-[9px] font-mono"
            style={{ color: colors.text, opacity: 0.8 }}
          >
            {score.toFixed(0)}%
          </span>
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="right"
        sideOffset={12}
        className="max-w-[280px] border-[var(--sidebar-divider)] bg-[var(--sidebar-glass-bg)] text-[var(--sidebar-text-primary)] backdrop-blur-xl"
      >
        <div className="space-y-2 p-1">
          <div className="text-xs font-medium">WCAG 3.0 Conformance</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
            <span className="text-[var(--sidebar-text-muted)]">Level:</span>
            <span className="font-medium" style={{ color: colors.text }}>{levelLabel}</span>
            <span className="text-[var(--sidebar-text-muted)]">Score:</span>
            <span className="font-mono">{score.toFixed(1)}%</span>
            <span className="text-[var(--sidebar-text-muted)]">Pass Rate:</span>
            <span className="font-mono">{(passRate * 100).toFixed(0)}%</span>
          </div>
          <div className="border-t border-[var(--sidebar-divider)] pt-2 text-[9px] text-[var(--sidebar-text-muted)]">
            Color Intelligence v5.0 • APCA Validated
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
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

  // Apply branding CSS variables (tenant colors)
  useBrandingCSSVars();

  // ============================================
  // Color Intelligence v5.0 Unified Integration
  // ============================================
  // Single hook replaces:
  // - useSidebarColorIntelligence()
  // - useSidebarCSSVariables()
  // - useSidebarGovernanceCSSVars()
  //
  // Features:
  // - HCT tonal palettes for navigation states
  // - APCA-validated text/icon colors (Gold/Platinum tiers)
  // - Smart Glass gradients via generateSmartGlassGradient()
  // - Active AuditTrailService for compliance
  // - Single-source CSS variables injection
  // ============================================

  const {
    glass,
    ambient,
    isDarkSidebar,
    nav,
    governance,
    conformanceLevel,
  } = useSidebarColorSystem();

  // Auto-inject all CSS variables to :root
  // This sets --sidebar-text, --sidebar-icon, --sidebar-glass-*, etc.
  useSidebarCSSInjection();

  // Get conformance report for debugging/monitoring
  const conformance = useSidebarConformanceReport();

  // Section open state with localStorage persistence
  const { toggleSection, isSectionOpen } = useSectionsPersistence([
    'inicio',
    'operaciones',
  ]);

  // Check if settings is active
  const isSettingsActive = pathname.startsWith('/app/settings');

  return (
    <aside
      role="navigation"
      aria-label="Navegación principal"
      aria-expanded={!isCollapsed}
      className={cn(
        // Position and sizing - z-[60] ensures sidebar is above Sheet overlays (z-50)
        'fixed left-0 top-0 z-[60] flex h-screen flex-col',
        // Transitions
        'transition-[width] duration-300 ease-out',
        'motion-reduce:transition-none',
        // Premium glass styling - Enhanced with Color Intelligence
        'backdrop-blur-[var(--sidebar-ci-glass-blur,var(--sidebar-glass-blur))]',
        'bg-[var(--sidebar-ci-glass-bg,var(--sidebar-glass-bg))]',
        'border-r border-[var(--sidebar-ci-glass-border,var(--sidebar-divider))]',
        // Shadows - Color Intelligence enhanced
        'shadow-[var(--sidebar-ci-shadow-outer,var(--sidebar-shadow-outer))]',
        className
      )}
      style={{
        width: isCollapsed ? config.collapsedWidth : config.expandedWidth,
        // Apply Color Intelligence glass styles as inline fallbacks
        // These CSS custom properties serve as fallbacks if CSS injection fails
        ...(glass && {
          '--ci-glass-bg': glass.gradient,
          '--ci-glass-border': glass.border,
          '--ci-shadow-outer': glass.shadow,
        } as React.CSSProperties),
      }}
    >
      {/* Header with Brand */}
      <header
        className={cn(
          'flex shrink-0 items-center border-b border-[var(--sidebar-divider)]',
          'h-[var(--sidebar-header-height)]',
          isCollapsed ? 'flex-col justify-center gap-2 px-2 py-3' : 'justify-between px-4'
        )}
      >
        <SidebarBrand isCollapsed={isCollapsed} />
        {/* Toggle button - always visible */}
        <CollapseToggle isCollapsed={isCollapsed} onToggle={toggle} />
      </header>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <TooltipProvider delayDuration={0}>
          <nav className="space-y-1" aria-label="Navegación principal">
            {/* Navigation Sections - Sin duplicados */}
            {NAVIGATION.map((section) => (
              <div key={section.id} className="px-2">
                <NavSectionHeader
                  title={section.title}
                  isCollapsed={isCollapsed}
                  isOpen={isSectionOpen(section.id)}
                  onToggle={() => toggleSection(section.id)}
                />

                {(isCollapsed || isSectionOpen(section.id)) && (
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

          {/* Conformance indicator (dev mode only) */}
          {process.env.NODE_ENV === 'development' && !isCollapsed && (
            <ConformanceIndicator
              level={conformance.level}
              score={conformance.score}
              passRate={conformance.passRate}
            />
          )}
        </div>
      </footer>

      {/* Color Intelligence enhanced gradient overlay for depth */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: glass?.highlight || 'linear-gradient(180deg, rgba(255,255,255,0.02) 0%, transparent 50%)',
        }}
        aria-hidden="true"
      />

      {/* Color Intelligence inner shadow for neumorphic depth */}
      <div
        className="pointer-events-none absolute inset-0 rounded-r-lg"
        style={{
          // Inner shadow for neumorphic depth - CSS variable with fallback
          boxShadow: 'var(--sidebar-shadow-inset, inset 0 1px 0 rgba(255,255,255,0.03))',
        }}
        aria-hidden="true"
      />
    </aside>
  );
}

SidebarPremium.displayName = 'SidebarPremium';

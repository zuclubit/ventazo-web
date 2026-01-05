'use client';

/**
 * Dashboard Shell Component - v3.0
 *
 * Premium 2025 layout wrapper using CSS Grid architecture.
 * Provides bulletproof containment for all internal CRM pages.
 *
 * v3.0 Changes:
 * - Dynamic theming using tenant CSS variables
 * - GPU-accelerated background with will-change optimization
 * - Color-derived gradients from --tenant-* variables
 * - Memoized for performance
 *
 * Architecture:
 * - CSS Grid for main layout (sidebar + content area)
 * - Flexbox for internal component arrangement
 * - Proper height containment chain (dvh → 100% → flex-1 → min-h-0)
 * - Isolated scroll contexts to prevent overflow leaks
 *
 * Layout Structure:
 * ┌─────────────────────────────────────────────────────┐
 * │                    [root - grid]                    │
 * │ ┌──────────┬────────────────────────────────────┐   │
 * │ │          │          [navbar - sticky]          │   │
 * │ │ sidebar  ├────────────────────────────────────┤   │
 * │ │ (fixed)  │                                    │   │
 * │ │          │           [main - flex]            │   │
 * │ │          │              ↓                     │   │
 * │ │          │         [children]                 │   │
 * │ └──────────┴────────────────────────────────────┘   │
 * └─────────────────────────────────────────────────────┘
 *
 * @module components/layout/dashboard-shell
 */

import * as React from 'react';

import { cn } from '@/lib/utils';

import { Navbar } from './navbar';
import { Sidebar } from './sidebar';
import { MobileBottomBar } from './mobile-bottom-bar';
import { SidebarProvider, useSidebar } from './sidebar-context';

// ============================================
// Premium Background Component - Dynamic Theming v3.0
// ============================================

/**
 * Dynamic background that responds to tenant branding colors.
 * Uses CSS variables set by TenantThemeProvider:
 * - --tenant-sidebar: Base dark color for gradient
 * - --tenant-surface: Mid-tone for gradient
 * - --tenant-primary: Accent for atmospheric glows
 *
 * Memoized to prevent unnecessary re-renders.
 */
const PremiumDashboardBackground = React.memo(function PremiumDashboardBackground() {
  return (
    <div className="premium-dashboard-bg fixed inset-0 -z-10 overflow-hidden pointer-events-none will-change-[background]">
      {/* Base Gradient - Uses tenant CSS variables */}
      <div
        className="absolute inset-0 transition-[background] duration-500"
        style={{
          background: `linear-gradient(
            165deg,
            color-mix(in srgb, var(--tenant-sidebar) 100%, black 15%) 0%,
            var(--tenant-sidebar) 25%,
            var(--tenant-surface) 50%,
            var(--tenant-sidebar) 75%,
            color-mix(in srgb, var(--tenant-sidebar) 100%, black 15%) 100%
          )`,
        }}
      />

      {/* Subtle Atmospheric Glows - Derived from tenant primary */}
      <div className="absolute inset-0">
        <div
          className="absolute -right-60 -top-60 h-[500px] w-[500px] rounded-full blur-[150px] transition-[background] duration-500"
          style={{
            background: 'color-mix(in srgb, var(--tenant-primary) 8%, transparent)',
          }}
        />
        <div
          className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full blur-[120px] transition-[background] duration-500"
          style={{
            background: 'color-mix(in srgb, var(--tenant-accent) 6%, transparent)',
          }}
        />
      </div>

      {/* Noise Texture - Adds subtle depth */}
      <div
        className="absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
});

PremiumDashboardBackground.displayName = 'PremiumDashboardBackground';

// ============================================
// Main Content Area Component
// ============================================

interface MainContentProps {
  children: React.ReactNode;
  className?: string;
}

function MainContent({ children, className }: MainContentProps) {
  const { currentWidth, isMobile } = useSidebar();

  // CRITICAL FIX: Suppress transition during initial hydration
  // This prevents the animated gap when localStorage state is read
  const [hasMounted, setHasMounted] = React.useState(false);

  React.useEffect(() => {
    // Small delay to ensure layout has stabilized after hydration
    const timer = requestAnimationFrame(() => {
      setHasMounted(true);
    });
    return () => cancelAnimationFrame(timer);
  }, []);

  return (
    <div
      className={cn(
        // Grid area assignment
        'col-start-2 col-end-3 row-start-1 row-end-2',
        // Flex container for navbar + main
        'flex flex-col',
        // CRITICAL: Full height from grid, no overflow here
        'h-full',
        // Prevent any overflow at this level
        'overflow-hidden',
        // Smooth transition for sidebar toggle - ONLY after initial mount
        // This prevents the animated gap during hydration
        hasMounted && 'transition-[margin-left] duration-300 ease-in-out',
        'motion-reduce:transition-none',
        className
      )}
      style={{
        // Dynamic margin based on sidebar state
        // On mobile: no margin (sidebar is sheet overlay)
        // On desktop: margin matches sidebar width
        marginLeft: isMobile ? 0 : currentWidth,
        // CSS custom properties for child components
        '--content-offset': isMobile ? '0px' : `${currentWidth}px`,
        '--sidebar-current-width': `${currentWidth}px`,
      } as React.CSSProperties}
    >
      {/* Navbar - Fixed height, sticky behavior */}
      <Navbar className="shrink-0" />

      {/*
        Main Area Container
        This is where page content lives.
        CRITICAL: Uses flex-1 with min-h-0 for proper containment.
        Overflow is HIDDEN here - children must manage their own scroll.
      */}
      <main
        className={cn(
          // Flex behavior - fill remaining space
          'relative flex-1',
          // CRITICAL: min-h-0 allows flex item to shrink below content size
          'min-h-0',
          // Also need min-w-0 for horizontal containment
          'min-w-0',
          // Overflow hidden - children manage their own scroll
          'overflow-hidden',
          // Display as flex column for nested flex children
          'flex flex-col',
          // Mobile bottom bar padding
          isMobile && 'pb-[var(--bottom-bar-height)]'
        )}
      >
        {children}
      </main>
    </div>
  );
}

// ============================================
// Dashboard Shell Component
// ============================================

interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <SidebarProvider>
      <DashboardShellContent className={className}>
        {children}
      </DashboardShellContent>
    </SidebarProvider>
  );
}

// ============================================
// Inner Content (inside SidebarProvider)
// ============================================

interface DashboardShellContentProps {
  children: React.ReactNode;
  className?: string;
}

function DashboardShellContent({
  children,
  className,
}: DashboardShellContentProps) {
  const { isMobile } = useSidebar();

  return (
    <div
      className={cn(
        // CRITICAL: Root container uses CSS Grid for layout
        'grid',
        // Grid template: sidebar column (auto width) + content column (remaining)
        // Sidebar is fixed position, so it doesn't participate in grid flow
        // but we still define the template for semantic clarity
        'grid-cols-1',
        'grid-rows-1',
        // CRITICAL: Use dvh for proper mobile viewport handling
        // dvh excludes mobile browser chrome (address bar)
        'h-dvh max-h-dvh',
        // Width constraints
        'w-full max-w-full',
        // CRITICAL: overflow-hidden at root prevents any body scroll
        'overflow-hidden',
        // Relative for stacking context
        'relative',
        className
      )}
    >
      {/* Premium Background - z-index: -10 */}
      <PremiumDashboardBackground />

      {/* Sidebar - Fixed positioned, hidden on mobile (uses sheet) */}
      {!isMobile && <Sidebar />}

      {/* Main content area with dynamic margin */}
      <MainContent>{children}</MainContent>

      {/* Mobile Bottom Navigation Bar */}
      {isMobile && <MobileBottomBar />}
    </div>
  );
}

// ============================================
// Display Names
// ============================================

DashboardShell.displayName = 'DashboardShell';
MainContent.displayName = 'MainContent';
DashboardShellContent.displayName = 'DashboardShellContent';
PremiumDashboardBackground.displayName = 'PremiumDashboardBackground';

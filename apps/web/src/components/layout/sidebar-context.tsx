'use client';

/**
 * Sidebar Context
 *
 * Global state management for sidebar across the application.
 * Enables synchronized behavior between desktop and mobile views.
 *
 * Features:
 * - Collapse/expand state for desktop
 * - Open/close state for mobile sheet
 * - Configurable widths
 * - CSS custom properties for theming
 * - LocalStorage persistence
 * - Keyboard shortcuts support
 *
 * @module components/layout/sidebar-context
 */

import * as React from 'react';

import { useMediaQuery } from '@/hooks/use-media-query';

// ============================================
// Types
// ============================================

export interface SidebarConfig {
  /** Width when collapsed (px) */
  collapsedWidth: number;
  /** Width when expanded (px) */
  expandedWidth: number;
  /** Breakpoint for mobile view */
  mobileBreakpoint: string;
  /** Enable keyboard shortcut (Cmd/Ctrl + B) */
  enableKeyboardShortcut: boolean;
  /** Persist state to localStorage */
  persistState: boolean;
  /** LocalStorage key */
  storageKey: string;
}

export interface SidebarState {
  /** Whether sidebar is collapsed (desktop only) */
  isCollapsed: boolean;
  /** Whether mobile sheet is open */
  isMobileOpen: boolean;
  /** Whether currently on mobile viewport */
  isMobile: boolean;
}

export interface SidebarActions {
  /** Toggle collapsed state */
  toggle: () => void;
  /** Collapse the sidebar */
  collapse: () => void;
  /** Expand the sidebar */
  expand: () => void;
  /** Set mobile sheet open state */
  setMobileOpen: (open: boolean) => void;
  /** Toggle mobile sheet */
  toggleMobile: () => void;
}

export interface SidebarContextValue extends SidebarState, SidebarActions {
  /** Configuration */
  config: SidebarConfig;
  /** Current width in pixels */
  currentWidth: number;
  /** CSS variable value for width */
  cssWidth: string;
}

// ============================================
// Default Configuration
// ============================================

const DEFAULT_CONFIG: SidebarConfig = {
  collapsedWidth: 64,
  expandedWidth: 256,
  mobileBreakpoint: '(min-width: 768px)',
  enableKeyboardShortcut: true,
  persistState: true,
  storageKey: 'ventazo-sidebar-state',
};

// ============================================
// Context
// ============================================

const SidebarContext = React.createContext<SidebarContextValue | null>(null);

// ============================================
// Provider Component
// ============================================

interface SidebarProviderProps {
  children: React.ReactNode;
  /** Override default configuration */
  config?: Partial<SidebarConfig>;
  /** Default collapsed state */
  defaultCollapsed?: boolean;
}

export function SidebarProvider({
  children,
  config: configOverride,
  defaultCollapsed = false,
}: SidebarProviderProps) {
  const config = React.useMemo(
    () => ({ ...DEFAULT_CONFIG, ...configOverride }),
    [configOverride]
  );

  // Check if we're on desktop
  const isDesktop = useMediaQuery(config.mobileBreakpoint);
  const isMobile = !isDesktop;

  // Initialize collapsed state
  const [isCollapsed, setIsCollapsed] = React.useState<boolean>(() => {
    // Only run on client
    if (typeof window === 'undefined') return defaultCollapsed;

    if (config.persistState) {
      try {
        const stored = localStorage.getItem(config.storageKey);
        if (stored !== null) {
          return JSON.parse(stored);
        }
      } catch {
        // Ignore parse errors
      }
    }
    return defaultCollapsed;
  });

  // Mobile sheet state
  const [isMobileOpen, setIsMobileOpen] = React.useState(false);

  // Persist state to localStorage
  React.useEffect(() => {
    if (config.persistState && typeof window !== 'undefined') {
      try {
        localStorage.setItem(config.storageKey, JSON.stringify(isCollapsed));
      } catch {
        // Ignore storage errors
      }
    }
  }, [isCollapsed, config.persistState, config.storageKey]);

  // Close mobile sheet when switching to desktop
  React.useEffect(() => {
    if (isDesktop && isMobileOpen) {
      setIsMobileOpen(false);
    }
  }, [isDesktop, isMobileOpen]);

  // Keyboard shortcut (Cmd/Ctrl + B)
  React.useEffect(() => {
    if (!config.enableKeyboardShortcut) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        if (isMobile) {
          setIsMobileOpen((prev) => !prev);
        } else {
          setIsCollapsed((prev) => !prev);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [config.enableKeyboardShortcut, isMobile]);

  // Calculate current width
  const currentWidth = React.useMemo(() => {
    if (isMobile) return 0; // Mobile uses sheet, no sidebar width
    return isCollapsed ? config.collapsedWidth : config.expandedWidth;
  }, [isMobile, isCollapsed, config.collapsedWidth, config.expandedWidth]);

  // CSS variable value
  const cssWidth = `${currentWidth}px`;

  // Apply CSS custom property to document
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      document.documentElement.style.setProperty('--sidebar-width', cssWidth);
      document.documentElement.style.setProperty(
        '--sidebar-collapsed-width',
        `${config.collapsedWidth}px`
      );
      document.documentElement.style.setProperty(
        '--sidebar-expanded-width',
        `${config.expandedWidth}px`
      );
    }
  }, [cssWidth, config.collapsedWidth, config.expandedWidth]);

  // Actions
  const actions = React.useMemo<SidebarActions>(
    () => ({
      toggle: () => setIsCollapsed((prev) => !prev),
      collapse: () => setIsCollapsed(true),
      expand: () => setIsCollapsed(false),
      setMobileOpen: (open: boolean) => setIsMobileOpen(open),
      toggleMobile: () => setIsMobileOpen((prev) => !prev),
    }),
    []
  );

  // Context value
  const value = React.useMemo<SidebarContextValue>(
    () => ({
      isCollapsed,
      isMobileOpen,
      isMobile,
      config,
      currentWidth,
      cssWidth,
      ...actions,
    }),
    [isCollapsed, isMobileOpen, isMobile, config, currentWidth, cssWidth, actions]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

// ============================================
// Hooks
// ============================================

/**
 * Hook to access sidebar context.
 * Must be used within a SidebarProvider.
 */
export function useSidebar(): SidebarContextValue {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

/**
 * Hook to access sidebar context optionally.
 * Returns null if not within a SidebarProvider.
 */
export function useSidebarOptional(): SidebarContextValue | null {
  return React.useContext(SidebarContext);
}

// ============================================
// Display Name
// ============================================

SidebarProvider.displayName = 'SidebarProvider';

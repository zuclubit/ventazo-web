'use client';

/**
 * PageContainer Component - v2.0
 *
 * Standardized layout container for all app pages.
 * Provides bulletproof containment, spacing, and responsive behavior.
 *
 * Design Philosophy:
 * - "Fill available space" via flex-1 + min-h-0
 * - Single scroll context per page (no nested scrollbars)
 * - CSS containment flows from parent (DashboardShell)
 * - Slots pattern for flexible content areas
 *
 * Height Chain (CRITICAL):
 * DashboardShell (h-dvh) → main (flex-1 min-h-0) → PageContainer (flex-1 min-h-0)
 *   → PageBody (flex-1 min-h-0) → PageContent (flex-1 min-h-0 overflow-auto)
 *
 * Usage:
 * ```tsx
 * <PageContainer>
 *   <PageContainer.Header>
 *     <PageContainer.HeaderRow>
 *       <PageContainer.Title>Title</PageContainer.Title>
 *       <PageContainer.Actions>...</PageContainer.Actions>
 *     </PageContainer.HeaderRow>
 *   </PageContainer.Header>
 *   <PageContainer.Body>
 *     <PageContainer.Content scroll="vertical">
 *       <YourContent />
 *     </PageContainer.Content>
 *   </PageContainer.Body>
 * </PageContainer>
 * ```
 *
 * For full-bleed Kanban:
 * ```tsx
 * <PageContainer variant="full-bleed">
 *   <PageContainer.Header bordered>
 *     ...
 *   </PageContainer.Header>
 *   <PageContainer.Body>
 *     <PageContainer.Content scroll="horizontal">
 *       <KanbanBoard />
 *     </PageContainer.Content>
 *   </PageContainer.Body>
 * </PageContainer>
 * ```
 *
 * @module components/layout/page-container
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

type PageVariant = 'default' | 'full-bleed' | 'centered';
type ScrollBehavior = 'vertical' | 'horizontal' | 'both' | 'none';

interface PageContainerProps {
  children: React.ReactNode;
  /** Layout variant */
  variant?: PageVariant;
  /** Additional CSS classes */
  className?: string;
}

interface PageHeaderProps {
  children: React.ReactNode;
  /** Sticky header on scroll */
  sticky?: boolean;
  /** Show border at bottom */
  bordered?: boolean;
  /** Additional CSS classes */
  className?: string;
}

interface PageContentProps {
  children: React.ReactNode;
  /** Scroll behavior */
  scroll?: ScrollBehavior;
  /** Padding size */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  /** Additional CSS classes */
  className?: string;
}

interface PageSidebarProps {
  children: React.ReactNode;
  /** Position of sidebar */
  position?: 'left' | 'right';
  /** Width of sidebar */
  width?: 'sm' | 'md' | 'lg' | 'auto';
  /** Show on mobile (default: false) */
  showOnMobile?: boolean;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Context
// ============================================

interface PageContainerContextValue {
  variant: PageVariant;
}

const PageContainerContext = React.createContext<PageContainerContextValue>({
  variant: 'default',
});

// ============================================
// Main Container
// ============================================

function PageContainerRoot({
  children,
  variant = 'default',
  className,
}: PageContainerProps) {
  return (
    <PageContainerContext.Provider value={{ variant }}>
      <div
        className={cn(
          // CRITICAL: Flex column to stack header + body
          'flex flex-col',
          // CRITICAL: Fill all available space from parent (main)
          'flex-1',
          // CRITICAL: Allow shrinking below content size
          'min-h-0 min-w-0',
          // Fill width
          'w-full',
          // No overflow at this level - children handle scroll
          'overflow-hidden',
          // Variant-specific max-width
          variant === 'centered' && 'max-w-7xl mx-auto',
          className
        )}
      >
        {children}
      </div>
    </PageContainerContext.Provider>
  );
}

// ============================================
// Header Slot
// ============================================

function PageHeader({
  children,
  sticky = false,
  bordered = true,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        // Never shrink, maintain natural height
        'shrink-0',
        // Responsive horizontal padding
        'px-3 sm:px-4 md:px-5 lg:px-6',
        // Responsive vertical padding
        'py-2.5 sm:py-3 md:py-4',
        // Background with contrast for dark mode - uses header-container pattern
        'bg-background backdrop-blur-sm',
        // Z-index for sticky
        'z-20',
        // Sticky behavior
        sticky && 'sticky top-0',
        // Border - always visible in both themes
        bordered && 'border-b border-border',
        className
      )}
    >
      {children}
    </header>
  );
}

// ============================================
// Body Layout (Content + Optional Sidebar)
// ============================================

interface PageBodyProps {
  children: React.ReactNode;
  className?: string;
}

function PageBody({ children, className }: PageBodyProps) {
  return (
    <div
      className={cn(
        // CRITICAL: Flex row for content + optional sidebar
        'flex flex-row',
        // CRITICAL: Fill remaining space
        'flex-1',
        // CRITICAL: Allow shrinking below content size
        'min-h-0 min-w-0',
        // No overflow at body level - Content handles scroll
        'overflow-hidden',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// Content Slot
// ============================================

function PageContent({
  children,
  scroll = 'vertical',
  padding = 'md',
  className,
}: PageContentProps) {
  const { variant } = React.useContext(PageContainerContext);

  // Scroll behavior classes
  const scrollStyles: Record<ScrollBehavior, string> = {
    vertical: 'overflow-y-auto overflow-x-hidden',
    horizontal: 'overflow-x-auto overflow-y-hidden',
    both: 'overflow-auto',
    none: 'overflow-hidden',
  };

  // Padding based on variant and scroll direction
  const getPadding = () => {
    if (variant === 'full-bleed') {
      // Full-bleed: minimal padding, handle horizontal scroll differently
      if (scroll === 'horizontal') {
        // Only vertical padding for horizontal scroll (content goes edge-to-edge)
        return 'py-2 sm:py-3';
      }
      return 'p-2 sm:p-3';
    }
    // Default padding for non-full-bleed
    const paddingStyles: Record<string, string> = {
      none: 'p-0',
      sm: 'p-2 sm:p-3',
      md: 'p-3 sm:p-4 md:p-5 lg:p-6',
      lg: 'p-4 sm:p-5 md:p-6 lg:p-8',
    };
    return paddingStyles[padding];
  };

  return (
    <div
      className={cn(
        // CRITICAL: Fill remaining space
        'flex-1',
        // CRITICAL: Allow shrinking - THIS IS THE KEY
        'min-h-0 min-w-0',
        // Scroll behavior
        scrollStyles[scroll],
        // iOS momentum scrolling
        '-webkit-overflow-scrolling-touch',
        // Padding
        getPadding(),
        // Relative for positioned children
        'relative',
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// Sidebar Slot (for preview panels)
// ============================================

function PageSidebar({
  children,
  position = 'right',
  width = 'md',
  showOnMobile = false,
  className,
}: PageSidebarProps) {
  const widthStyles: Record<string, string> = {
    sm: 'w-72',
    md: 'w-80 lg:w-96',
    lg: 'w-96 lg:w-[28rem]',
    auto: 'w-auto',
  };

  return (
    <aside
      className={cn(
        // Never shrink width
        'shrink-0',
        // Width
        widthStyles[width],
        // CRITICAL: Full height with overflow
        'h-full overflow-y-auto overflow-x-hidden',
        // Border based on position
        position === 'right' && 'border-l border-border/50',
        position === 'left' && 'border-r border-border/50',
        // Order based on position
        position === 'left' && 'order-first',
        position === 'right' && 'order-last',
        // Mobile visibility
        !showOnMobile && 'hidden lg:flex lg:flex-col',
        // Flex column for content
        'flex flex-col',
        className
      )}
    >
      {children}
    </aside>
  );
}

// ============================================
// Row Layout (for header content)
// ============================================

interface PageHeaderRowProps {
  children: React.ReactNode;
  className?: string;
}

function PageHeaderRow({ children, className }: PageHeaderRowProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between',
        'gap-2 sm:gap-3',
        'min-w-0', // Allow text truncation
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// Title Component
// ============================================

interface PageTitleProps {
  children: React.ReactNode;
  subtitle?: React.ReactNode;
  className?: string;
}

function PageTitle({ children, subtitle, className }: PageTitleProps) {
  return (
    <div className={cn('min-w-0 flex-1', className)}>
      {/* Uses page-title class for guaranteed visibility in dark mode with dynamic theming */}
      <h1 className="page-title truncate">
        {children}
      </h1>
      {subtitle && (
        <p className="page-subtitle truncate mt-0.5">
          {subtitle}
        </p>
      )}
    </div>
  );
}

// ============================================
// Actions Container
// ============================================

interface PageActionsProps {
  children: React.ReactNode;
  className?: string;
}

function PageActions({ children, className }: PageActionsProps) {
  return (
    <div
      className={cn(
        'flex items-center',
        'gap-1.5 sm:gap-2',
        'shrink-0', // Never shrink actions
        className
      )}
    >
      {children}
    </div>
  );
}

// ============================================
// Compound Component Export
// ============================================

export const PageContainer = Object.assign(PageContainerRoot, {
  Header: PageHeader,
  HeaderRow: PageHeaderRow,
  Title: PageTitle,
  Actions: PageActions,
  Body: PageBody,
  Content: PageContent,
  Sidebar: PageSidebar,
});

// Named exports for flexibility
export {
  PageHeader,
  PageHeaderRow,
  PageTitle,
  PageActions,
  PageBody,
  PageContent,
  PageSidebar,
};

// Type exports
export type {
  PageContainerProps,
  PageHeaderProps,
  PageContentProps,
  PageSidebarProps,
  PageVariant,
  ScrollBehavior,
};

'use client';

/**
 * Sidebar Component
 *
 * Premium 2025 glassmorphism sidebar navigation with dynamic tenant branding.
 * Features collapsible design with smooth transitions and AI-driven navigation.
 *
 * Variants:
 * - Desktop: Full sidebar with collapsible state
 * - Tablet: Compact sidebar with reduced width
 * - Mobile: Bottom navigation bar
 *
 * Features:
 * - Dynamic tenant logo/name/colors
 * - AI-driven quick access based on usage
 * - Glass Dark neumorphic design
 * - Smooth microinteractions
 * - WCAG 2.1 AA accessible
 * - AMOLED optimized
 *
 * @module components/layout/sidebar
 */

import * as React from 'react';

import { cn } from '@/lib/utils';
import { useBrandingCSSVars } from '@/hooks/use-tenant-branding';

import { useSidebar } from './sidebar-context';
import { SidebarPremium } from './sidebar-premium';

// ============================================
// Types
// ============================================

interface SidebarProps {
  className?: string;
}

// ============================================
// Main Sidebar Component
// ============================================

/**
 * Main Sidebar Export
 *
 * Renders the premium sidebar for desktop/tablet.
 * Mobile uses MobileBottomBar instead.
 */
export function Sidebar({ className }: SidebarProps) {
  const { isMobile } = useSidebar();

  // Apply branding CSS variables globally
  useBrandingCSSVars();

  // Don't render desktop sidebar on mobile (use MobileBottomBar instead)
  if (isMobile) {
    return null;
  }

  return <SidebarPremium className={className} />;
}

Sidebar.displayName = 'Sidebar';

// Note: Premium components are exported directly via layout/index.ts
// to avoid duplicate export conflicts

'use client';

/**
 * Sidebar Component
 *
 * Premium 2025 glassmorphism sidebar navigation.
 * Features collapsible design with smooth transitions.
 * Uses SidebarContext for synchronized state management.
 *
 * Features:
 * - Collapsible with smooth transitions
 * - Synchronized with DashboardShell via context
 * - CSS custom properties for dynamic widths
 * - Accessibility: ARIA labels, keyboard navigation
 * - Reduced motion support
 * - Integrated Ventazo brand logo
 *
 * @module components/layout/sidebar
 */

import * as React from 'react';

import Image from 'next/image';
import Link from 'next/link';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useSidebar } from './sidebar-context';
import { SidebarNav } from './sidebar-nav';

// ============================================
// Types
// ============================================

interface SidebarProps {
  className?: string;
}

// ============================================
// Sidebar Logo Component
// ============================================

interface SidebarLogoProps {
  isCollapsed: boolean;
}

function SidebarLogo({ isCollapsed }: SidebarLogoProps) {
  const logoContent = (
    <div
      className={cn(
        'group flex items-center',
        isCollapsed ? 'justify-center' : 'gap-3'
      )}
    >
      {/* Logo image with organic glow */}
      <div className="relative shrink-0">
        {/* Ambient glow - organic shape */}
        <div
          className="absolute inset-0 bg-[#0EB58C]/40 blur-lg transition-all group-hover:bg-[#0EB58C]/50 group-hover:blur-xl"
          style={{ borderRadius: '40% 60% 55% 45% / 55% 45% 55% 45%' }}
        />
        {/* Logo image */}
        <Image
          priority
          alt="Ventazo logo"
          className="relative object-contain drop-shadow-lg transition-transform group-hover:scale-105"
          height={isCollapsed ? 32 : 36}
          src="/images/hero/logo.png"
          width={isCollapsed ? 32 : 36}
        />
      </div>
      {/* Brand text */}
      {!isCollapsed && (
        <span className="text-lg font-bold text-white transition-colors group-hover:text-[#5EEAD4] whitespace-nowrap overflow-hidden">
          Ventazo
        </span>
      )}
    </div>
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <Link
            className="outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4] rounded-lg"
            href="/app"
          >
            {logoContent}
          </Link>
        </TooltipTrigger>
        <TooltipContent
          className="bg-[#052828] border-white/10 text-white"
          side="right"
        >
          Ir al Dashboard
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link
      className="outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4] rounded-lg"
      href="/app"
    >
      {logoContent}
    </Link>
  );
}

// ============================================
// Sidebar Component
// ============================================

export function Sidebar({ className }: SidebarProps) {
  const { isCollapsed, collapse, expand, config } = useSidebar();

  return (
    <aside
      aria-label="Navegación principal"
      aria-expanded={!isCollapsed}
      className={cn(
        // Base styles
        'fixed left-0 top-0 z-40 flex h-screen flex-col',
        // Transitions with reduced-motion support
        'transition-[width] duration-300 ease-in-out',
        'motion-reduce:transition-none',
        // Premium glass styling
        'backdrop-blur-xl bg-[#041A1A]/80',
        'border-r border-white/[0.06]',
        className
      )}
      role="navigation"
      style={{
        width: isCollapsed ? config.collapsedWidth : config.expandedWidth,
      }}
    >
      {/* Header with Logo */}
      <div
        className={cn(
          'flex h-16 shrink-0 items-center border-b border-white/[0.06] px-3',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <SidebarLogo isCollapsed={isCollapsed} />

        {!isCollapsed && (
          <Button
            aria-label="Colapsar sidebar"
            className="h-8 w-8 shrink-0 text-[#6B7A7D] hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#5EEAD4]"
            size="icon"
            variant="ghost"
            onClick={collapse}
          >
            <PanelLeftClose className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Navigation */}
      <SidebarNav isCollapsed={isCollapsed} />

      {/* Collapse/Expand toggle when collapsed */}
      {isCollapsed && (
        <div className="shrink-0 border-t border-white/[0.06] p-2">
          <Tooltip delayDuration={0}>
            <TooltipTrigger asChild>
              <Button
                aria-label="Expandir sidebar"
                className="h-9 w-9 text-[#6B7A7D] hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#5EEAD4]"
                size="icon"
                variant="ghost"
                onClick={expand}
              >
                <PanelLeftOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent
              className="bg-[#052828] border-white/10 text-white"
              side="right"
            >
              Expandir sidebar (⌘B)
            </TooltipContent>
          </Tooltip>
        </div>
      )}

      {/* Keyboard shortcut hint */}
      {!isCollapsed && (
        <div className="shrink-0 border-t border-white/[0.06] px-4 py-2">
          <p className="text-[10px] text-[#6B7A7D] text-center">
            <kbd className="px-1 py-0.5 bg-white/5 rounded text-[#94A3AB]">
              {typeof navigator !== 'undefined' &&
              navigator.platform?.includes('Mac')
                ? '⌘'
                : 'Ctrl'}
            </kbd>
            {' + '}
            <kbd className="px-1 py-0.5 bg-white/5 rounded text-[#94A3AB]">
              B
            </kbd>
            {' para colapsar'}
          </p>
        </div>
      )}
    </aside>
  );
}

Sidebar.displayName = 'Sidebar';
SidebarLogo.displayName = 'SidebarLogo';

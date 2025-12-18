'use client';

/**
 * Sidebar Component
 *
 * Premium 2025 glassmorphism sidebar navigation.
 * Features collapsible design with smooth transitions.
 *
 * @module components/layout/sidebar
 */

import * as React from 'react';

import Link from 'next/link';

import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import { SidebarNav } from './sidebar-nav';

interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = React.useState(false);

  return (
    <aside
      className={cn(
        // Base styles
        'fixed left-0 top-0 z-40 flex h-screen flex-col transition-all duration-300',
        // Premium glass styling
        'backdrop-blur-xl bg-[#041A1A]/80',
        'border-r border-white/[0.06]',
        // Width
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex h-16 items-center border-b border-white/[0.06] px-4',
          isCollapsed ? 'justify-center' : 'justify-between'
        )}
      >
        <Link
          className={cn(
            'flex items-center gap-2',
            isCollapsed && 'justify-center'
          )}
          href="/app"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[#0D9488] to-[#2DD4BF] shadow-lg shadow-[#0D9488]/25">
            <span className="text-lg font-bold text-white">V</span>
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-white">
              Ventazo
            </span>
          )}
        </Link>

        {!isCollapsed && (
          <Button
            className="h-8 w-8 text-[#6B7A7D] hover:text-white hover:bg-white/10"
            size="icon"
            variant="ghost"
            onClick={() => setIsCollapsed(true)}
          >
            <PanelLeftClose className="h-4 w-4" />
            <span className="sr-only">Colapsar sidebar</span>
          </Button>
        )}
      </div>

      {/* Navigation */}
      <SidebarNav isCollapsed={isCollapsed} />

      {/* Collapse/Expand toggle when collapsed */}
      {isCollapsed && (
        <div className="border-t border-white/[0.06] p-2">
          <Button
            className="h-9 w-9 text-[#6B7A7D] hover:text-white hover:bg-white/10"
            size="icon"
            variant="ghost"
            onClick={() => setIsCollapsed(false)}
          >
            <PanelLeftOpen className="h-4 w-4" />
            <span className="sr-only">Expandir sidebar</span>
          </Button>
        </div>
      )}
    </aside>
  );
}

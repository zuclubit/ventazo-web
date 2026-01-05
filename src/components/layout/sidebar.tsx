'use client';

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
        'fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar transition-all duration-300',
        isCollapsed ? 'w-16' : 'w-64',
        className
      )}
    >
      {/* Header */}
      <div
        className={cn(
          'flex h-16 items-center border-b px-4',
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
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-ventazo-500 to-ventazo-600 shadow-md">
            <span className="text-lg font-bold text-white">V</span>
          </div>
          {!isCollapsed && (
            <span className="text-lg font-bold text-sidebar-foreground">
              Ventazo
            </span>
          )}
        </Link>

        {!isCollapsed && (
          <Button
            className="h-8 w-8"
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
        <div className="border-t p-2">
          <Button
            className="h-9 w-9"
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

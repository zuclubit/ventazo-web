'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

import { Navbar } from './navbar';
import { Sidebar } from './sidebar';

interface DashboardShellProps {
  children: React.ReactNode;
  className?: string;
}

export function DashboardShell({ children, className }: DashboardShellProps) {
  return (
    <div className="relative flex min-h-screen">
      {/* Sidebar - hidden on mobile, visible on md+ */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col md:pl-64">
        <Navbar />
        <main
          className={cn(
            'flex-1 space-y-4 p-4 md:p-6 lg:p-8',
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

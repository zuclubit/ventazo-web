'use client';

/**
 * Dashboard Shell Component
 *
 * Premium 2025 layout wrapper for all internal CRM pages.
 * Features atmospheric background, glass sidebar, and glass navbar.
 *
 * @module components/layout/dashboard-shell
 */

import * as React from 'react';

import { cn } from '@/lib/utils';

import { Navbar } from './navbar';
import { Sidebar } from './sidebar';

// ============================================
// Premium Background Component
// ============================================

function PremiumDashboardBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden">
      {/* Base Gradient */}
      <div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(165deg, #041A1A 0%, #052828 25%, #063030 50%, #052828 75%, #041A1A 100%)',
        }}
      />

      {/* Subtle Atmospheric Glows - Less intense for dashboard */}
      <div className="pointer-events-none absolute inset-0">
        {/* Top-right teal glow */}
        <div className="absolute -right-60 -top-60 h-[500px] w-[500px] rounded-full bg-[#0D9488]/8 blur-[150px]" />
        {/* Bottom-left accent */}
        <div className="absolute -bottom-40 -left-40 h-[400px] w-[400px] rounded-full bg-[#14B8A6]/6 blur-[120px]" />
      </div>

      {/* Noise Texture - Very subtle */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.012]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
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
    <div className="relative flex min-h-screen">
      {/* Premium Background */}
      <PremiumDashboardBackground />

      {/* Sidebar - hidden on mobile, visible on md+ */}
      <div className="hidden md:block">
        <Sidebar />
      </div>

      {/* Main content area */}
      <div className="flex flex-1 flex-col md:pl-64">
        <Navbar />
        <main
          className={cn(
            'relative flex-1 space-y-4 p-4 md:p-6 lg:p-8',
            className
          )}
        >
          {children}
        </main>
      </div>
    </div>
  );
}

'use client';

/**
 * Mobile Sidebar Component
 *
 * Sheet-based navigation drawer for mobile viewports.
 * Uses SidebarContext for synchronized state management.
 *
 * Features:
 * - Sheet drawer that slides from left
 * - Auto-closes on navigation
 * - Synchronized with desktop sidebar via context
 * - Accessible with proper ARIA labels
 * - Integrated Ventazo brand logo
 *
 * @module components/layout/mobile-sidebar
 */

import * as React from 'react';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { useSidebar } from './sidebar-context';
import { SidebarNav } from './sidebar-nav';

// ============================================
// Mobile Logo Component
// ============================================

interface MobileLogoProps {
  onClose: () => void;
}

function MobileLogo({ onClose }: MobileLogoProps) {
  return (
    <Link
      className="group flex items-center gap-3 outline-none focus-visible:ring-2 focus-visible:ring-[#5EEAD4] rounded-lg"
      href="/app"
      onClick={onClose}
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
          height={36}
          src="/images/hero/logo.png"
          width={36}
        />
      </div>
      {/* Brand text */}
      <span className="text-lg font-bold text-white transition-colors group-hover:text-[#5EEAD4]">
        Ventazo
      </span>
    </Link>
  );
}

// ============================================
// Mobile Sidebar Component
// ============================================

export function MobileSidebar() {
  const { isMobileOpen, setMobileOpen, isMobile } = useSidebar();
  const pathname = usePathname();

  // Close sheet on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname, setMobileOpen]);

  // Don't render trigger on desktop
  if (!isMobile) {
    return null;
  }

  return (
    <Sheet open={isMobileOpen} onOpenChange={setMobileOpen}>
      <SheetTrigger asChild>
        <Button
          aria-label="Abrir menú de navegación"
          className="md:hidden text-[#6B7A7D] hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#5EEAD4]"
          size="icon"
          variant="ghost"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent
        aria-label="Menú de navegación"
        className="w-64 p-0 bg-[#041A1A]/95 backdrop-blur-xl border-r border-white/[0.06]"
        side="left"
      >
        <SheetHeader className="border-b border-white/[0.06] px-4 py-4">
          <SheetTitle className="text-left">
            <MobileLogo onClose={() => setMobileOpen(false)} />
          </SheetTitle>
        </SheetHeader>
        <div className="flex h-[calc(100vh-65px)] flex-col">
          <SidebarNav isCollapsed={false} />
        </div>
      </SheetContent>
    </Sheet>
  );
}

MobileSidebar.displayName = 'MobileSidebar';
MobileLogo.displayName = 'MobileLogo';

'use client';

import * as React from 'react';

import Link from 'next/link';

import { Menu } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';

import { SidebarNav } from './sidebar-nav';

export function MobileSidebar() {
  const [open, setOpen] = React.useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button className="md:hidden" size="icon" variant="ghost">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Abrir menú</span>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-64 p-0" side="left">
        <SheetHeader className="border-b px-4 py-4">
          <SheetTitle>
            <Link
              className="flex items-center gap-2"
              href="/app"
              onClick={() => setOpen(false)}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-ventazo-500 to-ventazo-600 shadow-md">
                <span className="text-lg font-bold text-white">
                  V
                </span>
              </div>
              <span className="text-lg font-bold">Ventazo</span>
            </Link>
          </SheetTitle>
        </SheetHeader>
        <div className="flex h-[calc(100vh-65px)] flex-col" onClick={() => setOpen(false)}>
          <SidebarNav />
        </div>
      </SheetContent>
    </Sheet>
  );
}

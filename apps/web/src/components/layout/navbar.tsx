'use client';

/**
 * Navbar Component
 *
 * Premium 2025 glassmorphism navigation bar.
 * Features theme toggle, notifications, and user menu.
 *
 * Features:
 * - Glassmorphism styling
 * - Mobile sidebar trigger (via context)
 * - Search with glass styling
 * - Theme toggle (dark/light)
 * - Notifications dropdown
 * - User profile menu
 * - Responsive design
 *
 * @module components/layout/navbar
 */

import * as React from 'react';

import Link from 'next/link';

import { Bell, Moon, Search, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

import { MobileSidebar } from './mobile-sidebar';

// ============================================
// Types
// ============================================

interface NavbarProps {
  className?: string;
}

// ============================================
// Navbar Component
// ============================================

export function Navbar({ className }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 px-4',
        'backdrop-blur-xl bg-[#041A1A]/60',
        'border-b border-white/[0.06]',
        className
      )}
      role="banner"
    >
      {/* Mobile menu trigger */}
      <MobileSidebar />

      {/* Search - Glass styling */}
      <div className="flex flex-1 items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-2.5 h-4 w-4 text-[#6B7A7D]"
          />
          <Input
            aria-label="Buscar leads, clientes..."
            className="w-full pl-9 glass-input text-white placeholder:text-[#6B7A7D] focus-visible:ring-2 focus-visible:ring-[#5EEAD4]"
            placeholder="Buscar leads, clientes..."
            type="search"
          />
        </div>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        {mounted && (
          <Button
            aria-label={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            className="text-[#6B7A7D] hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#5EEAD4]"
            size="icon"
            variant="ghost"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Ver notificaciones"
              className="relative text-[#6B7A7D] hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#5EEAD4]"
              size="icon"
              variant="ghost"
            >
              <Bell className="h-5 w-5" />
              <Badge
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs bg-gradient-to-r from-[#F97316] to-[#FB923C] flex items-center justify-center"
                variant="destructive"
              >
                3
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-80 bg-[#052828]/95 backdrop-blur-xl border-white/10"
          >
            <DropdownMenuLabel className="text-white">
              Notificaciones
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 focus:bg-white/10">
              <p className="text-sm font-medium text-white">
                Nuevo lead asignado
              </p>
              <p className="text-xs text-[#94A3AB]">
                María García fue asignada a tu cartera
              </p>
              <span className="text-xs text-[#6B7A7D]">Hace 5 minutos</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 focus:bg-white/10">
              <p className="text-sm font-medium text-white">
                Recordatorio de seguimiento
              </p>
              <p className="text-xs text-[#94A3AB]">
                Llamar a Juan Pérez - Cotización pendiente
              </p>
              <span className="text-xs text-[#6B7A7D]">Hace 1 hora</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 focus:bg-white/10">
              <p className="text-sm font-medium text-white">
                Oportunidad ganada
              </p>
              <p className="text-xs text-[#94A3AB]">
                Contrato firmado con TechCorp - $50,000 MXN
              </p>
              <span className="text-xs text-[#6B7A7D]">Hace 2 horas</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="justify-center text-sm text-[#5EEAD4] focus:bg-white/10 focus:text-[#5EEAD4]">
              Ver todas las notificaciones
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Menú de usuario"
              className="relative h-9 w-9 rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[#5EEAD4]"
              variant="ghost"
            >
              <Avatar className="h-9 w-9 ring-2 ring-white/10 hover:ring-[#5EEAD4]/30 transition-all">
                <AvatarFallback className="bg-gradient-to-br from-[#0D9488] to-[#2DD4BF] text-white">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-56 bg-[#052828]/95 backdrop-blur-xl border-white/10"
          >
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-white">
                  Carlos Rodríguez
                </p>
                <p className="text-xs text-[#94A3AB]">carlos@empresa.com</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              asChild
              className="text-[#94A3AB] focus:bg-white/10 focus:text-white"
            >
              <Link href="/app/profile">Mi Perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="text-[#94A3AB] focus:bg-white/10 focus:text-white"
            >
              <Link href="/app/settings">Configuración</Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="text-[#94A3AB] focus:bg-white/10 focus:text-white"
            >
              <Link href="/app/settings/team">Equipo</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="text-red-400 focus:bg-white/10 focus:text-red-300">
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

Navbar.displayName = 'Navbar';

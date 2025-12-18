'use client';

/**
 * Navbar Component
 *
 * Premium 2025 glassmorphism navigation bar.
 * Features theme toggle, notifications, and user menu.
 *
 * @module components/layout/navbar
 */

import * as React from 'react';

import Link from 'next/link';

import { Bell, Moon, Search, Sun, User } from 'lucide-react';
import { useTheme } from 'next-themes';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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

import { MobileSidebar } from './mobile-sidebar';

interface NavbarProps {
  className?: string;
}

export function Navbar({ className }: NavbarProps) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  // Avoid hydration mismatch
  React.useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <header
      className={`sticky top-0 z-30 flex h-16 items-center gap-4 px-4 backdrop-blur-xl bg-[#041A1A]/60 border-b border-white/[0.06] ${className}`}
    >
      {/* Mobile menu trigger */}
      <MobileSidebar />

      {/* Search - Glass styling */}
      <div className="flex flex-1 items-center gap-2">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#6B7A7D]" />
          <Input
            className="w-full pl-9 glass-input text-white placeholder:text-[#6B7A7D]"
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
            size="icon"
            variant="ghost"
            className="text-[#6B7A7D] hover:text-white hover:bg-white/10"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
            <span className="sr-only">Cambiar tema</span>
          </Button>
        )}

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="relative text-[#6B7A7D] hover:text-white hover:bg-white/10" size="icon" variant="ghost">
              <Bell className="h-5 w-5" />
              <Badge
                className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs bg-gradient-to-r from-[#F97316] to-[#FB923C]"
                variant="destructive"
              >
                3
              </Badge>
              <span className="sr-only">Notificaciones</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notificaciones</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
              <p className="text-sm font-medium">Nuevo lead asignado</p>
              <p className="text-xs text-muted-foreground">
                María García fue asignada a tu cartera
              </p>
              <span className="text-xs text-muted-foreground">
                Hace 5 minutos
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
              <p className="text-sm font-medium">Recordatorio de seguimiento</p>
              <p className="text-xs text-muted-foreground">
                Llamar a Juan Pérez - Cotización pendiente
              </p>
              <span className="text-xs text-muted-foreground">
                Hace 1 hora
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3">
              <p className="text-sm font-medium">Oportunidad ganada</p>
              <p className="text-xs text-muted-foreground">
                Contrato firmado con TechCorp - $50,000 MXN
              </p>
              <span className="text-xs text-muted-foreground">
                Hace 2 horas
              </span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="justify-center text-sm text-primary">
              Ver todas las notificaciones
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button className="relative h-9 w-9 rounded-full hover:bg-white/10" variant="ghost">
              <Avatar className="h-9 w-9 ring-2 ring-white/10 hover:ring-[#5EEAD4]/30 transition-all">
                <AvatarImage alt="Usuario" src="/avatars/default.png" />
                <AvatarFallback className="bg-gradient-to-br from-[#0D9488] to-[#2DD4BF] text-white">
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium">Carlos Rodríguez</p>
                <p className="text-xs text-muted-foreground">
                  carlos@empresa.com
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/app/profile">Mi Perfil</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/settings">Configuración</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/app/settings/team">Equipo</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

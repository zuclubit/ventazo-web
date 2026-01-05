'use client';

/**
 * Navbar Component
 *
 * Premium 2025 glassmorphism navigation bar.
 * Features notifications and user menu with dynamic branding.
 *
 * Features:
 * - Dynamic tenant branding colors
 * - Glassmorphism styling
 * - Mobile sidebar trigger (via context)
 * - Global search with Cmd+K shortcut
 * - Notifications dropdown
 * - User profile menu
 * - Responsive design
 *
 * @module components/layout/navbar
 */

import * as React from 'react';

import Link from 'next/link';

import { Bell, Command, LogOut, Search, Settings, User, Users } from 'lucide-react';

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
import { cn } from '@/lib/utils';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import { useAuth } from '@/components/auth/auth-provider';
import { useUserManagement } from '@/lib/users';
import { GlobalSearchDialog } from '@/components/search';

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
  const branding = useTenantBranding();
  const { user, logout } = useAuth();
  const { profile } = useUserManagement();
  const [searchOpen, setSearchOpen] = React.useState(false);

  // Global keyboard shortcut for search (Cmd+K / Ctrl+K)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen(true);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Get user initials for avatar fallback
  const getInitials = () => {
    if (profile?.fullName) {
      return profile.fullName
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
    }
    return user?.email?.[0]?.toUpperCase() || 'U';
  };

  // Dynamic styles using CSS variables (set by useBrandingCSSVars)
  const accentStyle = {
    '--navbar-accent': 'var(--sidebar-text-accent, var(--brand-accent))',
  } as React.CSSProperties;

  return (
    <header
      className={cn(
        'sticky top-0 z-30 flex h-16 shrink-0 items-center gap-4 px-4',
        'backdrop-blur-xl bg-[var(--sidebar-glass-bg)]/60',
        'border-b border-white/[0.06]',
        className
      )}
      style={accentStyle}
      role="banner"
    >
      {/* Search Button - Opens GlobalSearchDialog */}
      <div className="flex flex-1 items-center gap-2">
        <button
          onClick={() => setSearchOpen(true)}
          className={cn(
            'flex items-center gap-2 w-full max-w-[clamp(200px,40vw,384px)] px-3 py-2 rounded-xl',
            'glass-input text-[var(--sidebar-text-muted)]',
            'hover:text-[var(--sidebar-text-secondary)] hover:border-[var(--sidebar-text-accent)]/30',
            'transition-all duration-200 cursor-pointer'
          )}
          aria-label="Abrir busqueda global"
        >
          <Search className="h-4 w-4 flex-shrink-0" />
          <span className="flex-1 text-left text-sm hidden sm:block">
            Buscar leads, clientes...
          </span>
          <span className="text-sm sm:hidden">Buscar...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-[10px] font-medium bg-white/10 rounded border border-white/20">
            <Command className="h-3 w-3" />K
          </kbd>
        </button>
      </div>

      {/* Global Search Dialog */}
      <GlobalSearchDialog
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        locale="es"
      />

      {/* Right side actions */}
      <div className="flex items-center gap-2">
        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Ver notificaciones"
              className="relative text-[var(--sidebar-text-muted)] hover:text-white hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[var(--sidebar-text-accent)]"
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
            className="w-[calc(100vw-2rem)] sm:w-80 max-w-[320px] bg-[var(--sidebar-glass-bg)] backdrop-blur-xl border-white/10"
          >
            <DropdownMenuLabel className="text-white">
              Notificaciones
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 focus:bg-white/10">
              <p className="text-sm font-medium text-white">
                Nuevo lead asignado
              </p>
              <p className="text-xs text-[var(--sidebar-text-secondary)]">
                María García fue asignada a tu cartera
              </p>
              <span className="text-xs text-[var(--sidebar-text-muted)]">Hace 5 minutos</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 focus:bg-white/10">
              <p className="text-sm font-medium text-white">
                Recordatorio de seguimiento
              </p>
              <p className="text-xs text-[var(--sidebar-text-secondary)]">
                Llamar a Juan Pérez - Cotización pendiente
              </p>
              <span className="text-xs text-[var(--sidebar-text-muted)]">Hace 1 hora</span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex flex-col items-start gap-1 p-3 focus:bg-white/10">
              <p className="text-sm font-medium text-white">
                Oportunidad ganada
              </p>
              <p className="text-xs text-[var(--sidebar-text-secondary)]">
                Contrato firmado con TechCorp - $50,000 MXN
              </p>
              <span className="text-xs text-[var(--sidebar-text-muted)]">Hace 2 horas</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem className="justify-center text-sm text-[var(--sidebar-text-accent)] focus:bg-white/10 focus:text-[var(--sidebar-text-accent)]">
              Ver todas las notificaciones
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* User menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              aria-label="Menú de usuario"
              className="relative h-9 w-9 rounded-full hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-[var(--sidebar-text-accent)]"
              variant="ghost"
            >
              <Avatar className="h-9 w-9 ring-2 ring-white/10 hover:ring-[var(--sidebar-active-border)]/30 transition-all">
                <AvatarImage src={profile?.avatarUrl} alt={profile?.fullName || ''} />
                <AvatarFallback
                  className="text-white"
                  style={{
                    background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.accentColor})`,
                  }}
                >
                  {getInitials()}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            className="w-[calc(100vw-2rem)] sm:w-56 max-w-[224px] bg-[var(--sidebar-glass-bg)] backdrop-blur-xl border-white/10"
          >
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium text-white">
                  {profile?.fullName || 'Usuario'}
                </p>
                <p className="text-xs text-[var(--sidebar-text-secondary)]">{user?.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              asChild
              className="text-[var(--sidebar-text-secondary)] focus:bg-white/10 focus:text-white cursor-pointer"
            >
              <Link href="/app/settings/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Mi Perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="text-[var(--sidebar-text-secondary)] focus:bg-white/10 focus:text-white cursor-pointer"
            >
              <Link href="/app/settings" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuración
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              asChild
              className="text-[var(--sidebar-text-secondary)] focus:bg-white/10 focus:text-white cursor-pointer"
            >
              <Link href="/app/settings/team" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Equipo
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => logout()}
              className="text-red-400 focus:bg-white/10 focus:text-red-300 cursor-pointer flex items-center gap-2"
            >
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

Navbar.displayName = 'Navbar';

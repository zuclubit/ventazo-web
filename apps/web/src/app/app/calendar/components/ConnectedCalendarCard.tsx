'use client';

/**
 * ConnectedCalendarCard Component - v2.0 (Responsive & Modular)
 *
 * Displays a connected calendar integration with status, settings, and disconnect options.
 *
 * Features:
 * - Fully responsive (mobile-first design)
 * - Uses design tokens for consistent theming
 * - Touch-friendly interactions (44px minimum targets)
 * - Multi-platform support (iOS, Android, Desktop)
 * - Clean architecture with separated concerns
 *
 * @module app/calendar/components/ConnectedCalendarCard
 * @version 2.0.0
 */

import * as React from 'react';
import {
  CheckCircle2,
  XCircle,
  AlertCircle,
  RefreshCw,
  Settings,
  Trash2,
  Loader2,
  Clock,
  Calendar,
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { integrationClasses, touchTargets } from '@/lib/theme/tokens';

import {
  type CalendarIntegration,
  type CalendarProvider,
  useDisconnectCalendar,
} from '@/lib/calendar';

// ============================================
// Configuration using Design Tokens
// ============================================

/**
 * Provider display configurations
 * Uses CSS variables for automatic light/dark mode support
 */
const PROVIDER_DISPLAY: Record<CalendarProvider, {
  name: string;
  shortName: string; // For mobile displays
  color: string;
  bgColor: string;
}> = {
  google: {
    name: 'Google Calendar',
    shortName: 'Google',
    color: integrationClasses.google.text,
    bgColor: integrationClasses.google.bg,
  },
  microsoft: {
    name: 'Microsoft Outlook',
    shortName: 'Outlook',
    color: integrationClasses.microsoft.text,
    bgColor: integrationClasses.microsoft.bg,
  },
};

/**
 * Status configurations with semantic colors
 */
const STATUS_CONFIG: Record<string, {
  label: string;
  shortLabel: string; // For mobile displays
  icon: React.ElementType;
  variant: 'default' | 'secondary' | 'destructive' | 'outline';
  className: string;
}> = {
  connected: {
    label: 'Conectado',
    shortLabel: 'OK',
    icon: CheckCircle2,
    variant: 'default',
    className: integrationClasses.connected.badge,
  },
  disconnected: {
    label: 'Desconectado',
    shortLabel: 'Off',
    icon: XCircle,
    variant: 'secondary',
    className: '',
  },
  expired: {
    label: 'Token expirado',
    shortLabel: 'Expirado',
    icon: AlertCircle,
    variant: 'destructive',
    className: '',
  },
  error: {
    label: 'Error',
    shortLabel: 'Error',
    icon: AlertCircle,
    variant: 'destructive',
    className: '',
  },
};

interface ConnectedCalendarCardProps {
  integration: CalendarIntegration;
  onSettingsClick?: (integration: CalendarIntegration) => void;
  onRefresh?: () => void;
}

export function ConnectedCalendarCard({
  integration,
  onSettingsClick,
  onRefresh,
}: ConnectedCalendarCardProps) {
  const { toast } = useToast();
  const [isDisconnecting, setIsDisconnecting] = React.useState(false);

  const disconnectMutation = useDisconnectCalendar();

  const providerConfig = PROVIDER_DISPLAY[integration.provider];
  const statusConfig = STATUS_CONFIG[integration.status] ?? STATUS_CONFIG['error'];
  const StatusIcon = statusConfig?.icon ?? AlertCircle;

  const handleDisconnect = async () => {
    setIsDisconnecting(true);
    try {
      await disconnectMutation.mutateAsync(integration.id);
      toast({
        title: 'Calendario desconectado',
        description: `Se ha desconectado ${providerConfig.name} correctamente.`,
      });
      onRefresh?.();
    } catch (error) {
      console.error('Error disconnecting:', error);
      toast({
        title: 'Error',
        description: 'No se pudo desconectar el calendario. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setIsDisconnecting(false);
    }
  };

  const formatLastSync = (date?: string) => {
    if (!date) return 'Nunca';
    const d = new Date(date);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffMins < 1440) return `Hace ${Math.floor(diffMins / 60)} horas`;
    return d.toLocaleDateString('es-MX', { day: 'numeric', month: 'short' });
  };

  return (
    <Card className={cn(
      // Base responsive card styles
      'border-2 transition-all',
      'hover:shadow-md',
      // Touch-friendly on mobile
      'active:scale-[0.99] sm:active:scale-100',
    )}>
      <CardHeader className="flex flex-row items-start gap-3 sm:gap-4 p-3 sm:p-6">
        {/* Provider Icon - Responsive sizing */}
        <div className={cn(
          'p-2.5 sm:p-3 rounded-lg sm:rounded-xl shrink-0',
          providerConfig.bgColor,
        )}>
          <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
        </div>

        {/* Content - Responsive layout */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Title: Show short name on mobile, full name on larger screens */}
            <CardTitle className="text-base sm:text-lg">
              <span className="sm:hidden">{providerConfig.shortName}</span>
              <span className="hidden sm:inline">{providerConfig.name}</span>
            </CardTitle>

            {/* Status Badge - Responsive label */}
            <Badge
              variant={statusConfig?.variant ?? 'secondary'}
              className={cn('text-xs', statusConfig?.className ?? '')}
            >
              <StatusIcon className="h-3 w-3 mr-1" />
              <span className="sm:hidden">{statusConfig?.shortLabel ?? '?'}</span>
              <span className="hidden sm:inline">{statusConfig?.label ?? 'Desconocido'}</span>
            </Badge>
          </div>

          {/* Email - Truncate with responsive text */}
          <CardDescription className="mt-1 truncate text-xs sm:text-sm">
            {integration.providerEmail}
          </CardDescription>
        </div>

        {/* Actions Menu - Touch-friendly button sizing */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                'shrink-0',
                touchTargets.iconButton, // Responsive icon button from tokens
              )}
            >
              <Settings className="h-4 w-4" />
              <span className="sr-only">Opciones del calendario</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem
              onClick={() => onSettingsClick?.(integration)}
              className={touchTargets.comfortable}
            >
              <Settings className="h-4 w-4 mr-2" />
              Configuracion
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onRefresh}
              className={touchTargets.comfortable}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Sincronizar ahora
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <DropdownMenuItem
                  onSelect={(e) => e.preventDefault()}
                  className={cn(
                    'text-destructive focus:text-destructive',
                    touchTargets.comfortable,
                  )}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Desconectar
                </DropdownMenuItem>
              </AlertDialogTrigger>
              <AlertDialogContent className="max-w-[90vw] sm:max-w-lg mx-4 sm:mx-auto">
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar calendario</AlertDialogTitle>
                  <AlertDialogDescription className="text-sm">
                    ¿Estas seguro de que deseas desconectar <strong className="break-all">{integration.providerEmail}</strong>?
                    <br /><br />
                    Esto eliminara la sincronizacion de eventos. Los eventos ya creados en el CRM se mantendran.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="flex-col sm:flex-row gap-2 sm:gap-0">
                  <AlertDialogCancel className={cn('w-full sm:w-auto', touchTargets.min)}>
                    Cancelar
                  </AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDisconnect}
                    className={cn(
                      'w-full sm:w-auto',
                      'bg-destructive text-destructive-foreground hover:bg-destructive/90',
                      touchTargets.min,
                    )}
                    disabled={isDisconnecting}
                  >
                    {isDisconnecting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : null}
                    Desconectar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>

      <CardContent className="pt-0 px-3 pb-3 sm:px-6 sm:pb-6">
        {/* Sync Info - Stack on mobile, row on larger screens */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
            <span className="truncate">
              <span className="hidden xs:inline">Ultima sync: </span>
              {formatLastSync(integration.lastSyncAt)}
            </span>
          </div>
          {integration.syncEnabled && (
            <Badge variant="outline" className="text-xs w-fit">
              <RefreshCw className="h-3 w-3 mr-1" />
              <span className="hidden sm:inline">Auto-sync activo</span>
              <span className="sm:hidden">Auto-sync</span>
            </Badge>
          )}
        </div>

        {/* Token Expiration Warning - Responsive styling */}
        {integration.status === 'expired' && (
          <div className={cn(
            'mt-3 p-2.5 sm:p-3 rounded-lg',
            integrationClasses.warning.container,
          )}>
            <div className={cn(
              'flex items-start sm:items-center gap-2 text-xs sm:text-sm',
              integrationClasses.warning.text,
            )}>
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 sm:mt-0" />
              <span>
                <span className="hidden sm:inline">El token de acceso ha expirado. Reconecta tu calendario para continuar sincronizando.</span>
                <span className="sm:hidden">Token expirado. Reconecta el calendario.</span>
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default ConnectedCalendarCard;

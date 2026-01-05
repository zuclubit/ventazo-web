'use client';

/**
 * Calendar Integration Settings Page
 *
 * Allows users to connect and manage Google Calendar and Microsoft Outlook integrations.
 * Handles OAuth flow and displays connected calendars.
 *
 * @module app/settings/integrations/calendar
 */

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';

import {
  useCalendarIntegrations,
  useCalendarProviders,
  useHasConnectedCalendar,
  calendarApi,
  type CalendarIntegration,
  type CalendarProvider,
} from '@/lib/calendar';

import {
  CalendarProviderCard,
  ConnectedCalendarCard,
  CalendarSettingsSheet,
} from '@/app/app/calendar/components';

// ============================================
// OAuth Callback Handler
// ============================================

function useOAuthCallback() {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // Handle OAuth error
    if (error) {
      toast({
        title: 'Error de autorizacion',
        description: error === 'access_denied'
          ? 'No se otorgaron los permisos necesarios.'
          : `Error: ${error}`,
        variant: 'destructive',
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Handle OAuth success
    if (code && state) {
      const storedState = sessionStorage.getItem('calendar_oauth_state');
      const provider = sessionStorage.getItem('calendar_oauth_provider') as CalendarProvider;

      // Verify state to prevent CSRF
      if (state !== storedState) {
        toast({
          title: 'Error de seguridad',
          description: 'El estado de autorizacion no coincide. Intenta de nuevo.',
          variant: 'destructive',
        });
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // Process OAuth callback
      setIsProcessing(true);
      const redirectUri = `${window.location.origin}/app/settings/integrations/calendar/callback`;

      calendarApi.completeOAuthCallback({
        provider,
        code,
        state,
        redirectUri,
      })
        .then(() => {
          toast({
            title: 'Calendario conectado',
            description: `Tu ${provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook'} se ha conectado correctamente.`,
          });
          // Clean session storage
          sessionStorage.removeItem('calendar_oauth_state');
          sessionStorage.removeItem('calendar_oauth_provider');
        })
        .catch((err) => {
          console.error('OAuth callback error:', err);
          toast({
            title: 'Error de conexion',
            description: 'No se pudo completar la conexion. Intenta de nuevo.',
            variant: 'destructive',
          });
        })
        .finally(() => {
          setIsProcessing(false);
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        });
    }
  }, [searchParams, toast]);

  return { isProcessing };
}

// ============================================
// Loading Skeleton
// ============================================

function CalendarSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="space-y-4">
        <Skeleton className="h-32 w-full rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function CalendarIntegrationPage() {
  const { toast } = useToast();
  const { isProcessing: isOAuthProcessing } = useOAuthCallback();

  // Data fetching
  const {
    data: integrations,
    isLoading: integrationsLoading,
    error: integrationsError,
    refetch: refetchIntegrations,
  } = useCalendarIntegrations();

  const {
    data: providersData,
    isLoading: providersLoading,
  } = useCalendarProviders();

  const { hasConnectedCalendar, connectedCount } = useHasConnectedCalendar();

  // Settings sheet state
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [selectedIntegration, setSelectedIntegration] = React.useState<CalendarIntegration | null>(null);

  // Determine which providers are already connected
  const connectedProviders = new Set(
    integrations
      ?.filter((i) => i.status === 'connected')
      .map((i) => i.provider) ?? []
  );

  // Available providers (not yet connected)
  const availableProviders: CalendarProvider[] = ['google', 'microsoft'].filter(
    (p) => !connectedProviders.has(p as CalendarProvider)
  ) as CalendarProvider[];

  // Connected integrations
  const connectedIntegrations = integrations?.filter((i) => i.status !== 'disconnected') ?? [];

  const handleSettingsClick = (integration: CalendarIntegration) => {
    setSelectedIntegration(integration);
    setSettingsOpen(true);
  };

  const handleRefresh = () => {
    refetchIntegrations();
    toast({
      title: 'Actualizando...',
      description: 'Sincronizando estado de calendarios.',
    });
  };

  const isLoading = integrationsLoading || providersLoading || isOAuthProcessing;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/app/settings/integrations">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Calendario</h2>
                <p className="text-muted-foreground">
                  Conecta Google Calendar o Microsoft Outlook
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* OAuth Processing State */}
        {isOAuthProcessing && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Procesando autorizacion...</AlertTitle>
            <AlertDescription>
              Estamos completando la conexion con tu calendario. Espera un momento.
            </AlertDescription>
          </Alert>
        )}

        {/* Error State */}
        {integrationsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              No se pudieron cargar las integraciones. {String(integrationsError)}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && !isOAuthProcessing ? (
          <CalendarSettingsSkeleton />
        ) : (
          <>
            {/* Connected Calendars Section */}
            {connectedIntegrations.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Calendarios conectados ({connectedCount})
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Tus calendarios conectados se sincronizan automaticamente con el CRM.
                        Puedes configurar la direccion de sincronizacion y otras opciones.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid gap-4">
                  {connectedIntegrations.map((integration) => (
                    <ConnectedCalendarCard
                      key={integration.id}
                      integration={integration}
                      onSettingsClick={handleSettingsClick}
                      onRefresh={handleRefresh}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Available Providers Section */}
            {availableProviders.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">
                  {connectedIntegrations.length > 0
                    ? 'Conectar otro calendario'
                    : 'Conectar calendario'}
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  {availableProviders.map((provider) => (
                    <CalendarProviderCard
                      key={provider}
                      provider={provider}
                      onConnectSuccess={handleRefresh}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* All Connected State */}
            {availableProviders.length === 0 && connectedIntegrations.length > 0 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertTitle>Todos los calendarios conectados</AlertTitle>
                <AlertDescription>
                  Tienes todos los proveedores de calendario disponibles conectados.
                  Puedes gestionar la configuracion de cada uno desde las tarjetas de arriba.
                </AlertDescription>
              </Alert>
            )}

            {/* Benefits Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium">Beneficios de conectar tu calendario:</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Sincroniza reuniones y eventos con leads y clientes</li>
                <li>• Crea eventos directamente desde el CRM</li>
                <li>• Ve disponibilidad para programar reuniones</li>
                <li>• Recibe recordatorios de seguimiento</li>
                <li>• Mantén historial de interacciones en el timeline</li>
              </ul>
            </div>
          </>
        )}

        {/* Settings Sheet */}
        <CalendarSettingsSheet
          integration={selectedIntegration}
          open={settingsOpen}
          onOpenChange={setSettingsOpen}
          onSuccess={handleRefresh}
        />
      </div>
    </TooltipProvider>
  );
}

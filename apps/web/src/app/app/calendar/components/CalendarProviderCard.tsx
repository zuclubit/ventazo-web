'use client';

/**
 * CalendarProviderCard Component
 *
 * Displays a calendar provider (Google/Microsoft) with connect button.
 * Handles OAuth flow initiation.
 *
 * @module app/calendar/components/CalendarProviderCard
 */

import * as React from 'react';
import { Loader2 } from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

import { calendarApi, type CalendarProvider } from '@/lib/calendar';

// Provider icons as SVGs for brand accuracy
const GoogleCalendarIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
    <path d="M18 3H6a3 3 0 00-3 3v12a3 3 0 003 3h12a3 3 0 003-3V6a3 3 0 00-3-3z" fill="#fff" stroke="#4285F4" strokeWidth="2"/>
    <path d="M8 7h8M8 11h8M8 15h4" stroke="#4285F4" strokeWidth="2" strokeLinecap="round"/>
    <rect x="5" y="2" width="14" height="4" rx="1" fill="#4285F4"/>
  </svg>
);

const MicrosoftOutlookIcon = () => (
  <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none">
    <path d="M3 6.5A2.5 2.5 0 015.5 4h13A2.5 2.5 0 0121 6.5v11a2.5 2.5 0 01-2.5 2.5h-13A2.5 2.5 0 013 17.5v-11z" fill="#0078D4"/>
    <path d="M3 8l9 5 9-5" stroke="#fff" strokeWidth="1.5"/>
    <path d="M12 13v7" stroke="#fff" strokeWidth="1.5"/>
  </svg>
);

// Provider configurations - using CSS variables for brand colors
// --calendar-google and --calendar-outlook are defined in useCalendarTheme
const PROVIDER_CONFIG: Record<CalendarProvider, {
  name: string;
  description: string;
  icon: React.ComponentType;
  colorVar: string;
  brandColor: string;
  hoverColor: string;
}> = {
  google: {
    name: 'Google Calendar',
    description: 'Sincroniza tus eventos con Google Calendar para tener todo en un solo lugar.',
    icon: GoogleCalendarIcon,
    colorVar: 'var(--calendar-google, #4285f4)',
    brandColor: '#4285F4',
    hoverColor: '#3367D6',
  },
  microsoft: {
    name: 'Microsoft Outlook',
    description: 'Conecta tu calendario de Outlook para gestionar reuniones y eventos.',
    icon: MicrosoftOutlookIcon,
    colorVar: 'var(--calendar-outlook, #0078d4)',
    brandColor: '#0078D4',
    hoverColor: '#005A9E',
  },
};

interface CalendarProviderCardProps {
  provider: CalendarProvider;
  onConnectSuccess?: () => void;
}

export function CalendarProviderCard({ provider, onConnectSuccess }: CalendarProviderCardProps) {
  const [isConnecting, setIsConnecting] = React.useState(false);
  const { toast } = useToast();

  const config = PROVIDER_CONFIG[provider];
  const Icon = config.icon;

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      // Get the redirect URI for OAuth callback
      const redirectUri = `${window.location.origin}/app/settings/integrations/calendar/callback`;

      // Call API to get OAuth authorization URL
      const response = await calendarApi.connectIntegration({
        provider,
        redirectUri,
      });

      // Store state in sessionStorage for verification on callback
      sessionStorage.setItem('calendar_oauth_state', response.state);
      sessionStorage.setItem('calendar_oauth_provider', provider);

      // Redirect to OAuth consent page
      window.location.href = response.authUrl;
    } catch (error) {
      console.error('Error connecting calendar:', error);
      toast({
        title: 'Error de conexion',
        description: 'No se pudo iniciar el proceso de autorizacion. Intenta de nuevo.',
        variant: 'destructive',
      });
      setIsConnecting(false);
    }
  };

  return (
    <Card
      className="border-2 transition-all hover:shadow-md"
      style={{
        backgroundColor: `color-mix(in srgb, ${config.colorVar} 8%, var(--calendar-surface, transparent))`,
        borderColor: `color-mix(in srgb, ${config.colorVar} 30%, transparent)`,
      }}
    >
      <CardHeader className="flex flex-row items-center gap-4">
        <div
          className="p-3 rounded-xl shadow-sm"
          style={{ backgroundColor: 'var(--calendar-surface-light, hsl(var(--card)))' }}
        >
          <Icon />
        </div>
        <div className="flex-1">
          <CardTitle className="text-lg">{config.name}</CardTitle>
          <CardDescription className="mt-1">{config.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full sm:w-auto text-white"
          style={{
            backgroundColor: config.brandColor,
          }}
          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = config.hoverColor)}
          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = config.brandColor)}
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <Icon />
              <span className="ml-2">Conectar {config.name}</span>
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default CalendarProviderCard;

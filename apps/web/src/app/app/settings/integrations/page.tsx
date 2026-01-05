'use client';

import * as React from 'react';
import Link from 'next/link';
import { MessageCircle, Mail, Phone, Calendar, ArrowRight, CheckCircle2, XCircle } from 'lucide-react';

import { useCalendarIntegrations } from '@/lib/calendar';
import { useEmailAccounts } from '@/lib/emails/hooks';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

// ============================================
// Types
// ============================================

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  href: string;
  status: 'connected' | 'disconnected' | 'coming_soon';
  color: string;
  connectedCount?: number;
}

// ============================================
// Available Integrations
// ============================================

// Base integrations (static ones)
const baseIntegrations: Integration[] = [
  {
    id: 'calendar',
    name: 'Calendario',
    description: 'Sincroniza Google Calendar o Microsoft Outlook para gestionar reuniones y eventos.',
    icon: Calendar,
    href: '/app/settings/integrations/calendar',
    status: 'disconnected',
    color: 'bg-indigo-500',
  },
  {
    id: 'email',
    name: 'Correo Electronico',
    description: 'Sincroniza tu cuenta de Gmail u Outlook para gestionar emails desde la bandeja unificada.',
    icon: Mail,
    href: '/app/settings/integrations/email',
    status: 'disconnected',
    color: 'bg-purple-500',
  },
  {
    id: 'messenger',
    name: 'Facebook Messenger',
    description: 'Conecta tu pagina de Facebook para recibir y responder mensajes directamente desde Ventazo.',
    icon: MessageCircle,
    href: '/app/settings/integrations/messenger',
    status: 'disconnected',
    color: 'bg-blue-500',
  },
  {
    id: 'whatsapp',
    name: 'WhatsApp Business',
    description: 'Integra WhatsApp Business API para comunicarte con tus clientes via WhatsApp.',
    icon: Phone,
    href: '/app/settings/integrations/whatsapp',
    status: 'coming_soon',
    color: 'bg-green-500',
  },
];

// ============================================
// Integration Card Component
// ============================================

function IntegrationCard({ integration }: { integration: Integration }) {
  const Icon = integration.icon;
  const isComingSoon = integration.status === 'coming_soon';
  const connectedCount = integration.connectedCount ?? 0;

  return (
    <Card className={isComingSoon ? 'opacity-60' : ''}>
      <CardHeader className="flex flex-row items-center gap-4">
        <div className={`p-3 rounded-lg ${integration.color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">{integration.name}</CardTitle>
            {integration.status === 'connected' && (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                {connectedCount > 1 ? `${connectedCount} conectadas` : 'Conectado'}
              </Badge>
            )}
            {integration.status === 'disconnected' && (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Sin conectar
              </Badge>
            )}
            {integration.status === 'coming_soon' && (
              <Badge variant="outline">Proximamente</Badge>
            )}
          </div>
          <CardDescription className="mt-1">{integration.description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {isComingSoon ? (
          <Button variant="outline" disabled className="w-full sm:w-auto">
            Proximamente
          </Button>
        ) : (
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link href={integration.href}>
              {integration.status === 'connected' ? 'Gestionar' : 'Configurar'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Link>
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Integrations Page
// ============================================

export default function IntegrationsPage() {
  // Fetch calendar integrations to determine connection status
  const { data: calendarIntegrations } = useCalendarIntegrations();

  // Fetch email accounts to determine connection status
  const { data: emailAccountsData } = useEmailAccounts();

  // Compute integrations with dynamic status
  const integrations = React.useMemo(() => {
    return baseIntegrations.map((integration) => {
      if (integration.id === 'calendar') {
        const connectedCalendars = calendarIntegrations?.filter(
          (i) => i.status === 'connected'
        ) ?? [];
        return {
          ...integration,
          status: connectedCalendars.length > 0 ? 'connected' as const : 'disconnected' as const,
          connectedCount: connectedCalendars.length,
        };
      }
      if (integration.id === 'email') {
        const connectedEmails = emailAccountsData?.accounts?.filter(
          (a) => a.isConnected
        ) ?? [];
        return {
          ...integration,
          status: connectedEmails.length > 0 ? 'connected' as const : 'disconnected' as const,
          connectedCount: connectedEmails.length,
        };
      }
      return integration;
    });
  }, [calendarIntegrations, emailAccountsData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Integraciones</h2>
        <p className="text-muted-foreground">
          Conecta tus canales de comunicacion para gestionar todas tus conversaciones desde un solo lugar.
        </p>
      </div>

      {/* Integration Cards */}
      <div className="grid gap-4">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </div>
  );
}

'use client';

/**
 * Settings Page
 *
 * Main settings page that shows available settings options.
 */

import Link from 'next/link';
import {
  User,
  Users,
  Bell,
  CreditCard,
  Activity,
  MessageSquare,
  ChevronRight,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const settingsItems = [
  {
    title: 'Perfil',
    description: 'Gestiona tu información personal y preferencias',
    href: '/app/settings/profile',
    icon: User,
  },
  {
    title: 'Equipo',
    description: 'Invita miembros y gestiona roles del equipo',
    href: '/app/settings/team',
    icon: Users,
  },
  {
    title: 'Notificaciones',
    description: 'Configura alertas y preferencias de notificaciones',
    href: '/app/settings/notifications',
    icon: Bell,
  },
  {
    title: 'Facturación',
    description: 'Gestiona tu suscripción y métodos de pago',
    href: '/app/settings/billing',
    icon: CreditCard,
  },
  {
    title: 'Mensajería',
    description: 'Configura plantillas de email y preferencias',
    href: '/app/settings/messaging/templates',
    icon: MessageSquare,
  },
  {
    title: 'Actividad',
    description: 'Revisa el historial de actividad de la cuenta',
    href: '/app/settings/activity',
    icon: Activity,
  },
];

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuración</h1>
        <p className="text-muted-foreground">
          Gestiona la configuración de tu cuenta y preferencias
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {settingsItems.map((item) => (
          <Link key={item.href} href={item.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
              <CardHeader className="flex flex-row items-center gap-4 pb-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <item.icon className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1">
                  <CardTitle className="text-base flex items-center justify-between">
                    {item.title}
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <CardDescription>{item.description}</CardDescription>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

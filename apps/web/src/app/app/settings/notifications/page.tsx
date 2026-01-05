'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  ArrowLeft,
  Bell,
  Clock,
  Loader2,
  Mail,
  MessageSquare,
  Moon,
  Phone,
  RefreshCw,
  Save,
  Smartphone,
} from 'lucide-react';
import { NotificationsPageSkeleton } from '../components';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import {
  NOTIFICATION_TYPES,
  useNotificationPreferences,
  useResetNotificationPreferences,
  useUpdateNotificationPreferences,
  type NotificationPreferences,
  type NotificationType,
} from '@/lib/messaging';
import { cn } from '@/lib/utils';

// ============================================
// Constants
// ============================================

const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { icon: string; label: string; description: string }
> = {
  info: { icon: 'ℹ️', label: 'Información', description: 'Mensajes informativos generales' },
  success: { icon: '✅', label: 'Éxito', description: 'Acciones completadas exitosamente' },
  warning: { icon: '⚠️', label: 'Advertencias', description: 'Alertas importantes' },
  error: { icon: '❌', label: 'Errores', description: 'Errores del sistema' },
  workflow: { icon: '⚡', label: 'Workflows', description: 'Actualizaciones de workflows' },
  task: { icon: '📋', label: 'Tareas', description: 'Tareas asignadas y recordatorios' },
  lead: { icon: '👤', label: 'Leads', description: 'Actualizaciones de leads' },
  opportunity: { icon: '💰', label: 'Oportunidades', description: 'Cambios en oportunidades' },
  customer: { icon: '🏢', label: 'Clientes', description: 'Actualizaciones de clientes' },
  mention: { icon: '@', label: 'Menciones', description: 'Cuando te mencionan' },
  reminder: { icon: '🔔', label: 'Recordatorios', description: 'Recordatorios programados' },
  system: { icon: '🔧', label: 'Sistema', description: 'Notificaciones del sistema' },
};

const CHANNEL_CONFIG = {
  email: { icon: <Mail className="h-5 w-5" />, label: 'Email', description: 'Recibe notificaciones por correo' },
  sms: { icon: <MessageSquare className="h-5 w-5" />, label: 'SMS', description: 'Recibe mensajes de texto' },
  whatsapp: { icon: <Phone className="h-5 w-5" />, label: 'WhatsApp', description: 'Recibe mensajes por WhatsApp' },
  push: { icon: <Smartphone className="h-5 w-5" />, label: 'Push', description: 'Notificaciones push en dispositivos' },
  internal: { icon: <Bell className="h-5 w-5" />, label: 'In-App', description: 'Notificaciones dentro de la app' },
};

// ============================================
// Channel Toggle Component
// ============================================

interface ChannelToggleProps {
  channelKey: keyof typeof CHANNEL_CONFIG;
  enabled: boolean;
  onToggle: (enabled: boolean) => void;
}

function ChannelToggle({ channelKey, enabled, onToggle }: ChannelToggleProps) {
  const config = CHANNEL_CONFIG[channelKey];

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border">
      <div className="flex items-center gap-3">
        <div className={cn('p-2 rounded-lg', enabled ? 'bg-primary/10 text-primary' : 'bg-muted text-muted-foreground')}>
          {config.icon}
        </div>
        <div>
          <p className="font-medium">{config.label}</p>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} />
    </div>
  );
}

// ============================================
// Type Preferences Component
// ============================================

interface TypePreferencesProps {
  preferences: NotificationPreferences['typePreferences'];
  onUpdate: (type: NotificationType, channel: string, enabled: boolean) => void;
}

function TypePreferences({ preferences, onUpdate }: TypePreferencesProps) {
  return (
    <div className="space-y-4">
      {NOTIFICATION_TYPES.map((type) => {
        const config = NOTIFICATION_TYPE_CONFIG[type];
        const typePref = preferences[type] ?? { email: true, push: true, internal: true };

        return (
          <div key={type} className="flex items-center justify-between p-3 rounded-lg border">
            <div className="flex items-center gap-3">
              <span className="text-xl">{config.icon}</span>
              <div>
                <p className="font-medium text-sm">{config.label}</p>
                <p className="text-xs text-muted-foreground">{config.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Switch
                  checked={typePref.email ?? true}
                  onCheckedChange={(v) => onUpdate(type, 'email', v)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <Switch
                  checked={typePref.internal ?? true}
                  onCheckedChange={(v) => onUpdate(type, 'internal', v)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Switch
                  checked={typePref.push ?? true}
                  onCheckedChange={(v) => onUpdate(type, 'push', v)}
                />
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function NotificationPreferencesPage() {
  const { toast } = useToast();
  const { data: preferences, isLoading, refetch } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const resetPreferences = useResetNotificationPreferences();

  // Local state for form
  const [localPrefs, setLocalPrefs] = React.useState<Partial<NotificationPreferences>>({});
  const [hasChanges, setHasChanges] = React.useState(false);

  // Initialize local state when data loads
  React.useEffect(() => {
    if (preferences) {
      setLocalPrefs(preferences);
      setHasChanges(false);
    }
  }, [preferences]);

  // Update helper
  const updateLocal = <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    setLocalPrefs((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  // Update type preference
  const updateTypePref = (type: NotificationType, channel: string, enabled: boolean) => {
    setLocalPrefs((prev) => ({
      ...prev,
      typePreferences: {
        ...prev.typePreferences,
        [type]: {
          ...(prev.typePreferences?.[type] ?? {}),
          [channel]: enabled,
        },
      },
    }));
    setHasChanges(true);
  };

  // Save handler
  const handleSave = () => {
    updatePreferences.mutate(localPrefs, {
      onSuccess: () => {
        toast({
          title: 'Preferencias guardadas',
          description: 'Tus preferencias de notificación han sido actualizadas.',
        });
        setHasChanges(false);
      },
      onError: () => {
        toast({
          title: 'Error',
          description: 'No se pudieron guardar las preferencias.',
          variant: 'destructive',
        });
      },
    });
  };

  // Reset handler
  const handleReset = () => {
    resetPreferences.mutate(undefined, {
      onSuccess: () => {
        toast({
          title: 'Preferencias restablecidas',
          description: 'Tus preferencias han sido restablecidas a los valores predeterminados.',
        });
        void refetch();
      },
    });
  };

  if (isLoading) {
    return (
      <div className="container py-6">
        <NotificationsPageSkeleton />
      </div>
    );
  }

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href="/app/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Preferencias de Notificaciones</h1>
          <p className="text-muted-foreground">
            Configura cómo y cuándo recibir notificaciones
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            disabled={resetPreferences.isPending}
            variant="outline"
            onClick={handleReset}
          >
            {resetPreferences.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Restablecer
          </Button>
          <Button
            disabled={!hasChanges || updatePreferences.isPending}
            onClick={handleSave}
          >
            {updatePreferences.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar Cambios
          </Button>
        </div>
      </div>

      {hasChanges && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center gap-2 text-sm text-yellow-800">
          <span>Tienes cambios sin guardar</span>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Channel Preferences */}
        <Card>
          <CardHeader>
            <CardTitle>Canales de Notificación</CardTitle>
            <CardDescription>
              Activa o desactiva los canales por los que deseas recibir notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ChannelToggle
              channelKey="email"
              enabled={localPrefs.emailEnabled ?? true}
              onToggle={(v) => updateLocal('emailEnabled', v)}
            />
            <ChannelToggle
              channelKey="internal"
              enabled={localPrefs.internalEnabled ?? true}
              onToggle={(v) => updateLocal('internalEnabled', v)}
            />
            <ChannelToggle
              channelKey="push"
              enabled={localPrefs.pushEnabled ?? true}
              onToggle={(v) => updateLocal('pushEnabled', v)}
            />
            <ChannelToggle
              channelKey="sms"
              enabled={localPrefs.smsEnabled ?? false}
              onToggle={(v) => updateLocal('smsEnabled', v)}
            />
            <ChannelToggle
              channelKey="whatsapp"
              enabled={localPrefs.whatsappEnabled ?? false}
              onToggle={(v) => updateLocal('whatsappEnabled', v)}
            />
          </CardContent>
        </Card>

        {/* Digest Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Resumen de Notificaciones
            </CardTitle>
            <CardDescription>
              Agrupa las notificaciones en un resumen periódico
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Activar resumen</p>
                <p className="text-sm text-muted-foreground">
                  Recibe un resumen en lugar de notificaciones individuales
                </p>
              </div>
              <Switch
                checked={localPrefs.digestEnabled ?? false}
                onCheckedChange={(v) => updateLocal('digestEnabled', v)}
              />
            </div>

            {localPrefs.digestEnabled && (
              <div className="space-y-2">
                <Label>Frecuencia del resumen</Label>
                <Select
                  value={localPrefs.digestFrequency ?? 'daily'}
                  onValueChange={(v) => updateLocal('digestFrequency', v as 'daily' | 'weekly' | 'never')}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Diario</SelectItem>
                    <SelectItem value="weekly">Semanal</SelectItem>
                    <SelectItem value="never">Nunca</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quiet Hours */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Moon className="h-5 w-5" />
              Horas de Silencio
            </CardTitle>
            <CardDescription>
              No recibir notificaciones durante ciertos horarios
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Activar horas de silencio</p>
                <p className="text-sm text-muted-foreground">
                  Silencia notificaciones en horarios definidos
                </p>
              </div>
              <Switch
                checked={localPrefs.quietHoursEnabled ?? false}
                onCheckedChange={(v) => updateLocal('quietHoursEnabled', v)}
              />
            </div>

            {localPrefs.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Hora de inicio</Label>
                  <Input
                    type="time"
                    value={localPrefs.quietHoursStart ?? '22:00'}
                    onChange={(e) => updateLocal('quietHoursStart', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Hora de fin</Label>
                  <Input
                    type="time"
                    value={localPrefs.quietHoursEnd ?? '08:00'}
                    onChange={(e) => updateLocal('quietHoursEnd', e.target.value)}
                  />
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Configuración de Email
            </CardTitle>
            <CardDescription>
              Opciones adicionales para notificaciones por correo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Email de notificaciones</Label>
              <Input
                placeholder="tu@email.com"
                type="email"
                value={localPrefs.emailAddress ?? ''}
                onChange={(e) => updateLocal('emailAddress', e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Deja vacío para usar el email de tu cuenta
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Type Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Preferencias por Tipo</CardTitle>
          <CardDescription>
            Configura qué canales usar para cada tipo de notificación
          </CardDescription>
          <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Mail className="h-4 w-4" /> Email
            </div>
            <div className="flex items-center gap-1">
              <Bell className="h-4 w-4" /> In-App
            </div>
            <div className="flex items-center gap-1">
              <Smartphone className="h-4 w-4" /> Push
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <TypePreferences
            preferences={localPrefs.typePreferences ?? {}}
            onUpdate={updateTypePref}
          />
        </CardContent>
      </Card>
    </div>
  );
}

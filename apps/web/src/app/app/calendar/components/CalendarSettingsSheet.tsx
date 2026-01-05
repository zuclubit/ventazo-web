'use client';

/**
 * CalendarSettingsSheet Component
 *
 * Sheet/drawer for configuring calendar integration settings.
 * Allows users to customize sync direction, auto-sync options, and working hours.
 *
 * @module app/calendar/components/CalendarSettingsSheet
 */

import * as React from 'react';
import { Loader2, Save, Calendar, Clock, RefreshCw } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';

import {
  type CalendarIntegration,
  type SyncDirection,
  type UpdateSettingsRequest,
  useUpdateIntegrationSettings,
} from '@/lib/calendar';

// Sync direction options
const SYNC_DIRECTION_OPTIONS: { value: SyncDirection; label: string; description: string }[] = [
  {
    value: 'two_way',
    label: 'Bidireccional',
    description: 'Eventos se sincronizan en ambas direcciones',
  },
  {
    value: 'one_way_to_calendar',
    label: 'Solo al calendario',
    description: 'Eventos del CRM se envian al calendario externo',
  },
  {
    value: 'one_way_from_calendar',
    label: 'Solo desde calendario',
    description: 'Eventos del calendario externo se importan al CRM',
  },
];

// Reminder options in minutes
const REMINDER_OPTIONS = [
  { value: 0, label: 'Sin recordatorio' },
  { value: 5, label: '5 minutos antes' },
  { value: 10, label: '10 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 120, label: '2 horas antes' },
  { value: 1440, label: '1 dia antes' },
];

// Default event duration options
const DURATION_OPTIONS = [
  { value: 15, label: '15 minutos' },
  { value: 30, label: '30 minutos' },
  { value: 45, label: '45 minutos' },
  { value: 60, label: '1 hora' },
  { value: 90, label: '1.5 horas' },
  { value: 120, label: '2 horas' },
];

// Future sync days options
const FUTURE_DAYS_OPTIONS = [
  { value: 30, label: '30 dias' },
  { value: 60, label: '60 dias' },
  { value: 90, label: '90 dias' },
  { value: 180, label: '6 meses' },
  { value: 365, label: '1 ano' },
];

interface CalendarSettingsSheetProps {
  integration: CalendarIntegration | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function CalendarSettingsSheet({
  integration,
  open,
  onOpenChange,
  onSuccess,
}: CalendarSettingsSheetProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateIntegrationSettings();

  // Form state initialized from integration settings
  const [settings, setSettings] = React.useState<UpdateSettingsRequest>({
    syncDirection: 'two_way',
    autoSyncTasks: true,
    autoSyncMeetings: true,
    syncPastEvents: false,
    syncFutureDays: 90,
    defaultReminderMinutes: 15,
    defaultEventDuration: 30,
  });

  // Update form when integration changes
  React.useEffect(() => {
    if (integration?.settings) {
      setSettings({
        syncDirection: integration.settings.syncDirection,
        autoSyncTasks: integration.settings.autoSyncTasks,
        autoSyncMeetings: integration.settings.autoSyncMeetings,
        syncPastEvents: integration.settings.syncPastEvents,
        syncFutureDays: integration.settings.syncFutureDays,
        defaultReminderMinutes: integration.settings.defaultReminderMinutes,
        defaultEventDuration: integration.settings.defaultEventDuration,
      });
    }
  }, [integration]);

  const handleSave = async () => {
    if (!integration) return;

    try {
      await updateMutation.mutateAsync({
        integrationId: integration.id,
        settings,
      });
      toast({
        title: 'Configuracion guardada',
        description: 'Los ajustes de sincronizacion se han actualizado.',
      });
      onSuccess?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la configuracion. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const providerName = integration?.provider === 'google' ? 'Google Calendar' : 'Microsoft Outlook';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Configuracion de Calendario
          </SheetTitle>
          <SheetDescription>
            Personaliza como se sincronizan los eventos con {providerName}.
          </SheetDescription>
        </SheetHeader>

        <div className="py-6 space-y-6">
          {/* Sync Direction */}
          <div className="space-y-3">
            <Label className="text-base font-medium flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Direccion de sincronizacion
            </Label>
            <Select
              value={settings.syncDirection}
              onValueChange={(value) =>
                setSettings((s) => ({ ...s, syncDirection: value as SyncDirection }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SYNC_DIRECTION_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div>
                      <div className="font-medium">{option.label}</div>
                      <div className="text-xs text-muted-foreground">{option.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Auto-sync Options */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Sincronizacion automatica</Label>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoSyncMeetings">Sincronizar reuniones</Label>
                <p className="text-sm text-muted-foreground">
                  Sincroniza automaticamente las reuniones creadas
                </p>
              </div>
              <Switch
                id="autoSyncMeetings"
                checked={settings.autoSyncMeetings}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, autoSyncMeetings: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="autoSyncTasks">Sincronizar tareas</Label>
                <p className="text-sm text-muted-foreground">
                  Crea eventos para tareas con fecha limite
                </p>
              </div>
              <Switch
                id="autoSyncTasks"
                checked={settings.autoSyncTasks}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, autoSyncTasks: checked }))
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="syncPastEvents">Incluir eventos pasados</Label>
                <p className="text-sm text-muted-foreground">
                  Importa eventos que ya ocurrieron
                </p>
              </div>
              <Switch
                id="syncPastEvents"
                checked={settings.syncPastEvents}
                onCheckedChange={(checked) =>
                  setSettings((s) => ({ ...s, syncPastEvents: checked }))
                }
              />
            </div>
          </div>

          <Separator />

          {/* Sync Range */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Rango de sincronizacion</Label>
            <Select
              value={String(settings.syncFutureDays)}
              onValueChange={(value) =>
                setSettings((s) => ({ ...s, syncFutureDays: Number(value) }))
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUTURE_DAYS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={String(option.value)}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              Cuanto tiempo hacia el futuro sincronizar eventos
            </p>
          </div>

          <Separator />

          {/* Default Values */}
          <div className="space-y-4">
            <Label className="text-base font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Valores predeterminados
            </Label>

            <div className="space-y-2">
              <Label htmlFor="defaultReminder">Recordatorio predeterminado</Label>
              <Select
                value={String(settings.defaultReminderMinutes)}
                onValueChange={(value) =>
                  setSettings((s) => ({ ...s, defaultReminderMinutes: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="defaultDuration">Duracion predeterminada de evento</Label>
              <Select
                value={String(settings.defaultEventDuration)}
                onValueChange={(value) =>
                  setSettings((s) => ({ ...s, defaultEventDuration: Number(value) }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={String(option.value)}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <SheetFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={updateMutation.isPending}>
            {updateMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Guardar cambios
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default CalendarSettingsSheet;

'use client';

/**
 * EventFormSheet Component - Sprint 4
 *
 * Full form for creating and editing calendar events.
 * Supports CRM linking, attendees, reminders, and recurrence.
 *
 * @module app/calendar/components/EventFormSheet
 */

import * as React from 'react';
import {
  Calendar,
  Clock,
  Plus,
  Edit,
  MapPin,
  Users,
  Bell,
  Link2,
  Repeat,
  Loader2,
  X,
  User,
  Building2,
  Target,
  CheckSquare,
  Globe,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { useToast } from '@/hooks/use-toast';

import {
  useCalendarIntegrations,
  useCalendarsForIntegration,
  useCreateEvent,
  useUpdateEvent,
  type CalendarEvent,
  type CreateEventRequest,
  type UpdateEventRequest,
  type EventReminder,
  type RecurrenceFrequency,
  type AttendeeInput,
} from '@/lib/calendar';

import { UserSearchCombobox, type SelectedUser } from './UserSearchCombobox';
import { CRMEntitySelector } from './CRMEntitySelector';
import { TimezoneSelector } from './TimezoneSelector';

// ============================================
// Types
// ============================================

interface EventFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialDate?: Date;
  initialEndDate?: Date;
  initialAllDay?: boolean;
  event?: CalendarEvent;
  onSuccess?: () => void;
}

interface FormState {
  title: string;
  description: string;
  location: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  allDay: boolean;
  timezone: string;
  integrationId: string;
  calendarId: string;
  attendees: SelectedUser[];
  reminders: EventReminder[];
  linkedLeadId: string;
  linkedCustomerId: string;
  linkedOpportunityId: string;
  linkedTaskId: string;
  recurrenceEnabled: boolean;
  recurrenceFrequency: RecurrenceFrequency;
  recurrenceInterval: number;
  recurrenceCount: number;
}

// ============================================
// Constants
// ============================================

const REMINDER_OPTIONS = [
  { value: 0, label: 'Al momento' },
  { value: 5, label: '5 minutos antes' },
  { value: 15, label: '15 minutos antes' },
  { value: 30, label: '30 minutos antes' },
  { value: 60, label: '1 hora antes' },
  { value: 1440, label: '1 día antes' },
];

const RECURRENCE_OPTIONS: { value: RecurrenceFrequency; label: string }[] = [
  { value: 'daily', label: 'Diario' },
  { value: 'weekly', label: 'Semanal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'yearly', label: 'Anual' },
];

// ============================================
// Helper Functions
// ============================================

function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function formatTimeForInput(date: Date): string {
  return date.toTimeString().slice(0, 5);
}

function parseFormDateTime(dateStr: string, timeStr: string): Date {
  return new Date(`${dateStr}T${timeStr}:00`);
}

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Mexico_City';
  }
}

function getInitialFormState(
  event?: CalendarEvent,
  initialDate?: Date,
  initialEndDate?: Date,
  initialAllDay?: boolean
): FormState {
  if (event) {
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);
    return {
      title: event.title,
      description: event.description ?? '',
      location: event.location ?? '',
      startDate: formatDateForInput(start),
      startTime: formatTimeForInput(start),
      endDate: formatDateForInput(end),
      endTime: formatTimeForInput(end),
      allDay: event.allDay,
      timezone: event.timezone ?? getBrowserTimezone(),
      integrationId: event.integrationId,
      calendarId: event.calendarId,
      attendees: event.attendees?.map((a) => ({ email: a.email, name: a.name })) ?? [],
      reminders: event.reminders ?? [{ method: 'popup', minutes: 15 }],
      linkedLeadId: event.linkedLeadId ?? '',
      linkedCustomerId: event.linkedCustomerId ?? '',
      linkedOpportunityId: event.linkedOpportunityId ?? '',
      linkedTaskId: event.linkedTaskId ?? '',
      recurrenceEnabled: !!event.recurrence,
      recurrenceFrequency: event.recurrence?.frequency ?? 'weekly',
      recurrenceInterval: event.recurrence?.interval ?? 1,
      recurrenceCount: event.recurrence?.count ?? 10,
    };
  }

  const now = initialDate ?? new Date();
  const endDefault = initialEndDate ?? new Date(now.getTime() + 60 * 60 * 1000);

  return {
    title: '',
    description: '',
    location: '',
    startDate: formatDateForInput(now),
    startTime: formatTimeForInput(now),
    endDate: formatDateForInput(endDefault),
    endTime: formatTimeForInput(endDefault),
    allDay: initialAllDay ?? false,
    timezone: getBrowserTimezone(),
    integrationId: '',
    calendarId: '',
    attendees: [],
    reminders: [{ method: 'popup', minutes: 15 }],
    linkedLeadId: '',
    linkedCustomerId: '',
    linkedOpportunityId: '',
    linkedTaskId: '',
    recurrenceEnabled: false,
    recurrenceFrequency: 'weekly',
    recurrenceInterval: 1,
    recurrenceCount: 10,
  };
}

// ============================================
// EventFormSheet Component
// ============================================

export function EventFormSheet({
  open,
  onOpenChange,
  initialDate,
  initialEndDate,
  initialAllDay = false,
  event,
  onSuccess,
}: EventFormSheetProps) {
  const { toast } = useToast();
  const isEditMode = !!event;

  // Form state
  const [form, setForm] = React.useState<FormState>(() =>
    getInitialFormState(event, initialDate, initialEndDate, initialAllDay)
  );
  const [advancedOpen, setAdvancedOpen] = React.useState(false);

  // Fetch integrations and calendars
  const { data: integrations, isLoading: integrationsLoading } = useCalendarIntegrations();
  const { data: calendars } = useCalendarsForIntegration(form.integrationId || undefined);

  // CRUD hooks
  const createEvent = useCreateEvent();
  const updateEvent = useUpdateEvent();

  const isSubmitting = createEvent.isPending || updateEvent.isPending;

  // Reset form when event changes or sheet opens
  React.useEffect(() => {
    if (open) {
      setForm(getInitialFormState(event, initialDate, initialEndDate, initialAllDay));
      setAdvancedOpen(false);
    }
  }, [open, event, initialDate, initialEndDate, initialAllDay]);

  // Set default integration when loaded
  React.useEffect(() => {
    if (integrations && integrations.length > 0 && !form.integrationId) {
      const connected = integrations.find((i) => i.status === 'connected');
      if (connected) {
        setForm((prev) => ({ ...prev, integrationId: connected.id }));
      }
    }
  }, [integrations, form.integrationId]);

  // Update form field
  const updateForm = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  // Add attendee from UserSearchCombobox
  const handleAddAttendee = React.useCallback((user: SelectedUser) => {
    setForm((prev) => ({
      ...prev,
      attendees: [...prev.attendees, user],
    }));
  }, []);

  // Remove attendee
  const handleRemoveAttendee = React.useCallback((email: string) => {
    setForm((prev) => ({
      ...prev,
      attendees: prev.attendees.filter((a) => a.email !== email),
    }));
  }, []);

  // Add reminder
  const addReminder = (minutes: number) => {
    if (!form.reminders.some((r) => r.minutes === minutes)) {
      setForm((prev) => ({
        ...prev,
        reminders: [...prev.reminders, { method: 'popup', minutes }],
      }));
    }
  };

  // Remove reminder
  const removeReminder = (minutes: number) => {
    setForm((prev) => ({
      ...prev,
      reminders: prev.reminders.filter((r) => r.minutes !== minutes),
    }));
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.title.trim()) {
      toast({
        title: 'Error',
        description: 'El título es requerido.',
        variant: 'destructive',
      });
      return;
    }

    if (!form.integrationId) {
      toast({
        title: 'Error',
        description: 'Selecciona un calendario.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const startTime = form.allDay
        ? new Date(`${form.startDate}T00:00:00`).toISOString()
        : parseFormDateTime(form.startDate, form.startTime).toISOString();

      const endTime = form.allDay
        ? new Date(`${form.endDate}T23:59:59`).toISOString()
        : parseFormDateTime(form.endDate, form.endTime).toISOString();

      if (isEditMode && event) {
        // Update existing event
        const updateData: UpdateEventRequest = {
          title: form.title,
          description: form.description || undefined,
          location: form.location || undefined,
          startTime,
          endTime,
          allDay: form.allDay,
          timezone: form.allDay ? undefined : form.timezone,
          attendees: form.attendees.length > 0 ? form.attendees : undefined,
          reminders: form.reminders,
          linkedLeadId: form.linkedLeadId || undefined,
          linkedCustomerId: form.linkedCustomerId || undefined,
          linkedOpportunityId: form.linkedOpportunityId || undefined,
          linkedTaskId: form.linkedTaskId || undefined,
        };

        if (form.recurrenceEnabled) {
          updateData.recurrence = {
            frequency: form.recurrenceFrequency,
            interval: form.recurrenceInterval,
            count: form.recurrenceCount,
          };
        }

        await updateEvent.mutateAsync({
          integrationId: event.integrationId,
          eventId: event.id,
          data: updateData,
          calendarId: event.calendarId,
        });

        toast({
          title: 'Evento actualizado',
          description: 'Los cambios se han guardado correctamente.',
        });
      } else {
        // Create new event
        const createData: CreateEventRequest = {
          title: form.title,
          description: form.description || undefined,
          location: form.location || undefined,
          startTime,
          endTime,
          allDay: form.allDay,
          timezone: form.allDay ? undefined : form.timezone,
          calendarId: form.calendarId || undefined,
          attendees: form.attendees.length > 0 ? form.attendees : undefined,
          reminders: form.reminders,
          linkedLeadId: form.linkedLeadId || undefined,
          linkedCustomerId: form.linkedCustomerId || undefined,
          linkedOpportunityId: form.linkedOpportunityId || undefined,
          linkedTaskId: form.linkedTaskId || undefined,
        };

        if (form.recurrenceEnabled) {
          createData.recurrence = {
            frequency: form.recurrenceFrequency,
            interval: form.recurrenceInterval,
            count: form.recurrenceCount,
          };
        }

        await createEvent.mutateAsync({
          integrationId: form.integrationId,
          data: createData,
        });

        toast({
          title: 'Evento creado',
          description: 'El evento se ha creado correctamente.',
        });
      }

      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      console.error('Error saving event:', error);
      toast({
        title: 'Error',
        description: isEditMode
          ? 'No se pudo actualizar el evento. Intenta de nuevo.'
          : 'No se pudo crear el evento. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-6 pt-6 pb-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            {isEditMode ? (
              <Edit className="h-5 w-5" />
            ) : (
              <Plus className="h-5 w-5" />
            )}
            {isEditMode ? 'Editar evento' : 'Nuevo evento'}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? 'Modifica los detalles del evento.'
              : 'Completa los detalles para crear un nuevo evento.'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <form onSubmit={handleSubmit} className="space-y-6 p-6">
            {/* Title */}
            <div className="space-y-2">
              <Label htmlFor="title">Título del evento *</Label>
              <Input
                id="title"
                value={form.title}
                onChange={(e) => updateForm('title', e.target.value)}
                placeholder="Ej: Reunión con cliente"
                required
              />
            </div>

            {/* All Day Toggle */}
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="allDay">Todo el día</Label>
                <p className="text-sm text-muted-foreground">
                  El evento dura todo el día
                </p>
              </div>
              <Switch
                id="allDay"
                checked={form.allDay}
                onCheckedChange={(checked) => updateForm('allDay', checked)}
              />
            </div>

            {/* Date/Time - Responsive grid (stacks on very small screens) */}
            <div className="grid grid-cols-1 xs:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 flex-shrink-0" />
                  <span>Inicio</span>
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateForm('startDate', e.target.value)}
                  required
                  className="min-h-[44px] text-base sm:text-sm sm:min-h-[36px]"
                />
                {!form.allDay && (
                  <Input
                    type="time"
                    value={form.startTime}
                    onChange={(e) => updateForm('startTime', e.target.value)}
                    required
                    className="min-h-[44px] text-base sm:text-sm sm:min-h-[36px]"
                  />
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 flex-shrink-0" />
                  <span>Fin</span>
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={form.endDate}
                  onChange={(e) => updateForm('endDate', e.target.value)}
                  required
                  className="min-h-[44px] text-base sm:text-sm sm:min-h-[36px]"
                />
                {!form.allDay && (
                  <Input
                    type="time"
                    value={form.endTime}
                    onChange={(e) => updateForm('endTime', e.target.value)}
                    required
                    className="min-h-[44px] text-base sm:text-sm sm:min-h-[36px]"
                  />
                )}
              </div>
            </div>

            {/* Timezone Selector */}
            {!form.allDay && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Globe className="h-4 w-4" />
                  Zona horaria
                </Label>
                <TimezoneSelector
                  value={form.timezone}
                  onChange={(tz) => updateForm('timezone', tz)}
                  disabled={isSubmitting}
                />
              </div>
            )}

            {/* Calendar Selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Calendario *
              </Label>
              {integrationsLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Cargando calendarios...
                </div>
              ) : (
                <Select
                  value={form.integrationId}
                  onValueChange={(value) => updateForm('integrationId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un calendario" />
                  </SelectTrigger>
                  <SelectContent>
                    {integrations
                      ?.filter((i) => i.status === 'connected')
                      .map((integration) => (
                        <SelectItem key={integration.id} value={integration.id}>
                          {integration.providerEmail} ({integration.provider})
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              )}
              {calendars && calendars.length > 1 && (
                <Select
                  value={form.calendarId}
                  onValueChange={(value) => updateForm('calendarId', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Calendario específico (opcional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {calendars.map((cal) => (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.name}
                        {cal.primary && ' (Principal)'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location" className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Ubicación
              </Label>
              <Input
                id="location"
                value={form.location}
                onChange={(e) => updateForm('location', e.target.value)}
                placeholder="Ej: Sala de juntas, Zoom, etc."
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={(e) => updateForm('description', e.target.value)}
                placeholder="Notas adicionales sobre el evento..."
                rows={3}
              />
            </div>

            {/* Attendees */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Participantes
              </Label>
              <UserSearchCombobox
                selectedUsers={form.attendees}
                onSelect={handleAddAttendee}
                onRemove={handleRemoveAttendee}
                placeholder="Buscar miembro del equipo..."
                disabled={isSubmitting}
              />
            </div>

            {/* Reminders */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Recordatorios
              </Label>
              <Select onValueChange={(value) => addReminder(Number(value))}>
                <SelectTrigger>
                  <SelectValue placeholder="Agregar recordatorio" />
                </SelectTrigger>
                <SelectContent>
                  {REMINDER_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.value}
                      value={String(option.value)}
                      disabled={form.reminders.some((r) => r.minutes === option.value)}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {form.reminders.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {form.reminders.map((reminder) => {
                    const option = REMINDER_OPTIONS.find((o) => o.value === reminder.minutes);
                    return (
                      <Badge
                        key={reminder.minutes}
                        variant="outline"
                        className="flex items-center gap-1"
                      >
                        {option?.label ?? `${reminder.minutes} min`}
                        <button
                          type="button"
                          onClick={() => removeReminder(reminder.minutes)}
                          className="ml-1 hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    );
                  })}
                </div>
              )}
            </div>

            <Separator />

            {/* Advanced Options */}
            <Collapsible open={advancedOpen} onOpenChange={setAdvancedOpen}>
              <CollapsibleTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full justify-between"
                >
                  Opciones avanzadas
                  <span className="text-xs text-muted-foreground">
                    {advancedOpen ? 'Ocultar' : 'Mostrar'}
                  </span>
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="space-y-6 pt-4">
                {/* Recurrence */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="flex items-center gap-2">
                      <Repeat className="h-4 w-4" />
                      Repetir evento
                    </Label>
                    <Switch
                      checked={form.recurrenceEnabled}
                      onCheckedChange={(checked) =>
                        updateForm('recurrenceEnabled', checked)
                      }
                    />
                  </div>
                  {form.recurrenceEnabled && (
                    <div className="grid grid-cols-1 xs:grid-cols-3 gap-2 pl-0 xs:pl-6">
                      <Select
                        value={form.recurrenceFrequency}
                        onValueChange={(value) =>
                          updateForm('recurrenceFrequency', value as RecurrenceFrequency)
                        }
                      >
                        <SelectTrigger className="min-h-[44px] sm:min-h-[36px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {RECURRENCE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="grid grid-cols-2 xs:contents gap-2">
                        <Input
                          type="number"
                          min={1}
                          max={99}
                          value={form.recurrenceInterval}
                          onChange={(e) =>
                            updateForm('recurrenceInterval', Number(e.target.value))
                          }
                          placeholder="Intervalo"
                          className="min-h-[44px] text-base sm:text-sm sm:min-h-[36px]"
                        />
                        <Input
                          type="number"
                          min={1}
                          max={999}
                          value={form.recurrenceCount}
                          onChange={(e) =>
                            updateForm('recurrenceCount', Number(e.target.value))
                          }
                          placeholder="Veces"
                          className="min-h-[44px] text-base sm:text-sm sm:min-h-[36px]"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* CRM Linking - Responsive grid */}
                <div className="space-y-4">
                  <Label className="flex items-center gap-2">
                    <Link2 className="h-4 w-4 flex-shrink-0" />
                    Vincular con CRM
                  </Label>
                  <div className="grid grid-cols-1 xs:grid-cols-2 gap-3 sm:gap-4 pl-0 xs:pl-6">
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <User className="h-3 w-3 flex-shrink-0" />
                        Lead
                      </Label>
                      <CRMEntitySelector
                        entityType="lead"
                        value={form.linkedLeadId}
                        onChange={(id) => updateForm('linkedLeadId', id)}
                        placeholder="Buscar lead..."
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Building2 className="h-3 w-3 flex-shrink-0" />
                        Cliente
                      </Label>
                      <CRMEntitySelector
                        entityType="customer"
                        value={form.linkedCustomerId}
                        onChange={(id) => updateForm('linkedCustomerId', id)}
                        placeholder="Buscar cliente..."
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <Target className="h-3 w-3 flex-shrink-0" />
                        Oportunidad
                      </Label>
                      <CRMEntitySelector
                        entityType="opportunity"
                        value={form.linkedOpportunityId}
                        onChange={(id) => updateForm('linkedOpportunityId', id)}
                        placeholder="Buscar oportunidad..."
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs flex items-center gap-1.5">
                        <CheckSquare className="h-3 w-3 flex-shrink-0" />
                        Tarea
                      </Label>
                      <CRMEntitySelector
                        entityType="task"
                        value={form.linkedTaskId}
                        onChange={(id) => updateForm('linkedTaskId', id)}
                        placeholder="Buscar tarea..."
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground pl-0 xs:pl-6">
                    Busca y selecciona registros CRM para vincularlos con este evento.
                  </p>
                </div>
              </CollapsibleContent>
            </Collapsible>
          </form>
        </ScrollArea>

        <SheetFooter className="border-t p-6 gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            onClick={handleSubmit}
            disabled={!form.title.trim() || !form.integrationId || isSubmitting}
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditMode ? 'Guardar cambios' : 'Crear evento'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default EventFormSheet;

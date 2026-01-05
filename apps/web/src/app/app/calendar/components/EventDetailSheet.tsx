'use client';

/**
 * EventDetailSheet Component - Sprint 4
 *
 * Sheet displaying event details with Edit and Delete actions.
 * Shows event info, attendees, location, and linked CRM entities.
 *
 * @module app/calendar/components/EventDetailSheet
 */

import * as React from 'react';
import Link from 'next/link';
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  Video,
  Phone,
  Link2,
  User,
  Building2,
  Target,
  CheckSquare,
  ExternalLink,
  Bell,
  Repeat,
  Edit,
  Trash2,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

import { useDeleteEvent, type CalendarEvent, type CalendarAttendee } from '@/lib/calendar';
import { SyncStatusBadge } from './SyncStatusBadge';

// ============================================
// Types
// ============================================

interface EventDetailSheetProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (event: CalendarEvent) => void;
  onDeleted?: () => void;
}

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  confirmed: { label: 'Confirmado', variant: 'default' },
  tentative: { label: 'Tentativo', variant: 'secondary' },
  cancelled: { label: 'Cancelado', variant: 'destructive' },
};

// ============================================
// Helper Components
// ============================================

function formatEventTime(startTime: string, endTime: string, allDay: boolean): string {
  const start = new Date(startTime);
  const end = new Date(endTime);

  if (allDay) {
    const startDate = start.toLocaleDateString('es-MX', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
    });

    // Check if multi-day
    const endDate = new Date(end);
    endDate.setDate(endDate.getDate() - 1); // All-day events end at midnight next day

    if (start.toDateString() !== endDate.toDateString()) {
      const endStr = endDate.toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'long',
      });
      return `${startDate} - ${endStr} (Todo el día)`;
    }

    return `${startDate} (Todo el día)`;
  }

  const dateStr = start.toLocaleDateString('es-MX', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const startTimeStr = start.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const endTimeStr = end.toLocaleTimeString('es-MX', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  return `${dateStr}, ${startTimeStr} - ${endTimeStr}`;
}

function AttendeeItem({ attendee }: { attendee: CalendarAttendee }) {
  const initials = attendee.name
    ? attendee.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : attendee.email.slice(0, 2).toUpperCase();

  // Use CSS variables from useCalendarTheme for dynamic colors
  const responseColorVar = {
    accepted: 'var(--calendar-attendee-accepted, #22c55e)',
    declined: 'var(--calendar-attendee-declined, #ef4444)',
    tentative: 'var(--calendar-attendee-tentative, #f59e0b)',
    needsAction: 'var(--calendar-attendee-pending, #94a3b8)',
  }[attendee.responseStatus];

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="relative">
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
        </Avatar>
        <div
          className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background"
          style={{ backgroundColor: responseColorVar }}
        />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">
          {attendee.name || attendee.email}
          {attendee.organizer && (
            <Badge variant="outline" className="ml-2 text-xs">
              Organizador
            </Badge>
          )}
        </p>
        {attendee.name && (
          <p className="text-xs text-muted-foreground truncate">{attendee.email}</p>
        )}
      </div>
    </div>
  );
}

function LinkedEntityBadge({
  type,
  id,
}: {
  type: 'lead' | 'customer' | 'opportunity' | 'task';
  id: string;
}) {
  // Use CSS variables from useCalendarTheme for dynamic entity colors
  const config = {
    lead: {
      icon: User,
      label: 'Lead',
      href: `/app/leads?id=${id}`,
      colorVar: 'var(--cal-event-lead, #8B5CF6)',
    },
    customer: {
      icon: Building2,
      label: 'Cliente',
      href: `/app/customers?id=${id}`,
      colorVar: 'var(--cal-event-customer, #10B981)',
    },
    opportunity: {
      icon: Target,
      label: 'Oportunidad',
      href: `/app/opportunities?id=${id}`,
      colorVar: 'var(--cal-event-opportunity, #F59E0B)',
    },
    task: {
      icon: CheckSquare,
      label: 'Tarea',
      href: `/app/tasks?id=${id}`,
      colorVar: 'var(--cal-event-task, #3B82F6)',
    },
  }[type];

  const Icon = config.icon;

  return (
    <Link href={config.href}>
      <Badge
        variant="outline"
        className="cursor-pointer hover:opacity-80 border-current"
        style={{
          backgroundColor: `color-mix(in srgb, ${config.colorVar} 15%, transparent)`,
          color: config.colorVar,
        }}
      >
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
        <ExternalLink className="h-3 w-3 ml-1" />
      </Badge>
    </Link>
  );
}

// ============================================
// EventDetailSheet Component
// ============================================

export function EventDetailSheet({
  event,
  open,
  onOpenChange,
  onEdit,
  onDeleted,
}: EventDetailSheetProps) {
  const { toast } = useToast();
  const deleteEvent = useDeleteEvent();
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  if (!event) return null;

  const status = STATUS_CONFIG[event.status] ?? { label: 'Confirmado', variant: 'default' as const };
  const hasAttendees = event.attendees && event.attendees.length > 0;
  const hasLinkedEntities =
    event.linkedLeadId ||
    event.linkedCustomerId ||
    event.linkedOpportunityId ||
    event.linkedTaskId;

  const handleEdit = () => {
    onOpenChange(false);
    onEdit?.(event);
  };

  const handleDelete = async () => {
    try {
      await deleteEvent.mutateAsync({
        integrationId: event.integrationId,
        eventId: event.id,
        calendarId: event.calendarId,
      });

      toast({
        title: 'Evento eliminado',
        description: 'El evento se ha eliminado correctamente.',
      });

      setDeleteDialogOpen(false);
      onOpenChange(false);
      onDeleted?.();
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el evento. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-lg p-0 flex flex-col">
          <SheetHeader className="px-6 pt-6 pb-4 border-b">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <SheetTitle className="text-xl pr-8">{event.title}</SheetTitle>
                <SheetDescription className="mt-1 flex items-center gap-2 flex-wrap">
                  <Badge variant={status.variant}>{status.label}</Badge>
                  {event.syncStatus && (
                    <SyncStatusBadge
                      status={event.syncStatus}
                      lastSyncedAt={event.lastSyncedAt}
                    />
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          <ScrollArea className="flex-1">
            <div className="space-y-6 p-6">
              {/* Date & Time */}
              <div className="flex items-start gap-3">
                <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="font-medium capitalize">
                    {formatEventTime(event.startTime, event.endTime, event.allDay)}
                  </p>
                  {event.timezone && (
                    <p className="text-sm text-muted-foreground">{event.timezone}</p>
                  )}
                </div>
              </div>

              {/* Recurrence */}
              {event.recurrence && (
                <div className="flex items-center gap-3">
                  <Repeat className="h-5 w-5 text-muted-foreground" />
                  <p className="text-sm">
                    Evento recurrente ({event.recurrence.frequency})
                  </p>
                </div>
              )}

              {/* Location */}
              {event.location && (
                <div className="flex items-start gap-3">
                  <MapPin className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <p className="text-sm">{event.location}</p>
                </div>
              )}

              {/* Conference Data */}
              {event.conferenceData && (
                <div className="flex items-start gap-3">
                  {event.conferenceData.type === 'google_meet' ||
                  event.conferenceData.type === 'microsoft_teams' ? (
                    <Video className="h-5 w-5 text-muted-foreground mt-0.5" />
                  ) : (
                    <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  )}
                  <div>
                    <p className="text-sm font-medium capitalize">
                      {event.conferenceData.type.replace('_', ' ')}
                    </p>
                    {event.conferenceData.conferenceUrl && (
                      <a
                        href={event.conferenceData.conferenceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline flex items-center gap-1"
                      >
                        Unirse a la reunión
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Description */}
              {event.description && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2">Descripción</h4>
                    <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                      {event.description}
                    </p>
                  </div>
                </>
              )}

              {/* Reminders */}
              {event.reminders && event.reminders.length > 0 && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Bell className="h-4 w-4" />
                      Recordatorios
                    </h4>
                    <div className="space-y-1">
                      {event.reminders.map((reminder, idx) => (
                        <p key={idx} className="text-sm text-muted-foreground">
                          {reminder.minutes < 60
                            ? `${reminder.minutes} minutos antes`
                            : reminder.minutes < 1440
                              ? `${Math.floor(reminder.minutes / 60)} horas antes`
                              : `${Math.floor(reminder.minutes / 1440)} días antes`}
                          {reminder.method !== 'popup' && ` (${reminder.method})`}
                        </p>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Attendees */}
              {hasAttendees && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Participantes ({event.attendees.length})
                    </h4>
                    <div className="space-y-1">
                      {event.attendees.map((attendee, idx) => (
                        <AttendeeItem key={idx} attendee={attendee} />
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Linked Entities */}
              {hasLinkedEntities && (
                <>
                  <Separator />
                  <div>
                    <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                      <Link2 className="h-4 w-4" />
                      Vinculado a
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {event.linkedLeadId && (
                        <LinkedEntityBadge type="lead" id={event.linkedLeadId} />
                      )}
                      {event.linkedCustomerId && (
                        <LinkedEntityBadge type="customer" id={event.linkedCustomerId} />
                      )}
                      {event.linkedOpportunityId && (
                        <LinkedEntityBadge type="opportunity" id={event.linkedOpportunityId} />
                      )}
                      {event.linkedTaskId && (
                        <LinkedEntityBadge type="task" id={event.linkedTaskId} />
                      )}
                    </div>
                  </div>
                </>
              )}

              {/* Metadata */}
              <Separator />
              <div className="text-xs text-muted-foreground space-y-1">
                <p>
                  Creado: {new Date(event.createdAt).toLocaleString('es-MX')}
                </p>
                {event.updatedAt !== event.createdAt && (
                  <p>
                    Actualizado: {new Date(event.updatedAt).toLocaleString('es-MX')}
                  </p>
                )}
                {event.lastSyncedAt && (
                  <p>
                    Sincronizado: {new Date(event.lastSyncedAt).toLocaleString('es-MX')}
                  </p>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="border-t p-6">
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                Cerrar
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
              {onEdit && (
                <Button className="flex-1" onClick={handleEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Eliminar evento
            </AlertDialogTitle>
            <AlertDialogDescription>
              ¿Estás seguro de que deseas eliminar <strong>&quot;{event.title}&quot;</strong>?
              {event.recurrence && (
                <span
                  className="block mt-2"
                  style={{ color: 'var(--calendar-sync-conflict, #f97316)' }}
                >
                  Este es un evento recurrente. Solo se eliminará esta instancia.
                </span>
              )}
              Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteEvent.isPending}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleteEvent.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteEvent.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default EventDetailSheet;

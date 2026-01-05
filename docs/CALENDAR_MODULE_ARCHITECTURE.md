# Calendario CRM - Arquitectura y Diseño del Modulo

> Documento Tecnico de Analisis, Diseno e Implementacion
> Fecha: 2025-12-29
> Version: 1.0

---

## Indice

1. [FASE 1: Descubrimiento y Analisis](#fase-1-descubrimiento-y-analisis)
2. [FASE 2: Definicion Funcional](#fase-2-definicion-funcional)
3. [FASE 3: Diseno de Arquitectura](#fase-3-diseno-de-arquitectura)
4. [FASE 4: Diseno UX/UI](#fase-4-diseno-uxui)
5. [FASE 5: Plan de Implementacion](#fase-5-plan-de-implementacion)
6. [FASE 6: Recomendaciones y Decisiones](#fase-6-recomendaciones-y-decisiones)

---

## FASE 1: Descubrimiento y Analisis

### 1.1 Estado Actual del Sistema

#### Backend: COMPLETAMENTE IMPLEMENTADO

| Componente | Ruta | Estado | Descripcion |
|------------|------|--------|-------------|
| `CalendarService` | `services/lead-service/src/infrastructure/calendar/calendar.service.ts` | Completo | Servicio unificado de calendario |
| `GoogleCalendarProvider` | `services/lead-service/src/infrastructure/calendar/google-calendar.provider.ts` | Completo | Integracion Google Calendar API v3 |
| `MicrosoftCalendarProvider` | `services/lead-service/src/infrastructure/calendar/microsoft-calendar.provider.ts` | Completo | Integracion Microsoft Graph API |
| `calendar.routes.ts` | `services/lead-service/src/presentation/routes/calendar.routes.ts` | Completo | 20+ endpoints REST |
| `types.ts` | `services/lead-service/src/infrastructure/calendar/types.ts` | Completo | Tipos unificados |

#### Frontend: PLACEHOLDER (Coming Soon)

| Componente | Ruta | Estado | Descripcion |
|------------|------|--------|-------------|
| `page.tsx` | `apps/web/src/app/app/calendar/page.tsx` | Placeholder | Solo mensaje "Coming Soon" |
| `Calendar` (UI) | `apps/web/src/components/ui/calendar.tsx` | Completo | Date picker (react-day-picker) |

#### Base de Datos: COMPLETO

| Tabla | Descripcion | Campos Clave |
|-------|-------------|--------------|
| `calendar_integrations` | Conexiones OAuth de usuarios | provider, tokens, sync_enabled |
| `calendar_events` | Eventos sincronizados | title, start_time, end_time, linked_lead_id |

### 1.2 Endpoints API Existentes

```
// Proveedores y Conexion OAuth
GET    /api/calendar/providers           - Proveedores disponibles
GET    /api/calendar/integrations        - Integraciones del usuario
POST   /api/calendar/connect             - Iniciar OAuth flow
POST   /api/calendar/callback            - Callback OAuth
DELETE /api/calendar/integrations/:id    - Desconectar

// CRUD de Eventos
GET    /api/calendar/integrations/:id/events      - Listar eventos
GET    /api/calendar/integrations/:id/events/:eventId - Obtener evento
POST   /api/calendar/integrations/:id/events      - Crear evento
PATCH  /api/calendar/integrations/:id/events/:eventId - Actualizar
DELETE /api/calendar/integrations/:id/events/:eventId - Eliminar

// Disponibilidad
POST   /api/calendar/integrations/:id/freebusy    - Free/busy query

// Vistas consolidadas
GET    /api/calendar/upcoming            - Proximos eventos (7 dias)
GET    /api/calendar/events              - Eventos con paginacion
GET    /api/calendar/calendars           - Calendarios sincronizados

// Vinculacion CRM
GET    /api/calendar/leads/:leadId/events       - Eventos de un lead
GET    /api/calendar/customers/:customerId/events - Eventos de un cliente
```

### 1.3 Codigo Reutilizable

| Codigo | Ubicacion | Reutilizable Para |
|--------|-----------|-------------------|
| Patron BFF | `apps/web/src/lib/api/api-client.ts` | Cliente API de calendario |
| Kanban hooks | `apps/web/src/app/app/tasks/hooks/` | Vista Kanban de eventos |
| Date picker | `apps/web/src/components/ui/calendar.tsx` | Seleccion de fechas |
| Sheet/Dialog | `apps/web/src/components/ui/sheet.tsx` | Detalles de evento |
| Empty states | `apps/web/src/components/common/empty-state.tsx` | Estado vacio calendario |

### 1.4 Vacios Funcionales Identificados

| Vacio | Impacto | Prioridad |
|-------|---------|-----------|
| Sin UI de calendario | Usuarios no pueden ver/crear eventos | CRITICO |
| Sin flujo OAuth en UI | No se pueden conectar calendarios | CRITICO |
| Sin vista mensual/semanal | Visualizacion limitada | ALTO |
| Sin drag & drop | Experiencia de usuario pobre | MEDIO |
| Sin notificaciones en tiempo real | Sin alertas de eventos | MEDIO |

### 1.5 Riesgos Tecnicos

| Riesgo | Probabilidad | Mitigacion |
|--------|--------------|------------|
| Tokens OAuth expirados no manejados | Baja | Ya implementado refresh automatico |
| Conflictos de sincronizacion | Media | Backend tiene etag/conflict detection |
| Performance con muchos eventos | Media | Paginacion ya implementada |
| Zona horaria incorrecta | Media | Usar `Intl.DateTimeFormat` |

---

## FASE 2: Definicion Funcional

### 2.1 Casos de Uso Core

#### CU-01: Conectar Calendario Externo
```
Actor: Usuario
Precondicion: Usuario autenticado
Flujo:
  1. Usuario navega a Configuracion > Integraciones
  2. Selecciona proveedor (Google/Microsoft)
  3. Se redirige a OAuth consent
  4. Autoriza acceso
  5. Callback guarda tokens
  6. Calendario aparece conectado
Postcondicion: Integracion activa, eventos sincronizados
```

#### CU-02: Crear Evento desde CRM
```
Actor: Usuario
Precondicion: Calendario conectado
Flujo:
  1. Usuario hace clic en "Nuevo Evento"
  2. Completa formulario (titulo, fecha, hora, asistentes)
  3. Opcionalmente vincula a Lead/Cliente/Oportunidad
  4. Guarda evento
  5. Sistema sincroniza con calendario externo
Postcondicion: Evento visible en CRM y calendario externo
```

#### CU-03: Ver Calendario
```
Actor: Usuario
Flujo:
  1. Usuario navega a /app/calendar
  2. Ve vista mensual por defecto
  3. Puede cambiar a vista semanal/diaria
  4. Puede navegar entre periodos
  5. Puede filtrar por tipo de evento
```

#### CU-04: Programar Reunion con Cliente
```
Actor: Usuario
Flujo:
  1. Desde ficha de cliente, clic "Programar Reunion"
  2. Selecciona horario disponible (free/busy check)
  3. Agrega asistentes (email del cliente)
  4. Genera link de videollamada (Google Meet/Teams)
  5. Envia invitacion
Postcondicion: Evento creado, invitaciones enviadas
```

### 2.2 Reglas de Negocio

| Regla | Descripcion |
|-------|-------------|
| RN-01 | Un usuario solo puede tener 1 integracion por proveedor |
| RN-02 | Eventos pasados no se pueden modificar (solo cancelar) |
| RN-03 | Recordatorios: minimo 5 min, maximo 2 semanas antes |
| RN-04 | Eventos recurrentes: maximo 52 ocurrencias o 1 año |
| RN-05 | Zona horaria del evento = zona horaria del tenant por defecto |
| RN-06 | Eventos de all-day no tienen hora especifica |

### 2.3 Tipos de Evento

```typescript
type EventType =
  | 'meeting'      // Reunion con asistentes
  | 'call'         // Llamada telefonica
  | 'task'         // Evento de tarea (autogenerado)
  | 'follow_up'    // Seguimiento programado
  | 'demo'         // Demostracion de producto
  | 'reminder'     // Recordatorio personal
  | 'blocked'      // Tiempo bloqueado (no disponible)
```

### 2.4 Estados del Evento

```
           ┌──────────────┐
           │   pending    │ (creado pero no confirmado)
           └──────┬───────┘
                  │
           ┌──────▼───────┐
           │  confirmed   │ (evento activo)
           └──────┬───────┘
          ┌───────┴───────┐
   ┌──────▼───────┐ ┌─────▼──────┐
   │  completed   │ │  cancelled │
   └──────────────┘ └────────────┘
```

---

## FASE 3: Diseno de Arquitectura

### 3.1 Backend (Existente - Clean Architecture)

```
services/lead-service/src/
├── infrastructure/
│   └── calendar/
│       ├── calendar.service.ts      # Application Service
│       ├── google-calendar.provider.ts  # External Adapter
│       ├── microsoft-calendar.provider.ts
│       ├── types.ts                 # Domain Types
│       └── index.ts                 # Barrel exports
├── presentation/
│   └── routes/
│       └── calendar.routes.ts       # HTTP Controllers
└── infrastructure/
    └── database/
        └── schema.ts                # calendar_integrations, calendar_events
```

### 3.2 Frontend (A Implementar)

```
apps/web/src/
├── app/app/calendar/
│   ├── page.tsx                     # Pagina principal
│   ├── layout.tsx                   # Layout opcional
│   └── components/
│       ├── CalendarGrid.tsx         # Vista mensual/semanal
│       ├── CalendarSidebar.tsx      # Panel lateral de detalles
│       ├── CalendarToolbar.tsx      # Navegacion y controles
│       ├── CalendarEventCard.tsx    # Tarjeta de evento en grid
│       ├── EventFormSheet.tsx       # Crear/editar evento
│       ├── EventDetailSheet.tsx     # Ver detalles de evento
│       └── CalendarEmptyState.tsx   # Estado sin eventos
│
├── lib/calendar/
│   ├── types.ts                     # Tipos frontend
│   ├── hooks.ts                     # useCalendar, useEvents, useIntegrations
│   ├── api.ts                       # Funciones API
│   └── utils.ts                     # Helpers de fecha/hora
│
└── components/ui/
    └── calendar.tsx                 # Ya existe (date picker)
```

### 3.3 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│  CalendarPage                                                    │
│       │                                                          │
│       ├──► useCalendarEvents() ──► /api/proxy/calendar/events   │
│       │                                 │                        │
│       ├──► useCalendarIntegrations()    │                        │
│       │                                 ▼                        │
│       └──► EventFormSheet           Next.js API Route            │
│                                         │                        │
└─────────────────────────────────────────┼────────────────────────┘
                                          │
┌─────────────────────────────────────────┼────────────────────────┐
│                         BACKEND         │                        │
├─────────────────────────────────────────┼────────────────────────┤
│                                         ▼                        │
│   calendar.routes.ts ──► CalendarService                         │
│                              │                                   │
│                    ┌─────────┴─────────┐                         │
│                    ▼                   ▼                         │
│           GoogleCalendarProvider  MicrosoftCalendarProvider      │
│                    │                   │                         │
│                    ▼                   ▼                         │
│           Google Calendar API    Microsoft Graph API             │
│                                                                  │
│   ┌──────────────────────────────────────────────────────┐       │
│   │  PostgreSQL                                          │       │
│   │  ├── calendar_integrations (OAuth tokens)            │       │
│   │  └── calendar_events (cached/linked events)          │       │
│   └──────────────────────────────────────────────────────┘       │
└──────────────────────────────────────────────────────────────────┘
```

### 3.4 Tipos TypeScript Frontend

```typescript
// apps/web/src/lib/calendar/types.ts

export interface CalendarEvent {
  id: string;
  externalId?: string;
  title: string;
  description?: string;
  location?: string;
  startTime: Date;
  endTime: Date;
  allDay: boolean;
  timezone: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  visibility: 'default' | 'public' | 'private';
  attendees: EventAttendee[];
  conferenceData?: ConferenceData;
  reminders: EventReminder[];
  recurrence?: EventRecurrence;
  // CRM linking
  linkedLeadId?: string;
  linkedCustomerId?: string;
  linkedOpportunityId?: string;
  linkedTaskId?: string;
  // Metadata
  color?: string;
  tags: string[];
  // Sync
  syncStatus: 'synced' | 'pending' | 'error' | 'conflict';
}

export interface CalendarIntegration {
  id: string;
  provider: 'google' | 'microsoft';
  providerEmail: string;
  status: 'connected' | 'disconnected' | 'expired' | 'error';
  syncEnabled: boolean;
  lastSyncAt?: Date;
}

export interface CalendarViewState {
  view: 'month' | 'week' | 'day' | 'agenda';
  currentDate: Date;
  selectedEventId?: string;
  filters: {
    integrationIds: string[];
    eventTypes: string[];
    linkedEntityType?: 'lead' | 'customer' | 'opportunity';
  };
}

export interface EventFormData {
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  startTime: string;
  endDate: Date;
  endTime: string;
  allDay: boolean;
  timezone: string;
  attendees: Array<{ email: string; name?: string }>;
  createConference: boolean;
  linkedLeadId?: string;
  linkedCustomerId?: string;
  linkedOpportunityId?: string;
  reminders: Array<{ method: 'email' | 'popup'; minutes: number }>;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    until?: Date;
  };
}
```

### 3.5 Hooks Principales

```typescript
// apps/web/src/lib/calendar/hooks.ts

// Hook para obtener eventos en un rango de fechas
export function useCalendarEvents(options: {
  startDate: Date;
  endDate: Date;
  integrationIds?: string[];
}) {
  return useQuery({
    queryKey: ['calendar-events', options],
    queryFn: () => calendarApi.getEvents(options),
  });
}

// Hook para integraciones del usuario
export function useCalendarIntegrations() {
  return useQuery({
    queryKey: ['calendar-integrations'],
    queryFn: () => calendarApi.getIntegrations(),
  });
}

// Hook para crear evento
export function useCreateEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: EventFormData) => calendarApi.createEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
    },
  });
}

// Hook para estado del calendario
export function useCalendarState() {
  const [state, setState] = useState<CalendarViewState>({
    view: 'month',
    currentDate: new Date(),
    filters: { integrationIds: [], eventTypes: [] },
  });
  // ... navigation, filter methods
}
```

---

## FASE 4: Diseno UX/UI

### 4.1 Wireframe - Vista Principal

```
┌──────────────────────────────────────────────────────────────────────┐
│  [<] Diciembre 2025 [>]  [Hoy]  │ Mes │ Semana │ Dia │  [+ Evento]  │
├──────────────────────────────────────────────────────────────────────┤
│  Lu    Ma    Mi    Ju    Vi    Sa    Do                              │
├──────────────────────────────────────────────────────────────────────┤
│   1  │  2  │  3  │  4  │  5  │  6  │  7  │                           │
│      │█████│     │     │     │     │     │  █ = Evento               │
├──────┼─────┼─────┼─────┼─────┼─────┼─────┤                           │
│   8  │  9  │ 10  │ 11  │ 12  │ 13  │ 14  │                           │
│      │     │█████│     │     │     │     │                           │
├──────┼─────┼─────┼─────┼─────┼─────┼─────┤                           │
│  15  │ 16  │ 17  │ 18  │ 19  │ 20  │ 21  │                           │
│      │     │     │█████│█████│     │     │                           │
├──────┼─────┼─────┼─────┼─────┼─────┼─────┤                           │
│  22  │ 23  │ 24  │ 25  │ 26  │ 27  │ 28  │                           │
│      │     │     │     │     │     │     │                           │
├──────┼─────┼─────┼─────┼─────┼─────┼─────┤                           │
│  29  │ 30  │ 31  │     │     │     │     │                           │
│█████ │     │     │     │     │     │     │                           │
└──────────────────────────────────────────────────────────────────────┘
                          │
                          ▼ (Click en evento)
┌─────────────────────────────────────────────────┐
│ [Sheet lateral]                                 │
│                                                 │
│ Reunion con Cliente ACME                        │
│ ─────────────────────────                       │
│ 📅 29 Dic 2025, 10:00 - 11:00                  │
│ 📍 Google Meet                                  │
│ 👤 Cliente: ACME Corp                           │
│                                                 │
│ Descripcion:                                    │
│ Demo del producto para equipo de ventas...      │
│                                                 │
│ Asistentes:                                     │
│  ✅ juan@acme.com (Aceptado)                    │
│  ⏳ maria@acme.com (Pendiente)                  │
│                                                 │
│ [Editar]  [Cancelar]  [Unirse a Meet]          │
└─────────────────────────────────────────────────┘
```

### 4.2 Vista Semanal

```
┌────────────────────────────────────────────────────────────────────┐
│          │ Lun 29 │ Mar 30 │ Mie 31 │ Jue 1  │ Vie 2  │ Sab 3  │  │
├──────────┼────────┼────────┼────────┼────────┼────────┼────────┤  │
│ 08:00    │        │        │        │        │        │        │  │
├──────────┼────────┼────────┼────────┼────────┼────────┼────────┤  │
│ 09:00    │        │████████│        │        │        │        │  │
│          │        │ Demo   │        │        │        │        │  │
├──────────┼────────┼────────┼────────┼────────┼────────┼────────┤  │
│ 10:00    │████████│████████│        │████████│        │        │  │
│          │ Llamada│ Cliente│        │ Reunion│        │        │  │
├──────────┼────────┼────────┼────────┼────────┼────────┼────────┤  │
│ 11:00    │████████│        │        │████████│        │        │  │
│          │        │        │        │        │        │        │  │
├──────────┼────────┼────────┼────────┼────────┼────────┼────────┤  │
│ 12:00    │        │        │        │        │        │        │  │
└──────────┴────────┴────────┴────────┴────────┴────────┴────────┘  │
```

### 4.3 Formulario de Evento

```
┌─────────────────────────────────────────────────────────────────┐
│ Nuevo Evento                                            [✕]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Titulo *                                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Reunion con cliente                                         │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ Fecha y hora                                                    │
│ ┌────────────────┐  ┌────────┐  ─  ┌────────────────┐  ┌──────┐│
│ │ 29/12/2025     │  │ 10:00  │     │ 29/12/2025     │  │11:00 ││
│ └────────────────┘  └────────┘     └────────────────┘  └──────┘│
│                                                                 │
│ ☐ Todo el dia                                                   │
│                                                                 │
│ Ubicacion                                                       │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ Oficina central / Link de Meet                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ☑ Agregar videollamada (Google Meet)                            │
│                                                                 │
│ Vincular a:                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ 🏢 Cliente: ACME Corp                              [✕]      │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ [+ Buscar Lead/Cliente/Oportunidad]                             │
│                                                                 │
│ Asistentes                                                      │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ juan@acme.com                                               │ │
│ └─────────────────────────────────────────────────────────────┘ │
│ [+ Agregar asistente]                                           │
│                                                                 │
│ Recordatorio                                                    │
│ ┌──────────────────────────────┐                                │
│ │ 15 minutos antes  ▼          │                                │
│ └──────────────────────────────┘                                │
│                                                                 │
│ Descripcion                                                     │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│                              [Cancelar]  [Guardar Evento]       │
└─────────────────────────────────────────────────────────────────┘
```

### 4.4 Componentes UI Necesarios

| Componente | Biblioteca | Personalizado |
|------------|------------|---------------|
| Grid Calendario | `@fullcalendar/react` | Estilos Ventazo |
| Date picker | `react-day-picker` (existente) | - |
| Time picker | Nuevo | - |
| Sheet lateral | `@radix-ui/sheet` (existente) | - |
| Formulario | `react-hook-form` + `zod` | - |
| Combobox (vincular) | Existente | - |

### 4.5 Colores de Eventos

```css
/* Por tipo de evento */
.event-meeting    { background: var(--color-blue-500); }
.event-call       { background: var(--color-green-500); }
.event-demo       { background: var(--color-purple-500); }
.event-follow-up  { background: var(--color-amber-500); }
.event-task       { background: var(--color-slate-500); }
.event-blocked    { background: var(--color-red-500); }

/* Por estado */
.event-tentative  { opacity: 0.6; border-style: dashed; }
.event-cancelled  { text-decoration: line-through; opacity: 0.5; }
```

---

## FASE 5: Plan de Implementacion

### 5.1 Roadmap Tecnico

```
SPRINT 1: Infraestructura Frontend (Dias 1-3)
├── [1.1] Crear estructura de carpetas
├── [1.2] Implementar tipos TypeScript
├── [1.3] Crear API client (lib/calendar/api.ts)
├── [1.4] Implementar hooks basicos
└── [1.5] Agregar ruta en Next.js API proxy

SPRINT 2: Vista de Calendario (Dias 4-7)
├── [2.1] Integrar @fullcalendar/react
├── [2.2] Componente CalendarGrid (mes/semana/dia)
├── [2.3] Componente CalendarToolbar (navegacion)
├── [2.4] Componente EventCard en grid
└── [2.5] CalendarEmptyState

SPRINT 3: CRUD de Eventos (Dias 8-11)
├── [3.1] EventFormSheet (crear/editar)
├── [3.2] EventDetailSheet (ver detalles)
├── [3.3] Validacion con zod
├── [3.4] Vincular a Lead/Cliente/Oportunidad
└── [3.5] Manejo de errores y loading states

SPRINT 4: Integraciones OAuth (Dias 12-14)
├── [4.1] UI de conectar Google Calendar
├── [4.2] UI de conectar Microsoft Outlook
├── [4.3] Pagina de callback OAuth
├── [4.4] Gestion de integraciones en Settings
└── [4.5] Indicador de estado de sincronizacion

SPRINT 5: Hardening (Dias 15-17)
├── [5.1] Tests unitarios (Vitest)
├── [5.2] Tests E2E criticos (Playwright)
├── [5.3] Manejo de zonas horarias
├── [5.4] Optimizacion de performance
└── [5.5] Accesibilidad basica (a11y)
```

### 5.2 Dependencias NPM a Agregar

```json
{
  "@fullcalendar/core": "^6.1.x",
  "@fullcalendar/react": "^6.1.x",
  "@fullcalendar/daygrid": "^6.1.x",
  "@fullcalendar/timegrid": "^6.1.x",
  "@fullcalendar/interaction": "^6.1.x",
  "date-fns-tz": "^2.x"
}
```

### 5.3 Tareas Detalladas

#### Tarea 1.1: Estructura de Carpetas
```bash
mkdir -p apps/web/src/app/app/calendar/components
mkdir -p apps/web/src/lib/calendar
touch apps/web/src/lib/calendar/types.ts
touch apps/web/src/lib/calendar/hooks.ts
touch apps/web/src/lib/calendar/api.ts
touch apps/web/src/lib/calendar/utils.ts
```

#### Tarea 1.3: API Client
```typescript
// apps/web/src/lib/calendar/api.ts
import { apiClient } from '@/lib/api/api-client';
import type { CalendarEvent, CalendarIntegration } from './types';

export const calendarApi = {
  getIntegrations: () =>
    apiClient.get<CalendarIntegration[]>('/calendar/integrations'),

  getEvents: (options: { startDate: Date; endDate: Date }) =>
    apiClient.get<{ items: CalendarEvent[]; total: number }>('/calendar/events', {
      params: {
        startTime: options.startDate.toISOString(),
        endTime: options.endDate.toISOString(),
      },
    }),

  createEvent: (integrationId: string, data: CreateEventRequest) =>
    apiClient.post<CalendarEvent>(
      `/calendar/integrations/${integrationId}/events`,
      data
    ),

  // ... resto de metodos
};
```

### 5.4 Lo que se Implementa Ahora vs Despues

| Funcionalidad | Sprint | Estado |
|---------------|--------|--------|
| Vista mensual | S2 | Implementar ahora |
| Vista semanal | S2 | Implementar ahora |
| Crear evento | S3 | Implementar ahora |
| Editar evento | S3 | Implementar ahora |
| Vincular a CRM | S3 | Implementar ahora |
| Conectar Google | S4 | Implementar ahora |
| Conectar Microsoft | S4 | Implementar ahora |
| Vista diaria | S2 | Preparado (feature flag) |
| Drag & drop | S2 | Preparado (feature flag) |
| Eventos recurrentes UI | S3 | Preparado (backend listo) |
| Webhooks (sync RT) | Futuro | Backend listo |
| Notificaciones push | Futuro | Pendiente |

---

## FASE 6: Recomendaciones y Decisiones

### 6.1 Decisiones Arquitectonicas

| Decision | Justificacion | Alternativas Consideradas |
|----------|---------------|---------------------------|
| Usar @fullcalendar/react | Biblioteca madura, extensible, bien documentada | react-big-calendar (menos features), custom (mucho esfuerzo) |
| Vista inicial: mes | Es la vista mas comun para calendario | Semana (requiere mas scroll) |
| Sheet para detalles | Consistente con resto de la app (leads, tasks) | Modal (menos espacio), nueva pagina (rompe flujo) |
| No implementar drag&drop inicialmente | Complejidad alta, valor medio | Implementar desde inicio (costoso) |

### 6.2 Recomendaciones de Seguridad

1. **Tokens OAuth**: Ya se almacenan en DB (backend). Considerar encriptacion en produccion.
2. **Scope minimo**: Solo solicitar scopes necesarios de Google/Microsoft.
3. **Validacion**: Zod en frontend y backend para toda entrada.
4. **Autorizacion**: Verificar que usuario tenga acceso a la integracion antes de operar.

### 6.3 Recomendaciones de Performance

1. **Virtualizacion**: Para listas largas de eventos, usar `react-window`.
2. **Paginacion**: Ya implementada en backend, usar en frontend.
3. **Cache**: React Query con stale time de 5 minutos.
4. **Lazy loading**: Cargar eventos solo del mes visible.

### 6.4 Recomendaciones de UX

1. **Feedback inmediato**: Optimistic updates para crear/editar eventos.
2. **Estados de carga**: Skeleton loaders en el grid.
3. **Errores claros**: Mensajes especificos para conflictos de sincronizacion.
4. **Accesibilidad**: Navegacion por teclado en el calendario.

### 6.5 Metricas de Exito

| Metrica | Objetivo | Como Medir |
|---------|----------|------------|
| Tiempo de carga inicial | < 1.5s | Lighthouse |
| Creacion de evento | < 2s (respuesta) | APM |
| Tasa de error OAuth | < 5% | Logs backend |
| Usuarios con calendario conectado | > 30% a 30 dias | Analytics |

---

## Resumen Ejecutivo

### Estado Actual
- **Backend**: 100% funcional con Google Calendar y Microsoft Outlook
- **Frontend**: Solo placeholder "Coming Soon"
- **Base de Datos**: Esquemas completos y migraciones aplicadas

### Trabajo Requerido
- Implementar 5-6 componentes React principales
- Crear hooks y cliente API
- Integrar libreria de calendario (@fullcalendar)
- UI de conexion OAuth

### Tiempo Estimado
- **MVP funcional**: 2-3 semanas (1 desarrollador frontend)
- **Version completa con drag&drop**: 3-4 semanas

### Riesgos Mitigados
- Backend ya maneja refresh de tokens
- Conflictos de sincronizacion manejados con etag
- Multi-tenant isolation ya implementado

---

*Documento generado automaticamente. Para dudas, consultar el codigo fuente o el equipo de arquitectura.*

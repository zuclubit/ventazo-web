# FASE 5.4 - OPPORTUNITIES MODULE COMPLETADO

## Resumen Ejecutivo

El modulo de Oportunidades ha sido implementado exitosamente como el modulo central del CRM para gestionar oportunidades de venta, forecast de ingresos y cierres. Este modulo permite hacer seguimiento completo del pipeline de ventas con vista Kanban, estadisticas en tiempo real y flujos de ganada/perdida.

## Fecha de Completado
Diciembre 2024

## Componentes Implementados

### 1. Database Schema (Drizzle ORM)

#### Tabla `opportunities` (Actualizada)
```typescript
// Cambios realizados:
- name -> title: varchar(200) - Titulo de la oportunidad
- stage (varchar) -> stageId (uuid) - Referencia a opportunity_pipeline_stages
- amount: real - Monto (cambio de integer a real)
- lostReason: text - Motivo de perdida
- wonNotes: text - Notas de cierre ganado
```

#### Tabla `opportunity_pipeline_stages` (Nueva)
```typescript
- id: uuid (PK)
- tenantId: uuid (FK)
- label: varchar(100)
- description: text
- order: integer
- color: varchar(20) - Color hex para UI
- probability: integer - Probabilidad de cierre (0-100)
- stageType: varchar(20) - 'open' | 'won' | 'lost'
- isDefault: boolean
- isActive: boolean
- createdAt, updatedAt: timestamps
- Indices: tenantId_order_idx, tenantId_isActive_idx
```

#### Tabla `opportunity_notes` (Nueva)
```typescript
- id: uuid (PK)
- tenantId: uuid (FK)
- opportunityId: uuid (FK -> opportunities)
- createdBy: uuid
- content: text
- isPinned: boolean
- metadata: jsonb
- createdAt, updatedAt: timestamps
- Indices: opportunityId_idx, tenantId_idx
```

#### Tabla `opportunity_activity` (Nueva)
```typescript
- id: uuid (PK)
- tenantId: uuid (FK)
- opportunityId: uuid (FK -> opportunities)
- userId: uuid
- actionType: varchar(50)
- description: text
- metadata: jsonb
- changes: jsonb
- createdAt: timestamp
- Indice: opportunityId_createdAt_idx
```

### 2. API Endpoints (Backend)

#### Opportunity CRUD
- `GET /api/v1/opportunities` - Lista con filtros y paginacion
- `GET /api/v1/opportunities/:id` - Obtener oportunidad por ID
- `POST /api/v1/opportunities` - Crear nueva oportunidad
- `PATCH /api/v1/opportunities/:id` - Actualizar oportunidad
- `DELETE /api/v1/opportunities/:id` - Eliminar oportunidad

#### Opportunity Actions
- `PATCH /api/v1/opportunities/:id/status` - Cambiar status (open/stalled)
- `PATCH /api/v1/opportunities/:id/stage` - Cambiar etapa (auto-actualiza probability)
- `PATCH /api/v1/opportunities/:id/owner` - Asignar propietario
- `POST /api/v1/opportunities/:id/win` - Marcar como ganada
- `POST /api/v1/opportunities/:id/lost` - Marcar como perdida

#### Opportunity Notes
- `GET /api/v1/opportunities/:id/notes` - Listar notas
- `POST /api/v1/opportunities/:id/notes` - Agregar nota
- `PATCH /api/v1/opportunities/:id/notes/:noteId` - Actualizar nota
- `DELETE /api/v1/opportunities/:id/notes/:noteId` - Eliminar nota

#### Opportunity Activity
- `GET /api/v1/opportunities/:id/activity` - Historial de actividad (paginado)

#### Pipeline
- `GET /api/v1/opportunities/pipeline/stages` - Obtener etapas
- `POST /api/v1/opportunities/pipeline/stages` - Crear etapa
- `GET /api/v1/opportunities/pipeline/view` - Vista Kanban completa con totales

### 3. Frontend Types (`/lib/opportunities/types.ts`)

#### Enums & Constants
```typescript
OPPORTUNITY_STATUS = ['open', 'won', 'lost', 'stalled']
OPPORTUNITY_PRIORITY = ['low', 'medium', 'high', 'critical']
OPPORTUNITY_STAGE_TYPE = ['open', 'won', 'lost']
OPPORTUNITY_ACTIVITY_TYPE = ['created', 'updated', 'status_changed', 'stage_changed', ...]
```

#### Display Helpers
- `STATUS_LABELS` / `STATUS_COLORS` - Etiquetas y colores por status
- `PRIORITY_LABELS` / `PRIORITY_COLORS` - Etiquetas y colores por prioridad
- `STAGE_TYPE_LABELS` / `STAGE_TYPE_COLORS` - Etiquetas y colores por tipo de etapa
- `ACTIVITY_LABELS` / `ACTIVITY_COLORS` - Etiquetas y colores por tipo de actividad

#### Interfaces
- `Opportunity` - Modelo principal
- `OpportunityNote` - Notas de la oportunidad
- `OpportunityActivity` - Actividad de la oportunidad
- `OpportunityPipelineStage` - Etapa del pipeline
- `PipelineColumn` - Columna para Kanban
- `PipelineView` - Vista completa del pipeline

#### Utility Functions
- `calculateForecast(amount, probability)` - Calcula forecast
- `formatCurrency(amount, currency)` - Formatea moneda
- `getStatusIcon(status)` - Icono por status
- `getPriorityIcon(priority)` - Icono por prioridad

### 4. React Query Hooks (`/lib/opportunities/hooks.ts`)

#### Query Hooks
- `useOpportunities(filters?, sort?, pagination?)` - Lista de oportunidades
- `useOpportunity(opportunityId)` - Oportunidad individual
- `useOpportunityStatistics()` - Estadisticas
- `useOpportunityNotes(opportunityId)` - Notas de la oportunidad
- `useOpportunityActivity(opportunityId)` - Actividad
- `usePipelineStages()` - Etapas del pipeline
- `usePipelineView()` - Vista Kanban

#### Mutation Hooks
- `useCreateOpportunity()` - Crear oportunidad
- `useUpdateOpportunity()` - Actualizar oportunidad
- `useDeleteOpportunity()` - Eliminar oportunidad
- `useUpdateOpportunityStage()` - Cambiar etapa (Kanban)
- `useUpdateOpportunityStatus()` - Cambiar status
- `useAssignOpportunityOwner()` - Asignar propietario
- `useMarkOpportunityWon()` - Marcar ganada
- `useMarkOpportunityLost()` - Marcar perdida
- `useAddOpportunityNote()` - Agregar nota
- `useUpdateOpportunityNote()` - Actualizar nota
- `useDeleteOpportunityNote()` - Eliminar nota
- `useCreatePipelineStage()` - Crear etapa

#### Combined Hooks
- `useOpportunityDetail(opportunityId)` - Oportunidad + notes + activity + stages
- `useOpportunityManagement()` - CRUD + statistics + refetch
- `useOpportunityNotesManagement(opportunityId)` - Notes CRUD
- `usePipelineManagement()` - Pipeline view + stage management + win/lost

### 5. Paginas Frontend

#### `/app/opportunities/page.tsx` - Lista de Oportunidades
- **Estadisticas**: Pipeline Total, Forecast, Ganadas, Win Rate
- **Filtros**: Busqueda, Status, Etapa, Prioridad
- **DataTable**: Ordenamiento, Paginacion
- **Acciones**: Crear, Editar, Eliminar, Marcar Ganada/Perdida, Ver detalle
- **RBAC**: Acciones protegidas por rol

#### `/app/opportunities/pipeline/page.tsx` - Kanban Pipeline
- **Columnas**: Una por cada etapa del pipeline
- **Cards**: Oportunidad con info basica, monto, probability, tags
- **Drag & Drop**: Nativo HTML5, actualiza etapa automaticamente
- **Visual**: Colores por etapa, indicadores de probability
- **Totales**: Por columna (monto y forecast) y globales

#### `/app/opportunities/[opportunityId]/page.tsx` - Detalle de Oportunidad
- **Metricas**: Monto, Probabilidad, Forecast, Fecha Cierre
- **Tabs**:
  - Overview: Info general, status, prioridad, etapa, descripcion, tags
  - Notes: CRUD de notas con pin
  - Activity: Timeline de actividad (paginado)
  - Related: Cliente, Lead, Propietario, Contacto
- **Acciones**: Editar, Eliminar, Marcar Ganada/Perdida

### 6. Componentes de Dialogo

#### `opportunity-form-dialog.tsx`
- Formulario completo con validacion Zod
- Campos: Titulo, Descripcion, Etapa, Prioridad, Monto, Moneda, Probabilidad (slider), Fecha Cierre, Tags
- Auto-actualiza probabilidad al cambiar etapa
- Muestra forecast en tiempo real
- Modo creacion y edicion

#### `delete-opportunity-dialog.tsx`
- Confirmacion de eliminacion
- Muestra info de la oportunidad a eliminar

#### `win-lost-dialog.tsx`
- Flujo para marcar Ganada o Perdida
- Ganada: Notas de cierre (opcional)
- Perdida: Motivo de perdida (requerido)
- Estado de exito con feedback visual

### 7. RBAC (Control de Acceso)

| Rol | Permisos |
|-----|----------|
| Owner/Admin | CRUD completo, Configurar pipeline, Win/Lost |
| Manager | Editar, Asignar, Win/Lost, Ver todo |
| Sales Rep | Crear, Editar propios, Win/Lost propios |
| Viewer | Solo lectura |

### 8. Multi-tenancy

- Todos los endpoints validan `x-tenant-id` header
- Queries filtradas por `tenantId`
- Pipeline stages separado por tenant
- RLS en base de datos
- Aislamiento completo de datos

### 9. Forecast Formula

```
Forecast = Amount x (Probability / 100)
```

Ejemplo:
- Monto: $100,000
- Probabilidad: 70%
- Forecast: $70,000

La probabilidad se actualiza automaticamente basada en la etapa del pipeline.

## Estructura de Archivos

```
apps/web/src/
├── app/app/opportunities/
│   ├── page.tsx                      # Lista de oportunidades
│   ├── pipeline/
│   │   └── page.tsx                  # Vista Kanban
│   ├── [opportunityId]/
│   │   └── page.tsx                  # Detalle de oportunidad
│   └── components/
│       ├── opportunity-form-dialog.tsx  # Formulario crear/editar
│       ├── delete-opportunity-dialog.tsx # Confirmar eliminacion
│       └── win-lost-dialog.tsx          # Flujo ganada/perdida
└── lib/opportunities/
    ├── index.ts                      # Exports
    ├── types.ts                      # Tipos e interfaces
    └── hooks.ts                      # React Query hooks

services/lead-service/src/
├── infrastructure/database/
│   └── schema.ts                     # Tablas: opportunities, opportunity_notes,
│                                     # opportunity_activity, opportunity_pipeline_stages
└── presentation/
    └── routes/
        └── opportunity.routes.ts     # Endpoints completos
```

## Dependencias Utilizadas

- **React Query (TanStack Query)**: Gestion de estado servidor
- **Zod**: Validacion de schemas
- **Drizzle ORM**: Queries y migraciones
- **date-fns**: Formateo de fechas
- **Lucide React**: Iconos
- **shadcn/ui**: Componentes UI (Calendar, Form, Slider, AlertDialog)
- **HTML5 Drag & Drop API**: Para Kanban

## Proximos Pasos Sugeridos

1. **Integraciones**: Conectar con modulo de Leads para conversion automatica
2. **Automatizaciones**: Workflows al cambiar etapa/status
3. **Reportes**: Dashboard de pipeline, forecast por periodo, conversion rates
4. **Notificaciones**: Alertas de fechas de cierre, oportunidades estancadas

## Build Status

```
✓ Compiled successfully
✓ TypeScript types valid
✓ Linting passed (warnings only)

Routes:
├ /app/opportunities           - Lista con filtros
├ /app/opportunities/[id]      - Detalle con tabs
└ /app/opportunities/pipeline  - Vista Kanban
```

---

**Modulo completado y listo para produccion.**

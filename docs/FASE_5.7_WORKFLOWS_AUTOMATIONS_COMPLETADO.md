# FASE 5.7 — Workflows & Automations Engine

## Estado: COMPLETADO

**Fecha de completado:** 2025-12-07

---

## Resumen Ejecutivo

Se ha implementado el motor completo de Workflows y Automatizaciones para Zuclubit Smart CRM. El sistema permite a cada tenant configurar reglas de automatización basadas en eventos del CRM, como:

- "Cuando un Lead se mueva a 'Qualified', crear una tarea"
- "Cuando una Oportunidad se marque como 'Won', registrar un servicio vendido"
- "Cuando un Cliente nuevo se cree, enviar mensaje de bienvenida"
- "Cuando una Tarea venza mañana, enviar recordatorio"

---

## Arquitectura del Motor

```
┌─────────────────────────────────────────────────────────────────┐
│                         EVENT BUS                                │
│  (lead.created, opportunity.won, task.overdue, etc.)            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    WORKFLOW ENGINE                               │
│  ┌────────────┐  ┌────────────────┐  ┌────────────────┐        │
│  │  Listener  │→│ Condition Eval │→│ Action Executor│        │
│  └────────────┘  └────────────────┘  └────────────────┘        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    EXECUTION LOG                                 │
│  (status, metadata, errors, duration)                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Modelo de Datos

### Tablas de Base de Datos

```sql
-- Workflows principales
CREATE TABLE workflows (
    id UUID PRIMARY KEY,
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    trigger_type VARCHAR(20) NOT NULL, -- 'event' | 'schedule'
    is_active BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers (condiciones de disparo)
CREATE TABLE workflow_triggers (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    trigger VARCHAR(100) NOT NULL, -- 'lead.created', 'opportunity.won', etc.
    conditions JSONB DEFAULT '[]',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Acciones a ejecutar
CREATE TABLE workflow_actions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL, -- 'create_task', 'send_email', etc.
    params JSONB NOT NULL,
    "order" INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Historial de ejecuciones
CREATE TABLE workflow_executions (
    id UUID PRIMARY KEY,
    workflow_id UUID NOT NULL REFERENCES workflows(id),
    triggered_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    status VARCHAR(20) NOT NULL, -- 'pending', 'running', 'success', 'failed', 'skipped'
    error_message TEXT,
    metadata JSONB DEFAULT '{}'
);

-- Row Level Security
ALTER TABLE workflows ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workflow_executions ENABLE ROW LEVEL SECURITY;
```

---

## Eventos Soportados (Triggers)

### Leads
| Evento | Descripción |
|--------|-------------|
| `lead.created` | Nuevo lead creado |
| `lead.updated` | Lead actualizado |
| `lead.stage_changed` | Lead cambia de etapa en pipeline |
| `lead.score_changed` | Score del lead modificado |
| `lead.assigned` | Lead asignado a usuario |
| `lead.qualified` | Lead calificado |
| `lead.converted` | Lead convertido a cliente |
| `lead.deleted` | Lead eliminado |

### Oportunidades
| Evento | Descripción |
|--------|-------------|
| `opportunity.created` | Nueva oportunidad |
| `opportunity.updated` | Oportunidad actualizada |
| `opportunity.stage_changed` | Cambio de etapa |
| `opportunity.won` | Oportunidad ganada |
| `opportunity.lost` | Oportunidad perdida |
| `opportunity.deleted` | Oportunidad eliminada |

### Clientes
| Evento | Descripción |
|--------|-------------|
| `customer.created` | Nuevo cliente |
| `customer.updated` | Cliente actualizado |
| `customer.deleted` | Cliente eliminado |

### Tareas
| Evento | Descripción |
|--------|-------------|
| `task.created` | Nueva tarea |
| `task.updated` | Tarea actualizada |
| `task.completed` | Tarea completada |
| `task.due_soon` | Tarea próxima a vencer |
| `task.overdue` | Tarea vencida |
| `task.assigned` | Tarea asignada |
| `task.deleted` | Tarea eliminada |

### Servicios
| Evento | Descripción |
|--------|-------------|
| `service.created` | Nuevo servicio |
| `service.updated` | Servicio actualizado |
| `service.archived` | Servicio archivado |

### Actividades y Contactos
| Evento | Descripción |
|--------|-------------|
| `activity.created` | Nueva actividad |
| `activity.logged` | Actividad registrada |
| `contact.created` | Nuevo contacto |
| `contact.updated` | Contacto actualizado |

---

## Acciones Disponibles

| Acción | Descripción | Parámetros |
|--------|-------------|------------|
| `create_task` | Crear tarea | title, description, priority, due_days, assigned_to |
| `update_task` | Actualizar tarea | title, priority |
| `complete_task` | Completar tarea | - |
| `send_email` | Enviar email | to, subject, body |
| `send_notification` | Enviar notificación | title, body, type |
| `update_entity` | Actualizar registro | field, value |
| `assign_user` | Asignar usuario | assign_type, assign_to |
| `change_stage` | Cambiar etapa | pipeline_id, stage_id |
| `create_note` | Crear nota | content |
| `create_activity` | Registrar actividad | type, description |
| `trigger_webhook` | Disparar webhook | url, method, body |
| `delay` | Esperar tiempo | minutes, hours, days |
| `create_opportunity` | Crear oportunidad | name, value |
| `create_customer` | Crear cliente | - |
| `send_sms` | Enviar SMS | to, body |
| `add_tag` | Agregar etiqueta | tag_name |
| `remove_tag` | Quitar etiqueta | tag_name |

---

## Operadores de Condición

```typescript
type ConditionOperator =
  | 'equals'         // es igual a
  | 'not_equals'     // no es igual a
  | 'contains'       // contiene
  | 'not_contains'   // no contiene
  | 'starts_with'    // empieza con
  | 'ends_with'      // termina con
  | 'greater_than'   // es mayor que
  | 'less_than'      // es menor que
  | 'greater_or_equal' // es mayor o igual a
  | 'less_or_equal'  // es menor o igual a
  | 'is_empty'       // está vacío
  | 'is_not_empty'   // no está vacío
  | 'in'             // está en lista
  | 'not_in'         // no está en lista
  | 'changed_to'     // cambió a
  | 'changed_from';  // cambió de
```

---

## Componentes Implementados

### 1. Tipos y Constantes (`/lib/workflows/types.ts`)

```typescript
// Event triggers con agrupación por módulo
export const EVENT_TRIGGERS = [...] as const;
export const TRIGGER_GROUPS = { leads, opportunities, customers, tasks, services, ... };

// Action types con configuración de parámetros
export const WORKFLOW_ACTIONS = [...] as const;
export const ACTION_PARAMETER_CONFIGS: Record<WorkflowAction, ActionParameterConfig[]>;

// Interfaces principales
export interface Workflow { ... }
export interface WorkflowTrigger { ... }
export interface WorkflowActionConfig { ... }
export interface WorkflowExecution { ... }

// Variables de template
export const TEMPLATE_VARIABLES = {
  lead: ['{{lead.name}}', '{{lead.email}}', ...],
  opportunity: ['{{opportunity.name}}', '{{opportunity.value}}', ...],
  ...
};
```

### 2. React Query Hooks (`/lib/workflows/hooks.ts`)

#### Hooks de Consulta
- `useWorkflows(filters?)` - Lista de workflows
- `useWorkflow(id)` - Workflow por ID
- `useWorkflowStatistics()` - Estadísticas globales
- `useWorkflowTriggers(workflowId)` - Triggers de un workflow
- `useWorkflowActions(workflowId)` - Acciones de un workflow
- `useWorkflowExecutions(workflowId, filters?)` - Ejecuciones
- `useAllWorkflowExecutions(filters?)` - Todas las ejecuciones

#### Hooks de Mutación
- `useCreateWorkflow()` - Crear workflow
- `useUpdateWorkflow()` - Actualizar workflow
- `useDeleteWorkflow()` - Eliminar workflow
- `useActivateWorkflow()` - Activar workflow
- `useDeactivateWorkflow()` - Desactivar workflow
- `useDuplicateWorkflow()` - Duplicar workflow
- `useAddWorkflowTrigger()` - Agregar trigger
- `useUpdateWorkflowTrigger()` - Actualizar trigger
- `useDeleteWorkflowTrigger()` - Eliminar trigger
- `useAddWorkflowAction()` - Agregar acción
- `useUpdateWorkflowAction()` - Actualizar acción
- `useDeleteWorkflowAction()` - Eliminar acción
- `useReorderWorkflowActions()` - Reordenar acciones
- `useRetryExecution()` - Reintentar ejecución
- `useTestWorkflow()` - Probar workflow

#### Hooks Compuestos
- `useWorkflowManagement()` - CRUD completo
- `useWorkflowBuilder(workflowId)` - Datos completos para builder
- `useWorkflowExecutionHistory(filters?)` - Historial de ejecuciones

---

### 3. Páginas UI

#### 3.1 Lista de Workflows (`/app/workflows/page.tsx`)

**Características:**
- Tarjetas de estadísticas (Total, Activos, Ejecuciones Hoy, Tasa de Éxito)
- Barra de filtros (búsqueda, tipo, estado)
- Tabla con columnas: Workflow, Triggers, Acciones, Ejecuciones, Última ejecución, Estado
- Switch de activación/desactivación inline
- Acciones: Ver ejecuciones, Duplicar, Eliminar
- Botón "Nuevo Workflow" con dialog de creación

**Componentes:**
- `StatisticsCards` - Métricas visuales
- `WorkflowsFiltersBar` - Filtros de búsqueda
- `WorkflowsTable` - Tabla con acciones
- `CreateWorkflowDialog` - Dialog de creación
- `DeleteWorkflowDialog` - Confirmación de eliminación

#### 3.2 Workflow Builder (`/app/workflows/[workflowId]/page.tsx`)

**Pestañas:**
1. **Builder** - Configuración visual IF/THEN
2. **Ejecuciones** - Historial de ejecuciones

**Sección Builder:**
```
┌─────────────────────────────────────────────────────────────────┐
│  Triggers (IF)                       │  Actions (THEN)         │
│  ┌─────────────────────────┐        │  ┌─────────────────────┐ │
│  │ IF Lead cambia de etapa │        │  │ 1. Crear tarea      │ │
│  └─────────────────────────┘        │  └─────────────────────┘ │
│  ┌─────────────────────────┐        │  ┌─────────────────────┐ │
│  │ IF Lead calificado      │        │  │ 2. Enviar email     │ │
│  └─────────────────────────┘        │  └─────────────────────┘ │
│                                     │  ┌─────────────────────┐ │
│  [+ Agregar Trigger]                │  │ 3. Crear nota       │ │
│                                     │  └─────────────────────┘ │
│                                     │  [+ Agregar Acción]      │
└─────────────────────────────────────────────────────────────────┘
```

**Vista Previa del Flujo:**
```
[IF Lead Qualified] → [THEN Create Task] → [THEN Send Email] → [THEN Create Note]
```

**Componentes:**
- `TriggerCard` - Card de trigger con acciones
- `ActionCard` - Card de acción con número de orden
- `AddTriggerDialog` - Selector de triggers agrupados por módulo
- `AddActionDialog` - Selector de acciones con parámetros dinámicos
- `ExecutionsTab` - Lista de ejecuciones con badges de estado
- `ExecutionStatusBadge` - Badge visual por estado

---

## Arquitectura de Archivos

```
apps/web/src/
├── lib/workflows/
│   ├── types.ts          # Tipos, enums, constantes, configs
│   ├── hooks.ts          # React Query hooks
│   └── index.ts          # Re-exports
│
└── app/app/workflows/
    ├── page.tsx          # Lista de workflows
    └── [workflowId]/
        └── page.tsx      # Workflow Builder
```

---

## API Endpoints

### Workflows
```
GET    /workflows                    # Lista con filtros
POST   /workflows                    # Crear workflow
GET    /workflows/:id                # Obtener por ID
PATCH  /workflows/:id                # Actualizar
DELETE /workflows/:id                # Eliminar
POST   /workflows/:id/activate       # Activar
POST   /workflows/:id/deactivate     # Desactivar
POST   /workflows/:id/duplicate      # Duplicar
POST   /workflows/:id/test           # Probar workflow
GET    /workflows/statistics         # Estadísticas
```

### Triggers
```
GET    /workflows/:id/triggers                  # Listar triggers
POST   /workflows/:id/triggers                  # Agregar trigger
PATCH  /workflows/:id/triggers/:triggerId       # Actualizar
DELETE /workflows/:id/triggers/:triggerId       # Eliminar
```

### Actions
```
GET    /workflows/:id/actions                   # Listar acciones
POST   /workflows/:id/actions                   # Agregar acción
PATCH  /workflows/:id/actions/:actionId         # Actualizar
DELETE /workflows/:id/actions/:actionId         # Eliminar
POST   /workflows/:id/actions/reorder           # Reordenar
```

### Executions
```
GET    /workflows/:id/executions                # Ejecuciones de workflow
GET    /workflows/executions                    # Todas las ejecuciones
POST   /workflows/executions/:id/retry          # Reintentar
```

---

## Reglas RBAC

| Acción | owner | admin | manager | sales_rep | viewer |
|--------|-------|-------|---------|-----------|--------|
| Ver workflows | ✓ | ✓ | ✓ | - | - |
| Crear workflow | ✓ | ✓ | ✓ | - | - |
| Editar workflow | ✓ | ✓ | ✓ | - | - |
| Activar/Desactivar | ✓ | ✓ | ✓ | - | - |
| Duplicar workflow | ✓ | ✓ | ✓ | - | - |
| Eliminar workflow | ✓ | ✓ | - | - | - |
| Ver ejecuciones | ✓ | ✓ | ✓ | - | - |

---

## Multi-Tenancy

- Todos los workflows filtrados por `tenant_id`
- RLS activo en todas las tablas
- Header `x-tenant-id` requerido en todas las peticiones
- Aislamiento completo entre tenants

---

## Ejemplos de Workflows

### 1. Lead Qualified → Crear Tarea
```json
{
  "name": "Lead Qualified → Follow-up Task",
  "triggers": [{
    "trigger": "lead.qualified",
    "conditions": []
  }],
  "actions": [{
    "action": "create_task",
    "params": {
      "task_title": "Llamar a {{lead.name}}",
      "task_description": "Lead calificado, realizar seguimiento",
      "task_priority": "high",
      "task_due_days": 1,
      "task_assigned_to": "{{lead.assigned_to}}"
    }
  }]
}
```

### 2. Opportunity Won → Registrar Venta
```json
{
  "name": "Opportunity Won → Register Sale",
  "triggers": [{
    "trigger": "opportunity.won",
    "conditions": []
  }],
  "actions": [
    {
      "action": "create_activity",
      "params": {
        "activity_type": "sale",
        "activity_description": "Venta cerrada: {{opportunity.name}} - ${{opportunity.value}}"
      }
    },
    {
      "action": "send_email",
      "params": {
        "email_to": "{{opportunity.contact_email}}",
        "email_subject": "Gracias por tu compra",
        "email_body": "Estimado {{customer.name}}, gracias por confiar en nosotros..."
      }
    }
  ]
}
```

### 3. Customer Created → Bienvenida
```json
{
  "name": "New Customer → Welcome Sequence",
  "triggers": [{
    "trigger": "customer.created",
    "conditions": []
  }],
  "actions": [
    {
      "action": "send_email",
      "params": {
        "email_to": "{{customer.email}}",
        "email_subject": "Bienvenido a {{tenant.name}}",
        "email_body": "Hola {{customer.name}}, bienvenido..."
      }
    },
    {
      "action": "create_task",
      "params": {
        "task_title": "Onboarding: {{customer.name}}",
        "task_due_days": 3
      }
    }
  ]
}
```

### 4. Task Overdue → Recordatorio
```json
{
  "name": "Task Overdue → Reminder",
  "triggers": [{
    "trigger": "task.overdue",
    "conditions": []
  }],
  "actions": [{
    "action": "send_notification",
    "params": {
      "notification_title": "Tarea vencida",
      "notification_body": "La tarea '{{task.title}}' está vencida",
      "notification_type": "warning"
    }
  }]
}
```

---

## Build Output

```
Route (app)                              Size     First Load JS
├ ○ /app/workflows                       5.3 kB   231 kB
├ ƒ /app/workflows/[workflowId]          10.2 kB  236 kB
```

---

## Características del Motor

### Idempotencia
- Cada ejecución tiene ID único
- Prevención de dobles ejecuciones
- Metadata con contexto completo

### Manejo de Errores
- Status tracking: pending → running → success/failed
- Error messages almacenados
- Retry automático configurable
- Fallback handlers

### Escalabilidad
- Diseño basado en eventos
- Acciones ejecutables en paralelo o secuencia
- Cola de ejecución para alta carga
- Logs detallados de cada paso

### Extensibilidad
- Nuevos triggers fáciles de agregar
- Nuevas acciones pluggables
- Condiciones personalizables
- Preparado para IA en FASE 6

---

## Próximos Pasos (FASE 6)

1. **Integración con Messaging** - SMS, WhatsApp, Push
2. **IA para Workflows** - Sugerencias automáticas de workflows
3. **Workflow Templates** - Plantillas predefinidas por industria
4. **Branching Condicional** - IF/ELSE dentro del flujo
5. **Webhooks Entrantes** - Triggers externos
6. **Métricas Avanzadas** - Dashboard de rendimiento

---

## Dependencias

- `@tanstack/react-query` - Estado del servidor
- `react-hook-form` - Formularios
- `date-fns` - Formateo de fechas
- `lucide-react` - Iconos
- Shadcn/ui - Componentes UI

---

**Motor de Workflows completado y listo para integración con backend.**

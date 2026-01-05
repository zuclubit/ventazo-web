# Auditoría Técnica de Backend para AI CRM Assistant

**Fecha:** 2026-01-03
**Versión:** 1.0
**Autor:** Staff Backend Engineer (AI-assisted)
**Objetivo:** Evaluación completa del backend para soportar un AI Assistant conversacional que opere el CRM end-to-end

---

## Resumen Ejecutivo

El backend de Zuclubit Smart CRM está construido con una **arquitectura robusta y moderna** (Clean Architecture + DDD + CQRS), con **70+ módulos de infraestructura** y **793 endpoints REST**. Sin embargo, para soportar un **AI Assistant que opere el CRM completamente vía chat**, existen brechas significativas en:

1. **AI Agent Layer**: No existe orquestador de agentes ni sistema de function calling
2. **Action Execution Framework**: No hay framework para que el AI ejecute acciones del CRM
3. **Audit Trail para AI**: La auditoría existe pero está parcialmente implementada
4. **Confirmaciones Human-in-the-Loop**: No existe sistema de confirmación para acciones críticas

**Estado General: 65% listo** para AI Assistant básico, **35% por construir** para operación completa.

---

## 1. Inventario de Backend Existente

### 1.1 Arquitectura General

| Aspecto | Implementación |
|---------|----------------|
| **Patrón Arquitectónico** | Clean Architecture + DDD + CQRS |
| **Framework Web** | Fastify 4.29.1 |
| **ORM** | Drizzle ORM 0.29.5 |
| **Base de Datos** | PostgreSQL 16 |
| **DI Container** | tsyringe 4.8.0 |
| **Validación** | Zod 3.22.4 |
| **Event Streaming** | NATS JetStream |
| **Job Queue** | BullMQ + Redis |
| **Testing** | Vitest + supertest |

### 1.2 Estructura del Código

```
services/lead-service/
├── src/
│   ├── app.ts                    # Entry point
│   ├── presentation/             # Capa de presentación
│   │   ├── server.ts             # Fastify config
│   │   ├── routes/               # 71 archivos de rutas
│   │   └── middlewares/          # 9 middlewares
│   ├── application/              # Capa de aplicación (CQRS)
│   │   ├── commands/             # 24 comandos
│   │   └── queries/              # 12 queries
│   ├── infrastructure/           # 70 módulos de infraestructura
│   │   ├── database/             # Drizzle ORM + schema
│   │   ├── auth/                 # JWT nativo + RBAC
│   │   ├── ai/                   # Módulo AI básico
│   │   ├── workflows/            # Automatización
│   │   ├── webhooks/             # Webhooks salientes
│   │   ├── messaging/            # Notificaciones multi-canal
│   │   └── [+64 módulos más]
│   ├── shared/                   # Código compartido
│   │   └── domain/               # Value Objects, Aggregates
│   └── config/                   # container.ts, environment.ts
└── drizzle/                      # 14 migraciones SQL
```

### 1.3 Módulos de Infraestructura (70 componentes)

| Categoría | Módulos | Estado |
|-----------|---------|--------|
| **Core CRM** | leads, customers, opportunities, tasks, contacts, notes, quotes | ✅ Completo |
| **Comunicaciones** | email, sms, whatsapp, notifications, unified-inbox | ✅ Completo |
| **Pipeline** | pipelines, scoring, enrichment, deduplication | ✅ Completo |
| **Automatización** | workflows, workflow-builder, campaigns, drip-campaigns | ✅ Completo |
| **Analytics** | analytics, reports, forecasting, ml-scoring | ✅ Completo |
| **Seguridad** | auth, security, permissions, gdpr, rate-limiting | ✅ Completo |
| **Integraciones** | integration-hub, webhooks, messenger, payments | ✅ Completo |
| **AI** | ai (scoring, sentiment, email generation) | ⚠️ Parcial |
| **Auditoría** | audit, activity-tracking | ⚠️ Parcial |

### 1.4 Endpoints Disponibles (793 total)

| Dominio | Endpoints | Operaciones |
|---------|-----------|-------------|
| **Leads** | ~50 | CRUD, scoring, qualification, pipeline, notas |
| **Opportunities** | ~40 | CRUD, win/loss, pipeline stages |
| **Customers** | ~35 | CRUD, 360-view, health score |
| **Tasks** | ~25 | CRUD, assignment, completion |
| **Quotes** | ~24 | CRUD, send, accept, PDF generation |
| **Analytics** | ~20 | Dashboard, reports, forecasting |
| **Auth** | ~27 | Login, OAuth, 2FA, invitations |
| **Otros** | ~570 | Webhooks, workflows, integrations, etc. |

### 1.5 Base de Datos (54 tablas)

**Entidades Principales:**
- `leads` - Prospectos (12+ campos)
- `customers` - Clientes convertidos (20+ campos)
- `opportunities` - Oportunidades de venta (15+ campos)
- `tasks` - Tareas y recordatorios (15+ campos)
- `quotes` - Cotizaciones (30+ campos)
- `notes` - Notas polimórficas
- `activity_logs` - Audit trail

**Multi-tenant:** Todas las tablas tienen `tenant_id` con índices compuestos.

### 1.6 Autenticación y Autorización

| Componente | Estado | Detalles |
|------------|--------|----------|
| **JWT Nativo** | ✅ | HS256, access (1h) + refresh (7d) tokens |
| **RBAC** | ✅ | 5 roles: OWNER, ADMIN, MANAGER, SALES_REP, VIEWER |
| **Permisos** | ✅ | 28 permisos granulares (LEAD_READ_ALL, etc.) |
| **Multi-tenant** | ✅ | Aislamiento completo via `x-tenant-id` header |
| **2FA** | ✅ | TOTP + backup codes |
| **Account Lockout** | ✅ | 5 intentos → 15 min bloqueo |
| **Session Management** | ✅ | Revocación, tracking, geolocation |

### 1.7 Event-Driven Architecture

| Sistema | Tecnología | Estado |
|---------|------------|--------|
| **Event Publisher** | NATS JetStream | ✅ Funcional |
| **Job Queue** | BullMQ + Redis | ✅ 6 colas configuradas |
| **Cron Scheduler** | Node.js intervals | ✅ 10 trabajos programados |
| **Webhooks** | HTTP + DLQ | ✅ Con reintentos |

---

## 2. Capacidades Requeridas para AI Assistant

### 2.1 Seguridad & Contexto

| Capacidad | Estado | Observaciones |
|-----------|--------|---------------|
| Identidad del usuario | ✅ Existe | JWT payload + DB lookup |
| RBAC / ABAC | ✅ Existe | 5 roles, 28 permisos |
| Scoping por tenant | ✅ Existe | `x-tenant-id` obligatorio |
| Impersonación segura | ❌ No existe | AI no puede actuar "en nombre de" |
| Context por conversación | ❌ No existe | Sin tracking de sesión AI |

### 2.2 AI / Agent Layer

| Capacidad | Estado | Observaciones |
|-----------|--------|---------------|
| Orquestador de intents | ❌ No existe | No hay router de intenciones |
| Function calling / tools | ❌ No existe | AI no puede invocar endpoints |
| Validación pre-acción | ❌ No existe | Sin chequeos de permisos para AI |
| Validación post-acción | ❌ No existe | Sin verificación de resultados |
| Human-in-the-loop | ❌ No existe | Sin confirmaciones críticas |
| Manejo de errores semánticos | ❌ No existe | Sin interpretación de fallos |
| Context memory | ⚠️ Parcial | Existe `ai_conversations` pero básico |
| Multi-step reasoning | ❌ No existe | Sin cadenas de pensamiento |

### 2.3 Dominio & Negocio

| Capacidad | Estado | Observaciones |
|-----------|--------|---------------|
| Reglas de negocio centralizadas | ✅ Existe | En domain layer |
| Estados válidos de entidades | ✅ Existe | Enums y validaciones |
| Transiciones controladas | ✅ Existe | Via commands |
| Acciones compuestas | ⚠️ Parcial | Workflows, pero no via AI |
| Rollback / compensación | ❌ No existe | Sin saga pattern |

### 2.4 Auditoría & Observabilidad

| Capacidad | Estado | Observaciones |
|-----------|--------|---------------|
| Logs de acciones ejecutadas | ⚠️ Parcial | `activity_logs` existe pero incompleto |
| Trazabilidad por conversación | ❌ No existe | Sin correlationId de chat |
| Auditoría legal / empresarial | ⚠️ Parcial | GDPR parcial |
| Rollback de acciones | ❌ No existe | Sin compensaciones |
| Attribution de acciones AI | ❌ No existe | No distingue AI vs usuario |

### 2.5 Performance & Escalabilidad

| Capacidad | Estado | Observaciones |
|-----------|--------|---------------|
| Async jobs | ✅ Existe | BullMQ |
| Event-driven flows | ✅ Existe | NATS JetStream |
| Rate limits | ✅ Existe | Por endpoint |
| Caching estratégico | ✅ Existe | Memberships, stats |
| Streaming responses | ❌ No existe | Para respuestas largas AI |

---

## 3. Gap Analysis (Qué Falta Construir)

### Matriz de Brechas

| Funcionalidad | Estado Actual | Acción Requerida | Prioridad | Riesgo |
|---------------|---------------|------------------|-----------|--------|
| **AI Agent Orchestrator** | No existe | Crear capa de orquestación | 🔴 Alta | Crítico - sin esto no hay AI Assistant |
| **Tool Registry** | No existe | Registrar endpoints como tools | 🔴 Alta | Crítico - AI no puede actuar |
| **Action Execution Engine** | No existe | Middleware de ejecución con permisos | 🔴 Alta | Crítico - seguridad |
| **Conversation Context** | Básico | Expandir con state machine | 🟡 Media | AI pierde contexto |
| **Human-in-the-Loop** | No existe | Sistema de confirmaciones | 🟡 Media | Acciones críticas sin control |
| **AI Audit Trail** | Parcial | Completar persistencia | 🟡 Media | Sin trazabilidad legal |
| **Error Interpretation** | No existe | Mapeo de errores a lenguaje natural | 🟢 Baja | UX degradada |
| **Streaming Responses** | No existe | SSE para respuestas largas | 🟢 Baja | Latencia percibida |

### Detalle de Brechas Críticas

#### 3.1 AI Agent Orchestrator (No existe)

**Qué falta:**
- Router de intenciones (intent classification)
- Planificador de acciones (action planner)
- Ejecutor de secuencias (sequence executor)
- State machine para conversaciones

**Riesgo de no implementar:** El AI no puede operar el CRM - es bloqueante.

**Impacto en experiencia AI:** Total - sin orquestador no hay asistente funcional.

#### 3.2 Tool Registry / Function Calling (No existe)

**Qué falta:**
- Registro de endpoints como "tools"
- Schema validation para parámetros
- Permission checking pre-ejecución
- Result parsing y error handling

**Riesgo de no implementar:** AI no puede ejecutar acciones - bloqueante.

**Impacto en experiencia AI:** AI solo puede responder preguntas, no actuar.

#### 3.3 AI-Aware Audit Trail (Parcial)

**Qué falta:**
- `source: 'ai_assistant'` en logs
- `conversationId` para correlación
- `aiSessionId` para sesiones
- Attribution: "Ejecutado por AI en nombre de usuario X"

**Riesgo de no implementar:** Sin trazabilidad de qué hizo el AI.

**Impacto en experiencia AI:** Compliance/legal, debugging imposible.

---

## 4. Arquitectura Backend Objetivo (Target State)

### 4.1 Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│                     API Gateway Layer                            │
│  ┌─────────────────┐  ┌─────────────────┐  ┌────────────────┐   │
│  │   REST Routes   │  │  AI Chat Route  │  │ WebSocket (RT) │   │
│  └────────┬────────┘  └────────┬────────┘  └───────┬────────┘   │
└───────────┼────────────────────┼───────────────────┼────────────┘
            │                    │                   │
┌───────────┼────────────────────┼───────────────────┼────────────┐
│           │        AI AGENT ORCHESTRATOR LAYER     │            │
│           │    ┌──────────────────────────────┐    │            │
│           │    │     Intent Classifier        │    │            │
│           │    │  (NLU: entender qué quiere)  │    │            │
│           │    └─────────────┬────────────────┘    │            │
│           │                  │                     │            │
│           │    ┌─────────────▼────────────────┐    │            │
│           │    │      Action Planner          │    │            │
│           │    │  (Decidir qué tools usar)    │    │            │
│           │    └─────────────┬────────────────┘    │            │
│           │                  │                     │            │
│           │    ┌─────────────▼────────────────┐    │            │
│           │    │    Permission Validator      │    │            │
│           │    │  (RBAC check pre-ejecución)  │    │            │
│           │    └─────────────┬────────────────┘    │            │
│           │                  │                     │            │
│           │    ┌─────────────▼────────────────┐    │            │
│           │    │  Human-in-the-Loop Gate      │    │            │
│           │    │  (Confirmaciones críticas)   │    │            │
│           │    └─────────────┬────────────────┘    │            │
│           │                  │                     │            │
│           │    ┌─────────────▼────────────────┐    │            │
│           │    │     Action Executor          │    │            │
│           │    │  (Invocar tools/comandos)    │    │            │
│           │    └─────────────┬────────────────┘    │            │
│           │                  │                     │            │
│           │    ┌─────────────▼────────────────┐    │            │
│           │    │    Response Generator        │    │            │
│           │    │  (Formatear respuesta AI)    │    │            │
│           │    └──────────────────────────────┘    │            │
└───────────┼────────────────────────────────────────┼────────────┘
            │                                        │
┌───────────┼────────────────────────────────────────┼────────────┐
│           │         TOOL REGISTRY LAYER            │            │
│  ┌────────▼────────┐                               │            │
│  │   Tool: Lead    │  ┌─────────────┐  ┌──────────▼──────────┐  │
│  │ - create_lead   │  │Tool: Task   │  │ Tool: Opportunity   │  │
│  │ - update_lead   │  │- create_task│  │ - create_opportunity│  │
│  │ - get_lead      │  │- assign_task│  │ - update_stage      │  │
│  │ - qualify_lead  │  │- complete   │  │ - win/lose          │  │
│  └─────────────────┘  └─────────────┘  └────────────────────┘   │
│           │                  │                     │            │
│  ┌────────▼────────┐  ┌──────▼──────┐  ┌──────────▼──────────┐  │
│  │  Tool: Quote    │  │Tool: Search │  │ Tool: Analytics     │  │
│  │ - create_quote  │  │- search_all │  │ - get_dashboard     │  │
│  │ - send_quote    │  │- find_leads │  │ - get_pipeline_stats│  │
│  │ - accept_quote  │  │- find_tasks │  │ - get_forecast      │  │
│  └─────────────────┘  └─────────────┘  └────────────────────┘   │
└────────────────────────────────────────────────────────────────┘
            │
┌───────────┼────────────────────────────────────────────────────┐
│           │            APPLICATION LAYER (CQRS)                 │
│  ┌────────▼────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │   CommandBus    │  │  QueryBus   │  │   Event Publisher   │  │
│  │  (mutations)    │  │  (reads)    │  │   (side effects)    │  │
│  └────────┬────────┘  └──────┬──────┘  └──────────┬──────────┘  │
└───────────┼──────────────────┼────────────────────┼─────────────┘
            │                  │                    │
┌───────────┼──────────────────┼────────────────────┼─────────────┐
│           │           DOMAIN LAYER (DDD)          │             │
│  ┌────────▼────────┐  ┌──────▼──────┐  ┌──────────▼──────────┐  │
│  │   Aggregates    │  │   Value     │  │   Domain Events     │  │
│  │   (Lead, Task)  │  │   Objects   │  │   (LeadCreated...)  │  │
│  └─────────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
            │
┌───────────┼─────────────────────────────────────────────────────┐
│           │        INFRASTRUCTURE LAYER (Existente)             │
│  ┌────────▼────────┐  ┌─────────────┐  ┌─────────────────────┐  │
│  │    Database     │  │   Events    │  │   External APIs     │  │
│  │  (PostgreSQL)   │  │   (NATS)    │  │   (LLMs, Email...)  │  │
│  └─────────────────┘  └─────────────┘  └─────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 Componentes Nuevos a Construir

#### AI Agent Orchestrator

```typescript
// src/infrastructure/ai-agent/orchestrator.ts
interface AIAgentOrchestrator {
  // Procesar mensaje de usuario
  processMessage(input: AgentInput): Promise<AgentOutput>;

  // Clasificar intención
  classifyIntent(message: string): Promise<Intent>;

  // Planificar acciones
  planActions(intent: Intent, context: AgentContext): Promise<ActionPlan>;

  // Ejecutar plan
  executePlan(plan: ActionPlan): Promise<ExecutionResult>;

  // Generar respuesta
  generateResponse(result: ExecutionResult): Promise<string>;
}

interface AgentInput {
  tenantId: string;
  userId: string;
  conversationId: string;
  message: string;
  context?: Record<string, unknown>;
}

interface Intent {
  type: 'query' | 'action' | 'clarification' | 'confirmation';
  entity?: 'lead' | 'task' | 'opportunity' | 'customer' | 'quote';
  operation?: 'create' | 'read' | 'update' | 'delete' | 'search';
  confidence: number;
  parameters: Record<string, unknown>;
}
```

#### Tool Registry

```typescript
// src/infrastructure/ai-agent/tool-registry.ts
interface Tool {
  name: string;
  description: string;
  requiredPermissions: Permission[];
  parameters: JSONSchema;
  execute: (params: unknown, context: ToolContext) => Promise<ToolResult>;
  confirmationRequired: boolean;
}

const TOOL_REGISTRY: Tool[] = [
  {
    name: 'create_lead',
    description: 'Crear un nuevo lead en el CRM',
    requiredPermissions: ['LEAD_CREATE'],
    parameters: createLeadSchema,
    confirmationRequired: false,
    execute: async (params, ctx) => {
      const command = new CreateLeadCommand(ctx.tenantId, params);
      return commandBus.execute(command);
    }
  },
  {
    name: 'delete_lead',
    description: 'Eliminar un lead del CRM',
    requiredPermissions: ['LEAD_DELETE'],
    parameters: deleteLeadSchema,
    confirmationRequired: true, // Requiere confirmación
    execute: async (params, ctx) => {
      const command = new DeleteLeadCommand(ctx.tenantId, params.leadId);
      return commandBus.execute(command);
    }
  },
  // ... más tools
];
```

#### Human-in-the-Loop Gate

```typescript
// src/infrastructure/ai-agent/confirmation-gate.ts
interface ConfirmationGate {
  // Verificar si acción requiere confirmación
  requiresConfirmation(action: PlannedAction): boolean;

  // Solicitar confirmación
  requestConfirmation(action: PlannedAction): ConfirmationRequest;

  // Procesar respuesta de confirmación
  processConfirmation(requestId: string, confirmed: boolean): Promise<void>;
}

interface ConfirmationRequest {
  id: string;
  action: string;
  description: string;
  impact: 'low' | 'medium' | 'high' | 'critical';
  expiresAt: Date;
  options: {
    confirm: string;
    cancel: string;
    modify?: string;
  };
}
```

#### AI Audit Logger

```typescript
// src/infrastructure/ai-agent/ai-audit.ts
interface AIAuditLogger {
  logConversationStart(input: AgentInput): Promise<string>; // conversationId
  logMessage(conversationId: string, message: AIMessage): Promise<void>;
  logAction(conversationId: string, action: ExecutedAction): Promise<void>;
  logError(conversationId: string, error: AIError): Promise<void>;
  logConfirmation(conversationId: string, confirmation: ConfirmationResult): Promise<void>;
}

interface ExecutedAction {
  toolName: string;
  parameters: Record<string, unknown>;
  result: 'success' | 'failure' | 'pending_confirmation';
  entityType: string;
  entityId?: string;
  executedAt: Date;
  executedBy: string; // userId
  executedVia: 'ai_assistant';
  duration: number;
  changes?: { before: unknown; after: unknown };
}
```

### 4.3 Patrones Arquitectónicos Utilizados

| Patrón | Aplicación |
|--------|------------|
| **CQRS** | Separación comandos/queries (existente) |
| **DDD** | Aggregates, Value Objects, Domain Events (existente) |
| **Repository** | Abstracción de persistencia (existente) |
| **Mediator** | CommandBus/QueryBus (existente) |
| **Chain of Responsibility** | Intent → Plan → Validate → Execute → Response (nuevo) |
| **Strategy** | Múltiples LLM providers (existente) |
| **Factory** | Tool creation (nuevo) |
| **Observer** | Event publishing (existente) |
| **Saga** | Compensación de acciones fallidas (nuevo) |

---

## 5. Backlog Técnico Recomendado

### Epic 1: AI Agent Foundation

| ID | Historia Técnica | Descripción | Dependencias | Criterios de Aceptación |
|----|------------------|-------------|--------------|------------------------|
| AG-01 | **AI Agent Orchestrator Core** | Crear clase `AIAgentOrchestrator` con pipeline básico: receive → classify → plan → execute → respond | Ninguna | - Procesa mensajes de texto<br>- Retorna respuestas estructuradas<br>- Logging básico |
| AG-02 | **Intent Classifier** | Implementar clasificador de intenciones usando LLM | AG-01 | - Detecta 5 intents: query, create, update, delete, search<br>- Extrae entidad objetivo<br>- Confidence score > 0.7 |
| AG-03 | **Conversation Context Manager** | Gestionar estado de conversación multi-turn | AG-01 | - Persiste contexto en Redis<br>- TTL de 30 minutos<br>- Historial de últimos 10 mensajes |
| AG-04 | **AI Chat Endpoint** | Crear `POST /api/v1/ai/chat` con streaming | AG-01, AG-03 | - Autenticación JWT<br>- Tenant-aware<br>- SSE para streaming |

### Epic 2: Tool Registry & Execution

| ID | Historia Técnica | Descripción | Dependencias | Criterios de Aceptación |
|----|------------------|-------------|--------------|------------------------|
| TR-01 | **Tool Registry Core** | Crear registro de tools con schemas JSON | AG-01 | - Registro dinámico<br>- Validación de schemas<br>- Discovery endpoint |
| TR-02 | **Lead Tools** | Registrar tools para leads: create, read, update, delete, search, qualify | TR-01 | - 6 tools funcionales<br>- Permisos verificados<br>- Error handling |
| TR-03 | **Task Tools** | Registrar tools para tasks: create, read, update, complete, assign | TR-01 | - 5 tools funcionales |
| TR-04 | **Opportunity Tools** | Registrar tools para opportunities: create, read, update, win, lose | TR-01 | - 5 tools funcionales |
| TR-05 | **Quote Tools** | Registrar tools para quotes: create, read, send, accept | TR-01 | - 4 tools funcionales |
| TR-06 | **Search Tools** | Registrar tools de búsqueda global | TR-01 | - Búsqueda multi-entidad<br>- Filtros avanzados |

### Epic 3: Permission & Security

| ID | Historia Técnica | Descripción | Dependencias | Criterios de Aceptación |
|----|------------------|-------------|--------------|------------------------|
| PS-01 | **Permission Validator** | Middleware que valida permisos antes de ejecutar tool | TR-01 | - Bloquea sin permiso<br>- Log de intentos<br>- Mensaje explicativo |
| PS-02 | **AI Impersonation Guard** | Sistema que asegura que AI actúa con permisos del usuario | PS-01 | - No puede elevar permisos<br>- Audit trail completo |
| PS-03 | **Rate Limiter para AI** | Límites específicos para operaciones AI | PS-01 | - 100 req/min por usuario<br>- 1000 req/día por tenant |

### Epic 4: Human-in-the-Loop

| ID | Historia Técnica | Descripción | Dependencias | Criterios de Aceptación |
|----|------------------|-------------|--------------|------------------------|
| HL-01 | **Confirmation Gate** | Sistema de confirmación para acciones críticas | TR-01 | - Detecta acciones peligrosas<br>- Genera prompts claros |
| HL-02 | **Confirmation Persistence** | Almacenar confirmaciones pendientes | HL-01 | - TTL de 5 minutos<br>- Single-use tokens |
| HL-03 | **Confirmation UI Contract** | Definir contrato para UI de confirmación | HL-01 | - Schema documentado<br>- Ejemplos para frontend |

### Epic 5: AI Audit Trail

| ID | Historia Técnica | Descripción | Dependencias | Criterios de Aceptación |
|----|------------------|-------------|--------------|------------------------|
| AU-01 | **AI Audit Logger** | Logger específico para acciones AI | AG-01 | - Tabla `ai_action_logs`<br>- Source = 'ai_assistant' |
| AU-02 | **Conversation Tracking** | Correlacionar acciones por conversación | AU-01 | - `conversation_id` en todos los logs |
| AU-03 | **AI Attribution** | Distinguir acciones AI vs manuales | AU-01 | - Campo `executed_via` |
| AU-04 | **Completar Activity Log Persistence** | Implementar persistencia real en AuditService | Ninguna | - Escribir a `activity_logs`<br>- Eliminar console.log mock |

### Epic 6: Error Handling & UX

| ID | Historia Técnica | Descripción | Dependencias | Criterios de Aceptación |
|----|------------------|-------------|--------------|------------------------|
| EH-01 | **Error Interpreter** | Mapear errores técnicos a mensajes amigables | AG-01 | - 20 errores comunes mapeados |
| EH-02 | **Graceful Degradation** | Fallback cuando AI falla | EH-01 | - Mensaje de error claro<br>- Sugerencia de acción manual |
| EH-03 | **Retry Logic** | Reintentos automáticos para errores transitorios | EH-01 | - Max 3 reintentos<br>- Exponential backoff |

### Priorización Recomendada

```
Fase 1 (Crítica - 2-3 semanas):
  AG-01, AG-02, TR-01, TR-02, AU-04
  → MVP: AI puede crear/buscar leads

Fase 2 (Alta - 2 semanas):
  AG-03, AG-04, PS-01, AU-01, AU-02
  → Contexto, streaming, seguridad, auditoría

Fase 3 (Media - 2 semanas):
  TR-03, TR-04, TR-05, TR-06, HL-01
  → Más tools, confirmaciones

Fase 4 (Mejoras - 1 semana):
  PS-02, PS-03, HL-02, HL-03, EH-01, EH-02, EH-03
  → Pulido, rate limits, error handling
```

---

## 6. Reglas y Principios

### Principios de Diseño

1. **Clean Architecture**: Mantener separación de capas, no mezclar infraestructura con dominio
2. **DDD**: Usar lenguaje ubicuo del CRM (lead, opportunity, pipeline, etc.)
3. **CQRS**: Todas las mutaciones via Commands, lecturas via Queries
4. **Security by Design**: Permisos validados ANTES de ejecutar cualquier tool
5. **Audit Everything**: Todo lo que haga el AI queda registrado
6. **No Bypass**: El AI NUNCA puede elevar permisos del usuario

### Reglas de Implementación

```typescript
// ✅ CORRECTO: Validar permisos en el Tool
async execute(params, ctx) {
  if (!ctx.user.hasPermission('LEAD_DELETE')) {
    throw new ForbiddenError('No tienes permiso para eliminar leads');
  }
  return this.commandBus.execute(new DeleteLeadCommand(...));
}

// ❌ INCORRECTO: Ejecutar sin validar
async execute(params, ctx) {
  return this.commandBus.execute(new DeleteLeadCommand(...));
}
```

```typescript
// ✅ CORRECTO: Logging completo
await this.aiAuditLogger.logAction(conversationId, {
  toolName: 'delete_lead',
  parameters: { leadId: '123' },
  result: 'success',
  executedBy: ctx.userId,
  executedVia: 'ai_assistant',
  entityType: 'lead',
  entityId: '123'
});

// ❌ INCORRECTO: Sin attribution
await this.activityLog.log({
  action: 'deleted',
  entityId: '123'
  // Falta: quién, cómo, por qué
});
```

### Consideraciones Multi-Tenant

- Cada conversación AI está aislada por `tenant_id`
- El contexto de conversación NO se comparte entre tenants
- Los tools solo pueden acceder a datos del tenant actual
- Rate limits aplicados por tenant

### Preparación para Futuras UIs

El backend debe soportar múltiples interfaces:
- Chat web (actual)
- Chat móvil (futuro)
- Slack bot (futuro)
- Voz (futuro)

Por eso el `AgentInput` incluye `source` y el contrato es independiente del canal.

---

## 7. Conclusión

### Estado Actual

El backend de Zuclubit Smart CRM tiene una **base sólida** con:
- ✅ Arquitectura limpia y bien estructurada
- ✅ 793 endpoints REST funcionales
- ✅ Autenticación y autorización completas
- ✅ Event-driven architecture implementada
- ✅ Módulo AI básico (scoring, sentiment, email generation)

### Brechas Críticas

Para un AI Assistant funcional que opere el CRM end-to-end, falta:
- ❌ AI Agent Orchestrator (no existe)
- ❌ Tool Registry con function calling (no existe)
- ❌ Human-in-the-Loop para confirmaciones (no existe)
- ⚠️ Audit trail completo para AI (parcial)

### Siguiente Paso Recomendado

1. **Inmediato**: Implementar Epic 1 (AG-01 a AG-04) + TR-01
2. **Semana 1**: Completar tools de leads (TR-02) + auditoría (AU-04)
3. **Semana 2-3**: Seguridad (PS-01) + contexto (AG-03)
4. **Semana 4+**: Más tools, confirmaciones, polish

Con estas implementaciones, el AI Assistant podrá:
> "Saber exactamente qué tenemos hoy, qué nos falta y qué construir primero para que el AI Assistant pueda operar el CRM completo de forma segura, auditable y escalable."

---

**Documento generado por auditoría técnica automatizada**
**Próxima revisión sugerida:** Después de completar Fase 1

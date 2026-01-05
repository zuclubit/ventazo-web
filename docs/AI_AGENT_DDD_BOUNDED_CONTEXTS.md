# AI Agent - DDD Bounded Contexts

## Overview

Este documento define los Bounded Contexts del sistema AI Agent siguiendo Domain-Driven Design (DDD), mapeando cómo el AI Agent interactúa con los dominios existentes del CRM.

---

## 1. Bounded Contexts Map

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           ZUCLUBIT SMART CRM                                    │
│                                                                                 │
│  ┌─────────────────────────────────────────────────────────────────────────┐   │
│  │                    AI AGENT CONTEXT (New)                               │   │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐        │   │
│  │  │  Orchestration  │  │   Tool Mgmt     │  │   Confirmation  │        │   │
│  │  │   Subdomain     │  │   Subdomain     │  │   Subdomain     │        │   │
│  │  └────────┬────────┘  └────────┬────────┘  └────────┬────────┘        │   │
│  │           │                    │                    │                  │   │
│  │  ┌────────┴────────┐  ┌────────┴────────┐  ┌────────┴────────┐        │   │
│  │  │     Audit       │  │   Conversation  │  │    Response     │        │   │
│  │  │   Subdomain     │  │   Subdomain     │  │   Generation    │        │   │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘        │   │
│  └─────────────────────────────────────────────────────────────────────────┘   │
│                                      │                                          │
│                    ┌─────────────────┼─────────────────┐                       │
│                    │                 │                 │                        │
│                    ▼                 ▼                 ▼                        │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐      │
│  │   SALES CONTEXT     │ │  CUSTOMER CONTEXT   │ │   TASK CONTEXT      │      │
│  │  ┌───────────────┐  │ │  ┌───────────────┐  │ │  ┌───────────────┐  │      │
│  │  │     Lead      │  │ │  │   Customer    │  │ │  │     Task      │  │      │
│  │  │   Aggregate   │  │ │  │   Aggregate   │  │ │  │   Aggregate   │  │      │
│  │  └───────────────┘  │ │  └───────────────┘  │ │  └───────────────┘  │      │
│  │  ┌───────────────┐  │ │  ┌───────────────┐  │ │  ┌───────────────┐  │      │
│  │  │  Opportunity  │  │ │  │    Contact    │  │ │  │   Activity    │  │      │
│  │  │   Aggregate   │  │ │  │   Aggregate   │  │ │  │   Aggregate   │  │      │
│  │  └───────────────┘  │ │  └───────────────┘  │ │  └───────────────┘  │      │
│  │  ┌───────────────┐  │ │                     │ │                     │      │
│  │  │    Quote      │  │ │                     │ │                     │      │
│  │  │   Aggregate   │  │ │                     │ │                     │      │
│  │  └───────────────┘  │ │                     │ │                     │      │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘      │
│                                                                                 │
│  ┌─────────────────────┐ ┌─────────────────────┐ ┌─────────────────────┐      │
│  │   AUTH CONTEXT      │ │  ANALYTICS CONTEXT  │ │ COMMUNICATION CTX   │      │
│  │  ┌───────────────┐  │ │  ┌───────────────┐  │ │  ┌───────────────┐  │      │
│  │  │     User      │  │ │  │   Dashboard   │  │ │  │    Email      │  │      │
│  │  │   Aggregate   │  │ │  │   Aggregate   │  │ │  │   Aggregate   │  │      │
│  │  └───────────────┘  │ │  └───────────────┘  │ │  └───────────────┘  │      │
│  │  ┌───────────────┐  │ │  ┌───────────────┐  │ │  ┌───────────────┐  │      │
│  │  │    Tenant     │  │ │  │    Report     │  │ │  │   Campaign    │  │      │
│  │  │   Aggregate   │  │ │  │   Aggregate   │  │ │  │   Aggregate   │  │      │
│  │  └───────────────┘  │ │  └───────────────┘  │ │  └───────────────┘  │      │
│  └─────────────────────┘ └─────────────────────┘ └─────────────────────┘      │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. AI Agent Context (Detail)

### 2.1 Orchestration Subdomain (Core)

**Responsabilidad**: Coordinar el flujo completo desde mensaje de usuario hasta respuesta.

```
┌─────────────────────────────────────────────────────────────────┐
│                   ORCHESTRATION SUBDOMAIN                       │
│                                                                 │
│  Aggregates:                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Conversation (Aggregate Root)                          │   │
│  │  ├── conversationId: UUID                               │   │
│  │  ├── tenantId: UUID                                     │   │
│  │  ├── userId: UUID                                       │   │
│  │  ├── messages: AIMessage[]                              │   │
│  │  ├── context: ConversationContext                       │   │
│  │  ├── status: active | completed | error                 │   │
│  │  └── metadata: ConversationMetadata                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Domain Services:                                               │
│  ├── AIAgentOrchestrator (main entry point)                    │
│  ├── IntentClassifier                                          │
│  ├── ActionPlanner                                              │
│  └── ResponseGenerator                                          │
│                                                                 │
│  Domain Events:                                                 │
│  ├── ConversationStarted                                        │
│  ├── IntentClassified                                           │
│  ├── ActionPlanned                                              │
│  ├── ActionExecuted                                             │
│  └── ConversationEnded                                          │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Tool Management Subdomain (Core)

**Responsabilidad**: Registro, descubrimiento y ejecución de tools.

```
┌─────────────────────────────────────────────────────────────────┐
│                 TOOL MANAGEMENT SUBDOMAIN                       │
│                                                                 │
│  Aggregates:                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Tool (Aggregate Root)                                  │   │
│  │  ├── name: string (unique)                              │   │
│  │  ├── displayName: string                                │   │
│  │  ├── description: string                                │   │
│  │  ├── category: ToolCategory                             │   │
│  │  ├── entityType: AIEntityType                           │   │
│  │  ├── operation: AIOperation                             │   │
│  │  ├── requiredPermissions: Permission[]                  │   │
│  │  ├── parameters: JSONSchema                             │   │
│  │  ├── impact: ActionImpact                               │   │
│  │  └── execute: ToolExecutor                              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Domain Services:                                               │
│  ├── ToolRegistry                                               │
│  ├── ToolExecutor                                               │
│  ├── ParameterValidator                                         │
│  └── PermissionChecker                                          │
│                                                                 │
│  Value Objects:                                                 │
│  ├── ToolMetadata                                               │
│  ├── ToolExample                                                │
│  └── ExecutionResult                                            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.3 Confirmation Subdomain (Supporting)

**Responsabilidad**: Human-in-the-loop para acciones críticas.

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONFIRMATION SUBDOMAIN                         │
│                                                                 │
│  Aggregates:                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ConfirmationRequest (Aggregate Root)                   │   │
│  │  ├── id: UUID                                           │   │
│  │  ├── tenantId: UUID                                     │   │
│  │  ├── userId: UUID                                       │   │
│  │  ├── conversationId: UUID                               │   │
│  │  ├── action: PlannedAction                              │   │
│  │  ├── status: pending | confirmed | denied | expired     │   │
│  │  ├── impact: ActionImpact                               │   │
│  │  ├── changes: ConfirmationChange[]                      │   │
│  │  ├── expiresAt: Date                                    │   │
│  │  └── resolution?: ConfirmationResolution                │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ConfirmationPolicy (Aggregate Root)                    │   │
│  │  ├── id: UUID                                           │   │
│  │  ├── name: string                                       │   │
│  │  ├── entityTypes: AIEntityType[]                        │   │
│  │  ├── operations: AIOperation[]                          │   │
│  │  ├── conditions: ConfirmationCondition[]                │   │
│  │  ├── impact: ActionImpact                               │   │
│  │  └── enabled: boolean                                   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Domain Services:                                               │
│  ├── ConfirmationGate                                           │
│  ├── PolicyEvaluator                                            │
│  └── ExpirationManager                                          │
│                                                                 │
│  Domain Events:                                                 │
│  ├── ConfirmationRequested                                      │
│  ├── ConfirmationApproved                                       │
│  ├── ConfirmationDenied                                         │
│  └── ConfirmationExpired                                        │
└─────────────────────────────────────────────────────────────────┘
```

### 2.4 Audit Subdomain (Supporting)

**Responsabilidad**: Trazabilidad completa de acciones AI.

```
┌─────────────────────────────────────────────────────────────────┐
│                     AUDIT SUBDOMAIN                             │
│                                                                 │
│  Aggregates:                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  AIAuditLog (Aggregate Root)                            │   │
│  │  ├── id: UUID                                           │   │
│  │  ├── tenantId: UUID                                     │   │
│  │  ├── userId: UUID                                       │   │
│  │  ├── conversationId: UUID                               │   │
│  │  ├── requestId: UUID                                    │   │
│  │  ├── eventType: AIAuditEventType                        │   │
│  │  ├── timestamp: Date                                    │   │
│  │  ├── data: AIAuditEventData                             │   │
│  │  ├── affectedEntity?: EntityReference                   │   │
│  │  ├── changes?: AIAuditChange[]                          │   │
│  │  └── llmUsage?: LLMUsageStats                           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Domain Services:                                               │
│  ├── AIAuditLogger                                              │
│  ├── ActivityReportGenerator                                    │
│  └── GDPRComplianceService                                      │
│                                                                 │
│  Read Models:                                                   │
│  ├── AIConversationSummary                                      │
│  ├── AIActivityReport                                           │
│  └── UserAIActivityExport                                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Context Mapping

### 3.1 Relationships between Contexts

```
                    ┌─────────────────┐
                    │   AI AGENT      │
                    │    CONTEXT      │
                    └────────┬────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐
│  SALES CONTEXT  │ │CUSTOMER CONTEXT │ │  TASK CONTEXT   │
│                 │ │                 │ │                 │
│   [OHS/ACL]     │ │   [OHS/ACL]     │ │   [OHS/ACL]     │
└─────────────────┘ └─────────────────┘ └─────────────────┘

Legend:
OHS = Open Host Service (downstream exposes API)
ACL = Anti-Corruption Layer (upstream translates)
```

### 3.2 Integration Patterns

| Upstream Context | Downstream Context | Pattern | Description |
|-----------------|-------------------|---------|-------------|
| AI Agent | Sales | OHS + ACL | AI Agent calls Lead/Opportunity services through Tool adapters |
| AI Agent | Customer | OHS + ACL | AI Agent calls Customer services through Tool adapters |
| AI Agent | Task | OHS + ACL | AI Agent calls Task services through Tool adapters |
| AI Agent | Auth | Conformist | AI Agent uses Auth types directly |
| AI Agent | Analytics | OHS | AI Agent reads analytics for context |

---

## 4. Anti-Corruption Layer Design

El AI Agent Context utiliza un ACL para traducir entre su modelo interno y los modelos de dominio existentes:

```typescript
// AI Agent's internal model
interface AILeadReference {
  entityType: 'lead';
  id: string;
  displayName: string;
}

// Sales Context model (existing)
interface Lead {
  id: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  status: LeadStatus;
  score: number;
  // ... many more fields
}

// ACL Translation
class LeadToolAdapter implements ToolAdapter<Lead, AILeadReference> {
  toAIReference(lead: Lead): AILeadReference {
    return {
      entityType: 'lead',
      id: lead.id,
      displayName: lead.companyName || lead.contactName,
    };
  }

  fromToolParams(params: LeadToolParams.Create): CreateLeadInput {
    // Map AI tool parameters to domain input
  }
}
```

---

## 5. Aggregate Rules

### 5.1 Conversation Aggregate

**Invariants:**
- Una conversación pertenece a exactamente un usuario y un tenant
- Los mensajes están ordenados cronológicamente
- El contexto se actualiza con cada mensaje
- Una conversación puede tener máximo 1 confirmación pendiente

**Boundaries:**
- Messages son value objects dentro de Conversation
- Context es un value object dentro de Conversation
- PendingConfirmation es una referencia a ConfirmationRequest aggregate

### 5.2 ConfirmationRequest Aggregate

**Invariants:**
- Solo puede transicionar: pending → confirmed/denied/expired/cancelled
- Expira automáticamente después de TTL (default: 5 minutos)
- Solo el usuario original puede confirmar/denegar

**Boundaries:**
- PlannedAction es un value object snapshot
- Resolution es un value object

### 5.3 Tool Aggregate

**Invariants:**
- Nombre único en el registry
- Debe tener al menos un permission requerido
- Impact determina si requiere confirmación

---

## 6. Domain Events Flow

```
User sends message
        │
        ▼
┌───────────────────┐
│ ConversationStarted│  (if new)
│ MessageReceived    │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ IntentClassified   │
└─────────┬─────────┘
          │
          ▼
┌───────────────────┐
│ ActionPlanned      │
└─────────┬─────────┘
          │
          ▼
    ┌─────────────┐
    │ Requires    │
    │Confirmation?│
    └──────┬──────┘
           │
     ┌─────┴─────┐
     │           │
    YES          NO
     │           │
     ▼           ▼
┌──────────┐  ┌──────────┐
│Confirm.  │  │ActionExec│
│Requested │  │uted      │
└────┬─────┘  └────┬─────┘
     │             │
     ▼             │
┌──────────┐       │
│User      │       │
│Response  │       │
└────┬─────┘       │
     │             │
     ▼             │
┌──────────┐       │
│Confirm.  │       │
│Approved/ │       │
│Denied    │       │
└────┬─────┘       │
     │             │
     ▼             │
     └──────┬──────┘
            │
            ▼
   ┌────────────────┐
   │ResponseGenerated│
   │MessageSent      │
   └────────────────┘
```

---

## 7. CQRS Read Models

### 7.1 AI Dashboard Read Model

```typescript
interface AIDashboardReadModel {
  // Real-time metrics
  activeConversations: number;
  todayMessages: number;
  todayActions: number;
  pendingConfirmations: number;

  // Performance
  avgResponseTimeMs: number;
  successRate: number;

  // Usage
  topTools: { name: string; count: number }[];
  topIntents: { type: string; count: number }[];

  // Cost
  todayTokensUsed: number;
  todayEstimatedCost: number;
}
```

### 7.2 User AI Activity Read Model

```typescript
interface UserAIActivityReadModel {
  userId: string;
  tenantId: string;

  // Summary
  totalConversations: number;
  totalActions: number;
  lastActive: Date;

  // Recent activity
  recentConversations: AIConversationSummary[];

  // Preferences (learned)
  commonRequests: string[];
  preferredEntities: AIEntityType[];
}
```

---

## 8. Module Structure (Implementation)

```
services/lead-service/src/infrastructure/ai-agent/
├── types/                      # Domain types (completed)
│   ├── common.types.ts
│   ├── orchestrator.types.ts
│   ├── tool.types.ts
│   ├── confirmation.types.ts
│   ├── audit.types.ts
│   └── index.ts
│
├── orchestrator/              # Core orchestration (AG-01)
│   ├── ai-agent.orchestrator.ts      # Main orchestrator
│   ├── intent-classifier.ts          # Intent classification
│   ├── action-planner.ts             # Action planning
│   ├── response-generator.ts         # Response generation
│   └── index.ts
│
├── tools/                     # Tool implementations
│   ├── registry/
│   │   ├── tool.registry.ts
│   │   └── tool.executor.ts
│   ├── adapters/              # ACL - tool adapters
│   │   ├── lead.tool-adapter.ts
│   │   ├── customer.tool-adapter.ts
│   │   ├── opportunity.tool-adapter.ts
│   │   ├── task.tool-adapter.ts
│   │   └── quote.tool-adapter.ts
│   └── definitions/           # Tool definitions
│       ├── lead.tools.ts
│       ├── customer.tools.ts
│       ├── opportunity.tools.ts
│       ├── task.tools.ts
│       └── search.tools.ts
│
├── confirmation/              # Human-in-the-loop
│   ├── confirmation-gate.ts
│   ├── policy-evaluator.ts
│   └── confirmation.repository.ts
│
├── audit/                     # Audit logging
│   ├── ai-audit.logger.ts
│   ├── audit.repository.ts
│   └── report-generator.ts
│
├── conversation/              # Conversation management
│   ├── conversation.manager.ts
│   └── conversation.repository.ts
│
└── routes/                    # API routes
    └── ai-agent.routes.ts
```

---

## 9. Key Design Decisions

### 9.1 Eventual Consistency

- Los audit logs se escriben de forma asíncrona
- Las métricas del dashboard se actualizan cada 30 segundos
- Los read models se proyectan desde domain events

### 9.2 Transaction Boundaries

- Cada tool execution es una transacción atómica
- La conversación se actualiza después de cada interacción
- Los audit logs no participan en la transacción principal

### 9.3 Error Handling

- Errores de tool se encapsulan y reportan al usuario
- Errores de LLM tienen retry con backoff exponencial
- Errores críticos se loggean y notifican

### 9.4 Scalability

- Conversations pueden almacenarse en Redis para scale-out
- Tool executions pueden paralelizarse cuando es seguro
- Audit logs pueden ir a un sistema separado (e.g., ELK)

---

## 10. References

- [AI Agent C4 Architecture](./AI_AGENT_C4_ARCHITECTURE.md)
- [AI Assistant Backend Audit](./AI_ASSISTANT_BACKEND_AUDIT.md)
- [Evans, Eric - Domain-Driven Design](https://www.amazon.com/Domain-Driven-Design-Tackling-Complexity-Software/dp/0321125215)
- [Vernon, Vaughn - Implementing Domain-Driven Design](https://www.amazon.com/Implementing-Domain-Driven-Design-Vaughn-Vernon/dp/0321834577)

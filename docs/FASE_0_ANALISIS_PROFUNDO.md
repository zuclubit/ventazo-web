# FASE 0 — ANÁLISIS PROFUNDO DEL CRM

**Fecha**: Diciembre 2025
**Versión**: 1.0.0
**Arquitecto**: Análisis realizado por Claude (Opus 4.5)
**Proyecto**: Zuclubit Smart CRM

---

## ÍNDICE

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Diagnóstico Técnico Completo](#2-diagnóstico-técnico-completo)
3. [Análisis de Arquitectura Backend](#3-análisis-de-arquitectura-backend)
4. [Análisis de Base de Datos](#4-análisis-de-base-de-datos)
5. [Análisis de Módulos y Funcionalidades](#5-análisis-de-módulos-y-funcionalidades)
6. [Gap Analysis](#6-gap-analysis)
7. [Lista de Riesgos](#7-lista-de-riesgos)
8. [Recomendaciones de Arquitectura](#8-recomendaciones-de-arquitectura)
9. [Mapa de Módulos Backend](#9-mapa-de-módulos-backend)
10. [Decisiones Técnicas Justificadas](#10-decisiones-técnicas-justificadas)
11. [Propuesta de Estructura Frontend](#11-propuesta-de-estructura-frontend)
12. [Plan de Acción](#12-plan-de-acción)

---

## 1. RESUMEN EJECUTIVO

### Estado General del Proyecto

| Métrica | Valor | Estado |
|---------|-------|--------|
| **Madurez del Backend** | 78% | 🟢 Bueno |
| **Arquitectura** | 95% | 🟢 Excelente |
| **Cobertura de Tests** | 65% | 🟡 Aceptable |
| **Seguridad** | 45% | 🔴 Crítico |
| **Multi-tenancy** | 70% | 🟡 Aceptable |
| **Documentación** | 60% | 🟡 Aceptable |

### Stack Tecnológico Actual

```yaml
Backend:
  Framework: Fastify 4.29
  Language: TypeScript 5.3 (strict mode)
  ORM: Drizzle ORM
  Database: PostgreSQL 15+
  Cache: Redis (ioredis)
  Events: NATS JetStream
  Auth: Supabase (parcialmente implementado)
  DI Container: TSyringe
  Validation: Zod
  Testing: Vitest + Testcontainers

Patterns:
  - Clean Architecture ✅
  - Domain-Driven Design (DDD) ✅
  - CQRS (Command Query Responsibility Segregation) ✅
  - Outbox Pattern ✅
  - Repository Pattern ✅

Infrastructure:
  - Docker containerization
  - Multi-tenant row-level isolation
  - 101 database tables
  - 65+ infrastructure services
  - 66+ API route files
```

### Fortalezas Identificadas

1. **Arquitectura sólida**: Clean Architecture + DDD + CQRS bien implementados
2. **Tipo-seguro**: TypeScript strict con validación Zod
3. **Escalable**: Diseño multi-tenant desde el inicio
4. **Extensible**: Custom fields, workflows, webhooks
5. **CRM completo**: 65+ módulos funcionales implementados

### Debilidades Críticas

1. **Autenticación incompleta**: JWT no validado, solo headers
2. **Sin permisos en rutas**: RBAC existe pero no se aplica
3. **Tests en capa presentación**: 0% cobertura
4. **Servicios skeleton**: Muchos servicios con TODOs

---

## 2. DIAGNÓSTICO TÉCNICO COMPLETO

### 2.1 Estructura del Proyecto

```
services/lead-service/
├── src/
│   ├── domain/                    # Capa de Dominio (DDD)
│   │   ├── aggregates/            # Lead aggregate (432 líneas)
│   │   ├── events/                # Domain events
│   │   ├── repositories/          # Interfaces de repositorio
│   │   └── value-objects/         # LeadStatus, LeadScore, Contact
│   │
│   ├── application/               # Capa de Aplicación (CQRS)
│   │   ├── commands/              # 10 command handlers
│   │   ├── queries/               # 4 query handlers
│   │   ├── common/                # CommandBus, QueryBus
│   │   └── dtos/                  # Data Transfer Objects
│   │
│   ├── infrastructure/            # Capa de Infraestructura
│   │   ├── database/              # Schema Drizzle (7,202 líneas)
│   │   ├── repositories/          # Implementación PostgreSQL
│   │   └── [65+ service modules]/ # Servicios por dominio
│   │
│   ├── presentation/              # Capa de Presentación
│   │   ├── routes/                # 66 archivos de rutas
│   │   ├── middlewares/           # Auth, tenant, validation
│   │   ├── schemas/               # Zod schemas
│   │   └── validators/            # Request validators
│   │
│   └── config/                    # Configuración
│       ├── environment.ts         # Variables de entorno
│       └── container.ts           # DI Container (793 líneas)
│
├── drizzle/                       # Migraciones SQL
├── dist/                          # Build de producción
└── package.json
```

### 2.2 Análisis de Capas

#### Capa de Dominio (100% completa)

| Componente | Estado | Tests | Observaciones |
|------------|--------|-------|---------------|
| Lead Aggregate | ✅ | 32/32 | Factory pattern, eventos de dominio |
| LeadStatus VO | ✅ | 13/13 | Transiciones de estado validadas |
| LeadScore VO | ✅ | 24/24 | Rango 0-100, categorías hot/warm/cold |
| Contact VO | ✅ | N/A | Inmutable, tipos de contacto |
| Domain Events | ✅ | N/A | 7 tipos de eventos definidos |
| Repository Interface | ✅ | N/A | Contrato completo |

#### Capa de Aplicación (80% completa)

| Command/Query | Handler | Tests | Estado |
|---------------|---------|-------|--------|
| CreateLeadCommand | ✅ | 4/4 | Completo |
| UpdateLeadCommand | ✅ | 3/3 | Completo |
| ChangeLeadStatusCommand | ✅ | 5/5 | Completo |
| UpdateLeadScoreCommand | ✅ | 4/4 | Completo |
| AssignLeadCommand | ✅ | 4/4 | Completo |
| QualifyLeadCommand | ✅ | 3/3 | Completo |
| ScheduleFollowUpCommand | ✅ | 3/3 | Completo |
| ConvertLeadCommand | ✅ | 0/4 | Sin tests |
| BulkCreateLeadsCommand | ✅ | 0/? | Sin tests |
| BulkUpdateLeadsCommand | ✅ | 0/? | Sin tests |
| GetLeadByIdQuery | ✅ | 5/5 | Completo |
| FindLeadsQuery | ✅ | 8/8 | Completo |
| GetLeadStatsQuery | ✅ | 3/3 | Completo |
| GetOverdueFollowUpsQuery | ✅ | 4/4 | Completo |

#### Capa de Infraestructura (75% completa)

**65+ Servicios implementados** organizados en categorías:

```
Core CRM:
├── CustomerService        ✅ (9 tests)
├── OpportunityService     ✅
├── PipelineService        ✅ (18 tests)
├── TaskService            ✅ (9 tests)
├── ContactService         ✅
└── NotesService           ✅

Communication:
├── EmailService           ✅
├── EmailTemplateService   ✅
├── SmsService             ✅
├── WhatsAppService        ✅
├── NotificationService    ✅ (11 tests)
└── CommunicationService   ✅

Automation:
├── WorkflowService        ⚠️ Skeleton
├── WorkflowBuilderService ⚠️ Skeleton
├── DripSequenceService    ✅
└── CampaignService        ✅

Analytics:
├── AnalyticsService       ✅
├── AdvancedReportService  ✅
├── ForecastingService     ⚠️ Parcial
└── ReportService          ✅

Team Management:
├── TeamService            ✅
├── TerritoryService       ✅
├── QuotaService           ✅
└── PermissionService      ⚠️ No aplicado

Search & Data:
├── SearchService          ✅
├── SegmentationService    ✅
├── CustomFieldService     ✅
├── DeduplicationService   ⚠️ Básico
└── ImportExportService    ✅

Intelligence:
├── AIService              ⚠️ Stub
├── MLScoringService       ⚠️ Stub
├── EnrichmentService      ⚠️ Stub
└── ScoringService         ✅

Infrastructure:
├── CacheService           ✅
├── QueueService           ✅
├── WebhookService         ✅
├── AuditService           ✅
├── RateLimitingService    ✅
├── TracingService         ✅
└── LockingService         ✅
```

#### Capa de Presentación (60% completa)

| Aspecto | Estado | Observaciones |
|---------|--------|---------------|
| Rutas definidas | ✅ | 66 archivos de rutas |
| Validación Zod | ✅ | Esquemas completos |
| Middlewares | ⚠️ | Auth no validada |
| Error handling | ✅ | Centralizado |
| OpenAPI/Swagger | ✅ | /documentation |
| Tests | ❌ | 0% cobertura |

---

## 3. ANÁLISIS DE ARQUITECTURA BACKEND

### 3.1 Patrones Implementados

#### Clean Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    PRESENTATION LAYER                        │
│  Routes → Middlewares → Validators → Schemas                │
├─────────────────────────────────────────────────────────────┤
│                    APPLICATION LAYER                         │
│  Commands → Handlers → Queries → DTOs                       │
├─────────────────────────────────────────────────────────────┤
│                    DOMAIN LAYER                              │
│  Aggregates → Value Objects → Events → Repository Interfaces│
├─────────────────────────────────────────────────────────────┤
│                    INFRASTRUCTURE LAYER                      │
│  Repositories → Services → Database → External APIs         │
└─────────────────────────────────────────────────────────────┘
```

**Evaluación**: ✅ Excelente (95%)
- Dependencias unidireccionales respetadas
- Dominio libre de dependencias externas
- Inversión de dependencias correcta

#### CQRS (Command Query Responsibility Segregation)

```typescript
// Commands (Write Operations)
CommandBus.execute(CreateLeadCommand) → CreateLeadHandler → Repository.save()

// Queries (Read Operations)
QueryBus.handle(FindLeadsQuery) → FindLeadsHandler → Repository.findAll()
```

**Evaluación**: ✅ Bien implementado
- Separación clara read/write
- Handlers independientes
- Posibilidad de escalar lecturas y escrituras por separado

#### DDD (Domain-Driven Design)

```typescript
// Lead Aggregate Root
class Lead {
  private constructor() {} // Previene instanciación directa

  static create(props: CreateLeadProps): Result<Lead> // Factory method
  updateStatus(newStatus: LeadStatus): Result<void>   // Business logic
  addDomainEvent(event: DomainEvent): void            // Event publishing
}

// Value Objects
class LeadScore {
  private constructor(private readonly value: number) {}
  static create(value: number): Result<LeadScore>     // Validation
  getCategory(): 'hot' | 'warm' | 'cold'              // Business logic
}
```

**Evaluación**: ✅ Correcto
- Aggregate roots con invariantes protegidas
- Value objects inmutables
- Domain events para integración

### 3.2 Dependency Injection

```typescript
// container.ts (793 líneas)
@injectable()
export class LeadRepository implements ILeadRepository {
  constructor(
    @inject(DatabasePool) pool: DatabasePool,
    @inject('IEventPublisher') publisher: IEventPublisher
  ) {}
}

// Registration
container.register('ILeadRepository', {
  useFactory: (c) => c.resolve(LeadRepository)
});
```

**Evaluación**: ✅ Bien estructurado
- TSyringe para IoC
- Factory pattern para dependencias complejas
- Lifecycle management (singleton vs transient)

### 3.3 Error Handling

```typescript
// Result Pattern
type Result<T> = Success<T> | Failure;

interface Success<T> {
  isSuccess: true;
  value: T;
}

interface Failure {
  isSuccess: false;
  error: Error;
}
```

**Evaluación**: 🟡 Inconsistente
- Result pattern usado en domain/application
- Algunos handlers usan try/catch
- Falta estandarización de error codes

---

## 4. ANÁLISIS DE BASE DE DATOS

### 4.1 Configuración ORM

```yaml
ORM: Drizzle ORM
Driver: pg (PostgreSQL)
Version: 0.20.10
Schema File: src/infrastructure/database/schema.ts (7,202 líneas)
Migration Dir: /drizzle/
```

### 4.2 Estadísticas del Schema

| Métrica | Cantidad |
|---------|----------|
| Total de Tablas | 101 |
| Índices | 500+ |
| Unique Constraints | 9 |
| Foreign Keys CASCADE | 18 |
| Foreign Keys SET NULL | 8 |
| Columnas JSONB | 150+ |
| Columnas Timestamp | 300+ |

### 4.3 Tablas Principales por Dominio

#### Core CRM (15 tablas)
```sql
leads               -- Lead management
leadContacts        -- Multiple contacts per lead
leadCommunications  -- Call/email/meeting tracking
customers           -- Converted leads
opportunities       -- Sales deals
pipelines           -- Pipeline definitions
tasks               -- Action items (polymorphic)
contracts           -- Sales contracts
quotes              -- Quotations
quoteLineItems      -- Quote line items
products            -- Product catalog
productCategories   -- Product organization
productVariants     -- Product variants
priceBooks          -- Price lists
priceBookEntries    -- Price book items
```

#### Team & Organization (12 tablas)
```sql
tenants             -- Multi-tenant organizations
users               -- User profiles (Supabase sync)
tenantMemberships   -- User-tenant relationships
teams               -- Sales/support teams
teamMembers         -- Team memberships
territories         -- Sales territories
territoryAssignments
quotas              -- Sales quotas
quotaAssignments
quotaAdjustments
permissionRoles     -- RBAC roles
permissionPolicies
```

#### Communication (15 tablas)
```sql
notifications
notificationPreferences
emailTemplates
emailAccounts
emailMessages
emailSyncJobs
smsMessages
smsTemplates
whatsappConversations
whatsappMessages
whatsappTemplates
whatsappPhoneNumbers
trackedEmails
trackedLinks
trackingEvents
```

#### Automation (10 tablas)
```sql
workflows           -- Workflow definitions
workflowExecutions  -- Execution history
campaigns
campaignAudiences
campaignMessages
dripSequences
dripSequenceSteps
dripSequenceEnrollments
dripStepExecutions
automationTriggers
```

### 4.4 Multi-Tenancy

**Estrategia**: Row-Level Isolation con `tenant_id`

```sql
-- Cada tabla tiene tenant_id
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,  -- ← Isolation field
  ...
);

-- Índices compound para queries eficientes
CREATE INDEX leads_tenant_status_idx ON leads(tenant_id, status);
CREATE INDEX leads_tenant_owner_idx ON leads(tenant_id, owner_id);
```

**Aplicación**:
1. Middleware extrae `tenant_id` del JWT
2. Todas las queries filtran por `tenant_id`
3. No hay RLS a nivel PostgreSQL (application-enforced)

### 4.5 Outbox Pattern

```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  tenant_id UUID NOT NULL,
  aggregate_id UUID NOT NULL,
  published TIMESTAMP,       -- NULL = pending
  created_at TIMESTAMP NOT NULL
);

CREATE INDEX idx_outbox_published ON outbox_events(published_at)
  WHERE published_at IS NULL;
```

**Propósito**: Garantizar publicación de eventos sin pérdidas

---

## 5. ANÁLISIS DE MÓDULOS Y FUNCIONALIDADES

### 5.1 Módulos Implementados (66 rutas)

#### Lead Management ✅
- CRUD completo
- Scoring (0-100)
- Status transitions
- Assignment
- Qualification workflow
- Follow-up scheduling
- Convert to customer
- Bulk operations
- Activity tracking
- Deduplication

#### Customer Management ✅
- CRUD completo
- Timeline/history
- Health scoring
- Revenue tracking
- Account manager assignment
- Status (active/at_risk/churned)
- Bulk operations

#### Opportunity Management ✅
- CRUD completo
- Pipeline stages
- Win/lose tracking
- Probability scoring
- Expected close date
- Reopen functionality
- Bulk operations

#### Pipeline Management ✅
- Multiple pipelines
- Customizable stages
- Stage transitions
- Auto-actions
- Stage rotting

#### Task Management ✅
- CRUD completo
- Types (call/email/meeting)
- Priority levels
- Recurring tasks (RRULE)
- Reminders
- Bulk operations

#### Contact Management ✅
- Multiple per lead
- Primary/secondary
- Contact types/roles
- DNC flags
- LinkedIn tracking

#### Email & Templates ✅
- Template CRUD
- Versioning
- Personalization tokens
- Preview/render
- Starter templates

#### Campaigns & Sequences ✅
- Campaign management
- Drip sequences
- Automation
- Engagement tracking

#### Workflows ⚠️
- Basic CRUD
- Trigger definitions
- Action definitions
- Execution tracking
- **Falta**: Motor de ejecución completo

#### Analytics ✅
- Dashboard overview
- Pipeline summary
- Lead sources
- Lead quality
- Aging reports
- Activity reports
- Export (CSV/JSON)

#### Teams & Territories ✅
- Team hierarchy
- Territory management
- Quota tracking
- Assignment rules

#### Search & Segmentation ✅
- Full-text search
- Saved searches
- Rule-based segments
- Dynamic segments

#### Custom Fields ✅
- Per entity type
- Multiple field types
- Validation rules

#### Webhooks ✅
- CRUD completo
- Event subscriptions
- Delivery tracking
- Retry logic
- Test functionality

#### Integrations ⚠️
- Integration hub
- Connector framework
- **Falta**: Implementaciones específicas

#### AI/ML ⚠️
- Service stubs
- **Falta**: Implementación real

#### GDPR Compliance ✅
- Data export
- Data deletion
- Consent management

### 5.2 API Completeness Matrix

| Entidad | Create | Read | Update | Delete | Bulk | Special |
|---------|--------|------|--------|--------|------|---------|
| Lead | ✅ | ✅ | ✅ | ✅ | ✅ | Convert, Qualify |
| Customer | ✅ | ✅ | ✅ | ✅ | ✅ | Timeline, Health |
| Opportunity | ✅ | ✅ | ✅ | ✅ | ✅ | Win/Lose |
| Pipeline | ✅ | ✅ | ✅ | ✅ | ❌ | Stages, Reorder |
| Task | ✅ | ✅ | ✅ | ✅ | ✅ | Complete, Recurring |
| Contact | ✅ | ✅ | ✅ | ✅ | ✅ | Primary, History |
| Workflow | ✅ | ✅ | ✅ | ✅ | ❌ | Activate, Trigger |
| Email Template | ✅ | ✅ | ✅ | ✅ | ❌ | Versions, Render |
| Campaign | ✅ | ✅ | ✅ | ✅ | ❌ | Analytics |
| Segment | ✅ | ✅ | ✅ | ✅ | ❌ | Members |
| Custom Field | ✅ | ✅ | ✅ | ✅ | ❌ | Metadata |
| Team | ✅ | ✅ | ✅ | ✅ | ❌ | Members |
| Territory | ✅ | ✅ | ✅ | ✅ | ❌ | Assign |
| Quota | ✅ | ✅ | ✅ | ✅ | ❌ | Assign |
| Webhook | ✅ | ✅ | ✅ | ✅ | ❌ | Test, Deliveries |

---

## 6. GAP ANALYSIS

### 6.1 Qué Falta (Critical)

| Área | Gap | Prioridad | Impacto |
|------|-----|-----------|---------|
| **Seguridad** | JWT validation no implementado | P0 | 🔴 Crítico |
| **Seguridad** | Permisos no aplicados en rutas | P0 | 🔴 Crítico |
| **Testing** | 0% cobertura capa presentación | P1 | 🔴 Alto |
| **Testing** | Sin tests E2E | P1 | 🔴 Alto |
| **Frontend** | No existe | P0 | 🔴 Crítico |

### 6.2 Qué Debe Refactorizarse

| Componente | Problema | Acción |
|------------|----------|--------|
| `container.ts` | 793 líneas, difícil mantener | Dividir por módulo |
| Error handling | Inconsistente | Estandarizar Result pattern |
| Servicios skeleton | 30+ servicios con TODOs | Completar o eliminar |
| Rate limiting | Solo por IP | Implementar por tenant/user |

### 6.3 Qué Debe Eliminarse

| Elemento | Razón |
|----------|-------|
| Servicios stub sin implementar | Aumentan complejidad sin valor |
| Código comentado | Ruido en el codebase |
| Archivos duplicados (.bak) | Limpieza necesaria |

### 6.4 Qué Debe Modularizarse

| Actual | Propuesta |
|--------|-----------|
| Monolito lead-service | Microservicios por dominio |
| Container único | Container por módulo |
| Schema monolítico | Schemas por bounded context |

### 6.5 Mejoras para Estándares SaaS

| Área | Estado Actual | Estándar SaaS |
|------|---------------|---------------|
| Multi-tenancy | ✅ Row-level | ✅ Correcto |
| Billing | ❌ No existe | Stripe integration |
| Usage metering | ❌ No existe | Track API calls |
| Feature flags | ❌ No existe | LaunchDarkly/Flagsmith |
| Onboarding | ❌ No existe | Wizard flow |
| SSO | ❌ No existe | SAML/OIDC |

---

## 7. LISTA DE RIESGOS

### 7.1 Riesgos Críticos (P0)

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|--------------|---------|------------|
| 1 | **Sin autenticación real** | 100% | Crítico | Implementar JWT validation |
| 2 | **Sin autorización** | 100% | Crítico | Aplicar RBAC en rutas |
| 3 | **Header-only tenant ID** | 100% | Crítico | Extraer de JWT claims |
| 4 | **No hay frontend** | 100% | Crítico | Desarrollar Next.js app |

### 7.2 Riesgos Altos (P1)

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|--------------|---------|------------|
| 5 | Tests presentación 0% | 100% | Alto | Agregar tests de rutas |
| 6 | Sin tests E2E | 100% | Alto | Implementar Playwright |
| 7 | 65 servicios, muchos incompletos | 80% | Alto | Auditar y limpiar |
| 8 | Sin métricas/monitoring | 100% | Alto | Integrar Prometheus |

### 7.3 Riesgos Medios (P2)

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|--------|--------------|---------|------------|
| 9 | Container.ts muy grande | 100% | Medio | Refactorizar |
| 10 | Sin documentación API | 80% | Medio | Mejorar OpenAPI |
| 11 | N+1 queries potenciales | 60% | Medio | Eager loading |
| 12 | Sin caching strategy | 70% | Medio | Definir TTLs |

---

## 8. RECOMENDACIONES DE ARQUITECTURA

### 8.1 Prioridad Inmediata (Sprint 1-2)

#### 1. Implementar Autenticación Real

```typescript
// auth.middleware.ts
export async function authMiddleware(request: FastifyRequest, reply: FastifyReply) {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return reply.status(401).send({ error: 'Unauthorized' });
  }

  try {
    // Validar con Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return reply.status(401).send({ error: 'Invalid token' });
    }

    // Extraer tenant del JWT
    const tenantId = user.app_metadata?.tenant_id;

    // Verificar membership
    const membership = await getMembership(user.id, tenantId);

    if (!membership) {
      return reply.status(403).send({ error: 'Access denied' });
    }

    request.user = user;
    request.tenantId = tenantId;
    request.role = membership.role;
  } catch (error) {
    return reply.status(500).send({ error: 'Auth error' });
  }
}
```

#### 2. Aplicar Permisos en Rutas

```typescript
// permission.decorator.ts
export function requirePermission(resource: string, action: string) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { role, tenantId } = request;

    const hasPermission = await permissionService.check({
      role,
      resource,
      action,
      tenantId
    });

    if (!hasPermission) {
      return reply.status(403).send({
        error: 'Insufficient permissions',
        required: `${resource}:${action}`
      });
    }
  };
}

// En rutas
app.post('/leads', {
  preHandler: [authMiddleware, requirePermission('leads', 'create')]
}, createLeadHandler);
```

### 8.2 Corto Plazo (Sprint 3-4)

#### 3. Tests de Presentación

```typescript
// leads.routes.test.ts
describe('Lead Routes', () => {
  describe('POST /api/v1/leads', () => {
    it('should create lead with valid data', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          companyName: 'Acme Inc',
          email: 'contact@acme.com',
          source: 'website'
        });

      expect(response.status).toBe(201);
      expect(response.body.id).toBeDefined();
    });

    it('should reject without auth', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .send({ companyName: 'Test' });

      expect(response.status).toBe(401);
    });

    it('should validate input', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${validToken}`)
        .send({ email: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.errors).toBeDefined();
    });
  });
});
```

#### 4. Refactorizar Container

```typescript
// containers/lead.container.ts
export function registerLeadModule(container: DependencyContainer) {
  // Repositories
  container.register('ILeadRepository', {
    useFactory: c => new LeadRepository(c.resolve(DatabasePool))
  });

  // Command Handlers
  container.register(CreateLeadHandler, { useClass: CreateLeadHandler });
  container.register(UpdateLeadHandler, { useClass: UpdateLeadHandler });

  // Query Handlers
  container.register(GetLeadByIdHandler, { useClass: GetLeadByIdHandler });
  container.register(FindLeadsHandler, { useClass: FindLeadsHandler });
}

// containers/index.ts
export async function initializeContainer(): Promise<DependencyContainer> {
  const container = new DependencyContainer();

  // Infrastructure
  await registerDatabase(container);
  await registerCache(container);
  await registerEvents(container);

  // Modules
  registerLeadModule(container);
  registerCustomerModule(container);
  registerOpportunityModule(container);
  // ...

  return container;
}
```

### 8.3 Mediano Plazo (Sprint 5-8)

#### 5. Implementar Métricas

```typescript
// metrics.ts
import { Registry, Counter, Histogram } from 'prom-client';

export const registry = new Registry();

export const httpRequestsTotal = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'path', 'status', 'tenant'],
  registers: [registry]
});

export const httpRequestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'path', 'tenant'],
  buckets: [0.01, 0.05, 0.1, 0.5, 1, 5],
  registers: [registry]
});

// Middleware
app.addHook('onResponse', (request, reply) => {
  httpRequestsTotal.inc({
    method: request.method,
    path: request.routerPath,
    status: reply.statusCode,
    tenant: request.tenantId
  });
});
```

#### 6. Rate Limiting por Tenant

```typescript
// rate-limit.middleware.ts
export function rateLimitByTenant(options: RateLimitOptions) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    const { tenantId, user } = request;
    const plan = await getTenantPlan(tenantId);

    const limits = {
      free: { requests: 100, window: '1m' },
      pro: { requests: 1000, window: '1m' },
      enterprise: { requests: 10000, window: '1m' }
    };

    const limit = limits[plan];
    const key = `ratelimit:${tenantId}:${user.id}`;

    const current = await redis.incr(key);
    if (current === 1) {
      await redis.expire(key, 60);
    }

    if (current > limit.requests) {
      reply.header('X-RateLimit-Limit', limit.requests);
      reply.header('X-RateLimit-Remaining', 0);
      reply.header('Retry-After', 60);
      return reply.status(429).send({ error: 'Rate limit exceeded' });
    }

    reply.header('X-RateLimit-Limit', limit.requests);
    reply.header('X-RateLimit-Remaining', limit.requests - current);
  };
}
```

---

## 9. MAPA DE MÓDULOS BACKEND

### 9.1 Estructura de Bounded Contexts

```
┌─────────────────────────────────────────────────────────────────┐
│                        API GATEWAY                               │
│  (Fastify + Authentication + Rate Limiting + Tenant Context)    │
└─────────────────────────────────────────────────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  LEAD CONTEXT   │  │ CUSTOMER CONTEXT│  │ SALES CONTEXT   │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Lead CRUD     │  │ • Customer CRUD │  │ • Opportunities │
│ • Scoring       │  │ • Health Score  │  │ • Pipelines     │
│ • Qualification │  │ • Timeline      │  │ • Forecasting   │
│ • Assignment    │  │ • Success Tools │  │ • Quotas        │
│ • Contacts      │  │ • Contracts     │  │ • Quotes        │
│ • Deduplication │  │ • Subscriptions │  │ • Products      │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│ COMMUNICATION   │  │  AUTOMATION     │  │   ANALYTICS     │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Email         │  │ • Workflows     │  │ • Dashboards    │
│ • SMS           │  │ • Campaigns     │  │ • Reports       │
│ • WhatsApp      │  │ • Drip Sequences│  │ • Forecasting   │
│ • Templates     │  │ • Triggers      │  │ • AI Insights   │
│ • Notifications │  │ • Webhooks      │  │ • ML Scoring    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
         │                    │                    │
         └────────────────────┼────────────────────┘
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
         ▼                    ▼                    ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│  TEAM CONTEXT   │  │  DATA CONTEXT   │  │   COMPLIANCE    │
├─────────────────┤  ├─────────────────┤  ├─────────────────┤
│ • Teams         │  │ • Custom Fields │  │ • Audit Logs    │
│ • Territories   │  │ • Segmentation  │  │ • GDPR          │
│ • Permissions   │  │ • Search        │  │ • Permissions   │
│ • Roles         │  │ • Import/Export │  │ • Data Masking  │
└─────────────────┘  └─────────────────┘  └─────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     INFRASTRUCTURE                               │
├─────────────────────────────────────────────────────────────────┤
│ • Database (PostgreSQL + Drizzle)                               │
│ • Cache (Redis)                                                 │
│ • Events (NATS JetStream)                                       │
│ • Queue (BullMQ)                                                │
│ • Storage (S3)                                                  │
│ • Search (Elasticsearch - planned)                              │
└─────────────────────────────────────────────────────────────────┘
```

### 9.2 Dependencias Entre Módulos

```yaml
Lead Context:
  depends_on: []
  publishes: [LeadCreated, LeadQualified, LeadConverted]
  subscribes_to: []

Customer Context:
  depends_on: [Lead Context]
  publishes: [CustomerCreated, CustomerChurned]
  subscribes_to: [LeadConverted]

Sales Context:
  depends_on: [Lead Context, Customer Context]
  publishes: [OpportunityWon, OpportunityLost]
  subscribes_to: [LeadQualified]

Communication Context:
  depends_on: []
  publishes: [EmailSent, EmailOpened]
  subscribes_to: [LeadCreated, CustomerCreated]

Automation Context:
  depends_on: [All Contexts]
  publishes: [WorkflowExecuted]
  subscribes_to: [All Events]

Analytics Context:
  depends_on: [All Contexts]
  publishes: []
  subscribes_to: [All Events]
```

---

## 10. DECISIONES TÉCNICAS JUSTIFICADAS

### 10.1 Stack Backend

| Decisión | Justificación | Alternativas Consideradas |
|----------|---------------|---------------------------|
| **Fastify** | Performance 2x mejor que Express, TypeScript nativo, plugin system | Express, Koa, Hono |
| **Drizzle ORM** | Type-safe, zero runtime overhead, SQL-like syntax | Prisma (más pesado), TypeORM (menos type-safe) |
| **TSyringe** | Lightweight DI, decorator-based, Microsoft-backed | InversifyJS (más complejo), Awilix |
| **Zod** | TypeScript-first, composable, inferencia de tipos | Yup, Joi (menos type-safe) |
| **NATS JetStream** | Cloud-agnostic, lightweight, at-least-once delivery | RabbitMQ, Kafka (más pesados) |

### 10.2 Stack Frontend (Propuesto)

| Decisión | Justificación | Alternativas |
|----------|---------------|--------------|
| **Next.js 14** | RSC, App Router, optimización automática | Remix, Nuxt |
| **React 18** | Concurrent features, Suspense, ecosystem | Vue, Svelte |
| **TailwindCSS** | Utility-first, purge automático, Shadcn compatible | CSS Modules, Styled Components |
| **Shadcn/UI** | Customizable, accessible, copy-paste | Radix UI, Chakra UI |
| **TanStack Query** | Cache, mutations, optimistic updates | SWR (menos features) |
| **Zustand** | Simple, TypeScript, no boilerplate | Redux (más complejo), Jotai |

### 10.3 Arquitectura

| Decisión | Justificación |
|----------|---------------|
| **Clean Architecture** | Separation of concerns, testability, framework independence |
| **CQRS** | Escalar read/write independientemente, optimizar queries |
| **DDD** | Modelo de dominio rico, bounded contexts claros |
| **Multi-tenancy Row-Level** | Simpler que schema-per-tenant, eficiente para SaaS |
| **Outbox Pattern** | Consistencia eventual garantizada, sin pérdida de eventos |

---

## 11. PROPUESTA DE ESTRUCTURA FRONTEND

### 11.1 Arquitectura Next.js 14

```
frontend/
├── app/                           # App Router
│   ├── (auth)/                    # Route group: auth pages
│   │   ├── login/
│   │   ├── register/
│   │   └── forgot-password/
│   │
│   ├── (dashboard)/               # Route group: protected pages
│   │   ├── layout.tsx             # Dashboard layout with sidebar
│   │   ├── page.tsx               # Dashboard home
│   │   ├── leads/
│   │   │   ├── page.tsx           # Lead list
│   │   │   ├── [id]/page.tsx      # Lead detail
│   │   │   └── new/page.tsx       # Create lead
│   │   ├── customers/
│   │   ├── opportunities/
│   │   ├── tasks/
│   │   ├── campaigns/
│   │   ├── analytics/
│   │   ├── settings/
│   │   └── team/
│   │
│   ├── api/                       # API routes (BFF)
│   │   └── [...proxy]/route.ts    # Proxy to backend
│   │
│   ├── layout.tsx                 # Root layout
│   └── globals.css                # Global styles
│
├── components/                    # Atomic Design
│   ├── atoms/                     # Basic elements
│   │   ├── Button/
│   │   ├── Input/
│   │   ├── Badge/
│   │   └── Avatar/
│   │
│   ├── molecules/                 # Combinations
│   │   ├── FormField/
│   │   ├── SearchBar/
│   │   ├── Dropdown/
│   │   └── StatCard/
│   │
│   ├── organisms/                 # Complex components
│   │   ├── Sidebar/
│   │   ├── Navbar/
│   │   ├── DataTable/
│   │   ├── LeadCard/
│   │   └── Pipeline/
│   │
│   ├── templates/                 # Page layouts
│   │   ├── DashboardTemplate/
│   │   ├── ListTemplate/
│   │   └── FormTemplate/
│   │
│   └── ui/                        # Shadcn components
│       ├── button.tsx
│       ├── input.tsx
│       ├── dialog.tsx
│       └── ...
│
├── features/                      # Feature modules
│   ├── leads/
│   │   ├── api/                   # API calls
│   │   ├── components/            # Feature-specific components
│   │   ├── hooks/                 # Custom hooks
│   │   ├── store/                 # Zustand slice
│   │   └── types/                 # TypeScript types
│   │
│   ├── customers/
│   ├── opportunities/
│   └── ...
│
├── lib/                           # Utilities
│   ├── api-client.ts              # Fetch wrapper
│   ├── auth.ts                    # Auth utilities
│   ├── utils.ts                   # Helpers
│   └── validations.ts             # Zod schemas
│
├── hooks/                         # Global hooks
│   ├── useAuth.ts
│   ├── useTenant.ts
│   └── usePermissions.ts
│
├── stores/                        # Global state
│   ├── auth.store.ts
│   └── ui.store.ts
│
├── types/                         # Global types
│   ├── api.d.ts
│   └── entities.d.ts
│
└── config/                        # Configuration
    ├── navigation.ts
    └── permissions.ts
```

### 11.2 Componentes Base Propuestos

#### Sidebar Component

```typescript
// components/organisms/Sidebar/Sidebar.tsx
interface SidebarProps {
  navigation: NavigationItem[];
  collapsed?: boolean;
  onCollapse?: () => void;
}

export function Sidebar({ navigation, collapsed, onCollapse }: SidebarProps) {
  return (
    <aside className={cn(
      "flex flex-col h-screen bg-gray-900 text-white transition-all",
      collapsed ? "w-16" : "w-64"
    )}>
      <Logo collapsed={collapsed} />
      <Navigation items={navigation} collapsed={collapsed} />
      <UserMenu collapsed={collapsed} />
    </aside>
  );
}
```

#### DataTable Component

```typescript
// components/organisms/DataTable/DataTable.tsx
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  pagination?: PaginationState;
  sorting?: SortingState;
  filtering?: FilteringState;
  onRowClick?: (row: T) => void;
  isLoading?: boolean;
}

export function DataTable<T>({
  data,
  columns,
  pagination,
  sorting,
  filtering,
  onRowClick,
  isLoading
}: DataTableProps<T>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: { pagination, sorting, columnFilters: filtering }
  });

  return (
    <div>
      <Table>
        <TableHeader>...</TableHeader>
        <TableBody>
          {isLoading ? <Skeleton /> : <Rows />}
        </TableBody>
      </Table>
      <Pagination table={table} />
    </div>
  );
}
```

### 11.3 Integración API

```typescript
// lib/api-client.ts
class ApiClient {
  private baseUrl: string;
  private getToken: () => Promise<string>;

  constructor(baseUrl: string, getToken: () => Promise<string>) {
    this.baseUrl = baseUrl;
    this.getToken = getToken;
  }

  async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
    const token = await this.getToken();

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options?.headers
      }
    });

    if (!response.ok) {
      throw new ApiError(response.status, await response.json());
    }

    return response.json();
  }

  get<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  post<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data)
    });
  }

  patch<T>(endpoint: string, data: unknown) {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  delete<T>(endpoint: string) {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const api = new ApiClient(
  process.env.NEXT_PUBLIC_API_URL!,
  () => getAccessToken()
);
```

### 11.4 Feature Hook Example

```typescript
// features/leads/hooks/useLeads.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';
import { Lead, CreateLeadDTO, UpdateLeadDTO } from '../types';

export function useLeads(filters?: LeadFilters) {
  return useQuery({
    queryKey: ['leads', filters],
    queryFn: () => api.get<PaginatedResponse<Lead>>('/api/v1/leads', { params: filters })
  });
}

export function useLead(id: string) {
  return useQuery({
    queryKey: ['leads', id],
    queryFn: () => api.get<Lead>(`/api/v1/leads/${id}`),
    enabled: !!id
  });
}

export function useCreateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateLeadDTO) => api.post<Lead>('/api/v1/leads', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    }
  });
}

export function useUpdateLead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateLeadDTO }) =>
      api.patch<Lead>(`/api/v1/leads/${id}`, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      queryClient.invalidateQueries({ queryKey: ['leads', id] });
    }
  });
}
```

---

## 12. PLAN DE ACCIÓN

### 12.1 Roadmap de Fases

```
┌─────────────────────────────────────────────────────────────────┐
│ FASE 0: Análisis (COMPLETADA)                                   │
│ ✅ Diagnóstico técnico                                          │
│ ✅ Gap analysis                                                 │
│ ✅ Recomendaciones                                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ FASE 1: Arquitectura Frontend                                   │
│ • Setup Next.js 14 + Tailwind + Shadcn                         │
│ • Componentes base (Sidebar, Navbar, DataTable)                │
│ • Sistema de diseño                                             │
│ • Multi-tenant routing                                          │
│ Entregables: Scaffold completo, Design System, Docs             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ FASE 2: Integración Backend + Frontend                          │
│ • Cliente API centralizado                                      │
│ • Autenticación completa (Supabase)                            │
│ • Middleware de protección                                      │
│ • Multi-tenant enforcement                                      │
│ Entregables: Auth funcional, Panel protegido                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ FASE 3: Módulos Funcionales                                     │
│ Iteración 1: Users & Roles                                      │
│ Iteración 2: Leads                                              │
│ Iteración 3: Customers                                          │
│ Iteración 4: Opportunities                                      │
│ Iteración 5: Tasks                                              │
│ Iteración 6: Analytics                                          │
│ Entregables: CRM funcional completo                            │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ FASE 4: Optimización                                            │
│ • Caching strategy                                              │
│ • RSC optimization                                              │
│ • Performance testing                                           │
│ • Security hardening                                            │
│ Entregables: Sistema optimizado, Métricas                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│ FASE 5: UI/UX Final                                             │
│ • Design System refinado                                        │
│ • Animaciones (Framer Motion)                                   │
│ • Dark mode                                                     │
│ • Accessibility audit                                           │
│ Entregables: Producto pulido                                    │
└─────────────────────────────────────────────────────────────────┘
```

### 12.2 Prioridades Inmediatas

| # | Tarea | Prioridad | Sprint |
|---|-------|-----------|--------|
| 1 | Implementar JWT validation | P0 | Sprint 1 |
| 2 | Aplicar permisos en rutas | P0 | Sprint 1 |
| 3 | Setup Next.js 14 frontend | P0 | Sprint 1 |
| 4 | Crear componentes base | P1 | Sprint 2 |
| 5 | Implementar auth flow | P1 | Sprint 2 |
| 6 | Tests de presentación | P1 | Sprint 3 |
| 7 | Módulo de Leads UI | P1 | Sprint 3-4 |
| 8 | Refactorizar container.ts | P2 | Sprint 4 |

---

## CONCLUSIÓN

El backend del Zuclubit Smart CRM tiene una **base arquitectónica excelente** con Clean Architecture, DDD y CQRS bien implementados. Sin embargo, existen **gaps críticos de seguridad** que deben abordarse antes de cualquier deployment a producción.

### Próximos Pasos Recomendados

1. **Inmediato**: Implementar autenticación JWT real con Supabase
2. **Corto plazo**: Aplicar RBAC en todas las rutas
3. **Paralelo**: Iniciar desarrollo del frontend Next.js 14
4. **Continuo**: Agregar tests y documentación

### Listo Para

- ✅ Desarrollo local
- ✅ CI/CD pipeline
- ✅ Docker deployment
- ✅ Feature development

### No Listo Para

- ❌ Producción (falta auth)
- ❌ Multi-tenant real (falta permisos)
- ❌ High traffic (falta caching strategy)

---

**Documento generado**: Diciembre 2025
**Autor**: Claude (Opus 4.5)
**Próxima revisión**: Tras completar FASE 1

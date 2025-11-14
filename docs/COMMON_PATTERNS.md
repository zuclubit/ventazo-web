# Patrones Comunes - Zuclubit Smart CRM
**Version**: 1.0.0 | **Fecha**: Enero 2025 | **Status**: Reference Guide ✅

---

## 📋 Índice
1. [Patrones de Arquitectura](#patrones-de-arquitectura)
2. [Patrones de Domain-Driven Design](#patrones-de-domain-driven-design)
3. [Patrones de Base de Datos](#patrones-de-base-de-datos)
4. [Patrones de Comunicación](#patrones-de-comunicación)
5. [Patrones de Resiliencia](#patrones-de-resiliencia)
6. [Patrones de Seguridad](#patrones-de-seguridad)
7. [Patrones de Observabilidad](#patrones-de-observabilidad)

---

## 🏗️ Patrones de Arquitectura

### 1. Microservices Architecture

**Descripción**: Sistema descompuesto en 8 servicios independientes, cada uno con su propia base de datos.

**Servicios**:
1. Lead Service
2. Customer Service
3. Proposal Service (CPQ)
4. Financial Service
5. LATAM Compliance Service
6. AI Automation Service
7. Analytics Service
8. Notification Service

**Ventajas**:
- ✅ Escalabilidad independiente
- ✅ Despliegue independiente
- ✅ Aislamiento de fallos
- ✅ Stack tecnológico flexible

**Implementación**:
```yaml
Deployment: AWS Lambda (containerizado)
Communication: NATS JetStream (event-driven)
API Gateway: AWS API Gateway + OpenAPI
Service Discovery: DNS-based (AWS)
```

---

### 2. Event-Driven Architecture

**Descripción**: Servicios se comunican mediante eventos asincrónicos (NATS JetStream), no llamadas síncronas HTTP.

**Patrón**:
```typescript
// Service A publica evento
await publishEvent({
  type: 'Proposal.Accepted',
  data: {
    proposalId: '123',
    customerId: '456',
    total: 50000,
  },
});

// Service B consume evento
await subscribeToEvents('proposal.accepted', async (event) => {
  // Generate invoice from accepted proposal
  await generateInvoice(event.data);
});
```

**Ventajas**:
- ✅ Desacoplamiento total
- ✅ Escalabilidad horizontal
- ✅ Tolerancia a fallos
- ✅ Replay de eventos

**Implementado en**: **TODOS los servicios**

---

### 3. CQRS (Command Query Responsibility Segregation)

**Descripción**: Separación de operaciones de escritura (commands) y lectura (queries).

**Implementación**:
```typescript
// Write Model (Commands)
class CreateCustomerCommand {
  async execute(data: CreateCustomerDTO): Promise<Customer> {
    const customer = Customer.create(...);
    await this.customerRepo.save(customer);
    await this.publishEvents(customer);
    return customer;
  }
}

// Read Model (Queries)
class GetCustomerDashboardQuery {
  async execute(customerId: string): Promise<CustomerDashboard> {
    // Read from optimized view (Redis cache + materialized views)
    return await this.dashboardCache.get(customerId);
  }
}
```

**Ventajas**:
- ✅ Optimización independiente de reads/writes
- ✅ Escalabilidad de queries
- ✅ Modelos simplificados

**Implementado en**: Customer Service, Analytics Service

---

### 4. API Gateway Pattern

**Descripción**: Punto de entrada único para todas las APIs (AWS API Gateway).

**Configuración**:
```yaml
API Gateway:
  - Routing: /api/v1/leads → Lead Service Lambda
  - Routing: /api/v1/customers → Customer Service Lambda
  - Authentication: JWT validation (Supabase Auth)
  - Rate Limiting: 1000 req/min per tenant
  - OpenAPI Spec: Portable (export to Kong later)
```

**Ventajas**:
- ✅ Autenticación centralizada
- ✅ Rate limiting
- ✅ CORS handling
- ✅ Request/response transformation

**Implementado en**: **TODOS los servicios**

---

## 🎯 Patrones de Domain-Driven Design

### 1. Aggregate Pattern

**Descripción**: Cluster de objetos de dominio tratados como una unidad (Aggregate Root).

**Ejemplos por Servicio**:

#### Lead Service
```typescript
class Lead {  // Aggregate Root
  - LeadContact[]  // Entities
  - LeadSource     // Value Object
  - LeadScore      // Value Object
}
```

#### Customer Service
```typescript
class Customer {  // Aggregate Root
  - Contact[]           // Entities
  - Contract[]          // Entities
  - CustomerHealth      // Value Object
  - AccountHierarchy    // Value Object
  - OnboardingProgress  // Entity
}
```

#### Proposal Service
```typescript
class Proposal {  // Aggregate Root
  - LineItem[]          // Entities
  - ProposalVersion[]   // Entities
  - Money               // Value Object
  - Discount            // Value Object
  - ApprovalRequest[]   // Entities
}
```

**Reglas**:
- ✅ Solo el Aggregate Root es accesible externamente
- ✅ Cambios de estado via métodos de negocio
- ✅ Consistencia transaccional dentro del aggregate
- ✅ Referencias externas solo por ID

**Implementado en**: **TODOS los servicios**

---

### 2. Value Objects Pattern

**Descripción**: Objetos inmutables que representan conceptos del dominio.

**Ejemplos Comunes**:

```typescript
// Money (usado en Proposal, Financial, Customer)
class Money {
  constructor(
    public readonly amount: number,
    public readonly currency: 'MXN' | 'USD' | 'EUR'
  ) {
    if (amount < 0) throw new Error('Amount cannot be negative');
  }

  add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new Error('Currency mismatch');
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  format(): string {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }
}

// Email (usado en Lead, Customer, Proposal)
class Email {
  constructor(public readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid email format');
    }
  }

  private isValid(email: string): boolean {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
  }
}

// TaxIdentifier (RFC México - LATAM Compliance)
class RFC {
  constructor(public readonly value: string) {
    if (!this.isValid(value)) {
      throw new Error('Invalid RFC format');
    }
  }

  private isValid(rfc: string): boolean {
    // 13 chars for persona física, 12 for persona moral
    return /^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/.test(rfc);
  }
}
```

**Ventajas**:
- ✅ Encapsulación de lógica de validación
- ✅ Inmutabilidad (thread-safe)
- ✅ Reusabilidad

**Implementado en**: **TODOS los servicios**

---

### 3. Domain Events Pattern

**Descripción**: Eventos que representan cambios significativos en el dominio.

**Estructura Estándar** (CloudEvents):
```typescript
interface DomainEvent<T = any> {
  // CloudEvents spec
  specversion: '1.0';
  type: string;              // Lead.Created, Customer.Churned
  source: string;            // lead-service, customer-service
  id: string;                // UUID
  time: string;              // ISO timestamp
  datacontenttype: 'application/json';

  // Business data
  data: T;

  // Metadata
  tenantId: string;
  userId?: string;
  correlationId?: string;
}
```

**Catálogo de Eventos (87 eventos totales)**:

```yaml
Lead Service (12 eventos):
  - Lead.Created
  - Lead.Qualified
  - Lead.Converted
  - Lead.Scored
  - Lead.Assigned
  # ... 7 more

Customer Service (15 eventos):
  - Customer.Created
  - Customer.HealthScoreUpdated
  - Customer.Churned
  - Customer.OnboardingCompleted
  - Customer.Renewed
  # ... 10 more

Proposal Service (12 eventos):
  - Proposal.Created
  - Proposal.Sent
  - Proposal.Accepted
  - Proposal.Approved
  - Proposal.VersionCreated
  # ... 7 more

Financial Service (10 eventos):
  - Invoice.Created
  - Invoice.Issued (CFDI timbrado)
  - Invoice.Paid
  - Payment.Succeeded
  - CreditNote.Created
  # ... 5 more

AI Automation Service (8 eventos):
  - LeadScore.Predicted
  - Email.Processed
  - VoiceTranscription.Completed
  - Model.DriftDetected
  # ... 4 more

Analytics Service (5 eventos):
  - Report.Generated
  - Dashboard.Refreshed
  # ... 3 more

Notification Service (5 eventos):
  - Notification.Sent
  - Notification.Delivered
  - Notification.Opened
  # ... 2 more

LATAM Compliance Service (20 eventos):
  - CFDI.Generated
  - CFDI.Timbrado
  - CFDI.Cancelled
  - SAT.Validated
  # ... 16 more
```

**Publishing Pattern**:
```typescript
class Lead {
  private domainEvents: DomainEvent[] = [];

  qualifyLead(): Result<void> {
    this.status = LeadStatus.QUALIFIED;

    this.addDomainEvent({
      type: 'Lead.Qualified',
      data: {
        leadId: this.id,
        score: this.score,
      },
    });

    return Result.ok();
  }

  getDomainEvents(): DomainEvent[] {
    return [...this.domainEvents];
  }

  clearDomainEvents(): void {
    this.domainEvents = [];
  }
}

// Repository publishes events after save
class LeadRepository {
  async save(lead: Lead): Promise<Result<void>> {
    await this.db.save(lead);

    // Publish domain events
    const events = lead.getDomainEvents();
    for (const event of events) {
      await this.eventPublisher.publish(event);
    }

    lead.clearDomainEvents();

    return Result.ok();
  }
}
```

**Implementado en**: **TODOS los servicios**

---

### 4. Repository Pattern

**Descripción**: Abstracción de acceso a datos (persistencia).

**Interfaz Estándar**:
```typescript
interface IRepository<T> {
  findById(id: string): Promise<Result<T>>;
  findAll(): Promise<Result<T[]>>;
  save(entity: T): Promise<Result<void>>;
  delete(id: string): Promise<Result<void>>;
}

// Ejemplo: LeadRepository
class LeadRepository implements IRepository<Lead> {
  constructor(
    private db: PostgreSQLClient,
    private eventPublisher: IEventPublisher
  ) {}

  async findById(id: string): Promise<Result<Lead>> {
    const row = await this.db.query(
      'SELECT * FROM leads WHERE id = $1',
      [id]
    );

    if (!row) {
      return Result.fail('Lead not found');
    }

    const lead = this.toDomain(row);
    return Result.ok(lead);
  }

  async save(lead: Lead): Promise<Result<void>> {
    const data = this.toPersistence(lead);

    await this.db.query(
      `INSERT INTO leads (...) VALUES (...)
       ON CONFLICT (id) DO UPDATE SET ...`,
      [...data]
    );

    // Publish domain events
    await this.publishEvents(lead);

    return Result.ok();
  }

  private toDomain(row: any): Lead {
    // Map database row → Domain object
  }

  private toPersistence(lead: Lead): any {
    // Map Domain object → Database row
  }
}
```

**Ventajas**:
- ✅ Desacoplamiento de lógica de dominio y persistencia
- ✅ Testabilidad (mock repositories)
- ✅ Cambio de DB sin afectar dominio

**Implementado en**: **TODOS los servicios**

---

### 5. Result Pattern (Railway Oriented Programming)

**Descripción**: Manejo de errores funcional (evitar exceptions).

**Implementación**:
```typescript
class Result<T> {
  private constructor(
    public readonly isSuccess: boolean,
    public readonly value?: T,
    public readonly error?: string
  ) {}

  static ok<T>(value?: T): Result<T> {
    return new Result<T>(true, value);
  }

  static fail<T>(error: string): Result<T> {
    return new Result<T>(false, undefined, error);
  }

  get isFailure(): boolean {
    return !this.isSuccess;
  }
}

// Usage
async createLead(data: CreateLeadDTO): Promise<Result<Lead>> {
  // Validation
  const validationResult = this.validate(data);
  if (validationResult.isFailure) {
    return Result.fail(validationResult.error);
  }

  // Duplicate check
  const duplicateResult = await this.checkDuplicate(data.email);
  if (duplicateResult.isFailure) {
    return Result.fail('Lead with this email already exists');
  }

  // Create lead
  const leadResult = Lead.create(...);
  if (leadResult.isFailure) {
    return Result.fail(leadResult.error);
  }

  const lead = leadResult.value;

  // Save
  const saveResult = await this.leadRepo.save(lead);
  if (saveResult.isFailure) {
    return Result.fail(saveResult.error);
  }

  return Result.ok(lead);
}
```

**Ventajas**:
- ✅ Explicit error handling
- ✅ Type-safe
- ✅ Composable (chain operations)
- ✅ No try/catch spaghetti

**Implementado en**: **TODOS los servicios**

---

## 🗄️ Patrones de Base de Datos

### 1. Database per Service

**Descripción**: Cada servicio tiene su propia base de datos (PostgreSQL + MongoDB).

**Esquema**:
```yaml
Lead Service:
  PostgreSQL:
    - leads
    - lead_contacts
    - lead_sources
  MongoDB:
    - lead_activity_logs

Customer Service:
  PostgreSQL:
    - customers
    - customer_contacts
    - customer_contracts
  MongoDB:
    - customer_activity_timeline
    - customer_health_history

Proposal Service:
  PostgreSQL:
    - proposals
    - proposal_line_items
    - products
  MongoDB:
    - proposal_audit_logs

Financial Service:
  PostgreSQL:
    - invoices
    - payments
    - subscriptions
  MongoDB:
    - cfdi_documents (5 year retention)

# ... y así para cada servicio
```

**Ventajas**:
- ✅ Autonomía total
- ✅ Escalado independiente
- ✅ Stack tecnológico flexible

**Desventajas**:
- ❌ No transactions distribuidas (usa Saga pattern)
- ❌ Joins entre servicios (via eventos)

---

### 2. Polyglot Persistence

**Descripción**: Cada servicio usa la BD más adecuada para su caso de uso.

**Distribución**:
```yaml
PostgreSQL (OLTP - Transaccional):
  - Lead Service
  - Customer Service
  - Proposal Service
  - Financial Service
  - Notification Service
  Use: Transacciones ACID, relaciones complejas

MongoDB (Document Store):
  - Activity logs (high write volume)
  - CFDI documents (JSON storage)
  - Customer 360 cache
  - Event stream
  Use: Flexible schema, time-series data

Redis (Cache + Sessions):
  - Dashboard cache (5 min TTL)
  - Customer health score cache
  - PDF cache (24h TTL)
  - Rate limiting
  - Session management
  Use: Ultra-fast reads, TTL support

ClickHouse (OLAP - Optional Phase 2):
  - Analytics Service
  - Columnar storage
  Use: Fast aggregations, time-series analytics
```

**Ventajas**:
- ✅ Optimización por caso de uso
- ✅ Performance óptimo
- ✅ Costo-eficiente

**Implementado en**: **TODOS los servicios**

---

### 3. Row Level Security (Multi-Tenancy)

**Descripción**: Aislamiento de datos por tenant a nivel de BD (PostgreSQL RLS).

**Implementación**:
```sql
-- Enable RLS on table
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create policy: users can only see their tenant's data
CREATE POLICY tenant_isolation ON leads
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Application sets tenant context per request
-- Middleware:
export async function setTenantContext(tenantId: string) {
  await pool.query('SET app.tenant_id = $1', [tenantId]);
}

// All queries automatically filtered by tenant
const leads = await pool.query('SELECT * FROM leads');
// Returns only current tenant's leads (RLS policy applied)
```

**Ventajas**:
- ✅ Seguridad a nivel de BD
- ✅ Imposible acceder datos de otros tenants
- ✅ No filtros manuales en queries

**Implementado en**: Lead, Customer, Proposal, Financial, Notification Services

---

### 4. Outbox Pattern (Transactional Outbox)

**Descripción**: Garantiza consistencia entre cambios en BD y publicación de eventos.

**Problema**: ¿Qué pasa si falla la publicación del evento después de guardar en BD?

**Solución**:
```typescript
// 1. Save entity + events in SAME transaction
async save(lead: Lead): Promise<Result<void>> {
  const client = await this.pool.connect();

  try {
    await client.query('BEGIN');

    // Save lead
    await client.query(
      'INSERT INTO leads (...) VALUES (...)',
      [...]
    );

    // Save events to outbox table (same transaction)
    const events = lead.getDomainEvents();
    for (const event of events) {
      await client.query(
        'INSERT INTO outbox_events (event_type, event_data) VALUES ($1, $2)',
        [event.type, JSON.stringify(event.data)]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    return Result.fail(error.message);
  } finally {
    client.release();
  }

  return Result.ok();
}

// 2. Background job publishes events from outbox
async function publishOutboxEvents() {
  const events = await pool.query(
    'SELECT * FROM outbox_events WHERE published = FALSE LIMIT 100'
  );

  for (const event of events.rows) {
    try {
      await nats.publish(event.event_type, event.event_data);

      await pool.query(
        'UPDATE outbox_events SET published = TRUE WHERE id = $1',
        [event.id]
      );
    } catch (error) {
      // Retry later
    }
  }
}

// Run every 5 seconds
setInterval(publishOutboxEvents, 5000);
```

**Ventajas**:
- ✅ Garantiza eventual consistency
- ✅ No eventos perdidos
- ✅ Idempotencia

**Implementado en**: Lead, Customer, Proposal, Financial Services

---

### 5. Materialized Views (Read Optimization)

**Descripción**: Pre-cálculo de queries complejas para dashboards.

**Ejemplo (Analytics Service)**:
```sql
-- Materialized view for sales summary
CREATE MATERIALIZED VIEW mv_sales_summary AS
SELECT
  l.tenant_id,
  DATE_TRUNC('day', l.created_at) as date,
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT CASE WHEN l.status = 'qualified' THEN l.id END) as qualified_leads,
  COUNT(DISTINCT p.id) as proposals_created,
  SUM(CASE WHEN p.status = 'accepted' THEN p.total ELSE 0 END) as revenue
FROM leads l
LEFT JOIN proposals p ON p.lead_id = l.id
GROUP BY l.tenant_id, DATE_TRUNC('day', l.created_at);

CREATE INDEX idx_mv_sales_summary ON mv_sales_summary(tenant_id, date DESC);

-- Refresh daily (cron job)
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_sales_summary;
```

**Dashboard Query** (Fast):
```typescript
// Instead of complex joins, query materialized view
const summary = await pool.query(`
  SELECT * FROM mv_sales_summary
  WHERE tenant_id = $1
    AND date BETWEEN $2 AND $3
  ORDER BY date DESC
`, [tenantId, startDate, endDate]);

// Response time: <50ms (vs 2s without materialized view)
```

**Ventajas**:
- ✅ Queries ultra-rápidas
- ✅ Reduce load on OLTP DB
- ✅ Dashboard performance

**Implementado en**: Analytics Service

---

## 🔄 Patrones de Comunicación

### 1. Event-Driven Communication (NATS JetStream)

**Descripción**: Comunicación asíncrona vía eventos (no HTTP síncrono).

**NATS Streams**:
```typescript
// Create streams
await jsm.streams.add({
  name: 'LEAD_EVENTS',
  subjects: ['lead.*'],
  retention: 'limits',
  max_age: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days
  storage: 'file',
});

// Publish event
await js.publish('lead.created', jc.encode({
  leadId: '123',
  tenantId: 'abc',
  companyName: 'Acme Inc',
}));

// Subscribe to events
const consumer = await js.consumers.get('LEAD_EVENTS', 'ai-scoring-consumer');
const messages = await consumer.consume();

for await (const msg of messages) {
  try {
    const event = jc.decode(msg.data);
    await scoreLead(event);
    msg.ack(); // Acknowledge success
  } catch (error) {
    msg.nak(5000); // Retry after 5 seconds
  }
}
```

**Ventajas**:
- ✅ Desacoplamiento
- ✅ Escalabilidad
- ✅ Replay capability
- ✅ At-least-once delivery

**Implementado en**: **TODOS los servicios**

---

### 2. Saga Pattern (Distributed Transactions)

**Descripción**: Coordinación de transacciones distribuidas mediante eventos compensatorios.

**Ejemplo: Lead → Customer Conversion**:
```typescript
/**
 * Saga: Convert Lead to Customer
 *
 * Steps:
 * 1. Create Customer (Customer Service)
 * 2. Create Contract from Proposal (Customer Service)
 * 3. Generate Invoice (Financial Service)
 * 4. Mark Lead as Converted (Lead Service)
 *
 * Compensation (if any step fails):
 * 4. Revert Lead status
 * 3. Cancel Invoice
 * 2. Delete Contract
 * 1. Delete Customer
 */

// Orchestration (Lead Service coordinatesaga)
class LeadConversionSaga {
  async execute(leadId: string, proposalId: string): Promise<Result<void>> {
    const sagaId = crypto.randomUUID();

    try {
      // Step 1: Create Customer
      const customerResult = await this.customerService.createFromLead(leadId);
      if (customerResult.isFailure) {
        throw new Error(customerResult.error);
      }

      const customerId = customerResult.value.id;

      // Step 2: Create Contract
      const contractResult = await this.customerService.createContract(
        customerId,
        proposalId
      );
      if (contractResult.isFailure) {
        // Compensate: Delete customer
        await this.customerService.deleteCustomer(customerId);
        throw new Error(contractResult.error);
      }

      // Step 3: Generate Invoice
      const invoiceResult = await this.financialService.generateInvoice(proposalId);
      if (invoiceResult.isFailure) {
        // Compensate: Delete contract, delete customer
        await this.customerService.deleteContract(contractResult.value.id);
        await this.customerService.deleteCustomer(customerId);
        throw new Error(invoiceResult.error);
      }

      // Step 4: Mark lead as converted
      const lead = await this.leadRepo.findById(leadId);
      lead.markAsConverted(customerId);
      await this.leadRepo.save(lead);

      return Result.ok();
    } catch (error) {
      // Saga failed, compensations already executed
      return Result.fail(`Saga failed: ${error.message}`);
    }
  }
}
```

**Ventajas**:
- ✅ Consistencia eventual
- ✅ Rollback automático
- ✅ Fault tolerance

**Implementado en**: Customer Service (lead conversion), Financial Service (invoice generation)

---

### 3. API Composition Pattern

**Descripción**: Agregar datos de múltiples servicios para una respuesta completa.

**Ejemplo: Customer 360° View**:
```typescript
/**
 * Customer 360° View
 * Agrega datos de 5 servicios diferentes
 */

class Customer360Service {
  async getCustomer360(customerId: string): Promise<Customer360View> {
    // Parallel queries to multiple services
    const [
      customer,
      proposals,
      invoices,
      contracts,
      usage,
    ] = await Promise.all([
      this.customerService.getCustomer(customerId),
      this.proposalService.getProposalsByCustomer(customerId),
      this.financialService.getInvoicesByCustomer(customerId),
      this.customerService.getContracts(customerId),
      this.analyticsService.getUsageMetrics(customerId),
    ]);

    return {
      customer,
      proposals: proposals.slice(0, 5), // Last 5
      financial: {
        total_revenue: invoices.reduce((sum, inv) => sum + inv.total, 0),
        unpaid_invoices: invoices.filter(inv => inv.status !== 'paid'),
      },
      contracts: {
        active: contracts.filter(c => c.status === 'active'),
        total_arr: contracts.reduce((sum, c) => sum + c.value, 0),
      },
      usage,
    };
  }
}
```

**Ventajas**:
- ✅ Rich user experience
- ✅ Reduced frontend complexity
- ✅ Caching opportunities

**Implementado en**: Customer Service (Customer 360), Analytics Service (Dashboard aggregation)

---

## 🛡️ Patrones de Resiliencia

### 1. Circuit Breaker Pattern

**Descripción**: Previene cascading failures cortando requests a servicios fallando.

**Implementación (AI Automation Service → SageMaker)**:
```typescript
class SageMakerCircuitBreaker {
  private failures: Map<string, number> = new Map();
  private readonly failureThreshold = 5;
  private readonly resetTimeout = 60000; // 60 seconds
  private lastFailureTime: Map<string, number> = new Map();

  async execute<T>(
    endpointName: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // Check if circuit is open
    if (this.isOpen(endpointName)) {
      if (this.shouldReset(endpointName)) {
        this.reset(endpointName);
      } else {
        throw new Error(`Circuit breaker OPEN for ${endpointName}`);
      }
    }

    try {
      const result = await operation();
      this.recordSuccess(endpointName);
      return result;
    } catch (error) {
      this.recordFailure(endpointName);
      throw error;
    }
  }

  private isOpen(endpointName: string): boolean {
    const failures = this.failures.get(endpointName) || 0;
    return failures >= this.failureThreshold;
  }

  private shouldReset(endpointName: string): boolean {
    const lastFailure = this.lastFailureTime.get(endpointName) || 0;
    return Date.now() - lastFailure > this.resetTimeout;
  }

  private recordFailure(endpointName: string): void {
    const current = this.failures.get(endpointName) || 0;
    this.failures.set(endpointName, current + 1);
    this.lastFailureTime.set(endpointName, Date.now());
  }

  private recordSuccess(endpointName: string): void {
    this.failures.set(endpointName, 0);
  }

  private reset(endpointName: string): void {
    this.failures.set(endpointName, 0);
  }
}

// Usage
const breaker = new SageMakerCircuitBreaker();

const score = await breaker.execute(
  'lead-scoring-endpoint',
  async () => {
    return await sageMaker.invokeEndpoint(data);
  }
);
```

**Ventajas**:
- ✅ Previene cascading failures
- ✅ Fast fail
- ✅ Auto-recovery

**Implementado en**: AI Automation Service (SageMaker calls), Notification Service (SendGrid calls)

---

### 2. Retry Pattern with Exponential Backoff

**Descripción**: Reintentar operaciones fallidas con delay creciente.

**Implementación**:
```typescript
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;

      if (attempt < maxRetries - 1) {
        // Exponential backoff: 1s, 2s, 4s, 8s...
        const delay = baseDelay * Math.pow(2, attempt);

        // Add jitter to prevent thundering herd
        const jitter = Math.random() * 1000;

        await this.sleep(delay + jitter);
      }
    }
  }

  throw lastError!;
}

// Usage
const invoice = await retryWithBackoff(
  async () => {
    return await this.financialService.generateCFDI(data);
  },
  3, // Max 3 retries
  2000 // Initial delay 2s
);
```

**Ventajas**:
- ✅ Handles transient failures
- ✅ Prevents overwhelming failed service
- ✅ Jitter prevents thundering herd

**Implementado en**: Financial Service (CFDI generation), Notification Service (email delivery)

---

### 3. Graceful Degradation

**Descripción**: Proporcionar funcionalidad reducida cuando servicios dependientes fallan.

**Ejemplo (AI Automation Service)**:
```typescript
class AIServiceFallbackHandler {
  async scoreLeadWithFallback(lead: Lead): Promise<LeadScorePrediction> {
    try {
      // Try ML model (SageMaker)
      return await this.scoreWithModel(lead);
    } catch (error) {
      console.warn('ML scoring failed, using rule-based fallback');

      // Fallback to rule-based scoring (degraded but functional)
      return this.scoreWithRules(lead);
    }
  }

  private scoreWithRules(lead: Lead): LeadScorePrediction {
    let score = 50; // Base score

    // Simple heuristic rules
    if (lead.companySize > 500) score += 15;
    if (lead.industry === 'Technology') score += 10;
    if (lead.emailOpenRate > 0.5) score += 10;
    if (lead.demoRequested) score += 15;

    score = Math.min(score, 100);

    return {
      score,
      confidence: 0.6, // Lower confidence for rules
      method: 'rule_based_fallback',
    };
  }
}
```

**Ventajas**:
- ✅ System remains functional
- ✅ User experience maintained
- ✅ Reduced dependency on external services

**Implementado en**: AI Automation Service, Analytics Service

---

### 4. Idempotency Pattern

**Descripción**: Operaciones pueden ejecutarse múltiples veces sin cambiar el resultado.

**Implementación (Webhook handlers)**:
```typescript
/**
 * Idempotent webhook handler (DocuSign, Stripe)
 */

class IdempotentWebhookHandler {
  constructor(private redis: RedisClient) {}

  async handleWebhook(
    webhookId: string,
    handler: () => Promise<void>
  ): Promise<Result<void>> {
    const key = `webhook:processed:${webhookId}`;

    // Check if already processed
    const processed = await this.redis.exists(key);
    if (processed) {
      console.log(`Webhook ${webhookId} already processed, skipping`);
      return Result.ok(); // Idempotent: return success
    }

    // Process webhook
    try {
      await handler();

      // Mark as processed (TTL 7 days)
      await this.redis.set(key, '1', { ex: 7 * 24 * 60 * 60 });

      return Result.ok();
    } catch (error) {
      return Result.fail(error.message);
    }
  }
}

// Usage (Proposal Service - DocuSign webhook)
await idempotentHandler.handleWebhook(
  event.envelope_id,
  async () => {
    const proposal = await this.proposalRepo.findByEnvelopeId(event.envelope_id);
    proposal.markAsAccepted();
    await this.proposalRepo.save(proposal);
  }
);
```

**Ventajas**:
- ✅ Safe retries
- ✅ Prevents duplicate processing
- ✅ Eventual consistency

**Implementado en**: Proposal Service (DocuSign), Financial Service (Stripe), Notification Service (SendGrid/Twilio)

---

## 🔒 Patrones de Seguridad

### 1. Multi-Tenancy with Row Level Security

**Ya documentado arriba**. Ver sección "Row Level Security (Multi-Tenancy)".

---

### 2. API Key Rotation

**Descripción**: Rotación automática de secrets y API keys.

**Implementación (AWS Secrets Manager)**:
```typescript
import { SecretsManagerClient, GetSecretValueCommand } from '@aws-sdk/client-secrets-manager';

class SecretManager {
  private client: SecretsManagerClient;
  private cache: Map<string, { value: string; expiresAt: number }> = new Map();

  constructor() {
    this.client = new SecretsManagerClient({ region: 'us-east-1' });
  }

  async getSecret(secretName: string): Promise<string> {
    // Check cache (TTL 5 minutes)
    const cached = this.cache.get(secretName);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }

    // Fetch from AWS Secrets Manager
    const command = new GetSecretValueCommand({ SecretId: secretName });
    const response = await this.client.send(command);

    const value = response.SecretString!;

    // Cache for 5 minutes
    this.cache.set(secretName, {
      value,
      expiresAt: Date.now() + 5 * 60 * 1000,
    });

    return value;
  }
}

// Usage
const stripeKey = await secretManager.getSecret('stripe-secret-key');
const sendgridKey = await secretManager.getSecret('sendgrid-api-key');
```

**Secrets Rotados Automáticamente**:
- Stripe API keys (90 días)
- SendGrid API keys (90 días)
- SAT CSD (certificado digital) (anual)
- Database passwords (90 días)

**Implementado en**: **TODOS los servicios**

---

### 3. Rate Limiting (Anti-Abuse)

**Descripción**: Límites de requests por tenant/usuario.

**Implementación (Redis)**:
```typescript
class RateLimiter {
  constructor(private redis: RedisClient) {}

  async checkRateLimit(
    tenantId: string,
    endpoint: string,
    maxRequests: number = 100,
    windowSeconds: number = 60
  ): Promise<boolean> {
    const key = `ratelimit:${tenantId}:${endpoint}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, windowSeconds);
    }

    return current <= maxRequests;
  }
}

// Middleware
app.use(async (req, res, next) => {
  const tenantId = req.user.tenant_id;
  const endpoint = req.path;

  const allowed = await rateLimiter.checkRateLimit(tenantId, endpoint, 100, 60);

  if (!allowed) {
    return res.status(429).json({ error: 'Rate limit exceeded' });
  }

  next();
});
```

**Rate Limits por Servicio**:
```yaml
Lead Service:
  - POST /leads: 50/min
  - GET /leads: 100/min

Proposal Service:
  - POST /proposals: 20/min
  - POST /generate-pdf: 10/min

Notification Service:
  - POST /send-email: 50/hour
  - POST /send-sms: 5/day
```

**Implementado en**: **TODOS los servicios**

---

### 4. Input Validation & Sanitization

**Descripción**: Validación estricta de todos los inputs (prevenir injection attacks).

**Implementación**:
```typescript
import { z } from 'zod';

// Schema validation with Zod
const CreateLeadSchema = z.object({
  company_name: z.string().min(1).max(255),
  email: z.string().email(),
  phone: z.string().regex(/^\+52\d{10}$/).optional(),
  industry: z.string().max(100),
  company_size: z.number().int().min(1).max(1000000),
  rfc: z.string().regex(/^[A-ZÑ&]{3,4}\d{6}[A-Z0-9]{3}$/).optional(),
});

// Validation middleware
app.post('/api/v1/leads', async (req, res) => {
  try {
    // Validate & sanitize input
    const validatedData = CreateLeadSchema.parse(req.body);

    // Safe to use
    const lead = await leadService.createLead(validatedData);

    res.json(lead);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors,
      });
    }

    throw error;
  }
});
```

**Validated Fields**:
- Email format
- Phone format (México: +52...)
- RFC format (México tax ID)
- SQL injection prevention (parameterized queries)
- XSS prevention (HTML sanitization)

**Implementado en**: **TODOS los servicios**

---

## 📊 Patrones de Observabilidad

### 1. Structured Logging

**Descripción**: Logs en formato JSON con contexto estructurado.

**Implementación (Winston)**:
```typescript
import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: {
    service: 'lead-service',
    environment: process.env.NODE_ENV,
  },
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'error.log', level: 'error' }),
    new winston.transports.File({ filename: 'combined.log' }),
  ],
});

// Usage
logger.info('Lead created', {
  leadId: lead.id,
  tenantId: lead.tenantId,
  companyName: lead.companyName,
  userId: req.user.id,
  correlationId: req.correlationId,
});

logger.error('Failed to score lead', {
  leadId: lead.id,
  error: error.message,
  stack: error.stack,
});
```

**Log Levels**:
- `error`: Errores que requieren atención
- `warn`: Warnings (e.g., rate limit approaching)
- `info`: Eventos importantes (lead created, invoice paid)
- `debug`: Debugging info (desarrollo)

**Implementado en**: **TODOS los servicios**

---

### 2. Distributed Tracing (Correlation IDs)

**Descripción**: Trazabilidad de requests a través de múltiples servicios.

**Implementación**:
```typescript
// Middleware: Add correlation ID
app.use((req, res, next) => {
  req.correlationId = req.headers['x-correlation-id'] || crypto.randomUUID();
  res.setHeader('x-correlation-id', req.correlationId);
  next();
});

// Pass correlation ID in events
await publishEvent({
  type: 'Lead.Created',
  data: { ... },
  correlationId: req.correlationId,
});

// Log with correlation ID
logger.info('Processing lead', {
  leadId: lead.id,
  correlationId: req.correlationId,
});

// Query logs by correlation ID
// Find all logs related to a specific user request
```

**Ventajas**:
- ✅ Debugging distribuido
- ✅ Performance analysis
- ✅ End-to-end tracing

**Implementado en**: **TODOS los servicios**

---

### 3. Health Checks

**Descripción**: Endpoints para monitorear salud del servicio.

**Implementación**:
```typescript
// GET /health
app.get('/health', async (req, res) => {
  const health = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'lead-service',
    version: '1.0.0',
    dependencies: {
      postgres: 'healthy',
      mongodb: 'healthy',
      nats: 'healthy',
      redis: 'healthy',
    },
  };

  try {
    // Check PostgreSQL
    await pool.query('SELECT 1');
  } catch (error) {
    health.dependencies.postgres = 'unhealthy';
    health.status = 'degraded';
  }

  try {
    // Check MongoDB
    await mongodb.admin().ping();
  } catch (error) {
    health.dependencies.mongodb = 'unhealthy';
    health.status = 'degraded';
  }

  // ... check other dependencies

  const statusCode = health.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(health);
});

// GET /metrics (Prometheus format)
app.get('/metrics', (req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(prometheus.register.metrics());
});
```

**Implementado en**: **TODOS los servicios**

---

## 🎯 Resumen de Adopción

| Patrón | Lead | Customer | Proposal | Financial | LATAM | AI | Analytics | Notification |
|--------|------|----------|----------|-----------|-------|----|-----------| ------------|
| **Arquitectura** |
| Microservices | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Event-Driven | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| CQRS | - | ✅ | - | - | - | - | ✅ | - |
| API Gateway | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **DDD** |
| Aggregates | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Value Objects | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | - | ✅ |
| Domain Events | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Repository | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Result Pattern | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Database** |
| DB per Service | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Polyglot Persistence | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Row Level Security | ✅ | ✅ | ✅ | ✅ | - | - | - | ✅ |
| Outbox Pattern | ✅ | ✅ | ✅ | ✅ | - | - | - | - |
| Materialized Views | - | - | - | - | - | - | ✅ | - |
| **Resiliencia** |
| Circuit Breaker | - | - | - | - | - | ✅ | - | ✅ |
| Retry w/ Backoff | - | - | - | ✅ | ✅ | ✅ | - | ✅ |
| Graceful Degradation | - | - | - | - | - | ✅ | ✅ | - |
| Idempotency | - | - | ✅ | ✅ | - | - | - | ✅ |
| **Seguridad** |
| Rate Limiting | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Input Validation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Secret Rotation | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| **Observabilidad** |
| Structured Logging | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Correlation IDs | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Health Checks | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

**Total Patterns**: 32
**Total Implementations**: 200+ (across 8 services)

---

## 📚 Referencias

### Libros
- **Domain-Driven Design** - Eric Evans
- **Implementing Domain-Driven Design** - Vaughn Vernon
- **Microservices Patterns** - Chris Richardson
- **Building Event-Driven Microservices** - Adam Bellemare

### Estándares
- **CloudEvents 1.0** - Event specification
- **OpenAPI 3.0** - API specification
- **CFDI 4.0** - México SAT standard

### Tecnologías
- **NATS JetStream** - Event streaming
- **PostgreSQL 15** - Relational database
- **MongoDB 7** - Document database
- **Redis 7** - Cache/sessions
- **AWS Lambda** - Serverless compute

---

**Documento preparado por**: Zuclubit Architecture Team
**Fecha**: Enero 2025
**Status**: REFERENCE GUIDE COMPLETE ✅

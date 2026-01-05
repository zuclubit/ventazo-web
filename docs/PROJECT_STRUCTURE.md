# Zuclubit Smart CRM - Estructura de Proyectos
**Arquitectura "Portability-Ready" - Monorepo con Microservicios**

**Última actualización**: Enero 2025
**Filosofía**: Domain-Driven Design + Event-Driven Architecture
**Stack**: TypeScript, Docker, Serverless Containers

---

## 📁 Estructura General del Monorepo

```
zuclubit-smart-crm/
├── README.md
├── package.json                      # Root workspace
├── turbo.json                        # Turborepo config (monorepo build)
├── tsconfig.json                     # Base TypeScript config
├── .env.example
├── docker-compose.yml                # Local development
│
├── docs/                             # 📚 Documentación
│   ├── ARCHITECTURE.md
│   ├── ARCHITECTURE_FINAL.md
│   ├── PRODUCT_ROADMAP.md
│   ├── EXECUTIVE_SUMMARY.md
│   └── API_REFERENCE.md
│
├── services/                         # 🔧 Microservicios (Bounded Contexts)
│   ├── lead-service/
│   ├── proposal-service/
│   ├── customer-service/
│   ├── financial-service/
│   ├── analytics-service/
│   ├── notification-service/
│   ├── latam-compliance-service/     # ✨ NUEVO
│   └── ai-automation-service/        # ✨ NUEVO
│
├── packages/                         # 📦 Shared Libraries
│   ├── shared-types/                 # TypeScript types compartidos
│   ├── database/                     # DB clients (PostgreSQL, MongoDB)
│   ├── events/                       # NATS event bus client
│   ├── cache/                        # Upstash Redis client
│   ├── storage/                      # S3 abstraction layer
│   ├── auth/                         # Supabase Auth client
│   └── logger/                       # Structured logging
│
├── infrastructure/                   # 🏗️ Infrastructure as Code
│   ├── cdk/                          # AWS CDK (Phase 1)
│   ├── pulumi/                       # Pulumi (Phase 2 migration)
│   ├── docker/                       # Dockerfiles compartidos
│   └── k8s/                          # Kubernetes manifests (Phase 3)
│
├── apps/                             # 🖥️ Frontend Applications
│   ├── web/                          # Next.js web app
│   ├── mobile/                       # React Native (futuro)
│   └── admin/                        # Admin dashboard
│
└── tests/                            # 🧪 Testing
    ├── e2e/                          # Playwright E2E tests
    ├── integration/                  # Integration tests
    └── load/                         # k6 load tests
```

---

## 🔧 Microservicios (Services)

### Estructura Base de Cada Servicio

```
services/lead-service/
├── Dockerfile                        # Multi-stage Docker build
├── package.json
├── tsconfig.json
├── .env.example
│
├── src/
│   ├── index.ts                      # Lambda handler / HTTP server
│   ├── app.ts                        # Express app setup
│   │
│   ├── domain/                       # 🎯 Domain Layer (Business Logic)
│   │   ├── entities/
│   │   │   ├── Lead.ts               # Domain entity
│   │   │   ├── Contact.ts
│   │   │   └── LeadSource.ts
│   │   │
│   │   ├── value-objects/
│   │   │   ├── Email.ts
│   │   │   ├── PhoneNumber.ts
│   │   │   └── Score.ts
│   │   │
│   │   ├── repositories/             # Interfaces (ports)
│   │   │   └── ILeadRepository.ts
│   │   │
│   │   ├── services/                 # Domain services
│   │   │   ├── LeadScoringService.ts
│   │   │   └── LeadQualificationService.ts
│   │   │
│   │   └── events/                   # Domain events
│   │       ├── LeadCreatedEvent.ts
│   │       ├── LeadQualifiedEvent.ts
│   │       └── LeadConvertedEvent.ts
│   │
│   ├── application/                  # 🎬 Application Layer (Use Cases)
│   │   ├── commands/
│   │   │   ├── CreateLeadCommand.ts
│   │   │   ├── UpdateLeadCommand.ts
│   │   │   └── QualifyLeadCommand.ts
│   │   │
│   │   ├── queries/
│   │   │   ├── GetLeadByIdQuery.ts
│   │   │   ├── ListLeadsQuery.ts
│   │   │   └── SearchLeadsQuery.ts
│   │   │
│   │   ├── handlers/                 # Command/Query handlers
│   │   │   ├── CreateLeadHandler.ts
│   │   │   ├── UpdateLeadHandler.ts
│   │   │   └── GetLeadByIdHandler.ts
│   │   │
│   │   └── dto/                      # Data Transfer Objects
│   │       ├── CreateLeadDTO.ts
│   │       └── LeadResponseDTO.ts
│   │
│   ├── infrastructure/               # 🔌 Infrastructure Layer
│   │   ├── repositories/             # Repository implementations
│   │   │   ├── PostgresLeadRepository.ts
│   │   │   └── MongoActivityRepository.ts
│   │   │
│   │   ├── http/                     # HTTP layer
│   │   │   ├── routes/
│   │   │   │   └── lead.routes.ts
│   │   │   ├── controllers/
│   │   │   │   └── LeadController.ts
│   │   │   ├── middleware/
│   │   │   │   ├── auth.middleware.ts
│   │   │   │   ├── validation.middleware.ts
│   │   │   │   └── tenant.middleware.ts
│   │   │   └── validators/
│   │   │       └── lead.validators.ts
│   │   │
│   │   ├── events/                   # Event handlers
│   │   │   ├── publishers/
│   │   │   │   └── LeadEventPublisher.ts
│   │   │   └── consumers/
│   │   │       └── LeadScoredConsumer.ts
│   │   │
│   │   ├── database/                 # DB config
│   │   │   ├── postgres.client.ts
│   │   │   ├── mongodb.client.ts
│   │   │   └── migrations/
│   │   │       └── 001_create_leads_table.sql
│   │   │
│   │   └── config/                   # Configuration
│   │       └── config.ts
│   │
│   └── tests/                        # 🧪 Tests
│       ├── unit/
│       │   ├── domain/
│       │   └── application/
│       └── integration/
│           └── repositories/
│
└── scripts/
    ├── migrate.ts                    # Run DB migrations
    └── seed.ts                       # Seed test data
```

---

## 🎯 Servicios Detallados

### 1️⃣ Lead Service

```yaml
Bounded Context: Lead Management
Responsabilidades:
  - Gestión de leads (CRUD)
  - Lead scoring
  - Lead qualification
  - Lead source tracking
  - Activity logging

Bases de Datos:
  PostgreSQL:
    - leads
    - contacts
    - lead_sources
  MongoDB:
    - activity_logs

Eventos Publicados:
  - Lead.Created
  - Lead.Updated
  - Lead.Qualified
  - Lead.Converted
  - Lead.ScoreChanged

Eventos Consumidos:
  - AI.LeadScored (desde AI Automation Service)
  - Proposal.Accepted (desde Proposal Service)

API Endpoints:
  POST   /api/leads
  GET    /api/leads
  GET    /api/leads/:id
  PUT    /api/leads/:id
  DELETE /api/leads/:id
  POST   /api/leads/:id/qualify
  GET    /api/leads/:id/activities
```

**Dockerfile**: `services/lead-service/Dockerfile`

```dockerfile
# Multi-stage build para optimización
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package*.json ./
COPY turbo.json ./
COPY packages/ ./packages/
COPY services/lead-service/ ./services/lead-service/

# Install dependencies
RUN npm ci --workspace=lead-service

# Build
RUN npm run build --workspace=lead-service

# Production image
FROM node:20-alpine

WORKDIR /app

# Copy built artifacts
COPY --from=builder /app/services/lead-service/dist ./dist
COPY --from=builder /app/services/lead-service/node_modules ./node_modules
COPY --from=builder /app/services/lead-service/package.json ./

# Lambda Runtime Interface Emulator (local testing)
ADD https://github.com/aws/aws-lambda-runtime-interface-emulator/releases/latest/download/aws-lambda-rie /usr/bin/aws-lambda-rie
RUN chmod 755 /usr/bin/aws-lambda-rie

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:8080/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

---

### 2️⃣ Proposal Service

```yaml
Bounded Context: Proposal & CPQ Management
Responsabilidades:
  - Proposal creation (CPQ)
  - Version control
  - Approval workflows
  - PDF generation
  - Proposal tracking (views, accepts)

Bases de Datos:
  PostgreSQL:
    - proposals
    - proposal_line_items
    - proposal_versions
  S3:
    - Proposal PDFs

Eventos Publicados:
  - Proposal.Created
  - Proposal.Sent
  - Proposal.Viewed
  - Proposal.Accepted
  - Proposal.Rejected

Eventos Consumidos:
  - Lead.Qualified (desde Lead Service)

API Endpoints:
  POST   /api/proposals
  GET    /api/proposals
  GET    /api/proposals/:id
  PUT    /api/proposals/:id
  POST   /api/proposals/:id/send
  POST   /api/proposals/:id/accept
  POST   /api/proposals/:id/versions
  GET    /api/proposals/:id/pdf
```

**Características Especiales**:
- Glass-morphism templates
- Real-time PDF generation
- Version diffing
- E-signature integration

---

### 3️⃣ Customer Service

```yaml
Bounded Context: Customer & Account Management
Responsabilidades:
  - Customer lifecycle
  - Account management
  - Contract management
  - Customer health scoring
  - Churn prediction

Bases de Datos:
  PostgreSQL:
    - customers
    - accounts
    - contracts
  MongoDB:
    - customer_interactions

Eventos Publicados:
  - Customer.Created
  - Customer.Updated
  - Contract.Signed
  - Customer.ChurnRisk

Eventos Consumidos:
  - Lead.Converted (desde Lead Service)
  - Proposal.Accepted (desde Proposal Service)
  - AI.ChurnPredicted (desde AI Service)

API Endpoints:
  POST   /api/customers
  GET    /api/customers
  GET    /api/customers/:id
  PUT    /api/customers/:id
  GET    /api/customers/:id/health
  POST   /api/contracts
  GET    /api/contracts/:id
```

---

### 4️⃣ Financial Service

```yaml
Bounded Context: Financial & Payment Management
Responsabilidades:
  - Invoice generation
  - Payment processing
  - Revenue tracking
  - Expense management
  - Financial reporting

Bases de Datos:
  PostgreSQL:
    - invoices
    - payments
    - expenses
    - revenue_recognition

Eventos Publicados:
  - Invoice.Generated
  - Payment.Received
  - Payment.Failed
  - Expense.Recorded

Eventos Consumidos:
  - Proposal.Accepted
  - CFDI.Stamped (desde LATAM Compliance)
  - Contract.Signed

API Endpoints:
  POST   /api/invoices
  GET    /api/invoices
  GET    /api/invoices/:id
  POST   /api/payments
  GET    /api/payments/:id
  POST   /api/expenses
  GET    /api/financial/reports
```

---

### 5️⃣ Analytics Service

```yaml
Bounded Context: Analytics & Reporting
Responsabilidades:
  - Real-time dashboards
  - KPI calculation
  - Sales forecasting
  - Funnel analysis
  - Custom reports

Bases de Datos:
  MongoDB:
    - real_time_metrics
    - aggregated_analytics
  PostgreSQL (Read-only):
    - All tables (via read replica)

Eventos Consumidos:
  - ALL domain events (para analytics)

API Endpoints:
  GET    /api/analytics/dashboard
  GET    /api/analytics/funnel
  GET    /api/analytics/forecast
  POST   /api/analytics/reports
  GET    /api/analytics/kpis
```

**Características Especiales**:
- Real-time aggregation (MongoDB)
- Time-series analysis
- Predictive analytics (ML models)

---

### 6️⃣ Notification Service

```yaml
Bounded Context: Notification & Communication
Responsabilidades:
  - Email notifications
  - SMS notifications
  - Push notifications
  - In-app notifications
  - Notification preferences

Bases de Datos:
  MongoDB:
    - notification_queue
    - notification_history
  PostgreSQL:
    - notification_preferences

Eventos Consumidos:
  - ALL domain events (para notificaciones)

Integraciones:
  - SendGrid (email)
  - Twilio (SMS)
  - Firebase Cloud Messaging (push)
  - WhatsApp (via LATAM Compliance Service)

API Endpoints:
  GET    /api/notifications
  PUT    /api/notifications/:id/read
  GET    /api/notifications/preferences
  PUT    /api/notifications/preferences
```

---

### 7️⃣ LATAM Compliance Service ✨ NUEVO

```yaml
Bounded Context: LATAM Compliance & Localization
Responsabilidades:
  - CFDI 4.0 generation & stamping (México)
  - WhatsApp Business API integration
  - MSI payment plans (meses sin intereses)
  - Multi-currency (MXN focus)
  - PAC provider integration

Bases de Datos:
  PostgreSQL:
    - cfdi_invoices
    - msi_payment_plans
    - msi_installments
    - whatsapp_conversations

  MongoDB:
    - whatsapp_messages (time-series)

  S3:
    - CFDI XML/PDF (5 year retention)

Eventos Publicados:
  - CFDI.Generated
  - CFDI.Stamped
  - CFDI.Cancelled
  - CFDI.ValidationFailed
  - WhatsApp.MessageSent
  - WhatsApp.MessageReceived
  - WhatsApp.ConversationStarted
  - MSI.PaymentScheduled
  - MSI.InstallmentPaid

Eventos Consumidos:
  - Invoice.Generated (desde Financial Service)
  - Proposal.Accepted (para auto-generar CFDI)

Integraciones Externas:
  - Finkok (PAC provider)
  - SW Sapien (PAC provider)
  - Twilio WhatsApp API
  - 360dialog WhatsApp API
  - SAT Web Services (validación)

API Endpoints:
  # CFDI Management
  POST   /api/cfdi/invoices
  GET    /api/cfdi/invoices
  GET    /api/cfdi/invoices/:id
  POST   /api/cfdi/invoices/:id/stamp
  POST   /api/cfdi/invoices/:id/cancel
  GET    /api/cfdi/invoices/:id/xml
  GET    /api/cfdi/invoices/:id/pdf
  POST   /api/cfdi/sat/validate

  # WhatsApp Business
  POST   /api/whatsapp/messages
  GET    /api/whatsapp/conversations
  GET    /api/whatsapp/conversations/:id
  GET    /api/whatsapp/conversations/:id/messages
  POST   /api/whatsapp/webhook
  PUT    /api/whatsapp/conversations/:id/assign

  # MSI Payment Plans
  POST   /api/msi/plans
  GET    /api/msi/plans/:id
  GET    /api/msi/plans/:id/schedule
  POST   /api/msi/installments/:id/pay
```

**Estructura Específica**:

```
services/latam-compliance-service/
├── src/
│   ├── domain/
│   │   ├── cfdi/
│   │   │   ├── CFDIInvoice.ts
│   │   │   ├── CFDIValidator.ts
│   │   │   └── PACProvider.ts
│   │   │
│   │   ├── whatsapp/
│   │   │   ├── WhatsAppConversation.ts
│   │   │   ├── WhatsAppMessage.ts
│   │   │   └── WhatsAppTemplate.ts
│   │   │
│   │   └── msi/
│   │       ├── PaymentPlan.ts
│   │       ├── Installment.ts
│   │       └── MSICalculator.ts
│   │
│   ├── application/
│   │   ├── cfdi/
│   │   │   ├── GenerateCFDICommand.ts
│   │   │   ├── StampCFDICommand.ts
│   │   │   └── CancelCFDICommand.ts
│   │   │
│   │   ├── whatsapp/
│   │   │   ├── SendWhatsAppMessageCommand.ts
│   │   │   └── HandleWhatsAppWebhookCommand.ts
│   │   │
│   │   └── msi/
│   │       ├── CreatePaymentPlanCommand.ts
│   │       └── ProcessInstallmentCommand.ts
│   │
│   └── infrastructure/
│       ├── pac/
│       │   ├── FinkokClient.ts
│       │   ├── SWSapienClient.ts
│       │   └── PACClientFactory.ts
│       │
│       ├── whatsapp/
│       │   ├── TwilioWhatsAppClient.ts
│       │   └── Dialog360Client.ts
│       │
│       └── sat/
│           ├── SATWebServiceClient.ts
│           └── CFDIXMLGenerator.ts
```

**Dockerfile Especial** (CFDI XML generation):

```dockerfile
FROM node:20-alpine AS builder
# ... build steps ...

FROM node:20-alpine
# ... production setup ...

# Install dependencies for XML/PDF generation
RUN apk add --no-cache \
    libxslt \
    libxml2 \
    python3 \
    py3-lxml

# CFDI XSD schemas (SAT validation)
COPY --from=builder /app/services/latam-compliance-service/schemas /app/schemas

CMD ["node", "dist/index.js"]
```

---

### 8️⃣ AI Automation Service ✨ NUEVO

```yaml
Bounded Context: AI & Machine Learning Automation
Responsabilidades:
  - Email entity extraction
  - Voice-to-CRM transcription
  - Lead scoring (ML models)
  - Meeting intelligence
  - Business card OCR
  - Churn prediction

Bases de Datos:
  MongoDB:
    - ai_processing_queue
    - ai_results_cache

  Redis:
    - AI result cache (TTL 1 hora)

  PostgreSQL:
    - ml_model_metadata
    - training_data_refs

Eventos Publicados:
  - AI.EmailExtracted
  - AI.VoiceTranscribed
  - AI.LeadScored
  - AI.MeetingAnalyzed
  - AI.BusinessCardOCR
  - AI.ChurnPredicted

Eventos Consumidos:
  - Lead.Created (para auto-scoring)
  - Customer.Created (para churn baseline)

Integraciones AWS:
  - SageMaker (ML model hosting)
  - Comprehend (Spanish NLP)
  - Transcribe (es-MX voice-to-text)
  - Textract (OCR)
  - Rekognition (image analysis)

API Endpoints:
  # Email Processing
  POST   /api/ai/extract/email
  POST   /api/ai/extract/email/batch

  # Voice Processing
  POST   /api/ai/voice/transcribe
  GET    /api/ai/voice/jobs/:id

  # Lead Scoring
  POST   /api/ai/score/lead/:id
  GET    /api/ai/score/:id
  GET    /api/ai/score/:id/explanation

  # Meeting Intelligence
  POST   /api/ai/meeting/analyze
  GET    /api/ai/meeting/:id/summary

  # OCR
  POST   /api/ai/ocr/business-card
  POST   /api/ai/ocr/document

  # Churn Prediction
  GET    /api/ai/churn/customers
  GET    /api/ai/churn/customer/:id
```

**Estructura Específica**:

```
services/ai-automation-service/
├── src/
│   ├── domain/
│   │   ├── nlp/
│   │   │   ├── EntityExtractor.ts
│   │   │   ├── TextAnalyzer.ts
│   │   │   └── LanguageDetector.ts
│   │   │
│   │   ├── ml/
│   │   │   ├── LeadScoringModel.ts
│   │   │   ├── ChurnPredictionModel.ts
│   │   │   └── ModelRegistry.ts
│   │   │
│   │   └── ocr/
│   │       ├── BusinessCardParser.ts
│   │       └── DocumentParser.ts
│   │
│   ├── application/
│   │   ├── nlp/
│   │   │   ├── ExtractEmailEntitiesCommand.ts
│   │   │   └── AnalyzeMeetingCommand.ts
│   │   │
│   │   ├── ml/
│   │   │   ├── ScoreLeadCommand.ts
│   │   │   ├── PredictChurnCommand.ts
│   │   │   └── TrainModelCommand.ts
│   │   │
│   │   └── voice/
│   │       └── TranscribeAudioCommand.ts
│   │
│   └── infrastructure/
│       ├── aws/
│       │   ├── ComprehendClient.ts
│       │   ├── TranscribeClient.ts
│       │   ├── TextractClient.ts
│       │   ├── RekognitionClient.ts
│       │   └── SageMakerClient.ts
│       │
│       ├── ml/
│       │   ├── ModelDeployer.ts
│       │   ├── FeatureStore.ts
│       │   └── ExperimentTracker.ts
│       │
│       └── queue/
│           └── AIJobProcessor.ts
```

**Dockerfile con ML dependencies**:

```dockerfile
FROM node:20-alpine AS builder
# ... build steps ...

FROM node:20-alpine

# Install Python for ML libraries
RUN apk add --no-cache \
    python3 \
    py3-pip \
    py3-numpy \
    py3-pandas

# Install ML dependencies
RUN pip3 install --no-cache-dir \
    boto3 \
    sagemaker \
    scikit-learn

# Copy built artifacts
COPY --from=builder /app/services/ai-automation-service/dist ./dist
COPY --from=builder /app/services/ai-automation-service/node_modules ./node_modules

# ML models (pre-trained)
COPY --from=builder /app/services/ai-automation-service/models /app/models

CMD ["node", "dist/index.js"]
```

---

## 📦 Shared Packages

### 1. `packages/shared-types/`

```typescript
// packages/shared-types/src/index.ts

// Domain Events (CloudEvents standard)
export interface DomainEvent<T = any> {
  specversion: '1.0';
  type: string;
  source: string;
  id: string;
  time: string;
  datacontenttype: 'application/json';
  data: T;
  tenantId: string;
  userId?: string;
  correlationId?: string;
}

// Common types
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Error types
export class DomainError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 400
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export class NotFoundError extends DomainError {
  constructor(resource: string, id: string) {
    super(`${resource} with id ${id} not found`, 'NOT_FOUND', 404);
  }
}

export class ValidationError extends DomainError {
  constructor(message: string) {
    super(message, 'VALIDATION_ERROR', 400);
  }
}
```

---

### 2. `packages/database/`

```typescript
// packages/database/src/postgres.ts
import { Pool, PoolConfig } from 'pg';

let pool: Pool;

export async function getPostgresPool(config?: PoolConfig): Promise<Pool> {
  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      ssl: process.env.NODE_ENV === 'production'
        ? { rejectUnauthorized: false }
        : undefined,
      ...config,
    });
  }

  return pool;
}

// Set tenant context for Row Level Security
export async function setTenantContext(
  pool: Pool,
  tenantId: string
): Promise<void> {
  await pool.query('SET app.tenant_id = $1', [tenantId]);
}

// packages/database/src/mongodb.ts
import { MongoClient, Db } from 'mongodb';

let client: MongoClient;
let db: Db;

export async function getMongoClient(): Promise<MongoClient> {
  if (!client) {
    client = new MongoClient(process.env.MONGODB_URL!);
    await client.connect();
  }
  return client;
}

export async function getMongoDatabase(): Promise<Db> {
  if (!db) {
    const client = await getMongoClient();
    db = client.db('zuclubit_crm');
    await setupIndexes();
  }
  return db;
}

async function setupIndexes() {
  // Activity logs
  await db.collection('activity_logs').createIndexes([
    { key: { tenant_id: 1, lead_id: 1, timestamp: -1 } },
    { key: { expires_at: 1 }, expireAfterSeconds: 0 },
  ]);

  // WhatsApp messages
  await db.collection('whatsapp_messages').createIndexes([
    { key: { tenant_id: 1, conversation_id: 1, timestamp: -1 } },
    { key: { expires_at: 1 }, expireAfterSeconds: 0 },
  ]);

  // AI processing queue
  await db.collection('ai_processing_queue').createIndexes([
    { key: { tenant_id: 1, status: 1, created_at: -1 } },
    { key: { expires_at: 1 }, expireAfterSeconds: 0 },
  ]);
}
```

---

### 3. `packages/events/`

```typescript
// packages/events/src/nats-client.ts
import { connect, NatsConnection, JetStreamClient, JSONCodec } from 'nats';
import { DomainEvent } from '@zuclubit/shared-types';

let nc: NatsConnection;
let js: JetStreamClient;
const jc = JSONCodec();

export async function connectNATS(): Promise<void> {
  nc = await connect({
    servers: process.env.NATS_URL || 'nats://localhost:4222',
    name: 'zuclubit-crm',
  });

  js = nc.jetstream();
  await setupStreams();
}

async function setupStreams() {
  const jsm = await nc.jetstreamManager();

  const streams = [
    {
      name: 'LEAD_EVENTS',
      subjects: ['lead.*'],
      retention: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days
    },
    {
      name: 'PROPOSAL_EVENTS',
      subjects: ['proposal.*'],
      retention: 30 * 24 * 60 * 60 * 1_000_000_000, // 30 days
    },
    {
      name: 'CFDI_EVENTS',
      subjects: ['cfdi.*'],
      retention: 5 * 365 * 24 * 60 * 60 * 1_000_000_000, // 5 years (SAT)
    },
    {
      name: 'WHATSAPP_EVENTS',
      subjects: ['whatsapp.*'],
      retention: 90 * 24 * 60 * 60 * 1_000_000_000, // 90 days
    },
    {
      name: 'AI_EVENTS',
      subjects: ['ai.*'],
      retention: 7 * 24 * 60 * 60 * 1_000_000_000, // 7 days
    },
  ];

  for (const stream of streams) {
    await jsm.streams.add({
      name: stream.name,
      subjects: stream.subjects,
      retention: 'limits',
      max_age: stream.retention,
      storage: 'file',
    });
  }
}

export async function publishEvent<T>(event: DomainEvent<T>): Promise<void> {
  const subject = event.type.toLowerCase().replace(/\./g, '_');
  await js.publish(subject, jc.encode(event));
  console.log(`📤 Event published: ${event.type}`, { id: event.id, subject });
}

export async function subscribeToEvents(
  subject: string,
  consumerName: string,
  handler: (event: DomainEvent) => Promise<void>
): Promise<void> {
  const streamName = subject.split('_')[0].toUpperCase() + '_EVENTS';
  const consumer = await js.consumers.get(streamName, consumerName);
  const messages = await consumer.consume();

  for await (const msg of messages) {
    try {
      const event = jc.decode(msg.data) as DomainEvent;
      await handler(event);
      msg.ack();
    } catch (error) {
      console.error('❌ Event processing error:', error);
      msg.nak(5000); // Retry after 5 seconds
    }
  }
}
```

---

### 4. `packages/cache/`

```typescript
// packages/cache/src/redis.ts
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

export async function get<T>(key: string): Promise<T | null> {
  const data = await redis.get(key);
  return data ? (JSON.parse(data as string) as T) : null;
}

export async function set(
  key: string,
  value: any,
  ttlSeconds: number = 3600
): Promise<void> {
  await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
}

export async function del(key: string): Promise<void> {
  await redis.del(key);
}

export async function cacheQuery<T>(
  key: string,
  ttlSeconds: number,
  fetchFn: () => Promise<T>
): Promise<T> {
  const cached = await get<T>(key);
  if (cached) return cached;

  const data = await fetchFn();
  await set(key, data, ttlSeconds);
  return data;
}

// Rate limiting
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<boolean> {
  const current = await redis.incr(key);

  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }

  return current <= maxRequests;
}

// Session management
export async function createSession(
  userId: string,
  tenantId: string,
  data: any
): Promise<string> {
  const sessionId = crypto.randomUUID();
  const sessionData = {
    user_id: userId,
    tenant_id: tenantId,
    ...data,
    created_at: Date.now(),
  };

  await set(`session:${sessionId}`, sessionData, 24 * 60 * 60); // 24 hours
  return sessionId;
}

export async function getSession(sessionId: string): Promise<any | null> {
  return await get(`session:${sessionId}`);
}

export async function deleteSession(sessionId: string): Promise<void> {
  await del(`session:${sessionId}`);
}

export default redis;
```

---

### 5. `packages/storage/`

```typescript
// packages/storage/src/client.ts
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

class StorageClient {
  private s3: S3Client;
  private bucket: string;

  constructor() {
    // Works with: AWS S3, Cloudflare R2, MinIO, Google Cloud Storage
    this.s3 = new S3Client({
      endpoint: process.env.S3_ENDPOINT,
      region: process.env.S3_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
    });

    this.bucket = process.env.S3_BUCKET!;
  }

  async uploadFile(
    key: string,
    body: Buffer,
    contentType: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    await this.s3.send(new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      Metadata: metadata,
    }));

    return `s3://${this.bucket}/${key}`;
  }

  async getFile(key: string): Promise<Buffer> {
    const response = await this.s3.send(new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));

    return Buffer.from(await response.Body!.transformToByteArray());
  }

  async getSignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    return getSignedUrl(
      this.s3,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
      { expiresIn }
    );
  }

  async deleteFile(key: string): Promise<void> {
    await this.s3.send(new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    }));
  }

  // Helper: Generate tenant-scoped key
  generateKey(tenantId: string, folder: string, filename: string): string {
    return `${tenantId}/${folder}/${filename}`;
  }
}

export const storage = new StorageClient();
```

---

### 6. `packages/auth/`

```typescript
// packages/auth/src/supabase-client.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

export async function signUp(
  email: string,
  password: string,
  tenantId: string,
  metadata: Record<string, any> = {}
): Promise<any> {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        tenant_id: tenantId,
        ...metadata,
      },
    },
  });

  if (error) throw error;
  return data.user;
}

export async function signIn(email: string, password: string): Promise<any> {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
  return data.session;
}

export async function getCurrentUser(accessToken: string): Promise<any> {
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error) throw error;
  return data.user;
}

export async function verifyToken(token: string): Promise<any> {
  const { data, error } = await supabase.auth.getUser(token);
  if (error) throw error;
  return data.user;
}

export async function refreshSession(refreshToken: string): Promise<any> {
  const { data, error } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  if (error) throw error;
  return data.session;
}

export default supabase;
```

---

### 7. `packages/logger/`

```typescript
// packages/logger/src/index.ts
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  environment: string;
  requestId?: string;
  userId?: string;
  tenantId?: string;
  message: string;
  data?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

class Logger {
  private service: string;

  constructor(serviceName: string) {
    this.service = serviceName;
  }

  private log(entry: Omit<LogEntry, 'timestamp' | 'environment' | 'service'>) {
    const logEntry: LogEntry = {
      ...entry,
      service: this.service,
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
    };

    console.log(JSON.stringify(logEntry));
  }

  info(message: string, data?: Record<string, unknown>, context?: any) {
    this.log({
      level: 'info',
      message,
      data,
      ...context,
    });
  }

  error(message: string, error: Error, data?: Record<string, unknown>, context?: any) {
    this.log({
      level: 'error',
      message,
      data,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      ...context,
    });
  }

  warn(message: string, data?: Record<string, unknown>, context?: any) {
    this.log({
      level: 'warn',
      message,
      data,
      ...context,
    });
  }

  debug(message: string, data?: Record<string, unknown>, context?: any) {
    if (process.env.NODE_ENV === 'development') {
      this.log({
        level: 'debug',
        message,
        data,
        ...context,
      });
    }
  }
}

export function createLogger(serviceName: string): Logger {
  return new Logger(serviceName);
}
```

---

## 🏗️ Infrastructure as Code

### AWS CDK (Phase 1)

```
infrastructure/cdk/
├── bin/
│   └── app.ts                        # CDK App entry point
│
├── lib/
│   ├── stacks/
│   │   ├── network-stack.ts          # VPC, subnets, security groups
│   │   ├── database-stack.ts         # RDS PostgreSQL
│   │   ├── services-stack.ts         # Lambda services
│   │   ├── api-stack.ts              # API Gateway
│   │   └── storage-stack.ts          # S3 buckets
│   │
│   └── constructs/
│       ├── service-construct.ts      # Reusable service pattern
│       └── database-construct.ts     # Database pattern
│
├── cdk.json
└── package.json
```

**Ejemplo**: `infrastructure/cdk/lib/constructs/service-construct.ts`

```typescript
import * as cdk from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';

export interface ServiceConstructProps {
  serviceName: string;
  dockerfilePath: string;
  environment: Record<string, string>;
  vpc: ec2.IVpc;
}

export class ServiceConstruct extends Construct {
  public readonly function: lambda.DockerImageFunction;
  public readonly api: apigateway.RestApi;

  constructor(scope: Construct, id: string, props: ServiceConstructProps) {
    super(scope, id);

    // Containerized Lambda
    this.function = new lambda.DockerImageFunction(this, 'Function', {
      code: lambda.DockerImageCode.fromImageAsset(props.dockerfilePath),
      memorySize: 1024,
      timeout: cdk.Duration.seconds(30),
      environment: props.environment,
      vpc: props.vpc,
      architecture: lambda.Architecture.ARM_64, // Graviton2 for cost savings
    });

    // API Gateway
    this.api = new apigateway.RestApi(this, 'API', {
      restApiName: `${props.serviceName} API`,
      deployOptions: {
        loggingLevel: apigateway.MethodLoggingLevel.INFO,
        metricsEnabled: true,
      },
    });

    // Lambda integration
    const integration = new apigateway.LambdaIntegration(this.function);
    this.api.root.addProxy({
      defaultIntegration: integration,
    });
  }
}
```

---

## 🖥️ Frontend Applications

### Web App (Next.js)

```
apps/web/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── signup/
│   │   │
│   │   ├── (dashboard)/
│   │   │   ├── leads/
│   │   │   ├── proposals/
│   │   │   ├── customers/
│   │   │   ├── cfdi/                 # ✨ NUEVO
│   │   │   ├── whatsapp/             # ✨ NUEVO
│   │   │   └── analytics/
│   │   │
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── ui/                       # shadcn/ui components
│   │   ├── leads/
│   │   ├── proposals/
│   │   ├── cfdi/                     # ✨ NUEVO
│   │   └── whatsapp/                 # ✨ NUEVO
│   │
│   ├── lib/
│   │   ├── api/                      # API client
│   │   ├── hooks/                    # React hooks
│   │   └── utils/
│   │
│   └── styles/
│       └── globals.css
│
├── public/
├── next.config.js
└── package.json
```

---

## 🧪 Testing

### End-to-End Tests (Playwright)

```
tests/e2e/
├── fixtures/
│   └── test-data.ts
│
├── tests/
│   ├── auth.spec.ts
│   ├── leads.spec.ts
│   ├── proposals.spec.ts
│   ├── cfdi.spec.ts                  # ✨ NUEVO
│   └── whatsapp.spec.ts              # ✨ NUEVO
│
├── playwright.config.ts
└── package.json
```

### Integration Tests

```
tests/integration/
├── services/
│   ├── lead-service.test.ts
│   ├── latam-compliance-service.test.ts
│   └── ai-automation-service.test.ts
│
└── package.json
```

---

## 🚀 Deployment Workflow

### Local Development

```bash
# 1. Start infrastructure (Docker Compose)
docker-compose up -d

# 2. Run migrations
npm run migrate

# 3. Start services (Turborepo)
npm run dev

# Services available:
# - Lead Service: http://localhost:3001
# - Proposal Service: http://localhost:3002
# - LATAM Compliance: http://localhost:3007
# - AI Automation: http://localhost:3008
# - Web App: http://localhost:3000
```

### Docker Compose (`docker-compose.yml`)

```yaml
version: '3.8'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: zuclubit_crm
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # MongoDB
  mongodb:
    image: mongodb/mongodb-community-server:latest
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  # NATS JetStream
  nats:
    image: nats:latest
    command: ["-js", "-m", "8222"]
    ports:
      - "4222:4222"
      - "8222:8222"

  # Redis (local alternative to Upstash)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # Supabase (self-hosted)
  supabase-db:
    image: supabase/postgres:15.1.0.55
    environment:
      POSTGRES_PASSWORD: supabase
    ports:
      - "5433:5432"

  supabase-auth:
    image: supabase/gotrue:latest
    environment:
      GOTRUE_DB_DRIVER: postgres
      GOTRUE_DB_DATABASE_URL: postgresql://postgres:supabase@supabase-db:5432/postgres
      GOTRUE_SITE_URL: http://localhost:3000
      GOTRUE_JWT_SECRET: your-super-secret-jwt-token
    ports:
      - "9999:9999"
    depends_on:
      - supabase-db

volumes:
  postgres_data:
  mongodb_data:
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/deploy.yml
name: Deploy Services

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm run test

      - name: Build services
        run: npm run build

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy with CDK
        run: |
          cd infrastructure/cdk
          npm run cdk deploy --all --require-approval never
```

---

## 📊 Monorepo Scripts

### Root `package.json`

```json
{
  "name": "zuclubit-smart-crm",
  "version": "1.0.0",
  "private": true,
  "workspaces": [
    "services/*",
    "packages/*",
    "apps/*",
    "infrastructure/*"
  ],
  "scripts": {
    "dev": "turbo run dev",
    "build": "turbo run build",
    "test": "turbo run test",
    "lint": "turbo run lint",
    "migrate": "turbo run migrate",
    "docker:build": "turbo run docker:build",
    "deploy": "turbo run deploy"
  },
  "devDependencies": {
    "turbo": "^1.10.0",
    "typescript": "^5.2.0"
  }
}
```

### Turbo Config (`turbo.json`)

```json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": ["dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": []
    },
    "lint": {
      "outputs": []
    },
    "dev": {
      "cache": false,
      "persistent": true
    },
    "migrate": {
      "cache": false
    },
    "docker:build": {
      "dependsOn": ["build"],
      "outputs": []
    }
  }
}
```

---

## ✅ Checklist de Implementación

### Phase 1 (Semanas 1-4)

```yaml
✅ Setup Monorepo:
  - Turborepo + workspaces
  - Shared packages
  - Docker Compose

✅ Core Services:
  - Lead Service
  - Proposal Service
  - Customer Service

✅ Infrastructure:
  - PostgreSQL (RDS)
  - MongoDB Atlas
  - NATS JetStream
  - Supabase Auth
  - Upstash Redis

✅ Shared Packages:
  - shared-types
  - database
  - events
  - cache
  - storage
  - auth
  - logger
```

### Phase 2 (Semanas 5-8)

```yaml
✅ LATAM Compliance Service:
  - CFDI generation
  - PAC integration
  - WhatsApp Business API
  - MSI payment plans

✅ AI Automation Service:
  - Email extraction
  - Voice transcription
  - Lead scoring

✅ Frontend:
  - Next.js web app
  - Dashboard
  - CFDI interface
  - WhatsApp chat
```

### Phase 3 (Semanas 9-12)

```yaml
✅ Additional Services:
  - Financial Service
  - Analytics Service
  - Notification Service

✅ Testing:
  - E2E tests (Playwright)
  - Integration tests
  - Load tests

✅ Deployment:
  - CDK infrastructure
  - CI/CD pipeline
  - Monitoring
```

---

**Documento creado**: Enero 2025
**Arquitectura**: Portability-Ready Monorepo
**Status**: READY FOR IMPLEMENTATION ✅

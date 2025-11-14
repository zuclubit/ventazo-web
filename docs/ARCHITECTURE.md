# Zuclubit Smart CRM - Arquitectura Detallada
**"Portability-Ready" - Balance Velocidad + Flexibilidad Futura**

**Última actualización**: Enero 2025
**Filosofía**: "Move fast now, migrate easy later"
**Lock-in Target**: 2.6/10 (vs 6.5/10 pure AWS)

---

## 📐 Principios Arquitectónicos

### 1. Serverless-First
- Minimizar operational overhead
- Auto-scaling nativo
- Pay-per-use pricing
- Focus en business logic, no infrastructure management
- **Containerización desde día 1** (migration path a Fargate/K8s)

### 2. Event-Driven
- Desacoplamiento de servicios
- Comunicación asíncrona
- Eventual consistency donde sea apropiado
- Event sourcing para audit trail
- **CloudEvents standard** para portabilidad

### 3. Domain-Driven Design (DDD)
- Bounded contexts claramente definidos
- Ubiquitous language
- Aggregate design pattern
- Domain events para comunicación entre contexts
- **Nuevos bounded contexts: LATAM Compliance & AI Automation**

### 4. Security by Design
- Deny-by-default
- Encryption everywhere (at rest & in transit)
- Multi-tenancy isolation (Row Level Security)
- Least privilege principle

### 5. Observability-First
- Logging estructurado
- Distributed tracing
- Metrics en tiempo real
- Alerts proactivos

### 6. Cloud-Agnostic (Nuevo)
- Standard protocols y APIs
- Abstraction layers para servicios cloud
- Container-based deployment
- Multi-cloud migration optionality

## 🏗️ Arquitectura de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT TIER                                           │
│                                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   Web App    │  │  Mobile App  │  │  Public API  │  │  WhatsApp    │           │
│  │  (Next.js)   │  │(React Native)│  │  (REST/GQL)  │  │   Webhook    │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                  │                  │                  │                   │
└─────────┼──────────────────┼──────────────────┼──────────────────┼───────────────────┘
          │                  │                  │                  │
          └──────────────────┴──────────────────┴──────────────────┘
                                      │
                      ┌───────────────▼───────────────┐
                      │       CloudFront CDN          │
                      │  (Global Edge Locations)      │
                      └───────────────┬───────────────┘
                                      │
                      ┌───────────────▼───────────────┐
                      │       WAF (Web App FW)        │
                      │  (DDoS Protection, Rules)     │
                      └───────────────┬───────────────┘
                                      │
┌─────────────────────────────────────┼─────────────────────────────────────────────┐
│                           API GATEWAY TIER                                          │
│                                     │                                               │
│                    ┌────────────────▼────────────────┐                             │
│                    │  API Gateway (HTTP + OpenAPI)   │                             │
│                    │  ✅ Cloud-agnostic via OpenAPI  │                             │
│                    │                                 │                             │
│                    │  ┌─────────────────────────┐   │                             │
│                    │  │  Supabase Auth (JWT)    │   │   ✅ REEMPLAZA COGNITO     │
│                    │  │  - JWT validation       │   │   (Open Source)             │
│                    │  │  - Tenant extraction    │   │                             │
│                    │  └─────────────────────────┘   │                             │
│                    │                                 │                             │
│                    │  ┌─────────────────────────┐   │                             │
│                    │  │  Rate Limiting (Redis)  │   │   ✅ Upstash Redis         │
│                    │  │  - Per user: 100/min    │   │                             │
│                    │  │  - Per IP: 1000/min     │   │                             │
│                    │  └─────────────────────────┘   │                             │
│                    │                                 │                             │
│                    │  ┌─────────────────────────┐   │                             │
│                    │  │  Request Validation     │   │                             │
│                    │  │  - Schema validation    │   │                             │
│                    │  │  - Input sanitization   │   │                             │
│                    │  └─────────────────────────┘   │                             │
│                    └────────────────┬────────────────┘                             │
│                                     │                                               │
└─────────────────────────────────────┼───────────────────────────────────────────────┘
                                      │
         ┌────────────────────────────┼────────────────────────────────────┐
         │                            │                                    │
┌────────▼────────┐   ┌───────────────▼──────┐   ┌──────────▼────────┐   │
│                 │   │                      │   │                   │   │
│  LEAD SERVICE   │   │  PROPOSAL SERVICE    │   │ CUSTOMER SERVICE  │   │
│  (Docker)       │   │  (Docker)            │   │  (Docker)         │   │
└────────┬────────┘   └───────────┬──────────┘   └─────────┬─────────┘   │
         │                        │                         │             │
         │                        │                         │             │
┌────────▼────────┐   ┌───────────▼──────────┐   ┌─────────▼─────────┐   │
│                 │   │                      │   │                   │   │
│FINANCIAL SERVICE│   │  ANALYTICS SERVICE   │   │  NOTIFICATION     │   │
│  (Docker)       │   │  (Docker)            │   │     SERVICE       │   │
└────────┬────────┘   └───────────┬──────────┘   └─────────┬─────────┘   │
         │                        │                         │             │
         │                        │                         │             │
┌────────▼────────────────────────┐   ┌──────────────────────▼─────────┐  │
│   LATAM COMPLIANCE SERVICE       │   │   AI AUTOMATION SERVICE       │  │
│   (Docker) ✨ NUEVO              │   │   (Docker) ✨ NUEVO           │  │
│                                  │   │                               │  │
│   - CFDI 4.0 Integration         │   │   - Email extraction          │  │
│   - WhatsApp Business API        │   │   - Voice-to-CRM              │  │
│   - MSI Payment Plans            │   │   - Lead scoring (ML)         │  │
│   - Multi-currency (MXN)         │   │   - Meeting intelligence      │  │
└────────┬─────────────────────────┘   └──────────────────────┬────────┘  │
         │                                                     │           │
         └─────────────────────────────┬───────────────────────┘           │
                                       │                                   │
                       ┌───────────────▼──────────────────┐                │
                       │   NATS JetStream Event Bus       │  ✅ REEMPLAZA  │
                       │   ✅ Cloud-agnostic, Multi-cloud │  EVENTBRIDGE   │
                       │                                  │                │
                       │  Event Streams:                  │                │
                       │  - LEAD_EVENTS                   │                │
                       │  - PROPOSAL_EVENTS               │                │
                       │  - CFDI_EVENTS (nuevo)           │                │
                       │  - WHATSAPP_EVENTS (nuevo)       │                │
                       │  - AI_EVENTS (nuevo)             │                │
                       └───────┬──────────────────────────┘                │
                               │                                           │
                 ┌─────────────┴──────────────┐                            │
                 │                            │                            │
         ┌───────▼──────────┐        ┌───────▼──────────┐                 │
         │ Consumer Groups  │        │ Consumer Groups  │                 │
         │ (NATS built-in)  │        │ (NATS built-in)  │                 │
         └───────┬──────────┘        └───────┬──────────┘                 │
                 │                            │                            │
         ┌───────▼────────────────────────────▼────────────────┐          │
         │                                                      │          │
         │         DATA PERSISTENCE LAYER (PORTABLE)            │          │
         │                                                      │          │
         │  ┌─────────────────────────────────────────┐        │          │
         │  │  PostgreSQL (RDS) ✅ STANDARD           │        │          │
         │  │  NOT Aurora - 100% portable             │        │          │
         │  │                                         │        │          │
         │  │  - Core CRM data (leads, customers)     │        │          │
         │  │  - Proposals & line items               │        │          │
         │  │  - CFDI invoices (nuevo)                │        │          │
         │  │  - Row Level Security (multi-tenancy)   │        │          │
         │  │  - Migration path: YugabyteDB           │        │          │
         │  └─────────────────────────────────────────┘        │          │
         │                                                      │          │
         │  ┌─────────────────────────────────────────┐        │          │
         │  │  MongoDB Atlas ✅ REEMPLAZA DYNAMODB    │        │          │
         │  │  Multi-cloud (AWS/GCP/Azure)            │        │          │
         │  │                                         │        │          │
         │  │  - Activity logs (high write volume)    │        │          │
         │  │  - WhatsApp conversations (nuevo)       │        │          │
         │  │  - AI processing queue (nuevo)          │        │          │
         │  │  - User sessions                        │        │          │
         │  │  - TTL enabled (auto-cleanup)           │        │          │
         │  └─────────────────────────────────────────┘        │          │
         │                                                      │          │
         │  ┌─────────────────────────────────────────┐        │          │
         │  │  Upstash Redis ✅ REEMPLAZA ELASTICACHE │        │          │
         │  │  Serverless, Multi-cloud                │        │          │
         │  │                                         │        │          │
         │  │  - Session store                        │        │          │
         │  │  - Cache layer                          │        │          │
         │  │  - Rate limiting counters               │        │          │
         │  │  - Real-time CFDI status                │        │          │
         │  └─────────────────────────────────────────┘        │          │
         │                                                      │          │
         │  ┌─────────────────────────────────────────┐        │          │
         │  │  S3 + Abstraction Layer ✅              │        │          │
         │  │  Compatible: R2, GCS, MinIO             │        │          │
         │  │                                         │        │          │
         │  │  - CFDI XML/PDF (5 year retention)      │        │          │
         │  │  - Proposal PDFs                        │        │          │
         │  │  - Business card images (OCR)           │        │          │
         │  │  - Voice recordings (transcription)     │        │          │
         │  └─────────────────────────────────────────┘        │          │
         │                                                      │          │
         │  ┌─────────────────────────────────────────┐        │          │
         │  │  AWS AI/ML ⚠️ LOCK-IN ACEPTABLE         │        │          │
         │  │  Justificación: Best for Spanish/LATAM  │        │          │
         │  │                                         │        │          │
         │  │  - SageMaker (lead scoring models)      │        │          │
         │  │  - Comprehend (Spanish NLP)             │        │          │
         │  │  - Transcribe (es-MX voice-to-text)     │        │          │
         │  │  - Textract (CFDI OCR)                  │        │          │
         │  └─────────────────────────────────────────┘        │          │
         │                                                      │          │
         └──────────────────────────────────────────────────────┘          │
                                                                            │
         ┌──────────────────────────────────────────────────────┐          │
         │  EXTERNAL INTEGRATIONS (nuevo)                       │          │
         │                                                      │          │
         │  - PAC Providers (CFDI stamping): Finkok, SW Sapien  │          │
         │  - WhatsApp Business API: Twilio, 360dialog          │          │
         │  - Payment Gateways: Stripe Mexico, PayU, dLocal     │          │
         │  - Accounting: QuickBooks, Xero (bi-directional)     │          │
         └──────────────────────────────────────────────────────┘          │
                                                                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 🔄 Event-Driven Architecture

### Event Bus Structure (NATS JetStream)

```typescript
// CloudEvents standard + NATS JetStream
// Event naming convention: {Context}.{Aggregate}.{Action}

type DomainEvent =
  // Lead Management
  | 'Lead.Created'
  | 'Lead.Updated'
  | 'Lead.Qualified'
  | 'Lead.Converted'
  | 'Lead.ScoreChanged'

  // Proposal Management
  | 'Proposal.Created'
  | 'Proposal.Sent'
  | 'Proposal.Viewed'
  | 'Proposal.Accepted'
  | 'Proposal.Rejected'

  // Customer & Financial
  | 'Customer.Created'
  | 'Contract.Signed'
  | 'Invoice.Generated'
  | 'Payment.Received'
  | 'Expense.Recorded'

  // ✨ LATAM Compliance (NUEVO)
  | 'CFDI.Generated'
  | 'CFDI.Stamped'
  | 'CFDI.Cancelled'
  | 'CFDI.ValidationFailed'
  | 'WhatsApp.MessageSent'
  | 'WhatsApp.MessageReceived'
  | 'WhatsApp.ConversationStarted'
  | 'MSI.PaymentScheduled'
  | 'MSI.InstallmentPaid'

  // ✨ AI Automation (NUEVO)
  | 'AI.EmailExtracted'
  | 'AI.VoiceTranscribed'
  | 'AI.LeadScored'
  | 'AI.MeetingAnalyzed'
  | 'AI.BusinessCardOCR'
  | 'AI.ChurnPredicted';

// CloudEvents 1.0 Standard (portable across event systems)
interface EventEnvelope {
  // CloudEvents spec
  specversion: '1.0';
  id: string;                    // Event UUID
  type: DomainEvent;
  source: string;                // Source service (e.g., 'lead-service')
  time: string;                  // ISO 8601 timestamp
  datacontenttype: 'application/json';

  // Business data
  data: unknown;                 // Event payload

  // Metadata
  tenantId: string;              // Multi-tenancy
  userId?: string;               // Acting user
  correlationId?: string;        // For tracing
  causationId?: string;          // What caused this event
}

// NATS JetStream Streams (replace EventBridge buses)
const EventStreams = {
  LEAD_EVENTS: {
    subjects: ['lead.*'],
    retention: '7d',
  },
  PROPOSAL_EVENTS: {
    subjects: ['proposal.*'],
    retention: '30d',
  },
  CFDI_EVENTS: {
    subjects: ['cfdi.*'],
    retention: '5y', // SAT requirement
  },
  WHATSAPP_EVENTS: {
    subjects: ['whatsapp.*'],
    retention: '90d',
  },
  AI_EVENTS: {
    subjects: ['ai.*'],
    retention: '7d',
  },
};
```

### Event Flow Examples

#### Example 1: Lead Creation + AI Scoring Flow (ACTUALIZADO)

```
User creates lead
     │
     ▼
┌─────────────────┐
│  Lead Service   │ Validates & persists lead
│  (Docker)       │
└────────┬────────┘
         │
         │ Publishes: Lead.Created
         ▼
┌──────────────────────┐
│ NATS JetStream       │ ✅ Routes to consumer groups
│ Stream: LEAD_EVENTS  │
└────┬───────┬─────────┘
     │       │
     │       └──────────────────┐
     │                          │
     ▼                          ▼
┌──────────────────┐   ┌────────────────────┐
│ AI Scoring       │   │ Analytics          │
│ Consumer         │   │ Consumer           │
└──────┬───────────┘   └────────┬───────────┘
       │                        │
       ▼                        ▼
┌─────────────────┐    ┌────────────────────┐
│ML Scoring       │    │Update Dashboard    │
│(SageMaker)      │    │(MongoDB Analytics) │
└─────┬───────────┘    └────────────────────┘
      │
      │ Publishes: AI.LeadScored
      ▼
┌──────────────────────┐
│ NATS JetStream       │
│ Stream: AI_EVENTS    │
└──────┬───────────────┘
       │
       ▼
┌────────────────────┐
│Update Lead Score   │
│+ Send WhatsApp     │
│  Notification      │
└────────────────────┘
```

#### Example 2: Proposal Accepted + CFDI Generation Flow (✨ NUEVO)

```
Client clicks "Accept Proposal"
          │
          ▼
  ┌─────────────────┐
  │Proposal Service │ Updates status
  │  (Docker)       │
  └───────┬─────────┘
          │
          │ Publishes: Proposal.Accepted
          ▼
  ┌──────────────────────┐
  │ NATS JetStream       │ ✅ Routes to consumers
  │Stream:PROPOSAL_EVENTS│
  └───┬───────┬──────────┘
      │       │
      │       └────────────────────────┐
      │                                │
      ▼                                ▼
┌─────────────────┐      ┌──────────────────────────┐
│Customer Convert │      │ LATAM Compliance Service │
│Consumer         │      │ (Docker) ✨ NUEVO        │
└─────┬───────────┘      └────────┬─────────────────┘
      │                           │
      ▼                           ▼
┌──────────────┐    ┌──────────────────────────────┐
│Convert Lead  │    │1. Generate CFDI 4.0 XML     │
│to Customer   │    │2. Call PAC (Finkok/SW)      │
│(PostgreSQL)  │    │3. Stamp invoice             │
└──────┬───────┘    │4. Store XML/PDF (S3)        │
       │            └────────┬─────────────────────┘
       │                     │
       │ Publishes:          │ Publishes: CFDI.Stamped
       │ Customer.Created    │
       │                     ▼
       │            ┌──────────────────────────┐
       │            │ NATS JetStream           │
       │            │ Stream: CFDI_EVENTS      │
       │            └────────┬─────────────────┘
       │                     │
       └─────────────────────┴───────────┐
                                         │
                                         ▼
                          ┌──────────────────────────┐
                          │ Notification Consumer    │
                          └────────┬─────────────────┘
                                   │
                   ┌───────────────┴──────────────┐
                   │                              │
                   ▼                              ▼
          ┌────────────────┐          ┌──────────────────┐
          │Send WhatsApp   │          │Send Email        │
          │with CFDI PDF   │          │with XML/PDF      │
          └────────────────┘          └──────────────────┘
```

## 🗄️ Data Architecture

### PostgreSQL Schema Design (Standard PostgreSQL - NOT Aurora)

#### Multi-Tenancy Pattern (Row Level Security)

```sql
-- ✅ CRITICAL: Use ONLY standard PostgreSQL 15 features
-- ❌ NO Aurora-specific functions or extensions

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Tenants table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  plan VARCHAR(50) NOT NULL DEFAULT 'free',
  status VARCHAR(50) NOT NULL DEFAULT 'active',
  settings JSONB DEFAULT '{}',

  -- ✨ LATAM-specific (NUEVO)
  country VARCHAR(3) DEFAULT 'MXN', -- ISO 3166-1
  timezone VARCHAR(50) DEFAULT 'America/Mexico_City',
  cfdi_enabled BOOLEAN DEFAULT false,
  whatsapp_enabled BOOLEAN DEFAULT false,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- ✅ Row Level Security (works on all PostgreSQL)
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  role VARCHAR(50) NOT NULL DEFAULT 'user',

  -- ✅ CHANGED: Supabase Auth (not Cognito)
  supabase_user_id UUID UNIQUE NOT NULL,

  last_login_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, email)
);

CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_users_supabase ON users(supabase_user_id);

-- ✅ Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_setting('app.tenant_id')::UUID);
```

#### Lead Management Schema

```sql
CREATE TABLE lead_sources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(tenant_id, name)
);

CREATE TABLE contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  first_name VARCHAR(255),
  last_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  job_title VARCHAR(255),
  preferred_contact_method VARCHAR(20) DEFAULT 'email',
  timezone VARCHAR(50) DEFAULT 'UTC',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}$')
);

CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_contacts_email ON contacts(tenant_id, email);

CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  source_id UUID REFERENCES lead_sources(id),
  owner_id UUID REFERENCES users(id),

  company_name VARCHAR(255),
  industry VARCHAR(100),
  employee_count INTEGER,
  annual_revenue DECIMAL(15,2),
  website VARCHAR(255),

  status VARCHAR(50) NOT NULL DEFAULT 'new',
  stage VARCHAR(100),

  score INTEGER DEFAULT 0 CHECK (score >= 0 AND score <= 100),
  score_updated_at TIMESTAMP,

  last_activity_at TIMESTAMP,
  next_follow_up_at TIMESTAMP,

  custom_fields JSONB DEFAULT '{}',

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_leads_tenant ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_owner ON leads(owner_id);
CREATE INDEX idx_leads_score ON leads(tenant_id, score DESC);
CREATE INDEX idx_leads_next_followup ON leads(tenant_id, next_follow_up_at)
  WHERE next_follow_up_at IS NOT NULL;

-- Row Level Security
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_leads ON leads
  USING (tenant_id = current_setting('app.current_tenant')::UUID);
```

#### Proposal Management Schema

```sql
CREATE TABLE proposals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  lead_id UUID REFERENCES leads(id),
  customer_id UUID REFERENCES customers(id),

  proposal_number VARCHAR(50) UNIQUE NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'draft',

  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  currency VARCHAR(3) NOT NULL DEFAULT 'MXN',

  valid_until DATE,

  sent_at TIMESTAMP,
  viewed_at TIMESTAMP,
  accepted_at TIMESTAMP,
  rejected_at TIMESTAMP,

  pdf_url TEXT,

  created_by UUID NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_status CHECK (
    status IN ('draft', 'sent', 'viewed', 'accepted', 'rejected', 'expired')
  )
);

CREATE INDEX idx_proposals_tenant ON proposals(tenant_id);
CREATE INDEX idx_proposals_lead ON proposals(lead_id);
CREATE INDEX idx_proposals_status ON proposals(tenant_id, status);
CREATE INDEX idx_proposals_number ON proposals(proposal_number);

CREATE TABLE proposal_line_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposal_id UUID NOT NULL REFERENCES proposals(id) ON DELETE CASCADE,

  name VARCHAR(255) NOT NULL,
  description TEXT,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  discount_percentage DECIMAL(5,2) DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,

  category VARCHAR(100),
  sort_order INTEGER DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_line_items_proposal ON proposal_line_items(proposal_id, sort_order);

-- Trigger to update proposal totals
CREATE OR REPLACE FUNCTION update_proposal_totals()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE proposals
  SET
    subtotal = (
      SELECT COALESCE(SUM(total), 0)
      FROM proposal_line_items
      WHERE proposal_id = NEW.proposal_id
    ),
    updated_at = NOW()
  WHERE id = NEW.proposal_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER proposal_line_items_update_totals
AFTER INSERT OR UPDATE OR DELETE ON proposal_line_items
FOR EACH ROW EXECUTE FUNCTION update_proposal_totals();
```

#### ✨ LATAM Compliance Schema (NUEVO)

```sql
-- ====================================
-- CFDI 4.0 (Mexican Electronic Invoicing)
-- ====================================

CREATE TABLE cfdi_invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  proposal_id UUID REFERENCES proposals(id),
  customer_id UUID NOT NULL REFERENCES customers(id),

  -- CFDI Identification
  cfdi_uuid UUID UNIQUE, -- Folio fiscal (from PAC)
  serie VARCHAR(25),
  folio VARCHAR(40),
  cfdi_version VARCHAR(10) DEFAULT '4.0',

  -- SAT Status
  status VARCHAR(50) NOT NULL DEFAULT 'draft',
  -- draft, validating, stamped, sent, cancelled, error

  -- Financial
  subtotal DECIMAL(15,2) NOT NULL,
  discount DECIMAL(15,2) DEFAULT 0,
  total DECIMAL(15,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'MXN',

  -- Tax information (CFDI 4.0)
  taxes JSONB NOT NULL, -- IVA, ISR, IEPS, etc.
  cfdi_use VARCHAR(10) NOT NULL, -- G01, G02, G03, etc.
  payment_method VARCHAR(10) NOT NULL, -- PUE, PPD
  payment_form VARCHAR(10), -- 01 (efectivo), 03 (transfer), etc.

  -- Receptor (customer)
  receptor_rfc VARCHAR(13) NOT NULL,
  receptor_name VARCHAR(255) NOT NULL,
  receptor_tax_regime VARCHAR(10), -- 601, 612, etc.
  receptor_zipcode VARCHAR(5) NOT NULL,

  -- Emisor (tenant)
  emisor_rfc VARCHAR(13) NOT NULL,
  emisor_name VARCHAR(255) NOT NULL,
  emisor_tax_regime VARCHAR(10) NOT NULL,

  -- PAC Integration
  pac_provider VARCHAR(50), -- 'finkok', 'sw_sapien', etc.
  pac_response JSONB, -- PAC API response
  stamped_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  cancellation_reason VARCHAR(255),

  -- Document Storage (S3)
  xml_url TEXT, -- Original XML
  stamped_xml_url TEXT, -- Timbrado XML
  pdf_url TEXT, -- PDF representation

  -- SAT Validation
  sat_certificate_number VARCHAR(20),
  sat_seal TEXT, -- Sello SAT
  original_string TEXT, -- Cadena original

  -- Metadata
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT valid_cfdi_status CHECK (
    status IN ('draft', 'validating', 'stamped', 'sent', 'cancelled', 'error')
  )
);

CREATE INDEX idx_cfdi_tenant ON cfdi_invoices(tenant_id);
CREATE INDEX idx_cfdi_customer ON cfdi_invoices(customer_id);
CREATE INDEX idx_cfdi_uuid ON cfdi_invoices(cfdi_uuid);
CREATE INDEX idx_cfdi_status ON cfdi_invoices(tenant_id, status);
CREATE INDEX idx_cfdi_created_at ON cfdi_invoices(tenant_id, created_at DESC);

-- Row Level Security
ALTER TABLE cfdi_invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_cfdi ON cfdi_invoices
  USING (tenant_id = current_setting('app.tenant_id')::UUID);


-- ====================================
-- MSI (Meses Sin Intereses) - Interest-Free Installments
-- ====================================

CREATE TABLE msi_payment_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cfdi_invoice_id UUID REFERENCES cfdi_invoices(id),
  customer_id UUID NOT NULL REFERENCES customers(id),

  -- Plan details
  total_amount DECIMAL(15,2) NOT NULL,
  installment_count INTEGER NOT NULL CHECK (installment_count IN (3, 6, 9, 12, 18)),
  installment_amount DECIMAL(15,2) NOT NULL,

  -- Status
  status VARCHAR(50) DEFAULT 'active',
  -- active, completed, defaulted, cancelled

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Payment tracking
  paid_installments INTEGER DEFAULT 0,
  next_payment_date DATE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE msi_installments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_plan_id UUID NOT NULL REFERENCES msi_payment_plans(id) ON DELETE CASCADE,

  installment_number INTEGER NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  due_date DATE NOT NULL,

  status VARCHAR(50) DEFAULT 'pending',
  -- pending, paid, overdue, waived

  paid_at TIMESTAMP,
  payment_method VARCHAR(50),
  payment_reference VARCHAR(255),

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_msi_plans_tenant ON msi_payment_plans(tenant_id);
CREATE INDEX idx_msi_plans_customer ON msi_payment_plans(customer_id);
CREATE INDEX idx_msi_installments_plan ON msi_installments(payment_plan_id);
CREATE INDEX idx_msi_installments_due ON msi_installments(due_date) WHERE status = 'pending';


-- ====================================
-- WhatsApp Business Integration
-- ====================================

CREATE TABLE whatsapp_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id),
  lead_id UUID REFERENCES leads(id),
  customer_id UUID REFERENCES customers(id),

  -- WhatsApp Details
  whatsapp_phone VARCHAR(20) NOT NULL, -- E.164 format
  conversation_id VARCHAR(255) UNIQUE, -- External provider ID

  -- Status
  status VARCHAR(50) DEFAULT 'open',
  -- open, waiting, closed, archived

  -- Metadata
  last_message_at TIMESTAMP,
  last_message_from VARCHAR(20), -- 'customer' or 'agent'
  unread_count INTEGER DEFAULT 0,

  -- Assignment
  assigned_to UUID REFERENCES users(id),
  assigned_at TIMESTAMP,

  tags VARCHAR(255)[], -- Array of tags

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_whatsapp_conversations_tenant ON whatsapp_conversations(tenant_id);
CREATE INDEX idx_whatsapp_conversations_phone ON whatsapp_conversations(whatsapp_phone);
CREATE INDEX idx_whatsapp_conversations_status ON whatsapp_conversations(tenant_id, status);
CREATE INDEX idx_whatsapp_conversations_assigned ON whatsapp_conversations(assigned_to) WHERE assigned_to IS NOT NULL;

-- Row Level Security
ALTER TABLE whatsapp_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY tenant_isolation_whatsapp ON whatsapp_conversations
  USING (tenant_id = current_setting('app.tenant_id')::UUID);

-- Note: WhatsApp messages stored in MongoDB for better performance
-- (high write volume, time-series data)
```

### MongoDB Atlas Collections (REEMPLAZA DynamoDB)

**Justificación**: Multi-cloud portability, better querying, self-hosted option

```typescript
// ====================================
// Collection: activity_logs
// Use: High-write volume activity tracking
// ====================================
interface ActivityLog {
  _id: ObjectId;
  tenant_id: string;
  lead_id?: string;
  customer_id?: string;
  user_id: string;

  activity_type: 'call' | 'email' | 'meeting' | 'note' | 'whatsapp' | 'task';
  timestamp: Date;

  // Activity details
  subject?: string;
  description?: string;
  duration_seconds?: number;
  outcome?: string;

  // Metadata
  metadata: Record<string, any>;

  // TTL - auto-delete after 90 days
  expires_at: Date;
}

// Indexes
db.activity_logs.createIndexes([
  { tenant_id: 1, lead_id: 1, timestamp: -1 },
  { tenant_id: 1, user_id: 1, timestamp: -1 },
  { tenant_id: 1, activity_type: 1, timestamp: -1 },
  { expires_at: 1 }, // TTL index (expireAfterSeconds: 0)
]);


// ====================================
// Collection: whatsapp_messages ✨ NUEVO
// Use: WhatsApp conversation messages
// ====================================
interface WhatsAppMessage {
  _id: ObjectId;
  tenant_id: string;
  conversation_id: string; // Links to PostgreSQL whatsapp_conversations
  contact_id?: string;

  // Message details
  message_id: string; // WhatsApp message ID
  direction: 'inbound' | 'outbound';
  from: string; // Phone number E.164
  to: string;

  // Content
  type: 'text' | 'image' | 'document' | 'audio' | 'video' | 'location';
  content: {
    text?: string;
    media_url?: string;
    media_type?: string;
    caption?: string;
    location?: { latitude: number; longitude: number };
  };

  // Status
  status: 'sent' | 'delivered' | 'read' | 'failed';
  delivered_at?: Date;
  read_at?: Date;

  // Metadata
  timestamp: Date;
  context?: {
    replied_to?: string; // Message ID being replied to
    forwarded?: boolean;
  };

  // TTL - auto-delete after 90 days
  expires_at: Date;
}

// Indexes
db.whatsapp_messages.createIndexes([
  { tenant_id: 1, conversation_id: 1, timestamp: -1 },
  { message_id: 1 }, // Unique
  { tenant_id: 1, from: 1, timestamp: -1 },
  { expires_at: 1 }, // TTL index
]);


// ====================================
// Collection: ai_processing_queue ✨ NUEVO
// Use: AI/ML processing tasks and results
// ====================================
interface AIProcessingJob {
  _id: ObjectId;
  tenant_id: string;
  job_type: 'email_extract' | 'voice_transcribe' | 'lead_score' | 'meeting_analyze' | 'ocr';

  // Input
  input: {
    source_type: string; // 'email', 'audio_file', 'lead_data', etc.
    source_id?: string;
    data: Record<string, any>;
  };

  // Processing
  status: 'pending' | 'processing' | 'completed' | 'failed';
  started_at?: Date;
  completed_at?: Date;
  processing_time_ms?: number;

  // Output
  result?: {
    entities?: Array<{
      type: string;
      value: string;
      confidence: number;
    }>;
    score?: number;
    transcription?: string;
    summary?: string;
    metadata?: Record<string, any>;
  };

  // Error handling
  error?: {
    code: string;
    message: string;
    stack?: string;
  };
  retry_count: number;

  // Metadata
  created_at: Date;
  expires_at: Date; // TTL - auto-delete after 7 days
}

// Indexes
db.ai_processing_queue.createIndexes([
  { tenant_id: 1, status: 1, created_at: -1 },
  { tenant_id: 1, job_type: 1, created_at: -1 },
  { status: 1, created_at: 1 }, // For queue processing
  { expires_at: 1 }, // TTL index
]);


// ====================================
// Collection: user_sessions
// Use: User session management (Supabase Auth compatible)
// ====================================
interface UserSession {
  _id: ObjectId;
  session_id: string; // Unique session ID
  tenant_id: string;
  user_id: string;
  supabase_user_id: string;

  // Session data
  access_token: string; // Encrypted
  refresh_token: string; // Encrypted
  device_info: {
    user_agent: string;
    ip_address: string;
    platform?: string;
  };

  // Timestamps
  created_at: Date;
  last_accessed_at: Date;
  expires_at: Date; // TTL - auto-delete on expiry
}

// Indexes
db.user_sessions.createIndexes([
  { session_id: 1 }, // Unique
  { tenant_id: 1, user_id: 1, last_accessed_at: -1 },
  { expires_at: 1 }, // TTL index
]);


// ====================================
// Collection: real_time_metrics
// Use: Real-time analytics and dashboards
// ====================================
interface RealtimeMetric {
  _id: ObjectId;
  tenant_id: string;
  metric_type: string; // 'leads_created', 'proposals_sent', 'revenue', etc.

  // Time bucket (for aggregation)
  timestamp: Date;
  hour: string; // 'YYYY-MM-DD-HH'
  date: string; // 'YYYY-MM-DD'

  // Metric value
  value: number;
  count: number;

  // Dimensions (for filtering)
  dimensions: Record<string, string>;

  // TTL - auto-delete after 30 days
  expires_at: Date;
}

// Indexes
db.real_time_metrics.createIndexes([
  { tenant_id: 1, metric_type: 1, timestamp: -1 },
  { tenant_id: 1, date: 1, metric_type: 1 },
  { expires_at: 1 }, // TTL index
]);
```

## 🔐 Security Architecture

### Authentication & Authorization Flow (✅ Supabase Auth)

```
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ 1. POST /auth/login
     │    { email, password }
     ▼
┌─────────────────┐
│  API Gateway    │
└────┬────────────┘
     │
     │ 2. Forward to Auth Service
     ▼
┌──────────────────────┐
│  Auth Service        │
│  (Docker Lambda)     │
│                      │
│  3. Verify with      │
│     Supabase Auth ✅ │
│     (self-hosted)    │
└────┬─────────────────┘
     │
     │ 4. User authenticated
     ▼
┌───────────────────────┐
│  Supabase Auth        │
│  (Fargate/EKS)        │
│                       │
│  5. Return tokens     │
│     - Access Token    │
│     - Refresh Token   │
│     - User metadata   │
│       (tenant_id)     │
└────┬──────────────────┘
     │
     │ 6. Return to client
     ▼
┌──────────┐
│  Client  │ Stores tokens securely
│          │ (httpOnly cookies for web)
└──────────┘

Subsequent Requests:
┌──────────┐
│  Client  │
└────┬─────┘
     │
     │ Authorization: Bearer {access_token}
     ▼
┌─────────────────────┐
│  API Gateway        │
│  Authorizer         │
│  (Lambda)           │
│                     │
│  1. Validate JWT ✅ │
│     (Supabase sig)  │
│  2. Extract:        │
│     - User ID       │
│     - Tenant ID     │
│     - Roles         │
│  3. Set RLS context │
└────┬────────────────┘
     │
     │ If authorized
     ▼
┌──────────────────────┐
│  Service Lambda      │
│  (Docker)            │
│                      │
│  1. Set PostgreSQL   │
│     app.tenant_id    │
│  2. RLS enforced ✅  │
│                      │
│  Context:            │
│  - userId            │
│  - tenantId          │
│  - roles             │
└──────────────────────┘
```

### Multi-Tenant Data Isolation

```typescript
// Tenant Context Middleware
export class TenantContext {
  private static async setTenantContext(
    db: Pool,
    tenantId: string
  ): Promise<void> {
    await db.query(
      'SET app.current_tenant = $1',
      [tenantId]
    );
  }

  static middleware() {
    return async (
      req: Request,
      res: Response,
      next: NextFunction
    ) => {
      const tenantId = req.user?.tenantId;

      if (!tenantId) {
        return res.status(403).json({
          error: 'Tenant context required'
        });
      }

      // Set tenant context for all DB queries
      await TenantContext.setTenantContext(
        req.db,
        tenantId
      );

      // Add to request for explicit checks
      req.tenantId = tenantId;

      next();
    };
  }
}
```

### API Rate Limiting (✅ Upstash Redis)

```typescript
// Rate Limiting Strategy
interface RateLimitConfig {
  free: {
    requests: 100,
    window: '1m',       // Per minute
    burst: 20
  },
  pro: {
    requests: 1000,
    window: '1m',
    burst: 100
  },
  enterprise: {
    requests: 10000,
    window: '1m',
    burst: 1000
  }
}

// ✅ Implementation using Upstash Redis (serverless, multi-cloud)
import { Redis } from '@upstash/redis';

const redis = Redis.fromEnv();

class RateLimiter {
  async checkLimit(
    userId: string,
    plan: string
  ): Promise<boolean> {
    const config = RateLimitConfig[plan];
    const key = `ratelimit:${userId}:${Math.floor(Date.now() / 60000)}`;

    const current = await redis.incr(key);

    if (current === 1) {
      // First request in window, set expiry
      await redis.expire(key, 60);
    }

    return current <= config.requests;
  }

  // ✨ NUEVO: Rate limit for WhatsApp API
  async checkWhatsAppLimit(tenantId: string): Promise<boolean> {
    // WhatsApp Business API: 1000 messages per day
    const key = `whatsapp:${tenantId}:${new Date().toISOString().split('T')[0]}`;

    const current = await redis.incr(key);

    if (current === 1) {
      await redis.expire(key, 86400); // 24 hours
    }

    return current <= 1000;
  }
}
```

## 📊 Observability

### Logging Strategy

```typescript
// Structured Logging
interface LogEntry {
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error';
  service: string;
  environment: string;

  // Request context
  requestId: string;
  userId?: string;
  tenantId?: string;

  // Message
  message: string;

  // Additional context
  data?: Record<string, unknown>;

  // Error details
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

// Logger implementation
class Logger {
  log(entry: Omit<LogEntry, 'timestamp' | 'environment'>) {
    console.log(JSON.stringify({
      ...entry,
      timestamp: new Date().toISOString(),
      environment: process.env.ENVIRONMENT
    }));
  }

  info(message: string, data?: Record<string, unknown>) {
    this.log({ level: 'info', message, data });
  }

  error(message: string, error: Error, data?: Record<string, unknown>) {
    this.log({
      level: 'error',
      message,
      data,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack
      }
    });
  }
}
```

### Metrics & Dashboards

```yaml
Key Metrics:

Business Metrics:
  - Active users (DAU/MAU)
  - Leads created per day
  - Proposals sent per day
  - Conversion rate (lead → customer)
  - MRR/ARR
  - Churn rate

Technical Metrics:
  - API response time (p50, p95, p99)
  - Error rate
  - Lambda cold start duration
  - Database connection pool utilization
  - Cache hit rate

Infrastructure Metrics:
  - Lambda concurrent executions
  - API Gateway 4xx/5xx errors
  - DynamoDB throttles
  - RDS CPU/Memory utilization
  - S3 request latency

Custom Dashboards:
  1. Executive Dashboard
     - MRR growth
     - Customer acquisition
     - Top features usage
     - System health overview

  2. Engineering Dashboard
     - Service health
     - Error budgets
     - Deployment frequency
     - MTTR (Mean Time To Recovery)

  3. Sales Dashboard
     - Pipeline value
     - Conversion funnel
     - Sales rep performance
     - Forecast accuracy
```

### Alerting Strategy

```yaml
Alert Levels:

P0 - Critical (Page immediately):
  - API Gateway 5xx rate > 1%
  - Database down
  - Authentication service down
  - Data loss detected

P1 - High (Notify within 15 min):
  - API response time p95 > 1s
  - Error rate > 0.5%
  - Lambda throttles detected
  - Cache hit rate < 50%

P2 - Medium (Notify within 1 hour):
  - Elevated 4xx errors
  - Increased cold starts
  - Unusual traffic patterns

P3 - Low (Notify during business hours):
  - Deprecated API usage
  - Approaching rate limits
  - Cost anomalies
```

## 🔄 CI/CD Pipeline

```yaml
Pipeline Stages:

1. Commit Stage:
   - Linting (ESLint)
   - Type checking (TypeScript)
   - Unit tests (Jest)
   - Code coverage (>80% required)

2. Build Stage:
   - Compile TypeScript
   - Bundle Lambda functions
   - Build Docker images
   - Generate CDK CloudFormation

3. Test Stage:
   - Integration tests
   - E2E tests (Playwright)
   - Load tests (k6)
   - Security scans (Snyk)

4. Deploy Stage:
   Environments:
     - Dev (auto-deploy on merge to main)
     - Staging (auto-deploy, smoke tests)
     - Production (manual approval + blue/green)

   Deployment Strategy:
     - Blue/Green for Lambda aliases
     - Rolling updates for ECS
     - Database migrations (separate step)

5. Post-Deploy:
   - Smoke tests
   - Monitor error rates
   - Automated rollback if errors spike
```

## 💰 Cost Optimization

### ✅ Estimated Monthly Costs by Phase (Portability-Ready Stack)

```yaml
Phase 1 (MVP - 100 users):
  AWS Services:
    - API Gateway: $3.50 (100K requests)
    - Lambda (Docker): $25 (500K invocations, ARM64)
    - RDS PostgreSQL: $60 (db.t4g.medium)
    - S3 + CloudFront: $15 (50GB storage + CDN)
    - CloudWatch: $10
    - AI/ML (SageMaker): $50 (limited usage)

  Cloud-Agnostic Services:
    - MongoDB Atlas: $60 (M10 dedicated)
    - NATS JetStream: $99 (Synadia Cloud managed)
    - Supabase Auth: $30 (self-hosted on Fargate)
    - Upstash Redis: $10 (serverless, pay-per-use)

  LATAM Integrations:
    - PAC Provider (CFDI): $20 (up to 100 invoices)
    - WhatsApp Business API: $15 (Twilio - 500 messages)

  Total: ~$397/month (+$197 vs pure AWS)
  Per user: $3.97/month
  Lock-in Score: 2.6/10 ✅ (vs 6.5/10 pure AWS)

Phase 2 (Growth - 1,000 users):
  AWS Services:
    - API Gateway: $35 (1M requests)
    - Lambda (Docker): $120 (3M invocations)
    - RDS PostgreSQL: $250 (db.r6g.large + 500GB)
    - S3 + CloudFront: $45 (150GB + CDN)
    - CloudWatch: $25
    - AI/ML: $200 (active ML scoring)

  Cloud-Agnostic Services:
    - MongoDB Atlas: $180 (M30 + multi-region backup)
    - NATS JetStream: $199 (high availability)
    - Supabase Auth: $50 (EKS deployment)
    - Upstash Redis: $30 (increased traffic)

  LATAM Integrations:
    - PAC Provider: $80 (up to 1K invoices)
    - WhatsApp API: $100 (5K messages)

  Total: ~$1,314/month (+$494 vs pure AWS $820)
  Per user: $1.31/month
  Lock-in Score: 2.6/10 ✅

Phase 3 (Scale - 10,000 users):
  AWS Services:
    - API Gateway: $200 (10M requests)
    - Lambda (Docker): $600 (15M invocations)
    - RDS PostgreSQL: $1,200 (multi-AZ r6g.2xlarge)
    - S3 + CloudFront: $150 (500GB + global CDN)
    - CloudWatch/X-Ray: $100
    - AI/ML: $800 (SageMaker endpoints, high volume)

  Cloud-Agnostic Services:
    - MongoDB Atlas: $800 (M60 + global clusters)
    - NATS JetStream: $399 (self-hosted on EKS)
    - Supabase Auth: $100 (EKS HA deployment)
    - Upstash Redis: $150 (high throughput)

  LATAM Integrations:
    - PAC Provider: $300 (10K invoices/mo)
    - WhatsApp API: $500 (50K messages)
    - Accounting sync: $100 (QuickBooks/Xero)

  Total: ~$5,399/month (+$2,399 vs pure AWS $3,000)
  Per user: $0.54/month
  Lock-in Score: 2.6/10 ✅

Comparison Summary:
┌─────────┬───────────┬──────────────────┬────────┬──────────────┐
│ Phase   │ Pure AWS  │ Portability-Ready│ Delta  │ Lock-in Saved│
├─────────┼───────────┼──────────────────┼────────┼──────────────┤
│ Phase 1 │ $200      │ $397             │ +$197  │ 6.5→2.6 (60%)│
│ Phase 2 │ $820      │ $1,314           │ +$494  │ 6.5→2.6 (60%)│
│ Phase 3 │ $3,000    │ $5,399           │ +$2,399│ 6.5→2.6 (60%)│
└─────────┴───────────┴──────────────────┴────────┴──────────────┘

ROI Analysis (3 years):
  Extra cost: $197/mo → $7,092 (3 years)
  Migration cost saved: $300K+ (if needed in future)
  Negotiation leverage: $50K-150K/year potential savings
  Enterprise deals enabled: +40% TAM

  ✅ NET POSITIVE ROI even if never migrate
```

### Optimization Strategies

```yaml
Lambda (Docker):
  - ✅ ARM64 (Graviton2) for 20% savings
  - ✅ Right-size memory (affects CPU)
  - ✅ Minimize cold starts with provisioned concurrency
  - ✅ Connection pooling for DB (pg-pool, MongoDB connection reuse)
  - ✅ Shared layers for common dependencies

RDS PostgreSQL (Standard):
  - ✅ Reserved Instances (40-60% savings after 6 months)
  - ✅ Connection pooling (PgBouncer)
  - ✅ Read replicas for analytics queries
  - ✅ Automated backup retention: 7 days
  - ❌ NO Aurora (maintain portability)

MongoDB Atlas:
  - ✅ Right-size cluster tier (M10 → M30 based on usage)
  - ✅ TTL indexes for auto-cleanup (activity_logs, sessions)
  - ✅ Compression enabled
  - ✅ Multi-region only when needed (Phase 3)
  - ✅ Archive old data to S3 (90+ days)

NATS JetStream:
  - ✅ Phase 1: Managed (Synadia Cloud $99/mo)
  - ✅ Phase 2: Self-hosted on EKS (save $100/mo)
  - ✅ Stream retention policies (7d-5y based on event type)
  - ✅ Consumer groups for horizontal scaling

Upstash Redis:
  - ✅ Serverless pricing (pay-per-request)
  - ✅ Use regional (not global) for Phase 1
  - ✅ Aggressive TTLs (sessions: 24h, rate limits: 1min)

S3:
  - ✅ Intelligent-Tiering for CFDI archival
  - ✅ Lifecycle policies: Standard → Glacier after 1 year
  - ✅ CloudFront CDN for proposal PDFs
  - ✅ Compress before upload (gzip/brotli)

AI/ML:
  - ✅ Batch processing where possible (SageMaker Batch Transform)
  - ✅ Right-size endpoints (start small, scale up)
  - ✅ Use Spot instances for training
  - ✅ Cache AI results (Redis TTL 1 hour)

LATAM Integrations:
  - ✅ Batch CFDI stamping (reduce PAC API calls)
  - ✅ WhatsApp templates (lower per-message cost)
  - ✅ Negotiate volume discounts with PAC providers

General:
  - ✅ Tag all resources (cost allocation by tenant/feature)
  - ✅ Budget alerts (CloudWatch + email)
  - ✅ Weekly cost reviews (FinOps)
  - ✅ Spot instances for non-critical workloads
  - ✅ Auto-scaling policies (scale down during off-hours)
```

---

## 📋 Resumen de Decisiones Arquitectónicas

### ✅ Stack Final Aprobado

```yaml
Philosophy: "Portability-Ready" - Balance velocidad + flexibilidad futura
Lock-in Target: 2.6/10 (reduced from 6.5/10 pure AWS)
Development Velocity: 95% (minimal slowdown vs pure AWS)
Extra Cost: +$197/mo Phase 1 (+98%)
Migration Cost Savings: $300K+ (if needed in future)
```

### Servicios Reemplazados (Cloud-Agnostic)

| AWS Service | Reemplazo | Justificación |
|-------------|-----------|---------------|
| **DynamoDB** | MongoDB Atlas | Multi-cloud, better querying, self-hosted option |
| **Cognito** | Supabase Auth | Open source, better DX, Row Level Security integration |
| **EventBridge + SQS** | NATS JetStream | Cloud-agnostic, 10x cheaper, lower latency |
| **ElastiCache** | Upstash Redis | Serverless, multi-cloud, pay-per-request |
| **Aurora** | RDS PostgreSQL (standard) | 100% portable, standard SQL only |

### Servicios AWS Mantenidos (con estrategia)

| Service | Strategy | Lock-in Score |
|---------|----------|---------------|
| **Lambda** | Containerizado (Docker) | 3/10 (migration path a Fargate/K8s) |
| **API Gateway** | OpenAPI specs | 3/10 (portable a Kong/Traefik) |
| **RDS PostgreSQL** | Standard SQL only | 2/10 (works on Cloud SQL, Azure, YugabyteDB) |
| **S3** | Abstraction layer | 3/10 (compatible con R2, GCS, MinIO) |
| **SageMaker/Comprehend** | Accept lock-in | 9/10 (best for Spanish/LATAM, 40% cheaper) |

### Nuevos Bounded Contexts

```yaml
7. LATAM Compliance:
   - CFDI 4.0 invoicing (SAT México)
   - WhatsApp Business API integration
   - MSI payment plans (meses sin intereses)
   - Multi-currency (MXN focus)
   - PAC provider integration (Finkok, SW Sapien)

8. AI Automation:
   - Email entity extraction (AWS Comprehend)
   - Voice-to-CRM (AWS Transcribe es-MX)
   - Lead scoring (SageMaker ML)
   - Meeting intelligence
   - Business card OCR (Textract)
```

### Migration Path (Futuro)

```yaml
Phase 1 (Month 0-3): Portability-Ready MVP
  - MongoDB Atlas, NATS, Supabase, Upstash
  - Containerized Lambda
  - Standard PostgreSQL
  - Lock-in: 2.6/10

Phase 2 (Month 6-12): Optimization
  - Migrate CDK → Pulumi (multi-cloud IaC)
  - Self-host NATS on EKS
  - Cost optimization
  - Lock-in: 2.0/10

Phase 3 (Year 2+): True Multi-Cloud
  - Kubernetes + Knative (serverless on k8s)
  - YugabyteDB (geo-distributed PostgreSQL)
  - Multi-cloud DR (AWS + GCP)
  - Lock-in: 1.5/10
```

---

**Documento actualizado**: Enero 2025
**Version**: 2.0.0 (Portability-Ready)
**Autor**: Zuclubit Architecture Team
**Status**: FINAL - Aprobado para implementación

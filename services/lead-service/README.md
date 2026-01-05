# Lead Service

Lead management microservice for Zuclubit Smart CRM.

## Architecture

This service follows **Clean Architecture**, **Domain-Driven Design (DDD)**, and **CQRS** (Command Query Responsibility Segregation) principles:

```
src/
├── domain/              # Business logic (entities, value objects, domain events)
│   ├── aggregates/      # Aggregate roots (Lead)
│   ├── value-objects/   # Immutable value objects (LeadStatus, LeadScore)
│   ├── events/          # Domain events
│   └── repositories/    # Repository interfaces
├── application/         # Application layer (CQRS)
│   ├── commands/        # Write operations (CreateLead, UpdateLead, etc.)
│   ├── queries/         # Read operations (GetLeadById, FindLeads, etc.)
│   ├── common/          # CommandBus, QueryBus infrastructure
│   └── dtos/            # Data transfer objects and mappers
├── infrastructure/      # External concerns (database, events)
│   ├── database/        # Database schema (Drizzle)
│   └── repositories/    # Repository implementations
├── presentation/        # API layer (HTTP)
│   ├── routes/          # Fastify route plugins
│   ├── schemas/         # Zod validation schemas
│   ├── middlewares/     # Fastify hooks and middlewares
│   └── validators/      # Request validators
├── config/              # Configuration and DI container
└── test/                # Test helpers and API tests
```

## Features

- Create, read, update leads
- Lead status management with valid transitions
- Lead scoring (0-100)
- Lead qualification workflow
- Lead assignment to sales reps
- Follow-up scheduling
- Filtering, sorting, and pagination
- Statistics and analytics endpoints
- Domain events for integration
- Multi-tenancy support (Row Level Security ready)
- Transactional event publishing (Outbox pattern)
- OpenAPI/Swagger documentation

## Tech Stack

- **Runtime**: Node.js 20+, TypeScript 5.3
- **Framework**: Fastify 4.29 (high performance)
- **Validation**: Zod (TypeScript-first schema validation)
- **Database**: PostgreSQL 15+ with pg driver
- **Migrations**: Drizzle ORM
- **Events**: NATS JetStream (CloudEvents 1.0)
- **DI Container**: tsyringe
- **Testing**: Vitest + Testcontainers
- **Patterns**: DDD, Clean Architecture, CQRS, Outbox Pattern

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- NATS Server (optional for dev)
- Docker (recommended)

### Using Docker (Recommended)

```bash
# From project root
docker-compose up -d postgres-leads nats

# Or run everything
docker-compose up -d
```

### Installation

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Generate database migrations
npm run db:generate

# Apply migrations
npm run db:migrate
```

### Development

```bash
# Run in development mode (hot reload)
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Type checking
npm run typecheck

# Linting
npm run lint
```

### Testing

```bash
# Run unit tests
npm test

# Watch mode
npm run test:watch

# Integration tests (requires Docker)
npm run test:integration
```

## API Endpoints

Base URL: `/api/v1/leads`

### Lead CRUD

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/` | Create a new lead |
| GET | `/` | List leads with filters |
| GET | `/:id` | Get lead by ID |
| PATCH | `/:id` | Update lead |

### Lead Operations

| Method | Endpoint | Description |
|--------|----------|-------------|
| PATCH | `/:id/status` | Change lead status |
| PATCH | `/:id/score` | Update lead score |
| POST | `/:id/assign` | Assign lead to user |
| POST | `/:id/qualify` | Qualify lead |
| POST | `/:id/follow-up` | Schedule follow-up |

### Analytics

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/stats/overview` | Get lead statistics |
| GET | `/follow-ups/overdue` | Get overdue follow-ups |

### Health Checks

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| GET | `/ready` | Readiness check |

### Example: Create Lead

```http
POST /api/v1/leads
Content-Type: application/json

{
  "tenantId": "uuid",
  "companyName": "Acme Inc",
  "email": "contact@acme.com",
  "phone": "+52 55 1234 5678",
  "source": "website",
  "industry": "Technology",
  "website": "https://acme.com",
  "estimatedValue": 50000,
  "notes": "Met at conference"
}
```

### Example: List Leads with Filters

```http
GET /api/v1/leads?page=1&limit=10&status=qualified&minScore=60&sortBy=score&sortOrder=desc
```

### Example: Change Lead Status

```http
PATCH /api/v1/leads/:id/status
Content-Type: application/json

{
  "status": "contacted",
  "reason": "Initial call completed"
}
```

## CQRS Architecture

### Commands (Write Operations)

| Command | Handler | Description |
|---------|---------|-------------|
| `CreateLeadCommand` | `CreateLeadHandler` | Create new lead |
| `UpdateLeadCommand` | `UpdateLeadHandler` | Update lead info |
| `ChangeLeadStatusCommand` | `ChangeLeadStatusHandler` | Change status |
| `UpdateLeadScoreCommand` | `UpdateLeadScoreHandler` | Update score |
| `AssignLeadCommand` | `AssignLeadHandler` | Assign to user |
| `QualifyLeadCommand` | `QualifyLeadHandler` | Qualify lead |
| `ScheduleFollowUpCommand` | `ScheduleFollowUpHandler` | Schedule follow-up |

### Queries (Read Operations)

| Query | Handler | Description |
|-------|---------|-------------|
| `GetLeadByIdQuery` | `GetLeadByIdHandler` | Get single lead |
| `FindLeadsQuery` | `FindLeadsHandler` | Search leads |
| `GetLeadStatsQuery` | `GetLeadStatsHandler` | Get statistics |
| `GetOverdueFollowUpsQuery` | `GetOverdueFollowUpsHandler` | Get overdue items |

## Domain Model

### Lead Aggregate

- **ID**: UUID, unique identifier
- **Tenant**: Multi-tenant isolation
- **Company**: Name, industry, employee count, annual revenue
- **Contact**: Email, phone, website
- **Status**: `new` → `contacted` → `qualified` → `proposal` → `negotiation` → `won`/`lost`
- **Score**: 0-100 (qualification threshold: 60)
- **Source**: Lead origin (website, referral, linkedin, etc.)
- **Owner**: Assigned sales representative
- **Timeline**: Created, updated, last activity, next follow-up

### Status Transitions

```
                    ┌─────────────┐
                    │    lost     │
                    └─────────────┘
                          ▲
┌─────┐   ┌──────────┐   ┌───────────┐   ┌──────────┐   ┌─────────────┐   ┌─────┐
│ new │ → │ contacted│ → │ qualified │ → │ proposal │ → │ negotiation │ → │ won │
└─────┘   └──────────┘   └───────────┘   └──────────┘   └─────────────┘   └─────┘
```

### Domain Events

- `LeadCreated` - New lead created
- `LeadQualified` - Lead qualified (score >= 60)
- `LeadStatusChanged` - Status transition
- `LeadScoreUpdated` - Score changed
- `LeadAssigned` - Assigned to user
- `LeadConverted` - Converted to customer
- `LeadLost` - Marked as lost

## Database Schema

```sql
-- Main leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY,
  tenant_id UUID NOT NULL,
  company_name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  website VARCHAR(255),
  industry VARCHAR(100),
  employee_count INTEGER,
  annual_revenue INTEGER,
  status VARCHAR(50) NOT NULL DEFAULT 'new',
  score INTEGER NOT NULL DEFAULT 50 CHECK (score >= 0 AND score <= 100),
  source VARCHAR(100) NOT NULL,
  owner_id UUID,
  notes TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_score ON leads(score);
CREATE INDEX idx_leads_email ON leads(email);
CREATE INDEX idx_leads_source ON leads(source);
CREATE INDEX idx_leads_next_follow_up ON leads(next_follow_up_at);
CREATE INDEX idx_leads_tenant_status ON leads(tenant_id, status);
CREATE INDEX idx_leads_tenant_owner ON leads(tenant_id, owner_id);

-- Outbox table for event publishing
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY,
  event_type VARCHAR(100) NOT NULL,
  event_data JSONB NOT NULL,
  tenant_id UUID NOT NULL,
  aggregate_id UUID NOT NULL,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_outbox_published ON outbox_events(published_at) WHERE published_at IS NULL;
CREATE INDEX idx_outbox_tenant ON outbox_events(tenant_id);
```

## Environment Variables

```env
# Server
PORT=3000
HOST=0.0.0.0
NODE_ENV=development

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=leads
POSTGRES_USER=dev
POSTGRES_PASSWORD=dev123

# Connection Pool
DB_POOL_MAX=10
DB_IDLE_TIMEOUT=30000
DB_CONNECTION_TIMEOUT=5000

# Events (NATS)
NATS_SERVERS=nats://localhost:4222

# API Security
CORS_ORIGINS=http://localhost:3000
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW=1 minute

# Logging
LOG_LEVEL=debug
```

## Swagger Documentation

When running in development mode, Swagger UI is available at:

```
http://localhost:3000/documentation
```

## License

Proprietary - Zuclubit 2024-2025

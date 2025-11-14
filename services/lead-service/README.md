# Lead Service

Lead management microservice for Zuclubit Smart CRM.

## Architecture

This service follows **Clean Architecture** and **Domain-Driven Design (DDD)** principles:

```
src/
├── domain/              # Business logic (entities, value objects, domain events)
│   ├── aggregates/      # Aggregate roots (Lead)
│   ├── value-objects/   # Immutable value objects (LeadStatus, LeadScore)
│   ├── events/          # Domain events
│   └── repositories/    # Repository interfaces
├── application/         # Use cases (application logic)
│   ├── use-cases/       # Business operations
│   └── dtos/            # Data transfer objects
├── infrastructure/      # External concerns (database, events)
│   ├── database/        # Database schema (Drizzle)
│   └── repositories/    # Repository implementations
├── presentation/        # API layer (HTTP)
│   ├── controllers/     # HTTP controllers
│   ├── routes/          # Express routes
│   ├── middlewares/     # Express middlewares
│   └── validators/      # Zod validation schemas
└── config/              # Configuration and DI container
```

## Features

- ✅ Create, read, update leads
- ✅ Lead status management with valid transitions
- ✅ Lead scoring (0-100)
- ✅ Lead qualification
- ✅ Filtering and pagination
- ✅ Domain events for integration
- ✅ Multi-tenancy support
- ✅ Transactional event publishing (Outbox pattern)

## Tech Stack

- **Runtime**: Node.js 20, TypeScript
- **Framework**: Express.js
- **Validation**: Zod (TypeScript-first)
- **Database**: PostgreSQL 15 with pg driver
- **ORM**: Drizzle ORM (migrations only)
- **Events**: NATS JetStream
- **DI**: tsyringe
- **Patterns**: DDD, Clean Architecture, CQRS, Outbox Pattern

## Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15
- NATS Server

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
# Run in development mode
npm run dev

# Build
npm run build

# Start production server
npm start
```

### Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Integration tests
npm run test:integration
```

## API Endpoints

### Create Lead
```http
POST /api/leads
Content-Type: application/json
X-Tenant-Id: <tenant-uuid>

{
  "companyName": "Acme Inc",
  "email": "contact@acme.com",
  "phone": "+52 55 1234 5678",
  "website": "https://acme.com",
  "industry": "Technology",
  "source": "website",
  "ownerId": "user-uuid"
}
```

### Get Lead
```http
GET /api/leads/:id
X-Tenant-Id: <tenant-uuid>
```

### List Leads
```http
GET /api/leads?page=1&limit=10&status=new&minScore=60
X-Tenant-Id: <tenant-uuid>
```

### Update Lead
```http
PUT /api/leads/:id
Content-Type: application/json
X-Tenant-Id: <tenant-uuid>

{
  "companyName": "Acme Corporation",
  "notes": "Follow up next week"
}
```

### Qualify Lead
```http
POST /api/leads/:id/qualify
Content-Type: application/json
X-Tenant-Id: <tenant-uuid>

{
  "qualifiedBy": "user-uuid"
}
```

## Domain Model

### Lead Aggregate
- **ID**: Unique identifier
- **Company**: Name, industry, employee count, annual revenue
- **Contact**: Email, phone, website
- **Status**: new → contacted → qualified → proposal → negotiation → won/lost
- **Score**: 0-100 (threshold: 60 for qualification)
- **Source**: Lead origin (website, referral, etc.)
- **Owner**: Assigned sales rep
- **Timeline**: Created, updated, last activity, next follow-up

### Domain Events
- `Lead.Created`
- `Lead.Qualified`
- `Lead.StatusChanged`
- `Lead.ScoreChanged`
- `Lead.Assigned`
- `Lead.Converted`
- `Lead.Lost`

## Database Schema

```sql
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
  score INTEGER NOT NULL DEFAULT 50,
  source VARCHAR(100) NOT NULL,
  owner_id UUID,
  notes TEXT,
  custom_fields JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_activity_at TIMESTAMPTZ,
  next_follow_up_at TIMESTAMPTZ
);

CREATE INDEX idx_leads_tenant_id ON leads(tenant_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_owner_id ON leads(owner_id);
CREATE INDEX idx_leads_score ON leads(score);
```

## License

Proprietary - Zuclubit © 2025

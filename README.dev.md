# Developer Documentation - Zuclubit Smart CRM

Technical documentation for developers working on the Zuclubit Smart CRM platform.

## Architecture

This is a microservices-based CRM system with 8 core services:

1. **Lead Service** - Lead management and scoring
2. **Customer Service** - Customer lifecycle and health scoring
3. **Proposal Service** - CPQ (Configure, Price, Quote) with approval workflows
4. **Financial Service** - CFDI 4.0 invoicing and payment processing
5. **LATAM Compliance Service** - Regional compliance and tax handling
6. **AI Automation Service** - Lead scoring, intent detection, sentiment analysis
7. **Notification Service** - Multi-channel notifications (Email, SMS, WhatsApp)
8. **Analytics Service** - Real-time metrics and reporting

## Tech Stack

- **Runtime**: Node.js 20, TypeScript
- **Databases**: PostgreSQL 15, MongoDB 7, Redis 7
- **Event Bus**: NATS JetStream
- **Auth**: Supabase Auth
- **Cloud**: AWS (Lambda, S3, SageMaker)
- **LATAM**: CFDI 4.0, PAC timbrado

## Project Structure

```
zuclubit-smart-crm/
├── services/              # Microservices
│   ├── lead-service/
│   ├── customer-service/
│   ├── proposal-service/
│   ├── financial-service/
│   ├── latam-compliance-service/
│   ├── ai-automation-service/
│   ├── notification-service/
│   └── analytics-service/
├── shared/                # Shared libraries
│   ├── domain/           # Domain building blocks (Result, AggregateRoot, ValueObject)
│   ├── events/           # Event publisher/subscriber (NATS)
│   ├── database/         # Database utilities
│   └── utils/            # Common utilities
├── infrastructure/        # Infrastructure as code
│   ├── docker-compose/   # Local development
│   └── scripts/          # Deployment scripts
└── docs/                 # Documentation
    └── services/         # Service design documents
```

## Getting Started

### Prerequisites

- Node.js 20+
- Docker & Docker Compose
- npm 10+

### Local Development

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Start infrastructure services**
   ```bash
   cd infrastructure/docker-compose
   cp .env.example .env
   docker-compose up -d
   ```

3. **Build shared libraries**
   ```bash
   npm run build
   ```

4. **Run services in development mode**
   ```bash
   npm run dev
   ```

### Available Scripts

- `npm run build` - Build all packages
- `npm run dev` - Run all services in development mode
- `npm run lint` - Lint all packages
- `npm run format` - Format code with Prettier
- `npm run test` - Run tests
- `npm run typecheck` - Type check all packages
- `npm run clean` - Clean build artifacts

## Development

### Shared Libraries

#### @zuclubit/domain
Core domain building blocks:
- `Result<T>` - Railway Oriented Programming pattern
- `AggregateRoot` - Base class for aggregates
- `ValueObject` - Base class for value objects
- `Email`, `Money` - Common value objects

Example usage:
```typescript
import { Result, Email, Money } from '@zuclubit/domain';

// Create value objects
const emailResult = Email.create('user@example.com');
if (emailResult.isFailure) {
  console.error(emailResult.error);
  return;
}

const moneyResult = Money.fromDecimal(100.50, 'MXN');
const money = moneyResult.getValue();
console.log(money.toString()); // "100.50 MXN"
```

#### @zuclubit/events
Event-driven architecture support:
- `NatsEventPublisher` - Publish domain events
- `NatsEventSubscriber` - Subscribe to domain events
- CloudEvents 1.0 compatible

Example usage:
```typescript
import { NatsEventPublisher } from '@zuclubit/events';

// Create publisher
const publisher = new NatsEventPublisher({
  servers: ['nats://localhost:4222']
});

await publisher.connect();

// Publish event
await publisher.publish({
  type: 'Lead.Created',
  data: { leadId: '123', companyName: 'Acme Inc' }
});
```

### Code Standards

- TypeScript strict mode enabled
- ESLint with recommended rules
- Prettier for code formatting
- Domain-Driven Design patterns
- Repository pattern for data access
- CQRS for read/write separation

### Running Tests

```bash
# All tests
npm test

# Integration tests (requires Docker services)
npm run test:integration

# Watch mode
npm test -- --watch
```

## Documentation

- [Architecture Overview](./docs/ARCHITECTURE_FINAL.md)
- [Implementation Plan](./docs/IMPLEMENTATION_PLAN.md)
- [Common Patterns](./docs/COMMON_PATTERNS.md)
- Service Designs:
  - [Lead Service](./docs/services/LEAD_SERVICE_DESIGN.md)
  - [Customer Service](./docs/services/CUSTOMER_SERVICE_DESIGN.md)
  - [Proposal Service](./docs/services/PROPOSAL_SERVICE_DESIGN.md)
  - [Financial Service](./docs/services/FINANCIAL_SERVICE_DESIGN.md)
  - [LATAM Compliance](./docs/services/LATAM_COMPLIANCE_SERVICE_DESIGN.md)
  - [AI Automation](./docs/services/AI_AUTOMATION_SERVICE_DESIGN.md)
  - [Notification Service](./docs/services/NOTIFICATION_SERVICE_DESIGN.md)
  - [Analytics Service](./docs/services/ANALYTICS_SERVICE_DESIGN.md)

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development workflow and pull request process.

## License

Proprietary - Zuclubit © 2025

# Docker Compose Development Environment

Local development environment for Zuclubit Smart CRM.

## Services

- **PostgreSQL** (port 5432): Main OLTP database with separate databases per service
- **MongoDB** (port 27017): Document storage for AI models and analytics
- **Redis** (port 6379): Cache and sessions
- **NATS JetStream** (port 4222): Event bus for inter-service communication
- **Supabase DB** (port 5433): Authentication database
- **LocalStack** (port 4566): AWS services emulation (optional)

## Quick Start

```bash
# Copy environment file
cp .env.example .env

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f

# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes all data)
docker-compose down -v
```

## Service URLs

- PostgreSQL: `postgresql://dev:dev123@localhost:5432/zuclubit_crm`
- MongoDB: `mongodb://dev:dev123@localhost:27017/zuclubit_ai`
- Redis: `redis://:dev123@localhost:6379`
- NATS: `nats://localhost:4222`
- NATS Monitoring: http://localhost:8222
- LocalStack: http://localhost:4566

## Databases Created

PostgreSQL creates the following databases:
- `leads` - Lead Service
- `customers` - Customer Service
- `proposals` - Proposal Service
- `financial` - Financial Service
- `latam_compliance` - LATAM Compliance Service

## Health Checks

All services include health checks. Check status:

```bash
docker-compose ps
```

## Troubleshooting

### PostgreSQL connection issues
```bash
docker-compose logs postgres
```

### NATS monitoring
Visit http://localhost:8222 to see NATS monitoring dashboard.

### Reset everything
```bash
docker-compose down -v
docker-compose up -d
```

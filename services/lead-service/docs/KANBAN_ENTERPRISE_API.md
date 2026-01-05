# Kanban Enterprise API - Production Documentation

> **Version:** 1.0.0
> **Last Updated:** December 2024
> **Module:** `infrastructure/kanban`

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [API Reference](#api-reference)
4. [Security & RBAC](#security--rbac)
5. [Configuration](#configuration)
6. [Observability](#observability)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## Overview

The Kanban Enterprise Backend provides a production-ready, real-time collaborative Kanban board system for CRM entities (leads, opportunities, tasks, customers).

### Key Features

- **Multi-entity support**: Leads (7 stages), Opportunities (6 stages), Tasks (5 stages), Customers (4 stages)
- **WIP Limits**: Soft/hard limits with visual indicators and enforcement
- **Transition Rules**: Allow, warn, block, or require-data transitions
- **Event Sourcing**: Complete move history with audit trail
- **Undo/Redo**: Per-user undo stack with redo capability
- **Real-time Collaboration**: Locking, conflict detection, live updates via WebSocket
- **Metrics**: Lead time, cycle time, throughput, bottleneck detection
- **Multi-tenant**: Complete tenant isolation with RBAC

---

## Architecture

### Service Structure

```
src/infrastructure/kanban/
├── kanban.service.ts      # Core business logic (1500+ lines)
├── index.ts               # Module exports
└── types.ts               # TypeScript interfaces

src/presentation/routes/
└── kanban.routes.ts       # API endpoints with RBAC

src/infrastructure/logging/
└── logger.service.ts      # Structured logging with correlation IDs
```

### Database Tables

| Table | Purpose |
|-------|---------|
| `kanban_moves` | Event sourcing - all moves with audit |
| `kanban_locks` | Pessimistic locking for collaboration |
| `kanban_snapshots` | Point-in-time board state |
| `kanban_config` | Per-tenant board configuration |
| `kanban_metrics` | Aggregated performance metrics |

### Entity Type Stages

```typescript
// Lead Stages (7)
['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost']

// Opportunity Stages (6)
['discovery', 'proposal', 'negotiation', 'verbal_commitment', 'closed_won', 'closed_lost']

// Task Stages (5)
['todo', 'in_progress', 'in_review', 'done', 'archived']

// Customer Stages (4)
['onboarding', 'active', 'at_risk', 'churned']
```

---

## API Reference

### Base URL
```
/api/v1/kanban
```

### Authentication
All endpoints require:
- Bearer token (JWT from Supabase Auth)
- Permission checks based on role

### Endpoints

#### Board Operations

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/board/:entityType` | `kanban:view` | Get full board state |
| GET | `/stage/:entityType/:stageId` | `kanban:view` | Get items in specific stage |

**GET /board/:entityType**

Response:
```json
{
  "success": true,
  "data": {
    "entityType": "lead",
    "stages": [
      {
        "id": "new",
        "label": "Nuevo",
        "color": "#3B82F6",
        "wipStatus": {
          "current": 15,
          "softLimit": 20,
          "hardLimit": 30,
          "level": "normal",
          "percentage": 50
        },
        "items": [...],
        "pagination": { "total": 15, "offset": 0, "limit": 50 }
      }
    ],
    "config": {
      "wipLimits": {...},
      "transitions": {...},
      "version": 1
    },
    "permissions": {
      "canMove": true,
      "canConfig": false,
      "moveableStages": [...]
    },
    "metadata": {
      "lastUpdated": "2024-12-28T10:00:00Z",
      "activeUsers": 3,
      "undoAvailable": true,
      "redoAvailable": false
    }
  }
}
```

#### Move Operations

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/move` | `kanban:move` | Move item between stages |
| POST | `/undo` | `kanban:undo` | Undo last move |
| POST | `/redo` | `kanban:undo` | Redo undone move |

**POST /move**

Request:
```json
{
  "entityType": "lead",
  "entityId": "uuid",
  "fromStageId": "new",
  "toStageId": "contacted",
  "reason": "Initial contact made",
  "forceWipOverride": false,
  "metadata": {
    "source": "drag",
    "idempotencyKey": "optional-uuid"
  }
}
```

Response:
```json
{
  "success": true,
  "data": {
    "moveId": "uuid",
    "fromStageId": "new",
    "toStageId": "contacted",
    "validation": {
      "type": "allowed",
      "message": "Move validated"
    },
    "wipStatus": {
      "stageId": "contacted",
      "current": 12,
      "limit": 20,
      "level": "normal"
    },
    "undoAvailable": true
  }
}
```

Error Codes:
- `ENTITY_NOT_FOUND` (404): Entity doesn't exist
- `CONFLICT` (409): Entity moved by another user
- `WIP_LIMIT_EXCEEDED` (422): Hard limit reached
- `TRANSITION_BLOCKED` (422): Transition not allowed
- `REASON_REQUIRED` (422): Transition requires reason

#### Configuration

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/config/:entityType` | `kanban:view` | Get board config |
| PUT | `/config/:entityType` | `kanban:config` | Update config (optimistic locking) |

**PUT /config/:entityType**

Request:
```json
{
  "wipLimits": {
    "new": { "softLimit": 25, "hardLimit": 40 },
    "contacted": { "softLimit": 15, "hardLimit": 25 }
  },
  "transitions": {
    "new_won": "blocked",
    "qualified_lost": "requires_data"
  },
  "version": 1
}
```

#### Lock Operations

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/lock/:entityType/:entityId` | `kanban:move` | Acquire lock |
| DELETE | `/lock/:entityType/:entityId` | `kanban:move` | Release lock |

**POST /lock/:entityType/:entityId**

Request:
```json
{
  "sessionId": "browser-session-id"
}
```

Response (success):
```json
{
  "success": true,
  "data": {
    "locked": true,
    "expiresAt": "2024-12-28T10:30:00Z"
  }
}
```

Response (conflict):
```json
{
  "success": false,
  "error": {
    "code": "LOCK_CONFLICT",
    "message": "Item is locked by another user",
    "conflictingUser": "user-uuid"
  }
}
```

#### History & Metrics

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/history/:entityType/:entityId` | `kanban:history` | Item move history |
| GET | `/history/:entityType` | `kanban:history` | Board move history |
| GET | `/metrics/:entityType` | `kanban:metrics` | Metrics dashboard |
| POST | `/metrics/:entityType/calculate` | `kanban:metrics` | Calculate period metrics |

#### Consistency

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| GET | `/consistency/:entityType` | `kanban:consistency` | Verify consistency |
| POST | `/consistency/:entityType/repair` | `kanban:consistency` | Repair discrepancies |

#### Snapshots

| Method | Endpoint | Permission | Description |
|--------|----------|------------|-------------|
| POST | `/snapshot/:entityType` | `kanban:config` | Create board snapshot |

---

## Security & RBAC

### Permissions

| Permission | Description |
|------------|-------------|
| `kanban:view` | View Kanban boards |
| `kanban:move` | Move items on Kanban |
| `kanban:config` | Configure WIP limits & stages |
| `kanban:force_wip` | Force move when WIP exceeded |
| `kanban:undo` | Undo/Redo moves |
| `kanban:history` | View move history |
| `kanban:metrics` | View & calculate metrics |
| `kanban:consistency` | Verify & repair consistency |

### Role Mappings

| Role | Permissions |
|------|-------------|
| **Owner** | All Kanban permissions |
| **Admin** | All except `kanban:consistency` |
| **Manager** | view, move, undo, history, metrics |
| **Sales Rep** | view, move, undo, history |
| **Viewer** | view, history only |

### Multi-tenant Isolation

- All operations are scoped to `tenantId` from JWT
- Entity lookups validate tenant ownership
- Locks are tenant-scoped
- Configurations are per-tenant

---

## Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LOG_LEVEL` | Logging level (debug, info, warn, error) | `info` (prod), `debug` (dev) |
| `LOCK_TTL_SECONDS` | Lock expiration time | `30` |
| `UNDO_STACK_SIZE` | Max undo history per user | `50` |
| `METRICS_RETENTION_DAYS` | Metrics history retention | `90` |

### WIP Limits Configuration

```json
{
  "wipLimits": {
    "new": {
      "softLimit": 20,
      "hardLimit": 30,
      "warningThreshold": 15
    }
  }
}
```

WIP Levels:
- **normal**: `current < warningThreshold`
- **warning**: `current >= warningThreshold && current < softLimit`
- **critical**: `current >= softLimit && current < hardLimit`
- **blocked**: `current >= hardLimit`

### Transition Types

| Type | Behavior |
|------|----------|
| `allowed` | Move permitted without warning |
| `warning` | Move permitted with warning shown |
| `blocked` | Move not permitted |
| `requires_data` | Move requires reason/additional data |

---

## Observability

### Structured Logging

All operations are logged with correlation IDs:

```json
{
  "level": "info",
  "time": "2024-12-28T10:00:00.000Z",
  "correlationId": "req-uuid",
  "tenantId": "tenant-uuid",
  "userId": "user-uuid",
  "entityType": "lead",
  "entityId": "entity-uuid",
  "operation": "kanban:move",
  "fromStage": "new",
  "toStage": "contacted",
  "success": true,
  "duration": 45,
  "msg": "Kanban move: lead/entity-uuid new → contacted"
}
```

### Log Operations

| Operation | Level | Description |
|-----------|-------|-------------|
| `kanban:move` | info | Move completed |
| `kanban:undo` | info | Undo completed |
| `kanban:redo` | info | Redo completed |
| `kanban:lock:acquire` | debug | Lock acquired |
| `kanban:lock:release` | debug | Lock released |
| `kanban:lock:conflict` | warn | Lock conflict |
| `kanban:wip:exceeded` | warn | WIP limit warning |
| `kanban:config:update` | info | Config changed |
| `kanban:metrics:calculate` | info | Metrics calculated |
| `kanban:consistency:verify` | info | Consistency check |
| `kanban:consistency:repair` | info | Consistency repair |

### Metrics

Available via `/metrics/:entityType`:

| Metric | Description |
|--------|-------------|
| `avgLeadTime` | Average time in stage (seconds) |
| `throughput` | Items completed per period |
| `bottleneckScore` | 0-1 score indicating bottleneck severity |
| `wipBlockedCount` | Times WIP limit was hit |
| `wipWarningCount` | Times WIP warning was triggered |

---

## Testing

### Test Suites

| Suite | File | Description |
|-------|------|-------------|
| Unit Tests | `kanban.service.test.ts` | 1094 lines, mocked DB |
| Integration Tests | `kanban.api.test.ts` | 938 lines, Testcontainers |
| Concurrency Tests | `kanban.concurrency.test.ts` | 784 lines, race conditions |

### Running Tests

```bash
# All tests
npm run test

# Specific suite
npm run test -- kanban.service
npm run test -- kanban.api
npm run test -- kanban.concurrency

# Coverage
npm run test:coverage
```

### Test Categories

**Unit Tests:**
- Board operations
- Move validation
- WIP limit enforcement
- Transition rules
- Undo/Redo logic
- Lock acquisition/release
- Metrics calculation
- Consistency verification

**Integration Tests:**
- Full API endpoints
- Authentication flow
- Error responses
- Correlation ID propagation

**Concurrency Tests:**
- Optimistic locking (version conflicts)
- Pessimistic locking (lock conflicts)
- Race conditions (parallel moves)
- Tenant isolation
- Stress tests (50+ concurrent requests)

---

## Troubleshooting

### Common Issues

#### 1. CONFLICT Error on Move
**Cause:** Entity was moved by another user after you loaded the board.

**Solution:** Refresh board state and retry with correct `fromStageId`.

#### 2. WIP_LIMIT_EXCEEDED Error
**Cause:** Target stage is at hard WIP limit.

**Solution:**
- Move items out of target stage first
- Or use `forceWipOverride: true` (requires `kanban:force_wip` permission)

#### 3. VERSION_CONFLICT on Config Update
**Cause:** Config was updated by another user.

**Solution:** Refetch config, merge changes, retry with new version.

#### 4. LOCK_CONFLICT
**Cause:** Another user is actively editing the item.

**Solution:** Wait for lock to expire (30s default) or coordinate with other user.

#### 5. Consistency Discrepancies
**Cause:** Race condition or interrupted move left entity in inconsistent state.

**Solution:**
```bash
# Verify
GET /api/v1/kanban/consistency/lead

# Repair specific entity
POST /api/v1/kanban/consistency/lead/repair
{ "entityId": "uuid" }
```

### Health Checks

```bash
# Server health
GET /healthz

# Database connectivity
GET /api/v1/health

# Kanban board loads (validates full stack)
GET /api/v1/kanban/board/lead
```

### Performance Tuning

1. **Pagination**: Use `limit` and `offset` for large boards
2. **Stage-specific loading**: Use `/stage/:entityType/:stageId` for lazy loading
3. **Metrics caching**: Pre-calculate metrics via cron job
4. **Lock TTL**: Adjust `LOCK_TTL_SECONDS` based on edit patterns

---

## Changelog

### v1.0.0 (December 2024)
- Initial production release
- Multi-entity Kanban support
- WIP limits with soft/hard thresholds
- Event sourcing with full audit trail
- Real-time collaboration (locks, conflict detection)
- RBAC with 8 granular permissions
- Structured logging with correlation IDs
- Comprehensive test coverage (2800+ lines)

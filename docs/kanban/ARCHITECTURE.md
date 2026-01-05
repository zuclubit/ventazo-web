# Kanban Enterprise Architecture

## Overview

The Ventazo CRM Kanban Enterprise system provides a production-ready, multi-tenant Kanban board implementation with:

- **Event Sourcing** - Complete audit trail of all moves with undo/redo
- **WIP Limits** - Soft and hard limits with override capability
- **Optimistic Locking** - Conflict detection for concurrent edits
- **Multi-Entity Support** - Leads, Opportunities, Tasks, Customers
- **Real-time Collaboration** - WebSocket-based live updates
- **Metrics & Analytics** - Lead time, cycle time, throughput tracking

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Frontend (React)                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ KanbanBoard  │  │ React Query  │  │    WebSocket Client      │  │
│  │  Components  │  │    Cache     │  │  (Real-time Updates)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                        REST API (Fastify)                           │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                    /api/v1/kanban/*                           │  │
│  │  • GET  /board/:entityType     - Get full board state         │  │
│  │  • POST /move                  - Execute item move            │  │
│  │  • POST /undo                  - Undo last move               │  │
│  │  • POST /redo                  - Redo undone move             │  │
│  │  • GET  /config/:entityType    - Get board config             │  │
│  │  • PUT  /config/:entityType    - Update config (versioned)    │  │
│  │  • POST /lock/:entityType/:id  - Acquire pessimistic lock     │  │
│  │  • GET  /metrics/:entityType   - Get metrics dashboard        │  │
│  │  • GET  /consistency/:type     - Verify event sourcing        │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      KanbanService (Core Logic)                     │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────┐  │
│  │ Board Manager  │ │ Move Validator │ │   Metrics Calculator   │  │
│  │ • getBoard()   │ │ • validateTrn()│ │   • calculateMetrics() │  │
│  │ • getStageItem │ │ • checkWIP()   │ │   • getMetricsDash()   │  │
│  └────────────────┘ └────────────────┘ └────────────────────────┘  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────┐  │
│  │ Undo/Redo Mgr  │ │ Lock Manager   │ │ Consistency Verifier   │  │
│  │ • undoMove()   │ │ • acquireLock()│ │ • verifyConsistency()  │  │
│  │ • redoMove()   │ │ • releaseLock()│ │ • repairConsistency()  │  │
│  └────────────────┘ └────────────────┘ └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    Database (PostgreSQL + Drizzle)                  │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────┐  │
│  │ kanban_configs │ │ kanban_moves   │ │   kanban_snapshots     │  │
│  │ WIP limits,    │ │ Event sourcing │ │   Point-in-time        │  │
│  │ stage order    │ │ audit trail    │ │   board state          │  │
│  └────────────────┘ └────────────────┘ └────────────────────────┘  │
│  ┌────────────────┐ ┌────────────────┐                             │
│  │ kanban_metrics │ │ kanban_locks   │                             │
│  │ Lead time,     │ │ Pessimistic    │                             │
│  │ throughput     │ │ locking        │                             │
│  └────────────────┘ └────────────────┘                             │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    WebSocket Server (Real-time)                     │
│  ┌────────────────┐ ┌────────────────┐ ┌────────────────────────┐  │
│  │ Connection Mgr │ │ Room Manager   │ │   Event Publisher      │  │
│  │ • per-tenant   │ │ • tenant rooms │ │   • KANBAN_ITEM_MOVED  │  │
│  │ • per-user     │ │ • entity rooms │ │   • KANBAN_WIP_WARNING │  │
│  └────────────────┘ └────────────────┘ └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

## Data Model

### Entity Types

| Entity | Stages | Description |
|--------|--------|-------------|
| `lead` | new → contacted → qualified → proposal → negotiation → won/lost | Sales pipeline |
| `opportunity` | discovery → qualification → proposal → negotiation → closed_won/lost | Deal tracking |
| `task` | backlog → todo → in_progress → review → done | Task management |
| `customer` | onboarding → active → at_risk → churned | Customer lifecycle |

### Database Tables

```sql
-- Board configuration per tenant/entity
kanban_configs (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants,
  entity_type VARCHAR(50),
  wip_limits JSONB,          -- Per-stage soft/hard limits
  stage_order TEXT[],        -- Custom stage ordering
  collapsed_columns TEXT[],  -- UI state
  transitions JSONB,         -- Custom transition rules
  version INTEGER,           -- Optimistic locking
  UNIQUE(tenant_id, entity_type)
)

-- Event sourcing - complete move history
kanban_moves (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  entity_type VARCHAR(50),
  entity_id UUID,
  from_stage_id VARCHAR(50),
  to_stage_id VARCHAR(50),
  user_id UUID,
  reason TEXT,
  metadata JSONB,           -- source, IP, validationType, wipOverride
  undone_at TIMESTAMP,      -- When this move was undone
  undone_by UUID,           -- Who undid the move
  undo_move_id UUID,        -- Links undo move to original
  created_at TIMESTAMP
)

-- Point-in-time board snapshots
kanban_snapshots (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  entity_type VARCHAR(50),
  board_state JSONB,        -- Complete stage/item positioning
  version INTEGER,
  move_count INTEGER,       -- Moves since last snapshot
  reason VARCHAR(50),       -- 'scheduled' | 'manual' | 'bulk_operation'
  created_at TIMESTAMP
)

-- Aggregated metrics
kanban_metrics (
  id UUID PRIMARY KEY,
  tenant_id UUID,
  entity_type VARCHAR(50),
  stage_id VARCHAR(50),
  period_start TIMESTAMP,
  period_end TIMESTAMP,
  period_type VARCHAR(20),  -- 'hourly' | 'daily' | 'weekly'
  avg_lead_time_seconds INTEGER,
  median_lead_time_seconds INTEGER,
  p90_lead_time_seconds INTEGER,
  items_entered INTEGER,
  items_exited INTEGER,
  throughput INTEGER,
  wip_blocked_count INTEGER,
  wip_warning_count INTEGER,
  bottleneck_score DECIMAL
)

-- Pessimistic locking
kanban_locks (
  entity_type VARCHAR(50),
  entity_id UUID,
  tenant_id UUID,
  locked_by UUID,
  locked_at TIMESTAMP,
  expires_at TIMESTAMP,     -- 30 second expiration
  session_id VARCHAR(100),
  UNIQUE(entity_type, entity_id)
)
```

## Multi-Tenant Architecture

All Kanban operations are tenant-isolated:

1. **Request Header**: `x-tenant-id` required on all requests
2. **Database Queries**: All queries filter by `tenant_id`
3. **WebSocket Rooms**: Events broadcast to `tenant:{tenantId}:kanban:{entityType}`
4. **Lock Isolation**: Locks are scoped to tenant

```typescript
// Example query with tenant isolation
const items = await db
  .select()
  .from(leads)
  .where(and(
    eq(leads.tenantId, tenantId),
    eq(leads.status, stageId)
  ));
```

## Performance Considerations

### Indexing Strategy

```sql
-- Most common queries
CREATE INDEX idx_kanban_moves_tenant_entity ON kanban_moves(tenant_id, entity_type, entity_id);
CREATE INDEX idx_kanban_moves_timeline ON kanban_moves(tenant_id, created_at);

-- Undo chain tracking
CREATE INDEX idx_kanban_moves_undo ON kanban_moves(undo_move_id);

-- Lock cleanup
CREATE INDEX idx_kanban_locks_expires ON kanban_locks(expires_at);

-- Metrics queries
CREATE INDEX idx_kanban_metrics_query ON kanban_metrics(tenant_id, entity_type, period_start);
```

### Pagination

Cursor-based pagination for large boards:

```typescript
const { items, nextCursor } = await kanbanService.getStageItems(
  tenantId,
  'lead',
  'qualified',
  50,  // limit
  lastCursor  // optional cursor
);
```

## Scalability

| Metric | Tested Capacity |
|--------|-----------------|
| Items per stage | 10,000+ |
| Concurrent users per board | 50+ |
| Moves per second | 100+ |
| Event history depth | Unlimited |
| Snapshot frequency | Configurable |

## Security

See [SECURITY.md](./SECURITY.md) for detailed security documentation.

## Related Documentation

- [EVENT_SOURCING.md](./EVENT_SOURCING.md) - Event sourcing and undo/redo
- [SECURITY.md](./SECURITY.md) - Access control and tenant isolation
- [API.md](./API.md) - Complete API reference

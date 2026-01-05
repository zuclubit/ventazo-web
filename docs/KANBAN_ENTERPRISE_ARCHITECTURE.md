# Kanban Enterprise Architecture

> Version: 1.0.0
> Last Updated: December 2024
> Status: Production-Ready Specification

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture](#2-system-architecture)
3. [Database Design](#3-database-design)
4. [API Specification](#4-api-specification)
5. [Event Sourcing & Audit](#5-event-sourcing--audit)
6. [Real-time Collaboration](#6-real-time-collaboration)
7. [Security & RBAC](#7-security--rbac)
8. [Performance & Scalability](#8-performance--scalability)
9. [Observability & Metrics](#9-observability--metrics)
10. [Technical Decisions](#10-technical-decisions)

---

## 1. Executive Summary

### Overview

This document defines the enterprise-grade backend architecture for the Kanban CRM module, extending the existing lead-service backend with:

- **Persistent State Management**: Full board state persistence with versioning
- **Event Sourcing**: Complete audit trail with time-travel capabilities
- **Real-time Collaboration**: Multi-user concurrent editing with conflict resolution
- **Enterprise Security**: Granular RBAC for all Kanban operations
- **Analytics**: Comprehensive metrics for process optimization

### Architecture Principles

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           KANBAN ENTERPRISE STACK                           │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐  │
│  │   Frontend  │◄──►│   REST API  │◄──►│  Services   │◄──►│  Database   │  │
│  │  (React +   │    │  (Fastify)  │    │  (CQRS)     │    │ (PostgreSQL)│  │
│  │  useKanban) │    │             │    │             │    │             │  │
│  └──────┬──────┘    └─────────────┘    └──────┬──────┘    └─────────────┘  │
│         │                                      │                            │
│         │    ┌─────────────────────────────────┘                            │
│         │    │                                                              │
│         ▼    ▼                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                     │
│  │  WebSocket  │◄──►│    NATS     │◄──►│   Redis     │                     │
│  │  (Real-time)│    │ (Events)    │    │  (Cache)    │                     │
│  └─────────────┘    └─────────────┘    └─────────────┘                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Integration with Existing Architecture

| Component | Existing Pattern | Kanban Integration |
|-----------|-----------------|-------------------|
| Database | Drizzle ORM + PostgreSQL | New tables with foreign keys |
| Routes | Fastify plugins + Zod | New `/api/v1/kanban/*` routes |
| Services | tsyringe DI + CQRS | KanbanService, KanbanEventService |
| Events | Outbox + NATS JetStream | KANBAN_* event types |
| Auth | Supabase JWT + RBAC | New `kanban:*` permissions |
| WebSocket | WebSocketService | Real-time board updates |
| Audit | activityLogs table | Extended with Kanban actions |

---

## 2. System Architecture

### Component Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐               │
│  │  kanban.routes   │  │ kanban-config    │  │ kanban-analytics │               │
│  │     .ts          │  │    .routes.ts    │  │    .routes.ts    │               │
│  └────────┬─────────┘  └────────┬─────────┘  └────────┬─────────┘               │
│           │                     │                     │                          │
│           └─────────────────────┼─────────────────────┘                          │
│                                 ▼                                                │
│                    ┌────────────────────────┐                                    │
│                    │   Zod Validation       │                                    │
│                    │   + Auth Middleware    │                                    │
│                    └───────────┬────────────┘                                    │
└────────────────────────────────┼────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────────────┐
│                                ▼           APPLICATION LAYER                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                            COMMAND BUS                                   │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │  MoveKanbanItemCommand      │  ConfigureWIPLimitCommand                 │    │
│  │  UndoKanbanMoveCommand      │  SetColumnCollapseCommand                 │    │
│  │  RedoKanbanMoveCommand      │  BulkMoveKanbanItemsCommand               │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                             QUERY BUS                                    │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │  GetKanbanBoardQuery        │  GetKanbanHistoryQuery                    │    │
│  │  GetKanbanConfigQuery       │  GetKanbanMetricsQuery                    │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────────────┐
│                                ▼            DOMAIN LAYER                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐                     │
│  │  KanbanBoard   │  │  KanbanMove    │  │  KanbanConfig  │                     │
│  │   Aggregate    │  │    Entity      │  │    Entity      │                     │
│  └────────────────┘  └────────────────┘  └────────────────┘                     │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         DOMAIN EVENTS                                    │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │  KANBAN_ITEM_MOVED  │  KANBAN_WIP_BLOCKED  │  KANBAN_UNDO_PERFORMED     │    │
│  │  KANBAN_ITEM_REORDERED │ KANBAN_COLUMN_COLLAPSED │ KANBAN_CONFIG_UPDATED │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
                                 │
┌────────────────────────────────┼────────────────────────────────────────────────┐
│                                ▼         INFRASTRUCTURE LAYER                    │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐  ┌───────────────┐  │
│  │   Kanban       │  │   Kanban       │  │   Kanban       │  │   Kanban      │  │
│  │  Repository    │  │   Service      │  │ EventService   │  │ WebSocket     │  │
│  └────────────────┘  └────────────────┘  └────────────────┘  └───────────────┘  │
│                                                                                  │
│  ┌─────────────────────────────────────────────────────────────────────────┐    │
│  │                         DATABASE TABLES                                  │    │
│  ├─────────────────────────────────────────────────────────────────────────┤    │
│  │  kanban_moves  │  kanban_configs  │  kanban_snapshots  │ kanban_metrics │    │
│  └─────────────────────────────────────────────────────────────────────────┘    │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           KANBAN MOVE OPERATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

   User Drags Card                     Frontend                        Backend
         │                                │                               │
         ▼                                │                               │
    ┌─────────┐                          │                               │
    │ Optimistic │───────────────────────►│                               │
    │  Update   │                         │                               │
    └─────────┘                           │                               │
         │                                ▼                               │
         │                    ┌───────────────────────┐                   │
         │                    │ POST /kanban/move     │──────────────────►│
         │                    └───────────────────────┘                   │
         │                                │                               ▼
         │                                │              ┌─────────────────────────┐
         │                                │              │ 1. Validate Transition  │
         │                                │              │ 2. Check WIP Limits     │
         │                                │              │ 3. Check Permissions    │
         │                                │              │ 4. Acquire Lock         │
         │                                │              │ 5. Execute Move         │
         │                                │              │ 6. Emit Event           │
         │                                │              │ 7. Update Metrics       │
         │                                │              │ 8. Broadcast WS         │
         │                                │              └───────────┬─────────────┘
         │                                │                          │
         │                                │◄─────────────────────────┘
         │                                │           Response
         │                                ▼
         │               ┌────────────────────────────────┐
         │               │  Confirm or Rollback Optimistic │
         │               └────────────────────────────────┘
         │                                │
         │                                │
         ▼                                ▼
    ┌─────────┐                  ┌────────────────┐
    │  Done   │                  │ WebSocket Push │──────► Other Users
    └─────────┘                  └────────────────┘
```

---

## 3. Database Design

### Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              DATABASE SCHEMA                                     │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│     tenants      │       │      users       │       │ tenantMemberships│
│──────────────────│       │──────────────────│       │──────────────────│
│ id (PK)          │◄──────│ id (PK)          │◄──────│ userId (FK)      │
│ name             │       │ email            │       │ tenantId (FK)    │
│ slug             │       │ fullName         │       │ role             │
│ settings (JSONB) │       │ avatarUrl        │       │ permissions[]    │
└──────────────────┘       └──────────────────┘       └──────────────────┘
         │                                                     │
         │                                                     │
         ▼                                                     ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  kanban_configs  │       │   kanban_moves   │       │ kanban_snapshots │
│──────────────────│       │──────────────────│       │──────────────────│
│ id (PK)          │       │ id (PK)          │       │ id (PK)          │
│ tenantId (FK)    │       │ tenantId (FK)    │       │ tenantId (FK)    │
│ entityType       │       │ entityType       │       │ entityType       │
│ wipLimits (JSONB)│       │ entityId (FK)    │       │ boardState(JSONB)│
│ stageOrder[]     │       │ fromStageId      │       │ version          │
│ collapsedColumns │       │ toStageId        │       │ createdAt        │
│ transitions(JSONB)│      │ userId (FK)      │       │ reason           │
│ version          │       │ reason           │       └──────────────────┘
│ createdAt        │       │ metadata (JSONB) │
│ updatedAt        │       │ createdAt        │
└──────────────────┘       │ previousPosition │
                           │ newPosition      │
                           │ undoneAt         │
                           │ undoneBy         │
                           └──────────────────┘
                                    │
                                    │
                                    ▼
┌──────────────────┐       ┌──────────────────┐       ┌──────────────────┐
│  kanban_metrics  │       │  kanban_locks    │       │   activityLogs   │
│──────────────────│       │──────────────────│       │──────────────────│
│ id (PK)          │       │ entityType       │       │ id (PK)          │
│ tenantId (FK)    │       │ entityId (PK)    │       │ tenantId (FK)    │
│ entityType       │       │ tenantId         │       │ entityType       │
│ stageId          │       │ lockedBy (FK)    │       │ entityId         │
│ periodStart      │       │ lockedAt         │       │ action           │
│ periodEnd        │       │ expiresAt        │       │ changes (JSONB)  │
│ avgLeadTime      │       │ sessionId        │       │ metadata (JSONB) │
│ itemsEntered     │       └──────────────────┘       │ createdAt        │
│ itemsExited      │                                  └──────────────────┘
│ wipBlockedCount  │
│ undoCount        │
│ metadata (JSONB) │
└──────────────────┘
```

### Table Definitions

```typescript
// kanban_configs - Board configuration per entity type
export const kanbanConfigs = pgTable('kanban_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'lead', 'opportunity', 'task', 'customer'

  // WIP Limits per stage
  wipLimits: jsonb('wip_limits').$type<Record<string, {
    softLimit: number;
    hardLimit: number;
    warningThreshold: number;
  }>>().default({}),

  // Stage configuration
  stageOrder: text('stage_order').array().notNull().default([]),
  collapsedColumns: text('collapsed_columns').array().default([]),

  // Custom transitions (overrides defaults)
  transitions: jsonb('transitions').$type<Record<string, 'allowed' | 'warning' | 'requires_data' | 'blocked'>>(),

  // Versioning for optimistic locking
  version: integer('version').notNull().default(1),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  tenantEntityIdx: index('kanban_configs_tenant_entity_idx').on(table.tenantId, table.entityType),
  uniqueConfig: unique('kanban_configs_unique').on(table.tenantId, table.entityType),
}));

// kanban_moves - Event sourcing for all movements
export const kanbanMoves = pgTable('kanban_moves', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),

  // Entity reference
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),

  // Move details
  fromStageId: varchar('from_stage_id', { length: 100 }).notNull(),
  toStageId: varchar('to_stage_id', { length: 100 }).notNull(),
  previousPosition: integer('previous_position'),
  newPosition: integer('new_position'),

  // Actor
  userId: uuid('user_id').notNull().references(() => users.id),
  reason: text('reason'),

  // Metadata
  metadata: jsonb('metadata').$type<{
    ipAddress?: string;
    userAgent?: string;
    source?: 'drag' | 'keyboard' | 'dialog' | 'api' | 'automation';
    validationType?: 'allowed' | 'warning' | 'forced';
    wipOverride?: boolean;
    previousState?: Record<string, unknown>;
  }>().default({}),

  // Undo tracking
  undoneAt: timestamp('undone_at'),
  undoneBy: uuid('undone_by').references(() => users.id),
  undoMoveId: uuid('undo_move_id').references(() => kanbanMoves.id),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantEntityIdx: index('kanban_moves_tenant_entity_idx').on(table.tenantId, table.entityType, table.entityId),
  tenantTimeIdx: index('kanban_moves_tenant_time_idx').on(table.tenantId, table.createdAt),
  userTimeIdx: index('kanban_moves_user_time_idx').on(table.userId, table.createdAt),
  entityTimeIdx: index('kanban_moves_entity_time_idx').on(table.entityId, table.createdAt),
}));

// kanban_snapshots - Periodic board state snapshots
export const kanbanSnapshots = pgTable('kanban_snapshots', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(),

  // Complete board state
  boardState: jsonb('board_state').$type<{
    stages: Array<{
      id: string;
      items: Array<{
        id: string;
        position: number;
        stageId: string;
        score?: number;
        status?: string;
      }>;
    }>;
    config: {
      wipLimits: Record<string, number>;
      collapsedColumns: string[];
    };
  }>().notNull(),

  // Versioning
  version: integer('version').notNull(),
  moveCount: integer('move_count').notNull().default(0),

  // Reason for snapshot
  reason: varchar('reason', { length: 100 }), // 'scheduled', 'manual', 'before_bulk_operation'

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantEntityVersionIdx: index('kanban_snapshots_tenant_entity_version_idx')
    .on(table.tenantId, table.entityType, table.version),
}));

// kanban_metrics - Aggregated metrics per stage per period
export const kanbanMetrics = pgTable('kanban_metrics', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  stageId: varchar('stage_id', { length: 100 }).notNull(),

  // Time period
  periodStart: timestamp('period_start').notNull(),
  periodEnd: timestamp('period_end').notNull(),
  periodType: varchar('period_type', { length: 20 }).notNull(), // 'hourly', 'daily', 'weekly'

  // Metrics
  avgLeadTimeSeconds: integer('avg_lead_time_seconds'),
  medianLeadTimeSeconds: integer('median_lead_time_seconds'),
  p90LeadTimeSeconds: integer('p90_lead_time_seconds'),
  itemsEntered: integer('items_entered').notNull().default(0),
  itemsExited: integer('items_exited').notNull().default(0),
  wipBlockedCount: integer('wip_blocked_count').notNull().default(0),
  wipWarningCount: integer('wip_warning_count').notNull().default(0),
  undoCount: integer('undo_count').notNull().default(0),
  redoCount: integer('redo_count').notNull().default(0),

  // Extended metadata
  metadata: jsonb('metadata').$type<{
    peakWipCount?: number;
    avgWipCount?: number;
    bottleneckScore?: number;
    userMoves?: Record<string, number>;
  }>().default({}),

  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  tenantPeriodIdx: index('kanban_metrics_tenant_period_idx')
    .on(table.tenantId, table.entityType, table.periodStart),
  stageTimeIdx: index('kanban_metrics_stage_time_idx')
    .on(table.tenantId, table.stageId, table.periodStart),
}));

// kanban_locks - Optimistic locking for concurrent access
export const kanbanLocks = pgTable('kanban_locks', {
  entityType: varchar('entity_type', { length: 50 }).notNull(),
  entityId: uuid('entity_id').notNull(),
  tenantId: uuid('tenant_id').notNull().references(() => tenants.id),

  lockedBy: uuid('locked_by').notNull().references(() => users.id),
  lockedAt: timestamp('locked_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  sessionId: varchar('session_id', { length: 100 }),
}, (table) => ({
  pk: primaryKey({ columns: [table.entityType, table.entityId] }),
  expiresIdx: index('kanban_locks_expires_idx').on(table.expiresAt),
}));
```

### Indexes Strategy

| Table | Index | Purpose |
|-------|-------|---------|
| kanban_configs | (tenant_id, entity_type) | Fast config lookup per board |
| kanban_moves | (tenant_id, entity_type, entity_id) | Item history lookup |
| kanban_moves | (tenant_id, created_at) | Timeline queries |
| kanban_moves | (user_id, created_at) | User activity audit |
| kanban_snapshots | (tenant_id, entity_type, version) | Version retrieval |
| kanban_metrics | (tenant_id, entity_type, period_start) | Analytics queries |
| kanban_locks | (expires_at) | Cleanup expired locks |

---

## 4. API Specification

### Endpoint Overview

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /kanban/board/:entityType | Get full board state |
| POST | /kanban/move | Move an item |
| POST | /kanban/undo | Undo last move |
| POST | /kanban/redo | Redo undone move |
| POST | /kanban/bulk-move | Batch move items |
| GET | /kanban/config/:entityType | Get board configuration |
| PUT | /kanban/config/:entityType | Update board configuration |
| GET | /kanban/history/:entityType/:entityId | Get item move history |
| GET | /kanban/metrics/:entityType | Get board metrics |
| POST | /kanban/snapshot/:entityType | Create manual snapshot |

### API Contracts

```typescript
// ============================================
// GET /api/v1/kanban/board/:entityType
// ============================================

// Request Headers
interface KanbanBoardRequest {
  'x-tenant-id': string; // Required UUID
  'x-user-id'?: string;  // Optional for personalization
}

// Query Parameters
interface KanbanBoardQueryParams {
  includeArchived?: boolean;
  page?: number;
  pageSize?: number; // Max 100 per stage
  filters?: string;  // JSON encoded filters
}

// Response
interface KanbanBoardResponse {
  success: boolean;
  data: {
    entityType: KanbanEntityType;
    stages: Array<{
      id: string;
      label: string;
      labelEs: string;
      color: string;
      order: number;
      type: 'open' | 'won' | 'lost' | 'active' | 'completed';
      wipStatus: {
        current: number;
        softLimit: number;
        hardLimit: number;
        level: 'normal' | 'warning' | 'critical' | 'blocked';
        percentage: number;
      };
      items: Array<{
        id: string;
        position: number;
        [key: string]: unknown; // Entity-specific fields
      }>;
      pagination?: {
        page: number;
        pageSize: number;
        total: number;
        hasMore: boolean;
      };
    }>;
    config: {
      wipLimits: Record<string, { softLimit: number; hardLimit: number }>;
      collapsedColumns: string[];
      stageOrder: string[];
      version: number;
    };
    permissions: {
      canMove: boolean;
      canConfigureWip: boolean;
      canForceWip: boolean;
      canUndo: boolean;
      moveableStages: string[];
    };
    metadata: {
      lastUpdated: string;
      activeUsers: number;
      undoAvailable: boolean;
      redoAvailable: boolean;
    };
  };
  timestamp: string;
}

// ============================================
// POST /api/v1/kanban/move
// ============================================

// Request Body
interface KanbanMoveRequest {
  entityType: KanbanEntityType;
  entityId: string;
  fromStageId: string;
  toStageId: string;
  newPosition?: number;      // Position within target stage
  reason?: string;           // Required for some transitions
  forceWipOverride?: boolean; // Requires 'kanban:force-wip' permission
  metadata?: {
    source: 'drag' | 'keyboard' | 'dialog' | 'api';
  };
}

// Response
interface KanbanMoveResponse {
  success: boolean;
  data: {
    moveId: string;
    entityId: string;
    fromStageId: string;
    toStageId: string;
    newPosition: number;
    timestamp: string;
    validation: {
      type: 'allowed' | 'warning' | 'forced';
      message?: string;
    };
    undoAvailable: boolean;
    wipStatus?: {
      stageId: string;
      current: number;
      limit: number;
      level: string;
    };
  };
  broadcast: {
    channel: string;
    event: 'KANBAN_ITEM_MOVED';
  };
}

// Error Response (422 for validation, 403 for permission, 409 for conflict)
interface KanbanMoveError {
  success: false;
  error: {
    code: 'TRANSITION_BLOCKED' | 'WIP_LIMIT_EXCEEDED' | 'PERMISSION_DENIED' | 'CONFLICT';
    message: string;
    messageEs: string;
    details?: {
      currentWip?: number;
      wipLimit?: number;
      allowedTransitions?: string[];
      conflictingUser?: string;
    };
  };
}

// ============================================
// POST /api/v1/kanban/undo
// ============================================

// Request Body
interface KanbanUndoRequest {
  entityType: KanbanEntityType;
  moveId?: string; // Specific move to undo, or last if not provided
}

// Response
interface KanbanUndoResponse {
  success: boolean;
  data: {
    undoMoveId: string;
    originalMove: {
      id: string;
      entityId: string;
      fromStageId: string;
      toStageId: string;
      createdAt: string;
    };
    restoredTo: {
      stageId: string;
      position: number;
    };
    redoAvailable: boolean;
  };
}

// ============================================
// POST /api/v1/kanban/bulk-move
// ============================================

// Request Body
interface KanbanBulkMoveRequest {
  entityType: KanbanEntityType;
  moves: Array<{
    entityId: string;
    fromStageId: string;
    toStageId: string;
    newPosition?: number;
  }>;
  reason?: string;
  createSnapshot?: boolean; // Recommended for bulk operations
}

// Response
interface KanbanBulkMoveResponse {
  success: boolean;
  data: {
    totalMoves: number;
    successfulMoves: number;
    failedMoves: Array<{
      entityId: string;
      error: string;
    }>;
    snapshotId?: string;
    batchId: string;
  };
}

// ============================================
// PUT /api/v1/kanban/config/:entityType
// ============================================

// Request Body
interface KanbanConfigUpdateRequest {
  wipLimits?: Record<string, { softLimit?: number; hardLimit?: number }>;
  collapsedColumns?: string[];
  stageOrder?: string[];
  transitions?: Record<string, 'allowed' | 'warning' | 'requires_data' | 'blocked'>;
  version: number; // For optimistic locking
}

// Response
interface KanbanConfigResponse {
  success: boolean;
  data: {
    entityType: string;
    wipLimits: Record<string, { softLimit: number; hardLimit: number }>;
    collapsedColumns: string[];
    stageOrder: string[];
    transitions: Record<string, string>;
    version: number;
    updatedAt: string;
  };
}

// ============================================
// GET /api/v1/kanban/metrics/:entityType
// ============================================

// Query Parameters
interface KanbanMetricsQueryParams {
  periodType: 'hourly' | 'daily' | 'weekly' | 'monthly';
  startDate: string;   // ISO8601
  endDate: string;     // ISO8601
  stageIds?: string[]; // Filter specific stages
}

// Response
interface KanbanMetricsResponse {
  success: boolean;
  data: {
    summary: {
      totalMoves: number;
      avgLeadTimeHours: number;
      bottleneckStage: string;
      wipBlockedEvents: number;
      undoRate: number; // percentage
    };
    byStage: Array<{
      stageId: string;
      stageName: string;
      metrics: {
        avgLeadTimeHours: number;
        medianLeadTimeHours: number;
        itemsEntered: number;
        itemsExited: number;
        wipBlockedCount: number;
        throughputPerDay: number;
      };
    }>;
    timeSeries: Array<{
      period: string;
      moves: number;
      avgLeadTime: number;
      wipBlocked: number;
    }>;
    export: {
      csv: string; // URL to download
      json: string; // URL to download
    };
  };
}
```

### Zod Validation Schemas

```typescript
// schemas/kanban.schemas.ts

import { z } from 'zod';

export const kanbanEntityTypeSchema = z.enum(['lead', 'opportunity', 'task', 'customer']);

export const kanbanMoveSchema = z.object({
  entityType: kanbanEntityTypeSchema,
  entityId: z.string().uuid(),
  fromStageId: z.string().min(1).max(100),
  toStageId: z.string().min(1).max(100),
  newPosition: z.number().int().min(0).optional(),
  reason: z.string().max(500).optional(),
  forceWipOverride: z.boolean().optional().default(false),
  metadata: z.object({
    source: z.enum(['drag', 'keyboard', 'dialog', 'api']).optional(),
  }).optional(),
});

export const kanbanUndoSchema = z.object({
  entityType: kanbanEntityTypeSchema,
  moveId: z.string().uuid().optional(),
});

export const kanbanBulkMoveSchema = z.object({
  entityType: kanbanEntityTypeSchema,
  moves: z.array(z.object({
    entityId: z.string().uuid(),
    fromStageId: z.string().min(1).max(100),
    toStageId: z.string().min(1).max(100),
    newPosition: z.number().int().min(0).optional(),
  })).min(1).max(100),
  reason: z.string().max(500).optional(),
  createSnapshot: z.boolean().optional().default(true),
});

export const kanbanConfigUpdateSchema = z.object({
  wipLimits: z.record(z.object({
    softLimit: z.number().int().min(0).max(1000).optional(),
    hardLimit: z.number().int().min(0).max(1000).optional(),
  })).optional(),
  collapsedColumns: z.array(z.string()).optional(),
  stageOrder: z.array(z.string()).optional(),
  transitions: z.record(z.enum(['allowed', 'warning', 'requires_data', 'blocked'])).optional(),
  version: z.number().int().min(1),
});

export const kanbanMetricsQuerySchema = z.object({
  periodType: z.enum(['hourly', 'daily', 'weekly', 'monthly']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  stageIds: z.array(z.string()).optional(),
});
```

---

## 5. Event Sourcing & Audit

### Event Types

```typescript
// domain/events/kanban-events.ts

export const KanbanEventTypes = {
  // Move events
  KANBAN_ITEM_MOVED: 'kanban.item.moved',
  KANBAN_ITEM_REORDERED: 'kanban.item.reordered',
  KANBAN_BULK_MOVE_COMPLETED: 'kanban.bulk_move.completed',

  // Undo/Redo events
  KANBAN_UNDO_PERFORMED: 'kanban.undo.performed',
  KANBAN_REDO_PERFORMED: 'kanban.redo.performed',

  // WIP events
  KANBAN_WIP_WARNING: 'kanban.wip.warning',
  KANBAN_WIP_BLOCKED: 'kanban.wip.blocked',
  KANBAN_WIP_OVERRIDE: 'kanban.wip.override',

  // Transition events
  KANBAN_TRANSITION_WARNING: 'kanban.transition.warning',
  KANBAN_TRANSITION_BLOCKED: 'kanban.transition.blocked',
  KANBAN_TRANSITION_REQUIRES_DATA: 'kanban.transition.requires_data',

  // Config events
  KANBAN_CONFIG_UPDATED: 'kanban.config.updated',
  KANBAN_COLUMN_COLLAPSED: 'kanban.column.collapsed',
  KANBAN_COLUMN_EXPANDED: 'kanban.column.expanded',

  // Snapshot events
  KANBAN_SNAPSHOT_CREATED: 'kanban.snapshot.created',
  KANBAN_SNAPSHOT_RESTORED: 'kanban.snapshot.restored',
} as const;

// Event payloads
export interface KanbanItemMovedEvent {
  type: typeof KanbanEventTypes.KANBAN_ITEM_MOVED;
  tenantId: string;
  entityType: KanbanEntityType;
  entityId: string;
  userId: string;
  timestamp: string;
  data: {
    fromStageId: string;
    toStageId: string;
    previousPosition: number;
    newPosition: number;
    reason?: string;
    validation: {
      type: 'allowed' | 'warning' | 'forced';
    };
    wipStatus: {
      fromStage: { current: number; limit: number };
      toStage: { current: number; limit: number };
    };
  };
  metadata: {
    source: 'drag' | 'keyboard' | 'dialog' | 'api' | 'automation';
    ipAddress?: string;
    userAgent?: string;
    sessionId?: string;
  };
}

export interface KanbanWIPBlockedEvent {
  type: typeof KanbanEventTypes.KANBAN_WIP_BLOCKED;
  tenantId: string;
  entityType: KanbanEntityType;
  stageId: string;
  userId: string;
  timestamp: string;
  data: {
    attemptedEntityId: string;
    fromStageId: string;
    currentCount: number;
    hardLimit: number;
    wasOverridden: boolean;
    overrideReason?: string;
  };
}
```

### Event Publishing Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                              EVENT PUBLISHING FLOW                               │
└─────────────────────────────────────────────────────────────────────────────────┘

  Move Request                 Database                      NATS JetStream
       │                          │                               │
       ▼                          │                               │
  ┌─────────┐                    │                               │
  │ Validate │                   │                               │
  └────┬────┘                    │                               │
       │                          │                               │
       ▼                          │                               │
  ┌─────────────────────────┐    │                               │
  │ BEGIN TRANSACTION       │────►│                               │
  └─────────┬───────────────┘    │                               │
            │                     │                               │
            ▼                     │                               │
  ┌─────────────────────────┐    │                               │
  │ 1. Update entity stage  │────►│ UPDATE leads SET status = ?  │
  └─────────┬───────────────┘    │                               │
            │                     │                               │
            ▼                     │                               │
  ┌─────────────────────────┐    │                               │
  │ 2. Insert kanban_move   │────►│ INSERT INTO kanban_moves     │
  └─────────┬───────────────┘    │                               │
            │                     │                               │
            ▼                     │                               │
  ┌─────────────────────────┐    │                               │
  │ 3. Insert outbox_event  │────►│ INSERT INTO outbox_events    │
  └─────────┬───────────────┘    │ (published = false)           │
            │                     │                               │
            ▼                     │                               │
  ┌─────────────────────────┐    │                               │
  │ 4. Insert activity_log  │────►│ INSERT INTO activity_logs    │
  └─────────┬───────────────┘    │                               │
            │                     │                               │
            ▼                     │                               │
  ┌─────────────────────────┐    │                               │
  │ COMMIT TRANSACTION      │────►│                               │
  └─────────┬───────────────┘    │                               │
            │                     │                               │
            │                     │                               │
            ▼                     │                               │
  ┌─────────────────────────┐    │                               │
  │ Outbox Processor        │    │                               │
  │ (async background)      │────────────────────────────────────►│
  └─────────────────────────┘    │      Publish to NATS          │
                                 │                               │
                                 │      UPDATE outbox_events     │
                                 │      SET published = true     │
```

### Audit Trail Query Examples

```sql
-- Get complete history for a lead
SELECT
  km.id,
  km.from_stage_id,
  km.to_stage_id,
  km.reason,
  km.created_at,
  u.full_name as moved_by,
  km.metadata->>'source' as source,
  km.undone_at,
  undo_user.full_name as undone_by
FROM kanban_moves km
JOIN users u ON km.user_id = u.id
LEFT JOIN users undo_user ON km.undone_by = undo_user.id
WHERE km.tenant_id = $1
  AND km.entity_type = 'lead'
  AND km.entity_id = $2
ORDER BY km.created_at DESC;

-- Get pipeline activity for a time range
SELECT
  DATE_TRUNC('day', km.created_at) as day,
  km.to_stage_id as stage,
  COUNT(*) as moves,
  COUNT(DISTINCT km.entity_id) as unique_items,
  COUNT(CASE WHEN km.undone_at IS NOT NULL THEN 1 END) as undone_count
FROM kanban_moves km
WHERE km.tenant_id = $1
  AND km.entity_type = 'lead'
  AND km.created_at BETWEEN $2 AND $3
GROUP BY DATE_TRUNC('day', km.created_at), km.to_stage_id
ORDER BY day, stage;

-- Find bottleneck stages (high WIP blocked events)
SELECT
  to_stage_id as stage,
  COUNT(*) as blocked_attempts,
  AVG((metadata->>'currentWip')::int) as avg_wip_when_blocked
FROM kanban_moves km
JOIN outbox_events oe ON oe.aggregate_id = km.id
WHERE km.tenant_id = $1
  AND oe.event_type = 'kanban.wip.blocked'
  AND km.created_at >= NOW() - INTERVAL '30 days'
GROUP BY to_stage_id
ORDER BY blocked_attempts DESC;
```

---

## 6. Real-time Collaboration

### WebSocket Architecture

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         REAL-TIME COLLABORATION FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

     User A                   Server                    User B
       │                         │                         │
       │                         │                         │
       │◄────────────────────────┼────────────────────────►│
       │    WebSocket Connect    │    WebSocket Connect    │
       │    (tenant:board:lead)  │    (tenant:board:lead)  │
       │                         │                         │
       │    Drag Card            │                         │
       │────────────────────────►│                         │
       │                         │                         │
       │    Acquire Lock         │                         │
       │◄────────────────────────│                         │
       │                         │                         │
       │                         │ Broadcast: ITEM_GRABBED │
       │                         │────────────────────────►│
       │                         │                         │
       │    Drop Card            │                         │  Show lock indicator
       │────────────────────────►│                         │  on that card
       │                         │                         │
       │    Release Lock         │                         │
       │    Save Move            │                         │
       │◄────────────────────────│                         │
       │                         │                         │
       │                         │ Broadcast: ITEM_MOVED   │
       │                         │────────────────────────►│
       │                         │                         │
       │                         │                         │  Animate card to
       │                         │                         │  new position
       │                         │                         │
```

### WebSocket Channel Structure

```typescript
// Channel naming convention
const channels = {
  // Board-level updates
  boardUpdates: `tenant:${tenantId}:kanban:${entityType}`,

  // User presence
  presence: `tenant:${tenantId}:kanban:${entityType}:presence`,

  // Item-level locks
  itemLock: `tenant:${tenantId}:kanban:${entityType}:item:${itemId}:lock`,
};

// Message types
interface KanbanWebSocketMessage {
  type: 'ITEM_MOVED' | 'ITEM_GRABBED' | 'ITEM_RELEASED' | 'CONFIG_UPDATED'
      | 'WIP_STATUS_CHANGED' | 'USER_JOINED' | 'USER_LEFT' | 'CURSOR_MOVED';
  tenantId: string;
  entityType: string;
  userId: string;
  userName: string;
  timestamp: string;
  data: unknown;
}

// Specific message payloads
interface ItemMovedMessage extends KanbanWebSocketMessage {
  type: 'ITEM_MOVED';
  data: {
    entityId: string;
    fromStageId: string;
    toStageId: string;
    newPosition: number;
    moveId: string;
  };
}

interface ItemGrabbedMessage extends KanbanWebSocketMessage {
  type: 'ITEM_GRABBED';
  data: {
    entityId: string;
    lockExpiresAt: string;
  };
}

interface UserPresenceMessage extends KanbanWebSocketMessage {
  type: 'USER_JOINED' | 'USER_LEFT';
  data: {
    activeUsers: Array<{
      id: string;
      name: string;
      avatar?: string;
      currentStage?: string;
    }>;
  };
}
```

### Conflict Resolution Strategy

```typescript
// Optimistic Locking Implementation

interface LockAcquisitionResult {
  success: boolean;
  lockId?: string;
  expiresAt?: Date;
  conflictingUser?: {
    id: string;
    name: string;
    lockedAt: Date;
  };
}

class KanbanLockService {
  private readonly LOCK_DURATION_MS = 30000; // 30 seconds
  private readonly LOCK_EXTENSION_MS = 10000; // 10 seconds before expiry

  async acquireLock(
    tenantId: string,
    entityType: string,
    entityId: string,
    userId: string,
    sessionId: string
  ): Promise<LockAcquisitionResult> {
    // Try to acquire lock with INSERT ... ON CONFLICT
    const result = await this.db.execute(sql`
      INSERT INTO kanban_locks (entity_type, entity_id, tenant_id, locked_by, locked_at, expires_at, session_id)
      VALUES (${entityType}, ${entityId}, ${tenantId}, ${userId}, NOW(), NOW() + INTERVAL '30 seconds', ${sessionId})
      ON CONFLICT (entity_type, entity_id)
      DO UPDATE SET
        locked_by = CASE
          WHEN kanban_locks.expires_at < NOW() THEN EXCLUDED.locked_by
          WHEN kanban_locks.locked_by = ${userId} THEN EXCLUDED.locked_by
          ELSE kanban_locks.locked_by
        END,
        locked_at = CASE
          WHEN kanban_locks.expires_at < NOW() THEN NOW()
          WHEN kanban_locks.locked_by = ${userId} THEN NOW()
          ELSE kanban_locks.locked_at
        END,
        expires_at = CASE
          WHEN kanban_locks.expires_at < NOW() THEN NOW() + INTERVAL '30 seconds'
          WHEN kanban_locks.locked_by = ${userId} THEN NOW() + INTERVAL '30 seconds'
          ELSE kanban_locks.expires_at
        END,
        session_id = CASE
          WHEN kanban_locks.expires_at < NOW() THEN EXCLUDED.session_id
          WHEN kanban_locks.locked_by = ${userId} THEN EXCLUDED.session_id
          ELSE kanban_locks.session_id
        END
      RETURNING locked_by, expires_at, session_id
    `);

    if (result.locked_by === userId) {
      return {
        success: true,
        lockId: `${entityType}:${entityId}`,
        expiresAt: result.expires_at,
      };
    }

    // Lock held by another user
    const conflictingUser = await this.getUser(result.locked_by);
    return {
      success: false,
      conflictingUser: {
        id: result.locked_by,
        name: conflictingUser.fullName,
        lockedAt: result.locked_at,
      },
    };
  }

  async releaseLock(
    entityType: string,
    entityId: string,
    userId: string
  ): Promise<boolean> {
    const result = await this.db.execute(sql`
      DELETE FROM kanban_locks
      WHERE entity_type = ${entityType}
        AND entity_id = ${entityId}
        AND locked_by = ${userId}
    `);

    return result.rowCount > 0;
  }

  // Background job: Clean expired locks every minute
  async cleanExpiredLocks(): Promise<number> {
    const result = await this.db.execute(sql`
      DELETE FROM kanban_locks
      WHERE expires_at < NOW()
    `);

    return result.rowCount;
  }
}
```

### Frontend Real-time Integration

```typescript
// hooks/use-kanban-realtime.ts

export function useKanbanRealtime(
  entityType: KanbanEntityType,
  options: {
    onItemMoved?: (data: ItemMovedData) => void;
    onItemGrabbed?: (data: ItemGrabbedData) => void;
    onItemReleased?: (data: ItemReleasedData) => void;
    onUserJoined?: (data: UserPresenceData) => void;
    onUserLeft?: (data: UserPresenceData) => void;
    onConflict?: (data: ConflictData) => void;
  }
) {
  const { tenantId, userId, userName } = useAuth();
  const wsRef = useRef<WebSocket | null>(null);
  const [activeUsers, setActiveUsers] = useState<ActiveUser[]>([]);
  const [lockedItems, setLockedItems] = useState<Map<string, LockInfo>>(new Map());

  useEffect(() => {
    const channel = `tenant:${tenantId}:kanban:${entityType}`;
    const ws = new WebSocket(`${WS_URL}?channel=${channel}&userId=${userId}`);

    ws.onmessage = (event) => {
      const message: KanbanWebSocketMessage = JSON.parse(event.data);

      switch (message.type) {
        case 'ITEM_MOVED':
          // Skip if this is our own move (already applied optimistically)
          if (message.userId !== userId) {
            options.onItemMoved?.(message.data);
          }
          break;

        case 'ITEM_GRABBED':
          setLockedItems(prev => new Map(prev).set(message.data.entityId, {
            userId: message.userId,
            userName: message.userName,
            expiresAt: new Date(message.data.lockExpiresAt),
          }));
          options.onItemGrabbed?.(message.data);
          break;

        case 'ITEM_RELEASED':
          setLockedItems(prev => {
            const next = new Map(prev);
            next.delete(message.data.entityId);
            return next;
          });
          options.onItemReleased?.(message.data);
          break;

        case 'USER_JOINED':
        case 'USER_LEFT':
          setActiveUsers(message.data.activeUsers);
          break;
      }
    };

    ws.onopen = () => {
      // Announce presence
      ws.send(JSON.stringify({
        type: 'PRESENCE_JOIN',
        userId,
        userName,
      }));
    };

    wsRef.current = ws;

    return () => {
      ws.close();
    };
  }, [tenantId, entityType, userId]);

  // Broadcast when starting drag
  const broadcastGrab = useCallback((entityId: string) => {
    wsRef.current?.send(JSON.stringify({
      type: 'ITEM_GRAB',
      entityId,
    }));
  }, []);

  // Broadcast when releasing drag
  const broadcastRelease = useCallback((entityId: string) => {
    wsRef.current?.send(JSON.stringify({
      type: 'ITEM_RELEASE',
      entityId,
    }));
  }, []);

  return {
    activeUsers,
    lockedItems,
    isItemLocked: (entityId: string) => lockedItems.has(entityId) && lockedItems.get(entityId)!.userId !== userId,
    getItemLockInfo: (entityId: string) => lockedItems.get(entityId),
    broadcastGrab,
    broadcastRelease,
  };
}
```

---

## 7. Security & RBAC

### Permission Matrix

| Permission | Owner | Admin | Manager | Sales Rep | Viewer |
|------------|-------|-------|---------|-----------|--------|
| kanban:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| kanban:move | ✅ | ✅ | ✅ | ✅* | ❌ |
| kanban:move:all | ✅ | ✅ | ✅ | ❌ | ❌ |
| kanban:undo | ✅ | ✅ | ✅ | ✅* | ❌ |
| kanban:undo:all | ✅ | ✅ | ❌ | ❌ | ❌ |
| kanban:config:wip | ✅ | ✅ | ✅ | ❌ | ❌ |
| kanban:force-wip | ✅ | ✅ | ❌ | ❌ | ❌ |
| kanban:config:transitions | ✅ | ✅ | ❌ | ❌ | ❌ |
| kanban:bulk-move | ✅ | ✅ | ✅ | ❌ | ❌ |
| kanban:snapshot:create | ✅ | ✅ | ✅ | ❌ | ❌ |
| kanban:snapshot:restore | ✅ | ✅ | ❌ | ❌ | ❌ |
| kanban:metrics:view | ✅ | ✅ | ✅ | ✅ | ✅ |
| kanban:metrics:export | ✅ | ✅ | ✅ | ❌ | ❌ |

*Sales Rep can only move/undo their own assigned items

### Permission Enforcement

```typescript
// infrastructure/auth/kanban-permissions.ts

export const KANBAN_PERMISSIONS = {
  VIEW: 'kanban:view',
  MOVE: 'kanban:move',
  MOVE_ALL: 'kanban:move:all',
  UNDO: 'kanban:undo',
  UNDO_ALL: 'kanban:undo:all',
  CONFIG_WIP: 'kanban:config:wip',
  FORCE_WIP: 'kanban:force-wip',
  CONFIG_TRANSITIONS: 'kanban:config:transitions',
  BULK_MOVE: 'kanban:bulk-move',
  SNAPSHOT_CREATE: 'kanban:snapshot:create',
  SNAPSHOT_RESTORE: 'kanban:snapshot:restore',
  METRICS_VIEW: 'kanban:metrics:view',
  METRICS_EXPORT: 'kanban:metrics:export',
} as const;

export class KanbanPermissionService {
  async canMoveItem(
    tenantId: string,
    userId: string,
    entityType: string,
    entityId: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    const membership = await this.getMembership(tenantId, userId);

    if (!membership) {
      return { allowed: false, reason: 'User not member of tenant' };
    }

    // Check if user has move:all permission
    if (this.hasPermission(membership, KANBAN_PERMISSIONS.MOVE_ALL)) {
      return { allowed: true };
    }

    // Check if user has basic move permission
    if (!this.hasPermission(membership, KANBAN_PERMISSIONS.MOVE)) {
      return { allowed: false, reason: 'No permission to move items' };
    }

    // For sales reps, check item ownership
    if (membership.role === 'sales_rep') {
      const entity = await this.getEntity(entityType, entityId);

      if (entity.ownerId !== userId && entity.assignedTo !== userId) {
        return { allowed: false, reason: 'Can only move assigned items' };
      }
    }

    return { allowed: true };
  }

  async canForceWipOverride(
    tenantId: string,
    userId: string
  ): Promise<boolean> {
    const membership = await this.getMembership(tenantId, userId);
    return this.hasPermission(membership, KANBAN_PERMISSIONS.FORCE_WIP);
  }

  async getMovableStages(
    tenantId: string,
    userId: string,
    entityType: string,
    currentStageId: string
  ): Promise<string[]> {
    const membership = await this.getMembership(tenantId, userId);
    const config = await this.getKanbanConfig(tenantId, entityType);

    // Get all stages
    const allStages = config.stageOrder;

    // Filter by transition rules
    const allowedByTransition = allStages.filter(stageId => {
      const transitionKey = `${currentStageId}_${stageId}`;
      const rule = config.transitions[transitionKey];
      return rule !== 'blocked';
    });

    // Apply role-based restrictions
    if (membership.role === 'sales_rep') {
      // Sales reps might have stage restrictions
      const roleStageAccess = membership.metadata?.stageAccess || allStages;
      return allowedByTransition.filter(s => roleStageAccess.includes(s));
    }

    return allowedByTransition;
  }
}
```

### Feature Flags

```typescript
// config/feature-flags.ts

export interface KanbanFeatureFlags {
  // Core features
  enableUndo: boolean;
  enableRedo: boolean;
  maxUndoHistory: number;

  // WIP features
  enableWipSoftLimits: boolean;
  enableWipHardLimits: boolean;
  allowWipOverride: boolean;

  // Real-time features
  enableRealtime: boolean;
  enablePresence: boolean;
  enableCursorTracking: boolean;

  // Advanced features
  enableBulkOperations: boolean;
  maxBulkItems: number;
  enableSnapshots: boolean;
  snapshotRetentionDays: number;

  // Analytics
  enableMetrics: boolean;
  enableMetricsExport: boolean;
}

export const DEFAULT_KANBAN_FLAGS: KanbanFeatureFlags = {
  enableUndo: true,
  enableRedo: true,
  maxUndoHistory: 50,

  enableWipSoftLimits: true,
  enableWipHardLimits: true,
  allowWipOverride: true,

  enableRealtime: true,
  enablePresence: true,
  enableCursorTracking: false,

  enableBulkOperations: true,
  maxBulkItems: 100,
  enableSnapshots: true,
  snapshotRetentionDays: 90,

  enableMetrics: true,
  enableMetricsExport: true,
};

// Feature flags can be overridden per tenant via tenant.settings
export function getKanbanFlags(tenant: Tenant): KanbanFeatureFlags {
  const tenantFlags = tenant.settings?.kanbanFlags || {};
  return { ...DEFAULT_KANBAN_FLAGS, ...tenantFlags };
}
```

### Backend Validation

```typescript
// application/validators/kanban-move.validator.ts

export class KanbanMoveValidator {
  async validate(
    command: MoveKanbanItemCommand,
    context: CommandContext
  ): Promise<Result<void, ValidationError>> {
    const errors: ValidationError[] = [];

    // 1. Permission check
    const permissionResult = await this.permissionService.canMoveItem(
      context.tenantId,
      context.userId,
      command.entityType,
      command.entityId
    );

    if (!permissionResult.allowed) {
      return Result.fail(new ForbiddenError(permissionResult.reason));
    }

    // 2. Entity existence check
    const entity = await this.getEntity(command.entityType, command.entityId);
    if (!entity) {
      return Result.fail(new NotFoundError('Entity not found'));
    }

    // 3. Verify current stage matches
    if (entity.stageId !== command.fromStageId) {
      return Result.fail(new ConflictError(
        'Entity has been moved by another user',
        { currentStage: entity.stageId, expectedStage: command.fromStageId }
      ));
    }

    // 4. Transition validation
    const transitionResult = await this.validateTransition(
      context.tenantId,
      command.entityType,
      command.fromStageId,
      command.toStageId
    );

    if (transitionResult.type === 'blocked') {
      return Result.fail(new ValidationError(
        'TRANSITION_BLOCKED',
        transitionResult.reasonEs || transitionResult.reason
      ));
    }

    if (transitionResult.type === 'requires_data' && !command.reason) {
      return Result.fail(new ValidationError(
        'REASON_REQUIRED',
        'Esta transición requiere una razón'
      ));
    }

    // 5. WIP limit check
    const wipStatus = await this.getWipStatus(
      context.tenantId,
      command.entityType,
      command.toStageId
    );

    if (wipStatus.level === 'blocked') {
      if (!command.forceWipOverride) {
        return Result.fail(new ValidationError(
          'WIP_LIMIT_EXCEEDED',
          `Límite WIP alcanzado: ${wipStatus.current}/${wipStatus.hardLimit}`
        ));
      }

      // Check force override permission
      const canForce = await this.permissionService.canForceWipOverride(
        context.tenantId,
        context.userId
      );

      if (!canForce) {
        return Result.fail(new ForbiddenError(
          'No tiene permiso para forzar el límite WIP'
        ));
      }
    }

    // 6. Lock check (for concurrent access)
    const lockStatus = await this.lockService.checkLock(
      command.entityType,
      command.entityId,
      context.userId
    );

    if (lockStatus.isLocked && lockStatus.lockedBy !== context.userId) {
      return Result.fail(new ConflictError(
        `Item está siendo editado por ${lockStatus.userName}`,
        { lockedBy: lockStatus.lockedBy, expiresAt: lockStatus.expiresAt }
      ));
    }

    return Result.ok();
  }
}
```

---

## 8. Performance & Scalability

### Board Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         BOARD LOADING STRATEGY                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

  Initial Load (Optimized)              Progressive Loading
         │                                    │
         ▼                                    ▼
  ┌─────────────────┐                ┌─────────────────┐
  │ Load first 50   │                │ User scrolls    │
  │ items per column│                │ in column       │
  └────────┬────────┘                └────────┬────────┘
           │                                   │
           ▼                                   ▼
  ┌─────────────────┐                ┌─────────────────┐
  │ Show skeleton   │                │ Fetch next page │
  │ for rest        │                │ (cursor-based)  │
  └────────┬────────┘                └────────┬────────┘
           │                                   │
           ▼                                   ▼
  ┌─────────────────┐                ┌─────────────────┐
  │ Render with     │                │ Append to       │
  │ virtualization  │                │ virtual list    │
  └─────────────────┘                └─────────────────┘


  Data Structure for Large Boards:
  ┌────────────────────────────────────────────────────────────────┐
  │  Column: "New" (523 items total)                               │
  │  ┌──────────────────────────────────────────────────────────┐  │
  │  │  Visible Window (15 items)                               │  │
  │  │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐ ... ┌────┐ ┌────┐  │  │
  │  │  │ 1  │ │ 2  │ │ 3  │ │ 4  │ │ 5  │     │ 14 │ │ 15 │  │  │
  │  │  └────┘ └────┘ └────┘ └────┘ └────┘ ... └────┘ └────┘  │  │
  │  └──────────────────────────────────────────────────────────┘  │
  │  ┌──────────────────────────────────────────────────────────┐  │
  │  │  Buffer Above (5 items)  │  Buffer Below (5 items)       │  │
  │  └──────────────────────────────────────────────────────────┘  │
  │  ┌──────────────────────────────────────────────────────────┐  │
  │  │  Not Rendered: 498 items (IDs only in memory)            │  │
  │  └──────────────────────────────────────────────────────────┘  │
  └────────────────────────────────────────────────────────────────┘
```

### Query Optimization

```typescript
// Optimized board query with pagination
export class KanbanQueryService {
  async getBoard(
    tenantId: string,
    entityType: KanbanEntityType,
    options: {
      pageSize?: number;
      includeMetadata?: boolean;
      stageFilters?: string[];
    } = {}
  ): Promise<KanbanBoardData> {
    const { pageSize = 50, includeMetadata = true } = options;

    // Get config first (usually cached)
    const config = await this.getCachedConfig(tenantId, entityType);

    // Parallel queries for each stage
    const stageQueries = config.stageOrder.map(stageId =>
      this.getStageItems(tenantId, entityType, stageId, {
        limit: pageSize,
        includeCount: true,
      })
    );

    const stageResults = await Promise.all(stageQueries);

    // Build response
    return {
      entityType,
      stages: stageResults.map((result, index) => ({
        id: config.stageOrder[index],
        items: result.items,
        pagination: {
          page: 1,
          pageSize,
          total: result.totalCount,
          hasMore: result.totalCount > pageSize,
          cursor: result.nextCursor,
        },
        wipStatus: this.calculateWipStatus(
          result.totalCount,
          config.wipLimits[config.stageOrder[index]]
        ),
      })),
      config: {
        wipLimits: config.wipLimits,
        collapsedColumns: config.collapsedColumns,
        stageOrder: config.stageOrder,
        version: config.version,
      },
    };
  }

  private async getStageItems(
    tenantId: string,
    entityType: KanbanEntityType,
    stageId: string,
    options: { limit: number; cursor?: string; includeCount?: boolean }
  ) {
    const table = this.getTableForEntity(entityType);
    const stageColumn = this.getStageColumn(entityType);

    // Use cursor-based pagination for performance
    const query = this.db
      .select()
      .from(table)
      .where(and(
        eq(table.tenantId, tenantId),
        eq(table[stageColumn], stageId),
        options.cursor ? gt(table.id, options.cursor) : undefined
      ))
      .orderBy(table.position, table.createdAt)
      .limit(options.limit + 1); // +1 to check hasMore

    const items = await query;
    const hasMore = items.length > options.limit;

    if (hasMore) {
      items.pop(); // Remove extra item
    }

    let totalCount = items.length;
    if (options.includeCount) {
      const countResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(table)
        .where(and(
          eq(table.tenantId, tenantId),
          eq(table[stageColumn], stageId)
        ));
      totalCount = countResult[0].count;
    }

    return {
      items,
      totalCount,
      nextCursor: hasMore ? items[items.length - 1].id : undefined,
    };
  }
}
```

### Caching Strategy

```typescript
// infrastructure/cache/kanban-cache.service.ts

export class KanbanCacheService {
  private readonly CONFIG_TTL = 300; // 5 minutes
  private readonly BOARD_TTL = 60;   // 1 minute
  private readonly METRICS_TTL = 300; // 5 minutes

  // Cache keys
  private configKey(tenantId: string, entityType: string) {
    return `kanban:config:${tenantId}:${entityType}`;
  }

  private boardKey(tenantId: string, entityType: string, stageId?: string) {
    const base = `kanban:board:${tenantId}:${entityType}`;
    return stageId ? `${base}:${stageId}` : base;
  }

  private metricsKey(tenantId: string, entityType: string, period: string) {
    return `kanban:metrics:${tenantId}:${entityType}:${period}`;
  }

  // Get config with cache
  async getConfig(
    tenantId: string,
    entityType: string
  ): Promise<KanbanConfig> {
    const key = this.configKey(tenantId, entityType);

    // Try cache first
    const cached = await this.redis.get(key);
    if (cached) {
      return JSON.parse(cached);
    }

    // Fetch from DB
    const config = await this.repository.getConfig(tenantId, entityType);

    // Cache for 5 minutes
    await this.redis.setex(key, this.CONFIG_TTL, JSON.stringify(config));

    return config;
  }

  // Invalidate on config update
  async invalidateConfig(tenantId: string, entityType: string) {
    const key = this.configKey(tenantId, entityType);
    await this.redis.del(key);

    // Also invalidate board cache as it depends on config
    const boardPattern = `kanban:board:${tenantId}:${entityType}:*`;
    const keys = await this.redis.keys(boardPattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }

  // Invalidate specific stage on move
  async invalidateStage(
    tenantId: string,
    entityType: string,
    ...stageIds: string[]
  ) {
    const keys = stageIds.map(id => this.boardKey(tenantId, entityType, id));
    await this.redis.del(...keys);
  }
}
```

### Batch Operations

```typescript
// application/handlers/bulk-move.handler.ts

export class BulkMoveKanbanItemsHandler {
  async handle(command: BulkMoveKanbanItemsCommand): Promise<Result<BulkMoveResult>> {
    const { tenantId, entityType, moves, createSnapshot } = command;

    // 1. Create snapshot before bulk operation
    let snapshotId: string | undefined;
    if (createSnapshot) {
      snapshotId = await this.snapshotService.create(
        tenantId,
        entityType,
        'before_bulk_operation'
      );
    }

    // 2. Group moves by target stage for batch validation
    const movesByTarget = this.groupBy(moves, m => m.toStageId);

    // 3. Validate WIP limits for all targets
    const wipValidations = await Promise.all(
      Object.entries(movesByTarget).map(async ([stageId, stageMoves]) => {
        const wipStatus = await this.wipService.getStatus(tenantId, entityType, stageId);
        const newCount = wipStatus.current + stageMoves.length;

        return {
          stageId,
          valid: newCount <= wipStatus.hardLimit,
          newCount,
          limit: wipStatus.hardLimit,
        };
      })
    );

    const wipBlocked = wipValidations.filter(v => !v.valid);
    if (wipBlocked.length > 0 && !command.forceWipOverride) {
      return Result.fail(new ValidationError(
        'WIP_LIMIT_EXCEEDED',
        `Bulk move would exceed WIP limits: ${wipBlocked.map(b => b.stageId).join(', ')}`
      ));
    }

    // 4. Execute moves in transaction
    const results: BulkMoveItemResult[] = [];
    const batchId = uuid();

    await this.db.transaction(async (tx) => {
      for (const move of moves) {
        try {
          // Update entity
          await this.updateEntityStage(tx, entityType, move.entityId, move.toStageId);

          // Record move
          await tx.insert(kanbanMoves).values({
            tenantId,
            entityType,
            entityId: move.entityId,
            fromStageId: move.fromStageId,
            toStageId: move.toStageId,
            userId: command.userId,
            reason: command.reason,
            metadata: {
              batchId,
              source: 'bulk_operation',
            },
          });

          results.push({ entityId: move.entityId, success: true });
        } catch (error) {
          results.push({
            entityId: move.entityId,
            success: false,
            error: error.message,
          });
        }
      }

      // Insert single outbox event for bulk operation
      await tx.insert(outboxEvents).values({
        eventType: KanbanEventTypes.KANBAN_BULK_MOVE_COMPLETED,
        eventData: {
          batchId,
          totalMoves: moves.length,
          successfulMoves: results.filter(r => r.success).length,
          entityType,
        },
        tenantId,
        aggregateId: batchId,
      });
    });

    // 5. Broadcast updates
    await this.websocket.broadcast(tenantId, entityType, {
      type: 'BULK_MOVE_COMPLETED',
      batchId,
      moves: results.filter(r => r.success).map(r => ({
        entityId: r.entityId,
        toStageId: moves.find(m => m.entityId === r.entityId)!.toStageId,
      })),
    });

    return Result.ok({
      batchId,
      snapshotId,
      totalMoves: moves.length,
      successfulMoves: results.filter(r => r.success).length,
      failedMoves: results.filter(r => !r.success),
    });
  }
}
```

---

## 9. Observability & Metrics

### Metrics Schema

```typescript
// Metric types collected
interface KanbanMetrics {
  // Lead Time Metrics
  leadTime: {
    byStage: Record<string, {
      avg: number;
      median: number;
      p90: number;
      min: number;
      max: number;
    }>;
    overall: number;
  };

  // Throughput Metrics
  throughput: {
    byStage: Record<string, {
      entered: number;
      exited: number;
      netFlow: number;
    }>;
    daily: number;
    weekly: number;
  };

  // WIP Metrics
  wip: {
    byStage: Record<string, {
      current: number;
      avg: number;
      peak: number;
      blockedEvents: number;
      warningEvents: number;
    }>;
    overallUtilization: number;
  };

  // Quality Metrics
  quality: {
    undoRate: number;
    redoRate: number;
    reversalsByStage: Record<string, number>;
    avgMovesPerItem: number;
  };

  // User Activity
  activity: {
    byUser: Record<string, {
      totalMoves: number;
      uniqueItems: number;
      avgMovesPerDay: number;
    }>;
    peakHours: number[];
    quietHours: number[];
  };
}
```

### Metrics Aggregation Job

```typescript
// infrastructure/jobs/kanban-metrics.job.ts

export class KanbanMetricsAggregationJob {
  // Run hourly
  async aggregateHourly(tenantId: string, entityType: string) {
    const hourStart = startOfHour(new Date());
    const hourEnd = endOfHour(hourStart);

    // Get all moves in the hour
    const moves = await this.db
      .select()
      .from(kanbanMoves)
      .where(and(
        eq(kanbanMoves.tenantId, tenantId),
        eq(kanbanMoves.entityType, entityType),
        between(kanbanMoves.createdAt, hourStart, hourEnd)
      ));

    // Group by stage
    const byStage = this.groupBy(moves, m => m.toStageId);

    // Calculate metrics per stage
    for (const [stageId, stageMoves] of Object.entries(byStage)) {
      const leadTimes = await this.calculateLeadTimes(
        tenantId,
        entityType,
        stageId,
        stageMoves
      );

      await this.db.insert(kanbanMetrics).values({
        tenantId,
        entityType,
        stageId,
        periodStart: hourStart,
        periodEnd: hourEnd,
        periodType: 'hourly',
        avgLeadTimeSeconds: leadTimes.avg,
        medianLeadTimeSeconds: leadTimes.median,
        p90LeadTimeSeconds: leadTimes.p90,
        itemsEntered: stageMoves.length,
        itemsExited: moves.filter(m => m.fromStageId === stageId).length,
        wipBlockedCount: stageMoves.filter(m =>
          m.metadata?.validationType === 'forced'
        ).length,
        undoCount: stageMoves.filter(m => m.undoneAt !== null).length,
        metadata: {
          peakWipCount: await this.getPeakWip(tenantId, entityType, stageId, hourStart, hourEnd),
          userMoves: this.countByUser(stageMoves),
        },
      });
    }
  }

  private async calculateLeadTimes(
    tenantId: string,
    entityType: string,
    stageId: string,
    moves: KanbanMove[]
  ): Promise<{ avg: number; median: number; p90: number }> {
    // Get entry times for items that exited this stage
    const exitedEntityIds = moves
      .filter(m => m.fromStageId === stageId)
      .map(m => m.entityId);

    if (exitedEntityIds.length === 0) {
      return { avg: 0, median: 0, p90: 0 };
    }

    // Find when each item entered the stage
    const leadTimes: number[] = [];

    for (const entityId of exitedEntityIds) {
      const entryMove = await this.db
        .select()
        .from(kanbanMoves)
        .where(and(
          eq(kanbanMoves.tenantId, tenantId),
          eq(kanbanMoves.entityType, entityType),
          eq(kanbanMoves.entityId, entityId),
          eq(kanbanMoves.toStageId, stageId)
        ))
        .orderBy(desc(kanbanMoves.createdAt))
        .limit(1);

      const exitMove = moves.find(m =>
        m.entityId === entityId && m.fromStageId === stageId
      );

      if (entryMove[0] && exitMove) {
        const leadTimeSeconds = Math.floor(
          (exitMove.createdAt.getTime() - entryMove[0].createdAt.getTime()) / 1000
        );
        leadTimes.push(leadTimeSeconds);
      }
    }

    if (leadTimes.length === 0) {
      return { avg: 0, median: 0, p90: 0 };
    }

    leadTimes.sort((a, b) => a - b);

    return {
      avg: Math.floor(leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length),
      median: leadTimes[Math.floor(leadTimes.length / 2)],
      p90: leadTimes[Math.floor(leadTimes.length * 0.9)],
    };
  }
}
```

### Analytics Dashboard API

```typescript
// GET /api/v1/kanban/analytics/:entityType

interface KanbanAnalyticsResponse {
  summary: {
    period: {
      start: string;
      end: string;
      type: 'daily' | 'weekly' | 'monthly';
    };

    // Key metrics
    totalMoves: number;
    avgLeadTimeHours: number;
    throughputPerDay: number;
    wipUtilization: number;
    undoRate: number;

    // Comparison to previous period
    trends: {
      moves: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
      leadTime: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
      throughput: { value: number; change: number; trend: 'up' | 'down' | 'stable' };
    };
  };

  bottlenecks: Array<{
    stageId: string;
    stageName: string;
    score: number; // 0-100, higher = more bottleneck
    indicators: {
      avgLeadTime: number;
      wipBlockedEvents: number;
      queueLength: number;
    };
    recommendation: string;
  }>;

  stagePerformance: Array<{
    stageId: string;
    stageName: string;
    metrics: {
      avgLeadTimeHours: number;
      itemsProcessed: number;
      wipUtilization: number;
      efficiency: number; // 0-100
    };
    trend: 'improving' | 'stable' | 'declining';
  }>;

  userActivity: Array<{
    userId: string;
    userName: string;
    totalMoves: number;
    avgMovesPerDay: number;
    mostActiveStage: string;
  }>;

  timeSeries: {
    labels: string[];
    datasets: {
      moves: number[];
      avgLeadTime: number[];
      wipBlocked: number[];
    };
  };

  export: {
    csvUrl: string;
    jsonUrl: string;
    pdfUrl: string;
  };
}
```

### Export Formats

```typescript
// infrastructure/export/kanban-export.service.ts

export class KanbanExportService {
  async exportToCsv(
    tenantId: string,
    entityType: string,
    options: ExportOptions
  ): Promise<string> {
    const metrics = await this.getMetrics(tenantId, entityType, options);

    const rows = [
      // Header
      ['Stage', 'Avg Lead Time (hrs)', 'Items Entered', 'Items Exited',
       'WIP Blocked', 'Throughput/Day', 'Efficiency %'].join(','),

      // Data rows
      ...metrics.stagePerformance.map(stage => [
        stage.stageName,
        stage.metrics.avgLeadTimeHours.toFixed(2),
        stage.metrics.itemsEntered,
        stage.metrics.itemsExited,
        stage.metrics.wipBlockedEvents,
        stage.metrics.throughputPerDay.toFixed(2),
        stage.metrics.efficiency.toFixed(1),
      ].join(',')),
    ];

    const csv = rows.join('\n');

    // Upload to storage and return URL
    const url = await this.storage.upload(
      `exports/${tenantId}/kanban-${entityType}-${Date.now()}.csv`,
      csv,
      'text/csv'
    );

    return url;
  }

  async exportToJson(
    tenantId: string,
    entityType: string,
    options: ExportOptions
  ): Promise<string> {
    const metrics = await this.getMetrics(tenantId, entityType, options);

    const url = await this.storage.upload(
      `exports/${tenantId}/kanban-${entityType}-${Date.now()}.json`,
      JSON.stringify(metrics, null, 2),
      'application/json'
    );

    return url;
  }
}
```

---

## 10. Technical Decisions

### Decision Log

| # | Decision | Rationale | Alternatives Considered |
|---|----------|-----------|------------------------|
| 1 | **PostgreSQL for event store** | Already used, JSONB support, transactional guarantees | MongoDB (rejected: different stack), EventStoreDB (rejected: additional infra) |
| 2 | **Outbox pattern for events** | Guarantees exactly-once delivery, atomic with business transaction | Direct publish (rejected: no atomicity), CDC (rejected: complexity) |
| 3 | **Cursor-based pagination** | Better performance for large datasets, stable ordering | Offset (rejected: performance degrades) |
| 4 | **Optimistic locking with short TTL** | Balances concurrency with user experience | Pessimistic (rejected: blocks too long), No locking (rejected: conflicts) |
| 5 | **WebSocket for real-time** | Already implemented, bidirectional, wide support | SSE (rejected: unidirectional), Polling (rejected: latency) |
| 6 | **Hourly metrics aggregation** | Balance between granularity and storage | Real-time (rejected: performance), Daily (rejected: not granular enough) |
| 7 | **Permission per operation** | Fine-grained control needed for enterprise | Role-only (rejected: not flexible enough) |
| 8 | **Snapshots every 100 moves** | Balance recovery speed with storage | Every move (rejected: storage), Never (rejected: slow recovery) |

### Scalability Considerations

| Scenario | Strategy |
|----------|----------|
| 10,000+ items per board | Virtualization + cursor pagination |
| 100+ concurrent users | WebSocket namespacing + Redis pub/sub |
| 1M+ moves per month | Metrics aggregation + archival policy |
| Multi-region | Read replicas + eventual consistency |

### Compliance Considerations

| Requirement | Implementation |
|-------------|----------------|
| Audit trail | kanban_moves + activity_logs with immutable design |
| Data retention | Configurable per tenant, default 2 years |
| GDPR | Soft delete + anonymization support |
| SOC 2 | Access logging, encryption at rest |

---

## Appendix A: Migration Scripts

```sql
-- Migration: 001_create_kanban_tables.sql

BEGIN;

-- Kanban configurations
CREATE TABLE IF NOT EXISTS kanban_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  wip_limits JSONB DEFAULT '{}',
  stage_order TEXT[] NOT NULL DEFAULT '{}',
  collapsed_columns TEXT[] DEFAULT '{}',
  transitions JSONB,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(tenant_id, entity_type)
);

CREATE INDEX idx_kanban_configs_tenant_entity ON kanban_configs(tenant_id, entity_type);

-- Kanban moves (event sourcing)
CREATE TABLE IF NOT EXISTS kanban_moves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  from_stage_id VARCHAR(100) NOT NULL,
  to_stage_id VARCHAR(100) NOT NULL,
  previous_position INTEGER,
  new_position INTEGER,
  user_id UUID NOT NULL REFERENCES users(id),
  reason TEXT,
  metadata JSONB DEFAULT '{}',
  undone_at TIMESTAMPTZ,
  undone_by UUID REFERENCES users(id),
  undo_move_id UUID REFERENCES kanban_moves(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kanban_moves_tenant_entity ON kanban_moves(tenant_id, entity_type, entity_id);
CREATE INDEX idx_kanban_moves_tenant_time ON kanban_moves(tenant_id, created_at DESC);
CREATE INDEX idx_kanban_moves_user_time ON kanban_moves(user_id, created_at DESC);
CREATE INDEX idx_kanban_moves_entity_time ON kanban_moves(entity_id, created_at DESC);

-- Kanban snapshots
CREATE TABLE IF NOT EXISTS kanban_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  board_state JSONB NOT NULL,
  version INTEGER NOT NULL,
  move_count INTEGER NOT NULL DEFAULT 0,
  reason VARCHAR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kanban_snapshots_tenant_entity_version
  ON kanban_snapshots(tenant_id, entity_type, version DESC);

-- Kanban metrics
CREATE TABLE IF NOT EXISTS kanban_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  entity_type VARCHAR(50) NOT NULL,
  stage_id VARCHAR(100) NOT NULL,
  period_start TIMESTAMPTZ NOT NULL,
  period_end TIMESTAMPTZ NOT NULL,
  period_type VARCHAR(20) NOT NULL,
  avg_lead_time_seconds INTEGER,
  median_lead_time_seconds INTEGER,
  p90_lead_time_seconds INTEGER,
  items_entered INTEGER NOT NULL DEFAULT 0,
  items_exited INTEGER NOT NULL DEFAULT 0,
  wip_blocked_count INTEGER NOT NULL DEFAULT 0,
  wip_warning_count INTEGER NOT NULL DEFAULT 0,
  undo_count INTEGER NOT NULL DEFAULT 0,
  redo_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_kanban_metrics_tenant_period
  ON kanban_metrics(tenant_id, entity_type, period_start DESC);
CREATE INDEX idx_kanban_metrics_stage_time
  ON kanban_metrics(tenant_id, stage_id, period_start DESC);

-- Kanban locks
CREATE TABLE IF NOT EXISTS kanban_locks (
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  locked_by UUID NOT NULL REFERENCES users(id),
  locked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  session_id VARCHAR(100),
  PRIMARY KEY (entity_type, entity_id)
);

CREATE INDEX idx_kanban_locks_expires ON kanban_locks(expires_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_kanban_config_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.version = OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_kanban_config_updated_at
  BEFORE UPDATE ON kanban_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_kanban_config_updated_at();

COMMIT;
```

---

## Appendix B: Environment Variables

```env
# Kanban Feature Flags
KANBAN_ENABLE_REALTIME=true
KANBAN_ENABLE_UNDO=true
KANBAN_MAX_UNDO_HISTORY=50
KANBAN_ENABLE_WIP_HARD_LIMITS=true
KANBAN_ENABLE_BULK_OPERATIONS=true
KANBAN_MAX_BULK_ITEMS=100
KANBAN_SNAPSHOT_RETENTION_DAYS=90
KANBAN_METRICS_ENABLED=true

# Performance
KANBAN_BOARD_PAGE_SIZE=50
KANBAN_LOCK_DURATION_SECONDS=30
KANBAN_CACHE_CONFIG_TTL=300
KANBAN_CACHE_BOARD_TTL=60

# WebSocket
KANBAN_WS_HEARTBEAT_INTERVAL=30000
KANBAN_WS_MAX_CONNECTIONS_PER_USER=3
```

---

*Document generated for Zuclubit CRM Enterprise*

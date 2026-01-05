# Kanban API Reference

## Base URL

```
/api/v1/kanban
```

## Authentication

All endpoints require:

```http
Authorization: Bearer <jwt_token>
x-tenant-id: <uuid>
x-user-id: <uuid>
```

## Endpoints

### Board Operations

#### GET /board/:entityType

Get full board state with all stages and items.

**Parameters:**
- `entityType` (path): `lead` | `opportunity` | `task` | `customer`
- `pageSize` (query, optional): Items per stage (default: 50)

**Response:**
```json
{
  "success": true,
  "data": {
    "entityType": "lead",
    "stages": [
      {
        "id": "new",
        "label": "Nuevo",
        "color": "#64748b",
        "order": 0,
        "wipStatus": {
          "current": 5,
          "softLimit": 20,
          "hardLimit": 30,
          "level": "normal",
          "percentage": 17
        },
        "items": [...],
        "pagination": {
          "page": 1,
          "pageSize": 50,
          "total": 5,
          "hasMore": false
        }
      }
    ],
    "config": {
      "wipLimits": { "new": { "softLimit": 20, "hardLimit": 30 } },
      "collapsedColumns": [],
      "stageOrder": ["new", "contacted", "qualified"],
      "version": 1
    },
    "permissions": {
      "canMove": true,
      "canConfigureWip": true,
      "canForceWip": true,
      "canUndo": true,
      "moveableStages": ["new", "contacted", "qualified"]
    },
    "metadata": {
      "lastUpdated": "2025-01-15T10:30:00Z",
      "activeUsers": 3,
      "undoAvailable": true,
      "redoAvailable": false
    }
  }
}
```

---

#### GET /stage/:entityType/:stageId

Get paginated items for a specific stage.

**Parameters:**
- `entityType` (path): Entity type
- `stageId` (path): Stage identifier
- `limit` (query, optional): Max items (default: 50)
- `cursor` (query, optional): Pagination cursor

**Response:**
```json
{
  "success": true,
  "data": {
    "items": [...],
    "total": 25,
    "nextCursor": "uuid-of-last-item"
  }
}
```

---

### Move Operations

#### POST /move

Execute an item move between stages.

**Request Body:**
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
    "idempotencyKey": "uuid"
  }
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "moveId": "uuid",
    "entityId": "uuid",
    "fromStageId": "new",
    "toStageId": "contacted",
    "newPosition": 0,
    "timestamp": "2025-01-15T10:30:00Z",
    "validation": {
      "type": "allowed"
    },
    "undoAvailable": true
  },
  "broadcast": {
    "channel": "tenant:uuid:kanban:lead",
    "event": "KANBAN_ITEM_MOVED"
  }
}
```

**Error Responses:**

| Status | Code | Description |
|--------|------|-------------|
| 409 | CONFLICT | Entity was moved by another user |
| 422 | TRANSITION_BLOCKED | Transition not allowed |
| 422 | WIP_LIMIT_EXCEEDED | Hard limit reached |
| 422 | REASON_REQUIRED | Transition requires reason |
| 404 | ENTITY_NOT_FOUND | Entity doesn't exist |

---

#### POST /undo

Undo the last move by the current user.

**Request Body:**
```json
{
  "entityType": "lead",
  "moveId": "uuid"  // Optional - defaults to last move
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "undoMoveId": "uuid",
    "originalMove": {
      "id": "uuid",
      "fromStageId": "new",
      "toStageId": "contacted"
    },
    "restoredTo": {
      "stageId": "new",
      "position": 0
    }
  }
}
```

---

#### POST /redo

Redo the last undone move.

**Request Body:**
```json
{
  "entityType": "lead"
}
```

**Response:** Same as POST /move

---

### Configuration

#### GET /config/:entityType

Get board configuration.

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "tenantId": "uuid",
    "entityType": "lead",
    "wipLimits": {
      "new": { "softLimit": 20, "hardLimit": 30, "warningThreshold": 15 },
      "contacted": { "softLimit": 15, "hardLimit": 25, "warningThreshold": 12 }
    },
    "stageOrder": ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"],
    "collapsedColumns": [],
    "transitions": {},
    "version": 1
  }
}
```

---

#### PUT /config/:entityType

Update board configuration (with optimistic locking).

**Request Body:**
```json
{
  "wipLimits": {
    "in_progress": { "softLimit": 5, "hardLimit": 8 }
  },
  "collapsedColumns": ["lost"],
  "stageOrder": ["new", "contacted", "qualified"],
  "expectedVersion": 1
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "version": 2,
    "wipLimits": { ... }
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": {
    "code": "VERSION_CONFLICT",
    "message": "Configuration was modified by another user"
  }
}
```

---

### History & Audit

#### GET /history/:entityType/:entityId

Get move history for a specific entity.

**Parameters:**
- `limit` (query, optional): Max results (default: 50)
- `offset` (query, optional): Pagination offset

**Response:**
```json
{
  "success": true,
  "data": {
    "moves": [
      {
        "id": "uuid",
        "fromStageId": "new",
        "toStageId": "contacted",
        "userId": "uuid",
        "reason": "Initial contact",
        "createdAt": "2025-01-15T10:30:00Z",
        "undoneAt": null
      }
    ],
    "total": 5
  }
}
```

---

#### GET /history/:entityType

Get board-level move history.

**Parameters:**
- `startDate` (query, optional): Filter start
- `endDate` (query, optional): Filter end
- `limit` (query, optional): Max results (default: 100)
- `offset` (query, optional): Pagination offset

---

### Locking

#### POST /lock/:entityType/:entityId

Acquire a pessimistic lock on an item.

**Request Body:**
```json
{
  "sessionId": "browser-session-id"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "locked": true,
    "expiresAt": "2025-01-15T10:30:30Z"
  }
}
```

**Response (Conflict):**
```json
{
  "success": false,
  "error": {
    "code": "LOCK_CONFLICT",
    "message": "Item is locked by another user",
    "conflictingUser": "uuid"
  }
}
```

---

#### DELETE /lock/:entityType/:entityId

Release a lock.

**Response:**
```json
{
  "success": true,
  "data": {
    "released": true
  }
}
```

---

### Snapshots

#### POST /snapshot/:entityType

Create a manual board snapshot.

**Request Body:**
```json
{
  "reason": "Before bulk import"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "snapshotId": "uuid",
    "version": 5,
    "moveCount": 42
  }
}
```

---

### Metrics (Enterprise)

#### GET /metrics/:entityType

Get aggregated metrics dashboard.

**Parameters:**
- `periodType` (query, optional): `hourly` | `daily` | `weekly` (default: daily)
- `limit` (query, optional): Periods to include (default: 7)

**Response:**
```json
{
  "success": true,
  "data": {
    "stages": [
      {
        "stageId": "new",
        "label": "Nuevo",
        "metrics": {
          "avgLeadTimeSeconds": 86400,
          "medianLeadTimeSeconds": 72000,
          "p90LeadTimeSeconds": 172800,
          "itemsEntered": 25,
          "itemsExited": 20,
          "throughput": 20,
          "peakWipCount": 8,
          "avgWipCount": 5,
          "wipBlockedCount": 0,
          "wipWarningCount": 2,
          "undoCount": 1,
          "redoCount": 0,
          "bottleneckScore": 0.35
        }
      }
    ],
    "totals": {
      "totalThroughput": 45,
      "avgLeadTime": 64800,
      "totalWipViolations": 3,
      "bottlenecks": ["qualified"]
    }
  }
}
```

---

#### POST /metrics/:entityType/calculate

Calculate and store metrics for a period.

**Request Body:**
```json
{
  "periodType": "daily",
  "periodStart": "2025-01-14T00:00:00Z"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "calculated": 7,
    "metrics": [...]
  }
}
```

---

### Consistency (Enterprise)

#### GET /consistency/:entityType

Verify event sourcing consistency.

**Response:**
```json
{
  "success": true,
  "data": {
    "isConsistent": true,
    "discrepancies": []
  }
}
```

Or with issues:
```json
{
  "success": true,
  "data": {
    "isConsistent": false,
    "discrepancies": [
      {
        "entityId": "uuid",
        "expected": "contacted",
        "actual": "new"
      }
    ]
  }
}
```

---

#### POST /consistency/:entityType/repair

Repair consistency for a specific entity.

**Request Body:**
```json
{
  "entityId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "repaired": true,
    "newStage": "contacted"
  }
}
```

---

## WebSocket Events

### Connection

```javascript
const ws = new WebSocket('wss://api.example.com/ws?token=jwt&tenantId=uuid');
```

### Subscribe

```json
{
  "type": "subscribe",
  "subscription": {
    "type": "kanban",
    "entityType": "lead"
  }
}
```

### Events

#### KANBAN_ITEM_MOVED

```json
{
  "type": "KANBAN_ITEM_MOVED",
  "payload": {
    "entityId": "uuid",
    "entityType": "lead",
    "fromStageId": "new",
    "toStageId": "contacted",
    "moveId": "uuid",
    "userId": "uuid",
    "timestamp": "2025-01-15T10:30:00Z"
  }
}
```

#### KANBAN_WIP_WARNING

```json
{
  "type": "KANBAN_WIP_WARNING",
  "payload": {
    "entityType": "lead",
    "stageId": "qualified",
    "current": 18,
    "softLimit": 20,
    "hardLimit": 30,
    "level": "warning"
  }
}
```

#### KANBAN_LOCK_ACQUIRED

```json
{
  "type": "KANBAN_LOCK_ACQUIRED",
  "payload": {
    "entityType": "lead",
    "entityId": "uuid",
    "lockedBy": "uuid",
    "expiresAt": "2025-01-15T10:30:30Z"
  }
}
```

---

## Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| HEADERS_REQUIRED | 400 | Missing tenant/user headers |
| INVALID_ENTITY_TYPE | 400 | Invalid entity type |
| INVALID_STAGE | 400 | Invalid stage ID |
| UNAUTHORIZED | 401 | Invalid or missing auth |
| FORBIDDEN | 403 | Insufficient permissions |
| ENTITY_NOT_FOUND | 404 | Entity doesn't exist |
| CONFLICT | 409 | Optimistic lock conflict |
| LOCK_CONFLICT | 409 | Pessimistic lock held |
| TRANSITION_BLOCKED | 422 | Transition not allowed |
| WIP_LIMIT_EXCEEDED | 422 | Hard WIP limit reached |
| REASON_REQUIRED | 422 | Reason required for transition |
| NO_UNDO_AVAILABLE | 422 | No moves to undo |
| NO_REDO_AVAILABLE | 422 | No moves to redo |
| ALREADY_UNDONE | 422 | Move already undone |
| VERSION_CONFLICT | 422 | Config version mismatch |
| INTERNAL_ERROR | 500 | Unexpected server error |

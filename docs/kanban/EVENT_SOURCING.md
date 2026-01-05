# Kanban Event Sourcing

## Overview

The Kanban Enterprise system uses event sourcing to maintain a complete, immutable audit trail of all board changes. Every item movement is recorded as an event, enabling:

- **Complete Audit Trail** - Who moved what, when, and why
- **Undo/Redo** - Deterministic reversal of operations
- **Time Travel** - Reconstruct board state at any point in time
- **Compliance** - Full traceability for regulated environments

## Event Model

### Move Event Structure

```typescript
interface KanbanMoveEvent {
  id: string;                    // UUID
  tenantId: string;              // Tenant isolation
  entityType: 'lead' | 'opportunity' | 'task' | 'customer';
  entityId: string;              // UUID of moved item
  fromStageId: string;           // Source stage
  toStageId: string;             // Destination stage
  userId: string;                // Actor who performed move
  reason?: string;               // Optional narrative
  metadata: {
    source: 'drag' | 'keyboard' | 'dialog' | 'api' | 'automation';
    ipAddress?: string;
    userAgent?: string;
    validationType: 'allowed' | 'warning' | 'forced';
    wipOverride?: boolean;
    idempotencyKey?: string;
    batchId?: string;
  };
  undoneAt?: Date;               // When this event was undone
  undoneBy?: string;             // Who undid the event
  undoMoveId?: string;           // Links to original if this is an undo
  createdAt: Date;
}
```

## Move Flow

```
┌──────────────────────────────────────────────────────────────────────┐
│                         Move Request                                 │
│  { entityType, entityId, fromStageId, toStageId, reason?, ... }     │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    1. Transition Validation                          │
│  • Check custom transition rules (allowed/warning/blocked)           │
│  • Return early if blocked                                           │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                      2. WIP Limit Check                              │
│  • Get current count in target stage                                 │
│  • Check against soft/hard limits                                    │
│  • Allow override with forceWipOverride flag                         │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   3. Optimistic Lock Check                           │
│  • Verify entity exists                                              │
│  • Verify entity is in expected fromStageId                          │
│  • Return CONFLICT if moved by another user                          │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    4. Transaction (Atomic)                           │
│  ┌────────────────────────────────────────────────────────────────┐ │
│  │ UPDATE entity SET stage = toStageId                            │ │
│  │ INSERT INTO kanban_moves (event data)                          │ │
│  │ INSERT INTO outbox_events (for async processing)               │ │
│  │ INSERT INTO activity_logs (audit trail)                        │ │
│  └────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌──────────────────────────────────────────────────────────────────────┐
│                    5. Real-time Broadcast                            │
│  • Publish KANBAN_ITEM_MOVED to WebSocket                            │
│  • Broadcast to tenant:${tenantId}:kanban:${entityType}              │
└──────────────────────────────────────────────────────────────────────┘
```

## Undo/Redo Implementation

### Undo Flow

```typescript
async undoMove(tenantId, userId, entityType, moveId?) {
  // 1. Get the move to undo (last move by user, or specific moveId)
  const moveToUndo = await getLastMoveByUser(tenantId, entityType, userId);

  // 2. Validate
  if (!moveToUndo) throw Error('NO_UNDO_AVAILABLE');
  if (moveToUndo.undoneAt) throw Error('ALREADY_UNDONE');

  // 3. Execute reverse move in transaction
  await db.transaction(async (tx) => {
    // Update entity back to original stage
    await updateEntityStage(tx, entityType, moveToUndo.entityId, moveToUndo.fromStageId);

    // Mark original move as undone
    await tx.update(kanbanMoves)
      .set({ undoneAt: now, undoneBy: userId })
      .where(eq(kanbanMoves.id, moveToUndo.id));

    // Record the undo as a new move (for redo capability)
    await tx.insert(kanbanMoves).values({
      id: undoMoveId,
      tenantId,
      entityType,
      entityId: moveToUndo.entityId,
      fromStageId: moveToUndo.toStageId,  // Reverse direction
      toStageId: moveToUndo.fromStageId,
      userId,
      reason: 'Undo',
      undoMoveId: moveToUndo.id,  // Link to original
    });
  });
}
```

### Redo Flow

```typescript
async redoMove(tenantId, userId, entityType) {
  // 1. Find last undone move
  const lastUndo = await getLastUndoByUser(tenantId, entityType, userId);

  // 2. Validate
  if (!lastUndo) throw Error('NO_REDO_AVAILABLE');

  // 3. Re-execute the original move
  return moveItem(tenantId, userId, {
    entityType,
    entityId: lastUndo.entityId,
    fromStageId: lastUndo.toStageId,   // Undo put it here
    toStageId: lastUndo.fromStageId,   // Original destination
    metadata: { source: 'api' },
  });
}
```

### Undo Chain Tracking

```
Original Move:     A → B  (moveId: m1)
Undo:              B → A  (moveId: m2, undoMoveId: m1)
                   m1.undoneAt = now, m1.undoneBy = userId
Redo:              A → B  (moveId: m3)
                   m2.undoneAt = now, m2.undoneBy = userId
```

## Consistency Verification

The system can verify that entity states match the expected state from event replay:

```typescript
async verifyConsistency(tenantId, entityType) {
  const discrepancies = [];

  // For each entity
  for (const entity of entities) {
    // Get last valid (non-undone) move
    const lastMove = await getLastValidMove(entity.id);

    // Compare expected vs actual stage
    if (lastMove && lastMove.toStageId !== entity.currentStage) {
      discrepancies.push({
        entityId: entity.id,
        expected: lastMove.toStageId,
        actual: entity.currentStage,
      });
    }
  }

  return { isConsistent: discrepancies.length === 0, discrepancies };
}
```

### Repair Process

```typescript
async repairConsistency(tenantId, entityType, entityId) {
  // Get last valid move
  const lastMove = await getLastValidMove(entityId);

  if (!lastMove) return { repaired: false };

  // Force entity to expected stage
  await updateEntityStage(entityType, entityId, lastMove.toStageId);

  return { repaired: true, newStage: lastMove.toStageId };
}
```

## Snapshots

Snapshots capture complete board state for efficient reconstruction:

```typescript
interface KanbanSnapshot {
  id: string;
  tenantId: string;
  entityType: string;
  boardState: {
    stages: Array<{
      id: string;
      items: Array<{ id: string; position: number; stageId: string }>;
    }>;
    config: {
      wipLimits: Record<string, number>;
      collapsedColumns: string[];
    };
  };
  version: number;
  moveCount: number;  // Moves since last snapshot
  reason: 'scheduled' | 'manual' | 'before_bulk_operation';
  createdAt: Date;
}
```

### Snapshot Strategy

1. **Scheduled** - Every N moves or every N hours
2. **Manual** - On admin request
3. **Pre-bulk** - Before bulk operations for rollback capability

### Time Travel

To reconstruct state at time T:

1. Find nearest snapshot before T
2. Replay all moves after snapshot until T
3. Filter out undone moves

```sql
SELECT * FROM kanban_moves
WHERE tenant_id = $1
  AND entity_type = $2
  AND created_at > $snapshot_time
  AND created_at <= $target_time
  AND undone_at IS NULL
ORDER BY created_at;
```

## Idempotency

Prevent duplicate moves from network retries:

```typescript
async moveItem(tenantId, userId, request) {
  // Check for existing move with same idempotency key
  if (request.metadata?.idempotencyKey) {
    const existing = await checkIdempotentMove(tenantId, request.metadata.idempotencyKey);
    if (existing) return existing;  // Return cached result
  }

  // Store idempotency key in move metadata
  await createMove({ ...request, metadata: { idempotencyKey: key } });
}
```

## Performance Considerations

### Query Optimization

```sql
-- Efficient lookup of last move for entity
CREATE INDEX idx_kanban_moves_entity ON kanban_moves(entity_id, created_at DESC);

-- Fast undo chain traversal
CREATE INDEX idx_kanban_moves_undo ON kanban_moves(undo_move_id);

-- Timeline queries
CREATE INDEX idx_kanban_moves_timeline ON kanban_moves(tenant_id, created_at);
```

### Event Pruning (Future)

For very high-volume systems, consider:
- Archive old events to cold storage
- Keep only snapshots + recent events in hot storage
- Compress archived events

## Best Practices

1. **Always use transactions** - Ensure entity update + event creation are atomic
2. **Include metadata** - Source, IP, user agent help with debugging
3. **Use idempotency keys** - Prevent duplicate operations
4. **Regular snapshots** - Speed up time-travel queries
5. **Monitor consistency** - Run verification periodically

# Kanban Security Documentation

## Overview

The Kanban Enterprise system implements multiple security layers:

1. **Multi-tenant Isolation** - Strict data separation between tenants
2. **Authentication** - Token-based auth via Supabase
3. **Authorization** - Role-based access control (RBAC)
4. **Data Validation** - Input sanitization and schema validation
5. **Audit Trail** - Complete logging of all operations

## Multi-Tenant Architecture

### Tenant Isolation

All Kanban operations require tenant context:

```typescript
// Required headers on all requests
const tenantId = request.headers['x-tenant-id'];
const userId = request.headers['x-user-id'];

if (!tenantId || !userId) {
  return reply.status(400).send({
    error: { code: 'HEADERS_REQUIRED', message: 'Tenant and user context required' }
  });
}
```

### Database-Level Isolation

Every query includes tenant filtering:

```typescript
// ALWAYS filter by tenantId
const items = await db
  .select()
  .from(leads)
  .where(and(
    eq(leads.tenantId, tenantId),  // Tenant isolation
    eq(leads.status, stageId)
  ));
```

### Row-Level Security (Future)

PostgreSQL RLS can be added for additional protection:

```sql
CREATE POLICY tenant_isolation ON leads
  USING (tenant_id = current_setting('app.tenant_id')::uuid);

ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
```

## Authentication

### JWT Token Validation

All requests must include a valid JWT:

```typescript
// Auth middleware
fastify.addHook('preHandler', async (request, reply) => {
  const token = request.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return reply.status(401).send({ error: 'UNAUTHORIZED' });
  }

  // Validate with Supabase
  const { data: user, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return reply.status(401).send({ error: 'INVALID_TOKEN' });
  }

  request.user = user;
});
```

### WebSocket Authentication

WebSocket connections require authentication:

```typescript
// Query params or headers for auth
const token = request.query.token || request.headers.authorization;
const { userId, tenantId } = await validateWebSocketAuth(token);

// Connection is bound to specific user/tenant
connection.userId = userId;
connection.tenantId = tenantId;
```

## Authorization (RBAC)

### Role Hierarchy

```
super_admin > admin > manager > sales_rep > viewer
```

### Permission Matrix

| Operation | viewer | sales_rep | manager | admin | super_admin |
|-----------|--------|-----------|---------|-------|-------------|
| View board | ✓ | ✓ | ✓ | ✓ | ✓ |
| Move items | ✗ | ✓ | ✓ | ✓ | ✓ |
| Force WIP override | ✗ | ✗ | ✓ | ✓ | ✓ |
| Configure WIP limits | ✗ | ✗ | ✓ | ✓ | ✓ |
| View metrics | ✗ | ✓ | ✓ | ✓ | ✓ |
| Calculate metrics | ✗ | ✗ | ✗ | ✓ | ✓ |
| Verify consistency | ✗ | ✗ | ✗ | ✓ | ✓ |
| Repair consistency | ✗ | ✗ | ✗ | ✗ | ✓ |

### Permission Check Implementation

```typescript
// Route-level RBAC guard
import { RBACGuard } from '@/lib/auth';

// In routes
fastify.post('/move', {
  preHandler: [requireRole('sales_rep')],
}, async (request, reply) => {
  // Only sales_rep and above can move items
});

fastify.post('/config/:entityType', {
  preHandler: [requireRole('manager')],
}, async (request, reply) => {
  // Only managers and above can configure
});
```

### Entity-Level Permissions

Future enhancement for fine-grained control:

```typescript
interface EntityPermission {
  entityType: 'lead' | 'opportunity' | 'task' | 'customer';
  entityId: string;
  userId: string;
  permissions: {
    canView: boolean;
    canMove: boolean;
    canDelete: boolean;
  };
}
```

## Data Validation

### Input Sanitization

All inputs are validated with Zod schemas:

```typescript
const kanbanMoveRequestSchema = z.object({
  entityType: z.enum(['lead', 'opportunity', 'task', 'customer']),
  entityId: z.string().uuid(),
  fromStageId: z.string().max(50),
  toStageId: z.string().max(50),
  reason: z.string().max(1000).optional(),
  forceWipOverride: z.boolean().optional(),
  metadata: z.object({
    source: z.enum(['drag', 'keyboard', 'dialog', 'api', 'automation']).optional(),
    ipAddress: z.string().ip().optional(),
    userAgent: z.string().max(500).optional(),
    idempotencyKey: z.string().uuid().optional(),
  }).optional(),
});

// Route validation
fastify.post('/move', {
  schema: {
    body: kanbanMoveRequestSchema,
  },
}, handler);
```

### UUID Validation

Entity IDs are validated as UUIDs:

```typescript
const entityIdSchema = z.string().uuid('Invalid entity ID format');
```

### Stage ID Validation

Stage IDs are validated against known values:

```typescript
const validLeadStages = ['new', 'contacted', 'qualified', 'proposal', 'negotiation', 'won', 'lost'];

if (!validLeadStages.includes(toStageId)) {
  throw new Error('INVALID_STAGE');
}
```

## WebSocket Security

### Event Scoping

WebSocket events are scoped to prevent data leakage:

```typescript
// Events only broadcast to the tenant's room
wsServer.broadcast(
  `tenant:${tenantId}:kanban:${entityType}`,
  { event: 'KANBAN_ITEM_MOVED', payload }
);

// Users only receive events for their tenant
connection.rooms = [`tenant:${tenantId}`, `user:${userId}`];
```

### Event Filtering

Prevent sensitive data in events:

```typescript
function sanitizeEventPayload(event: KanbanEvent) {
  return {
    moveId: event.moveId,
    entityId: event.entityId,
    fromStageId: event.fromStageId,
    toStageId: event.toStageId,
    timestamp: event.timestamp,
    // Exclude: ipAddress, userAgent, internal metadata
  };
}
```

## Locking Security

### Lock Expiration

Locks automatically expire to prevent deadlocks:

```typescript
const LOCK_DURATION = 30 * 1000; // 30 seconds
const expiresAt = new Date(Date.now() + LOCK_DURATION);

await db.insert(kanbanLocks).values({
  entityType,
  entityId,
  lockedBy: userId,
  expiresAt,
  sessionId,
});
```

### Lock Ownership

Only the lock owner can release or extend:

```typescript
// Conditional UPSERT - only update if expired or same user
await db.insert(kanbanLocks).values({ ... }).onConflictDoUpdate({
  target: [kanbanLocks.entityType, kanbanLocks.entityId],
  set: {
    lockedBy: sql`CASE
      WHEN ${kanbanLocks.expiresAt} < NOW() THEN ${userId}
      WHEN ${kanbanLocks.lockedBy} = ${userId} THEN ${userId}
      ELSE ${kanbanLocks.lockedBy}
    END`,
  },
});
```

## Audit Trail

### Activity Logging

All operations are logged:

```typescript
await db.insert(activityLogs).values({
  tenantId,
  userId,
  entityType,
  entityId,
  action: 'stage_changed',
  changes: {
    before: { stage: fromStageId },
    after: { stage: toStageId },
  },
  metadata: {
    moveId,
    source: metadata?.source,
    reason,
    ipAddress: metadata?.ipAddress,
    userAgent: metadata?.userAgent,
  },
});
```

### Log Retention

- Activity logs: 90 days default
- Kanban moves: Indefinite (event sourcing)
- Security events: 1 year

## Rate Limiting

### API Rate Limits

```typescript
const rateLimit = fastify.rateLimit({
  max: 100,       // requests
  timeWindow: 60000,  // per minute
  keyGenerator: (request) => request.headers['x-tenant-id'],
});

// Apply to Kanban routes
fastify.register(kanbanRoutes, { prefix: '/kanban', preHandler: [rateLimit] });
```

### WebSocket Rate Limits

```typescript
const MESSAGE_LIMIT = 50;  // messages per second
const messageCount = new Map<string, number>();

ws.on('message', (message) => {
  const userId = connection.userId;
  const count = messageCount.get(userId) || 0;

  if (count > MESSAGE_LIMIT) {
    connection.close(1008, 'Rate limit exceeded');
    return;
  }

  messageCount.set(userId, count + 1);
});
```

## Error Handling

### Secure Error Messages

Never expose internal details in errors:

```typescript
try {
  await moveItem(tenantId, userId, request);
} catch (error) {
  // Log full error internally
  logger.error('Move failed', { error, tenantId, userId });

  // Return safe error to client
  if (error.message.startsWith('TRANSITION_BLOCKED')) {
    return reply.status(422).send({
      error: { code: 'TRANSITION_BLOCKED', message: 'This transition is not allowed' }
    });
  }

  // Generic error for unexpected failures
  return reply.status(500).send({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' }
  });
}
```

## Security Checklist

- [ ] All routes require authentication
- [ ] All queries filter by tenantId
- [ ] All inputs are validated
- [ ] Sensitive data not exposed in errors
- [ ] WebSocket events scoped to tenant
- [ ] Locks expire automatically
- [ ] Activity logging enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] HTTPS enforced in production

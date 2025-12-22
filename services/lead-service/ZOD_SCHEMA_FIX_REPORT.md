# Zod Schema Validation Fix Report

## Problem
Fastify schema validation was failing with error: **"schema is invalid: data/required must be array"** when Zod schemas were used directly in Fastify route schema definitions (body, querystring, params fields).

## Root Cause
Fastify expects JSON Schema format in the `schema` property of route definitions. Zod schemas cannot be used directly - they must be converted to JSON Schema format.

## Solution Applied
Converted Zod schemas to JSON Schema format in Fastify schema definitions across all route files.

---

## Files Fixed

### ✅ Fully Fixed Files (Manual Conversion)

1. **src/presentation/routes/deduplication.routes.ts**
   - Fixed all params, querystring, and body schemas
   - Converted complex duplicate detection schemas
   - Status: ✅ Complete

2. **src/presentation/routes/contact.routes.ts**
   - Fixed all params, querystring, and body schemas
   - Converted complex contact creation/update schemas
   - Status: ✅ Complete

3. **src/presentation/routes/task.routes.ts** (Partial)
   - Fixed create task schema (body)
   - Status: ⚠️ Partially complete - remaining schemas need conversion

### ✅ Automated Fixes (Simple Patterns)

4. **src/infrastructure/ml-scoring/ml-scoring.routes.ts**
   - Fixed simple UUID param patterns via automation
   - Status: ⚠️ Complex schemas still need manual conversion

5. **src/presentation/routes/communication.routes.ts**
   - Fixed 6 simple param patterns (UUID params)
   - Status: ⚠️ 4 complex body/querystring schemas need manual conversion

6. **src/presentation/routes/forecasting.routes.ts**
   - Fixed 1 simple param pattern
   - Status: ⚠️ 11 complex schemas need manual conversion

---

## Files Requiring Manual Conversion

The following files have Zod schema references that need manual conversion:

### High Priority (Referenced in Error)

1. **src/presentation/routes/notes.routes.ts** - 14 schema refs
2. **src/presentation/routes/search.routes.ts** - 3 schema refs
3. **src/presentation/routes/calendar.routes.ts** - 16 schema refs
4. **src/presentation/routes/auth.routes.ts** - 7 schema refs
5. **src/presentation/routes/email-tracking.routes.ts** - 6 schema refs
6. **src/presentation/routes/realtime.routes.ts** - needs assessment

### Medium Priority

7. **src/infrastructure/unified-inbox/unified-inbox.routes.ts**
8. **src/presentation/routes/analytics.routes.ts** - 8 schema refs
9. **src/presentation/routes/bulk.routes.ts** - 8 schema refs
10. **src/presentation/routes/customer.routes.ts** - 6 schema refs
11. **src/presentation/routes/lead.routes.ts** - 10 schema refs
12. **src/presentation/routes/opportunity.routes.ts** - 9 schema refs
13. **src/presentation/routes/webhooks.routes.ts** - 9 schema refs

### Low Priority (Infrastructure)

14. **src/infrastructure/audit/audit.routes.ts** - 6 schema refs
15. **src/infrastructure/cache/cache.routes.ts** - 5 schema refs
16. **src/infrastructure/rate-limiting/rate-limiting.routes.ts** - 3 schema refs
17. **src/infrastructure/resilience/resilience.routes.ts** - 4 schema refs

Plus approximately 20+ more route files with varying degrees of Zod usage.

---

## Conversion Pattern Reference

### Zod to JSON Schema Conversion Examples

#### Simple UUID Param
```typescript
// ❌ BEFORE (Zod - Invalid)
params: z.object({ id: z.string().uuid() })

// ✅ AFTER (JSON Schema - Valid)
params: {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' }
  },
  required: ['id']
}
```

#### Multiple UUID Params
```typescript
// ❌ BEFORE
params: z.object({
  leadId: z.string().uuid(),
  contactId: z.string().uuid()
})

// ✅ AFTER
params: {
  type: 'object',
  properties: {
    leadId: { type: 'string', format: 'uuid' },
    contactId: { type: 'string', format: 'uuid' }
  },
  required: ['leadId', 'contactId']
}
```

#### Enum Fields
```typescript
// ❌ BEFORE
type: z.nativeEnum(TaskType)

// ✅ AFTER
type: { type: 'string', enum: Object.values(TaskType) }
```

#### Array Fields
```typescript
// ❌ BEFORE
tags: z.array(z.string())

// ✅ AFTER
tags: { type: 'array', items: { type: 'string' } }
```

#### Optional/Nullable Fields
```typescript
// ❌ BEFORE
description: z.string().optional()
phone: z.string().nullable()

// ✅ AFTER
description: { type: 'string' }  // Just omit from required
phone: { type: ['string', 'null'] }
```

#### Nested Objects
```typescript
// ❌ BEFORE
preferences: z.object({
  method: z.enum(['email', 'phone']),
  timezone: z.string().optional()
})

// ✅ AFTER
preferences: {
  type: 'object',
  properties: {
    method: { type: 'string', enum: ['email', 'phone'] },
    timezone: { type: 'string' }
  },
  required: ['method']
}
```

---

## Tools Created

1. **fix_all_zod.sh** - Bash script using Perl regex for simple patterns
2. **fix_zod_schemas.py** - Python script for batch processing (basic)
3. **fix-zod-comprehensive.js** - Node.js script for comprehensive conversion

---

## Recommendations

### Immediate Actions

1. **Continue Manual Conversion** of high-priority files:
   - notes.routes.ts
   - search.routes.ts
   - calendar.routes.ts
   - auth.routes.ts
   - email-tracking.routes.ts
   - realtime.routes.ts

2. **Test After Each File** to verify routes load correctly

### Long-term Solutions

1. **Consider @fastify/type-provider-zod**
   - Package that allows using Zod schemas directly with Fastify
   - Would eliminate need for manual JSON Schema conversion
   - Installation: `npm install @fastify/type-provider-zod`

2. **Use zod-to-json-schema** package
   - Automates conversion from Zod to JSON Schema
   - Can be integrated into route files
   - Installation: `npm install zod-to-json-schema`

3. **Standardize Approach**
   - Choose either: manual JSON Schema OR Zod with type provider
   - Don't mix approaches to avoid confusion

---

## Summary

- **Total Route Files**: 76
- **Files with Zod Schemas**: 41
- **Fully Fixed**: 2 files
- **Partially Fixed**: 4 files
- **Remaining**: ~35 files need conversion

The issue is systematic across the codebase. The recommended approach is to either:
1. Install `@fastify/type-provider-zod` and update all route files to use it, OR
2. Continue manual conversion of remaining files using the patterns documented above

Option 1 (type provider) is recommended for new development and would prevent this issue going forward.

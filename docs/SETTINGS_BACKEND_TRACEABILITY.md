# Settings Module - Frontend to Backend Traceability

> Generated: 2025-12-29
> Status: Analysis Complete

## Executive Summary

| Category | Frontend Endpoints | Backend Status | Gap |
|----------|-------------------|----------------|-----|
| Branding | 3 | **Complete** | 0 |
| Team Management | 15 | **Complete** | 0 |
| Territories/Quotas | 15 | **Complete** | 0 |
| Security (2FA/Sessions) | 6 | **NOT IMPLEMENTED** | 6 |
| Data Export/Import | 5 | **NOT IMPLEMENTED** | 5 |
| Messaging Templates | 10 | **Partial** | 3 |
| Notifications | 11 | **NOT IMPLEMENTED** | 11 |
| Billing/Subscriptions | 15 | **External (Stripe)** | 0* |
| Audit Logs | 1 | **NOT IMPLEMENTED** | 1 |
| Messenger Integration | 5 | **Complete** | 0 |
| **TOTAL** | **86** | **55 Complete** | **26** |

*Billing handled by external Stripe integration

---

## FASE 1: Detailed Traceability Table

### 1. BRANDING MODULE

| Frontend Feature | Endpoint | Method | Backend Status | Notes |
|-----------------|----------|--------|----------------|-------|
| Get Branding | `/api/v1/tenants/branding` | GET | **OK** | auth.routes.ts |
| Update Branding | `/api/v1/tenants/branding` | PATCH | **OK** | auth.routes.ts |
| Upload Logo | `/api/v1/tenant/logo` | POST | **OK** | onboarding.routes.ts |

### 2. TEAM MANAGEMENT MODULE

| Frontend Feature | Endpoint | Method | Backend Status | Notes |
|-----------------|----------|--------|----------------|-------|
| Get Current User | `/auth/me` | GET | **OK** | auth.routes.ts |
| Update Profile | `/auth/me` | PATCH | **OK** | auth.routes.ts |
| Get User Tenants | `/auth/tenants` | GET | **OK** | auth.routes.ts |
| List Team Members | `/tenant/members` | GET | **OK** | member.routes.ts |
| Get Team Member | `/tenant/members/:id` | GET | **OK** | member.routes.ts |
| Update Member Role | `/tenant/members/:id/role` | PATCH | **MISSING** | Need to add |
| Delete Member | `/tenant/members/:id` | DELETE | **OK** | member.routes.ts |
| Suspend Member | `/tenant/members/:id/suspend` | PATCH | **MISSING** | Need to add |
| Reactivate Member | `/tenant/members/:id/reactivate` | PATCH | **MISSING** | Need to add |
| List Invitations | `/invitations` | GET | **OK** | invitation.routes.ts |
| Create Invitation | `/invitations` | POST | **OK** | invitation.routes.ts |
| Resend Invitation | `/invitations/:id/resend` | POST | **OK** | invitation.routes.ts |
| Cancel Invitation | `/invitations/:id` | DELETE | **OK** | invitation.routes.ts |
| Upload Avatar | `/api/upload/avatar` | POST | **MISSING** | Need to add |

### 3. SECURITY MODULE (NOT IMPLEMENTED)

| Frontend Feature | Endpoint | Method | Backend Status | Priority |
|-----------------|----------|--------|----------------|----------|
| Get 2FA Status | `/security/2fa/status` | GET | **MISSING** | HIGH |
| Enable 2FA | `/security/2fa/enable` | POST | **MISSING** | HIGH |
| Disable 2FA | `/security/2fa/disable` | POST | **MISSING** | HIGH |
| Verify 2FA | `/security/2fa/verify` | POST | **MISSING** | HIGH |
| List Sessions | `/security/sessions` | GET | **MISSING** | HIGH |
| Revoke Session | `/security/sessions/:id` | DELETE | **MISSING** | HIGH |
| Revoke All Sessions | `/security/sessions` | DELETE | **MISSING** | HIGH |
| Get Security Stats | `/security/stats` | GET | **MISSING** | MEDIUM |
| Update Password Policy | `/security/password-policy` | PATCH | **MISSING** | LOW |
| Get Password Policy | `/security/password-policy` | GET | **MISSING** | LOW |

### 4. DATA MANAGEMENT MODULE (NOT IMPLEMENTED)

| Frontend Feature | Endpoint | Method | Backend Status | Priority |
|-----------------|----------|--------|----------------|----------|
| Export Data | `/data/export` | POST | **MISSING** | HIGH |
| Get Export Status | `/data/export/:jobId` | GET | **MISSING** | HIGH |
| Download Export | `/data/export/:jobId/download` | GET | **MISSING** | HIGH |
| Import Data | `/data/import` | POST | **MISSING** | MEDIUM |
| Get Import Status | `/data/import/:jobId` | GET | **MISSING** | MEDIUM |
| Export History | `/data/export/history` | GET | **MISSING** | LOW |
| Delete All Data | `/data/delete-all` | DELETE | **MISSING** | LOW |
| Get Storage Stats | `/data/storage/stats` | GET | **MISSING** | LOW |

### 5. MESSAGING/TEMPLATES MODULE

| Frontend Feature | Endpoint | Method | Backend Status | Notes |
|-----------------|----------|--------|----------------|-------|
| List Templates | `/message-templates` | GET | **PARTIAL** | email-templates.routes.ts |
| Get Template | `/message-templates/:id` | GET | **PARTIAL** | email-templates.routes.ts |
| Create Template | `/message-templates` | POST | **PARTIAL** | email-templates.routes.ts |
| Update Template | `/message-templates/:id` | PATCH | **PARTIAL** | email-templates.routes.ts |
| Delete Template | `/message-templates/:id` | DELETE | **PARTIAL** | email-templates.routes.ts |
| Preview Template | `/message-templates/preview` | POST | **MISSING** | Need to add |
| Duplicate Template | `/message-templates/:id/duplicate` | POST | **MISSING** | Need to add |
| Get Starter Templates | `/message-templates/starters` | GET | **OK** | email-templates.routes.ts |

### 6. NOTIFICATIONS MODULE (NOT IMPLEMENTED)

| Frontend Feature | Endpoint | Method | Backend Status | Priority |
|-----------------|----------|--------|----------------|----------|
| Get Preferences | `/notification-preferences` | GET | **MISSING** | HIGH |
| Update Preferences | `/notification-preferences` | PATCH | **MISSING** | HIGH |
| Reset Preferences | `/notification-preferences/reset` | POST | **MISSING** | MEDIUM |
| List Notifications | `/notifications` | GET | **MISSING** | HIGH |
| Get Notification Stats | `/notifications/stats` | GET | **MISSING** | MEDIUM |
| Get Unread Count | `/notifications/unread-count` | GET | **MISSING** | HIGH |
| Mark as Read | `/notifications/:id/read` | PATCH | **MISSING** | HIGH |
| Mark All Read | `/notifications/read-all` | PATCH | **MISSING** | HIGH |
| Delete Notification | `/notifications/:id` | DELETE | **MISSING** | MEDIUM |
| Delete All | `/notifications` | DELETE | **MISSING** | LOW |

### 7. AUDIT LOGS MODULE

| Frontend Feature | Endpoint | Method | Backend Status | Priority |
|-----------------|----------|--------|----------------|----------|
| List Audit Logs | `/audit-logs` | GET | **MISSING** | HIGH |

### 8. MESSENGER INTEGRATION MODULE

| Frontend Feature | Endpoint | Method | Backend Status | Notes |
|-----------------|----------|--------|----------------|-------|
| Get Connected Pages | `/messenger/oauth/pages` | GET | **OK** | messenger-oauth.routes.ts |
| Get Health Status | `/messenger/health` | GET | **OK** | messenger.routes.ts |
| Set Default Page | `/messenger/oauth/pages/:id/default` | PATCH | **OK** | messenger-oauth.routes.ts |
| Disconnect Page | `/messenger/oauth/disconnect` | DELETE | **OK** | messenger-oauth.routes.ts |
| Test Connection | `/messenger/oauth/test` | POST | **OK** | messenger-oauth.routes.ts |

---

## FASE 2: Use Cases Definition

### SECURITY MODULE - Use Cases

#### UC-SEC-001: Enable Two-Factor Authentication
```typescript
Input: { userId: string, method: 'totp' | 'sms' }
Output: { secret: string, qrCode: string, backupCodes: string[] }
Validations:
  - User must be authenticated
  - 2FA not already enabled
  - Valid method selected
Authorization: Self only (user can only enable for themselves)
Audit: LOG_2FA_ENABLED { userId, method, timestamp }
```

#### UC-SEC-002: Verify and Activate 2FA
```typescript
Input: { userId: string, code: string }
Output: { success: boolean, backupCodes?: string[] }
Validations:
  - Valid TOTP code
  - 2FA setup in progress
Authorization: Self only
Audit: LOG_2FA_ACTIVATED { userId, timestamp }
```

#### UC-SEC-003: Disable Two-Factor Authentication
```typescript
Input: { userId: string, code: string, password: string }
Output: { success: boolean }
Validations:
  - Valid password confirmation
  - Valid 2FA code OR backup code
  - 2FA currently enabled
Authorization: Self only
Audit: LOG_2FA_DISABLED { userId, timestamp, reason }
```

#### UC-SEC-004: List Active Sessions
```typescript
Input: { userId: string, tenantId: string }
Output: Session[]
  - id: string
  - device: string
  - ipAddress: string
  - location: string
  - lastActive: Date
  - isCurrent: boolean
  - createdAt: Date
Validations:
  - User authenticated
Authorization: Self only (can see own sessions)
Audit: None (read-only)
```

#### UC-SEC-005: Revoke Session
```typescript
Input: { userId: string, sessionId: string }
Output: { success: boolean }
Validations:
  - Session exists
  - Session belongs to user
  - Cannot revoke current session (use logout)
Authorization: Self only OR Admin for any user
Audit: LOG_SESSION_REVOKED { userId, sessionId, revokedBy }
```

#### UC-SEC-006: Revoke All Sessions
```typescript
Input: { userId: string, exceptCurrent: boolean }
Output: { revokedCount: number }
Validations:
  - User authenticated
Authorization: Self only
Audit: LOG_ALL_SESSIONS_REVOKED { userId, count, timestamp }
```

### DATA MODULE - Use Cases

#### UC-DATA-001: Export Tenant Data
```typescript
Input: {
  tenantId: string
  entities: ('leads' | 'customers' | 'opportunities' | 'tasks' | 'all')[]
  format: 'json' | 'csv' | 'xlsx'
  dateRange?: { from: Date, to: Date }
}
Output: { jobId: string, status: 'queued' }
Validations:
  - Valid tenant
  - User has export permission
  - Valid format
Authorization: Admin or Owner role
Audit: LOG_DATA_EXPORT_STARTED { tenantId, userId, entities, format }
```

#### UC-DATA-002: Get Export Status
```typescript
Input: { jobId: string }
Output: {
  status: 'queued' | 'processing' | 'completed' | 'failed'
  progress: number
  downloadUrl?: string
  expiresAt?: Date
  error?: string
}
Validations:
  - Job exists
  - Job belongs to tenant
Authorization: Admin or Owner role
Audit: None (read-only)
```

#### UC-DATA-003: Import Tenant Data
```typescript
Input: {
  tenantId: string
  file: File
  options: {
    mode: 'merge' | 'replace'
    mapping?: Record<string, string>
    validateOnly?: boolean
  }
}
Output: {
  jobId: string
  status: 'queued'
  validationResults?: ValidationResult[]
}
Validations:
  - Valid file format (json, csv, xlsx)
  - File size limit (50MB)
  - Valid data structure
Authorization: Admin or Owner role
Audit: LOG_DATA_IMPORT_STARTED { tenantId, userId, filename, mode }
```

#### UC-DATA-004: Delete All Tenant Data
```typescript
Input: {
  tenantId: string
  confirmation: string // must match tenant name
  scope: 'soft' | 'hard'
}
Output: { success: boolean, deletedCounts: Record<string, number> }
Validations:
  - Confirmation matches tenant name
  - User is Owner
  - Double confirmation required
Authorization: Owner role ONLY
Audit: LOG_DATA_DELETED { tenantId, userId, scope, counts }
```

### NOTIFICATIONS MODULE - Use Cases

#### UC-NOTIF-001: Get Notification Preferences
```typescript
Input: { userId: string, tenantId: string }
Output: NotificationPreferences {
  email: {
    leadAssigned: boolean
    taskDue: boolean
    opportunityWon: boolean
    weeklyDigest: boolean
    // ...
  }
  push: { ... }
  inApp: { ... }
}
Authorization: Self only
```

#### UC-NOTIF-002: Update Notification Preferences
```typescript
Input: { userId: string, tenantId: string, preferences: Partial<NotificationPreferences> }
Output: NotificationPreferences
Validations:
  - Valid preference keys
  - Boolean values
Authorization: Self only
Audit: LOG_PREFERENCES_UPDATED { userId, changes }
```

### AUDIT LOGS MODULE - Use Cases

#### UC-AUDIT-001: Query Audit Logs
```typescript
Input: {
  tenantId: string
  filters?: {
    userId?: string
    action?: AuditAction
    entityType?: string
    entityId?: string
    dateRange?: { from: Date, to: Date }
  }
  pagination: { page: number, pageSize: number }
}
Output: {
  data: AuditLog[]
  meta: { total, page, pageSize, totalPages }
}
Authorization: Admin or Owner role
```

---

## FASE 3: Implementation Plan

### Priority 1 - Critical (Security & Data)
1. **Security Routes** - New file: `security.routes.ts`
   - 2FA endpoints (TOTP implementation)
   - Session management
   - Security stats

2. **Data Routes** - New file: `data-management.routes.ts`
   - Export job queue
   - Import processing
   - Storage stats

### Priority 2 - High (Notifications & Audit)
3. **Notifications Routes** - New file: `notifications.routes.ts`
   - Preferences CRUD
   - Notification list/read/delete
   - Unread count

4. **Audit Logs Routes** - New file: `audit-logs.routes.ts`
   - Log query endpoint
   - Pagination & filtering

### Priority 3 - Medium (Team Enhancements)
5. **Member Routes Enhancement**
   - Add suspend/reactivate endpoints
   - Add role update endpoint

6. **Avatar Upload**
   - Add avatar upload to onboarding routes

### Priority 4 - Low (Templates Enhancement)
7. **Template Preview/Duplicate**
   - Add preview endpoint
   - Add duplicate endpoint

---

## Database Schema Additions

### New Tables Required

```sql
-- User sessions tracking
CREATE TABLE user_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  device_info JSONB NOT NULL,
  ip_address VARCHAR(45),
  location VARCHAR(255),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  last_active_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL,
  is_active BOOLEAN DEFAULT true,
  revoked_at TIMESTAMPTZ,
  revoked_by UUID REFERENCES auth.users(id)
);

-- Two-factor authentication
CREATE TABLE user_2fa (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) UNIQUE,
  method VARCHAR(20) NOT NULL DEFAULT 'totp',
  secret_encrypted TEXT NOT NULL,
  backup_codes_encrypted TEXT,
  is_enabled BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data export jobs
CREATE TABLE data_export_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  entities TEXT[] NOT NULL,
  format VARCHAR(10) NOT NULL,
  status VARCHAR(20) DEFAULT 'queued',
  progress INTEGER DEFAULT 0,
  file_url TEXT,
  file_size BIGINT,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification preferences
CREATE TABLE notification_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  preferences JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tenant_id)
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB,
  related_type VARCHAR(50),
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id),
  user_id UUID REFERENCES auth.users(id),
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50),
  entity_id UUID,
  old_values JSONB,
  new_values JSONB,
  metadata JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_sessions_user ON user_sessions(user_id);
CREATE INDEX idx_sessions_tenant ON user_sessions(tenant_id);
CREATE INDEX idx_export_jobs_tenant ON data_export_jobs(tenant_id);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_tenant ON audit_logs(tenant_id, created_at DESC);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
```

---

## Next Steps

1. Create database migrations for new tables
2. Implement Security module (routes + services)
3. Implement Data Management module
4. Implement Notifications module
5. Implement Audit Logs module
6. Update frontend hooks where needed
7. Full integration testing
8. Deploy and validate

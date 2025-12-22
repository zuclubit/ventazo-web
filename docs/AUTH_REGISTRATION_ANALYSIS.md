# Análisis del Sistema de Autenticación y Registro de Usuarios

## Resumen Ejecutivo

Este documento analiza el sistema de autenticación, registro de usuarios y gestión de empresas (tenants) en Zuclubit Smart CRM, identificando gaps críticos entre el backend y frontend, y proponiendo soluciones.

**Fecha:** 2025-12-09
**Estado:** IMPLEMENTACIÓN COMPLETADA - Fase 1

---

## 1. Arquitectura Actual

### 1.1 Modelo de Autenticación Híbrido

El sistema usa un **modelo de dos capas**:

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │   Next.js   │───▶│  Supabase    │───▶│  Auth Store     │    │
│  │   App       │    │  Client      │    │  (Zustand)      │    │
│  └─────────────┘    └──────────────┘    └─────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              │ JWT Token
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                         BACKEND                                  │
│  ┌─────────────┐    ┌──────────────┐    ┌─────────────────┐    │
│  │   Fastify   │───▶│  Auth        │───▶│  PostgreSQL     │    │
│  │   API       │    │  Middleware  │    │  (Custom DB)    │    │
│  └─────────────┘    └──────────────┘    └─────────────────┘    │
│                              │                                   │
│                              │ Verify Token                      │
│                              ▼                                   │
│                     ┌──────────────┐                            │
│                     │  Supabase    │                            │
│                     │  Service     │                            │
│                     └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Responsabilidades

| Componente | Responsabilidad |
|------------|-----------------|
| **Supabase Auth** | Signup, Login, JWT tokens, Password reset, Email verification |
| **Backend API** | User profiles, Tenant management, RBAC, Permissions, Invitations |
| **Frontend** | UI flows, State management, API calls, Route protection |

---

## 2. Flujo de Registro Actual

### 2.1 Path A: Registro Tradicional (`/register`)

```
Usuario → /register → Supabase signUp() → Email verificación
                                               ↓
                              [Usuario NO sincronizado con backend]
```

**Problema:** El usuario existe en Supabase pero NO en la base de datos del backend.

### 2.2 Path B: Onboarding (`/signup` → `/onboarding/*`)

```
Usuario → /signup → Supabase signUp() → /onboarding/create-business
                                               ↓
                    Supabase INSERT tenants → Supabase INSERT tenant_memberships
                                               ↓
                              [Datos en Supabase, NO en backend custom DB]
```

**Problema:** El onboarding crea datos directamente en Supabase, bypaseando el backend API.

---

## 3. GAPS CRÍTICOS IDENTIFICADOS

### 3.1 Registro de Usuario

| Gap | Severidad | Descripción |
|-----|-----------|-------------|
| **No hay endpoint de registro** | CRÍTICO | El backend no tiene `POST /auth/register`. Todo el registro es client-side via Supabase |
| **Sin sincronización de usuarios** | CRÍTICO | Usuarios creados en Supabase no se sincronizan automáticamente al backend |
| **Sin validación de email única** | ALTO | No hay endpoint para verificar si email ya existe antes de registro |

### 3.2 Creación de Empresa/Tenant

| Gap | Severidad | Descripción |
|-----|-----------|-------------|
| **Creación dual** | CRÍTICO | Frontend crea tenant en Supabase directamente, backend también puede crear via API |
| **Sin webhook de sincronización** | ALTO | Cambios en Supabase no se reflejan en backend |
| **tenant_settings separado** | MEDIO | Frontend espera `tenant_settings` pero backend usa `tenants.settings` JSONB |

### 3.3 Sistema de Invitaciones

| Gap | Severidad | Descripción |
|-----|-----------|-------------|
| **Tabla diferente** | ALTO | Frontend usa `user_invitations`, backend usa `tenant_memberships.invitedAt` |
| **Sin envío de emails** | ALTO | El backend tiene TODO para envío de emails de invitación |
| **Token de invitación faltante** | MEDIO | Backend no genera tokens de invitación como frontend espera |

### 3.4 Autenticación

| Gap | Severidad | Descripción |
|-----|-----------|-------------|
| **Sin endpoint de login** | MEDIO | Login es 100% client-side via Supabase |
| **Sin endpoint de logout** | BAJO | Logout es client-side |
| **Sin refresh token endpoint** | MEDIO | Refresh es manejado por Supabase client |

---

## 4. Esquema de Base de Datos

### 4.1 Backend Custom DB (Drizzle)

```sql
-- users (synced from Supabase)
CREATE TABLE users (
  id UUID PRIMARY KEY,           -- Same as Supabase auth.users.id
  email VARCHAR(255) UNIQUE,
  full_name VARCHAR(255),
  avatar_url VARCHAR(500),
  phone VARCHAR(50),
  is_active BOOLEAN DEFAULT true,
  last_login_at TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- tenants
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE,
  plan VARCHAR(50) DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  settings JSONB DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- tenant_memberships
CREATE TABLE tenant_memberships (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  tenant_id UUID REFERENCES tenants(id),
  role VARCHAR(50),              -- owner, admin, manager, sales_rep, viewer
  invited_by UUID,
  invited_at TIMESTAMP,
  accepted_at TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP,
  UNIQUE(user_id, tenant_id)
);
```

### 4.2 Supabase DB (Migrations)

```sql
-- profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  tenant_id UUID REFERENCES tenants(id),
  full_name TEXT,
  avatar_url TEXT,
  role user_role,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- tenants (similar but with extra fields)
CREATE TABLE tenants (
  id UUID PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE,
  plan tenant_plan DEFAULT 'free',
  is_active BOOLEAN DEFAULT true,
  settings JSONB,
  onboarding_status onboarding_status DEFAULT 'pending',
  created_at TIMESTAMP
);

-- tenant_settings (separate table in Supabase)
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  business_type TEXT,
  business_size TEXT,
  phone TEXT,
  country TEXT,
  city TEXT,
  timezone TEXT,
  currency TEXT DEFAULT 'MXN',
  locale TEXT DEFAULT 'es-MX',
  branding JSONB,
  modules JSONB,
  business_hours JSONB,
  created_at TIMESTAMP,
  updated_at TIMESTAMP
);

-- user_invitations (separate from memberships)
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),
  email TEXT NOT NULL,
  role user_role,
  token TEXT UNIQUE,
  status invitation_status DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  message TEXT,
  expires_at TIMESTAMP,
  accepted_at TIMESTAMP,
  created_at TIMESTAMP
);
```

### 4.3 Diferencias Clave

| Aspecto | Backend Custom | Supabase |
|---------|----------------|----------|
| Profiles | `users` table | `profiles` extends `auth.users` |
| Settings | `tenants.settings` JSONB | `tenant_settings` separate table |
| Invitations | `tenant_memberships.invited_at` | `user_invitations` separate table |
| Role enum | VARCHAR | PostgreSQL ENUM |
| Triggers | Manual sync | Auto-create profile on signup |

---

## 5. Endpoints Backend Existentes

### 5.1 Auth Routes (`/api/v1/auth`)

| Endpoint | Método | Implementado | Descripción |
|----------|--------|--------------|-------------|
| `/me` | GET | ✅ | Obtener perfil actual |
| `/me` | PATCH | ✅ | Actualizar perfil |
| `/tenants` | GET | ✅ | Listar tenants del usuario |
| `/tenants` | POST | ✅ | Crear nuevo tenant |
| `/invitations` | GET | ✅ | Obtener invitaciones pendientes |
| `/invitations/:id/accept` | POST | ✅ | Aceptar invitación |
| `/sync-user` | POST | ✅ | **NUEVO** - Sincronizar usuario desde Supabase |
| `/check-email` | POST | ✅ | **NUEVO** - Verificar disponibilidad de email |
| `/check-slug/:slug` | GET | ✅ | **NUEVO** - Verificar disponibilidad de slug |
| `/complete-onboarding` | POST | ✅ | **NUEVO** - Crear tenant con configuración completa |
| `/register` | POST | ❌ | Client-side via Supabase (by design) |
| `/login` | POST | ❌ | Client-side via Supabase (by design) |
| `/logout` | POST | ❌ | Client-side via Supabase (by design) |
| `/forgot-password` | POST | ❌ | Client-side via Supabase (by design) |
| `/reset-password` | POST | ❌ | Client-side via Supabase (by design) |

### 5.2 Member Routes (`/api/v1/members`)

| Endpoint | Método | Implementado | Descripción |
|----------|--------|--------------|-------------|
| `/` | GET | ✅ | Listar miembros del tenant |
| `/counts` | GET | ✅ | Conteo por rol |
| `/invite` | POST | ✅ | Invitar usuario |
| `/:id` | PATCH | ✅ | Actualizar rol/estado |
| `/:id` | DELETE | ✅ | Remover miembro |

### 5.3 Tenant Routes (`/api/v1/tenant`)

| Endpoint | Método | Implementado | Descripción |
|----------|--------|--------------|-------------|
| `/` | GET | ✅ | Obtener tenant actual |
| `/settings` | GET | ✅ | **NUEVO** - Obtener configuración del tenant |
| `/settings` | PATCH | ✅ | **NUEVO** - Actualizar configuración |
| `/branding` | GET | ✅ | **NUEVO** - Obtener branding |
| `/branding` | PATCH | ✅ | **NUEVO** - Actualizar branding |
| `/modules` | GET | ✅ | **NUEVO** - Obtener módulos habilitados |
| `/modules` | PATCH | ✅ | **NUEVO** - Actualizar módulos |
| `/business-hours` | GET | ✅ | **NUEVO** - Obtener horario laboral |
| `/business-hours` | PATCH | ✅ | **NUEVO** - Actualizar horario laboral |

---

## 6. Endpoints Frontend Espera

### 6.1 Onboarding Service Calls

```typescript
// De /apps/web/src/lib/onboarding/onboarding-service.ts

// Signup - USA SUPABASE DIRECTAMENTE
signupUser(data) {
  return supabase.auth.signUp({ email, password, options: { data: metadata } })
}

// Create Tenant - USA SUPABASE DIRECTAMENTE
createTenant(userId, data) {
  await supabase.from('tenants').insert({ ... })
  await supabase.from('tenant_memberships').insert({ ... })
  await supabase.from('tenant_settings').insert({ ... })
}

// Update Branding - USA SUPABASE DIRECTAMENTE
updateBranding(tenantId, data) {
  await supabase.from('tenant_settings').update({ branding: data })
}

// Update Modules - USA SUPABASE DIRECTAMENTE
updateModules(tenantId, data) {
  await supabase.from('tenant_settings').update({ modules: data })
}

// Send Invitations - USA SUPABASE DIRECTAMENTE
sendInvitations(tenantId, userId, invitations) {
  await supabase.from('user_invitations').insert([...])
}
```

**PROBLEMA PRINCIPAL:** El frontend bypasea completamente el backend API durante el onboarding.

### 6.2 Auth Store Calls

```typescript
// De /apps/web/src/store/auth.store.ts

// Login - USA SUPABASE
login(email, password) {
  await supabase.auth.signInWithPassword({ email, password })
  // Luego llama al backend:
  await authService.getCurrentUser(tenantId)  // GET /api/v1/auth/me
}

// Initialize - MIXTO
initialize() {
  session = await supabase.auth.getSession()
  user = await authService.getCurrentUser(tenantId)  // GET /api/v1/auth/me
  tenants = await authService.getUserTenants()       // GET /api/v1/auth/tenants
}
```

---

## 7. Plan de Remediación

### 7.1 Prioridad CRÍTICA (P0)

#### 7.1.1 Endpoint de Sincronización de Usuario

```typescript
// POST /api/v1/auth/sync-user
// Llamado después de Supabase signup para sincronizar usuario al backend

Request:
{
  supabaseUserId: string,
  email: string,
  fullName?: string,
  metadata?: Record<string, unknown>
}

Response:
{
  userId: string,
  email: string,
  fullName: string,
  createdAt: string
}
```

#### 7.1.2 Unificar Creación de Tenant

```typescript
// POST /api/v1/auth/tenants (MODIFICAR existente)
// Frontend DEBE usar este endpoint, NO Supabase directo

Request:
{
  name: string,
  slug: string,
  plan?: string,
  settings?: {
    businessType: string,
    businessSize: string,
    phone: string,
    country: string,
    city: string,
    timezone: string,
    currency?: string,
    locale?: string
  },
  branding?: {
    logo?: string,
    primaryColor?: string,
    companyDisplayName?: string
  },
  modules?: {
    leads: boolean,
    customers: boolean,
    opportunities: boolean,
    // ...
  }
}

Response:
{
  tenantId: string,
  name: string,
  slug: string,
  settings: {...}
}
```

#### 7.1.3 Endpoint de Invitaciones Mejorado

```typescript
// POST /api/v1/members/invite (MODIFICAR existente)
// Agregar generación de token y envío de email

Request:
{
  email: string,
  role: 'admin' | 'manager' | 'sales_rep' | 'viewer',
  message?: string
}

Response:
{
  invitationId: string,
  email: string,
  role: string,
  token: string,  // NUEVO
  expiresAt: string,  // NUEVO
  status: 'pending'
}
```

### 7.2 Prioridad ALTA (P1)

#### 7.2.1 Endpoints de Tenant Settings

```typescript
// GET /api/v1/tenant/settings
// PATCH /api/v1/tenant/settings
// GET /api/v1/tenant/branding
// PATCH /api/v1/tenant/branding
// GET /api/v1/tenant/modules
// PATCH /api/v1/tenant/modules
// GET /api/v1/tenant/business-hours
// PATCH /api/v1/tenant/business-hours
```

#### 7.2.2 Verificación de Email

```typescript
// GET /api/v1/auth/check-email?email=test@example.com
Response: { available: boolean, message?: string }
```

### 7.3 Prioridad MEDIA (P2)

#### 7.3.1 Webhook de Supabase → Backend

Configurar webhook en Supabase para sincronizar automáticamente:
- Nuevo usuario creado → Crear en backend
- Usuario actualizado → Actualizar en backend
- Usuario eliminado → Soft delete en backend

---

## 8. Cambios Requeridos en Frontend

### 8.1 Onboarding Service

Modificar para usar backend API en lugar de Supabase directo:

```typescript
// ANTES (Supabase directo)
async createTenant(userId: string, data: BusinessFormData) {
  await supabase.from('tenants').insert({ ... })
}

// DESPUÉS (Backend API)
async createTenant(userId: string, data: BusinessFormData) {
  return apiClient.post('/api/v1/auth/tenants', {
    name: data.businessName,
    slug: generateSlug(data.businessName),
    settings: {
      businessType: data.businessType,
      businessSize: data.businessSize,
      ...
    }
  })
}
```

### 8.2 Post-Signup Hook

Agregar sincronización después de signup:

```typescript
// DESPUÉS de supabase.auth.signUp() exitoso
async afterSignup(supabaseUser: User) {
  await apiClient.post('/api/v1/auth/sync-user', {
    supabaseUserId: supabaseUser.id,
    email: supabaseUser.email,
    fullName: supabaseUser.user_metadata.full_name
  })
}
```

---

## 9. Matriz de Cobertura Objetivo

| Flujo | Estado Actual | Estado Objetivo |
|-------|---------------|-----------------|
| Signup | Supabase only | Supabase + Backend sync |
| Login | Supabase only | Supabase + Backend profile |
| Create Tenant | Supabase direct | Backend API only |
| Update Settings | Supabase direct | Backend API only |
| Invite User | Backend partial | Backend complete + email |
| Accept Invite | Backend | Backend (no change) |
| Switch Tenant | Backend | Backend (no change) |

---

## 10. Estado de Implementación

### 10.1 COMPLETADO (Fase 1)

| Tarea | Estado | Archivo |
|-------|--------|---------|
| ✅ Implementar `POST /api/v1/auth/sync-user` | COMPLETADO | `auth.routes.ts` |
| ✅ Implementar `POST /api/v1/auth/check-email` | COMPLETADO | `auth.routes.ts` |
| ✅ Implementar `GET /api/v1/auth/check-slug/:slug` | COMPLETADO | `auth.routes.ts` |
| ✅ Implementar `POST /api/v1/auth/complete-onboarding` | COMPLETADO | `auth.routes.ts` |
| ✅ Extender createTenant con settings | COMPLETADO | `auth.service.ts` |
| ✅ Crear endpoint `/tenant/settings` GET/PATCH | COMPLETADO | `auth.routes.ts` |
| ✅ Crear endpoint `/tenant/branding` GET/PATCH | COMPLETADO | `auth.routes.ts` |
| ✅ Crear endpoint `/tenant/modules` GET/PATCH | COMPLETADO | `auth.routes.ts` |
| ✅ Crear endpoint `/tenant/business-hours` GET/PATCH | COMPLETADO | `auth.routes.ts` |

### 10.2 Métodos AuthService Implementados

| Método | Descripción |
|--------|-------------|
| `syncUserFromSupabase()` | Sincroniza usuario de Supabase al backend |
| `checkEmailAvailability()` | Verifica si email está disponible |
| `checkSlugAvailability()` | Verifica si slug de tenant está disponible |
| `updateTenantSettings()` | Actualiza settings del tenant |
| `updateTenantBranding()` | Actualiza branding del tenant |
| `updateTenantModules()` | Actualiza módulos habilitados |
| `updateTenantBusinessHours()` | Actualiza horario laboral |
| `createTenantWithFullConfig()` | Crea tenant con toda la configuración |

### 10.3 Próximos Pasos (Fase 2)

1. **Mejorar invitaciones** - Agregar tokens únicos y envío de emails
2. **Actualizar frontend** - Usar backend API en onboarding en lugar de Supabase directo
3. **Agregar webhook Supabase** - Sincronización automática de usuarios
4. **Tests de integración** - Validar flujos completos de registro y onboarding

---

## Apéndice: Archivos Clave

### Backend
- `services/lead-service/src/presentation/routes/auth.routes.ts`
- `services/lead-service/src/infrastructure/auth/auth.service.ts`
- `services/lead-service/src/infrastructure/auth/types.ts`
- `services/lead-service/src/presentation/middlewares/auth.middleware.ts`
- `services/lead-service/src/infrastructure/database/schema.ts`

### Frontend
- `apps/web/src/lib/auth/supabase-client.ts`
- `apps/web/src/lib/onboarding/onboarding-service.ts`
- `apps/web/src/store/auth.store.ts`
- `apps/web/src/app/onboarding/*`

### Supabase
- `supabase/migrations/20231207000001_create_tenants_and_profiles.sql`
- `supabase/migrations/20231207000002_create_rls_policies.sql`
- `supabase/migrations/20231207000003_tenant_settings_and_invitations.sql`

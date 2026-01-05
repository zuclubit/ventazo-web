# FASE 2 - Integración Backend ↔ Frontend Completada

## Resumen Ejecutivo

FASE 2 implementa una capa de integración segura, escalable y profesional entre el frontend Next.js y el backend Fastify, incluyendo autenticación real con Supabase, autorización RBAC completa, y arquitectura multi-tenant.

**Estado**: ✅ Completado
**Fecha**: 2025-12-07
**Versión**: 2.0.0

---

## 1. Diagrama de Flujo de Autenticación

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Usuario   │────>│  Login Page │────>│  Supabase   │────>│   Backend   │
│             │     │  (Next.js)  │     │    Auth     │     │  (Fastify)  │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
      │                    │                   │                    │
      │  1. Credenciales   │                   │                    │
      │─────────────────────>                  │                    │
      │                    │  2. Verificar     │                    │
      │                    │─────────────────────>                  │
      │                    │  3. JWT + Refresh │                    │
      │                    │<─────────────────────                  │
      │                    │                   │                    │
      │                    │  4. Fetch Profile │                    │
      │                    │────────────────────────────────────────>
      │                    │     (JWT + x-tenant-id)                │
      │                    │  5. User + Role   │                    │
      │                    │<────────────────────────────────────────
      │  6. Dashboard      │                   │                    │
      │<─────────────────────                  │                    │
      │                    │                   │                    │

Flujo de Refresh Token:
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  API Client │────>│  Supabase   │────>│  Token Mgr  │
│  (401 Error)│     │    Auth     │     │  (Memory)   │
└─────────────┘     └─────────────┘     └─────────────┘
      │                    │                   │
      │  Token Expired     │                   │
      │───────────────────────────────────────>│
      │                    │  Refresh Token    │
      │                    │<──────────────────│
      │                    │  New JWT          │
      │                    │─────────────────────>
      │  Retry Request     │                   │
      │<───────────────────────────────────────│
```

---

## 2. Estructura de Estado Global

```
┌─────────────────────────────────────────────────────────────┐
│                     ZUSTAND STORES                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   AUTH STORE                         │   │
│  │  ┌───────────────┐  ┌───────────────┐              │   │
│  │  │ user          │  │ tokens        │              │   │
│  │  │ - id          │  │ - accessToken │              │   │
│  │  │ - email       │  │ - refreshToken│              │   │
│  │  │ - role        │  │ - expiresAt   │              │   │
│  │  │ - permissions │  └───────────────┘              │   │
│  │  │ - tenantId    │  ┌───────────────┐              │   │
│  │  └───────────────┘  │ tenants[]     │              │   │
│  │  ┌───────────────┐  └───────────────┘              │   │
│  │  │ actions       │  ┌───────────────┐              │   │
│  │  │ - login()     │  │ helpers       │              │   │
│  │  │ - logout()    │  │ - hasPermission│             │   │
│  │  │ - initialize()│  │ - hasRole()   │              │   │
│  │  │ - switchTenant│  │ - isAtLeastRole│             │   │
│  │  └───────────────┘  └───────────────┘              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  TENANT STORE                        │   │
│  │  ┌───────────────┐  ┌───────────────┐              │   │
│  │  │ currentTenant │  │ settings      │              │   │
│  │  │ - id          │  │ - currency    │              │   │
│  │  │ - name        │  │ - locale      │              │   │
│  │  │ - slug        │  │ - timezone    │              │   │
│  │  │ - plan        │  │ - features    │              │   │
│  │  └───────────────┘  └───────────────┘              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                    UI STORE                          │   │
│  │  ┌───────────────┐  ┌───────────────┐              │   │
│  │  │ sidebar       │  │ theme         │              │   │
│  │  │ - isCollapsed │  │ - light/dark  │              │   │
│  │  │ - openSections│  │ - system      │              │   │
│  │  └───────────────┘  └───────────────┘              │   │
│  │  ┌───────────────┐  ┌───────────────┐              │   │
│  │  │ toasts[]      │  │ commandPalette│              │   │
│  │  └───────────────┘  │ - open/close  │              │   │
│  │                     └───────────────┘              │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Árbol Actualizado del Proyecto

```
apps/web/
├── src/
│   ├── __tests__/
│   │   └── auth.test.ts                 # Tests de integración
│   │
│   ├── app/
│   │   ├── (auth)/                      # Rutas de autenticación
│   │   │   ├── layout.tsx
│   │   │   ├── login/
│   │   │   │   └── page.tsx             # Formulario de login
│   │   │   └── register/
│   │   │       └── page.tsx             # Formulario de registro
│   │   ├── app/                         # Rutas protegidas
│   │   │   ├── layout.tsx               # Dashboard con AuthGuard
│   │   │   └── page.tsx                 # Dashboard home
│   │   ├── globals.css
│   │   ├── layout.tsx
│   │   └── page.tsx
│   │
│   ├── components/
│   │   ├── auth/                        # Componentes de auth
│   │   │   ├── auth-provider.tsx        # AuthProvider, AuthGuard
│   │   │   ├── permission-guard.tsx     # PermissionGuard, usePermissions
│   │   │   └── index.ts
│   │   ├── data-table/
│   │   ├── layout/
│   │   ├── ui/
│   │   └── providers.tsx                # Providers actualizados
│   │
│   ├── lib/
│   │   ├── api/                         # API Layer
│   │   │   ├── api-client.ts            # Cliente con interceptores
│   │   │   ├── hooks/
│   │   │   │   └── use-api-query.ts     # Hooks TanStack Query
│   │   │   └── index.ts
│   │   │
│   │   ├── auth/                        # Auth Layer
│   │   │   ├── auth-service.ts          # Lógica de autenticación
│   │   │   ├── supabase-client.ts       # Cliente Supabase
│   │   │   ├── token-manager.ts         # Gestión de tokens
│   │   │   ├── types.ts                 # Tipos y RBAC
│   │   │   └── index.ts
│   │   │
│   │   ├── tenant/
│   │   └── utils.ts
│   │
│   ├── store/                           # Zustand Stores
│   │   ├── auth.store.ts                # Estado de autenticación
│   │   ├── tenant.store.ts              # Estado de tenant
│   │   ├── ui.store.ts                  # Estado de UI
│   │   └── index.ts
│   │
│   └── middleware.ts                    # Middleware de rutas
│
├── .env.example
├── .env.local
├── components.json
├── next.config.mjs
├── package.json                         # +Supabase deps
├── tailwind.config.ts
└── tsconfig.json
```

---

## 4. Componentes y Hooks Creados

### Componentes de Autenticación

| Componente | Ubicación | Descripción |
|------------|-----------|-------------|
| `AuthProvider` | `components/auth/auth-provider.tsx` | Provider que inicializa auth |
| `AuthGuard` | `components/auth/auth-provider.tsx` | Protección de rutas autenticadas |
| `GuestGuard` | `components/auth/auth-provider.tsx` | Protección de rutas públicas |
| `PermissionGuard` | `components/auth/permission-guard.tsx` | Protección por permisos |

### Hooks

| Hook | Ubicación | Descripción |
|------|-----------|-------------|
| `useAuthStore` | `store/auth.store.ts` | Estado de autenticación |
| `usePermissions` | `components/auth/permission-guard.tsx` | Helpers de permisos |
| `useApiQuery` | `lib/api/hooks/use-api-query.ts` | Query con tenant |
| `useApiMutation` | `lib/api/hooks/use-api-query.ts` | Mutation con tenant |
| `useApiClient` | `lib/api/hooks/use-api-query.ts` | Cliente con tenant |
| `usePaginatedQuery` | `lib/api/hooks/use-api-query.ts` | Query paginada |

### Selectores de Store

```typescript
// Auth
useUser(), useIsAuthenticated(), useIsAuthLoading()
useCurrentTenantId(), useTenants(), useAccessToken()
useHasPermission(permission), useIsAtLeastRole(role)

// Tenant
useCurrentTenant(), useTenantSettings(), useHasFeature(feature)
useCurrency(), useLocale(), useTimezone()

// UI
useSidebar(), useTheme(), useToasts(), useToast()
```

---

## 5. Ejemplos de Requests

### Login

```typescript
// Usando el auth store
const login = useAuthStore((state) => state.login);
const success = await login('user@email.com', 'password');

// Request interno
POST https://supabase.co/auth/v1/token
{
  "email": "user@email.com",
  "password": "password",
  "grant_type": "password"
}

// Response
{
  "access_token": "eyJ...",
  "refresh_token": "xxx",
  "expires_at": 1733584800,
  "user": { ... }
}
```

### API Call con Tenant

```typescript
// Usando hooks
const { data } = useApiQuery<Lead[]>(
  queryKeys.leads.list({ status: 'new' }),
  '/api/v1/leads'
);

// Request interno
GET http://localhost:3000/api/v1/leads?status=new
Headers:
  Authorization: Bearer eyJ...
  x-tenant-id: 550e8400-e29b-41d4-a716-446655440000
  Content-Type: application/json
```

### Mutation con Invalidación

```typescript
const createLead = useApiPost<Lead, CreateLeadDto>(
  '/api/v1/leads',
  {
    invalidateKeys: [queryKeys.leads.all],
    onSuccess: () => toast.success('Lead creado'),
  }
);

// Uso
await createLead.mutateAsync({
  name: 'Juan Pérez',
  email: 'juan@email.com',
  phone: '+52 555 123 4567',
});
```

---

## 6. Seguridad Implementada (P0 Mitigados)

### Tokens

| Vulnerabilidad | Mitigación |
|---------------|------------|
| Token en localStorage | Tokens en memoria (in-memory) |
| Token exposure | Solo accessToken expuesto, refreshToken en Supabase |
| Token expiry | Auto-refresh antes de expiración |
| Interceptor 401 | Redirect automático a login |

### Rutas

| Vulnerabilidad | Mitigación |
|---------------|------------|
| Acceso sin auth | Next.js middleware bloquea rutas protegidas |
| RBAC bypass | Doble verificación (middleware + componente) |
| Tenant isolation | Header obligatorio `x-tenant-id` |

### API

| Vulnerabilidad | Mitigación |
|---------------|------------|
| Request sin tenant | Queries deshabilitadas sin tenantId |
| Retry infinito | Max 3 retries con backoff exponencial |
| Request timeout | Timeout de 30 segundos |

---

## 7. Sistema RBAC

### Roles y Permisos

```typescript
// Jerarquía de roles (menor a mayor)
viewer → sales_rep → manager → admin → owner

// Permisos por categoría
LEAD: CREATE, READ, READ_ALL, UPDATE, UPDATE_ALL, DELETE, ASSIGN, QUALIFY, EXPORT
STATS: VIEW, EXPORT
USER: INVITE, MANAGE, VIEW
TENANT: SETTINGS, BILLING
```

### Uso en Componentes

```tsx
// Guard de permisos
<PermissionGuard permission="LEAD_CREATE">
  <CreateLeadButton />
</PermissionGuard>

// Hook de permisos
const { canCreateLead, canManageUsers, isAdmin } = usePermissions();

// Verificación de rol
const canAccess = useIsAtLeastRole('manager');
```

---

## 8. Multi-tenancy

### Resolución de Tenant

1. **Subdomain**: `acme.zuclubit.com` → tenant: `acme`
2. **Path**: `/t/acme/app` → tenant: `acme`
3. **Header**: `x-tenant-id` en todas las requests

### Flujo

```
1. Usuario hace login
2. Backend retorna lista de tenants disponibles
3. Frontend selecciona primer tenant activo
4. Todas las requests incluyen x-tenant-id
5. Backend filtra datos por tenant
6. Usuario puede cambiar tenant (switchTenant)
```

### Feature Flags por Plan

```typescript
// Plan Free
{ whatsapp: false, cfdi: false, analytics: false, ... }

// Plan Pro/Enterprise
{ whatsapp: true, cfdi: true, analytics: true, workflows: true, ... }

// Uso
const hasWhatsApp = useHasFeature('whatsapp');
```

---

## 9. Riesgos para FASE 3

| Riesgo | Impacto | Mitigación Sugerida |
|--------|---------|---------------------|
| Session management | Medio | Implementar logout en todas las pestañas |
| Rate limiting frontend | Bajo | Agregar throttling en mutations |
| Cache invalidation | Medio | Definir estrategia de invalidación por módulo |
| Form state | Bajo | Implementar auto-save draft |
| Offline support | Bajo | Agregar service worker básico |

---

## 10. Próximos Pasos (FASE 3)

### Módulos CRM

1. **Leads Module**
   - CRUD completo
   - Bulk operations
   - Import/Export

2. **Customers Module**
   - Conversión de leads
   - 360 view

3. **Opportunities Module**
   - Pipeline/Kanban
   - Forecast

4. **Users Module**
   - Invitaciones
   - Gestión de roles

### Mejoras Técnicas

1. Implementar WebSocket para real-time
2. Agregar cache optimista en mutations
3. Implementar form builder dinámico
4. Agregar audit log en frontend

---

## 11. Variables de Entorno Requeridas

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJxxx

# API
NEXT_PUBLIC_API_URL=http://localhost:3000

# App
NEXT_PUBLIC_APP_URL=http://localhost:3001
NEXT_PUBLIC_TENANT_MODE=path
```

---

## 12. Comandos

```bash
# Desarrollo
cd apps/web
npm install
npm run dev

# Tests
npm run test

# Build
npm run build

# Type check
npm run typecheck
```

---

## Checklist FASE 2 ✅

- [x] Login/Logout/Register pages
- [x] Supabase Auth integration
- [x] JWT token management (in-memory)
- [x] Auto token refresh
- [x] Next.js middleware protection
- [x] AuthGuard component
- [x] GuestGuard component
- [x] PermissionGuard component
- [x] usePermissions hook
- [x] RBAC types and helpers
- [x] API client with interceptors
- [x] Retry with exponential backoff
- [x] 401 auto-redirect
- [x] Zustand auth store
- [x] Zustand tenant store
- [x] Zustand UI store
- [x] Multi-tenant header injection
- [x] TanStack Query hooks with tenant
- [x] Basic integration tests
- [x] Complete documentation

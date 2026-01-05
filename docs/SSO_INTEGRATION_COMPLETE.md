# Integración SSO Completa - Zuclubit Smart CRM

## Resumen Ejecutivo

**Modo: AGRESIVO** - Sistema limpio sin usuarios existentes.

Se ha integrado `zuclubit-smart-crm` con `zuclubit-sso` como **único** proveedor de autenticación. Todo el código y datos de autenticación legacy han sido eliminados.

**Fecha:** 2026-01-04
**Cliente SSO:** `ventazo`
**Modo de Auth:** SSO Only (sin fallback)

---

## Cambios Realizados

### Archivos Eliminados

| Directorio/Archivo | Descripción |
|-------------------|-------------|
| `src/app/(auth)/register/` | Página de registro legacy |
| `src/app/(auth)/forgot-password/` | Página de recuperar contraseña |
| `src/app/(auth)/reset-password/` | Página de reset password |
| `apps/web/src/app/(auth)/register/` | Duplicado en apps/web |
| `apps/web/src/app/(auth)/forgot-password/` | Duplicado en apps/web |
| `apps/web/src/app/(auth)/reset-password/` | Duplicado en apps/web |
| `apps/web/src/app/api/auth/login/` | API route login legacy |
| `apps/web/src/app/api/auth/session/` | API route session legacy |

### Archivos Modificados

| Archivo | Cambios |
|---------|---------|
| `src/app/(auth)/login/page.tsx` | Solo botón SSO, sin formulario |
| `middleware.ts` | Solo SSO, sin hybrid/legacy |
| `src/lib/session/index.ts` | Tipos para SSO (authMode, tenantSlug, permissions) |
| `src/lib/session/actions.ts` | Solo acciones SSO |
| `apps/web/src/app/api/auth/logout/route.ts` | Revocación SSO |
| `.env.example` | Solo configuración SSO |

### Archivos Creados

| Archivo | Propósito |
|---------|-----------|
| `src/lib/auth/sso-config.ts` | Configuración OAuth2/OIDC |
| `src/app/api/auth/callback/zuclubit-sso/route.ts` | Callback OIDC |
| `supabase/migrations/20260104000001_sso_integration.sql` | Migración BD |

---

## Flujo de Autenticación

```
Usuario → /login → SSO Authorize → SSO Login → Callback → /app
```

1. Usuario va a `/login`
2. Click en "Iniciar sesión con Zuclubit"
3. Redirect a `sso.zuclubit.com/oauth/authorize`
4. Usuario se autentica en SSO
5. SSO redirect a `/api/auth/callback/zuclubit-sso`
6. Callback crea session cookie
7. Redirect a `/app`

---

## Variables de Entorno

```bash
# SSO Server
SSO_ISSUER_URL=https://sso.zuclubit.com
SSO_JWKS_URI=https://sso.zuclubit.com/.well-known/jwks.json

# OAuth Client
SSO_CLIENT_ID=ventazo
SSO_CLIENT_SECRET=<obtener-de-admin>

# Authentication (SSO Only)
AUTH_MODE=sso

# Session
SESSION_SECRET=<generar-secreto-seguro>

# Frontend
NEXT_PUBLIC_SSO_ISSUER_URL=https://sso.zuclubit.com
NEXT_PUBLIC_SSO_CLIENT_ID=ventazo
```

---

## Migración de Base de Datos

### Ejecutar Migración

```bash
# Opción 1: Supabase CLI
supabase db push

# Opción 2: SQL directo
psql $DATABASE_URL < supabase/migrations/20260104000001_sso_integration.sql

# Opción 3: Supabase Dashboard
# 1. Ir a SQL Editor
# 2. Copiar contenido de 20260104000001_sso_integration.sql
# 3. Ejecutar
```

### Cambios en BD

- ✅ Trigger `on_auth_user_created` eliminado
- ✅ FK `profiles_id_fkey` a `auth.users` eliminado
- ✅ Columna `sso_user_id` agregada a `profiles`
- ✅ Columna `sso_tenant_id` agregada a `tenants`
- ✅ Funciones actualizadas para leer JWT claims
- ✅ `tenant_memberships` marcada como deprecated

---

## Configuración del Cliente SSO

### En zuclubit-sso Admin

1. Verificar cliente `ventazo` existe
2. Configurar redirect URIs:
   - `https://crm.zuclubit.com/api/auth/callback/zuclubit-sso`
   - `http://localhost:3000/api/auth/callback/zuclubit-sso`
3. Configurar scopes permitidos:
   - `openid`
   - `profile`
   - `email`
   - `offline_access`
   - `crm:read`
   - `crm:write`

---

## Validación

### Checklist

- [ ] SSO server accesible
- [ ] Client `ventazo` configurado
- [ ] Redirect URIs permitidos
- [ ] Variables de entorno configuradas
- [ ] Migración de BD ejecutada
- [ ] Login SSO funciona
- [ ] Logout revoca tokens
- [ ] Session refresh funciona

### Prueba Manual

```bash
# Desarrollo
npm run dev

# Ir a http://localhost:3000/login
# Click "Iniciar sesión con Zuclubit"
# Autenticarse en SSO
# Verificar redirect a /app
```

---

## Troubleshooting

### Error: "Token exchange failed"
- Verificar `SSO_CLIENT_SECRET` es correcto
- Verificar redirect URI coincide exactamente

### Error: "Invalid audience"
- Verificar `SSO_CLIENT_ID` = `ventazo`

### Error: "Session expired"
- Token SSO expiró, redirect a login

### Usuario sin tenant
- SSO no asignó tenant
- Redirect a onboarding

---

## Notas de Seguridad

1. **No hay fallback** - Si SSO está caído, nadie puede autenticarse
2. **Tokens en cookie httpOnly** - No expuestos a JavaScript
3. **Token revocation** - Logout revoca tokens en SSO
4. **PKCE ready** - Código preparado para PKCE (no implementado aún)

---

## Contacto

- Repositorio SSO: `zuclubit-sso`
- Admin SSO: `https://sso.zuclubit.com/admin`

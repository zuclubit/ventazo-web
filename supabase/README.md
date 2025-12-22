# Supabase - Zuclubit CRM

Configuración de Supabase para desarrollo local del CRM multi-tenant.

## Requisitos

- Docker Desktop
- Supabase CLI (`brew install supabase/tap/supabase`)

## Inicio Rápido

```bash
# 1. Iniciar Supabase
supabase start

# 2. Aplicar migraciones y seeds
supabase db reset

# 3. Crear usuarios de prueba
./scripts/create-test-users.sh
```

## URLs de Desarrollo

| Servicio | URL |
|----------|-----|
| **Supabase Studio** | http://127.0.0.1:54323 |
| **API (REST)** | http://127.0.0.1:54321/rest/v1 |
| **Auth** | http://127.0.0.1:54321/auth/v1 |
| **Mailpit (emails)** | http://127.0.0.1:54324 |
| **Database** | postgresql://postgres:postgres@127.0.0.1:54322/postgres |

## Credenciales de Prueba

| Email | Password | Rol |
|-------|----------|-----|
| owner@demo.com | Test1234! | Owner |
| admin@demo.com | Test1234! | Admin |
| manager@demo.com | Test1234! | Manager |
| sales@demo.com | Test1234! | Sales Rep |
| viewer@demo.com | Test1234! | Viewer |

Todos pertenecen al tenant "Demo Company" (`550e8400-e29b-41d4-a716-446655440000`).

## Llaves de API

### Anon Key (público - para frontend)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

### Service Role Key (secreto - solo para backend)
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU
```

## Estructura de Base de Datos

### Tablas

| Tabla | Descripción |
|-------|-------------|
| `tenants` | Organizaciones/empresas |
| `profiles` | Perfiles de usuario (extiende auth.users) |
| `tenant_memberships` | Relación usuario-tenant con rol |
| `audit_logs` | Registro de auditoría |

### Roles RBAC

```
viewer → sales_rep → manager → admin → owner
```

Cada rol hereda los permisos del rol inferior.

### Políticas RLS

- Los usuarios solo pueden ver/editar sus propios datos
- Los usuarios solo ven tenants a los que pertenecen
- Los managers+ pueden ver todos los miembros del tenant
- Los admins+ pueden invitar y gestionar miembros
- Solo los owners pueden eliminar el tenant

## Comandos Útiles

```bash
# Ver estado
supabase status

# Reiniciar con migraciones
supabase db reset

# Ver logs
supabase logs

# Detener todo
supabase stop

# Generar tipos TypeScript
supabase gen types typescript --local > types/database.ts
```

## Planes de Tenant

| Plan | Features |
|------|----------|
| **free** | Básico |
| **starter** | +Analytics |
| **professional** | +WhatsApp, +CFDI, +Workflows |
| **enterprise** | +AI Scoring, +Custom |

## Migraciones

Las migraciones están en `supabase/migrations/`:

1. `20231207000001_create_tenants_and_profiles.sql` - Tablas base
2. `20231207000002_create_rls_policies.sql` - Políticas de seguridad

Para crear una nueva migración:
```bash
supabase migration new nombre_migracion
```

## Producción

Para desplegar a producción:

1. Crear proyecto en [Supabase Dashboard](https://supabase.com/dashboard)
2. Vincular: `supabase link --project-ref your-project-ref`
3. Push migraciones: `supabase db push`
4. Actualizar variables de entorno en el frontend con las llaves de producción

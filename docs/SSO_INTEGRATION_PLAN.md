# Plan de Integración SSO - Zuclubit Smart CRM

## Resumen Ejecutivo

Integración del Smart CRM con el SSO centralizado de Zuclubit para autenticación unificada.

**Cliente SSO:** `ventazo`
**Secret (Dev):** `ventazo-secret-2026`
**Redirect URIs:**
- Producción: `https://crm.zuclubit.com/api/auth/callback/zuclubit-sso`
- Desarrollo: `http://localhost:3002/api/auth/callback/zuclubit-sso`

---

## Diferencias Clave

| Aspecto | CRM Actual | SSO Nuevo |
|---------|-----------|-----------|
| JWT Algoritmo | HS256 (simétrico) | RS256 (asimétrico) |
| Validación | Secret compartido | JWKS público |
| Usuarios | Supabase `auth.users` | SSO centralizado |
| Sesión | Cookie `zcrm_session` | Cookie + OIDC |
| Refresh | Manual | OAuth2 refresh_token |

---

## Fases de Implementación

### Fase 1: Configuración (Variables de Entorno)

```bash
# .env.local / .env.production
SSO_ISSUER_URL=https://sso.zuclubit.com
SSO_CLIENT_ID=ventazo
SSO_CLIENT_SECRET=ventazo-secret-2026
SSO_JWKS_URI=https://sso.zuclubit.com/.well-known/jwks.json

# Modo de transición (permitir ambos durante migración)
AUTH_MODE=hybrid  # 'legacy' | 'sso' | 'hybrid'
```

### Fase 2: Actualizar Middleware

1. Soportar validación RS256 via JWKS
2. Mantener fallback HS256 para sesiones existentes
3. Mapear claims SSO a estructura local

### Fase 3: Actualizar Auth Service

1. Cambiar login flow a OIDC
2. Implementar token refresh via SSO
3. Actualizar logout para revocar en SSO

### Fase 4: Migración de Usuarios

1. Script para exportar usuarios de Supabase
2. Importar usuarios a SSO
3. Sincronizar tenant_memberships

### Fase 5: Limpieza

1. Eliminar dependencia de `auth.users`
2. Mantener `profiles` como cache local
3. Actualizar políticas RLS

---

## Archivos a Modificar

```
zuclubit-smart-crm/
├── .env.example                    # Agregar vars SSO
├── middleware.ts                   # RS256 validation
├── src/
│   ├── lib/
│   │   ├── session/index.ts       # SSO session handling
│   │   ├── auth/
│   │   │   ├── auth-service.ts    # OIDC login flow
│   │   │   └── sso-config.ts      # NEW: SSO configuration
│   │   └── api/client.ts          # Token injection
│   ├── app/
│   │   ├── api/auth/
│   │   │   └── callback/
│   │   │       └── zuclubit-sso/
│   │   │           └── route.ts   # NEW: OIDC callback
│   │   └── (auth)/
│   │       └── login/page.tsx     # SSO redirect button
└── supabase/
    └── migrations/
        └── xxx_remove_auth_tables.sql  # Cleanup migration
```

---

## Mapeo de Claims

```typescript
// SSO Token Claims → CRM Session
{
  sub: string           → userId
  email: string         → email
  tenant_id: string     → tenantId
  tenant_slug: string   → (nuevo campo)
  role: string          → role
  permissions: string[] → permissions
  scope: string         → scopes
}
```

---

## Checklist de Validación

### Pre-Migración
- [ ] SSO funcionando en https://sso.zuclubit.com
- [ ] Cliente `ventazo` configurado
- [ ] Redirect URIs actualizados en SSO
- [ ] Variables de entorno configuradas

### Post-Fase 2 (Middleware)
- [ ] Tokens RS256 validados correctamente
- [ ] Tokens HS256 legacy funcionan (hybrid mode)
- [ ] Headers x-user-id, x-tenant-id presentes

### Post-Fase 3 (Auth Service)
- [ ] Login via SSO funciona
- [ ] Token refresh automático
- [ ] Logout revoca en SSO

### Post-Fase 4 (Migración)
- [ ] Usuarios migrados a SSO
- [ ] Membresías de tenant sincronizadas
- [ ] Login con credenciales migradas

### Post-Fase 5 (Limpieza)
- [ ] Código legacy eliminado
- [ ] Tablas auth eliminadas
- [ ] Build sin errores
- [ ] Tests pasan

---

## Notas de Seguridad

1. **Durante transición**: Soportar ambos tipos de token
2. **Después de migración**: Solo RS256 via JWKS
3. **Secrets**: Rotar `ventazo-secret-2026` en producción
4. **PKCE**: Habilitado para OAuth flow


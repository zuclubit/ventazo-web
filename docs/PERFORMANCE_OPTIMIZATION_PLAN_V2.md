# Performance Optimization Plan v2 - Ventazo CRM

**Fecha:** 2025-12-30
**Estado:** Propuesto
**Baseline:** Login 750ms | TTFB 287-782ms (variable)
**Objetivo:** Login <700ms | TTFB <200ms (estable)

---

## 1. LOGIN OPTIMIZATION (<700ms)

### 1.1 Diagnóstico

**Flujo actual en `auth.service.ts:signIn()`:**

```
1. pool.query (getUserWithPassword)      ~50-100ms
2. Check lockout (in-memory)              ~1ms
3. Check active (in-memory)               ~1ms
4. bcrypt.compare (10 rounds)            ~100ms ← BOTTLENECK
5. pool.query (resetFailedAttempts)       ~30ms
6. pool.query (updateLastLogin)           ~30ms
7. getUserTenants (cached)                ~5-100ms
8. generateTokenPair (JWT)                ~5ms
9. getOnboardingStatus                    ~50ms
─────────────────────────────────────────────────
TOTAL:                                   ~272-417ms (best case)
+ Network latency Fly.io ↔ Neon:         ~100-300ms
─────────────────────────────────────────────────
OBSERVADO:                               ~750-1100ms
```

**Causa raíz:**
1. Operaciones secuenciales post-bcrypt que podrían paralelizarse
2. Dos queries separadas para `resetFailedAttempts` y `updateLastLogin`
3. Latencia de red hacia Neon (serverless cold start)

### 1.2 Solución: Paralelización + Batch Query

**Archivo:** `services/lead-service/src/infrastructure/auth/auth.service.ts`

```typescript
// ANTES (líneas ~1700-1790, secuencial):
await this.pool.query('UPDATE users SET failed_login_attempts = 0...');
await this.pool.query('UPDATE users SET last_login_at = NOW()...');
const tenantsResult = await this.getUserTenants(userId);
const tokenResult = await this.jwtService.generateTokenPair(...);
const onboardingResult = await this.onboardingService.getOnboardingStatus(userId);

// DESPUÉS (paralelo + batch):
// 1. Combinar updates en una sola query
const updateLoginQuery = `
  UPDATE users
  SET failed_login_attempts = 0,
      locked_until = NULL,
      last_login_at = NOW()
  WHERE id = $1
`;
await this.pool.query(updateLoginQuery, [userId]);

// 2. Paralelizar operaciones independientes
const [tenantsResult, tokenResult, onboardingResult] = await Promise.all([
  this.getUserTenants(userId),
  this.jwtService.generateTokenPair(userId, email, tenantId, role),
  this.onboardingService.getOnboardingStatus(userId)
]);
```

**Impacto esperado:** -60-80ms (reducción de 750ms → ~670-690ms)

### 1.3 Solución: Connection Pool Warming

**Archivo:** `services/lead-service/src/infrastructure/database/index.ts`

```typescript
// Añadir warmup de conexiones al inicio
const pool = new Pool({
  connectionString: config.connectionString,
  ssl: { rejectUnauthorized: false },
  max: 10,
  min: 2, // ← NUEVO: mantener 2 conexiones mínimas
  idleTimeoutMillis: 30000, // ← NUEVO: 30s idle antes de cerrar
  connectionTimeoutMillis: 5000,
});

// Warmup al iniciar el servidor
export async function warmupPool() {
  const warmupQueries = 3;
  const promises = Array(warmupQueries).fill(null).map(() =>
    pool.query('SELECT 1')
  );
  await Promise.all(promises);
  console.log('[Database] Pool warmed up with', warmupQueries, 'connections');
}
```

**Archivo:** `services/lead-service/src/app.ts`

```typescript
// En la inicialización del servidor
await warmupPool();
```

### 1.4 Solución: Prepared Statements para Login

```typescript
// En auth.service.ts - constructor o init
private async prepareSt statements() {
  await this.pool.query({
    name: 'get_user_for_login',
    text: `
      SELECT id, email, full_name, avatar_url, password_hash,
             email_verified, is_active, failed_login_attempts, locked_until
      FROM users
      WHERE LOWER(email) = LOWER($1)
    `
  });
}

// En signIn - usar el prepared statement
const result = await this.pool.query({
  name: 'get_user_for_login',
  values: [email]
});
```

---

## 2. CUSTOM DOMAIN TTFB VARIABILITY

### 2.1 Diagnóstico

**Datos observados:**
| Dominio | Cold | Warm | Variabilidad |
|---------|------|------|--------------|
| ventazo.pages.dev | 177ms | 93ms | ±84ms (estable) |
| crm.zuclubit.com | 1131ms | 287-782ms | ±845ms (inestable) |

**Causa raíz probable:**
1. Custom domain pasa por DNS lookup adicional
2. SSL/TLS handshake extra para custom domain
3. Possible lack of edge caching rules específicas
4. Cloudflare proxy settings incorrectos

### 2.2 Solución: Cloudflare Page Rules

**Archivo a crear:** `apps/web/_routes.json` (Cloudflare Pages routing)

```json
{
  "version": 1,
  "include": ["/*"],
  "exclude": [
    "/api/*",
    "/_next/static/*",
    "/static/*",
    "/*.ico",
    "/*.png",
    "/*.svg"
  ]
}
```

**Configuración Cloudflare Dashboard:**
1. Ve a **crm.zuclubit.com → Rules → Page Rules**
2. Crear regla:
   - URL: `crm.zuclubit.com/login*`
   - Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 1 hour
     - Browser Cache TTL: 1 minute

3. Crear regla para landing:
   - URL: `crm.zuclubit.com/`
   - Settings:
     - Cache Level: Cache Everything
     - Edge Cache TTL: 2 hours

### 2.3 Solución: DNS Optimization

```bash
# Verificar configuración actual
dig crm.zuclubit.com

# Recomendación: Usar CNAME flattening
# En Cloudflare DNS:
# Type: CNAME
# Name: crm
# Target: ventazo.pages.dev
# Proxy status: Proxied (orange cloud)
# TTL: Auto
```

### 2.4 Solución: SSL/TLS Configuration

**En Cloudflare Dashboard → SSL/TLS:**
1. SSL mode: **Full (strict)**
2. Edge Certificates → Always Use HTTPS: **On**
3. Edge Certificates → Minimum TLS Version: **TLS 1.2**
4. Speed → Auto Minify: **HTML, CSS, JS**
5. Speed → Brotli: **On**

---

## 3. COLD START MITIGATION

### 3.1 Edge Warmup (Ya implementado)

**Archivo existente:** `.github/workflows/edge-warmup.yml`

**Mejora propuesta - añadir más endpoints:**

```yaml
- name: Warm up edge functions
  run: |
    echo "🔥 Warming up edge functions..."

    # Warm up in parallel for speed
    for url in \
      "https://crm.zuclubit.com/" \
      "https://crm.zuclubit.com/login" \
      "https://crm.zuclubit.com/register" \
      "https://ventazo.pages.dev/" \
      "https://ventazo.pages.dev/login" \
      "https://zuclubit-lead-service.fly.dev/healthz" \
      "https://zuclubit-lead-service.fly.dev/api/v1/auth/captcha/status"; do
      curl -s -o /dev/null -w "$url: %{time_total}s\n" "$url" &
    done
    wait

    echo "✅ Warmup complete"
```

### 3.2 Backend Warmup Endpoint

**Archivo:** `services/lead-service/src/presentation/routes/health.routes.ts`

```typescript
// Añadir endpoint de warmup que precalienta las conexiones críticas
fastify.get('/warmup', async (request, reply) => {
  const start = Date.now();

  // Warm up database connections
  await Promise.all([
    pool.query('SELECT 1'),
    pool.query('SELECT COUNT(*) FROM users LIMIT 1'),
    pool.query('SELECT COUNT(*) FROM tenants LIMIT 1'),
  ]);

  // Warm up cache
  const cacheService = container.resolve(CacheService);
  await cacheService.get('warmup-test');

  return {
    success: true,
    duration: Date.now() - start,
    timestamp: new Date().toISOString()
  };
});
```

### 3.3 Neon Connection Pooling (PgBouncer)

**Configuración actual (drizzle.config.ts):**
```typescript
connectionString: process.env.DATABASE_URL
// Ejemplo: postgresql://user:pass@host/db?sslmode=require
```

**Optimización - usar Neon pooler:**
```bash
# En lugar de la conexión directa, usar el pooler de Neon
# DATABASE_URL=postgresql://user:pass@aws-0-us-west-2.pooler.supabase.com:6543/postgres

# Variables de entorno recomendadas:
POSTGRES_HOST=aws-0-us-west-2.pooler.supabase.com  # pooler endpoint
POSTGRES_PORT=6543  # pooler port (no 5432)
DATABASE_URL=postgresql://user:pass@${POSTGRES_HOST}:${POSTGRES_PORT}/postgres?pgbouncer=true
```

---

## 4. DATABASE INDEXES

### 4.1 Índices existentes (verificados en schema.ts)

```sql
-- Ya existen:
CREATE INDEX leads_tenant_status_idx ON leads(tenant_id, status);
CREATE INDEX leads_tenant_created_idx ON leads(tenant_id, created_at);  -- NUEVO
CREATE INDEX opportunities_tenant_stage_idx ON opportunities(tenant_id, stage);
CREATE INDEX tasks_tenant_status_idx ON tasks(tenant_id, status);
CREATE INDEX tasks_tenant_status_due_idx ON tasks(tenant_id, status, due_date);  -- NUEVO
```

### 4.2 Índices adicionales recomendados

**Archivo:** `services/lead-service/migrations/add_performance_indexes.sql`

```sql
-- Para búsquedas de usuario por email (login)
CREATE INDEX IF NOT EXISTS users_email_lower_idx
  ON users (LOWER(email));

-- Para consultas de membresías frecuentes
CREATE INDEX IF NOT EXISTS tenant_memberships_user_tenant_idx
  ON tenant_memberships (user_id, tenant_id);

-- Para onboarding queries
CREATE INDEX IF NOT EXISTS user_onboarding_user_idx
  ON user_onboarding (user_id);

-- Para activity logs con filtro de fecha
CREATE INDEX IF NOT EXISTS activity_logs_tenant_created_idx
  ON activity_logs (tenant_id, created_at DESC);

-- Para quotes con status
CREATE INDEX IF NOT EXISTS quotes_tenant_status_idx
  ON quotes (tenant_id, status);

-- ANALYZE para actualizar estadísticas
ANALYZE users;
ANALYZE tenant_memberships;
ANALYZE user_onboarding;
```

### 4.3 Aplicar índices sin downtime

```bash
# Opción 1: Via drizzle-kit (desarrollo)
cd services/lead-service
POSTGRES_HOST=... POSTGRES_PORT=... npx drizzle-kit push:pg

# Opción 2: Conexión directa a Supabase (producción)
PGPASSWORD=xxx psql -h aws-0-us-west-2.pooler.supabase.com -U postgres.xxx -d postgres -f migrations/add_performance_indexes.sql
```

---

## 5. IMPLEMENTATION CHECKLIST

### Prioridad Alta (esta semana)

- [x] 1.2 Paralelizar operaciones post-bcrypt en signIn ✅ (2025-12-30)
- [x] 1.3 Implementar connection pool warming ✅ (2025-12-30)
- [ ] 2.2 Configurar Cloudflare Page Rules para crm.zuclubit.com
- [x] 4.2 Añadir índice `users_email_lower_idx` ✅ (2025-12-30)

### Prioridad Media (próxima semana)

- [ ] 2.3 Verificar DNS configuration (CNAME flattening)
- [ ] 2.4 Optimizar SSL/TLS settings
- [x] 3.2 Añadir endpoint /warmup ✅ (2025-12-30)
- [ ] 3.3 Migrar a Neon pooler endpoint

### Prioridad Baja (cuando sea posible)

- [ ] 1.4 Implementar prepared statements
- [x] 3.1 Mejorar edge warmup workflow ✅ (2025-12-30)
- [x] 4.2 Añadir índices restantes ✅ (2025-12-30)

---

## 6. MÉTRICAS DE ÉXITO

| Métrica | Actual | Objetivo | Criterio |
|---------|--------|----------|----------|
| Login API (warm) | 750ms | <700ms | p95 |
| Login API (cold) | 1100ms | <900ms | p99 |
| TTFB crm.zuclubit.com | 287-782ms | <200ms | p95 |
| TTFB variabilidad | ±495ms | ±50ms | stddev |
| Cold start recovery | ~500ms | <300ms | time to warm |

---

## 7. ROLLBACK PLAN

### Si login optimization causa issues:

```bash
# Revertir a código anterior
git revert HEAD --no-edit

# Redeploy
fly deploy
```

### Si Cloudflare rules causan issues:

1. Ir a Cloudflare Dashboard → Page Rules
2. Deshabilitar las reglas creadas
3. Purgar cache: Caching → Configuration → Purge Everything

### Si índices causan slowdown:

```sql
-- Eliminar índices problemáticos
DROP INDEX IF EXISTS users_email_lower_idx;
DROP INDEX IF EXISTS tenant_memberships_user_tenant_idx;

-- Restaurar estadísticas
ANALYZE;
```

---

## 8. IMPLEMENTATION LOG

### 2025-12-30 - Backend Performance Optimizations

**Implementado por:** Claude Code

**Cambios realizados:**

1. **Login Parallelization** (`auth.service.ts:1648-1663`)
   - Combinado `resetFailedLoginAttempts` + `updateLastLogin` en single query
   - Paralelizado `getUserTenants` + `getOnboardingStatus` con `Promise.all()`
   - Nuevo método `resetAttemptsAndUpdateLogin()` para query batch
   - **Impacto esperado:** -60-80ms en login

2. **Connection Pool Warming** (`infrastructure/database/index.ts`)
   - Añadido `min: 2` al pool para mantener conexiones activas
   - Nueva función `warmupPool()` para pre-calentar conexiones
   - Nueva función `getPoolStats()` para monitoreo
   - Llamada a `warmupPool()` en bootstrap (`app.ts:27-30`)
   - **Impacto esperado:** -100-200ms en primera query

3. **Warmup Endpoint** (`presentation/server.ts:1195-1249`)
   - Nuevo endpoint `GET /warmup` para pre-calentar DB y caches
   - Retorna estadísticas de pool para monitoreo
   - Documentado en Scalar API Reference

4. **Database Indexes** (`drizzle/0012_performance_indexes.sql`)
   - `users_email_lower_idx` - para login case-insensitive
   - `activity_logs_tenant_created_desc_idx` - para dashboard/audit
   - `quotes_tenant_status_idx` - para filtros de cotizaciones
   - Migración con `CREATE INDEX CONCURRENTLY` para zero-downtime

5. **Edge Warmup Workflow** (`.github/workflows/edge-warmup.yml`)
   - Warmup paralelo para frontend (crm.zuclubit.com, ventazo.pages.dev)
   - Nuevo: llamada a `/warmup` para pre-calentar DB
   - Nuevo: warmup de `/api/v1/auth/captcha/status` para cache auth

**Pendiente de deploy:**
- Deploy a Fly.io: `fly deploy`
- Aplicar índices: `npx drizzle-kit push:pg` o ejecutar SQL directo
- Configurar Cloudflare Page Rules (manual en dashboard)

**Próximos pasos post-deploy:**
1. Medir login latency (objetivo: <700ms warm)
2. Medir TTFB variabilidad en crm.zuclubit.com
3. Verificar pool stats en /warmup endpoint
4. Configurar Cloudflare Page Rules si TTFB sigue variable

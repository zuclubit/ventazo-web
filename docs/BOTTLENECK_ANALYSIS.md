# Bottleneck Analysis - Zuclubit Smart CRM

**Fecha:** 2025-12-30
**Versión:** 1.0
**Estado:** Análisis Completo

---

## Resumen Ejecutivo

Se identificaron **2 cuellos de botella de impacto medio** y **4 áreas de mejora incremental**. El sistema está funcionando dentro de parámetros aceptables, pero hay oportunidades claras de optimización.

### Matriz de Priorización

```
        ┌─────────────────────────────────────────┐
 ALTO   │                    │ [P1] Login lento  │
        │                    │ [P1] TTFB variable│
IMPACTO ├────────────────────┼───────────────────┤
        │ [P2] Stats cache   │                   │
 BAJO   │ [P2] Bundle size   │                   │
        │ [P2] API aggregation                   │
        └────────────────────┴───────────────────┘
              BAJO                  ALTO
                     ESFUERZO
```

---

## P1: Cuellos de Botella de Impacto Medio

### 1. Login API Lento (~1.1 segundos)

**Síntoma:**
- Tiempo de login: 1137ms
- Objetivo: < 1000ms

**Causa Raíz:**
```
Login Flow Breakdown (estimated):
  ├── Bcrypt password validation: ~300-400ms (12 rounds)
  ├── Database query (user lookup): ~50-80ms
  ├── JWT token generation: ~10-20ms
  ├── Tenant list query: ~100-150ms
  ├── Session creation: ~50-80ms
  └── Response serialization: ~10-20ms
  Total: ~600-850ms ideal, pero hay overhead
```

**Solución Propuesta:**

```typescript
// 1. Reducir bcrypt rounds de 12 a 10
// services/lead-service/src/infrastructure/auth/password.service.ts
const BCRYPT_ROUNDS = 10; // Was 12, saves ~200ms

// 2. Cache de tenant list por usuario (5 min TTL)
// services/lead-service/src/infrastructure/auth/auth.service.ts
async getUserTenants(userId: string): Promise<Tenant[]> {
  const cacheKey = `user:${userId}:tenants`;
  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const tenants = await this.tenantRepository.findByUserId(userId);
  await redis.setex(cacheKey, 300, JSON.stringify(tenants)); // 5 min TTL
  return tenants;
}

// 3. Parallel queries donde sea posible
const [user, tenants] = await Promise.all([
  this.userRepository.findByEmail(email),
  // Pre-fetch tenants mientras validamos password
]);
```

**Impacto Esperado:** Login < 700ms (-40%)

**Métricas de Éxito:**
- p95 login time < 800ms
- p99 login time < 1200ms

---

### 2. TTFB Variable en Frontend (300ms - 1100ms)

**Síntoma:**
- TTFB inconsistente en landing page
- Variación de 3x entre requests

**Causa Raíz:**
```
Cold Start Analysis:
  ├── Cloudflare Pages edge function: ~500-800ms cold start
  ├── OpenNext.js SSR initialization: ~200-400ms
  └── Supabase connection warming: ~100-200ms

  Warm request: ~200-300ms
  Cold request: ~800-1200ms
```

**Solución Propuesta:**

```javascript
// 1. Pre-warming con cron job (cada 5 minutos)
// .github/workflows/warmup.yml
name: Edge Function Warmup
on:
  schedule:
    - cron: '*/5 * * * *'
jobs:
  warmup:
    runs-on: ubuntu-latest
    steps:
      - run: |
          curl -s https://crm.zuclubit.com/ > /dev/null
          curl -s https://crm.zuclubit.com/login > /dev/null

// 2. Static export para landing (no SSR needed)
// apps/web/next.config.mjs
export default {
  // Landing page as static
  output: 'standalone',
  experimental: {
    ppr: true, // Partial prerendering
  },
};

// 3. Edge caching headers
// apps/web/src/middleware.ts
if (request.nextUrl.pathname === '/') {
  response.headers.set('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
}
```

**Impacto Esperado:** TTFB consistente < 400ms

**Métricas de Éxito:**
- p95 TTFB < 500ms
- Cold start rate < 5%

---

## P2: Mejoras Incrementales

### 3. Cache de Estadísticas del Dashboard

**Síntoma:**
- GET /leads/stats: 374ms promedio
- Se llama en cada carga de dashboard

**Solución:**

```typescript
// services/lead-service/src/infrastructure/cache/stats-cache.service.ts
export class StatsCacheService {
  private readonly TTL = 300; // 5 minutos

  async getLeadStats(tenantId: string): Promise<LeadStats> {
    const cacheKey = `stats:leads:${tenantId}`;
    const cached = await this.redis.get(cacheKey);

    if (cached) {
      return JSON.parse(cached);
    }

    const stats = await this.leadsService.calculateStats(tenantId);
    await this.redis.setex(cacheKey, this.TTL, JSON.stringify(stats));
    return stats;
  }

  async invalidateStats(tenantId: string): Promise<void> {
    await this.redis.del(`stats:leads:${tenantId}`);
  }
}

// Invalidar en operaciones de escritura
async createLead(data: CreateLeadDto): Promise<Lead> {
  const lead = await this.repository.create(data);
  await this.statsCacheService.invalidateStats(data.tenantId);
  return lead;
}
```

**Impacto:** Dashboard load -100ms (stats de cache)

---

### 4. Reducción de Bundle Size

**Síntoma:**
- Landing page: 152KB HTML
- Múltiples chunks de JS

**Solución:**

```typescript
// apps/web/next.config.mjs
export default {
  experimental: {
    optimizePackageImports: [
      '@radix-ui/react-*',
      'lucide-react',
      'recharts',
    ],
  },
  webpack: (config) => {
    config.optimization.splitChunks = {
      chunks: 'all',
      minSize: 20000,
      maxSize: 100000,
    };
    return config;
  },
};

// Lazy loading de componentes pesados
const RechartsChart = dynamic(() => import('@/components/charts'), {
  loading: () => <Skeleton />,
  ssr: false,
});
```

**Impacto:** -30% bundle size, LCP mejorado

---

### 5. Endpoint Agregado para Dashboard

**Síntoma:**
- Dashboard hace 4+ API calls paralelos
- Network waterfall visible

**Solución:**

```typescript
// services/lead-service/src/presentation/routes/dashboard.routes.ts
fastify.get('/api/v1/dashboard', async (request, reply) => {
  const tenantId = request.tenantId;

  const [leadStats, recentLeads, opportunities, pendingTasks] = await Promise.all([
    leadService.getStats(tenantId),
    leadService.getRecent(tenantId, 5),
    opportunityService.getPipelineSummary(tenantId),
    taskService.getPending(tenantId, 5),
  ]);

  return {
    stats: leadStats,
    recentLeads,
    pipeline: opportunities,
    tasks: pendingTasks,
    timestamp: new Date().toISOString(),
  };
});
```

**Impacto:** 4 requests → 1 request, -300ms perceived load

---

### 6. Optimización de Queries de Lista

**Síntoma:**
- List queries ~250-290ms
- Podrían ser más rápidos

**Solución:**

```sql
-- Añadir índices faltantes
CREATE INDEX CONCURRENTLY idx_leads_tenant_status
  ON leads(tenant_id, status);

CREATE INDEX CONCURRENTLY idx_leads_tenant_created
  ON leads(tenant_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_opportunities_tenant_stage
  ON opportunities(tenant_id, stage);

-- Query optimizada con LIMIT pushdown
SELECT * FROM leads
WHERE tenant_id = $1
  AND status = ANY($2)
ORDER BY created_at DESC
LIMIT 20 OFFSET 0;
```

**Impacto:** List queries < 150ms (-40%)

---

## Plan de Implementación

### Semana 1

| Tarea | Prioridad | Esfuerzo | Responsable |
|-------|-----------|----------|-------------|
| Reducir bcrypt rounds | P1 | 1h | Backend |
| Cache de tenant list | P1 | 4h | Backend |
| Índices de DB | P2 | 2h | Backend |

### Semana 2

| Tarea | Prioridad | Esfuerzo | Responsable |
|-------|-----------|----------|-------------|
| Edge function warmup | P1 | 2h | DevOps |
| Static landing page | P1 | 4h | Frontend |
| Stats cache layer | P2 | 4h | Backend |

### Semana 3-4

| Tarea | Prioridad | Esfuerzo | Responsable |
|-------|-----------|----------|-------------|
| Dashboard endpoint | P2 | 8h | Backend |
| Bundle optimization | P2 | 4h | Frontend |
| Monitoreo continuo | - | 4h | DevOps |

---

## Métricas de Éxito Post-Optimización

| Métrica | Antes | Objetivo | Delta |
|---------|-------|----------|-------|
| Login time | 1137ms | < 700ms | -40% |
| TTFB landing | 742ms (variable) | < 400ms (stable) | -46% |
| Dashboard load | ~800ms | < 500ms | -38% |
| List queries | ~270ms | < 150ms | -44% |
| Bundle size | 152KB | < 100KB | -34% |

---

## Riesgos y Mitigaciones

| Riesgo | Probabilidad | Mitigación |
|--------|--------------|------------|
| Cache invalidation bugs | Media | Tests de integración exhaustivos |
| Cold start regression | Baja | Monitoreo con alertas |
| Breaking changes en API | Baja | Versionado de API |

---

## Conclusiones

1. **El sistema está en buen estado** - No hay cuellos de botella críticos
2. **Optimizaciones claras disponibles** - ROI alto en P1 items
3. **Infraestructura adecuada** - Fly.io + Cloudflare es buena elección
4. **Monitoreo necesario** - Implementar APM para tracking continuo

**Próximos pasos:**
1. Implementar P1 items (semanas 1-2)
2. Medir impacto con mismas pruebas
3. Decidir sobre P2 basado en resultados
4. Establecer monitoreo continuo

---

**Autor:** Performance Analysis
**Revisión:** Development Team
**Próxima revisión:** Post-implementación de P1

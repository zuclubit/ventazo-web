# Performance Test Plan - Zuclubit Smart CRM

## Executive Summary

Este documento define la estrategia completa de pruebas de rendimiento para el CRM Zuclubit, cubriendo backend APIs, frontend UX y flujos end-to-end.

**Stack bajo prueba:**
- **Backend**: Fastify 4.29 + TypeScript + PostgreSQL (Fly.io)
- **Frontend**: Next.js 14 + React 18 + Tailwind (Cloudflare Pages)
- **Base de datos**: PostgreSQL 15 (Supabase)

**URLs de Producción:**
- Backend API: `https://zuclubit-lead-service.fly.dev`
- Frontend: `https://crm.zuclubit.com` / `https://ventazo.pages.dev`

---

## 1. Objetivos de Rendimiento (SLOs)

### 1.1 Backend APIs

| Métrica | Objetivo | Crítico |
|---------|----------|---------|
| Latencia p50 | < 100ms | < 200ms |
| Latencia p95 | < 300ms | < 500ms |
| Latencia p99 | < 500ms | < 1000ms |
| Throughput | > 100 req/s | > 50 req/s |
| Error rate | < 0.1% | < 1% |
| Cold start | < 2s | < 5s |

### 1.2 Frontend Web Vitals

| Métrica | Bueno | Necesita mejora | Malo |
|---------|-------|-----------------|------|
| **LCP** (Largest Contentful Paint) | < 2.5s | 2.5-4s | > 4s |
| **FID/INP** (Interaction to Next Paint) | < 100ms | 100-200ms | > 200ms |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 0.1-0.25 | > 0.25 |
| **TTFB** (Time to First Byte) | < 800ms | 800-1800ms | > 1800ms |
| **FCP** (First Contentful Paint) | < 1.8s | 1.8-3s | > 3s |
| **TTI** (Time to Interactive) | < 3.8s | 3.8-7.3s | > 7.3s |

### 1.3 End-to-End Journeys

| Flujo | Tiempo máximo |
|-------|---------------|
| Login → Dashboard visible | < 3s |
| Dashboard → Leads page cargado | < 2s |
| Crear lead completo | < 1.5s |
| Drag & drop en Kanban | < 200ms |
| Búsqueda con resultados | < 500ms |

---

## 2. Alcance de Pruebas

### 2.1 Endpoints Backend Críticos

```yaml
Authentication:
  - POST /api/v1/auth/login           # Login principal
  - POST /api/v1/auth/refresh         # Token refresh
  - GET  /api/v1/auth/session         # Session check
  - GET  /api/v1/auth/tenants         # Tenant list

Core CRUD:
  - GET  /api/v1/leads                # List leads (paginado)
  - POST /api/v1/leads                # Create lead
  - GET  /api/v1/leads/:id            # Get lead detail
  - PUT  /api/v1/leads/:id            # Update lead
  - GET  /api/v1/leads/stats/overview # Dashboard KPIs

  - GET  /api/v1/opportunities        # List opportunities
  - POST /api/v1/opportunities        # Create opportunity
  - PUT  /api/v1/opportunities/:id    # Update opportunity

  - GET  /api/v1/customers            # List customers
  - GET  /api/v1/tasks                # List tasks
  - GET  /api/v1/quotes               # List quotes

Dashboard Aggregations:
  - GET /api/v1/leads/stats/overview
  - GET /api/v1/opportunities (con filtros)
  - GET /api/v1/tasks?status=pending

Search & Filters:
  - GET /api/v1/leads?search=keyword
  - GET /api/v1/leads?status=new&page=1
```

### 2.2 Páginas Frontend Críticas

```yaml
Public Routes:
  - /login                    # Login page
  - /                         # Landing page

Authenticated Routes:
  - /app                      # Dashboard
  - /app/leads                # Leads Kanban
  - /app/opportunities        # Opportunities Kanban
  - /app/customers            # Customers list
  - /app/tasks                # Tasks Kanban
  - /app/quotes               # Quotes list
  - /app/settings             # Settings hub
  - /app/settings/team        # Team management
```

### 2.3 User Journeys E2E

```yaml
Journey 1 - Sales Rep Morning:
  1. Login con credenciales
  2. Ver dashboard con KPIs
  3. Navegar a leads
  4. Filtrar por status "new"
  5. Abrir detalle de lead
  6. Actualizar notas
  7. Mover lead a siguiente stage

Journey 2 - Manager Pipeline Review:
  1. Login
  2. Navegar a opportunities
  3. Ver pipeline Kanban
  4. Filtrar por fecha de cierre
  5. Abrir oportunidad específica
  6. Editar valor y probabilidad
  7. Guardar cambios

Journey 3 - Create New Lead:
  1. Login
  2. Navegar a leads
  3. Click "Nuevo Lead"
  4. Completar formulario
  5. Guardar lead
  6. Verificar en lista
```

---

## 3. Herramientas y Configuración

### 3.1 Backend Load Testing

**Herramienta principal: k6 (Grafana Labs)**

```bash
# Instalación
brew install k6

# Ejecución local
k6 run tests/performance/k6/load-test.js

# Con output a Grafana Cloud
k6 run --out cloud tests/performance/k6/load-test.js
```

**Tipos de prueba:**
- **Smoke test**: 1-5 VUs, 1 min - validar funcionamiento
- **Load test**: 50-100 VUs, 10 min - carga normal
- **Stress test**: 200+ VUs, ramp-up - encontrar límites
- **Soak test**: 50 VUs, 2+ horas - estabilidad

### 3.2 Frontend Performance

**Herramientas:**
- **Lighthouse CI**: Auditorías automatizadas
- **Web Vitals API**: Métricas RUM (Real User Monitoring)
- **Playwright**: E2E con métricas integradas
- **Chrome DevTools Performance Panel**: Profiling detallado

```bash
# Lighthouse CLI
npm install -g @lhci/cli
lhci autorun

# Playwright con métricas
npx playwright test tests/performance/
```

### 3.3 E2E Performance

**Herramienta: Playwright**

```bash
# Instalación
npm install -D @playwright/test

# Ejecución
npx playwright test --project=performance
```

---

## 4. Escenarios de Carga

### 4.1 Perfiles de Carga

```javascript
// Perfil: Día laboral normal
export const normalLoad = {
  stages: [
    { duration: '2m', target: 20 },   // Ramp-up
    { duration: '10m', target: 50 },  // Carga sostenida
    { duration: '2m', target: 20 },   // Ramp-down
    { duration: '1m', target: 0 },    // Cooldown
  ]
};

// Perfil: Pico de actividad (9am CDMX)
export const peakLoad = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '5m', target: 150 },  // Pico
    { duration: '5m', target: 100 },
    { duration: '2m', target: 0 },
  ]
};

// Perfil: Stress test
export const stressLoad = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '3m', target: 100 },
    { duration: '3m', target: 200 },
    { duration: '3m', target: 300 },  // Breaking point
    { duration: '2m', target: 0 },
  ]
};
```

### 4.2 Distribución de Requests

Basado en comportamiento real de usuarios CRM:

```javascript
export const requestDistribution = {
  // High frequency (60% of traffic)
  'GET /api/v1/leads': 25,
  'GET /api/v1/leads/:id': 15,
  'GET /api/v1/leads/stats': 10,
  'GET /api/v1/opportunities': 10,

  // Medium frequency (25% of traffic)
  'GET /api/v1/tasks': 8,
  'GET /api/v1/customers': 7,
  'PUT /api/v1/leads/:id': 5,
  'GET /api/v1/auth/session': 5,

  // Low frequency (15% of traffic)
  'POST /api/v1/leads': 5,
  'POST /api/v1/tasks': 3,
  'PUT /api/v1/opportunities/:id': 3,
  'POST /api/v1/auth/login': 2,
  'POST /api/v1/auth/refresh': 2,
};
```

---

## 5. Métricas y Thresholds

### 5.1 k6 Thresholds

```javascript
export const options = {
  thresholds: {
    // Response time thresholds
    'http_req_duration': ['p(95)<500', 'p(99)<1000'],
    'http_req_duration{endpoint:login}': ['p(95)<800'],
    'http_req_duration{endpoint:leads_list}': ['p(95)<400'],
    'http_req_duration{endpoint:lead_create}': ['p(95)<600'],
    'http_req_duration{endpoint:dashboard}': ['p(95)<500'],

    // Error thresholds
    'http_req_failed': ['rate<0.01'],      // < 1% errors
    'http_req_failed{critical:yes}': ['rate<0.001'], // < 0.1% for critical

    // Throughput
    'http_reqs': ['rate>50'],              // > 50 req/s

    // Custom metrics
    'login_duration': ['p(95)<1000'],
    'lead_creation_time': ['p(95)<800'],
  }
};
```

### 5.2 Lighthouse CI Thresholds

```javascript
// lighthouserc.js
module.exports = {
  ci: {
    assert: {
      assertions: {
        'categories:performance': ['error', { minScore: 0.8 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.9 }],
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3500 }],
      }
    }
  }
};
```

---

## 6. Infraestructura de Pruebas

### 6.1 Ambiente de Pruebas

```yaml
Backend:
  URL: https://zuclubit-lead-service.fly.dev
  Region: Primary deployment
  Resources: 2 shared-cpu-1x machines (autoscaling)

Frontend:
  URL: https://ventazo.pages.dev (staging) / https://crm.zuclubit.com (prod)
  CDN: Cloudflare Pages
  Edge locations: Global

Database:
  PostgreSQL: Supabase (pooler connection)
  Connection pool: 20 max connections
  Region: us-west-2

Test Runner:
  Local: MacOS with k6 + Playwright
  CI: GitHub Actions (optional)
```

### 6.2 Datos de Prueba

```yaml
Test Tenant:
  ID: 977eaca1-295d-4ee2-8310-985a4e06c547
  Name: Zuclubit Smart CRM

Test Users:
  - email: oscar@cuervo.cloud
    password: [secure]
    role: owner

Test Data Volume:
  - Leads: 50-100 records
  - Opportunities: 30-50 records
  - Customers: 20-30 records
  - Tasks: 50-100 records
```

---

## 7. Plan de Ejecución

### Fase 1: Baseline (Día 1)

1. **Smoke tests** de todos los endpoints
2. **Lighthouse** audits de páginas críticas
3. **Documentar estado actual**

### Fase 2: Load Testing (Día 2-3)

1. **Backend load tests** con k6
2. **Identificar cuellos de botella**
3. **Medir cold starts**

### Fase 3: Frontend Performance (Día 3-4)

1. **Web Vitals** en todas las páginas
2. **E2E journeys** con Playwright
3. **Profile React rendering**

### Fase 4: Stress & Stability (Día 4-5)

1. **Stress tests** para encontrar límites
2. **Soak tests** para estabilidad
3. **Recovery testing**

### Fase 5: Analysis & Report (Día 5)

1. **Compilar resultados**
2. **Identificar P0/P1/P2 issues**
3. **Crear recomendaciones**

---

## 8. Entregables

| Documento | Descripción |
|-----------|-------------|
| `PERFORMANCE_TEST_PLAN.md` | Este documento |
| `BACKEND_LOAD_TEST_REPORT.md` | Resultados de k6 |
| `FRONTEND_WEB_VITALS_REPORT.md` | Métricas de frontend |
| `E2E_PERFORMANCE_RESULTS.md` | Resultados de journeys |
| `BOTTLENECK_ANALYSIS.md` | Análisis de problemas |
| `PERFORMANCE_BASELINE.md` | Línea base documentada |

---

## 9. Estructura de Archivos

```
tests/performance/
├── k6/
│   ├── config/
│   │   └── environments.js
│   ├── scenarios/
│   │   ├── smoke-test.js
│   │   ├── load-test.js
│   │   ├── stress-test.js
│   │   └── soak-test.js
│   ├── utils/
│   │   ├── auth.js
│   │   └── helpers.js
│   └── main.js
├── playwright/
│   ├── e2e-performance.spec.ts
│   └── web-vitals.spec.ts
├── lighthouse/
│   └── lighthouserc.js
└── reports/
    └── [generated reports]
```

---

## 10. Contacto y Escalación

| Rol | Responsable |
|-----|-------------|
| Performance Lead | Oscar Valois |
| Backend Owner | Desarrollo |
| Frontend Owner | Desarrollo |
| Infrastructure | DevOps |

---

**Última actualización**: 2025-12-29
**Versión**: 1.0.0

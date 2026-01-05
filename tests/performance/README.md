# Performance Testing Suite - Zuclubit Smart CRM

Suite completa de pruebas de rendimiento para el CRM Zuclubit, cubriendo backend APIs, frontend UX y flujos end-to-end.

## Quick Start

```bash
# Instalar dependencias
brew install k6
npm install -g @lhci/cli
cd tests/performance/playwright && npm install

# Ejecutar smoke tests (validación rápida)
./run-all-tests.sh smoke

# Ejecutar todas las pruebas
./run-all-tests.sh all
```

## Estructura del Proyecto

```
tests/performance/
├── k6/                     # Backend load testing
│   ├── config/
│   │   └── environments.js # Configuración de ambientes
│   ├── scenarios/
│   │   ├── smoke-test.js   # Validación rápida
│   │   ├── load-test.js    # Carga normal
│   │   ├── stress-test.js  # Encontrar límites
│   │   └── soak-test.js    # Estabilidad
│   ├── utils/
│   │   ├── auth.js         # Autenticación
│   │   └── helpers.js      # Utilidades
│   └── main.js             # Entry point
├── playwright/             # E2E performance
│   ├── e2e-performance.spec.ts
│   └── playwright.config.ts
├── lighthouse/             # Web Vitals
│   └── lighthouserc.js
├── reports/                # Resultados
├── run-all-tests.sh        # Script principal
└── README.md
```

## Tipos de Pruebas

### Backend (k6)

| Tipo | VUs | Duración | Propósito |
|------|-----|----------|-----------|
| Smoke | 1-3 | 2 min | Validar funcionamiento |
| Load | 20-50 | 15 min | Carga normal de producción |
| Stress | 50-250 | 20 min | Encontrar límites del sistema |
| Soak | 50 | 2+ horas | Detectar memory leaks |

```bash
# Smoke test
k6 run tests/performance/k6/scenarios/smoke-test.js

# Load test
k6 run tests/performance/k6/scenarios/load-test.js

# Con ambiente específico
k6 run --env K6_ENV=production tests/performance/k6/main.js
```

### Frontend (Playwright)

Mide rendimiento real del usuario:
- Login flow
- Dashboard load time
- Navegación entre páginas
- Interacciones (clicks, formularios)
- Web Vitals (LCP, FCP, CLS)

```bash
cd tests/performance/playwright
npx playwright test
```

### Web Vitals (Lighthouse)

Auditorías automatizadas de:
- Performance score
- Core Web Vitals
- Accessibility
- Best practices
- SEO

```bash
cd tests/performance/lighthouse
npx lhci autorun
```

## Thresholds (Objetivos)

### Backend APIs

| Métrica | Objetivo | Crítico |
|---------|----------|---------|
| p95 latency | < 500ms | < 1000ms |
| p99 latency | < 1000ms | < 2000ms |
| Error rate | < 0.1% | < 1% |
| Throughput | > 100 req/s | > 50 req/s |

### Frontend Web Vitals

| Métrica | Bueno | Necesita mejora |
|---------|-------|-----------------|
| LCP | < 2.5s | < 4s |
| FCP | < 1.8s | < 3s |
| INP | < 100ms | < 200ms |
| CLS | < 0.1 | < 0.25 |
| TTFB | < 800ms | < 1800ms |

## Configuración

### Variables de Ambiente

```bash
# Backend
export K6_ENV=staging  # staging | production | local
export BACKEND_URL=https://zuclubit-lead-service.fly.dev

# Frontend
export FRONTEND_URL=https://crm.zuclubit.com

# Credenciales de prueba
export TEST_EMAIL=oscar@cuervo.cloud
export TEST_PASSWORD=***
```

### Ambientes Disponibles

- **local**: `http://localhost:3000` / `http://localhost:3001`
- **staging**: `https://zuclubit-lead-service.fly.dev` / `https://ventazo.pages.dev`
- **production**: `https://zuclubit-lead-service.fly.dev` / `https://crm.zuclubit.com`

## Endpoints Probados

### Críticos (High Priority)
- `POST /api/v1/auth/login` - Autenticación
- `GET /api/v1/leads` - Lista de leads
- `GET /api/v1/leads/stats/overview` - KPIs dashboard
- `GET /api/v1/opportunities` - Pipeline

### Secundarios
- `GET /api/v1/customers` - Clientes
- `GET /api/v1/tasks` - Tareas
- `POST /api/v1/leads` - Crear lead
- `PUT /api/v1/leads/:id` - Actualizar lead

## Reportes

Los reportes se generan en `tests/performance/reports/`:

- `k6-*.json` - Resultados de k6
- `k6-*.log` - Logs de ejecución
- `playwright-report/` - Reporte HTML de Playwright
- `lighthouse-ci/` - Reportes de Lighthouse
- `SUMMARY.md` - Resumen ejecutivo

## CI/CD Integration

### GitHub Actions

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 6 * * 1'  # Weekly on Monday 6am
  workflow_dispatch:

jobs:
  performance:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install k6
        run: |
          curl https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz -L | tar xz
          sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/

      - name: Run smoke tests
        run: k6 run tests/performance/k6/scenarios/smoke-test.js
        env:
          K6_ENV: staging

      - name: Upload results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: tests/performance/reports/
```

## Troubleshooting

### k6 no encuentra módulos

```bash
# Verificar estructura de archivos
ls -la tests/performance/k6/

# Ejecutar desde directorio correcto
cd tests/performance/k6 && k6 run scenarios/smoke-test.js
```

### Error de autenticación

```bash
# Verificar credenciales
curl -X POST https://zuclubit-lead-service.fly.dev/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"***"}'
```

### Playwright no inicia

```bash
# Instalar navegadores
npx playwright install chromium

# Verificar instalación
npx playwright --version
```

### Lighthouse falla

```bash
# Verificar conectividad
curl -I https://crm.zuclubit.com

# Ejecutar en modo debug
DEBUG=lhci* npx lhci autorun
```

## Próximos Pasos

1. **Integrar con Grafana Cloud** para visualización de k6
2. **Añadir alertas** en Slack/Teams para degradaciones
3. **Automatizar** ejecución semanal en CI/CD
4. **Crear dashboards** de tendencias históricas
5. **Implementar budget** de performance en PRs

---

**Mantenido por:** Zuclubit Development Team
**Última actualización:** 2025-12-29

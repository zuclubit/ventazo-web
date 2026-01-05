# WorldCup Analytics - Guía de Integración

## Resumen Ejecutivo

Este documento describe cómo el nuevo módulo **WorldCup Analytics** se integra con el CRM existente de Zuclubit para ofrecer predicciones de demanda y recomendaciones a negocios locales durante el Mundial 2026.

## Arquitectura de Integración

```
┌────────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                         │
│                                                                    │
│   /app/app/                    /app/app/worldcup-analytics/        │
│   ├── leads/                   └── page.tsx (NUEVO)                │
│   ├── customers/                   ├── Demand Forecast Dashboard   │
│   ├── opportunities/               ├── Match Calendar              │
│   └── ...                          ├── Pricing Recommendations     │
│                                    └── Alerts Panel                │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                         BACKEND (Fastify)                           │
│                                                                    │
│   /services/lead-service/      /services/worldcup-analytics-service│
│   (Puerto 3001)                (Puerto 3002) - NUEVO               │
│   ├── /api/v1/leads            ├── /api/v1/worldcup/forecasts      │
│   ├── /api/v1/customers        ├── /api/v1/worldcup/matches        │
│   ├── /api/v1/analytics        ├── /api/v1/worldcup/cities         │
│   └── ...                      ├── /api/v1/worldcup/dashboard      │
│                                └── /api/v1/worldcup/alerts         │
└────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────┐
│                     INFRAESTRUCTURA COMPARTIDA                     │
│                                                                    │
│   PostgreSQL (RDS Aurora)     NATS JetStream      Redis Cache      │
│   ├── tenant                  ├── leads.*         ├── sessions     │
│   ├── user                    ├── customers.*     ├── forecasts    │
│   ├── lead                    ├── worldcup.*      └── match_data   │
│   ├── customer                └── alerts.*                         │
│   └── worldcup_* (NUEVO)                                           │
└────────────────────────────────────────────────────────────────────┘
```

## Componentes Creados

### Backend: WorldCup Analytics Service

**Ubicación:** `services/worldcup-analytics-service/`

```
worldcup-analytics-service/
├── package.json                           # Dependencias del servicio
├── tsconfig.json                          # Configuración TypeScript
├── README.md                              # Documentación del servicio
└── src/
    ├── app.ts                             # Entry point (Fastify)
    ├── domain/
    │   ├── aggregates/
    │   │   ├── local-business.aggregate.ts    # Modelo de negocio local
    │   │   ├── match-calendar.aggregate.ts    # Calendario de partidos
    │   │   └── demand-forecast.aggregate.ts   # Predicciones de demanda
    │   └── value-objects/
    │       └── host-city.ts               # 16 ciudades sede
    ├── infrastructure/
    │   └── forecasting/
    │       └── demand-forecast.service.ts # Motor de ML/predicción
    └── presentation/
        └── routes/
            └── forecast.routes.ts         # API endpoints
```

### Frontend: Dashboard WorldCup Analytics

**Ubicación:** `src/app/app/worldcup-analytics/`

```
worldcup-analytics/
├── page.tsx                # Dashboard principal
└── components/             # Componentes específicos (futuro)
```

## APIs del Servicio

### Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `POST` | `/api/v1/worldcup/forecasts` | Generar pronóstico de demanda |
| `GET` | `/api/v1/worldcup/forecasts/business/:id` | Pronósticos por negocio |
| `GET` | `/api/v1/worldcup/matches` | Calendario de partidos |
| `GET` | `/api/v1/worldcup/cities` | Lista de ciudades sede |
| `GET` | `/api/v1/worldcup/cities/:code` | Datos de ciudad específica |
| `GET` | `/api/v1/worldcup/dashboard` | Dashboard agregado |
| `POST` | `/api/v1/worldcup/alerts/subscribe` | Suscribirse a alertas |

### Ejemplo de Request

```bash
# Generar pronóstico
curl -X POST http://localhost:3002/api/v1/worldcup/forecasts \
  -H "Content-Type: application/json" \
  -d '{
    "businessId": "uuid-del-negocio",
    "hostCityCode": "MEX",
    "businessCategory": "RESTAURANT",
    "distanceToStadiumKm": 2.5,
    "capacity": 100,
    "targetDate": "2026-06-15T00:00:00Z"
  }'
```

## Modelos de Datos

### LocalBusiness (Negocio Local)

```typescript
interface LocalBusinessProps {
  id: string;
  tenantId: string;              // Conexión con CRM
  name: string;
  category: BusinessCategory;    // RESTAURANT, BAR_PUB, HOTEL, etc.
  location: {
    hostCityCode: string;        // MEX, DFW, NYC, etc.
    distanceToStadiumKm: number;
    coordinates: { lat, lng };
  };
  capacity: { maxOccupancy: number };
  subscriptionTier: 'FREE' | 'STARTER' | 'PRO' | 'ENTERPRISE';
}
```

### DemandForecast (Pronóstico)

```typescript
interface DemandForecastProps {
  businessId: string;
  forecastDate: Date;
  overallDemandIndex: number;     // 100 = normal, 200 = doble demanda
  pricingRecommendation: {
    recommendedPriceMultiplier: number;  // 1.0 - 1.5
    strategyNotes: string;
  };
  staffingRecommendation: {
    additionalStaffNeeded: number;
    peakHours: string[];
  };
  alerts: ForecastAlert[];
}
```

## Integración con CRM Existente

### 1. Conexión vía Tenant

Los negocios del WorldCup Analytics se conectan al CRM existente a través del `tenantId`:

```typescript
// Un cliente del CRM puede tener múltiples negocios registrados
Lead/Customer (CRM) ──┬── LocalBusiness (WorldCup) [Restaurante]
                      ├── LocalBusiness (WorldCup) [Hotel]
                      └── LocalBusiness (WorldCup) [Tienda]
```

### 2. Eventos NATS

El servicio publica eventos que el CRM puede consumir:

```typescript
// Eventos publicados
'worldcup.forecast.generated'   // Nuevo pronóstico generado
'worldcup.alert.triggered'      // Alerta activada
'worldcup.match.upcoming'       // Partido próximo (24h antes)

// El lead-service puede suscribirse para:
// - Crear tareas automáticas
// - Enviar notificaciones
// - Actualizar métricas del cliente
```

### 3. Base de Datos Compartida

```sql
-- Nuevas tablas para WorldCup Analytics
CREATE TABLE worldcup_local_businesses (
  id UUID PRIMARY KEY,
  tenant_id UUID REFERENCES tenants(id),  -- Conexión CRM
  customer_id UUID REFERENCES customers(id),
  host_city_code VARCHAR(3),
  category VARCHAR(50),
  ...
);

CREATE TABLE worldcup_forecasts (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES worldcup_local_businesses(id),
  forecast_date DATE,
  demand_index INTEGER,
  ...
);

CREATE TABLE worldcup_alerts (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES worldcup_local_businesses(id),
  alert_type VARCHAR(50),
  severity VARCHAR(20),
  ...
);
```

## Configuración de Desarrollo

### 1. Variables de Entorno

```env
# services/worldcup-analytics-service/.env
PORT=3002
NODE_ENV=development

# Base de datos (compartida con CRM)
DATABASE_URL=postgresql://user:pass@localhost:5432/zuclubit_crm

# NATS (compartido con CRM)
NATS_SERVERS=nats://localhost:4222

# APIs externas (futuro)
FIFA_API_KEY=
WEATHER_API_KEY=
GOOGLE_PLACES_API_KEY=
```

### 2. Docker Compose

Agregar al `docker-compose.yml` existente:

```yaml
services:
  # ... servicios existentes ...

  worldcup-analytics-service:
    build:
      context: ./services/worldcup-analytics-service
      dockerfile: Dockerfile
    ports:
      - "3002:3002"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@postgres-leads:5432/zuclubit_crm
      - NATS_SERVERS=nats://nats:4222
    depends_on:
      - postgres-leads
      - nats
```

### 3. Iniciar el Servicio

```bash
# Desarrollo
cd services/worldcup-analytics-service
npm install
npm run dev

# El servicio estará disponible en http://localhost:3002
```

## Roadmap de Integración

### Fase 1: MVP (Actual)
- [x] Servicio backend con APIs básicas
- [x] Dashboard frontend con datos mock
- [x] Modelos de dominio completos
- [x] Servicio de forecasting con ML básico

### Fase 2: Integración Completa
- [ ] Conectar con base de datos PostgreSQL compartida
- [ ] Implementar eventos NATS
- [ ] Sincronizar con datos de clientes del CRM
- [ ] Agregar autenticación Supabase compartida

### Fase 3: APIs Externas
- [ ] Integrar API de calendario FIFA
- [ ] Conectar Weather API
- [ ] Integrar Google Places para datos de competencia
- [ ] Social media sentiment analysis

### Fase 4: ML Avanzado
- [ ] Entrenar modelos con datos históricos
- [ ] Implementar análisis de competencia
- [ ] Predicciones personalizadas por negocio
- [ ] Detección de anomalías

## Modelo de Monetización

### Tiers de Suscripción

| Tier | Precio | Características |
|------|--------|-----------------|
| **FREE** | $0 | Pronóstico básico, 1 ciudad, 7 días |
| **STARTER** | $49/mes | 3 ciudades, 14 días, alertas email |
| **PRO** | $149/mes | Todas las ciudades, 30 días, WhatsApp, pricing dinámico |
| **ENTERPRISE** | $499/mes | API access, múltiples locaciones, soporte dedicado |

### Integración con Billing del CRM

```typescript
// El tier de WorldCup Analytics se puede agregar al plan existente del CRM
Customer.subscription = {
  crmPlan: 'PRO',            // $49/mes del CRM
  worldcupPlan: 'STARTER',   // $49/mes adicionales
  totalMonthly: 98           // $98/mes total
};
```

## Métricas de Éxito

### KPIs del Producto

1. **Adoption Rate**: % de clientes CRM que activan WorldCup Analytics
2. **Forecast Accuracy**: Precisión de predicciones vs. datos reales
3. **Revenue Impact**: Incremento de ingresos reportado por usuarios
4. **Alert Response Rate**: % de alertas que generan acción

### Targets Q1-Q2 2026

- 500+ negocios registrados antes del mundial
- 85%+ precisión en predicciones de demanda
- $100K MRR adicional por el módulo WorldCup
- NPS > 50 de usuarios del módulo

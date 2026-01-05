# 📮 Lead Service API - Postman Collection Guide

## 📋 Overview

Esta guía explica cómo usar la colección de Postman para el Lead Service API, siguiendo las mejores prácticas y estándares de la industria.

---

## 📁 Archivos Incluidos

```
lead-service/
├── Lead-Service.postman_collection.json       # Colección principal
├── Lead-Service-Local.postman_environment.json # Ambiente local
├── Lead-Service-Development.postman_environment.json # Ambiente dev
└── Lead-Service-Production.postman_environment.json # Ambiente prod
```

---

## 🚀 Quick Start

### 1. Importar Colección

1. Abre Postman
2. Click en **Import**
3. Arrastra los archivos `.json` o selecciónalos
4. Importa:
   - `Lead-Service.postman_collection.json`
   - Los 3 archivos de environments

### 2. Seleccionar Environment

En el dropdown superior derecho, selecciona:
- **Lead Service - Local** para desarrollo local
- **Lead Service - Development** para servidor de desarrollo
- **Lead Service - Production** para producción

### 3. Ejecutar Requests

1. Expande la colección en el sidebar izquierdo
2. Navega por las carpetas (Health, Leads - CRUD, etc.)
3. Selecciona un request
4. Click **Send**

---

## 📂 Estructura de la Colección

### 1. Health

Endpoints de salud y disponibilidad:
- ✅ **GET /health** - Health check completo
- ✅ **GET /ready** - Readiness probe (Kubernetes)

### 2. Leads - CRUD

Operaciones básicas de leads:
- ✅ **POST /api/v1/leads** - Crear lead
- ✅ **GET /api/v1/leads/:id** - Obtener por ID
- ✅ **GET /api/v1/leads** - Listar con filtros
- ✅ **PATCH /api/v1/leads/:id** - Actualizar lead

### 3. Leads - Actions

Acciones específicas:
- ✅ **PATCH /api/v1/leads/:id/status** - Cambiar estado
- ✅ **PATCH /api/v1/leads/:id/score** - Actualizar score
- ✅ **POST /api/v1/leads/:id/assign** - Asignar a usuario
- ✅ **POST /api/v1/leads/:id/qualify** - Calificar lead
- ✅ **POST /api/v1/leads/:id/follow-up** - Programar seguimiento

### 4. Stats & Queries

Estadísticas y reportes:
- ✅ **GET /api/v1/leads/stats/overview** - Estadísticas generales
- ✅ **GET /api/v1/leads/follow-ups/overdue** - Seguimientos vencidos

---

## 🔧 Variables

### Variables de Colección

Estas variables se manejan automáticamente:

| Variable | Descripción | Auto-generada |
|----------|-------------|---------------|
| `tenant_id` | ID del tenant | ✅ (primer POST) |
| `lead_id` | ID del último lead creado | ✅ (al crear lead) |
| `user_id` | ID de usuario para asignaciones | ✅ (en pre-request) |
| `correlation_id` | ID de correlación para tracing | ✅ (cada request) |
| `follow_up_date` | Fecha futura para seguimiento | ✅ (al programar) |

### Variables de Environment

Configurables por environment:

| Variable | Local | Development | Production |
|----------|-------|-------------|------------|
| `base_url` | `http://localhost:3001` | `https://dev-api.zuclubit.com` | `https://api.zuclubit.com` |
| `tenant_id` | UUID fijo | Vacío (configurar) | Vacío (configurar) |
| `auth_token` | N/A | Secret | Secret |

---

## 🧪 Tests Automáticos

Cada request incluye tests automáticos que se ejecutan después de recibir la respuesta.

### Tests Globales (Todos los Requests)

```javascript
✓ Response time is acceptable (< 3 segundos)
✓ Response has correlation ID header
✓ Content-Type is application/json (para 2xx)
```

### Tests Específicos por Endpoint

#### Create Lead
```javascript
✓ Status code is 201
✓ Response has lead ID (UUID format)
✓ Lead has correct initial status ('new')
✓ Lead has default score (50)
✓ Response has required fields
```

#### Get Lead by ID
```javascript
✓ Status code is 200
✓ Response has lead data
✓ Lead ID matches requested ID
```

#### List Leads
```javascript
✓ Status code is 200
✓ Response has data array
✓ Response has pagination
✓ Data array length <= limit
```

#### Change Status
```javascript
✓ Status code is 200
✓ Status was changed to requested value
```

#### Update Score
```javascript
✓ Status code is 200
✓ Score was updated
✓ Score category is correct (hot/warm/cold)
```

---

## 🎯 Workflow Recomendado

### Flujo Típico de Lead

Ejecuta los requests en este orden para simular un flujo completo:

```
1. Health Check
   └─> GET /health

2. Crear Lead
   └─> POST /api/v1/leads
       ├─> Guarda automáticamente lead_id
       └─> Estado inicial: "new", Score: 50

3. Contactar Lead
   └─> PATCH /api/v1/leads/:id/status
       └─> Cambiar a "contacted"

4. Actualizar Score
   └─> PATCH /api/v1/leads/:id/score
       └─> Aumentar a 85 (hot)

5. Asignar a Usuario
   └─> POST /api/v1/leads/:id/assign

6. Calificar Lead
   └─> POST /api/v1/leads/:id/qualify
       └─> Cambia automáticamente a "qualified"

7. Programar Seguimiento
   └─> POST /api/v1/leads/:id/follow-up

8. Actualizar Información
   └─> PATCH /api/v1/leads/:id

9. Consultar Estadísticas
   └─> GET /api/v1/leads/stats/overview
```

---

## 🎨 Mejores Prácticas Implementadas

### 1. **Variables Dinámicas**

```javascript
// Pre-request Script - Genera UUIDs automáticamente
if (!pm.collectionVariables.get('tenant_id')) {
    pm.collectionVariables.set('tenant_id', pm.variables.replaceIn('{{$randomUUID}}'));
}
```

### 2. **Correlation IDs**

Todos los requests incluyen `x-correlation-id` para request tracing:
```
x-correlation-id: abc123-def456
```

### 3. **Tests Automáticos**

Validación automática de:
- Status codes
- Response schema
- Business rules
- Performance (response time)

### 4. **Ejemplos de Respuesta**

Cada endpoint incluye múltiples ejemplos:
- ✅ Success - Complete
- ✅ Success - Minimal
- ❌ Error - Missing Field
- ❌ Error - Invalid Transition

### 5. **Documentación Inline**

Cada request incluye:
- Descripción clara
- Command/Query CQRS utilizado
- Parámetros requeridos y opcionales
- Reglas de negocio
- Ejemplos de uso

### 6. **Organización por Folders**

```
📁 Lead Service API
├── 📁 Health (2 requests)
├── 📁 Leads - CRUD (4 requests)
├── 📁 Leads - Actions (5 requests)
└── 📁 Stats & Queries (2 requests)
```

### 7. **Environment Management**

Separación clara de ambientes:
- 🏠 Local (desarrollo)
- 🔧 Development (testing)
- 🚀 Production (live)

---

## 🔍 Tips & Tricks

### Ver Variables Actuales

1. Click en el ícono del ojo (👁️) en la esquina superior derecha
2. Verás todas las variables de collection y environment

### Ejecutar Colección Completa

1. Click derecho en "Lead Service API"
2. Selecciona **Run collection**
3. Configura:
   - Environment
   - Número de iteraciones
   - Delay entre requests
4. Click **Run Lead Service API**

### Exportar/Compartir Colección

1. Click derecho en "Lead Service API"
2. **Export**
3. Selecciona formato: **Collection v2.1 (recommended)**
4. Comparte el archivo JSON

### Usar Newman (CLI)

```bash
# Instalar Newman
npm install -g newman

# Ejecutar colección
newman run Lead-Service.postman_collection.json \
  -e Lead-Service-Local.postman_environment.json \
  --reporters cli,json

# Con delay entre requests
newman run Lead-Service.postman_collection.json \
  -e Lead-Service-Local.postman_environment.json \
  --delay-request 1000

# Generar reporte HTML
newman run Lead-Service.postman_collection.json \
  -e Lead-Service-Local.postman_environment.json \
  --reporters htmlextra \
  --reporter-htmlextra-export report.html
```

---

## 📊 Estados y Transiciones

### Lead Status Flow

```
┌─────┐
│ NEW │
└──┬──┘
   ├──> CONTACTED ──> QUALIFIED ──> PROPOSAL ──> NEGOTIATION ──> WON
   │         │            │            │              │
   │         ▼            ▼            ▼              ▼
   └──> UNQUALIFIED   LOST        LOST           LOST
```

**Transiciones Válidas**:
- NEW → contacted, unqualified, lost
- CONTACTED → qualified, unqualified, lost
- QUALIFIED → proposal, unqualified, lost
- PROPOSAL → negotiation, won, lost
- NEGOTIATION → won, lost
- WON/LOST/UNQUALIFIED → ❌ (cerrados, sin transiciones)

### Lead Score Categories

| Score Range | Category | Icon | Description |
|-------------|----------|------|-------------|
| 80-100 | Hot | 🔥 | Alta probabilidad de conversión |
| 50-79 | Warm | 🌡️ | Probabilidad media |
| 0-49 | Cold | ❄️ | Baja probabilidad |

**Qualification Threshold**: ≥ 60

---

## 🐛 Troubleshooting

### Error: "Connection refused"

**Causa**: El servicio no está corriendo

**Solución**:
```bash
# Verificar que el servicio esté corriendo
docker-compose up -d

# O iniciar localmente
npm run dev
```

### Error: "Invalid UUID format"

**Causa**: Variable `lead_id` o `tenant_id` no está seteada

**Solución**:
1. Ejecuta primero "Create Lead" para generar `lead_id`
2. O setea manualmente en variables de collection

### Error: "Invalid status transition"

**Causa**: Intentando transición de estado inválida

**Solución**:
- Revisa el diagrama de transiciones válidas arriba
- Ejemplo: No puedes ir de "new" a "won" directamente

### Error: "Lead score is below qualification threshold"

**Causa**: Intentando calificar un lead con score < 60

**Solución**:
1. Primero ejecuta "Update Score" con score ≥ 60
2. Luego ejecuta "Qualify Lead"

### Tests Fallando

**Causa**: Respuesta del servidor diferente a la esperada

**Solución**:
1. Revisa la pestaña "Test Results"
2. Verifica el response body en la pestaña "Body"
3. Compara con los ejemplos en la documentación

---

## 📚 Referencias

- **API Documentation**: `API_REVIEW.md`
- **Testing Report**: `TESTING_REPORT.md`
- **Infrastructure Requirements**: `INFRASTRUCTURE.md`
- **Postman Learning Center**: https://learning.postman.com/
- **Newman Documentation**: https://www.npmjs.com/package/newman

---

## 🤝 Contribuir

Para agregar nuevos endpoints a la colección:

1. Duplica un request similar
2. Actualiza:
   - Nombre
   - URL
   - Body (si aplica)
   - Tests
   - Ejemplos de respuesta
3. Agrega documentación en Description
4. Exporta la colección actualizada

---

## 📄 License

Este archivo es parte del proyecto Zuclubit Smart CRM - Lead Service.

**Versión**: 0.1.0
**Fecha**: 2025-11-15
**Autor**: Claude Code + Equipo Zuclubit

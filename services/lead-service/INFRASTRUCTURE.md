# 🏗️ Requisitos de Infraestructura - Lead Service

**Servicio**: Lead Service
**Versión**: 0.1.0
**Fecha**: 2025-11-15

---

## 📋 Resumen Ejecutivo

El Lead Service requiere la siguiente infraestructura para operar:

| Componente | Tipo | Obligatorio | Descripción |
|------------|------|-------------|-------------|
| **PostgreSQL** | Base de Datos | ✅ SÍ | Almacenamiento persistente de leads |
| **NATS JetStream** | Event Streaming | ⚠️ RECOMENDADO | Comunicación entre microservicios |
| **Node.js** | Runtime | ✅ SÍ | Ejecución del servicio (v20 LTS) |

---

## 1️⃣ PostgreSQL - Base de Datos Relacional

### Especificaciones

**Versión Requerida**: PostgreSQL 16.x (Alpine recomendado)

**Configuración Mínima**:
```yaml
Image: postgres:16-alpine
Port: 5432
Database: leads
User: [configurable]
Password: [configurable]
```

### Variables de Entorno

```bash
# Obligatorias
POSTGRES_HOST=localhost           # Host del servidor PostgreSQL
POSTGRES_PORT=5432                # Puerto (default: 5432)
POSTGRES_DB=leads                 # Nombre de la base de datos
POSTGRES_USER=dev                 # Usuario de la base de datos
POSTGRES_PASSWORD=dev123          # Contraseña (cambiar en producción)

# Opcionales - Connection Pool
DB_POOL_MAX=10                    # Máximo de conexiones en el pool
DB_IDLE_TIMEOUT=30000             # Timeout de conexión idle (ms)
DB_CONNECTION_TIMEOUT=5000        # Timeout de conexión (ms)
DB_STATEMENT_TIMEOUT=60000        # Timeout de queries (ms)
```

### Schema de Base de Datos

El servicio crea automáticamente las siguientes tablas:

#### Tabla: `leads`
```sql
CREATE TABLE leads (
  id                  UUID PRIMARY KEY,
  tenant_id           UUID NOT NULL,
  company_name        VARCHAR(255) NOT NULL,
  email               VARCHAR(255) NOT NULL,
  phone               VARCHAR(50),
  website             VARCHAR(255),
  industry            VARCHAR(100),
  employee_count      INTEGER,
  annual_revenue      INTEGER,
  status              VARCHAR(50) DEFAULT 'new' NOT NULL,
  score               INTEGER DEFAULT 50 NOT NULL,
  source              VARCHAR(100) NOT NULL,
  owner_id            UUID,
  notes               TEXT,
  custom_fields       JSONB DEFAULT '{}' NOT NULL,
  created_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at          TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  last_activity_at    TIMESTAMP WITH TIME ZONE,
  next_follow_up_at   TIMESTAMP WITH TIME ZONE
);
```

**Índices Creados**:
```sql
-- Performance indexes
CREATE INDEX leads_tenant_id_idx ON leads(tenant_id);
CREATE INDEX leads_status_idx ON leads(status);
CREATE INDEX leads_owner_id_idx ON leads(owner_id);
CREATE INDEX leads_score_idx ON leads(score);
CREATE INDEX leads_email_idx ON leads(email);
CREATE INDEX leads_source_idx ON leads(source);
CREATE INDEX leads_next_follow_up_idx ON leads(next_follow_up_at);

-- Composite indexes for common queries
CREATE INDEX leads_tenant_status_idx ON leads(tenant_id, status);
CREATE INDEX leads_tenant_owner_idx ON leads(tenant_id, owner_id);
```

#### Tabla: `outbox_events`
```sql
CREATE TABLE outbox_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type    VARCHAR(100) NOT NULL,
  event_data    JSONB NOT NULL,
  tenant_id     UUID NOT NULL,
  aggregate_id  UUID NOT NULL,
  published     TIMESTAMP WITH TIME ZONE,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);
```

**Índices Creados**:
```sql
CREATE INDEX outbox_published_idx ON outbox_events(published);
CREATE INDEX outbox_tenant_id_idx ON outbox_events(tenant_id);
```

### Requerimientos de Recursos

**Desarrollo**:
```yaml
CPU: 0.5 cores
RAM: 512 MB
Disk: 1 GB (SSD recomendado)
```

**Producción** (estimado para 10k leads):
```yaml
CPU: 2 cores
RAM: 2 GB
Disk: 10 GB (SSD recomendado)
Connections Pool: 20-50
```

**Producción** (estimado para 100k leads):
```yaml
CPU: 4 cores
RAM: 8 GB
Disk: 50 GB (SSD recomendado)
Connections Pool: 50-100
```

### Health Check

```bash
pg_isready -U dev -d leads
```

### Backup y Recuperación

**Estrategia Recomendada**:
```bash
# Backup diario
pg_dump -U dev leads > backup_$(date +%Y%m%d).sql

# Backup con compresión
pg_dump -U dev leads | gzip > backup_$(date +%Y%m%d).sql.gz

# Restore
psql -U dev leads < backup_20251115.sql
```

**Retention Policy Recomendado**:
- Daily: 7 días
- Weekly: 4 semanas
- Monthly: 12 meses

### Migraciones

**Herramienta**: Drizzle ORM

**Ejecutar Migraciones**:
```bash
# Generar nueva migración
npm run db:generate

# Aplicar migraciones
npm run db:migrate

# Ver estado de migraciones
npm run db:studio
```

**Archivos de Migración**: `drizzle/0000_careful_titania.sql`

---

## 2️⃣ NATS JetStream - Event Streaming

### Especificaciones

**Versión Requerida**: NATS 2.10.x (Alpine recomendado)

**Configuración**:
```yaml
Image: nats:2.10-alpine
Client Port: 4222
HTTP Monitoring: 8222
Cluster Port: 6222
JetStream: Enabled
Storage: File-based
```

### Variables de Entorno

```bash
# Obligatorias
NATS_SERVERS=nats://localhost:4222

# Para cluster (múltiples servidores)
NATS_SERVERS=nats://server1:4222,nats://server2:4222,nats://server3:4222
```

### Configuración de JetStream

El servicio se conecta a NATS con las siguientes opciones:

```typescript
{
  servers: ['nats://localhost:4222'],
  // Configuración automática en código
}
```

**Streams Creados Automáticamente**:
- `lead-events` - Eventos del dominio de leads

**Subjects**:
- `lead.created` - Lead creado
- `lead.updated` - Lead actualizado
- `lead.status.changed` - Estado cambiado
- `lead.score.updated` - Score actualizado
- `lead.assigned` - Lead asignado
- `lead.qualified` - Lead calificado
- `lead.follow-up.scheduled` - Seguimiento programado

### Comportamiento del Servicio

**IMPORTANTE**: El servicio tiene manejo gracioso de NATS:

```typescript
// src/app.ts:61-64
const eventConnectResult = await eventPublisher.connect();
if (eventConnectResult.isFailure) {
  console.warn('Failed to connect to NATS:', eventConnectResult.error);
  // Don't fail - continue without events for development ✅
}
```

**Implicaciones**:
- ✅ El servicio **puede iniciar** sin NATS (modo degradado)
- ⚠️ Los eventos de dominio **no se publicarán**
- ⚠️ La comunicación entre microservicios **no funcionará**
- ⚠️ El Outbox Pattern **almacenará** eventos pero no los publicará

### Requerimientos de Recursos

**Desarrollo**:
```yaml
CPU: 0.25 cores
RAM: 128 MB
Disk: 1 GB
```

**Producción** (bajo volumen: <1k eventos/min):
```yaml
CPU: 1 core
RAM: 512 MB
Disk: 5 GB (SSD recomendado)
```

**Producción** (alto volumen: >10k eventos/min):
```yaml
CPU: 2 cores
RAM: 2 GB
Disk: 20 GB (SSD recomendado)
```

### Health Check

```bash
wget --spider -q http://localhost:8222/healthz
```

### Monitoring

**Endpoints de Monitoreo**:
```bash
# Server info
curl http://localhost:8222/varz

# Connection stats
curl http://localhost:8222/connz

# JetStream info
curl http://localhost:8222/jsz

# Account info
curl http://localhost:8222/accountz
```

### Persistencia de Datos

**Volumen Requerido**: `/data`

**Estrategia de Backup**:
- JetStream almacena eventos en disco
- Backup del directorio `/data` recomendado
- Retention policy configurable por stream

---

## 3️⃣ Node.js Runtime

### Especificaciones

**Versión Requerida**: Node.js 20 LTS

```bash
node --version
# v20.x.x
```

**Alternativas Soportadas**:
- Node.js 18 LTS (mínimo)
- Node.js 20 LTS (recomendado)
- Node.js 22 LTS (compatible)

### Requerimientos del Sistema

**Desarrollo**:
```yaml
CPU: 0.5 cores
RAM: 256 MB
```

**Producción** (bajo tráfico: <100 req/min):
```yaml
CPU: 1 core
RAM: 512 MB
```

**Producción** (medio tráfico: <1k req/min):
```yaml
CPU: 2 cores
RAM: 1 GB
```

**Producción** (alto tráfico: >10k req/min):
```yaml
CPU: 4 cores
RAM: 2 GB
Instancias: 2-4 (load balanced)
```

---

## 4️⃣ Servicios Opcionales

### PgAdmin (Desarrollo)

**Propósito**: Interfaz web para administrar PostgreSQL

```yaml
Image: dpage/pgadmin4:latest
Port: 5050
Credentials:
  Email: admin@zuclubit.com
  Password: admin123
```

**Acceso**: http://localhost:5050

**Uso Recomendado**: Solo en desarrollo

---

## 📦 Despliegue con Docker Compose

### Desarrollo Local

**Iniciar todos los servicios**:
```bash
docker-compose up -d
```

**Servicios levantados**:
- ✅ PostgreSQL (puerto 5432)
- ✅ NATS (puertos 4222, 8222, 6222)
- ✅ PgAdmin (puerto 5050)
- ✅ Lead Service (puerto 3001)

**Verificar estado**:
```bash
docker-compose ps
```

**Ver logs**:
```bash
# Todos los servicios
docker-compose logs -f

# Solo Lead Service
docker-compose logs -f lead-service

# Solo PostgreSQL
docker-compose logs -f postgres-leads

# Solo NATS
docker-compose logs -f nats
```

**Detener servicios**:
```bash
docker-compose down
```

**Detener y eliminar volúmenes**:
```bash
docker-compose down -v
```

### Solo Infraestructura (sin Lead Service)

```bash
# Iniciar solo PostgreSQL y NATS
docker-compose up -d postgres-leads nats

# Ejecutar Lead Service localmente
npm run dev
```

---

## 🚀 Configuración de Producción

### Opción 1: Docker Compose (Producción Simple)

```yaml
# docker-compose.prod.yml
version: '3.8'

services:
  postgres-leads:
    image: postgres:16-alpine
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: leads
    volumes:
      - postgres-leads-data:/var/lib/postgresql/data
    networks:
      - backend

  nats:
    image: nats:2.10-alpine
    restart: always
    command: ["-js", "-sd", "/data"]
    volumes:
      - nats-data:/data
    networks:
      - backend

  lead-service:
    image: zuclubit/lead-service:latest
    restart: always
    depends_on:
      - postgres-leads
      - nats
    environment:
      NODE_ENV: production
      POSTGRES_HOST: postgres-leads
      NATS_SERVERS: nats://nats:4222
      # ... más variables
    ports:
      - "3000:3000"
    networks:
      - backend

volumes:
  postgres-leads-data:
  nats-data:

networks:
  backend:
```

**Desplegar**:
```bash
docker-compose -f docker-compose.prod.yml up -d
```

### Opción 2: Kubernetes

**Deployment para Lead Service**:
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: lead-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: lead-service
  template:
    metadata:
      labels:
        app: lead-service
    spec:
      containers:
      - name: lead-service
        image: zuclubit/lead-service:latest
        ports:
        - containerPort: 3000
        env:
        - name: POSTGRES_HOST
          value: "postgres-service"
        - name: NATS_SERVERS
          value: "nats://nats-service:4222"
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        livenessProbe:
          httpGet:
            path: /health
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 3000
          initialDelaySeconds: 5
          periodSeconds: 5
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
```

**StatefulSet para PostgreSQL**:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: postgres
spec:
  serviceName: postgres-service
  replicas: 1
  selector:
    matchLabels:
      app: postgres
  template:
    metadata:
      labels:
        app: postgres
    spec:
      containers:
      - name: postgres
        image: postgres:16-alpine
        ports:
        - containerPort: 5432
        env:
        - name: POSTGRES_DB
          value: "leads"
        - name: POSTGRES_USER
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: username
        - name: POSTGRES_PASSWORD
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: password
        volumeMounts:
        - name: postgres-storage
          mountPath: /var/lib/postgresql/data
        resources:
          requests:
            cpu: 1000m
            memory: 2Gi
          limits:
            cpu: 4000m
            memory: 8Gi
  volumeClaimTemplates:
  - metadata:
      name: postgres-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 50Gi
```

**StatefulSet para NATS**:
```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: nats
spec:
  serviceName: nats-service
  replicas: 3
  selector:
    matchLabels:
      app: nats
  template:
    metadata:
      labels:
        app: nats
    spec:
      containers:
      - name: nats
        image: nats:2.10-alpine
        args: ["-js", "-sd", "/data", "--cluster_name=zuclubit"]
        ports:
        - containerPort: 4222
          name: client
        - containerPort: 8222
          name: monitoring
        - containerPort: 6222
          name: cluster
        volumeMounts:
        - name: nats-storage
          mountPath: /data
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
  volumeClaimTemplates:
  - metadata:
      name: nats-storage
    spec:
      accessModes: ["ReadWriteOnce"]
      resources:
        requests:
          storage: 20Gi
```

### Opción 3: Cloud Managed Services

**AWS**:
```yaml
PostgreSQL: Amazon RDS for PostgreSQL
  - Instance: db.t3.medium (2 vCPU, 4 GB RAM)
  - Storage: 100 GB SSD
  - Multi-AZ: Yes (producción)

NATS: Self-hosted en EC2 o ECS
  - Instance: t3.medium
  - Auto Scaling Group: 2-4 instancias

Lead Service: AWS ECS Fargate
  - Task Definition: 1 vCPU, 2 GB RAM
  - Auto Scaling: 2-10 tasks
```

**Google Cloud**:
```yaml
PostgreSQL: Cloud SQL for PostgreSQL
  - Machine: db-custom-2-7680 (2 vCPU, 7.5 GB RAM)
  - Storage: 100 GB SSD
  - High Availability: Yes

NATS: GKE o Compute Engine
  - Machine: n1-standard-2
  - Managed Instance Group

Lead Service: Cloud Run
  - CPU: 2
  - Memory: 2 GB
  - Min Instances: 1
  - Max Instances: 10
```

**Azure**:
```yaml
PostgreSQL: Azure Database for PostgreSQL
  - Tier: General Purpose
  - vCores: 2
  - Storage: 100 GB

NATS: Azure Container Instances o AKS

Lead Service: Azure Container Apps
  - CPU: 2 cores
  - Memory: 2 GB
  - Min Replicas: 2
  - Max Replicas: 10
```

---

## 🔒 Seguridad

### PostgreSQL

**Producción**:
```bash
# Cambiar password por defecto
POSTGRES_PASSWORD=<strong-random-password>

# Habilitar SSL
POSTGRES_SSL=require

# Limitar conexiones por IP
# pg_hba.conf
host    all    all    10.0.0.0/8    md5
```

### NATS

**Producción**:
```bash
# Habilitar autenticación
nats-server --user admin --pass <strong-password>

# Usar TLS
nats-server --tlscert server-cert.pem --tlskey server-key.pem
```

### Lead Service

**Variables Sensibles**:
```bash
# Usar secrets management
POSTGRES_PASSWORD=<from-vault>
NATS_TOKEN=<from-vault>
JWT_SECRET=<from-vault>
```

---

## 📊 Monitoreo

### Métricas Recomendadas

**PostgreSQL**:
- Connection count
- Active queries
- Database size
- Query performance
- Replication lag (si aplica)

**NATS**:
- Message rate
- Consumer lag
- JetStream storage usage
- Connection count

**Lead Service**:
- Request rate (requests/min)
- Response time (p50, p95, p99)
- Error rate
- Active connections
- Memory usage
- CPU usage

### Herramientas Recomendadas

- **Prometheus** + **Grafana**: Métricas y dashboards
- **ELK Stack**: Logs centralizados
- **DataDog** / **New Relic**: APM completo
- **PgHero**: Monitoring específico de PostgreSQL

---

## ✅ Checklist de Deployment

### Pre-Deployment

- [ ] PostgreSQL configurado con credenciales seguras
- [ ] NATS configurado con autenticación
- [ ] Migraciones de BD aplicadas
- [ ] Variables de entorno configuradas
- [ ] Secrets almacenados de forma segura
- [ ] Health checks configurados
- [ ] Logging configurado
- [ ] Monitoring configurado

### Post-Deployment

- [ ] Verificar health endpoints (`/health`, `/ready`)
- [ ] Verificar conexión a PostgreSQL
- [ ] Verificar conexión a NATS
- [ ] Ejecutar smoke tests
- [ ] Verificar métricas en dashboard
- [ ] Verificar logs
- [ ] Configurar alertas
- [ ] Documentar accesos

---

## 🆘 Troubleshooting

### PostgreSQL no conecta

```bash
# Verificar que PostgreSQL esté corriendo
docker-compose ps postgres-leads

# Ver logs
docker-compose logs postgres-leads

# Test de conexión
psql -h localhost -U dev -d leads

# Verificar puerto
netstat -an | grep 5432
```

### NATS no conecta

```bash
# Verificar que NATS esté corriendo
docker-compose ps nats

# Ver logs
docker-compose logs nats

# Test de conexión
curl http://localhost:8222/varz

# Verificar puerto
netstat -an | grep 4222
```

### Lead Service no inicia

```bash
# Ver logs
docker-compose logs lead-service

# Verificar variables de entorno
docker-compose exec lead-service env | grep POSTGRES
docker-compose exec lead-service env | grep NATS

# Test manual
docker-compose exec lead-service node dist/app.js
```

---

## 📚 Referencias

- **PostgreSQL**: https://www.postgresql.org/docs/16/
- **NATS**: https://docs.nats.io/
- **Drizzle ORM**: https://orm.drizzle.team/
- **Fastify**: https://www.fastify.io/
- **Docker Compose**: https://docs.docker.com/compose/

---

*Última actualización: 2025-11-15*
*Lead Service v0.1.0*

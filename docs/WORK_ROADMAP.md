# ROADMAP DE TRABAJO - ZUCLUBIT SMART CRM
**Version**: 2.0.0 | **Fecha**: Diciembre 2024 | **Estado**: EN EJECUCION

---

## RESUMEN EJECUTIVO

### Estado Actual del Proyecto

| Componente | Progreso | Estado |
|------------|----------|--------|
| Documentacion | 95% | EXCELENTE |
| Infraestructura Local | 80% | FUNCIONAL |
| Lead Service | 85% | CASI COMPLETO |
| Shared Libraries | 80% | FUNCIONAL |
| Customer Service | 5% | SOLO ESTRUCTURA |
| Proposal Service | 5% | SOLO ESTRUCTURA |
| Financial Service | 5% | SOLO ESTRUCTURA |
| Otros Servicios | 0-5% | PENDIENTE |
| Frontend | 0% | NO INICIADO |
| Integraciones | 0% | NO INICIADO |

### Progreso Total MVP: ~20%

---

## FASE 0: ESTABILIZACION (Semana 1)
**Objetivo**: Limpiar codigo obsoleto y preparar base solida

### Sprint 0.1: Cleanup Lead Service (3 dias)

#### Dia 1: Correccion de Exports y Limpieza

```
TAREAS CRITICAS:
[ ] Corregir export en src/presentation/routes/index.ts
    - Cambiar: export { createLeadRoutes } -> export { leadRoutes }
[ ] Eliminar codigo Express obsoleto
    - Eliminar: src/index.ts (punto de entrada Express)
    - Eliminar: src/presentation/controllers/ (no se usa)
[ ] Limpiar use-cases no utilizados
    - Mover o eliminar: src/application/use-cases/
[ ] Actualizar README.md con informacion correcta (Fastify, no Express)
```

#### Dia 2: Tests de Integracion

```
TAREAS:
[ ] Configurar Testcontainers para PostgreSQL
[ ] Implementar tests de integracion para LeadRepository
[ ] Implementar tests de API endpoints
[ ] Alcanzar cobertura minima 60%

COMANDOS:
npm run test:integration
npm run test:coverage
```

#### Dia 3: Documentacion y Validacion

```
TAREAS:
[ ] Actualizar API_REVIEW.md con endpoints Fastify
[ ] Verificar docker-compose funcional
[ ] Ejecutar build completo sin errores
[ ] Validar todos los endpoints con Postman

VALIDACION:
docker-compose up -d
npm run build
npm run test
curl http://localhost:3000/health
```

### Criterios de Exito Fase 0
- [ ] Build sin errores ni warnings
- [ ] Todos los tests pasando (unitarios + integracion)
- [ ] Coverage >= 60%
- [ ] 13 endpoints funcionando correctamente
- [ ] Documentacion actualizada

---

## FASE 1: CUSTOMER SERVICE (Semanas 2-3)
**Objetivo**: Implementar segundo servicio core siguiendo patron de Lead Service

### Sprint 1.1: Domain Layer (4 dias)

#### Estructura de Archivos a Crear

```
services/customer-service/src/
├── domain/
│   ├── aggregates/
│   │   ├── customer.aggregate.ts
│   │   └── customer.aggregate.test.ts
│   ├── entities/
│   │   ├── contact.entity.ts
│   │   ├── contract.entity.ts
│   │   └── onboarding-progress.entity.ts
│   ├── value-objects/
│   │   ├── customer-status.ts
│   │   ├── customer-health.ts
│   │   ├── customer-tier.ts
│   │   └── account-hierarchy.ts
│   ├── events/
│   │   └── customer-events.ts
│   └── repositories/
│       └── customer-repository.interface.ts
```

#### Dia 1-2: Customer Aggregate

```typescript
// Implementar siguiendo patron de Lead
TAREAS:
[ ] Crear Customer aggregate root
    - Propiedades: id, tenantId, companyName, contacts, tier, status
    - Metodos: create(), activate(), updateHealth(), deactivate()
[ ] Implementar value objects
    - CustomerStatus: prospect, active, churned, won_back
    - CustomerHealth: critical, at_risk, healthy, champion
    - CustomerTier: free, pro, enterprise
[ ] Definir domain events
    - CustomerCreated, CustomerActivated, CustomerChurned
    - CustomerHealthUpdated, CustomerTierChanged
```

#### Dia 3-4: Tests Unitarios Domain

```
TAREAS:
[ ] Tests para Customer aggregate (30+ tests)
[ ] Tests para cada value object (15+ tests por VO)
[ ] Coverage domain layer >= 100%

TARGET: 60+ tests unitarios pasando
```

### Sprint 1.2: Application + Infrastructure (4 dias)

#### Estructura CQRS

```
services/customer-service/src/application/
├── commands/
│   ├── create-customer.command.ts
│   ├── create-customer.handler.ts
│   ├── update-customer.command/handler.ts
│   ├── activate-customer.command/handler.ts
│   ├── deactivate-customer.command/handler.ts
│   ├── update-health-score.command/handler.ts
│   └── convert-from-lead.command/handler.ts
├── queries/
│   ├── get-customer-by-id.query/handler.ts
│   ├── find-customers.query/handler.ts
│   ├── get-customer-360.query/handler.ts
│   └── get-customer-stats.query/handler.ts
├── common/
│   ├── command-bus.ts
│   └── query-bus.ts
└── dtos/
    └── customer.dto.ts
```

#### Dia 1-2: Commands & Queries

```
TAREAS:
[ ] Implementar CommandBus y QueryBus
[ ] Crear 7 commands con sus handlers
[ ] Crear 4 queries con sus handlers
[ ] Implementar DTOs y mappers
```

#### Dia 3-4: Repository & Database

```
TAREAS:
[ ] Crear schema Drizzle para customers
    - Tabla: customers
    - Tabla: customer_contacts
    - Tabla: customer_contracts
    - Tabla: outbox_events
[ ] Implementar CustomerRepository
[ ] Crear migraciones
[ ] Tests de integracion con Testcontainers
```

### Sprint 1.3: Presentation Layer (2 dias)

#### Endpoints a Implementar

```
POST   /api/v1/customers                    -> CreateCustomerCommand
GET    /api/v1/customers                    -> FindCustomersQuery (paginado)
GET    /api/v1/customers/:id                -> GetCustomerByIdQuery
GET    /api/v1/customers/:id/360            -> GetCustomer360Query
PATCH  /api/v1/customers/:id                -> UpdateCustomerCommand
POST   /api/v1/customers/:id/activate       -> ActivateCustomerCommand
POST   /api/v1/customers/:id/deactivate     -> DeactivateCustomerCommand
PATCH  /api/v1/customers/:id/health         -> UpdateHealthScoreCommand
POST   /api/v1/customers/convert-from-lead  -> ConvertFromLeadCommand
GET    /api/v1/customers/stats/overview     -> GetCustomerStatsQuery
GET    /health                              -> Health check
GET    /ready                               -> Readiness check
```

#### Configuracion

```
TAREAS:
[ ] Crear routes/customer.routes.ts (Fastify plugin)
[ ] Implementar schemas Zod para validacion
[ ] Configurar middlewares (correlation-id, logger, error-handler)
[ ] Configurar Swagger/OpenAPI
[ ] Tests de API
```

### Criterios de Exito Fase 1
- [ ] 12 endpoints funcionando
- [ ] 80+ tests pasando
- [ ] Coverage >= 70%
- [ ] Documentacion API generada
- [ ] Docker build exitoso

---

## FASE 2: LEAD -> CUSTOMER CONVERSION (Semana 4)
**Objetivo**: Implementar flujo de conversion automatica

### Sprint 2.1: Saga Pattern (3 dias)

#### Implementacion

```typescript
// Saga: Convert Lead to Customer
// Ubicacion: customer-service/src/application/sagas/

PASOS:
1. Recibir evento: Proposal.Accepted
2. Validar lead existe y esta qualified
3. Crear Customer desde Lead
4. Copiar contactos
5. Crear contrato inicial
6. Marcar Lead como converted
7. Emitir evento: Customer.Created

COMPENSACION (si falla):
- Revertir Lead status
- Eliminar Customer parcial
- Log error para revision manual
```

#### Event Consumers

```
TAREAS:
[ ] Crear consumer para 'proposal.accepted'
[ ] Implementar LeadConversionSaga
[ ] Manejar errores con compensacion
[ ] Tests unitarios del saga
[ ] Tests de integracion del flujo completo
```

### Sprint 2.2: Customer Health Scoring (2 dias)

```
TAREAS:
[ ] Implementar CustomerHealthScoringService
[ ] Crear reglas basicas de scoring
    - Usage score (login frequency, feature usage)
    - Engagement score (support tickets, NPS)
    - Financial score (payment history, upsells)
[ ] Cron job para recalculo diario
[ ] Dashboard endpoint para health trends
```

### Criterios de Exito Fase 2
- [ ] Conversion Lead -> Customer automatica
- [ ] Health scoring funcionando
- [ ] Eventos publicandose correctamente
- [ ] Zero errores en flujo completo

---

## FASE 3: PROPOSAL SERVICE (Semanas 5-6)
**Objetivo**: Implementar CPQ basico con PDF generation

### Sprint 3.1: Domain + Application (4 dias)

#### Estructura

```
services/proposal-service/src/
├── domain/
│   ├── aggregates/
│   │   ├── proposal.aggregate.ts
│   │   └── product.aggregate.ts
│   ├── entities/
│   │   ├── line-item.entity.ts
│   │   └── approval-request.entity.ts
│   ├── value-objects/
│   │   ├── proposal-status.ts
│   │   ├── money.ts
│   │   └── discount.ts
│   └── events/
│       └── proposal-events.ts
├── application/
│   ├── commands/
│   │   ├── create-proposal.command.ts
│   │   ├── add-line-item.command.ts
│   │   ├── submit-for-approval.command.ts
│   │   ├── approve-proposal.command.ts
│   │   └── send-proposal.command.ts
│   ├── queries/
│   │   └── ...
│   └── services/
│       ├── pricing-calculation.service.ts
│       └── approval-workflow.service.ts
```

#### Pricing Engine

```
TAREAS:
[ ] Implementar Money value object con currency
[ ] Crear PricingCalculationService
    - Calcular subtotal por linea
    - Aplicar descuentos (%, fijo)
    - Calcular impuestos (IVA 16%)
    - Calcular total
[ ] Implementar reglas de descuento
    - Descuento por volumen
    - Descuento por cliente VIP
```

### Sprint 3.2: Approval Workflow (2 dias)

```
TAREAS:
[ ] Definir reglas de aprobacion
    - Total > $10K MXN -> Manager
    - Total > $50K MXN -> Director
    - Descuento > 20% -> VP Sales
[ ] Implementar ApprovalWorkflowService
[ ] Notificaciones por email al aprobar/rechazar
[ ] Audit trail de aprobaciones
```

### Sprint 3.3: PDF Generation (2 dias)

```
TAREAS:
[ ] Integrar Puppeteer para PDF
[ ] Crear templates HTML/Handlebars
    - Header con logo
    - Informacion cliente
    - Tabla de productos
    - Terminos y condiciones
    - Footer con numero de propuesta
[ ] Subir PDF a S3
[ ] Cache en Redis (24h TTL)
[ ] Endpoint para descargar PDF
```

### Sprint 3.4: Presentation Layer (2 dias)

#### Endpoints

```
POST   /api/v1/proposals                        -> CreateProposal
GET    /api/v1/proposals                        -> FindProposals
GET    /api/v1/proposals/:id                    -> GetProposalById
PATCH  /api/v1/proposals/:id                    -> UpdateProposal
POST   /api/v1/proposals/:id/line-items         -> AddLineItem
DELETE /api/v1/proposals/:id/line-items/:itemId -> RemoveLineItem
POST   /api/v1/proposals/:id/submit             -> SubmitForApproval
POST   /api/v1/proposals/:id/approve            -> ApproveProposal
POST   /api/v1/proposals/:id/reject             -> RejectProposal
POST   /api/v1/proposals/:id/send               -> SendToCustomer
GET    /api/v1/proposals/:id/pdf                -> DownloadPDF
GET    /api/v1/products                         -> ListProducts
```

### Criterios de Exito Fase 3
- [ ] 12 endpoints funcionando
- [ ] PDF generation en < 5 segundos
- [ ] Workflow de aprobacion completo
- [ ] Pricing con IVA correcto
- [ ] Tests >= 70% coverage

---

## FASE 4: FINANCIAL SERVICE + CFDI (Semanas 7-9)
**Objetivo**: Facturacion electronica mexicana

### Sprint 4.1: Financial Core (3 dias)

#### Estructura

```
services/financial-service/src/
├── domain/
│   ├── aggregates/
│   │   ├── invoice.aggregate.ts
│   │   └── payment.aggregate.ts
│   ├── value-objects/
│   │   ├── invoice-status.ts
│   │   ├── payment-method.ts
│   │   └── cfdi-data.ts
│   └── events/
│       └── financial-events.ts
```

```
TAREAS:
[ ] Implementar Invoice aggregate
    - Estados: draft, issued, sent, paid, cancelled
[ ] Implementar Payment aggregate
[ ] Generar invoice desde proposal aceptada
[ ] Tracking de pagos parciales
```

### Sprint 4.2: CFDI 4.0 Integration (6 dias)

#### PAC Integration (Finkok)

```
TAREAS:
[ ] Crear cuenta en Finkok (sandbox)
[ ] Implementar CFDIService
    - Construir XML CFDI 4.0
    - Enviar a PAC para timbrado
    - Recibir UUID y sello digital
    - Validar contra SAT
[ ] Implementar CFDICancellationService
    - Motivos de cancelacion SAT
    - Workflow de cancelacion
[ ] Almacenar XML y PDF (MongoDB + S3)
    - Retencion 5 anos obligatoria
```

#### Estructura XML CFDI

```xml
<!-- Campos obligatorios CFDI 4.0 -->
<cfdi:Comprobante>
  <cfdi:Emisor RFC="" Nombre="" RegimenFiscal=""/>
  <cfdi:Receptor RFC="" Nombre="" DomicilioFiscalReceptor=""
                 RegimenFiscalReceptor="" UsoCFDI=""/>
  <cfdi:Conceptos>
    <cfdi:Concepto ClaveProdServ="" Cantidad="" ClaveUnidad=""
                   Descripcion="" ValorUnitario="" Importe="">
      <cfdi:Impuestos>
        <cfdi:Traslados>
          <cfdi:Traslado Base="" Impuesto="002" TipoFactor="Tasa"
                         TasaOCuota="0.160000" Importe=""/>
        </cfdi:Traslados>
      </cfdi:Impuestos>
    </cfdi:Concepto>
  </cfdi:Conceptos>
</cfdi:Comprobante>
```

### Sprint 4.3: Stripe Integration (3 dias)

```
TAREAS:
[ ] Configurar cuenta Stripe Mexico
[ ] Implementar StripePaymentService
    - Crear PaymentIntent
    - Manejar webhooks
[ ] Soportar metodos de pago:
    - Tarjetas credito/debito
    - OXXO Pay (efectivo)
    - SPEI (transferencia)
[ ] Generar Complemento de Pago (CFDI)
[ ] Reconciliacion automatica
```

### Criterios de Exito Fase 4
- [ ] CFDI 4.0 generandose correctamente
- [ ] Timbrado SAT funcionando (sandbox)
- [ ] Pagos Stripe procesando
- [ ] PDF de factura generandose
- [ ] Almacenamiento 5 anos configurado

---

## FASE 5: NOTIFICATION SERVICE (Semana 10)
**Objetivo**: Email, SMS y WhatsApp

### Sprint 5.1: Email + SMS (3 dias)

```
TAREAS:
[ ] Integrar SendGrid para email
    - Verificar dominio
    - Configurar templates
    - Implementar tracking
[ ] Integrar Twilio para SMS
    - Obtener numero mexicano
    - Templates SMS
[ ] Crear NotificationService unificado
[ ] Event consumers para triggers automaticos
```

#### Templates Requeridos

```
EMAIL:
- welcome-email
- proposal-sent
- proposal-accepted
- invoice-notification
- payment-confirmation
- payment-reminder

SMS:
- otp-verification
- payment-reminder
- appointment-reminder
```

### Sprint 5.2: WhatsApp Business API (2 dias)

```
TAREAS:
[ ] Configurar Twilio WhatsApp
[ ] Crear templates aprobados
[ ] Implementar webhook para mensajes entrantes
[ ] Log conversaciones en CRM timeline
```

### Criterios de Exito Fase 5
- [ ] Emails enviando correctamente
- [ ] SMS llegando a numeros MX
- [ ] WhatsApp templates aprobados
- [ ] Delivery tracking funcionando

---

## FASE 6: ANALYTICS + INTEGRACION (Semanas 11-12)
**Objetivo**: Dashboards basicos y testing E2E

### Sprint 6.1: Analytics Service (4 dias)

```
TAREAS:
[ ] Implementar DashboardDataService
    - Metricas de leads
    - Metricas de clientes
    - Metricas de propuestas
    - Metricas de revenue
[ ] Crear endpoints de stats
[ ] Implementar caching Redis
[ ] Materialized views PostgreSQL
```

### Sprint 6.2: Integration Testing (4 dias)

```
TAREAS:
[ ] Tests E2E flujo completo
    Lead -> Qualify -> Proposal -> Accept -> Customer -> Invoice -> Payment
[ ] Load testing con Artillery
    - Target: 50 req/sec
    - p95 < 500ms
[ ] Security testing basico
    - SQL injection
    - XSS
    - Auth bypass
[ ] Performance profiling
```

### Sprint 6.3: Bug Fixes + Optimization (2 dias)

```
TAREAS:
[ ] Resolver bugs encontrados en testing
[ ] Optimizar queries lentos
[ ] Mejorar cold start Lambda
[ ] Ajustar rate limits
[ ] Documentacion final
```

### Criterios de Exito Fase 6
- [ ] Dashboard con 5+ metricas
- [ ] Flujo E2E funcionando 100%
- [ ] Load test pasando
- [ ] Zero vulnerabilidades criticas

---

## FASE 7: BETA LAUNCH (Semana 13-14)
**Objetivo**: Lanzar con 10 clientes piloto

### Sprint 7.1: Production Deploy (3 dias)

```
TAREAS:
[ ] Deploy a AWS production
[ ] Configurar monitoring CloudWatch
[ ] Configurar alertas PagerDuty/Slack
[ ] Smoke tests en produccion
[ ] Backup y recovery testing
```

### Sprint 7.2: Beta Onboarding (4 dias)

```
TAREAS:
[ ] Seleccionar 10 clientes beta
    - Mix de industrias
    - 10-200 empleados
    - Dispuestos a dar feedback
[ ] Onboarding white-glove
    - Llamada 1:1 con cada cliente
    - Setup de cuenta
    - Capacitacion basica
[ ] Crear canal de soporte dedicado
[ ] Daily check-ins primera semana
```

### Sprint 7.3: Iteration (3 dias)

```
TAREAS:
[ ] Recolectar feedback diario
[ ] Priorizar bugs criticos
[ ] Hotfixes en < 24h
[ ] Documentar improvements para Phase 2
```

### Criterios de Exito Fase 7
- [ ] 10 clientes activos
- [ ] Uptime > 99%
- [ ] NPS > 7
- [ ] Zero bugs criticos sin resolver

---

## TIMELINE VISUAL

```
Semana | Fase                    | Entregable Principal
-------|-------------------------|----------------------------------------
   1   | Estabilizacion          | Lead Service limpio y estable
  2-3  | Customer Service        | Customer management completo
   4   | Conversion Flow         | Lead -> Customer automatico
  5-6  | Proposal Service        | CPQ + PDF + Approvals
  7-9  | Financial + CFDI        | Facturacion electronica mexicana
  10   | Notifications           | Email + SMS + WhatsApp
 11-12 | Analytics + Testing     | Dashboards + E2E tests
 13-14 | Beta Launch             | 10 clientes en produccion
```

---

## METRICAS DE SEGUIMIENTO

### KPIs Tecnicos (por fase)

| Metrica | Target |
|---------|--------|
| Test Coverage | >= 70% |
| Build Time | < 3 min |
| API Response p95 | < 500ms |
| Error Rate | < 1% |
| Uptime | > 99% |

### KPIs de Negocio (beta)

| Metrica | Target |
|---------|--------|
| Clientes Beta | 10 |
| Usuarios Activos | 50 |
| Leads Creados | 200 |
| Propuestas Generadas | 50 |
| CFDIs Emitidos | 30 |
| MRR Beta | $2,500 USD |

---

## RIESGOS Y MITIGACION

| Riesgo | Probabilidad | Impacto | Mitigacion |
|--------|--------------|---------|------------|
| CFDI complejidad | Alta | Alto | 2 semanas buffer, PAC backup |
| Performance | Media | Alto | Load testing desde Fase 6 |
| Adoption baja | Media | Alto | White-glove onboarding |
| Scope creep | Alta | Alto | Feature freeze Semana 10 |
| Single developer | Alta | Medio | Documentacion excelente |

---

## RECURSOS NECESARIOS

### Herramientas

- GitHub (repositorio)
- Docker Desktop (local dev)
- Postman (API testing)
- TablePlus (DB management)
- VS Code (IDE)

### Servicios Cloud (estimado mensual)

| Servicio | Costo |
|----------|-------|
| AWS Lambda | $50 |
| RDS PostgreSQL | $100 |
| MongoDB Atlas | $50 |
| NATS (Synadia) | $99 |
| Redis (Upstash) | $10 |
| SendGrid | $20 |
| Twilio | $100 |
| Stripe | 2.9% + $0.30/tx |
| PAC (Finkok) | $1 MXN/CFDI |
| **TOTAL** | ~$450/mes |

---

## CHECKLIST PRE-FASE

### Antes de Cada Fase

- [ ] Revisar documentacion de servicio correspondiente en /docs/services/
- [ ] Verificar dependencias actualizadas
- [ ] Docker compose funcionando
- [ ] Tests de fase anterior pasando
- [ ] Branch creado: feature/fase-X

### Antes de Beta Launch

- [ ] Security audit completado
- [ ] Load testing pasando
- [ ] Documentacion actualizada
- [ ] Runbook de operaciones listo
- [ ] On-call rotation definida
- [ ] Clientes beta confirmados

---

## CONTACTO Y SOPORTE

**Actualizaciones**: Este documento se actualiza semanalmente
**Ubicacion**: /docs/WORK_ROADMAP.md
**Ultima Actualizacion**: Diciembre 2024

---

**SIGUIENTE PASO INMEDIATO**:
Ejecutar Fase 0 - Estabilizacion del Lead Service

```bash
# Comenzar con cleanup
cd services/lead-service
npm run build
npm run test
```

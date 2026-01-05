# Plan de Remediación: Notificaciones, Mensajería y APIs Faltantes

## Resumen Ejecutivo

Este documento detalla el plan sistemático de remediación para cerrar los gaps identificados entre el backend y frontend del sistema Zuclubit Smart CRM, enfocándose en notificaciones, mensajería y APIs críticas faltantes.

**Fecha:** 2025-12-08
**Versión:** 1.1
**Estado:** COMPLETADO - Fase 1-4

---

## RESUMEN DE IMPLEMENTACION COMPLETADA

### Archivos Creados

| Archivo | Descripcion | Lineas |
|---------|-------------|--------|
| `presentation/routes/notification.routes.ts` | Rutas completas de notificaciones | ~650 |
| `presentation/schemas/notification.schema.ts` | Validacion Zod notificaciones | ~200 |
| `presentation/routes/messaging.routes.ts` | Rutas unificadas de mensajeria | ~850 |
| `presentation/schemas/messaging.schema.ts` | Validacion Zod mensajeria | ~250 |

### Endpoints Implementados

#### Notificaciones (10 endpoints)
- `GET /api/v1/notifications` - Lista con filtros
- `GET /api/v1/notifications/stats` - Estadisticas
- `GET /api/v1/notifications/unread-count` - Contador no leidas
- `PATCH /api/v1/notifications/:id/read` - Marcar como leida
- `PATCH /api/v1/notifications/read-all` - Marcar todas como leidas
- `DELETE /api/v1/notifications/:id` - Eliminar notificacion
- `DELETE /api/v1/notifications` - Eliminar todas
- `GET /api/v1/notifications-preferences` - Obtener preferencias
- `PATCH /api/v1/notifications-preferences` - Actualizar preferencias
- `POST /api/v1/notifications-preferences/reset` - Resetear a defaults

#### Mensajeria Unificada (12 endpoints)
- `GET /api/v1/messages` - Lista unificada multi-canal
- `GET /api/v1/messages/stats` - Estadisticas
- `GET /api/v1/messages/:id` - Detalle de mensaje
- `POST /api/v1/messages/send` - Enviar mensaje (multi-canal)
- `POST /api/v1/messages/send-bulk` - Envio masivo
- `POST /api/v1/messages/:id/retry` - Reintentar envio
- `GET /api/v1/messages-templates` - Listar templates
- `GET /api/v1/messages-templates/:id` - Detalle template
- `POST /api/v1/messages-templates` - Crear template
- `PATCH /api/v1/messages-templates/:id` - Actualizar template
- `DELETE /api/v1/messages-templates/:id` - Eliminar template
- `POST /api/v1/messages-templates/preview` - Preview con variables
- `POST /api/v1/messages-templates/:id/duplicate` - Duplicar template

#### AI (Ya existentes - verificados)
- `POST /api/v1/ai/emails/generate` - Generacion de emails con IA
- `POST /api/v1/ai/sentiment` - Analisis de sentimiento
- `GET /api/v1/ai/usage` - Estadisticas de uso

### Caracteristicas Implementadas

1. **Multi-tenancy completo** - Todas las operaciones filtradas por tenant
2. **Validacion Zod** - Schemas completos con mensajes de error
3. **Type mapping** - Conversion backend types a frontend types
4. **Preferencias por usuario** - Sistema completo de configuracion
5. **Quiet hours** - Soporte para horarios de no molestar
6. **Digest settings** - Configuracion de resumenes diarios/semanales
7. **Template engine** - Interpolacion de variables en templates
8. **Bulk operations** - Operaciones masivas optimizadas

---

## 1. Análisis de Gaps Identificados

### 1.1 Notificaciones - Backend vs Frontend

| Endpoint Frontend Espera | Backend Actual | Estado |
|--------------------------|----------------|--------|
| `GET /notifications` | No existe | ❌ FALTA |
| `GET /notifications/stats` | No existe | ❌ FALTA |
| `GET /notifications/unread-count` | `getUnread()` existe pero sin ruta | ❌ FALTA |
| `PATCH /notifications/:id/read` | `markAsRead()` existe pero sin ruta | ❌ FALTA |
| `PATCH /notifications/read-all` | No existe | ❌ FALTA |
| `DELETE /notifications/:id` | No existe | ❌ FALTA |
| `DELETE /notifications` | No existe | ❌ FALTA |
| `GET /notification-preferences` | No existe | ❌ FALTA |
| `PATCH /notification-preferences` | No existe | ❌ FALTA |
| `POST /notification-preferences/reset` | No existe | ❌ FALTA |

### 1.2 Mensajería - Backend vs Frontend

| Endpoint Frontend Espera | Backend Actual | Estado |
|--------------------------|----------------|--------|
| `GET /messages` | SMS/WhatsApp separados | ⚠️ PARCIAL |
| `GET /messages/:id` | Existe en SMS | ⚠️ PARCIAL |
| `POST /messages/send` | Canales separados | ⚠️ PARCIAL |
| `POST /messages/send-bulk` | Existe en SMS/WhatsApp | ⚠️ PARCIAL |
| `GET /messages/stats` | No unificado | ❌ FALTA |
| `POST /messages/:id/retry` | Parcial | ⚠️ PARCIAL |
| `GET /message-templates` | Email templates existe | ⚠️ PARCIAL |
| `POST /message-templates/preview` | Existe | ✅ OK |

### 1.3 AI/ML - Backend vs Frontend

| Endpoint Frontend Espera | Backend Actual | Estado |
|--------------------------|----------------|--------|
| `POST /api/v1/ai/emails/generate` | No existe | ❌ FALTA |
| `POST /api/v1/ai/sentiment` | No existe | ❌ FALTA |
| `GET /api/v1/ai/usage` | No existe | ❌ FALTA |

---

## 2. Arquitectura de Solución

### 2.1 Principios de Diseño

1. **Consistencia**: Seguir patrones existentes del proyecto (CQRS, Result pattern, DI)
2. **Multi-tenancy**: Todas las operaciones filtradas por `tenantId`
3. **Validación**: Zod schemas para input validation
4. **Respuestas estándar**: Formato consistente de respuestas
5. **Error handling**: Usar `HttpError` y middleware existente
6. **Extensibilidad**: Diseñar para agregar canales sin cambios mayores

### 2.2 Estructura de Archivos a Crear

```
services/lead-service/src/
├── presentation/
│   ├── routes/
│   │   └── notification.routes.ts          # NUEVO - Rutas de notificaciones
│   └── schemas/
│       └── notification.schema.ts          # NUEVO - Validación Zod
├── infrastructure/
│   └── notifications/
│       ├── notification.service.ts         # EXTENDER - Agregar métodos faltantes
│       └── notification-preferences.service.ts  # NUEVO - Preferencias
└── application/
    └── dtos/
        └── notification.dto.ts             # NUEVO - DTOs de respuesta
```

---

## 3. Fases de Implementación

### FASE 1: Sistema de Notificaciones (P0 - Crítico)

**Objetivo**: Implementar todas las rutas de notificaciones que el frontend espera.

#### 1.1 Crear `notification.routes.ts`

```typescript
// Endpoints a implementar:
GET    /api/v1/notifications                    // Lista con filtros y paginación
GET    /api/v1/notifications/stats              // Estadísticas
GET    /api/v1/notifications/unread-count       // Contador de no leídas
PATCH  /api/v1/notifications/:id/read           // Marcar como leída
PATCH  /api/v1/notifications/read-all           // Marcar todas como leídas
DELETE /api/v1/notifications/:id                // Eliminar una
DELETE /api/v1/notifications                    // Eliminar todas
```

#### 1.2 Extender `NotificationService`

Agregar métodos:
- `list(userId, tenantId, filters)` - Lista paginada con filtros
- `getStats(userId, tenantId)` - Estadísticas por tipo
- `getUnreadCount(userId, tenantId)` - Contador optimizado
- `markAllAsRead(userId, tenantId)` - Bulk update
- `delete(notificationId, userId)` - Soft delete
- `deleteAll(userId, tenantId)` - Bulk delete

#### 1.3 Crear Schemas de Validación

```typescript
// notification.schema.ts
- listNotificationsQuerySchema
- markAsReadParamsSchema
- deleteNotificationParamsSchema
```

### FASE 2: Preferencias de Notificación (P0 - Crítico)

**Objetivo**: Sistema completo de preferencias por usuario.

#### 2.1 Crear `NotificationPreferencesService`

```typescript
// Métodos:
- getPreferences(userId, tenantId)
- updatePreferences(userId, tenantId, data)
- resetToDefaults(userId, tenantId)
- createDefaultPreferences(userId, tenantId)
```

#### 2.2 Rutas de Preferencias

```typescript
GET    /api/v1/notification-preferences         // Obtener preferencias
PATCH  /api/v1/notification-preferences         // Actualizar
POST   /api/v1/notification-preferences/reset   // Resetear a defaults
```

### FASE 3: Mensajería Unificada (P1 - Alto)

**Objetivo**: Unificar la API de mensajería multi-canal.

#### 3.1 Crear `unified-messaging.routes.ts`

```typescript
GET    /api/v1/messages                    // Lista unificada (email, sms, whatsapp)
GET    /api/v1/messages/:id                // Detalle de mensaje
GET    /api/v1/messages/stats              // Estadísticas unificadas
POST   /api/v1/messages/send               // Envío unificado con canal selector
POST   /api/v1/messages/send-bulk          // Envío masivo
POST   /api/v1/messages/:id/retry          // Reintentar envío
```

#### 3.2 Crear `UnifiedMessagingService`

Servicio que orquesta SMS, Email, WhatsApp y Push.

### FASE 4: Generación de Emails con IA (P1 - Alto)

**Objetivo**: Implementar endpoint de generación de emails con IA.

#### 4.1 Extender `ai.routes.ts`

```typescript
POST   /api/v1/ai/emails/generate          // Generar email con contexto
// Input: { context, tone, length, recipientType, template? }
// Output: { subject, body, suggestions[] }
```

### FASE 5: WebSocket para Notificaciones Real-time (P2 - Medio)

**Objetivo**: Reemplazar polling de 60s con WebSocket.

#### 5.1 Implementar WebSocket Handler

```typescript
// Eventos:
- notification:new        // Nueva notificación
- notification:read       // Notificación leída
- notification:deleted    // Notificación eliminada
- message:status          // Cambio de estado de mensaje
```

### FASE 6: Testing e Integración (P0 - Continuo)

**Objetivo**: Validar integración frontend-backend.

---

## 4. Especificaciones Técnicas Detalladas

### 4.1 Tipos de Notificación (Frontend ↔ Backend)

**Frontend espera:**
```typescript
type NotificationType = 'info' | 'success' | 'warning' | 'error' |
  'workflow' | 'task' | 'lead' | 'opportunity' | 'customer' |
  'mention' | 'reminder' | 'system';
```

**Backend tiene:**
```typescript
enum NotificationType {
  LEAD_CREATED, LEAD_ASSIGNED, LEAD_QUALIFIED, LEAD_STATUS_CHANGED,
  LEAD_CONVERTED, LEAD_LOST, FOLLOW_UP_SCHEDULED, FOLLOW_UP_DUE,
  FOLLOW_UP_OVERDUE, LEAD_SCORE_INCREASED, LEAD_SCORE_DECREASED,
  LEAD_REACHED_THRESHOLD, DAILY_SUMMARY, WEEKLY_REPORT
}
```

**Solución**: Crear mapper entre tipos backend → frontend.

### 4.2 Estructura de Respuesta de Notificación

```typescript
// Frontend espera:
interface Notification {
  id: string;
  tenantId: string;
  userId: string;          // Backend: recipientUserId
  title: string;
  message: string;         // Backend: body
  type: NotificationType;
  relatedType?: RelatedEntityType;
  relatedId?: string;
  actionUrl?: string;
  readAt?: string | null;
  createdAt: string;
}
```

### 4.3 Filtros de Lista

```typescript
interface NotificationFilters {
  type?: NotificationType;
  unreadOnly?: boolean;
  relatedType?: RelatedEntityType;
  limit?: number;          // Default: 20, Max: 100
  offset?: number;         // Default: 0
}
```

### 4.4 Estadísticas

```typescript
interface NotificationStats {
  total: number;
  unread: number;
  today: number;
  thisWeek: number;
  byType: Record<NotificationType, number>;
}
```

### 4.5 Preferencias de Notificación

```typescript
interface NotificationPreferences {
  id: string;
  userId: string;
  tenantId: string;

  // Canales globales
  emailEnabled: boolean;
  smsEnabled: boolean;
  whatsappEnabled: boolean;
  internalEnabled: boolean;
  pushEnabled: boolean;

  // Digest
  digestEnabled: boolean;
  digestFrequency: 'daily' | 'weekly' | 'never';
  digestTime?: string;
  digestDay?: number;

  // Por tipo de notificación
  typePreferences: {
    [type: string]: {
      email: boolean;
      sms: boolean;
      whatsapp: boolean;
      internal: boolean;
      push: boolean;
    }
  };

  // Quiet hours
  quietHoursEnabled: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  quietHoursTimezone?: string;
}
```

---

## 5. Plan de Ejecución

### Semana 1: FASE 1 + FASE 2

| Día | Tarea | Entregable |
|-----|-------|------------|
| 1 | Crear `notification.routes.ts` con endpoints base | Rutas funcionando |
| 2 | Extender `NotificationService` con nuevos métodos | Service completo |
| 3 | Crear schemas de validación Zod | Validación integrada |
| 4 | Crear `NotificationPreferencesService` | Preferencias CRUD |
| 5 | Testing + ajustes | Tests pasando |

### Semana 2: FASE 3 + FASE 4

| Día | Tarea | Entregable |
|-----|-------|------------|
| 1-2 | Unified Messaging Service | API unificada |
| 3-4 | AI Email Generation endpoint | Generación funcional |
| 5 | Integration testing | E2E tests |

### Semana 3: FASE 5 + FASE 6

| Día | Tarea | Entregable |
|-----|-------|------------|
| 1-2 | WebSocket implementation | Real-time working |
| 3-5 | Full integration testing | Sistema validado |

---

## 6. Métricas de Éxito

| Métrica | Objetivo | Medición |
|---------|----------|----------|
| Cobertura API Notificaciones | 100% | Endpoints implementados vs esperados |
| Cobertura API Messaging | 80% | Endpoints implementados vs esperados |
| Latencia Notificaciones | < 200ms | P95 response time |
| Fiabilidad Entrega | > 99% | Mensajes entregados / enviados |
| Tests Pasando | 100% | CI/CD pipeline |

---

## 7. Riesgos y Mitigaciones

| Riesgo | Impacto | Probabilidad | Mitigación |
|--------|---------|--------------|------------|
| Incompatibilidad de tipos | Alto | Media | Mappers explícitos |
| Performance en bulk ops | Medio | Media | Batch processing |
| Rate limiting proveedores | Alto | Alta | Queue system |
| Schema migrations | Medio | Baja | Backward compatible |

---

## 8. Checklist de Implementación

### FASE 1: Notificaciones
- [ ] Crear `notification.routes.ts`
- [ ] Implementar `GET /notifications`
- [ ] Implementar `GET /notifications/stats`
- [ ] Implementar `GET /notifications/unread-count`
- [ ] Implementar `PATCH /notifications/:id/read`
- [ ] Implementar `PATCH /notifications/read-all`
- [ ] Implementar `DELETE /notifications/:id`
- [ ] Implementar `DELETE /notifications`
- [ ] Crear schemas Zod
- [ ] Registrar rutas en app.ts
- [ ] Tests unitarios
- [ ] Tests de integración

### FASE 2: Preferencias
- [ ] Crear `NotificationPreferencesService`
- [ ] Implementar `GET /notification-preferences`
- [ ] Implementar `PATCH /notification-preferences`
- [ ] Implementar `POST /notification-preferences/reset`
- [ ] Default preferences on user creation
- [ ] Tests

### FASE 3: Mensajería Unificada
- [ ] Crear `unified-messaging.routes.ts`
- [ ] Unificar SMS + Email + WhatsApp
- [ ] Implementar stats unificados
- [ ] Tests

### FASE 4: AI Email Generation
- [ ] Extender `ai.routes.ts`
- [ ] Implementar generación
- [ ] Tests

### FASE 5: WebSocket
- [ ] Setup WebSocket server
- [ ] Implementar eventos
- [ ] Client integration
- [ ] Tests

---

## Aprobación

| Rol | Nombre | Fecha | Firma |
|-----|--------|-------|-------|
| Tech Lead | | | |
| Product Owner | | | |
| QA Lead | | | |

---

*Documento generado automáticamente como parte del proceso de remediación sistemática.*

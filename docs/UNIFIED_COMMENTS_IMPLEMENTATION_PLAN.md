# Sistema de Comentarios Unificado - Ventazo CRM

## Documento de Analisis y Plan de Implementacion

**Fecha**: 30 Diciembre 2025
**Version**: 1.0
**Autor**: Claude (Asistente de Desarrollo)

---

## 1. Resumen Ejecutivo

### Hallazgo Principal
El codebase **ya cuenta con una infraestructura robusta de comentarios/notas** que soporta:
- Comentarios anidados (hilos)
- Menciones de usuarios (@usuario)
- Reacciones emoji (estilo GitHub)
- Notas privadas/fijadas
- Soporte para markdown
- Soft delete con historial

### GAP Identificado
La tabla `notes` **no incluye `quote` como entityType**. Actualmente solo soporta:
```typescript
type NoteEntityType = 'lead' | 'customer' | 'opportunity' | 'task' | 'contact';
// Falta: 'quote'
```

### Esfuerzo Estimado
- **Backend**: ~4 horas (mayormente extender tipos existentes)
- **Frontend**: ~12 horas (crear componente reutilizable + integracion)
- **Testing**: ~4 horas

---

## 2. Analisis de Infraestructura Existente

### 2.1 Base de Datos (Schema)

#### Tabla `notes` - Sistema Generico de Comentarios
```
Ubicacion: /services/lead-service/src/infrastructure/database/schema.ts
Lineas: 1063-1113
```

| Campo | Tipo | Proposito |
|-------|------|-----------|
| `id` | UUID | Identificador unico |
| `tenantId` | UUID | Multi-tenant |
| `entityType` | VARCHAR | Tipo de entidad (lead, task, etc.) |
| `entityId` | UUID | ID de la entidad relacionada |
| `parentId` | UUID | Para respuestas (threading) |
| `threadId` | UUID | ID del hilo raiz |
| `content` | TEXT | Contenido del comentario |
| `contentHtml` | TEXT | HTML renderizado |
| `contentType` | VARCHAR | text/markdown/html |
| `mentions` | JSONB | Datos de menciones |
| `noteType` | VARCHAR | note/comment/internal/system |
| `isPinned` | BOOLEAN | Nota fijada |
| `isPrivate` | BOOLEAN | Nota privada |
| `reactions` | JSONB | Reacciones emoji |
| `isEdited` | BOOLEAN | Fue editada |
| `editedAt` | TIMESTAMP | Fecha de edicion |
| `createdBy` | UUID | Autor |
| `deletedAt` | TIMESTAMP | Soft delete |

#### Tabla `quote_activities` - Actividad Especifica de Cotizaciones
```
Ubicacion: schema.ts, lineas 2949-2987
```
- Solo registra actividad (created, sent, viewed, accepted, etc.)
- Campo `comment` opcional para notas de actividad
- NO soporta threading ni menciones

### 2.2 Servicios Backend

#### NotesService (Existente y Completo)
```
Ubicacion: /services/lead-service/src/infrastructure/notes/notes.service.ts
```

**Metodos disponibles:**
- `createNote()` - Crear nota con threading automatico
- `getNoteById()` - Obtener por ID con autor
- `updateNote()` - Actualizar con tracking de edicion
- `deleteNote()` - Soft delete
- `listNotes()` - Listar con filtros y paginacion
- `getNotesForEntity()` - Notas por entidad
- `getPinnedNotes()` - Notas fijadas
- `getReplies()` - Respuestas a una nota
- `getThreadSummary()` - Resumen de hilo
- `addReaction()` / `removeReaction()` - Reacciones emoji
- `togglePin()` - Fijar/desfijar

### 2.3 API Routes

#### Rutas de Notes (Existentes)
```
Ubicacion: /services/lead-service/src/presentation/routes/notes.routes.ts
```

| Metodo | Ruta | Descripcion |
|--------|------|-------------|
| POST | `/notes` | Crear nota |
| GET | `/notes/:id` | Obtener por ID |
| PATCH | `/notes/:id` | Actualizar |
| DELETE | `/notes/:id` | Eliminar (soft) |
| GET | `/notes` | Listar con filtros |
| GET | `/notes/entity/:entityType/:entityId` | Notas de entidad |
| GET | `/notes/entity/:entityType/:entityId/pinned` | Notas fijadas |
| GET | `/notes/:id/replies` | Respuestas |
| GET | `/notes/thread/:id` | Resumen de hilo |
| POST | `/notes/:id/reactions` | Agregar reaccion |
| DELETE | `/notes/:id/reactions/:emoji` | Quitar reaccion |
| POST | `/notes/:id/pin` | Fijar |
| DELETE | `/notes/:id/pin` | Desfijar |

### 2.4 Sistema de Notificaciones (Existente)

#### WebSocket Server
```
Ubicacion: /services/lead-service/src/infrastructure/websocket/websocket.server.ts
```
- Conexiones por tenant/usuario
- Broadcast a rooms
- Health checks
- 40+ tipos de eventos

#### Notification Orchestrator
```
Ubicacion: /services/lead-service/src/infrastructure/messaging/notification-orchestrator.ts
```
- Multi-canal: Email, SMS, Push, In-App
- Templates por evento
- Preferencias de usuario

### 2.5 Frontend Existente

#### Hooks de Tasks para Comentarios
```
Ubicacion: /apps/web/src/lib/tasks/hooks.ts
```
- `useTaskComments(taskId)` - Obtener comentarios
- `useAddTaskComment()` - Agregar
- `useUpdateTaskComment()` - Actualizar
- `useDeleteTaskComment()` - Eliminar

#### TaskDetailSheet con Comments Tab
```
Ubicacion: /apps/web/src/app/app/tasks/components/TaskDetailSheet.tsx
```
- Tab de comentarios implementado
- UI basica funcional
- No usa sistema generico de notes

---

## 3. Arquitectura Propuesta

### 3.1 Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              <CommentSection />                       │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐  │   │
│  │  │ CommentList │ │ CommentInput │ │ MentionPicker │  │   │
│  │  └─────────────┘ └──────────────┘ └───────────────┘  │   │
│  │  ┌─────────────┐ ┌──────────────┐ ┌───────────────┐  │   │
│  │  │ CommentCard │ │ ReactionBar  │ │ ThreadView    │  │   │
│  │  └─────────────┘ └──────────────┘ └───────────────┘  │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │                   useComments()                        │   │
│  │  - useEntityComments(entityType, entityId)            │   │
│  │  - useCreateComment()                                  │   │
│  │  - useUpdateComment()                                  │   │
│  │  - useDeleteComment()                                  │   │
│  │  - useAddReaction()                                    │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
└──────────────────────────────┼───────────────────────────────┘
                               │ REST API + WebSocket
┌──────────────────────────────┼───────────────────────────────┐
│                    Backend (Fastify)                         │
├──────────────────────────────┼───────────────────────────────┤
│                              │                               │
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │                  /api/v1/notes/*                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│  ┌──────────────────────────┴───────────────────────────┐   │
│  │                   NotesService                         │   │
│  │  + Add 'quote' to NoteEntityType                       │   │
│  └──────────────────────────────────────────────────────┘   │
│                              │                               │
│  ┌─────────────────┐  ┌─────┴─────────┐  ┌───────────────┐  │
│  │ WebSocket       │  │ Notifications │  │ Database      │  │
│  │ (Real-time)     │  │ (Email/Push)  │  │ (PostgreSQL)  │  │
│  └─────────────────┘  └───────────────┘  └───────────────┘  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 3.2 Cambios Backend Requeridos

#### 3.2.1 Extender NoteEntityType
```typescript
// Archivo: /services/lead-service/src/infrastructure/notes/types.ts
// Cambio: Agregar 'quote' al tipo

export type NoteEntityType = 'lead' | 'customer' | 'opportunity' | 'task' | 'contact' | 'quote';
```

#### 3.2.2 Actualizar Validacion en Routes
```typescript
// Archivo: /services/lead-service/src/presentation/routes/notes.routes.ts
const entityTypeSchema = z.enum(['lead', 'customer', 'opportunity', 'task', 'contact', 'quote']);
```

#### 3.2.3 Agregar Eventos WebSocket para Comentarios
```typescript
// Archivo: /services/lead-service/src/infrastructure/websocket/types.ts
// Agregar tipos de mensaje:
COMMENT_CREATED = 'comment.created',
COMMENT_UPDATED = 'comment.updated',
COMMENT_DELETED = 'comment.deleted',
COMMENT_REACTION_ADDED = 'comment.reaction.added',
COMMENT_REACTION_REMOVED = 'comment.reaction.removed',
```

#### 3.2.4 Notificaciones por Menciones
```typescript
// Extender NotificationOrchestrator para:
// - Notificar cuando alguien es mencionado
// - Notificar cuando hay respuesta a un comentario
```

### 3.3 Componentes Frontend

#### 3.3.1 Estructura de Archivos
```
apps/web/src/
├── components/
│   └── comments/
│       ├── index.ts                  # Exports
│       ├── CommentSection.tsx        # Componente principal
│       ├── CommentList.tsx           # Lista de comentarios
│       ├── CommentCard.tsx           # Tarjeta individual
│       ├── CommentInput.tsx          # Input con menciones
│       ├── CommentThread.tsx         # Vista de hilo
│       ├── ReactionBar.tsx           # Barra de reacciones
│       ├── MentionPicker.tsx         # Selector de usuarios
│       └── types.ts                  # Tipos locales
│
└── lib/
    └── comments/
        ├── index.ts                  # Exports
        ├── types.ts                  # Tipos
        ├── hooks.ts                  # React Query hooks
        └── api.ts                    # API client
```

#### 3.3.2 API del Componente Principal
```tsx
interface CommentSectionProps {
  // Requeridos
  entityType: 'lead' | 'customer' | 'opportunity' | 'task' | 'quote' | 'contact';
  entityId: string;

  // Opcionales
  className?: string;
  maxHeight?: string | number;
  allowReplies?: boolean;         // Default: true
  allowReactions?: boolean;       // Default: true
  allowMentions?: boolean;        // Default: true
  allowPinning?: boolean;         // Default: false (solo admins)
  showPinnedFirst?: boolean;      // Default: true
  placeholder?: string;
  emptyMessage?: string;

  // Callbacks
  onCommentAdded?: (comment: Comment) => void;
  onMention?: (userId: string) => void;
}

// Uso
<CommentSection
  entityType="quote"
  entityId={quoteId}
  allowReplies
  allowReactions
  allowMentions
/>
```

### 3.4 Integracion con Modulos Existentes

#### Cotizaciones (QuoteDetailSheet)
```tsx
// Agregar tab de comentarios similar a TaskDetailSheet
<Tabs defaultValue="details">
  <TabsList>
    <TabsTrigger value="details">Detalles</TabsTrigger>
    <TabsTrigger value="comments">Comentarios</TabsTrigger>
    <TabsTrigger value="activity">Actividad</TabsTrigger>
  </TabsList>

  <TabsContent value="comments">
    <CommentSection
      entityType="quote"
      entityId={quote.id}
      allowReplies
      allowReactions
    />
  </TabsContent>
</Tabs>
```

#### Tareas (TaskDetailSheet)
```tsx
// Reemplazar implementacion actual con componente unificado
<TabsContent value="comments">
  <CommentSection
    entityType="task"
    entityId={task.id}
    allowReplies
    allowReactions
    allowMentions
  />
</TabsContent>
```

---

## 4. Plan de Implementacion

### Fase 1: Backend (4 horas)

| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 1.1 | Agregar 'quote' a NoteEntityType | `notes/types.ts` | 5 min |
| 1.2 | Actualizar schema de validacion | `notes.routes.ts` | 5 min |
| 1.3 | Agregar eventos WebSocket | `websocket/types.ts` | 30 min |
| 1.4 | Emitir eventos en NotesService | `notes.service.ts` | 1 hr |
| 1.5 | Crear notificaciones por mencion | `notification.service.ts` | 1.5 hr |
| 1.6 | Tests unitarios | `notes.service.test.ts` | 1 hr |

### Fase 2: Frontend - Hooks y API (4 horas)

| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 2.1 | Crear tipos de comentarios | `lib/comments/types.ts` | 30 min |
| 2.2 | Crear API client | `lib/comments/api.ts` | 30 min |
| 2.3 | Crear hooks React Query | `lib/comments/hooks.ts` | 2 hr |
| 2.4 | Crear subscripcion WebSocket | `lib/comments/realtime.ts` | 1 hr |

### Fase 3: Frontend - Componentes UI (8 horas)

| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 3.1 | CommentSection (orquestador) | `components/comments/CommentSection.tsx` | 1.5 hr |
| 3.2 | CommentList | `components/comments/CommentList.tsx` | 1 hr |
| 3.3 | CommentCard | `components/comments/CommentCard.tsx` | 1.5 hr |
| 3.4 | CommentInput con menciones | `components/comments/CommentInput.tsx` | 2 hr |
| 3.5 | ReactionBar | `components/comments/ReactionBar.tsx` | 1 hr |
| 3.6 | CommentThread | `components/comments/CommentThread.tsx` | 1 hr |

### Fase 4: Integracion (4 horas)

| # | Tarea | Archivo | Esfuerzo |
|---|-------|---------|----------|
| 4.1 | Integrar en QuoteDetailSheet | `quotes/components/` | 1.5 hr |
| 4.2 | Migrar TaskDetailSheet | `tasks/components/` | 1.5 hr |
| 4.3 | Pruebas E2E | - | 1 hr |

---

## 5. Especificaciones Tecnicas

### 5.1 Tipos Frontend

```typescript
// lib/comments/types.ts

export type CommentEntityType = 'lead' | 'customer' | 'opportunity' | 'task' | 'quote' | 'contact';

export interface Comment {
  id: string;
  tenantId: string;
  entityType: CommentEntityType;
  entityId: string;

  // Threading
  parentId?: string;
  threadId?: string;
  replyCount?: number;

  // Contenido
  content: string;
  contentHtml?: string;
  contentType: 'text' | 'markdown' | 'html';

  // Menciones
  mentions: CommentMention[];

  // Clasificacion
  noteType: 'note' | 'comment' | 'internal' | 'system';
  isPinned: boolean;
  isPrivate: boolean;

  // Reacciones
  reactions: Record<string, string[]>; // emoji -> userIds

  // Edicion
  isEdited: boolean;
  editedAt?: string;

  // Autor
  author?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };

  // Respuestas anidadas
  replies?: Comment[];

  // Timestamps
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CommentMention {
  userId: string;
  userName?: string;
  startIndex: number;
  endIndex: number;
}

export interface CreateCommentRequest {
  entityType: CommentEntityType;
  entityId: string;
  parentId?: string;
  content: string;
  contentType?: 'text' | 'markdown';
  isPrivate?: boolean;
  mentions?: CommentMention[];
}

export interface UpdateCommentRequest {
  content?: string;
  isPinned?: boolean;
  isPrivate?: boolean;
  mentions?: CommentMention[];
}

// Reacciones soportadas
export const SUPPORTED_REACTIONS = ['👍', '👎', '❤️', '🎉', '😄', '😕', '👀', '🚀'] as const;
export type SupportedReaction = typeof SUPPORTED_REACTIONS[number];
```

### 5.2 Hooks API

```typescript
// lib/comments/hooks.ts

// Obtener comentarios de una entidad
export function useEntityComments(
  entityType: CommentEntityType,
  entityId: string,
  options?: {
    includeReplies?: boolean;
    page?: number;
    limit?: number;
  }
): UseQueryResult<PaginatedComments>;

// Crear comentario
export function useCreateComment(): UseMutationResult<
  Comment,
  Error,
  CreateCommentRequest
>;

// Actualizar comentario
export function useUpdateComment(): UseMutationResult<
  Comment,
  Error,
  { id: string; data: UpdateCommentRequest }
>;

// Eliminar comentario
export function useDeleteComment(): UseMutationResult<void, Error, string>;

// Agregar reaccion
export function useAddReaction(): UseMutationResult<
  Comment,
  Error,
  { commentId: string; emoji: SupportedReaction }
>;

// Quitar reaccion
export function useRemoveReaction(): UseMutationResult<
  Comment,
  Error,
  { commentId: string; emoji: SupportedReaction }
>;

// Fijar/desfijar comentario
export function useTogglePin(): UseMutationResult<
  Comment,
  Error,
  { commentId: string; pinned: boolean }
>;

// Hook combinado para gestion completa
export function useCommentManagement(
  entityType: CommentEntityType,
  entityId: string
): {
  comments: PaginatedComments | undefined;
  isLoading: boolean;
  isError: boolean;
  createComment: (data: CreateCommentRequest) => Promise<Comment>;
  updateComment: (id: string, data: UpdateCommentRequest) => Promise<Comment>;
  deleteComment: (id: string) => Promise<void>;
  addReaction: (commentId: string, emoji: SupportedReaction) => Promise<Comment>;
  removeReaction: (commentId: string, emoji: SupportedReaction) => Promise<Comment>;
};
```

### 5.3 Eventos WebSocket

```typescript
// Eventos a implementar
interface CommentWebSocketEvents {
  // Nuevo comentario
  'comment.created': {
    entityType: CommentEntityType;
    entityId: string;
    comment: Comment;
  };

  // Comentario actualizado
  'comment.updated': {
    entityType: CommentEntityType;
    entityId: string;
    commentId: string;
    changes: Partial<Comment>;
  };

  // Comentario eliminado
  'comment.deleted': {
    entityType: CommentEntityType;
    entityId: string;
    commentId: string;
  };

  // Reaccion agregada
  'comment.reaction.added': {
    commentId: string;
    userId: string;
    emoji: string;
  };

  // Reaccion removida
  'comment.reaction.removed': {
    commentId: string;
    userId: string;
    emoji: string;
  };
}
```

---

## 6. Consideraciones de Seguridad

### 6.1 Validaciones
- Sanitizar HTML/Markdown antes de renderizar
- Validar UUIDs en menciones
- Rate limiting en creacion de comentarios
- Verificar permisos de tenant

### 6.2 Privacidad
- Comentarios privados solo visibles para autor y admins
- Menciones solo de usuarios del mismo tenant
- No exponer emails en menciones publicas

### 6.3 XSS Prevention
```typescript
// Usar DOMPurify para contenido HTML
import DOMPurify from 'dompurify';

const sanitizedHtml = DOMPurify.sanitize(comment.contentHtml, {
  ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'a', 'code', 'pre', 'ul', 'ol', 'li'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
});
```

---

## 7. Pruebas

### 7.1 Tests Unitarios Backend
- [ ] NotesService.createNote con entityType 'quote'
- [ ] NotesService.getNotesForEntity filtrando por quote
- [ ] Emision de eventos WebSocket en CRUD
- [ ] Notificaciones por mencion

### 7.2 Tests de Integracion Frontend
- [ ] Renderizado de CommentSection
- [ ] Crear comentario y ver actualizacion optimista
- [ ] Threading: responder a comentario
- [ ] Agregar/quitar reaccion
- [ ] Mencionar usuario

### 7.3 Tests E2E
- [ ] Flujo completo: crear cotizacion -> agregar comentario -> mencion
- [ ] Flujo completo: tarea -> comentario -> respuesta -> reaccion

---

## 8. Metricas de Exito

| Metrica | Objetivo |
|---------|----------|
| Tiempo de carga de comentarios | < 500ms |
| Latencia de actualizacion real-time | < 200ms |
| Satisfaccion de usuario | > 4.0/5.0 |
| Adopcion (comentarios/cotizacion) | > 2 avg |

---

## 9. Proximos Pasos

1. **Validacion del Plan**: Revisar este documento con el equipo
2. **Priorizar**: Decidir si implementar completo o MVP
3. **Ambiente de Dev**: Asegurar acceso a base de datos de prueba
4. **Implementacion**: Seguir fases en orden

---

## Apendice A: Archivos a Modificar

### Backend
```
services/lead-service/src/infrastructure/notes/types.ts          [MODIFICAR]
services/lead-service/src/presentation/routes/notes.routes.ts   [MODIFICAR]
services/lead-service/src/infrastructure/websocket/types.ts      [MODIFICAR]
services/lead-service/src/infrastructure/notes/notes.service.ts [MODIFICAR]
```

### Frontend - Nuevos
```
apps/web/src/lib/comments/types.ts                               [CREAR]
apps/web/src/lib/comments/hooks.ts                               [CREAR]
apps/web/src/lib/comments/api.ts                                 [CREAR]
apps/web/src/lib/comments/index.ts                               [CREAR]
apps/web/src/components/comments/CommentSection.tsx              [CREAR]
apps/web/src/components/comments/CommentList.tsx                 [CREAR]
apps/web/src/components/comments/CommentCard.tsx                 [CREAR]
apps/web/src/components/comments/CommentInput.tsx                [CREAR]
apps/web/src/components/comments/ReactionBar.tsx                 [CREAR]
apps/web/src/components/comments/CommentThread.tsx               [CREAR]
apps/web/src/components/comments/MentionPicker.tsx               [CREAR]
apps/web/src/components/comments/index.ts                        [CREAR]
```

### Frontend - Modificar
```
apps/web/src/app/app/quotes/components/QuoteDetailSheet.tsx      [MODIFICAR]
apps/web/src/app/app/tasks/components/TaskDetailSheet.tsx        [MODIFICAR]
```

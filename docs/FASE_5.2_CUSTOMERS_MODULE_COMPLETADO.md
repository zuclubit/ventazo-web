# FASE 5.2 - Customers Module

## Estado: COMPLETADO

**Fecha de completado:** 2025-12-07

---

## Resumen Ejecutivo

El módulo de Customers es el primer módulo de negocio del CRM y uno de los más importantes. Permite gestionar la base de clientes, sus notas, actividad y relaciones comerciales.

---

## Arquitectura del Módulo

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (Next.js)                       │
├─────────────────────────────────────────────────────────────┤
│  Pages                                                       │
│  ├── /app/customers              → Lista de clientes        │
│  └── /app/customers/[customerId] → Detalle del cliente      │
│                                                             │
│  Components                                                  │
│  ├── CustomerFormDialog          → Crear/Editar cliente     │
│  └── DeleteCustomerDialog        → Confirmar eliminación    │
│                                                             │
│  Hooks (React Query)                                        │
│  ├── useCustomers()              → Lista paginada           │
│  ├── useCustomer(id)             → Detalle individual       │
│  ├── useCustomerNotes(id)        → Notas del cliente        │
│  ├── useCustomerActivity(id)     → Historial de actividad   │
│  ├── useCreateCustomer()         → Mutación crear           │
│  ├── useUpdateCustomer()         → Mutación actualizar      │
│  ├── useDeleteCustomer()         → Mutación eliminar        │
│  ├── useAddCustomerNote()        → Agregar nota             │
│  ├── useUpdateCustomerNote()     → Actualizar nota          │
│  └── useDeleteCustomerNote()     → Eliminar nota            │
├─────────────────────────────────────────────────────────────┤
│                     BACKEND (Fastify)                        │
├─────────────────────────────────────────────────────────────┤
│  Routes: /api/v1/customers                                  │
│  ├── GET    /                    → Listar clientes          │
│  ├── GET    /:id                 → Obtener cliente          │
│  ├── POST   /                    → Crear cliente            │
│  ├── PATCH  /:id                 → Actualizar cliente       │
│  ├── DELETE /:id                 → Eliminar cliente         │
│  ├── GET    /:id/notes           → Listar notas             │
│  ├── POST   /:id/notes           → Agregar nota             │
│  ├── PATCH  /:id/notes/:noteId   → Actualizar nota          │
│  ├── DELETE /:id/notes/:noteId   → Eliminar nota            │
│  ├── GET    /:id/activity        → Historial de actividad   │
│  └── GET    /statistics          → Estadísticas globales    │
├─────────────────────────────────────────────────────────────┤
│                     DATABASE (PostgreSQL)                    │
├─────────────────────────────────────────────────────────────┤
│  Tables                                                      │
│  ├── customers                   → Datos principales        │
│  ├── customer_notes              → Notas del cliente        │
│  └── customer_activity           → Registro de actividad    │
└─────────────────────────────────────────────────────────────┘
```

---

## ERD - Modelo de Datos

```
┌────────────────────────────────────────┐
│              customers                  │
├────────────────────────────────────────┤
│ id             UUID PK                 │
│ tenant_id      UUID NOT NULL           │
│ company_name   VARCHAR(255) NOT NULL   │
│ email          VARCHAR(255) NOT NULL   │
│ phone          VARCHAR(50)             │
│ website        VARCHAR(255)            │
│ type           customer_type           │
│ tier           customer_tier           │
│ status         customer_status         │
│ total_revenue  INTEGER DEFAULT 0       │
│ lifetime_value INTEGER DEFAULT 0       │
│ notes          TEXT                    │
│ tags           JSONB DEFAULT []        │
│ metadata       JSONB DEFAULT {}        │
│ assigned_to    UUID                    │
│ first_contact  TIMESTAMP               │
│ last_contact   TIMESTAMP               │
│ created_at     TIMESTAMP               │
│ updated_at     TIMESTAMP               │
└────────────────────────────────────────┘
            │
            │ 1:N
            ▼
┌────────────────────────────────────────┐
│          customer_notes                 │
├────────────────────────────────────────┤
│ id             UUID PK                 │
│ tenant_id      UUID NOT NULL           │
│ customer_id    UUID FK NOT NULL        │
│ created_by     UUID NOT NULL           │
│ content        TEXT NOT NULL           │
│ is_pinned      BOOLEAN DEFAULT FALSE   │
│ metadata       JSONB DEFAULT {}        │
│ created_at     TIMESTAMP               │
│ updated_at     TIMESTAMP               │
└────────────────────────────────────────┘
            │
            │ 1:N
            ▼
┌────────────────────────────────────────┐
│        customer_activity                │
├────────────────────────────────────────┤
│ id             UUID PK                 │
│ tenant_id      UUID NOT NULL           │
│ customer_id    UUID FK NOT NULL        │
│ user_id        UUID                    │
│ action_type    VARCHAR(50) NOT NULL    │
│ description    TEXT                    │
│ metadata       JSONB DEFAULT {}        │
│ changes        JSONB DEFAULT {}        │
│ created_at     TIMESTAMP               │
└────────────────────────────────────────┘
```

### Enums

```sql
-- customer_type
company | individual | partner | reseller

-- customer_tier
standard | premium | enterprise | vip

-- customer_status
active | inactive | churned | prospect | at_risk
```

---

## Diagrama de Flujo CRUD

```
┌─────────────────────────────────────────────────────────────┐
│                    CRUD CUSTOMERS FLOW                       │
└─────────────────────────────────────────────────────────────┘

CREATE CUSTOMER
═══════════════
User clicks      Form Dialog       API Call         Database
"Nuevo Cliente" → Opens Form    → POST /customers → INSERT
     │               │                 │              │
     └───────────────┴─────────────────┴──────────────┘
                     │
                     ▼
              Activity Logged: "customer_created"
              Cache Invalidated: ['customers']

READ CUSTOMERS
══════════════
Page Load → useCustomers() → GET /customers → SELECT with filters
    │            │                │               │
    ├────────────┴────────────────┴───────────────┘
    │
    ▼
   DataTable renders with:
   - Search (company, email, phone)
   - Status filter
   - Tier filter
   - Pagination

UPDATE CUSTOMER
═══════════════
Click "Editar" → Form with data → PATCH /customers/:id → UPDATE
     │               │                   │                  │
     └───────────────┴───────────────────┴──────────────────┘
                     │
                     ▼
              Activity Logged: "customer_updated" + changes
              Cache Invalidated: ['customers', 'customer', id]

DELETE CUSTOMER
═══════════════
Click "Eliminar" → Confirm Dialog → DELETE /customers/:id → DELETE CASCADE
      │                 │                   │                    │
      └─────────────────┴───────────────────┴────────────────────┘
                        │
                        ▼
                 Notes & Activity deleted (CASCADE)
                 Cache Invalidated: ['customers']
```

---

## Screens

### 1. Lista de Clientes (`/app/customers`)

```
┌─────────────────────────────────────────────────────────────┐
│  Clientes                                    [+ Nuevo Cliente]│
│  Gestiona tu base de clientes y sus relaciones              │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐│
│  │Total: 150│ │Activos:98│ │En Riesgo:5││Ingresos: $1.2M   ││
│  │+12 mes   │ │          │ │           ││LTV: $8,000       ││
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘│
├─────────────────────────────────────────────────────────────┤
│  Filtros                                                     │
│  [🔍 Buscar...        ] [Estado ▼] [Tier ▼] [↻]            │
├─────────────────────────────────────────────────────────────┤
│  Listado de Clientes (150 encontrados)                      │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Cliente      │ Contacto       │Estado│Tier  │Ingresos│⋮││
│  ├─────────────────────────────────────────────────────────┤│
│  │ [AC] Acme Inc│info@acme.com   │Activo│Premium│$50,000│⋮││
│  │      acme.com│+1 555-1234     │      │       │       │ ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ [TN] TechNova│hi@technova.io  │Activo│Enter. │$120K  │⋮││
│  │      tech.io │+52 555-9999    │      │       │       │ ││
│  └─────────────────────────────────────────────────────────┘│
│  Página 1 de 8                           [← Anterior][Sig →]│
└─────────────────────────────────────────────────────────────┘
```

### 2. Detalle del Cliente (`/app/customers/[id]`)

```
┌─────────────────────────────────────────────────────────────┐
│  [← Volver]                               [Editar][Eliminar]│
│  ┌────┐                                                     │
│  │ AC │  Acme Inc                        [Activo] [Premium] │
│  └────┘  company | Desde: 15/01/2024                        │
├─────────────────────────────────────────────────────────────┤
│  [Overview] [Notas (5)] [Actividad] [Relacionados]          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────┐ ┌─────────────────────────────┐│
│  │ Información de Contacto │ │ Resumen Financiero          ││
│  ├─────────────────────────┤ ├─────────────────────────────┤│
│  │ ✉ contact@acme.com      │ │ 💰 Ingresos: $50,000        ││
│  │ 📞 +1 555-123-4567      │ │ 📈 LTV: $75,000             ││
│  │ 🌐 https://acme.com     │ │ 📅 Primer contacto: 01/2024 ││
│  └─────────────────────────┘ │ 🕐 Último contacto: 12/2024 ││
│                               └─────────────────────────────┘│
│  ┌─────────────────────────────────────────────────────────┐│
│  │ Etiquetas: [enterprise] [usa] [tech]                    ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 3. Tab de Notas

```
┌─────────────────────────────────────────────────────────────┐
│  [Overview] [Notas (5)] [Actividad] [Relacionados]          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ [Escribir nota...]                           [Agregar] ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 📌 Reunión programada para renovación Q1 2025          ││
│  │    hace 2 días                            [📌][🗑]      ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ Llamada de seguimiento realizada. Cliente satisfecho.  ││
│  │ hace 1 semana                             [📍][🗑]      ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### 4. Tab de Actividad

```
┌─────────────────────────────────────────────────────────────┐
│  [Overview] [Notas (5)] [Actividad] [Relacionados]          │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────┐│
│  │ 📝 Nota agregada                          hace 2 días   ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ ✏️ Cliente actualizado                    hace 1 semana ││
│  │    tier: standard → premium                             ││
│  ├─────────────────────────────────────────────────────────┤│
│  │ ➕ Cliente creado                         hace 1 mes    ││
│  └─────────────────────────────────────────────────────────┘│
│                                              [Cargar más]    │
└─────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Endpoints

| Método | Endpoint | Descripción | Auth |
|--------|----------|-------------|------|
| GET | `/api/v1/customers` | Listar clientes con paginación y filtros | Required |
| GET | `/api/v1/customers/:id` | Obtener cliente por ID | Required |
| POST | `/api/v1/customers` | Crear nuevo cliente | sales_rep+ |
| PATCH | `/api/v1/customers/:id` | Actualizar cliente | sales_rep+ |
| DELETE | `/api/v1/customers/:id` | Eliminar cliente | admin+ |
| GET | `/api/v1/customers/:id/notes` | Listar notas del cliente | Required |
| POST | `/api/v1/customers/:id/notes` | Agregar nota | staff+ |
| PATCH | `/api/v1/customers/:id/notes/:noteId` | Actualizar nota | staff+ |
| DELETE | `/api/v1/customers/:id/notes/:noteId` | Eliminar nota | staff+ |
| GET | `/api/v1/customers/:id/activity` | Historial de actividad | Required |
| GET | `/api/v1/customers/statistics` | Estadísticas globales | Required |

### Query Parameters (GET /customers)

| Param | Tipo | Descripción |
|-------|------|-------------|
| page | number | Página actual (default: 1) |
| limit | number | Items por página (default: 20, max: 100) |
| searchTerm | string | Búsqueda en nombre, email, teléfono |
| status | enum | Filtrar por status |
| tier | enum | Filtrar por tier |
| type | enum | Filtrar por tipo |
| sortBy | string | Campo de ordenamiento |
| sortOrder | 'asc' \| 'desc' | Dirección del orden |

### Request/Response Examples

**Crear Cliente:**
```json
POST /api/v1/customers
Headers: { "x-tenant-id": "uuid", "x-user-id": "uuid" }

Request:
{
  "companyName": "Acme Inc",
  "email": "info@acme.com",
  "phone": "+1 555-1234",
  "website": "https://acme.com",
  "type": "company",
  "tier": "premium",
  "tags": ["enterprise", "usa"]
}

Response: 201
{
  "id": "uuid",
  "tenantId": "uuid",
  "companyName": "Acme Inc",
  "email": "info@acme.com",
  "status": "active",
  "tier": "premium",
  "type": "company",
  "totalRevenue": 0,
  "createdAt": "2025-12-07T...",
  ...
}
```

---

## React Hooks Reference

```typescript
// Lista de clientes con filtros
const {
  customers,
  meta,
  isLoading
} = useCustomers({
  page: 1,
  limit: 20,
  searchTerm: 'acme',
  status: 'active',
  tier: 'premium'
});

// Detalle de cliente individual
const { customer, isLoading } = useCustomer(customerId);

// Notas del cliente
const { notes, isLoading } = useCustomerNotes(customerId);

// Actividad del cliente
const {
  activities,
  hasNextPage,
  fetchNextPage
} = useCustomerActivity(customerId);

// Mutaciones
const createCustomer = useCreateCustomer();
const updateCustomer = useUpdateCustomer();
const deleteCustomer = useDeleteCustomer();
const addNote = useAddCustomerNote();
const updateNote = useUpdateCustomerNote();
const deleteNote = useDeleteCustomerNote();

// Hooks combinados para páginas
const {
  customer,
  notes,
  statistics,
  isLoading
} = useCustomerDetail(customerId);

const {
  customers,
  statistics,
  refetchCustomers
} = useCustomerManagement(filters);
```

---

## RBAC Aplicado

| Rol | Acciones Permitidas |
|-----|---------------------|
| **viewer** | Ver lista, ver detalle |
| **staff** | + Agregar/editar/eliminar notas |
| **sales_rep** | + Crear clientes, editar clientes |
| **manager** | + Todas las acciones de sales_rep |
| **admin** | + Eliminar clientes |
| **owner** | Acceso total |

### Implementación en Frontend

```tsx
// Botón crear cliente - solo sales_rep+
<RBACGuard minRole="sales_rep" fallback={null}>
  <Button onClick={() => setIsCreateOpen(true)}>
    Nuevo Cliente
  </Button>
</RBACGuard>

// Botón eliminar - solo admin+
<RBACGuard minRole="admin" fallback={null}>
  <DropdownMenuItem onClick={() => setDeleteCustomer(customer)}>
    Eliminar
  </DropdownMenuItem>
</RBACGuard>

// Agregar notas - solo staff+
<RBACGuard minRole="staff" fallback={null}>
  <Button onClick={handleAddNote}>Agregar Nota</Button>
</RBACGuard>
```

---

## Multi-Tenant Aplicado

### Headers Requeridos

Todas las peticiones deben incluir:
```
x-tenant-id: <tenant-uuid>
x-user-id: <user-uuid>
```

### Uso en Frontend

```typescript
// Hook useTenantSafe() asegura tenant válido
const { tenant, isLoading } = useTenantSafe();

// Los hooks internamente usan el tenant
const { customers } = useCustomers({ page: 1 });
// Automáticamente agrega x-tenant-id al request
```

### Backend Middleware

```typescript
// Middleware extrae y valida tenant
app.addHook('onRequest', async (request) => {
  const tenantId = request.headers['x-tenant-id'];
  if (!tenantId) throw new Error('Tenant required');
  request.tenantId = tenantId;
});

// Service filtra por tenant
async getCustomers(tenantId: string, filters) {
  return db.query.customers.findMany({
    where: and(
      eq(customers.tenantId, tenantId),
      // otros filtros...
    )
  });
}
```

---

## Archivos Creados/Modificados

### Backend
- `services/lead-service/src/infrastructure/database/schema.ts` - Tablas customer_notes y customer_activity
- `services/lead-service/src/presentation/routes/customer.routes.ts` - Endpoints de notas y actividad
- `services/lead-service/src/infrastructure/customers/customer.service.ts` - Métodos de notas y actividad

### Frontend
- `apps/web/src/lib/customers/types.ts` - Tipos y constantes
- `apps/web/src/lib/customers/hooks.ts` - React Query hooks
- `apps/web/src/lib/customers/index.ts` - Exports
- `apps/web/src/app/app/customers/page.tsx` - Lista de clientes
- `apps/web/src/app/app/customers/[customerId]/page.tsx` - Detalle del cliente
- `apps/web/src/app/app/customers/components/customer-form-dialog.tsx` - Formulario crear/editar
- `apps/web/src/app/app/customers/components/delete-customer-dialog.tsx` - Diálogo eliminar

### UI Components Added
- `apps/web/src/components/ui/tabs.tsx`
- `apps/web/src/components/ui/textarea.tsx`
- `apps/web/src/components/ui/table.tsx`

---

## Testing

```bash
# Build exitoso
npm run build
# ✓ Compiled successfully

# Verificar rutas
# GET  /app/customers           → Lista
# GET  /app/customers/:id       → Detalle
```

---

## Próximos Pasos (FASE 5.3+)

1. **FASE 5.3** - Módulo de Contacts (contactos dentro de customers)
2. **FASE 5.4** - Módulo de Deals/Opportunities
3. **FASE 5.5** - Módulo de Tasks
4. **FASE 5.6** - Dashboard y Analytics

---

## Notas de Implementación

1. **Actividad Automática**: Cada operación CRUD genera automáticamente un registro en `customer_activity`
2. **Notas Fijadas**: Las notas pueden marcarse como "pinned" para aparecer primero
3. **Cache Inteligente**: React Query invalida el cache apropiado en cada mutación
4. **Infinite Scroll**: La actividad usa `useInfiniteQuery` para cargar más registros
5. **Optimistic Updates**: Los hooks de mutación invalidan queries después del éxito

---

**FASE 5.2 - COMPLETADA**

# FASE 1 - Arquitectura Frontend Completa

## Resumen Ejecutivo

FASE 1 establece las bases sólidas del frontend para Zuclubit CRM, implementando una arquitectura moderna, escalable y multi-tenant.

**Estado**: ✅ Completado
**Fecha**: 2025-12-07

---

## 1. Stack Tecnológico Implementado

### Core
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Next.js | 14.2.18 | Framework React con App Router |
| React | 18.3.1 | Biblioteca UI |
| TypeScript | 5.x | Tipado estático (strict mode) |
| TailwindCSS | 3.4.x | Estilos utility-first |

### State Management
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| TanStack Query | 5.62.7 | Server state, cache |
| Zustand | 5.0.2 | Client state global |

### UI Components
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| Shadcn/UI | latest | Componentes base (new-york style) |
| Radix UI | latest | Primitivos accesibles |
| Lucide React | 0.468.0 | Iconografía |
| class-variance-authority | 0.7.1 | Variantes de componentes |

### Data & Validation
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| TanStack Table | 8.20.6 | Tablas avanzadas |
| Zod | 3.24.1 | Validación de esquemas |
| react-hook-form | 7.x | Formularios |

---

## 2. Estructura de Directorios

```
apps/web/
├── src/
│   ├── app/                      # Next.js App Router
│   │   ├── layout.tsx            # Root layout
│   │   ├── page.tsx              # Landing page
│   │   ├── globals.css           # Global styles + CSS variables
│   │   └── app/                  # Protected dashboard routes
│   │       ├── layout.tsx        # Dashboard shell
│   │       └── page.tsx          # Dashboard home
│   │
│   ├── components/               # Atomic Design Structure
│   │   ├── ui/                   # Atoms - Primitivos UI
│   │   │   ├── avatar.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── scroll-area.tsx
│   │   │   ├── separator.tsx
│   │   │   ├── sheet.tsx
│   │   │   ├── skeleton.tsx
│   │   │   ├── tooltip.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── layout/               # Organisms - Layout
│   │   │   ├── dashboard-shell.tsx
│   │   │   ├── mobile-sidebar.tsx
│   │   │   ├── navbar.tsx
│   │   │   ├── page-header.tsx
│   │   │   ├── sidebar.tsx
│   │   │   ├── sidebar-nav.tsx
│   │   │   └── index.ts
│   │   │
│   │   ├── data-table/           # Molecules - DataTable
│   │   │   ├── data-table.tsx
│   │   │   ├── data-table-column-header.tsx
│   │   │   └── index.ts
│   │   │
│   │   └── providers.tsx         # Context providers
│   │
│   └── lib/                      # Utilities & Business Logic
│       ├── utils.ts              # Utility functions
│       │
│       ├── api/                  # API Layer
│       │   ├── api-client.ts     # HTTP client with tenant support
│       │   ├── hooks/
│       │   │   └── use-api-query.ts
│       │   └── index.ts
│       │
│       ├── store/                # Global State (Zustand)
│       │   ├── app-store.ts
│       │   └── index.ts
│       │
│       └── tenant/               # Multi-tenancy
│           ├── tenant-context.tsx
│           └── index.ts
│
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
├── postcss.config.mjs
├── components.json              # Shadcn/UI config
└── .env.local
```

---

## 3. Arquitectura Multi-Tenant

### TenantContext
```typescript
// Uso en componentes
const { tenant, isLoading } = useTenant();
const tenantId = useTenantId();
const hasWhatsApp = useFeatureFlag('whatsapp');
```

### Características
- **Aislamiento por tenant_id**: Todas las llamadas API incluyen header `x-tenant-id`
- **Feature flags por tenant**: Habilitar/deshabilitar funcionalidades
- **Configuración personalizable**: Moneda, locale, timezone, colores
- **Path-based routing preparado**: `/app/[tenant]/...`

---

## 4. API Client

### Configuración
```typescript
// Crear cliente con tenant
const client = createApiClient(tenantId);

// Métodos disponibles
await client.get<Lead[]>('/api/v1/leads');
await client.post<Lead>('/api/v1/leads', newLead);
await client.put<Lead>('/api/v1/leads/123', updates);
await client.patch<Lead>('/api/v1/leads/123', partial);
await client.delete('/api/v1/leads/123');
```

### Query Keys Factory
```typescript
// Patrones consistentes para cache
queryKeys.leads.list({ status: 'new' })
queryKeys.leads.detail('123')
queryKeys.opportunities.all
```

### Hooks con TanStack Query
```typescript
// Hook genérico con tenant
const { data, isLoading } = useApiQuery<Lead[]>(
  queryKeys.leads.list(filters),
  '/api/v1/leads'
);

// Mutations con invalidación automática
const mutation = useApiMutation(
  (data) => client.post('/api/v1/leads', data),
  { invalidateKeys: [queryKeys.leads.all] }
);
```

---

## 5. Sistema de Diseño

### Temas (Light/Dark)
CSS Variables definidas en `globals.css`:
```css
:root {
  --background: 0 0% 100%;
  --foreground: 222.2 84% 4.9%;
  --primary: 201 96% 32%;        /* Zuclubit Blue */
  --success: 142 76% 36%;
  --warning: 38 92% 50%;
  /* ... */
}

.dark {
  --background: 222.2 84% 4.9%;
  --foreground: 210 40% 98%;
  /* ... */
}
```

### Componentes de Layout

#### DashboardShell
Envuelve todas las páginas del dashboard:
- Sidebar (desktop) con navegación colapsable
- MobileSidebar (responsive) con Sheet
- Navbar con búsqueda, notificaciones, theme toggle
- Área de contenido principal

#### PageHeader
Header consistente para todas las páginas:
```tsx
<PageHeader
  heading="Leads"
  description="Gestiona tus prospectos de venta"
>
  <Button>Nuevo Lead</Button>
</PageHeader>
```

### DataTable
Tabla avanzada con TanStack Table:
- Sorting
- Filtering (búsqueda)
- Column visibility toggle
- Pagination
- Row selection

---

## 6. Estado Global (Zustand)

### AppStore
```typescript
// Estado persistido
interface AppState {
  user: User | null;
  ui: {
    sidebar: { isCollapsed, openSections };
    theme: 'light' | 'dark' | 'system';
    commandPaletteOpen: boolean;
  };
}

// Selectores optimizados
const user = useUser();
const sidebar = useSidebarState();
```

### Características
- **Persistencia**: LocalStorage para UI preferences
- **Immer**: Updates inmutables más legibles
- **Selectores**: Previenen re-renders innecesarios

---

## 7. Configuración TypeScript

```json
{
  "compilerOptions": {
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "paths": {
      "@/*": ["./src/*"],
      "@/components/*": ["./src/components/*"],
      "@/lib/*": ["./src/lib/*"]
    }
  }
}
```

---

## 8. Archivos de Configuración

### next.config.mjs
- Output: standalone (para Docker)
- Imágenes: Dominios permitidos configurados
- Turbopack ready

### tailwind.config.ts
- Colores personalizados (Zuclubit brand)
- Animaciones CSS custom
- Soporte sidebar variables

### components.json
- Style: new-york
- RSC: true
- CSS Variables: true

---

## 9. Próximos Pasos (FASE 2)

### Integración Backend
1. Conectar API Client con endpoints reales
2. Implementar autenticación (Supabase Auth)
3. Crear hooks específicos por módulo

### Módulos CRM
1. Lead management completo
2. Pipeline/Kanban view
3. Formularios con validación

### Testing
1. Unit tests (Vitest)
2. Component tests (Testing Library)
3. E2E tests (Playwright)

---

## 10. Comandos de Desarrollo

```bash
# Instalar dependencias
npm install

# Desarrollo
npm run dev

# Build
npm run build

# Lint
npm run lint

# Type check
npm run typecheck
```

---

## Checklist FASE 1 ✅

- [x] Next.js 14 + TypeScript strict
- [x] TailwindCSS + Shadcn/UI (new-york)
- [x] Estructura Atomic Design
- [x] DashboardShell (Sidebar + Navbar + Mobile)
- [x] PageHeader component
- [x] DataTable con TanStack Table
- [x] TenantContext multi-tenant
- [x] API Client con tenant headers
- [x] TanStack Query configurado
- [x] Zustand store con persistencia
- [x] Theme switcher (light/dark/system)
- [x] Responsive design (mobile-first)
- [x] Documentación completa

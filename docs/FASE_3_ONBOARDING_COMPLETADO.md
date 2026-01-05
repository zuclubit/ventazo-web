# FASE 3: Onboarding Completo - Documentación

## Resumen

La FASE 3 implementa el flujo completo de onboarding para Zuclubit Smart CRM, incluyendo:

- Registro de usuarios
- Creación de tenant (negocio)
- Configuración inicial del CRM
- Sistema de invitaciones
- Selector de tenants
- Auditoría completa

## Arquitectura

```
apps/web/src/
├── app/
│   ├── signup/
│   │   └── page.tsx                 # Registro de usuario
│   └── onboarding/
│       ├── layout.tsx               # Layout del wizard
│       ├── create-business/
│       │   └── page.tsx             # Paso 1: Crear negocio
│       ├── setup/
│       │   └── page.tsx             # Paso 2: Configuración inicial
│       ├── invite-team/
│       │   └── page.tsx             # Paso 3: Invitar equipo
│       └── complete/
│           └── page.tsx             # Paso 4: Confirmación
├── components/
│   ├── onboarding/
│   │   └── onboarding-layout.tsx    # Componentes del wizard
│   ├── tenant/
│   │   ├── tenant-switcher.tsx      # Selector de tenants
│   │   └── index.ts
│   └── ui/
│       ├── label.tsx
│       ├── select.tsx
│       ├── checkbox.tsx
│       ├── switch.tsx
│       ├── progress.tsx
│       ├── popover.tsx
│       └── command.tsx
├── lib/
│   └── onboarding/
│       ├── index.ts                 # Exports centralizados
│       ├── types.ts                 # Tipos y constantes
│       └── onboarding-service.ts    # Servicios API
└── store/
    └── onboarding.store.ts          # Estado Zustand
```

## Flujo de Onboarding

### Paso 1: Signup (`/signup`)

El usuario crea su cuenta con:
- Nombre y apellido
- Email
- Contraseña (con validación en tiempo real)

**Validaciones:**
- Email válido y único
- Contraseña: mínimo 8 caracteres, mayúscula, minúscula, número

**Código clave:**
```typescript
const { userId } = await signupUser({
  firstName,
  lastName,
  email,
  password
});
```

### Paso 2: Crear Negocio (`/onboarding/create-business`)

El usuario crea su tenant (organización):
- Nombre del negocio
- Tipo de negocio (servicios, retail, tecnología, etc.)
- Tamaño del equipo
- Teléfono
- País y ciudad
- Zona horaria

**Tipos de negocio soportados:**
```typescript
export const BUSINESS_TYPE_LABELS = {
  services: 'Servicios Profesionales',
  retail: 'Comercio / Retail',
  technology: 'Tecnología / Software',
  real_estate: 'Bienes Raíces',
  education: 'Educación',
  healthcare: 'Salud',
  manufacturing: 'Manufactura',
  hospitality: 'Hospitalidad',
  financial: 'Servicios Financieros',
  consulting: 'Consultoría',
  marketing: 'Marketing / Publicidad',
  other: 'Otro',
};
```

### Paso 3: Configuración Inicial (`/onboarding/setup`)

Sub-paso 3.1: **Branding**
- Nombre comercial
- Color primario
- Color secundario
- Vista previa del logo

Sub-paso 3.2: **Módulos CRM**
- Leads (siempre activo)
- Customers (siempre activo)
- Opportunities
- Tasks
- Calendar
- Invoicing
- Products
- Teams
- Pipelines
- Marketing
- WhatsApp
- Reports

Sub-paso 3.3: **Horarios de Atención**
- Configuración por día de la semana
- Hora de apertura y cierre
- Días activos/inactivos

### Paso 4: Invitar Equipo (`/onboarding/invite-team`)

- Agregar múltiples miembros
- Asignar roles a cada miembro
- Enviar invitaciones por email

**Roles disponibles:**
```typescript
const ROLE_OPTIONS = [
  { value: 'admin', label: 'Administrador' },
  { value: 'manager', label: 'Gerente' },
  { value: 'sales_rep', label: 'Vendedor' },
  { value: 'viewer', label: 'Visualizador' },
];
```

### Paso 5: Completado (`/onboarding/complete`)

- Animación de confeti
- Resumen de configuración
- Acciones rápidas sugeridas
- Redirección al dashboard

## Base de Datos

### Nuevas Tablas

#### `tenant_settings`
```sql
CREATE TABLE tenant_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  business_type business_type,
  business_size business_size,
  phone VARCHAR(20),
  website VARCHAR(255),
  address TEXT,
  city VARCHAR(100),
  country VARCHAR(100),
  logo_url TEXT,
  primary_color VARCHAR(7) DEFAULT '#0066FF',
  secondary_color VARCHAR(7) DEFAULT '#00CC88',
  company_email VARCHAR(255),
  modules JSONB DEFAULT '{}',
  business_hours JSONB DEFAULT '{}',
  notifications JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_invitations`
```sql
CREATE TABLE user_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  email VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'sales_rep',
  token VARCHAR(64) NOT NULL UNIQUE,
  status invitation_status DEFAULT 'pending',
  invited_by UUID REFERENCES auth.users(id),
  message TEXT,
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### `user_onboarding`
```sql
CREATE TABLE user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status onboarding_status DEFAULT 'pending',
  current_step INTEGER DEFAULT 0,
  completed_steps TEXT[] DEFAULT '{}',
  metadata JSONB DEFAULT '{}',
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Enums

```sql
CREATE TYPE business_type AS ENUM (
  'services', 'retail', 'technology', 'real_estate', 'education',
  'healthcare', 'manufacturing', 'hospitality', 'financial',
  'consulting', 'marketing', 'other'
);

CREATE TYPE business_size AS ENUM (
  'solo', 'small', 'medium', 'large', 'enterprise'
);

CREATE TYPE invitation_status AS ENUM (
  'pending', 'accepted', 'expired', 'cancelled'
);

CREATE TYPE onboarding_status AS ENUM (
  'pending', 'in_progress', 'completed', 'skipped'
);
```

### Políticas RLS

```sql
-- tenant_settings: Solo miembros activos del tenant
CREATE POLICY "Users can view their tenant settings"
  ON tenant_settings FOR SELECT
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_memberships
    WHERE user_id = auth.uid() AND status = 'active'
  ));

-- user_invitations: Solo admin/owner pueden gestionar
CREATE POLICY "Admins can manage invitations"
  ON user_invitations FOR ALL
  USING (tenant_id IN (
    SELECT tenant_id FROM tenant_memberships
    WHERE user_id = auth.uid()
    AND status = 'active'
    AND role IN ('owner', 'admin')
  ));
```

## Estado Global (Zustand)

```typescript
interface OnboardingState {
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  isLoading: boolean;
  error: string | null;
  data: {
    userId?: string;
    tenantId?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    businessName?: string;
    businessType?: string;
    businessSize?: string;
    // ... más campos
  };
}
```

**Persistencia:** SessionStorage (temporal durante onboarding)

## Componentes UI

### TenantSwitcher

Selector de tenants para la barra de navegación:

```tsx
import { TenantSwitcher } from '@/components/tenant';

// En el navbar:
<TenantSwitcher className="ml-auto" />
```

**Características:**
- Lista de tenants del usuario
- Búsqueda rápida
- Indicador del tenant actual
- Acceso rápido a configuración
- Crear nuevo negocio

### OnboardingLayout

Layout wrapper para el wizard:

```tsx
import { OnboardingLayout, StepCard } from '@/components/onboarding/onboarding-layout';

<OnboardingLayout>
  <StepCard
    title="Título del paso"
    description="Descripción"
    footer={<Buttons />}
  >
    {/* Contenido */}
  </StepCard>
</OnboardingLayout>
```

## Auditoría

### Eventos Registrados

| Acción | Descripción |
|--------|-------------|
| `user_signup` | Usuario crea cuenta |
| `tenant_created` | Nuevo tenant creado |
| `branding_updated` | Colores/logo actualizados |
| `modules_updated` | Módulos activados/desactivados |
| `business_hours_updated` | Horarios modificados |
| `invitation_sent` | Invitación enviada |
| `invitation_accepted` | Invitación aceptada |
| `invitation_cancelled` | Invitación cancelada |
| `onboarding_completed` | Onboarding finalizado |
| `tenant_switched` | Usuario cambió de tenant |

### Uso

```typescript
import { logAuditEvent } from '@/lib/onboarding';

await logAuditEvent(
  tenantId,
  userId,
  'tenant_created',
  'tenant',
  tenantId,
  { businessName, businessType }
);
```

## Dependencias Agregadas

```json
{
  "canvas-confetti": "^1.9.2",
  "cmdk": "^0.2.0",
  "@radix-ui/react-popover": "^1.0.7",
  "@types/canvas-confetti": "^1.6.4"
}
```

## Pruebas Recomendadas

### Flujo Completo
1. Navegar a `/signup`
2. Crear cuenta con datos válidos
3. Completar creación de negocio
4. Configurar branding
5. Seleccionar módulos
6. Configurar horarios
7. Invitar miembros (o saltar)
8. Verificar llegada al dashboard

### Casos Edge
- Email ya registrado
- Contraseña inválida
- Sesión expirada durante onboarding
- Invitación con email duplicado
- Cambiar de tenant después de onboarding

## Próximos Pasos (FASE 4)

- [ ] Implementar envío real de emails de invitación
- [ ] Agregar upload de logo
- [ ] Implementar tema oscuro en onboarding
- [ ] Agregar analytics de onboarding
- [ ] Implementar "tour guiado" post-onboarding
- [ ] Sincronización con CRM backend (lead-service)

## Conclusión

La FASE 3 proporciona un flujo de onboarding completo y profesional que:

1. **Guía al usuario** paso a paso en la configuración
2. **Personaliza** la experiencia según el tipo de negocio
3. **Prepara el CRM** con módulos relevantes
4. **Facilita** la colaboración con invitaciones de equipo
5. **Registra** todas las acciones para auditoría

El sistema está diseñado para ser extensible y permite agregar nuevos pasos o configuraciones según las necesidades futuras del producto.

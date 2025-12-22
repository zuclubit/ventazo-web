# Análisis Profundo del Proceso de Onboarding - Zuclubit CRM

## Resumen Ejecutivo

Este documento presenta un análisis exhaustivo del proceso de onboarding actual del CRM Zuclubit, comparándolo con las mejores prácticas de la industria SaaS/CRM en 2025. El análisis cubre tanto la implementación backend como frontend, identificando gaps críticos y proporcionando recomendaciones detalladas para crear un módulo moderno, completo y con excelente experiencia de usuario.

---

## 1. Estado Actual del Onboarding

### 1.1 Arquitectura General

```
┌─────────────────────────────────────────────────────────────────────────┐
│                        FLUJO ACTUAL DE ONBOARDING                        │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   ┌──────────┐    ┌────────────────┐    ┌─────────┐    ┌────────────┐   │
│   │  Signup  │───▶│ Create Business │───▶│  Setup  │───▶│ Invite Team│   │
│   │  (Paso 1)│    │    (Paso 2)     │    │ (Paso 3)│    │  (Paso 4)  │   │
│   └──────────┘    └────────────────┘    └─────────┘    └────────────┘   │
│        │                  │                  │               │           │
│        ▼                  ▼                  ▼               ▼           │
│   ┌──────────┐    ┌────────────────┐    ┌─────────┐    ┌────────────┐   │
│   │ Usuario  │    │    Tenant      │    │Branding │    │Invitaciones│   │
│   │ Creado   │    │    Creado      │    │Modules  │    │  Enviadas  │   │
│   └──────────┘    └────────────────┘    │Hours    │    └────────────┘   │
│                                         └─────────┘                      │
│                                                             │            │
│                                              ┌──────────────▼─────────┐  │
│                                              │     Complete (Paso 5)  │  │
│                                              │   Dashboard Redirect   │  │
│                                              └────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────┘
```

### 1.2 Endpoints Backend Actuales

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/v1/onboarding/status` | GET | Obtener estado actual |
| `/api/v1/onboarding/initialize` | POST | Inicializar onboarding |
| `/api/v1/onboarding/progress` | PUT | Actualizar progreso |
| `/api/v1/onboarding/complete-step` | POST | Completar paso específico |
| `/api/v1/onboarding/complete` | POST | Finalizar onboarding |

### 1.3 Estados del Onboarding

```typescript
type OnboardingStatus =
  | 'not_started'      // Inicial
  | 'profile_created'  // Usuario registrado
  | 'business_created' // Negocio creado
  | 'setup_completed'  // Configuración completada
  | 'team_invited'     // Equipo invitado
  | 'completed';       // Finalizado
```

### 1.4 Pasos Definidos

```typescript
type OnboardingStep =
  | 'signup'          // Registro de usuario
  | 'create-business' // Información del negocio
  | 'branding'        // Colores y marca
  | 'modules'         // Selección de módulos
  | 'business-hours'  // Horario de atención
  | 'invite-team'     // Invitar equipo
  | 'complete';       // Finalización
```

---

## 2. Análisis Detallado por Paso

### 2.1 Paso 1: Signup (Registro de Usuario)

#### Datos Recopilados Actualmente

| Campo | Validación | Requerido |
|-------|------------|-----------|
| Nombre | Min 2, Max 50 chars | ✅ |
| Apellido | Min 2, Max 50 chars | ✅ |
| Email | Formato email válido | ✅ |
| Contraseña | Min 8, mayúscula, minúscula, número | ✅ |
| Confirmar contraseña | Match con contraseña | ✅ |

#### ❌ Datos Faltantes (Críticos)

| Campo | Justificación | Prioridad |
|-------|---------------|-----------|
| **Verificación de email** | Prevenir emails inválidos/typos | P0 |
| **Aceptación de términos** | Requerimiento legal | P0 |
| **Aceptación de privacidad** | GDPR/LFPDPPP compliance | P0 |
| **Captcha/Bot protection** | Seguridad | P1 |
| **Fuente de adquisición** | Marketing analytics | P2 |

#### UX Issues Identificados

1. **No hay verificación de email** - Usuario puede continuar con email inválido
2. **No hay checkbox de términos** - Riesgo legal
3. **Password requirements no son claros** - Solo se muestran después de error
4. **No hay opción de SSO** - Fricción innecesaria

---

### 2.2 Paso 2: Create Business (Información del Negocio)

#### Datos Recopilados Actualmente

**Información Básica:**
| Campo | Validación | Requerido |
|-------|------------|-----------|
| Nombre del negocio | Min 2, Max 100 chars | ✅ |
| Tipo de negocio | 11 opciones predefinidas | ✅ |
| Tamaño del negocio | 7 opciones | ✅ |
| Teléfono | 7-15 dígitos | ✅ |
| Ciudad | Min 2 chars | ✅ |
| País | 7 países soportados | ✅ |
| Zona horaria | IANA format | ✅ |

**Información Avanzada (Opcional):**
| Campo | Validación | Requerido |
|-------|------------|-----------|
| Razón social | Min 2, Max 150 chars | ❌ |
| RFC (México) | 12-13 chars específicos | ❌ |
| Email de negocio | Formato email | ❌ |
| Sitio web | URL válida | ❌ |
| Industria | Min 2, Max 100 chars | ❌ |

#### ❌ Datos Faltantes (Críticos)

| Campo | Justificación | Prioridad |
|-------|---------------|-----------|
| **Logo del negocio** | Branding esencial | P0 |
| **Dirección completa** | Facturación/localización | P1 |
| **Código postal** | Geolocalización | P1 |
| **Estado/Provincia** | Segmentación regional | P1 |
| **Moneda preferida** | Operaciones financieras | P0 |
| **Idioma preferido** | UX personalizada | P1 |
| **Número de empleados exacto** | Segmentación | P2 |
| **Ingresos anuales (rango)** | Calificación de cuenta | P2 |
| **Objetivo principal CRM** | Personalización | P1 |

#### Validaciones Faltantes

1. **Teléfono**: No valida formato por país (ej: México +52, 10 dígitos)
2. **RFC**: Solo valida formato, no checksum
3. **Timezone vs País**: No valida consistencia
4. **URL**: No verifica si el sitio existe

#### UX Issues Identificados

1. **Secciones avanzadas colapsadas** - Usuario puede perder información importante
2. **No hay preview del logo** - Campo existe en types pero no en UI
3. **Auto-detección de ubicación falla silenciosamente**
4. **No hay ayuda contextual para RFC/Tax ID**

---

### 2.3 Paso 3: Setup (Configuración)

#### Sub-paso 3A: Branding

**Datos Actuales:**
| Campo | Validación | Requerido |
|-------|------------|-----------|
| Color primario | Hex #RRGGBB | ✅ |
| Color secundario | Hex #RRGGBB | ✅ |
| Nombre de empresa | Texto libre | ✅ |

**❌ Datos Faltantes:**
| Campo | Justificación | Prioridad |
|-------|---------------|-----------|
| **Logo upload** | Identidad visual | P0 |
| **Favicon** | Browser tabs | P2 |
| **Font preference** | Consistencia de marca | P3 |
| **Email signature template** | Comunicaciones | P2 |

#### Sub-paso 3B: Módulos

**Módulos Disponibles:**
| Módulo | Default | Descripción |
|--------|---------|-------------|
| Leads | ✅ ON | Gestión de prospectos |
| Customers | ✅ ON | Base de clientes |
| Opportunities | ❌ OFF | Pipeline de ventas |
| Tasks | ✅ ON | Gestión de actividades |
| Calendar | ❌ OFF | Citas y eventos |
| Invoicing | ❌ OFF | Cotizaciones y facturas |
| Products | ❌ OFF | Catálogo de productos |
| Teams | ❌ OFF | Gestión de equipos |
| Pipelines | ❌ OFF | Workflows personalizados |
| Marketing | ❌ OFF | Campañas y automatización |
| WhatsApp | ❌ OFF | Integración WhatsApp Business |
| Reports | ❌ OFF | Analytics y reportes |

**❌ Issues Identificados:**
1. **No hay dependencias entre módulos** - Invoicing sin Products genera confusión
2. **No hay descripción de cada módulo** - Usuario no sabe qué incluye cada uno
3. **Auto-selección por tipo de negocio no es clara** - Usuario no sabe cuáles fueron auto-seleccionados
4. **No hay plan/tier information** - Cuáles módulos son premium?

#### Sub-paso 3C: Business Hours

**Datos Actuales:**
| Campo | Validación | Default |
|-------|------------|---------|
| Lunes-Viernes | enabled + open/close | 09:00-18:00 |
| Sábado-Domingo | enabled + open/close | Deshabilitado |
| Timezone | String | Auto-detectado |

**❌ Issues Identificados:**
1. **No soporta múltiples horarios por día** (ej: 09:00-13:00, 15:00-19:00)
2. **No soporta días festivos**
3. **No hay horarios por sucursal/ubicación**
4. **Timezone puede no coincidir con el del paso 2**

---

### 2.4 Paso 4: Invite Team

**Datos Actuales:**
| Campo | Validación | Requerido |
|-------|------------|-----------|
| Email del miembro | Formato email | ✅ |
| Rol | admin, manager, sales_rep, viewer | ✅ |

**Roles Disponibles:**
| Rol | Permisos |
|-----|----------|
| Admin | Acceso completo excepto facturación |
| Manager | Gestión de equipo + reportes |
| Sales Rep | Gestionar leads/clientes propios |
| Viewer | Solo lectura |

**❌ Issues Identificados:**
1. **No hay mensaje personalizado** - Invitaciones genéricas
2. **No hay preview del email** - Usuario no sabe qué recibirá el invitado
3. **No hay reenvío de invitación fallida** - Debe reiniciar todo
4. **No hay límite visible de invitaciones** - Por plan/tier
5. **No hay importación masiva** - Solo uno por uno

---

### 2.5 Paso 5: Complete

**Funcionalidad Actual:**
- Animación de confetti
- Mensaje de bienvenida
- Resumen de configuración
- 3 acciones rápidas (agregar lead, dashboard, crear tarea)

**❌ Issues Identificados:**
1. **No hay checklist de "próximos pasos"**
2. **No hay video tutorial introductorio**
3. **No hay opción de agendar llamada de soporte**
4. **No hay tour interactivo del dashboard**

---

## 3. Análisis Comparativo con Mejores Prácticas

### 3.1 Comparación con Estándares de la Industria

| Aspecto | Zuclubit Actual | Best Practice 2025 | Gap |
|---------|-----------------|-------------------|-----|
| **Time-to-Value** | ~10-15 min | < 5 min | ❌ Alto |
| **Pasos del wizard** | 5 pasos | 3-4 pasos máximo | ⚠️ Medio |
| **Verificación email** | No implementado | Obligatorio | ❌ Crítico |
| **SSO/Social login** | No disponible | Google, Microsoft, Slack | ❌ Alto |
| **Progress bar** | Implementado | ✅ | ✅ OK |
| **Skip option** | Solo en invite-team | En todos los opcionales | ⚠️ Medio |
| **Save & resume** | Session storage | Persistente en DB | ⚠️ Medio |
| **Mobile responsive** | Parcial | Full responsive | ⚠️ Medio |
| **Personalización por rol** | No | Diferentes flujos | ❌ Alto |
| **Tour interactivo** | No | Tooltips + tours | ❌ Alto |
| **Onboarding analytics** | Básico (audit log) | Full funnel tracking | ⚠️ Medio |

### 3.2 Benchmark vs Competidores CRM

| Feature | HubSpot | Pipedrive | Salesforce | Zuclubit |
|---------|---------|-----------|------------|----------|
| SSO Login | ✅ | ✅ | ✅ | ❌ |
| Email verification | ✅ | ✅ | ✅ | ❌ |
| Logo upload | ✅ | ✅ | ✅ | ❌ |
| Data import wizard | ✅ | ✅ | ✅ | ❌ |
| Interactive tour | ✅ | ✅ | ✅ | ❌ |
| Role-based onboarding | ✅ | ⚠️ | ✅ | ❌ |
| Mobile onboarding | ✅ | ✅ | ⚠️ | ⚠️ |
| Integrations setup | ✅ | ✅ | ✅ | ❌ |
| Sample data option | ✅ | ✅ | ✅ | ❌ |
| Onboarding checklist | ✅ | ✅ | ✅ | ⚠️ |

---

## 4. Gaps Críticos Identificados

### 4.1 Gaps de Seguridad y Compliance

| Gap | Riesgo | Prioridad |
|-----|--------|-----------|
| Sin verificación de email | Cuentas fraudulentas, emails inválidos | **P0** |
| Sin aceptación de términos | Riesgo legal | **P0** |
| Sin captcha | Bot attacks, spam | **P1** |
| Sin rate limiting en signup | DDoS vulnerability | **P1** |
| Sin audit de aceptación T&C | Compliance | **P1** |

### 4.2 Gaps de Datos del Negocio

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| Sin logo upload | Branding incompleto | **P0** |
| Sin moneda preferida | Módulos financieros rotos | **P0** |
| Sin dirección completa | Facturación imposible | **P1** |
| Sin objetivo del CRM | Personalización limitada | **P1** |
| Países limitados (7) | Mercados perdidos | **P2** |

### 4.3 Gaps de UX/UI

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| Sin tour interactivo | Alto abandono post-onboarding | **P0** |
| Sin SSO | Fricción en registro | **P1** |
| Sin save & resume persistente | Pérdida de progreso | **P1** |
| Sin importación de datos | Setup manual tedioso | **P1** |
| Sin sample data | Curva de aprendizaje alta | **P2** |

### 4.4 Gaps de Funcionalidad

| Gap | Impacto | Prioridad |
|-----|---------|-----------|
| Sin workflow de verificación | Emails bounceados | **P0** |
| Sin flujos personalizados por rol | UX genérica | **P1** |
| Sin integrations wizard | Setup manual de integraciones | **P2** |
| Sin onboarding metrics | No hay datos de optimización | **P2** |

---

## 5. Propuesta de Nuevo Flujo de Onboarding

### 5.1 Flujo Propuesto (Optimizado)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     NUEVO FLUJO DE ONBOARDING PROPUESTO                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                  │
│  ╔══════════════════════════════════════════════════════════════════════════╗   │
│  ║                         FASE 1: REGISTRO                                  ║   │
│  ╠══════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                           ║   │
│  ║  ┌─────────────┐    ┌─────────────────┐    ┌────────────────────────┐   ║   │
│  ║  │   Signup    │───▶│ Email Verify    │───▶│ Terms & Privacy Accept │   ║   │
│  ║  │  + SSO      │    │  (OTP/Link)     │    │      + Captcha         │   ║   │
│  ║  └─────────────┘    └─────────────────┘    └────────────────────────┘   ║   │
│  ║                                                                           ║   │
│  ╚══════════════════════════════════════════════════════════════════════════╝   │
│                                      │                                           │
│                                      ▼                                           │
│  ╔══════════════════════════════════════════════════════════════════════════╗   │
│  ║                    FASE 2: PERFIL DE NEGOCIO                             ║   │
│  ╠══════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                           ║   │
│  ║  ┌─────────────────┐    ┌─────────────────────────────────────────────┐  ║   │
│  ║  │ Business Info   │───▶│           Business Details                   │  ║   │
│  ║  │ • Name          │    │ • Full Address                               │  ║   │
│  ║  │ • Type          │    │ • Tax/Fiscal Info                            │  ║   │
│  ║  │ • Size          │    │ • Contact Info                               │  ║   │
│  ║  │ • Goal/Use Case │    │ • Logo Upload                                │  ║   │
│  ║  └─────────────────┘    └─────────────────────────────────────────────┘  ║   │
│  ║                                                                           ║   │
│  ╚══════════════════════════════════════════════════════════════════════════╝   │
│                                      │                                           │
│                                      ▼                                           │
│  ╔══════════════════════════════════════════════════════════════════════════╗   │
│  ║                    FASE 3: PERSONALIZACIÓN                               ║   │
│  ╠══════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                           ║   │
│  ║  ┌─────────────────┐    ┌──────────────┐    ┌─────────────────────────┐  ║   │
│  ║  │ Modules Select  │───▶│   Branding   │───▶│   Business Hours        │  ║   │
│  ║  │ (Smart Defaults)│    │  + Logo      │    │   + Holidays            │  ║   │
│  ║  │ (Dependencies)  │    │  + Colors    │    │   + Multi-schedule      │  ║   │
│  ║  └─────────────────┘    └──────────────┘    └─────────────────────────┘  ║   │
│  ║                                                                           ║   │
│  ╚══════════════════════════════════════════════════════════════════════════╝   │
│                                      │                                           │
│                                      ▼                                           │
│  ╔══════════════════════════════════════════════════════════════════════════╗   │
│  ║                      FASE 4: EQUIPO Y DATOS                              ║   │
│  ╠══════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                           ║   │
│  ║  ┌─────────────────┐    ┌──────────────────────────────────────────────┐ ║   │
│  ║  │ Invite Team     │───▶│          Data Import (Optional)              │ ║   │
│  ║  │ • Bulk import   │    │ • CSV upload                                 │ ║   │
│  ║  │ • Custom msg    │    │ • Google Contacts                            │ ║   │
│  ║  │ • Role assign   │    │ • Sample data option                         │ ║   │
│  ║  └─────────────────┘    └──────────────────────────────────────────────┘ ║   │
│  ║                                                                           ║   │
│  ╚══════════════════════════════════════════════════════════════════════════╝   │
│                                      │                                           │
│                                      ▼                                           │
│  ╔══════════════════════════════════════════════════════════════════════════╗   │
│  ║                       FASE 5: ACTIVACIÓN                                 ║   │
│  ╠══════════════════════════════════════════════════════════════════════════╣   │
│  ║                                                                           ║   │
│  ║  ┌─────────────────────────────────────────────────────────────────────┐ ║   │
│  ║  │                    Completion & Activation                          │ ║   │
│  ║  │ • Interactive product tour                                          │ ║   │
│  ║  │ • Personalized checklist based on goals                            │ ║   │
│  ║  │ • Quick wins (create first lead, schedule task)                    │ ║   │
│  ║  │ • Help resources & support booking                                 │ ║   │
│  ║  └─────────────────────────────────────────────────────────────────────┘ ║   │
│  ║                                                                           ║   │
│  ╚══════════════════════════════════════════════════════════════════════════╝   │
│                                                                                  │
└─────────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 Campos Completos Propuestos

#### Fase 1: Registro

```typescript
interface SignupData {
  // Información Personal
  firstName: string;           // Requerido, 2-50 chars
  lastName: string;            // Requerido, 2-50 chars
  email: string;               // Requerido, formato válido
  password: string;            // Requerido, política de seguridad

  // Verificación
  emailVerificationCode: string;  // OTP de 6 dígitos
  emailVerified: boolean;

  // Consentimientos (OBLIGATORIOS)
  acceptedTermsAt: Date;
  acceptedPrivacyAt: Date;
  marketingConsent: boolean;      // Opcional

  // Seguridad
  captchaToken: string;

  // Analytics
  acquisitionSource?: string;     // utm_source, referral, etc.
  referralCode?: string;
}
```

#### Fase 2: Perfil de Negocio

```typescript
interface BusinessProfileData {
  // Información Básica (REQUERIDO)
  businessName: string;           // 2-100 chars
  businessType: BusinessType;     // Enum extendido
  businessSize: BusinessSize;     // Enum
  primaryGoal: CRMGoal;           // NUEVO: Qué quiere lograr

  // Ubicación (REQUERIDO)
  country: CountryCode;           // Extender a 20+ países
  state: string;                  // NUEVO
  city: string;
  postalCode: string;             // NUEVO
  fullAddress: string;            // NUEVO
  timezone: string;

  // Contacto (REQUERIDO)
  phone: string;                  // Validación por país
  businessEmail: string;

  // Configuración Regional (REQUERIDO)
  preferredCurrency: Currency;    // NUEVO
  preferredLanguage: Language;    // NUEVO
  dateFormat: DateFormat;         // NUEVO

  // Información Fiscal (CONDICIONAL por país)
  legalName?: string;
  taxId?: string;                 // RFC, CUIT, NIT, etc.
  taxIdType?: TaxIdType;          // NUEVO

  // Digital (OPCIONAL)
  website?: string;
  industry?: string;

  // Branding (MOVIDO DE PASO 3)
  logo?: File;                    // NUEVO: Upload de logo
}
```

#### Fase 3: Personalización

```typescript
interface PersonalizationData {
  // Módulos
  enabledModules: CRMModule[];

  // Branding
  primaryColor: string;
  secondaryColor: string;
  logoUrl?: string;               // Después de upload

  // Horarios
  businessHours: EnhancedBusinessHours;
  holidays?: Holiday[];           // NUEVO

  // Preferencias
  defaultPipeline?: PipelineTemplate;
  emailSignatureTemplate?: string;
}

interface EnhancedBusinessHours {
  timezone: string;
  schedule: DaySchedule[];
}

interface DaySchedule {
  day: DayOfWeek;
  enabled: boolean;
  slots: TimeSlot[];              // NUEVO: Múltiples horarios por día
}

interface TimeSlot {
  open: string;   // HH:MM
  close: string;  // HH:MM
}
```

#### Fase 4: Equipo y Datos

```typescript
interface TeamAndDataSetup {
  // Invitaciones
  invitations: TeamInvitation[];

  // Importación de datos
  dataImportOption: 'skip' | 'csv' | 'google' | 'sample';
  importedData?: {
    contacts?: number;
    companies?: number;
    deals?: number;
  };
}

interface TeamInvitation {
  email: string;
  role: UserRole;
  customMessage?: string;         // NUEVO
  department?: string;            // NUEVO
}
```

### 5.3 Tipos de Negocio Extendidos

```typescript
enum BusinessType {
  // Servicios Profesionales
  DENTAL = 'dental',
  MEDICAL = 'medical',
  LEGAL = 'legal',
  ACCOUNTING = 'accounting',
  CONSULTING = 'consulting',

  // Comercio
  RETAIL = 'retail',
  ECOMMERCE = 'ecommerce',
  WHOLESALE = 'wholesale',

  // Servicios
  AUTOMOTIVE = 'automotive',
  REAL_ESTATE = 'real_estate',
  INSURANCE = 'insurance',
  FINANCIAL_SERVICES = 'financial_services',

  // Tecnología
  SOFTWARE = 'software',
  IT_SERVICES = 'it_services',
  SAAS = 'saas',

  // Industria
  MANUFACTURING = 'manufacturing',
  CONSTRUCTION = 'construction',

  // Otros
  EDUCATION = 'education',
  NONPROFIT = 'nonprofit',
  HOSPITALITY = 'hospitality',
  FITNESS = 'fitness',
  BEAUTY = 'beauty',
  OTHER = 'other'
}
```

### 5.4 Objetivos del CRM (NUEVO)

```typescript
enum CRMGoal {
  LEAD_MANAGEMENT = 'lead_management',       // Gestionar prospectos
  SALES_PIPELINE = 'sales_pipeline',         // Seguimiento de ventas
  CUSTOMER_SERVICE = 'customer_service',     // Atención al cliente
  MARKETING_AUTOMATION = 'marketing_automation', // Automatizar marketing
  TEAM_COLLABORATION = 'team_collaboration', // Colaboración de equipo
  REPORTING_ANALYTICS = 'reporting_analytics', // Reportes y análisis
  ALL_IN_ONE = 'all_in_one'                  // Todo lo anterior
}
```

### 5.5 Países Soportados (Expandido)

```typescript
enum CountryCode {
  // América del Norte
  US = 'US',
  CA = 'CA',
  MX = 'MX',

  // América Central
  GT = 'GT',  // Guatemala
  SV = 'SV',  // El Salvador
  HN = 'HN',  // Honduras
  NI = 'NI',  // Nicaragua
  CR = 'CR',  // Costa Rica
  PA = 'PA',  // Panamá

  // Caribe
  DO = 'DO',  // República Dominicana
  PR = 'PR',  // Puerto Rico

  // América del Sur
  CO = 'CO',
  VE = 'VE',
  EC = 'EC',
  PE = 'PE',
  BO = 'BO',
  CL = 'CL',
  AR = 'AR',
  UY = 'UY',
  PY = 'PY',
  BR = 'BR',

  // Europa (principales)
  ES = 'ES',
  PT = 'PT'
}
```

---

## 6. Validaciones y Casos de Uso

### 6.1 Validaciones por Campo

#### Email
```typescript
const emailValidation = z.string()
  .email('Formato de email inválido')
  .max(255, 'Email demasiado largo')
  .refine(
    async (email) => await checkEmailNotDisposable(email),
    'No se permiten emails temporales'
  )
  .refine(
    async (email) => await checkEmailNotAlreadyRegistered(email),
    'Este email ya está registrado'
  );
```

#### Contraseña
```typescript
const passwordValidation = z.string()
  .min(8, 'Mínimo 8 caracteres')
  .max(128, 'Máximo 128 caracteres')
  .regex(/[a-z]/, 'Debe contener al menos una minúscula')
  .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
  .regex(/\d/, 'Debe contener al menos un número')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Debe contener al menos un carácter especial')
  .refine(
    (pwd) => !commonPasswords.includes(pwd.toLowerCase()),
    'Contraseña demasiado común'
  );
```

#### Teléfono por País
```typescript
const phoneValidationByCountry = {
  MX: z.string().regex(/^\+52[1-9]\d{9}$/, 'Formato: +52 seguido de 10 dígitos'),
  US: z.string().regex(/^\+1[2-9]\d{9}$/, 'Formato: +1 seguido de 10 dígitos'),
  CO: z.string().regex(/^\+57[1-9]\d{9}$/, 'Formato: +57 seguido de 10 dígitos'),
  AR: z.string().regex(/^\+54[1-9]\d{9,10}$/, 'Formato: +54 seguido de 10-11 dígitos'),
  BR: z.string().regex(/^\+55[1-9]\d{10}$/, 'Formato: +55 seguido de 11 dígitos'),
  CL: z.string().regex(/^\+56[2-9]\d{8}$/, 'Formato: +56 seguido de 9 dígitos'),
  PE: z.string().regex(/^\+51[1-9]\d{8}$/, 'Formato: +51 seguido de 9 dígitos'),
};
```

#### Tax ID por País
```typescript
const taxIdValidationByCountry = {
  MX: z.string().regex(/^[A-Z&Ñ]{3,4}\d{6}[A-Z0-9]{3}$/, 'RFC inválido'),
  AR: z.string().regex(/^\d{2}-\d{8}-\d{1}$/, 'CUIT inválido'),
  CO: z.string().regex(/^\d{9,10}(-\d)?$/, 'NIT inválido'),
  CL: z.string().regex(/^\d{1,2}\.\d{3}\.\d{3}-[\dkK]$/, 'RUT inválido'),
  BR: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, 'CNPJ inválido'),
  PE: z.string().regex(/^\d{11}$/, 'RUC inválido'),
};
```

### 6.2 Casos de Uso Principales

#### CU-001: Registro con Verificación de Email

```
Precondiciones: Usuario no registrado
Actor: Usuario nuevo
Flujo Principal:
1. Usuario ingresa datos de registro
2. Sistema valida formato de datos
3. Sistema envía OTP al email
4. Usuario ingresa OTP
5. Sistema verifica OTP
6. Sistema muestra términos y condiciones
7. Usuario acepta términos
8. Sistema crea cuenta
Postcondiciones: Usuario registrado y verificado

Flujo Alternativo 3a: Email ya registrado
- Sistema muestra error y opción de recuperar contraseña

Flujo Alternativo 5a: OTP inválido/expirado
- Sistema permite reenviar OTP (máx 3 intentos)
- Después de 3 intentos, cooldown de 15 minutos
```

#### CU-002: Creación de Negocio con Validación Fiscal

```
Precondiciones: Usuario autenticado sin tenant
Actor: Usuario verificado
Flujo Principal:
1. Usuario selecciona país
2. Sistema carga configuración regional (moneda, timezone, formato fecha)
3. Usuario ingresa información del negocio
4. Sistema valida campos según país
5. Usuario sube logo
6. Sistema procesa y almacena logo
7. Sistema crea tenant
Postcondiciones: Tenant creado con configuración regional

Flujo Alternativo 4a: Tax ID inválido
- Sistema muestra validación específica del país
- Sistema ofrece ayuda contextual sobre formato

Flujo Alternativo 5a: Logo muy grande
- Sistema redimensiona automáticamente
- Sistema muestra preview
```

#### CU-003: Configuración de Módulos con Dependencias

```
Precondiciones: Tenant creado
Actor: Owner del tenant
Flujo Principal:
1. Sistema muestra módulos con defaults según tipo de negocio
2. Sistema indica cuáles fueron auto-seleccionados
3. Usuario modifica selección
4. Sistema valida dependencias
5. Sistema guarda configuración
Postcondiciones: Módulos habilitados

Flujo Alternativo 4a: Dependencia no satisfecha
- Sistema muestra advertencia: "Invoicing requiere Products"
- Sistema ofrece habilitar módulo dependiente
```

#### CU-004: Invitación de Equipo con Mensaje Personalizado

```
Precondiciones: Configuración completada
Actor: Owner/Admin del tenant
Flujo Principal:
1. Usuario agrega emails de equipo
2. Usuario selecciona rol para cada uno
3. Usuario personaliza mensaje de invitación
4. Sistema valida emails (no duplicados, formato válido)
5. Sistema envía invitaciones
6. Sistema muestra resumen (enviados/fallidos)
Postcondiciones: Invitaciones enviadas

Flujo Alternativo 5a: Email bounce
- Sistema marca como fallido
- Sistema ofrece reintentar o corregir email
```

### 6.3 Reglas de Negocio

```typescript
const businessRules = {
  // Registro
  signup: {
    maxSignupsPerIP: 5,           // Por hora
    otpExpirationMinutes: 15,
    maxOtpAttempts: 3,
    otpCooldownMinutes: 15,
  },

  // Negocio
  business: {
    logoMaxSizeMB: 5,
    logoAllowedFormats: ['jpg', 'jpeg', 'png', 'svg'],
    logoMaxDimensions: { width: 1024, height: 1024 },
    logoMinDimensions: { width: 100, height: 100 },
  },

  // Equipo
  team: {
    maxInvitationsPerOnboarding: 50,
    invitationExpirationDays: 7,
    maxInvitationResends: 3,
  },

  // Módulos
  modules: {
    dependencies: {
      invoicing: ['products'],
      marketing: ['leads', 'customers'],
      pipelines: ['opportunities'],
      reports: ['leads', 'customers'], // Al menos uno
    },
    minimumRequired: ['leads', 'customers'], // Siempre habilitados
  },
};
```

---

## 7. Plan de Implementación

### 7.1 Fase 1: Seguridad y Compliance (Semana 1-2)

| Tarea | Prioridad | Esfuerzo |
|-------|-----------|----------|
| Implementar verificación de email con OTP | P0 | 3 días |
| Agregar aceptación de términos con tracking | P0 | 1 día |
| Implementar captcha (reCAPTCHA v3) | P1 | 1 día |
| Rate limiting en endpoints de auth | P1 | 1 día |
| Audit log de consentimientos | P1 | 1 día |

### 7.2 Fase 2: Datos del Negocio (Semana 2-3)

| Tarea | Prioridad | Esfuerzo |
|-------|-----------|----------|
| Upload de logo con procesamiento | P0 | 2 días |
| Agregar moneda preferida | P0 | 1 día |
| Expandir países soportados | P1 | 2 días |
| Validaciones de Tax ID por país | P1 | 2 días |
| Campo de objetivo del CRM | P1 | 1 día |
| Dirección completa con autocompletado | P2 | 2 días |

### 7.3 Fase 3: UX Improvements (Semana 3-4)

| Tarea | Prioridad | Esfuerzo |
|-------|-----------|----------|
| SSO con Google | P1 | 2 días |
| Tour interactivo post-onboarding | P0 | 3 días |
| Checklist de próximos pasos | P1 | 1 día |
| Save & resume persistente en DB | P1 | 2 días |
| Importación de datos (CSV) | P2 | 3 días |

### 7.4 Fase 4: Refinamiento (Semana 4-5)

| Tarea | Prioridad | Esfuerzo |
|-------|-----------|----------|
| Dependencias entre módulos | P1 | 2 días |
| Horarios múltiples por día | P2 | 1 día |
| Mensaje personalizado en invitaciones | P2 | 1 día |
| Sample data option | P2 | 2 días |
| A/B testing framework | P3 | 3 días |

---

## 8. Métricas de Éxito

### 8.1 KPIs del Onboarding

| Métrica | Actual | Target | Medición |
|---------|--------|--------|----------|
| Completion Rate | ~60% | >85% | % usuarios que completan todos los pasos |
| Time to Complete | ~15 min | <7 min | Tiempo promedio de signup a complete |
| Drop-off por paso | No medido | <10% | % abandono en cada paso |
| Activation Rate | No medido | >70% | % usuarios que crean primer lead en 24h |
| Day 1 Retention | No medido | >80% | % usuarios que vuelven día siguiente |
| Email Verification Rate | 0% | >95% | % emails verificados |

### 8.2 Eventos de Analytics a Trackear

```typescript
const onboardingEvents = {
  // Funnel
  'onboarding_started': { step: 1 },
  'onboarding_step_completed': { step, duration },
  'onboarding_step_skipped': { step },
  'onboarding_completed': { totalDuration, stepsCompleted },
  'onboarding_abandoned': { step, duration },

  // Engagement
  'email_verification_sent': {},
  'email_verification_completed': { attempts },
  'logo_uploaded': { fileSize, format },
  'module_toggled': { module, enabled },
  'team_invited': { count, roles },

  // Errors
  'validation_error': { field, error },
  'api_error': { endpoint, statusCode },
};
```

---

## 9. Conclusiones

### 9.1 Resumen de Hallazgos

El proceso de onboarding actual de Zuclubit CRM tiene una base sólida con:
- ✅ Arquitectura bien estructurada (backend y frontend)
- ✅ Validaciones básicas implementadas
- ✅ Estado persistente en Zustand
- ✅ Progress bar funcional
- ✅ Audit logging básico

Sin embargo, presenta **gaps críticos** que afectan:
- **Seguridad**: Sin verificación de email ni aceptación de términos
- **Completitud de datos**: Sin logo, moneda, dirección completa
- **Experiencia de usuario**: Sin SSO, tour interactivo, ni personalización
- **Escalabilidad**: Países limitados, sin importación de datos

### 9.2 Prioridades Inmediatas

1. **P0 - Esta semana**: Verificación de email + Aceptación de términos
2. **P0 - Próxima semana**: Upload de logo + Moneda preferida
3. **P1 - Semana 3**: Tour interactivo post-onboarding
4. **P1 - Semana 4**: SSO con Google

### 9.3 ROI Esperado

| Mejora | Impacto Esperado |
|--------|------------------|
| Email verification | -50% cuentas fraudulentas |
| SSO | +30% conversion en signup |
| Tour interactivo | +40% Day 1 retention |
| Time-to-value reducido | +25% activation rate |
| Datos completos | -60% soporte por datos faltantes |

---

## Referencias

- [ProductLed - SaaS Onboarding Best Practices 2025](https://productled.com/blog/5-best-practices-for-better-saas-user-onboarding)
- [Pipedrive - CRM Onboarding Guide](https://www.pipedrive.com/en/blog/crm-onboarding)
- [HubSpot - Customer Onboarding Best Practices](https://blog.hubspot.com/service/customer-onboarding)
- [CRM.org - CRM Best Practices 2025](https://crm.org/crmland/crm-best-practices)
- [Cognito Forms - Intake Form Best Practices](https://www.cognitoforms.com/blog/644/intake-forms)
- [UserPilot - Best User Onboarding Experience](https://userpilot.com/blog/best-user-onboarding-experience/)

---

*Documento generado el 17 de Diciembre de 2025*
*Versión: 1.0*

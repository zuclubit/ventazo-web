# Especificación de Implementación - Módulo Kanban CRM
## Ventazo CRM - Documento Técnico Funcional

**Versión:** 1.0
**Fecha:** Diciembre 2025
**Basado en:** [UX_UI_KANBAN_CRM_GUIDE.md](./UX_UI_KANBAN_CRM_GUIDE.md)
**Autor:** Equipo de Producto Ventazo

---

## Tabla de Contenidos

1. [Especificación Funcional Detallada](#1-especificación-funcional-detallada)
2. [Arquitectura del Módulo Kanban](#2-arquitectura-del-módulo-kanban)
3. [UX/UI Implementation Blueprint](#3-uxui-implementation-blueprint)
4. [Flujos Funcionales del Sistema](#4-flujos-funcionales-del-sistema)
5. [Métricas y Telemetría UX](#5-métricas-y-telemetría-ux)
6. [Roadmap Técnico de Implementación](#6-roadmap-técnico-de-implementación)
7. [Checklist de Implementación](#7-checklist-de-implementación)
8. [Decisiones Técnicas y Trade-offs](#8-decisiones-técnicas-y-trade-offs)

---

# 1. Especificación Funcional Detallada

## 1.1 Estados por Entidad

### 1.1.1 LEADS - Máquina de Estados

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        LEAD STATE MACHINE                                        │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │    NUEVO     │ ◄─── Entry Point (creación)
                    │   status=new │
                    └──────┬───────┘
                           │
            ┌──────────────┼──────────────┐
            ▼              ▼              ▼
    ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │  CONTACTADO  │ │   PERDIDO    │ │ (Cualquier   │
    │status=contact│ │ status=lost  │ │    stage)    │
    └──────┬───────┘ └──────────────┘ └──────────────┘
           │
           ▼
    ┌──────────────┐
    │  INTERESADO  │
    │status=interest│
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  CALIFICADO  │
    │status=qualif │
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  PROPUESTA   │
    │status=proposal│
    └──────┬───────┘
           │
           ▼
    ┌──────────────┐
    │  CONVERTIDO  │ ───► Trigger: Crear Opportunity/Customer
    │ status=won   │
    └──────────────┘
```

**Definición de Estados:**

| Estado | Código | Score Range | Color | Descripción |
|--------|--------|-------------|-------|-------------|
| Nuevo | `new` | 0-30 | `slate-500` | Lead recién ingresado, sin contacto |
| Contactado | `contacted` | 31-50 | `blue-500` | Primer contacto realizado |
| Interesado | `interested` | 51-70 | `amber-500` | Muestra interés activo |
| Calificado | `qualified` | 71-85 | `orange-500` | Cumple criterios de calificación |
| Propuesta | `proposal` | 86-99 | `rose-500` | Propuesta enviada/en negociación |
| Convertido | `won` | 100 | `emerald-500` | Convertido a Oportunidad/Cliente |
| Perdido | `lost` | N/A | `gray-400` | Descartado (razón registrada) |

---

### 1.1.2 OPPORTUNITIES - Máquina de Estados

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     OPPORTUNITY STATE MACHINE                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │  DISCOVERY   │ ◄─── Entry Point (desde Lead o manual)
                    │  prob=10%    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │  QUALIFIED   │
                    │  prob=30%    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │   PROPOSAL   │
                    │  prob=50%    │
                    └──────┬───────┘
                           │
                           ▼
                    ┌──────────────┐
                    │ NEGOTIATION  │
                    │  prob=70%    │
                    └──────┬───────┘
                           │
            ┌──────────────┴──────────────┐
            ▼                             ▼
    ┌──────────────┐              ┌──────────────┐
    │     WON      │              │     LOST     │
    │  prob=100%   │              │   prob=0%    │
    │  (TERMINAL)  │              │  (TERMINAL)  │
    └──────────────┘              └──────────────┘
            │
            ▼
    Trigger: Crear Customer automáticamente
```

**Definición de Estados:**

| Estado | Código | Probabilidad | Color | Forecast |
|--------|--------|--------------|-------|----------|
| Discovery | `discovery` | 10% | `indigo-500` | valor × 0.10 |
| Qualified | `qualified` | 30% | `cyan-500` | valor × 0.30 |
| Proposal | `proposal` | 50% | `violet-500` | valor × 0.50 |
| Negotiation | `negotiation` | 70% | `fuchsia-500` | valor × 0.70 |
| Won | `won` | 100% | `emerald-500` | valor real |
| Lost | `lost` | 0% | `red-500` | $0 |

---

### 1.1.3 CUSTOMERS - Máquina de Estados

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      CUSTOMER STATE MACHINE                                      │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │  ONBOARDING  │ ◄─── Entry Point (desde Opportunity WON)
                    │ health=null  │
                    └──────┬───────┘
                           │ (checklist 100%)
                           ▼
                    ┌──────────────┐
              ┌────►│    ACTIVO    │◄────┐
              │     │ health=70+   │     │
              │     └──────┬───────┘     │
              │            │             │
              │  ┌─────────┼─────────┐   │
              │  ▼         ▼         ▼   │
      ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
      │  CRECIENDO   │ │  EN RIESGO   │ │  RENOVACIÓN  │
      │  NRR > 100%  │ │ health < 40  │ │ renewal_days │
      └──────┬───────┘ └──────┬───────┘ └──────┬───────┘
             │                │                │
             │                │                │
             └────────────────┼────────────────┘
                              │
                              ▼
                    ┌──────────────┐
                    │   CHURNED    │
                    │  (TERMINAL)  │
                    └──────────────┘
```

**Definición de Estados:**

| Estado | Código | Health Range | Color | Métrica Clave |
|--------|--------|--------------|-------|---------------|
| Onboarding | `onboarding` | N/A | `yellow-500` | % checklist completado |
| Activo | `active` | 70-100 | `green-500` | MRR |
| Creciendo | `growing` | 70-100 | `teal-500` | NRR potential |
| En Riesgo | `at_risk` | 0-39 | `orange-500` | Churn risk score |
| Renovación | `renewal` | Variable | `amber-500` | Days to renewal |
| Churned | `churned` | N/A | `gray-500` | Recovery rate |

---

## 1.2 Reglas de Transición (Drag & Drop)

### 1.2.1 Matriz de Transiciones LEADS

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    MATRIZ DE TRANSICIONES - LEADS                                │
│                                                                                  │
│  FROM ↓  TO →  │ new │ contacted │ interested │ qualified │ proposal │ won │ lost │
│────────────────┼─────┼───────────┼────────────┼───────────┼──────────┼─────┼──────│
│  new           │  -  │    ✅     │     ✅     │    ⚠️     │    ⚠️    │ 🔒  │  📝  │
│  contacted     │ ⚠️  │     -     │     ✅     │    ✅     │    ⚠️    │ 🔒  │  📝  │
│  interested    │ ⚠️  │    ⚠️     │      -     │    ✅     │    ✅    │ 🔒  │  📝  │
│  qualified     │ ⚠️  │    ⚠️     │     ⚠️     │     -     │    ✅    │ 📝  │  📝  │
│  proposal      │ ⚠️  │    ⚠️     │     ⚠️     │    ⚠️     │     -    │ 📝  │  📝  │
│  won           │ 🔒  │    🔒     │     🔒     │    🔒     │    🔒    │  -  │  🔒  │
│  lost          │ ✅  │    ✅     │     ✅     │    ✅     │    ✅    │ 🔒  │   -  │
│                                                                                  │
│  LEYENDA:                                                                        │
│  ✅ = Permitido sin restricción                                                  │
│  ⚠️ = Warning + Confirmación requerida                                          │
│  📝 = Requiere datos adicionales (modal)                                         │
│  🔒 = Bloqueado (no permitido)                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Reglas Detalladas:**

```typescript
interface TransitionRule {
  from: LeadStatus;
  to: LeadStatus;
  type: 'allowed' | 'warning' | 'requires_data' | 'blocked';
  condition?: (lead: Lead) => boolean;
  requiredFields?: string[];
  warningMessage?: string;
  blockedReason?: string;
}

const LEAD_TRANSITION_RULES: TransitionRule[] = [
  // Cualquiera → Won: Requiere score >= 70
  {
    from: '*',
    to: 'won',
    type: 'requires_data',
    condition: (lead) => lead.score >= 70,
    requiredFields: ['conversion_notes'],
    blockedReason: 'Score debe ser >= 70 para convertir'
  },

  // Cualquiera → Lost: Requiere razón
  {
    from: '*',
    to: 'lost',
    type: 'requires_data',
    requiredFields: ['loss_reason', 'loss_notes']
  },

  // Retroceso: Warning
  {
    from: ['contacted', 'interested', 'qualified', 'proposal'],
    to: 'new',
    type: 'warning',
    warningMessage: '¿Regresar a Nuevo? Se marcará como reinicio de proceso.'
  },

  // Won → Cualquiera: Bloqueado
  {
    from: 'won',
    to: '*',
    type: 'blocked',
    blockedReason: 'Leads convertidos no pueden cambiar de estado'
  },

  // Lost → Cualquiera (excepto Won): Permitido (reactivación)
  {
    from: 'lost',
    to: ['new', 'contacted', 'interested', 'qualified', 'proposal'],
    type: 'allowed'
  }
];
```

---

### 1.2.2 Matriz de Transiciones OPPORTUNITIES

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                 MATRIZ DE TRANSICIONES - OPPORTUNITIES                           │
│                                                                                  │
│  FROM ↓  TO →  │ discovery │ qualified │ proposal │ negotiation │ won │ lost   │
│────────────────┼───────────┼───────────┼──────────┼─────────────┼─────┼────────│
│  discovery     │     -     │    ✅     │    ⚠️    │     ⚠️      │ ⚠️  │   📝   │
│  qualified     │    ⚠️     │     -     │    ✅    │     ⚠️      │ ⚠️  │   📝   │
│  proposal      │    ⚠️     │    ⚠️     │     -    │     ✅      │ 📝  │   📝   │
│  negotiation   │    ⚠️     │    ⚠️     │    ⚠️    │      -      │ 📝  │   📝   │
│  won           │    🔒     │    🔒     │    🔒    │     🔒      │  -  │   🔒   │
│  lost          │    🔒     │    🔒     │    🔒    │     🔒      │ 🔒  │    -   │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Datos Requeridos por Transición:**

| Transición | Campos Requeridos | Modal |
|------------|-------------------|-------|
| * → Won | `final_value`, `closed_date`, `won_reason` | WonOpportunityModal |
| * → Lost | `loss_reason`, `competitor`, `lessons_learned` | LostOpportunityModal |
| Proposal → Negotiation | `proposal_document` (verificar existencia) | N/A |
| Skip stages (saltar > 1) | Confirmación | SkipStageWarningModal |

---

### 1.2.3 Matriz de Transiciones CUSTOMERS

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  MATRIZ DE TRANSICIONES - CUSTOMERS                              │
│                                                                                  │
│  FROM ↓  TO →  │ onboarding │ active │ growing │ at_risk │ renewal │ churned   │
│────────────────┼────────────┼────────┼─────────┼─────────┼─────────┼───────────│
│  onboarding    │      -     │   📝   │   🔒    │   ⚠️    │   🔒    │    📝     │
│  active        │     🔒     │    -   │   ✅    │   ⚠️    │  AUTO   │    📝     │
│  growing       │     🔒     │   ✅   │    -    │   ⚠️    │  AUTO   │    📝     │
│  at_risk       │     🔒     │   ✅   │   ✅    │    -    │  AUTO   │    📝     │
│  renewal       │     🔒     │   ✅   │   ✅    │   ⚠️    │    -    │    📝     │
│  churned       │     🔒     │   📝   │   🔒    │   🔒    │   🔒    │     -     │
│                                                                                  │
│  AUTO = Transición automática basada en reglas de negocio                       │
└─────────────────────────────────────────────────────────────────────────────────┘
```

**Condiciones Especiales:**

```typescript
const CUSTOMER_SPECIAL_CONDITIONS = {
  // Onboarding → Active: Requiere checklist 100%
  'onboarding→active': {
    condition: (customer) => customer.onboarding_progress === 100,
    blockedMessage: 'Complete el checklist de onboarding primero'
  },

  // * → Churned: Requiere aprobación de manager
  '*→churned': {
    requiresApproval: true,
    approverRole: 'manager',
    requiredFields: ['churn_reason', 'exit_interview_notes']
  },

  // Churned → Active: Requiere nuevo contrato
  'churned→active': {
    requiredFields: ['new_contract_id', 'reactivation_date'],
    trigger: 'createWinbackOpportunity'
  }
};
```

---

## 1.3 WIP Limits

### 1.3.1 Configuración de Límites

```typescript
interface WIPLimitConfig {
  entity: 'lead' | 'opportunity' | 'customer';
  stage: string;
  softLimit: number;      // Warning
  hardLimit: number;      // Block (con override)
  scope: 'user' | 'team' | 'tenant';
  overrideRoles: string[]; // Roles que pueden hacer override
}

const WIP_LIMITS: WIPLimitConfig[] = [
  // LEADS
  { entity: 'lead', stage: 'new', softLimit: 40, hardLimit: 50, scope: 'user', overrideRoles: ['admin', 'manager'] },
  { entity: 'lead', stage: 'contacted', softLimit: 25, hardLimit: 30, scope: 'user', overrideRoles: ['admin', 'manager'] },
  { entity: 'lead', stage: 'qualified', softLimit: 15, hardLimit: 20, scope: 'user', overrideRoles: ['admin', 'manager'] },

  // OPPORTUNITIES
  { entity: 'opportunity', stage: 'proposal', softLimit: 12, hardLimit: 15, scope: 'user', overrideRoles: ['admin', 'manager'] },
  { entity: 'opportunity', stage: 'negotiation', softLimit: 8, hardLimit: 10, scope: 'user', overrideRoles: ['admin', 'manager'] },

  // CUSTOMERS
  { entity: 'customer', stage: 'onboarding', softLimit: 8, hardLimit: 10, scope: 'user', overrideRoles: ['admin', 'cs_manager'] },
  { entity: 'customer', stage: 'at_risk', softLimit: 4, hardLimit: 5, scope: 'user', overrideRoles: ['admin', 'cs_manager'] }
];
```

### 1.3.2 Comportamiento UI de WIP Limits

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    WIP LIMIT UI BEHAVIOR                                         │
└─────────────────────────────────────────────────────────────────────────────────┘

Estado Normal (count < softLimit):
┌─────────────────────────────┐
│  CONTACTADO (12)            │ ← Contador normal
│  ───────────────            │
│  [Tarjetas...]              │
└─────────────────────────────┘

Soft Limit Alcanzado (softLimit <= count < hardLimit):
┌─────────────────────────────┐
│  CONTACTADO (28/30) ⚠️      │ ← Contador amarillo + badge warning
│  ───────────────────        │
│  [Banner: "Acercándose      │
│   al límite. Priorice       │
│   conversiones."]           │
│  [Tarjetas...]              │
└─────────────────────────────┘

Hard Limit Alcanzado (count >= hardLimit):
┌─────────────────────────────┐
│  CONTACTADO (30/30) 🔴      │ ← Contador rojo + badge blocked
│  ───────────────────        │
│  [Banner: "Límite           │
│   alcanzado. Convierta      │
│   o archive antes de        │
│   agregar más."]            │
│                             │
│  [Botón: Override ↗]        │ ← Solo visible para roles autorizados
│  [Tarjetas...]              │
└─────────────────────────────┘
```

---

## 1.4 Triggers Automáticos

### 1.4.1 Eventos y Acciones

```typescript
interface AutoTrigger {
  id: string;
  name: string;
  entity: 'lead' | 'opportunity' | 'customer';
  event: TriggerEvent;
  condition: (entity: any) => boolean;
  actions: TriggerAction[];
  priority: number; // Orden de ejecución
}

type TriggerEvent =
  | 'onCreate'
  | 'onStageChange'
  | 'onFieldUpdate'
  | 'onScoreChange'
  | 'onInactivity'
  | 'onDateThreshold';

type TriggerAction =
  | { type: 'updateField'; field: string; value: any }
  | { type: 'notify'; channels: string[]; template: string }
  | { type: 'createTask'; taskTemplate: string }
  | { type: 'moveToStage'; stage: string }
  | { type: 'createEntity'; entityType: string; data: any }
  | { type: 'sendEmail'; template: string }
  | { type: 'webhook'; url: string; payload: any }
  | { type: 'showModal'; modalType: string };
```

### 1.4.2 Triggers por Módulo

**LEADS:**

| ID | Evento | Condición | Acciones |
|----|--------|-----------|----------|
| `lead.auto_assign` | `onCreate` | Siempre | Asignar a vendedor (round-robin o por región) |
| `lead.score_update` | `onFieldUpdate` | Cualquier campo | Recalcular score |
| `lead.hot_alert` | `onScoreChange` | `score > 85` | Notificar owner + badge "HOT" |
| `lead.stale_alert` | `onInactivity` | 7 días sin actividad | Highlight + notificar owner |
| `lead.convert_suggest` | `onScoreChange` | `score === 100` | Modal "Convertir a Oportunidad" |
| `lead.duplicate_warn` | `onCreate` | Email/teléfono existe | Warning modal |

**OPPORTUNITIES:**

| ID | Evento | Condición | Acciones |
|----|--------|-----------|----------|
| `opp.probability_set` | `onStageChange` | Siempre | Actualizar probabilidad según stage |
| `opp.forecast_update` | `onFieldUpdate` | Cambio valor/prob | Recalcular forecast |
| `opp.stale_alert` | `onInactivity` | 14 días sin movimiento | Highlight amarillo + notificar |
| `opp.close_warning` | `onDateThreshold` | 7 días para cierre | Badge "Urgente" |
| `opp.win_celebrate` | `onStageChange` | `stage === 'won'` | Confetti + notificar equipo |
| `opp.loss_analysis` | `onStageChange` | `stage === 'lost'` | Modal obligatorio razón |
| `opp.create_customer` | `onStageChange` | `stage === 'won'` confirmed | Crear Customer automáticamente |

**CUSTOMERS:**

| ID | Evento | Condición | Acciones |
|----|--------|-----------|----------|
| `cust.health_update` | `onFieldUpdate` | Actividad/inactividad | Recalcular health score |
| `cust.at_risk_alert` | `onScoreChange` | `health < 40` | Mover a "En Riesgo" + notificar AM |
| `cust.renewal_90` | `onDateThreshold` | 90 días antes | Mover a "Renovación" + notificar |
| `cust.renewal_60` | `onDateThreshold` | 60 días antes | Crear tarea urgente |
| `cust.renewal_30` | `onDateThreshold` | 30 días antes | Escalar a manager |
| `cust.upsell_trigger` | `onFieldUpdate` | `usage > 80%` | Badge "Upsell" + sugerir |
| `cust.nps_trigger` | `onDateThreshold` | 90 días desde último NPS | Enviar encuesta |

---

## 1.5 Validaciones UX

### 1.5.1 Feedback Visual por Acción

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        FEEDBACK VISUAL MATRIX                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────┬─────────────────────┬────────────────────────────────────────┐
│ ACCIÓN          │ FEEDBACK INMEDIATO  │ FEEDBACK CONFIRMACIÓN                  │
├─────────────────┼─────────────────────┼────────────────────────────────────────┤
│ Drag Start      │ • Card scale(1.02)  │ N/A                                    │
│                 │ • Shadow elevación  │                                        │
│                 │ • Opacity 0.9       │                                        │
│                 │ • Cursor: grabbing  │                                        │
├─────────────────┼─────────────────────┼────────────────────────────────────────┤
│ Drag Over       │ • Column highlight  │ N/A                                    │
│ (válido)        │ • Ring verde        │                                        │
│                 │ • Placeholder slot  │                                        │
├─────────────────┼─────────────────────┼────────────────────────────────────────┤
│ Drag Over       │ • Ring rojo         │ N/A                                    │
│ (inválido)      │ • Shake animation   │                                        │
│                 │ • Cursor: not-allow │                                        │
├─────────────────┼─────────────────────┼────────────────────────────────────────┤
│ Drop Success    │ • Card slide-in     │ • Toast "Movido a [Stage]"            │
│                 │ • Sound (opcional)  │ • Undo link (5 segundos)               │
├─────────────────┼─────────────────────┼────────────────────────────────────────┤
│ Drop Cancel     │ • Card return anim  │ N/A                                    │
│ (Escape)        │ • Smooth transition │                                        │
├─────────────────┼─────────────────────┼────────────────────────────────────────┤
│ Drop Blocked    │ • Shake + ring rojo │ • Toast error "[Razón]"               │
│                 │ • Sound error (opt) │ • Permanece en posición original       │
├─────────────────┼─────────────────────┼────────────────────────────────────────┤
│ Modal Required  │ • Card en hold      │ • Modal con campos requeridos         │
│                 │ • Backdrop blur     │ • Cancel = volver a original           │
│                 │                     │ • Submit = completar movimiento        │
├─────────────────┼─────────────────────┼────────────────────────────────────────┤
│ WIP Limit       │ • Column badge rojo │ • Modal explicativo                    │
│ Exceeded        │ • Drop zone disabled│ • Opción override (si autorizado)      │
└─────────────────┴─────────────────────┴────────────────────────────────────────┘
```

### 1.5.2 Estados de Tarjeta

```typescript
interface CardVisualState {
  state: 'normal' | 'hover' | 'dragging' | 'over_valid' | 'over_invalid' |
         'loading' | 'stale' | 'overdue' | 'hot' | 'selected';
  styles: {
    background?: string;
    border?: string;
    shadow?: string;
    scale?: number;
    opacity?: number;
    animation?: string;
  };
}

const CARD_VISUAL_STATES: Record<string, CardVisualState> = {
  normal: {
    state: 'normal',
    styles: { background: 'bg-card', shadow: 'shadow-sm', scale: 1, opacity: 1 }
  },
  hover: {
    state: 'hover',
    styles: { shadow: 'shadow-md', scale: 1.01 }
  },
  dragging: {
    state: 'dragging',
    styles: { shadow: 'shadow-lg', scale: 1.02, opacity: 0.9 }
  },
  over_valid: {
    state: 'over_valid',
    styles: { border: 'ring-2 ring-emerald-500' }
  },
  over_invalid: {
    state: 'over_invalid',
    styles: { border: 'ring-2 ring-red-500', animation: 'shake 0.3s' }
  },
  loading: {
    state: 'loading',
    styles: { opacity: 0.7, animation: 'pulse 1.5s infinite' }
  },
  stale: {
    state: 'stale',
    styles: { border: 'border-l-4 border-l-amber-400', background: 'bg-amber-50/50' }
  },
  overdue: {
    state: 'overdue',
    styles: { border: 'border-l-4 border-l-red-400', background: 'bg-red-50/50' }
  },
  hot: {
    state: 'hot',
    styles: { border: 'border-l-4 border-l-rose-500', animation: 'pulse-subtle 2s infinite' }
  }
};
```

---

# 2. Arquitectura del Módulo Kanban

## 2.1 Diagrama de Arquitectura

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         ARQUITECTURA KANBAN MODULE                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌───────────────────────────────────────────────────────────────────────────────┐
│                              PRESENTATION LAYER                                │
├───────────────────────────────────────────────────────────────────────────────┤
│                                                                               │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         KanbanBoard (Container)                          │  │
│  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐        │  │
│  │  │ KanbanColumn│ │ KanbanColumn│ │ KanbanColumn│ │ KanbanColumn│        │  │
│  │  │  ┌────────┐ │ │  ┌────────┐ │ │  ┌────────┐ │ │  ┌────────┐ │        │  │
│  │  │  │ Card   │ │ │  │ Card   │ │ │  │ Card   │ │ │  │ Card   │ │        │  │
│  │  │  │ Card   │ │ │  │ Card   │ │ │  └────────┘ │ │  └────────┘ │        │  │
│  │  │  │ Card   │ │ │  └────────┘ │ │             │ │             │        │  │
│  │  │  └────────┘ │ │             │ │             │ │             │        │  │
│  │  └─────────────┘ └─────────────┘ └─────────────┘ └─────────────┘        │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                         │
│                                     ▼                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                         Shared Components                                │  │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐       │  │
│  │  │ Card     │ │ Column   │ │ Header   │ │ Actions  │ │ Modals   │       │  │
│  │  │ Variants │ │ Header   │ │ KPIs     │ │ Bar      │ │          │       │  │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘       │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                              STATE MANAGEMENT                                  │
├───────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                              Zustand Stores                              │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐                   │  │
│  │  │ LeadsStore   │  │ OppsStore    │  │ CustomersStore│                  │  │
│  │  │ • items[]    │  │ • items[]    │  │ • items[]    │                   │  │
│  │  │ • stages     │  │ • stages     │  │ • stages     │                   │  │
│  │  │ • filters    │  │ • filters    │  │ • filters    │                   │  │
│  │  │ • loading    │  │ • loading    │  │ • loading    │                   │  │
│  │  │ • actions    │  │ • actions    │  │ • actions    │                   │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘                   │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                     │                                         │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                            React Query                                   │  │
│  │  • Fetch / Mutations                                                     │  │
│  │  • Optimistic Updates                                                    │  │
│  │  • Cache Invalidation                                                    │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                               DOMAIN LAYER                                     │
├───────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                              Use Cases                                   │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │  │
│  │  │ MoveCardUseCase │  │ UpdateCardUseCase│  │ ValidateTransit │         │  │
│  │  │ • validate()    │  │ • execute()     │  │ • checkRules()  │          │  │
│  │  │ • execute()     │  │ • optimistic()  │  │ • getRequirements│         │  │
│  │  │ • rollback()    │  │ • rollback()    │  │                 │          │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                              Services                                    │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │  │
│  │  │ TransitionSvc   │  │ TriggerService  │  │ TelemetryService│          │  │
│  │  │ • validateMove  │  │ • evaluateRules │  │ • trackEvent    │          │  │
│  │  │ • getRequirements│ │ • executeActions│  │ • logMetric     │          │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────────────────┘
                                      │
                                      ▼
┌───────────────────────────────────────────────────────────────────────────────┐
│                             API / DATA LAYER                                   │
├───────────────────────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────────────────────────┐  │
│  │                              API Client                                  │  │
│  │  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐          │  │
│  │  │ /api/v1/leads   │  │ /api/v1/opps    │  │ /api/v1/customers│         │  │
│  │  │ GET, POST, PUT  │  │ GET, POST, PUT  │  │ GET, POST, PUT  │          │  │
│  │  │ PATCH, DELETE   │  │ PATCH, DELETE   │  │ PATCH, DELETE   │          │  │
│  │  └─────────────────┘  └─────────────────┘  └─────────────────┘          │  │
│  └─────────────────────────────────────────────────────────────────────────┘  │
│                                                                               │
│  Headers requeridos:                                                          │
│  • Authorization: Bearer {token}                                              │
│  • x-tenant-id: {tenant_id}                                                  │
│  • x-user-id: {user_id}                                                      │
└───────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Modelo de Datos

### 2.2.1 Entidades Base

```typescript
// ============== BASE INTERFACES ==============

interface BaseEntity {
  id: string;                    // UUID v4
  tenant_id: string;             // Multi-tenant
  created_at: string;            // ISO 8601
  updated_at: string;            // ISO 8601
  created_by: string;            // User ID
  updated_by: string;            // User ID
}

interface KanbanItem extends BaseEntity {
  status: string;                // Current stage
  position: number;              // Order within column
  assigned_to?: string;          // User ID
  tags?: string[];               // Tag IDs
}

// ============== LEAD ==============

interface Lead extends KanbanItem {
  // Identification
  company_name: string;
  contact_name?: string;
  email?: string;
  phone?: string;

  // Location
  city?: string;
  state?: string;
  country?: string;

  // Qualification
  score: number;                 // 0-100
  source?: string;               // web, referral, campaign, etc.
  industry?: string;
  estimated_value?: number;

  // Tracking
  status: LeadStatus;
  last_activity_at?: string;
  next_follow_up?: string;

  // Notes
  notes?: string;
  loss_reason?: string;
}

type LeadStatus = 'new' | 'contacted' | 'interested' | 'qualified' | 'proposal' | 'won' | 'lost';

// ============== OPPORTUNITY ==============

interface Opportunity extends KanbanItem {
  // Identification
  name: string;
  customer_id?: string;          // FK to Customer (if exists)
  lead_id?: string;              // FK to Lead (origin)

  // Value
  value: number;
  currency: string;              // ISO 4217
  probability: number;           // 0-100
  weighted_value: number;        // value × probability

  // Timeline
  stage: OpportunityStage;
  expected_close_date?: string;
  actual_close_date?: string;

  // Details
  products?: string[];           // Product IDs
  competitors?: string[];
  decision_maker?: string;

  // Outcome
  won_reason?: string;
  loss_reason?: string;
  competitor_won?: string;
}

type OpportunityStage = 'discovery' | 'qualified' | 'proposal' | 'negotiation' | 'won' | 'lost';

// ============== CUSTOMER ==============

interface Customer extends KanbanItem {
  // Identification
  company_name: string;
  primary_contact_id?: string;   // FK to Contact

  // Lifecycle
  lifecycle_stage: CustomerStage;
  health_score: number;          // 0-100
  tier?: 'enterprise' | 'pro' | 'starter';

  // Revenue
  mrr?: number;
  arr?: number;
  ltv?: number;

  // Dates
  contract_start_date?: string;
  contract_end_date?: string;
  next_renewal_date?: string;

  // Onboarding
  onboarding_progress?: number;  // 0-100
  onboarding_checklist?: OnboardingItem[];

  // Risk
  churn_risk_score?: number;
  last_nps_score?: number;
  last_nps_date?: string;
}

type CustomerStage = 'onboarding' | 'active' | 'growing' | 'at_risk' | 'renewal' | 'churned';

interface OnboardingItem {
  id: string;
  label: string;
  completed: boolean;
  completed_at?: string;
}
```

### 2.2.2 Configuración de Stages

```typescript
interface StageConfig {
  id: string;
  name: string;
  code: string;
  entity: 'lead' | 'opportunity' | 'customer';
  order: number;
  color: string;
  icon?: string;

  // Behavior
  isTerminal: boolean;           // No se puede salir (won, lost, churned)
  isInitial: boolean;            // Entry point
  autoScore?: number;            // Score/probability automático

  // WIP
  wipLimit?: number;
  wipScope?: 'user' | 'team' | 'tenant';

  // Requirements
  requiredFields?: string[];

  // Multi-tenant
  tenant_id: string;
  isDefault: boolean;            // Stage por defecto del sistema
  isCustom: boolean;             // Creado por el tenant
}
```

## 2.3 Eventos del Sistema

### 2.3.1 Event Bus

```typescript
// ============== KANBAN EVENTS ==============

type KanbanEvent =
  | DragStartEvent
  | DragMoveEvent
  | DragEndEvent
  | StageChangeEvent
  | CardUpdateEvent
  | WIPLimitEvent
  | TriggerExecutedEvent;

interface DragStartEvent {
  type: 'DRAG_START';
  payload: {
    cardId: string;
    cardType: 'lead' | 'opportunity' | 'customer';
    sourceStage: string;
    sourceIndex: number;
    timestamp: number;
  };
}

interface DragMoveEvent {
  type: 'DRAG_MOVE';
  payload: {
    cardId: string;
    currentStage: string | null;  // null = not over valid column
    isValidDrop: boolean;
    validationMessage?: string;
  };
}

interface DragEndEvent {
  type: 'DRAG_END';
  payload: {
    cardId: string;
    cardType: 'lead' | 'opportunity' | 'customer';
    sourceStage: string;
    targetStage: string;
    sourceIndex: number;
    targetIndex: number;
    success: boolean;
    reason?: string;
    duration: number;            // ms desde DRAG_START
  };
}

interface StageChangeEvent {
  type: 'STAGE_CHANGE';
  payload: {
    entityId: string;
    entityType: 'lead' | 'opportunity' | 'customer';
    previousStage: string;
    newStage: string;
    changedBy: string;
    additionalData?: Record<string, any>;
    triggeredActions?: string[];
  };
}

interface WIPLimitEvent {
  type: 'WIP_LIMIT_REACHED' | 'WIP_LIMIT_EXCEEDED' | 'WIP_LIMIT_OVERRIDE';
  payload: {
    stage: string;
    entityType: 'lead' | 'opportunity' | 'customer';
    currentCount: number;
    limit: number;
    userId?: string;
    overrideReason?: string;
  };
}
```

### 2.3.2 Event Handlers

```typescript
interface EventHandler<T extends KanbanEvent> {
  event: T['type'];
  handler: (event: T) => void | Promise<void>;
  priority: number;
}

// Ejemplo de registro de handlers
const eventHandlers: EventHandler<KanbanEvent>[] = [
  // Telemetría
  {
    event: 'DRAG_END',
    handler: (event) => telemetryService.trackDragOperation(event),
    priority: 1
  },

  // Triggers automáticos
  {
    event: 'STAGE_CHANGE',
    handler: (event) => triggerService.evaluateAndExecute(event),
    priority: 10
  },

  // UI Updates
  {
    event: 'WIP_LIMIT_EXCEEDED',
    handler: (event) => uiService.showWIPWarning(event),
    priority: 20
  }
];
```

## 2.4 Soporte Multi-tenant

```typescript
interface TenantConfig {
  id: string;
  name: string;

  // Stage customization
  customLeadStages?: StageConfig[];
  customOpportunityStages?: StageConfig[];
  customCustomerStages?: StageConfig[];

  // WIP limits override
  wipLimitsOverride?: WIPLimitConfig[];

  // Triggers override
  triggersOverride?: AutoTrigger[];

  // Feature flags
  features: {
    enableWIPLimits: boolean;
    enableAutoScoring: boolean;
    enableDuplicateCheck: boolean;
    enableHapticFeedback: boolean;
    enableCelebrationAnimations: boolean;
  };

  // Branding
  branding: {
    primaryColor: string;
    accentColor: string;
    logoUrl?: string;
  };
}

// Contexto de tenant en cada request
interface TenantContext {
  tenantId: string;
  userId: string;
  userRole: string;
  permissions: string[];
}
```

## 2.5 Extensibilidad Futura

```typescript
// ============== PLUGIN SYSTEM ==============

interface KanbanPlugin {
  id: string;
  name: string;
  version: string;

  // Hooks
  hooks: {
    onBeforeDrop?: (context: DropContext) => Promise<DropValidation>;
    onAfterDrop?: (context: DropContext) => Promise<void>;
    onCardRender?: (card: KanbanItem) => React.ReactNode;
    onStageRender?: (stage: StageConfig) => React.ReactNode;
  };

  // Custom actions
  cardActions?: CardAction[];
  bulkActions?: BulkAction[];

  // Triggers
  customTriggers?: AutoTrigger[];
}

// Ejemplo: Plugin de AI Scoring
const AIScorePlugin: KanbanPlugin = {
  id: 'ai-scoring',
  name: 'AI Lead Scoring',
  version: '1.0.0',

  hooks: {
    onAfterDrop: async (context) => {
      if (context.entityType === 'lead') {
        const newScore = await aiService.calculateScore(context.entityId);
        await leadsStore.updateScore(context.entityId, newScore);
      }
    },

    onCardRender: (card) => {
      if (card.aiConfidence) {
        return <AIScoreBadge confidence={card.aiConfidence} />;
      }
      return null;
    }
  },

  customTriggers: [
    {
      id: 'ai.score_prediction',
      name: 'AI Score Prediction',
      entity: 'lead',
      event: 'onCreate',
      condition: () => true,
      actions: [
        { type: 'webhook', url: '/api/ai/predict-score', payload: { entityId: '$id' } }
      ],
      priority: 5
    }
  ]
};
```

---

# 3. UX/UI Implementation Blueprint

## 3.1 Estructura de Componentes

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        COMPONENT TREE STRUCTURE                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

src/
├── components/
│   └── kanban/
│       │
│       ├── core/                          # Componentes base
│       │   ├── KanbanBoard.tsx            # Container principal
│       │   ├── KanbanColumn.tsx           # Columna genérica
│       │   ├── KanbanCard.tsx             # Tarjeta base
│       │   ├── KanbanHeader.tsx           # Header con KPIs
│       │   └── KanbanDragOverlay.tsx      # Overlay durante drag
│       │
│       ├── cards/                         # Variantes de tarjeta
│       │   ├── LeadCard.tsx
│       │   ├── OpportunityCard.tsx
│       │   └── CustomerCard.tsx
│       │
│       ├── columns/                       # Columnas especializadas
│       │   ├── ColumnHeader.tsx           # Header de columna
│       │   ├── ColumnFooter.tsx           # Footer (stats, add button)
│       │   └── ColumnWIPIndicator.tsx     # Indicador de WIP
│       │
│       ├── shared/                        # Componentes compartidos
│       │   ├── ScoreIndicator.tsx         # Barra de score
│       │   ├── HealthIndicator.tsx        # Indicador de health
│       │   ├── QuickActions.tsx           # Botones de acción rápida
│       │   ├── TagList.tsx                # Lista de tags
│       │   ├── StaleBadge.tsx             # Badge de inactividad
│       │   └── PriorityBadge.tsx          # Badge de prioridad
│       │
│       ├── modals/                        # Modales
│       │   ├── MoveConfirmModal.tsx       # Confirmación de movimiento
│       │   ├── LossReasonModal.tsx        # Razón de pérdida
│       │   ├── WonModal.tsx               # Datos de cierre ganado
│       │   ├── ConvertModal.tsx           # Convertir lead a opp
│       │   └── WIPOverrideModal.tsx       # Override de WIP limit
│       │
│       ├── empty/                         # Empty states
│       │   ├── EmptyColumn.tsx
│       │   └── EmptyBoard.tsx
│       │
│       └── filters/                       # Filtros
│           ├── KanbanFilters.tsx
│           └── QuickFilters.tsx
│
├── hooks/
│   └── kanban/
│       ├── useKanbanDnd.ts                # Hook de drag & drop
│       ├── useKanbanData.ts               # Hook de data fetching
│       ├── useTransitionValidation.ts     # Validación de transiciones
│       ├── useWIPLimits.ts                # Hook de WIP limits
│       └── useTelemetry.ts                # Hook de telemetría
│
├── stores/
│   └── kanban/
│       ├── leadsKanbanStore.ts
│       ├── opportunitiesKanbanStore.ts
│       └── customersKanbanStore.ts
│
└── services/
    └── kanban/
        ├── transitionService.ts
        ├── triggerService.ts
        └── telemetryService.ts
```

## 3.2 Jerarquía Visual

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           VISUAL HIERARCHY                                       │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│  HEADER (Fixed)                                                    z-index: 50  │
│  ┌───────────────────────────────────────────────────────────────────────────┐  │
│  │ [Logo] Pipeline de Leads          [Filtros] [Vista] [+ Nuevo Lead]       │  │
│  ├───────────────────────────────────────────────────────────────────────────┤  │
│  │ KPI: 128 Leads | $2.4M Pipeline | 23% Conv. | 5 Hot                      │  │
│  └───────────────────────────────────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  KANBAN BOARD (Scrollable horizontal)                              z-index: 10  │
│                                                                                  │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐           │
│  │  COLUMN 1    │ │  COLUMN 2    │ │  COLUMN 3    │ │  COLUMN 4    │           │
│  │  ┌────────┐  │ │  ┌────────┐  │ │  ┌────────┐  │ │              │           │
│  │  │ CARD   │  │ │  │ CARD   │  │ │  │ CARD   │  │ │  [Empty      │           │
│  │  │ ─────  │  │ │  │ ─────  │  │ │  └────────┘  │ │   State]     │           │
│  │  │ [QA]   │  │ │  │ [QA]   │  │ │              │ │              │           │
│  │  └────────┘  │ │  └────────┘  │ │              │ │              │           │
│  │  ┌────────┐  │ │              │ │              │ │              │           │
│  │  │ CARD   │  │ │              │ │              │ │              │           │
│  │  └────────┘  │ │              │ │              │ │              │           │
│  │              │ │              │ │              │ │              │           │
│  │  ──────────  │ │  ──────────  │ │  ──────────  │ │  ──────────  │           │
│  │  [+ Add]     │ │  [+ Add]     │ │  [+ Add]     │ │  [+ Add]     │           │
│  └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘           │
│                                                                                  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  DRAG OVERLAY (During drag)                                       z-index: 100  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │                    [Dragged Card Clone - Elevated]                          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────────────────────────────┤
│  MODALS (On demand)                                               z-index: 200  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │  [Backdrop blur] + [Modal Content]                                          ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────────────────┘

Z-INDEX SCALE:
├─ 0:    Base content
├─ 10:   Kanban board, columns, cards
├─ 20:   Sticky column headers
├─ 30:   Card hover states
├─ 40:   Tooltips
├─ 50:   Fixed header
├─ 100:  Drag overlay
├─ 150:  Toasts/Notifications
└─ 200:  Modals
```

## 3.3 Sistema de Color Semántico

```typescript
// ============== COLOR TOKENS ==============

const KANBAN_COLORS = {
  // Stage Colors - Leads
  leads: {
    new:        { bg: 'slate-100',   border: 'slate-300',   text: 'slate-700',   accent: 'slate-500' },
    contacted:  { bg: 'blue-50',     border: 'blue-200',    text: 'blue-700',    accent: 'blue-500' },
    interested: { bg: 'amber-50',    border: 'amber-200',   text: 'amber-700',   accent: 'amber-500' },
    qualified:  { bg: 'orange-50',   border: 'orange-200',  text: 'orange-700',  accent: 'orange-500' },
    proposal:   { bg: 'rose-50',     border: 'rose-200',    text: 'rose-700',    accent: 'rose-500' },
    won:        { bg: 'emerald-50',  border: 'emerald-200', text: 'emerald-700', accent: 'emerald-500' },
    lost:       { bg: 'gray-50',     border: 'gray-200',    text: 'gray-500',    accent: 'gray-400' }
  },

  // Stage Colors - Opportunities
  opportunities: {
    discovery:   { bg: 'indigo-50',   border: 'indigo-200',  text: 'indigo-700',  accent: 'indigo-500' },
    qualified:   { bg: 'cyan-50',     border: 'cyan-200',    text: 'cyan-700',    accent: 'cyan-500' },
    proposal:    { bg: 'violet-50',   border: 'violet-200',  text: 'violet-700',  accent: 'violet-500' },
    negotiation: { bg: 'fuchsia-50',  border: 'fuchsia-200', text: 'fuchsia-700', accent: 'fuchsia-500' },
    won:         { bg: 'emerald-50',  border: 'emerald-200', text: 'emerald-700', accent: 'emerald-500' },
    lost:        { bg: 'red-50',      border: 'red-200',     text: 'red-600',     accent: 'red-500' }
  },

  // Stage Colors - Customers
  customers: {
    onboarding: { bg: 'yellow-50',  border: 'yellow-200', text: 'yellow-700', accent: 'yellow-500' },
    active:     { bg: 'green-50',   border: 'green-200',  text: 'green-700',  accent: 'green-500' },
    growing:    { bg: 'teal-50',    border: 'teal-200',   text: 'teal-700',   accent: 'teal-500' },
    at_risk:    { bg: 'orange-50',  border: 'orange-200', text: 'orange-700', accent: 'orange-500' },
    renewal:    { bg: 'amber-50',   border: 'amber-200',  text: 'amber-700',  accent: 'amber-500' },
    churned:    { bg: 'gray-50',    border: 'gray-200',   text: 'gray-500',   accent: 'gray-400' }
  },

  // Score/Priority Colors (0-100)
  score: {
    cold:      { range: [0, 30],   color: 'slate-500' },
    cool:      { range: [31, 50],  color: 'blue-500' },
    warm:      { range: [51, 70],  color: 'amber-500' },
    hot:       { range: [71, 85],  color: 'orange-500' },
    very_hot:  { range: [86, 99],  color: 'rose-500' },
    converted: { range: [100, 100], color: 'emerald-500' }
  },

  // Health Colors (0-100)
  health: {
    critical:  { range: [0, 29],   color: 'red-500' },
    poor:      { range: [30, 49],  color: 'orange-500' },
    fair:      { range: [50, 69],  color: 'yellow-500' },
    good:      { range: [70, 89],  color: 'green-500' },
    excellent: { range: [90, 100], color: 'emerald-500' }
  },

  // Semantic Colors
  semantic: {
    success:    'emerald-500',
    error:      'red-500',
    warning:    'amber-500',
    info:       'blue-500',
    pending:    'yellow-500',
    inProgress: 'cyan-500'
  },

  // Drag & Drop Feedback
  dnd: {
    validDrop:   { ring: 'ring-emerald-500', bg: 'bg-emerald-50/50' },
    invalidDrop: { ring: 'ring-red-500', bg: 'bg-red-50/50' },
    dragging:    { shadow: 'shadow-lg', opacity: 'opacity-90' }
  }
};
```

## 3.4 Estados UI

```typescript
// ============== UI STATES ==============

interface KanbanUIState {
  // Data states
  dataState: 'loading' | 'loaded' | 'error' | 'empty';

  // Interaction states
  dragState: 'idle' | 'dragging' | 'dropping';

  // Modal states
  activeModal: ModalType | null;

  // Filter states
  filtersOpen: boolean;
  activeFilters: KanbanFilter[];

  // Selection states
  selectedCards: string[];

  // Accessibility states
  keyboardNavigationActive: boolean;
  focusedCardId: string | null;
}

type ModalType =
  | 'move_confirm'
  | 'loss_reason'
  | 'won_details'
  | 'convert_lead'
  | 'wip_override'
  | 'card_detail'
  | 'bulk_actions';
```

**Loading State:**
```
┌──────────────────────────────────────────────────────────────────────┐
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────┐                 │
│  │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │ │ ░░░░░░░░░░░░ │                 │
│  │              │ │              │ │              │                 │
│  │ ┌──────────┐ │ │ ┌──────────┐ │ │ ┌──────────┐ │                 │
│  │ │ ████████ │ │ │ │ ████████ │ │ │ │ ████████ │ │                 │
│  │ │ ████     │ │ │ │ ████     │ │ │ │ ████     │ │  ← Skeleton    │
│  │ │ ██████   │ │ │ │ ██████   │ │ │ │ ██████   │ │    cards with  │
│  │ └──────────┘ │ │ └──────────┘ │ │ └──────────┘ │    pulse anim  │
│  │ ┌──────────┐ │ │              │ │              │                 │
│  │ │ ████████ │ │ │              │ │              │                 │
│  │ └──────────┘ │ │              │ │              │                 │
│  └──────────────┘ └──────────────┘ └──────────────┘                 │
└──────────────────────────────────────────────────────────────────────┘
```

**Empty State:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                       ┌────────────────────┐                         │
│                       │                    │                         │
│                       │   📋               │                         │
│                       │                    │                         │
│                       │  No hay leads      │                         │
│                       │  en este stage     │                         │
│                       │                    │                         │
│                       │  [+ Agregar Lead]  │ ← CTA educativo        │
│                       │                    │                         │
│                       │  o arrastra uno    │                         │
│                       │  desde otro stage  │                         │
│                       │                    │                         │
│                       └────────────────────┘                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

**Error State:**
```
┌──────────────────────────────────────────────────────────────────────┐
│                                                                      │
│                       ┌────────────────────┐                         │
│                       │                    │                         │
│                       │   ⚠️               │                         │
│                       │                    │                         │
│                       │  Error al cargar   │                         │
│                       │  los datos         │                         │
│                       │                    │                         │
│                       │  [Reintentar]      │                         │
│                       │                    │                         │
│                       │  Si el problema    │                         │
│                       │  persiste,         │                         │
│                       │  contacta soporte  │                         │
│                       │                    │                         │
│                       └────────────────────┘                         │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

## 3.5 Responsive Behavior

```typescript
// ============== BREAKPOINT BEHAVIORS ==============

const RESPONSIVE_CONFIG = {
  mobile: {
    breakpoint: '< 640px',
    columns: {
      visible: 1,
      scroll: 'horizontal-snap',
      navigation: 'swipe + dots'
    },
    cards: {
      width: '100%',
      quickActions: 'always-visible',
      touchTargets: '48px'
    },
    dragDrop: {
      trigger: 'long-press-300ms',
      feedback: 'haptic',
      alternative: 'move-to-button',
      dropZones: '+20% expanded'
    }
  },

  tablet: {
    breakpoint: '640px - 1024px',
    columns: {
      visible: '2-3',
      scroll: 'horizontal-free',
      navigation: 'scroll'
    },
    cards: {
      width: '280px',
      quickActions: 'hover + menu',
      touchTargets: '44px'
    },
    dragDrop: {
      trigger: 'tap',
      feedback: 'visual',
      autoScroll: 'edge-triggered'
    }
  },

  desktop: {
    breakpoint: '> 1024px',
    columns: {
      visible: 'all (scroll if needed)',
      width: 'clamp(280px, 20vw, 320px)',
      scroll: 'horizontal-smooth'
    },
    cards: {
      width: 'column-width - padding',
      quickActions: 'hover',
      features: ['keyboard-nav', 'multi-select', 'collapse']
    },
    dragDrop: {
      trigger: 'click-drag',
      feedback: 'visual + sound (optional)',
      autoScroll: 'smooth',
      multiSelect: 'shift/cmd + click'
    }
  }
};
```

## 3.6 Accesibilidad

```typescript
// ============== A11Y IMPLEMENTATION ==============

const A11Y_CONFIG = {
  // Keyboard Navigation
  keyboard: {
    Tab: 'Navigate between cards',
    Enter: 'Open card detail / Initiate grab mode',
    Space: 'Toggle grab mode / Drop card',
    ArrowUp: 'Move up within column (grab mode)',
    ArrowDown: 'Move down within column (grab mode)',
    ArrowLeft: 'Move to previous column (grab mode)',
    ArrowRight: 'Move to next column (grab mode)',
    Escape: 'Cancel operation / Close modal',
    'Shift+?': 'Open keyboard shortcuts help'
  },

  // ARIA Labels
  ariaLabels: {
    board: 'Tablero Kanban de {entityType}',
    column: 'Columna {stageName}, {count} elementos',
    card: '{entityName}, puntuación {score}, en etapa {stage}',
    dragHandle: 'Arrastrar para mover',
    quickAction: '{actionName}'
  },

  // Live Regions
  liveRegions: {
    onDragStart: {
      politeness: 'assertive',
      message: '{entityName} levantado. Posición {index} de {total} en {stage}.'
    },
    onDragMove: {
      politeness: 'polite',
      message: 'Sobre columna {stage}. {validMessage}'
    },
    onDrop: {
      politeness: 'assertive',
      message: '{entityName} movido a {stage}. Posición {index} de {total}.'
    },
    onError: {
      politeness: 'assertive',
      message: 'Error: {errorMessage}'
    }
  },

  // Focus Management
  focusManagement: {
    onModalOpen: 'trap-focus-in-modal',
    onModalClose: 'return-focus-to-trigger',
    onDragEnd: 'focus-moved-card',
    onCardDelete: 'focus-next-card-or-column'
  },

  // Reduced Motion
  reducedMotion: {
    query: '(prefers-reduced-motion: reduce)',
    behavior: {
      disableAnimations: true,
      disableConfetti: true,
      instantTransitions: true
    }
  }
};
```

---

# 4. Flujos Funcionales del Sistema

## 4.1 Lead Journey Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    LEAD JOURNEY - FUNCTIONAL FLOW                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ STEP 1: ENTRADA DE LEAD                                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ INPUTS:                          PROCESS:                         OUTPUTS:     │
│ ├─ Formulario web               ├─ Validar datos                 ├─ Lead ID   │
│ ├─ WhatsApp Bot                 ├─ Detectar duplicados           ├─ Score: 0  │
│ ├─ Import CSV                   ├─ Calcular score inicial        ├─ Stage: new│
│ ├─ API externa                  ├─ Asignar owner (round-robin)   ├─ Assigned  │
│ └─ Entrada manual               └─ Enriquecer datos (opcional)   └─ Activity  │
│                                                                                 │
│ EVENTOS:                         MÉTRICAS:                                      │
│ ├─ lead.created                 ├─ leads_created_total                         │
│ ├─ lead.assigned                ├─ lead_source_distribution                    │
│ └─ lead.score_calculated        └─ avg_initial_score                           │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ STEP 2: PRIMER CONTACTO                                                         │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ INPUTS:                          PROCESS:                         OUTPUTS:     │
│ ├─ Quick action: 📞 Call        ├─ Registrar actividad           ├─ Activity  │
│ ├─ Quick action: ✉️ Email       ├─ Actualizar last_activity      ├─ Score +10 │
│ ├─ Quick action: 💬 WhatsApp    ├─ Recalcular score              ├─ Stage:    │
│ └─ Drag to "Contactado"         ├─ Validar transición            │   contacted│
│                                 └─ Ejecutar triggers              └─ Timestamp │
│                                                                                 │
│ ESTADOS INTERMEDIOS:             VALIDACIONES:                                  │
│ ├─ Llamando...                  ├─ ¿Tiene teléfono?                            │
│ ├─ Enviando email...            ├─ ¿Tiene email?                               │
│ └─ Esperando respuesta          └─ ¿Duplicado potencial?                       │
│                                                                                 │
│ EVENTOS:                         MÉTRICAS:                                      │
│ ├─ lead.contacted               ├─ time_to_first_contact                       │
│ ├─ lead.stage_changed           ├─ contact_method_distribution                 │
│ └─ activity.created             └─ contact_success_rate                        │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│ STEP 3: CALIFICACIÓN                                                            │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ INPUTS:                          PROCESS:                         OUTPUTS:     │
│ ├─ Interacción positiva         ├─ Evaluar BANT                  ├─ Score ↑   │
│ ├─ Información adicional        ├─ Actualizar campos             ├─ Stage:    │
│ ├─ Demostración agendada        ├─ Calcular probabilidad         │   qualified│
│ └─ Budget confirmado            └─ Sugerir siguiente acción      └─ Next step │
│                                                                                 │
│ TRIGGERS AUTOMÁTICOS:            VALIDACIONES:                                  │
│ ├─ Score > 70: Sugerir mover    ├─ Campos requeridos completos                 │
│ ├─ Score > 85: Badge "HOT"      ├─ Budget estimado                             │
│ └─ 7 días inactivo: Alert       └─ Decisor identificado                        │
│                                                                                 │
│ EVENTOS:                         MÉTRICAS:                                      │
│ ├─ lead.qualified               ├─ qualification_rate                          │
│ ├─ lead.hot_alert               ├─ avg_time_to_qualification                   │
│ └─ lead.stale_alert             └─ qualification_criteria_met                  │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                          ┌─────────┴─────────┐
                          ▼                   ▼
┌─────────────────────────────────┐ ┌─────────────────────────────────┐
│ STEP 4A: CONVERSIÓN            │ │ STEP 4B: PÉRDIDA                │
├─────────────────────────────────┤ ├─────────────────────────────────┤
│                                 │ │                                 │
│ INPUTS:                         │ │ INPUTS:                         │
│ ├─ Score = 100                  │ │ ├─ No responde                  │
│ ├─ Drag to "Convertido"         │ │ ├─ Sin presupuesto              │
│ └─ Confirmar conversión         │ │ └─ Competidor elegido           │
│                                 │ │                                 │
│ PROCESS:                        │ │ PROCESS:                        │
│ ├─ Modal de conversión          │ │ ├─ Modal razón de pérdida       │
│ ├─ Crear Opportunity            │ │ ├─ Registrar motivo             │
│ ├─ Pre-llenar datos             │ │ └─ Opcional: follow-up futuro   │
│ └─ Link lead → opportunity      │ │                                 │
│                                 │ │ OUTPUTS:                        │
│ OUTPUTS:                        │ │ ├─ Stage: lost                  │
│ ├─ Stage: won                   │ │ ├─ Loss reason                  │
│ ├─ Opportunity created          │ │ └─ Future follow-up date        │
│ └─ Lead archived                │ │                                 │
│                                 │ │ MÉTRICAS:                       │
│ MÉTRICAS:                       │ │ ├─ loss_reason_distribution     │
│ ├─ conversion_rate              │ │ ├─ loss_rate_by_stage           │
│ ├─ avg_lead_to_opp_time         │ │ └─ reactivation_rate            │
│ └─ lead_value_accuracy          │ │                                 │
└─────────────────────────────────┘ └─────────────────────────────────┘
```

## 4.2 Opportunity Pipeline Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                 OPPORTUNITY PIPELINE - FUNCTIONAL FLOW                           │
└─────────────────────────────────────────────────────────────────────────────────┘

DISCOVERY (10%) ──────► QUALIFIED (30%) ──────► PROPOSAL (50%)
     │                       │                       │
     │ INPUTS:               │ INPUTS:               │ INPUTS:
     │ ├─ Lead convertido    │ ├─ Demo realizado     │ ├─ Propuesta enviada
     │ ├─ Referral           │ ├─ Necesidad confirm. │ ├─ Budget aprobado
     │ └─ Prospección        │ └─ Budget confirmado  │ └─ Decisor involucrado
     │                       │                       │
     │ VALIDACIONES:         │ VALIDACIONES:         │ VALIDACIONES:
     │ └─ Datos básicos      │ ├─ Demo completed     │ └─ Proposal document
     │                       │ └─ BANT qualified     │     attached
     │                       │                       │
     │ AUTO-ACTIONS:         │ AUTO-ACTIONS:         │ AUTO-ACTIONS:
     │ ├─ Set prob=10%       │ ├─ Set prob=30%       │ ├─ Set prob=50%
     │ └─ Schedule task      │ └─ Update forecast    │ └─ Set reminder
     │                       │                       │
     ▼                       ▼                       ▼
═══════════════════════════════════════════════════════════════════════════════════
                                    │
                                    ▼
                          NEGOTIATION (70%)
                                    │
                                    │ INPUTS:
                                    │ ├─ Propuesta aceptada
                                    │ ├─ Negociación de términos
                                    │ └─ Contrato en revisión
                                    │
                                    │ VALIDACIONES:
                                    │ ├─ Proposal accepted
                                    │ └─ Legal review (opcional)
                                    │
                                    │ AUTO-ACTIONS:
                                    │ ├─ Set prob=70%
                                    │ ├─ Notify finance
                                    │ └─ Update forecast
                                    │
                         ┌──────────┴──────────┐
                         ▼                     ▼
                ┌────────────────┐    ┌────────────────┐
                │      WON       │    │      LOST      │
                │    (100%)      │    │     (0%)       │
                └───────┬────────┘    └───────┬────────┘
                        │                     │
                REQUIRED DATA:          REQUIRED DATA:
                ├─ final_value          ├─ loss_reason
                ├─ closed_date          ├─ competitor
                └─ contract_id          └─ lessons_learned
                        │                     │
                AUTO-ACTIONS:           AUTO-ACTIONS:
                ├─ Confetti anim        ├─ Log analytics
                ├─ Create Customer      ├─ Schedule follow-up
                ├─ Send thank you       └─ Optional win-back
                └─ Notify team                task
                        │
                        ▼
                ┌────────────────┐
                │    CUSTOMER    │
                │   (created)    │
                └────────────────┘
```

## 4.3 Customer Lifecycle Flow

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                  CUSTOMER LIFECYCLE - FUNCTIONAL FLOW                            │
└─────────────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│ ONBOARDING                                                                      │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ CHECKLIST:                       TRIGGERS:                      OUTPUTS:        │
│ ├─ ✅ Contrato firmado          ├─ progress < 50%: Reminder    ├─ Health: N/A  │
│ ├─ ✅ Pago recibido             ├─ progress = 100%: Move to    ├─ Progress %   │
│ ├─ ⬜ Kickoff meeting           │   Active                     └─ Days in      │
│ ├─ ⬜ Setup completado          └─ 14 días sin progreso:          onboarding   │
│ └─ ⬜ Training realizado            Escalate                                    │
│                                                                                 │
│ COMPLETION REQUIREMENT: 100% checklist para pasar a ACTIVE                     │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼ (checklist 100%)
┌─────────────────────────────────────────────────────────────────────────────────┐
│ ACTIVE                                                                          │
├─────────────────────────────────────────────────────────────────────────────────┤
│                                                                                 │
│ HEALTH CALCULATION:              TRANSITIONS:                   OUTPUTS:        │
│ ├─ Login frequency              ├─ Health > 80% + Growth →     ├─ Health Score│
│ ├─ Feature usage                │   GROWING                    ├─ MRR         │
│ ├─ Support tickets              ├─ Health < 40% →              ├─ NPS (último)│
│ ├─ NPS score                    │   AT_RISK (auto)             └─ Usage %     │
│ └─ Payment status               └─ 90 días antes renewal →                     │
│                                     RENEWAL (auto)                              │
│                                                                                 │
│ TRIGGERS:                                                                       │
│ ├─ Usage > 80%: Upsell badge                                                   │
│ ├─ 90 días desde NPS: Send survey                                              │
│ └─ Support spike: Alert AM                                                      │
│                                                                                 │
└─────────────────────────────────────────────────────────────────────────────────┘
                    │                   │                   │
          ┌─────────┘                   │                   └─────────┐
          ▼                             ▼                             ▼
┌─────────────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│      GROWING        │     │      AT_RISK        │     │      RENEWAL        │
├─────────────────────┤     ├─────────────────────┤     ├─────────────────────┤
│                     │     │                     │     │                     │
│ CRITERIA:           │     │ CRITERIA:           │     │ CRITERIA:           │
│ ├─ Health > 80%     │     │ ├─ Health < 40%     │     │ ├─ Contract expiry  │
│ ├─ NRR > 100%       │     │ ├─ Usage declining  │     │     within 90 days  │
│ └─ Upsell potential │     │ └─ Payment issues   │     │                     │
│                     │     │                     │     │ ACTIONS:            │
│ ACTIONS:            │     │ ACTIONS:            │     │ ├─ 90 days: Notify  │
│ ├─ Propose upsell   │     │ ├─ Health call      │     │ ├─ 60 days: Task    │
│ ├─ Request referral │     │ ├─ Escalate         │     │ ├─ 30 days: Escalate│
│ └─ Case study       │     │ └─ Special offer    │     │ └─ Review terms     │
│                     │     │                     │     │                     │
│ OUTPUTS:            │     │ OUTPUTS:            │     │ OUTPUTS:            │
│ ├─ NRR potential    │     │ ├─ Churn risk score │     │ ├─ Days to renewal  │
│ └─ Upsell value     │     │ └─ Rescue plan      │     │ └─ Renewal value    │
│                     │     │                     │     │                     │
└─────────────────────┘     └─────────────────────┘     └─────────────────────┘
          │                             │                             │
          └─────────────────────────────┼─────────────────────────────┘
                                        │
                                        ▼
                            ┌─────────────────────┐
                            │       CHURNED       │
                            ├─────────────────────┤
                            │                     │
                            │ REQUIRED DATA:      │
                            │ ├─ Churn reason     │
                            │ ├─ Exit interview   │
                            │ └─ Manager approval │
                            │                     │
                            │ WIN-BACK:           │
                            │ ├─ Schedule 90-day  │
                            │ │   follow-up       │
                            │ └─ Track recovery   │
                            │     rate            │
                            │                     │
                            └─────────────────────┘
```

---

# 5. Métricas y Telemetría UX

## 5.1 Eventos a Trackear

```typescript
// ============== TELEMETRY EVENTS ==============

interface TelemetryEvent {
  name: string;
  category: 'interaction' | 'navigation' | 'performance' | 'error' | 'business';
  properties: Record<string, any>;
  timestamp: number;
  sessionId: string;
  userId: string;
  tenantId: string;
}

const KANBAN_EVENTS = {
  // Interaction Events
  interaction: {
    'kanban.drag.start': {
      cardId: 'string',
      cardType: 'string',
      sourceStage: 'string',
      sourceIndex: 'number'
    },
    'kanban.drag.end': {
      cardId: 'string',
      cardType: 'string',
      sourceStage: 'string',
      targetStage: 'string',
      success: 'boolean',
      duration: 'number',
      reason: 'string?'
    },
    'kanban.card.click': {
      cardId: 'string',
      cardType: 'string',
      stage: 'string'
    },
    'kanban.quick_action.click': {
      cardId: 'string',
      action: 'string', // call, email, whatsapp, note
      stage: 'string'
    },
    'kanban.filter.apply': {
      filterType: 'string',
      filterValue: 'string'
    },
    'kanban.column.collapse': {
      stage: 'string',
      collapsed: 'boolean'
    }
  },

  // Navigation Events
  navigation: {
    'kanban.view': {
      entityType: 'string', // leads, opportunities, customers
      itemCount: 'number',
      stageCount: 'number'
    },
    'kanban.scroll': {
      direction: 'string',
      scrollDepth: 'number'
    }
  },

  // Performance Events
  performance: {
    'kanban.load.start': {},
    'kanban.load.complete': {
      duration: 'number',
      itemCount: 'number',
      cached: 'boolean'
    },
    'kanban.render.time': {
      duration: 'number',
      itemCount: 'number'
    }
  },

  // Error Events
  error: {
    'kanban.error.load': {
      errorCode: 'string',
      errorMessage: 'string'
    },
    'kanban.error.transition': {
      cardId: 'string',
      fromStage: 'string',
      toStage: 'string',
      reason: 'string'
    }
  },

  // Business Events
  business: {
    'lead.converted': {
      leadId: 'string',
      opportunityId: 'string',
      value: 'number',
      timeToConvert: 'number'
    },
    'opportunity.won': {
      opportunityId: 'string',
      value: 'number',
      salesCycleLength: 'number'
    },
    'opportunity.lost': {
      opportunityId: 'string',
      value: 'number',
      reason: 'string'
    }
  }
};
```

## 5.2 KPIs por Vista Kanban

```typescript
// ============== KANBAN KPIs ==============

interface KanbanKPIs {
  leads: LeadKPIs;
  opportunities: OpportunityKPIs;
  customers: CustomerKPIs;
}

interface LeadKPIs {
  // Volume
  totalLeads: number;
  newThisWeek: number;
  newThisMonth: number;

  // Pipeline Value
  totalPipelineValue: number;
  valueByStage: Record<LeadStatus, number>;

  // Velocity
  avgTimeInStage: Record<LeadStatus, number>; // days
  avgTimeToConvert: number; // days

  // Conversion
  conversionRate: number; // leads → opportunities %
  conversionBySource: Record<string, number>;

  // Health
  hotLeads: number; // score > 85
  staleLeads: number; // > 7 days inactive
  overdueFollowUps: number;

  // Activity
  contactedToday: number;
  activitiesThisWeek: number;
}

interface OpportunityKPIs {
  // Volume
  totalOpportunities: number;
  openOpportunities: number;

  // Value
  totalPipelineValue: number;
  weightedPipelineValue: number; // Σ(value × probability)
  avgDealSize: number;

  // Win/Loss
  wonThisMonth: number;
  wonValueThisMonth: number;
  lostThisMonth: number;
  winRate: number; // won / (won + lost) %

  // Velocity
  avgSalesCycleLength: number; // days
  avgTimeInStage: Record<OpportunityStage, number>;

  // Forecast
  forecastThisMonth: number;
  forecastThisQuarter: number;
  forecastAccuracy: number; // historical

  // Health
  staleDeals: number; // > 14 days no movement
  closingSoon: number; // close date within 7 days
}

interface CustomerKPIs {
  // Volume
  totalCustomers: number;
  activeCustomers: number;

  // Revenue
  totalMRR: number;
  totalARR: number;
  avgMRR: number;

  // Health
  avgHealthScore: number;
  healthyCustomers: number; // health > 70
  atRiskCustomers: number; // health < 40

  // Lifecycle
  onboarding: number;
  pendingRenewals: number; // within 90 days

  // Retention
  churnedThisMonth: number;
  churnRate: number; // monthly
  nrr: number; // Net Revenue Retention

  // Satisfaction
  avgNPS: number;
  promoters: number;
  detractors: number;
}
```

## 5.3 Métricas de Adopción y Productividad

```typescript
// ============== ADOPTION METRICS ==============

interface AdoptionMetrics {
  // Feature Adoption
  kanbanViews: number;
  uniqueKanbanUsers: number;
  kanbanAdoptionRate: number; // users who use kanban / total users

  // Engagement
  avgSessionDuration: number; // minutes
  avgActionsPerSession: number;
  dragOperationsPerDay: number;
  quickActionUsageRate: number; // actions from card / total actions

  // Stickiness
  dauMauRatio: number; // DAU / MAU
  weeklyActiveRate: number; // WAU / total users
  returnRate: number; // users who return next day

  // Time to Value
  timeToFirstDrag: number; // minutes from first login
  timeToFirstConversion: number; // days
  onboardingCompletionRate: number;
}

// ============== PRODUCTIVITY METRICS ==============

interface ProductivityMetrics {
  // Efficiency
  avgTimePerLead: number; // minutes to process
  leadsProcessedPerHour: number;
  touchesPerConversion: number;

  // Outcomes
  conversionRate: number;
  winRate: number;
  avgDealSize: number;

  // Comparison
  vsLastWeek: {
    conversionRate: number; // % change
    winRate: number;
    avgDealSize: number;
  };
  vsTeamAvg: {
    conversionRate: number;
    winRate: number;
    avgDealSize: number;
  };
}
```

## 5.4 Señales de Fricción UX

```typescript
// ============== FRICTION SIGNALS ==============

interface FrictionSignal {
  type: 'warning' | 'critical';
  metric: string;
  threshold: number;
  currentValue: number;
  recommendation: string;
}

const FRICTION_THRESHOLDS = {
  // Performance Friction
  'load.time.p95': {
    warning: 2000, // ms
    critical: 5000,
    recommendation: 'Optimizar carga de datos, considerar paginación'
  },

  // Interaction Friction
  'drag.cancel.rate': {
    warning: 0.15, // 15%
    critical: 0.30,
    recommendation: 'Revisar validaciones de transición, mejorar feedback visual'
  },
  'drag.duration.avg': {
    warning: 3000, // 3 segundos
    critical: 5000,
    recommendation: 'Revisar tamaño de tarjetas, considerar "Move to..." button'
  },

  // Error Friction
  'transition.error.rate': {
    warning: 0.05, // 5%
    critical: 0.10,
    recommendation: 'Revisar mensajes de error, clarificar requisitos'
  },

  // Adoption Friction
  'feature.adoption.kanban': {
    warning: 0.50, // < 50% usan Kanban
    critical: 0.30,
    recommendation: 'Onboarding, tooltips, comunicación de beneficios'
  },

  // Engagement Friction
  'session.duration.avg': {
    warning: 60, // < 1 min promedio
    critical: 30,
    recommendation: 'Revisar value proposition, onboarding'
  },
  'bounce.rate.kanban': {
    warning: 0.40, // > 40% salen sin interactuar
    critical: 0.60,
    recommendation: 'Revisar empty states, carga inicial'
  }
};
```

---

# 6. Roadmap Técnico de Implementación

## 6.1 Fases de Entrega

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ROADMAP TÉCNICO - FASES DE ENTREGA                            │
└─────────────────────────────────────────────────────────────────────────────────┘

FASE 1: CORE FUNCTIONALITY (Completado)
═══════════════════════════════════════════════════════════════════════════════════
✅ Kanban Board con dnd-kit
✅ CRUD de entidades (Lead, Opportunity, Customer)
✅ Sistema de stages por entidad
✅ Drag & drop básico
✅ Quick actions en tarjetas
✅ Score/Health indicators
✅ Responsive básico
✅ Multi-tenant

Dependencias: React, dnd-kit, Zustand, React Query, API Backend

───────────────────────────────────────────────────────────────────────────────────

FASE 2: ENHANCED UX (Próxima)
═══════════════════════════════════════════════════════════════════════════════════
□ Transition validation service
□ Visual feedback (valid/invalid drop)
□ WIP limits con UI
□ Modales de datos requeridos (Loss reason, Won details)
□ Keyboard navigation (Tab, Enter, Arrows)
□ "Move to..." button (alternativa a drag)
□ Empty states educativos
□ Undo/Redo para movimientos

Dependencias: Fase 1 completa

Quick Wins:
├─ Keyboard navigation: Alto impacto A11y, bajo esfuerzo
├─ Empty states: Mejora onboarding, bajo esfuerzo
└─ "Move to..." button: A11y compliance, medio esfuerzo

Riesgos:
├─ Transition validation: Complejidad de reglas
└─ WIP limits: Necesita configuración por tenant

───────────────────────────────────────────────────────────────────────────────────

FASE 3: AUTOMATION & TRIGGERS
═══════════════════════════════════════════════════════════════════════════════════
□ Trigger engine
□ Auto-scoring rules
□ Stale item detection & highlight
□ Automatic notifications
□ Stage change webhooks
□ Scheduled tasks integration

Dependencias: Fase 2 completa, Job queue backend

───────────────────────────────────────────────────────────────────────────────────

FASE 4: INTELLIGENCE
═══════════════════════════════════════════════════════════════════════════════════
□ AI-powered lead scoring
□ Next best action suggestions
□ Duplicate detection
□ Win probability prediction
□ Churn prediction for customers

Dependencias: Fase 3 completa, ML pipeline, Data warehouse

───────────────────────────────────────────────────────────────────────────────────

FASE 5: ADVANCED FEATURES
═══════════════════════════════════════════════════════════════════════════════════
□ Multi-select & batch actions
□ Timeline view toggle
□ Split view (Kanban + Detail)
□ Custom fields en tarjetas
□ Saved views & filters
□ Activity feed real-time
□ Collaboration (comments, @mentions)

Dependencias: Fase 2 completa, WebSocket infrastructure

───────────────────────────────────────────────────────────────────────────────────

FASE 6: POLISH & DELIGHT
═══════════════════════════════════════════════════════════════════════════════════
□ Micro-interactions refinadas
□ Celebration animations (confetti)
□ Sound feedback (optional)
□ Haptic feedback (mobile)
□ Onboarding interactivo
□ Keyboard shortcuts guide
□ Dark mode optimization
□ Performance: virtualization for large lists

Dependencias: Fases anteriores completas
```

## 6.2 Matriz de Dependencias

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        DEPENDENCY MATRIX                                         │
└─────────────────────────────────────────────────────────────────────────────────┘

                          DEPENDE DE
           ┌──────┬──────┬──────┬──────┬──────┬──────┐
           │ F1   │ F2   │ F3   │ F4   │ F5   │ F6   │
   ┌───────┼──────┼──────┼──────┼──────┼──────┼──────┤
   │  F1   │  -   │      │      │      │      │      │
   │  F2   │  ●   │  -   │      │      │      │      │
P  │  F3   │  ●   │  ●   │  -   │      │      │      │
R  │  F4   │  ●   │  ●   │  ●   │  -   │      │      │
O  │  F5   │  ●   │  ●   │      │      │  -   │      │
V  │  F6   │  ●   │  ●   │  ●   │  ●   │  ●   │  -   │
E  └───────┴──────┴──────┴──────┴──────┴──────┴──────┘
E
   ● = Dependencia directa

DEPENDENCIAS EXTERNAS:
├─ F1: React, dnd-kit, Zustand, React Query, API Backend
├─ F3: Job queue (BullMQ/Agenda), Event bus
├─ F4: ML Pipeline, Data warehouse
├─ F5: WebSocket infrastructure
└─ F6: Animation library (Framer Motion)
```

## 6.3 Riesgos y Mitigaciones

| Fase | Riesgo | Impacto | Probabilidad | Mitigación |
|------|--------|---------|--------------|------------|
| F2 | Complejidad de reglas de transición | Alto | Media | Documentar casos de uso, testing exhaustivo |
| F2 | Keyboard nav compleja | Medio | Alta | Usar biblioteca existente (react-aria) |
| F3 | Performance de triggers | Alto | Media | Rate limiting, async execution |
| F4 | Precisión de AI scoring | Alto | Alta | A/B testing, fallback a reglas manuales |
| F5 | Conflictos en multi-select | Medio | Media | Optimistic locking, conflict resolution UI |
| F6 | Performance con virtualization | Medio | Baja | Testing con datasets grandes |

---

# 7. Checklist de Implementación

## 7.1 Checklist UX/UI

```markdown
## FASE 2: ENHANCED UX - Checklist

### Transition Validation
- [ ] Implementar TransitionService con reglas por entidad
- [ ] Crear matriz de transiciones en configuración
- [ ] Validar pre-drop con feedback visual
- [ ] Implementar ring verde/rojo según validez
- [ ] Agregar shake animation para drop inválido
- [ ] Mostrar tooltip con razón de invalidez

### WIP Limits
- [ ] Configurar límites por stage/tenant
- [ ] Implementar ColumnWIPIndicator component
- [ ] Mostrar warning badge en soft limit
- [ ] Bloquear drops en hard limit
- [ ] Implementar WIPOverrideModal
- [ ] Registrar excepciones para métricas

### Modales de Datos
- [ ] LossReasonModal con campos requeridos
- [ ] WonModal con valor final, fecha, notas
- [ ] ConvertLeadModal con pre-fill de datos
- [ ] MoveConfirmModal para warnings
- [ ] Validación de formularios
- [ ] Persistencia de datos en transición

### Keyboard Navigation
- [ ] Tab navigation entre cards
- [ ] Enter/Space para abrir/grab
- [ ] Arrow keys para mover (grab mode)
- [ ] Escape para cancelar
- [ ] Focus visible ring
- [ ] Skip links para accesibilidad
- [ ] Keyboard shortcuts help (Shift+?)

### "Move to..." Button
- [ ] Agregar botón en card menu
- [ ] Dropdown con stages válidos
- [ ] Stages inválidos deshabilitados con tooltip
- [ ] Mismo flujo de validación que drag

### Empty States
- [ ] EmptyColumn component
- [ ] Ilustración contextual
- [ ] CTA educativo
- [ ] Sugerencias de acción
- [ ] Link a documentación/ayuda

### Undo/Redo
- [ ] Stack de acciones recientes
- [ ] Toast con undo link (5 segundos)
- [ ] Keyboard shortcut (Cmd/Ctrl+Z)
- [ ] Límite de historial
```

## 7.2 Checklist Técnico

```markdown
## FASE 2: ENHANCED UX - Checklist Técnico

### Backend
- [ ] Endpoint PATCH /api/v1/{entity}/{id}/stage
- [ ] Validación de transiciones en backend
- [ ] Logging de stage changes
- [ ] Event emission para triggers
- [ ] WIP limit enforcement

### Frontend State
- [ ] Zustand store para cada entidad
- [ ] Optimistic updates en mutations
- [ ] Rollback en caso de error
- [ ] Cache invalidation con React Query
- [ ] Loading states durante transiciones

### Telemetry
- [ ] Eventos de drag start/end
- [ ] Eventos de transición success/failure
- [ ] Métricas de tiempo en stage
- [ ] Error tracking
- [ ] Performance monitoring

### Testing
- [ ] Unit tests para TransitionService
- [ ] Integration tests para flujos de transición
- [ ] E2E tests para drag & drop
- [ ] Accessibility tests (axe-core)
- [ ] Visual regression tests
- [ ] Performance tests (Lighthouse)

### Documentation
- [ ] API documentation actualizada
- [ ] Component Storybook
- [ ] Transition rules documentation
- [ ] Keyboard shortcuts guide
```

---

# 8. Decisiones Técnicas y Trade-offs

## 8.1 Decisiones Tomadas

| Decisión | Opciones Consideradas | Elección | Justificación |
|----------|----------------------|----------|---------------|
| Drag & Drop Library | dnd-kit, react-beautiful-dnd, react-dnd | **dnd-kit** | Mejor A11y, keyboard support nativo, mantenimiento activo |
| State Management | Redux, Zustand, Jotai | **Zustand** | Simplicidad, menos boilerplate, buen soporte TypeScript |
| Server State | React Query, SWR, Apollo | **React Query** | Optimistic updates, mejor cache, mutations simples |
| Styling | Tailwind, CSS Modules, Styled Components | **Tailwind** | Consistencia con proyecto, utilidades, theming |
| Animation | Framer Motion, React Spring, CSS | **Framer Motion** | API declarativa, gestures, mejor DX |

## 8.2 Trade-offs Aceptados

| Trade-off | Beneficio | Costo | Mitigación |
|-----------|-----------|-------|------------|
| Optimistic updates | UX más rápida | Complejidad de rollback | Testing exhaustivo, error handling robusto |
| Client-side validation | Feedback inmediato | Duplicación de lógica | Compartir reglas via API |
| WIP limits en cliente | Feedback instantáneo | Puede desincronizarse | Validación doble en backend |
| Virtualization diferida | Simplicidad inicial | Performance con muchos items | Implementar en F6 |
| Sound feedback opcional | UX mejorada | Preferencias de usuario | Feature flag, default off |

## 8.3 Deuda Técnica Conocida

| Item | Severidad | Impacto | Plan de Resolución |
|------|-----------|---------|-------------------|
| Sin virtualization | Media | Performance con >100 items/column | F6: Implementar react-window |
| Reglas en frontend | Baja | Inconsistencia potencial | Centralizar en API |
| Sin offline support | Media | Sin funcionalidad offline | Futuro: Service Worker |
| Testing E2E limitado | Alta | Riesgo de regresiones | Incrementar cobertura |

---

## Anexo: Glosario Técnico

| Término | Definición |
|---------|------------|
| **WIP Limit** | Work In Progress Limit - Límite de items por columna |
| **Optimistic Update** | Actualizar UI antes de confirmación del servidor |
| **Transition** | Movimiento de un item entre stages |
| **Trigger** | Acción automática ejecutada por evento |
| **Health Score** | Métrica de salud del cliente (0-100) |
| **Lead Score** | Métrica de calidad del lead (0-100) |
| **NRR** | Net Revenue Retention |
| **dnd-kit** | Biblioteca de drag & drop para React |
| **Zustand** | Biblioteca de state management |

---

*Documento generado para Ventazo CRM - Diciembre 2025*
*Basado en: UX_UI_KANBAN_CRM_GUIDE.md*

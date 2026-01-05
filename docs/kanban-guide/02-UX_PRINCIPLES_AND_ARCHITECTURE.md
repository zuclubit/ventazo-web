# Guía UX/UI para Módulo Kanban CRM - Parte 2
## Principios UX y Arquitectura

---

## 5. Principios de Diseño UX

### 5.1 Principios Fundamentales para Kanban CRM

#### Principio 1: Visibilidad del Estado del Sistema
> *"El sistema siempre debe mantener a los usuarios informados sobre lo que está pasando."* — Jakob Nielsen

**Aplicación en Kanban:**
- Conteo visible de items por columna
- Total monetario por stage
- Indicadores de tiempo en stage ("5 días aquí")
- Feedback visual durante drag & drop

#### Principio 2: Coincidencia con el Mundo Real
> *"El sistema debe hablar el lenguaje del usuario."*

**Aplicación en Kanban:**
- Nombres de stages en lenguaje de ventas: "Prospecto", "Contactado", "Propuesta", "Negociación", "Ganado"
- Iconografía reconocible (📞 llamada, 📧 email, 💬 WhatsApp)
- Flujo izquierda → derecha = progreso positivo

#### Principio 3: Control y Libertad del Usuario
> *"Los usuarios frecuentemente eligen funciones por error."*

**Aplicación en Kanban:**
- Undo después de mover tarjeta
- Confirmación antes de mover a "Perdido"
- Capacidad de mover hacia atrás en el pipeline
- Escape cancela drag operation

#### Principio 4: Consistencia y Estándares
> *"Los usuarios no deberían preguntarse si diferentes palabras, situaciones o acciones significan lo mismo."*

**Aplicación en Kanban:**
- Mismo patrón visual para Leads, Oportunidades y Clientes
- Mismo sistema de colores para prioridad/estado
- Quick actions consistentes en todas las tarjetas
- Gestos móviles estandarizados

#### Principio 5: Prevención de Errores
> *"Mejor que buenos mensajes de error es un diseño cuidadoso que prevenga problemas."*

**Aplicación en Kanban:**
- Validación visual de drop válido/inválido
- WIP limits con feedback visual
- Confirmación para acciones destructivas
- Drop zones claramente definidas

#### Principio 6: Reconocimiento sobre Memoria
> *"Minimizar la carga de memoria del usuario."*

**Aplicación en Kanban:**
- Información clave visible en tarjeta (nombre, monto, score)
- Color-coding consistente
- Iconos con tooltips
- Historial de actividad visible

### 5.2 Modelo Mental del Usuario

```
┌──────────────────────────────────────────────────────────────────────────┐
│                     MODELO MENTAL DEL VENDEDOR                           │
├──────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  "¿Qué tengo que hacer ahora?"                                          │
│     └─→ Tarjetas con acciones pendientes resaltadas                     │
│                                                                          │
│  "¿Cuánto dinero tengo en pipeline?"                                    │
│     └─→ Totales visibles por stage y general                            │
│                                                                          │
│  "¿Qué deals necesitan atención urgente?"                               │
│     └─→ Priorización visual por score, tiempo estancado                 │
│                                                                          │
│  "¿Cómo va mi mes?"                                                     │
│     └─→ KPIs en header: conversión, valor ganado, pendiente             │
│                                                                          │
│  "¿Cuál es el siguiente paso con este cliente?"                         │
│     └─→ Quick actions + notas visibles en tarjeta                       │
│                                                                          │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Arquitectura del Kanban

### 6.1 Estructura de Columnas por Módulo

#### Módulo: LEADS

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│   NUEVO     │ CONTACTADO  │ INTERESADO  │  CALIFICADO │  PROPUESTA  │  CONVERTIDO │
│   (inbox)   │  (seguim.)  │  (warm)     │   (hot)     │  (cierre)   │   (won)     │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│             │             │             │             │             │             │
│  Score:     │  Score:     │  Score:     │  Score:     │  Score:     │  Score:     │
│  0-30       │  31-50      │  51-70      │  71-85      │  86-99      │  100        │
│             │             │             │             │             │             │
│  Color:     │  Color:     │  Color:     │  Color:     │  Color:     │  Color:     │
│  Slate      │  Blue       │  Amber      │  Orange     │  Rose       │  Emerald    │
│             │             │             │             │             │             │
│  Acción     │  Acción     │  Acción     │  Acción     │  Acción     │  Acción     │
│  esperada:  │  esperada:  │  esperada:  │  esperada:  │  esperada:  │  esperada:  │
│  Contactar  │  Follow-up  │  Presentar  │  Enviar     │  Negociar   │  Convertir  │
│             │             │             │  propuesta  │             │  a Opp/Cli  │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

#### Módulo: OPORTUNIDADES

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  DISCOVERY  │  QUALIFIED  │  PROPOSAL   │ NEGOTIATION │    WON      │    LOST     │
│    10%      │    30%      │    50%      │    70%      │   100%      │    0%       │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│             │             │             │             │             │             │
│  Forecast:  │  Forecast:  │  Forecast:  │  Forecast:  │  Cerrado    │  Análisis   │
│  Valor×10%  │  Valor×30%  │  Valor×50%  │  Valor×70%  │  real       │  de pérdida │
│             │             │             │             │             │             │
│  Entrada:   │  Entrada:   │  Entrada:   │  Entrada:   │  Entrada:   │  Entrada:   │
│  Nuevo lead │  Demo       │  Propuesta  │  Objeciones │  Contrato   │  Razón de   │
│  calificado │  realizado  │  enviada    │  resueltas  │  firmado    │  pérdida    │
│             │             │             │             │             │             │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

#### Módulo: CLIENTES (Lifecycle)

```
┌─────────────┬─────────────┬─────────────┬─────────────┬─────────────┬─────────────┐
│  ONBOARDING │   ACTIVO    │  CRECIENDO  │  EN RIESGO  │  RENOVACIÓN │   CHURNED   │
│   (nuevo)   │  (healthy)  │  (upsell)   │  (at-risk)  │  (renewal)  │   (lost)    │
├─────────────┼─────────────┼─────────────┼─────────────┼─────────────┼─────────────┤
│             │             │             │             │             │             │
│  Health:    │  Health:    │  Health:    │  Health:    │  Health:    │  Health:    │
│  Neutral    │  Excelente  │  Excelente  │  Crítico    │  Variable   │  N/A        │
│             │             │             │             │             │             │
│  Acción:    │  Acción:    │  Acción:    │  Acción:    │  Acción:    │  Acción:    │
│  Setup      │  Mantener   │  Proponer   │  Rescatar   │  Renovar    │  Win-back   │
│  completo   │  relación   │  upgrade    │  cuenta     │  contrato   │  campaign   │
│             │             │             │             │             │             │
│  Métrica:   │  Métrica:   │  Métrica:   │  Métrica:   │  Métrica:   │  Métrica:   │
│  % setup    │  MRR        │  NRR        │  Churn risk │  Days to    │  Recovery   │
│  complete   │             │  potential  │  score      │  renewal    │  rate       │
└─────────────┴─────────────┴─────────────┴─────────────┴─────────────┴─────────────┘
```

### 6.2 Anatomía de Tarjeta Kanban

```
┌─────────────────────────────────────────────────────────────────────────┐
│ ┌─────────────────────────────────────────────────────────────────────┐ │
│ │ [DRAG HANDLE] ═══════════════════════════════════════ [SCORE: 85] │ │
│ │                                                                     │ │
│ │  ┌─────────┐                                                        │ │
│ │  │ AVATAR  │  EMPRESA / NOMBRE                          ⋮ (menu)   │ │
│ │  │   /     │  Contacto Principal                                    │ │
│ │  │ INICIAL │  contacto@email.com                                    │ │
│ │  └─────────┘                                                        │ │
│ │                                                                     │ │
│ │  ┌───────────────────────────────────────────────────────────────┐  │ │
│ │  │ 💰 $45,000 MXN           📅 Cierre: 15 Dic                   │  │ │
│ │  │ 📍 CDMX                  ⏱️ 5 días en esta etapa             │  │ │
│ │  └───────────────────────────────────────────────────────────────┘  │ │
│ │                                                                     │ │
│ │  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────────────────────┐   │ │
│ │  │ 🏷️ Web  │ │ 🏷️ B2B  │ │ 🏷️ Hot  │ │ [PRIORITY INDICATOR]   │   │ │
│ │  └─────────┘ └─────────┘ └─────────┘ └─────────────────────────┘   │ │
│ │                                                                     │ │
│ │  ═══════════════════════════════════════════════════════════════   │ │
│ │                                                                     │ │
│ │  ┌─────────┐  ┌─────────┐  ┌─────────┐  ┌─────────┐                │ │
│ │  │   📞    │  │   ✉️    │  │   💬    │  │   📝    │  ← Quick      │ │
│ │  │ Llamar  │  │  Email  │  │WhatsApp │  │  Nota   │    Actions    │ │
│ │  └─────────┘  └─────────┘  └─────────┘  └─────────┘                │ │
│ │                                                                     │ │
│ └─────────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────┘

ESPECIFICACIONES DE TARJETA:
├─ Width: clamp(280px, 20vw, 320px)
├─ Padding: 12-16px
├─ Border-radius: 12px (var(--radius-xl))
├─ Shadow: elevation-sm (normal) → elevation-md (hover) → elevation-lg (drag)
├─ Transition: 200ms ease-out
├─ Score indicator: Barra de progreso horizontal con gradiente
└─ Quick actions: Aparecen en hover (desktop) / Siempre visibles (mobile)
```

### 6.3 Información por Tipo de Tarjeta

| Campo | Lead | Oportunidad | Cliente |
|-------|------|-------------|---------|
| **Header** | Empresa | Deal Name | Empresa |
| **Subheader** | Contacto | Cliente asociado | Contacto principal |
| **Métrica $** | Valor estimado | Valor deal | MRR / ARR |
| **Fecha** | Próximo follow-up | Fecha cierre esperado | Próxima renovación |
| **Score** | Lead Score (0-100) | Probabilidad (%) | Health Score |
| **Tags** | Fuente, Industria | Productos, Competencia | Tier, Plan |
| **Quick Actions** | 📞📧💬📝 | 📞📧💬📝🎯 | 📞📧💬📝📊 |

---

**Anterior:** [01-RESEARCH_AND_BENCHMARK.md](./01-RESEARCH_AND_BENCHMARK.md)
**Siguiente:** [03-UX_FLOWS.md](./03-UX_FLOWS.md)

# Guía UX/UI para Módulo Kanban CRM
## Ventazo CRM - Leads, Clientes y Oportunidades

**Versión:** 1.0
**Fecha:** Diciembre 2025
**Autor:** Equipo de Producto Ventazo
**Basado en:** Investigación de mercado y mejores prácticas UX 2024-2025

---

## Tabla de Contenidos

1. [Resumen Ejecutivo](#1-resumen-ejecutivo)
2. [Investigación de Mercado](#2-investigación-de-mercado)
3. [Análisis de Pain Points](#3-análisis-de-pain-points)
4. [Benchmark Competitivo](#4-benchmark-competitivo)
5. [Principios de Diseño UX](#5-principios-de-diseño-ux)
6. [Arquitectura del Kanban](#6-arquitectura-del-kanban)
7. [UX Flows de Alto Nivel](#7-ux-flows-de-alto-nivel)
8. [Reglas de Negocio y Automatizaciones](#8-reglas-de-negocio-y-automatizaciones)
9. [Sistema de Priorización y Color](#9-sistema-de-priorización-y-color)
10. [Diseño Responsive y Móvil](#10-diseño-responsive-y-móvil)
11. [Accesibilidad (WCAG)](#11-accesibilidad-wcag)
12. [Métricas UX Clave](#12-métricas-ux-clave)
13. [Roadmap de Implementación](#13-roadmap-de-implementación)
14. [Referencias y Fuentes](#14-referencias-y-fuentes)

---

## 1. Resumen Ejecutivo

### Insights Clave de Investigación

| Hallazgo | Dato | Implicación para UX |
|----------|------|---------------------|
| **Adopción CRM** | 74.5% de organizaciones usan CRM (↑18.9% vs 2023) | El mercado está maduro; diferenciación por UX es crítica |
| **Tasa de Fallo** | 30-70% de implementaciones CRM fallan | Baja adopción es la causa principal; UX simple es esencial |
| **Pain Point #1** | 73% considera que entrada de datos consume demasiado tiempo | Automatización y quick actions son prioritarios |
| **Cambio de CRM** | 20% cambiaron por CRM "no amigable" | UX intuitivo es factor decisivo de retención |
| **ROI** | $8.71 por cada $1 invertido en CRM | Métricas de productividad justifican inversión UX |
| **Tiempo de setup** | Pipedrive: 1-3 días, HubSpot: 1-2 semanas, Salesforce: 4-16 semanas | Simplicidad = adopción rápida |

### Conclusión Principal

> **Un módulo Kanban exitoso debe priorizar la velocidad de acción sobre la complejidad de configuración.** Los usuarios de CRM valoran: visualización inmediata del estado, acciones de 1-2 clics, y feedback visual claro de progreso.

---

## 2. Investigación de Mercado

### 2.1 Tamaño y Crecimiento del Mercado CRM

```
2024: $101.41 billion
2032: $262.74 billion (proyección)
CAGR: ~12.5%
```

**Segmentación por tamaño de empresa:**
- 91% de empresas con 11+ empleados usan CRM
- 50% de pequeñas empresas (<10 empleados) usan CRM
- 65% implementan CRM en los primeros 5 años de operación

### 2.2 Tendencias 2024-2025

| Tendencia | Adopción | Impacto en Kanban |
|-----------|----------|-------------------|
| **IA Generativa** | 65% ya adoptaron | Scoring automático, sugerencias de próximo paso |
| **Mobile-First** | 78% acceden desde móvil | Touch-friendly drag & drop, gestos nativos |
| **Automatización** | 94% reportan ↑ productividad | Triggers automáticos entre columnas |
| **Visualización Pipeline** | Top 3 feature solicitado | Kanban como vista principal |

### 2.3 Impacto de Productividad

- **44%** experimentan aumento de 10-29% en productividad
- **43%** reportan reducción de 5-10 horas/semana en carga laboral
- **94%** reportan incremento en productividad de ventas

---

## 3. Análisis de Pain Points

### 3.1 Pain Points Identificados en Usuarios CRM

```
┌─────────────────────────────────────────────────────────────────┐
│  PAIN POINTS DE USUARIOS CRM (Ordenados por Severidad)         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  73% ████████████████████████████████████░░░░░ Entrada manual   │
│       de datos consume demasiado tiempo                         │
│                                                                 │
│  42% ██████████████████████░░░░░░░░░░░░░░░░░░░ Falta de         │
│       entrenamiento o expertise                                 │
│                                                                 │
│  32% ██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░ Falta de         │
│       expertise técnico                                         │
│                                                                 │
│  30% █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Herramientas     │
│       ineficientes                                              │
│                                                                 │
│  25% ███████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Entrenamiento    │
│       y adopción                                                │
│                                                                 │
│  23% ██████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Problemas con    │
│       entrada manual                                            │
│                                                                 │
│  20% █████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Interfaz no      │
│       amigable                                                  │
│                                                                 │
│  17% ███████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ Integración      │
│       con otras herramientas                                    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Soluciones UX por Pain Point

| Pain Point | Solución UX en Kanban |
|------------|----------------------|
| **Entrada manual excesiva** | Quick actions en tarjeta, auto-fill, drag & drop entre columnas actualiza automáticamente |
| **Falta de entrenamiento** | Onboarding progresivo, tooltips contextuales, empty states educativos |
| **Herramientas ineficientes** | Acciones de 1-2 clics máximo, shortcuts de teclado, batch actions |
| **Interfaz no amigable** | Visual claro de pipeline, colores semánticos, priorización visual |
| **Integración deficiente** | Acciones directas a WhatsApp/Email/Llamada desde tarjeta |

---

## 4. Benchmark Competitivo

### 4.1 Análisis de Líderes del Mercado

#### Pipedrive
**Filosofía:** "Sales-first, visual pipeline"

| Fortaleza | Implementación |
|-----------|----------------|
| Pipeline visual Kanban | Vista predeterminada, no requiere configuración |
| Drag & drop nativo | Cambio de etapa = 1 acción |
| Mobile-first | App construida para móvil, no adaptada |
| Colores y etiquetas | Stages, etiquetas y montos visibles |

**Tiempo de implementación:** 1-3 días

#### HubSpot
**Filosofía:** "Ecosistema integrado con UX limpio"

| Fortaleza | Implementación |
|-----------|----------------|
| UX score 8.7/10 (G2) | Interfaz moderna, patrones convencionales |
| Procesos multi-equipo | Tabla y Kanban switchable |
| Drag & drop por fases | Edición de fases asignación de tareas |
| Ambiente integrado | Marketing + Sales + Service |

**Tiempo de implementación:** 1-2 semanas

#### Salesforce
**Filosofía:** "Flexibilidad enterprise"

| Fortaleza | Implementación |
|-----------|----------------|
| Row grouping | Dividir por producto, región, tamaño |
| Collapse de stages | Ocultar etapas irrelevantes |
| Validaciones | Reglas de aprobación y condicionales |
| Potencia | Extremadamente configurable |

**Tiempo de implementación:** 4-16 semanas

### 4.2 Matriz de Features Kanban

| Feature | Pipedrive | HubSpot | Salesforce | **Ventazo (Target)** |
|---------|-----------|---------|------------|---------------------|
| Drag & Drop | ✅ | ✅ | ✅ | ✅ |
| Quick Actions en Card | ✅ | ⚠️ | ⚠️ | ✅ |
| Score Visual | ⚠️ | ⚠️ | ⚠️ | ✅ |
| Mobile Native | ✅ | ⚠️ | ❌ | ✅ |
| WIP Limits | ❌ | ❌ | ❌ | ✅ |
| Keyboard A11y | ⚠️ | ⚠️ | ✅ | ✅ |
| Collapse Stages | ❌ | ❌ | ✅ | ✅ |
| Color por Prioridad | ✅ | ✅ | ⚠️ | ✅ |
| Tiempo en Stage | ⚠️ | ✅ | ✅ | ✅ |
| Touch Haptics | ❌ | ❌ | ❌ | ✅ |

**Leyenda:** ✅ Excelente | ⚠️ Básico | ❌ No disponible

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

## 7. UX Flows de Alto Nivel

### 7.1 Flow: Lead Journey (Captación → Conversión)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           LEAD JOURNEY UX FLOW                                  │
└─────────────────────────────────────────────────────────────────────────────────┘

     ┌──────────┐
     │  ENTRADA │
     │  DE LEAD │
     └────┬─────┘
          │
          ▼
    ┌───────────────┐
    │ Formulario    │ ←──── Website, WhatsApp, Import CSV, Manual
    │ de captura    │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐     ┌────────────────────────────────────────┐
    │  KANBAN:      │     │ AUTO-ACTIONS:                          │
    │  Columna      │────▶│ • AI Score inicial                     │
    │  "NUEVO"      │     │ • Asignación automática                │
    └───────┬───────┘     │ • Notificación a owner                 │
            │             │ • Enriquecimiento de datos (opcional)  │
            │             └────────────────────────────────────────┘
            ▼
    ┌───────────────┐
    │  QUICK ACTION │
    │  📞 Llamar    │
    └───────┬───────┘
            │
            ▼
    ┌───────────────┐     ┌────────────────────────────────────────┐
    │  DRAG & DROP  │     │ VALIDACIÓN:                            │
    │  a columna    │────▶│ • ¿Tiene teléfono? → Permitir          │
    │  "CONTACTADO" │     │ • ¿No tiene? → Modal "Agregar teléfono"│
    └───────┬───────┘     └────────────────────────────────────────┘
            │
            ▼
    ┌───────────────┐
    │  AUTO-UPDATE  │
    │  • Score ↑    │
    │  • Timestamp  │
    │  • Activity   │
    └───────┬───────┘
            │
            ▼
        ┌───────────────────────────────────────┐
        │                                       │
        ▼                                       ▼
┌───────────────┐                     ┌───────────────┐
│  INTERESADO   │                     │   PERDIDO     │
│  (warm lead)  │                     │ (no interés)  │
└───────┬───────┘                     └───────────────┘
        │
        ▼
┌───────────────┐     ┌────────────────────────────────────────┐
│  DRAG & DROP  │     │ TRIGGER:                               │
│  a columna    │────▶│ • Score > 70                           │
│  "CALIFICADO" │     │ • Modal "¿Crear Oportunidad?"          │
└───────┬───────┘     │ • Si acepta: convertir automáticamente │
        │             └────────────────────────────────────────┘
        │
        ▼
┌───────────────┐
│  CONVERTIDO   │────────────────────▶ Nuevo registro en OPORTUNIDADES
│  a Oportunidad│                      con datos pre-llenados
└───────────────┘
```

### 7.2 Flow: Opportunity Journey (Pipeline de Ventas)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        OPPORTUNITY PIPELINE UX FLOW                             │
└─────────────────────────────────────────────────────────────────────────────────┘

   DISCOVERY (10%)          QUALIFIED (30%)          PROPOSAL (50%)
        │                        │                        │
        ▼                        ▼                        ▼
   ┌─────────┐              ┌─────────┐              ┌─────────┐
   │ ○ Demo  │──────drag───▶│ ○ Need  │──────drag───▶│ ○ Sent  │
   │   scheduled             │   confirmed            │   proposal
   └────┬────┘              └────┬────┘              └────┬────┘
        │                        │                        │
   Quick Actions:           Quick Actions:           Quick Actions:
   • Schedule demo          • Send proposal          • Follow up
   • Send info              • Qualify budget         • Update proposal
   • Add notes              • Identify decision      • Schedule call
                              maker

        │                        │                        │
        ▼                        ▼                        ▼
   ═══════════════════════════════════════════════════════════
                              │
                              ▼
                    NEGOTIATION (70%)
                              │
                              ▼
                       ┌─────────┐
                       │ ○ Terms │
                       │   under │
                       │   review│
                       └────┬────┘
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
      ┌─────────┐                     ┌─────────┐
      │   WON   │                     │  LOST   │
      │  100%   │                     │   0%    │
      └────┬────┘                     └────┬────┘
           │                               │
           ▼                               ▼
   ┌───────────────┐              ┌───────────────┐
   │ TRIGGER:      │              │ TRIGGER:      │
   │ • Crear       │              │ • Reason      │
   │   Customer    │              │   modal       │
   │ • Celebration │              │ • Learn from  │
   │   animation   │              │   loss        │
   │ • Send email  │              │ • Future      │
   │   de gracias  │              │   follow-up   │
   └───────────────┘              └───────────────┘
```

### 7.3 Flow: Customer Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         CUSTOMER LIFECYCLE UX FLOW                              │
└─────────────────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │   NUEVO CLIENTE     │
                    │   (desde Opp WON)   │
                    └──────────┬──────────┘
                               │
                               ▼
┌──────────────────────────────────────────────────────────────────────────────────┐
│  ONBOARDING                                                                      │
│  ┌────────────────────────────────────────────────────────────────────────────┐ │
│  │ Progress Bar: ████████░░░░░░░░░░░░ 40%                                     │ │
│  │                                                                             │ │
│  │ Checklist:                                                                  │ │
│  │ ✅ Contrato firmado                                                         │ │
│  │ ✅ Pago inicial recibido                                                    │ │
│  │ ⬜ Kickoff meeting                                                          │ │
│  │ ⬜ Setup completado                                                         │ │
│  │ ⬜ Entrenamiento realizado                                                  │ │
│  └────────────────────────────────────────────────────────────────────────────┘ │
└──────────────────────────────────────────────────────────────────────────────────┘
                               │
                               │ (Checklist 100%)
                               ▼
                    ┌─────────────────────┐
                    │      ACTIVO         │
                    │   Health: ████████  │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
   ┌─────────────┐      ┌─────────────┐      ┌─────────────┐
   │  CRECIENDO  │      │  EN RIESGO  │      │ RENOVACIÓN  │
   │  NRR: 120%  │      │  Health:██░ │      │  30 días    │
   │             │      │             │      │  para vencer│
   └──────┬──────┘      └──────┬──────┘      └──────┬──────┘
          │                    │                    │
          │                    │                    │
   Quick Actions:        Quick Actions:        Quick Actions:
   • Propose upsell      • Health check call   • Renewal proposal
   • Case study          • Escalate            • Review terms
   • Referral ask        • Special offer       • Schedule meeting
          │                    │                    │
          └────────────────────┴────────────────────┘
                               │
                               ▼
                    ┌─────────────────────┐
                    │      CHURNED        │
                    │   (Win-back pool)   │
                    └─────────────────────┘
```

---

## 8. Reglas de Negocio y Automatizaciones

### 8.1 Triggers Automáticos por Módulo

#### LEADS

| Trigger | Condición | Acción |
|---------|-----------|--------|
| **Auto-assign** | Nuevo lead creado | Asignar a vendedor según región/round-robin |
| **Score Update** | Cualquier actividad | Recalcular lead score |
| **Stage Auto-advance** | Score > threshold | Sugerir mover a siguiente stage |
| **Stale Lead Alert** | Sin actividad 7 días | Notificar owner, highlight en UI |
| **Hot Lead Alert** | Score > 85 | Badge "HOT", notificación push |
| **Convert Suggestion** | Score = 100 | Modal "Convertir a Oportunidad" |
| **Duplicate Check** | Email/teléfono existente | Warning antes de crear |

#### OPORTUNIDADES

| Trigger | Condición | Acción |
|---------|-----------|--------|
| **Probability Auto-set** | Cambio de stage | Actualizar probabilidad según stage |
| **Forecast Update** | Cambio valor/probabilidad | Recalcular forecast |
| **Stale Deal Alert** | Sin movimiento 14 días | Highlight amarillo, notificar |
| **Close Date Warning** | 7 días para cierre | Badge "Urgente" |
| **Win Celebration** | Stage = WON | Confetti animation, notificación equipo |
| **Loss Analysis** | Stage = LOST | Modal obligatorio de razón de pérdida |
| **Customer Creation** | Stage = WON confirmado | Crear registro de cliente automáticamente |

#### CLIENTES

| Trigger | Condición | Acción |
|---------|-----------|--------|
| **Health Score Update** | Actividad/inactividad | Recalcular health automáticamente |
| **At-Risk Alert** | Health < 40 | Mover a "En Riesgo", notificar AM |
| **Renewal Reminder** | 90/60/30 días antes | Mover a "Renovación", notificar |
| **Upsell Trigger** | Usage > 80% límite | Badge "Upsell", sugerir upgrade |
| **Churn Prediction** | Pattern de desengagement | AI prediction, acción preventiva |
| **NPS Trigger** | 90 días desde último NPS | Enviar encuesta automática |

### 8.2 Validaciones de Movimiento en Kanban

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      REGLAS DE VALIDACIÓN DE DRAG & DROP                        │
└─────────────────────────────────────────────────────────────────────────────────┘

LEADS:
├─ Nuevo → Contactado: ✅ Permitido siempre
├─ Contactado → Nuevo: ⚠️ Warning "¿Estás seguro? Se perderá el historial"
├─ Cualquiera → Convertido: 🔒 Requiere Score > 70 O override manual
├─ Cualquiera → Perdido: 📝 Requiere razón de pérdida
└─ Perdido → Cualquiera: ✅ Permitido (reactivación)

OPORTUNIDADES:
├─ Discovery → Qualified: ✅ Permitido
├─ Qualified → Proposal: 📝 Requiere documento de propuesta adjunto
├─ Proposal → Negotiation: ✅ Permitido
├─ Cualquiera → Won: 📝 Requiere valor final, fecha cierre
├─ Cualquiera → Lost: 📝 Requiere razón de pérdida (obligatorio)
├─ Won/Lost → Cualquiera: 🔒 Bloqueado (deals cerrados no se reabren)
└─ Skip stages: ⚠️ Warning "Saltarás etapas del proceso"

CLIENTES:
├─ Onboarding → Activo: 📝 Requiere checklist completo al 100%
├─ Activo → En Riesgo: ⚠️ Confirmación + plan de acción
├─ En Riesgo → Activo: ✅ Permitido (rescate exitoso)
├─ Cualquiera → Churned: 🔒 Requiere aprobación de manager
└─ Churned → Activo: 📝 Requiere nuevo contrato
```

### 8.3 WIP Limits (Work In Progress)

| Módulo | Columna | WIP Limit Sugerido | Justificación |
|--------|---------|-------------------|---------------|
| Leads | Nuevo | 50 | Evitar acumulación sin procesar |
| Leads | Contactado | 30 | Forzar follow-up activo |
| Leads | Calificado | 20 | Conversión rápida a Oportunidad |
| Opportunities | Proposal | 15 | Evitar propuestas sin seguimiento |
| Opportunities | Negotiation | 10 | Focus en cierre |
| Customers | Onboarding | 10 | Calidad de onboarding |
| Customers | En Riesgo | 5 | Atención urgente |

**Comportamiento UI cuando se alcanza WIP Limit:**
1. Columna muestra badge de warning "Límite alcanzado"
2. Intentar agregar más items muestra modal explicativo
3. Override posible con justificación
4. Métricas registran excepciones de WIP

---

## 9. Sistema de Priorización y Color

### 9.1 Paleta de Colores Semánticos

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    SISTEMA DE COLORES KANBAN                                    │
└─────────────────────────────────────────────────────────────────────────────────┘

COLORES DE STAGE (Progresión visual izquierda → derecha)
═══════════════════════════════════════════════════════

Leads Pipeline:
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│  Slate   │  Blue    │  Amber   │  Orange  │  Rose    │ Emerald  │
│  (frio)  │  (tibio) │  (warm)  │  (hot)   │ (closing)│  (won)   │
│ #64748b  │ #3b82f6  │ #f59e0b  │ #f97316  │ #f43f5e  │ #10b981  │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

Opportunities Pipeline:
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│  Indigo  │   Cyan   │  Violet  │  Fuchsia │ Emerald  │   Red    │
│(discovery│(qualified│(proposal)│(negotiat)│   (won)  │  (lost)  │
│ #6366f1  │ #06b6d4  │ #8b5cf6  │ #d946ef  │ #10b981  │ #ef4444  │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘

Customer Lifecycle:
┌──────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│  Yellow  │  Green   │   Teal   │  Orange  │   Amber  │   Gray   │
│(onboard) │ (active) │ (growing)│ (at-risk)│(renewal) │(churned) │
│ #eab308  │ #22c55e  │ #14b8a6  │ #f97316  │ #f59e0b  │ #6b7280  │
└──────────┴──────────┴──────────┴──────────┴──────────┴──────────┘


COLORES DE PRIORIDAD (Aplicados a badge/indicator)
═══════════════════════════════════════════════════

Score 0-30:    ░░░░░░░░░░  Slate     #64748b   (Cold)
Score 31-50:   ████░░░░░░  Blue      #3b82f6   (Cool)
Score 51-70:   ██████░░░░  Amber     #f59e0b   (Warm)
Score 71-85:   ████████░░  Orange    #f97316   (Hot)
Score 86-99:   █████████░  Rose      #f43f5e   (Very Hot)
Score 100:     ██████████  Emerald   #10b981   (Converted)


COLORES DE ESTADO/ACCIÓN
═══════════════════════════

✅ Success/Won:     Emerald   #10b981
❌ Error/Lost:      Red       #ef4444
⚠️ Warning/Risk:    Amber     #f59e0b
ℹ️ Info/Neutral:    Blue      #3b82f6
⏳ Pending:         Yellow    #eab308
🔄 In Progress:     Cyan      #06b6d4


COLORES DE HEALTH (Clientes)
═══════════════════════════════

Health 90-100:  ██████████  Emerald   #10b981   (Excellent)
Health 70-89:   ████████░░  Green     #22c55e   (Good)
Health 50-69:   ██████░░░░  Yellow    #eab308   (Fair)
Health 30-49:   ████░░░░░░  Orange    #f97316   (Poor)
Health 0-29:    ██░░░░░░░░  Red       #ef4444   (Critical)
```

### 9.2 Aplicación de Color en Tarjetas

```
┌─────────────────────────────────────────────────────────────────┐
│  TARJETA: Aplicación de colores                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │ ████ (Stage Color Accent Bar - 4px top border)             ││
│  │                                                             ││
│  │  [Avatar]  Company Name              [Score Badge ████ 85] ││
│  │            Contact Name                                     ││
│  │                                                             ││
│  │  💰 $45,000    📅 15 Dic                                   ││
│  │                                                             ││
│  │  ┌──────┐ ┌──────┐ ┌──────┐                                ││
│  │  │ Web  │ │ B2B  │ │ Hot ●│  ← Tag con dot de color       ││
│  │  └──────┘ └──────┘ └──────┘                                ││
│  │                                                             ││
│  │  ─────────────────────────────────────────                 ││
│  │  [📞] [✉️] [💬] [📝]  ← Icons en color muted              ││
│  │                                                             ││
│  └─────────────────────────────────────────────────────────────┘│
│                                                                 │
│  ESTADOS VISUALES:                                             │
│  • Normal: bg-card, shadow-sm                                  │
│  • Hover: shadow-md, scale(1.01)                               │
│  • Dragging: shadow-lg, scale(1.02), opacity(0.9)              │
│  • Over valid target: ring-2 ring-emerald-500                  │
│  • Over invalid target: ring-2 ring-red-500, shake animation   │
│  • Moving (loading): pulsing opacity animation                 │
│  • Stale (7+ days): left border amber-400, subtle amber tint   │
│  • Overdue: left border red-400, subtle red tint               │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 9.3 Accesibilidad del Color

| Elemento | Contraste Mínimo | Implementación |
|----------|------------------|----------------|
| Texto sobre fondo | 4.5:1 (AA) | Usar `text-foreground` siempre |
| Iconos funcionales | 3:1 (AA) | No depender solo del color |
| Badges | 4.5:1 para texto | Incluir texto descriptivo |
| Score bar | N/A visual | Incluir aria-label con valor numérico |
| Estado de tarjeta | 3:1 para bordes | Usar forma + color (border + icon) |

**Regla de Oro:** Nunca usar el color como único diferenciador. Siempre combinar con:
- Texto descriptivo
- Iconografía
- Posición/forma
- Pattern (stripes para stale items)

---

## 10. Diseño Responsive y Móvil

### 10.1 Breakpoints y Comportamiento

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RESPONSIVE BEHAVIOR BY BREAKPOINT                            │
└─────────────────────────────────────────────────────────────────────────────────┘

MOBILE (< 640px)
═══════════════════════════════════════════════════════════════════════════════════

Layout:
• Columnas en scroll horizontal snap
• Una columna visible a la vez
• Dots indicator de posición
• Swipe para navegar entre columnas

Tarjetas:
• Full width de columna
• Quick actions siempre visibles (bottom bar)
• Touch-friendly sizing (min 44px targets)

Drag & Drop:
• Long-press (300ms) para iniciar drag
• Haptic feedback al grab/drop
• "Move to..." button como alternativa
• Drop zones expandidas (+20% área)

Header:
• Nombre de stage visible
• Conteo y total colapsables
• Botón hamburger para filtros

┌─────────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ ← NUEVO (12)                                    ≡ │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                             │ │
│  │  [Tarjeta 1 - Full Width]                                                  │ │
│  │                                                                             │ │
│  │  ───────────────────────────                                               │ │
│  │  [📞] [✉️] [💬] [📝] [⋮]                                                   │ │
│  │                                                                             │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                             │ │
│  │  [Tarjeta 2 - Full Width]                                                  │ │
│  │                                                                             │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ● ○ ○ ○ ○ ○  (stage indicators)                                               │
│                                                                                   │
│  [+] Agregar Lead (FAB)                                                         │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘


TABLET (640px - 1024px)
═══════════════════════════════════════════════════════════════════════════════════

Layout:
• 2-3 columnas visibles
• Scroll horizontal libre
• Headers visibles completos

Tarjetas:
• Width reducido (280px)
• Quick actions en hover + menu
• Touch areas estándar (44px)

Drag & Drop:
• Tap para iniciar (no long-press)
• Scroll automático en bordes


DESKTOP (> 1024px)
═══════════════════════════════════════════════════════════════════════════════════

Layout:
• Todas las columnas visibles (scroll si necesario)
• Columnas con width responsivo: clamp(280px, 20vw, 320px)
• Panel lateral para preview (opcional)

Tarjetas:
• Información completa visible
• Quick actions en hover
• Keyboard navigation completa

Drag & Drop:
• Click + drag estándar
• Multi-select con Shift/Cmd
• Scroll automático suave

Additional Features:
• Collapse/expand columnas
• Resize de columnas
• Split view (Kanban + Table)
```

### 10.2 Gestos Móviles

| Gesto | Acción | Feedback |
|-------|--------|----------|
| **Tap** | Abrir detalle de tarjeta | Ripple effect |
| **Long-press** | Iniciar drag | Haptic bump, scale up |
| **Swipe horizontal** | Cambiar columna visible | Snap animation |
| **Swipe tarjeta (izq)** | Quick action menu | Reveal buttons |
| **Swipe tarjeta (der)** | Marcar completado/archivar | Green slide |
| **Pull-to-refresh** | Actualizar datos | Loader animation |
| **Pinch** | Zoom out (ver más columnas) | Scale transform |

### 10.3 Touch Target Sizes

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      TOUCH TARGETS (WCAG 2.2 Compliant)                         │
└─────────────────────────────────────────────────────────────────────────────────┘

Mínimo requerido: 44 × 44 pixels (iOS/Android HIG)
Recomendado: 48 × 48 pixels

Aplicación en Kanban:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│   ┌────────────────┐      ← Drag handle: 48px height, full card width         │
│   │ ═══════════════│                                                          │
│   └────────────────┘                                                          │
│                                                                                │
│   ┌──────┐                ← Avatar/Logo: 48×48px clickable                    │
│   │      │                                                                     │
│   └──────┘                                                                     │
│                                                                                │
│   ┌────────────────────┐  ← Menu button: 48×48px touch area                   │
│   │         ⋮          │    (visual icon puede ser 24×24)                     │
│   └────────────────────┘                                                       │
│                                                                                │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                                         │
│   │  📞  │ │  ✉️  │ │  💬  │ │  📝  │  ← Quick actions: 48×48px cada uno      │
│   └──────┘ └──────┘ └──────┘ └──────┘    con 8px gap mínimo                   │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

Espaciado entre elementos interactivos: mínimo 8px
Área de tap expandida (padding): +12px en cada dirección
```

---

## 11. Accesibilidad (WCAG)

### 11.1 Requisitos de Accesibilidad para Drag & Drop

Basado en [WCAG 2.2 - 2.5.7 Dragging Movements](https://www.w3.org/TR/WCAG22/#dragging-movements):

> "All functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging."

**Implementación requerida:**

1. **Alternativa sin arrastrar:**
   - Botón "Mover a..." que abre selector de columna
   - Menú contextual con opciones de movimiento
   - Keyboard shortcuts (Espacio para grab, Flechas para mover)

2. **Keyboard Navigation:**
   ```
   Tab           → Navegar entre tarjetas
   Enter/Space   → Abrir detalle O iniciar grab mode
   Flechas ↑↓    → Mover dentro de columna (en grab mode)
   Flechas ←→    → Mover entre columnas (en grab mode)
   Escape        → Cancelar operación
   ```

3. **Screen Reader Support:**
   ```html
   <!-- Ejemplo de anuncios para screen reader -->

   <div
     role="button"
     aria-roledescription="tarjeta arrastrable"
     aria-describedby="drag-instructions"
   >
     ...
   </div>

   <div id="drag-instructions" class="sr-only">
     Presiona espacio para levantar.
     Usa flechas para mover.
     Presiona espacio para soltar.
   </div>

   <!-- Durante drag -->
   <div aria-live="assertive" class="sr-only">
     "Oportunidad Empresa ABC levantada.
      Posición 3 de 5 en columna Discovery.
      Usa flechas izquierda/derecha para cambiar columna."
   </div>

   <!-- Después de drop -->
   <div aria-live="polite" class="sr-only">
     "Oportunidad Empresa ABC movida a columna Qualified.
      Posición 1 de 8."
   </div>
   ```

### 11.2 Checklist de Accesibilidad Kanban

| Requisito | WCAG | Implementación |
|-----------|------|----------------|
| **Contraste de texto** | 1.4.3 (AA) | Ratio mínimo 4.5:1 para texto normal |
| **Contraste de UI** | 1.4.11 | Ratio 3:1 para componentes interactivos |
| **Target size** | 2.5.5 (AAA) | Mínimo 44×44px para touch targets |
| **Dragging alternative** | 2.5.7 | Botón "Mover a..." disponible |
| **Keyboard operable** | 2.1.1 | Tab, Enter, Space, Arrows funcionales |
| **Focus visible** | 2.4.7 | Ring de focus claramente visible |
| **Focus order** | 2.4.3 | Orden lógico izquierda→derecha, arriba→abajo |
| **Status messages** | 4.1.3 | aria-live para cambios de estado |
| **Error identification** | 3.3.1 | Mensajes de error claros y descriptivos |
| **Labels** | 1.3.1 | Todos los inputs tienen labels asociados |
| **Motion** | 2.3.3 | Respetar prefers-reduced-motion |

### 11.3 Implementación de Reduced Motion

```css
/* Respetar preferencia de movimiento reducido */
@media (prefers-reduced-motion: reduce) {
  .kanban-card {
    transition: none;
  }

  .drag-overlay {
    animation: none;
    transform: none;
  }

  .celebration-confetti {
    display: none;
  }

  .card-enter-animation {
    animation: none;
    opacity: 1;
  }
}
```

---

## 12. Métricas UX Clave

### 12.1 Métricas de Adopción y Engagement

| Métrica | Definición | Target | Cálculo |
|---------|------------|--------|---------|
| **DAU/MAU Ratio** | Usuarios activos diarios / mensuales | > 40% | Usuarios únicos día / Usuarios únicos mes |
| **Feature Adoption Rate** | % que usan Kanban vs total | > 70% | Usuarios Kanban / Total usuarios ×100 |
| **Stickiness** | Frecuencia de uso | > 3x/semana | Sesiones promedio por usuario por semana |
| **Time to First Value** | Tiempo hasta primera acción de valor | < 5 min | Tiempo desde login hasta primer move/action |
| **Onboarding Completion** | % que completa tutorial | > 80% | Usuarios completados / Usuarios iniciados |

### 12.2 Métricas de Productividad

| Métrica | Definición | Target | Cálculo |
|---------|------------|--------|---------|
| **Actions per Session** | Acciones realizadas por sesión | > 10 | Total acciones / Total sesiones |
| **Drag Operations** | Moves en Kanban por día | > 5 | Conteo de moves exitosos |
| **Quick Action Usage** | Uso de acciones rápidas | > 60% | Acciones desde card / Total acciones |
| **Time in Stage** | Tiempo promedio en cada etapa | Benchmark | Promedio de días por stage |
| **Velocity** | Velocidad de pipeline | ↑ trend | (Opps × Win% × Valor) / Días |

### 12.3 Métricas de Pipeline/Negocio

| Métrica | Definición | Target | Cálculo |
|---------|------------|--------|---------|
| **Lead Conversion Rate** | % Leads que avanzan a Opp | > 25% | Leads convertidos / Total leads |
| **MQL to SQL Rate** | Calificación efectiva | > 13% | SQLs / MQLs ×100 |
| **SQL to Opportunity** | Eficiencia del handoff | > 30% | Oportunidades / SQLs ×100 |
| **Win Rate** | Tasa de cierre | > 20% | Deals ganados / Total deals cerrados |
| **Average Deal Value** | Valor promedio de deals | ↑ trend | Sum valores / Count deals |
| **Sales Cycle Length** | Días promedio para cerrar | ↓ trend | Promedio días Discovery→Won |

### 12.4 Métricas de Calidad UX

| Métrica | Definición | Target | Cálculo |
|---------|------------|--------|---------|
| **Task Success Rate** | % de tareas completadas exitosamente | > 95% | Tareas exitosas / Total intentos |
| **Error Rate** | Acciones que resultan en error | < 2% | Errores / Total acciones |
| **Time on Task** | Tiempo para completar acción común | ↓ trend | Promedio segundos por tarea |
| **NPS (Net Promoter Score)** | Satisfacción del usuario | > 50 | % Promotores - % Detractores |
| **SUS (System Usability Scale)** | Usabilidad general | > 68 | Cuestionario estandarizado |
| **CSAT (Customer Satisfaction)** | Satisfacción puntual | > 4.0/5 | Promedio ratings |

### 12.5 Dashboard de Métricas UX

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    DASHBOARD DE MÉTRICAS UX - KANBAN CRM                        │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  ADOPTION RATE       │  │  FEATURE STICKINESS  │  │  CONVERSION RATE     │
│                      │  │                      │  │                      │
│       73%            │  │      4.2x/week       │  │       28%            │
│       ████████████░░ │  │      █████████░░░░░░ │  │       ██████████░░░░ │
│                      │  │                      │  │                      │
│  Target: 70% ✅      │  │  Target: 3x ✅       │  │  Target: 25% ✅      │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘

┌──────────────────────┐  ┌──────────────────────┐  ┌──────────────────────┐
│  AVG TIME IN STAGE   │  │  DRAG OPS / DAY      │  │  QUICK ACTION USAGE  │
│                      │  │                      │  │                      │
│  Discovery: 3.2 days │  │       8.5            │  │       67%            │
│  Qualified: 5.1 days │  │       █████████░░░░░ │  │       █████████████░ │
│  Proposal:  4.8 days │  │                      │  │                      │
│  Negotiation: 7.2d   │  │  Target: 5 ✅        │  │  Target: 60% ✅      │
└──────────────────────┘  └──────────────────────┘  └──────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  PIPELINE VELOCITY TREND                                                   │
│                                                                            │
│   $│                                                    ●                  │
│   2M├────────────────────────────────────────────●─────────────────        │
│    │                                    ●                                  │
│   1M├────────────────────────●──────────────────────────────────────       │
│    │              ●                                                        │
│  0.5├──────●─────────────────────────────────────────────────────────      │
│    │  ●                                                                    │
│    └──────────────────────────────────────────────────────────────────     │
│       Jan   Feb   Mar   Apr   May   Jun   Jul   Aug   Sep   Oct            │
│                                                                            │
│  Velocity = (Opportunities × Win Rate × Avg Value) / Cycle Days           │
│  Current: $1.8M/month | Target: $2M/month | Trend: ↑ 15%                  │
└────────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────────┐
│  FUNNEL CONVERSION ANALYSIS                                                │
│                                                                            │
│  ████████████████████████████████████████  Leads: 1000                    │
│  ██████████████████████████████            Contacted: 750 (75%)           │
│  ██████████████████████                    Interested: 500 (67%)          │
│  ████████████████                          Qualified: 350 (70%)           │
│  ██████████                                Proposal: 200 (57%)            │
│  ██████                                    Won: 100 (50%)                 │
│                                                                            │
│  Overall Conversion: 10% (Leads → Won)                                    │
│  Biggest Drop-off: Qualified → Proposal (-43%)                            │
│  Recommendation: Mejorar proceso de propuestas                            │
└────────────────────────────────────────────────────────────────────────────┘
```

---

## 13. Roadmap de Implementación

### 13.1 Fases de Desarrollo

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    ROADMAP DE IMPLEMENTACIÓN UX                                 │
└─────────────────────────────────────────────────────────────────────────────────┘

FASE 1: FOUNDATION (Actual - Completada)
═══════════════════════════════════════════════════════════════════════════════════
✅ Kanban básico con drag & drop (dnd-kit)
✅ Sistema de colores dinámico por tenant
✅ Componentes compartidos (PipelineColumn, PipelineHeader)
✅ Quick actions en tarjetas
✅ Score/Health indicators visuales
✅ Responsive básico

FASE 2: ENHANCED UX (Próxima)
═══════════════════════════════════════════════════════════════════════════════════
□ Drop validation con feedback visual (verde/rojo)
□ WIP Limits con UI de warning
□ Collapse/expand de columnas
□ Keyboard navigation completa
□ "Move to..." button (alternativa a drag)
□ Touch gestures mejorados (haptic feedback)
□ Pull-to-refresh en móvil
□ Empty states educativos

FASE 3: AUTOMATION & INTELLIGENCE
═══════════════════════════════════════════════════════════════════════════════════
□ Auto-scoring con AI
□ Suggested next actions
□ Stale item highlighting
□ Duplicate detection
□ Smart assignment
□ Predictive analytics overlay

FASE 4: ADVANCED FEATURES
═══════════════════════════════════════════════════════════════════════════════════
□ Multi-select & batch actions
□ Timeline view toggle
□ Split view (Kanban + Detail)
□ Custom fields en tarjetas
□ Advanced filters & views guardadas
□ Collaboration (mentions, comments)
□ Activity feed en tiempo real

FASE 5: POLISH & DELIGHT
═══════════════════════════════════════════════════════════════════════════════════
□ Micro-interactions refinadas
□ Celebration animations (confetti on win)
□ Onboarding interactivo
□ Tooltips contextuales
□ Keyboard shortcuts guide
□ Dark mode optimization
□ Performance optimization (virtualization)
```

### 13.2 Priorización MoSCoW

| Feature | Must | Should | Could | Won't |
|---------|:----:|:------:|:-----:|:-----:|
| Drop validation visual | ✅ | | | |
| Keyboard navigation | ✅ | | | |
| "Move to..." button | ✅ | | | |
| WIP Limits | | ✅ | | |
| Collapse columnas | | ✅ | | |
| Haptic feedback | | ✅ | | |
| AI scoring | | | ✅ | |
| Multi-select | | | ✅ | |
| Timeline view | | | ✅ | |
| 3D animations | | | | ✅ |

---

## 14. Referencias y Fuentes

### Investigación de Mercado
- [CRM.org - 45 CRM Statistics 2025](https://crm.org/crmland/crm-statistics)
- [Pipeline CRM - 20 CRM Statistics 2025](https://pipelinecrm.com/blog/crm-statistics/)
- [Affinity - CRM Adoption Rates](https://www.affinity.co/blog/crm-adoption-rates)
- [Whatfix - CRM Adoption Guide](https://whatfix.com/blog/crm-adoption/)

### Benchmark Competitivo
- [Pipedrive vs HubSpot vs Salesforce Comparison](https://www.pipedrive.com/en/blog/hubspot-vs-salesforce-vs-pipedrive)
- [Appvizer - CRM Comparison 2025](https://www.appvizer.com/magazine/customer/client-relationship-mgt/pipedrive-vs-hubspot)
- [Salesflare - CRM Comparison Guide](https://blog.salesflare.com/compare-salesforce-zoho-hubspot-pipedrive)

### Mejores Prácticas UX
- [NN/g - Drag and Drop Design](https://www.nngroup.com/articles/drag-drop/)
- [Eleken - Drag and Drop UI Examples](https://www.eleken.co/blog-posts/drag-and-drop-ui)
- [Smart Interface Design Patterns - Drag and Drop UX](https://smart-interface-design-patterns.com/articles/drag-and-drop-ux/)

### Accesibilidad
- [Salesforce - 4 Major Patterns for Accessible Drag and Drop](https://medium.com/salesforce-ux/4-major-patterns-for-accessible-drag-and-drop-1d43f64ebf09)
- [Salesforce Accessible DnD Patterns Library](https://salesforce-ux.github.io/dnd-a11y-patterns/)
- [W3C - Mobile Accessibility Mapping](https://www.w3.org/TR/mobile-accessibility-mapping/)
- [Sparkbox - WCAG 2.2 Dragging Movements](https://sparkbox.com/foundry/understanding_implementing_wcag_dragging_movements_accessibility)

### Kanban y Sales Pipeline
- [Pipeline CRM - Kanban for Sales](https://pipelinecrm.com/features/kanban/)
- [IxDF - Kanban Boards](https://www.interaction-design.org/literature/topics/kanban-boards)
- [Ninox - Dynamic Kanban for Lead Management](https://ninox.com/en/blog/lead-management-dynamic-kanban-boards)
- [Dynamics 365 - Why Sales Teams Love Kanban](https://www.crmsoftwareblog.com/2025/07/why-sales-teams-love-kanban-view-in-dynamics-365-crm-use-cases-you-should-know/)

### Métricas y KPIs
- [Close - Sales Funnel Conversion Rate](https://www.close.com/blog/sales-funnel-conversion-rate)
- [Mosaic - Sales Funnel Metrics](https://www.mosaic.tech/financial-metrics/sales-funnel-conversion-rate)
- [CaptivateIQ - Sales Pipeline Metrics](https://www.captivateiq.com/blog/sales-pipeline-metrics)
- [Dashly - Sales Funnel Metrics 2025](https://www.dashly.io/blog/sales-funnel-metrics/)

---

## Anexo A: Glosario

| Término | Definición |
|---------|------------|
| **MQL** | Marketing Qualified Lead - Lead calificado por marketing |
| **SQL** | Sales Qualified Lead - Lead calificado por ventas |
| **WIP** | Work In Progress - Trabajo en progreso |
| **MRR** | Monthly Recurring Revenue - Ingreso recurrente mensual |
| **ARR** | Annual Recurring Revenue - Ingreso recurrente anual |
| **NRR** | Net Revenue Retention - Retención neta de ingresos |
| **Health Score** | Puntuación de salud de cliente (0-100) |
| **Lead Score** | Puntuación de calidad de lead (0-100) |
| **Velocity** | Velocidad de pipeline de ventas |
| **CSAT** | Customer Satisfaction Score |
| **NPS** | Net Promoter Score |
| **SUS** | System Usability Scale |

---

## Anexo B: Changelog del Documento

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0 | Dic 2025 | Versión inicial con investigación completa |

---

*Documento generado para Ventazo CRM - Diciembre 2025*
*Basado en investigación de mercado y mejores prácticas UX/UI actualizadas a 2024-2025*

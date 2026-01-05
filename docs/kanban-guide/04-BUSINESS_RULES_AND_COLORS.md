# Guía UX/UI para Módulo Kanban CRM - Parte 4
## Reglas de Negocio y Sistema de Colores

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

**Anterior:** [03-UX_FLOWS.md](./03-UX_FLOWS.md)
**Siguiente:** [05-RESPONSIVE_AND_ACCESSIBILITY.md](./05-RESPONSIVE_AND_ACCESSIBILITY.md)

# Guía UX/UI para Módulo Kanban CRM - Parte 3
## UX Flows de Alto Nivel

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

**Anterior:** [02-UX_PRINCIPLES_AND_ARCHITECTURE.md](./02-UX_PRINCIPLES_AND_ARCHITECTURE.md)
**Siguiente:** [04-BUSINESS_RULES_AND_COLORS.md](./04-BUSINESS_RULES_AND_COLORS.md)

# @zuclubit/ui-kit — Enterprise Governance Suite

> **Single Source of Truth** para la infraestructura visual corporativa de Zuclubit.

---

## 📚 Documentation Index

| Document | Purpose | Audience |
|----------|---------|----------|
| [ENTERPRISE_ADOPTION.md](./ENTERPRISE_ADOPTION.md) | Guía de adopción completa | All Teams |
| [GOVERNANCE_MODEL.md](./GOVERNANCE_MODEL.md) | Modelo de gobernanza operativo | Leads, Architects |
| [CI_CD_INTEGRATION.md](./CI_CD_INTEGRATION.md) | Integración con pipelines | DevOps, Platform |
| [METRICS_FRAMEWORK.md](./METRICS_FRAMEWORK.md) | Métricas y KPIs | Leadership, DS Team |
| [GOLDEN_PATHS.md](./GOLDEN_PATHS.md) | Buenas prácticas y anti-patterns | Developers |

---

## 🚀 Quick Start

### Para un equipo nuevo (30 minutos)

```bash
# 1. Instalar
npm install @zuclubit/ui-kit

# 2. Verificar ambiente
npx @zuclubit/ui-kit doctor

# 3. Configurar (copiar desde ENTERPRISE_ADOPTION.md)
# 4. Ejecutar audit inicial
npx @zuclubit/ui-kit audit --init

# 5. Verificar conformance
npx @zuclubit/ui-kit conformance
```

### Para verificar compliance

```bash
# Chequeo rápido
npx @zuclubit/ui-kit validate

# Audit completo
npx @zuclubit/ui-kit audit --full --output=report.html --open
```

---

## 📊 Current Enterprise Status

| Metric | Target | Status |
|--------|--------|--------|
| Visual Consistency Index | ≥ 85 | — |
| Enterprise Adoption Rate | ≥ 80% | — |
| Avg Conformance Score | ≥ 75 (Silver) | — |
| Critical A11y Violations | 0 | — |

*Dashboard: metrics.zuclubit.internal/ui-kit*

---

## 🏛️ Governance Structure

```
┌─────────────────────────────────────────────────────────┐
│                  GOVERNANCE HIERARCHY                    │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Level 0: Immutable Core (hardcoded)                     │
│     │                                                    │
│     └─▶ Level 1: Enterprise Policies (RFC required)     │
│            │                                             │
│            └─▶ Level 2: Product Policies (team lead)    │
│                   │                                      │
│                   └─▶ Level 3: Local Overrides (dev)    │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## 📋 RFC Process

Para cambios a políticas o tokens enterprise:

1. Crear RFC usando [template](./rfcs/TEMPLATE.md)
2. Submit PR a este directorio
3. Review period: 5 business days
4. Decision por Design System Team
5. Implementation con staged rollout

---

## 🆘 Support Channels

| Level | Channel | Response Time |
|-------|---------|---------------|
| L1 | Docs + CLI | Immediate |
| L2 | Slack #ui-kit-support | < 4 hours |
| L3 | design-system@zuclubit.com | < 24 hours |

---

## 📜 Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-01-04 | Initial enterprise release |

---

> **Principio:** La gobernanza es código ejecutable, no documentación pasiva.

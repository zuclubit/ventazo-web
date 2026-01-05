# @zuclubit/ui-kit — Enterprise Adoption Guide

> **Version:** 1.0.0
> **Status:** Corporate Standard
> **Last Updated:** 2026-01-04
> **Governance:** Platform Engineering Team

---

## 🎯 Executive Summary

`@zuclubit/ui-kit` es la **infraestructura visual corporativa** de Zuclubit. No es una librería opcional — es el **single source of truth** para:

- Decisiones de color y accesibilidad
- Tokens de diseño
- Políticas de branding
- Conformance y auditoría visual

**Objetivo:** Cualquier equipo puede adoptar el sistema **mañana**, sin hablar con nadie, sin cometer errores graves.

---

## 📋 Quick Start (5 minutos)

### Para Equipos Nuevos

```bash
# 1. Instalación
npm install @zuclubit/ui-kit

# 2. Validar ambiente
npx @zuclubit/ui-kit doctor

# 3. Verificar conformance inicial
npx @zuclubit/ui-kit audit --init
```

### Configuración Mínima Obligatoria

```typescript
// app/providers.tsx
import {
  ThemeProvider,
  GovernanceProvider,
  ENTERPRISE_POLICIES
} from '@zuclubit/ui-kit';

export function Providers({ children }) {
  return (
    <GovernanceProvider
      policies={ENTERPRISE_POLICIES.STANDARD}
      enforceMode="strict"  // 'strict' | 'warn' | 'off'
    >
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </GovernanceProvider>
  );
}
```

### Verificación Post-Setup

```bash
# Debe pasar sin errores
npx @zuclubit/ui-kit validate

# Output esperado:
# ✓ GovernanceProvider detected
# ✓ ThemeProvider detected
# ✓ Enterprise policies active
# ✓ Conformance level: Bronze (minimum required)
```

---

## 🛤️ Adoption Paths

### Path 1: Minimal (Obligatorio para TODOS)

| Requisito | Descripción | Bloquea Build |
|-----------|-------------|---------------|
| `GovernanceProvider` | Wrapper en root | ✅ Sí |
| `ENTERPRISE_POLICIES.CORE` | Policies mínimas | ✅ Sí |
| Conformance Bronze | Score ≥ 60 | ✅ Sí |
| Sin hardcoded colors | En tokens semánticos | ❌ Warning |

**Tiempo estimado:** 30 minutos

```typescript
// Configuración Minimal
import { ENTERPRISE_POLICIES } from '@zuclubit/ui-kit';

const minimalConfig = {
  policies: ENTERPRISE_POLICIES.CORE,
  enforceMode: 'strict',
  conformance: {
    minLevel: 'bronze',
    blockBuild: true
  }
};
```

### Path 2: Recommended (Standard)

| Requisito | Descripción | Bloquea Build |
|-----------|-------------|---------------|
| Todo de Minimal | — | ✅ Sí |
| `ENTERPRISE_POLICIES.STANDARD` | Policies completas | ✅ Sí |
| Conformance Silver | Score ≥ 75 | ✅ Sí |
| Token coverage ≥ 80% | Uso de design tokens | ⚠️ Warning |
| WCAG AA compliance | 4.5:1 contrast ratio | ✅ Sí |

**Tiempo estimado:** 2-4 horas

```typescript
// Configuración Recommended
const standardConfig = {
  policies: ENTERPRISE_POLICIES.STANDARD,
  enforceMode: 'strict',
  conformance: {
    minLevel: 'silver',
    blockBuild: true,
    tokenCoverage: 0.80
  },
  accessibility: {
    standard: 'wcag-aa',
    blockOnCritical: true
  }
};
```

### Path 3: Complete (Premium)

| Requisito | Descripción | Bloquea Build |
|-----------|-------------|---------------|
| Todo de Recommended | — | ✅ Sí |
| `ENTERPRISE_POLICIES.PREMIUM` | Todas las policies | ✅ Sí |
| Conformance Gold | Score ≥ 85 | ✅ Sí |
| Token coverage ≥ 95% | Uso exclusivo de tokens | ✅ Sí |
| APCA Lc 75+ | Contraste perceptual avanzado | ✅ Sí |
| Audit trail activo | Log de decisiones | ✅ Sí |

**Tiempo estimado:** 1-2 días

```typescript
// Configuración Complete
const premiumConfig = {
  policies: ENTERPRISE_POLICIES.PREMIUM,
  enforceMode: 'strict',
  conformance: {
    minLevel: 'gold',
    blockBuild: true,
    tokenCoverage: 0.95
  },
  accessibility: {
    standard: 'apca-body',
    minContrast: 75,
    blockOnCritical: true
  },
  audit: {
    enabled: true,
    exportFormat: 'w3c-dtcg'
  }
};
```

---

## 🏢 Adoption by Project Type

### Nuevos Proyectos (Greenfield)

**Requisito:** Path 2 (Recommended) como mínimo

```bash
# Scaffold con configuración enterprise
npx @zuclubit/ui-kit create-app my-project --preset=standard

# Incluye automáticamente:
# - ThemeProvider + GovernanceProvider
# - Tailwind config con tokens
# - ESLint rules para conformance
# - Pre-commit hooks
```

### Proyectos Existentes (Legacy)

**Fase 1: Coexistencia (Semana 1-2)**
```typescript
// Wrap solo las nuevas features
<GovernanceProvider
  policies={ENTERPRISE_POLICIES.CORE}
  enforceMode="warn"  // No bloquea, solo advierte
>
  <NewFeature />
</GovernanceProvider>
```

**Fase 2: Migración Gradual (Semana 3-6)**
```typescript
// Activar enforcement en módulos migrados
<GovernanceProvider
  policies={ENTERPRISE_POLICIES.STANDARD}
  enforceMode="strict"
  scope={['dashboard', 'leads']}  // Solo estos módulos
>
  <App />
</GovernanceProvider>
```

**Fase 3: Compliance Total (Semana 7+)**
```typescript
// Full enforcement
<GovernanceProvider
  policies={ENTERPRISE_POLICIES.STANDARD}
  enforceMode="strict"
>
  <App />
</GovernanceProvider>
```

### Proyectos con Múltiples Equipos

```typescript
// Cada equipo puede tener configuración específica
const teamConfigs = {
  'team-sales': {
    policies: ENTERPRISE_POLICIES.STANDARD,
    customTokens: salesTokens,
    conformance: { minLevel: 'silver' }
  },
  'team-marketing': {
    policies: ENTERPRISE_POLICIES.PREMIUM,
    customTokens: marketingTokens,
    conformance: { minLevel: 'gold' }
  }
};
```

---

## ⚙️ Configuración por Ambiente

### Development

```typescript
// ui-kit.config.ts
export default {
  enforceMode: 'warn',
  conformance: {
    minLevel: 'bronze',
    blockBuild: false,
    showWarnings: true
  },
  devtools: {
    enabled: true,
    showViolations: true,
    highlightIssues: true
  }
};
```

### Staging

```typescript
export default {
  enforceMode: 'strict',
  conformance: {
    minLevel: 'silver',
    blockBuild: true,
    generateReport: true
  }
};
```

### Production

```typescript
export default {
  enforceMode: 'strict',
  conformance: {
    minLevel: 'silver',
    blockBuild: true,
    auditTrail: true,
    exportMetrics: true
  }
};
```

---

## 🚫 Qué Bloquea Build vs Qué Solo Alerta

### 🔴 BLOQUEA BUILD (Critical)

| Violación | Razón | Cómo Resolver |
|-----------|-------|---------------|
| Sin `GovernanceProvider` | Requerido para enforcement | Agregar en root |
| Conformance < Bronze (60) | Mínimo de calidad | Corregir violaciones críticas |
| WCAG contrast < 4.5:1 | Accesibilidad legal | Usar colores accesibles |
| Color hardcodeado en componente core | Rompe theming | Usar tokens semánticos |
| Token no registrado | Inconsistencia | Registrar en token collection |

### 🟡 WARNING (Alta Prioridad)

| Violación | Impacto | Deadline |
|-----------|---------|----------|
| Token coverage < 80% | Inconsistencia visual | Próximo sprint |
| Componente sin audit trail | Trazabilidad | Próxima release |
| APCA contrast < Lc 60 | UX subóptimo | Próximo sprint |

### 🟢 INFO (Mejora Continua)

| Sugerencia | Beneficio |
|------------|-----------|
| Usar APCA en lugar de WCAG | Mejor percepción de contraste |
| Token coverage > 95% | Consistencia perfecta |
| Conformance Gold+ | Calidad premium |

---

## 📊 Checklist de Adopción

### Pre-Adopción

- [ ] Leer este documento completo
- [ ] Ejecutar `npx @zuclubit/ui-kit doctor` en el proyecto
- [ ] Revisar reporte de gap analysis
- [ ] Definir path de adopción (Minimal/Standard/Complete)
- [ ] Planificar tiempo de migración

### Durante Adopción

- [ ] Instalar `@zuclubit/ui-kit`
- [ ] Configurar `GovernanceProvider` en root
- [ ] Migrar colores hardcodeados a tokens
- [ ] Ejecutar `npx @zuclubit/ui-kit audit`
- [ ] Corregir violaciones críticas
- [ ] Alcanzar conformance mínimo (Bronze)

### Post-Adopción

- [ ] Configurar CI/CD hooks (ver `CI_CD_INTEGRATION.md`)
- [ ] Activar reporting automático
- [ ] Capacitar al equipo en herramientas de desarrollo
- [ ] Documentar custom tokens si aplica
- [ ] Agendar revisión en 30 días

---

## 🆘 Soporte

### Auto-diagnóstico

```bash
# Diagnóstico completo
npx @zuclubit/ui-kit doctor --verbose

# Análisis de gaps
npx @zuclubit/ui-kit gap-analysis

# Reporte de conformance
npx @zuclubit/ui-kit audit --format=html --output=./reports
```

### Recursos

| Recurso | URL |
|---------|-----|
| Documentación | `/packages/ui-kit/docs/` |
| Ejemplos | `/packages/ui-kit/examples/` |
| Governance Model | `./GOVERNANCE_MODEL.md` |
| CI/CD Integration | `./CI_CD_INTEGRATION.md` |
| Metrics Dashboard | `./METRICS_FRAMEWORK.md` |

### Escalación

| Nivel | Contacto | Tiempo Respuesta |
|-------|----------|------------------|
| L1: Self-Service | Docs + CLI tools | Inmediato |
| L2: Slack | #ui-kit-support | < 4 horas |
| L3: Design System Team | design-system@zuclubit.com | < 24 horas |

---

## 📜 Historial de Cambios

| Versión | Fecha | Cambios |
|---------|-------|---------|
| 1.0.0 | 2026-01-04 | Initial enterprise release |

---

> **Nota:** Este documento es normativo. Cualquier desviación debe ser aprobada por el Design System Team.

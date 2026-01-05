# @zuclubit/ui-kit — Living Governance Model

> **Status:** Active
> **Enforcement:** Automated
> **Review Cadence:** Quarterly

---

## 🎯 Principio Fundamental

> La gobernanza es **código ejecutable**, no documentación pasiva.

Cada decisión de gobernanza se traduce en:
1. Una policy evaluable automáticamente
2. Un check en CI/CD
3. Una métrica observable

---

## 🏛️ Estructura de Gobierno

### Niveles de Autoridad

```
┌─────────────────────────────────────────────────────────────────┐
│                    GOVERNANCE HIERARCHY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LEVEL 0: IMMUTABLE CORE                                 │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │  • WCAG 2.1 AA minimum (legal requirement)               │   │
│  │  • APCA algorithm implementation                         │   │
│  │  • W3C Design Token spec compliance                      │   │
│  │  • Perceptual color space (OKLCH)                        │   │
│  │                                                          │   │
│  │  WHO CAN CHANGE: Nobody (hardcoded in domain layer)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LEVEL 1: ENTERPRISE POLICIES                            │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │  • Corporate brand guidelines                            │   │
│  │  • Accessibility standards (AA vs AAA)                   │   │
│  │  • Conformance thresholds                                │   │
│  │  • Token naming conventions                              │   │
│  │                                                          │   │
│  │  WHO CAN CHANGE: Design System Team (requires RFC)       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LEVEL 2: PRODUCT POLICIES                               │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │  • Custom semantic tokens                                │   │
│  │  • Extended color palettes                               │   │
│  │  • Component-specific overrides                          │   │
│  │  • Feature flag policies                                 │   │
│  │                                                          │   │
│  │  WHO CAN CHANGE: Product Team Lead (auto-approved)       │   │
│  └─────────────────────────────────────────────────────────┘   │
│                            │                                    │
│                            ▼                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  LEVEL 3: LOCAL OVERRIDES                                │   │
│  │  ─────────────────────────────────────────────────────── │   │
│  │  • Development mode relaxations                          │   │
│  │  • Experimental features                                 │   │
│  │  • A/B test variants                                     │   │
│  │                                                          │   │
│  │  WHO CAN CHANGE: Any developer (logged + temporary)      │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Permission Matrix

### Cambios a Tokens

| Acción | Developer | Team Lead | DS Team | Requires |
|--------|-----------|-----------|---------|----------|
| Crear token local | ✅ | ✅ | ✅ | — |
| Crear token de producto | ❌ | ✅ | ✅ | PR approval |
| Crear token enterprise | ❌ | ❌ | ✅ | RFC + Review |
| Modificar token enterprise | ❌ | ❌ | ✅ | RFC + Migration plan |
| Deprecar token | ❌ | ✅ | ✅ | 90-day notice |
| Eliminar token | ❌ | ❌ | ✅ | RFC + 0 usages |

### Cambios a Policies

| Acción | Developer | Team Lead | DS Team | Requires |
|--------|-----------|-----------|---------|----------|
| Agregar policy local | ✅ | ✅ | ✅ | Conformance check |
| Modificar severity | ❌ | ✅ | ✅ | Impact analysis |
| Agregar policy enterprise | ❌ | ❌ | ✅ | RFC + Stakeholder review |
| Reducir enforcement | ❌ | ❌ | ✅ | Exception request |
| Eliminar policy | ❌ | ❌ | ✅ | RFC + Compliance check |

### Cambios a Accesibilidad

| Acción | Developer | Team Lead | DS Team | Requires |
|--------|-----------|-----------|---------|----------|
| Reportar issue | ✅ | ✅ | ✅ | — |
| Request exception | ❌ | ✅ | ✅ | Justification |
| Grant exception | ❌ | ❌ | ✅ | Time-boxed + Review |
| Change standard (AA→AAA) | ❌ | ❌ | ✅ | RFC + Training |
| Change standard (AAA→AA) | ❌ | ❌ | ❌ | Not allowed |

---

## 🔄 Change Approval Flow

### Standard Changes (< 1 día)

```
Developer → PR → Automated Checks → Auto-merge (if pass)
```

**Criterios para auto-merge:**
- Conformance score no decrece
- No nuevas violaciones críticas
- Token coverage se mantiene
- Tests pasan

### Policy Changes (RFC Required)

```
┌─────────────────────────────────────────────────────────────────┐
│                     RFC APPROVAL FLOW                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. PROPOSAL                                                     │
│     └─ Author creates RFC document                               │
│     └─ Template: /packages/ui-kit/enterprise/rfcs/TEMPLATE.md    │
│                                                                  │
│  2. REVIEW PERIOD (5 business days)                              │
│     └─ Stakeholders comment                                      │
│     └─ Impact analysis automated                                 │
│     └─ Affected teams notified                                   │
│                                                                  │
│  3. DECISION                                                     │
│     └─ DS Team reviews all feedback                              │
│     └─ Decision: Approved / Rejected / Deferred                  │
│     └─ If approved: Implementation plan created                  │
│                                                                  │
│  4. IMPLEMENTATION                                               │
│     └─ Changes implemented in feature branch                     │
│     └─ Migration path documented                                 │
│     └─ Deprecation notices sent                                  │
│                                                                  │
│  5. ROLLOUT                                                      │
│     └─ Staged rollout (dev → staging → prod)                     │
│     └─ Monitoring during 7 days                                  │
│     └─ Rollback plan active                                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🤖 Automated Detection & Enforcement

### Detección de Desviaciones

```typescript
// Ejecutado automáticamente en cada build
interface DeviationDetector {
  // Detecta hardcoded colors
  detectHardcodedColors(files: string[]): Deviation[];

  // Detecta tokens no registrados
  detectUnregisteredTokens(files: string[]): Deviation[];

  // Detecta violaciones de accesibilidad
  detectAccessibilityViolations(components: Component[]): Deviation[];

  // Detecta inconsistencias cross-product
  detectCrossProductDrift(products: Product[]): Deviation[];

  // Detecta policies bypass
  detectPolicyBypass(codebase: Codebase): Deviation[];
}
```

### Enforcement Automático

```typescript
// ui-kit.enforcement.ts
export const enforcementRules = {
  // BLOQUEA BUILD
  critical: [
    'no-hardcoded-colors-in-components',
    'wcag-aa-minimum-contrast',
    'governance-provider-required',
    'conformance-bronze-minimum',
    'no-unregistered-tokens'
  ],

  // WARNING EN PR
  high: [
    'token-coverage-80-percent',
    'apca-lc-60-minimum',
    'semantic-token-usage',
    'component-audit-required'
  ],

  // INFO EN REPORT
  medium: [
    'apca-lc-75-recommended',
    'token-coverage-95-target',
    'dark-mode-coverage'
  ]
};
```

---

## 📋 Governance Operations

### Daily (Automated)

| Operación | Trigger | Output |
|-----------|---------|--------|
| Conformance scan | Every commit | PR comment |
| Accessibility check | Every PR | Badge update |
| Token drift detection | Nightly | Slack alert if drift |
| Policy compliance | Every build | Build pass/fail |

### Weekly (Automated + Review)

| Operación | Owner | Deliverable |
|-----------|-------|-------------|
| Adoption metrics | System | Dashboard update |
| Violation trends | System | Trend report |
| Exception review | DS Team | Exception status |

### Monthly

| Operación | Owner | Deliverable |
|-----------|-------|-------------|
| Token audit | DS Team | Token health report |
| Cross-product drift | DS Team | Consistency report |
| Policy effectiveness | DS Team | Policy review |

### Quarterly

| Operación | Owner | Deliverable |
|-----------|-------|-------------|
| Governance review | DS Team + Leads | Updated policies |
| Adoption assessment | DS Team | Adoption report |
| Roadmap update | DS Team | Next quarter plan |

---

## 🚨 Exception Handling

### Tipos de Excepciones

```typescript
type ExceptionType =
  | 'temporary'      // < 30 días, auto-expires
  | 'feature-flag'   // Atado a feature flag
  | 'legacy'         // Migración en progreso
  | 'technical'      // Limitación técnica documentada
  | 'business';      // Requerimiento de negocio
```

### Proceso de Excepción

```typescript
// exception-request.ts
interface ExceptionRequest {
  // Identificación
  id: string;
  requestedBy: string;
  requestedAt: Date;

  // Contexto
  policy: PolicyId;
  violation: ViolationId;
  scope: 'component' | 'module' | 'product';
  affectedFiles: string[];

  // Justificación
  type: ExceptionType;
  reason: string;
  businessImpact: string;

  // Plan
  duration: Duration;
  expiresAt: Date;
  remediationPlan: string;

  // Approval
  approvedBy?: string;
  approvedAt?: Date;
  conditions?: string[];
}
```

### Registro de Excepciones

```typescript
// Todas las excepciones se registran automáticamente
class ExceptionRegistry {
  register(exception: ExceptionRequest): void;

  // Auto-expiration
  getExpired(): ExceptionRequest[];

  // Alerting
  getExpiringIn(days: number): ExceptionRequest[];

  // Reporting
  getByTeam(team: string): ExceptionRequest[];
  getByPolicy(policy: PolicyId): ExceptionRequest[];
}
```

---

## 📊 Governance Metrics

### Policy Effectiveness

```typescript
interface PolicyEffectivenessMetrics {
  // Cuántas veces se dispara cada policy
  triggerCount: number;

  // Cuántas violaciones se corrigen
  resolutionRate: number;

  // Tiempo promedio de corrección
  meanTimeToResolve: Duration;

  // Excepciones solicitadas
  exceptionRate: number;

  // Falsos positivos reportados
  falsePositiveRate: number;
}
```

### Governance Health Score

```
Governance Health =
  (Compliance Rate × 0.40) +
  (Resolution Speed × 0.25) +
  (Exception Control × 0.20) +
  (Drift Prevention × 0.15)

Where:
  Compliance Rate = Passed Checks / Total Checks
  Resolution Speed = 1 - (MTTR / Target MTTR)
  Exception Control = 1 - (Active Exceptions / Max Allowed)
  Drift Prevention = 1 - (Cross-Product Variance / Threshold)
```

---

## 🔄 Governance Evolution

### Feedback Loop

```
┌─────────────────────────────────────────────────────────────────┐
│                     GOVERNANCE EVOLUTION                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌───────────┐     ┌───────────┐     ┌───────────┐            │
│   │  COLLECT  │────▶│  ANALYZE  │────▶│  PROPOSE  │            │
│   └───────────┘     └───────────┘     └───────────┘            │
│        │                                    │                    │
│        │ • Violation patterns               │                    │
│        │ • False positives                  │                    │
│        │ • Exception requests               ▼                    │
│        │ • Developer feedback        ┌───────────┐              │
│        │                             │   RFC     │              │
│        │                             └───────────┘              │
│        │                                    │                    │
│        ▼                                    ▼                    │
│   ┌───────────┐     ┌───────────┐     ┌───────────┐            │
│   │  MONITOR  │◀────│  DEPLOY   │◀────│  APPROVE  │            │
│   └───────────┘     └───────────┘     └───────────┘            │
│                                                                  │
│   CYCLE TIME: 1 month minimum between major changes             │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### Version Control de Policies

```typescript
// Cada policy tiene versionamiento semántico
interface PolicyVersion {
  major: number;  // Breaking changes
  minor: number;  // New features
  patch: number;  // Bug fixes

  changelog: ChangelogEntry[];
  migrationGuide?: string;
  deprecationNotice?: string;
}
```

---

## 🛡️ Governance Guardrails

### Anti-patterns en Governance

| Anti-pattern | Por qué es malo | Guardrail |
|--------------|-----------------|-----------|
| Governance bypass via env var | Inconsistencia | No env vars for critical policies |
| Exception sin expiración | Deuda permanente | Auto-expire mandatory |
| Policy sin métricas | No medible | Metrics required for approval |
| Cambio sin migración | Breaking changes | Migration plan required |

### Principios Inviolables

1. **No manual overrides** en producción
2. **Todas las excepciones expiran** automáticamente
3. **Cambios a Level 0** requieren release major
4. **Rollback** siempre disponible por 7 días
5. **Audit trail** de todas las decisiones

---

## 📜 RFC Template

```markdown
# RFC: [Título]

## Metadata
- **Author:**
- **Date:**
- **Status:** Draft | Review | Approved | Rejected
- **Affects:** Level 1 | Level 2 | Level 3

## Summary
[2-3 oraciones describiendo el cambio]

## Motivation
[Por qué este cambio es necesario]

## Proposal
[Descripción detallada del cambio]

## Impact Analysis
- **Affected teams:**
- **Affected policies:**
- **Migration effort:** Low | Medium | High
- **Breaking changes:** Yes | No

## Rollout Plan
[Cómo se implementará gradualmente]

## Rollback Plan
[Cómo revertir si hay problemas]

## Alternatives Considered
[Otras opciones evaluadas]

## Open Questions
[Preguntas pendientes]
```

---

> **Recuerda:** La gobernanza efectiva es aquella que se olvida porque funciona automáticamente.

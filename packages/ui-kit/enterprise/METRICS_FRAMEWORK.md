# @zuclubit/ui-kit — Quality & Adoption Metrics Framework

> **Version:** 1.0.0
> **Measurement Cadence:** Continuous + Weekly Rollup
> **Dashboard:** metrics.zuclubit.internal/ui-kit

---

## 🎯 Metrics Philosophy

> **"Lo que no se mide, no se mejora."**

Cada métrica debe ser:
- **Accionable:** Indica qué hacer para mejorar
- **Automática:** No requiere recolección manual
- **Contextualizada:** Comparada con baselines y targets
- **Visible:** Disponible en dashboards públicos

---

## 📊 Metrics Taxonomy

```
┌─────────────────────────────────────────────────────────────────┐
│                      METRICS HIERARCHY                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  LEVEL 1: NORTH STAR                                             │
│  ─────────────────────────────────────────────────────────────── │
│  • Visual Consistency Index (VCI)                                │
│  • Enterprise Adoption Rate                                      │
│                                                                  │
│  LEVEL 2: HEALTH INDICATORS                                      │
│  ─────────────────────────────────────────────────────────────── │
│  • Conformance Score (by product)                                │
│  • Accessibility Score (WCAG + APCA)                             │
│  • Token Coverage (% design tokens vs hardcoded)                 │
│  • Policy Compliance Rate                                        │
│                                                                  │
│  LEVEL 3: OPERATIONAL METRICS                                    │
│  ─────────────────────────────────────────────────────────────── │
│  • Mean Time to Resolve (MTTR)                                   │
│  • Exception Rate                                                │
│  • Regression Frequency                                          │
│  • Build Failure Rate (by UI-Kit)                                │
│                                                                  │
│  LEVEL 4: DIAGNOSTIC METRICS                                     │
│  ─────────────────────────────────────────────────────────────── │
│  • Violation Breakdown (by type)                                 │
│  • Token Usage (by category)                                     │
│  • Component Audit Results                                       │
│  • Cross-Product Drift                                           │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🌟 North Star Metrics

### Visual Consistency Index (VCI)

**Definition:** Medida agregada de qué tan consistente es la experiencia visual across products.

```typescript
interface VisualConsistencyIndex {
  // Fórmula
  calculate(): number {
    return (
      (this.tokenConsistency * 0.30) +
      (this.colorHarmony * 0.25) +
      (this.typographyCompliance * 0.20) +
      (this.spacingUniformity * 0.15) +
      (this.componentReuse * 0.10)
    );
  }

  // Components
  tokenConsistency: number;      // % tokens idénticos entre productos
  colorHarmony: number;          // Diferencia máxima en paletas
  typographyCompliance: number;  // Adherencia a escala tipográfica
  spacingUniformity: number;     // Varianza en sistema de spacing
  componentReuse: number;        // % componentes compartidos
}
```

| Score | Interpretation | Action |
|-------|----------------|--------|
| 95-100 | Excellent | Maintain |
| 85-94 | Good | Monitor |
| 75-84 | Acceptable | Improve |
| < 75 | Poor | Immediate action |

**Where measured:** Calculated from CI/CD reports across all products
**Frequency:** Weekly rollup
**Owner:** Design System Team

### Enterprise Adoption Rate

**Definition:** % de proyectos usando @zuclubit/ui-kit con configuración mínima válida.

```typescript
interface AdoptionRate {
  // Total projects en la organización
  totalProjects: number;

  // Projects con ui-kit instalado
  projectsWithUiKit: number;

  // Projects con configuración válida
  projectsWithValidConfig: number;

  // Projects con conformance Silver+
  projectsWithSilver: number;

  // Metrics
  installationRate: number;  // projectsWithUiKit / totalProjects
  configurationRate: number; // projectsWithValidConfig / projectsWithUiKit
  qualityRate: number;       // projectsWithSilver / projectsWithValidConfig
  overallAdoption: number;   // projectsWithSilver / totalProjects
}
```

| Rate | Target | Current |
|------|--------|---------|
| Installation | 100% | — |
| Configuration | 100% | — |
| Quality (Silver+) | 80% | — |
| Overall | 80% | — |

**Where measured:** npm registry + CI/CD scans
**Frequency:** Daily
**Owner:** Platform Engineering

---

## 🏥 Health Indicators

### 1. Conformance Score

**What:** Score de conformidad del sistema de diseño (0-100)

**Components:**
| Category | Weight | Measures |
|----------|--------|----------|
| Perceptual Accuracy | 30% | OKLCH calculations, color math |
| Accessibility | 35% | WCAG AA, APCA Lc values |
| Determinism | 20% | Same input → same output |
| Performance | 15% | Calculation speed, memory |

**How measured:**
```bash
npx @zuclubit/ui-kit conformance --json
```

**Interpretation:**
| Level | Score | Meaning |
|-------|-------|---------|
| Platinum | 95-100 | Exceeds all standards |
| Gold | 85-94 | Full compliance |
| Silver | 75-84 | Standard compliance |
| Bronze | 60-74 | Minimum acceptable |
| Fail | < 60 | Not deployable |

### 2. Accessibility Score

**What:** Cumplimiento de estándares de accesibilidad

**Components:**
```typescript
interface AccessibilityScore {
  // WCAG 2.1 compliance
  wcag: {
    aa: {
      contrastCompliance: number;  // % pares con 4.5:1+
      violations: ViolationCount;
    };
    aaa: {
      contrastCompliance: number;  // % pares con 7:1+
      violations: ViolationCount;
    };
  };

  // APCA (WCAG 3.0 draft)
  apca: {
    bodyText: number;   // % con Lc 60+
    uiElements: number; // % con Lc 45+
    largeText: number;  // % con Lc 30+
  };

  // Composite score
  overall: number;
}
```

**Thresholds:**
| Standard | Required | Target |
|----------|----------|--------|
| WCAG AA Critical | 0 violations | 0 violations |
| WCAG AA Serious | ≤ 5 | 0 |
| APCA Body | ≥ 90% Lc 60+ | 100% |

**Where measured:** Component rendering + static analysis
**How measured:**
```bash
npx @zuclubit/ui-kit accessibility --standard=wcag-aa --json
```

### 3. Token Coverage

**What:** % de valores visuales que usan design tokens

**Categories:**
```typescript
interface TokenCoverage {
  colors: {
    total: number;       // Total color usages
    tokenized: number;   // Using design tokens
    hardcoded: number;   // Hardcoded values
    coverage: number;    // tokenized / total
  };

  typography: {
    total: number;
    tokenized: number;
    hardcoded: number;
    coverage: number;
  };

  spacing: {
    total: number;
    tokenized: number;
    hardcoded: number;
    coverage: number;
  };

  overall: number;  // Weighted average
}
```

**Targets:**
| Category | Bronze | Silver | Gold | Platinum |
|----------|--------|--------|------|----------|
| Colors | 70% | 85% | 95% | 100% |
| Typography | 60% | 80% | 90% | 100% |
| Spacing | 50% | 70% | 85% | 100% |
| Overall | 60% | 80% | 90% | 100% |

**Where measured:** Static code analysis
**How measured:**
```bash
npx @zuclubit/ui-kit token-coverage --json
```

### 4. Policy Compliance Rate

**What:** % de policies que se cumplen

```typescript
interface PolicyCompliance {
  byPolicy: Map<PolicyId, {
    evaluations: number;
    passed: number;
    failed: number;
    rate: number;
  }>;

  bySeverity: {
    critical: { rate: number };
    high: { rate: number };
    medium: { rate: number };
    low: { rate: number };
  };

  overall: number;
}
```

**Targets:**
| Severity | Required Rate |
|----------|---------------|
| Critical | 100% |
| High | 95% |
| Medium | 85% |
| Low | 70% |

---

## ⚙️ Operational Metrics

### Mean Time to Resolve (MTTR)

**What:** Tiempo promedio para resolver violaciones

```typescript
interface MTTR {
  bySeverity: {
    critical: Duration;  // Target: < 4 hours
    high: Duration;      // Target: < 1 day
    medium: Duration;    // Target: < 1 week
    low: Duration;       // Target: < 1 month
  };

  byType: Map<ViolationType, Duration>;
  overall: Duration;
  trend: 'improving' | 'stable' | 'degrading';
}
```

**How measured:** Time from violation detection to PR merge
**Where measured:** GitHub + Jira integration

### Exception Rate

**What:** % de checks que requieren excepción

```typescript
interface ExceptionRate {
  total: number;        // Total evaluations
  exceptions: number;   // Exceptions granted
  rate: number;         // exceptions / total

  byType: Map<ExceptionType, number>;
  byTeam: Map<TeamId, number>;
  activeExceptions: number;
  expiredExceptions: number;
}
```

**Targets:**
| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Overall Rate | < 5% | 5-10% | > 10% |
| Active Exceptions | < 10 | 10-20 | > 20 |

### Regression Frequency

**What:** Frecuencia de regresiones en métricas

```typescript
interface RegressionMetrics {
  conformanceRegressions: number;  // Score drops > 5 points
  accessibilityRegressions: number; // New critical violations
  tokenRegressions: number;         // Coverage drops > 5%

  frequency: 'rare' | 'occasional' | 'frequent';
  trend: 'improving' | 'stable' | 'degrading';
}
```

**Targets:**
| Metric | Target | Alert |
|--------|--------|-------|
| Conformance regressions | 0 per month | > 2 |
| A11y regressions | 0 per month | > 1 |
| Token regressions | 0 per month | > 2 |

### Build Failure Rate (UI-Kit related)

**What:** % de builds que fallan por violaciones de UI-Kit

```typescript
interface BuildFailureRate {
  totalBuilds: number;
  uiKitFailures: number;
  rate: number;

  byReason: Map<FailureReason, number>;
  // 'conformance' | 'accessibility' | 'policy' | 'token'
}
```

**Target:** < 5% of builds should fail due to UI-Kit

---

## 🔬 Diagnostic Metrics

### Violation Breakdown

**Granular view of violations**

```typescript
interface ViolationBreakdown {
  byCategory: {
    accessibility: ViolationDetail[];
    colorUsage: ViolationDetail[];
    tokenUsage: ViolationDetail[];
    policy: ViolationDetail[];
  };

  byComponent: Map<ComponentName, ViolationDetail[]>;
  byFile: Map<FilePath, ViolationDetail[]>;
  bySeverity: Map<Severity, ViolationDetail[]>;

  trends: {
    newThisWeek: number;
    resolvedThisWeek: number;
    netChange: number;
  };
}
```

### Token Usage Distribution

**How tokens are used**

```typescript
interface TokenUsageDistribution {
  // Most used tokens
  topTokens: Array<{
    token: TokenId;
    usageCount: number;
    category: TokenCategory;
  }>;

  // Unused tokens (candidates for deprecation)
  unusedTokens: TokenId[];

  // Custom tokens (not in core set)
  customTokens: Array<{
    token: TokenId;
    definedIn: string;
    usageCount: number;
  }>;

  // Distribution by category
  byCategory: Map<TokenCategory, {
    total: number;
    used: number;
    coverage: number;
  }>;
}
```

### Cross-Product Drift

**Consistency between products**

```typescript
interface CrossProductDrift {
  // Token differences
  tokenDrift: {
    sharedTokens: number;
    productOnlyTokens: Map<ProductId, TokenId[]>;
    conflictingDefinitions: Array<{
      token: TokenId;
      definitions: Map<ProductId, TokenValue>;
    }>;
  };

  // Visual drift score (0-100, lower is better)
  driftScore: number;

  // Specific drifts
  colorDrift: number;
  typographyDrift: number;
  spacingDrift: number;
}
```

**Target:** Drift score < 10

---

## 📈 Dashboard Specifications

### Executive Dashboard

**Audience:** C-level, Directors
**Update:** Weekly

| Widget | Metric | Visualization |
|--------|--------|---------------|
| VCI Score | Visual Consistency Index | Gauge (0-100) |
| Adoption | Enterprise Adoption Rate | Progress ring |
| Health | Conformance average | Trend line |
| Risk | Critical violations | Alert badge |

### Team Dashboard

**Audience:** Product Teams
**Update:** Daily

| Widget | Metric | Visualization |
|--------|--------|---------------|
| Team Conformance | Conformance score | Gauge with history |
| Token Coverage | Coverage % | Stacked bar |
| Open Violations | Count by severity | Table |
| MTTR | Resolution time | Line chart |

### Operations Dashboard

**Audience:** Design System Team
**Update:** Real-time

| Widget | Metric | Visualization |
|--------|--------|---------------|
| Active Exceptions | Count + expiring | List with countdown |
| Build Failures | Last 24h | Timeline |
| Regressions | Last 7d | Alert list |
| Cross-Product Drift | Drift score | Heatmap |

---

## 📐 Measurement Implementation

### Data Collection

```typescript
// metrics-collector.ts
interface MetricsCollector {
  // From CI/CD
  collectFromBuild(buildId: string): Promise<BuildMetrics>;

  // From static analysis
  collectFromCodebase(path: string): Promise<CodeMetrics>;

  // From runtime
  collectFromRuntime(app: Application): Promise<RuntimeMetrics>;

  // Aggregate
  aggregate(metrics: Metrics[]): AggregatedMetrics;

  // Export
  exportToPrometheus(): string;
  exportToDataDog(): object;
  exportToInfluxDB(): object;
}
```

### Storage Schema

```sql
-- metrics.conformance_scores
CREATE TABLE conformance_scores (
  id UUID PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  team_id VARCHAR(255) NOT NULL,
  score DECIMAL(5,2) NOT NULL,
  level VARCHAR(20) NOT NULL,
  breakdown JSONB NOT NULL,
  collected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  build_id VARCHAR(255),
  commit_sha VARCHAR(40)
);

-- metrics.violations
CREATE TABLE violations (
  id UUID PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  violation_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  file_path TEXT,
  line_number INTEGER,
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolution_pr VARCHAR(255)
);

-- metrics.adoption
CREATE TABLE adoption_status (
  id UUID PRIMARY KEY,
  product_id VARCHAR(255) NOT NULL,
  ui_kit_version VARCHAR(50),
  config_valid BOOLEAN NOT NULL,
  conformance_level VARCHAR(20),
  last_checked TIMESTAMP WITH TIME ZONE NOT NULL
);
```

### Alert Rules

```yaml
# prometheus-alerts.yml
groups:
  - name: ui-kit-alerts
    rules:
      - alert: ConformanceBelow75
        expr: ui_kit_conformance_score < 75
        for: 1h
        labels:
          severity: critical
        annotations:
          summary: "Conformance score below Silver threshold"

      - alert: CriticalA11yViolation
        expr: ui_kit_a11y_critical_count > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Critical accessibility violation detected"

      - alert: TokenCoverageDropping
        expr: delta(ui_kit_token_coverage[24h]) < -5
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: "Token coverage dropped more than 5%"

      - alert: HighExceptionRate
        expr: ui_kit_exception_rate > 0.10
        for: 24h
        labels:
          severity: warning
        annotations:
          summary: "Exception rate exceeds 10%"
```

---

## 📊 Reporting Cadence

| Report | Audience | Frequency | Contents |
|--------|----------|-----------|----------|
| Daily Snapshot | Teams | Daily | Violations, scores |
| Weekly Digest | Leads | Weekly | Trends, actions needed |
| Monthly Review | Directors | Monthly | KPIs, comparisons |
| Quarterly Report | Executives | Quarterly | Strategy, roadmap |

### Report Templates

```bash
# Generate reports
npx @zuclubit/ui-kit report --type=daily --format=slack
npx @zuclubit/ui-kit report --type=weekly --format=markdown --output=weekly-report.md
npx @zuclubit/ui-kit report --type=monthly --format=html --output=monthly-report.html
```

---

## 🎯 Targets & SLOs

### Service Level Objectives

| SLO | Target | Measurement Window |
|-----|--------|-------------------|
| VCI Score | ≥ 85 | Rolling 7 days |
| Adoption Rate | ≥ 80% | Rolling 30 days |
| Conformance (avg) | ≥ 75 | Rolling 7 days |
| Critical A11y | 0 | Real-time |
| MTTR Critical | < 4 hours | Rolling 30 days |
| Exception Rate | < 5% | Rolling 30 days |

### Target by Quarter

| Metric | Q1 | Q2 | Q3 | Q4 |
|--------|-----|-----|-----|-----|
| VCI Score | 80 | 85 | 88 | 90 |
| Adoption | 60% | 75% | 85% | 95% |
| Conformance avg | 70 | 75 | 80 | 85 |
| Token Coverage | 70% | 80% | 90% | 95% |

---

> **Recordatorio:** Las métricas existen para tomar decisiones, no para decorar dashboards.

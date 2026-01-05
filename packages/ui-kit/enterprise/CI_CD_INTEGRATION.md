# @zuclubit/ui-kit — CI/CD Integration Model

> **Version:** 1.0.0
> **Status:** Production Ready
> **Applies to:** All CI/CD pipelines

---

## 🎯 Objective

Integrar `@zuclubit/ui-kit` como **quality gate obligatorio** en todos los pipelines, asegurando que:

1. No se despliega código que viole policies críticas
2. Los reportes de calidad visual son automáticos
3. Las métricas de adopción se recolectan continuamente
4. Los rollbacks son posibles ante regresiones

---

## 🏗️ Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           CI/CD PIPELINE FLOW                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐      │
│  │  LINT   │──▶│  TEST   │──▶│ CONFORM │──▶│ ACCESS  │──▶│  BUILD  │      │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘      │
│       │             │             │             │             │             │
│       │             │             │             │             │             │
│       ▼             ▼             ▼             ▼             ▼             │
│  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐      │
│  │ ESLint  │   │  Unit   │   │ UI-Kit  │   │  WCAG   │   │ Bundle  │      │
│  │ Rules   │   │  Tests  │   │ Checks  │   │  Audit  │   │  Size   │      │
│  └─────────┘   └─────────┘   └─────────┘   └─────────┘   └─────────┘      │
│                                    │             │                          │
│                                    │             │                          │
│                                    ▼             ▼                          │
│                              ┌───────────────────────┐                      │
│                              │    QUALITY GATES      │                      │
│                              ├───────────────────────┤                      │
│                              │ • Conformance ≥ 75    │                      │
│                              │ • Zero critical a11y  │                      │
│                              │ • Token coverage ≥ 80%│                      │
│                              │ • No policy bypass    │                      │
│                              └───────────────────────┘                      │
│                                         │                                    │
│                           ┌─────────────┴─────────────┐                     │
│                           │                           │                      │
│                           ▼                           ▼                      │
│                    ┌───────────┐              ┌───────────┐                 │
│                    │   PASS    │              │   FAIL    │                 │
│                    └───────────┘              └───────────┘                 │
│                           │                           │                      │
│                           ▼                           ▼                      │
│                    ┌───────────┐              ┌───────────┐                 │
│                    │  DEPLOY   │              │  REPORT   │                 │
│                    │  STAGING  │              │  + BLOCK  │                 │
│                    └───────────┘              └───────────┘                 │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 Quality Gates Specification

### Gate 1: Conformance Check (REQUIRED)

| Metric | Threshold | Enforcement |
|--------|-----------|-------------|
| Conformance Score | ≥ 60 (Bronze) | Block merge |
| Conformance Score | ≥ 75 (Silver) | Required for production |
| Score regression | > 5 points drop | Block merge |

**Implementation:**

```yaml
# .github/workflows/ui-kit-conformance.yml
- name: UI-Kit Conformance Check
  run: |
    npx @zuclubit/ui-kit conformance \
      --min-score=75 \
      --fail-on-regression \
      --output=conformance-report.json

- name: Upload Conformance Report
  uses: actions/upload-artifact@v4
  with:
    name: conformance-report
    path: conformance-report.json
```

### Gate 2: Accessibility Audit (REQUIRED)

| Standard | Threshold | Enforcement |
|----------|-----------|-------------|
| WCAG 2.1 AA | 0 critical violations | Block merge |
| WCAG 2.1 AA | ≤ 5 serious violations | Warning |
| APCA Lc | ≥ 60 for body text | Warning |
| APCA Lc | ≥ 75 for body text | Required for Gold |

**Implementation:**

```yaml
- name: Accessibility Audit
  run: |
    npx @zuclubit/ui-kit accessibility \
      --standard=wcag-aa \
      --fail-on-critical \
      --output=a11y-report.json

- name: Comment A11y Results
  uses: actions/github-script@v7
  with:
    script: |
      const report = require('./a11y-report.json');
      // Post comment with results...
```

### Gate 3: Token Coverage (REQUIRED)

| Metric | Threshold | Enforcement |
|--------|-----------|-------------|
| Token usage | ≥ 80% | Warning |
| Token usage | ≥ 95% | Required for Platinum |
| Hardcoded colors | 0 in components | Block merge |
| Unregistered tokens | 0 | Block merge |

**Implementation:**

```yaml
- name: Token Coverage Analysis
  run: |
    npx @zuclubit/ui-kit token-coverage \
      --min-coverage=80 \
      --no-hardcoded \
      --output=token-report.json
```

### Gate 4: Policy Compliance (REQUIRED)

| Policy Set | Requirement | Enforcement |
|------------|-------------|-------------|
| CORE | 100% compliance | Block merge |
| STANDARD | 100% compliance | Required for Silver+ |
| PREMIUM | 100% compliance | Required for Gold+ |

**Implementation:**

```yaml
- name: Policy Compliance Check
  run: |
    npx @zuclubit/ui-kit policy-check \
      --policy-set=standard \
      --strict \
      --output=policy-report.json
```

---

## 🔧 GitHub Actions Integration

### Complete Workflow

```yaml
# .github/workflows/ui-kit-quality-gate.yml
name: UI-Kit Quality Gate

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

jobs:
  # ============================================
  # JOB 1: Quick Checks (< 1 min)
  # ============================================
  quick-checks:
    name: Quick Checks
    runs-on: ubuntu-latest
    timeout-minutes: 5

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Lint UI-Kit Usage
        run: npx @zuclubit/ui-kit lint --fix=false

      - name: Check Governance Provider
        run: npx @zuclubit/ui-kit check-provider

  # ============================================
  # JOB 2: Conformance Analysis (< 3 min)
  # ============================================
  conformance:
    name: Conformance Analysis
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: quick-checks

    outputs:
      score: ${{ steps.conformance.outputs.score }}
      level: ${{ steps.conformance.outputs.level }}
      passed: ${{ steps.conformance.outputs.passed }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Run Conformance Analysis
        id: conformance
        run: |
          RESULT=$(npx @zuclubit/ui-kit conformance \
            --min-score=75 \
            --json \
            --output=conformance-report.json)

          echo "score=$(echo $RESULT | jq -r '.score')" >> $GITHUB_OUTPUT
          echo "level=$(echo $RESULT | jq -r '.level')" >> $GITHUB_OUTPUT
          echo "passed=$(echo $RESULT | jq -r '.passed')" >> $GITHUB_OUTPUT

      - name: Upload Conformance Report
        uses: actions/upload-artifact@v4
        with:
          name: conformance-report
          path: conformance-report.json
          retention-days: 30

      - name: Fail if Below Threshold
        if: steps.conformance.outputs.passed != 'true'
        run: |
          echo "::error::Conformance score ${{ steps.conformance.outputs.score }} is below threshold"
          exit 1

  # ============================================
  # JOB 3: Accessibility Audit (< 5 min)
  # ============================================
  accessibility:
    name: Accessibility Audit
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: quick-checks

    outputs:
      critical: ${{ steps.a11y.outputs.critical }}
      serious: ${{ steps.a11y.outputs.serious }}
      passed: ${{ steps.a11y.outputs.passed }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Build for Audit
        run: npm run build

      - name: Run Accessibility Audit
        id: a11y
        run: |
          RESULT=$(npx @zuclubit/ui-kit accessibility \
            --standard=wcag-aa \
            --json \
            --output=a11y-report.json)

          echo "critical=$(echo $RESULT | jq -r '.violations.critical')" >> $GITHUB_OUTPUT
          echo "serious=$(echo $RESULT | jq -r '.violations.serious')" >> $GITHUB_OUTPUT
          echo "passed=$(echo $RESULT | jq -r '.passed')" >> $GITHUB_OUTPUT

      - name: Upload A11y Report
        uses: actions/upload-artifact@v4
        with:
          name: accessibility-report
          path: a11y-report.json
          retention-days: 30

      - name: Fail on Critical Violations
        if: steps.a11y.outputs.critical != '0'
        run: |
          echo "::error::Found ${{ steps.a11y.outputs.critical }} critical accessibility violations"
          exit 1

  # ============================================
  # JOB 4: Token Coverage (< 2 min)
  # ============================================
  token-coverage:
    name: Token Coverage
    runs-on: ubuntu-latest
    timeout-minutes: 10
    needs: quick-checks

    outputs:
      coverage: ${{ steps.tokens.outputs.coverage }}
      hardcoded: ${{ steps.tokens.outputs.hardcoded }}

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install Dependencies
        run: npm ci

      - name: Analyze Token Usage
        id: tokens
        run: |
          RESULT=$(npx @zuclubit/ui-kit token-coverage \
            --json \
            --output=token-report.json)

          echo "coverage=$(echo $RESULT | jq -r '.coverage')" >> $GITHUB_OUTPUT
          echo "hardcoded=$(echo $RESULT | jq -r '.hardcodedCount')" >> $GITHUB_OUTPUT

      - name: Upload Token Report
        uses: actions/upload-artifact@v4
        with:
          name: token-report
          path: token-report.json
          retention-days: 30

      - name: Fail on Hardcoded Colors in Components
        if: steps.tokens.outputs.hardcoded != '0'
        run: |
          echo "::error::Found ${{ steps.tokens.outputs.hardcoded }} hardcoded colors in components"
          exit 1

  # ============================================
  # JOB 5: Quality Gate Summary
  # ============================================
  quality-gate:
    name: Quality Gate
    runs-on: ubuntu-latest
    needs: [conformance, accessibility, token-coverage]
    if: always()

    steps:
      - name: Download All Reports
        uses: actions/download-artifact@v4

      - name: Generate Summary
        uses: actions/github-script@v7
        with:
          script: |
            const conformance = {
              score: '${{ needs.conformance.outputs.score }}',
              level: '${{ needs.conformance.outputs.level }}',
              passed: '${{ needs.conformance.outputs.passed }}'
            };

            const a11y = {
              critical: '${{ needs.accessibility.outputs.critical }}',
              serious: '${{ needs.accessibility.outputs.serious }}',
              passed: '${{ needs.accessibility.outputs.passed }}'
            };

            const tokens = {
              coverage: '${{ needs.token-coverage.outputs.coverage }}',
              hardcoded: '${{ needs.token-coverage.outputs.hardcoded }}'
            };

            const summary = `
            ## 🎨 UI-Kit Quality Gate Results

            ### Conformance
            | Metric | Value | Status |
            |--------|-------|--------|
            | Score | ${conformance.score} | ${conformance.passed === 'true' ? '✅' : '❌'} |
            | Level | ${conformance.level} | - |

            ### Accessibility
            | Metric | Value | Status |
            |--------|-------|--------|
            | Critical | ${a11y.critical} | ${a11y.critical === '0' ? '✅' : '❌'} |
            | Serious | ${a11y.serious} | ${parseInt(a11y.serious) <= 5 ? '✅' : '⚠️'} |

            ### Token Coverage
            | Metric | Value | Status |
            |--------|-------|--------|
            | Coverage | ${tokens.coverage}% | ${parseFloat(tokens.coverage) >= 80 ? '✅' : '⚠️'} |
            | Hardcoded | ${tokens.hardcoded} | ${tokens.hardcoded === '0' ? '✅' : '❌'} |

            ---
            *Generated by @zuclubit/ui-kit quality gate*
            `;

            await github.rest.issues.createComment({
              issue_number: context.issue.number,
              owner: context.repo.owner,
              repo: context.repo.repo,
              body: summary
            });

      - name: Final Gate Decision
        run: |
          CONFORMANCE_PASSED="${{ needs.conformance.outputs.passed }}"
          A11Y_PASSED="${{ needs.accessibility.outputs.passed }}"
          HARDCODED="${{ needs.token-coverage.outputs.hardcoded }}"

          if [ "$CONFORMANCE_PASSED" != "true" ] || [ "$A11Y_PASSED" != "true" ] || [ "$HARDCODED" != "0" ]; then
            echo "::error::Quality gate failed"
            exit 1
          fi

          echo "✅ Quality gate passed"
```

---

## 📊 Report Formats

### Markdown Report

```bash
npx @zuclubit/ui-kit report \
  --format=markdown \
  --output=QUALITY_REPORT.md
```

Output example:

```markdown
# UI-Kit Quality Report

**Generated:** 2026-01-04T10:30:00Z
**Conformance Level:** Silver (82/100)

## Summary
- ✅ 45 checks passed
- ⚠️ 3 warnings
- ❌ 0 critical failures

## Conformance Breakdown
| Category | Score | Weight | Contribution |
|----------|-------|--------|--------------|
| Perceptual Accuracy | 85 | 30% | 25.5 |
| Accessibility | 80 | 35% | 28.0 |
| Determinism | 82 | 20% | 16.4 |
| Performance | 80 | 15% | 12.0 |

...
```

### HTML Report

```bash
npx @zuclubit/ui-kit report \
  --format=html \
  --output=quality-report.html \
  --open
```

### JSON Report (for integrations)

```bash
npx @zuclubit/ui-kit report \
  --format=json \
  --output=quality-report.json
```

---

## 🔄 Score Tracking & Regression Detection

### Historical Tracking

```yaml
- name: Track Score History
  run: |
    # Get current score
    CURRENT_SCORE=$(cat conformance-report.json | jq -r '.score')

    # Get previous score from artifact
    PREVIOUS_SCORE=$(cat previous-conformance.json | jq -r '.score' || echo "0")

    # Calculate delta
    DELTA=$((CURRENT_SCORE - PREVIOUS_SCORE))

    # Fail on significant regression
    if [ $DELTA -lt -5 ]; then
      echo "::error::Score regression of $DELTA points detected"
      exit 1
    fi

    # Save for next run
    cp conformance-report.json previous-conformance.json
```

### Trend Analysis

```yaml
- name: Publish Metrics
  run: |
    # Send to metrics service
    curl -X POST ${{ secrets.METRICS_ENDPOINT }} \
      -H "Content-Type: application/json" \
      -d @conformance-report.json
```

---

## 🚀 Branch Protection Rules

### Recommended Configuration

```json
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "UI-Kit Quality Gate",
      "UI-Kit Conformance Check",
      "UI-Kit Accessibility Audit"
    ]
  },
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true
  }
}
```

---

## 📈 Metrics Collection

### DataDog Integration

```yaml
- name: Send to DataDog
  run: |
    curl -X POST "https://api.datadoghq.com/api/v1/series" \
      -H "Content-Type: application/json" \
      -H "DD-API-KEY: ${{ secrets.DD_API_KEY }}" \
      -d '{
        "series": [{
          "metric": "ui_kit.conformance.score",
          "points": [['"$(date +%s)"', '${{ needs.conformance.outputs.score }}']],
          "tags": ["env:${{ github.ref_name }}", "repo:${{ github.repository }}"]
        }]
      }'
```

### Prometheus Metrics

```yaml
- name: Export Prometheus Metrics
  run: |
    npx @zuclubit/ui-kit metrics \
      --format=prometheus \
      --output=/tmp/metrics.prom

    # Push to Pushgateway
    curl --data-binary @/tmp/metrics.prom \
      http://pushgateway:9091/metrics/job/ui-kit/instance/${{ github.repository }}
```

---

## 🛡️ Security Considerations

### Secret Management

```yaml
env:
  UI_KIT_LICENSE: ${{ secrets.UI_KIT_LICENSE }}
  METRICS_ENDPOINT: ${{ secrets.METRICS_ENDPOINT }}

# Never log these
- name: Run with secrets
  run: |
    npx @zuclubit/ui-kit validate 2>&1 | grep -v "license\|secret\|key"
```

### Artifact Retention

```yaml
- name: Upload Report
  uses: actions/upload-artifact@v4
  with:
    name: quality-report
    path: report.json
    retention-days: 30  # GDPR compliant
```

---

## 📋 Quick Reference

### Required Checks for Merge

| Check | Required Score | Blocks Merge |
|-------|----------------|--------------|
| Conformance | ≥ 75 | ✅ |
| Critical A11y | = 0 | ✅ |
| Hardcoded Colors | = 0 | ✅ |
| Governance Provider | Present | ✅ |

### Score Thresholds

| Level | Score | Color |
|-------|-------|-------|
| Platinum | 95-100 | 🟣 |
| Gold | 85-94 | 🟡 |
| Silver | 75-84 | ⚪ |
| Bronze | 60-74 | 🟤 |
| Fail | < 60 | 🔴 |

---

> **Nota:** Esta configuración asume GitHub Actions. Para otros CI/CD (GitLab, Jenkins, etc.), adaptar los comandos manteniendo los quality gates.

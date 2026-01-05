# Design Governance - Ventazo CRM

> **FASE 6 - Design System Enforcement**
> **Version:** 1.0.0
> **Date:** December 2025

---

## Overview

This document outlines the design governance framework for Ventazo CRM. It ensures consistent use of design tokens, card system components, and visual patterns across the codebase.

### Governance Tools

| Tool | Purpose | Command |
|------|---------|---------|
| `lint:tokens` | Detect hardcoded colors | `npm run lint:tokens` |
| `lint:cards` | Validate card system adoption | `npm run lint:cards` |
| `lint:design` | Run all design lints | `npm run lint:design` |
| `lint:design:ci` | CI mode (strict) | `npm run lint:design:ci` |

---

## 1. Color Token Governance

### Rule: No Hardcoded Hex Colors

All colors in TypeScript/TSX files must use CSS variables or Tailwind classes.

#### Prohibited Patterns

```tsx
// WRONG - Hardcoded hex colors
className="text-[#0D9488]"
className="bg-[#EF4444]/20"
style={{ color: '#14B8A6' }}

const COLORS = {
  primary: '#0D9488',  // WRONG
};
```

#### Correct Patterns

```tsx
// CORRECT - CSS Variables
className="text-[var(--tenant-primary)]"
className="bg-[var(--status-completed-bg)]"

// CORRECT - Tailwind semantic classes
className="text-primary"
className="bg-destructive/20"

// CORRECT - Design tokens
import { CARD_TOKENS } from '@/components/cards';
className={CARD_TOKENS.card.base}
```

### Color Token Reference

| Semantic Name | CSS Variable | Use Case |
|---------------|--------------|----------|
| Primary | `--tenant-primary` | Brand color, CTAs |
| Primary Light | `--tenant-primary-light` | Hover states |
| Primary Dark | `--tenant-primary-dark` | Active states |
| Completed | `--status-completed` | Success states |
| Pending | `--status-pending` | Warning states |
| Cancelled | `--status-cancelled` | Error states |
| Overdue | `--urgency-overdue` | Urgent items |
| Today | `--urgency-today` | Due today |
| This Week | `--urgency-this-week` | Due this week |
| Hot Score | `--score-hot` | Score 80-100 |
| Warm Score | `--score-warm` | Score 50-79 |
| Cold Score | `--score-cold` | Score 0-49 |

### Migration Guide

Run the linter with `--fix` to see suggested replacements:

```bash
npm run lint:tokens -- --fix
```

Example output:
```
📁 app/app/dashboard/page.tsx
──────────────────────────────────────────────────────────────
  🎨 Line 45: #0D9488
     Type: className
     Code: className="text-[#0D9488]"...
     💡 Suggestion: Replace with var(--tenant-primary)
```

---

## 2. Card System Governance

### Rule: Use CARD_TOKENS for Card Components

All card components (files matching `*Card.tsx`, `*KPI*.tsx`, etc.) should import and use `CARD_TOKENS`.

#### Required Import

```tsx
import { CARD_TOKENS, useCardInteractions } from '@/components/cards';
```

#### Prohibited Patterns

```tsx
// WRONG - Inline hover/focus styles
className="hover:shadow-lg hover:-translate-y-0.5"
className="focus:ring-2 focus:ring-teal-500"
className="transition-all duration-300"
```

#### Correct Patterns

```tsx
// CORRECT - Using CARD_TOKENS
import { CARD_TOKENS, useCardInteractions } from '@/components/cards';

function MyCard({ onClick }) {
  const { containerProps, wasClicked } = useCardInteractions({ onClick });

  return (
    <Card
      {...containerProps}
      className={cn(
        CARD_TOKENS.card.base,
        CARD_TOKENS.card.interactive,
        CARD_TOKENS.focus.ring,
        wasClicked && 'scale-[0.98]'
      )}
    >
      {/* content */}
    </Card>
  );
}
```

### CARD_TOKENS Reference

| Token Path | Description |
|------------|-------------|
| `CARD_TOKENS.card.base` | Base card styling |
| `CARD_TOKENS.card.interactive` | Hover/active states |
| `CARD_TOKENS.focus.ring` | Focus ring styling |
| `CARD_TOKENS.transitions.default` | Standard transitions |
| `CARD_TOKENS.transitions.fast` | Quick transitions |
| `CARD_TOKENS.transitions.slow` | Slow transitions |

### Adoption Metrics

Run the card linter to see current adoption:

```bash
npm run lint:cards
```

Example output:
```
📊 CARD SYSTEM ADOPTION METRICS
──────────────────────────────────────────────────────────────
  CARD_TOKENS adoption:        25% (3/12 files)
  useCardInteractions adoption: 8% (1/12 files)
  [█████░░░░░░░░░░░░░░░] Tokens
  [██░░░░░░░░░░░░░░░░░░] Hooks
```

---

## 3. CI Pipeline

### GitHub Actions Integration

The design governance checks run automatically on every PR:

```yaml
# .github/workflows/ci.yml
design-governance:
  name: Design Governance
  runs-on: ubuntu-latest
  steps:
    - name: Check hardcoded colors
      run: npm run lint:tokens -- --fix
      continue-on-error: true

    - name: Check card system adoption
      run: npm run lint:cards -- --fix
      continue-on-error: true
```

### Strict Mode (Future)

To enforce strict checks that fail the build:

```yaml
- name: Strict design checks
  run: npm run lint:design:ci
```

### PR Summary

The CI generates a summary in the PR showing:
- Total color violations
- Card system adoption percentage
- Top files needing migration

---

## 4. Pre-commit Hook (Optional)

Add to `.husky/pre-commit` for local enforcement:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run design token lint
cd apps/web && npm run lint:tokens
```

---

## 5. Migration Priority

### Phase 1: Critical Files (Week 1)

| File | Issue | Priority |
|------|-------|----------|
| `/app/app/dashboard/page.tsx` | 50+ hardcoded colors | **P0** |
| `/app/app/page.tsx` | Inline KPICard | **P0** |

### Phase 2: Card Components (Week 2)

| Component | Needs |
|-----------|-------|
| `SmartKPICard.tsx` | Add CARD_TOKENS import |
| `MetricCard.tsx` | Use CARD_TOKENS.card.interactive |
| All `*CardV3.tsx` | Add useCardInteractions |

### Phase 3: Remaining Components (Week 3+)

- Update chart color constants
- Migrate inline styles in settings pages
- Standardize loading skeleton styling

---

## 6. Allowed Exceptions

Some hardcoded values are allowed:

### Charts (Recharts)

Recharts requires hex values. Use a centralized config:

```tsx
// lib/charts/chart-colors.ts
export const CHART_COLORS = {
  primary: 'hsl(var(--tenant-primary))',
  // getComputedStyle approach for hex if needed
};
```

### CSS Custom Properties

Defining CSS variables is allowed:

```css
/* globals.css - ALLOWED */
--tenant-primary: 174 58% 29%;
```

### Third-party Libraries

External component libraries may require specific formats.

---

## 7. Governance Metrics Dashboard

Track progress over time:

| Metric | Week 0 | Target Week 4 | Target Week 8 |
|--------|--------|---------------|---------------|
| Hardcoded colors | 329 | 150 | 20 |
| CARD_TOKENS adoption | 0% | 50% | 90% |
| useCardInteractions | 0% | 30% | 80% |
| Nielsen Score | 7.1 | 7.8 | 8.5 |

---

## 8. Tooling Reference

### Commands

```bash
# Show all violations
npm run lint:tokens

# Show with suggested fixes
npm run lint:tokens -- --fix

# Strict mode (exits with error if violations)
npm run lint:tokens -- --strict

# Same for card system
npm run lint:cards
npm run lint:cards -- --fix
npm run lint:cards -- --strict

# Run all design lints
npm run lint:design

# CI mode (strict for both)
npm run lint:design:ci
```

### Script Locations

| Script | Path |
|--------|------|
| Token linter | `apps/web/scripts/lint-design-tokens.mjs` |
| Card linter | `apps/web/scripts/lint-card-system.mjs` |

---

## Appendix: Related Documentation

- `docs/CARD_SYSTEM_GUIDELINES.md` - FASE 4 Card System
- `docs/DASHBOARD_INFORMATION_ARCHITECTURE.md` - FASE 5.1
- `docs/DASHBOARD_UX_CONSISTENCY_REPORT.md` - FASE 5.2-5.3
- `docs/UX_HEURISTICS_VALIDATION.md` - FASE 5.4-5.5

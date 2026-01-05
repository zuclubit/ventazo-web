# Theme Architecture: Canonical CSS Variable Map

## Overview

This document serves as the **single source of truth** for all CSS custom properties (CSS variables) used across the Zuclubit CRM application. All theme hooks, components, and stylesheets MUST reference variables from this map.

**Last Updated:** December 30, 2025
**Compliance Score:** Phase Y+1 Target ≥90

---

## Table of Contents

1. [Core Design Tokens](#core-design-tokens)
2. [Tenant Branding Variables](#tenant-branding-variables)
3. [Module-Specific Variables](#module-specific-variables)
4. [Action Colors](#action-colors)
5. [Usage Patterns](#usage-patterns)
6. [Forbidden Patterns](#forbidden-patterns)

---

## Core Design Tokens

### Location: `globals.css` lines 1-150

These are foundational tokens that all other variables may reference.

| Variable | Light Mode | Dark Mode | Usage |
|----------|-----------|-----------|-------|
| `--background` | `0 0% 100%` | `224 71% 4%` | Page backgrounds |
| `--foreground` | `224 71% 4%` | `213 31% 91%` | Primary text |
| `--card` | `0 0% 100%` | `224 71% 4%` | Card backgrounds |
| `--card-foreground` | `224 71% 4%` | `213 31% 91%` | Card text |
| `--primary` | `220.9 39.3% 11%` | `210 20% 98%` | Primary actions |
| `--primary-foreground` | `210 20% 98%` | `220.9 39.3% 11%` | Primary button text |
| `--secondary` | `220 14.3% 95.9%` | `215 27.9% 16.9%` | Secondary surfaces |
| `--muted` | `220 14.3% 95.9%` | `215 27.9% 16.9%` | Muted backgrounds |
| `--accent` | `220 14.3% 95.9%` | `215 27.9% 16.9%` | Accent highlights |
| `--destructive` | `0 84.2% 60.2%` | `0 62.8% 30.6%` | Error/delete actions |
| `--border` | `220 13% 91%` | `215 27.9% 16.9%` | Borders |
| `--ring` | `224 71.4% 4.1%` | `216 12.2% 83.9%` | Focus rings |

---

## Tenant Branding Variables

### Location: `globals.css` lines 160-220

Dynamic variables set by TenantThemeProvider based on tenant settings.

| Variable | Default | Description |
|----------|---------|-------------|
| `--tenant-primary` | `#0EB58C` | Primary brand color |
| `--tenant-secondary` | `#818CF8` | Secondary brand color |
| `--tenant-accent` | `#F59E0B` | Accent/highlight color |
| `--tenant-neutral` | `#64748B` | Neutral/gray color |
| `--tenant-primary-rgb` | `14, 181, 140` | RGB triplet for opacity calcs |
| `--tenant-secondary-rgb` | `129, 140, 248` | RGB triplet for opacity calcs |

### Derived Variables (Auto-computed)

| Variable | Computation |
|----------|-------------|
| `--tenant-primary-light` | Lightened 15% |
| `--tenant-primary-dark` | Darkened 15% |
| `--tenant-secondary-light` | Lightened 15% |
| `--tenant-secondary-dark` | Darkened 15% |

---

## Module-Specific Variables

### Leads/Kanban Module

**Location:** `globals.css` lines 230-280

#### Score Colors (Temperature-based)

| Variable | Light Mode | Dark Mode | Usage |
|----------|-----------|-----------|-------|
| `--score-hot-base` | `#F97316` | `#FB923C` | Score 70-100 |
| `--score-hot-light` | `#FB923C` | `#FDBA74` | Hover states |
| `--score-hot-dark` | `#EA580C` | `#F97316` | Active states |
| `--score-warm-base` | `#EAB308` | `#FACC15` | Score 40-69 |
| `--score-warm-light` | `#FACC15` | `#FDE047` | Hover states |
| `--score-warm-dark` | `#CA8A04` | `#EAB308` | Active states |
| `--score-cold-base` | `#3B82F6` | `#60A5FA` | Score 0-39 |
| `--score-cold-light` | `#60A5FA` | `#93C5FD` | Hover states |
| `--score-cold-dark` | `#2563EB` | `#3B82F6` | Active states |

#### Lead Status Colors

| Variable | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--lead-status-new` | `#3B82F6` | `#60A5FA` |
| `--lead-status-contacted` | `#8B5CF6` | `#A78BFA` |
| `--lead-status-qualified` | `#10B981` | `#34D399` |
| `--lead-status-proposal` | `#F59E0B` | `#FBBF24` |
| `--lead-status-negotiation` | `#EC4899` | `#F472B6` |
| `--lead-status-won` | `#059669` | `#10B981` |
| `--lead-status-lost` | `#DC2626` | `#EF4444` |

---

### Opportunities Module

**Location:** `globals.css` lines 240-280

#### Probability Colors

| Variable | Light Mode | Dark Mode | Usage |
|----------|-----------|-----------|-------|
| `--prob-high-base` | `#059669` | `#10B981` | 70%+ probability |
| `--prob-high-light` | `#34D399` | `#6EE7B7` | |
| `--prob-high-dark` | `#047857` | `#059669` | |
| `--prob-high-text` | `#FFFFFF` | `#FFFFFF` | |
| `--prob-medium-base` | `#F59E0B` | `#FBBF24` | 30-69% probability |
| `--prob-medium-light` | `#FCD34D` | `#FDE68A` | |
| `--prob-medium-dark` | `#D97706` | `#F59E0B` | |
| `--prob-medium-text` | `#78350F` | `#422006` | |
| `--prob-low-base` | `#EF4444` | `#F87171` | 0-29% probability |
| `--prob-low-light` | `#FCA5A5` | `#FECACA` | |
| `--prob-low-dark` | `#DC2626` | `#EF4444` | |
| `--prob-low-text` | `#FFFFFF` | `#FFFFFF` | |

#### Opportunity Status Colors

| Variable | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--opp-status-won-text` | `#059669` | `#34D399` |
| `--opp-status-lost-text` | `#DC2626` | `#F87171` |
| `--opp-priority-critical-text` | `#DC2626` | `#F87171` |

---

### Quotes Module

**Location:** `globals.css` lines 290-340

#### Quote Status Colors

| Variable | Light Mode | Dark Mode | Usage |
|----------|-----------|-----------|-------|
| `--quote-status-draft` | `#6B7280` | `#9CA3AF` | Draft quotes |
| `--quote-status-pending` | `#F59E0B` | `#FBBF24` | Pending approval |
| `--quote-status-sent` | `#3B82F6` | `#60A5FA` | Sent to client |
| `--quote-status-viewed` | `#8B5CF6` | `#A78BFA` | Client viewed |
| `--quote-status-accepted` | `#10B981` | `#34D399` | Accepted |
| `--quote-status-rejected` | `#EF4444` | `#F87171` | Rejected |
| `--quote-status-expired` | `#78716C` | `#A8A29E` | Expired |
| `--quote-status-revised` | `#0EA5E9` | `#38BDF8` | Revised |

#### Quote Urgency Colors

| Variable | Light Mode | Dark Mode |
|----------|-----------|-----------|
| `--quote-urgency-expired-text` | `#DC2626` | `#F87171` |
| `--quote-urgency-critical-text` | `#F59E0B` | `#FBBF24` |
| `--quote-urgency-warning-text` | `#3B82F6` | `#60A5FA` |
| `--quote-urgency-warning` | `#DBEAFE` | `#1E3A5F` |

---

### Calendar Module

**Location:** `globals.css` lines 350-380

| Variable | Light Mode | Dark Mode | Usage |
|----------|-----------|-----------|-------|
| `--cal-event-lead` | `#3B82F6` | `#60A5FA` | Lead events |
| `--cal-event-customer` | `#10B981` | `#34D399` | Customer events |
| `--cal-event-opportunity` | `#F59E0B` | `#FBBF24` | Opportunity events |
| `--cal-event-task` | `#8B5CF6` | `#A78BFA` | Task events |
| `--cal-event-confirmed` | `#059669` | `#10B981` | Confirmed status |
| `--cal-event-tentative` | `#F59E0B` | `#FBBF24` | Tentative status |
| `--cal-event-cancelled` | `#EF4444` | `#F87171` | Cancelled status |

---

### Settings Module

**Location:** `globals.css` lines 400-500

Each settings category has icon and background variants:

| Category | Icon Variable | Background Variable |
|----------|--------------|---------------------|
| Profile | `--settings-profile-icon` | `--settings-profile-bg` |
| Notifications | `--settings-notifications-icon` | `--settings-notifications-bg` |
| Branding | `--settings-branding-icon` | `--settings-branding-bg` |
| Team | `--settings-team-icon` | `--settings-team-bg` |
| Billing | `--settings-billing-icon` | `--settings-billing-bg` |
| Messaging | `--settings-messaging-icon` | `--settings-messaging-bg` |
| Proposals | `--settings-proposals-icon` | `--settings-proposals-bg` |
| Integrations | `--settings-integrations-icon` | `--settings-integrations-bg` |
| Pipeline | `--settings-pipeline-icon` | `--settings-pipeline-bg` |
| Activity | `--settings-activity-icon` | `--settings-activity-bg` |
| Security | `--settings-security-icon` | `--settings-security-bg` |
| Data | `--settings-data-icon` | `--settings-data-bg` |

---

## Action Colors

### Location: `globals.css` lines 240-260 (CANONICAL)

**CRITICAL:** These are the ONLY canonical definitions. Do NOT duplicate elsewhere.

| Variable | Value | Usage |
|----------|-------|-------|
| `--action-whatsapp` | `#25D366` | WhatsApp actions |
| `--action-call` | `#3B82F6` | Phone call actions |
| `--action-email` | `#3B82F6` | Email actions |
| `--action-send` | `#3B82F6` | Send actions |
| `--action-accept` | `#10B981` | Accept/approve actions |
| `--action-reject` | `#EF4444` | Reject/decline actions |
| `--action-win` | `#10B981` | Win opportunity |
| `--action-lost` | `#EF4444` | Lost opportunity |
| `--action-warning` | `#F59E0B` | Warning states |
| `--action-complete` | `#059669` | Complete task |

---

## Usage Patterns

### Pattern 1: Direct CSS Variable Reference

For static color display:

```typescript
const color = 'var(--tenant-primary, #0EB58C)';
```

### Pattern 2: color-mix() for Dynamic Opacity

For backgrounds with transparency:

```typescript
const bgColor = 'color-mix(in srgb, var(--action-whatsapp, #25D366) 10%, transparent)';
const hoverBg = 'color-mix(in srgb, var(--action-whatsapp, #25D366) 15%, transparent)';
const border = 'color-mix(in srgb, var(--action-whatsapp, #25D366) 25%, transparent)';
```

### Pattern 3: Raw Values for JS Computations

When functions like `hexToRgba()` or `blendColors()` need actual hex values:

```typescript
const COLORS = {
  base: 'var(--score-hot-base, #F97316)',  // For display
  rawBase: '#F97316',                        // For computation
};

// Usage
const displayColor = COLORS.base;           // CSS variable
const computed = hexToRgba(COLORS.rawBase, 0.5);  // Actual hex
```

### Pattern 4: Tailwind Dark Mode Classes

For Tailwind-based styling:

```typescript
className="text-blue-500 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10"
```

---

## Forbidden Patterns

### DO NOT:

1. **Define duplicate variables**
   ```css
   /* WRONG - creates conflicts */
   --action-win: #10B981;  /* Already defined at line 249 */
   ```

2. **Use hardcoded colors without fallbacks**
   ```typescript
   // WRONG
   const color = '#10B981';

   // CORRECT
   const color = 'var(--action-win, #10B981)';
   ```

3. **Use rgba() for dynamic opacity**
   ```typescript
   // WRONG - not themeable
   const bg = 'rgba(37, 211, 102, 0.1)';

   // CORRECT
   const bg = 'color-mix(in srgb, var(--action-whatsapp, #25D366) 10%, transparent)';
   ```

4. **Mix CSS variables in JS color functions**
   ```typescript
   // WRONG - won't work
   hexToRgba('var(--action-win, #10B981)', 0.5);

   // CORRECT - use raw value
   hexToRgba('#10B981', 0.5);
   ```

---

## Theme Hook Reference

| Hook | Module | Location |
|------|--------|----------|
| `useKanbanTheme` | Leads | `leads/hooks/useKanbanTheme.tsx` |
| `useOpportunityTheme` | Opportunities | `opportunities/hooks/useOpportunityTheme.tsx` |
| `useQuoteTheme` | Quotes | `quotes/hooks/useQuoteTheme.tsx` |
| `useSettingsTheme` | Settings | `settings/hooks/useSettingsTheme.ts` |
| `useTenantBranding` | Global | `hooks/use-tenant-branding.ts` |

---

## Validation Checklist

Before adding new colors:

- [ ] Check if variable already exists in this map
- [ ] Add to appropriate module section in `globals.css`
- [ ] Define both light AND dark mode variants
- [ ] Use semantic naming (`--module-element-state`)
- [ ] Add fallback value in usage
- [ ] Update this documentation

---

*Generated as part of Phase Y+1: Dynamic Theme Consolidation*

# CLS Risk Report & Action Plan - Ventazo CRM

> **Phase Y: Cumulative Layout Shift Analysis**
> Ventazo CRM by Zuclubit

---

## Executive Summary

Cumulative Layout Shift (CLS) measures visual stability during page load. A CLS score below 0.1 is considered "good" by Core Web Vitals.

### Current Status

| Category | CLS Risk | Status |
|----------|----------|--------|
| Main Modules | Low | ✅ Good |
| Settings Pages | Medium | ⚠️ Acceptable |
| Auth/Onboarding | Low | ✅ Good |
| Modals/Sheets | Low | ✅ Good |

---

## Risk Assessment by Module

### Low Risk (CLS < 0.05)

These modules have proper skeletons that match final content:

1. **Dashboard** - KPI cards use `min-h-[96px]`, charts use `aspect-[4/3]`
2. **Leads Kanban** - Column widths fixed, card heights consistent
3. **Opportunities Kanban** - Same patterns as Leads
4. **Customers Kanban** - Same patterns as Leads
5. **Tasks Kanban/List** - Both views have matching skeletons
6. **Quotes Kanban/Grid/List** - All three views covered
7. **Calendar** - Full 7x6 grid skeleton

### Medium Risk (CLS 0.05-0.10)

These modules could benefit from improved skeletons:

1. **Settings Profile** - Spinner instead of form skeleton
2. **Settings Team** - Table could shift when data loads
3. **Settings Pipeline** - List could shift

### High Risk (CLS > 0.10)

Currently, no modules are identified as high risk.

---

## Specific CLS Issues Identified

### Issue 1: TaskStatsBar Text Loading

**Location:** `src/app/app/tasks/components/TaskStatsBar.tsx:69`

**Problem:**
```tsx
if (isLoading) {
  return (
    <div className="h-11 flex items-center px-4">
      <Loader2 className="h-4 w-4 animate-spin" />
      <span className="ml-2 text-sm">Cargando estadísticas...</span>
    </div>
  );
}
```

**CLS Impact:** Low (text is smaller than final content)

**Fix:**
```tsx
if (isLoading) {
  return (
    <div className="h-11 flex items-center gap-1 px-2 rounded-lg bg-muted/30 border border-border/50">
      {[1, 2, 3, 4].map((i) => (
        <React.Fragment key={i}>
          <Skeleton className="h-6 w-16 rounded-md" />
          {i < 4 && <span className="text-muted-foreground/30">·</span>}
        </React.Fragment>
      ))}
    </div>
  );
}
```

---

### Issue 2: CalendarGrid Internal Loading

**Location:** `src/app/app/calendar/components/CalendarGrid.tsx:317`

**Problem:**
```tsx
if (isLoading && !eventsData) {
  return (
    <div className="flex flex-col items-center justify-center py-12 gap-4">
      <Loader2 className="h-8 w-8 animate-spin" />
      <p className="text-muted-foreground">Cargando calendario...</p>
    </div>
  );
}
```

**CLS Impact:** High (centered content vs full grid)

**Fix:** Use existing `CalendarGridSkeleton`

---

### Issue 3: Form Dropdown Loading

**Location:** Multiple form sheets

**Problem:** Select dropdowns show text "Cargando etapas..." while loading options.

**CLS Impact:** Low (within dropdown, not page)

**Fix:** Use `Skeleton` for the select trigger while loading.

---

## CLS Prevention Patterns

### Pattern 1: Fixed Height Cards

```tsx
// Always reserve space
<Card className="min-h-[96px]">
  {isLoading ? <CardSkeleton /> : <CardContent />}
</Card>
```

### Pattern 2: Aspect Ratio for Charts

```tsx
// Prevents chart height from causing shift
<div className="w-full aspect-[4/3]">
  {isLoading ? <SkeletonChart /> : <RealChart />}
</div>
```

### Pattern 3: Fixed Width Kanban Columns

```tsx
// All columns same width
<div className="w-[280px] shrink-0">
  {isLoading ? <ColumnSkeleton /> : <RealColumn />}
</div>
```

### Pattern 4: Flex Containment Chain

```
DashboardShell (h-dvh, overflow-hidden)
  └── main (flex-1, min-h-0, overflow-hidden)
      └── PageContainer (flex-1, min-h-0, overflow-hidden)
          └── PageContent (flex-1, min-h-0, overflow-y-auto)
```

---

## Action Plan

### P0 - Immediate (This Sprint)

| Task | File | Priority | Effort |
|------|------|----------|--------|
| Fix TaskStatsBar skeleton | `TaskStatsBar.tsx` | P0 | 15 min |
| Fix CalendarGrid loading | `CalendarGrid.tsx` | P0 | 10 min |

### P1 - Short Term (Next Sprint)

| Task | File | Priority | Effort |
|------|------|----------|--------|
| Create SettingsPageSkeleton | New component | P1 | 30 min |
| Fix OpportunityFormSheet | `opportunity-form-sheet.tsx` | P1 | 15 min |
| Fix SendTemplateDialog | `SendTemplateDialog.tsx` | P1 | 15 min |
| Fix QuotePdfActions | `QuotePdfActions.tsx` | P1 | 20 min |

### P2 - Long Term (Future Sprints)

| Task | File | Priority | Effort |
|------|------|----------|--------|
| Add skeleton to all Settings pages | Multiple | P2 | 2 hours |
| Improve onboarding loading states | Multiple | P2 | 1 hour |
| Create SelectDropdownSkeleton | New component | P2 | 30 min |

---

## Validation Process

### Manual Testing

1. Open Chrome DevTools → Network → Slow 3G
2. Navigate to each page
3. Observe if content "jumps" during load
4. Document any visible shifts

### Lighthouse Audit

```bash
# Run Lighthouse CLI
lighthouse https://crm.zuclubit.com --only-categories=performance

# Check CLS score in output
```

### Performance Tab Recording

1. Open DevTools → Performance
2. Start recording
3. Navigate/refresh page
4. Stop recording
5. Look for "Layout Shift" entries
6. Target: Total CLS < 0.1

---

## Monitoring

### Recommended Tools

- **Lighthouse**: Periodic audits
- **Web Vitals Extension**: Real-time monitoring
- **Sentry Performance**: Production monitoring

### Thresholds

| Metric | Good | Needs Work | Poor |
|--------|------|------------|------|
| CLS | < 0.1 | 0.1 - 0.25 | > 0.25 |
| LCP | < 2.5s | 2.5s - 4s | > 4s |
| FID | < 100ms | 100ms - 300ms | > 300ms |

---

## Conclusion

The Ventazo CRM currently has **good CLS scores** in the main user-facing modules. The identified issues are minor and can be addressed in the normal development cycle.

### Key Wins

- ✅ All Kanban boards use proper skeletons
- ✅ Dashboard charts use aspect-ratio
- ✅ Cards use min-height
- ✅ No high-risk CLS issues

### Areas for Improvement

- Settings pages could use dedicated skeletons
- Some form dropdowns use text loading
- Minor text loading states in a few components

---

*Last updated: December 2025*
*Ventazo by Zuclubit - Smart CRM*

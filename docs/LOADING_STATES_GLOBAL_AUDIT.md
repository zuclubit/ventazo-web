# Loading States Global Audit - Ventazo CRM

> **Phase Y: Global Loading States Audit & Skeleton Enforcement**
> Completed: December 2025
> Ventazo CRM by Zuclubit

---

## Executive Summary

This document provides a comprehensive audit of all loading states across the Ventazo CRM application. Each screen and component has been evaluated for skeleton usage, text-based loading states, and CLS risk.

### Legend

| Status | Description |
|--------|-------------|
| ✅ GOOD | Proper skeleton usage, no CLS issues |
| ⚠️ PARTIAL | Skeleton exists but has issues or uses text fallback |
| ❌ NEEDS FIX | No skeleton, uses text "Cargando...", or causes CLS |

---

## Main Modules Audit

### 1. Dashboard (`/app/dashboard`)

| Component | Status | Notes |
|-----------|--------|-------|
| Page skeleton | ✅ GOOD | DashboardSkeleton with KPI/Chart/Stats/Insights |
| KPI cards | ✅ GOOD | min-h-[96px] prevents collapse |
| Charts | ✅ GOOD | aspect-[4/3] with shimmer effect |
| Stats cards | ✅ GOOD | Layout matches final |
| Insights | ✅ GOOD | Proper structure |

**Overall: ✅ GOOD**

---

### 2. Calendar (`/app/calendar`)

| Component | Status | Notes |
|-----------|--------|-------|
| Page skeleton | ✅ GOOD | CalendarSkeleton (header + toolbar + 7x6 grid) |
| CalendarGrid loading | ❌ NEEDS FIX | Line 317: Uses text "Cargando calendario..." |
| EventFormSheet | ⚠️ PARTIAL | Line 550: Uses text "Cargando calendarios..." |
| EventDetailSheet | ✅ GOOD | Proper loading states |

**Overall: ⚠️ PARTIAL** - CalendarGrid internal loading needs skeleton

---

### 3. Leads (`/app/leads`)

| Component | Status | Notes |
|-----------|--------|-------|
| Page skeleton | ✅ GOOD | KanbanSkeleton with 5 columns |
| Empty state | ✅ GOOD | LeadsEmptyState component |
| Error state | ✅ GOOD | Retry button with proper layout |
| LeadDetailSheet | ✅ GOOD | Proper loading in forms |
| LeadFormSheet | ✅ GOOD | Button disabled states |

**Overall: ✅ GOOD**

---

### 4. Opportunities (`/app/opportunities`)

| Component | Status | Notes |
|-----------|--------|-------|
| Page skeleton | ✅ GOOD | OpportunityKanbanBoardSkeleton |
| Empty state | ✅ GOOD | OpportunitiesEmptyState component |
| OpportunityFormSheet | ⚠️ PARTIAL | Line 665: Uses text "Cargando etapas..." |
| OpportunityFormDialog | ⚠️ PARTIAL | Line 360: Uses text "Cargando etapas..." |
| WinLostDialog | ✅ GOOD | Proper button states |

**Overall: ⚠️ PARTIAL** - Form dialogs use text loading for stages

---

### 5. Customers (`/app/customers`)

| Component | Status | Notes |
|-----------|--------|-------|
| Page skeleton | ✅ GOOD | CustomerKanbanSkeleton with 6 columns |
| Empty state | ✅ GOOD | CustomersEmptyState component |
| Error state | ✅ GOOD | Retry button |
| CustomerDetailSheet | ✅ GOOD | Proper form loading |
| CustomerFormSheet | ✅ GOOD | Button disabled states |

**Overall: ✅ GOOD**

---

### 6. Tasks (`/app/tasks`)

| Component | Status | Notes |
|-----------|--------|-------|
| Page Kanban skeleton | ✅ GOOD | TaskKanbanBoardSkeleton |
| Page List skeleton | ✅ GOOD | TaskListSkeleton |
| TaskStatsBar | ❌ NEEDS FIX | Line 69: Uses text "Cargando estadísticas..." |
| TaskToolbar | ✅ GOOD | Skeleton exists |
| TaskDetailSheet | ✅ GOOD | Proper form loading |
| TaskCreateSheet | ✅ GOOD | Button states |

**Overall: ⚠️ PARTIAL** - TaskStatsBar uses text loading

---

### 7. Quotes (`/app/quotes`)

| Component | Status | Notes |
|-----------|--------|-------|
| Page Kanban skeleton | ✅ GOOD | QuotesKanbanSkeleton with 5 columns |
| Page Grid skeleton | ✅ GOOD | Uses QuoteCardV3Skeleton |
| QuotesListView | ✅ GOOD | Row skeletons |
| Empty state | ✅ GOOD | QuotesEmptyState with variants |
| QuotePdfActions | ⚠️ PARTIAL | Lines 164,326: Uses text "Cargando..." |
| QuoteDetailSheet | ✅ GOOD | Proper states |
| QuoteCreateSheet | ✅ GOOD | Button states |

**Overall: ⚠️ PARTIAL** - PDF actions use text loading

---

## Settings Pages Audit

### 8. Settings - Profile (`/app/settings/profile`)

| Component | Status | Notes |
|-----------|--------|-------|
| Page loading | ⚠️ PARTIAL | Uses Loader2 spinner centered |
| Form submissions | ✅ GOOD | Button spinners |
| Avatar upload | ✅ GOOD | Proper loading |

**Overall: ⚠️ PARTIAL** - Could use profile skeleton

---

### 9. Settings - Team (`/app/settings/team`)

| Component | Status | Notes |
|-----------|--------|-------|
| Members loading | ⚠️ PARTIAL | Uses Loader2 spinner centered |
| Invitations loading | ⚠️ PARTIAL | Uses Loader2 spinner |
| Actions | ✅ GOOD | Button spinners |

**Overall: ⚠️ PARTIAL** - Could use team list skeleton

---

### 10. Settings - Pipeline (`/app/settings/pipeline`)

| Component | Status | Notes |
|-----------|--------|-------|
| Page loading | ⚠️ PARTIAL | Uses Loader2 spinner centered |
| Form submissions | ✅ GOOD | Button spinners |

**Overall: ⚠️ PARTIAL** - Could use pipeline skeleton

---

### 11. Settings - Branding (`/app/settings/branding`)

| Component | Status | Notes |
|-----------|--------|-------|
| Save button | ✅ GOOD | Loader2 in button |
| Logo upload | ✅ GOOD | Loading states |

**Overall: ✅ GOOD**

---

### 12. Settings - Data (`/app/settings/data`)

| Component | Status | Notes |
|-----------|--------|-------|
| Export loading | ⚠️ PARTIAL | Loader2 centered |
| Import | ✅ GOOD | Progress indicator |

**Overall: ⚠️ PARTIAL**

---

### 13. Settings - Messaging Templates (`/app/settings/messaging/templates`)

| Component | Status | Notes |
|-----------|--------|-------|
| SendTemplateDialog | ❌ NEEDS FIX | Line 420: Uses text "Cargando..." |
| Template preview | ✅ GOOD | Loading states |

**Overall: ⚠️ PARTIAL**

---

## Auth & Onboarding Audit

### 14. Login (`/login`)

| Component | Status | Notes |
|-----------|--------|-------|
| Form submission | ✅ GOOD | Button loading state |
| Page layout | ✅ GOOD | Static, no data loading |

**Overall: ✅ GOOD**

---

### 15. Register (`/register`)

| Component | Status | Notes |
|-----------|--------|-------|
| Form submission | ✅ GOOD | Button loading state |
| Password validation | ✅ GOOD | Real-time feedback |

**Overall: ✅ GOOD**

---

### 16. Reset Password (`/reset-password`)

| Component | Status | Notes |
|-----------|--------|-------|
| Token verification | ❌ NEEDS FIX | Line 18: Uses text "Cargando..." |
| Form submission | ✅ GOOD | Button loading state |

**Overall: ⚠️ PARTIAL**

---

### 17. Onboarding Complete (`/onboarding/complete`)

| Component | Status | Notes |
|-----------|--------|-------|
| Tenant loading | ❌ NEEDS FIX | Line 401: Uses text "Cargando..." |

**Overall: ⚠️ PARTIAL**

---

## Components Audit

### Modals & Sheets

| Component | Status | Notes |
|-----------|--------|-------|
| LeadDetailSheet | ✅ GOOD | View/Edit modes |
| CustomerDetailSheet | ✅ GOOD | View/Edit modes |
| OpportunityDetailSheet | ✅ GOOD | View/Edit modes |
| TaskDetailSheet | ✅ GOOD | View/Edit modes |
| QuoteDetailSheet | ✅ GOOD | View/Edit modes |
| All FormSheets | ✅ GOOD | Button spinners |

---

### Empty States

| Component | Status | Notes |
|-----------|--------|-------|
| LeadsEmptyState | ✅ GOOD | CTA to create |
| CustomersEmptyState | ✅ GOOD | CTA to create |
| OpportunitiesEmptyState | ✅ GOOD | CTA to create |
| TasksEmptyState | ✅ GOOD | Inline in page |
| QuotesEmptyState | ✅ GOOD | Multiple variants |
| CalendarEmptyState | ✅ GOOD | CTA to connect |

---

## Summary Statistics

| Status | Count | Percentage |
|--------|-------|------------|
| ✅ GOOD | 12 | 60% |
| ⚠️ PARTIAL | 7 | 35% |
| ❌ NEEDS FIX | 1 | 5% |

---

## Priority Issues List

### P0 - Critical (Must Fix)

1. **TaskStatsBar** - Line 69
   - Issue: Text "Cargando estadísticas..."
   - Impact: Visible on main Tasks page
   - Fix: Create TaskStatsBarSkeleton matching 44px height

2. **CalendarGrid** - Line 317
   - Issue: Text "Cargando calendario..."
   - Impact: Visible when calendar refetches
   - Fix: Use existing CalendarGridSkeleton

### P1 - High (Should Fix)

3. **OpportunityFormSheet** - Line 665
   - Issue: Text "Cargando etapas..."
   - Fix: Skeleton for select dropdown

4. **OpportunityFormDialog** - Line 360
   - Issue: Text "Cargando etapas..."
   - Fix: Same as above

5. **QuotePdfActions** - Lines 164, 326
   - Issue: Text "Cargando..."
   - Fix: Skeleton for PDF viewer

6. **SendTemplateDialog** - Line 420
   - Issue: Text "Cargando..."
   - Fix: Skeleton for recipients list

### P2 - Medium (Nice to Have)

7. **Settings Profile** - Full page spinner
   - Fix: Profile form skeleton

8. **Settings Team** - Full page spinners
   - Fix: Team list skeleton

9. **Settings Pipeline** - Full page spinner
   - Fix: Pipeline stages skeleton

10. **Reset Password Page** - Line 18
    - Fix: Token validation skeleton

11. **Onboarding Complete** - Line 401
    - Fix: Tenant loading skeleton

12. **EventFormSheet** - Line 550
    - Fix: Calendar dropdown skeleton

---

## Recommended Actions

### Immediate (P0)

```tsx
// TaskStatsBar - Replace text loading with skeleton
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

```tsx
// CalendarGrid - Use skeleton instead of text
if (isLoading && !eventsData) {
  return <CalendarGridSkeleton />;
}
```

### Short-term (P1)

- Create reusable skeleton for select dropdowns loading
- Add skeleton state to QuotePdfActions preview
- Create skeleton for recipient selection

### Long-term (P2)

- Create dedicated skeletons for Settings pages
- Improve onboarding loading states
- Add skeleton to all form dropdowns

---

## Validation Checklist

Before any PR is merged, verify:

- [ ] No text "Cargando..." or "Loading..." visible
- [ ] All skeletons match final content dimensions
- [ ] CLS < 0.1 in Lighthouse audit
- [ ] Responsive on mobile/tablet/desktop
- [ ] aria-label on skeleton containers

---

*Last updated: December 2025*
*Ventazo by Zuclubit - Smart CRM*

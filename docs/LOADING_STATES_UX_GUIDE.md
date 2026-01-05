# Loading States & Layout Stability Guide

> **Principle:** A CRM should feel stable from the first pixel. Loading states must reserve exact space and prevent Cumulative Layout Shift (CLS).

## Table of Contents

1. [Core Principles](#core-principles)
2. [Skeleton Component System](#skeleton-component-system)
3. [Layout Stability Patterns](#layout-stability-patterns)
4. [Module-Specific Guidelines](#module-specific-guidelines)
5. [Checklist for PRs](#checklist-for-prs)

---

## Core Principles

### 1. No Layout Shift

```
"Nothing moves unless the user causes it"
```

- Skeletons must match the **exact dimensions** of final content
- Use `min-height`, `aspect-ratio`, or explicit heights
- Headers and toolbars must render immediately (not after data loads)

### 2. Progressive Loading Without Reflow

- Load critical UI structure first (PageContainer, headers)
- Show skeletons that match final layout
- Hydrate data without causing repaints

### 3. Immediate Visual Feedback

- Show skeleton within 16ms of navigation
- Use shimmer animation for premium feel
- Maintain visual hierarchy even in loading state

---

## Skeleton Component System

### Base Skeleton (Enhanced)

```tsx
import { Skeleton, SkeletonText, SkeletonCard, SkeletonChart } from '@/components/ui/skeleton';

// Basic skeleton with pulse animation
<Skeleton className="h-4 w-32" />

// Shimmer variant for premium feel
<Skeleton variant="shimmer" className="h-16 w-full" />

// Chart skeleton with aspect-ratio (prevents CLS)
<SkeletonChart aspectRatio="16/9" />

// Card skeleton with header/footer
<SkeletonCard hasHeader hasFooter contentLines={3} />
```

### Skeleton Variants

| Variant | Use Case | Animation |
|---------|----------|-----------|
| `default` | General placeholders | Pulse |
| `pulse` | Same as default | Pulse |
| `shimmer` | Premium cards, charts | Gradient sweep |

### Recommended Sizes

| Element | Skeleton Dimensions |
|---------|---------------------|
| H1 Title | `h-7 w-32` |
| H2 Title | `h-5 w-28` |
| Body text | `h-3 w-full` |
| Button SM | `h-8 w-20 rounded-md` |
| Button MD | `h-9 w-24 rounded-md` |
| Avatar SM | `h-6 w-6 rounded-full` |
| Avatar MD | `h-9 w-9 rounded-full` |
| Badge | `h-5 w-12 rounded-full` |
| Icon | `h-4 w-4` or `h-5 w-5` |

---

## Layout Stability Patterns

### Pattern 1: PageContainer Structure

Always wrap pages in PageContainer for consistent containment:

```tsx
<PageContainer>
  <PageContainer.Header>
    {/* Header renders immediately */}
  </PageContainer.Header>
  <PageContainer.Body>
    <PageContainer.Content scroll="vertical">
      {isLoading ? <MySkeleton /> : <MyContent />}
    </PageContainer.Content>
  </PageContainer.Body>
</PageContainer>
```

### Pattern 2: Aspect Ratio for Charts/Images

```tsx
// BAD: Fixed height causes CLS when data loads
<div className="h-64 w-full">
  <Chart />
</div>

// GOOD: Aspect ratio maintains consistent size
<div className="w-full aspect-[4/3]">
  <Chart />
</div>

// Skeleton version
<Skeleton
  variant="shimmer"
  className="w-full aspect-[4/3]"
/>
```

### Pattern 3: Min-Height for Cards

```tsx
// Ensure cards don't collapse during loading
<Card className="min-h-[96px]">
  {/* Content */}
</Card>
```

### Pattern 4: Flex Containment Chain

Critical for scrollable views:

```
DashboardShell (h-dvh, overflow-hidden)
  └── main (flex-1, min-h-0, overflow-hidden)
      └── PageContainer (flex-1, min-h-0, overflow-hidden)
          └── PageContent (flex-1, min-h-0, overflow-y-auto)
```

Every level needs:
- `flex-1` to fill space
- `min-h-0` to allow shrinking
- `overflow-hidden` except the scroll target

---

## Module-Specific Guidelines

### Dashboard

- 8 KPI cards with `min-h-[96px]`
- Charts use `aspect-[4/3]` with shimmer
- Stats/Insights cards match exact structure

```tsx
function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 lg:grid-cols-4">
        {[1,2,3,4].map(i => <KPICardSkeleton key={i} />)}
      </div>
      {/* ... */}
    </div>
  );
}
```

### Calendar

- Full grid skeleton matching 7x6 structure
- Toolbar skeleton with navigation + view toggle
- Header rendered separately from loading state

```tsx
if (isLoading) {
  return <CalendarSkeleton />;
}
```

### Kanban (Leads, Tasks, Quotes, Opportunities)

- Use inline-flex with exact column widths
- Cards have consistent heights
- Vary card count per column for realistic appearance

```tsx
function KanbanSkeleton({ columns = 5 }) {
  const cardsDistribution = [4, 3, 2, 2, 1];
  return (
    <div className="inline-flex gap-4 h-full">
      {Array.from({ length: columns }).map((_, i) => (
        <ColumnSkeleton
          key={i}
          cardsCount={cardsDistribution[i]}
        />
      ))}
    </div>
  );
}
```

### Lists/Tables

- Match exact row structure
- Include header skeleton
- Show realistic number of rows (8-10)

```tsx
function TaskListSkeleton({ rows = 8 }) {
  return (
    <table>
      <thead>{/* Header skeleton */}</thead>
      <tbody>
        {Array.from({ length: rows }).map((_, i) => (
          <TaskListRowSkeleton key={i} />
        ))}
      </tbody>
    </table>
  );
}
```

---

## Checklist for PRs

### Before Submitting

- [ ] **Layout Match**: Skeleton matches exact structure of loaded content
- [ ] **No CLS**: Page doesn't shift when data loads
- [ ] **Aspect Ratios**: Charts/images use `aspect-ratio` instead of fixed height
- [ ] **Min Heights**: Cards have `min-h-[Xpx]` matching real content
- [ ] **Responsive**: Skeleton works on all breakpoints
- [ ] **Accessibility**: `role="status"` and `aria-label` on skeleton containers
- [ ] **Header Stability**: Headers render immediately, not conditionally

### Testing

1. **Network Throttling**: Test with "Slow 3G" in DevTools
2. **Performance Tab**: Record and check for layout shifts
3. **Lighthouse**: Run audit and check CLS score (target: < 0.1)
4. **Device Testing**: Verify on mobile, tablet, desktop

### Common Issues

| Issue | Solution |
|-------|----------|
| Cards collapse during load | Add `min-h-[Xpx]` |
| Charts cause CLS | Use `aspect-ratio` |
| Headers jump | Render header outside loading condition |
| Scroll broken | Check flex containment chain |
| Skeletons too small | Match exact content dimensions |

---

## Animation Keyframes

Available in `globals.css`:

```css
/* Skeleton shimmer */
@keyframes skeleton-shimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(100%); }
}

/* Splash screen animations */
@keyframes splash-fade-in { ... }
@keyframes splash-float { ... }
@keyframes splash-pulse { ... }
@keyframes splash-glow { ... }
```

---

## Resources

- [Web Vitals - CLS](https://web.dev/cls/)
- [PageContainer Component](/apps/web/src/components/layout/page-container.tsx)
- [Skeleton Component](/apps/web/src/components/ui/skeleton.tsx)
- [Tasks Skeleton Example](/apps/web/src/app/app/tasks/components/TasksSkeleton.tsx)

---

*Last updated: December 2025*
*Ventazo by Zuclubit - Smart CRM*

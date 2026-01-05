# Card System Guidelines - Ventazo Design System 2025

> **Version:** 1.0.0
> **Last Updated:** December 2025
> **Author:** Claude AI / Zuclubit Team

---

## Table of Contents

1. [Overview](#overview)
2. [Card Architecture](#card-architecture)
3. [When to Use Each Card Type](#when-to-use-each-card-type)
4. [Variants & Contexts](#variants--contexts)
5. [Shared Utilities](#shared-utilities)
6. [Interaction Patterns](#interaction-patterns)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Extending the System](#extending-the-system)
9. [Examples: Correct vs Incorrect](#examples-correct-vs-incorrect)
10. [Migration Guide](#migration-guide)

---

## Overview

The Ventazo Card System provides a unified, accessible, and performant foundation for all card-based UI components in the CRM. It consists of:

- **BaseCard**: Low-level foundation component with variants
- **EntityCard**: Specialized wrapper for CRM entities (leads, opportunities, etc.)
- **V3 Cards**: Module-specific implementations with DnD, i18n, and domain logic
- **Shared Utilities**: Hooks, tokens, and helper components

### Design Principles

1. **Consistency**: All cards share visual language via CSS variables
2. **Accessibility**: WCAG 2.1 AA compliant (44px touch targets, focus rings)
3. **Performance**: Virtualization-ready, optimized re-renders
4. **Extensibility**: Build on top without breaking core patterns

---

## Card Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Card Hierarchy                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────────┐  │
│  │  BaseCard   │───▶│ EntityCard  │───▶│ V3 Cards        │  │
│  │  (CVA)      │    │ (wrapper)   │    │ (domain-rich)   │  │
│  └─────────────┘    └─────────────┘    └─────────────────┘  │
│        │                  │                    │             │
│        ▼                  ▼                    ▼             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              Shared Utilities Layer                     ││
│  │  • CARD_TOKENS (design tokens)                          ││
│  │  • useCardStates (state management)                     ││
│  │  • useCardInteractions (click/keyboard/long-press)      ││
│  │  • CardActionButton, CardBadge, CardAvatar              ││
│  └─────────────────────────────────────────────────────────┘│
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### File Locations

```
apps/web/src/components/
├── cards/
│   ├── index.ts              # Public exports
│   ├── base-card.tsx         # BaseCard + CVA variants
│   ├── entity-card.tsx       # EntityCard wrapper
│   ├── card-utilities.tsx    # CARD_TOKENS, hooks, helpers
│   └── use-card-interactions.ts  # Interaction hook
│
├── ui/
│   ├── card.tsx              # shadcn Card (deprecated for new use)
│   └── ...
```

---

## When to Use Each Card Type

### BaseCard

**Use for:**
- KPI/metric displays
- Settings sections
- Static content containers
- Non-entity cards

```tsx
import { BaseCard, CardHeader, CardTitle, CardContent } from '@/components/cards';

// KPI Card
<BaseCard variant="kpi">
  <CardContent>
    <span className="text-3xl font-bold">$125K</span>
    <span className="text-sm text-muted-foreground">Revenue</span>
  </CardContent>
</BaseCard>

// Settings Card
<BaseCard variant="default">
  <CardHeader>
    <CardTitle>Notifications</CardTitle>
  </CardHeader>
  <CardContent>
    {/* Settings content */}
  </CardContent>
</BaseCard>
```

### EntityCard

**Use for:**
- Simple entity displays without complex logic
- Quick prototypes
- Widgets showing entity summary

```tsx
import { EntityCard } from '@/components/cards';

<EntityCard
  title="Acme Corp"
  subtitle="Technology"
  score={85}
  status="active"
  onClick={() => openDetail(id)}
/>
```

### V3 Cards (LeadCardV3, OpportunityCardV3, etc.)

**Use for:**
- Full-featured entity cards in modules
- Cards with DnD support
- Cards with inline actions
- Cards with localization

```tsx
import { LeadCardV3 } from '@/app/app/leads/components/LeadCardV3';

<LeadCardV3
  lead={leadData}
  onSelect={handleSelect}
  onEdit={handleEdit}
  isSelected={selectedId === lead.id}
  isDragging={isDragging}
  showActions
/>
```

### Decision Matrix

| Scenario | Use |
|----------|-----|
| Dashboard KPI | `BaseCard variant="kpi"` |
| Settings category | `BaseCard variant="default"` |
| Simple entity preview | `EntityCard` |
| Kanban card | `V3 Card (e.g., LeadCardV3)` |
| List view item | `V3 Card` |
| Widget/sidebar preview | `EntityCard` or `BaseCard` |
| New module entity | Create V3 Card following patterns |

---

## Variants & Contexts

### BaseCard Variants

```tsx
// Available via CVA
variant: 'default' | 'kpi' | 'elevated' | 'ghost' | 'bordered'
size: 'sm' | 'md' | 'lg'
interactive: boolean  // Adds hover/focus states
```

**Variant Usage:**

| Variant | Context | Visual |
|---------|---------|--------|
| `default` | General containers | Border + subtle background |
| `kpi` | Metrics/stats | Elevated, glass effect |
| `elevated` | Prominent cards | Strong shadow |
| `ghost` | Minimal footprint | No border, transparent |
| `bordered` | Form sections | Heavier border |

### EntityCard Variants

```tsx
variant: 'default' | 'compact' | 'detailed'
scoreDisplay: 'badge' | 'ring' | 'bar'
```

---

## Shared Utilities

### CARD_TOKENS

Centralized design tokens for consistency:

```tsx
import { CARD_TOKENS } from '@/components/cards';

// Touch targets (WCAG 2.5.5)
CARD_TOKENS.touchTarget.min   // 'min-h-[44px] min-w-[44px]'
CARD_TOKENS.touchTarget.button // 'h-11 w-11'

// Border radius
CARD_TOKENS.radius.card       // 'rounded-[var(--card-radius-md)]'
CARD_TOKENS.radius.internal   // 'rounded-[var(--card-radius-internal)]'

// Transitions
CARD_TOKENS.transition.fast   // 'transition-all duration-[var(--transition-fast)]'

// Focus states
CARD_TOKENS.focus.ring        // Full focus ring class string

// Card states
CARD_TOKENS.card.base         // Base card classes
CARD_TOKENS.card.interactive  // Hover/focus interactive classes
CARD_TOKENS.card.dragging     // DnD dragging state
CARD_TOKENS.card.selected     // Selection ring
```

### useCardStates Hook

Manages card state classes and ARIA attributes:

```tsx
import { useCardStates } from '@/components/cards';

const { containerClasses, isInteractive, ariaProps } = useCardStates({
  isLoading: false,
  isSelected: true,
  isDisabled: false,
  isDragging: false,
  isOverlay: false,
});

<div className={containerClasses} {...ariaProps}>
  {/* Card content */}
</div>
```

### useCardInteractions Hook

Standardized interaction handling:

```tsx
import { useCardInteractions } from '@/components/cards';

const { containerProps, stopPropagation, wasClicked, isLongPressing } =
  useCardInteractions({
    onClick: () => openDetail(id),
    isInteractive: true,
    preventDoubleClick: true,
    doubleClickCooldown: 300,
    enableLongPress: true,
    longPressThreshold: 500,
    onLongPress: () => showContextMenu(),
  });

<div {...containerProps}>
  <button onClick={stopPropagation}>Action</button>
</div>
```

### Helper Components

```tsx
import {
  CardActionButton,
  CardBadge,
  CardAvatar,
  CardLoadingOverlay,
  ScoreBadge,
  PriorityBadge,
  StatusBadge,
} from '@/components/cards';

// Action button with semantic variants
<CardActionButton
  icon={Phone}
  label="Call"
  variant="primary"  // 'default' | 'primary' | 'success' | 'warning' | 'danger'
  size="sm"
  showOnHover
/>

// Status badge
<CardBadge variant="success">Active</CardBadge>

// Avatar with fallback initials
<CardAvatar name="John Doe" src={avatarUrl} size="md" />

// Score indicator
<ScoreBadge score={85} />

// Loading overlay
<CardLoadingOverlay isVisible={isLoading} />
```

---

## Interaction Patterns

### Click Behavior

1. **Entire card is clickable** → navigates to detail view
2. **Internal buttons** must use `stopPropagation`
3. **Double-click prevention** is ON by default (300ms cooldown)

```tsx
// Correct: Internal action stops propagation
<div {...containerProps}>
  <button onClick={(e) => { stopPropagation(e); doAction(); }}>
    Action
  </button>
</div>

// Also correct: Using CardActionButton
<CardActionButton
  icon={Edit}
  label="Edit"
  onClick={(e) => { e.stopPropagation(); editItem(); }}
/>
```

### Hover States

| Element | Behavior |
|---------|----------|
| Card | Shadow increase + subtle lift (-0.5px translateY) |
| Internal actions | Opacity reveal on hover |
| Touch devices | No hover (handled by touch feedback) |

### Focus States

- Visible focus ring: 2px, tenant-primary color
- Ring offset: 2px for visibility
- Tab navigation in logical order
- Skip links for accessibility

### Drag & Drop (dnd-kit)

```tsx
// Visual feedback during drag
CARD_TOKENS.card.dragging
// Results in: rotate-2 scale-105 shadow-dragging z-50

// Use with dnd-kit useSortable
const { isDragging, attributes, listeners, setNodeRef, transform } = useSortable({ id });

<div
  ref={setNodeRef}
  style={{ transform: CSS.Transform.toString(transform) }}
  className={cn(isDragging && CARD_TOKENS.card.dragging)}
  {...attributes}
  {...listeners}
>
```

### Loading States

- Opacity reduced to 70%
- Spinner overlay centered
- Pointer events remain active (for cancel actions)

```tsx
<BaseCard className={cn(isLoading && 'opacity-70')}>
  <CardLoadingOverlay isVisible={isLoading} />
  <CardContent>{/* ... */}</CardContent>
</BaseCard>
```

---

## Accessibility Requirements

### Touch Targets (WCAG 2.5.5)

All interactive elements must be at least 44x44px:

```tsx
// Use CARD_TOKENS for consistency
<button className={CARD_TOKENS.touchTarget.min}>
  <Icon className="h-4 w-4" />
</button>

// Or use CardActionButton which handles this
<CardActionButton icon={Edit} label="Edit" size="md" />
```

### Focus Management

```tsx
// Cards must have visible focus rings
<div
  tabIndex={0}
  className={CARD_TOKENS.focus.ring}
  role="button"
>

// Use useCardInteractions for automatic handling
const { containerProps } = useCardInteractions({ onClick: handleClick });
// containerProps includes: tabIndex, role, keyboard handlers
```

### ARIA Attributes

```tsx
// Use useCardStates for automatic ARIA
const { ariaProps } = useCardStates({ isLoading, isSelected, isDisabled });

<div {...ariaProps}>
// Results in:
// aria-busy="true" (when loading)
// aria-disabled="true" (when disabled)
// aria-selected="true" (when selected)
```

### Screen Reader Labels

```tsx
// Action buttons need labels
<CardActionButton
  icon={Phone}
  label="Call customer"  // Used as aria-label
/>

// Scores need context
<ScoreBadge score={85} aria-label="Lead score: 85 out of 100" />
```

---

## Extending the System

### Creating a New V3 Card

Follow this structure:

```tsx
// components/NewModuleCardV3.tsx

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  CARD_TOKENS,
  useCardStates,
  useCardInteractions,
  CardActionButton,
  ScoreBadge,
  CardLoadingOverlay,
} from '@/components/cards';

interface NewModuleCardV3Props {
  item: MyEntity;
  onSelect?: (id: string) => void;
  onEdit?: (item: MyEntity) => void;
  isSelected?: boolean;
  isDragging?: boolean;
  isLoading?: boolean;
  showActions?: boolean;
}

export function NewModuleCardV3({
  item,
  onSelect,
  onEdit,
  isSelected = false,
  isDragging = false,
  isLoading = false,
  showActions = true,
}: NewModuleCardV3Props) {
  // DnD setup
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: item.id });

  // State management
  const { containerClasses, ariaProps } = useCardStates({
    isLoading,
    isSelected,
    isDragging,
  });

  // Interaction handling
  const { containerProps, stopPropagation } = useCardInteractions({
    onClick: () => onSelect?.(item.id),
    isInteractive: !isLoading,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        // Base styles
        CARD_TOKENS.card.base,
        CARD_TOKENS.radius.card,
        CARD_TOKENS.transition.fast,
        // Interactive states
        !isDragging && CARD_TOKENS.card.interactive,
        // State classes
        containerClasses,
        // Module-specific
        'min-h-[72px] p-3'
      )}
      {...containerProps}
      {...attributes}
      {...listeners}
      {...ariaProps}
    >
      <CardLoadingOverlay isVisible={isLoading} />

      {/* Card content */}
      <div className="flex items-center gap-3">
        <ScoreBadge score={item.score} />

        <div className="flex-1 min-w-0">
          <h3 className={CARD_TOKENS.text.title}>{item.title}</h3>
          <p className={CARD_TOKENS.text.subtitle}>{item.subtitle}</p>
        </div>

        {showActions && (
          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
            <CardActionButton
              icon={Edit}
              label="Edit"
              variant="primary"
              onClick={(e) => {
                stopPropagation(e);
                onEdit?.(item);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
```

### Adding New Variants

Don't modify base components. Instead, compose:

```tsx
// Correct: Compose with wrapper
function HighlightedCard({ children, isHighlighted, ...props }) {
  return (
    <BaseCard
      {...props}
      className={cn(
        props.className,
        isHighlighted && 'ring-2 ring-yellow-500'
      )}
    >
      {children}
    </BaseCard>
  );
}

// Incorrect: Modifying BaseCard directly
// ❌ Don't add new variants to base-card.tsx unless approved
```

### Adding New Tokens

Add to `card-utilities.tsx`:

```tsx
export const CARD_TOKENS = {
  // ...existing tokens

  // Add new semantic tokens
  myNewToken: {
    base: 'my-class',
    hover: 'hover:my-class',
  },
} as const;
```

---

## Examples: Correct vs Incorrect

### ✅ Correct: Using Shared Tokens

```tsx
import { CARD_TOKENS } from '@/components/cards';

<div className={cn(
  CARD_TOKENS.card.base,
  CARD_TOKENS.card.interactive,
  CARD_TOKENS.focus.ring,
)}>
```

### ❌ Incorrect: Hardcoding Styles

```tsx
// Don't do this
<div className="bg-white border border-gray-200 rounded-lg shadow hover:shadow-lg">
```

### ✅ Correct: Using CSS Variables

```tsx
<div className="bg-[var(--tenant-primary)]" />
<div className="text-[var(--status-completed)]" />
```

### ❌ Incorrect: Hardcoding Colors

```tsx
// Don't do this
<div className="bg-blue-500" />
<div className="text-green-600" />
```

### ✅ Correct: Using Interaction Hook

```tsx
const { containerProps, stopPropagation } = useCardInteractions({
  onClick: handleClick,
});

<div {...containerProps}>
  <button onClick={stopPropagation}>Action</button>
</div>
```

### ❌ Incorrect: Manual Event Handling

```tsx
// Don't do this - missing keyboard support, focus states
<div onClick={handleClick}>
  <button onClick={(e) => e.stopPropagation()}>Action</button>
</div>
```

### ✅ Correct: Proper Touch Targets

```tsx
<CardActionButton
  icon={Phone}
  label="Call"
  size="md"  // Ensures 44px minimum
/>
```

### ❌ Incorrect: Small Touch Targets

```tsx
// Don't do this - too small for mobile
<button className="h-6 w-6">
  <PhoneIcon className="h-3 w-3" />
</button>
```

### ✅ Correct: Using ViewMode System

```tsx
import { useViewMode, ViewModeToggle } from '@/lib/view-mode';

const { viewMode, setViewMode } = useViewMode({ storageKey: 'my-module' });

<ViewModeToggle
  value={viewMode}
  modes={['list', 'kanban', 'grid']}
  onChange={setViewMode}
/>
```

### ❌ Incorrect: Custom View Toggle

```tsx
// Don't reinvent the wheel
const [view, setView] = useState('list');

<div className="flex gap-1">
  <button onClick={() => setView('list')}>List</button>
  <button onClick={() => setView('grid')}>Grid</button>
</div>
```

---

## Migration Guide

### From shadcn Card to BaseCard

```tsx
// Before (shadcn)
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

<Card>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</Card>

// After (BaseCard)
import { BaseCard, CardHeader, CardTitle, CardContent } from '@/components/cards';

<BaseCard>
  <CardHeader>
    <CardTitle>Title</CardTitle>
  </CardHeader>
  <CardContent>Content</CardContent>
</BaseCard>
```

### Adding Interaction to Existing Cards

```tsx
// Before
<div onClick={() => select(id)} className="cursor-pointer">

// After
const { containerProps } = useCardInteractions({
  onClick: () => select(id),
});

<div {...containerProps}>
```

### Adding Loading State

```tsx
// Before
{isLoading && <Spinner />}

// After
import { CardLoadingOverlay, useCardStates } from '@/components/cards';

const { containerClasses } = useCardStates({ isLoading });

<div className={containerClasses}>
  <CardLoadingOverlay isVisible={isLoading} />
  {/* Content */}
</div>
```

---

## Quick Reference

### Imports

```tsx
// All card components and utilities
import {
  // Base components
  BaseCard, CardHeader, CardTitle, CardSubtitle, CardContent, CardFooter,
  // Entity card
  EntityCard, EntityCardSkeleton,
  // Badges
  ScoreBadge, PriorityBadge, StatusBadge,
  // Utilities
  CARD_TOKENS, useCardStates, useCardInteractions,
  CardLoadingOverlay, CardActionButton, CardBadge, CardAvatar,
  // Helpers
  getCardInteractiveClasses, formatCardValue, getScoreLevel,
  // Constants
  INTERACTION_GUIDELINES, SCORE_STYLES,
} from '@/components/cards';
```

### CSS Variables Required

Ensure your theme provides:

```css
:root {
  --card-radius-sm: 0.375rem;
  --card-radius-md: 0.5rem;
  --card-radius-lg: 0.75rem;
  --card-radius-internal: 0.375rem;
  --card-padding-sm: 0.75rem;
  --card-padding-md: 1rem;
  --card-padding-lg: 1.5rem;
  --card-shadow-elevated: /* shadow value */;
  --card-shadow-hover: /* shadow value */;
  --card-shadow-dragging: /* shadow value */;
  --transition-micro: 75ms;
  --transition-fast: 150ms;
  --transition-normal: 200ms;
  --tenant-primary: /* tenant color */;
}
```

---

## Support & Questions

- **Design System Docs**: `/docs/DESIGN_SYSTEM.md`
- **Theme Tokens**: `/apps/web/src/lib/theme/tokens.ts`
- **View Mode System**: `/apps/web/src/lib/view-mode/`

For questions or improvements, contact the Zuclubit Engineering Team.

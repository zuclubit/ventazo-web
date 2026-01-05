# Guía de Remediación de Colores
## Quick Reference para Desarrolladores

**Estado:** CRÍTICO - 2,352+ violaciones detectadas
**Objetivo:** 0 colores Tailwind hardcodeados

---

## Regla de Oro

```tsx
// ❌ NUNCA
className="bg-green-500 text-white"
className="text-blue-600"
className="bg-amber-100"

// ✅ SIEMPRE
className="bg-[var(--status-completed)] text-[var(--status-completed-text)]"
className="text-[var(--tenant-primary)]"
className="bg-[var(--status-pending-bg)]"
```

---

## Mapeo de Colores por Contexto

### 1. Status (Tareas, Quotes, Leads)

| Estado | Variable BG | Variable Text |
|--------|-------------|---------------|
| Pending/Draft | `--status-pending-bg` | `--status-pending` |
| In Progress/Sent | `--status-in-progress-bg` | `--status-in-progress` |
| Completed/Won | `--status-completed-bg` | `--status-completed` |
| Cancelled/Lost | `--status-cancelled-bg` | `--status-cancelled` |

```tsx
// Ejemplo para QuoteStatusBadge
const statusMap = {
  draft: 'bg-[var(--status-pending-bg)] text-[var(--status-pending)]',
  sent: 'bg-[var(--status-in-progress-bg)] text-[var(--status-in-progress)]',
  accepted: 'bg-[var(--status-completed-bg)] text-[var(--status-completed)]',
  rejected: 'bg-[var(--status-cancelled-bg)] text-[var(--status-cancelled)]',
};
```

### 2. Prioridades (Tasks)

| Prioridad | Variable BG | Variable Text |
|-----------|-------------|---------------|
| Low | `--priority-low-bg` | `--priority-low` |
| Medium | `--priority-medium-bg` | `--priority-medium` |
| High | `--priority-high-bg` | `--priority-high` |
| Urgent | `--priority-urgent-bg` | `--priority-urgent` |

```tsx
// Ejemplo para PriorityBadge
const priorityMap = {
  low: 'bg-[var(--priority-low-bg)] text-[var(--priority-low)]',
  medium: 'bg-[var(--priority-medium-bg)] text-[var(--priority-medium)]',
  high: 'bg-[var(--priority-high-bg)] text-[var(--priority-high)]',
  urgent: 'bg-[var(--priority-urgent-bg)] text-[var(--priority-urgent)]',
};
```

### 3. Health Scores (Customers, Leads)

| Health | Variable BG | Variable Text |
|--------|-------------|---------------|
| Excellent (90-100) | `--health-excellent-bg` | `--health-excellent` |
| Good (70-89) | `--health-good-bg` | `--health-good` |
| At Risk (40-69) | `--health-at-risk-bg` | `--health-at-risk` |
| Critical (0-39) | `--health-critical-bg` | `--health-critical` |

```tsx
// Ejemplo para HealthIndicator
function getHealthClass(score: number) {
  if (score >= 90) return 'bg-[var(--health-excellent-bg)] text-[var(--health-excellent)]';
  if (score >= 70) return 'bg-[var(--health-good-bg)] text-[var(--health-good)]';
  if (score >= 40) return 'bg-[var(--health-at-risk-bg)] text-[var(--health-at-risk)]';
  return 'bg-[var(--health-critical-bg)] text-[var(--health-critical)]';
}
```

### 4. Tenant Branding

| Uso | Variable |
|-----|----------|
| Botones primarios | `--tenant-primary` |
| Botones hover | `--tenant-primary-darker` |
| Backgrounds suaves | `--tenant-primary-lighter` |
| Acentos | `--tenant-accent` |
| Sidebar | `--tenant-sidebar` |
| Cards especiales | `--tenant-surface` |

```tsx
// Ejemplo para Button con branding
<button className="bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-darker)] text-white">
  Acción Principal
</button>

// Card con branding suave
<div className="bg-[var(--tenant-primary-lighter)] border-[var(--tenant-primary)]/20">
  Feature highlight
</div>
```

### 5. Integraciones (OAuth Providers)

Agregar a `globals.css`:
```css
:root {
  /* Integration Provider Colors */
  --integration-google: #4285F4;
  --integration-google-dark: #8AB4F8;
  --integration-microsoft: #0078D4;
  --integration-microsoft-dark: #2D7FD8;
  --integration-gmail: #EA4335;
  --integration-gmail-dark: #F28B82;
}

.dark {
  --integration-google: var(--integration-google-dark);
  --integration-microsoft: var(--integration-microsoft-dark);
  --integration-gmail: var(--integration-gmail-dark);
}
```

---

## Archivos Prioritarios para Corregir

### Tier 1: CRÍTICO (Esta semana)

1. `src/app/app/quotes/components/QuoteCard.tsx`
2. `src/app/app/quotes/components/QuoteStatusBadge.tsx`
3. `src/app/app/tasks/components/TaskDetailSheet.tsx`
4. `src/app/app/tasks/components/TaskKanbanColumn.tsx`
5. `src/app/app/opportunities/components/OpportunityKanbanCard.tsx`

### Tier 2: ALTA (Próxima semana)

6. `src/app/app/calendar/components/ConnectedCalendarCard.tsx`
7. `src/app/app/leads/components/LeadScoreIndicator.tsx`
8. `src/app/app/customers/components/CustomerHealthIndicator.tsx`
9. `src/app/app/email/components/ConnectEmailCard.tsx`
10. `src/app/app/settings/billing/page.tsx`

### Tier 3: MEDIA (Sprint siguiente)

11-172. Resto de archivos con colores hardcodeados

---

## Comando de Verificación

```bash
# Contar violaciones restantes
grep -rn "bg-\(red\|green\|blue\|yellow\|amber\|orange\|slate\|gray\|emerald\|teal\|cyan\|sky\|indigo\|violet\|purple\|fuchsia\|pink\|rose\)-" apps/web/src --include="*.tsx" | wc -l

# Ver archivos específicos
grep -rn "bg-green-" apps/web/src --include="*.tsx"

# Buscar text colors
grep -rn "text-\(red\|green\|blue\|amber\)-[0-9]" apps/web/src --include="*.tsx"
```

---

## Ejemplo de Migración Completa

### ANTES (TaskCard.tsx)
```tsx
export function TaskCard({ task }) {
  const priorityColors = {
    low: 'bg-slate-100 text-slate-700 border-slate-200',
    medium: 'bg-amber-100 text-amber-700 border-amber-200',
    high: 'bg-orange-100 text-orange-700 border-orange-200',
    urgent: 'bg-red-100 text-red-700 border-red-200',
  };

  const statusColors = {
    pending: 'bg-gray-100',
    in_progress: 'bg-blue-100',
    completed: 'bg-green-100',
  };

  return (
    <div className={statusColors[task.status]}>
      <span className={priorityColors[task.priority]}>
        {task.priority}
      </span>
    </div>
  );
}
```

### DESPUÉS (TaskCard.tsx)
```tsx
export function TaskCard({ task }) {
  const priorityColors = {
    low: 'bg-[var(--priority-low-bg)] text-[var(--priority-low)] border-[var(--priority-low)]/30',
    medium: 'bg-[var(--priority-medium-bg)] text-[var(--priority-medium)] border-[var(--priority-medium)]/30',
    high: 'bg-[var(--priority-high-bg)] text-[var(--priority-high)] border-[var(--priority-high)]/30',
    urgent: 'bg-[var(--priority-urgent-bg)] text-[var(--priority-urgent)] border-[var(--priority-urgent)]/30',
  };

  const statusColors = {
    pending: 'bg-[var(--status-pending-bg)]',
    in_progress: 'bg-[var(--status-in-progress-bg)]',
    completed: 'bg-[var(--status-completed-bg)]',
  };

  return (
    <div className={statusColors[task.status]}>
      <span className={priorityColors[task.priority]}>
        {task.priority}
      </span>
    </div>
  );
}
```

---

## Tips de Desarrollo

1. **Usar `color-mix` para transparencias:**
   ```css
   bg-[color-mix(in_srgb,var(--tenant-primary)_15%,transparent)]
   ```

2. **Hover states:**
   ```css
   hover:bg-[var(--tenant-primary-darker)]
   ```

3. **Borders con opacidad:**
   ```css
   border-[var(--status-completed)]/20
   ```

4. **Focus rings:**
   ```css
   focus-visible:ring-[var(--tenant-primary)]/50
   ```

---

*Mantener este documento actualizado conforme se migren componentes*

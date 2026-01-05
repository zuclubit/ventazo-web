# Guía UX/UI para Módulo Kanban CRM - Parte 5
## Diseño Responsive y Accesibilidad

---

## 10. Diseño Responsive y Móvil

### 10.1 Breakpoints y Comportamiento

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                    RESPONSIVE BEHAVIOR BY BREAKPOINT                            │
└─────────────────────────────────────────────────────────────────────────────────┘

MOBILE (< 640px)
═══════════════════════════════════════════════════════════════════════════════════

Layout:
• Columnas en scroll horizontal snap
• Una columna visible a la vez
• Dots indicator de posición
• Swipe para navegar entre columnas

Tarjetas:
• Full width de columna
• Quick actions siempre visibles (bottom bar)
• Touch-friendly sizing (min 44px targets)

Drag & Drop:
• Long-press (300ms) para iniciar drag
• Haptic feedback al grab/drop
• "Move to..." button como alternativa
• Drop zones expandidas (+20% área)

Header:
• Nombre de stage visible
• Conteo y total colapsables
• Botón hamburger para filtros

┌─────────────────────────────────────────────────────────────────────────────────┐
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │ ← NUEVO (12)                                    ≡ │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                             │ │
│  │  [Tarjeta 1 - Full Width]                                                  │ │
│  │                                                                             │ │
│  │  ───────────────────────────                                               │ │
│  │  [📞] [✉️] [💬] [📝] [⋮]                                                   │ │
│  │                                                                             │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ┌─────────────────────────────────────────────────────────────────────────────┐ │
│  │                                                                             │ │
│  │  [Tarjeta 2 - Full Width]                                                  │ │
│  │                                                                             │ │
│  └─────────────────────────────────────────────────────────────────────────────┘ │
│                                                                                   │
│  ● ○ ○ ○ ○ ○  (stage indicators)                                               │
│                                                                                   │
│  [+] Agregar Lead (FAB)                                                         │
│                                                                                   │
└─────────────────────────────────────────────────────────────────────────────────┘


TABLET (640px - 1024px)
═══════════════════════════════════════════════════════════════════════════════════

Layout:
• 2-3 columnas visibles
• Scroll horizontal libre
• Headers visibles completos

Tarjetas:
• Width reducido (280px)
• Quick actions en hover + menu
• Touch areas estándar (44px)

Drag & Drop:
• Tap para iniciar (no long-press)
• Scroll automático en bordes


DESKTOP (> 1024px)
═══════════════════════════════════════════════════════════════════════════════════

Layout:
• Todas las columnas visibles (scroll si necesario)
• Columnas con width responsivo: clamp(280px, 20vw, 320px)
• Panel lateral para preview (opcional)

Tarjetas:
• Información completa visible
• Quick actions en hover
• Keyboard navigation completa

Drag & Drop:
• Click + drag estándar
• Multi-select con Shift/Cmd
• Scroll automático suave

Additional Features:
• Collapse/expand columnas
• Resize de columnas
• Split view (Kanban + Table)
```

### 10.2 Gestos Móviles

| Gesto | Acción | Feedback |
|-------|--------|----------|
| **Tap** | Abrir detalle de tarjeta | Ripple effect |
| **Long-press** | Iniciar drag | Haptic bump, scale up |
| **Swipe horizontal** | Cambiar columna visible | Snap animation |
| **Swipe tarjeta (izq)** | Quick action menu | Reveal buttons |
| **Swipe tarjeta (der)** | Marcar completado/archivar | Green slide |
| **Pull-to-refresh** | Actualizar datos | Loader animation |
| **Pinch** | Zoom out (ver más columnas) | Scale transform |

### 10.3 Touch Target Sizes

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      TOUCH TARGETS (WCAG 2.2 Compliant)                         │
└─────────────────────────────────────────────────────────────────────────────────┘

Mínimo requerido: 44 × 44 pixels (iOS/Android HIG)
Recomendado: 48 × 48 pixels

Aplicación en Kanban:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

┌────────────────────────────────────────────────────────────────────────────────┐
│                                                                                │
│   ┌────────────────┐      ← Drag handle: 48px height, full card width         │
│   │ ═══════════════│                                                          │
│   └────────────────┘                                                          │
│                                                                                │
│   ┌──────┐                ← Avatar/Logo: 48×48px clickable                    │
│   │      │                                                                     │
│   └──────┘                                                                     │
│                                                                                │
│   ┌────────────────────┐  ← Menu button: 48×48px touch area                   │
│   │         ⋮          │    (visual icon puede ser 24×24)                     │
│   └────────────────────┘                                                       │
│                                                                                │
│   ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                                         │
│   │  📞  │ │  ✉️  │ │  💬  │ │  📝  │  ← Quick actions: 48×48px cada uno      │
│   └──────┘ └──────┘ └──────┘ └──────┘    con 8px gap mínimo                   │
│                                                                                │
└────────────────────────────────────────────────────────────────────────────────┘

Espaciado entre elementos interactivos: mínimo 8px
Área de tap expandida (padding): +12px en cada dirección
```

---

## 11. Accesibilidad (WCAG)

### 11.1 Requisitos de Accesibilidad para Drag & Drop

Basado en [WCAG 2.2 - 2.5.7 Dragging Movements](https://www.w3.org/TR/WCAG22/#dragging-movements):

> "All functionality that uses a dragging movement for operation can be achieved by a single pointer without dragging."

**Implementación requerida:**

1. **Alternativa sin arrastrar:**
   - Botón "Mover a..." que abre selector de columna
   - Menú contextual con opciones de movimiento
   - Keyboard shortcuts (Espacio para grab, Flechas para mover)

2. **Keyboard Navigation:**
   ```
   Tab           → Navegar entre tarjetas
   Enter/Space   → Abrir detalle O iniciar grab mode
   Flechas ↑↓    → Mover dentro de columna (en grab mode)
   Flechas ←→    → Mover entre columnas (en grab mode)
   Escape        → Cancelar operación
   ```

3. **Screen Reader Support:**
   ```html
   <!-- Ejemplo de anuncios para screen reader -->

   <div
     role="button"
     aria-roledescription="tarjeta arrastrable"
     aria-describedby="drag-instructions"
   >
     ...
   </div>

   <div id="drag-instructions" class="sr-only">
     Presiona espacio para levantar.
     Usa flechas para mover.
     Presiona espacio para soltar.
   </div>

   <!-- Durante drag -->
   <div aria-live="assertive" class="sr-only">
     "Oportunidad Empresa ABC levantada.
      Posición 3 de 5 en columna Discovery.
      Usa flechas izquierda/derecha para cambiar columna."
   </div>

   <!-- Después de drop -->
   <div aria-live="polite" class="sr-only">
     "Oportunidad Empresa ABC movida a columna Qualified.
      Posición 1 de 8."
   </div>
   ```

### 11.2 Checklist de Accesibilidad Kanban

| Requisito | WCAG | Implementación |
|-----------|------|----------------|
| **Contraste de texto** | 1.4.3 (AA) | Ratio mínimo 4.5:1 para texto normal |
| **Contraste de UI** | 1.4.11 | Ratio 3:1 para componentes interactivos |
| **Target size** | 2.5.5 (AAA) | Mínimo 44×44px para touch targets |
| **Dragging alternative** | 2.5.7 | Botón "Mover a..." disponible |
| **Keyboard operable** | 2.1.1 | Tab, Enter, Space, Arrows funcionales |
| **Focus visible** | 2.4.7 | Ring de focus claramente visible |
| **Focus order** | 2.4.3 | Orden lógico izquierda→derecha, arriba→abajo |
| **Status messages** | 4.1.3 | aria-live para cambios de estado |
| **Error identification** | 3.3.1 | Mensajes de error claros y descriptivos |
| **Labels** | 1.3.1 | Todos los inputs tienen labels asociados |
| **Motion** | 2.3.3 | Respetar prefers-reduced-motion |

### 11.3 Implementación de Reduced Motion

```css
/* Respetar preferencia de movimiento reducido */
@media (prefers-reduced-motion: reduce) {
  .kanban-card {
    transition: none;
  }

  .drag-overlay {
    animation: none;
    transform: none;
  }

  .celebration-confetti {
    display: none;
  }

  .card-enter-animation {
    animation: none;
    opacity: 1;
  }
}
```

---

**Anterior:** [04-BUSINESS_RULES_AND_COLORS.md](./04-BUSINESS_RULES_AND_COLORS.md)
**Siguiente:** [06-METRICS_AND_ROADMAP.md](./06-METRICS_AND_ROADMAP.md)

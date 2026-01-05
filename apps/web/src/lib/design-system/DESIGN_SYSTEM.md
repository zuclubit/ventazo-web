# VENTAZO CRM - Design System v1.0

## IDENTIDAD VISUAL

### Paleta de Colores Oficial

```
Primary Green:     #0EB58C  (Teal vibrante)
Secondary Dark:    #003C3B  (Verde oscuro profundo)
White:             #FFFFFF
Light Gray:        #E6E6E6
Carbon Text:       #1C1C1E

Estados de Lead:
- Nuevo:           #3B82F6 (Azul)
- Contactado:      #EAB308 (Amarillo)
- Calificado:      #8B5CF6 (Púrpura)
- Propuesta:       #6366F1 (Indigo)
- Negociación:     #F97316 (Naranja)
- Convertido:      #10B981 (Verde)
- Perdido:         #EF4444 (Rojo)
```

### Tipografía

- **Font Family**: Inter, system-ui, sans-serif
- **Headings**: 600-700 weight
- **Body**: 400-500 weight
- **Escala**: 12px, 14px, 16px, 20px, 24px, 32px, 48px

### Border Radius

- **Cards/Modals**: 16px (rounded-2xl)
- **Buttons Primarios**: 9999px (full rounded)
- **Buttons Secundarios**: 8px (rounded-lg)
- **Inputs**: 8px (rounded-lg)
- **Tags/Badges**: 6px (rounded-md)

### Shadows

```css
/* Card */
box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06);

/* Elevated */
box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1);

/* Modal */
box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);

/* Primary Button */
box-shadow: 0 4px 14px -3px rgba(14, 181, 140, 0.4);
```

---

## COMPONENTES CORE

### 1. Sidebar Navigation
- Fondo: #003C3B (sidebar-background)
- Ancho: 256px (w-64) expandido, 72px colapsado
- Items: padding 12px 16px, border-radius 8px
- Item activo: bg-primary/15
- Badges de conteo: círculo con primary color

### 2. KPI Cards (Métricas)
- Background: white
- Border: 1px solid border color
- Padding: 24px
- Hover: shadow-md, translateY(-2px)

### 3. Buttons

**Primario (.ventazo-button)**
- Background: #0EB58C
- Text: white
- Padding: 12px 24px
- Border-radius: 9999px
- Hover: Elevar + oscurecer

**Gradient (.gradient-button)**
- Background: gradient #003C3B → #0EB58C
- Para CTAs principales

**Ghost (.glass-button)**
- Background: transparent/glass
- Border: glass-border

### 4. Estados Vacíos
- Ilustración SVG del estilo Ventazo
- Headline descriptivo
- Descripción con beneficio
- CTA primario

### 5. Tablas
- Header: bg-muted, text-uppercase
- Rows: hover:bg-muted/50
- Celdas: padding 16px vertical

---

## RESPONSIVE BREAKPOINTS

```
Mobile:  < 640px   (sm:)
Tablet:  640-1024px (md:)
Desktop: > 1024px  (lg:)
Wide:    > 1440px  (xl:, 2xl:)
```

---

## CLASES UTILITARIAS

### Glass System
- `.glass` - Efecto blur básico
- `.glass-card` - Card con glassmorphism
- `.glass-input` - Input con efecto glass
- `.glass-button` - Botón transparente glass

### Ventazo Brand
- `.ventazo-button` - Botón primario
- `.ventazo-button-outline` - Botón outline
- `.gradient-button` - Botón gradiente

### Texto
- `.text-premium` - Texto blanco/claro
- `.text-premium-secondary` - Texto secundario
- `.text-premium-muted` - Texto muted
- `.text-premium-accent` - Texto acento (verde)

### Animaciones
- `.animate-in` - Fade in desde abajo
- `.animate-scale-in` - Scale in
- `.card-hover` - Efecto hover para cards
- `.interactive` - Escala al hover/active

---

## PATRONES DE USO

### Estados de Lead (Badges)
```tsx
<Badge className="status-new">Nuevo</Badge>
<Badge className="status-qualified">Calificado</Badge>
<Badge className="status-won">Ganado</Badge>
```

### Cards KPI
```tsx
<Card className="stat-card card-hover">
  <CardHeader>
    <Icon className="text-primary" />
    <CardTitle>Título</CardTitle>
  </CardHeader>
  <CardContent>
    <span className="text-3xl font-bold">123</span>
  </CardContent>
</Card>
```

### Botones CTA
```tsx
// Primario
<Button className="ventazo-button">
  <Plus className="mr-2 h-4 w-4" />
  Nuevo Lead
</Button>

// Secundario
<Button variant="outline">
  Ver Pipeline
</Button>
```

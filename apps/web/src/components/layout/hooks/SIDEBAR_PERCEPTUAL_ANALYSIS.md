# Sidebar Perceptual Analysis - Color Intelligence v4.0+

**Fecha**: 2026-01-04
**Autor**: Principal Engineer - Design Systems & Accessibility
**Versión**: 1.0.0

---

## 1. Contexto Perceptual del Sidebar

### 1.1 Caracterización del Sistema Visual

El sidebar del CRM Ventazo es un **sistema de navegación persistente** con las siguientes características perceptuales:

| Dimensión | Análisis |
|-----------|----------|
| **Tipo de Interfaz** | Navegación primaria persistente |
| **Tiempo de Exposición** | Prolongado (siempre visible en desktop) |
| **Modo de Lectura** | Escaneo rápido (scanning), NO lectura prolongada |
| **Densidad Visual** | Media-Alta (15+ items de navegación) |
| **Frecuencia de Interacción** | Alta (cambios de sección frecuentes) |
| **Criticidad** | Alta (único medio de navegación principal) |

### 1.2 Jerarquía de Información

```
┌─────────────────────────────────────┐
│ NIVEL 1: Brand Logo (Máxima)        │  ← Identidad, punto focal
├─────────────────────────────────────┤
│ NIVEL 2: Item Activo                │  ← Estado actual, alta visibilidad
├─────────────────────────────────────┤
│ NIVEL 3: Section Headers            │  ← Organización, contexto
├─────────────────────────────────────┤
│ NIVEL 4: Items Navegación           │  ← Opciones disponibles
├─────────────────────────────────────┤
│ NIVEL 5: Badges/Indicadores         │  ← Información contextual
├─────────────────────────────────────┤
│ NIVEL 6: Texto Secundario/Muted     │  ← Hints, shortcuts
└─────────────────────────────────────┘
```

### 1.3 Elementos Críticos por Prioridad WCAG 3.0

| Elemento | Tier Requerido | Justificación |
|----------|----------------|---------------|
| Item Activo (texto + icono) | **Gold** | Identificación de ubicación actual |
| Items Navegación (texto) | **Silver** | Acción principal disponible |
| Section Headers | **Silver** | Contexto organizacional |
| Badges (texto) | **Silver** | Información crítica (contadores) |
| Logo/Brand | **Bronze** | Decorativo con enlace |
| Shortcuts/Hints | **Bronze** | Información secundaria |

---

## 2. Análisis de Modo de Contraste

### 2.1 ContrastMode Dominante

El sidebar utiliza un **fondo oscuro** (`--sidebar-color` típicamente `#0A0F1A` a `#1A1F2E`), lo que determina:

```typescript
ContrastMode = 'light-content' // Texto claro sobre fondo oscuro
```

**Implicaciones para APCA:**
- El texto es más claro que el fondo (polarity: `light-on-dark`)
- APCA Lc será **negativo** (convencionalmente expresamos como valor absoluto)
- Los umbrales APCA para `light-on-dark` son ligeramente más permisivos (-3Lc)

### 2.2 Detección Programática (usando ContrastDecisionEngine)

```typescript
import { detectContrastMode, ContrastDecisionEngine } from '@/lib/color-intelligence';

const sidebarBackground = '#0A0F1A';
const contrastResult = detectContrastMode(sidebarBackground);

// Resultado esperado:
// {
//   mode: 'light-content',
//   luminance: 0.012,
//   recommendation: 'Use light text colors (tone 80-95)'
// }
```

---

## 3. Casos de Alto Riesgo Perceptual

### 3.1 Riesgos Identificados

#### 🔴 RIESGO CRÍTICO: Item Activo con Bajo Contraste

**Escenario**: El item activo usa un fondo semi-transparente que puede generar contraste insuficiente.

```css
/* Problema potencial */
.nav-item-active {
  background: rgba(primary, 0.15); /* Si primary es azul oscuro, el contraste puede fallar */
}
```

**Mitigación Decision Engine**:
```typescript
const engine = new ContrastDecisionEngine();
const decision = engine.evaluate({
  foreground: activeTextColor,
  background: effectiveActiveBackground,
  readabilityContext: createReadabilityContext(15, 500), // 15px, medium weight
  viewingConditions: createViewingConditions('average'),
});

// REQUERIMIENTO: decision.wcag3Tier >= 'Gold'
// APCA Lc absoluto >= 75 para texto de 15px
```

#### 🟠 RIESGO ALTO: Texto Muted Ilegible

**Escenario**: Section headers y shortcuts usan colores "muted" que pueden caer por debajo de Bronze.

```css
/* Problema potencial */
.section-header {
  color: var(--sidebar-text-muted); /* Tone 50 puede ser insuficiente */
}
```

**Umbral Decision Engine**:
- Font size: 11px (uppercase, tracking wider)
- Font weight: 600 (semibold)
- **Mínimo APCA Lc**: 45 (para texto decorativo/spot)
- **Tier requerido**: Bronze mínimo, Silver recomendado

#### 🟡 RIESGO MEDIO: Badges con Gradientes

**Escenario**: Los badges semánticos usan gradientes que pueden tener zonas de bajo contraste.

**Mitigación**:
```typescript
// El badge debe evaluarse contra su color MÁS OSCURO del gradiente
const badgeGradientStart = primaryColor;
const badgeGradientEnd = accentColor;

// Usar el color con MENOR luminance para calcular contraste
const worstCaseBackground = getLowerLuminance(badgeGradientStart, badgeGradientEnd);
const badgeDecision = engine.evaluate({
  foreground: badgeTextColor,
  background: worstCaseBackground,
  readabilityContext: createReadabilityContext(10, 700), // 10px, bold
});

// REQUERIMIENTO: decision.level >= 'minimum' (APCA >= 45)
```

#### 🟡 RIESGO MEDIO: Glare en Ambientes Brillantes

**Escenario**: Usuarios en oficinas con mucha luz pueden experimentar "washout" del sidebar.

**Mitigación GovernanceEngine**:
```typescript
const policy: PerceptualPolicy = {
  id: 'sidebar-bright-environment',
  name: 'Sidebar Bright Environment Adaptation',
  requirements: {
    minApcaLc: 80, // +5 Lc para compensar glare
  },
  applicableContexts: [
    { component: 'Sidebar', environment: 'bright' }
  ],
};
```

### 3.2 Matriz de Riesgo por Estado

| Estado | Riesgo | APCA Mínimo | Tier Target |
|--------|--------|-------------|-------------|
| Default (text) | Medio | 60 Lc | Silver |
| Default (icon) | Bajo | 45 Lc | Bronze |
| Hover (text) | Medio | 70 Lc | Silver |
| Hover (bg) | Bajo | N/A | N/A |
| Active (text) | **Alto** | **75 Lc** | **Gold** |
| Active (border) | Bajo | N/A | Decorativo |
| Muted (text) | Alto | 45 Lc | Bronze |
| Disabled | Bajo | 30 Lc | Fail permitido |

---

## 4. Diferencias entre Estados: Hover vs Active

### 4.1 Requisitos Perceptuales por Estado

#### Estado: Default
```typescript
const defaultContext: ReadabilityContext = {
  fontSize: 15,
  fontWeight: 500,
  textLength: 'short', // Nav labels son cortos
  readingDuration: 'glance', // Escaneo rápido
};

const defaultThresholds = {
  textLc: 60,      // APCA para texto de nav
  iconLc: 45,      // APCA para iconos (pueden ser más bajos)
  tier: 'Silver',
};
```

#### Estado: Hover
```typescript
const hoverContext: ReadabilityContext = {
  fontSize: 15,
  fontWeight: 500,
  textLength: 'short',
  readingDuration: 'glance',
  // Hover indica interés - debe ser MÁS visible que default
};

const hoverThresholds = {
  textLc: 70,      // +10 Lc vs default
  tier: 'Silver',
  contrastBoost: 1.15, // 15% más contraste que default
};
```

#### Estado: Active
```typescript
const activeContext: ReadabilityContext = {
  fontSize: 15,
  fontWeight: 600, // Más bold para estado activo
  textLength: 'short',
  readingDuration: 'sustained', // Usuario verifica ubicación
  importance: 'critical', // Identifica dónde está el usuario
};

const activeThresholds = {
  textLc: 75,      // APCA Gold tier
  tier: 'Gold',    // Requerimiento WCAG 3.0 Gold
  indicatorGlow: true, // Visual enhancement
};
```

### 4.2 Transiciones Perceptuales (OKLCH)

Las transiciones entre estados deben ser **perceptualmente uniformes**:

```typescript
import { interpolateColor } from '@/lib/color-intelligence';

// Default → Hover: Transición suave de 200ms
const hoverTransition = {
  textColor: interpolateColor(defaultText, hoverText, 0.5),
  backgroundColor: interpolateColor('transparent', hoverBg, 0.5),
  duration: '200ms',
  easing: 'ease-out',
};

// Hover → Active: Transición más marcada
const activeTransition = {
  textColor: activeText, // Cambio directo, sin interpolación
  backgroundColor: activeBg,
  indicator: 'scale-in', // Animación del indicador
  duration: '300ms',
  easing: 'ease-in-out',
};
```

---

## 5. Recomendaciones para Decision Engine

### 5.1 Configuración de Pesos Sugerida

Para el contexto específico del sidebar:

```typescript
const sidebarDecisionWeights: DecisionWeights = {
  apcaContrast: 0.50,    // Aumentado (crítico para navegación)
  fontSize: 0.18,        // Ligeramente reducido (tamaños fijos)
  fontWeight: 0.10,      // Reducido (pesos controlados)
  environment: 0.12,     // Aumentado (sidebar siempre visible)
  polarity: 0.05,        // Reducido (siempre light-on-dark)
  colorTemperature: 0.05, // Igual (efectos sutiles)
};
```

### 5.2 Thresholds Personalizados

```typescript
const sidebarThresholds: ThresholdConfiguration = {
  // APCA Lc thresholds
  bodyTextLc: 60,        // Texto de navegación estándar
  largeTextLc: 75,       // Item activo
  headlineLc: 55,        // Section headers
  spotTextLc: 45,        // Badges, shortcuts

  // Font size thresholds
  smallFontSizeThreshold: 11,   // Mínimo para badges
  largeFontSizeThreshold: 16,   // Texto grande
  extraLargeFontSizeThreshold: 20,

  // Font weight thresholds
  lightWeightThreshold: 400,
  boldWeightThreshold: 600,

  // Environment
  darkEnvironmentLuminance: 30,
  brightEnvironmentLuminance: 400,

  // Minimum absolute
  minimumLc: 30, // Fail si es menor

  // Uncertainty for confidence calculation
  uncertaintyWindow: 8,
};
```

---

## 6. Políticas de Governance Requeridas

### 6.1 Política: Navegación Activa (Critical)

```typescript
const activeNavigationPolicy: PerceptualPolicy = {
  id: 'sidebar-active-navigation',
  name: 'Active Navigation Accessibility',
  description: 'Ensures active navigation items meet Gold tier',
  priority: 'critical',
  enforcement: 'strict',
  requirements: {
    minApcaLc: 75,
    minWcag3Tier: 'Gold',
    minFontSizePx: 14,
  },
  applicableContexts: [
    { component: 'NavItem', state: 'active' }
  ],
  enabled: true,
};
```

### 6.2 Política: Texto de Navegación (High)

```typescript
const navigationTextPolicy: PerceptualPolicy = {
  id: 'sidebar-navigation-text',
  name: 'Navigation Text Readability',
  description: 'Ensures all navigation text is readable',
  priority: 'high',
  enforcement: 'strict',
  requirements: {
    minApcaLc: 60,
    minWcag3Tier: 'Silver',
  },
  applicableContexts: [
    { component: 'NavItem', state: 'default' },
    { component: 'NavItem', state: 'hover' }
  ],
  enabled: true,
};
```

### 6.3 Política: Badges (Medium)

```typescript
const badgeTextPolicy: PerceptualPolicy = {
  id: 'sidebar-badge-text',
  name: 'Badge Text Legibility',
  description: 'Ensures badge text is legible despite small size',
  priority: 'medium',
  enforcement: 'advisory',
  requirements: {
    minApcaLc: 60, // Compensar tamaño pequeño con alto contraste
    minWcag3Tier: 'Silver',
    minFontSizePx: 10,
  },
  applicableContexts: [
    { component: 'Badge' }
  ],
  enabled: true,
};
```

### 6.4 Política: Texto Secundario (Low)

```typescript
const secondaryTextPolicy: PerceptualPolicy = {
  id: 'sidebar-secondary-text',
  name: 'Secondary Text Visibility',
  description: 'Ensures secondary text meets minimum requirements',
  priority: 'low',
  enforcement: 'monitoring',
  requirements: {
    minApcaLc: 45,
    minWcag3Tier: 'Bronze',
  },
  applicableContexts: [
    { component: 'SectionHeader' },
    { component: 'Shortcut' }
  ],
  enabled: true,
};
```

---

## 7. Tokens Perceptuales Requeridos

### 7.1 Tokens Derivados (NO manuales)

Todos los tokens deben generarse via `PerceptualTokenGenerator`:

```typescript
const sidebarTokens = {
  // Background System
  '--sidebar-bg': '→ HCT tone 5-8',
  '--sidebar-surface': '→ HCT tone 10-12',
  '--sidebar-hover-bg': '→ HCT tone 12-15',
  '--sidebar-active-bg': '→ Primary HCT tone 15-20 @ 25% opacity',

  // Text System (APCA-validated)
  '--sidebar-text-primary': '→ HCT tone 85-90 | APCA >= 60',
  '--sidebar-text-secondary': '→ HCT tone 70-75 | APCA >= 55',
  '--sidebar-text-muted': '→ HCT tone 50-55 | APCA >= 45',
  '--sidebar-text-active': '→ Primary HCT tone 75-80 | APCA >= 75',

  // Border System
  '--sidebar-divider': '→ HCT tone 15-20 @ 30% opacity',
  '--sidebar-active-border': '→ Primary HCT tone 50-60',

  // Semantic (brand-derived)
  '--sidebar-accent': '→ Accent HCT interpolated',
  '--sidebar-glow': '→ Primary OKLCH radial gradient',
};
```

### 7.2 Mapping HCT → CSS Variables

```typescript
import { PerceptualTokenGenerator } from '@/lib/color-intelligence';

const generator = new PerceptualTokenGenerator();
const tokens = generator.generateDualMode(brandColor);

// Output esperado:
// {
//   dark: {
//     'text-primary': { hex: '#E8E8E8', hct: { h: 0, c: 0, t: 90 }, apca: 87.3 },
//     'text-secondary': { hex: '#A8A8A8', hct: { h: 0, c: 0, t: 65 }, apca: 62.1 },
//     ...
//   }
// }
```

---

## 8. Validación WCAG 3.0 Target

### 8.1 Matriz de Compliance

| Componente | Bronze | Silver | Gold | Platinum |
|------------|:------:|:------:|:----:|:--------:|
| Brand/Logo | ✅ | - | - | - |
| Nav Text (default) | ✅ | ✅ | - | - |
| Nav Icon (default) | ✅ | - | - | - |
| Nav Text (hover) | ✅ | ✅ | - | - |
| Nav Text (active) | ✅ | ✅ | ✅ | - |
| Active Indicator | ✅ | - | - | - |
| Section Headers | ✅ | ✅ | - | - |
| Badge Text | ✅ | ✅ | - | - |
| Shortcuts/Hints | ✅ | - | - | - |
| Disabled Text | - | - | - | - |

### 8.2 Criterio de Éxito

**Mínimo aceptable**:
- ✅ Todos los elementos Bronze
- ✅ Elementos críticos Silver
- ✅ Item activo Gold

**Target óptimo**:
- ✅ Todos los elementos Silver
- ✅ Item activo Platinum (APCA > 90)

---

## 9. Próximos Pasos de Implementación

1. **Crear `useSidebarGovernance` hook**
   - Integrar GovernanceEngine
   - Registrar políticas del sidebar
   - Evaluación automática de tokens

2. **Extender `useSidebarColorIntelligence`**
   - Integrar ContrastDecisionEngine con pesos personalizados
   - Generar AI Contracts para cada decisión de color
   - Exportar tokens validados

3. **Crear PolicyRegistry para sidebar**
   - Cargar políticas definidas arriba
   - Habilitar auto-adjust para violaciones

4. **Implementar CSS Variables export**
   - Usar CSSExporter de Color Intelligence
   - Validación en runtime vs. políticas

5. **Generar AI-Readable Contracts**
   - Documentar cada decisión de color
   - Incluir reasoning, warnings, suggestions

---

## 10. Appendix: APCA Reference Table

| Use Case | Min Lc | Recommended | Font Size | Weight |
|----------|--------|-------------|-----------|--------|
| Body text | 75 | 90 | 16px | 400 |
| Large text | 60 | 75 | 24px | 400 |
| Bold text | 60 | 75 | 16px | 700 |
| Spot text | 45 | 60 | 14px+ | 600+ |
| Placeholder | 45 | 55 | 14px | 400 |
| Disabled | 30 | 45 | - | - |
| Non-text | 30 | 45 | - | - |

---

*Este análisis fue generado siguiendo los principios de Color Intelligence v4.0 y debe actualizarse si cambian los requisitos de diseño o accesibilidad.*

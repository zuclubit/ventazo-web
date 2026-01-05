# @zuclubit/ui-kit — Adoption Checklist

> **Instrucciones:** Completa esta checklist para adoptar el UI-Kit correctamente.
> Copia este archivo a tu proyecto y marca cada item cuando esté completado.

---

## 📋 Pre-Adopción

### Requisitos Previos

- [ ] Node.js 18+ instalado
- [ ] npm o pnpm como package manager
- [ ] Proyecto React/Next.js existente
- [ ] Acceso a repositorio de código

### Lectura Obligatoria

- [ ] Leí [ENTERPRISE_ADOPTION.md](./ENTERPRISE_ADOPTION.md) completo
- [ ] Entiendo los [Golden Paths](./GOLDEN_PATHS.md)
- [ ] Identifico mi path de adopción: ☐ Minimal ☐ Standard ☐ Complete

---

## 🔧 Instalación (15 min)

### Paso 1: Instalar Paquete

```bash
npm install @zuclubit/ui-kit
```

- [ ] Paquete instalado correctamente
- [ ] Sin conflictos de peer dependencies

### Paso 2: Verificar Ambiente

```bash
npx @zuclubit/ui-kit doctor
```

- [ ] Comando ejecuta sin errores
- [ ] Ambiente verificado

---

## ⚙️ Configuración (30 min)

### Paso 3: Crear Archivo de Configuración

- [ ] Copié `ui-kit.config.example.ts` a la raíz del proyecto
- [ ] Renombré a `ui-kit.config.ts`
- [ ] Seleccioné la configuración apropiada (minimal/standard/premium)

### Paso 4: Configurar Providers

```typescript
// app/providers.tsx
import { ThemeProvider, GovernanceProvider, ENTERPRISE_POLICIES } from '@zuclubit/ui-kit';

export function Providers({ children }) {
  return (
    <GovernanceProvider policies={ENTERPRISE_POLICIES.STANDARD} enforceMode="strict">
      <ThemeProvider>
        {children}
      </ThemeProvider>
    </GovernanceProvider>
  );
}
```

- [ ] `GovernanceProvider` configurado en root
- [ ] `ThemeProvider` configurado
- [ ] Policies cargadas correctamente

### Paso 5: Verificar Setup

```bash
npx @zuclubit/ui-kit validate
```

- [ ] GovernanceProvider detected
- [ ] ThemeProvider detected
- [ ] Enterprise policies active

---

## 🎨 Migración de Estilos (1-4 horas)

### Paso 6: Auditar Código Existente

```bash
npx @zuclubit/ui-kit audit --init
```

- [ ] Audit inicial ejecutado
- [ ] Reporte generado
- [ ] Violaciones identificadas: _____ (número)

### Paso 7: Migrar Colores Hardcodeados

```bash
npx @zuclubit/ui-kit lint --no-hardcoded-colors
```

- [ ] Identificados todos los colores hardcodeados
- [ ] Migrados a tokens semánticos
- [ ] Lint pasa sin errores

### Paso 8: Configurar Tailwind (si aplica)

```typescript
// tailwind.config.ts
import { getTailwindConfig } from '@zuclubit/ui-kit/adapters/tailwind';

export default getTailwindConfig({
  // Custom config here
});
```

- [ ] Tailwind configurado con tokens
- [ ] Classes personalizadas migradas

---

## ♿ Accesibilidad (1-2 horas)

### Paso 9: Audit de Accesibilidad

```bash
npx @zuclubit/ui-kit accessibility --standard=wcag-aa
```

- [ ] Audit de accesibilidad ejecutado
- [ ] Violaciones críticas: _____ (debe ser 0)
- [ ] Violaciones serias: _____ (debe ser ≤ 5)

### Paso 10: Corregir Violaciones Críticas

- [ ] Todos los pares de color tienen contraste ≥ 4.5:1
- [ ] Todos los textos son legibles
- [ ] No hay violaciones críticas pendientes

---

## 📊 Conformance (30 min)

### Paso 11: Verificar Conformance

```bash
npx @zuclubit/ui-kit conformance
```

- [ ] Score actual: _____ / 100
- [ ] Nivel alcanzado: ☐ Bronze ☐ Silver ☐ Gold ☐ Platinum
- [ ] Mínimo requerido alcanzado (Bronze = 60)

### Paso 12: Mejorar Score (si necesario)

```bash
npx @zuclubit/ui-kit conformance --suggest-improvements
```

- [ ] Sugerencias de mejora revisadas
- [ ] Mejoras críticas implementadas
- [ ] Score objetivo alcanzado

---

## 🔄 CI/CD (1 hora)

### Paso 13: Configurar Pipeline

- [ ] Workflow de GitHub Actions creado (ver CI_CD_INTEGRATION.md)
- [ ] Quality gates configurados
- [ ] Branch protection rules actualizadas

### Paso 14: Verificar Pipeline

- [ ] PR de prueba creado
- [ ] Checks de UI-Kit ejecutan
- [ ] Reporte aparece en PR

---

## 📚 Documentación (30 min)

### Paso 15: Documentar Customizaciones

- [ ] Tokens custom documentados (si hay)
- [ ] Policies custom documentadas (si hay)
- [ ] Excepciones documentadas (si hay)

### Paso 16: Capacitar al Equipo

- [ ] Equipo informado sobre adopción
- [ ] Recursos compartidos
- [ ] Canal de soporte comunicado

---

## ✅ Verificación Final

### Paso 17: Checklist Final

```bash
npx @zuclubit/ui-kit validate --full
```

| Check | Status |
|-------|--------|
| GovernanceProvider | ☐ |
| ThemeProvider | ☐ |
| Policies active | ☐ |
| Conformance ≥ Bronze | ☐ |
| Zero critical a11y | ☐ |
| Zero hardcoded colors | ☐ |
| CI/CD configured | ☐ |

---

## 📅 Post-Adopción

### Semana 1

- [ ] Monitorear métricas diarias
- [ ] Resolver violaciones emergentes
- [ ] Ajustar configuración si necesario

### Mes 1

- [ ] Review de métricas
- [ ] Identificar áreas de mejora
- [ ] Planificar upgrade a siguiente path (si aplica)

### Trimestre 1

- [ ] Review completo de adopción
- [ ] Feedback al DS Team
- [ ] Roadmap de mejoras

---

## 🆘 ¿Problemas?

1. **Self-service:** `npx @zuclubit/ui-kit doctor --verbose`
2. **Slack:** #ui-kit-support
3. **Email:** design-system@zuclubit.com

---

**Fecha de adopción:** ____________________
**Equipo:** ____________________
**Responsable:** ____________________
**Path seleccionado:** ☐ Minimal ☐ Standard ☐ Complete
**Conformance inicial:** _____ / 100
**Conformance final:** _____ / 100

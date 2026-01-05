/**
 * @fileoverview Components Layer - UI Kit
 *
 * Capa de componentes de referencia arquitectónica del sistema de diseño.
 *
 * Esta capa contiene componentes que demuestran la integración correcta
 * con Color Intelligence y siguen los principios de arquitectura hexagonal.
 *
 * ## Primitivos
 * Building blocks básicos:
 * - ColorSwatch: Visualiza colores perceptuales
 * - TokenDisplay: Muestra tokens del sistema
 *
 * ## Compuestos
 * Componentes más complejos:
 * - AccessibleButton: Botón con accesibilidad automática
 *
 * ## Principios
 * 1. SIN colores hardcodeados
 * 2. Toda lógica de color en el dominio (Color Intelligence)
 * 3. Componentes son "dumb" - solo renderizan
 * 4. Accesibilidad garantizada por el sistema
 * 5. Estados visuales derivados perceptualmente
 *
 * @module ui-kit/components
 * @version 1.0.0
 *
 * @example
 * ```tsx
 * import {
 *   ColorSwatch,
 *   ColorScale,
 *   TokenDisplay,
 *   AccessibleButton,
 * } from '@zuclubit/ui-kit/components';
 * import { PerceptualColor } from '@zuclubit/ui-kit';
 *
 * function DesignSystemDemo() {
 *   const brandColor = PerceptualColor.fromHex('#3B82F6').value!;
 *
 *   // Genera escala automáticamente
 *   const scaleResult = brandColor.generateScale(9);
 *   const scale = scaleResult.success ? scaleResult.value : [];
 *
 *   return (
 *     <div>
 *       <h2>Brand Color</h2>
 *       <ColorSwatch
 *         color={brandColor}
 *         size="lg"
 *         showValue
 *         showLabel
 *         label="Primary"
 *       />
 *
 *       <h2>Color Scale</h2>
 *       <ColorScale
 *         colors={scale.map((c, i) => ({
 *           color: c,
 *           label: `${(i + 1) * 100}`,
 *         }))}
 *       />
 *
 *       <h2>Buttons</h2>
 *       <AccessibleButton
 *         baseColor={brandColor}
 *         variant="solid"
 *       >
 *         Primary Action
 *       </AccessibleButton>
 *     </div>
 *   );
 * }
 * ```
 */

// ============================================================================
// PRIMITIVES
// ============================================================================

export {
  // ColorSwatch
  ColorSwatch,
  ColorSwatchGroup,
  ColorScale,
  type ColorSwatchProps,
  type ColorSwatchGroupProps,
  type ColorScaleProps,
  // TokenDisplay
  TokenDisplay,
  type TokenDisplayProps,
} from './primitives';

// ============================================================================
// COMPOSED
// ============================================================================

export {
  AccessibleButton,
  type AccessibleButtonProps,
  type ButtonVariant,
  type ButtonSize,
  type ButtonState,
} from './composed';

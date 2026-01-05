/**
 * @fileoverview Perceptual Domain Module
 *
 * Expone el núcleo perceptual del sistema de color.
 * Todos los colores deben pasar por este módulo para garantizar
 * corrección perceptual y accesibilidad.
 *
 * @module ui-kit/domain/perceptual
 */

// Value Objects
export * from './value-objects';

// Services
export * from './services';

// Re-export principal
export { PerceptualColor } from './value-objects/PerceptualColor';
export { AccessibilityService, accessibilityService } from './services/AccessibilityService';

/**
 * @fileoverview Perceptual Services Index
 *
 * Exporta servicios de dominio para cálculos perceptuales.
 *
 * @module ui-kit/domain/perceptual/services
 */

export {
  AccessibilityService,
  accessibilityService,
  type RgbColor,
  type ContrastEvaluation,
  WCAG_THRESHOLDS,
  APCA_THRESHOLDS,
} from './AccessibilityService';

// NOTE: WcagLevel and ApcaLevel are NOT re-exported here to avoid
// ambiguity with domain/types definitions. Import directly from
// './AccessibilityService' if you need the service-specific types.

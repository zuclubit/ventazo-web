/**
 * @fileoverview Bridge Adapters Index
 *
 * This module exports bridge adapters that connect @zuclubit/ui-kit
 * with the web application's existing systems.
 *
 * Bridges follow the Adapter pattern from Hexagonal Architecture,
 * providing seamless integration between the domain-driven UI-Kit
 * and the application's infrastructure.
 *
 * @module web/lib/bridges
 * @version 1.0.0
 */

// ============================================================================
// COLOR BRIDGE
// ============================================================================

export {
  ColorBridge,
  type PaletteOptions,
  type PerceptualPalette,
  type PerceptualColorValidation,
} from './ColorBridge';

// ============================================================================
// TOKEN BRIDGE
// ============================================================================

export {
  TokenBridge,
  type TokenNamespace,
  type TokenExportFormat,
  type TokenBridgeConfig,
  type TokenStats,
  // Convenience exports
  typography,
  spacing,
  components,
  animation,
  zIndex,
  breakpoints,
} from './TokenBridge';

// ============================================================================
// RE-EXPORTS FROM UI-KIT (for convenience)
// ============================================================================

export type {
  PerceptualColor,
  DesignToken,
  TokenCollection,
  TokenContext,
  TokenCategory,
  TokenType,
} from '@zuclubit/ui-kit/domain';

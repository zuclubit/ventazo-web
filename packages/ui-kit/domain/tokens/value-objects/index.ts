/**
 * @fileoverview Token Value Objects Index
 * @module ui-kit/domain/tokens/value-objects
 */

export { DesignToken } from './DesignToken';
export type {
  TokenProvenance,
  TokenContext,
  TokenValue,
  ColorTokenValue,
  DimensionTokenValue,
  ShadowTokenValue,
  GradientTokenValue,
  CompositeTokenValue,
  W3CDesignToken,
} from './DesignToken';

// NOTE: TokenType and TokenCategory are NOT re-exported here to avoid
// ambiguity with domain/types definitions (which have different values).
// Import directly from './DesignToken' if you need the DTCG-specific types.

/**
 * Email Module Hooks
 *
 * Barrel exports for email-related hooks.
 * Integrates Color Intelligence Domain for perceptually uniform theming.
 *
 * v2.0 - Extended Color Intelligence Integration
 * - useAvatarColor: HCT-based avatar color generation
 * - useSemanticColors: APCA-validated semantic action colors
 */

export { useEmailTheme, default as useEmailThemeDefault } from './useEmailTheme';

export {
  useColorIntelligence,
  useColorAnalysis,
  useContrastAnalysis,
  useOptimalTextColor,
  useTonalPalette,
  useBrandColors,
  type ColorAnalysis,
  type ContrastAnalysis,
  type ColorIntelligenceAPI,
} from './useColorIntelligence';

export {
  useAvatarColor,
  useAvatarColorPalette,
  getAvatarColor,
  getInitials,
  type AvatarColorResult,
  type AvatarColorOptions,
} from './useAvatarColor';

export {
  useSemanticColors,
  useSemanticColor,
  getSemanticColors,
  type SemanticColor,
  type SemanticColors,
} from './useSemanticColors';

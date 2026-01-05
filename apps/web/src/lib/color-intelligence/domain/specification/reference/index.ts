// ============================================
// Reference Module - Public Exports
// Phase 5: Standardization Layer
// ============================================

export {
  // Golden Sets
  APCA_CONTRAST_GOLDEN_SET,
  OKLCH_CONVERSION_GOLDEN_SET,
  HCT_CONVERSION_GOLDEN_SET,
  TOKEN_GENERATION_GOLDEN_SET,
  GOVERNANCE_GOLDEN_SET,
  ALL_GOLDEN_SETS,
  REFERENCE_PALETTES,
  // Utilities
  getGoldenSet,
  getGoldenSetsByCategory,
  getTotalTestCaseCount,
  getEssentialTestCases,
  createGoldenSetId,
  // Types
  type GoldenSetId,
  type ReferencePalette,
} from './golden-sets';

export {
  // Reference Implementations
  APCAReferenceImplementation,
  OKLCHReferenceImplementation,
  HCTReferenceImplementation,
  WCAG21ReferenceImplementation,
  REFERENCE_IMPLEMENTATIONS,
  // Types
  type ReferenceImplementationType,
} from './reference-implementation';

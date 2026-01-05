/**
 * AI-Readable Color Contracts - Public API
 *
 * LLM-interpretable contracts for color decisions
 * using Color Intelligence v5.x governance layer.
 *
 * @module lib/theme/contracts
 */

// ============================================
// Bottom Navigation Contracts
// ============================================

export {
  generateBottomNavAIContract,
  createBottomNavContract,
  createBottomNavStrictContract,
  buildColorDecision,
  BOTTOM_NAV_CONSTRAINTS,
  PLATINUM_CONSTRAINTS,
  type BottomNavColorDecision,
  type BottomNavAIContract,
  type ContractGeneratorConfig,
} from './bottom-nav-ai-contracts';

// ============================================
// Sidebar Navigation Contracts
// ============================================

export {
  generateSidebarAIContract,
  createSidebarContract,
  createSidebarStrictContract,
  createSidebarAmbientContract,
  buildSidebarColorDecision,
  buildDarkModeSidebarDecisions,
  buildLightModeSidebarDecisions,
  SIDEBAR_CONSTRAINTS,
  SIDEBAR_PLATINUM_CONSTRAINTS,
  SIDEBAR_AMBIENT_CONSTRAINTS,
  SIDEBAR_ELEMENTS,
  type SidebarColorDecision,
  type SidebarAIContract,
  type SidebarContractConfig,
} from './sidebar-ai-contracts';

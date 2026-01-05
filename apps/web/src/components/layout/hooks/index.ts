/**
 * Layout Hooks Index
 *
 * Centralized exports for layout-related hooks including
 * Color Intelligence v5.x integration for sidebar theming.
 *
 * Architecture:
 * - RECOMMENDED: useSidebarColorSystem (Unified, Full Library Integration)
 * - Legacy: useSidebarColorIntelligence + useSidebarGovernance (Phase-based)
 *
 * The useSidebarColorSystem hook provides:
 * - Full generateSmartGlassGradient integration
 * - PerceptualTokenGenerator for tonal palettes
 * - Active AuditTrailService
 * - Single-source CSS variables
 * - WCAG 3.0 Gold tier conformance (100%)
 */

// ============================================
// RECOMMENDED: Unified Color System Hook
// ============================================

export {
  useSidebarColorSystem,
  useSidebarCSSInjection,
  useAuditTrailExport,
  type SidebarColorSystem,
  type NavColors as SidebarNavColors,
  type GlassStyles as SidebarGlassStyles,
  type BadgeColors as SidebarBadgeColors,
  type AmbientEffects as SidebarAmbientEffects,
  type GovernanceResult as SidebarColorGovernanceResult,
  type AuditEntry as SidebarAuditEntry,
} from './useSidebarColorSystem';

// ============================================
// Legacy: Phase 1-3 Color Intelligence
// ============================================

export {
  useSidebarColorIntelligence,
  useSidebarNavColors,
  useSidebarBadgeColors,
  useSidebarGlassStyles,
  useSidebarCSSVariables,
  getSidebarColorIntelligence,
  type NavItemColors,
  type BadgeColors,
  type GlassStyles,
  type AmbientEffects,
  type TonalPalette,
  type SidebarColorIntelligence,
} from './useSidebarColorIntelligence';

// ============================================
// Legacy: Phase 4-5 Governance Layer
// ============================================

export {
  useSidebarGovernance,
  useSidebarGovernanceCSSVars,
  useSidebarConformanceReport,
  type APCATier,
  type ColorDecision,
  type NavGovernance,
  type SidebarGovernanceResult,
  type GovernedCSSVariable,
  type GovernanceSummary,
} from './useSidebarGovernance';

// ============================================
// Bottom Navigation Hooks
// ============================================

export {
  useBottomNavColorIntelligence,
  useBottomNavItemColors,
  useBottomNavBarStyles,
  useBottomNavCSSVariables,
  getBottomNavColorIntelligence,
  type BottomNavColorIntelligence,
  type BottomNavItemColors,
  type BottomBarStyles,
  type SheetNavColors,
  type TouchFeedbackEffects,
  type TonalPalette as BottomNavTonalPalette,
} from './useBottomNavColorIntelligence';

export {
  useBottomNavGovernance,
} from './useBottomNavGovernance';

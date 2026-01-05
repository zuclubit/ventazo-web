/**
 * Design Token Exports - Public API
 *
 * Pre-generated token files for external tooling:
 * - CSS Variables for runtime styling
 * - W3C Design Tokens for design tool integration
 *
 * @module lib/theme/exports
 */

// ============================================
// Bottom Navigation Tokens
// ============================================

/**
 * Path to CSS Variables file
 * Import in globals.css or component styles
 *
 * @example
 * ```css
 * @import '@/lib/theme/exports/bottom-nav-tokens.css';
 * ```
 */
export const BOTTOM_NAV_CSS_PATH = './bottom-nav-tokens.css';

/**
 * Path to W3C Design Tokens JSON
 * Import in design tools (Figma Tokens, Style Dictionary)
 *
 * @example
 * ```js
 * import tokens from '@/lib/theme/exports/bottom-nav-tokens.json';
 * ```
 */
export const BOTTOM_NAV_TOKENS_PATH = './bottom-nav-tokens.json';

/**
 * Import W3C Design Tokens as JavaScript object
 */
import bottomNavTokens from './bottom-nav-tokens.json';

export { bottomNavTokens };

/**
 * Get CSS variable names for bottom navigation
 */
export function getBottomNavCSSVarNames(): string[] {
  return [
    // Bar
    '--bottomNav-bar-background',
    '--bottomNav-bar-backgroundAlpha',
    '--bottomNav-bar-blur',
    '--bottomNav-bar-border',
    '--bottomNav-bar-shadow',
    // Item (inactive)
    '--bottomNav-item-text',
    '--bottomNav-item-textAlpha',
    '--bottomNav-item-icon',
    '--bottomNav-item-iconAlpha',
    '--bottomNav-item-background',
    '--bottomNav-item-hoverBackground',
    // Item (active)
    '--bottomNav-itemActive-text',
    '--bottomNav-itemActive-icon',
    '--bottomNav-itemActive-background',
    '--bottomNav-itemActive-indicator',
    // Focus
    '--bottomNav-focus-ring',
    '--bottomNav-focus-ringWidth',
    '--bottomNav-focus-ringOffset',
    // Sheet
    '--bottomNav-sheet-background',
    '--bottomNav-sheet-divider',
    '--bottomNav-sheet-sectionHeader',
    '--bottomNav-sheet-itemIcon',
    '--bottomNav-sheet-itemIconBackground',
    '--bottomNav-sheet-itemActiveIconBackground',
    '--bottomNav-sheet-itemActiveIndicator',
    '--bottomNav-sheet-itemHoverBackground',
    // Touch
    '--bottomNav-touch-minTargetSize',
    '--bottomNav-touch-activeScale',
    '--bottomNav-touch-transitionDuration',
    '--bottomNav-touch-transitionEasing',
  ];
}

// ============================================
// Sidebar Navigation Tokens
// ============================================

/**
 * Path to Sidebar CSS Variables file
 * Import in globals.css or component styles
 *
 * @example
 * ```css
 * @import '@/lib/theme/exports/sidebar-tokens.css';
 * ```
 */
export const SIDEBAR_CSS_PATH = './sidebar-tokens.css';

/**
 * Path to Sidebar W3C Design Tokens JSON
 * Import in design tools (Figma Tokens, Style Dictionary)
 *
 * @example
 * ```js
 * import tokens from '@/lib/theme/exports/sidebar-tokens.json';
 * ```
 */
export const SIDEBAR_TOKENS_PATH = './sidebar-tokens.json';

/**
 * Import Sidebar W3C Design Tokens as JavaScript object
 */
import sidebarTokens from './sidebar-tokens.json';

export { sidebarTokens };

/**
 * Get CSS variable names for sidebar navigation
 */
export function getSidebarCSSVarNames(): string[] {
  return [
    // Navigation (inactive)
    '--sidebar-text',
    '--sidebar-icon',
    '--sidebar-hover-bg',
    '--sidebar-hover-text',
    '--sidebar-muted-text',
    '--sidebar-focus-ring',
    // Navigation (active)
    '--sidebar-active-bg',
    '--sidebar-active-text',
    '--sidebar-active-border',
    // Glass Morphism
    '--sidebar-glass-bg',
    '--sidebar-glass-border',
    '--sidebar-glass-blur',
    '--sidebar-glass-shadow',
    '--sidebar-glass-highlight',
    // Ambient Effects
    '--sidebar-logo-glow',
    '--sidebar-divider',
    '--sidebar-ripple',
    '--sidebar-indicator-glow',
    // Badges
    '--sidebar-badge-default',
    '--sidebar-badge-default-text',
    '--sidebar-badge-warning',
    '--sidebar-badge-warning-text',
    '--sidebar-badge-success',
    '--sidebar-badge-success-text',
    '--sidebar-badge-destructive',
    '--sidebar-badge-destructive-text',
    '--sidebar-badge-info',
    '--sidebar-badge-info-text',
    // Brand References
    '--sidebar-primary',
    '--sidebar-accent',
    // APCA Metadata
    '--sidebar-apca-min-required',
    '--sidebar-apca-text-lc',
    '--sidebar-apca-active-text-lc',
    '--sidebar-apca-tier',
  ];
}

// ============================================
// Shared Constants
// ============================================

/**
 * APCA tier thresholds for reference
 */
export const APCA_TIERS = {
  bronze: 45,
  silver: 60,
  gold: 75,
  platinum: 90,
} as const;

/**
 * WCAG 3.0 conformance levels
 */
export const WCAG3_CONFORMANCE = {
  minimum: 'bronze',
  acceptable: 'silver',
  target: 'gold',
  enhanced: 'platinum',
} as const;

/**
 * Color Intelligence library version
 */
export const COLOR_INTELLIGENCE_VERSION = '5.0.0';

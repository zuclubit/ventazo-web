/**
 * Landing Header Module
 *
 * Modular header system for landing pages.
 * Exports all components and types for maximum flexibility.
 */

// Main component
export { LandingHeader } from './landing-header';

// Sub-components for custom compositions
export { Logo } from './logo';
export { NavLinks } from './nav-links';
export { HeaderCTA } from './header-cta';
export { MobileMenu } from './mobile-menu';

// Types
export type {
  LandingHeaderProps,
  LandingHeaderConfig,
  NavItem,
  CTAButton,
  LogoProps,
  NavLinksProps,
  MobileMenuProps,
  HeaderCTAProps,
} from './types';

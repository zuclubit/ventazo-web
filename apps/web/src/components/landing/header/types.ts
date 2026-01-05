/**
 * Landing Header Types
 *
 * Type definitions for the modular landing header system.
 * Follows clean architecture principles with clear interfaces.
 */

import type { LucideIcon } from 'lucide-react';

// Navigation item configuration
export interface NavItem {
  label: string;
  href: string;
  icon?: LucideIcon;
  isExternal?: boolean;
  badge?: string;
}

// CTA Button configuration
export interface CTAButton {
  label: string;
  href: string;
  variant: 'primary' | 'secondary' | 'outline' | 'ghost';
  icon?: LucideIcon;
  iconPosition?: 'left' | 'right';
}

// Header configuration props
export interface LandingHeaderConfig {
  logo?: {
    text: string;
    icon?: string;
    href?: string;
  };
  navigation: NavItem[];
  ctaButtons: CTAButton[];
  showCountrySelector?: boolean;
  showCurrency?: boolean;
}

// Component props
export interface LandingHeaderProps {
  config?: Partial<LandingHeaderConfig>;
  className?: string;
  variant?: 'transparent' | 'solid' | 'blur';
  sticky?: boolean;
}

export interface LogoProps {
  text: string;
  icon?: string;
  href?: string;
  className?: string;
  showAttribution?: boolean;
}

export interface NavLinksProps {
  items: NavItem[];
  className?: string;
  variant?: 'pill' | 'minimal' | 'underline';
}

export interface MobileMenuProps {
  items: NavItem[];
  ctaButtons: CTAButton[];
  isOpen: boolean;
  onClose: () => void;
}

export interface HeaderCTAProps {
  buttons: CTAButton[];
  className?: string;
}

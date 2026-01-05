'use client';

/**
 * useCustomerTheme - Dynamic Theming System for Customer Kanban v1.0
 *
 * @description Enterprise-grade theming hook that provides dynamic colors
 * for the Customer Lifecycle Kanban board. Extends patterns from useKanbanTheme
 * with customer-specific theming for health scores, tiers, and lifecycle stages.
 *
 * Architecture:
 * - Tenant colors (primary, accent, surface) from useTenantBranding
 * - Health score colors (excellent, good, at_risk, critical)
 * - Tier gradient colors (enterprise, premium, standard, basic)
 * - Lifecycle stage colors for Kanban columns
 * - CSS variables injected for global access
 *
 * @version 1.0.0
 * @module hooks/useCustomerTheme
 */

import * as React from 'react';
import { useTenantBranding } from '@/hooks/use-tenant-branding';

// ============================================
// Types
// ============================================

export interface LifecycleStageConfig {
  id: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  textColor: string;
}

export interface TierTheme {
  gradient: string;
  text: string;
  border: string;
  shadow: string;
  bg: string;
}

export interface HealthTheme {
  color: string;
  bg: string;
  border: string;
  gradient: string;
  pulseColor: string;
}

export interface CustomerCardTheme {
  bg: string;
  bgHover: string;
  bgActive: string;
  border: string;
  borderHover: string;
  borderSelected: string;
  shadow: string;
  shadowHover: string;
  shadowDragging: string;
}

export interface CustomerActionTheme {
  bg: string;
  bgHover: string;
  text: string;
  border: string;
}

export interface CustomerTheme {
  card: CustomerCardTheme;
  health: {
    excellent: HealthTheme;
    good: HealthTheme;
    at_risk: HealthTheme;
    critical: HealthTheme;
  };
  tier: {
    enterprise: TierTheme;
    premium: TierTheme;
    standard: TierTheme;
    basic: TierTheme;
  };
  lifecycle: {
    prospect: LifecycleStageConfig;
    onboarding: LifecycleStageConfig;
    active: LifecycleStageConfig;
    at_risk: LifecycleStageConfig;
    renewal: LifecycleStageConfig;
    churned: LifecycleStageConfig;
  };
  dropZone: {
    borderColor: string;
    shadow: string;
    bgTint: string;
  };
  column: {
    bgLight: string;
    bgDark: string;
    borderLight: string;
    borderDark: string;
  };
  actions: {
    whatsapp: CustomerActionTheme;
    call: CustomerActionTheme;
    email: CustomerActionTheme;
    primary: CustomerActionTheme;
  };
  getLifecycleStage: (stageId: string) => LifecycleStageConfig | null;
  getTierTheme: (tier: string) => TierTheme;
  getHealthTheme: (level: string) => HealthTheme;
  isCustomTheme: boolean;
  primaryColor: string;
  accentColor: string;
  surfaceColor: string;
}

// ============================================
// Color Utilities (imported pattern from useKanbanTheme)
// ============================================

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const sanitized = hex.replace('#', '');
  const fullHex = sanitized.length === 3
    ? sanitized.split('').map(c => c + c).join('')
    : sanitized;

  return {
    r: parseInt(fullHex.substring(0, 2), 16) || 0,
    g: parseInt(fullHex.substring(2, 4), 16) || 0,
    b: parseInt(fullHex.substring(4, 6), 16) || 0,
  };
}

function hexToRgba(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function getLuminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);

  const toLinear = (c: number) => {
    const sRGB = c / 255;
    return sRGB <= 0.03928 ? sRGB / 12.92 : Math.pow((sRGB + 0.055) / 1.055, 2.4);
  };

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function getOptimalTextColor(bgHex: string): string {
  const luminance = getLuminance(bgHex);
  return luminance > 0.4 ? '#1C1C1E' : '#FFFFFF';
}

function lightenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amt = Math.round(2.55 * percent);

  const newR = Math.min(255, r + amt);
  const newG = Math.min(255, g + amt);
  const newB = Math.min(255, b + amt);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function darkenColor(hex: string, percent: number): string {
  const { r, g, b } = hexToRgb(hex);
  const amt = Math.round(2.55 * percent);

  const newR = Math.max(0, r - amt);
  const newG = Math.max(0, g - amt);
  const newB = Math.max(0, b - amt);

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

// ============================================
// Default Theme Values
// ============================================

const DEFAULT_PRIMARY = '#0EB58C';
const DEFAULT_ACCENT = '#5EEAD4';
const DEFAULT_SURFACE = '#052828';

// Health colors (semantic)
const HEALTH_COLORS = {
  excellent: '#059669', // Emerald
  good: '#3B82F6',      // Blue
  at_risk: '#F59E0B',   // Amber
  critical: '#EF4444',  // Red
};

// Tier colors (brand gradients)
const TIER_COLORS = {
  enterprise: { start: '#7C3AED', mid: '#A855F7', end: '#C084FC' }, // Purple
  premium: { start: '#2563EB', mid: '#3B82F6', end: '#60A5FA' },    // Blue
  standard: { start: '#6B7280', mid: '#9CA3AF', end: '#D1D5DB' },   // Gray
  basic: { start: '#78716C', mid: '#A8A29E', end: '#D6D3D1' },      // Stone
};

// Lifecycle stage colors
const LIFECYCLE_COLORS = {
  prospect: '#3B82F6',    // Blue - New potential
  onboarding: '#8B5CF6',  // Violet - In process
  active: '#059669',      // Emerald - Healthy
  at_risk: '#F59E0B',     // Amber - Warning
  renewal: '#EC4899',     // Pink - Action needed
  churned: '#6B7280',     // Gray - Lost
};

// Action colors
const WHATSAPP_GREEN = '#25D366';
const EMAIL_BLUE = '#3B82F6';

// ============================================
// Main Hook
// ============================================

export function useCustomerTheme(): CustomerTheme {
  const branding = useTenantBranding();

  // Extract tenant colors with fallbacks
  const primaryColor = branding.primaryColor || DEFAULT_PRIMARY;
  const accentColor = branding.accentColor || DEFAULT_ACCENT;
  const surfaceColor = branding.surfaceColor || DEFAULT_SURFACE;

  // Check if using custom tenant colors
  const isCustomTheme = primaryColor !== DEFAULT_PRIMARY;

  // Derived colors (homologated with useKanbanTheme)
  const primaryRgb = hexToRgb(primaryColor);
  const accentRgb = hexToRgb(accentColor);
  const primaryHover = darkenColor(primaryColor, 10);
  const primaryLight = lightenColor(primaryColor, 35);
  const primaryLighter = lightenColor(primaryColor, 50);
  const accentLight = lightenColor(accentColor, 30);

  // ============================================
  // Card Theme
  // ============================================
  const card = React.useMemo<CustomerCardTheme>(() => ({
    bg: 'rgba(255, 255, 255, 0.92)',
    bgHover: 'rgba(255, 255, 255, 0.98)',
    bgActive: 'rgba(255, 255, 255, 0.96)',
    border: 'rgba(0, 0, 0, 0.06)',
    borderHover: hexToRgba(primaryColor, 0.25),
    borderSelected: primaryColor,
    shadow: '0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.06)',
    shadowHover: `0 4px 12px ${hexToRgba(primaryColor, 0.12)}, 0 2px 4px rgba(0, 0, 0, 0.08)`,
    shadowDragging: `0 8px 32px ${hexToRgba(primaryColor, 0.2)}, 0 4px 16px rgba(0, 0, 0, 0.12)`,
  }), [primaryColor]);

  // ============================================
  // Health Themes
  // ============================================
  const health = React.useMemo(() => {
    const createHealthTheme = (baseColor: string): HealthTheme => ({
      color: baseColor,
      bg: hexToRgba(baseColor, 0.12),
      border: hexToRgba(baseColor, 0.35),
      gradient: `linear-gradient(135deg, ${darkenColor(baseColor, 10)} 0%, ${baseColor} 50%, ${lightenColor(baseColor, 15)} 100%)`,
      pulseColor: hexToRgba(baseColor, 0.5),
    });

    return {
      excellent: createHealthTheme(HEALTH_COLORS.excellent),
      good: createHealthTheme(HEALTH_COLORS.good),
      at_risk: createHealthTheme(HEALTH_COLORS.at_risk),
      critical: createHealthTheme(HEALTH_COLORS.critical),
    };
  }, []);

  // ============================================
  // Tier Themes
  // ============================================
  const tier = React.useMemo(() => {
    const createTierTheme = (colors: { start: string; mid: string; end: string }): TierTheme => ({
      gradient: `linear-gradient(135deg, ${colors.start} 0%, ${colors.mid} 50%, ${colors.end} 100%)`,
      text: getOptimalTextColor(colors.mid),
      border: hexToRgba(colors.mid, 0.4),
      shadow: `0 2px 8px ${hexToRgba(colors.mid, 0.25)}`,
      bg: hexToRgba(colors.mid, 0.15),
    });

    return {
      enterprise: createTierTheme(TIER_COLORS.enterprise),
      premium: createTierTheme(TIER_COLORS.premium),
      standard: createTierTheme(TIER_COLORS.standard),
      basic: createTierTheme(TIER_COLORS.basic),
    };
  }, []);

  // ============================================
  // Lifecycle Stage Themes
  // ============================================
  const lifecycle = React.useMemo(() => {
    const createLifecycleStage = (
      id: string,
      label: string,
      color: string
    ): LifecycleStageConfig => ({
      id,
      label,
      color,
      bg: hexToRgba(color, 0.12),
      border: hexToRgba(color, 0.35),
      glow: hexToRgba(color, 0.25),
      textColor: getLuminance(color) < 0.4 ? lightenColor(color, 20) : darkenColor(color, 20),
    });

    return {
      prospect: createLifecycleStage('prospect', 'Prospectos', LIFECYCLE_COLORS.prospect),
      onboarding: createLifecycleStage('onboarding', 'Onboarding', LIFECYCLE_COLORS.onboarding),
      active: createLifecycleStage('active', 'Activos', LIFECYCLE_COLORS.active),
      at_risk: createLifecycleStage('at_risk', 'En Riesgo', LIFECYCLE_COLORS.at_risk),
      renewal: createLifecycleStage('renewal', 'Renovación', LIFECYCLE_COLORS.renewal),
      churned: createLifecycleStage('churned', 'Perdidos', LIFECYCLE_COLORS.churned),
    };
  }, []);

  // ============================================
  // Drop Zone Theme
  // ============================================
  const dropZone = React.useMemo(() => ({
    borderColor: hexToRgba(primaryColor, 0.5),
    shadow: `0 0 0 3px ${hexToRgba(primaryColor, 0.15)}, 0 0 30px ${hexToRgba(primaryColor, 0.2)}`,
    bgTint: hexToRgba(primaryColor, 0.05),
  }), [primaryColor]);

  // ============================================
  // Column Theme
  // ============================================
  const column = React.useMemo(() => ({
    bgLight: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.5) 100%)',
    bgDark: `linear-gradient(180deg, ${hexToRgba(surfaceColor, 0.5)} 0%, ${hexToRgba(surfaceColor, 0.3)} 100%)`,
    borderLight: 'rgba(0, 0, 0, 0.04)',
    borderDark: 'rgba(255, 255, 255, 0.05)',
  }), [surfaceColor]);

  // ============================================
  // Action Button Themes
  // ============================================
  const actions = React.useMemo(() => ({
    whatsapp: {
      bg: hexToRgba(WHATSAPP_GREEN, 0.1),
      bgHover: hexToRgba(WHATSAPP_GREEN, 0.15),
      text: WHATSAPP_GREEN,
      border: hexToRgba(WHATSAPP_GREEN, 0.25),
    },
    call: {
      bg: hexToRgba(primaryColor, 0.1),
      bgHover: hexToRgba(primaryColor, 0.15),
      text: primaryColor,
      border: hexToRgba(primaryColor, 0.25),
    },
    email: {
      bg: hexToRgba(EMAIL_BLUE, 0.1),
      bgHover: hexToRgba(EMAIL_BLUE, 0.15),
      text: EMAIL_BLUE,
      border: hexToRgba(EMAIL_BLUE, 0.25),
    },
    primary: {
      bg: hexToRgba(primaryColor, 0.1),
      bgHover: hexToRgba(primaryColor, 0.15),
      text: primaryColor,
      border: hexToRgba(primaryColor, 0.25),
    },
  }), [primaryColor]);

  // ============================================
  // Helper Functions
  // ============================================
  const getLifecycleStage = React.useCallback((stageId: string): LifecycleStageConfig | null => {
    const stages = lifecycle as Record<string, LifecycleStageConfig>;
    return stages[stageId] || null;
  }, [lifecycle]);

  const getTierTheme = React.useCallback((tierName: string): TierTheme => {
    const tiers = tier as Record<string, TierTheme>;
    return tiers[tierName] || tier.standard;
  }, [tier]);

  const getHealthTheme = React.useCallback((level: string): HealthTheme => {
    const healthLevels = health as Record<string, HealthTheme>;
    return healthLevels[level] || health.good;
  }, [health]);

  // ============================================
  // Apply CSS Variables on Mount/Update
  // ============================================
  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // ========== TENANT CORE (homologated with useKanbanTheme) ==========
    root.style.setProperty('--tenant-primary', primaryColor);
    root.style.setProperty('--tenant-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    root.style.setProperty('--tenant-primary-hover', primaryHover);
    root.style.setProperty('--tenant-primary-light', primaryLight);
    root.style.setProperty('--tenant-primary-lighter', primaryLighter);
    root.style.setProperty('--tenant-primary-glow', hexToRgba(primaryColor, 0.25));
    root.style.setProperty('--tenant-accent', accentColor);
    root.style.setProperty('--tenant-accent-rgb', `${accentRgb.r}, ${accentRgb.g}, ${accentRgb.b}`);
    root.style.setProperty('--tenant-accent-light', accentLight);
    root.style.setProperty('--tenant-accent-glow', hexToRgba(accentColor, 0.25));
    root.style.setProperty('--tenant-surface', surfaceColor);

    // ========== ACTION BUTTONS ==========
    root.style.setProperty('--action-whatsapp-bg', actions.whatsapp.bg);
    root.style.setProperty('--action-whatsapp-bg-hover', actions.whatsapp.bgHover);
    root.style.setProperty('--action-whatsapp-text', actions.whatsapp.text);
    root.style.setProperty('--action-whatsapp-border', actions.whatsapp.border);
    root.style.setProperty('--action-call-bg', actions.call.bg);
    root.style.setProperty('--action-call-bg-hover', actions.call.bgHover);
    root.style.setProperty('--action-call-text', actions.call.text);
    root.style.setProperty('--action-call-border', actions.call.border);
    root.style.setProperty('--action-email-bg', actions.email.bg);
    root.style.setProperty('--action-email-bg-hover', actions.email.bgHover);
    root.style.setProperty('--action-email-text', actions.email.text);
    root.style.setProperty('--action-email-border', actions.email.border);
    root.style.setProperty('--action-primary-bg', actions.primary.bg);
    root.style.setProperty('--action-primary-bg-hover', actions.primary.bgHover);
    root.style.setProperty('--action-primary-text', actions.primary.text);
    root.style.setProperty('--action-primary-border', actions.primary.border);

    // ========== TEXT ACCENT (Dynamic) ==========
    root.style.setProperty('--text-accent', primaryColor);
    root.style.setProperty('--text-accent-hover', primaryHover);

    // ========== HEALTH COLORS ==========
    root.style.setProperty('--health-excellent', HEALTH_COLORS.excellent);
    root.style.setProperty('--health-excellent-bg', health.excellent.bg);
    root.style.setProperty('--health-excellent-border', health.excellent.border);
    root.style.setProperty('--health-excellent-gradient', health.excellent.gradient);

    root.style.setProperty('--health-good', HEALTH_COLORS.good);
    root.style.setProperty('--health-good-bg', health.good.bg);
    root.style.setProperty('--health-good-border', health.good.border);
    root.style.setProperty('--health-good-gradient', health.good.gradient);

    root.style.setProperty('--health-at-risk', HEALTH_COLORS.at_risk);
    root.style.setProperty('--health-at-risk-bg', health.at_risk.bg);
    root.style.setProperty('--health-at-risk-border', health.at_risk.border);
    root.style.setProperty('--health-at-risk-gradient', health.at_risk.gradient);

    root.style.setProperty('--health-critical', HEALTH_COLORS.critical);
    root.style.setProperty('--health-critical-bg', health.critical.bg);
    root.style.setProperty('--health-critical-border', health.critical.border);
    root.style.setProperty('--health-critical-gradient', health.critical.gradient);

    // ========== TIER GRADIENTS ==========
    root.style.setProperty('--tier-enterprise-gradient', tier.enterprise.gradient);
    root.style.setProperty('--tier-premium-gradient', tier.premium.gradient);
    root.style.setProperty('--tier-standard-gradient', tier.standard.gradient);
    root.style.setProperty('--tier-basic-gradient', tier.basic.gradient);

    // ========== LIFECYCLE COLORS ==========
    root.style.setProperty('--lifecycle-prospect', LIFECYCLE_COLORS.prospect);
    root.style.setProperty('--lifecycle-onboarding', LIFECYCLE_COLORS.onboarding);
    root.style.setProperty('--lifecycle-active', LIFECYCLE_COLORS.active);
    root.style.setProperty('--lifecycle-at-risk', LIFECYCLE_COLORS.at_risk);
    root.style.setProperty('--lifecycle-renewal', LIFECYCLE_COLORS.renewal);
    root.style.setProperty('--lifecycle-churned', LIFECYCLE_COLORS.churned);

    // ========== CUSTOMER CARD ==========
    root.style.setProperty('--customer-card-border-hover', card.borderHover);
    root.style.setProperty('--customer-card-border-selected', card.borderSelected);
    root.style.setProperty('--customer-card-shadow-hover', card.shadowHover);
    root.style.setProperty('--customer-card-shadow-dragging', card.shadowDragging);

    // ========== DROP ZONE ==========
    root.style.setProperty('--customer-drop-border', dropZone.borderColor);
    root.style.setProperty('--customer-drop-shadow', dropZone.shadow);
    root.style.setProperty('--customer-drop-bg', dropZone.bgTint);

  }, [
    primaryColor, primaryRgb, primaryHover, primaryLight, primaryLighter,
    accentColor, accentRgb, accentLight, surfaceColor,
    health, tier, card, dropZone, actions
  ]);

  return {
    card,
    health,
    tier,
    lifecycle,
    dropZone,
    column,
    actions,
    getLifecycleStage,
    getTierTheme,
    getHealthTheme,
    isCustomTheme,
    primaryColor,
    accentColor,
    surfaceColor,
  };
}

// ============================================
// Context for Deep Component Access
// ============================================

const CustomerThemeContext = React.createContext<CustomerTheme | null>(null);

export function CustomerThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useCustomerTheme();

  return (
    <CustomerThemeContext.Provider value={theme}>
      {children}
    </CustomerThemeContext.Provider>
  );
}

export function useCustomerThemeContext(): CustomerTheme {
  const context = React.useContext(CustomerThemeContext);
  if (!context) {
    throw new Error('useCustomerThemeContext must be used within CustomerThemeProvider');
  }
  return context;
}

export function useCustomerThemeOptional(): CustomerTheme | null {
  return React.useContext(CustomerThemeContext);
}

// ============================================
// Export Color Utilities for Reuse
// ============================================

export {
  hexToRgb,
  hexToRgba,
  getLuminance,
  getOptimalTextColor,
  lightenColor,
  darkenColor,
};

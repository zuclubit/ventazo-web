'use client';

/**
 * useQuoteTheme - Dynamic Theming System for Quotes Kanban Board
 *
 * @description Enterprise-grade theming hook that provides dynamic colors
 * for the Quotes Kanban board based on tenant configuration.
 *
 * Extends the base Kanban theme with quote-specific styling:
 * - Quote status colors with semantic meaning
 * - Amount/total formatting with currency awareness
 * - Expiry date urgency indicators
 * - Quote-specific card variants
 *
 * @version 1.0.0
 * @module hooks/useQuoteTheme
 */

import * as React from 'react';
import { useTenantBranding } from '@/hooks/use-tenant-branding';
import type { QuoteStatus } from '@/lib/quotes';

// ============================================
// Types
// ============================================

export interface StatusColorConfig {
  id: QuoteStatus;
  bg: string;
  text: string;
  border: string;
  glow: string;
  icon: string;
  raw: string;
}

export interface QuoteCardTheme {
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

export interface UrgencyTheme {
  expired: { bg: string; text: string; border: string };
  critical: { bg: string; text: string; border: string }; // <3 days
  warning: { bg: string; text: string; border: string };  // <7 days
  normal: { bg: string; text: string; border: string };   // >7 days
}

export interface ActionTheme {
  bg: string;
  bgHover: string;
  text: string;
  border: string;
}

export interface ValueCardTheme {
  gradient: string;
  gradientAccepted: string;
  gradientRejected: string;
  shadow: string;
  shadowAccepted: string;
  shadowRejected: string;
  text: string;
  textMuted: string;
}

export interface TimelineTheme {
  dot: Record<QuoteStatus, string>;
  dotDefault: string;
}

export interface QuoteTheme {
  card: QuoteCardTheme;
  valueCard: ValueCardTheme;
  timeline: TimelineTheme;
  status: Record<QuoteStatus, StatusColorConfig>;
  urgency: UrgencyTheme;
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
    send: ActionTheme;
    accept: ActionTheme;
    reject: ActionTheme;
    duplicate: ActionTheme;
    primary: ActionTheme;
    // Quick contact actions (homologated with Opportunities)
    whatsapp: ActionTheme;
    call: ActionTheme;
    email: ActionTheme;
  };
  getStatusColors: (status: QuoteStatus) => StatusColorConfig;
  getStatusBadgeStyle: (status: QuoteStatus) => React.CSSProperties;
  getUrgencyLevel: (expiryDate?: string) => 'expired' | 'critical' | 'warning' | 'normal';
  getUrgencyStyle: (expiryDate?: string) => React.CSSProperties;
  getValueCardStyle: (status: QuoteStatus, isExpired?: boolean) => React.CSSProperties;
  getTimelineDotColor: (status: QuoteStatus) => string;
  isCustomTheme: boolean;
  primaryColor: string;
  accentColor: string;
}

// ============================================
// Color Utilities
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

const DEFAULT_PRIMARY = 'var(--tenant-primary, #0EB58C)';
const DEFAULT_ACCENT = 'var(--tenant-accent, #5EEAD4)';

// Quote Status Colors - using CSS variables with fallbacks
const STATUS_COLORS: Record<QuoteStatus, string> = {
  draft: 'var(--quote-status-draft, #64748B)',
  pending_review: 'var(--quote-status-pending, #F59E0B)',
  sent: 'var(--quote-status-sent, #3B82F6)',
  viewed: 'var(--quote-status-viewed, #8B5CF6)',
  accepted: 'var(--quote-status-accepted, #10B981)',
  rejected: 'var(--quote-status-rejected, #EF4444)',
  expired: 'var(--quote-status-expired, #6B7280)',
  revised: 'var(--quote-status-revised, #06B6D4)',
};

// Semantic action colors (homologated with Opportunities) - using CSS variables
const WHATSAPP_GREEN = 'var(--action-whatsapp, #25D366)';
const EMAIL_BLUE = 'var(--action-email, #3B82F6)';
const CALL_TEAL = 'var(--action-call, #0EB58C)';

// ============================================
// Main Hook
// ============================================

export function useQuoteTheme(): QuoteTheme {
  const branding = useTenantBranding();

  // Extract tenant colors with fallbacks
  const primaryColor = branding.primaryColor || DEFAULT_PRIMARY;
  const accentColor = branding.accentColor || DEFAULT_ACCENT;

  // Check if using custom tenant colors
  const isCustomTheme = primaryColor !== DEFAULT_PRIMARY;

  // Derived colors
  const primaryRgb = hexToRgb(primaryColor);
  const primaryHover = darkenColor(primaryColor, 10);

  // ============================================
  // Generate Card Theme
  // ============================================
  const card = React.useMemo<QuoteCardTheme>(() => ({
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
  // Generate ValueCard Theme (Dynamic Gradients)
  // ============================================
  const valueCard = React.useMemo<ValueCardTheme>(() => {
    const primaryVia = darkenColor(primaryColor, 8);
    const primaryTo = darkenColor(primaryColor, 16);
    const acceptedColor = '#10B981';
    const acceptedVia = darkenColor(acceptedColor, 8);
    const acceptedTo = darkenColor(acceptedColor, 16);
    const rejectedColor = '#EF4444';
    const rejectedVia = darkenColor(rejectedColor, 8);
    const rejectedTo = darkenColor(rejectedColor, 16);

    return {
      gradient: `linear-gradient(to bottom right, ${primaryColor}, ${primaryVia}, ${primaryTo})`,
      gradientAccepted: `linear-gradient(to bottom right, ${acceptedColor}, ${acceptedVia}, ${acceptedTo})`,
      gradientRejected: `linear-gradient(to bottom right, ${rejectedColor}, ${rejectedVia}, ${rejectedTo})`,
      shadow: `0 10px 25px -5px ${hexToRgba(primaryColor, 0.25)}, 0 8px 10px -6px ${hexToRgba(primaryColor, 0.15)}`,
      shadowAccepted: `0 10px 25px -5px ${hexToRgba(acceptedColor, 0.25)}, 0 8px 10px -6px ${hexToRgba(acceptedColor, 0.15)}`,
      shadowRejected: `0 10px 25px -5px ${hexToRgba(rejectedColor, 0.25)}, 0 8px 10px -6px ${hexToRgba(rejectedColor, 0.15)}`,
      text: '#FFFFFF',
      textMuted: 'rgba(255, 255, 255, 0.8)',
    };
  }, [primaryColor]);

  // ============================================
  // Generate Timeline Theme
  // ============================================
  const timeline = React.useMemo<TimelineTheme>(() => ({
    dot: {
      draft: 'var(--quote-status-draft, #64748B)',
      pending_review: 'var(--quote-status-pending, #F59E0B)',
      sent: 'var(--quote-status-sent, #3B82F6)',
      viewed: 'var(--quote-status-viewed, #8B5CF6)',
      accepted: 'var(--quote-status-accepted, #10B981)',
      rejected: 'var(--quote-status-rejected, #EF4444)',
      expired: 'var(--quote-status-expired, #6B7280)',
      revised: 'var(--quote-status-revised, #06B6D4)',
    },
    dotDefault: 'rgba(100, 116, 139, 0.6)',
  }), []);

  // ============================================
  // Generate Status Colors
  // ============================================
  const status = React.useMemo<Record<QuoteStatus, StatusColorConfig>>(() => {
    const result = {} as Record<QuoteStatus, StatusColorConfig>;

    (Object.keys(STATUS_COLORS) as QuoteStatus[]).forEach((statusKey) => {
      const baseColor = STATUS_COLORS[statusKey];
      const isDark = getLuminance(baseColor) < 0.4;

      result[statusKey] = {
        id: statusKey,
        bg: hexToRgba(baseColor, 0.15),
        text: isDark ? lightenColor(baseColor, 20) : darkenColor(baseColor, 20),
        border: hexToRgba(baseColor, 0.4),
        glow: hexToRgba(baseColor, 0.3),
        icon: isDark ? '#FFFFFF' : darkenColor(baseColor, 30),
        raw: baseColor,
      };
    });

    return result;
  }, []);

  // ============================================
  // Generate Urgency Theme
  // ============================================
  const urgency = React.useMemo<UrgencyTheme>(() => ({
    expired: {
      bg: 'color-mix(in srgb, var(--quote-status-rejected, #EF4444) 15%, transparent)',
      text: 'var(--quote-urgency-expired-text, #DC2626)',
      border: 'color-mix(in srgb, var(--quote-status-rejected, #EF4444) 40%, transparent)',
    },
    critical: {
      bg: 'color-mix(in srgb, var(--quote-status-pending, #F59E0B) 15%, transparent)',
      text: 'var(--quote-urgency-critical-text, #D97706)',
      border: 'color-mix(in srgb, var(--quote-status-pending, #F59E0B) 40%, transparent)',
    },
    warning: {
      bg: 'color-mix(in srgb, var(--quote-urgency-warning, #EAB308) 15%, transparent)',
      text: 'var(--quote-urgency-warning-text, #CA8A04)',
      border: 'color-mix(in srgb, var(--quote-urgency-warning, #EAB308) 40%, transparent)',
    },
    normal: {
      bg: hexToRgba(accentColor, 0.15),
      text: accentColor,
      border: hexToRgba(accentColor, 0.4),
    },
  }), [accentColor]);

  // ============================================
  // Generate Drop Zone Theme
  // ============================================
  const dropZone = React.useMemo(() => ({
    borderColor: hexToRgba(primaryColor, 0.5),
    shadow: `0 0 0 3px ${hexToRgba(primaryColor, 0.15)}, 0 0 30px ${hexToRgba(primaryColor, 0.2)}`,
    bgTint: hexToRgba(primaryColor, 0.05),
  }), [primaryColor]);

  // ============================================
  // Generate Column Theme
  // ============================================
  const column = React.useMemo(() => ({
    bgLight: 'linear-gradient(180deg, rgba(255,255,255,0.7) 0%, rgba(248,250,252,0.5) 100%)',
    bgDark: 'linear-gradient(180deg, rgba(15, 23, 42, 0.5) 0%, rgba(15, 23, 42, 0.3) 100%)',
    borderLight: 'rgba(0, 0, 0, 0.04)',
    borderDark: 'rgba(255, 255, 255, 0.05)',
  }), []);

  // ============================================
  // Generate Action Button Themes
  // Using CSS variables with fallbacks for dynamic theming
  // ============================================
  const actions = React.useMemo(() => ({
    send: {
      bg: 'color-mix(in srgb, var(--action-send, #3B82F6) 10%, transparent)',
      bgHover: 'color-mix(in srgb, var(--action-send, #3B82F6) 15%, transparent)',
      text: 'var(--action-send, #3B82F6)',
      border: 'color-mix(in srgb, var(--action-send, #3B82F6) 25%, transparent)',
    },
    accept: {
      bg: 'color-mix(in srgb, var(--action-accept, #10B981) 10%, transparent)',
      bgHover: 'color-mix(in srgb, var(--action-accept, #10B981) 15%, transparent)',
      text: 'var(--action-accept, #10B981)',
      border: 'color-mix(in srgb, var(--action-accept, #10B981) 25%, transparent)',
    },
    reject: {
      bg: 'color-mix(in srgb, var(--action-reject, #EF4444) 10%, transparent)',
      bgHover: 'color-mix(in srgb, var(--action-reject, #EF4444) 15%, transparent)',
      text: 'var(--action-reject, #EF4444)',
      border: 'color-mix(in srgb, var(--action-reject, #EF4444) 25%, transparent)',
    },
    duplicate: {
      bg: 'color-mix(in srgb, var(--action-duplicate, #8B5CF6) 10%, transparent)',
      bgHover: 'color-mix(in srgb, var(--action-duplicate, #8B5CF6) 15%, transparent)',
      text: 'var(--action-duplicate, #8B5CF6)',
      border: 'color-mix(in srgb, var(--action-duplicate, #8B5CF6) 25%, transparent)',
    },
    primary: {
      bg: hexToRgba(primaryColor, 0.1),
      bgHover: hexToRgba(primaryColor, 0.15),
      text: primaryColor,
      border: hexToRgba(primaryColor, 0.25),
    },
    // Quick contact actions (homologated with Opportunities)
    whatsapp: {
      bg: 'color-mix(in srgb, var(--action-whatsapp, #25D366) 10%, transparent)',
      bgHover: 'color-mix(in srgb, var(--action-whatsapp, #25D366) 15%, transparent)',
      text: 'var(--action-whatsapp, #25D366)',
      border: 'color-mix(in srgb, var(--action-whatsapp, #25D366) 25%, transparent)',
    },
    call: {
      bg: hexToRgba(primaryColor, 0.1),
      bgHover: hexToRgba(primaryColor, 0.15),
      text: primaryColor,
      border: hexToRgba(primaryColor, 0.25),
    },
    email: {
      bg: 'color-mix(in srgb, var(--action-email, #3B82F6) 10%, transparent)',
      bgHover: 'color-mix(in srgb, var(--action-email, #3B82F6) 15%, transparent)',
      text: 'var(--action-email, #3B82F6)',
      border: 'color-mix(in srgb, var(--action-email, #3B82F6) 25%, transparent)',
    },
  }), [primaryColor]);

  // ============================================
  // Utility Functions
  // ============================================

  const getStatusColors = React.useCallback(
    (statusKey: QuoteStatus): StatusColorConfig => {
      return status[statusKey];
    },
    [status]
  );

  const getStatusBadgeStyle = React.useCallback(
    (statusKey: QuoteStatus): React.CSSProperties => {
      const colors = status[statusKey];
      return {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      };
    },
    [status]
  );

  const getUrgencyLevel = React.useCallback(
    (expiryDate?: string): 'expired' | 'critical' | 'warning' | 'normal' => {
      if (!expiryDate) return 'normal';

      const now = new Date();
      const expiry = new Date(expiryDate);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays < 0) return 'expired';
      if (diffDays <= 3) return 'critical';
      if (diffDays <= 7) return 'warning';
      return 'normal';
    },
    []
  );

  const getUrgencyStyle = React.useCallback(
    (expiryDate?: string): React.CSSProperties => {
      const level = getUrgencyLevel(expiryDate);
      const colors = urgency[level];
      return {
        backgroundColor: colors.bg,
        borderColor: colors.border,
        color: colors.text,
      };
    },
    [getUrgencyLevel, urgency]
  );

  const getValueCardStyle = React.useCallback(
    (statusKey: QuoteStatus, isExpired?: boolean): React.CSSProperties => {
      if (isExpired) {
        // Expired quotes use muted gray gradient
        return {
          background: 'linear-gradient(to bottom right, #6B7280, #4B5563, #374151)',
          boxShadow: '0 10px 25px -5px rgba(107, 114, 128, 0.25), 0 8px 10px -6px rgba(107, 114, 128, 0.15)',
        };
      }
      if (statusKey === 'accepted') {
        return {
          background: valueCard.gradientAccepted,
          boxShadow: valueCard.shadowAccepted,
        };
      }
      if (statusKey === 'rejected') {
        return {
          background: valueCard.gradientRejected,
          boxShadow: valueCard.shadowRejected,
        };
      }
      // Default: use tenant primary color
      return {
        background: valueCard.gradient,
        boxShadow: valueCard.shadow,
      };
    },
    [valueCard]
  );

  const getTimelineDotColor = React.useCallback(
    (statusKey: QuoteStatus): string => {
      return timeline.dot[statusKey] || timeline.dotDefault;
    },
    [timeline]
  );

  // ============================================
  // Apply CSS Variables on Mount/Update
  // ============================================
  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const root = document.documentElement;

    // Quote-specific CSS variables
    root.style.setProperty('--quote-primary', primaryColor);
    root.style.setProperty('--quote-primary-rgb', `${primaryRgb.r}, ${primaryRgb.g}, ${primaryRgb.b}`);
    root.style.setProperty('--quote-primary-hover', primaryHover);
    root.style.setProperty('--quote-accent', accentColor);

    // Status colors
    (Object.keys(STATUS_COLORS) as QuoteStatus[]).forEach((statusKey) => {
      const colors = status[statusKey];
      root.style.setProperty(`--quote-status-${statusKey}-bg`, colors.bg);
      root.style.setProperty(`--quote-status-${statusKey}-text`, colors.text);
      root.style.setProperty(`--quote-status-${statusKey}-border`, colors.border);
      root.style.setProperty(`--quote-status-${statusKey}-raw`, colors.raw);
    });

    // Urgency colors
    root.style.setProperty('--quote-urgency-expired-bg', urgency.expired.bg);
    root.style.setProperty('--quote-urgency-expired-text', urgency.expired.text);
    root.style.setProperty('--quote-urgency-critical-bg', urgency.critical.bg);
    root.style.setProperty('--quote-urgency-critical-text', urgency.critical.text);
    root.style.setProperty('--quote-urgency-warning-bg', urgency.warning.bg);
    root.style.setProperty('--quote-urgency-warning-text', urgency.warning.text);

    // Card styling
    root.style.setProperty('--quote-card-border-hover', card.borderHover);
    root.style.setProperty('--quote-card-shadow-hover', card.shadowHover);
    root.style.setProperty('--quote-card-shadow-dragging', card.shadowDragging);

    // Drop zone
    root.style.setProperty('--quote-drop-border', dropZone.borderColor);
    root.style.setProperty('--quote-drop-shadow', dropZone.shadow);
    root.style.setProperty('--quote-drop-bg', dropZone.bgTint);

    // Quick action buttons (homologated with Opportunities)
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

  }, [primaryColor, primaryRgb, primaryHover, accentColor, status, urgency, card, dropZone, actions]);

  return {
    card,
    valueCard,
    timeline,
    status,
    urgency,
    dropZone,
    column,
    actions,
    getStatusColors,
    getStatusBadgeStyle,
    getUrgencyLevel,
    getUrgencyStyle,
    getValueCardStyle,
    getTimelineDotColor,
    isCustomTheme,
    primaryColor,
    accentColor,
  };
}

// ============================================
// Context for Deep Component Access
// ============================================

const QuoteThemeContext = React.createContext<QuoteTheme | null>(null);

export function QuoteThemeProvider({ children }: { children: React.ReactNode }) {
  const theme = useQuoteTheme();

  return (
    <QuoteThemeContext.Provider value={theme}>
      {children}
    </QuoteThemeContext.Provider>
  );
}

export function useQuoteThemeContext(): QuoteTheme {
  const context = React.useContext(QuoteThemeContext);
  if (!context) {
    throw new Error('useQuoteThemeContext must be used within QuoteThemeProvider');
  }
  return context;
}

export function useQuoteThemeOptional(): QuoteTheme | null {
  return React.useContext(QuoteThemeContext);
}

export default useQuoteTheme;

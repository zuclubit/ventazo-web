/**
 * Tenant Store
 *
 * Enterprise-grade Zustand store for multi-tenant state management.
 *
 * Architecture:
 * - Immutable state updates via Immer
 * - Persisted settings with selective hydration
 * - Plan-based feature gating
 * - Security-validated branding extraction
 * - Type-safe selectors
 *
 * @module store/tenant
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { Tenant, PlanTier } from '@/lib/auth';
import { isValidHexColor, isValidAssetUrl, sanitizeHexColor, sanitizeAssetUrl } from '@/lib/auth';

// ============================================
// Constants
// ============================================

/** Storage key for persisted state */
const STORAGE_KEY = 'zuclubit-tenant-storage';

/** Default locale settings */
const DEFAULT_LOCALE = {
  CURRENCY: 'MXN',
  LOCALE: 'es-MX',
  TIMEZONE: 'America/Mexico_City',
  DATE_FORMAT: 'DD/MM/YYYY',
} as const;

// ============================================
// Types
// ============================================

/**
 * Feature flags for plan-based gating
 */
export interface TenantFeatures {
  whatsapp: boolean;
  cfdi: boolean;
  analytics: boolean;
  workflows: boolean;
  customFields: boolean;
  emailSync: boolean;
  calendar: boolean;
  documents: boolean;
  aiInsights: boolean;
  advancedReports: boolean;
}

/**
 * Tenant settings (locale, branding, features)
 */
export interface TenantSettings {
  currency: string;
  locale: string;
  timezone: string;
  dateFormat: string;
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
  features: TenantFeatures;
}

/**
 * Partial settings for updates
 */
export type TenantSettingsUpdate = Partial<Omit<TenantSettings, 'features'>> & {
  features?: Partial<TenantFeatures>;
};

/**
 * Store state interface
 */
interface TenantState {
  // State
  currentTenant: Tenant | null;
  settings: TenantSettings;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTenant: (tenant: Tenant | null) => void;
  updateSettings: (settings: TenantSettingsUpdate) => void;
  clearTenant: () => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;

  // Selectors (computed)
  hasFeature: (feature: keyof TenantFeatures) => boolean;
  isPlanAtLeast: (plan: PlanTier) => boolean;
}

// ============================================
// Default Values (Immutable)
// ============================================

/**
 * Default feature flags (free tier)
 */
const DEFAULT_FEATURES: TenantFeatures = Object.freeze({
  whatsapp: false,
  cfdi: false,
  analytics: true, // Basic analytics for all
  workflows: false,
  customFields: false,
  emailSync: false,
  calendar: false,
  documents: false,
  aiInsights: false,
  advancedReports: false,
});

/**
 * Default settings
 */
const DEFAULT_SETTINGS: TenantSettings = Object.freeze({
  currency: DEFAULT_LOCALE.CURRENCY,
  locale: DEFAULT_LOCALE.LOCALE,
  timezone: DEFAULT_LOCALE.TIMEZONE,
  dateFormat: DEFAULT_LOCALE.DATE_FORMAT,
  features: DEFAULT_FEATURES,
});

/**
 * Plan-based feature configuration
 * Each plan inherits from previous + adds features
 */
const PLAN_FEATURES: Readonly<Record<PlanTier, TenantFeatures>> = Object.freeze({
  free: {
    ...DEFAULT_FEATURES,
  },
  starter: {
    ...DEFAULT_FEATURES,
    analytics: true,
    calendar: true,
    documents: true,
  },
  pro: {
    ...DEFAULT_FEATURES,
    whatsapp: true,
    cfdi: true,
    analytics: true,
    workflows: true,
    customFields: true,
    emailSync: true,
    calendar: true,
    documents: true,
    aiInsights: true,
  },
  enterprise: {
    whatsapp: true,
    cfdi: true,
    analytics: true,
    workflows: true,
    customFields: true,
    emailSync: true,
    calendar: true,
    documents: true,
    aiInsights: true,
    advancedReports: true,
  },
});

/**
 * Plan hierarchy for comparison
 */
const PLAN_ORDER: Readonly<Record<PlanTier, number>> = Object.freeze({
  free: 0,
  starter: 1,
  pro: 2,
  enterprise: 3,
});

// ============================================
// Helper Functions
// ============================================

/**
 * Extract and validate branding from tenant metadata
 * Security: Validates all color and URL inputs
 */
function extractBrandingFromTenant(tenant: Tenant): {
  primaryColor?: string;
  secondaryColor?: string;
  logo?: string;
} {
  const result: {
    primaryColor?: string;
    secondaryColor?: string;
    logo?: string;
  } = {};

  // Priority 1: metadata.branding (where onboarding stores data)
  const metadataBranding = tenant.metadata?.branding;
  if (metadataBranding) {
    if (isValidHexColor(metadataBranding.primaryColor)) {
      result.primaryColor = sanitizeHexColor(metadataBranding.primaryColor, '');
    }
    if (isValidHexColor(metadataBranding.secondaryColor)) {
      result.secondaryColor = sanitizeHexColor(metadataBranding.secondaryColor, '');
    }
    const logoValue = metadataBranding.logo || metadataBranding.logoUrl;
    if (isValidAssetUrl(logoValue)) {
      result.logo = sanitizeAssetUrl(logoValue, '');
    }
  }

  // Priority 2: legacy settings (backward compatibility)
  if (tenant.settings && Object.keys(result).length === 0) {
    const settings = tenant.settings;
    if (isValidHexColor(settings['primaryColor'])) {
      result.primaryColor = sanitizeHexColor(settings['primaryColor'], '');
    }
    if (isValidHexColor(settings['secondaryColor'])) {
      result.secondaryColor = sanitizeHexColor(settings['secondaryColor'], '');
    }
    const logoValue = settings['logo'] || settings['logoUrl'];
    if (isValidAssetUrl(logoValue)) {
      result.logo = sanitizeAssetUrl(logoValue, '');
    }
  }

  return result;
}

/**
 * Extract locale settings from tenant
 */
function extractLocaleFromTenant(tenant: Tenant): Partial<TenantSettings> {
  const result: Partial<TenantSettings> = {};
  const settings = tenant.settings;

  if (!settings) return result;

  if (typeof settings['currency'] === 'string' && settings['currency']) {
    result.currency = settings['currency'];
  }
  if (typeof settings['locale'] === 'string' && settings['locale']) {
    result.locale = settings['locale'];
  }
  if (typeof settings['timezone'] === 'string' && settings['timezone']) {
    result.timezone = settings['timezone'];
  }
  if (typeof settings['dateFormat'] === 'string' && settings['dateFormat']) {
    result.dateFormat = settings['dateFormat'];
  }

  return result;
}

// ============================================
// Store
// ============================================

export const useTenantStore = create<TenantState>()(
  persist(
    immer((set, get) => ({
      // ============================================
      // Initial State
      // ============================================
      currentTenant: null,
      settings: { ...DEFAULT_SETTINGS },
      isLoading: false,
      error: null,

      // ============================================
      // Actions
      // ============================================

      /**
       * Set current tenant and apply settings
       * Extracts branding, locale, and features from tenant data
       */
      setTenant: (tenant) => {
        set((state) => {
          state.currentTenant = tenant;
          state.error = null;

          if (tenant) {
            // Apply plan-based features
            const planFeatures = PLAN_FEATURES[tenant.plan] ?? PLAN_FEATURES.free;
            state.settings.features = { ...planFeatures };

            // Apply locale settings
            const localeSettings = extractLocaleFromTenant(tenant);
            if (localeSettings.currency) state.settings.currency = localeSettings.currency;
            if (localeSettings.locale) state.settings.locale = localeSettings.locale;
            if (localeSettings.timezone) state.settings.timezone = localeSettings.timezone;
            if (localeSettings.dateFormat) state.settings.dateFormat = localeSettings.dateFormat;

            // Apply branding (security validated)
            const branding = extractBrandingFromTenant(tenant);
            if (branding.primaryColor) state.settings.primaryColor = branding.primaryColor;
            if (branding.secondaryColor) state.settings.secondaryColor = branding.secondaryColor;
            if (branding.logo) state.settings.logo = branding.logo;
          } else {
            // Reset to defaults when clearing tenant
            state.settings = { ...DEFAULT_SETTINGS };
          }
        });
      },

      /**
       * Update settings partially
       */
      updateSettings: (newSettings) => {
        set((state) => {
          // Validate colors before applying
          if (newSettings.primaryColor !== undefined) {
            state.settings.primaryColor = isValidHexColor(newSettings.primaryColor)
              ? sanitizeHexColor(newSettings.primaryColor, state.settings.primaryColor ?? '')
              : state.settings.primaryColor;
          }
          if (newSettings.secondaryColor !== undefined) {
            state.settings.secondaryColor = isValidHexColor(newSettings.secondaryColor)
              ? sanitizeHexColor(newSettings.secondaryColor, state.settings.secondaryColor ?? '')
              : state.settings.secondaryColor;
          }
          if (newSettings.logo !== undefined) {
            state.settings.logo = isValidAssetUrl(newSettings.logo)
              ? sanitizeAssetUrl(newSettings.logo, state.settings.logo ?? '')
              : state.settings.logo;
          }

          // Apply other settings
          if (newSettings.currency) state.settings.currency = newSettings.currency;
          if (newSettings.locale) state.settings.locale = newSettings.locale;
          if (newSettings.timezone) state.settings.timezone = newSettings.timezone;
          if (newSettings.dateFormat) state.settings.dateFormat = newSettings.dateFormat;

          // Merge features
          if (newSettings.features) {
            state.settings.features = {
              ...state.settings.features,
              ...newSettings.features,
            };
          }
        });
      },

      /**
       * Clear tenant and reset to defaults
       */
      clearTenant: () => {
        set((state) => {
          state.currentTenant = null;
          state.settings = { ...DEFAULT_SETTINGS };
          state.error = null;
        });
      },

      /**
       * Set loading state
       */
      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      /**
       * Set error state
       */
      setError: (error) => {
        set((state) => {
          state.error = error;
          state.isLoading = false;
        });
      },

      // ============================================
      // Computed Selectors
      // ============================================

      /**
       * Check if a feature is enabled for current plan
       */
      hasFeature: (feature) => {
        const { settings } = get();
        return settings.features[feature] ?? false;
      },

      /**
       * Check if current plan is at least the specified tier
       */
      isPlanAtLeast: (plan) => {
        const { currentTenant } = get();
        if (!currentTenant) return false;

        const currentOrder = PLAN_ORDER[currentTenant.plan] ?? 0;
        const requiredOrder = PLAN_ORDER[plan] ?? 0;

        return currentOrder >= requiredOrder;
      },
    })),
    {
      name: STORAGE_KEY,
      storage: createJSONStorage(() => localStorage),
      // Only persist non-sensitive locale preferences
      partialize: (state) => ({
        settings: {
          currency: state.settings.currency,
          locale: state.settings.locale,
          timezone: state.settings.timezone,
          dateFormat: state.settings.dateFormat,
        },
      }),
      // Merge persisted state with defaults
      merge: (persisted, current) => {
        const persistedState = persisted as Partial<TenantState> | undefined;
        return {
          ...current,
          settings: {
            ...current.settings,
            ...(persistedState?.settings ?? {}),
          },
        };
      },
    }
  )
);

// ============================================
// Selectors (Optimized for React)
// ============================================

/** Get current tenant */
export const useCurrentTenant = () =>
  useTenantStore((state) => state.currentTenant);

/** Get all settings */
export const useTenantSettings = () =>
  useTenantStore((state) => state.settings);

/** Get feature flags */
export const useTenantFeatures = () =>
  useTenantStore((state) => state.settings.features);

/** Check if feature is enabled */
export const useHasFeature = (feature: keyof TenantFeatures) =>
  useTenantStore((state) => state.settings.features[feature] ?? false);

/** Get currency */
export const useCurrency = () =>
  useTenantStore((state) => state.settings.currency);

/** Get locale */
export const useLocale = () =>
  useTenantStore((state) => state.settings.locale);

/** Get timezone */
export const useTimezone = () =>
  useTenantStore((state) => state.settings.timezone);

/** Get loading state */
export const useTenantLoading = () =>
  useTenantStore((state) => state.isLoading);

/** Get error state */
export const useTenantError = () =>
  useTenantStore((state) => state.error);

/** Check if plan is at least specified tier */
export const useIsPlanAtLeast = (plan: PlanTier) =>
  useTenantStore((state) => {
    const currentTenant = state.currentTenant;
    if (!currentTenant) return false;
    return (PLAN_ORDER[currentTenant.plan] ?? 0) >= (PLAN_ORDER[plan] ?? 0);
  });

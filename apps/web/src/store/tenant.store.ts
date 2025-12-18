// ============================================
// Tenant Store - FASE 2
// Zustand store for tenant state
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type { Tenant } from '@/lib/auth';

// ============================================
// Types
// ============================================

export interface TenantSettings {
  currency: string;
  locale: string;
  timezone: string;
  dateFormat: string;
  primaryColor?: string;
  logo?: string;
  features: TenantFeatures;
}

export interface TenantFeatures {
  whatsapp: boolean;
  cfdi: boolean;
  analytics: boolean;
  workflows: boolean;
  customFields: boolean;
  emailSync: boolean;
  calendar: boolean;
  documents: boolean;
}

interface TenantState {
  // State
  currentTenant: Tenant | null;
  settings: TenantSettings;
  isLoading: boolean;
  error: string | null;

  // Actions
  setTenant: (tenant: Tenant | null) => void;
  updateSettings: (settings: Partial<TenantSettings>) => void;
  clearTenant: () => void;

  // Feature flags
  hasFeature: (feature: keyof TenantFeatures) => boolean;
}

// Default settings
const DEFAULT_SETTINGS: TenantSettings = {
  currency: 'MXN',
  locale: 'es-MX',
  timezone: 'America/Mexico_City',
  dateFormat: 'DD/MM/YYYY',
  features: {
    whatsapp: false,
    cfdi: false,
    analytics: true,
    workflows: false,
    customFields: false,
    emailSync: false,
    calendar: false,
    documents: false,
  },
};

// Plan-based features
const PLAN_FEATURES: Record<string, Partial<TenantFeatures>> = {
  free: {
    whatsapp: false,
    cfdi: false,
    analytics: false,
    workflows: false,
    customFields: false,
    emailSync: false,
    calendar: false,
    documents: false,
  },
  pro: {
    whatsapp: true,
    cfdi: true,
    analytics: true,
    workflows: true,
    customFields: true,
    emailSync: true,
    calendar: true,
    documents: true,
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
  },
};

// ============================================
// Store
// ============================================

export const useTenantStore = create<TenantState>()(
  persist(
    immer((set, get) => ({
      // Initial state
      currentTenant: null,
      settings: DEFAULT_SETTINGS,
      isLoading: false,
      error: null,

      // ============================================
      // Actions
      // ============================================

      /**
       * Set current tenant
       */
      setTenant: (tenant) => {
        set((state) => {
          state.currentTenant = tenant;

          if (tenant) {
            // Apply plan-based features
            const planFeatures = PLAN_FEATURES[tenant.plan] || PLAN_FEATURES['free'];
            state.settings.features = {
              ...DEFAULT_SETTINGS.features,
              ...planFeatures,
            };

            // Apply tenant-specific settings if available
            if (tenant.settings) {
              const tenantSettings = tenant.settings as Partial<TenantSettings>;
              if (tenantSettings.currency)
                state.settings.currency = tenantSettings.currency;
              if (tenantSettings.locale)
                state.settings.locale = tenantSettings.locale;
              if (tenantSettings.timezone)
                state.settings.timezone = tenantSettings.timezone;
              if (tenantSettings.dateFormat)
                state.settings.dateFormat = tenantSettings.dateFormat;
              if (tenantSettings.primaryColor)
                state.settings.primaryColor = tenantSettings.primaryColor;
              if (tenantSettings.logo) state.settings.logo = tenantSettings.logo;
            }
          }
        });
      },

      /**
       * Update settings
       */
      updateSettings: (newSettings) => {
        set((state) => {
          state.settings = {
            ...state.settings,
            ...newSettings,
            features: {
              ...state.settings.features,
              ...(newSettings.features || {}),
            },
          };
        });
      },

      /**
       * Clear tenant
       */
      clearTenant: () => {
        set((state) => {
          state.currentTenant = null;
          state.settings = DEFAULT_SETTINGS;
        });
      },

      /**
       * Check if feature is enabled
       */
      hasFeature: (feature) => {
        const { settings } = get();
        return settings.features[feature] ?? false;
      },
    })),
    {
      name: 'zuclubit-tenant-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist non-sensitive data
        settings: {
          currency: state.settings.currency,
          locale: state.settings.locale,
          timezone: state.settings.timezone,
          dateFormat: state.settings.dateFormat,
        },
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================

export const useCurrentTenant = () =>
  useTenantStore((state) => state.currentTenant);
export const useTenantSettings = () =>
  useTenantStore((state) => state.settings);
export const useTenantFeatures = () =>
  useTenantStore((state) => state.settings.features);
export const useHasFeature = (feature: keyof TenantFeatures) =>
  useTenantStore((state) => state.hasFeature(feature));
export const useCurrency = () =>
  useTenantStore((state) => state.settings.currency);
export const useLocale = () => useTenantStore((state) => state.settings.locale);
export const useTimezone = () =>
  useTenantStore((state) => state.settings.timezone);

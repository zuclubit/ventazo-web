// ============================================
// Onboarding Store - FASE 3
// Zustand store for onboarding wizard state
// ============================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

import type {
  OnboardingStep,
  CRMModules,
  BusinessHours,
} from '@/lib/onboarding/types';
import {
  ONBOARDING_STEPS,
  DEFAULT_MODULES_BY_TYPE,
} from '@/lib/onboarding/types';

// ============================================
// Types
// ============================================

interface OnboardingData {
  // User info
  userId?: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  emailVerified?: boolean; // P0.1: OTP inline verification status

  // Business info
  tenantId?: string;
  businessName?: string;
  businessType?: string;
  businessSize?: string;
  phone?: string;
  country?: string;
  city?: string;
  timezone?: string;

  // Branding - 4-color semantic palette
  logoUrl?: string;
  /** Sidebar/navigation background color */
  sidebarColor?: string;
  /** Main brand color for buttons, CTAs */
  primaryColor?: string;
  /** Accent color for highlights, links */
  accentColor?: string;
  /** Surface color for cards, dropdowns */
  surfaceColor?: string;
  /** @deprecated Use sidebarColor instead */
  secondaryColor?: string;
  companyName?: string;

  // Modules
  modules?: CRMModules;

  // Business hours
  businessHours?: BusinessHours;

  // Invitations
  invitations?: Array<{ email: string; role: string }>;
}

interface OnboardingState {
  // State
  currentStep: OnboardingStep;
  completedSteps: OnboardingStep[];
  data: OnboardingData;
  isLoading: boolean;
  error: string | null;

  // Actions
  setStep: (step: OnboardingStep) => void;
  nextStep: () => void;
  prevStep: () => void;
  completeStep: (step: OnboardingStep) => void;
  updateData: (data: Partial<OnboardingData>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  reset: () => void;

  // Computed
  getProgress: () => number;
  canProceed: () => boolean;
  isStepCompleted: (step: OnboardingStep) => boolean;
}

// Default business hours
const DEFAULT_BUSINESS_HOURS: BusinessHours = {
  monday: { open: '09:00', close: '18:00', enabled: true },
  tuesday: { open: '09:00', close: '18:00', enabled: true },
  wednesday: { open: '09:00', close: '18:00', enabled: true },
  thursday: { open: '09:00', close: '18:00', enabled: true },
  friday: { open: '09:00', close: '18:00', enabled: true },
  saturday: { open: '09:00', close: '14:00', enabled: false },
  sunday: { open: '00:00', close: '00:00', enabled: false },
};

// Default modules
const DEFAULT_MODULES: CRMModules = {
  leads: true,
  customers: true,
  opportunities: false,
  tasks: true,
  calendar: false,
  invoicing: false,
  products: false,
  teams: false,
  pipelines: false,
  marketing: false,
  whatsapp: false,
  reports: false,
};

// ============================================
// Ventazo Brand Colors (Default) - 4-Color Semantic Palette
// ============================================
// Sidebar: Dark teal #003C3B - Navigation background
// Primary: Teal #0EB58C - Buttons, CTAs, active states
// Accent: Light teal #5EEAD4 - Highlights, links, hover
// Surface: Darker teal #052828 - Cards, dropdowns, modals

const VENTAZO_DEFAULT_SIDEBAR = '#003C3B';
const VENTAZO_DEFAULT_PRIMARY = '#0EB58C';
const VENTAZO_DEFAULT_ACCENT = '#5EEAD4';
const VENTAZO_DEFAULT_SURFACE = '#052828';

// Initial state
const initialState = {
  currentStep: 'signup' as OnboardingStep,
  completedSteps: [] as OnboardingStep[],
  data: {
    sidebarColor: VENTAZO_DEFAULT_SIDEBAR,
    primaryColor: VENTAZO_DEFAULT_PRIMARY,
    accentColor: VENTAZO_DEFAULT_ACCENT,
    surfaceColor: VENTAZO_DEFAULT_SURFACE,
    // Keep secondaryColor for backward compatibility
    secondaryColor: VENTAZO_DEFAULT_SIDEBAR,
    timezone: 'America/Mexico_City',
    country: 'México',
    modules: DEFAULT_MODULES,
    businessHours: DEFAULT_BUSINESS_HOURS,
  } as OnboardingData,
  isLoading: false,
  error: null,
};

// ============================================
// Store
// ============================================

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    immer((set, get) => ({
      ...initialState,

      // ============================================
      // Actions
      // ============================================

      setStep: (step) => {
        set((state) => {
          state.currentStep = step;
        });
      },

      nextStep: () => {
        const { currentStep } = get();
        const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);

        if (currentIndex < ONBOARDING_STEPS.length - 1) {
          const nextStepValue = ONBOARDING_STEPS[currentIndex + 1];
          if (nextStepValue) {
            set((state) => {
              state.currentStep = nextStepValue;
              if (!state.completedSteps.includes(currentStep)) {
                state.completedSteps.push(currentStep);
              }
            });
          }
        }
      },

      prevStep: () => {
        const { currentStep } = get();
        const currentIndex = ONBOARDING_STEPS.indexOf(currentStep);

        if (currentIndex > 0) {
          const prevStepValue = ONBOARDING_STEPS[currentIndex - 1];
          if (prevStepValue) {
            set((state) => {
              state.currentStep = prevStepValue;
            });
          }
        }
      },

      completeStep: (step) => {
        set((state) => {
          if (!state.completedSteps.includes(step)) {
            state.completedSteps.push(step);
          }
        });
      },

      updateData: (newData) => {
        set((state) => {
          state.data = { ...state.data, ...newData };

          // Auto-update modules when business type changes
          if (newData.businessType && DEFAULT_MODULES_BY_TYPE[newData.businessType as keyof typeof DEFAULT_MODULES_BY_TYPE]) {
            state.data.modules = {
              ...DEFAULT_MODULES,
              ...DEFAULT_MODULES_BY_TYPE[newData.businessType as keyof typeof DEFAULT_MODULES_BY_TYPE],
            };
          }
        });
      },

      setLoading: (loading) => {
        set((state) => {
          state.isLoading = loading;
        });
      },

      setError: (error) => {
        set((state) => {
          state.error = error;
        });
      },

      reset: () => {
        set(initialState);
      },

      // ============================================
      // Computed
      // ============================================

      getProgress: () => {
        const { completedSteps } = get();
        // Only count visible steps (exclude 'signup' and 'complete')
        // This matches the stepper's calculateProgress function
        const VISIBLE_STEPS: OnboardingStep[] = [
          'create-business',
          'branding',
          'modules',
          'business-hours',
          'invite-team',
        ];
        const visibleCompleted = completedSteps.filter((step) =>
          VISIBLE_STEPS.includes(step)
        );
        return Math.round((visibleCompleted.length / VISIBLE_STEPS.length) * 100);
      },

      canProceed: () => {
        const { currentStep, data } = get();

        switch (currentStep) {
          case 'signup':
            return !!data.userId && !!data.email;
          case 'create-business':
            return !!data.tenantId && !!data.businessName;
          case 'branding':
            return !!data.primaryColor;
          case 'modules':
            return !!data.modules;
          case 'business-hours':
            return !!data.businessHours;
          case 'invite-team':
            return true; // Optional step
          case 'complete':
            return true;
          default:
            return false;
        }
      },

      isStepCompleted: (step) => {
        const { completedSteps } = get();
        return completedSteps.includes(step);
      },
    })),
    {
      name: 'zuclubit-onboarding-storage',
      storage: createJSONStorage(() => sessionStorage), // Use sessionStorage for temporary data
      partialize: (state) => ({
        currentStep: state.currentStep,
        completedSteps: state.completedSteps,
        data: state.data,
      }),
    }
  )
);

// ============================================
// Selectors
// ============================================

export const useOnboardingStep = () =>
  useOnboardingStore((state) => state.currentStep);
export const useOnboardingData = () =>
  useOnboardingStore((state) => state.data);
export const useOnboardingProgress = () =>
  useOnboardingStore((state) => state.getProgress());
export const useOnboardingLoading = () =>
  useOnboardingStore((state) => state.isLoading);
export const useOnboardingError = () =>
  useOnboardingStore((state) => state.error);

// ============================================
// Constants Exports
// ============================================

export {
  VENTAZO_DEFAULT_SIDEBAR,
  VENTAZO_DEFAULT_PRIMARY,
  VENTAZO_DEFAULT_ACCENT,
  VENTAZO_DEFAULT_SURFACE,
};

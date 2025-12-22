'use client';

// ============================================
// i18n Context and Provider
// ============================================

import * as React from 'react';

import {
  type Country,
  type LocaleCode,
  type PricingTier,
  type Translations,
  COUNTRIES,
  DEFAULT_COUNTRY,
  detectCountryFromLanguage,
  getCountryByCode,
  getPricingForCountry,
  getTranslations,
} from './index';

// ============================================
// Types
// ============================================

interface I18nContextValue {
  locale: LocaleCode;
  country: Country;
  translations: Translations;
  pricing: PricingTier;
  setCountry: (countryCode: string) => void;
  setLocale: (locale: LocaleCode) => void;
  t: Translations;
}

// ============================================
// Context
// ============================================

const I18nContext = React.createContext<I18nContextValue | null>(null);

// ============================================
// Storage Keys
// ============================================

const STORAGE_KEY_COUNTRY = 'zuclubit-country';
const STORAGE_KEY_LOCALE = 'zuclubit-locale';

// ============================================
// Provider
// ============================================

interface I18nProviderProps {
  children: React.ReactNode;
  initialCountry?: string;
  initialLocale?: LocaleCode;
}

export function I18nProvider({
  children,
  initialCountry,
  initialLocale,
}: I18nProviderProps) {
  const [countryCode, setCountryCode] = React.useState<string>(() => {
    // Try to get from props first
    if (initialCountry && COUNTRIES[initialCountry]) {
      return initialCountry;
    }

    // Server-side: use default
    if (typeof window === 'undefined') {
      return DEFAULT_COUNTRY;
    }

    // Client-side: try localStorage
    const stored = localStorage.getItem(STORAGE_KEY_COUNTRY);
    if (stored && COUNTRIES[stored]) {
      return stored;
    }

    // Auto-detect from browser
    return detectCountryFromLanguage();
  });

  const [locale, setLocaleState] = React.useState<LocaleCode>(() => {
    if (initialLocale) {
      return initialLocale;
    }

    if (typeof window === 'undefined') {
      return getCountryByCode(countryCode).locale;
    }

    const stored = localStorage.getItem(STORAGE_KEY_LOCALE) as LocaleCode | null;
    if (stored) {
      return stored;
    }

    return getCountryByCode(countryCode).locale;
  });

  // Derived state
  const country = React.useMemo(() => getCountryByCode(countryCode), [countryCode]);
  const translations = React.useMemo(() => getTranslations(locale), [locale]);
  const pricing = React.useMemo(() => getPricingForCountry(countryCode), [countryCode]);

  // Set country and update locale accordingly
  const setCountry = React.useCallback((newCountryCode: string) => {
    if (!COUNTRIES[newCountryCode]) return;

    setCountryCode(newCountryCode);
    const newCountry = getCountryByCode(newCountryCode);
    setLocaleState(newCountry.locale);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_COUNTRY, newCountryCode);
      localStorage.setItem(STORAGE_KEY_LOCALE, newCountry.locale);
    }
  }, []);

  // Set locale independently
  const setLocale = React.useCallback((newLocale: LocaleCode) => {
    setLocaleState(newLocale);

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_LOCALE, newLocale);
    }
  }, []);

  // Persist to localStorage on change
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_COUNTRY, countryCode);
      localStorage.setItem(STORAGE_KEY_LOCALE, locale);
    }
  }, [countryCode, locale]);

  const value = React.useMemo(
    () => ({
      locale,
      country,
      translations,
      pricing,
      setCountry,
      setLocale,
      t: translations,
    }),
    [locale, country, translations, pricing, setCountry, setLocale]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

// ============================================
// Hook
// ============================================

export function useI18n(): I18nContextValue {
  const context = React.useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  return context;
}

// ============================================
// Helper Hook for Translations
// ============================================

export function useTranslations(): Translations {
  const { translations } = useI18n();
  return translations;
}

// ============================================
// Helper Hook for Country
// ============================================

export function useCountry(): Country {
  const { country } = useI18n();
  return country;
}

// ============================================
// Helper Hook for Pricing
// ============================================

export function usePricing(): PricingTier {
  const { pricing } = useI18n();
  return pricing;
}

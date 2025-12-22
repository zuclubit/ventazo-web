// ============================================
// i18n Main Index
// ============================================

import type { LocaleCode, Translations } from './types';

import { esAR, esCL, esCO, esMX, esPE, enUS, ptBR } from './locales';

export * from './types';
export * from './countries';

// All translations mapped by locale
export const translations: Record<LocaleCode, Translations> = {
  'es-MX': esMX,
  'es-CO': esCO,
  'es-AR': esAR,
  'es-CL': esCL,
  'es-PE': esPE,
  'pt-BR': ptBR,
  'en-US': enUS,
};

// Get translations for a specific locale
export function getTranslations(locale: LocaleCode): Translations {
  return translations[locale] || translations['es-MX'];
}

// Default locale
export const DEFAULT_LOCALE: LocaleCode = 'es-MX';

// Supported locales
export const SUPPORTED_LOCALES: LocaleCode[] = [
  'es-MX',
  'es-CO',
  'es-AR',
  'es-CL',
  'es-PE',
  'pt-BR',
  'en-US',
];

// Locale display names
export const LOCALE_NAMES: Record<LocaleCode, string> = {
  'es-MX': 'Espanol (Mexico)',
  'es-CO': 'Espanol (Colombia)',
  'es-AR': 'Espanol (Argentina)',
  'es-CL': 'Espanol (Chile)',
  'es-PE': 'Espanol (Peru)',
  'pt-BR': 'Portugues (Brasil)',
  'en-US': 'English (US)',
};

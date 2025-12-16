// ============================================
// LATAM Countries Configuration
// ============================================

import type { Country, CurrencyCode, LocaleCode, PricingTier } from './types';

export const COUNTRIES: Record<string, Country> = {
  MX: {
    code: 'MX',
    name: 'Mexico',
    nameEn: 'Mexico',
    locale: 'es-MX',
    currency: 'MXN',
    currencySymbol: '$',
    currencyName: 'Peso Mexicano',
    flag: '🇲🇽',
    phoneCode: '+52',
    taxName: 'IVA',
    taxRate: 16,
    invoiceSystem: 'CFDI 4.0 (SAT)',
    timezone: 'America/Mexico_City',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {
      decimal: '.',
      thousands: ',',
    },
  },
  CO: {
    code: 'CO',
    name: 'Colombia',
    nameEn: 'Colombia',
    locale: 'es-CO',
    currency: 'COP',
    currencySymbol: '$',
    currencyName: 'Peso Colombiano',
    flag: '🇨🇴',
    phoneCode: '+57',
    taxName: 'IVA',
    taxRate: 19,
    invoiceSystem: 'Facturacion Electronica DIAN',
    timezone: 'America/Bogota',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
  },
  AR: {
    code: 'AR',
    name: 'Argentina',
    nameEn: 'Argentina',
    locale: 'es-AR',
    currency: 'ARS',
    currencySymbol: '$',
    currencyName: 'Peso Argentino',
    flag: '🇦🇷',
    phoneCode: '+54',
    taxName: 'IVA',
    taxRate: 21,
    invoiceSystem: 'Factura Electronica AFIP',
    timezone: 'America/Argentina/Buenos_Aires',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
  },
  CL: {
    code: 'CL',
    name: 'Chile',
    nameEn: 'Chile',
    locale: 'es-CL',
    currency: 'CLP',
    currencySymbol: '$',
    currencyName: 'Peso Chileno',
    flag: '🇨🇱',
    phoneCode: '+56',
    taxName: 'IVA',
    taxRate: 19,
    invoiceSystem: 'Factura Electronica SII',
    timezone: 'America/Santiago',
    dateFormat: 'dd-MM-yyyy',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
  },
  PE: {
    code: 'PE',
    name: 'Peru',
    nameEn: 'Peru',
    locale: 'es-PE',
    currency: 'PEN',
    currencySymbol: 'S/',
    currencyName: 'Sol Peruano',
    flag: '🇵🇪',
    phoneCode: '+51',
    taxName: 'IGV',
    taxRate: 18,
    invoiceSystem: 'Factura Electronica SUNAT',
    timezone: 'America/Lima',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {
      decimal: '.',
      thousands: ',',
    },
  },
  BR: {
    code: 'BR',
    name: 'Brasil',
    nameEn: 'Brazil',
    locale: 'pt-BR',
    currency: 'BRL',
    currencySymbol: 'R$',
    currencyName: 'Real Brasileiro',
    flag: '🇧🇷',
    phoneCode: '+55',
    taxName: 'ICMS',
    taxRate: 18,
    invoiceSystem: 'NF-e (Nota Fiscal Eletronica)',
    timezone: 'America/Sao_Paulo',
    dateFormat: 'dd/MM/yyyy',
    numberFormat: {
      decimal: ',',
      thousands: '.',
    },
  },
  US: {
    code: 'US',
    name: 'Estados Unidos',
    nameEn: 'United States',
    locale: 'en-US',
    currency: 'USD',
    currencySymbol: '$',
    currencyName: 'US Dollar',
    flag: '🇺🇸',
    phoneCode: '+1',
    taxName: 'Sales Tax',
    taxRate: 0,
    invoiceSystem: 'Standard Invoice',
    timezone: 'America/New_York',
    dateFormat: 'MM/dd/yyyy',
    numberFormat: {
      decimal: '.',
      thousands: ',',
    },
  },
};

// USD base prices
const BASE_PRICES = {
  starter: 0,
  professional: 29,
};

// Exchange rates (approximate - should be fetched from API in production)
const EXCHANGE_RATES: Record<CurrencyCode, number> = {
  USD: 1,
  MXN: 17.5,
  COP: 4000,
  ARS: 900,
  CLP: 900,
  PEN: 3.8,
  BRL: 5,
};

export function formatCurrency(
  amount: number,
  currency: CurrencyCode,
  locale: LocaleCode
): string {
  const country = Object.values(COUNTRIES).find((c) => c.currency === currency);

  try {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: currency === 'CLP' || currency === 'COP' ? 0 : 2,
      maximumFractionDigits: currency === 'CLP' || currency === 'COP' ? 0 : 2,
    }).format(amount);
  } catch {
    // Fallback formatting
    const symbol = country?.currencySymbol || '$';
    return `${symbol}${amount.toLocaleString()}`;
  }
}

export function convertPrice(usdPrice: number, targetCurrency: CurrencyCode): number {
  const rate = EXCHANGE_RATES[targetCurrency] || 1;
  const converted = usdPrice * rate;

  // Round to nice numbers based on currency
  if (targetCurrency === 'COP') {
    return Math.round(converted / 1000) * 1000;
  }
  if (targetCurrency === 'CLP' || targetCurrency === 'ARS') {
    return Math.round(converted / 100) * 100;
  }
  return Math.round(converted);
}

export function getPricingForCountry(countryCode: string): PricingTier {
  const country = COUNTRIES[countryCode] ?? COUNTRIES['US'];
  if (!country) {
    throw new Error(`Country not found: ${countryCode}`);
  }
  const currency = country.currency;
  const locale = country.locale;

  const professionalPrice = convertPrice(BASE_PRICES.professional, currency);

  return {
    starter: {
      price: 0,
      formatted: locale.startsWith('pt') ? 'Gratis' :
                 locale.startsWith('en') ? 'Free' : 'Gratis',
    },
    professional: {
      price: professionalPrice,
      formatted: formatCurrency(professionalPrice, currency, locale),
    },
    enterprise: locale.startsWith('pt') ? 'Personalizado' :
                locale.startsWith('en') ? 'Custom' : 'Personalizado',
  };
}

export function getCountryByLocale(locale: LocaleCode): Country {
  const found = Object.values(COUNTRIES).find((c) => c.locale === locale);
  const fallback = COUNTRIES['MX'];
  if (!found && !fallback) {
    throw new Error(`Country not found for locale: ${locale}`);
  }
  return found ?? fallback!;
}

export function getCountryByCode(code: string): Country {
  const country = COUNTRIES[code];
  const fallback = COUNTRIES['MX'];
  if (!country && !fallback) {
    throw new Error(`Country not found: ${code}`);
  }
  return country ?? fallback!;
}

export function detectCountryFromTimezone(): string {
  try {
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const timezoneToCountry: Record<string, string> = {
      'America/Mexico_City': 'MX',
      'America/Monterrey': 'MX',
      'America/Cancun': 'MX',
      'America/Bogota': 'CO',
      'America/Buenos_Aires': 'AR',
      'America/Argentina/Buenos_Aires': 'AR',
      'America/Santiago': 'CL',
      'America/Lima': 'PE',
      'America/Sao_Paulo': 'BR',
      'America/Rio_de_Janeiro': 'BR',
      'America/New_York': 'US',
      'America/Los_Angeles': 'US',
      'America/Chicago': 'US',
    };

    return timezoneToCountry[timezone] || 'MX';
  } catch {
    return 'MX';
  }
}

export function detectCountryFromLanguage(): string {
  if (typeof navigator === 'undefined') return 'MX';

  const lang = navigator.language || 'es-MX';

  const langToCountry: Record<string, string> = {
    'es-MX': 'MX',
    'es-CO': 'CO',
    'es-AR': 'AR',
    'es-CL': 'CL',
    'es-PE': 'PE',
    'pt-BR': 'BR',
    'pt': 'BR',
    'en-US': 'US',
    'en': 'US',
  };

  // Try exact match first
  if (langToCountry[lang]) {
    return langToCountry[lang];
  }

  // Try language prefix
  const prefix = lang.split('-')[0];
  if (prefix === 'es') return 'MX'; // Default Spanish to Mexico
  if (prefix === 'pt') return 'BR';
  if (prefix === 'en') return 'US';

  return 'MX';
}

export const DEFAULT_COUNTRY = 'MX';
export const SUPPORTED_COUNTRIES = Object.keys(COUNTRIES);

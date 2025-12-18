'use client';

// ============================================
// Country/Language Selector Component
// ============================================

import * as React from 'react';

import { Check, ChevronDown, Globe } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { COUNTRIES } from '@/lib/i18n';
import { useI18n } from '@/lib/i18n/context';

// ============================================
// Types
// ============================================

interface CountrySelectorProps {
  variant?: 'default' | 'compact' | 'icon';
  showFlag?: boolean;
  showCurrency?: boolean;
  className?: string;
}

// ============================================
// Component
// ============================================

export function CountrySelector({
  variant = 'default',
  showFlag = true,
  showCurrency = false,
  className,
}: CountrySelectorProps) {
  const { country, setCountry } = useI18n();

  const countries = Object.values(COUNTRIES);

  if (variant === 'icon') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className={className} size="icon" variant="ghost">
            <Globe className="h-4 w-4" />
            <span className="sr-only">Select country</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {countries.map((c) => (
            <DropdownMenuItem
              key={c.code}
              className="flex items-center justify-between"
              onClick={() => setCountry(c.code)}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{c.flag}</span>
                <span>{c.name}</span>
              </span>
              {country.code === c.code && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  if (variant === 'compact') {
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button className={className} size="sm" variant="ghost">
            <span className="text-lg">{country.flag}</span>
            <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          {countries.map((c) => (
            <DropdownMenuItem
              key={c.code}
              className="flex items-center justify-between"
              onClick={() => setCountry(c.code)}
            >
              <span className="flex items-center gap-2">
                <span className="text-lg">{c.flag}</span>
                <span>{c.name}</span>
                {showCurrency && (
                  <span className="text-xs text-muted-foreground">
                    ({c.currency})
                  </span>
                )}
              </span>
              {country.code === c.code && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // Default variant
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className} size="sm" variant="outline">
          {showFlag && <span className="mr-2 text-lg">{country.flag}</span>}
          <span className="hidden sm:inline">{country.name}</span>
          <span className="sm:hidden">{country.code}</span>
          {showCurrency && (
            <span className="ml-1 text-xs text-muted-foreground">
              ({country.currency})
            </span>
          )}
          <ChevronDown className="ml-2 h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
          Selecciona tu pais
        </div>
        {countries.map((c) => (
          <DropdownMenuItem
            key={c.code}
            className="flex items-center justify-between"
            onClick={() => setCountry(c.code)}
          >
            <span className="flex items-center gap-3">
              <span className="text-xl">{c.flag}</span>
              <span className="flex flex-col">
                <span className="font-medium">{c.name}</span>
                <span className="text-xs text-muted-foreground">
                  {c.currencyName} ({c.currencySymbol})
                </span>
              </span>
            </span>
            {country.code === c.code && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// ============================================
// Language Selector (Alternative)
// ============================================

export function LanguageSelector({ className }: { className?: string }) {
  const { locale, setLocale, country: _country } = useI18n();

  const languages = [
    { code: 'es-MX' as const, name: 'Espanol', flag: '🇲🇽' },
    { code: 'pt-BR' as const, name: 'Portugues', flag: '🇧🇷' },
    { code: 'en-US' as const, name: 'English', flag: '🇺🇸' },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button className={className} size="sm" variant="ghost">
          <Globe className="mr-2 h-4 w-4" />
          <span className="hidden sm:inline">
            {languages.find((l) => l.code === locale)?.name || 'Espanol'}
          </span>
          <ChevronDown className="ml-1 h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((lang) => (
          <DropdownMenuItem
            key={lang.code}
            className="flex items-center justify-between"
            onClick={() => setLocale(lang.code)}
          >
            <span className="flex items-center gap-2">
              <span>{lang.flag}</span>
              <span>{lang.name}</span>
            </span>
            {locale === lang.code && <Check className="h-4 w-4" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

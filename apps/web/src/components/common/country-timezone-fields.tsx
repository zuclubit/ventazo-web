'use client';

// ============================================
// Country & Timezone Form Fields - FASE 5.11
// Form-integrated country and timezone selection
// with automatic timezone detection from country
// ============================================

import * as React from 'react';

import { Check, ChevronDown, Clock, Globe } from 'lucide-react';
import { type Control, type FieldPath, type FieldValues, useController } from 'react-hook-form';

import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { COUNTRIES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface CountryData {
  code: string;
  name: string;
  nameEn: string;
  flag: string;
  timezone: string;
  phoneCode: string;
  currency: string;
}

export interface TimezoneData {
  value: string;
  label: string;
  offset: string;
  region: string;
}

// ============================================
// Country Data
// ============================================

const countryList: CountryData[] = Object.values(COUNTRIES).map((country) => ({
  code: country.code,
  name: country.name,
  nameEn: country.nameEn,
  flag: country.flag,
  timezone: country.timezone,
  phoneCode: country.phoneCode,
  currency: country.currency,
}));

// ============================================
// Timezone Data - Extended for each country
// ============================================

const TIMEZONES_BY_COUNTRY: Record<string, TimezoneData[]> = {
  MX: [
    { value: 'America/Mexico_City', label: 'Ciudad de Mexico', offset: 'UTC-6', region: 'Centro' },
    { value: 'America/Monterrey', label: 'Monterrey', offset: 'UTC-6', region: 'Centro' },
    { value: 'America/Cancun', label: 'Cancun', offset: 'UTC-5', region: 'Sureste' },
    { value: 'America/Tijuana', label: 'Tijuana', offset: 'UTC-8', region: 'Pacifico' },
    { value: 'America/Hermosillo', label: 'Hermosillo', offset: 'UTC-7', region: 'Pacifico' },
    { value: 'America/Chihuahua', label: 'Chihuahua', offset: 'UTC-7', region: 'Pacifico' },
  ],
  CO: [
    { value: 'America/Bogota', label: 'Bogota', offset: 'UTC-5', region: 'Colombia' },
  ],
  AR: [
    { value: 'America/Argentina/Buenos_Aires', label: 'Buenos Aires', offset: 'UTC-3', region: 'Argentina' },
    { value: 'America/Argentina/Cordoba', label: 'Cordoba', offset: 'UTC-3', region: 'Argentina' },
    { value: 'America/Argentina/Mendoza', label: 'Mendoza', offset: 'UTC-3', region: 'Argentina' },
  ],
  CL: [
    { value: 'America/Santiago', label: 'Santiago', offset: 'UTC-4', region: 'Chile Continental' },
    { value: 'Pacific/Easter', label: 'Isla de Pascua', offset: 'UTC-6', region: 'Chile Insular' },
  ],
  PE: [
    { value: 'America/Lima', label: 'Lima', offset: 'UTC-5', region: 'Peru' },
  ],
  BR: [
    { value: 'America/Sao_Paulo', label: 'Sao Paulo', offset: 'UTC-3', region: 'Brasilia' },
    { value: 'America/Rio_Branco', label: 'Rio Branco', offset: 'UTC-5', region: 'Acre' },
    { value: 'America/Manaus', label: 'Manaus', offset: 'UTC-4', region: 'Amazonas' },
    { value: 'America/Cuiaba', label: 'Cuiaba', offset: 'UTC-4', region: 'Mato Grosso' },
    { value: 'America/Recife', label: 'Recife', offset: 'UTC-3', region: 'Nordeste' },
  ],
  US: [
    { value: 'America/New_York', label: 'New York (Eastern)', offset: 'UTC-5', region: 'Eastern' },
    { value: 'America/Chicago', label: 'Chicago (Central)', offset: 'UTC-6', region: 'Central' },
    { value: 'America/Denver', label: 'Denver (Mountain)', offset: 'UTC-7', region: 'Mountain' },
    { value: 'America/Los_Angeles', label: 'Los Angeles (Pacific)', offset: 'UTC-8', region: 'Pacific' },
    { value: 'America/Anchorage', label: 'Anchorage (Alaska)', offset: 'UTC-9', region: 'Alaska' },
    { value: 'Pacific/Honolulu', label: 'Honolulu (Hawaii)', offset: 'UTC-10', region: 'Hawaii' },
  ],
};

// Default timezone per country (first/main timezone)
const DEFAULT_TIMEZONE: Record<string, string> = {
  MX: 'America/Mexico_City',
  CO: 'America/Bogota',
  AR: 'America/Argentina/Buenos_Aires',
  CL: 'America/Santiago',
  PE: 'America/Lima',
  BR: 'America/Sao_Paulo',
  US: 'America/New_York',
};

// ============================================
// Utility Functions
// ============================================

/**
 * Get timezones available for a country
 */
export function getTimezonesForCountry(countryCode: string): TimezoneData[] {
  return TIMEZONES_BY_COUNTRY[countryCode] || [];
}

/**
 * Get default timezone for a country
 */
export function getDefaultTimezone(countryCode: string): string {
  return DEFAULT_TIMEZONE[countryCode] || 'America/Mexico_City';
}

/**
 * Get country from timezone
 */
export function getCountryFromTimezone(timezone: string): string | null {
  for (const [country, timezones] of Object.entries(TIMEZONES_BY_COUNTRY)) {
    if (timezones.some((tz) => tz.value === timezone)) {
      return country;
    }
  }
  return null;
}

/**
 * Detect user's timezone
 */
export function detectUserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'America/Mexico_City';
  }
}

/**
 * Detect country from browser timezone
 */
export function detectCountryFromBrowserTimezone(): string {
  const browserTimezone = detectUserTimezone();
  return getCountryFromTimezone(browserTimezone) || 'MX';
}

// ============================================
// Country Select Field
// ============================================

export interface CountrySelectFieldProps<TFieldValues extends FieldValues> {
  /** Form control from react-hook-form */
  control: Control<TFieldValues>;
  /** Field name (path) */
  name: FieldPath<TFieldValues>;
  /** Field label */
  label: string;
  /** Optional description text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional className for FormItem */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Timezone field name to auto-update */
  timezoneFieldName?: FieldPath<TFieldValues>;
  /** Phone country field name to auto-update */
  phoneCountryFieldName?: FieldPath<TFieldValues>;
  /** Callback when country changes */
  onCountryChange?: (countryCode: string, countryData: CountryData) => void;
}

/**
 * Country select field with search and flag display
 * Optionally auto-updates related timezone and phone country fields
 */
export function CountrySelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  placeholder = 'Seleccionar pais...',
  timezoneFieldName,
  phoneCountryFieldName,
  onCountryChange,
}: CountrySelectFieldProps<TFieldValues>) {
  const [open, setOpen] = React.useState(false);

  // Controller for main country field
  const { field, fieldState: { error } } = useController({ name, control });

  // Optional controllers for related fields
  const timezoneController = timezoneFieldName
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useController({ name: timezoneFieldName, control })
    : null;

  const phoneCountryController = phoneCountryFieldName
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useController({ name: phoneCountryFieldName, control })
    : null;

  const selectedCountry = countryList.find((c) => c.code === field.value);

  const handleSelect = React.useCallback(
    (countryCode: string) => {
      const country = countryList.find((c) => c.code === countryCode);
      if (!country) return;

      // Update main field
      field.onChange(countryCode);

      // Auto-update timezone
      if (timezoneController) {
        const defaultTz = getDefaultTimezone(countryCode);
        timezoneController.field.onChange(defaultTz);
      }

      // Auto-update phone country
      if (phoneCountryController) {
        phoneCountryController.field.onChange(countryCode);
      }

      // Callback
      onCountryChange?.(countryCode, country);

      setOpen(false);
    },
    [field, timezoneController, phoneCountryController, onCountryChange]
  );

  return (
    <div className={cn('space-y-2', className)}>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              'w-full justify-between font-normal',
              !field.value && 'text-muted-foreground',
              error && 'border-destructive'
            )}
            disabled={disabled}
            type="button"
          >
            {selectedCountry ? (
              <span className="flex items-center gap-2">
                <span className="text-lg">{selectedCountry.flag}</span>
                <span>{selectedCountry.name}</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Globe className="h-4 w-4" />
                {placeholder}
              </span>
            )}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[320px] p-0">
          <Command>
            <CommandInput placeholder="Buscar pais..." />
            <CommandList>
              <CommandEmpty>No se encontro el pais.</CommandEmpty>
              <CommandGroup>
                {countryList.map((country) => (
                  <CommandItem
                    key={country.code}
                    value={`${country.name} ${country.nameEn}`}
                    onSelect={() => handleSelect(country.code)}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        field.value === country.code ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    <span className="flex items-center gap-3 flex-1">
                      <span className="text-lg">{country.flag}</span>
                      <span className="flex flex-col">
                        <span>{country.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {country.phoneCode} | {country.currency}
                        </span>
                      </span>
                    </span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {description && (
        <p className="text-[0.8rem] text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-[0.8rem] font-medium text-destructive">{error.message}</p>
      )}
    </div>
  );
}

// ============================================
// Timezone Select Field
// ============================================

export interface TimezoneSelectFieldProps<TFieldValues extends FieldValues> {
  /** Form control from react-hook-form */
  control: Control<TFieldValues>;
  /** Field name (path) */
  name: FieldPath<TFieldValues>;
  /** Field label */
  label: string;
  /** Optional description text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional className for FormItem */
  className?: string;
  /** Placeholder text */
  placeholder?: string;
  /** Country code to filter timezones (optional) */
  countryCode?: string;
  /** Country field name to watch for changes */
  countryFieldName?: FieldPath<TFieldValues>;
  /** Show all timezones regardless of country */
  showAllTimezones?: boolean;
}

/**
 * Timezone select field
 * Can be linked to a country field for filtered timezones
 */
export function TimezoneSelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  placeholder = 'Seleccionar zona horaria...',
  countryCode: propCountryCode,
  countryFieldName,
  showAllTimezones = false,
}: TimezoneSelectFieldProps<TFieldValues>) {
  // Watch country field if provided
  const countryController = countryFieldName
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useController({ name: countryFieldName, control })
    : null;

  const effectiveCountryCode = countryController?.field.value || propCountryCode || 'MX';

  // Get available timezones
  const availableTimezones = React.useMemo(() => {
    if (showAllTimezones) {
      // Return all timezones grouped by country
      return Object.entries(TIMEZONES_BY_COUNTRY).flatMap(([country, timezones]) =>
        timezones.map((tz) => ({
          ...tz,
          countryCode: country,
          countryFlag: countryList.find((c) => c.code === country)?.flag || '',
        }))
      );
    }
    return getTimezonesForCountry(effectiveCountryCode).map((tz) => ({
      ...tz,
      countryCode: effectiveCountryCode,
      countryFlag: countryList.find((c) => c.code === effectiveCountryCode)?.flag || '',
    }));
  }, [effectiveCountryCode, showAllTimezones]);

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <Select
            disabled={disabled || availableTimezones.length === 0}
            value={field.value ?? ''}
            onValueChange={field.onChange}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder}>
                  {field.value && (
                    <span className="flex items-center gap-2">
                      <Clock className="h-4 w-4" />
                      {availableTimezones.find((tz) => tz.value === field.value)?.label ||
                        field.value}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {availableTimezones.length === 0 ? (
                <SelectItem disabled value="_none">
                  Selecciona un pais primero
                </SelectItem>
              ) : (
                availableTimezones.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    <span className="flex items-center gap-2">
                      {showAllTimezones && (
                        <span className="text-base">{tz.countryFlag}</span>
                      )}
                      <span>{tz.label}</span>
                      <span className="text-xs text-muted-foreground">
                        ({tz.offset})
                      </span>
                    </span>
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// Combined Country-Timezone Field
// ============================================

export interface CountryTimezoneFieldsProps<TFieldValues extends FieldValues> {
  /** Form control from react-hook-form */
  control: Control<TFieldValues>;
  /** Country field name */
  countryName: FieldPath<TFieldValues>;
  /** Timezone field name */
  timezoneName: FieldPath<TFieldValues>;
  /** Whether fields are required */
  required?: boolean;
  /** Whether fields are disabled */
  disabled?: boolean;
  /** Layout: 'row' (side by side) or 'stack' (vertical) */
  layout?: 'row' | 'stack';
  /** Additional className */
  className?: string;
  /** Country label */
  countryLabel?: string;
  /** Timezone label */
  timezoneLabel?: string;
  /** Callback when country changes */
  onCountryChange?: (countryCode: string, countryData: CountryData) => void;
}

/**
 * Combined country and timezone fields with auto-linking
 */
export function CountryTimezoneFields<TFieldValues extends FieldValues>({
  control,
  countryName,
  timezoneName,
  required,
  disabled,
  layout = 'row',
  className,
  countryLabel = 'Pais',
  timezoneLabel = 'Zona Horaria',
  onCountryChange,
}: CountryTimezoneFieldsProps<TFieldValues>) {
  const containerClass = layout === 'row'
    ? 'grid gap-4 sm:grid-cols-2'
    : 'space-y-4';

  return (
    <div className={cn(containerClass, className)}>
      <CountrySelectField
        control={control}
        disabled={disabled}
        label={countryLabel}
        name={countryName}
        required={required}
        timezoneFieldName={timezoneName}
        onCountryChange={onCountryChange}
      />
      <TimezoneSelectField
        control={control}
        countryFieldName={countryName}
        disabled={disabled}
        label={timezoneLabel}
        name={timezoneName}
        required={required}
      />
    </div>
  );
}

// ============================================
// Hook: Auto-detect country and timezone
// ============================================

export interface UseAutoDetectLocationReturn {
  detectedCountry: string;
  detectedTimezone: string;
  isDetecting: boolean;
}

/**
 * Hook to auto-detect user's country and timezone from browser
 */
export function useAutoDetectLocation(): UseAutoDetectLocationReturn {
  const [isDetecting, setIsDetecting] = React.useState(true);
  const [detectedCountry, setDetectedCountry] = React.useState('MX');
  const [detectedTimezone, setDetectedTimezone] = React.useState('America/Mexico_City');

  React.useEffect(() => {
    try {
      const timezone = detectUserTimezone();
      const country = getCountryFromTimezone(timezone) || 'MX';

      setDetectedTimezone(timezone);
      setDetectedCountry(country);
    } catch {
      // Use defaults
    } finally {
      setIsDetecting(false);
    }
  }, []);

  return { detectedCountry, detectedTimezone, isDetecting };
}

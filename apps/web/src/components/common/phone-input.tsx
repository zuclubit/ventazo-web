'use client';

// ============================================
// Phone Input Component - FASE 5.11
// International phone input with country code selection
// ============================================

import * as React from 'react';

import { ChevronDown, Phone } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { COUNTRIES } from '@/lib/i18n';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface PhoneValue {
  countryCode: string;
  phoneCode: string;
  number: string;
  fullNumber: string;
}

export interface PhoneInputProps<TFieldValues extends FieldValues> {
  /** Form control from react-hook-form */
  control: Control<TFieldValues>;
  /** Field name (path) for the phone number */
  name: FieldPath<TFieldValues>;
  /** Field name for country code (optional, for separate storage) */
  countryCodeName?: FieldPath<TFieldValues>;
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
  /** Placeholder for phone number */
  placeholder?: string;
  /** Default country code */
  defaultCountryCode?: string;
  /** Callback when country changes */
  onCountryChange?: (countryCode: string) => void;
}

// ============================================
// Country Data
// ============================================

const countryList = Object.values(COUNTRIES).map((country) => ({
  code: country.code,
  name: country.name,
  flag: country.flag,
  phoneCode: country.phoneCode,
}));

// ============================================
// Helper Functions
// ============================================

/**
 * Format phone number for display (basic formatting)
 */
function formatPhoneDisplay(number: string, countryCode: string): string {
  // Remove non-numeric characters except for formatting
  const cleaned = number.replace(/\D/g, '');

  // Apply basic formatting based on country
  if (countryCode === 'MX' && cleaned.length === 10) {
    return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6)}`;
  }
  if (countryCode === 'US' && cleaned.length === 10) {
    return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
  }
  if (countryCode === 'BR' && cleaned.length >= 10) {
    return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
  }

  // Default: just add spaces every 3-4 digits
  return cleaned.replace(/(\d{3,4})(?=\d)/g, '$1 ').trim();
}

/**
 * Get phone number validation regex based on country
 */
export function getPhoneRegex(countryCode: string): RegExp {
  const patterns: Record<string, RegExp> = {
    MX: /^[0-9]{10}$/, // Mexico: 10 digits
    US: /^[0-9]{10}$/, // US: 10 digits
    CO: /^[0-9]{10}$/, // Colombia: 10 digits
    AR: /^[0-9]{10,11}$/, // Argentina: 10-11 digits
    CL: /^[0-9]{9}$/, // Chile: 9 digits
    PE: /^[0-9]{9}$/, // Peru: 9 digits
    BR: /^[0-9]{10,11}$/, // Brazil: 10-11 digits
  };
  return patterns[countryCode] || /^[0-9]{7,15}$/;
}

/**
 * Get expected phone length for a country
 */
export function getPhoneLength(countryCode: string): { min: number; max: number } {
  const lengths: Record<string, { min: number; max: number }> = {
    MX: { min: 10, max: 10 },
    US: { min: 10, max: 10 },
    CO: { min: 10, max: 10 },
    AR: { min: 10, max: 11 },
    CL: { min: 9, max: 9 },
    PE: { min: 9, max: 9 },
    BR: { min: 10, max: 11 },
  };
  return lengths[countryCode] || { min: 7, max: 15 };
}

// ============================================
// Country Selector Popover
// ============================================

interface CountrySelectorProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

function CountryCodeSelector({ value, onChange, disabled }: CountrySelectorProps) {
  const [open, setOpen] = React.useState(false);
  const selectedCountry = countryList.find((c) => c.code === value) || countryList[0];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          aria-label="Seleccionar pais"
          className="w-[110px] justify-between px-2 font-normal"
          disabled={disabled}
          type="button"
        >
          <span className="flex items-center gap-1.5 truncate">
            <span className="text-base">{selectedCountry?.flag}</span>
            <span className="text-sm text-muted-foreground">
              {selectedCountry?.phoneCode}
            </span>
          </span>
          <ChevronDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Buscar pais..." />
          <CommandList>
            <CommandEmpty>No se encontro el pais.</CommandEmpty>
            <CommandGroup>
              {countryList.map((country) => (
                <CommandItem
                  key={country.code}
                  value={`${country.name} ${country.phoneCode}`}
                  onSelect={() => {
                    onChange(country.code);
                    setOpen(false);
                  }}
                >
                  <span className="flex items-center gap-3 w-full">
                    <span className="text-lg">{country.flag}</span>
                    <span className="flex-1">{country.name}</span>
                    <span className="text-sm text-muted-foreground">
                      {country.phoneCode}
                    </span>
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ============================================
// Main PhoneInput Component
// ============================================

/**
 * Phone input with international country code selection
 * Integrates with react-hook-form
 */
export function PhoneInput<TFieldValues extends FieldValues>({
  control,
  name,
  countryCodeName,
  label,
  description,
  required,
  disabled,
  className,
  placeholder = 'Numero de telefono',
  defaultCountryCode = 'MX',
  onCountryChange,
}: PhoneInputProps<TFieldValues>) {
  // Use controller for the main phone field
  const {
    field,
    fieldState: { error },
  } = useController({
    name,
    control,
  });

  // Use controller for country code if separate field provided
  const countryController = countryCodeName
    ? // eslint-disable-next-line react-hooks/rules-of-hooks
      useController({
        name: countryCodeName,
        control,
      })
    : null;

  // Local state for country code (when not stored separately)
  const [localCountryCode, setLocalCountryCode] = React.useState(defaultCountryCode);

  // Determine which country code to use
  const countryCode = countryController?.field.value || localCountryCode;
  const selectedCountry = countryList.find((c) => c.code === countryCode);

  // Handle country change
  const handleCountryChange = React.useCallback(
    (newCountryCode: string) => {
      if (countryController) {
        countryController.field.onChange(newCountryCode);
      } else {
        setLocalCountryCode(newCountryCode);
      }
      onCountryChange?.(newCountryCode);
    },
    [countryController, onCountryChange]
  );

  // Handle phone number change
  const handlePhoneChange = React.useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      // Only allow digits
      const value = e.target.value.replace(/\D/g, '');
      const { max } = getPhoneLength(countryCode);
      const truncated = value.slice(0, max);
      field.onChange(truncated);
    },
    [field, countryCode]
  );

  // Get formatted display value
  const displayValue = field.value
    ? formatPhoneDisplay(field.value, countryCode)
    : '';

  return (
    <div className={cn('space-y-2', className)}>
      <Label>
        {label}
        {required && <span className="text-destructive ml-1">*</span>}
      </Label>
      <div className="flex gap-2">
        <CountryCodeSelector
          disabled={disabled}
          value={countryCode}
          onChange={handleCountryChange}
        />
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            {...field}
            className={cn('pl-10', error && 'border-destructive')}
            disabled={disabled}
            placeholder={placeholder}
            type="tel"
            value={displayValue}
            onChange={handlePhoneChange}
          />
        </div>
      </div>
      {description && (
        <p className="text-[0.8rem] text-muted-foreground">
          {description}
          {selectedCountry && (
            <span className="ml-1 text-xs">
              ({getPhoneLength(countryCode).min}-{getPhoneLength(countryCode).max} digitos)
            </span>
          )}
        </p>
      )}
      {error && <p className="text-[0.8rem] font-medium text-destructive">{error.message}</p>}
    </div>
  );
}

// ============================================
// Simple Phone Input (without form integration)
// ============================================

export interface SimplePhoneInputProps {
  /** Current phone value */
  value: string;
  /** Change handler */
  onChange: (value: string) => void;
  /** Country code */
  countryCode?: string;
  /** Country code change handler */
  onCountryCodeChange?: (code: string) => void;
  /** Placeholder */
  placeholder?: string;
  /** Disabled state */
  disabled?: boolean;
  /** Error message */
  error?: string;
  /** Additional className */
  className?: string;
}

/**
 * Simple phone input without form integration
 * Use for uncontrolled or custom form implementations
 */
export function SimplePhoneInput({
  value,
  onChange,
  countryCode = 'MX',
  onCountryCodeChange,
  placeholder = 'Numero de telefono',
  disabled,
  error,
  className,
}: SimplePhoneInputProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/\D/g, '');
    const { max } = getPhoneLength(countryCode);
    onChange(digits.slice(0, max));
  };

  const displayValue = value ? formatPhoneDisplay(value, countryCode) : '';

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex gap-2">
        <CountryCodeSelector
          disabled={disabled}
          value={countryCode}
          onChange={(code) => onCountryCodeChange?.(code)}
        />
        <div className="relative flex-1">
          <Phone className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className={cn('pl-10', error && 'border-destructive')}
            disabled={disabled}
            placeholder={placeholder}
            type="tel"
            value={displayValue}
            onChange={handleChange}
          />
        </div>
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ============================================
// Utility: Build full phone number
// ============================================

/**
 * Build full international phone number
 */
export function buildFullPhoneNumber(phoneNumber: string, countryCode: string): string {
  const country = countryList.find((c) => c.code === countryCode);
  if (!country) return phoneNumber;

  const cleaned = phoneNumber.replace(/\D/g, '');
  return `${country.phoneCode}${cleaned}`;
}

/**
 * Parse full phone number into parts
 */
export function parsePhoneNumber(fullNumber: string): { countryCode: string; number: string } | null {
  // Try to match known phone codes
  for (const country of countryList) {
    if (fullNumber.startsWith(country.phoneCode)) {
      return {
        countryCode: country.code,
        number: fullNumber.slice(country.phoneCode.length),
      };
    }
  }
  return null;
}

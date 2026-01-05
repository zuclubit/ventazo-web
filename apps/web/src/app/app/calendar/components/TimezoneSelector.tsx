'use client';

/**
 * TimezoneSelector Component - Sprint 5
 *
 * Combobox for selecting timezones with search functionality.
 * Groups timezones by region for better UX.
 *
 * @module app/calendar/components/TimezoneSelector
 */

import * as React from 'react';
import { Check, ChevronsUpDown, Globe, Search } from 'lucide-react';

import { cn } from '@/lib/utils';
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';

// ============================================
// Timezone Data
// ============================================

interface TimezoneOption {
  value: string;
  label: string;
  offset: string;
  region: string;
}

const COMMON_TIMEZONES: TimezoneOption[] = [
  // Americas
  { value: 'America/New_York', label: 'Nueva York (EST)', offset: '-05:00', region: 'América' },
  { value: 'America/Chicago', label: 'Chicago (CST)', offset: '-06:00', region: 'América' },
  { value: 'America/Denver', label: 'Denver (MST)', offset: '-07:00', region: 'América' },
  { value: 'America/Los_Angeles', label: 'Los Ángeles (PST)', offset: '-08:00', region: 'América' },
  { value: 'America/Mexico_City', label: 'Ciudad de México (CST)', offset: '-06:00', region: 'América' },
  { value: 'America/Monterrey', label: 'Monterrey (CST)', offset: '-06:00', region: 'América' },
  { value: 'America/Cancun', label: 'Cancún (EST)', offset: '-05:00', region: 'América' },
  { value: 'America/Bogota', label: 'Bogotá (COT)', offset: '-05:00', region: 'América' },
  { value: 'America/Lima', label: 'Lima (PET)', offset: '-05:00', region: 'América' },
  { value: 'America/Santiago', label: 'Santiago (CLT)', offset: '-04:00', region: 'América' },
  { value: 'America/Buenos_Aires', label: 'Buenos Aires (ART)', offset: '-03:00', region: 'América' },
  { value: 'America/Sao_Paulo', label: 'São Paulo (BRT)', offset: '-03:00', region: 'América' },
  { value: 'America/Toronto', label: 'Toronto (EST)', offset: '-05:00', region: 'América' },
  { value: 'America/Vancouver', label: 'Vancouver (PST)', offset: '-08:00', region: 'América' },

  // Europe
  { value: 'Europe/London', label: 'Londres (GMT)', offset: '+00:00', region: 'Europa' },
  { value: 'Europe/Paris', label: 'París (CET)', offset: '+01:00', region: 'Europa' },
  { value: 'Europe/Madrid', label: 'Madrid (CET)', offset: '+01:00', region: 'Europa' },
  { value: 'Europe/Berlin', label: 'Berlín (CET)', offset: '+01:00', region: 'Europa' },
  { value: 'Europe/Rome', label: 'Roma (CET)', offset: '+01:00', region: 'Europa' },
  { value: 'Europe/Amsterdam', label: 'Ámsterdam (CET)', offset: '+01:00', region: 'Europa' },
  { value: 'Europe/Moscow', label: 'Moscú (MSK)', offset: '+03:00', region: 'Europa' },

  // Asia/Pacific
  { value: 'Asia/Dubai', label: 'Dubái (GST)', offset: '+04:00', region: 'Asia/Pacífico' },
  { value: 'Asia/Shanghai', label: 'Shanghái (CST)', offset: '+08:00', region: 'Asia/Pacífico' },
  { value: 'Asia/Hong_Kong', label: 'Hong Kong (HKT)', offset: '+08:00', region: 'Asia/Pacífico' },
  { value: 'Asia/Singapore', label: 'Singapur (SGT)', offset: '+08:00', region: 'Asia/Pacífico' },
  { value: 'Asia/Tokyo', label: 'Tokio (JST)', offset: '+09:00', region: 'Asia/Pacífico' },
  { value: 'Asia/Seoul', label: 'Seúl (KST)', offset: '+09:00', region: 'Asia/Pacífico' },
  { value: 'Asia/Kolkata', label: 'Mumbai (IST)', offset: '+05:30', region: 'Asia/Pacífico' },
  { value: 'Australia/Sydney', label: 'Sídney (AEST)', offset: '+10:00', region: 'Asia/Pacífico' },
  { value: 'Pacific/Auckland', label: 'Auckland (NZST)', offset: '+12:00', region: 'Asia/Pacífico' },

  // Other
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)', offset: '+00:00', region: 'Otro' },
];

// ============================================
// Types
// ============================================

interface TimezoneSelectorProps {
  value: string;
  onChange: (timezone: string) => void;
  disabled?: boolean;
  className?: string;
}

// ============================================
// TimezoneSelector Component
// ============================================

export function TimezoneSelector({
  value,
  onChange,
  disabled = false,
  className,
}: TimezoneSelectorProps) {
  const [open, setOpen] = React.useState(false);
  const [searchValue, setSearchValue] = React.useState('');

  // Filter timezones based on search
  const filteredTimezones = React.useMemo(() => {
    if (!searchValue) return COMMON_TIMEZONES;

    const search = searchValue.toLowerCase();
    return COMMON_TIMEZONES.filter(
      (tz) =>
        tz.label.toLowerCase().includes(search) ||
        tz.value.toLowerCase().includes(search) ||
        tz.offset.includes(search)
    );
  }, [searchValue]);

  // Group by region
  const groupedTimezones = React.useMemo(() => {
    const groups: Record<string, TimezoneOption[]> = {};
    filteredTimezones.forEach((tz) => {
      const region = tz.region;
      if (!groups[region]) {
        groups[region] = [];
      }
      groups[region]!.push(tz);
    });
    return groups;
  }, [filteredTimezones]);

  // Find selected timezone
  const selectedTimezone = COMMON_TIMEZONES.find((tz) => tz.value === value);

  // Get browser timezone as default
  const browserTimezone = React.useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return 'UTC';
    }
  }, []);

  const handleSelect = (timezoneValue: string) => {
    onChange(timezoneValue);
    setSearchValue('');
    setOpen(false);
  };

  return (
    <div className={cn('space-y-1', className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            aria-label="Seleccionar zona horaria"
            className="w-full justify-between"
            disabled={disabled}
          >
            {value && selectedTimezone ? (
              <span className="flex items-center gap-2 truncate">
                <Globe className="h-4 w-4 shrink-0" />
                <span className="truncate">{selectedTimezone.label}</span>
                <span className="text-xs text-muted-foreground shrink-0">
                  (UTC{selectedTimezone.offset})
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                Seleccionar zona horaria...
              </span>
            )}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[400px] p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar zona horaria..."
              value={searchValue}
              onValueChange={setSearchValue}
            />
            <CommandList className="max-h-[300px]">
              {filteredTimezones.length === 0 && (
                <CommandEmpty>No se encontraron zonas horarias.</CommandEmpty>
              )}

              {/* Browser Timezone Suggestion */}
              {!searchValue && browserTimezone !== value && (
                <CommandGroup heading="Sugerencia">
                  <CommandItem
                    value={browserTimezone}
                    onSelect={() => handleSelect(browserTimezone)}
                    className="flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <p className="text-sm font-medium">Tu zona horaria actual</p>
                      <p className="text-xs text-muted-foreground">{browserTimezone}</p>
                    </div>
                    {value === browserTimezone && <Check className="h-4 w-4 text-primary" />}
                  </CommandItem>
                </CommandGroup>
              )}

              {/* Grouped Timezones */}
              {Object.entries(groupedTimezones).map(([region, timezones]) => (
                <CommandGroup key={region} heading={region}>
                  {timezones.map((tz) => (
                    <CommandItem
                      key={tz.value}
                      value={tz.value}
                      onSelect={() => handleSelect(tz.value)}
                      className="flex items-center justify-between"
                    >
                      <span className="truncate">{tz.label}</span>
                      <span className="text-xs text-muted-foreground shrink-0 ml-2">
                        UTC{tz.offset}
                      </span>
                      {value === tz.value && <Check className="h-4 w-4 text-primary ml-2 shrink-0" />}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Current Time Display */}
      {value && selectedTimezone && (
        <p className="text-xs text-muted-foreground">
          Hora actual: {new Date().toLocaleTimeString('es-MX', { timeZone: value, hour: '2-digit', minute: '2-digit' })}
        </p>
      )}
    </div>
  );
}

export default TimezoneSelector;

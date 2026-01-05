'use client';

// ============================================
// AdvancedColorPicker Component
// Professional color selection with WCAG validation
// ============================================

import * as React from 'react';
import { Check, AlertTriangle, Palette, RefreshCw } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  validateColor,
  getContrastRatio,
  generatePalette,
  isValidHex,
  normalizeHex,
  getWcagLevel,
  getOptimalForeground,
} from '@/lib/theme';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface AdvancedColorPickerProps {
  /** Label for the color picker */
  label: string;
  /** Current color value (hex format) */
  value: string;
  /** Callback when color changes */
  onChange: (value: string) => void;
  /** Optional description text */
  description?: string;
  /** Show contrast indicator against a background color */
  showContrast?: boolean;
  /** Color to calculate contrast against (default: white) */
  contrastAgainst?: string;
  /** Show generated palette preview */
  showPalettePreview?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Custom color presets */
  presets?: string[];
  /** Callback when preview is requested */
  onPreview?: (color: string) => void;
  /** Class name for container */
  className?: string;
}

// ============================================
// Default Presets - Professional Brand Colors
// ============================================

const DEFAULT_PRESETS = [
  '#0D9488', // Teal (Ventazo Primary)
  '#F97316', // Orange (Ventazo Accent)
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#EF4444', // Red
  '#10B981', // Emerald
  '#F59E0B', // Amber
  '#6366F1', // Indigo
  '#14B8A6', // Cyan
];

// ============================================
// Component
// ============================================

export function AdvancedColorPicker({
  label,
  value,
  onChange,
  description,
  showContrast = true,
  contrastAgainst = '#FFFFFF',
  showPalettePreview = false,
  disabled = false,
  presets = DEFAULT_PRESETS,
  onPreview,
  className,
}: AdvancedColorPickerProps) {
  const [inputValue, setInputValue] = React.useState(value);
  const [validation, setValidation] = React.useState(() => validateColor(value));
  const [showPresets, setShowPresets] = React.useState(false);

  // Update when external value changes
  React.useEffect(() => {
    setInputValue(value);
    setValidation(validateColor(value));
  }, [value]);

  // Handle text input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let newValue = e.target.value.trim();
    setInputValue(newValue);

    // Auto-add # if missing and looks like hex
    if (newValue && !newValue.startsWith('#') && /^[0-9A-Fa-f]+$/.test(newValue)) {
      newValue = `#${newValue}`;
    }

    if (isValidHex(newValue)) {
      const finalValue = normalizeHex(newValue);
      setValidation(validateColor(finalValue));
      onChange(finalValue);
      onPreview?.(finalValue);
    }
  };

  // Handle native color picker change
  const handleColorPickerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = normalizeHex(e.target.value);
    setInputValue(newValue);
    setValidation(validateColor(newValue));
    onChange(newValue);
    onPreview?.(newValue);
  };

  // Handle preset click
  const handlePresetClick = (preset: string) => {
    const normalized = normalizeHex(preset);
    setInputValue(normalized);
    setValidation(validateColor(normalized));
    onChange(normalized);
    onPreview?.(normalized);
    setShowPresets(false);
  };

  // Calculate contrast info
  const contrastRatio = showContrast
    ? getContrastRatio(value, contrastAgainst)
    : 0;
  const contrastLevel = getWcagLevel(value, contrastAgainst);

  // Generate palette for preview
  const palette = showPalettePreview ? generatePalette(value) : null;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Label & Description */}
      <div>
        <Label className="text-sm font-medium">{label}</Label>
        {description && (
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>

      {/* Color Input Row */}
      <div className="flex items-center gap-3">
        {/* Native Color Picker */}
        <div className="relative">
          <input
            type="color"
            value={isValidHex(value) ? value : '#000000'}
            onChange={handleColorPickerChange}
            disabled={disabled}
            className={cn(
              'h-12 w-12 cursor-pointer rounded-lg border-2 transition-all',
              'hover:border-primary/50 focus:border-primary focus:ring-2 focus:ring-primary/20',
              'appearance-none [&::-webkit-color-swatch-wrapper]:p-1 [&::-webkit-color-swatch]:rounded-md',
              disabled && 'cursor-not-allowed opacity-50'
            )}
          />
          {validation.isValid && (
            <div className="absolute -bottom-1 -right-1 h-5 w-5 flex items-center justify-center bg-background rounded-full border">
              <Check className="h-3 w-3 text-success" />
            </div>
          )}
        </div>

        {/* Hex Input */}
        <div className="flex-1">
          <Input
            value={inputValue}
            onChange={handleInputChange}
            disabled={disabled}
            placeholder="#000000"
            className={cn(
              'font-mono uppercase',
              !validation.isValid && inputValue.length > 0 && 'border-destructive focus-visible:ring-destructive'
            )}
            maxLength={7}
          />
        </div>

        {/* Presets Toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              type="button"
              variant={showPresets ? 'secondary' : 'outline'}
              size="icon"
              onClick={() => setShowPresets(!showPresets)}
              disabled={disabled}
            >
              <Palette className="h-4 w-4" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Colores sugeridos</TooltipContent>
        </Tooltip>
      </div>

      {/* Presets Grid */}
      {showPresets && (
        <div className="grid grid-cols-5 gap-2 p-3 border rounded-lg bg-muted/30 animate-in fade-in-50 slide-in-from-top-2 duration-200">
          {presets.map((preset) => (
            <Tooltip key={preset}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => handlePresetClick(preset)}
                  disabled={disabled}
                  className={cn(
                    'h-8 w-full rounded-md border-2 transition-all',
                    'hover:scale-110 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary/50',
                    value.toUpperCase() === preset.toUpperCase()
                      ? 'ring-2 ring-primary ring-offset-2 border-primary'
                      : 'border-transparent'
                  )}
                  style={{ backgroundColor: preset }}
                />
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <span className="font-mono text-xs">{preset}</span>
              </TooltipContent>
            </Tooltip>
          ))}
        </div>
      )}

      {/* Contrast Indicator */}
      {showContrast && validation.isValid && (
        <div className="flex items-center gap-3 text-sm">
          {/* Sample with adaptive text on color - uses optimal foreground */}
          <div
            className="h-8 w-10 rounded border flex items-center justify-center text-xs font-bold shadow-sm"
            style={{
              backgroundColor: value,
              color: getOptimalForeground(value),
            }}
          >
            Aa
          </div>

          {/* Sample showing text color on white background */}
          <div
            className="h-8 w-10 rounded border flex items-center justify-center text-xs font-bold shadow-sm bg-white"
            style={{
              color: value,
            }}
          >
            Aa
          </div>

          {/* Contrast info */}
          <div className="flex items-center gap-2 flex-1">
            <span className="text-muted-foreground">
              Contraste: <span className="font-mono">{contrastRatio.toFixed(1)}:1</span>
            </span>

            <span
              className={cn(
                'px-2 py-0.5 rounded text-xs font-semibold',
                contrastLevel === 'AAA' && 'bg-success/15 text-success',
                contrastLevel === 'AA' && 'bg-warning/15 text-warning',
                contrastLevel === 'Fail' && 'bg-destructive/15 text-destructive'
              )}
            >
              WCAG {contrastLevel}
            </span>

            {contrastLevel === 'Fail' && (
              <Tooltip>
                <TooltipTrigger>
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-sm">
                    El contraste es muy bajo para texto normal.
                    Considera usar un color mas{' '}
                    {validation.contrast.black > validation.contrast.white ? 'claro' : 'oscuro'}.
                  </p>
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      )}

      {/* Palette Preview */}
      {showPalettePreview && palette && (
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground font-medium">
            Paleta generada:
          </p>
          <div className="flex rounded-lg overflow-hidden border">
            {Object.entries(palette).map(([shade, color]) => (
              <Tooltip key={shade}>
                <TooltipTrigger asChild>
                  <div
                    className="h-8 flex-1 cursor-pointer transition-transform hover:scale-y-[1.2]"
                    style={{ backgroundColor: color }}
                  />
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  <span className="font-mono text-xs">
                    {shade}: {color}
                  </span>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </div>
      )}

      {/* HSL Info (technical detail) */}
      {validation.isValid && (
        <p className="text-xs text-muted-foreground font-mono">
          HSL: {validation.hsl.h} {validation.hsl.s}% {validation.hsl.l}%
        </p>
      )}

      {/* Invalid color warning */}
      {!validation.isValid && inputValue.length > 0 && (
        <p className="text-xs text-destructive flex items-center gap-1">
          <AlertTriangle className="h-3 w-3" />
          Formato invalido. Usa formato hexadecimal (#RRGGBB)
        </p>
      )}
    </div>
  );
}

// ============================================
// Compact Version for inline use
// ============================================

interface CompactColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export function CompactColorPicker({
  value,
  onChange,
  disabled = false,
  className,
}: CompactColorPickerProps) {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(normalizeHex(e.target.value));
  };

  return (
    <div className={cn('flex items-center gap-2', className)}>
      <input
        type="color"
        value={isValidHex(value) ? value : '#000000'}
        onChange={handleChange}
        disabled={disabled}
        className={cn(
          'h-10 w-16 cursor-pointer rounded border transition-all',
          'hover:border-primary/50',
          disabled && 'cursor-not-allowed opacity-50'
        )}
      />
      <Input
        className="flex-1 font-mono uppercase"
        disabled={disabled}
        value={value}
        onChange={(e) => {
          const val = e.target.value;
          if (isValidHex(val) || isValidHex(`#${val}`)) {
            onChange(normalizeHex(val.startsWith('#') ? val : `#${val}`));
          }
        }}
        maxLength={7}
      />
    </div>
  );
}

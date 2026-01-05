'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AVAILABLE_FONTS, FONT_SIZE_OPTIONS } from '@/lib/proposal-templates';
import { cn } from '@/lib/utils';

interface FontSelectorProps {
  label: string;
  fontValue: string;
  sizeValue: number;
  onFontChange: (value: string) => void;
  onSizeChange: (value: number) => void;
  className?: string;
}

/**
 * Font family and size selector
 */
export function FontSelector({
  label,
  fontValue,
  sizeValue,
  onFontChange,
  onSizeChange,
  className,
}: FontSelectorProps) {
  return (
    <div className={cn('space-y-2', className)}>
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex gap-2">
        <Select value={fontValue} onValueChange={onFontChange}>
          <SelectTrigger className="flex-1 h-9">
            <SelectValue placeholder="Fuente" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_FONTS.map((font) => (
              <SelectItem key={font.value} value={font.value}>
                {font.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={String(sizeValue)}
          onValueChange={(v) => onSizeChange(Number(v))}
        >
          <SelectTrigger className="w-24 h-9">
            <SelectValue placeholder="Tamano" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZE_OPTIONS.map((size) => (
              <SelectItem key={size.value} value={String(size.value)}>
                {size.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

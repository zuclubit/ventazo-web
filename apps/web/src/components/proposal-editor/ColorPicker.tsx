'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}

/**
 * Simple color picker with preview swatch
 */
export function ColorPicker({ label, value, onChange, className }: ColorPickerProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <button
        type="button"
        className="h-8 w-8 rounded-md border border-border shadow-sm shrink-0 cursor-pointer transition-transform hover:scale-105"
        style={{ backgroundColor: value }}
        onClick={() => inputRef.current?.click()}
        aria-label={`Seleccionar color para ${label}`}
      />
      <div className="flex-1 min-w-0">
        <Label className="text-xs text-muted-foreground">{label}</Label>
        <div className="flex items-center gap-2">
          <Input
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="h-7 text-xs font-mono"
            placeholder="#000000"
          />
          <input
            ref={inputRef}
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="sr-only"
            tabIndex={-1}
          />
        </div>
      </div>
    </div>
  );
}

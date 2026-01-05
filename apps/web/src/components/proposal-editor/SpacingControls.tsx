'use client';

import * as React from 'react';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  MARGIN_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  type ProposalSpacing,
} from '@/lib/proposal-templates';
import { cn } from '@/lib/utils';

interface SpacingControlsProps {
  spacing: ProposalSpacing;
  onChange: (spacing: ProposalSpacing) => void;
  className?: string;
}

/**
 * Controls for margins, padding, and line height
 */
export function SpacingControls({ spacing, onChange, className }: SpacingControlsProps) {
  const updateSpacing = <K extends keyof ProposalSpacing>(
    key: K,
    value: ProposalSpacing[K]
  ) => {
    onChange({ ...spacing, [key]: value });
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Margins */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Margenes</Label>
        <Select
          value={String(spacing.margins)}
          onValueChange={(v) => updateSpacing('margins', Number(v))}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {MARGIN_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Padding */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Padding</Label>
          <span className="text-xs text-muted-foreground">{spacing.padding}px</span>
        </div>
        <Slider
          value={[spacing.padding]}
          onValueChange={([v]) => updateSpacing('padding', v ?? spacing.padding)}
          min={5}
          max={40}
          step={5}
          className="w-full"
        />
      </div>

      {/* Line Height */}
      <div className="space-y-2">
        <Label className="text-sm font-medium">Interlineado</Label>
        <Select
          value={String(spacing.lineHeight)}
          onValueChange={(v) => updateSpacing('lineHeight', Number(v))}
        >
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LINE_HEIGHT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={String(option.value)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Section Gap */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-sm font-medium">Espacio entre secciones</Label>
          <span className="text-xs text-muted-foreground">{spacing.sectionGap}px</span>
        </div>
        <Slider
          value={[spacing.sectionGap ?? 20]}
          onValueChange={([v]) => updateSpacing('sectionGap', v ?? spacing.sectionGap ?? 20)}
          min={10}
          max={50}
          step={5}
          className="w-full"
        />
      </div>
    </div>
  );
}

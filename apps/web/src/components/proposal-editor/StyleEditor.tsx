'use client';

import * as React from 'react';
import { Moon, Sun, Palette } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  type ProposalStyles,
  type ProposalColors,
  STYLE_PRESETS,
  getDefaultStyles,
} from '@/lib/proposal-templates';
import { ColorPicker } from './ColorPicker';
import { FontSelector } from './FontSelector';
import { SpacingControls } from './SpacingControls';
import { cn } from '@/lib/utils';

interface StyleEditorProps {
  styles: ProposalStyles;
  onChange: (styles: ProposalStyles) => void;
  className?: string;
}

/**
 * Complete style editor with theme, colors, fonts, and spacing
 */
export function StyleEditor({ styles, onChange, className }: StyleEditorProps) {
  const updateTheme = (theme: 'dark' | 'light') => {
    const defaults = getDefaultStyles(theme);
    onChange({
      ...styles,
      theme,
      colors: defaults.colors,
    });
  };

  const updateColor = <K extends keyof ProposalColors>(key: K, value: string) => {
    onChange({
      ...styles,
      colors: {
        ...styles.colors,
        [key]: value,
      },
    });
  };

  const updateFontFamily = (type: 'heading' | 'body', value: string) => {
    onChange({
      ...styles,
      fonts: {
        ...styles.fonts,
        [type]: value,
      },
    });
  };

  const updateFontSize = (key: keyof ProposalStyles['fonts']['sizes'], value: number) => {
    onChange({
      ...styles,
      fonts: {
        ...styles.fonts,
        sizes: {
          ...styles.fonts.sizes,
          [key]: value,
        },
      },
    });
  };

  const applyPreset = (presetId: string) => {
    const preset = STYLE_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onChange(preset.styles);
    }
  };

  return (
    <div className={cn('space-y-6', className)}>
      {/* Theme Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Tema</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant={styles.theme === 'dark' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateTheme('dark')}
              className="flex-1 gap-2"
            >
              <Moon className="h-4 w-4" />
              Oscuro
            </Button>
            <Button
              variant={styles.theme === 'light' ? 'default' : 'outline'}
              size="sm"
              onClick={() => updateTheme('light')}
              className="flex-1 gap-2"
            >
              <Sun className="h-4 w-4" />
              Claro
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Presets */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Estilos Predefinidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-2">
            {STYLE_PRESETS.map((preset) => (
              <button
                key={preset.id}
                onClick={() => applyPreset(preset.id)}
                className={cn(
                  'flex items-center gap-2 p-2 rounded-lg border text-left transition-colors',
                  'hover:bg-muted/50'
                )}
              >
                <div
                  className="h-6 w-6 rounded shrink-0 border"
                  style={{ backgroundColor: preset.styles.colors.primary }}
                />
                <div className="min-w-0">
                  <div className="text-xs font-medium truncate">{preset.name}</div>
                </div>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Colors */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Colores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ColorPicker
            label="Principal"
            value={styles.colors.primary}
            onChange={(v) => updateColor('primary', v)}
          />
          <ColorPicker
            label="Secundario"
            value={styles.colors.secondary}
            onChange={(v) => updateColor('secondary', v)}
          />
          <ColorPicker
            label="Acento"
            value={styles.colors.accent}
            onChange={(v) => updateColor('accent', v)}
          />
          <Separator className="my-3" />
          <ColorPicker
            label="Fondo"
            value={styles.colors.background}
            onChange={(v) => updateColor('background', v)}
          />
          <ColorPicker
            label="Texto"
            value={styles.colors.text}
            onChange={(v) => updateColor('text', v)}
          />
          {styles.colors.muted && (
            <ColorPicker
              label="Texto secundario"
              value={styles.colors.muted}
              onChange={(v) => updateColor('muted', v)}
            />
          )}
        </CardContent>
      </Card>

      {/* Fonts */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Tipografia</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <FontSelector
            label="Encabezados"
            fontValue={styles.fonts.heading}
            sizeValue={styles.fonts.sizes.heading}
            onFontChange={(v) => updateFontFamily('heading', v)}
            onSizeChange={(v) => updateFontSize('heading', v)}
          />
          <FontSelector
            label="Cuerpo"
            fontValue={styles.fonts.body}
            sizeValue={styles.fonts.sizes.body}
            onFontChange={(v) => updateFontFamily('body', v)}
            onSizeChange={(v) => updateFontSize('body', v)}
          />
        </CardContent>
      </Card>

      {/* Spacing */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">Espaciado</CardTitle>
        </CardHeader>
        <CardContent>
          <SpacingControls
            spacing={styles.spacing}
            onChange={(spacing) => onChange({ ...styles, spacing })}
          />
        </CardContent>
      </Card>
    </div>
  );
}

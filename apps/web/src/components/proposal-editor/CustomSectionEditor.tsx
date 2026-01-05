'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import type { ProposalSection } from '@/lib/proposal-templates';
import { cn } from '@/lib/utils';

interface CustomSectionEditorProps {
  section: ProposalSection;
  onChange: (section: ProposalSection) => void;
  onDelete: () => void;
  className?: string;
}

/**
 * Editor for custom text sections with markdown support
 */
export function CustomSectionEditor({
  section,
  onChange,
  onDelete,
  className,
}: CustomSectionEditorProps) {
  const updateConfig = (key: string, value: string) => {
    onChange({
      ...section,
      config: {
        ...section.config,
        [key]: value,
      },
    });
  };

  return (
    <div className={cn('space-y-4 p-4 border rounded-lg bg-muted/30', className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">Seccion Personalizada</Label>
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
        >
          <Trash2 className="h-4 w-4" />
          <span className="sr-only">Eliminar seccion</span>
        </Button>
      </div>

      <div className="space-y-2">
        <Label htmlFor={`title-${section.id}`} className="text-xs text-muted-foreground">
          Titulo
        </Label>
        <Input
          id={`title-${section.id}`}
          value={(section.config.title as string) || ''}
          onChange={(e) => updateConfig('title', e.target.value)}
          placeholder="Titulo de la seccion"
          className="h-9"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`content-${section.id}`} className="text-xs text-muted-foreground">
          Contenido (Markdown soportado)
        </Label>
        <Textarea
          id={`content-${section.id}`}
          value={(section.config.content as string) || ''}
          onChange={(e) => updateConfig('content', e.target.value)}
          placeholder="Escribe el contenido aqui...&#10;&#10;Puedes usar **negritas**, *italicas*, y listas:&#10;- Item 1&#10;- Item 2"
          className="min-h-[120px] resize-y font-mono text-sm"
        />
      </div>

      <div className="text-xs text-muted-foreground">
        <strong>Tip:</strong> Usa **texto** para negritas, *texto* para italicas
      </div>
    </div>
  );
}

'use client';

import * as React from 'react';
import { Image, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type PreviewMode = 'thumbnail' | 'full';

interface PreviewToggleProps {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
  className?: string;
}

/**
 * Toggle between thumbnail and full PDF preview modes
 */
export function PreviewToggle({ mode, onChange, className }: PreviewToggleProps) {
  return (
    <div
      className={cn(
        'inline-flex items-center rounded-lg border border-border bg-muted p-1',
        className
      )}
      role="radiogroup"
      aria-label="Modo de previsualizacion"
    >
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange('thumbnail')}
        className={cn(
          'h-8 px-3 gap-2 rounded-md transition-colors',
          mode === 'thumbnail'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        role="radio"
        aria-checked={mode === 'thumbnail'}
      >
        <Image className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">Miniatura</span>
      </Button>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onChange('full')}
        className={cn(
          'h-8 px-3 gap-2 rounded-md transition-colors',
          mode === 'full'
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'
        )}
        role="radio"
        aria-checked={mode === 'full'}
      >
        <FileText className="h-4 w-4" />
        <span className="hidden sm:inline text-xs">Completo</span>
      </Button>
    </div>
  );
}

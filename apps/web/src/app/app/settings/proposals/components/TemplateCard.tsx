'use client';

import * as React from 'react';
import { Star, MoreVertical, Copy, Trash2, Edit, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { ProposalTemplate } from '@/lib/proposal-templates';
import { cn } from '@/lib/utils';

interface TemplateCardProps {
  template: ProposalTemplate;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onSetDefault: () => void;
  className?: string;
}

/**
 * Template preview card with actions
 */
export function TemplateCard({
  template,
  onEdit,
  onDuplicate,
  onDelete,
  onSetDefault,
  className,
}: TemplateCardProps) {
  const enabledSections = template.sections.filter((s) => s.enabled).length;
  const totalSections = template.sections.length;

  return (
    <Card
      className={cn(
        'group relative overflow-hidden transition-all hover:shadow-md',
        template.isDefault && 'ring-2 ring-primary',
        className
      )}
    >
      {/* Thumbnail Preview */}
      <div
        className="aspect-[3/4] relative overflow-hidden"
        style={{ backgroundColor: template.styles.colors.background }}
      >
        {/* Simplified preview representation */}
        <div className="absolute inset-4 flex flex-col gap-2">
          {/* Header bar */}
          <div
            className="h-6 rounded"
            style={{ backgroundColor: template.styles.colors.primary }}
          />
          {/* Content lines */}
          <div className="flex-1 flex flex-col gap-1.5">
            {[...Array(6)].map((_, i) => (
              <div
                key={i}
                className="h-2 rounded"
                style={{
                  backgroundColor: template.styles.colors.text,
                  opacity: 0.2 + (i % 3) * 0.1,
                  width: `${70 + (i % 3) * 10}%`,
                }}
              />
            ))}
          </div>
          {/* Footer bar */}
          <div
            className="h-4 rounded"
            style={{ backgroundColor: template.styles.colors.secondary, opacity: 0.5 }}
          />
        </div>

        {/* Hover overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Button size="sm" onClick={onEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Editar
          </Button>
        </div>

        {/* Default badge */}
        {template.isDefault && (
          <div className="absolute top-2 left-2">
            <Badge variant="default" className="gap-1 bg-primary text-primary-foreground">
              <Star className="h-3 w-3" />
              Predeterminada
            </Badge>
          </div>
        )}
      </div>

      {/* Card Content */}
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-sm truncate">{template.name}</h3>
            {template.description && (
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {template.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {template.styles.theme === 'dark' ? 'Oscuro' : 'Claro'}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {enabledSections}/{totalSections} secciones
              </span>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Copy className="h-4 w-4 mr-2" />
                Duplicar
              </DropdownMenuItem>
              {!template.isDefault && (
                <DropdownMenuItem onClick={onSetDefault}>
                  <Check className="h-4 w-4 mr-2" />
                  Establecer como predeterminada
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onDelete}
                className="text-destructive focus:text-destructive"
                disabled={template.isDefault}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardContent>
    </Card>
  );
}

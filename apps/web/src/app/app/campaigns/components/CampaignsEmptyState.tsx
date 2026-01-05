'use client';

/**
 * CampaignsEmptyState Component
 *
 * Empty state for campaigns list with onboarding information.
 */

import * as React from 'react';
import { Mail, Send, BarChart3, Users, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface CampaignsEmptyStateProps {
  /** Handler for create campaign */
  onCreateCampaign?: () => void;
  /** Handler for view templates */
  onViewTemplates?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Component
// ============================================

export function CampaignsEmptyState({
  onCreateCampaign,
  onViewTemplates,
  className,
}: CampaignsEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 max-w-lg mx-auto',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'h-20 w-20 rounded-full flex items-center justify-center mb-6',
          'bg-[var(--tenant-primary-lighter)] text-[var(--tenant-primary)]'
        )}
      >
        <Send className="h-10 w-10" />
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold mb-2">Crea tu primera campaña</h2>

      {/* Description */}
      <p className="text-muted-foreground mb-6">
        Las campañas te permiten enviar correos masivos a tus clientes y leads
        con seguimiento de aperturas, clics y más.
      </p>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 w-full">
        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-left">
          <Mail className="h-5 w-5 text-[var(--tenant-primary)] shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Editor visual</p>
            <p className="text-xs text-muted-foreground">
              Crea emails atractivos con nuestro editor drag & drop
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-left">
          <Users className="h-5 w-5 text-[var(--tenant-primary)] shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Segmentación</p>
            <p className="text-xs text-muted-foreground">
              Filtra destinatarios por status, tier y más
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-left">
          <BarChart3 className="h-5 w-5 text-[var(--tenant-primary)] shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Análisis detallado</p>
            <p className="text-xs text-muted-foreground">
              Métricas de apertura, clics y engagement
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 text-left">
          <Send className="h-5 w-5 text-[var(--tenant-primary)] shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-sm">Programación</p>
            <p className="text-xs text-muted-foreground">
              Envía ahora o programa para después
            </p>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={onCreateCampaign}
          className="gap-2 bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-hover)]"
        >
          <Plus className="h-4 w-4" />
          Crear campaña
        </Button>

        <Button variant="outline" onClick={onViewTemplates}>
          Ver plantillas
        </Button>
      </div>
    </div>
  );
}

export default CampaignsEmptyState;

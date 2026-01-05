'use client';

/**
 * CustomerKanbanEmptyColumn - Empty Column State v1.0
 *
 * Displayed when a column has no customers.
 * Provides contextual messaging and CTA.
 *
 * @module components/kanban/CustomerKanbanEmptyColumn
 */

import * as React from 'react';
import { Users, Plus, ArrowRight, PartyPopper, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { LifecycleStageConfig } from '../../hooks';

// ============================================
// Types
// ============================================

export interface CustomerKanbanEmptyColumnProps {
  /** Lifecycle stage configuration */
  stage: LifecycleStageConfig;
  /** Whether this column is a drop target */
  isOver?: boolean;
  /** Handler for adding a customer */
  onAddCustomer?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Stage-specific messages
// ============================================

const EMPTY_MESSAGES: Record<string, { icon: typeof Users; title: string; message: string }> = {
  prospect: {
    icon: Users,
    title: 'Sin prospectos',
    message: 'Convierte leads calificados para empezar',
  },
  onboarding: {
    icon: ArrowRight,
    title: 'Sin onboarding',
    message: 'Los nuevos clientes aparecerán aquí',
  },
  active: {
    icon: PartyPopper,
    title: 'Sin clientes activos',
    message: 'Completa el onboarding para activar clientes',
  },
  at_risk: {
    icon: AlertTriangle,
    title: 'Ninguno en riesgo',
    message: 'Tus clientes están saludables',
  },
  renewal: {
    icon: Users,
    title: 'Sin renovaciones',
    message: 'No hay renovaciones pendientes',
  },
  churned: {
    icon: Users,
    title: 'Sin pérdidas',
    message: 'Excelente retención de clientes',
  },
};

// ============================================
// Component
// ============================================

export const CustomerKanbanEmptyColumn = React.memo(function CustomerKanbanEmptyColumn({
  stage,
  isOver = false,
  onAddCustomer,
  className,
}: CustomerKanbanEmptyColumnProps) {
  const emptyConfig = EMPTY_MESSAGES[stage.id] || {
    icon: Users,
    title: 'Sin clientes',
    message: 'Arrastra clientes aquí o agrega uno nuevo',
  };

  const Icon = emptyConfig.icon;

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'min-h-[200px] p-4',
        'rounded-lg border-2 border-dashed',
        'transition-all duration-200',
        isOver
          ? 'border-[var(--customer-drop-border)] bg-[var(--customer-drop-bg)]'
          : 'border-border bg-muted/30',
        className
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center',
          'w-12 h-12 mb-3',
          'rounded-full',
          'transition-colors duration-200'
        )}
        style={{
          backgroundColor: stage.bg,
          color: stage.textColor,
        }}
      >
        <Icon className="h-6 w-6" />
      </div>

      {/* Text */}
      <h4 className="text-sm font-medium text-foreground mb-1">
        {emptyConfig.title}
      </h4>
      <p className="text-xs text-muted-foreground text-center max-w-[150px] mb-3">
        {emptyConfig.message}
      </p>

      {/* CTA - Only show for actionable stages */}
      {onAddCustomer && (stage.id === 'prospect' || stage.id === 'active') && (
        <button
          type="button"
          onClick={onAddCustomer}
          className={cn(
            'inline-flex items-center gap-1.5',
            'px-3 py-1.5',
            'text-xs font-medium',
            'rounded-lg border',
            'transition-all duration-150',
            'hover:scale-105 active:scale-95',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/50'
          )}
          style={{
            backgroundColor: stage.bg,
            borderColor: stage.border,
            color: stage.textColor,
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Agregar</span>
        </button>
      )}

      {/* Drop hint */}
      {isOver && (
        <p className="text-xs text-primary mt-2 animate-pulse">
          Suelta aquí para mover
        </p>
      )}
    </div>
  );
});

export default CustomerKanbanEmptyColumn;

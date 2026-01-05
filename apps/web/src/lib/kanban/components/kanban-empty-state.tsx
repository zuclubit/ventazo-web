'use client';

/**
 * KanbanEmptyState Component
 *
 * Educational empty states for Kanban columns and boards.
 * Provides contextual guidance for users.
 *
 * @version 1.0.0
 * @module components/KanbanEmptyState
 */

import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  ArrowRight,
  GripVertical,
  Inbox,
  Lightbulb,
  MousePointer2,
  Plus,
  Sparkles,
  Target,
  Users,
  Zap,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { KanbanEntityType, PipelineStageConfig } from '../types';

// ============================================
// Types
// ============================================

export interface KanbanEmptyStateProps {
  /** Type of entity (for contextual messaging) */
  entityType: KanbanEntityType;
  /** Current stage (for column empty states) */
  stage?: PipelineStageConfig;
  /** Is this the first stage in the pipeline? */
  isFirstStage?: boolean;
  /** Is this a terminal stage (won/lost)? */
  isTerminalStage?: boolean;
  /** Callback to create new item */
  onCreateNew?: () => void;
  /** Callback to import items */
  onImport?: () => void;
  /** Show as drop target highlight */
  isDropTarget?: boolean;
  /** Compact mode (for columns) */
  compact?: boolean;
  /** Custom class name */
  className?: string;
}

// ============================================
// Entity-specific content
// ============================================

const ENTITY_CONTENT: Record<
  KanbanEntityType,
  {
    singular: string;
    plural: string;
    icon: React.ElementType;
    firstStageMessage: string;
    emptyColumnMessage: string;
    terminalStageMessage: (type: 'won' | 'lost') => string;
    tips: string[];
  }
> = {
  lead: {
    singular: 'lead',
    plural: 'leads',
    icon: Users,
    firstStageMessage: 'Los nuevos leads aparecerán aquí cuando se capturen.',
    emptyColumnMessage: 'Arrastra leads aquí o usa el botón "Mover a".',
    terminalStageMessage: (type) =>
      type === 'won'
        ? 'Los leads convertidos a clientes aparecerán aquí.'
        : 'Los leads descartados se mostrarán aquí para análisis.',
    tips: [
      'Usa el score para priorizar leads calientes',
      'Contacta leads nuevos dentro de las primeras 24 horas',
      'Documenta cada interacción para mejor seguimiento',
    ],
  },
  opportunity: {
    singular: 'oportunidad',
    plural: 'oportunidades',
    icon: Target,
    firstStageMessage:
      'Las nuevas oportunidades de venta aparecerán aquí.',
    emptyColumnMessage: 'Mueve oportunidades aquí según avancen.',
    terminalStageMessage: (type) =>
      type === 'won'
        ? 'Las oportunidades cerradas exitosamente se muestran aquí.'
        : 'Las oportunidades perdidas se registran aquí para análisis.',
    tips: [
      'Mantén actualizada la probabilidad de cierre',
      'Asocia todas las actividades a la oportunidad',
      'Revisa las oportunidades estancadas regularmente',
    ],
  },
  customer: {
    singular: 'cliente',
    plural: 'clientes',
    icon: Users,
    firstStageMessage:
      'Los nuevos clientes en onboarding aparecerán aquí.',
    emptyColumnMessage: 'Los clientes se moverán aquí según su estado.',
    terminalStageMessage: () =>
      'Los clientes que han abandonado se registran aquí.',
    tips: [
      'Completa el onboarding en los primeros 30 días',
      'Monitorea el health score regularmente',
      'Actúa rápido con clientes en riesgo',
    ],
  },
  task: {
    singular: 'tarea',
    plural: 'tareas',
    icon: Zap,
    firstStageMessage: 'Las nuevas tareas pendientes aparecerán aquí.',
    emptyColumnMessage: 'Arrastra tareas aquí cuando cambien de estado.',
    terminalStageMessage: (type) =>
      type === 'won'
        ? 'Las tareas completadas se archivan aquí.'
        : 'Las tareas canceladas se muestran aquí.',
    tips: [
      'Prioriza tareas por urgencia e importancia',
      'Limita el trabajo en progreso para mejor enfoque',
      'Revisa las tareas vencidas diariamente',
    ],
  },
};

// ============================================
// Component
// ============================================

export function KanbanEmptyState({
  entityType,
  stage,
  isFirstStage = false,
  isTerminalStage = false,
  onCreateNew,
  onImport,
  isDropTarget = false,
  compact = false,
  className,
}: KanbanEmptyStateProps) {
  const content = ENTITY_CONTENT[entityType];
  const Icon = content.icon;

  // Determine message based on context
  let message = content.emptyColumnMessage;
  if (isFirstStage) {
    message = content.firstStageMessage;
  } else if (isTerminalStage && stage) {
    const stageType =
      stage.type === 'won' ? 'won' : stage.type === 'lost' ? 'lost' : 'won';
    message = content.terminalStageMessage(stageType);
  }

  // Random tip
  const [tipIndex] = React.useState(() =>
    Math.floor(Math.random() * content.tips.length)
  );
  const tip = content.tips[tipIndex];

  // Compact mode (for columns)
  if (compact) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center py-8 px-4 text-center',
          'border-2 border-dashed rounded-lg transition-all',
          isDropTarget
            ? 'border-primary bg-primary/5'
            : 'border-muted-foreground/20 bg-muted/30',
          className
        )}
      >
        <div
          className={cn(
            'w-10 h-10 rounded-full flex items-center justify-center mb-3',
            isDropTarget ? 'bg-primary/10' : 'bg-muted'
          )}
        >
          {isDropTarget ? (
            <MousePointer2 className="w-5 h-5 text-primary" />
          ) : (
            <Inbox className="w-5 h-5 text-muted-foreground" />
          )}
        </div>

        <p className="text-sm text-muted-foreground mb-3">{message}</p>

        {isFirstStage && onCreateNew && (
          <Button size="sm" variant="outline" onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-1" />
            Nuevo {content.singular}
          </Button>
        )}
      </div>
    );
  }

  // Full empty state (for boards)
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-16 px-8 text-center',
        className
      )}
    >
      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-primary" />
      </div>

      <h3 className="text-xl font-semibold mb-2">
        No hay {content.plural} todavía
      </h3>

      <p className="text-muted-foreground max-w-md mb-6">{message}</p>

      {/* Actions */}
      <div className="flex items-center gap-3 mb-8">
        {onCreateNew && (
          <Button onClick={onCreateNew}>
            <Plus className="w-4 h-4 mr-2" />
            Crear {content.singular}
          </Button>
        )}
        {onImport && (
          <Button variant="outline" onClick={onImport}>
            Importar
          </Button>
        )}
      </div>

      {/* Educational section */}
      <div className="max-w-lg space-y-6">
        {/* Tip */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 text-left">
          <Lightbulb className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800 dark:text-amber-200 text-sm">
              Consejo
            </p>
            <p className="text-sm text-amber-700 dark:text-amber-300">{tip}</p>
          </div>
        </div>

        {/* How to use */}
        <div className="space-y-3">
          <p className="text-sm font-medium">Cómo usar el tablero Kanban:</p>
          <div className="grid gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <GripVertical className="w-4 h-4" />
              <span>Arrastra y suelta para mover entre columnas</span>
            </div>
            <div className="flex items-center gap-2">
              <MousePointer2 className="w-4 h-4" />
              <span>Clic en una tarjeta para ver detalles</span>
            </div>
            <div className="flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              <span>Usa el botón "Mover a" como alternativa</span>
            </div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              <span>Los indicadores de color muestran prioridad</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Column Empty State (Simpler version)
// ============================================

export interface ColumnEmptyStateProps {
  /** Stage info */
  stage: PipelineStageConfig;
  /** Is currently a drop target */
  isDropTarget?: boolean;
  /** Message to display */
  message?: string;
  /** Custom class name */
  className?: string;
}

export function ColumnEmptyState({
  stage,
  isDropTarget = false,
  message = 'Arrastra elementos aquí',
  className,
}: ColumnEmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center py-8 px-4',
        'border-2 border-dashed rounded-lg transition-all min-h-[120px]',
        isDropTarget
          ? 'border-primary bg-primary/5 scale-[1.02]'
          : 'border-muted-foreground/20',
        className
      )}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center mb-2',
          isDropTarget ? 'bg-primary/10' : 'bg-muted'
        )}
      >
        {isDropTarget ? (
          <ArrowRight className="w-4 h-4 text-primary animate-pulse" />
        ) : (
          <Inbox className="w-4 h-4 text-muted-foreground" />
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">{message}</p>
    </div>
  );
}

export default KanbanEmptyState;

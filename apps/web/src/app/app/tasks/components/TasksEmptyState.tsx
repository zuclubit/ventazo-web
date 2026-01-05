'use client';

/**
 * TasksEmptyState Component - Premium Responsive Design v2.0
 *
 * Educational empty state with clear visual hierarchy:
 * - Quick Task as PRIMARY action (large centered card)
 * - Schedule and Link as SECONDARY actions (smaller, below)
 *
 * Mobile-first responsive design:
 * - Full-width cards on mobile with proper padding
 * - Stacked layout on mobile, row on tablet+
 * - 44px minimum touch targets (WCAG 2.1 AA)
 * - Smooth transitions and animations
 *
 * Homologated with LeadsEmptyState and OpportunitiesEmptyState
 *
 * @module components/TasksEmptyState
 */

import * as React from 'react';
import {
  CheckSquare,
  Plus,
  Calendar,
  Link2,
  Rocket,
  ArrowRight,
  Zap,
  CheckCircle2,
  Search,
  X,
  ListTodo,
  Clock,
  Target,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface TasksEmptyStateProps {
  /** Handler for creating a quick task */
  onCreateTask?: () => void;
  /** Handler for scheduling a task */
  onScheduleTask?: () => void;
  /** Handler for linking to an entity */
  onLinkToEntity?: () => void;
  /** Variant for different contexts */
  variant?: 'default' | 'compact' | 'search' | 'filtered';
  /** Search term (for no results variant) */
  searchTerm?: string;
  /** Clear filters handler */
  onClearFilters?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Primary CTA Card (Quick Task - Large, Responsive)
// ============================================

interface PrimaryCTACardProps {
  onClick?: () => void;
}

const PrimaryCTACard = React.memo(function PrimaryCTACard({ onClick }: PrimaryCTACardProps) {
  return (
    <div
      className={cn(
        // Base layout - full width on mobile, constrained on larger screens
        'relative w-full rounded-2xl border-2',
        // Responsive padding: smaller on mobile, larger on tablet+
        'p-5 sm:p-6 md:p-8',
        // Max width only on larger screens
        'sm:max-w-md',
        // Primary theming using CSS variables
        'border-primary/30',
        'bg-gradient-to-br from-primary/5 via-primary/10 to-transparent',
        // Transitions and interactions
        'transition-all duration-300',
        'hover:border-primary/50',
        'hover:shadow-lg hover:shadow-primary/10',
        'active:scale-[0.99]',
        'cursor-pointer group',
        // Focus visible for keyboard navigation
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Decorative gradient orb - hidden on small screens */}
      <div className="absolute top-4 right-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl hidden sm:block" />

      {/* Badge - Responsive sizing */}
      <div className="inline-flex items-center gap-1.5 mb-3 sm:mb-4 px-2.5 sm:px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
        <Zap className="h-3 sm:h-3.5 w-3 sm:w-3.5 text-primary" />
        <span className="text-[10px] sm:text-xs font-medium text-primary">Rápido y fácil</span>
      </div>

      {/* Icon - Responsive sizing */}
      <div className={cn(
        'flex items-center justify-center rounded-xl sm:rounded-2xl mb-4 sm:mb-5',
        'h-12 w-12 sm:h-14 md:h-16 sm:w-14 md:w-16',
        'bg-primary shadow-lg shadow-primary/30',
        'group-hover:scale-105 transition-transform duration-300'
      )}>
        <CheckSquare className="h-6 w-6 sm:h-7 md:h-8 sm:w-7 md:w-8 text-white" />
      </div>

      {/* Content - Responsive typography */}
      <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2 text-foreground">
        Crear tu primera tarea
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-5 leading-relaxed">
        Organiza tu día y no pierdas ningún seguimiento.
        Las tareas te ayudan a cerrar más ventas.
      </p>

      {/* Features - Responsive spacing and sizing */}
      <div className="flex flex-col gap-1.5 sm:gap-2 mb-5 sm:mb-6">
        {[
          'Seguimientos automáticos de leads',
          'Recordatorios por correo y push',
          'Vincula a leads y oportunidades',
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {/* Button - 44px min touch target */}
      <Button
        size="lg"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={cn(
          'w-full min-h-[44px] sm:min-h-[48px]',
          'shadow-lg shadow-primary/30',
          'text-sm sm:text-base font-medium',
          'active:scale-[0.98] transition-all duration-200'
        )}
      >
        <Plus className="mr-2 h-4 w-4" />
        Crear tarea
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
});

// ============================================
// Secondary CTA Card (Smaller, Responsive)
// ============================================

interface SecondaryCTACardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick?: () => void;
}

const SecondaryCTACard = React.memo(function SecondaryCTACard({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
}: SecondaryCTACardProps) {
  return (
    <div
      className={cn(
        // Flex behavior - equal width on row layout
        'flex-1 min-w-0',
        // Responsive padding
        'p-4 sm:p-5',
        // Styling
        'rounded-xl border border-border/50',
        'bg-card/50 backdrop-blur-sm',
        // Transitions and interactions
        'transition-all duration-300',
        'hover:border-primary/20 hover:bg-card/80',
        'active:scale-[0.99]',
        'cursor-pointer group',
        // Focus visible
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
      )}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
    >
      {/* Icon - Responsive sizing with 44px touch target on mobile */}
      <div className={cn(
        'flex items-center justify-center rounded-lg sm:rounded-xl',
        'h-10 w-10 sm:h-11 sm:w-11',
        'bg-muted mb-2.5 sm:mb-3',
        'group-hover:bg-primary/10 transition-colors duration-200'
      )}>
        {icon}
      </div>

      {/* Content - Responsive typography */}
      <h3 className="font-semibold text-sm sm:text-[15px] mb-1 text-foreground">{title}</h3>
      <p className="text-[11px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 leading-relaxed line-clamp-2">
        {description}
      </p>

      {/* Button - 44px min touch target */}
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={cn(
          'w-full min-h-[40px] sm:min-h-[44px]',
          'text-xs sm:text-sm',
          'group-hover:border-primary/30',
          'active:scale-[0.98] transition-all duration-200'
        )}
      >
        {buttonLabel}
        <ArrowRight className="ml-1.5 sm:ml-2 h-3 w-3 sm:h-3.5 sm:w-3.5" />
      </Button>
    </div>
  );
});

// ============================================
// No Results Variant (Responsive)
// ============================================

const NoResultsEmpty = React.memo(function NoResultsEmpty({
  searchTerm,
  onClearFilters,
  onCreateTask,
  className,
}: Pick<TasksEmptyStateProps, 'searchTerm' | 'onClearFilters' | 'onCreateTask' | 'className'>) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      'w-full max-w-sm mx-auto',
      'py-8 sm:py-12 px-4 sm:px-6',
      className
    )}>
      {/* Icon - Responsive sizing */}
      <div className="relative mb-4 sm:mb-5">
        <div className="absolute inset-0 blur-2xl rounded-full bg-muted opacity-50" />
        <div className={cn(
          'relative flex items-center justify-center rounded-full',
          'h-14 w-14 sm:h-16 sm:w-16',
          'border-2 border-dashed border-muted-foreground/20 bg-muted/50'
        )}>
          <Search className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>

      {/* Content - Responsive typography */}
      <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 text-foreground">
        Sin resultados
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground text-center mb-5 sm:mb-6 leading-relaxed">
        No encontramos tareas que coincidan con{' '}
        {searchTerm ? (
          <span className="font-medium text-foreground">&quot;{searchTerm}&quot;</span>
        ) : (
          'los filtros aplicados'
        )}
      </p>

      {/* Actions - Stacked on mobile, row on larger */}
      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full">
        {onClearFilters && (
          <Button
            variant="outline"
            onClick={onClearFilters}
            className="min-h-[44px] flex-1"
          >
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
        {onCreateTask && (
          <Button
            onClick={onCreateTask}
            className="min-h-[44px] flex-1"
          >
            <Plus className="mr-2 h-4 w-4" />
            Crear tarea
          </Button>
        )}
      </div>
    </div>
  );
});

// ============================================
// Compact Variant (Responsive)
// ============================================

const CompactEmpty = React.memo(function CompactEmpty({
  onCreateTask,
  className,
}: Pick<TasksEmptyStateProps, 'onCreateTask' | 'className'>) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      'py-6 sm:py-8 px-4',
      className
    )}>
      <div className={cn(
        'flex items-center justify-center rounded-full bg-primary/10',
        'h-11 w-11 sm:h-12 sm:w-12 mb-2.5 sm:mb-3'
      )}>
        <CheckSquare className="h-5 w-5 text-primary" />
      </div>
      <p className="text-xs sm:text-sm text-muted-foreground mb-2.5 sm:mb-3">
        No hay tareas en este estado
      </p>
      {onCreateTask && (
        <Button
          size="sm"
          onClick={onCreateTask}
          className="min-h-[40px] sm:min-h-[44px] px-4"
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear tarea
        </Button>
      )}
    </div>
  );
});

// ============================================
// Filtered Empty Variant (Responsive)
// ============================================

const FilteredEmpty = React.memo(function FilteredEmpty({
  onClearFilters,
  className,
}: Pick<TasksEmptyStateProps, 'onClearFilters' | 'className'>) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      'py-8 sm:py-12 px-4',
      className
    )}>
      <div className="relative mb-4 sm:mb-5">
        <div className={cn(
          'relative flex items-center justify-center rounded-full',
          'h-14 w-14 sm:h-16 sm:w-16',
          'border-2 border-dashed border-muted-foreground/20 bg-muted/50'
        )}>
          <ListTodo className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 text-foreground">
        Sin tareas en este estado
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground text-center max-w-md mb-5 sm:mb-6">
        No hay tareas que coincidan con el filtro seleccionado.
      </p>

      {onClearFilters && (
        <Button variant="outline" onClick={onClearFilters} className="min-h-[44px]">
          Ver todas las tareas
        </Button>
      )}
    </div>
  );
});

// ============================================
// Main Component (Responsive)
// ============================================

export const TasksEmptyState = React.memo(function TasksEmptyState({
  onCreateTask,
  onScheduleTask,
  onLinkToEntity,
  variant = 'default',
  searchTerm,
  onClearFilters,
  className,
}: TasksEmptyStateProps) {
  // No results variant
  if (variant === 'search' || searchTerm) {
    return (
      <NoResultsEmpty
        searchTerm={searchTerm}
        onClearFilters={onClearFilters}
        onCreateTask={onCreateTask}
        className={className}
      />
    );
  }

  // Filtered variant
  if (variant === 'filtered') {
    return (
      <FilteredEmpty
        onClearFilters={onClearFilters}
        className={className}
      />
    );
  }

  // Compact variant
  if (variant === 'compact') {
    return <CompactEmpty onCreateTask={onCreateTask} className={className} />;
  }

  // Default full variant - Premium Responsive Design
  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      // Responsive padding - smaller on mobile
      'py-6 sm:py-8 md:py-12 px-4 sm:px-6',
      // Full width container
      'w-full',
      className
    )}>
      {/* Header - Responsive typography and spacing */}
      <div className="text-center w-full max-w-lg mb-5 sm:mb-6 md:mb-8">
        {/* Motivational Badge - Hidden on very small screens, visible from sm */}
        <div className="hidden xs:inline-flex sm:inline-flex items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 px-3 sm:px-4 py-1 sm:py-1.5 rounded-full border border-primary/20 bg-primary/5">
          <Rocket className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
          <span className="text-xs sm:text-sm font-medium text-primary">¡Organiza tu día!</span>
        </div>

        {/* Title - Responsive font sizes */}
        <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-foreground">
          Tu lista de tareas está vacía
        </h2>
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed px-2 sm:px-0">
          Crea tareas para dar seguimiento a leads, programar llamadas y cerrar más ventas.
          <span className="hidden sm:inline"> Las tareas se sincronizan en tiempo real.</span>
        </p>
      </div>

      {/* PRIMARY Action - Quick Task (Large Card) - Full width on mobile */}
      <div className="w-full flex justify-center">
        <PrimaryCTACard onClick={onCreateTask} />
      </div>

      {/* Divider with "o también" - Responsive spacing */}
      <div className="flex items-center gap-3 sm:gap-4 my-4 sm:my-5 md:my-6 w-full sm:max-w-md px-2 sm:px-0">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">
          o también
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* SECONDARY Actions - Stack on mobile, row on tablet+ */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:max-w-md">
        {/* Schedule Task */}
        <SecondaryCTACard
          icon={<Calendar className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          title="Programar tarea"
          description="Agenda una tarea con fecha y hora específica"
          buttonLabel="Agendar"
          onClick={onScheduleTask || onCreateTask}
        />

        {/* Link to Lead */}
        <SecondaryCTACard
          icon={<Target className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          title="Vincular a Lead"
          description="Crea una tarea de seguimiento para un lead existente"
          buttonLabel="Seleccionar Lead"
          onClick={onLinkToEntity || onCreateTask}
        />
      </div>
    </div>
  );
});

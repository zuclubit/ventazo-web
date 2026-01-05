'use client';

/**
 * CustomersEmptyState - Premium Responsive Empty State v2.0
 *
 * Displayed when there are no customers.
 * Provides educational content and CTAs for onboarding.
 *
 * Mobile-first responsive design:
 * - Full-width cards on mobile with proper padding
 * - Stacked layout on mobile, row on tablet+
 * - 44px minimum touch targets (WCAG 2.1 AA)
 * - Smooth transitions and animations
 *
 * @module components/CustomersEmptyState
 */

import * as React from 'react';
import {
  Users,
  UserPlus,
  Upload,
  ArrowRightLeft,
  Sparkles,
  Building2,
  TrendingUp,
  Search,
  X,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

// ============================================
// Types
// ============================================

export interface CustomersEmptyStateProps {
  /** Variant: general empty or search results empty */
  variant?: 'empty' | 'no-results';
  /** Search term (for no-results variant) */
  searchTerm?: string;
  /** Handler to add a customer manually */
  onAddCustomer?: () => void;
  /** Handler to import customers */
  onImportCustomers?: () => void;
  /** Handler to convert leads */
  onConvertLeads?: () => void;
  /** Handler to clear filters */
  onClearFilters?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Secondary Action Card (Responsive)
// ============================================

interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

const ActionCard = React.memo(function ActionCard({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
  variant = 'secondary',
}: ActionCardProps) {
  const isPrimary = variant === 'primary';

  return (
    <div
      className={cn(
        'flex-1 min-w-0 rounded-xl border p-4 sm:p-5',
        'transition-all duration-300',
        'active:scale-[0.99] cursor-pointer group',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
        isPrimary
          ? 'border-primary/30 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent hover:border-primary/50'
          : 'border-border/50 bg-card/50 backdrop-blur-sm hover:border-primary/20 hover:bg-card/80'
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
      <div className={cn(
        'flex items-center justify-center rounded-lg sm:rounded-xl',
        'h-10 w-10 sm:h-11 sm:w-11 mb-2.5 sm:mb-3',
        isPrimary ? 'bg-primary/20' : 'bg-muted',
        'group-hover:bg-primary/10 transition-colors duration-200'
      )}>
        {icon}
      </div>
      <h3 className="font-semibold text-sm sm:text-[15px] mb-1 text-foreground">{title}</h3>
      <p className="text-[11px] sm:text-xs text-muted-foreground mb-3 sm:mb-4 leading-relaxed line-clamp-2">
        {description}
      </p>
      <Button
        size="sm"
        variant={isPrimary ? 'default' : 'outline'}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className={cn(
          'w-full min-h-[40px] sm:min-h-[44px]',
          'text-xs sm:text-sm',
          !isPrimary && 'group-hover:border-primary/30',
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
// Component (Responsive)
// ============================================

export const CustomersEmptyState = React.memo(function CustomersEmptyState({
  variant = 'empty',
  searchTerm,
  onAddCustomer,
  onImportCustomers,
  onConvertLeads,
  onClearFilters,
  className,
}: CustomersEmptyStateProps) {
  // No results variant
  if (variant === 'no-results') {
    return (
      <div className={cn(
        'flex flex-col items-center justify-center',
        'w-full max-w-sm mx-auto',
        'py-8 sm:py-12 px-4 sm:px-6',
        className
      )}>
        {/* Icon */}
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

        {/* Content */}
        <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 text-foreground">
          Sin resultados
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground text-center mb-5 sm:mb-6 leading-relaxed">
          No encontramos clientes que coincidan con{' '}
          {searchTerm ? (
            <span className="font-medium text-foreground">"{searchTerm}"</span>
          ) : (
            'los filtros aplicados'
          )}
        </p>

        {/* Actions */}
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
          {onAddCustomer && (
            <Button
              onClick={onAddCustomer}
              className="min-h-[44px] flex-1"
            >
              <UserPlus className="mr-2 h-4 w-4" />
              Agregar Cliente
            </Button>
          )}
        </div>
      </div>
    );
  }

  // Main empty state - Premium Responsive Design
  return (
    <div className={cn(
      'flex flex-col items-center justify-center',
      'py-6 sm:py-8 md:py-12 px-4 sm:px-6',
      'w-full',
      className
    )}>
      {/* Illustration - Responsive sizing */}
      <div className="relative mb-5 sm:mb-6 md:mb-8">
        {/* Main icon */}
        <div className={cn(
          'rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5',
          'flex items-center justify-center',
          'w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24'
        )}>
          <Building2 className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 text-primary" />
        </div>
        {/* Decorative elements - Hidden on mobile */}
        <div className="hidden sm:flex absolute -top-2 -right-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[var(--status-success)]/20 items-center justify-center">
          <TrendingUp className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-[var(--status-success)]" />
        </div>
        <div className="hidden sm:flex absolute -bottom-2 -left-2 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-primary/20 items-center justify-center">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary" />
        </div>
      </div>

      {/* Text - Responsive typography */}
      <h2 className="text-xl sm:text-2xl font-bold text-foreground mb-2 sm:mb-3 text-center">
        Tu cartera está lista
      </h2>
      <p className="text-xs sm:text-sm text-muted-foreground mb-5 sm:mb-6 md:mb-8 max-w-md text-center leading-relaxed px-2 sm:px-0">
        Comienza a gestionar tus clientes de manera inteligente.
        <span className="hidden sm:inline"> Agrega clientes manualmente, importa desde un archivo o convierte leads calificados.</span>
      </p>

      {/* Primary CTA - Convert Leads (recommended action) */}
      {onConvertLeads && (
        <div className="w-full sm:max-w-md mb-4 sm:mb-5">
          <ActionCard
            icon={<ArrowRightLeft className="h-5 w-5 text-primary" />}
            title="Convertir Leads Calificados"
            description="Transforma tus leads ganados en clientes activos"
            buttonLabel="Convertir Leads"
            onClick={onConvertLeads}
            variant="primary"
          />
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3 sm:gap-4 my-3 sm:my-4 w-full sm:max-w-md">
        <div className="flex-1 h-px bg-border" />
        <span className="text-[10px] sm:text-xs text-muted-foreground uppercase tracking-wider whitespace-nowrap">
          o también
        </span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Secondary Actions - Stack on mobile, row on tablet+ */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 w-full sm:max-w-md mb-6 sm:mb-8">
        <ActionCard
          icon={<UserPlus className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          title="Agregar Manualmente"
          description="Registra un cliente con todos sus datos"
          buttonLabel="Agregar Cliente"
          onClick={onAddCustomer}
        />
        <ActionCard
          icon={<Upload className="h-4 w-4 sm:h-5 sm:w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          title="Importar desde Excel"
          description="Sube tu base de datos de clientes"
          buttonLabel="Importar"
          onClick={onImportCustomers}
        />
      </div>

      {/* Features - Hidden on mobile, visible on tablet+ */}
      <div className="hidden sm:grid grid-cols-3 gap-3 sm:gap-4 w-full max-w-lg">
        <FeatureCard
          icon={TrendingUp}
          title="Health Score"
          description="Monitorea la salud"
        />
        <FeatureCard
          icon={Building2}
          title="Lifecycle"
          description="Visualiza el ciclo"
        />
        <FeatureCard
          icon={Sparkles}
          title="Insights AI"
          description="Recomendaciones"
        />
      </div>
    </div>
  );
});

// ============================================
// Feature Card Sub-component (Responsive)
// ============================================

interface FeatureCardProps {
  icon: typeof Users;
  title: string;
  description: string;
}

const FeatureCard = React.memo(function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <div className={cn(
      'flex flex-col items-center',
      'p-3 sm:p-4 rounded-lg sm:rounded-xl',
      'bg-muted/50',
      'transition-colors duration-200'
    )}>
      <div className={cn(
        'rounded-lg bg-primary/10 flex items-center justify-center mb-1.5 sm:mb-2',
        'w-9 h-9 sm:w-10 sm:h-10'
      )}>
        <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
      </div>
      <h4 className="text-xs sm:text-sm font-medium text-foreground">{title}</h4>
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center">{description}</p>
    </div>
  );
});

// ============================================
// Exports
// ============================================

export default CustomersEmptyState;

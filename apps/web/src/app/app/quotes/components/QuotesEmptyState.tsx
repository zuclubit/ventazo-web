'use client';

/**
 * QuotesEmptyState - Premium empty state for quotes module
 *
 * Displays when no quotes exist with educational CTAs:
 * - Primary: Create first quote
 * - Secondary: Import from template
 */

import * as React from 'react';
import {
  FileText,
  Plus,
  FileInput,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Search,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface QuotesEmptyStateProps {
  onCreateQuote?: () => void;
  onImportTemplate?: () => void;
  variant?: 'default' | 'search';
  searchTerm?: string;
  onClearFilters?: () => void;
  className?: string;
}

// ============================================
// No Results Variant
// ============================================

const NoResultsEmpty = React.memo(function NoResultsEmpty({
  searchTerm,
  onClearFilters,
  onCreateQuote,
  className,
}: Pick<QuotesEmptyStateProps, 'searchTerm' | 'onClearFilters' | 'onCreateQuote' | 'className'>) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'w-full max-w-sm mx-auto',
        'py-8 sm:py-12 px-4 sm:px-6',
        className
      )}
    >
      <div className="relative mb-4 sm:mb-5">
        <div className="absolute inset-0 blur-2xl rounded-full bg-muted opacity-50" />
        <div
          className={cn(
            'relative flex items-center justify-center rounded-full',
            'h-14 w-14 sm:h-16 sm:w-16',
            'border-2 border-dashed border-muted-foreground/20 bg-muted/50'
          )}
        >
          <Search className="h-6 w-6 sm:h-7 sm:w-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 text-foreground">
        Sin resultados
      </h3>
      <p className="text-xs sm:text-sm text-muted-foreground text-center mb-5 sm:mb-6 leading-relaxed">
        No encontramos cotizaciones que coincidan con{' '}
        {searchTerm ? (
          <span className="font-medium text-foreground">"{searchTerm}"</span>
        ) : (
          'los filtros aplicados'
        )}
      </p>

      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3 w-full">
        {onClearFilters && (
          <Button variant="outline" onClick={onClearFilters} className="min-h-[44px] flex-1">
            <X className="mr-2 h-4 w-4" />
            Limpiar filtros
          </Button>
        )}
        {onCreateQuote && (
          <Button onClick={onCreateQuote} className="min-h-[44px] flex-1">
            <Plus className="mr-2 h-4 w-4" />
            Nueva Cotizacion
          </Button>
        )}
      </div>
    </div>
  );
});

// ============================================
// Main Component
// ============================================

export const QuotesEmptyState = React.memo(function QuotesEmptyState({
  onCreateQuote,
  onImportTemplate,
  variant = 'default',
  searchTerm,
  onClearFilters,
  className,
}: QuotesEmptyStateProps) {
  if (variant === 'search' || searchTerm) {
    return (
      <NoResultsEmpty
        searchTerm={searchTerm}
        onClearFilters={onClearFilters}
        onCreateQuote={onCreateQuote}
        className={className}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center',
        'py-8 sm:py-12 md:py-16 px-4 sm:px-6',
        'w-full',
        className
      )}
    >
      {/* Header */}
      <div className="text-center w-full max-w-lg mb-6 sm:mb-8">
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">Crea propuestas profesionales</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold mb-2 sm:mb-3 text-foreground">
          Aun no tienes cotizaciones
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Crea tu primera cotizacion y envialas a tus clientes en minutos.
          Incluye productos, servicios y descuentos automaticamente.
        </p>
      </div>

      {/* Primary CTA Card */}
      <div
        className={cn(
          'relative w-full sm:max-w-md rounded-2xl border-2',
          'p-5 sm:p-6 md:p-8',
          'border-primary/30',
          'bg-gradient-to-br from-primary/5 via-primary/3 to-transparent',
          'transition-all duration-300',
          'hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
          'cursor-pointer group'
        )}
        onClick={onCreateQuote}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onCreateQuote?.();
          }
        }}
      >
        <div className="absolute top-4 right-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl hidden sm:block" />

        <div
          className={cn(
            'flex items-center justify-center rounded-xl sm:rounded-2xl mb-4 sm:mb-5',
            'h-12 w-12 sm:h-14 md:h-16 sm:w-14 md:w-16',
            'bg-primary shadow-lg shadow-primary/30',
            'group-hover:scale-105 transition-transform duration-300'
          )}
        >
          <FileText className="h-6 w-6 sm:h-7 md:h-8 sm:w-7 md:w-8 text-white" />
        </div>

        <h3 className="text-lg sm:text-xl font-semibold mb-1.5 sm:mb-2 text-foreground">
          Crear Cotizacion
        </h3>
        <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-5 leading-relaxed">
          Genera propuestas comerciales profesionales con tu marca,
          productos y terminos personalizados.
        </p>

        <div className="flex flex-col gap-1.5 sm:gap-2 mb-5 sm:mb-6">
          {[
            'Plantillas personalizables',
            'Calculo automatico de impuestos',
            'Envio por email y WhatsApp',
            'Firma digital del cliente',
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              <CheckCircle2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-primary shrink-0" />
              <span>{feature}</span>
            </div>
          ))}
        </div>

        <Button
          size="lg"
          onClick={(e) => {
            e.stopPropagation();
            onCreateQuote?.();
          }}
          className={cn(
            'w-full min-h-[44px] sm:min-h-[48px]',
            'shadow-lg shadow-primary/30',
            'text-sm sm:text-base font-medium',
            'active:scale-[0.98] transition-all duration-200'
          )}
        >
          <Plus className="mr-2 h-4 w-4" />
          Crear mi primera cotizacion
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {/* Divider */}
      <div className="flex items-center gap-4 my-5 sm:my-6 w-full sm:max-w-md">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">o</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* Secondary CTA */}
      <div
        className={cn(
          'flex items-center gap-4 w-full sm:max-w-md',
          'p-4 sm:p-5 rounded-xl border border-border/50',
          'bg-card/50 backdrop-blur-sm',
          'hover:border-primary/20 hover:bg-card/80',
          'transition-all duration-300 cursor-pointer group'
        )}
        onClick={onImportTemplate}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onImportTemplate?.();
          }
        }}
      >
        <div className="flex items-center justify-center h-11 w-11 rounded-lg bg-muted group-hover:bg-primary/10 transition-colors">
          <FileInput className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-sm text-foreground">Usar Plantilla</h3>
          <p className="text-xs text-muted-foreground">
            Comienza desde una plantilla predefinida
          </p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
    </div>
  );
});

QuotesEmptyState.displayName = 'QuotesEmptyState';

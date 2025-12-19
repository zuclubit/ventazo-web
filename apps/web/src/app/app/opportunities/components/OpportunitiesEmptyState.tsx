'use client';

/**
 * OpportunitiesEmptyState Component
 *
 * Educational empty state with hierarchy:
 * - Primary: Create from Lead (conversion funnel)
 * - Secondary: Manual creation and import
 *
 * Based on UX research: Most opportunities come from leads.
 *
 * Homologated with LeadsEmptyState design patterns.
 */

import * as React from 'react';
import {
  Target,
  UserPlus,
  Upload,
  Rocket,
  ArrowRight,
  Zap,
  CheckCircle2,
  Filter,
  Search,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface OpportunitiesEmptyStateProps {
  /** Handler for creating from lead */
  onCreateFromLead?: () => void;
  /** Handler for creating manually */
  onCreateManually?: () => void;
  /** Handler for importing */
  onImport?: () => void;
  /** Handler for viewing leads */
  onViewLeads?: () => void;
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
// Primary CTA Card (Convert from Lead)
// ============================================

interface PrimaryCTACardProps {
  onClick?: () => void;
  onViewLeads?: () => void;
}

function PrimaryCTACard({ onClick, onViewLeads }: PrimaryCTACardProps) {
  return (
    <div
      className={cn(
        'relative w-full max-w-md rounded-2xl border-2 p-8',
        'border-primary/30',
        'bg-gradient-to-br from-primary/5 via-primary/10 to-transparent',
        'transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10',
        'cursor-pointer group'
      )}
      onClick={onClick}
    >
      {/* Decorative gradient orb */}
      <div className="absolute top-4 right-4 h-20 w-20 rounded-full bg-primary/10 blur-2xl" />

      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full border border-primary/30 bg-primary/5">
        <Zap className="h-3.5 w-3.5 text-primary" />
        <span className="text-xs font-medium text-primary">Recomendado</span>
      </div>

      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-5 shadow-lg shadow-primary/30 group-hover:scale-105 transition-transform">
        <Target className="h-8 w-8 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold mb-2">Crear desde Lead</h3>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        Convierte tus leads calificados en oportunidades de venta.
        El mejor camino para cerrar negocios exitosamente.
      </p>

      {/* Features */}
      <div className="flex flex-col gap-2 mb-6">
        {[
          'Hereda datos del lead automaticamente',
          'Rastrea el ciclo de venta completo',
          'Mejora tu tasa de conversion',
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {/* Buttons */}
      <div className="space-y-2">
        <Button
          size="lg"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className="w-full shadow-lg shadow-primary/30"
        >
          Seleccionar Lead
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onViewLeads?.();
          }}
          className="w-full text-muted-foreground"
        >
          Ver todos los leads
          <ArrowRight className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Secondary CTA Card
// ============================================

interface SecondaryCTACardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick?: () => void;
}

function SecondaryCTACard({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
}: SecondaryCTACardProps) {
  return (
    <div
      className={cn(
        'flex-1 min-w-[180px] rounded-xl border border-border/50 p-5',
        'bg-card/50 backdrop-blur-sm',
        'transition-all duration-300 hover:border-primary/20 hover:bg-card/80',
        'cursor-pointer group'
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted mb-3 group-hover:bg-primary/10 transition-colors">
        {icon}
      </div>

      {/* Content */}
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed line-clamp-2">
        {description}
      </p>

      {/* Button */}
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className="w-full group-hover:border-primary/30"
      >
        {buttonLabel}
        <ArrowRight className="ml-2 h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ============================================
// No Results Variant
// ============================================

function NoResultsEmpty({
  searchTerm,
  onClearFilters,
  className,
}: Pick<OpportunitiesEmptyStateProps, 'searchTerm' | 'onClearFilters' | 'className'>) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      {/* Icon */}
      <div className="relative mb-5">
        <div className="absolute inset-0 blur-2xl rounded-full bg-muted opacity-50" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/20 bg-muted/50">
          <Search className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        No encontramos oportunidades que coincidan con{' '}
        {searchTerm ? (
          <span className="font-medium">"{searchTerm}"</span>
        ) : (
          'los filtros aplicados'
        )}
        . Intenta con otros terminos de busqueda.
      </p>

      {/* Action */}
      {onClearFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          <Filter className="mr-2 h-4 w-4" />
          Limpiar filtros
        </Button>
      )}
    </div>
  );
}

// ============================================
// Compact Variant
// ============================================

function CompactEmpty({
  onCreateManually,
  className,
}: Pick<OpportunitiesEmptyStateProps, 'onCreateManually' | 'className'>) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 px-4', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
        <Target className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground mb-3">Sin oportunidades</p>
      {onCreateManually && (
        <Button size="sm" onClick={onCreateManually}>
          <Target className="mr-2 h-4 w-4" />
          Crear Oportunidad
        </Button>
      )}
    </div>
  );
}

// ============================================
// Filtered Empty Variant
// ============================================

function FilteredEmpty({
  onClearFilters,
  className,
}: Pick<OpportunitiesEmptyStateProps, 'onClearFilters' | 'className'>) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      <div className="relative mb-5">
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/20 bg-muted/50">
          <Filter className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>

      <h3 className="text-lg font-semibold mb-2">Sin oportunidades en este estado</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        No hay oportunidades que coincidan con el filtro seleccionado.
      </p>

      {onClearFilters && (
        <Button variant="outline" onClick={onClearFilters}>
          Ver todas las oportunidades
        </Button>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function OpportunitiesEmptyState({
  onCreateFromLead,
  onCreateManually,
  onImport,
  onViewLeads,
  variant = 'default',
  searchTerm,
  onClearFilters,
  className,
}: OpportunitiesEmptyStateProps) {
  // No results variant
  if (variant === 'search' || searchTerm) {
    return (
      <NoResultsEmpty
        searchTerm={searchTerm}
        onClearFilters={onClearFilters}
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
    return <CompactEmpty onCreateManually={onCreateManually} className={className} />;
  }

  // Default full variant
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      {/* Header */}
      <div className="text-center max-w-lg mb-8">
        {/* Motivational Badge */}
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5">
          <Rocket className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">¡Es hora de cerrar ventas!</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold mb-3">
          Tu pipeline esta listo
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Crea tu primera oportunidad y empieza a rastrear tu ciclo de ventas.
          Te recomendamos convertir leads calificados para mejores resultados.
        </p>
      </div>

      {/* PRIMARY Action - Convert from Lead */}
      <PrimaryCTACard onClick={onCreateFromLead} onViewLeads={onViewLeads} />

      {/* Divider */}
      <div className="flex items-center gap-4 my-6 w-full max-w-md">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">o tambien</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* SECONDARY Actions */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        {/* Create Manually */}
        <SecondaryCTACard
          icon={<UserPlus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          title="Crear Manualmente"
          description="Registra una oportunidad con datos personalizados"
          buttonLabel="Crear"
          onClick={onCreateManually}
        />

        {/* Import */}
        <SecondaryCTACard
          icon={<Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          title="Importar desde Excel"
          description="Sube multiples oportunidades en formato CSV"
          buttonLabel="Importar"
          onClick={onImport}
        />
      </div>
    </div>
  );
}

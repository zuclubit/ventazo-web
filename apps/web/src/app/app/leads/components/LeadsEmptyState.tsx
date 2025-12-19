'use client';

/**
 * LeadsEmptyState Component - Redesigned
 *
 * Educational empty state with hierarchy:
 * - WhatsApp as PRIMARY action (large centered card)
 * - Add manually and Import as SECONDARY actions (smaller, below)
 *
 * Based on UX research: WhatsApp is #1 channel in LATAM/Mexico
 */

import * as React from 'react';
import {
  UserPlus,
  MessageCircle,
  Upload,
  Rocket,
  ArrowRight,
  Zap,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export interface LeadsEmptyStateProps {
  /** Handler for adding lead manually */
  onAddLead?: () => void;
  /** Handler for connecting WhatsApp */
  onConnectWhatsApp?: () => void;
  /** Handler for importing from Excel */
  onImport?: () => void;
  /** Variant for different contexts */
  variant?: 'default' | 'compact' | 'search';
  /** Search term (for no results variant) */
  searchTerm?: string;
  /** Clear filters handler */
  onClearFilters?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Primary CTA Card (WhatsApp - Large)
// ============================================

interface PrimaryCTACardProps {
  onClick?: () => void;
}

function PrimaryCTACard({ onClick }: PrimaryCTACardProps) {
  return (
    <div
      className={cn(
        'relative w-full max-w-md rounded-2xl border-2 p-8',
        'border-[var(--whatsapp)]/30',
        'bg-gradient-to-br from-[var(--whatsapp-bg)] via-[var(--whatsapp)]/5 to-transparent',
        'transition-all duration-300 hover:border-[var(--whatsapp)]/50 hover:shadow-lg hover:shadow-[var(--whatsapp)]/10',
        'cursor-pointer group'
      )}
      onClick={onClick}
    >
      {/* Decorative gradient orb */}
      <div className="absolute top-4 right-4 h-20 w-20 rounded-full bg-[var(--whatsapp)]/10 blur-2xl" />

      {/* Badge */}
      <div className="inline-flex items-center gap-1.5 mb-4 px-3 py-1 rounded-full border border-[var(--whatsapp)]/30 bg-[var(--whatsapp-bg)]">
        <Zap className="h-3.5 w-3.5 whatsapp-text" />
        <span className="text-xs font-medium whatsapp-text">Recomendado</span>
      </div>

      {/* Icon */}
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl whatsapp-button mb-5 shadow-lg shadow-[var(--whatsapp)]/30 group-hover:scale-105 transition-transform">
        <MessageCircle className="h-8 w-8 text-white" />
      </div>

      {/* Content */}
      <h3 className="text-xl font-semibold mb-2">Conectar WhatsApp</h3>
      <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
        Recibe leads automáticamente desde WhatsApp Business.
        La forma más rápida de capturar prospectos en México.
      </p>

      {/* Features */}
      <div className="flex flex-col gap-2 mb-6">
        {[
          'Captura automática de contactos',
          'Respuestas instantáneas con IA',
          'Integración sin código',
        ].map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="h-4 w-4 whatsapp-text shrink-0" />
            <span>{feature}</span>
          </div>
        ))}
      </div>

      {/* Button */}
      <Button
        size="lg"
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        className="w-full whatsapp-button shadow-lg shadow-[var(--whatsapp)]/30"
      >
        Conectar ahora
        <ArrowRight className="ml-2 h-4 w-4" />
      </Button>
    </div>
  );
}

// ============================================
// Secondary CTA Card (Smaller)
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
}: Pick<LeadsEmptyStateProps, 'searchTerm' | 'onClearFilters' | 'className'>) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      {/* Icon */}
      <div className="relative mb-5">
        <div className="absolute inset-0 blur-2xl rounded-full bg-muted opacity-50" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-muted-foreground/20 bg-muted/50">
          <UserPlus className="h-7 w-7 text-muted-foreground" strokeWidth={1.5} />
        </div>
      </div>

      {/* Content */}
      <h3 className="text-lg font-semibold mb-2">Sin resultados</h3>
      <p className="text-sm text-muted-foreground text-center max-w-md mb-6">
        No encontramos leads que coincidan con{' '}
        {searchTerm ? (
          <span className="font-medium">"{searchTerm}"</span>
        ) : (
          'los filtros aplicados'
        )}
        . Intenta con otros términos de búsqueda.
      </p>

      {/* Action */}
      {onClearFilters && (
        <Button variant="outline" onClick={onClearFilters}>
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
  onAddLead,
  className,
}: Pick<LeadsEmptyStateProps, 'onAddLead' | 'className'>) {
  return (
    <div className={cn('flex flex-col items-center justify-center py-8 px-4', className)}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 mb-3">
        <UserPlus className="h-5 w-5 text-primary" />
      </div>
      <p className="text-sm text-muted-foreground mb-3">No hay leads</p>
      {onAddLead && (
        <Button size="sm" onClick={onAddLead}>
          <UserPlus className="mr-2 h-4 w-4" />
          Agregar Lead
        </Button>
      )}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function LeadsEmptyState({
  onAddLead,
  onConnectWhatsApp,
  onImport,
  variant = 'default',
  searchTerm,
  onClearFilters,
  className,
}: LeadsEmptyStateProps) {
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

  // Compact variant
  if (variant === 'compact') {
    return <CompactEmpty onAddLead={onAddLead} className={className} />;
  }

  // Default full variant - Redesigned with hierarchy
  return (
    <div className={cn('flex flex-col items-center justify-center py-12 px-4', className)}>
      {/* Header */}
      <div className="text-center max-w-lg mb-8">
        {/* Motivational Badge */}
        <div className="inline-flex items-center gap-2 mb-4 px-4 py-1.5 rounded-full border border-primary/20 bg-primary/5">
          <Rocket className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium text-primary">¡Es hora de conseguir clientes!</span>
        </div>

        {/* Title */}
        <h2 className="text-2xl font-bold mb-3">
          Tu pipeline está listo
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Agrega tu primer lead y empieza a cerrar ventas hoy mismo.
          Te recomendamos conectar WhatsApp para recibir prospectos automáticamente.
        </p>
      </div>

      {/* PRIMARY Action - WhatsApp (Large Card) */}
      <PrimaryCTACard onClick={onConnectWhatsApp} />

      {/* Divider with "o" */}
      <div className="flex items-center gap-4 my-6 w-full max-w-md">
        <div className="flex-1 h-px bg-border" />
        <span className="text-xs text-muted-foreground uppercase tracking-wider">o también</span>
        <div className="flex-1 h-px bg-border" />
      </div>

      {/* SECONDARY Actions (Smaller, in row) */}
      <div className="flex flex-col sm:flex-row gap-4 w-full max-w-md">
        {/* Add Manually */}
        <SecondaryCTACard
          icon={<UserPlus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          title="Agregar Manualmente"
          description="Captura un prospecto con sus datos de contacto"
          buttonLabel="Agregar Lead"
          onClick={onAddLead}
        />

        {/* Import Excel */}
        <SecondaryCTACard
          icon={<Upload className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />}
          title="Importar desde Excel"
          description="Sube tu base de datos en formato CSV o Excel"
          buttonLabel="Importar"
          onClick={onImport}
        />
      </div>
    </div>
  );
}

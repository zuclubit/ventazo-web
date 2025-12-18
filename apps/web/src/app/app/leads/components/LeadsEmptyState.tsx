'use client';

/**
 * LeadsEmptyState Component
 *
 * Educational empty state with 3 CTAs:
 * 1. Add lead manually
 * 2. Connect WhatsApp Business
 * 3. Import from Excel
 */

import * as React from 'react';
import {
  UserPlus,
  MessageCircle,
  Upload,
  Sparkles,
  ArrowRight,
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
// CTA Card Component
// ============================================

interface CTACardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  buttonLabel: string;
  onClick?: () => void;
  variant?: 'primary' | 'whatsapp' | 'secondary';
  disabled?: boolean;
}

function CTACard({
  icon,
  title,
  description,
  buttonLabel,
  onClick,
  variant = 'secondary',
  disabled = false,
}: CTACardProps) {
  const variantStyles = {
    primary: {
      container: 'border-primary/20 bg-primary/5 hover:border-primary/30',
      icon: 'bg-primary/10 text-primary',
      button: 'ventazo-button',
    },
    whatsapp: {
      container: 'border-green-500/20 bg-green-500/5 hover:border-green-500/30',
      icon: 'bg-green-500/10 text-green-500',
      button: 'bg-green-500 hover:bg-green-600 text-white',
    },
    secondary: {
      container: 'border-muted hover:border-muted-foreground/20',
      icon: 'bg-muted text-muted-foreground',
      button: '',
    },
  };

  const styles = variantStyles[variant];

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 transition-all duration-300',
        'flex flex-col items-center text-center',
        styles.container,
        !disabled && onClick && 'cursor-pointer'
      )}
      onClick={!disabled ? onClick : undefined}
    >
      {/* Icon */}
      <div className={cn('rounded-xl p-3 mb-3', styles.icon)}>
        {icon}
      </div>

      {/* Content */}
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
        {description}
      </p>

      {/* Button */}
      <Button
        size="sm"
        variant={variant === 'secondary' ? 'outline' : 'default'}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
        disabled={disabled}
        className={cn('w-full', styles.button)}
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

  // Default full variant
  return (
    <div className={cn('flex flex-col items-center justify-center py-16 px-4', className)}>
      {/* Illustrated Icon */}
      <div className="relative mb-6">
        {/* Background Glow */}
        <div className="absolute inset-0 blur-3xl rounded-full bg-primary/10 opacity-60" />

        {/* Icon Container */}
        <div className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-dashed border-primary/20 bg-primary/5">
          {/* Inner Ring */}
          <div className="absolute inset-3 rounded-full border border-primary/10" />

          {/* Icon */}
          <UserPlus className="h-10 w-10 text-primary" strokeWidth={1.5} />

          {/* Decorative Dots */}
          <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-primary/20" />
          <div className="absolute -bottom-2 -left-2 h-2 w-2 rounded-full bg-primary/15" />
        </div>
      </div>

      {/* Header */}
      <div className="text-center max-w-lg mb-8">
        <div className="inline-flex items-center gap-2 mb-3 px-3 py-1 rounded-full border border-primary/20 bg-primary/5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          <span className="text-xs font-medium text-primary">Empieza a vender</span>
        </div>

        <h2 className="text-xl font-semibold mb-2">
          Comienza a capturar oportunidades
        </h2>
        <p className="text-sm text-muted-foreground leading-relaxed">
          Los leads son el primer paso hacia nuevos clientes. Agrega tu primer prospecto
          manualmente, conecta WhatsApp para recibirlos automáticamente, o importa
          tu base de datos existente.
        </p>
      </div>

      {/* CTA Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full">
        {/* Add Manually */}
        <CTACard
          icon={<UserPlus className="h-5 w-5" />}
          title="Agregar Manualmente"
          description="Captura un nuevo prospecto con sus datos de contacto"
          buttonLabel="Agregar Lead"
          onClick={onAddLead}
          variant="primary"
        />

        {/* Connect WhatsApp */}
        <CTACard
          icon={<MessageCircle className="h-5 w-5" />}
          title="Conectar WhatsApp"
          description="Recibe leads automáticamente desde WhatsApp Business"
          buttonLabel="Conectar"
          onClick={onConnectWhatsApp}
          variant="whatsapp"
        />

        {/* Import Excel */}
        <CTACard
          icon={<Upload className="h-5 w-5" />}
          title="Importar Excel"
          description="Sube tu base de datos desde un archivo CSV o Excel"
          buttonLabel="Importar"
          onClick={onImport}
          variant="secondary"
        />
      </div>
    </div>
  );
}

'use client';

/**
 * EmailEmptyState Component
 *
 * Empty state for the email module when no accounts are connected
 * or no emails are available.
 */

import * as React from 'react';
import { Mail, Inbox, Send, Settings, Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

export type EmailEmptyStateVariant = 'no-accounts' | 'no-emails' | 'no-results';

export interface EmailEmptyStateProps {
  /** Variant type */
  variant: EmailEmptyStateVariant;
  /** Handler for primary action */
  onPrimaryAction?: () => void;
  /** Handler for secondary action */
  onSecondaryAction?: () => void;
  /** Additional CSS classes */
  className?: string;
}

// ============================================
// Configuration
// ============================================

interface VariantConfig {
  icon: React.ReactNode;
  title: string;
  description: string;
  primaryAction?: {
    label: string;
    icon: React.ReactNode;
  };
  secondaryAction?: {
    label: string;
    icon: React.ReactNode;
  };
  features?: string[];
}

const VARIANT_CONFIG: Record<EmailEmptyStateVariant, VariantConfig> = {
  'no-accounts': {
    icon: <Mail className="h-12 w-12" />,
    title: 'Conecta tu correo',
    description:
      'Sincroniza tu cuenta de Gmail o Outlook para gestionar todos tus correos desde el CRM.',
    primaryAction: {
      label: 'Conectar cuenta',
      icon: <Plus className="h-4 w-4" />,
    },
    features: [
      'Sincronización bidireccional con tu correo',
      'Vincula emails con clientes y leads',
      'Plantillas personalizadas para respuestas rápidas',
      'Seguimiento de apertura y clics',
    ],
  },
  'no-emails': {
    icon: <Inbox className="h-12 w-12" />,
    title: 'Sin correos',
    description: 'Tu bandeja de entrada está vacía. ¡Es un buen momento para empezar a conectar!',
    primaryAction: {
      label: 'Redactar correo',
      icon: <Send className="h-4 w-4" />,
    },
    secondaryAction: {
      label: 'Configurar correo',
      icon: <Settings className="h-4 w-4" />,
    },
  },
  'no-results': {
    icon: <Mail className="h-12 w-12" />,
    title: 'Sin resultados',
    description: 'No encontramos correos que coincidan con tu búsqueda. Intenta con otros términos.',
    primaryAction: {
      label: 'Limpiar búsqueda',
      icon: <Mail className="h-4 w-4" />,
    },
  },
};

// ============================================
// Component
// ============================================

export function EmailEmptyState({
  variant,
  onPrimaryAction,
  onSecondaryAction,
  className,
}: EmailEmptyStateProps) {
  const config = VARIANT_CONFIG[variant];

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto',
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
        {config.icon}
      </div>

      {/* Title */}
      <h2 className="text-xl font-semibold mb-2">{config.title}</h2>

      {/* Description */}
      <p className="text-muted-foreground mb-6">{config.description}</p>

      {/* Features List (for no-accounts variant) */}
      {config.features && (
        <ul className="text-left space-y-3 mb-6 w-full">
          {config.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <div className="h-5 w-5 rounded-full bg-[var(--tenant-primary)] text-white flex items-center justify-center shrink-0 mt-0.5 text-xs">
                ✓
              </div>
              <span className="text-sm text-muted-foreground">{feature}</span>
            </li>
          ))}
        </ul>
      )}

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        {config.primaryAction && (
          <Button
            onClick={onPrimaryAction}
            className="gap-2 bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-hover)]"
          >
            {config.primaryAction.icon}
            {config.primaryAction.label}
          </Button>
        )}

        {config.secondaryAction && (
          <Button variant="outline" onClick={onSecondaryAction} className="gap-2">
            {config.secondaryAction.icon}
            {config.secondaryAction.label}
          </Button>
        )}
      </div>
    </div>
  );
}

export default EmailEmptyState;

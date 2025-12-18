// ============================================
// Empty State Component - FASE 5.11
// Consistent empty states across all modules
// Enhanced with Ventazo Design System illustrations
// ============================================

'use client';

import * as React from 'react';

import {
  AlertCircle,
  FileX,
  SearchX,
  UserPlus,
  Users,
  Target,
  ClipboardList,
  Package,
  BarChart3,
  Zap,
  FileText,
  MessageSquare,
  Calendar,
  Plus,
  Upload,
} from 'lucide-react';


import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

import type { LucideIcon } from 'lucide-react';

// ============================================
// Types
// ============================================

export type EmptyStateModuleVariant =
  | 'leads'
  | 'opportunities'
  | 'customers'
  | 'tasks'
  | 'services'
  | 'analytics'
  | 'workflows'
  | 'documents'
  | 'messages'
  | 'calendar'
  | 'search'
  | 'generic';

export interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'muted' | 'dashed';
  /** Module variant for automatic styling */
  moduleVariant?: EmptyStateModuleVariant;
  /** Show import button */
  showImport?: boolean;
  onImport?: () => void;
}

// ============================================
// Module Configuration
// ============================================

interface ModuleConfig {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  color: string;
  bgColor: string;
}

const MODULE_CONFIGS: Record<EmptyStateModuleVariant, ModuleConfig> = {
  leads: {
    icon: UserPlus,
    title: 'No hay leads aún',
    description: 'Comienza a capturar oportunidades. Agrega tu primer lead manualmente o importa desde un archivo.',
    actionLabel: 'Agregar Lead',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  opportunities: {
    icon: Target,
    title: 'Sin oportunidades',
    description: 'Las oportunidades aparecen cuando calificas y conviertes tus leads. ¡Comienza creando tu primer lead!',
    actionLabel: 'Ver Leads',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  customers: {
    icon: Users,
    title: 'Sin clientes',
    description: 'Los clientes se crean cuando cierras oportunidades exitosamente. Sigue trabajando tus leads.',
    actionLabel: 'Ver Oportunidades',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  tasks: {
    icon: ClipboardList,
    title: 'Sin tareas pendientes',
    description: 'Mantén tu trabajo organizado creando tareas y asignándolas a tu equipo.',
    actionLabel: 'Crear Tarea',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
  services: {
    icon: Package,
    title: 'Catálogo vacío',
    description: 'Define los servicios o productos que ofreces para asociarlos a tus oportunidades.',
    actionLabel: 'Agregar Servicio',
    color: 'text-indigo-500',
    bgColor: 'bg-indigo-500/10',
  },
  analytics: {
    icon: BarChart3,
    title: 'Sin datos suficientes',
    description: 'Los análisis se generan cuando tienes actividad en tu CRM. Comienza agregando leads.',
    actionLabel: 'Ir a Leads',
    color: 'text-cyan-500',
    bgColor: 'bg-cyan-500/10',
  },
  workflows: {
    icon: Zap,
    title: 'Sin automatizaciones',
    description: 'Automatiza tareas repetitivas creando flujos de trabajo personalizados.',
    actionLabel: 'Crear Workflow',
    color: 'text-yellow-500',
    bgColor: 'bg-yellow-500/10',
  },
  documents: {
    icon: FileText,
    title: 'Sin documentos',
    description: 'Sube propuestas, contratos y archivos relacionados con tus clientes.',
    actionLabel: 'Subir Documento',
    color: 'text-rose-500',
    bgColor: 'bg-rose-500/10',
  },
  messages: {
    icon: MessageSquare,
    title: 'Bandeja vacía',
    description: 'Las conversaciones con tus leads aparecerán aquí cuando conectes WhatsApp o email.',
    actionLabel: 'Conectar Canal',
    color: 'text-emerald-500',
    bgColor: 'bg-emerald-500/10',
  },
  calendar: {
    icon: Calendar,
    title: 'Sin eventos',
    description: 'Programa reuniones y seguimientos con tus prospectos y clientes.',
    actionLabel: 'Agendar Evento',
    color: 'text-teal-500',
    bgColor: 'bg-teal-500/10',
  },
  search: {
    icon: SearchX,
    title: 'Sin resultados',
    description: 'No encontramos nada con esos filtros. Intenta con otros términos de búsqueda.',
    actionLabel: 'Limpiar Filtros',
    color: 'text-slate-500',
    bgColor: 'bg-slate-500/10',
  },
  generic: {
    icon: Package,
    title: 'Sin elementos',
    description: 'No hay elementos para mostrar en este momento.',
    actionLabel: 'Crear Nuevo',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
};

const sizeConfig = {
  sm: {
    container: 'py-8',
    icon: 'h-8 w-8',
    iconBg: 'p-2',
    title: 'text-base',
    description: 'text-sm',
  },
  md: {
    container: 'py-12',
    icon: 'h-10 w-10',
    iconBg: 'p-3',
    title: 'text-lg',
    description: 'text-sm',
  },
  lg: {
    container: 'py-16',
    icon: 'h-12 w-12',
    iconBg: 'p-4',
    title: 'text-xl',
    description: 'text-base',
  },
};

const variantConfig = {
  default: 'bg-transparent',
  muted: 'bg-muted/50 rounded-lg',
  dashed: 'border-2 border-dashed border-muted-foreground/25 rounded-lg',
};

// ============================================
// Illustrated Icon Component
// ============================================

function IllustratedIcon({
  icon: Icon,
  color,
  bgColor,
  size,
}: {
  icon: LucideIcon;
  color: string;
  bgColor: string;
  size: 'sm' | 'md' | 'lg';
}) {
  const iconSizes = {
    sm: { container: 'h-16 w-16', icon: 'h-7 w-7', dot1: 'h-2 w-2', dot2: 'h-1.5 w-1.5' },
    md: { container: 'h-20 w-20', icon: 'h-9 w-9', dot1: 'h-2.5 w-2.5', dot2: 'h-2 w-2' },
    lg: { container: 'h-24 w-24', icon: 'h-11 w-11', dot1: 'h-3 w-3', dot2: 'h-2 w-2' },
  };

  const s = iconSizes[size];

  return (
    <div className="relative mx-auto mb-5">
      {/* Background Glow */}
      <div className={cn(
        'absolute inset-0 blur-2xl rounded-full opacity-50',
        bgColor
      )} />

      {/* Icon Container */}
      <div className={cn(
        'relative flex items-center justify-center',
        'rounded-full border-2 border-dashed',
        bgColor,
        'border-current/20',
        s.container
      )}>
        {/* Inner Ring */}
        <div className="absolute inset-2 rounded-full border border-current/10" />

        {/* Icon */}
        <Icon className={cn(s.icon, color)} strokeWidth={1.5} />

        {/* Decorative Dots */}
        <div className={cn(
          'absolute -top-0.5 -right-0.5 rounded-full',
          bgColor,
          s.dot1
        )} />
        <div className={cn(
          'absolute -bottom-1 -left-1 rounded-full',
          bgColor,
          'opacity-60',
          s.dot2
        )} />
      </div>
    </div>
  );
}

// ============================================
// Main Empty State Component
// ============================================

export function EmptyState({
  icon: ProvidedIcon,
  title,
  description,
  action,
  secondaryAction,
  className,
  size = 'md',
  variant = 'default',
  moduleVariant,
  showImport = false,
  onImport,
}: EmptyStateProps) {
  const sizes = sizeConfig[size];
  const variantClass = variantConfig[variant];

  // Get module config if provided
  const moduleConfig = moduleVariant ? MODULE_CONFIGS[moduleVariant] : null;

  // Determine icon, color, bgColor from module or defaults
  const Icon = ProvidedIcon || moduleConfig?.icon || Package;
  const color = moduleConfig?.color || 'text-muted-foreground';
  const bgColor = moduleConfig?.bgColor || 'bg-muted';

  // For module variants, create action from config if not provided
  const effectiveAction = action || (moduleConfig && {
    label: moduleConfig.actionLabel,
    onClick: () => {},
    icon: Plus,
  });

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center text-center animate-in',
        sizes.container,
        variantClass,
        className
      )}
    >
      {/* Illustrated Icon */}
      <IllustratedIcon
        icon={Icon}
        color={color}
        bgColor={bgColor}
        size={size}
      />

      <h3 className={cn('font-semibold text-foreground mb-2', sizes.title)}>
        {title}
      </h3>

      <p className={cn('text-muted-foreground max-w-md mb-6', sizes.description)}>
        {description}
      </p>

      {(effectiveAction || secondaryAction || showImport) && (
        <div className="flex flex-col sm:flex-row items-center gap-3">
          {effectiveAction && effectiveAction.onClick && (
            <Button
              size={size === 'sm' ? 'sm' : 'default'}
              onClick={effectiveAction.onClick}
              className="ventazo-button min-w-[140px]"
            >
              {effectiveAction.icon && <effectiveAction.icon className="mr-2 h-4 w-4" />}
              {effectiveAction.label}
            </Button>
          )}

          {showImport && onImport && (
            <Button
              size={size === 'sm' ? 'sm' : 'default'}
              variant="outline"
              onClick={onImport}
            >
              <Upload className="mr-2 h-4 w-4" />
              Importar
            </Button>
          )}

          {secondaryAction && (
            <Button
              size={size === 'sm' ? 'sm' : 'default'}
              variant="ghost"
              onClick={secondaryAction.onClick}
            >
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// Preset empty states for common scenarios
export function NoDataEmpty({
  title = 'Sin datos',
  description = 'No hay datos para mostrar en este momento.',
  icon = FileX,
  ...props
}: Partial<EmptyStateProps>) {
  return (
    <EmptyState
      description={description}
      icon={icon}
      title={title}
      {...props}
    />
  );
}

export function NoResultsEmpty({
  title = 'Sin resultados',
  description = 'No se encontraron resultados para tu búsqueda. Intenta con otros términos.',
  onClearFilters,
  ...props
}: Partial<EmptyStateProps> & { onClearFilters?: () => void }) {
  return (
    <EmptyState
      action={onClearFilters ? { label: 'Limpiar filtros', onClick: onClearFilters } : undefined}
      description={description}
      icon={SearchX}
      title={title}
      {...props}
    />
  );
}

export function ErrorEmpty({
  title = 'Algo salió mal',
  description = 'Ocurrió un error al cargar los datos. Por favor, intenta de nuevo.',
  onRetry,
  ...props
}: Partial<EmptyStateProps> & { onRetry?: () => void }) {
  return (
    <EmptyState
      action={onRetry ? { label: 'Reintentar', onClick: onRetry } : undefined}
      description={description}
      icon={AlertCircle}
      title={title}
      variant="dashed"
      {...props}
    />
  );
}

'use client';

/**
 * Tool Results Display Component
 *
 * Visualizes CRM tool execution results from the AI assistant.
 * Shows executed actions, results, and provides quick navigation to entities.
 *
 * @module app/app/assistant/components/ToolResultsDisplay
 */

import * as React from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  Users,
  Target,
  CheckSquare,
  FileText,
  TrendingUp,
  Mail,
  Building2,
  Clock,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';

// ============================================
// Types
// ============================================

interface ToolExecution {
  sequence: number;
  toolName: string;
  parameters: Record<string, unknown>;
  success: boolean;
  result?: unknown;
  error?: string;
  executionTimeMs: number;
}

interface ToolResultsDisplayProps {
  executedActions?: ToolExecution[];
  isExecuting?: boolean;
  className?: string;
}

interface ToolConfigItem {
  icon: React.ElementType;
  label: string;
  color: string;
  entityType?: string;
  entityPath?: string;
}

// ============================================
// Tool Icons & Labels
// ============================================

const TOOL_CONFIG: Record<string, ToolConfigItem> = {
  crm_lead_search: {
    icon: Users,
    label: 'Buscar Leads',
    color: 'text-blue-400',
    entityType: 'lead',
    entityPath: '/app/leads',
  },
  crm_lead_create: {
    icon: Users,
    label: 'Crear Lead',
    color: 'text-emerald-400',
    entityType: 'lead',
    entityPath: '/app/leads',
  },
  crm_lead_update: {
    icon: Users,
    label: 'Actualizar Lead',
    color: 'text-amber-400',
    entityType: 'lead',
    entityPath: '/app/leads',
  },
  crm_lead_get: {
    icon: Users,
    label: 'Obtener Lead',
    color: 'text-blue-400',
    entityType: 'lead',
    entityPath: '/app/leads',
  },
  crm_opportunity_search: {
    icon: Target,
    label: 'Buscar Oportunidades',
    color: 'text-purple-400',
    entityType: 'opportunity',
    entityPath: '/app/opportunities',
  },
  crm_opportunity_create: {
    icon: Target,
    label: 'Crear Oportunidad',
    color: 'text-emerald-400',
    entityType: 'opportunity',
    entityPath: '/app/opportunities',
  },
  crm_opportunity_update: {
    icon: Target,
    label: 'Actualizar Oportunidad',
    color: 'text-amber-400',
    entityType: 'opportunity',
    entityPath: '/app/opportunities',
  },
  crm_task_search: {
    icon: CheckSquare,
    label: 'Buscar Tareas',
    color: 'text-cyan-400',
    entityType: 'task',
    entityPath: '/app/tasks',
  },
  crm_task_create: {
    icon: CheckSquare,
    label: 'Crear Tarea',
    color: 'text-emerald-400',
    entityType: 'task',
    entityPath: '/app/tasks',
  },
  crm_customer_search: {
    icon: Building2,
    label: 'Buscar Clientes',
    color: 'text-indigo-400',
    entityType: 'customer',
    entityPath: '/app/customers',
  },
  crm_customer_create: {
    icon: Building2,
    label: 'Crear Cliente',
    color: 'text-emerald-400',
    entityType: 'customer',
    entityPath: '/app/customers',
  },
  crm_quote_create: {
    icon: FileText,
    label: 'Crear Cotizacion',
    color: 'text-orange-400',
    entityType: 'quote',
  },
  crm_pipeline_list: {
    icon: TrendingUp,
    label: 'Listar Pipelines',
    color: 'text-pink-400',
  },
  crm_email_send: {
    icon: Mail,
    label: 'Enviar Email',
    color: 'text-sky-400',
  },
};

const DEFAULT_TOOL_CONFIG: ToolConfigItem = {
  icon: Clock,
  label: 'Accion',
  color: 'text-muted-foreground',
};

// ============================================
// Helper Functions
// ============================================

function getToolConfig(toolName: string): ToolConfigItem {
  return TOOL_CONFIG[toolName] || {
    ...DEFAULT_TOOL_CONFIG,
    label: toolName.replace(/^crm_/, '').replace(/_/g, ' '),
  };
}

function formatExecutionTime(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function extractEntityId(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null;

  const obj = result as Record<string, unknown>;

  // Direct ID
  const directId = obj['id'];
  if (typeof directId === 'string') return directId;

  // Nested data
  const data = obj['data'];
  if (data && typeof data === 'object') {
    const dataObj = data as Record<string, unknown>;
    const dataId = dataObj['id'];
    if (typeof dataId === 'string') return dataId;
  }

  return null;
}

function extractResultCount(result: unknown): number | null {
  if (!result || typeof result !== 'object') return null;

  const obj = result as Record<string, unknown>;

  // Array of results
  const data = obj['data'];
  if (Array.isArray(data)) return data.length;

  // Meta with total
  const meta = obj['meta'];
  if (meta && typeof meta === 'object') {
    const metaObj = meta as Record<string, unknown>;
    const metaTotal = metaObj['total'];
    if (typeof metaTotal === 'number') return metaTotal;
  }

  // Direct total
  const total = obj['total'];
  if (typeof total === 'number') return total;

  return null;
}

// ============================================
// Individual Tool Result Card
// ============================================

interface ToolResultCardProps {
  execution: ToolExecution;
}

function ToolResultCard({ execution }: ToolResultCardProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const config = getToolConfig(execution.toolName);
  const Icon = config.icon;

  const entityId = extractEntityId(execution.result);
  const resultCount = extractResultCount(execution.result);

  const entityLink = entityId && config.entityPath
    ? `${config.entityPath}/${entityId}`
    : null;

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <div
        className={cn(
          'rounded-lg border transition-colors',
          execution.success
            ? 'border-border/50 bg-card/50'
            : 'border-destructive/30 bg-destructive/5'
        )}
      >
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/50 rounded-lg transition-colors">
            {/* Status Icon */}
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg shrink-0',
                execution.success ? 'bg-emerald-500/10' : 'bg-destructive/10'
              )}
            >
              {execution.success ? (
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              ) : (
                <XCircle className="h-4 w-4 text-destructive" />
              )}
            </div>

            {/* Tool Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <Icon className={cn('h-4 w-4', config.color)} />
                <span className="font-medium text-sm">{config.label}</span>
                {resultCount !== null && (
                  <Badge variant="secondary" className="text-[10px] h-5">
                    {resultCount} resultado{resultCount !== 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {execution.success
                  ? `Completado en ${formatExecutionTime(execution.executionTimeMs)}`
                  : execution.error || 'Error en la ejecución - ver detalles'}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              {entityLink && (
                <Button
                  variant="ghost"
                  size="sm"
                  asChild
                  className="h-7 px-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Link href={entityLink}>
                    <ExternalLink className="h-3.5 w-3.5 mr-1" />
                    Ver
                  </Link>
                </Button>
              )}
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Details */}
        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-3 border-t border-border/50 pt-3 mx-3">
            {/* Parameters */}
            {Object.keys(execution.parameters).length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Parametros
                </p>
                <div className="bg-muted/50 rounded-md p-2 overflow-x-auto">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(execution.parameters, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Result Preview */}
            {execution.success && execution.result && (
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                  Resultado
                </p>
                <div className="bg-muted/50 rounded-md p-2 overflow-x-auto max-h-32">
                  <pre className="text-xs text-muted-foreground whitespace-pre-wrap">
                    {JSON.stringify(execution.result, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {/* Error Details */}
            {!execution.success && execution.error && (
              <div>
                <p className="text-xs font-medium text-destructive mb-1.5">
                  Error
                </p>
                <p className="text-xs text-muted-foreground bg-destructive/5 rounded-md p-2">
                  {execution.error}
                </p>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
}

// ============================================
// Main Component
// ============================================

export function ToolResultsDisplay({
  executedActions,
  isExecuting,
  className,
}: ToolResultsDisplayProps) {
  if (!executedActions?.length && !isExecuting) return null;

  const successCount = executedActions?.filter((a) => a.success).length || 0;
  const failCount = executedActions?.filter((a) => !a.success).length || 0;

  return (
    <div className={cn('space-y-3', className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-[10px] gap-1">
            <Clock className="h-3 w-3" />
            Acciones ejecutadas
          </Badge>
          {successCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] border-emerald-500/50 text-emerald-400"
            >
              {successCount} exitosa{successCount !== 1 ? 's' : ''}
            </Badge>
          )}
          {failCount > 0 && (
            <Badge
              variant="outline"
              className="text-[10px] border-destructive/50 text-destructive"
            >
              {failCount} fallida{failCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </div>

      {/* Executing Indicator */}
      {isExecuting && (
        <div className="flex items-center gap-2 p-3 rounded-lg border border-[var(--tenant-primary)]/30 bg-[var(--tenant-primary)]/5">
          <Loader2 className="h-4 w-4 animate-spin text-[var(--tenant-primary)]" />
          <span className="text-sm text-[var(--tenant-primary)]">
            Ejecutando herramientas CRM...
          </span>
        </div>
      )}

      {/* Tool Results */}
      {executedActions?.map((execution, idx) => (
        <ToolResultCard key={`${execution.toolName}-${idx}`} execution={execution} />
      ))}
    </div>
  );
}

export default ToolResultsDisplay;

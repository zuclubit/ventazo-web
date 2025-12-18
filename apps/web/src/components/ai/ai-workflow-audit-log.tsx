'use client';

// ============================================
// FASE 6.2 — AI Workflow Audit Log Component
// Displays audit log for AI actions in workflows
// ============================================

import * as React from 'react';

import { formatDistanceToNow, format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  ArrowRight,
  Brain,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FileSearch,
  FileText,
  Filter,
  History,
  Info,
  Loader2,
  MessageSquare,
  RefreshCw,
  Search,
  Sparkles,
  Star,
  Tag,
  Target,
  TrendingUp,
  UserCheck,
  XCircle,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AI_WORKFLOW_ACTION_LABELS,
  type AIWorkflowAction,
  type AIWorkflowAuditEntry,
} from '@/lib/ai-actions/types';

// ============================================
// Icons Map
// ============================================

const ACTION_ICONS: Record<AIWorkflowAction, React.ElementType> = {
  ai_create_note: FileText,
  ai_classify_lead: Tag,
  ai_score_lead: Star,
  ai_generate_followup: MessageSquare,
  ai_enrich_lead: Sparkles,
  ai_auto_stage: ArrowRight,
  ai_auto_assign: UserCheck,
  ai_generate_summary: FileSearch,
  ai_predict_conversion: TrendingUp,
  ai_detect_intent: Target,
};

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG = {
  initiated: {
    label: 'Iniciado',
    color: 'bg-blue-100 text-blue-700',
    icon: Clock,
  },
  processing: {
    label: 'Procesando',
    color: 'bg-yellow-100 text-yellow-700',
    icon: Loader2,
  },
  completed: {
    label: 'Completado',
    color: 'bg-green-100 text-green-700',
    icon: CheckCircle,
  },
  failed: {
    label: 'Fallido',
    color: 'bg-red-100 text-red-700',
    icon: XCircle,
  },
  cancelled: {
    label: 'Cancelado',
    color: 'bg-gray-100 text-gray-700',
    icon: AlertCircle,
  },
} as const;

// ============================================
// Single Audit Entry Component
// ============================================

interface AIAuditLogEntryProps {
  entry: AIWorkflowAuditEntry;
  onViewEntity?: (entityType: string, entityId: string) => void;
}

export function AIAuditLogEntry({ entry, onViewEntity }: AIAuditLogEntryProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const Icon = ACTION_ICONS[entry.action] ?? Brain;
  const statusConfig = STATUS_CONFIG[entry.status];
  const StatusIcon = statusConfig.icon;

  const copyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
  };

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <Card className={`transition-all ${entry.status === 'failed' ? 'border-red-200' : ''}`}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div className="rounded-lg bg-purple-100 p-2">
              <Icon className="h-4 w-4 text-purple-600" />
            </div>

            {/* Main Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">
                  {AI_WORKFLOW_ACTION_LABELS[entry.action]}
                </span>
                <Badge className={statusConfig.color} variant="secondary">
                  <StatusIcon
                    className={`h-3 w-3 mr-1 ${entry.status === 'processing' ? 'animate-spin' : ''}`}
                  />
                  {statusConfig.label}
                </Badge>
                {entry.aiDetails.confidence !== undefined && (
                  <Badge className="bg-purple-100 text-purple-700" variant="outline">
                    {(entry.aiDetails.confidence * 100).toFixed(0)}% confianza
                  </Badge>
                )}
              </div>

              {/* Entity & Timestamp */}
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span>{entry.entityType}</span>
                <span>•</span>
                {onViewEntity ? (
                  <button
                    className="text-primary hover:underline flex items-center gap-1"
                    onClick={() => onViewEntity(entry.entityType, entry.entityId)}
                  >
                    {entry.entityId.slice(0, 8)}...
                    <ExternalLink className="h-3 w-3" />
                  </button>
                ) : (
                  <span>{entry.entityId.slice(0, 8)}...</span>
                )}
                <span>•</span>
                <span>
                  {formatDistanceToNow(new Date(entry.timing.startedAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </span>
                {entry.timing.durationMs && (
                  <>
                    <span>•</span>
                    <span>{entry.timing.durationMs}ms</span>
                  </>
                )}
              </div>

              {/* Decision Summary */}
              {entry.aiDetails.decision && !isExpanded && (
                <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
                  {entry.aiDetails.decision}
                </p>
              )}

              {/* Error Message */}
              {entry.status === 'failed' && entry.output?.error && (
                <div className="mt-2 rounded bg-red-50 p-2 text-xs text-red-700">
                  {entry.output.error}
                </div>
              )}
            </div>

            {/* Expand Button */}
            <CollapsibleTrigger asChild>
              <Button size="icon" variant="ghost">
                {isExpanded ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
          </div>

          {/* Expanded Content */}
          <CollapsibleContent className="mt-4">
            <Separator className="mb-4" />

            <div className="space-y-4">
              {/* AI Details */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Detalles de IA
                  </h4>
                  <div className="space-y-2">
                    {entry.aiDetails.provider && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Proveedor:</span>
                        <span>{entry.aiDetails.provider}</span>
                      </div>
                    )}
                    {entry.aiDetails.model && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Modelo:</span>
                        <span>{entry.aiDetails.model}</span>
                      </div>
                    )}
                    {entry.aiDetails.tokensUsed !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Tokens:</span>
                        <span>{entry.aiDetails.tokensUsed}</span>
                      </div>
                    )}
                    {entry.aiDetails.confidence !== undefined && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Confianza:</span>
                        <span>{(entry.aiDetails.confidence * 100).toFixed(1)}%</span>
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Timing
                  </h4>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Inicio:</span>
                      <span>{format(new Date(entry.timing.startedAt), 'HH:mm:ss', { locale: es })}</span>
                    </div>
                    {entry.timing.completedAt && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Fin:</span>
                        <span>{format(new Date(entry.timing.completedAt), 'HH:mm:ss', { locale: es })}</span>
                      </div>
                    )}
                    {entry.timing.durationMs && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Duración:</span>
                        <span>{entry.timing.durationMs}ms</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Prompt Summary */}
              {entry.aiDetails.promptSummary && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 flex items-center gap-2">
                    Resumen del Prompt
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Copy
                            className="h-3 w-3 cursor-pointer"
                            onClick={() => copyToClipboard(entry.aiDetails.promptSummary || '')}
                          />
                        </TooltipTrigger>
                        <TooltipContent>Copiar</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </h4>
                  <div className="bg-muted/50 rounded-md p-2 text-xs font-mono">
                    {entry.aiDetails.promptSummary}
                  </div>
                </div>
              )}

              {/* Decision & Reasoning */}
              {(entry.aiDetails.decision || entry.aiDetails.reasoning) && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Decisión y Razonamiento
                  </h4>
                  <div className="bg-muted/50 rounded-md p-2 space-y-2">
                    {entry.aiDetails.decision && (
                      <div>
                        <span className="text-xs font-medium">Decisión: </span>
                        <span className="text-xs">{entry.aiDetails.decision}</span>
                      </div>
                    )}
                    {entry.aiDetails.reasoning && (
                      <div>
                        <span className="text-xs font-medium">Razonamiento: </span>
                        <span className="text-xs text-muted-foreground">
                          {entry.aiDetails.reasoning}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Applied Changes */}
              {entry.appliedChanges && (
                <div>
                  <h4 className="text-xs font-medium text-muted-foreground mb-2">
                    Cambios Aplicados
                  </h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {entry.appliedChanges.before && (
                      <div className="bg-red-50 rounded-md p-2">
                        <span className="text-xs font-medium text-red-700">Antes:</span>
                        <pre className="text-xs mt-1 overflow-auto">
                          {JSON.stringify(entry.appliedChanges.before, null, 2)}
                        </pre>
                      </div>
                    )}
                    {entry.appliedChanges.after && (
                      <div className="bg-green-50 rounded-md p-2">
                        <span className="text-xs font-medium text-green-700">Después:</span>
                        <pre className="text-xs mt-1 overflow-auto">
                          {JSON.stringify(entry.appliedChanges.after, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* IDs */}
              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <span>ID:</span>
                  <code className="bg-muted px-1 rounded">{entry.id.slice(0, 12)}...</code>
                </div>
                {entry.workflowId && (
                  <div className="flex items-center gap-1">
                    <span>Workflow:</span>
                    <code className="bg-muted px-1 rounded">{entry.workflowId.slice(0, 8)}...</code>
                  </div>
                )}
                {entry.executionId && (
                  <div className="flex items-center gap-1">
                    <span>Ejecución:</span>
                    <code className="bg-muted px-1 rounded">{entry.executionId.slice(0, 8)}...</code>
                  </div>
                )}
              </div>
            </div>
          </CollapsibleContent>
        </CardContent>
      </Card>
    </Collapsible>
  );
}

// ============================================
// Audit Log Stats Component
// ============================================

interface AIAuditLogStatsProps {
  entries: AIWorkflowAuditEntry[];
}

export function AIAuditLogStats({ entries }: AIAuditLogStatsProps) {
  const stats = React.useMemo(() => {
    const completed = entries.filter(e => e.status === 'completed').length;
    const failed = entries.filter(e => e.status === 'failed').length;
    const processing = entries.filter(e => e.status === 'processing').length;

    const totalDuration = entries
      .filter(e => e.timing.durationMs)
      .reduce((sum, e) => sum + (e.timing.durationMs || 0), 0);
    const avgDuration = entries.length > 0 ? totalDuration / entries.filter(e => e.timing.durationMs).length : 0;

    const totalTokens = entries
      .filter(e => e.aiDetails.tokensUsed)
      .reduce((sum, e) => sum + (e.aiDetails.tokensUsed || 0), 0);

    const avgConfidence = entries
      .filter(e => e.aiDetails.confidence !== undefined)
      .reduce((sum, e, _, arr) => sum + (e.aiDetails.confidence || 0) / arr.length, 0);

    // Actions by type
    const actionCounts: Record<string, number> = {};
    entries.forEach(e => {
      actionCounts[e.action] = (actionCounts[e.action] || 0) + 1;
    });

    return {
      total: entries.length,
      completed,
      failed,
      processing,
      successRate: entries.length > 0 ? (completed / entries.length) * 100 : 0,
      avgDuration: Math.round(avgDuration),
      totalTokens,
      avgConfidence: avgConfidence * 100,
      actionCounts,
    };
  }, [entries]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <History className="h-4 w-4 text-purple-600" />
          Estadísticas de Auditoría AI
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-xs text-muted-foreground">Total</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{stats.successRate.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Éxito</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{stats.avgConfidence.toFixed(0)}%</div>
            <div className="text-xs text-muted-foreground">Confianza</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold">{stats.avgDuration}ms</div>
            <div className="text-xs text-muted-foreground">Latencia</div>
          </div>
        </div>

        <Separator className="my-4" />

        <div>
          <h4 className="text-xs font-medium text-muted-foreground mb-2">Por tipo de acción</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.actionCounts).map(([action, count]) => (
              <Badge key={action} variant="outline">
                {AI_WORKFLOW_ACTION_LABELS[action as AIWorkflowAction] || action}: {count}
              </Badge>
            ))}
          </div>
        </div>

        {stats.totalTokens > 0 && (
          <div className="mt-3 text-xs text-muted-foreground">
            Total tokens utilizados: <span className="font-medium">{stats.totalTokens.toLocaleString()}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Audit Log Component
// ============================================

interface AIWorkflowAuditLogProps {
  entries: AIWorkflowAuditEntry[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onViewEntity?: (entityType: string, entityId: string) => void;
  showStats?: boolean;
  maxHeight?: string;
}

export function AIWorkflowAuditLog({
  entries,
  isLoading,
  onRefresh,
  onViewEntity,
  showStats = true,
  maxHeight = '600px',
}: AIWorkflowAuditLogProps) {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<Set<string>>(new Set());
  const [actionFilter, setActionFilter] = React.useState<Set<string>>(new Set());

  const filteredEntries = React.useMemo(() => {
    return entries.filter(entry => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchesSearch =
          entry.entityId.toLowerCase().includes(query) ||
          entry.aiDetails.decision?.toLowerCase().includes(query) ||
          entry.aiDetails.reasoning?.toLowerCase().includes(query) ||
          AI_WORKFLOW_ACTION_LABELS[entry.action].toLowerCase().includes(query);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (statusFilter.size > 0 && !statusFilter.has(entry.status)) {
        return false;
      }

      // Action filter
      if (actionFilter.size > 0 && !actionFilter.has(entry.action)) {
        return false;
      }

      return true;
    });
  }, [entries, searchQuery, statusFilter, actionFilter]);

  const toggleStatusFilter = (status: string) => {
    const newFilter = new Set(statusFilter);
    if (newFilter.has(status)) {
      newFilter.delete(status);
    } else {
      newFilter.add(status);
    }
    setStatusFilter(newFilter);
  };

  const toggleActionFilter = (action: string) => {
    const newFilter = new Set(actionFilter);
    if (newFilter.has(action)) {
      newFilter.delete(action);
    } else {
      newFilter.add(action);
    }
    setActionFilter(newFilter);
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {showStats && entries.length > 0 && <AIAuditLogStats entries={entries} />}

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-purple-600" />
                Historial de Acciones AI
              </CardTitle>
              <CardDescription>
                Registro detallado de todas las acciones de IA ejecutadas
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {onRefresh && (
                <Button size="sm" variant="outline" onClick={onRefresh}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-2 mt-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar en el historial..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Filter className="h-4 w-4 mr-1" />
                  Estado
                  {statusFilter.size > 0 && (
                    <Badge className="ml-1" variant="secondary">
                      {statusFilter.size}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filtrar por estado</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(STATUS_CONFIG).map(([status, config]) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={statusFilter.has(status)}
                    onCheckedChange={() => toggleStatusFilter(status)}
                  >
                    <Badge className={`${config.color} mr-2`} variant="secondary">
                      {config.label}
                    </Badge>
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline">
                  <Zap className="h-4 w-4 mr-1" />
                  Acción
                  {actionFilter.size > 0 && (
                    <Badge className="ml-1" variant="secondary">
                      {actionFilter.size}
                    </Badge>
                  )}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Filtrar por acción</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {Object.entries(AI_WORKFLOW_ACTION_LABELS).map(([action, label]) => (
                  <DropdownMenuCheckboxItem
                    key={action}
                    checked={actionFilter.has(action)}
                    onCheckedChange={() => toggleActionFilter(action)}
                  >
                    {label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent>
          {filteredEntries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <History className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="font-medium">Sin registros</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {entries.length === 0
                  ? 'Las acciones de IA aparecerán aquí cuando se ejecuten'
                  : 'No se encontraron registros con los filtros aplicados'}
              </p>
            </div>
          ) : (
            <ScrollArea style={{ maxHeight }}>
              <div className="space-y-3 pr-4">
                {filteredEntries.map((entry) => (
                  <AIAuditLogEntry
                    key={entry.id}
                    entry={entry}
                    onViewEntity={onViewEntity}
                  />
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Disclaimer */}
      <div className="rounded-lg bg-muted/50 p-3">
        <div className="flex items-start gap-2">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong>Aviso:</strong> Este registro contiene información de auditoría de
            todas las acciones de IA. Los prompts y decisiones se almacenan de forma
            resumida para revisión. Los datos sensibles son ofuscados automáticamente.
          </p>
        </div>
      </div>
    </div>
  );
}

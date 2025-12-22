'use client';

// ============================================
// FASE 6.2 — AI Suggested Actions Panel
// Shows AI-generated action suggestions for entities
// ============================================

import * as React from 'react';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  FileSearch,
  FileText,
  Info,
  Lightbulb,
  Loader2,
  MessageSquare,
  RefreshCw,
  Sparkles,
  Star,
  Tag,
  Target,
  TrendingUp,
  UserCheck,
  X,
  XCircle,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Progress } from '@/components/ui/progress';
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
  type AISuggestion,
  type AIWorkflowAction,
} from '@/lib/ai-actions/types';

// ============================================
// Icons Map
// ============================================

const SUGGESTION_ICONS: Record<AIWorkflowAction, React.ElementType> = {
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
// Priority & Impact Configuration
// ============================================

const PRIORITY_CONFIG = {
  critical: {
    label: 'Crítico',
    color: 'text-red-700 bg-red-100 border-red-200',
    icon: Zap,
  },
  high: {
    label: 'Alto',
    color: 'text-orange-700 bg-orange-100 border-orange-200',
    icon: ArrowRight,
  },
  medium: {
    label: 'Medio',
    color: 'text-yellow-700 bg-yellow-100 border-yellow-200',
    icon: Clock,
  },
  low: {
    label: 'Bajo',
    color: 'text-green-700 bg-green-100 border-green-200',
    icon: Info,
  },
} as const;

const IMPACT_CONFIG = {
  high: { label: 'Alto impacto', color: 'text-emerald-600' },
  medium: { label: 'Impacto medio', color: 'text-blue-600' },
  low: { label: 'Bajo impacto', color: 'text-gray-600' },
} as const;

// ============================================
// Single Suggestion Card
// ============================================

interface SuggestionCardProps {
  suggestion: AISuggestion;
  onApply: () => void;
  onDismiss: () => void;
  isApplying?: boolean;
}

function SuggestionCard({
  suggestion,
  onApply,
  onDismiss,
  isApplying,
}: SuggestionCardProps) {
  const [isExpanded, setIsExpanded] = React.useState(false);

  const Icon = SUGGESTION_ICONS[suggestion.action] ?? Lightbulb;
  const priorityConfig = PRIORITY_CONFIG[suggestion.priority];
  const impactConfig = IMPACT_CONFIG[suggestion.impact];
  const PriorityIcon = priorityConfig.icon;

  const isExpired = suggestion.expiresAt && new Date(suggestion.expiresAt) < new Date();
  const isActionable = suggestion.status === 'pending' && !isExpired;

  return (
    <Card
      className={`transition-all ${
        suggestion.priority === 'critical'
          ? 'border-red-300 bg-red-50/50'
          : suggestion.priority === 'high'
            ? 'border-orange-200'
            : ''
      }`}
    >
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            {/* Icon */}
            <div
              className={`rounded-lg p-2 ${
                suggestion.priority === 'critical'
                  ? 'bg-red-100'
                  : suggestion.priority === 'high'
                    ? 'bg-orange-100'
                    : 'bg-purple-100'
              }`}
            >
              <Icon
                className={`h-4 w-4 ${
                  suggestion.priority === 'critical'
                    ? 'text-red-600'
                    : suggestion.priority === 'high'
                      ? 'text-orange-600'
                      : 'text-purple-600'
                }`}
              />
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-sm truncate">{suggestion.title}</h4>
                <Badge className={`text-xs ${priorityConfig.color}`} variant="outline">
                  <PriorityIcon className="h-3 w-3 mr-1" />
                  {priorityConfig.label}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground line-clamp-2">
                {suggestion.description}
              </p>

              {/* Confidence & Impact */}
              <div className="flex items-center gap-4 mt-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-1.5">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 rounded-full"
                            style={{ width: `${suggestion.confidence * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {(suggestion.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Confianza de la sugerencia</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>

                <span className={`text-xs ${impactConfig.color}`}>
                  {impactConfig.label}
                </span>

                {suggestion.expiresAt && !isExpired && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Expira {formatDistanceToNow(new Date(suggestion.expiresAt), {
                      addSuffix: true,
                      locale: es,
                    })}
                  </span>
                )}
              </div>

              {/* Expanded Content */}
              <CollapsibleContent className="mt-3">
                <Separator className="mb-3" />

                <div className="space-y-3">
                  {/* Reasoning */}
                  <div>
                    <Label className="text-xs font-medium text-muted-foreground">
                      Razonamiento IA
                    </Label>
                    <p className="text-sm mt-1 bg-muted/50 rounded-md p-2">
                      {suggestion.reasoning}
                    </p>
                  </div>

                  {/* Suggested Changes */}
                  {suggestion.suggestedChanges && Object.keys(suggestion.suggestedChanges).length > 0 && (
                    <div>
                      <Label className="text-xs font-medium text-muted-foreground">
                        Cambios sugeridos
                      </Label>
                      <div className="mt-1 space-y-1">
                        {Object.entries(suggestion.suggestedChanges).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-center justify-between text-xs bg-muted/50 rounded px-2 py-1"
                          >
                            <span className="text-muted-foreground">{key}:</span>
                            <span className="font-medium">
                              {value !== null && typeof value === 'object'
                                ? JSON.stringify(value)
                                : String(value ?? '')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Status */}
                  {suggestion.status !== 'pending' && (
                    <div className="flex items-center gap-2">
                      {suggestion.status === 'applied' && (
                        <Badge className="bg-green-100 text-green-700">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Aplicado
                        </Badge>
                      )}
                      {suggestion.status === 'dismissed' && (
                        <Badge className="bg-gray-100 text-gray-700">
                          <XCircle className="h-3 w-3 mr-1" />
                          Descartado
                        </Badge>
                      )}
                      {suggestion.status === 'expired' && (
                        <Badge className="bg-yellow-100 text-yellow-700">
                          <Clock className="h-3 w-3 mr-1" />
                          Expirado
                        </Badge>
                      )}
                    </div>
                  )}
                </div>
              </CollapsibleContent>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1">
              <CollapsibleTrigger asChild>
                <Button size="icon" variant="ghost">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                </Button>
              </CollapsibleTrigger>

              {isActionable && (
                <>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          disabled={isApplying}
                          size="icon"
                          variant="ghost"
                          onClick={onDismiss}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Descartar</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>

                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          className="bg-purple-600 hover:bg-purple-700"
                          disabled={isApplying}
                          size="icon"
                          onClick={onApply}
                        >
                          {isApplying ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4" />
                          )}
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Aplicar sugerencia</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Collapsible>
    </Card>
  );
}

// Need to add Label component import
function Label({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`text-sm font-medium ${className}`}>{children}</div>;
}

// ============================================
// AI Suggested Actions Panel
// ============================================

interface AISuggestedActionsPanelProps {
  entityType: 'lead' | 'opportunity' | 'customer';
  entityId: string;
  suggestions: AISuggestion[];
  isLoading?: boolean;
  onRefresh?: () => void;
  onApply?: (suggestion: AISuggestion) => Promise<void>;
  onDismiss?: (suggestion: AISuggestion) => Promise<void>;
}

export function AISuggestedActionsPanel({
  suggestions,
  isLoading,
  onRefresh,
  onApply,
  onDismiss,
}: AISuggestedActionsPanelProps) {
  const [applyingId, setApplyingId] = React.useState<string | null>(null);

  const pendingSuggestions = suggestions.filter(s => s.status === 'pending');
  const criticalCount = pendingSuggestions.filter(s => s.priority === 'critical').length;
  const highCount = pendingSuggestions.filter(s => s.priority === 'high').length;

  const handleApply = async (suggestion: AISuggestion) => {
    if (!onApply) return;
    setApplyingId(suggestion.id);
    try {
      await onApply(suggestion);
    } finally {
      setApplyingId(null);
    }
  };

  const handleDismiss = async (suggestion: AISuggestion) => {
    if (!onDismiss) return;
    await onDismiss(suggestion);
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
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-purple-600" />
              Sugerencias de IA
              {pendingSuggestions.length > 0 && (
                <Badge className="bg-purple-100 text-purple-700">
                  {pendingSuggestions.length}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              Acciones recomendadas basadas en análisis de IA
            </CardDescription>
          </div>
          {onRefresh && (
            <Button size="sm" variant="outline" onClick={onRefresh}>
              <RefreshCw className="h-4 w-4 mr-1" />
              Actualizar
            </Button>
          )}
        </div>

        {/* Priority Summary */}
        {(criticalCount > 0 || highCount > 0) && (
          <div className="flex items-center gap-3 mt-2">
            {criticalCount > 0 && (
              <Badge className="bg-red-100 text-red-700 border-red-200">
                <Zap className="h-3 w-3 mr-1" />
                {criticalCount} crítico{criticalCount !== 1 ? 's' : ''}
              </Badge>
            )}
            {highCount > 0 && (
              <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                {highCount} alta prioridad
              </Badge>
            )}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {pendingSuggestions.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="font-medium">Sin sugerencias pendientes</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Las sugerencias de IA aparecerán aquí cuando estén disponibles
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[500px]">
            <div className="space-y-3 pr-4">
              {/* Critical suggestions first */}
              {pendingSuggestions
                .sort((a, b) => {
                  const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
                  return priorityOrder[a.priority] - priorityOrder[b.priority];
                })
                .map((suggestion) => (
                  <SuggestionCard
                    key={suggestion.id}
                    isApplying={applyingId === suggestion.id}
                    suggestion={suggestion}
                    onApply={() => handleApply(suggestion)}
                    onDismiss={() => handleDismiss(suggestion)}
                  />
                ))}
            </div>
          </ScrollArea>
        )}

        {/* Disclaimer */}
        <div className="mt-4 rounded-lg bg-muted/50 p-3">
          <div className="flex items-start gap-2">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-xs text-muted-foreground">
              <strong>Sugerencia generada por IA:</strong> Las recomendaciones son
              generadas automáticamente basándose en patrones de datos. Revisa cada
              sugerencia antes de aplicarla.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Compact Suggestions Badge (for toolbar/header)
// ============================================

interface AISuggestionsBadgeProps {
  count: number;
  criticalCount?: number;
  onClick?: () => void;
}

export function AISuggestionsBadge({
  count,
  criticalCount = 0,
  onClick,
}: AISuggestionsBadgeProps) {
  if (count === 0) return null;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            className={`relative ${criticalCount > 0 ? 'animate-pulse' : ''}`}
            size="sm"
            variant="outline"
            onClick={onClick}
          >
            <Lightbulb className="h-4 w-4 mr-1 text-purple-600" />
            <span>{count}</span>
            {criticalCount > 0 && (
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>
            {count} sugerencia{count !== 1 ? 's' : ''} de IA disponible{count !== 1 ? 's' : ''}
            {criticalCount > 0 && ` (${criticalCount} crítica${criticalCount !== 1 ? 's' : ''})`}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================
// AI Suggestions Summary Widget
// ============================================

interface AISuggestionsSummaryProps {
  suggestions: AISuggestion[];
  onViewAll?: () => void;
}

export function AISuggestionsSummary({
  suggestions,
  onViewAll,
}: AISuggestionsSummaryProps) {
  const pendingCount = suggestions.filter(s => s.status === 'pending').length;
  const appliedCount = suggestions.filter(s => s.status === 'applied').length;
  const dismissedCount = suggestions.filter(s => s.status === 'dismissed').length;
  const totalCount = suggestions.length;

  const applicationRate = totalCount > 0
    ? (appliedCount / (appliedCount + dismissedCount)) * 100
    : 0;

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="h-4 w-4 text-purple-600" />
          Resumen de Sugerencias
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2 text-center">
          <div>
            <div className="text-2xl font-bold text-purple-600">{pendingCount}</div>
            <div className="text-xs text-muted-foreground">Pendientes</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-green-600">{appliedCount}</div>
            <div className="text-xs text-muted-foreground">Aplicadas</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-gray-400">{dismissedCount}</div>
            <div className="text-xs text-muted-foreground">Descartadas</div>
          </div>
        </div>

        {(appliedCount + dismissedCount) > 0 && (
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Tasa de aplicación</span>
              <span className="font-medium">{applicationRate.toFixed(0)}%</span>
            </div>
            <Progress className="h-1.5" value={applicationRate} />
          </div>
        )}

        {onViewAll && pendingCount > 0 && (
          <Button
            className="w-full"
            size="sm"
            variant="outline"
            onClick={onViewAll}
          >
            Ver todas las sugerencias
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

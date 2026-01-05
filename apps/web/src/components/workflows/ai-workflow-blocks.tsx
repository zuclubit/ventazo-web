'use client';

// ============================================
// FASE 6.2 — AI Workflow Blocks Component
// UI components for AI-powered workflow actions
// ============================================

import * as React from 'react';

import {
  ArrowRight,
  Brain,
  FileSearch,
  FileText,
  Info,
  Loader2,
  MessageSquare,
  Sparkles,
  Star,
  Tag,
  Target,
  TrendingUp,
  UserCheck,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AI_ACTION_PARAMETER_CONFIGS,
  AI_EVENT_TRIGGER_LABELS,
  AI_EVENT_TRIGGERS,
  AI_WORKFLOW_ACTION_DESCRIPTIONS,
  AI_WORKFLOW_ACTION_LABELS,
  AI_WORKFLOW_ACTIONS,
  type AIActionParams,
  type AIEventTrigger,
  type AIWorkflowAction,
} from '@/lib/ai-actions/types';

// ============================================
// AI Action Icons Map
// ============================================

const AI_ACTION_ICONS: Record<AIWorkflowAction, React.ElementType> = {
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
// AI Action Card Component
// ============================================

interface AIActionCardProps {
  action: AIWorkflowAction;
  params: AIActionParams;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}

export function AIActionCard({
  action,
  params,
  index,
  onEdit,
  onDelete,
}: AIActionCardProps) {
  const Icon = AI_ACTION_ICONS[action] ?? Brain;
  const label = AI_WORKFLOW_ACTION_LABELS[action];
  const description = AI_WORKFLOW_ACTION_DESCRIPTIONS[action];

  return (
    <Card className="border-l-4 border-l-purple-500 relative">
      <div className="absolute -top-2 -right-2">
        <Badge className="bg-purple-600 hover:bg-purple-700">
          <Sparkles className="h-3 w-3 mr-1" />
          AI
        </Badge>
      </div>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge className="h-6 w-6 justify-center p-0" variant="secondary">
              {index + 1}
            </Badge>
          </div>
          <div className="rounded-lg bg-purple-100 p-2">
            <Icon className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium flex items-center gap-2">
              THEN {label}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="h-3.5 w-3.5 text-muted-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-sm">{description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            {params.confidence_threshold && (
              <div className="text-xs text-muted-foreground">
                Confianza mínima: {(params.confidence_threshold * 100).toFixed(0)}%
              </div>
            )}
            {params.require_approval && (
              <div className="text-xs text-amber-600">
                Requiere aprobación
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Editar
          </Button>
          <Button
            className="text-destructive"
            size="sm"
            variant="ghost"
            onClick={onDelete}
          >
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// AI Trigger Card Component
// ============================================

interface AITriggerCardProps {
  trigger: AIEventTrigger;
  conditions?: Record<string, unknown>;
  onEdit: () => void;
  onDelete: () => void;
}

export function AITriggerCard({
  trigger,
  conditions,
  onEdit,
  onDelete,
}: AITriggerCardProps) {
  const label = AI_EVENT_TRIGGER_LABELS[trigger];

  return (
    <Card className="border-l-4 border-l-purple-500 relative">
      <div className="absolute -top-2 -right-2">
        <Badge className="bg-purple-600 hover:bg-purple-700">
          <Brain className="h-3 w-3 mr-1" />
          AI
        </Badge>
      </div>
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-purple-100 p-2">
            <Brain className="h-4 w-4 text-purple-600" />
          </div>
          <div>
            <div className="font-medium">
              IF {label}
            </div>
            {conditions && Object.keys(conditions).length > 0 && (
              <div className="text-sm text-muted-foreground">
                {Object.keys(conditions).length} condición{Object.keys(conditions).length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="ghost" onClick={onEdit}>
            Editar
          </Button>
          <Button
            className="text-destructive"
            size="sm"
            variant="ghost"
            onClick={onDelete}
          >
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Add AI Action Dialog
// ============================================

interface AddAIActionDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (action: AIWorkflowAction, params: AIActionParams) => void;
  isPending: boolean;
  editAction?: { action: AIWorkflowAction; params: AIActionParams };
}

export function AddAIActionDialog({
  open,
  onClose,
  onSave,
  isPending,
  editAction,
}: AddAIActionDialogProps) {
  const [selectedAction, setSelectedAction] = React.useState<AIWorkflowAction | ''>('');
  const [params, setParams] = React.useState<AIActionParams>({});

  React.useEffect(() => {
    if (open && editAction) {
      setSelectedAction(editAction.action);
      setParams(editAction.params);
    } else if (!open) {
      setSelectedAction('');
      setParams({});
    }
  }, [open, editAction]);

  const handleSave = () => {
    if (!selectedAction) return;
    onSave(selectedAction, params);
  };

  const paramConfigs = selectedAction ? AI_ACTION_PARAMETER_CONFIGS[selectedAction] : [];

  const renderParamInput = (config: (typeof paramConfigs)[number]) => {
    const value = params[config.key as keyof AIActionParams];

    switch (config.type) {
      case 'checkbox':
        return (
          <div className="flex items-center space-x-2">
            <Checkbox
              checked={value as boolean ?? config.defaultValue as boolean}
              id={config.key}
              onCheckedChange={(checked) =>
                setParams({ ...params, [config.key]: checked })
              }
            />
            <Label className="text-sm font-normal" htmlFor={config.key}>
              {config.label}
            </Label>
          </div>
        );

      case 'slider':
        return (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">{config.label}</span>
              <span className="text-sm text-muted-foreground">
                {((value as number ?? config.defaultValue as number ?? 0) * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              max={config.max ?? 1}
              min={config.min ?? 0}
              step={config.step ?? 0.05}
              value={[value as number ?? config.defaultValue as number ?? 0.5]}
              onValueChange={([val]) =>
                setParams({ ...params, [config.key]: val })
              }
            />
            {config.description && (
              <p className="text-xs text-muted-foreground">{config.description}</p>
            )}
          </div>
        );

      case 'select':
        return (
          <Select
            value={value as string ?? config.defaultValue as string ?? ''}
            onValueChange={(val) => setParams({ ...params, [config.key]: val })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Seleccionar..." />
            </SelectTrigger>
            <SelectContent>
              {config.options?.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );

      case 'multi_select':
        // Simplified multi-select as checkboxes
        return (
          <div className="space-y-2">
            {config.options?.map((opt) => {
              const currentValues = (value as string[] ?? []);
              const isChecked = currentValues.includes(opt.value);
              return (
                <div key={opt.value} className="flex items-center space-x-2">
                  <Checkbox
                    checked={isChecked}
                    id={`${config.key}-${opt.value}`}
                    onCheckedChange={(checked) => {
                      const newValues = checked
                        ? [...currentValues, opt.value]
                        : currentValues.filter(v => v !== opt.value);
                      setParams({ ...params, [config.key]: newValues });
                    }}
                  />
                  <Label
                    className="text-sm font-normal"
                    htmlFor={`${config.key}-${opt.value}`}
                  >
                    {opt.label}
                  </Label>
                </div>
              );
            })}
          </div>
        );

      case 'number':
        return (
          <Input
            max={config.max}
            min={config.min}
            placeholder={config.placeholder}
            type="number"
            value={value as number ?? config.defaultValue ?? ''}
            onChange={(e) =>
              setParams({ ...params, [config.key]: parseFloat(e.target.value) || 0 })
            }
          />
        );

      default:
        return (
          <Input
            placeholder={config.placeholder}
            value={value as string ?? config.defaultValue ?? ''}
            onChange={(e) => setParams({ ...params, [config.key]: e.target.value })}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            {editAction ? 'Editar Acción AI' : 'Agregar Acción AI'}
          </DialogTitle>
          <DialogDescription>
            Configura una acción automatizada con Inteligencia Artificial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Acción AI</Label>
            <Select
              value={selectedAction}
              onValueChange={(value) => {
                setSelectedAction(value as AIWorkflowAction);
                setParams({});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una acción AI" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Acciones de IA
                  </SelectLabel>
                  {AI_WORKFLOW_ACTIONS.map((action) => {
                    const Icon = AI_ACTION_ICONS[action];
                    return (
                      <SelectItem key={action} value={action}>
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-purple-600" />
                          {AI_WORKFLOW_ACTION_LABELS[action]}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {selectedAction && (
            <div className="rounded-lg bg-purple-50 border border-purple-200 p-3">
              <div className="flex items-start gap-2">
                <Info className="h-4 w-4 text-purple-600 mt-0.5" />
                <p className="text-sm text-purple-700">
                  {AI_WORKFLOW_ACTION_DESCRIPTIONS[selectedAction]}
                </p>
              </div>
            </div>
          )}

          {selectedAction && paramConfigs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <Label className="text-sm font-medium">Configuración</Label>
                {paramConfigs.map((config) => (
                  <div key={config.key} className="space-y-2">
                    {config.type !== 'checkbox' && (
                      <Label className="text-sm">
                        {config.label}
                        {config.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                    )}
                    {renderParamInput(config)}
                    {config.description && config.type !== 'slider' && (
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Common AI settings */}
          {selectedAction && (
            <>
              <Separator />
              <div className="space-y-4">
                <Label className="text-sm font-medium">Configuración común</Label>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={params.require_approval as boolean ?? false}
                    id="require_approval"
                    onCheckedChange={(checked) =>
                      setParams({ ...params, require_approval: checked as boolean })
                    }
                  />
                  <Label className="text-sm font-normal" htmlFor="require_approval">
                    Requiere aprobación antes de aplicar cambios
                  </Label>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Reintentos máximos</span>
                    <span className="text-sm text-muted-foreground">
                      {params.max_retries ?? 3}
                    </span>
                  </div>
                  <Slider
                    max={5}
                    min={0}
                    step={1}
                    value={[params.max_retries as number ?? 3]}
                    onValueChange={([val]) =>
                      setParams({ ...params, max_retries: val })
                    }
                  />
                </div>
              </div>
            </>
          )}

          {selectedAction && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="font-medium">THEN</span>
                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {AI_WORKFLOW_ACTION_LABELS[selectedAction]}
                </Badge>
              </div>
            </div>
          )}

          {/* AI Disclaimer */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-3">
            <div className="flex items-start gap-2">
              <Info className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
              <p className="text-xs text-amber-700">
                <strong>Nota:</strong> Las acciones de IA son sugerencias generadas automáticamente.
                Los resultados pueden variar según la calidad de los datos disponibles.
                Se recomienda habilitar la aprobación para acciones que modifican datos.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button disabled={isPending} variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            disabled={isPending || !selectedAction}
            onClick={handleSave}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editAction ? 'Guardar cambios' : 'Agregar Acción AI'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Add AI Trigger Dialog
// ============================================

interface AddAITriggerDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (trigger: AIEventTrigger, conditions?: Record<string, unknown>) => void;
  isPending: boolean;
  editTrigger?: { trigger: AIEventTrigger; conditions?: Record<string, unknown> };
}

export function AddAITriggerDialog({
  open,
  onClose,
  onSave,
  isPending,
  editTrigger,
}: AddAITriggerDialogProps) {
  const [selectedTrigger, setSelectedTrigger] = React.useState<AIEventTrigger | ''>('');
  const [conditions, setConditions] = React.useState<Record<string, unknown>>({});

  React.useEffect(() => {
    if (open && editTrigger) {
      setSelectedTrigger(editTrigger.trigger);
      setConditions(editTrigger.conditions ?? {});
    } else if (!open) {
      setSelectedTrigger('');
      setConditions({});
    }
  }, [open, editTrigger]);

  const handleSave = () => {
    if (!selectedTrigger) return;
    onSave(selectedTrigger, conditions);
  };

  // Trigger-specific condition fields
  const renderConditions = () => {
    if (!selectedTrigger) return null;

    switch (selectedTrigger) {
      case 'ai.score_changed':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-sm">Score mínimo de cambio</Label>
              <Input
                placeholder="10"
                type="number"
                value={conditions['min_change'] as number ?? ''}
                onChange={(e) =>
                  setConditions({ ...conditions, min_change: parseInt(e.target.value) || 0 })
                }
              />
              <p className="text-xs text-muted-foreground">
                Solo dispara si el score cambió en al menos esta cantidad
              </p>
            </div>
            <div className="space-y-2">
              <Label className="text-sm">Dirección del cambio</Label>
              <Select
                value={conditions['direction'] as string ?? 'any'}
                onValueChange={(val) => setConditions({ ...conditions, direction: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Cualquier dirección</SelectItem>
                  <SelectItem value="up">Solo incrementos</SelectItem>
                  <SelectItem value="down">Solo decrementos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );

      case 'ai.high_value_detected':
      case 'ai.customer_ready_detected':
        return (
          <div className="space-y-2">
            <Label className="text-sm">Confianza mínima</Label>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">
                {((conditions['min_confidence'] as number ?? 0.8) * 100).toFixed(0)}%
              </span>
            </div>
            <Slider
              max={1}
              min={0.5}
              step={0.05}
              value={[conditions['min_confidence'] as number ?? 0.8]}
              onValueChange={([val]) =>
                setConditions({ ...conditions, min_confidence: val })
              }
            />
          </div>
        );

      case 'ai.intent_detected':
        return (
          <div className="space-y-2">
            <Label className="text-sm">Tipos de intención</Label>
            {['purchase', 'inquiry', 'support', 'complaint'].map((intent) => (
              <div key={intent} className="flex items-center space-x-2">
                <Checkbox
                  checked={(conditions['intent_types'] as string[] ?? []).includes(intent)}
                  id={`intent-${intent}`}
                  onCheckedChange={(checked) => {
                    const current = (conditions['intent_types'] as string[] ?? []);
                    const updated = checked
                      ? [...current, intent]
                      : current.filter(i => i !== intent);
                    setConditions({ ...conditions, intent_types: updated });
                  }}
                />
                <Label className="text-sm font-normal capitalize" htmlFor={`intent-${intent}`}>
                  {intent}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'ai.risk_detected':
      case 'ai.drop_risk_detected':
        return (
          <div className="space-y-2">
            <Label className="text-sm">Nivel de riesgo mínimo</Label>
            <Select
              value={conditions['min_risk_level'] as string ?? 'medium'}
              onValueChange={(val) => setConditions({ ...conditions, min_risk_level: val })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Bajo</SelectItem>
                <SelectItem value="medium">Medio</SelectItem>
                <SelectItem value="high">Alto</SelectItem>
                <SelectItem value="critical">Crítico</SelectItem>
              </SelectContent>
            </Select>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            {editTrigger ? 'Editar Trigger AI' : 'Agregar Trigger AI'}
          </DialogTitle>
          <DialogDescription>
            Configura un trigger basado en eventos de Inteligencia Artificial.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cuando...</Label>
            <Select
              value={selectedTrigger}
              onValueChange={(value) => {
                setSelectedTrigger(value as AIEventTrigger);
                setConditions({});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un evento AI" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Eventos de IA
                  </SelectLabel>
                  {AI_EVENT_TRIGGERS.map((trigger) => (
                    <SelectItem key={trigger} value={trigger}>
                      {AI_EVENT_TRIGGER_LABELS[trigger]}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          {selectedTrigger && renderConditions()}

          {selectedTrigger && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Brain className="h-4 w-4 text-purple-600" />
                <span className="font-medium">IF</span>
                <Badge className="bg-purple-100 text-purple-700 hover:bg-purple-100">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {AI_EVENT_TRIGGER_LABELS[selectedTrigger]}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button disabled={isPending} variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            className="bg-purple-600 hover:bg-purple-700"
            disabled={isPending || !selectedTrigger}
            onClick={handleSave}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editTrigger ? 'Guardar cambios' : 'Agregar Trigger AI'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// AI Actions Section Component
// ============================================

interface AIActionsSectionProps {
  onAddAction: () => void;
  onAddTrigger: () => void;
}

export function AIActionsSection({ onAddAction, onAddTrigger }: AIActionsSectionProps) {
  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-purple-700">
              <Brain className="h-5 w-5" />
              Operaciones de IA
              <Badge className="bg-purple-600">Nuevo</Badge>
            </CardTitle>
            <CardDescription className="text-purple-600">
              Automatiza tareas con Inteligencia Artificial
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 sm:grid-cols-2">
          <Button
            className="justify-start"
            variant="outline"
            onClick={onAddTrigger}
          >
            <Brain className="mr-2 h-4 w-4 text-purple-600" />
            Agregar Trigger AI
          </Button>
          <Button
            className="justify-start"
            variant="outline"
            onClick={onAddAction}
          >
            <Sparkles className="mr-2 h-4 w-4 text-purple-600" />
            Agregar Acción AI
          </Button>
        </div>

        <Separator className="my-4" />

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Acciones disponibles:</Label>
          <div className="flex flex-wrap gap-2">
            {AI_WORKFLOW_ACTIONS.slice(0, 5).map((action) => {
              const Icon = AI_ACTION_ICONS[action];
              return (
                <Badge
                  key={action}
                  className="bg-purple-100 text-purple-700 hover:bg-purple-200"
                  variant="secondary"
                >
                  <Icon className="h-3 w-3 mr-1" />
                  {AI_WORKFLOW_ACTION_LABELS[action]}
                </Badge>
              );
            })}
            {AI_WORKFLOW_ACTIONS.length > 5 && (
              <Badge variant="outline">
                +{AI_WORKFLOW_ACTIONS.length - 5} más
              </Badge>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Export all components
// ============================================

export {
  AI_ACTION_ICONS,
};

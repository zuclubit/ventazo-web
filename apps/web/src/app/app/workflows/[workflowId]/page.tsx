'use client';

import * as React from 'react';

import { useParams, useRouter } from 'next/navigation';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  CheckCircle,
  CheckSquare,
  Clock,
  Edit,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  MoreHorizontal,
  Play,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  Target,
  Trash2,
  UserCheck,
  UserPlus,
  Webhook,
  XCircle,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { RBACGuard } from '@/lib/auth';
import {
  ACTION_PARAMETER_CONFIGS,
  EVENT_TRIGGER_LABELS,
  TRIGGER_GROUP_LABELS,
  TRIGGER_GROUPS,
  useWorkflowBuilder,
  WORKFLOW_ACTION_LABELS,
  WORKFLOW_ACTIONS,
  type ActionFormData,
  type EventTrigger,
  type ExecutionStatus,
  type TriggerFormData,
  type WorkflowAction,
  type WorkflowActionConfig,
  type WorkflowActionParams,
  type WorkflowExecution,
  type WorkflowTrigger,
} from '@/lib/workflows';

// ============================================
// Action Icons Map
// ============================================

const ACTION_ICONS: Record<WorkflowAction, React.ElementType> = {
  create_task: CheckSquare,
  update_task: Edit,
  complete_task: CheckCircle,
  send_email: Mail,
  send_notification: Bell,
  update_entity: RefreshCw,
  assign_user: UserPlus,
  change_stage: ArrowRight,
  create_note: FileText,
  create_activity: Activity,
  trigger_webhook: Webhook,
  delay: Clock,
  create_opportunity: Target,
  create_customer: UserCheck,
  send_sms: MessageSquare,
  add_tag: Tag,
  remove_tag: XCircle,
};

// ============================================
// Trigger Card Component
// ============================================

function TriggerCard({
  trigger,
  onEdit,
  onDelete,
}: {
  trigger: WorkflowTrigger;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-blue-100 p-2">
            <Zap className="h-4 w-4 text-blue-600" />
          </div>
          <div>
            <div className="font-medium">
              IF {EVENT_TRIGGER_LABELS[trigger.trigger] ?? trigger.trigger}
            </div>
            {trigger.conditions.length > 0 && (
              <div className="text-sm text-muted-foreground">
                {trigger.conditions.length} condición{trigger.conditions.length !== 1 ? 'es' : ''}
              </div>
            )}
          </div>
        </div>
        <RBACGuard fallback={null} minRole="manager">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </RBACGuard>
      </CardContent>
    </Card>
  );
}

// ============================================
// Action Card Component
// ============================================

function ActionCard({
  action,
  index,
  onEdit,
  onDelete,
}: {
  action: WorkflowActionConfig;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = ACTION_ICONS[action.action] ?? Settings;

  return (
    <Card className="border-l-4 border-l-green-500">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge className="h-6 w-6 justify-center p-0" variant="secondary">
              {index + 1}
            </Badge>
          </div>
          <div className="rounded-lg bg-green-100 p-2">
            <Icon className="h-4 w-4 text-green-600" />
          </div>
          <div>
            <div className="font-medium">
              THEN {WORKFLOW_ACTION_LABELS[action.action]}
            </div>
            {action.params.task_title && (
              <div className="text-sm text-muted-foreground">
                &quot;{action.params.task_title}&quot;
              </div>
            )}
            {action.params.email_subject && (
              <div className="text-sm text-muted-foreground">
                Asunto: {action.params.email_subject}
              </div>
            )}
          </div>
        </div>
        <RBACGuard fallback={null} minRole="manager">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={onEdit}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive" onClick={onDelete}>
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </RBACGuard>
      </CardContent>
    </Card>
  );
}

// ============================================
// Add Trigger Dialog
// ============================================

function AddTriggerDialog({
  open,
  onClose,
  onSave,
  isPending,
  editTrigger,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: TriggerFormData) => void;
  isPending: boolean;
  editTrigger?: WorkflowTrigger;
}) {
  const [selectedTrigger, setSelectedTrigger] = React.useState<EventTrigger | ''>('');

  React.useEffect(() => {
    if (open && editTrigger) {
      setSelectedTrigger(editTrigger.trigger);
    } else if (!open) {
      setSelectedTrigger('');
    }
  }, [open, editTrigger]);

  const handleSave = () => {
    if (!selectedTrigger) return;
    onSave({
      trigger: selectedTrigger,
      conditions: [],
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-600" />
            {editTrigger ? 'Editar Trigger' : 'Agregar Trigger'}
          </DialogTitle>
          <DialogDescription>
            Define cuándo se debe ejecutar el workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Cuando...</Label>
            <Select
              value={selectedTrigger}
              onValueChange={(value) => setSelectedTrigger(value as EventTrigger)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona un evento" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(TRIGGER_GROUPS).map(([groupKey, triggers]) => (
                  <SelectGroup key={groupKey}>
                    <SelectLabel>
                      {TRIGGER_GROUP_LABELS[groupKey as keyof typeof TRIGGER_GROUPS]}
                    </SelectLabel>
                    {triggers.map((trigger) => (
                      <SelectItem key={trigger} value={trigger}>
                        {EVENT_TRIGGER_LABELS[trigger]}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedTrigger && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Zap className="h-4 w-4 text-blue-600" />
                <span className="font-medium">IF</span>
                <Badge variant="secondary">
                  {EVENT_TRIGGER_LABELS[selectedTrigger]}
                </Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button disabled={isPending} variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending || !selectedTrigger} onClick={handleSave}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editTrigger ? 'Guardar cambios' : 'Agregar Trigger'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Add Action Dialog
// ============================================

function AddActionDialog({
  open,
  onClose,
  onSave,
  isPending,
  editAction,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: ActionFormData) => void;
  isPending: boolean;
  editAction?: WorkflowActionConfig;
}) {
  const [selectedAction, setSelectedAction] = React.useState<WorkflowAction | ''>('');
  const [params, setParams] = React.useState<WorkflowActionParams>({});

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
    onSave({
      action: selectedAction,
      params,
    });
  };

  const paramConfigs = selectedAction ? ACTION_PARAMETER_CONFIGS[selectedAction] : [];

  const renderParamInput = (config: (typeof paramConfigs)[number]) => {
    const value = params[config.key as keyof WorkflowActionParams] as string | undefined;

    switch (config.type) {
      case 'textarea':
        return (
          <Textarea
            placeholder={config.placeholder}
            rows={3}
            value={value ?? ''}
            onChange={(e) => setParams({ ...params, [config.key]: e.target.value })}
          />
        );
      case 'number':
        return (
          <Input
            placeholder={config.placeholder}
            type="number"
            value={value ?? ''}
            onChange={(e) => setParams({ ...params, [config.key]: e.target.value })}
          />
        );
      case 'select':
        return (
          <Select
            value={value ?? ''}
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
      case 'url':
        return (
          <Input
            placeholder={config.placeholder}
            type="url"
            value={value ?? ''}
            onChange={(e) => setParams({ ...params, [config.key]: e.target.value })}
          />
        );
      default:
        return (
          <Input
            placeholder={config.placeholder}
            value={value ?? ''}
            onChange={(e) => setParams({ ...params, [config.key]: e.target.value })}
          />
        );
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Play className="h-5 w-5 text-green-600" />
            {editAction ? 'Editar Acción' : 'Agregar Acción'}
          </DialogTitle>
          <DialogDescription>
            Define qué acción realizar cuando se dispare el workflow.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Acción</Label>
            <Select
              value={selectedAction}
              onValueChange={(value) => {
                setSelectedAction(value as WorkflowAction);
                setParams({});
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona una acción" />
              </SelectTrigger>
              <SelectContent>
                {WORKFLOW_ACTIONS.map((action) => {
                  const Icon = ACTION_ICONS[action];
                  return (
                    <SelectItem key={action} value={action}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {WORKFLOW_ACTION_LABELS[action]}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {selectedAction && paramConfigs.length > 0 && (
            <>
              <Separator />
              <div className="space-y-4">
                <Label className="text-sm font-medium">Parámetros</Label>
                {paramConfigs.map((config) => (
                  <div key={config.key} className="space-y-2">
                    <Label className="text-sm">
                      {config.label}
                      {config.required && <span className="text-destructive ml-1">*</span>}
                    </Label>
                    {renderParamInput(config)}
                    {config.description && (
                      <p className="text-xs text-muted-foreground">{config.description}</p>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}

          {selectedAction && (
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex items-center gap-2 text-sm">
                <Play className="h-4 w-4 text-green-600" />
                <span className="font-medium">THEN</span>
                <Badge variant="secondary">{WORKFLOW_ACTION_LABELS[selectedAction]}</Badge>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button disabled={isPending} variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={isPending || !selectedAction} onClick={handleSave}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {editAction ? 'Guardar cambios' : 'Agregar Acción'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Execution Status Badge
// ============================================

function ExecutionStatusBadge({ status }: { status: ExecutionStatus }) {
  const config: Record<ExecutionStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ElementType }> = {
    pending: { label: 'Pendiente', variant: 'secondary', icon: Clock },
    running: { label: 'Ejecutando', variant: 'default', icon: Loader2 },
    success: { label: 'Exitoso', variant: 'default', icon: CheckCircle },
    failed: { label: 'Fallido', variant: 'destructive', icon: XCircle },
    skipped: { label: 'Omitido', variant: 'outline', icon: AlertCircle },
  };

  const { label, variant, icon: Icon } = config[status];

  return (
    <Badge variant={variant}>
      <Icon className={`mr-1 h-3 w-3 ${status === 'running' ? 'animate-spin' : ''}`} />
      {label}
    </Badge>
  );
}

// ============================================
// Executions Tab
// ============================================

function ExecutionsTab({
  executions,
  isLoading,
}: {
  executions: WorkflowExecution[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (executions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Activity className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">Sin ejecuciones</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Las ejecuciones aparecerán aquí cuando el workflow se dispare
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {executions.map((execution) => (
        <Card key={execution.id}>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-4">
              <ExecutionStatusBadge status={execution.status} />
              <div>
                <div className="text-sm font-medium">
                  {execution.metadata.trigger_event && (
                    <span>
                      {EVENT_TRIGGER_LABELS[execution.metadata.trigger_event as EventTrigger] ??
                        execution.metadata.trigger_event}
                    </span>
                  )}
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(execution.triggered_at), {
                    addSuffix: true,
                    locale: es,
                  })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm">
              {execution.metadata.actions_executed !== undefined && (
                <span className="text-muted-foreground">
                  {execution.metadata.actions_executed} acción
                  {execution.metadata.actions_executed !== 1 ? 'es' : ''} ejecutada
                  {execution.metadata.actions_executed !== 1 ? 's' : ''}
                </span>
              )}
              {execution.metadata.duration_ms !== undefined && (
                <span className="text-muted-foreground">
                  {execution.metadata.duration_ms}ms
                </span>
              )}
            </div>
          </CardContent>
          {execution.error_message && (
            <div className="border-t px-4 py-2 bg-destructive/10">
              <p className="text-xs text-destructive">{execution.error_message}</p>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function WorkflowBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const workflowId = params['workflowId'] as string;

  const [editingName, setEditingName] = React.useState(false);
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const [triggerDialogOpen, setTriggerDialogOpen] = React.useState(false);
  const [actionDialogOpen, setActionDialogOpen] = React.useState(false);
  const [editingTrigger, setEditingTrigger] = React.useState<WorkflowTrigger | undefined>();
  const [editingAction, setEditingAction] = React.useState<WorkflowActionConfig | undefined>();

  const {
    workflow,
    triggers,
    actions,
    executions,
    isLoading,
    isLoadingTriggers,
    isLoadingActions,
    isLoadingExecutions,
    updateWorkflow,
    activateWorkflow,
    deactivateWorkflow,
    addTrigger,
    updateTrigger,
    deleteTrigger,
    addAction,
    updateAction,
    deleteAction,
    testWorkflow,
  } = useWorkflowBuilder(workflowId);

  React.useEffect(() => {
    if (workflow) {
      setName(workflow.name);
      setDescription(workflow.description ?? '');
    }
  }, [workflow]);

  const handleSaveName = async () => {
    if (!name.trim()) return;

    try {
      await updateWorkflow.mutateAsync({
        id: workflowId,
        data: { name: name.trim(), description: description.trim() || undefined },
      });
      setEditingName(false);
      toast({ title: 'Cambios guardados' });
    } catch {
      toast({ title: 'Error', description: 'No se pudieron guardar los cambios', variant: 'destructive' });
    }
  };

  const handleToggleStatus = async () => {
    if (!workflow) return;

    try {
      if (workflow.is_active) {
        await deactivateWorkflow.mutateAsync(workflowId);
        toast({ title: 'Workflow desactivado' });
      } else {
        // Validate before activating
        if (triggers.length === 0) {
          toast({ title: 'Error', description: 'Agrega al menos un trigger', variant: 'destructive' });
          return;
        }
        if (actions.length === 0) {
          toast({ title: 'Error', description: 'Agrega al menos una acción', variant: 'destructive' });
          return;
        }
        await activateWorkflow.mutateAsync(workflowId);
        toast({ title: 'Workflow activado' });
      }
    } catch {
      toast({ title: 'Error', description: 'No se pudo cambiar el estado', variant: 'destructive' });
    }
  };

  const handleSaveTrigger = async (data: TriggerFormData) => {
    try {
      if (editingTrigger) {
        await updateTrigger.mutateAsync({
          workflowId,
          triggerId: editingTrigger.id,
          data,
        });
        toast({ title: 'Trigger actualizado' });
      } else {
        await addTrigger.mutateAsync({ workflowId, data });
        toast({ title: 'Trigger agregado' });
      }
      setTriggerDialogOpen(false);
      setEditingTrigger(undefined);
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleDeleteTrigger = async (trigger: WorkflowTrigger) => {
    try {
      await deleteTrigger.mutateAsync({ workflowId, triggerId: trigger.id });
      toast({ title: 'Trigger eliminado' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleSaveAction = async (data: ActionFormData) => {
    try {
      if (editingAction) {
        await updateAction.mutateAsync({
          workflowId,
          actionId: editingAction.id,
          data,
        });
        toast({ title: 'Acción actualizada' });
      } else {
        await addAction.mutateAsync({ workflowId, data: { ...data, order: actions.length } });
        toast({ title: 'Acción agregada' });
      }
      setActionDialogOpen(false);
      setEditingAction(undefined);
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleDeleteAction = async (action: WorkflowActionConfig) => {
    try {
      await deleteAction.mutateAsync({ workflowId, actionId: action.id });
      toast({ title: 'Acción eliminada' });
    } catch {
      toast({ title: 'Error', variant: 'destructive' });
    }
  };

  const handleTest = async () => {
    try {
      await testWorkflow.mutateAsync({ workflowId });
      toast({ title: 'Test ejecutado', description: 'Revisa el log de ejecuciones' });
    } catch {
      toast({ title: 'Error', description: 'No se pudo ejecutar el test', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 p-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-96" />
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (!workflow) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 p-12">
        <AlertCircle className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Workflow no encontrado</h2>
        <Button variant="outline" onClick={() => router.push('/app/workflows')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a Workflows
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" onClick={() => router.push('/app/workflows')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input
                autoFocus
                className="w-64"
                value={name}
                onBlur={handleSaveName}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
              />
            </div>
          ) : (
            <div className="cursor-pointer" onClick={() => setEditingName(true)}>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                {workflow.name}
                <Edit className="h-4 w-4 text-muted-foreground opacity-0 hover:opacity-100" />
              </h1>
              {workflow.description && (
                <p className="text-muted-foreground">{workflow.description}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-sm" htmlFor="active-switch">
              {workflow.is_active ? 'Activo' : 'Inactivo'}
            </Label>
            <Switch
              checked={workflow.is_active}
              id="active-switch"
              onCheckedChange={handleToggleStatus}
            />
          </div>

          <RBACGuard fallback={null} minRole="manager">
            <Button disabled={testWorkflow.isPending} variant="outline" onClick={handleTest}>
              {testWorkflow.isPending ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Play className="mr-2 h-4 w-4" />
              )}
              Test
            </Button>
          </RBACGuard>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="builder">
        <TabsList>
          <TabsTrigger value="builder">
            <Settings className="mr-2 h-4 w-4" />
            Builder
          </TabsTrigger>
          <TabsTrigger value="executions">
            <Activity className="mr-2 h-4 w-4" />
            Ejecuciones
            {executions.length > 0 && (
              <Badge className="ml-2" variant="secondary">
                {executions.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value="builder">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Triggers Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Zap className="h-5 w-5 text-blue-600" />
                      Triggers (IF)
                    </CardTitle>
                    <CardDescription>
                      Define cuándo se ejecuta el workflow
                    </CardDescription>
                  </div>
                  <RBACGuard fallback={null} minRole="manager">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingTrigger(undefined);
                        setTriggerDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </RBACGuard>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingTriggers ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : triggers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Zap className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Sin triggers configurados
                    </p>
                    <RBACGuard fallback={null} minRole="manager">
                      <Button
                        className="mt-4"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingTrigger(undefined);
                          setTriggerDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar trigger
                      </Button>
                    </RBACGuard>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {triggers.map((trigger) => (
                      <TriggerCard
                        key={trigger.id}
                        trigger={trigger}
                        onDelete={() => handleDeleteTrigger(trigger)}
                        onEdit={() => {
                          setEditingTrigger(trigger);
                          setTriggerDialogOpen(true);
                        }}
                      />
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Actions Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5 text-green-600" />
                      Acciones (THEN)
                    </CardTitle>
                    <CardDescription>
                      Define qué hacer cuando se dispara
                    </CardDescription>
                  </div>
                  <RBACGuard fallback={null} minRole="manager">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setEditingAction(undefined);
                        setActionDialogOpen(true);
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Agregar
                    </Button>
                  </RBACGuard>
                </div>
              </CardHeader>
              <CardContent>
                {isLoadingActions ? (
                  <div className="space-y-3">
                    {[1, 2].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : actions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-8 text-center">
                    <Play className="h-8 w-8 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">
                      Sin acciones configuradas
                    </p>
                    <RBACGuard fallback={null} minRole="manager">
                      <Button
                        className="mt-4"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setEditingAction(undefined);
                          setActionDialogOpen(true);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Agregar acción
                      </Button>
                    </RBACGuard>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {actions
                      .sort((a, b) => a.order - b.order)
                      .map((action, idx) => (
                        <ActionCard
                          key={action.id}
                          action={action}
                          index={idx}
                          onDelete={() => handleDeleteAction(action)}
                          onEdit={() => {
                            setEditingAction(action);
                            setActionDialogOpen(true);
                          }}
                        />
                      ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Visual Flow Preview */}
          {(triggers.length > 0 || actions.length > 0) && (
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="text-lg">Vista previa del flujo</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-4 overflow-x-auto pb-2">
                  {triggers.map((trigger, idx) => (
                    <React.Fragment key={trigger.id}>
                      <div className="flex-shrink-0 rounded-lg border bg-blue-50 p-3 min-w-[200px]">
                        <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
                          <Zap className="h-4 w-4" />
                          IF
                        </div>
                        <div className="mt-1 text-sm">
                          {EVENT_TRIGGER_LABELS[trigger.trigger]}
                        </div>
                      </div>
                      {(idx < triggers.length - 1 || actions.length > 0) && (
                        <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                      )}
                    </React.Fragment>
                  ))}

                  {actions
                    .sort((a, b) => a.order - b.order)
                    .map((action, idx) => {
                      const Icon = ACTION_ICONS[action.action];
                      return (
                        <React.Fragment key={action.id}>
                          <div className="flex-shrink-0 rounded-lg border bg-green-50 p-3 min-w-[200px]">
                            <div className="flex items-center gap-2 text-sm font-medium text-green-700">
                              <Icon className="h-4 w-4" />
                              THEN
                            </div>
                            <div className="mt-1 text-sm">
                              {WORKFLOW_ACTION_LABELS[action.action]}
                            </div>
                          </div>
                          {idx < actions.length - 1 && (
                            <ArrowRight className="h-6 w-6 text-muted-foreground flex-shrink-0" />
                          )}
                        </React.Fragment>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent className="mt-6" value="executions">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Ejecuciones</CardTitle>
              <CardDescription>
                Últimas ejecuciones del workflow
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ExecutionsTab executions={executions} isLoading={isLoadingExecutions} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <AddTriggerDialog
        editTrigger={editingTrigger}
        isPending={addTrigger.isPending || updateTrigger.isPending}
        open={triggerDialogOpen}
        onClose={() => {
          setTriggerDialogOpen(false);
          setEditingTrigger(undefined);
        }}
        onSave={handleSaveTrigger}
      />

      <AddActionDialog
        editAction={editingAction}
        isPending={addAction.isPending || updateAction.isPending}
        open={actionDialogOpen}
        onClose={() => {
          setActionDialogOpen(false);
          setEditingAction(undefined);
        }}
        onSave={handleSaveAction}
      />
    </div>
  );
}

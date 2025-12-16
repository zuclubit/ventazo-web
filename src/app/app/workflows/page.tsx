'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
  CheckCircle2,
  Clock,
  Copy,
  Filter,
  Loader2,
  MoreHorizontal,
  Pause,
  Play,
  Plus,
  Search,
  Trash2,
  Workflow,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { RBACGuard } from '@/lib/auth';
import {
  EVENT_TRIGGER_LABELS,
  useWorkflowManagement,
  WORKFLOW_TRIGGER_TYPE,
  type Workflow as WorkflowType,
  type WorkflowFilters,
} from '@/lib/workflows';

// ============================================
// Statistics Cards
// ============================================

function StatisticsCards({
  statistics,
  isLoading,
}: {
  statistics?: {
    total_workflows: number;
    active_workflows: number;
    inactive_workflows: number;
    total_executions: number;
    successful_executions: number;
    failed_executions: number;
    executions_today: number;
  };
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Workflows',
      value: statistics?.total_workflows ?? 0,
      icon: Workflow,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Activos',
      value: statistics?.active_workflows ?? 0,
      icon: Play,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Ejecuciones Hoy',
      value: statistics?.executions_today ?? 0,
      icon: Zap,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Tasa de Éxito',
      value:
        statistics?.total_executions && statistics.total_executions > 0
          ? `${Math.round((statistics.successful_executions / statistics.total_executions) * 100)}%`
          : '—',
      icon: CheckCircle2,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
            <div className={`rounded-full p-2 ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Filters Bar
// ============================================

function WorkflowsFiltersBar({
  filters,
  onFiltersChange,
}: {
  filters: WorkflowFilters;
  onFiltersChange: (filters: WorkflowFilters) => void;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Buscar workflows..."
          value={filters.search ?? ''}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value || undefined })}
        />
      </div>

      <div className="flex gap-2">
        <Select
          value={filters.trigger_type ?? 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              trigger_type: value === 'all' ? undefined : (value as 'event' | 'schedule'),
            })
          }
        >
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {WORKFLOW_TRIGGER_TYPE.map((type) => (
              <SelectItem key={type} value={type}>
                {type === 'event' ? 'Evento' : 'Programado'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              is_active: value === 'all' ? undefined : value === 'active',
            })
          }
        >
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Activos</SelectItem>
            <SelectItem value="inactive">Inactivos</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

// ============================================
// Create Workflow Dialog
// ============================================

function CreateWorkflowDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { createWorkflow } = useWorkflowManagement();
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');

  const handleCreate = async () => {
    if (!name.trim()) {
      toast({
        title: 'Error',
        description: 'El nombre es requerido',
        variant: 'destructive',
      });
      return;
    }

    try {
      const workflow = await createWorkflow.mutateAsync({
        name: name.trim(),
        description: description.trim() || undefined,
        trigger_type: 'event',
        is_active: false,
      });

      toast({
        title: 'Workflow creado',
        description: 'Ahora puedes configurar los triggers y acciones.',
      });

      onClose();
      router.push(`/app/workflows/${workflow.id}`);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo crear el workflow.',
        variant: 'destructive',
      });
    }
  };

  const handleClose = () => {
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Nuevo Workflow
          </DialogTitle>
          <DialogDescription>
            Crea un nuevo workflow de automatización. Podrás configurar los triggers y acciones después.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="name">
              Nombre *
            </label>
            <Input
              id="name"
              placeholder="Ej: Lead Qualified → Crear Tarea"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="description">
              Descripción
            </label>
            <Input
              id="description"
              placeholder="Descripción opcional del workflow..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </div>

        <DialogFooter>
          <Button disabled={createWorkflow.isPending} variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button disabled={createWorkflow.isPending || !name.trim()} onClick={handleCreate}>
            {createWorkflow.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Workflow
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Delete Workflow Dialog
// ============================================

function DeleteWorkflowDialog({
  workflow,
  open,
  onClose,
}: {
  workflow: WorkflowType | null;
  open: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const { deleteWorkflow } = useWorkflowManagement();

  const handleDelete = async () => {
    if (!workflow) return;

    try {
      await deleteWorkflow.mutateAsync(workflow.id);
      toast({
        title: 'Workflow eliminado',
        description: 'El workflow ha sido eliminado correctamente.',
      });
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el workflow.',
        variant: 'destructive',
      });
    }
  };

  if (!workflow) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <Trash2 className="h-5 w-5" />
            ¿Eliminar workflow?
          </DialogTitle>
          <DialogDescription>
            Esta acción no se puede deshacer. Se eliminará el workflow{' '}
            <strong>&quot;{workflow.name}&quot;</strong> y todo su historial de ejecuciones.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button disabled={deleteWorkflow.isPending} variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button disabled={deleteWorkflow.isPending} variant="destructive" onClick={handleDelete}>
            {deleteWorkflow.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Workflows Table
// ============================================

function WorkflowsTable({
  workflows,
  isLoading,
  onToggleStatus,
  onEdit,
  onDuplicate,
  onDelete,
}: {
  workflows: WorkflowType[];
  isLoading: boolean;
  onToggleStatus: (workflow: WorkflowType) => void;
  onEdit: (workflow: WorkflowType) => void;
  onDuplicate: (workflow: WorkflowType) => void;
  onDelete: (workflow: WorkflowType) => void;
}) {
  const router = useRouter();

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  if (workflows.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Workflow className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium">No hay workflows</h3>
        <p className="text-muted-foreground text-sm mt-1">
          Crea tu primer workflow para automatizar procesos
        </p>
      </div>
    );
  }

  const getStatusIcon = (workflow: WorkflowType) => {
    if (workflow.is_active) {
      return <Play className="h-4 w-4 text-green-600" />;
    }
    return <Pause className="h-4 w-4 text-muted-foreground" />;
  };

  const getTriggerBadges = (workflow: WorkflowType) => {
    const triggers = workflow.triggers ?? [];
    if (triggers.length === 0) {
      return <Badge variant="outline">Sin triggers</Badge>;
    }

    return triggers.slice(0, 2).map((trigger, idx) => (
      <Badge key={idx} className="mr-1" variant="secondary">
        {EVENT_TRIGGER_LABELS[trigger.trigger] ?? trigger.trigger}
      </Badge>
    ));
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Workflow</TableHead>
          <TableHead>Triggers</TableHead>
          <TableHead className="text-center">Acciones</TableHead>
          <TableHead className="text-center">Ejecuciones</TableHead>
          <TableHead>Última ejecución</TableHead>
          <TableHead className="text-center">Estado</TableHead>
          <TableHead className="w-[70px]" />
        </TableRow>
      </TableHeader>
      <TableBody>
        {workflows.map((workflow) => (
          <TableRow
            key={workflow.id}
            className="cursor-pointer"
            onClick={() => router.push(`/app/workflows/${workflow.id}`)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${workflow.is_active ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {getStatusIcon(workflow)}
                </div>
                <div>
                  <div className="font-medium">{workflow.name}</div>
                  {workflow.description && (
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {workflow.description}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <div className="flex flex-wrap gap-1">{getTriggerBadges(workflow)}</div>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="outline">{workflow.action_count ?? 0}</Badge>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="secondary">{workflow.execution_count ?? 0}</Badge>
            </TableCell>
            <TableCell>
              {workflow.last_execution ? (
                <div className="flex items-center gap-1 text-sm text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  {formatDistanceToNow(new Date(workflow.last_execution), {
                    addSuffix: true,
                    locale: es,
                  })}
                </div>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </TableCell>
            <TableCell className="text-center">
              <Switch
                checked={workflow.is_active}
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStatus(workflow);
                }}
              />
            </TableCell>
            <TableCell>
              <DropdownMenu>
                <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                  <Button size="icon" variant="ghost">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={(e) => {
                      e.stopPropagation();
                      onEdit(workflow);
                    }}
                  >
                    <Activity className="mr-2 h-4 w-4" />
                    Ver ejecuciones
                  </DropdownMenuItem>
                  <RBACGuard fallback={null} minRole="manager">
                    <DropdownMenuItem
                      onClick={(e) => {
                        e.stopPropagation();
                        onDuplicate(workflow);
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Duplicar
                    </DropdownMenuItem>
                  </RBACGuard>
                  <RBACGuard fallback={null} minRole="admin">
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(workflow);
                      }}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Eliminar
                    </DropdownMenuItem>
                  </RBACGuard>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function WorkflowsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [filters, setFilters] = React.useState<WorkflowFilters>({});
  const [createDialogOpen, setCreateDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = React.useState<WorkflowType | null>(null);

  const {
    workflows,
    statistics,
    isLoading,
    isLoadingStatistics,
    activateWorkflow,
    deactivateWorkflow,
    duplicateWorkflow,
  } = useWorkflowManagement();

  // Filter workflows locally
  const filteredWorkflows = React.useMemo(() => {
    let result = workflows;

    if (filters.search) {
      const search = filters.search.toLowerCase();
      result = result.filter(
        (w) =>
          w.name.toLowerCase().includes(search) || w.description?.toLowerCase().includes(search)
      );
    }

    if (filters.trigger_type) {
      result = result.filter((w) => w.trigger_type === filters.trigger_type);
    }

    if (filters.is_active !== undefined) {
      result = result.filter((w) => w.is_active === filters.is_active);
    }

    return result;
  }, [workflows, filters]);

  const handleToggleStatus = async (workflow: WorkflowType) => {
    try {
      if (workflow.is_active) {
        await deactivateWorkflow.mutateAsync(workflow.id);
        toast({
          title: 'Workflow desactivado',
          description: `"${workflow.name}" ha sido desactivado.`,
        });
      } else {
        await activateWorkflow.mutateAsync(workflow.id);
        toast({
          title: 'Workflow activado',
          description: `"${workflow.name}" ha sido activado.`,
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cambiar el estado del workflow.',
        variant: 'destructive',
      });
    }
  };

  const handleDuplicate = async (workflow: WorkflowType) => {
    try {
      const newWorkflow = await duplicateWorkflow.mutateAsync(workflow.id);
      toast({
        title: 'Workflow duplicado',
        description: `Se ha creado "${newWorkflow.name}".`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo duplicar el workflow.',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = (workflow: WorkflowType) => {
    setSelectedWorkflow(workflow);
    setDeleteDialogOpen(true);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground">Automatiza procesos con workflows personalizados</p>
        </div>
        <RBACGuard fallback={null} minRole="manager">
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Workflow
          </Button>
        </RBACGuard>
      </div>

      {/* Statistics */}
      <StatisticsCards isLoading={isLoadingStatistics} statistics={statistics} />

      {/* Filters */}
      <WorkflowsFiltersBar filters={filters} onFiltersChange={setFilters} />

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Workflows</CardTitle>
          <CardDescription>
            {filteredWorkflows.length} workflow{filteredWorkflows.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <WorkflowsTable
            isLoading={isLoading}
            workflows={filteredWorkflows}
            onDelete={handleDelete}
            onDuplicate={handleDuplicate}
            onEdit={(w) => router.push(`/app/workflows/${w.id}`)}
            onToggleStatus={handleToggleStatus}
          />
        </CardContent>
      </Card>

      {/* Dialogs */}
      <CreateWorkflowDialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} />

      <DeleteWorkflowDialog
        open={deleteDialogOpen}
        workflow={selectedWorkflow}
        onClose={() => {
          setDeleteDialogOpen(false);
          setSelectedWorkflow(null);
        }}
      />
    </div>
  );
}

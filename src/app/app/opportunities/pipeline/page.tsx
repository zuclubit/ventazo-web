'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  ArrowLeft,
  DollarSign,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Target,
  Trophy,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { RBACGuard } from '@/lib/auth';
import {
  usePipelineManagement,
  type Opportunity,
  type OpportunityPipelineStage,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  formatCurrency,
} from '@/lib/opportunities';

import { OpportunityFormDialog } from '../components/opportunity-form-dialog';
import { WinLostDialog } from '../components/win-lost-dialog';

// ============================================
// Kanban Card Component
// ============================================

interface KanbanCardProps {
  opportunity: Opportunity;
  onDragStart: (e: React.DragEvent, opportunity: Opportunity) => void;
  onEdit: (opportunity: Opportunity) => void;
  onWin: (opportunity: Opportunity) => void;
  onLost: (opportunity: Opportunity) => void;
  onClick: (opportunity: Opportunity) => void;
}

function KanbanCard({
  opportunity,
  onDragStart,
  onEdit,
  onWin,
  onLost,
  onClick,
}: KanbanCardProps) {
  return (
    <div
      draggable
      className="group cursor-grab rounded-lg border bg-card p-3 shadow-sm transition-all hover:shadow-md active:cursor-grabbing"
      onClick={() => onClick(opportunity)}
      onDragStart={(e) => onDragStart(e, opportunity)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100" />
          <div className="flex-1">
            <p className="font-medium text-sm line-clamp-1">{opportunity.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-1">
              {opportunity.customer?.name || opportunity.lead?.fullName || '-'}
            </p>
          </div>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button className="h-6 w-6 opacity-0 group-hover:opacity-100" size="icon" variant="ghost">
              <MoreHorizontal className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onEdit(opportunity);
              }}
            >
              Editar
            </DropdownMenuItem>
            {opportunity.status === 'open' && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-green-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onWin(opportunity);
                  }}
                >
                  <Trophy className="mr-2 h-4 w-4" />
                  Marcar Ganada
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="text-red-600"
                  onClick={(e) => {
                    e.stopPropagation();
                    onLost(opportunity);
                  }}
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Marcar Perdida
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold">
          {formatCurrency(opportunity.amount, opportunity.currency)}
        </span>
        <Badge className={`text-xs ${STATUS_COLORS[opportunity.status]}`}>
          {STATUS_LABELS[opportunity.status]}
        </Badge>
      </div>

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-1">
          <div className="h-1.5 w-10 rounded-full bg-gray-200">
            <div
              className={`h-full rounded-full ${
                opportunity.probability >= 70
                  ? 'bg-green-500'
                  : opportunity.probability >= 40
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}
              style={{ width: `${opportunity.probability}%` }}
            />
          </div>
          <span className="text-xs text-muted-foreground">{opportunity.probability}%</span>
        </div>
        <Badge className={`text-xs ${PRIORITY_COLORS[opportunity.priority]}`} variant="outline">
          {PRIORITY_LABELS[opportunity.priority]}
        </Badge>
      </div>

      {opportunity.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {opportunity.tags.slice(0, 2).map((tag) => (
            <Badge key={tag} className="text-xs" variant="secondary">
              {tag}
            </Badge>
          ))}
          {opportunity.tags.length > 2 && (
            <Badge className="text-xs" variant="secondary">
              +{opportunity.tags.length - 2}
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================
// Kanban Column Component
// ============================================

interface KanbanColumnProps {
  stage: OpportunityPipelineStage;
  opportunities: Opportunity[];
  totalAmount: number;
  totalForecast: number;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, stageId: string) => void;
  onDragStart: (e: React.DragEvent, opportunity: Opportunity) => void;
  onEdit: (opportunity: Opportunity) => void;
  onWin: (opportunity: Opportunity) => void;
  onLost: (opportunity: Opportunity) => void;
  onClick: (opportunity: Opportunity) => void;
  isDragOver: boolean;
}

function KanbanColumn({
  stage,
  opportunities,
  totalAmount,
  totalForecast,
  onDragOver,
  onDrop,
  onDragStart,
  onEdit,
  onWin,
  onLost,
  onClick,
  isDragOver,
}: KanbanColumnProps) {
  return (
    <div
      className={`flex flex-col rounded-lg border bg-muted/30 ${
        isDragOver ? 'ring-2 ring-primary ring-offset-2' : ''
      }`}
      style={{ minWidth: '300px', maxWidth: '300px' }}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, stage.id)}
    >
      {/* Column Header */}
      <div
        className="flex items-center justify-between rounded-t-lg px-3 py-2"
        style={{ backgroundColor: `${stage.color}20`, borderBottom: `3px solid ${stage.color}` }}
      >
        <div className="flex items-center gap-2">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: stage.color }}
          />
          <span className="font-medium text-sm">{stage.label}</span>
          <Badge className="text-xs" variant="secondary">
            {opportunities.length}
          </Badge>
        </div>
        <span className="text-xs text-muted-foreground">{stage.probability}%</span>
      </div>

      {/* Column Stats */}
      <div className="border-b bg-background px-3 py-2">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Total:</span>
          <span className="font-medium">{formatCurrency(totalAmount)}</span>
        </div>
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">Forecast:</span>
          <span className="font-medium text-blue-600">{formatCurrency(totalForecast)}</span>
        </div>
      </div>

      {/* Cards Container */}
      <div className="flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: 'calc(100vh - 350px)' }}>
        {opportunities.map((opp) => (
          <KanbanCard
            key={opp.id}
            opportunity={opp}
            onClick={onClick}
            onDragStart={onDragStart}
            onEdit={onEdit}
            onLost={onLost}
            onWin={onWin}
          />
        ))}
        {opportunities.length === 0 && (
          <div className="flex items-center justify-center py-8 text-center">
            <p className="text-xs text-muted-foreground">
              Sin oportunidades
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// Pipeline Page
// ============================================

export default function PipelinePage() {
  const router = useRouter();
  const { toast } = useToast();

  // Pipeline data
  const {
    columns,
    stages,
    totalOpportunities,
    totalAmount,
    totalForecast,
    wonAmount,
    isLoading,
    moveToStage,
    isMoving,
    refetchPipeline,
  } = usePipelineManagement();

  // Drag state
  const [draggedOpportunity, setDraggedOpportunity] = React.useState<Opportunity | null>(null);
  const [dragOverStageId, setDragOverStageId] = React.useState<string | null>(null);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editOpportunity, setEditOpportunity] = React.useState<Opportunity | null>(null);
  const [winLostOpportunity, setWinLostOpportunity] = React.useState<{
    opportunity: Opportunity;
    action: 'win' | 'lost';
  } | null>(null);

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, opportunity: Opportunity) => {
    setDraggedOpportunity(opportunity);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStageId(null);

    if (!draggedOpportunity) return;
    if (draggedOpportunity.stageId === targetStageId) return;

    moveToStage(draggedOpportunity.id, targetStageId);
    const targetStage = stages.find((s) => s.id === targetStageId);
    toast({
      title: 'Oportunidad movida',
      description: `"${draggedOpportunity.title}" movida a ${targetStage?.label ?? 'nueva etapa'}.`,
    });

    setDraggedOpportunity(null);
  };

  // Click handler
  const handleClick = (opportunity: Opportunity) => {
    router.push(`/app/opportunities/${opportunity.id}`);
  };

  return (
    <div className="flex flex-col h-full p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" onClick={() => router.push('/app/opportunities')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pipeline de Oportunidades</h1>
            <p className="text-muted-foreground">
              Arrastra las oportunidades entre etapas para actualizar su estado
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => refetchPipeline()}>
            <RefreshCw className={`mr-2 h-4 w-4 ${isMoving ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <RBACGuard fallback={null} minRole="sales_rep">
            <Button size="sm" onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Oportunidad
            </Button>
          </RBACGuard>
        </div>
      </div>

      <Separator className="mb-4" />

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 mb-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              {totalOpportunities} oportunidades
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast</CardTitle>
            <Target className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(totalForecast)}</div>
            <p className="text-xs text-muted-foreground">valor ponderado</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganadas</CardTitle>
            <Trophy className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{formatCurrency(wonAmount)}</div>
            <p className="text-xs text-muted-foreground">cerradas ganadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Etapas</CardTitle>
            <Target className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stages.length}</div>
            <p className="text-xs text-muted-foreground">etapas en pipeline</p>
          </CardContent>
        </Card>
      </div>

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : columns.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Target className="h-12 w-12 text-muted-foreground/50" />
          <p className="mt-4 text-lg font-medium">Sin etapas en el pipeline</p>
          <p className="text-sm text-muted-foreground">
            Configura las etapas del pipeline para comenzar
          </p>
        </div>
      ) : (
        <div
          className="flex gap-4 overflow-x-auto pb-4"
          style={{ minHeight: 'calc(100vh - 380px)' }}
          onDragLeave={handleDragLeave}
        >
          {columns.map((column) => (
            <KanbanColumn
              key={column.stage.id}
              isDragOver={dragOverStageId === column.stage.id}
              opportunities={column.opportunities}
              stage={column.stage}
              totalAmount={column.totalAmount}
              totalForecast={column.totalForecast}
              onClick={handleClick}
              onDragOver={handleDragOver}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
              onEdit={setEditOpportunity}
              onLost={(opp) => setWinLostOpportunity({ opportunity: opp, action: 'lost' })}
              onWin={(opp) => setWinLostOpportunity({ opportunity: opp, action: 'win' })}
            />
          ))}
        </div>
      )}

      {/* Dialogs */}
      <OpportunityFormDialog
        open={isCreateOpen || !!editOpportunity}
        opportunity={editOpportunity}
        onClose={() => {
          setIsCreateOpen(false);
          setEditOpportunity(null);
        }}
      />

      <WinLostDialog
        action={winLostOpportunity?.action ?? 'win'}
        open={!!winLostOpportunity}
        opportunity={winLostOpportunity?.opportunity ?? null}
        onClose={() => setWinLostOpportunity(null)}
      />
    </div>
  );
}

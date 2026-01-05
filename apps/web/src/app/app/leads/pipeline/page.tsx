'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  ArrowLeft,
  GripVertical,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Settings,
  Users,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { EmptyState } from '@/components/common/empty-state';
import { RBACGuard } from '@/lib/auth';
import {
  usePipelineView,
  useUpdateLeadStage,
  STATUS_LABELS,
  STATUS_COLORS,
  type Lead,
  type PipelineColumn,
} from '@/lib/leads';

import { LeadFormDialog } from '../components/lead-form-dialog';

// ============================================
// Pipeline Kanban Page
// ============================================

export default function PipelinePage() {
  const router = useRouter();
  const { data: pipelineData, isLoading, refetch } = usePipelineView();
  const updateStage = useUpdateLeadStage();

  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [draggedLead, setDraggedLead] = React.useState<Lead | null>(null);
  const [dragOverStage, setDragOverStage] = React.useState<string | null>(null);

  // Get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, lead: Lead) => {
    setDraggedLead(lead);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', lead.id);
  };

  // Handle drag over
  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverStage(stageId);
  };

  // Handle drag leave
  const handleDragLeave = () => {
    setDragOverStage(null);
  };

  // Handle drop
  const handleDrop = async (e: React.DragEvent, targetStageId: string) => {
    e.preventDefault();
    setDragOverStage(null);

    if (!draggedLead) return;

    // Don't update if dropping in same stage
    if (draggedLead.stageId === targetStageId) {
      setDraggedLead(null);
      return;
    }

    // Don't allow dropping in "no-stage"
    if (targetStageId === 'no-stage') {
      setDraggedLead(null);
      return;
    }

    try {
      await updateStage.mutateAsync({
        leadId: draggedLead.id,
        stageId: targetStageId,
      });
    } catch (error) {
      console.error('Failed to update stage:', error);
    }

    setDraggedLead(null);
  };

  // Handle drag end
  const handleDragEnd = () => {
    setDraggedLead(null);
    setDragOverStage(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="flex items-center justify-between p-6 pb-4">
        <div className="flex items-center gap-4">
          <Button size="icon" variant="ghost" onClick={() => router.push('/app/leads')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Pipeline de Leads</h1>
            <p className="text-muted-foreground">
              {pipelineData?.totalLeads ?? 0} leads en el pipeline
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button size="icon" variant="outline" onClick={() => refetch()}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <RBACGuard fallback={null} minRole="admin">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Configurar Etapas
            </Button>
          </RBACGuard>
          <RBACGuard fallback={null} minRole="sales_rep">
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lead
            </Button>
          </RBACGuard>
        </div>
      </div>

      <Separator />

      {/* Kanban Board */}
      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : !pipelineData?.stages?.length ? (
        <div className="flex items-center justify-center flex-1 p-6">
          <EmptyState
            moduleVariant="leads"
            title="Pipeline vacío"
            description="Configura las etapas del pipeline para organizar tus leads visualmente por estado de avance."
            action={{
              label: 'Configurar Etapas',
              onClick: () => {
                // TODO: Open pipeline settings
                console.log('Configure pipeline');
              },
              icon: Settings,
            }}
            secondaryAction={{
              label: 'Agregar Lead',
              onClick: () => setIsCreateOpen(true),
            }}
            size="lg"
          />
        </div>
      ) : (
        <ScrollArea className="flex-1 p-6">
          <div className="flex gap-4 min-w-max">
            {pipelineData.stages.map((column: PipelineColumn) => (
              <div
                key={column.stage.id}
                className={`w-80 flex-shrink-0 rounded-lg border bg-muted/30 transition-colors ${
                  dragOverStage === column.stage.id
                    ? 'border-primary border-2 bg-primary/5'
                    : ''
                }`}
                onDragLeave={handleDragLeave}
                onDragOver={(e) => handleDragOver(e, column.stage.id)}
                onDrop={(e) => handleDrop(e, column.stage.id)}
              >
                {/* Column Header */}
                <div
                  className="flex items-center justify-between p-4 border-b"
                  style={{ borderTopColor: column.stage.color }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: column.stage.color }}
                    />
                    <h3 className="font-semibold">{column.stage.label}</h3>
                    <Badge className="ml-1" variant="secondary">
                      {column.count}
                    </Badge>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button className="h-8 w-8" size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>Ver todos</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                {/* Cards */}
                <div className="p-2 space-y-2 min-h-[200px]">
                  {column.leads.map((lead: Lead) => (
                    <Card
                      key={lead.id}
                      draggable
                      className={`cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
                        draggedLead?.id === lead.id ? 'opacity-50' : ''
                      }`}
                      onClick={() => router.push(`/app/leads/${lead.id}`)}
                      onDragEnd={handleDragEnd}
                      onDragStart={(e) => handleDragStart(e, lead)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <GripVertical className="h-4 w-4 text-muted-foreground mt-1 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-xs">
                                  {getInitials(lead.fullName)}
                                </AvatarFallback>
                              </Avatar>
                              <p className="font-medium text-sm truncate">
                                {lead.fullName}
                              </p>
                            </div>
                            {lead.companyName && (
                              <p className="text-xs text-muted-foreground mt-1 truncate">
                                {lead.companyName}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-2">
                              <Badge
                                className={`text-xs ${STATUS_COLORS[lead.status]}`}
                                variant="outline"
                              >
                                {STATUS_LABELS[lead.status]}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <div
                                  className="h-1.5 w-8 rounded-full bg-gray-200"
                                  title={`Score: ${lead.score}`}
                                >
                                  <div
                                    className={`h-full rounded-full ${
                                      lead.score >= 70
                                        ? 'bg-green-500'
                                        : lead.score >= 40
                                        ? 'bg-yellow-500'
                                        : 'bg-red-500'
                                    }`}
                                    style={{ width: `${lead.score}%` }}
                                  />
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {lead.score}
                                </span>
                              </div>
                            </div>
                            {lead.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {lead.tags.slice(0, 2).map((tag) => (
                                  <Badge
                                    key={tag}
                                    className="text-xs px-1 py-0"
                                    variant="secondary"
                                  >
                                    {tag}
                                  </Badge>
                                ))}
                                {lead.tags.length > 2 && (
                                  <Badge
                                    className="text-xs px-1 py-0"
                                    variant="secondary"
                                  >
                                    +{lead.tags.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {column.leads.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <p className="text-sm text-muted-foreground">
                        Sin leads en esta etapa
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
      )}

      {/* Create Dialog */}
      <LeadFormDialog
        open={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
      />
    </div>
  );
}

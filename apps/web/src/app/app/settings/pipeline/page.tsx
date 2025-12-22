'use client';

/**
 * Pipeline Settings Page
 *
 * Allows admins to configure pipeline stages for leads.
 * Supports:
 * - Viewing default and custom stages
 * - Adding new custom stages
 * - Editing stage details (name, color, description)
 * - Reordering stages via drag and drop
 * - Deleting custom stages
 */

import * as React from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Pencil, Trash2, Check, X, Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  usePipelineStages,
  useCreatePipelineStage,
  type PipelineStage,
  STAGE_COLOR_PALETTE,
} from '@/lib/leads';

// ============================================
// Sortable Stage Item
// ============================================

interface SortableStageItemProps {
  stage: PipelineStage;
  onEdit: (stage: PipelineStage) => void;
  onDelete: (stage: PipelineStage) => void;
}

function SortableStageItem({ stage, onEdit, onDelete }: SortableStageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stage.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'flex items-center gap-2 sm:gap-3 rounded-lg border p-2.5 sm:p-3',
        'bg-card hover:bg-accent/50',
        'transition-colors',
        isDragging && 'opacity-50 ring-2 ring-primary shadow-lg'
      )}
    >
      {/* Drag Handle */}
      <button
        className="cursor-grab active:cursor-grabbing touch-none text-muted-foreground hover:text-foreground p-1"
        {...attributes}
        {...listeners}
        aria-label="Arrastrar para reordenar"
      >
        <GripVertical className="h-4 w-4 sm:h-5 sm:w-5" />
      </button>

      {/* Stage Color */}
      <div
        className="h-3 w-3 sm:h-4 sm:w-4 rounded-full shrink-0"
        style={{ backgroundColor: stage.color }}
      />

      {/* Stage Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <span className="font-medium text-sm sm:text-base truncate">{stage.label}</span>
          {stage.isDefault && (
            <Badge variant="secondary" className="text-[10px] sm:text-xs px-1.5 py-0">
              Default
            </Badge>
          )}
        </div>
        {stage.description && (
          <p className="text-xs sm:text-sm text-muted-foreground truncate">
            {stage.description}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 sm:gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 sm:h-8 sm:w-8"
          onClick={() => onEdit(stage)}
          aria-label="Editar etapa"
        >
          <Pencil className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
        {!stage.isDefault && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 sm:h-8 sm:w-8 text-destructive hover:text-destructive"
            onClick={() => onDelete(stage)}
            aria-label="Eliminar etapa"
          >
            <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Stage Form Dialog
// ============================================

interface StageFormDialogProps {
  open: boolean;
  onClose: () => void;
  stage?: PipelineStage | null;
  onSave: (data: { label: string; description: string; color: string }) => void;
  isLoading?: boolean;
}

function StageFormDialog({
  open,
  onClose,
  stage,
  onSave,
  isLoading,
}: StageFormDialogProps) {
  const [label, setLabel] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [color, setColor] = React.useState(STAGE_COLOR_PALETTE[0] ?? '#3B82F6');

  React.useEffect(() => {
    if (stage) {
      setLabel(stage.label);
      setDescription(stage.description || '');
      setColor(stage.color);
    } else {
      setLabel('');
      setDescription('');
      const randomIndex = Math.floor(Math.random() * STAGE_COLOR_PALETTE.length);
      setColor(STAGE_COLOR_PALETTE[randomIndex] ?? '#3B82F6');
    }
  }, [stage, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (label.trim()) {
      onSave({ label: label.trim(), description: description.trim(), color });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {stage ? 'Editar Etapa' : 'Nueva Etapa'}
          </DialogTitle>
          <DialogDescription>
            {stage
              ? 'Modifica los detalles de esta etapa del pipeline.'
              : 'Agrega una nueva etapa personalizada a tu pipeline.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="label">Nombre</Label>
            <Input
              id="label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Ej: Reunion Agendada"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripcion (opcional)</Label>
            <Input
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Ej: Lead con reunion confirmada"
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {STAGE_COLOR_PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  className={cn(
                    'h-8 w-8 rounded-full transition-all',
                    'ring-offset-background focus-visible:outline-none',
                    'focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    color === c && 'ring-2 ring-ring ring-offset-2'
                  )}
                  style={{ backgroundColor: c }}
                  onClick={() => setColor(c)}
                />
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading || !label.trim()}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {stage ? 'Guardar' : 'Crear'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Delete Confirmation Dialog
// ============================================

interface DeleteConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  stageName: string;
  isLoading?: boolean;
}

function DeleteConfirmDialog({
  open,
  onClose,
  onConfirm,
  stageName,
  isLoading,
}: DeleteConfirmDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Eliminar etapa</AlertDialogTitle>
          <AlertDialogDescription>
            Estas seguro que deseas eliminar la etapa &quot;{stageName}&quot;?
            Los leads en esta etapa seran movidos a la primera etapa del pipeline.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isLoading}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Eliminar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function PipelineSettingsPage() {
  const { data: stages = [], isLoading, refetch } = usePipelineStages();
  const createStage = useCreatePipelineStage();

  const [localStages, setLocalStages] = React.useState<PipelineStage[]>([]);
  const [editingStage, setEditingStage] = React.useState<PipelineStage | null>(null);
  const [deletingStage, setDeletingStage] = React.useState<PipelineStage | null>(null);
  const [isFormOpen, setIsFormOpen] = React.useState(false);

  // Sync local state with fetched data
  React.useEffect(() => {
    if (stages.length > 0) {
      setLocalStages([...stages].sort((a, b) => a.order - b.order));
    }
  }, [stages]);

  // DnD sensors - Include touch for mobile devices
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms hold before drag starts on touch
        tolerance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setLocalStages((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id);
        const newIndex = items.findIndex((i) => i.id === over.id);
        return arrayMove(items, oldIndex, newIndex);
      });
      // TODO: Call API to update order
    }
  };

  // Handle create/edit
  const handleSaveStage = async (data: { label: string; description: string; color: string }) => {
    try {
      if (editingStage) {
        // TODO: Implement update API
        console.log('Update stage:', editingStage.id, data);
      } else {
        await createStage.mutateAsync({
          label: data.label,
          description: data.description,
          color: data.color,
          order: localStages.length,
        });
      }
      setIsFormOpen(false);
      setEditingStage(null);
      refetch();
    } catch (error) {
      console.error('Error saving stage:', error);
    }
  };

  // Handle delete
  const handleDeleteStage = async () => {
    if (!deletingStage) return;
    try {
      // TODO: Implement delete API
      console.log('Delete stage:', deletingStage.id);
      setDeletingStage(null);
      refetch();
    } catch (error) {
      console.error('Error deleting stage:', error);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="text-xl sm:text-2xl font-bold tracking-tight">Pipeline de Leads</h2>
        <p className="text-sm sm:text-base text-muted-foreground mt-1">
          Configura las etapas de tu pipeline de ventas.
        </p>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader className="space-y-4">
          {/* Header with responsive stacking */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base sm:text-lg">Etapas del Pipeline</CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Arrastra para reordenar las etapas.
              </CardDescription>
            </div>
            <Button
              onClick={() => setIsFormOpen(true)}
              size="sm"
              className="w-full sm:w-auto"
            >
              <Plus className="mr-2 h-4 w-4" />
              Nueva Etapa
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : localStages.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>No hay etapas configuradas.</p>
              <p className="text-sm">Las etapas por defecto se crearan automaticamente.</p>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={localStages.map((s) => s.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {localStages.map((stage) => (
                    <SortableStageItem
                      key={stage.id}
                      stage={stage}
                      onEdit={(s) => {
                        setEditingStage(s);
                        setIsFormOpen(true);
                      }}
                      onDelete={setDeletingStage}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base">Pipeline por Defecto</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs sm:text-sm text-muted-foreground mb-3 sm:mb-4">
            El pipeline por defecto incluye 4 etapas esenciales:
          </p>
          <div className="grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
            {[
              { name: 'Nuevo', color: '#3B82F6', desc: 'Recien ingresado' },
              { name: 'Contactado', color: '#F59E0B', desc: 'Primer contacto' },
              { name: 'Calificado', color: '#10B981', desc: 'Listo para propuesta' },
              { name: 'Propuesta', color: '#06B6D4', desc: 'Esperando respuesta' },
            ].map((stage) => (
              <div
                key={stage.name}
                className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/50"
              >
                <div
                  className="h-3 w-3 rounded-full shrink-0"
                  style={{ backgroundColor: stage.color }}
                />
                <div className="min-w-0">
                  <p className="font-medium text-xs sm:text-sm truncate">{stage.name}</p>
                  <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{stage.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Stage Form Dialog */}
      <StageFormDialog
        open={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingStage(null);
        }}
        stage={editingStage}
        onSave={handleSaveStage}
        isLoading={createStage.isPending}
      />

      {/* Delete Confirmation */}
      <DeleteConfirmDialog
        open={!!deletingStage}
        onClose={() => setDeletingStage(null)}
        onConfirm={handleDeleteStage}
        stageName={deletingStage?.label || ''}
      />
    </div>
  );
}

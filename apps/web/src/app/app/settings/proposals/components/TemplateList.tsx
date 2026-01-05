'use client';

import * as React from 'react';
import { Plus, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import {
  type ProposalTemplate,
  useProposalTemplatesManagement,
  useProposalTemplateMutations,
} from '@/lib/proposal-templates';
import { TemplateEditorSheet } from '@/components/proposal-editor';
import { TemplateCard } from './TemplateCard';

/**
 * Template list with CRUD operations
 */
export function TemplateList() {
  const { toast } = useToast();
  const { templates, isLoading, refetch } = useProposalTemplatesManagement();
  const { duplicate, delete: deleteTemplate, setDefault, isLoading: isMutating } = useProposalTemplateMutations();

  const [editorOpen, setEditorOpen] = React.useState(false);
  const [editingTemplate, setEditingTemplate] = React.useState<ProposalTemplate | undefined>();

  const handleCreate = () => {
    setEditingTemplate(undefined);
    setEditorOpen(true);
  };

  const handleEdit = (template: ProposalTemplate) => {
    setEditingTemplate(template);
    setEditorOpen(true);
  };

  const handleDuplicate = async (template: ProposalTemplate) => {
    try {
      await duplicate(template.id);
      toast({
        title: 'Plantilla duplicada',
        description: `Se creo una copia de "${template.name}"`,
      });
      refetch();
    } catch (error) {
      console.error('Error duplicating template:', error);
      toast({
        title: 'Error',
        description: 'No se pudo duplicar la plantilla',
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async (template: ProposalTemplate) => {
    if (template.isDefault) {
      toast({
        title: 'No se puede eliminar',
        description: 'La plantilla predeterminada no puede ser eliminada',
        variant: 'destructive',
      });
      return;
    }

    try {
      await deleteTemplate(template.id);
      toast({
        title: 'Plantilla eliminada',
        description: `"${template.name}" fue eliminada`,
      });
      refetch();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: 'Error',
        description: 'No se pudo eliminar la plantilla',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (template: ProposalTemplate) => {
    try {
      await setDefault(template.id);
      toast({
        title: 'Plantilla predeterminada',
        description: `"${template.name}" es ahora la plantilla predeterminada`,
      });
      refetch();
    } catch (error) {
      console.error('Error setting default template:', error);
      toast({
        title: 'Error',
        description: 'No se pudo establecer como predeterminada',
        variant: 'destructive',
      });
    }
  };

  const handleEditorSave = () => {
    refetch();
  };

  if (isLoading) {
    return <TemplateListSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Plantillas de Propuesta</h2>
          <p className="text-sm text-muted-foreground">
            Personaliza el formato de tus cotizaciones PDF
          </p>
        </div>
        <Button onClick={handleCreate} disabled={isMutating}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Plantilla
        </Button>
      </div>

      {/* Template Grid */}
      {templates.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-1">Sin plantillas</h3>
          <p className="text-sm text-muted-foreground mb-4 text-center max-w-sm">
            Crea tu primera plantilla para personalizar el diseno de tus propuestas
          </p>
          <Button onClick={handleCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Crear Plantilla
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {templates.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              onEdit={() => handleEdit(template)}
              onDuplicate={() => handleDuplicate(template)}
              onDelete={() => handleDelete(template)}
              onSetDefault={() => handleSetDefault(template)}
            />
          ))}
        </div>
      )}

      {/* Editor Sheet */}
      <TemplateEditorSheet
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        template={editingTemplate}
        onSave={handleEditorSave}
      />
    </div>
  );
}

function TemplateListSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="border rounded-lg overflow-hidden">
            <Skeleton className="aspect-[3/4]" />
            <div className="p-4 space-y-2">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

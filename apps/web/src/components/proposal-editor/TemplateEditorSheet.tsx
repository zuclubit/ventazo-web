'use client';

import * as React from 'react';
import { Save, X, Layout, Palette, RefreshCw } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import {
  type ProposalTemplate,
  type ProposalSection,
  type ProposalStyles,
  type CreateProposalTemplateRequest,
  DEFAULT_SECTIONS,
  DEFAULT_DARK_STYLES,
  useProposalTemplateMutations,
} from '@/lib/proposal-templates';
import { SectionEditor } from './SectionEditor';
import { StyleEditor } from './StyleEditor';
import { PreviewPanel } from './PreviewPanel';
import { cn } from '@/lib/utils';

interface TemplateEditorSheetProps {
  open: boolean;
  onClose: () => void;
  template?: ProposalTemplate;
  onSave?: (template: ProposalTemplate) => void;
}

/**
 * Main template editor sheet with sections, styles, and preview
 */
export function TemplateEditorSheet({
  open,
  onClose,
  template,
  onSave,
}: TemplateEditorSheetProps) {
  const { toast } = useToast();
  const { create, update, isLoading } = useProposalTemplateMutations();

  // Form state
  const [name, setName] = React.useState(template?.name ?? '');
  const [description, setDescription] = React.useState(template?.description ?? '');
  const [sections, setSections] = React.useState<ProposalSection[]>(
    template?.sections ?? [...DEFAULT_SECTIONS]
  );
  const [styles, setStyles] = React.useState<ProposalStyles>(
    template?.styles ?? { ...DEFAULT_DARK_STYLES }
  );

  // Preview state
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<'sections' | 'styles'>('sections');

  // Reset form when template changes
  React.useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description ?? '');
      setSections(template.sections);
      setStyles(template.styles);
    } else {
      setName('');
      setDescription('');
      setSections([...DEFAULT_SECTIONS]);
      setStyles({ ...DEFAULT_DARK_STYLES });
    }
    setPreviewUrl(null);
  }, [template, open]);

  // Cleanup preview URL on unmount
  React.useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const handleSave = async () => {
    if (!name.trim()) {
      toast({
        title: 'Nombre requerido',
        description: 'Por favor ingresa un nombre para la plantilla',
        variant: 'destructive',
      });
      return;
    }

    try {
      const data: CreateProposalTemplateRequest = {
        name: name.trim(),
        description: description.trim() || undefined,
        sections,
        styles,
      };

      let savedTemplate: ProposalTemplate;

      if (template) {
        savedTemplate = await update({
          templateId: template.id,
          data,
        });
        toast({
          title: 'Plantilla actualizada',
          description: 'Los cambios se guardaron correctamente',
        });
      } else {
        savedTemplate = await create(data);
        toast({
          title: 'Plantilla creada',
          description: 'La nueva plantilla se guardo correctamente',
        });
      }

      onSave?.(savedTemplate);
      onClose();
    } catch (error) {
      console.error('Error saving template:', error);
      toast({
        title: 'Error al guardar',
        description: 'No se pudo guardar la plantilla. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleRefreshPreview = async () => {
    // TODO: Generate actual preview from PDF service
    // For now, just simulate loading
    setIsPreviewLoading(true);
    setTimeout(() => {
      setIsPreviewLoading(false);
      toast({
        title: 'Vista previa',
        description: 'La generacion de vista previa estara disponible pronto',
      });
    }, 1500);
  };

  const isEditMode = !!template;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        size="xl"
        className="p-0 flex flex-col sm:max-w-2xl lg:max-w-4xl"
        hideCloseButton
      >
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>
                {isEditMode ? 'Editar Plantilla' : 'Nueva Plantilla'}
              </SheetTitle>
              <SheetDescription>
                Personaliza el diseno de tus propuestas PDF
              </SheetDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleRefreshPreview}
                disabled={isPreviewLoading}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isPreviewLoading && 'animate-spin')} />
                Vista previa
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isLoading}>
                <Save className="h-4 w-4 mr-2" />
                Guardar
              </Button>
              <Button variant="ghost" size="icon" onClick={onClose}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">
          {/* Editor Panel */}
          <div className="flex-1 flex flex-col border-r overflow-hidden lg:max-w-[50%]">
            {/* Name & Description */}
            <div className="px-6 py-4 border-b space-y-4 shrink-0">
              <div className="space-y-2">
                <Label htmlFor="template-name">Nombre *</Label>
                <Input
                  id="template-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Propuesta Profesional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="template-description">Descripcion</Label>
                <Textarea
                  id="template-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descripcion opcional de la plantilla..."
                  className="resize-none h-16"
                />
              </div>
            </div>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as 'sections' | 'styles')}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <TabsList className="w-full justify-start rounded-none border-b bg-transparent h-11 shrink-0 px-6">
                <TabsTrigger value="sections" className="gap-2">
                  <Layout className="h-4 w-4" />
                  Secciones
                </TabsTrigger>
                <TabsTrigger value="styles" className="gap-2">
                  <Palette className="h-4 w-4" />
                  Estilos
                </TabsTrigger>
              </TabsList>

              <TabsContent value="sections" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <SectionEditor sections={sections} onChange={setSections} />
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="styles" className="flex-1 m-0 overflow-hidden">
                <ScrollArea className="h-full">
                  <div className="p-6">
                    <StyleEditor styles={styles} onChange={setStyles} />
                  </div>
                </ScrollArea>
              </TabsContent>
            </Tabs>
          </div>

          {/* Preview Panel - Hidden on mobile */}
          <div className="hidden lg:flex flex-1 flex-col overflow-hidden">
            <PreviewPanel
              previewUrl={previewUrl ?? undefined}
              isLoading={isPreviewLoading}
              onRefresh={handleRefreshPreview}
              onDownload={() => {
                if (previewUrl) {
                  const link = document.createElement('a');
                  link.href = previewUrl;
                  link.download = `preview-${name || 'template'}.pdf`;
                  link.click();
                }
              }}
            />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

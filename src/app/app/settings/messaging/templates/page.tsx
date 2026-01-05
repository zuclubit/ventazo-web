'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  ArrowLeft,
  ChevronDown,
  Copy,
  Edit,
  Eye,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  Search,
  Trash2,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  MESSAGE_CHANNELS,
  TEMPLATE_VARIABLES,
  useCreateTemplate,
  useDeleteTemplate,
  useDuplicateTemplate,
  useMessageTemplates,
  usePreviewTemplate,
  useUpdateTemplate,
  type CreateTemplateRequest,
  type MessageChannel,
  type MessageTemplate,
} from '@/lib/messaging';
import { cn } from '@/lib/utils';

// ============================================
// Constants
// ============================================

const CHANNEL_CONFIG: Record<MessageChannel, { icon: React.ReactNode; label: string; color: string }> = {
  email: { icon: <Mail className="h-4 w-4" />, label: 'Email', color: 'bg-blue-100 text-blue-800' },
  sms: { icon: <MessageSquare className="h-4 w-4" />, label: 'SMS', color: 'bg-green-100 text-green-800' },
  whatsapp: { icon: <Phone className="h-4 w-4" />, label: 'WhatsApp', color: 'bg-emerald-100 text-emerald-800' },
  push: { icon: <MessageSquare className="h-4 w-4" />, label: 'Push', color: 'bg-purple-100 text-purple-800' },
  internal: { icon: <MessageSquare className="h-4 w-4" />, label: 'Interno', color: 'bg-gray-100 text-gray-800' },
};

// ============================================
// Template Card Component
// ============================================

interface TemplateCardProps {
  template: MessageTemplate;
  onEdit: (template: MessageTemplate) => void;
  onPreview: (template: MessageTemplate) => void;
  onDuplicate: (id: string) => void;
  onDelete: (id: string) => void;
  isDeleting: boolean;
  isDuplicating: boolean;
}

function TemplateCard({
  template,
  onEdit,
  onPreview,
  onDuplicate,
  onDelete,
  isDeleting,
  isDuplicating,
}: TemplateCardProps) {
  const channelConfig = CHANNEL_CONFIG[template.channel];

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className={cn('p-2 rounded-lg', channelConfig.color)}>{channelConfig.icon}</div>
            <div>
              <CardTitle className="text-base">{template.name}</CardTitle>
              <Badge className="mt-1" variant="secondary">
                {channelConfig.label}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="ghost">
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onPreview(template)}>
                <Eye className="h-4 w-4 mr-2" />
                Previsualizar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(template)}>
                <Edit className="h-4 w-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem disabled={isDuplicating} onClick={() => onDuplicate(template.id)}>
                {isDuplicating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                disabled={isDeleting}
                onClick={() => onDelete(template.id)}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="pb-3">
        {template.description && (
          <p className="text-sm text-muted-foreground line-clamp-2">{template.description}</p>
        )}
        {template.subjectTemplate && (
          <div className="mt-2 p-2 bg-muted/50 rounded text-xs font-mono truncate">
            {template.subjectTemplate}
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 text-xs text-muted-foreground">
        <div className="flex items-center gap-4">
          <span>Variables: {template.variables?.length ?? 0}</span>
          <span>
            Actualizado:{' '}
            {new Date(template.updatedAt).toLocaleDateString('es-MX', {
              month: 'short',
              day: 'numeric',
            })}
          </span>
        </div>
      </CardFooter>
    </Card>
  );
}

// ============================================
// Template Editor Dialog
// ============================================

interface TemplateEditorProps {
  template?: MessageTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: CreateTemplateRequest) => void;
  isSaving: boolean;
}

function TemplateEditor({ template, open, onOpenChange, onSave, isSaving }: TemplateEditorProps) {
  const [name, setName] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [channel, setChannel] = React.useState<MessageChannel>('email');
  const [subject, setSubject] = React.useState('');
  const [body, setBody] = React.useState('');
  const [activeVariableGroup, setActiveVariableGroup] = React.useState<keyof typeof TEMPLATE_VARIABLES>('lead');

  // Reset form when template changes
  React.useEffect(() => {
    if (template) {
      setName(template.name);
      setDescription(template.description ?? '');
      setChannel(template.channel);
      setSubject(template.subjectTemplate ?? '');
      setBody(template.bodyTemplate);
    } else {
      setName('');
      setDescription('');
      setChannel('email');
      setSubject('');
      setBody('');
    }
  }, [template, open]);

  const handleSave = () => {
    onSave({
      name,
      description: description || undefined,
      channel,
      subjectTemplate: subject || undefined,
      bodyTemplate: body,
      variables: [], // Will be extracted by backend
    });
  };

  const insertVariable = (variableName: string) => {
    const variable = `{{${variableName}}}`;
    setBody((prev) => prev + variable);
  };

  const isValid = name.trim() && body.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{template ? 'Editar Template' : 'Nuevo Template'}</DialogTitle>
          <DialogDescription>
            Crea un template de mensaje con variables dinámicas
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="grid gap-6 py-4">
            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  placeholder="Ej: Bienvenida a nuevo lead"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="channel">Canal *</Label>
                <Select value={channel} onValueChange={(v) => setChannel(v as MessageChannel)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MESSAGE_CHANNELS.map((ch) => (
                      <SelectItem key={ch} value={ch}>
                        <div className="flex items-center gap-2">
                          {CHANNEL_CONFIG[ch].icon}
                          {CHANNEL_CONFIG[ch].label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Input
                id="description"
                placeholder="Descripción opcional del template"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            {/* Subject (for email) */}
            {channel === 'email' && (
              <div className="space-y-2">
                <Label htmlFor="subject">Asunto del Email</Label>
                <Input
                  id="subject"
                  placeholder='Ej: Bienvenido {{lead.name}} a {{tenant.name}}'
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                />
              </div>
            )}

            {/* Body Editor with Variables */}
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2 space-y-2">
                <Label htmlFor="body">Contenido del Mensaje *</Label>
                <Textarea
                  className="min-h-[300px] font-mono text-sm"
                  id="body"
                  placeholder='Hola {{lead.name}},

Gracias por tu interés en nuestros servicios...

{{#if lead.company}}
Vemos que trabajas en {{lead.company}}.
{{/if}}

Saludos,
{{user.name}}'
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                />
              </div>

              {/* Variables Panel */}
              <div className="space-y-2">
                <Label>Variables Disponibles</Label>
                <Card className="h-[300px] overflow-hidden">
                  <Tabs value={activeVariableGroup} onValueChange={(v) => setActiveVariableGroup(v as keyof typeof TEMPLATE_VARIABLES)}>
                    <TabsList className="w-full grid grid-cols-4 h-auto p-1">
                      <TabsTrigger className="text-xs px-2 py-1" value="lead">
                        Lead
                      </TabsTrigger>
                      <TabsTrigger className="text-xs px-2 py-1" value="customer">
                        Cliente
                      </TabsTrigger>
                      <TabsTrigger className="text-xs px-2 py-1" value="user">
                        Usuario
                      </TabsTrigger>
                      <TabsTrigger className="text-xs px-2 py-1" value="tenant">
                        Tenant
                      </TabsTrigger>
                    </TabsList>
                    {Object.entries(TEMPLATE_VARIABLES).map(([group, variables]) => (
                      <TabsContent key={group} className="m-0" value={group}>
                        <ScrollArea className="h-[240px]">
                          <div className="p-2 space-y-1">
                            {variables.map((variable) => (
                              <Button
                                key={variable.name}
                                className="w-full justify-start text-xs h-8"
                                size="sm"
                                variant="ghost"
                                onClick={() => insertVariable(variable.name)}
                              >
                                <code className="bg-muted px-1 rounded mr-2">
                                  {`{{${variable.name}}}`}
                                </code>
                                <span className="text-muted-foreground truncate">
                                  {variable.label}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      </TabsContent>
                    ))}
                  </Tabs>
                </Card>
                <p className="text-xs text-muted-foreground">
                  Haz clic en una variable para insertarla en el contenido
                </p>
              </div>
            </div>

            {/* Syntax Help */}
            <Card className="bg-muted/50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Sintaxis de Templates</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <p className="font-medium mb-1">Variables</p>
                    <code className="bg-background px-1 rounded">{`{{variable}}`}</code>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Condicionales</p>
                    <code className="bg-background px-1 rounded">{`{{#if var}}...{{/if}}`}</code>
                  </div>
                  <div>
                    <p className="font-medium mb-1">Listas</p>
                    <code className="bg-background px-1 rounded">{`{{#each items}}...{{/each}}`}</code>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button disabled={!isValid || isSaving} onClick={handleSave}>
            {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {template ? 'Guardar Cambios' : 'Crear Template'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Preview Dialog
// ============================================

interface PreviewDialogProps {
  template: MessageTemplate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function PreviewDialog({ template, open, onOpenChange }: PreviewDialogProps) {
  const preview = usePreviewTemplate();
  const [context, setContext] = React.useState<Record<string, string>>({});

  React.useEffect(() => {
    if (template && open) {
      // Initialize context with template variables
      const initialContext: Record<string, string> = {};
      template.variables?.forEach((v) => {
        initialContext[v.name] = v.defaultValue?.toString() ?? '';
      });
      setContext(initialContext);
    }
  }, [template, open]);

  const handlePreview = () => {
    if (template) {
      preview.mutate({
        templateId: template.id,
        context,
      });
    }
  };

  if (!template) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Previsualizar: {template.name}</DialogTitle>
          <DialogDescription>
            Ingresa valores de prueba para las variables
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Variable Inputs */}
          {template.variables && template.variables.length > 0 && (
            <div className="space-y-3">
              <Label>Variables de Prueba</Label>
              <div className="grid grid-cols-2 gap-3">
                {template.variables.map((variable) => (
                  <div key={variable.name} className="space-y-1">
                    <Label className="text-xs text-muted-foreground">{variable.label}</Label>
                    <Input
                      placeholder={variable.name}
                      value={context[variable.name] ?? ''}
                      onChange={(e) =>
                        setContext((prev) => ({ ...prev, [variable.name]: e.target.value }))
                      }
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            className="w-full"
            disabled={preview.isPending}
            variant="secondary"
            onClick={handlePreview}
          >
            {preview.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Eye className="h-4 w-4 mr-2" />
            )}
            Generar Preview
          </Button>

          {/* Preview Result */}
          {preview.data && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Resultado</CardTitle>
              </CardHeader>
              <CardContent className="py-0 pb-3">
                {preview.data.subject && (
                  <div className="mb-3">
                    <Label className="text-xs text-muted-foreground">Asunto</Label>
                    <p className="font-medium">{preview.data.subject}</p>
                  </div>
                )}
                <div>
                  <Label className="text-xs text-muted-foreground">Contenido</Label>
                  <div className="mt-1 p-3 bg-muted rounded-lg whitespace-pre-wrap text-sm">
                    {preview.data.body}
                  </div>
                </div>
                {preview.data.errors && preview.data.errors.length > 0 && (
                  <div className="mt-3 p-2 bg-destructive/10 rounded text-xs text-destructive">
                    {preview.data.errors.join(', ')}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function MessageTemplatesPage() {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedChannel, setSelectedChannel] = React.useState<MessageChannel | 'all'>('all');
  const [editorOpen, setEditorOpen] = React.useState(false);
  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [selectedTemplate, setSelectedTemplate] = React.useState<MessageTemplate | null>(null);

  // Queries
  const { data: templates = [], isLoading } = useMessageTemplates(
    selectedChannel === 'all' ? undefined : selectedChannel
  );

  // Mutations
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const duplicateTemplate = useDuplicateTemplate();

  // Filtered templates
  const filteredTemplates = React.useMemo(() => {
    if (!searchQuery) return templates;
    const query = searchQuery.toLowerCase();
    return templates.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.description?.toLowerCase().includes(query)
    );
  }, [templates, searchQuery]);

  // Handlers
  const handleCreate = () => {
    setSelectedTemplate(null);
    setEditorOpen(true);
  };

  const handleEdit = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setEditorOpen(true);
  };

  const handlePreview = (template: MessageTemplate) => {
    setSelectedTemplate(template);
    setPreviewOpen(true);
  };

  const handleSave = (data: CreateTemplateRequest) => {
    if (selectedTemplate) {
      updateTemplate.mutate(
        { id: selectedTemplate.id, ...data },
        {
          onSuccess: () => setEditorOpen(false),
        }
      );
    } else {
      createTemplate.mutate(data, {
        onSuccess: () => setEditorOpen(false),
      });
    }
  };

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild size="icon" variant="ghost">
          <Link href="/app/settings">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">Templates de Mensajes</h1>
          <p className="text-muted-foreground">
            Gestiona los templates para emails, SMS y WhatsApp
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Template
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center gap-4">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                placeholder="Buscar templates..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  className="absolute right-1 top-1 h-6 w-6"
                  size="icon"
                  variant="ghost"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="h-3 w-3" />
                </Button>
              )}
            </div>

            {/* Channel Filter */}
            <Tabs
              value={selectedChannel}
              onValueChange={(v) => setSelectedChannel(v as MessageChannel | 'all')}
            >
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                {MESSAGE_CHANNELS.map((ch) => (
                  <TabsTrigger key={ch} value={ch}>
                    <div className="flex items-center gap-1.5">
                      {CHANNEL_CONFIG[ch].icon}
                      <span className="hidden sm:inline">{CHANNEL_CONFIG[ch].label}</span>
                    </div>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          </div>
        </CardContent>
      </Card>

      {/* Templates Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-12 text-center">
            <Mail className="h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium">No hay templates</h3>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {searchQuery
                ? 'No se encontraron templates con ese criterio'
                : 'Crea tu primer template para comenzar'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreate}>
                <Plus className="h-4 w-4 mr-2" />
                Crear Template
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredTemplates.map((template) => (
            <TemplateCard
              key={template.id}
              isDeleting={deleteTemplate.isPending}
              isDuplicating={duplicateTemplate.isPending}
              template={template}
              onDelete={(id) => deleteTemplate.mutate(id)}
              onDuplicate={(id) => duplicateTemplate.mutate(id)}
              onEdit={handleEdit}
              onPreview={handlePreview}
            />
          ))}
        </div>
      )}

      {/* Editor Dialog */}
      <TemplateEditor
        isSaving={createTemplate.isPending || updateTemplate.isPending}
        open={editorOpen}
        template={selectedTemplate}
        onOpenChange={setEditorOpen}
        onSave={handleSave}
      />

      {/* Preview Dialog */}
      <PreviewDialog
        open={previewOpen}
        template={selectedTemplate}
        onOpenChange={setPreviewOpen}
      />
    </div>
  );
}

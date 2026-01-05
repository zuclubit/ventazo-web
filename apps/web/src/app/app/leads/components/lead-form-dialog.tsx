'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateLead,
  useUpdateLead,
  usePipelineStages,
  LeadSource,
  SOURCE_LABELS,
  type Lead,
} from '@/lib/leads';
import { sanitizeLeadData, sanitizeTags } from '@/lib/security/form-sanitizer';

// ============================================
// Schema
// ============================================

const leadFormSchema = z.object({
  fullName: z.string().min(1, 'El nombre es requerido').max(255),
  email: z.string().email('Email invalido').max(255),
  phone: z.string().max(50).optional().or(z.literal('')),
  companyName: z.string().max(255).optional().or(z.literal('')),
  website: z.string().url('URL invalida').max(255).optional().or(z.literal('')),
  industry: z.string().max(100).optional().or(z.literal('')),
  source: z.nativeEnum(LeadSource).optional(),
  stageId: z.string().uuid().optional().or(z.literal('')),
  notes: z.string().max(2000).optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
});

type LeadFormData = z.infer<typeof leadFormSchema>;

// ============================================
// Props
// ============================================

interface LeadFormDialogProps {
  lead?: Lead | null;
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function LeadFormDialog({ lead, open, onClose }: LeadFormDialogProps) {
  const isEditing = !!lead;
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>(lead?.tags || []);
  const { toast } = useToast();

  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const { data: stages } = usePipelineStages();

  const isLoading = createLead.isPending || updateLead.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      companyName: '',
      website: '',
      industry: '',
      source: LeadSource.MANUAL,
      stageId: '',
      notes: '',
      tags: [],
    },
  });

  // Reset form when dialog opens/closes or lead changes
  React.useEffect(() => {
    if (open && lead) {
      reset({
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone || '',
        companyName: lead.companyName || '',
        website: lead.website || '',
        industry: lead.industry || '',
        source: lead.source,
        stageId: lead.stageId || '',
        notes: lead.notes || '',
        tags: lead.tags,
      });
      setTags(lead.tags);
    } else if (open && !lead) {
      reset({
        fullName: '',
        email: '',
        phone: '',
        companyName: '',
        website: '',
        industry: '',
        source: LeadSource.MANUAL,
        stageId: '',
        notes: '',
        tags: [],
      });
      setTags([]);
    }
  }, [open, lead, reset]);

  // Handle tag add
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  // Handle tag remove
  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  // Handle form submit
  const onSubmit = async (data: LeadFormData) => {
    try {
      // Sanitize all input data before sending to API (XSS prevention)
      const sanitizedData = sanitizeLeadData(data);
      const sanitizedTags = sanitizeTags(tags);

      const payload = {
        ...sanitizedData,
        phone: sanitizedData.phone || undefined,
        companyName: sanitizedData.companyName || undefined,
        website: sanitizedData.website || undefined,
        industry: sanitizedData.industry || undefined,
        stageId: sanitizedData.stageId || undefined,
        notes: sanitizedData.notes || undefined,
        tags: sanitizedTags,
      };

      if (isEditing && lead) {
        await updateLead.mutateAsync({
          leadId: lead.id,
          data: payload,
        });
        toast({
          title: 'Lead actualizado',
          description: 'Los cambios se guardaron correctamente.',
        });
      } else {
        await createLead.mutateAsync(payload);
        toast({
          title: 'Lead creado',
          description: 'El lead se creo correctamente.',
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to save lead:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar el lead. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Lead' : 'Nuevo Lead'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del lead'
              : 'Completa la informacion para crear un nuevo lead'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {/* Full Name & Email */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo *</Label>
              <Input
                disabled={isLoading}
                id="fullName"
                placeholder="Juan Perez"
                {...register('fullName')}
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                disabled={isLoading}
                id="email"
                placeholder="juan@empresa.com"
                type="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Phone & Company */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                disabled={isLoading}
                id="phone"
                placeholder="+52 555 123 4567"
                {...register('phone')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="companyName">Empresa</Label>
              <Input
                disabled={isLoading}
                id="companyName"
                placeholder="Acme Inc."
                {...register('companyName')}
              />
            </div>
          </div>

          {/* Website & Industry */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="website">Sitio web</Label>
              <Input
                disabled={isLoading}
                id="website"
                placeholder="https://empresa.com"
                {...register('website')}
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="industry">Industria</Label>
              <Input
                disabled={isLoading}
                id="industry"
                placeholder="Tecnologia"
                {...register('industry')}
              />
            </div>
          </div>

          {/* Source & Stage */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fuente</Label>
              <Select
                defaultValue={watch('source')}
                disabled={isLoading}
                onValueChange={(value) => setValue('source', value as LeadSource)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.values(LeadSource).map((source) => (
                    <SelectItem key={source} value={source}>
                      {SOURCE_LABELS[source]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Etapa del Pipeline</Label>
              <Select
                defaultValue={watch('stageId') || '_none'}
                disabled={isLoading}
                onValueChange={(value) => setValue('stageId', value === '_none' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar etapa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Sin etapa</SelectItem>
                  {stages?.map((stage) => (
                    <SelectItem key={stage.id} value={stage.id}>
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: stage.color }}
                        />
                        {stage.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                disabled={isLoading}
                placeholder="Agregar etiqueta..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                disabled={isLoading || !tagInput.trim()}
                type="button"
                variant="outline"
                onClick={handleAddTag}
              >
                Agregar
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} className="gap-1" variant="secondary">
                    {tag}
                    <button
                      aria-label={`Eliminar etiqueta: ${tag}`}
                      className="hover:bg-muted rounded-full"
                      disabled={isLoading}
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <X className="h-3 w-3" aria-hidden="true" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              className="min-h-[100px]"
              disabled={isLoading}
              id="notes"
              placeholder="Notas adicionales sobre el lead..."
              {...register('notes')}
            />
          </div>

          <DialogFooter>
            <Button disabled={isLoading} type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={isLoading} type="submit">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Lead'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

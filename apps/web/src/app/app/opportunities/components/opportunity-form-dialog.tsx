'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateOpportunity,
  useUpdateOpportunity,
  usePipelineStages,
  type Opportunity,
  OPPORTUNITY_PRIORITY,
  PRIORITY_LABELS,
} from '@/lib/opportunities';
import { sanitizeOpportunityData, sanitizeTags } from '@/lib/security/form-sanitizer';
import { cn } from '@/lib/utils';

// ============================================
// Form Schema
// ============================================

const opportunityFormSchema = z.object({
  title: z.string().min(2, 'El titulo debe tener al menos 2 caracteres'),
  description: z.string().optional(),
  stageId: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  amount: z.coerce.number().min(0, 'El monto debe ser positivo'),
  currency: z.string().default('USD'),
  probability: z.number().min(0).max(100),
  expectedCloseDate: z.date().optional().nullable(),
  tags: z.string().optional(), // Comma-separated
});

type OpportunityFormValues = z.infer<typeof opportunityFormSchema>;

// ============================================
// Props
// ============================================

interface OpportunityFormDialogProps {
  opportunity?: Opportunity | null;
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function OpportunityFormDialog({
  opportunity,
  open,
  onClose,
}: OpportunityFormDialogProps) {
  const { toast } = useToast();
  const isEditing = !!opportunity;

  // Mutations
  const createOpportunity = useCreateOpportunity();
  const updateOpportunity = useUpdateOpportunity();

  // Pipeline stages
  const { data: stages } = usePipelineStages();

  // Form
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      title: '',
      description: '',
      stageId: '',
      priority: 'medium',
      amount: 0,
      currency: 'USD',
      probability: 50,
      expectedCloseDate: null,
      tags: '',
    },
  });

  // Reset form when opportunity changes
  React.useEffect(() => {
    if (opportunity) {
      form.reset({
        title: opportunity.title,
        description: opportunity.description ?? '',
        stageId: opportunity.stageId ?? '',
        priority: opportunity.priority,
        amount: opportunity.amount,
        currency: opportunity.currency,
        probability: opportunity.probability,
        expectedCloseDate: opportunity.expectedCloseDate
          ? new Date(opportunity.expectedCloseDate)
          : null,
        tags: opportunity.tags.join(', '),
      });
    } else {
      form.reset({
        title: '',
        description: '',
        stageId: stages?.[0]?.id ?? '',
        priority: 'medium',
        amount: 0,
        currency: 'USD',
        probability: stages?.[0]?.probability ?? 50,
        expectedCloseDate: null,
        tags: '',
      });
    }
  }, [opportunity, form, stages]);

  // Handle stage change (auto-update probability)
  const handleStageChange = (stageId: string) => {
    form.setValue('stageId', stageId);
    const stage = stages?.find((s) => s.id === stageId);
    if (stage) {
      form.setValue('probability', stage.probability);
    }
  };

  // Submit handler
  const onSubmit = async (values: OpportunityFormValues) => {
    // Sanitize all input data before sending to API (XSS prevention)
    const sanitizedValues = sanitizeOpportunityData(values as Record<string, unknown>) as OpportunityFormValues;
    const rawTags = sanitizedValues.tags
      ? sanitizedValues.tags.split(',').map((t) => t.trim()).filter(Boolean)
      : [];
    const sanitizedTagsArray = sanitizeTags(rawTags);

    const payload = {
      title: sanitizedValues.title,
      description: sanitizedValues.description || undefined,
      stageId: sanitizedValues.stageId || undefined,
      priority: sanitizedValues.priority,
      amount: sanitizedValues.amount,
      currency: sanitizedValues.currency,
      probability: sanitizedValues.probability,
      expectedCloseDate: sanitizedValues.expectedCloseDate?.toISOString(),
      tags: sanitizedTagsArray,
    };

    try {
      if (isEditing && opportunity) {
        await updateOpportunity.mutateAsync({
          opportunityId: opportunity.id,
          data: payload,
        });
        toast({
          title: 'Oportunidad actualizada',
          description: 'La oportunidad ha sido actualizada exitosamente.',
        });
      } else {
        await createOpportunity.mutateAsync(payload);
        toast({
          title: 'Oportunidad creada',
          description: 'La nueva oportunidad ha sido creada exitosamente.',
        });
      }
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: isEditing
          ? 'No se pudo actualizar la oportunidad.'
          : 'No se pudo crear la oportunidad.',
        variant: 'destructive',
      });
    }
  };

  const isPending = createOpportunity.isPending || updateOpportunity.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Oportunidad' : 'Nueva Oportunidad'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Actualiza la informacion de la oportunidad.'
              : 'Crea una nueva oportunidad de venta.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titulo *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ej: Implementacion CRM Empresa X" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descripcion</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      placeholder="Descripcion de la oportunidad..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Stage & Priority Row */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="stageId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Etapa del Pipeline</FormLabel>
                    <Select value={field.value} onValueChange={handleStageChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar etapa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages?.map((stage) => (
                          <SelectItem key={stage.id} value={stage.id}>
                            <div className="flex items-center gap-2">
                              <div
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: stage.color }}
                              />
                              {stage.label} ({stage.probability}%)
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Prioridad</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar prioridad" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPPORTUNITY_PRIORITY.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {PRIORITY_LABELS[priority]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Amount & Currency Row */}
            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem className="col-span-2">
                    <FormLabel>Monto *</FormLabel>
                    <FormControl>
                      <Input
                        min={0}
                        placeholder="0"
                        step={100}
                        type="number"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="USD">USD</SelectItem>
                        <SelectItem value="MXN">MXN</SelectItem>
                        <SelectItem value="EUR">EUR</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Probability Slider */}
            <FormField
              control={form.control}
              name="probability"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Probabilidad de Cierre: {field.value}%</FormLabel>
                  <FormControl>
                    <Slider
                      className="py-4"
                      max={100}
                      step={5}
                      value={[field.value]}
                      onValueChange={([value]) => field.onChange(value)}
                    />
                  </FormControl>
                  <FormDescription>
                    Forecast: ${((form.watch('amount') * field.value) / 100).toLocaleString()}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Expected Close Date */}
            <FormField
              control={form.control}
              name="expectedCloseDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Fecha de Cierre Esperada</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          className={cn(
                            'w-full pl-3 text-left font-normal',
                            !field.value && 'text-muted-foreground'
                          )}
                          variant="outline"
                        >
                          {field.value ? (
                            format(field.value, "d 'de' MMMM 'de' yyyy", { locale: es })
                          ) : (
                            <span>Seleccionar fecha</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent align="start" className="w-auto p-0">
                      <Calendar
                        initialFocus
                        disabled={(date) =>
                          date < new Date(new Date().setHours(0, 0, 0, 0))
                        }
                        mode="single"
                        selected={field.value ?? undefined}
                        onSelect={field.onChange}
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Tags */}
            <FormField
              control={form.control}
              name="tags"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Etiquetas</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Ej: enterprise, crm, urgente (separadas por coma)"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Separa las etiquetas con comas
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button disabled={isPending} type="submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar Cambios' : 'Crear Oportunidad'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

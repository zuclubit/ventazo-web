'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
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
import { useI18n } from '@/lib/i18n';
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
  OPPORTUNITY_SOURCE,
} from '@/lib/opportunities';
import { sanitizeOpportunityData, sanitizeTags } from '@/lib/security/form-sanitizer';
import { cn } from '@/lib/utils';
import { AttachmentSection } from '@/components/ui/attachment-section';
import { Separator } from '@/components/ui/separator';

// ============================================
// Form Schema Factory
// ============================================

const createOpportunityFormSchema = (t: ReturnType<typeof useI18n>['t']) => z.object({
  name: z.string().min(2, t.opportunities.form.validation.nameMin),
  description: z.string().optional(),
  stageId: z.string().min(1, t.opportunities.form.validation.stageRequired),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  amount: z.coerce.number().min(0, t.opportunities.form.validation.amountPositive),
  currency: z.string().default('USD'),
  probability: z.number().min(0).max(100),
  expectedCloseDate: z.date().optional().nullable(),
  tags: z.string().optional(),
  source: z.enum(['lead_conversion', 'direct', 'referral', 'upsell', 'cross_sell', '__none__']).optional(),
});

type OpportunityFormValues = z.infer<ReturnType<typeof createOpportunityFormSchema>>;

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

// Date locale mapping
const dateLocales: Record<string, typeof es> = {
  'es-MX': es,
  'es-CO': es,
  'es-AR': es,
  'es-CL': es,
  'es-PE': es,
  'pt-BR': ptBR,
  'en-US': enUS,
};

export function OpportunityFormDialog({
  opportunity,
  open,
  onClose,
}: OpportunityFormDialogProps) {
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const isEditing = !!opportunity;

  // Create schema with translations
  const opportunityFormSchema = React.useMemo(
    () => createOpportunityFormSchema(t),
    [t]
  );

  // Get date locale
  const dateLocale = dateLocales[locale] || es;

  // Mutations
  const createOpportunity = useCreateOpportunity();
  const updateOpportunity = useUpdateOpportunity();

  // Pipeline stages - ensure it's always an array
  const { data: stagesData } = usePipelineStages();
  const stages = Array.isArray(stagesData) ? stagesData : [];

  // Form
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      name: '',
      description: '',
      stageId: '',
      priority: 'medium',
      amount: 0,
      currency: 'USD',
      probability: 50,
      expectedCloseDate: null,
      tags: '',
      source: '__none__',
    },
  });

  // Track if we've initialized the form for a new opportunity
  const lastOpportunityId = React.useRef<string | null>(null);
  const hasInitializedEmpty = React.useRef(false);

  // Reset tracking refs when dialog closes
  React.useEffect(() => {
    if (!open) {
      lastOpportunityId.current = null;
      hasInitializedEmpty.current = false;
    }
  }, [open]);

  // Reset form when opportunity changes (or when creating new)
  React.useEffect(() => {
    if (!open) return; // Don't run when dialog is closed

    const currentId = opportunity?.id ?? null;

    if (opportunity && currentId !== lastOpportunityId.current) {
      // Editing: reset with opportunity data
      lastOpportunityId.current = currentId;
      hasInitializedEmpty.current = false;
      form.reset({
        name: opportunity.name,
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
        source: (opportunity.source as '__none__' | 'lead_conversion' | 'direct' | 'referral' | 'upsell' | 'cross_sell') ?? '__none__',
      });
    } else if (!opportunity && !hasInitializedEmpty.current) {
      // Creating new: reset to empty form only once
      lastOpportunityId.current = null;
      hasInitializedEmpty.current = true;
      const defaultStage = stages?.[0];
      form.reset({
        name: '',
        description: '',
        stageId: defaultStage?.id ?? '',
        priority: 'medium',
        amount: 0,
        currency: 'USD',
        probability: defaultStage?.probability ?? 50,
        expectedCloseDate: null,
        tags: '',
        source: '__none__',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunity?.id, open]);

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

    // Get the stage label from the selected stageId
    // Backend requires 'stage' (label) not 'stageId' (uuid) for create/update
    const selectedStage = stages?.find((s) => s.id === sanitizedValues.stageId);
    if (!selectedStage) {
      toast({
        title: t.opportunities.form.errors.createFailed,
        description: t.opportunities.form.validation.stageRequired,
        variant: 'destructive',
      });
      return;
    }

    const payload = {
      name: sanitizedValues.name,
      description: sanitizedValues.description || undefined,
      stage: selectedStage.label, // Backend requires stage label, not stageId
      priority: sanitizedValues.priority,
      amount: sanitizedValues.amount,
      currency: sanitizedValues.currency,
      probability: sanitizedValues.probability,
      expectedCloseDate: sanitizedValues.expectedCloseDate?.toISOString(),
      source: sanitizedValues.source && sanitizedValues.source !== '__none__' ? sanitizedValues.source : undefined,
      tags: sanitizedTagsArray,
    };

    try {
      if (isEditing && opportunity) {
        await updateOpportunity.mutateAsync({
          opportunityId: opportunity.id,
          data: payload,
        });
        toast({
          title: t.opportunities.form.success.updated,
          description: t.opportunities.form.success.updatedDescription,
        });
      } else {
        await createOpportunity.mutateAsync(payload);
        toast({
          title: t.opportunities.form.success.created,
          description: t.opportunities.form.success.createdDescription,
        });
      }
      onClose();
    } catch (error) {
      // Extract error message from API response
      const errorMessage = error instanceof Error
        ? error.message
        : t.opportunities.form.errors.loadFailed;

      toast({
        title: isEditing ? t.opportunities.form.errors.updateFailed : t.opportunities.form.errors.createFailed,
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  const isPending = createOpportunity.isPending || updateOpportunity.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? t.opportunities.editOpportunity : t.opportunities.newOpportunity}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? t.opportunities.form.sections.basic.description
              : t.opportunities.form.sections.basic.description}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            {/* Name */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.opportunities.form.fields.name.label} *</FormLabel>
                  <FormControl>
                    <Input placeholder={t.opportunities.form.fields.name.placeholder} {...field} />
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
                  <FormLabel>{t.opportunities.form.fields.description.label}</FormLabel>
                  <FormControl>
                    <Textarea
                      className="resize-none"
                      placeholder={t.opportunities.form.fields.description.placeholder}
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
                    <FormLabel>{t.opportunities.form.fields.stage.label}</FormLabel>
                    <Select value={field.value} onValueChange={handleStageChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t.opportunities.form.fields.stage.placeholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {stages.length > 0 ? (
                          stages.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="h-2 w-2 rounded-full"
                                  style={{ backgroundColor: stage.color }}
                                />
                                {stage.label} ({stage.probability}%)
                              </div>
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="__loading__" disabled>
                            Cargando etapas...
                          </SelectItem>
                        )}
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
                    <FormLabel>{t.opportunities.form.fields.priority.label}</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder={t.opportunities.form.fields.priority.placeholder} />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {OPPORTUNITY_PRIORITY.map((priority) => (
                          <SelectItem key={priority} value={priority}>
                            {t.opportunities.priority[priority as keyof typeof t.opportunities.priority]}
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
                    <FormLabel>{t.opportunities.form.fields.amount.label} *</FormLabel>
                    <FormControl>
                      <Input
                        min={0}
                        placeholder={t.opportunities.form.fields.amount.placeholder}
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
                    <FormLabel>{t.opportunities.form.fields.currency.label}</FormLabel>
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
                  <FormLabel>{t.opportunities.form.fields.probability.label}: {field.value}%</FormLabel>
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
                    {t.opportunities.probability.forecast}: ${((form.watch('amount') * field.value) / 100).toLocaleString()}
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
                  <FormLabel>{t.opportunities.form.fields.expectedCloseDate.label}</FormLabel>
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
                            format(field.value, 'PPP', { locale: dateLocale })
                          ) : (
                            <span>{t.opportunities.form.fields.expectedCloseDate.placeholder}</span>
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
                        locale={dateLocale}
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

            {/* Source */}
            <FormField
              control={form.control}
              name="source"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t.opportunities.form.fields.source.label}</FormLabel>
                  <Select value={field.value || '__none__'} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={t.opportunities.form.fields.source.placeholder} />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="__none__">{t.opportunities.source.unspecified}</SelectItem>
                      {OPPORTUNITY_SOURCE.map((source) => (
                        <SelectItem key={source} value={source}>
                          {t.opportunities.source[source as keyof typeof t.opportunities.source] || source}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
                  <FormLabel>{t.opportunities.form.fields.tags.label}</FormLabel>
                  <FormControl>
                    <Input
                      placeholder={t.opportunities.form.fields.tags.placeholder}
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    {t.opportunities.form.fields.tags.hint}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Attachments - Only show if editing (opportunity already has ID) */}
            {isEditing && opportunity?.id && (
              <>
                <Separator className="my-4" />
                <AttachmentSection
                  entityType="opportunity"
                  entityId={opportunity.id}
                  title="Documentos de la Oportunidad"
                  description="Adjunta propuestas, presentaciones o documentos del negocio"
                  category="proposal"
                  accessLevel="team"
                  view="compact"
                  compact
                />
              </>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={onClose}>
                {t.opportunities.form.actions.cancel}
              </Button>
              <Button disabled={isPending} type="submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? t.opportunities.form.actions.save : t.opportunities.form.actions.create}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

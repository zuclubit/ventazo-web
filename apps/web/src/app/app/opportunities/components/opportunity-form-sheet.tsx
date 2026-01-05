'use client';

/**
 * OpportunityFormSheet - v1.0 (2025 World-Class)
 *
 * Premium form for creating and editing opportunities.
 * Homologated with LeadFormSheet for consistent UX.
 *
 * Design Principles:
 * - CSS-first responsive: No JavaScript for layout decisions
 * - Mobile-first: Base styles for mobile, breakpoints for larger
 * - Touch-friendly: 48px minimum touch targets
 * - Progressive disclosure: Collapsible sections
 * - Accessibility: WCAG 2.1 AA compliant
 * - Safe areas: Proper padding for notched devices
 *
 * @module opportunities/components/OpportunityFormSheet
 */

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Briefcase,
  CalendarIcon,
  Check,
  DollarSign,
  Loader2,
  Percent,
  Plus,
  Sparkles,
  Tag,
  Target,
  TrendingUp,
  X,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useI18n } from '@/lib/i18n';
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

// Reuse lead form components
import {
  FormField,
  FormSection,
  FormSections,
} from '../../leads/components/lead-form';

// ============================================
// Schema
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
// Types
// ============================================

export interface OpportunityFormSheetProps {
  opportunity?: Opportunity | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (opportunity: Opportunity) => void;
}

// ============================================
// Tag Input Component
// ============================================

interface TagInputProps {
  value: string;
  onChange: (value: string) => void;
  tags: string[];
  onTagsChange: (tags: string[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

function TagInput({ value, onChange, tags, onTagsChange, disabled, placeholder }: TagInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const tag = value.trim();
      if (tag && !tags.includes(tag) && tags.length < 10) {
        onTagsChange([...tags, tag]);
        onChange('');
      }
    } else if (e.key === 'Backspace' && !value && tags.length > 0) {
      onTagsChange(tags.slice(0, -1));
    }
  };

  const removeTag = (tagToRemove: string) => {
    onTagsChange(tags.filter(t => t !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div
        className={cn(
          'flex flex-wrap gap-2 p-3 rounded-lg',
          'border border-input/60 bg-background/80',
          'min-h-11',
          'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary',
          'transition-all',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        onClick={() => inputRef.current?.focus()}
      >
        <AnimatePresence mode="popLayout">
          {tags.map((tag) => (
            <motion.div
              key={tag}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              layout
            >
              <Badge
                variant="secondary"
                className="gap-1 pr-1 text-xs py-1 px-2 bg-primary/10 hover:bg-primary/20"
              >
                <span className="truncate max-w-[100px]">{tag}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    removeTag(tag);
                  }}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            </motion.div>
          ))}
        </AnimatePresence>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || tags.length >= 10}
          placeholder={tags.length >= 10 ? 'Límite alcanzado' : placeholder}
          className={cn(
            'flex-1 min-w-[100px] bg-transparent border-none outline-none',
            'text-sm placeholder:text-muted-foreground',
            disabled && 'cursor-not-allowed'
          )}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {tags.length}/10 - Presiona Enter para agregar
      </p>
    </div>
  );
}

// ============================================
// Priority Pills Component
// ============================================

interface PriorityPillsProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  t: ReturnType<typeof useI18n>['t'];
}

function PriorityPills({ value, onChange, disabled, t }: PriorityPillsProps) {
  const priorities = [
    { id: 'low', color: 'var(--action-win, #22C55E)' },
    { id: 'medium', color: 'var(--action-warning, #F59E0B)' },
    { id: 'high', color: 'var(--opp-priority-high-text, #F97316)' },
    { id: 'critical', color: 'var(--action-lost, #EF4444)' },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {priorities.map((priority) => (
        <button
          key={priority.id}
          type="button"
          disabled={disabled}
          onClick={() => onChange(priority.id)}
          className={cn(
            'px-3 py-1.5 rounded-full text-sm font-medium',
            'border-2 transition-all duration-200',
            'touch-manipulation',
            value === priority.id
              ? 'text-white shadow-md scale-105'
              : 'bg-background hover:bg-muted border-border/50'
          )}
          style={{
            borderColor: priority.color,
            backgroundColor: value === priority.id ? priority.color : undefined,
          }}
        >
          {t.opportunities.priority[priority.id as keyof typeof t.opportunities.priority]}
        </button>
      ))}
    </div>
  );
}

// ============================================
// Date locale mapping
// ============================================

const dateLocales: Record<string, typeof es> = {
  'es-MX': es,
  'es-CO': es,
  'es-AR': es,
  'es-CL': es,
  'es-PE': es,
  'pt-BR': ptBR,
  'en-US': enUS,
};

// ============================================
// Main Component
// ============================================

export function OpportunityFormSheet({
  opportunity,
  open,
  onClose,
  onSuccess,
}: OpportunityFormSheetProps) {
  const { toast } = useToast();
  const { t, locale } = useI18n();
  const isEditing = !!opportunity;

  // Tags state
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>([]);

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

  // Pipeline stages
  const { data: stagesData } = usePipelineStages();
  const stages = Array.isArray(stagesData) ? stagesData : [];

  // Form
  const form = useForm<OpportunityFormValues>({
    resolver: zodResolver(opportunityFormSchema),
    mode: 'onChange',
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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = form;

  // Watch values for progress and forecast
  const watchedAmount = watch('amount') || 0;
  const watchedProbability = watch('probability') || 0;
  const watchedName = watch('name') || '';
  const watchedDescription = watch('description') || '';

  // Refs to track initialization state (prevents infinite loops)
  const lastOpportunityId = React.useRef<string | null>(null);
  const hasInitializedEmpty = React.useRef(false);

  // Reset refs when sheet closes
  React.useEffect(() => {
    if (!open) {
      lastOpportunityId.current = null;
      hasInitializedEmpty.current = false;
    }
  }, [open]);

  // Reset form when sheet opens (with guards to prevent infinite loops)
  React.useEffect(() => {
    if (!open) return;

    if (opportunity) {
      // Only reset if this is a different opportunity
      if (lastOpportunityId.current === opportunity.id) return;
      lastOpportunityId.current = opportunity.id;

      reset({
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
        tags: '',
        source: (opportunity.source as '__none__' | 'lead_conversion' | 'direct' | 'referral' | 'upsell' | 'cross_sell') ?? '__none__',
      });
      setTags(opportunity.tags || []);
    } else {
      // Only reset for new opportunity once
      if (hasInitializedEmpty.current) return;
      hasInitializedEmpty.current = true;

      const defaultStage = stages?.[0];
      reset({
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
      setTags([]);
    }
    setTagInput('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opportunity?.id, open]);

  // Handle stage change (auto-update probability)
  const handleStageChange = (stageId: string) => {
    setValue('stageId', stageId);
    const stage = stages?.find((s) => s.id === stageId);
    if (stage) {
      setValue('probability', stage.probability);
    }
  };

  // Submit handler
  const onSubmit = async (values: OpportunityFormValues) => {
    const sanitizedValues = sanitizeOpportunityData(values as Record<string, unknown>) as OpportunityFormValues;
    const sanitizedTagsArray = sanitizeTags(tags);

    // Get stage label
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
      stage: selectedStage.label,
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
        const result = await updateOpportunity.mutateAsync({
          opportunityId: opportunity.id,
          data: payload,
        });
        toast({
          title: t.opportunities.form.success.updated,
          description: (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              {t.opportunities.form.success.updatedDescription}
            </span>
          ),
        });
        onSuccess?.(result as Opportunity);
      } else {
        const result = await createOpportunity.mutateAsync(payload);
        toast({
          title: t.opportunities.form.success.created,
          description: (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t.opportunities.form.success.createdDescription}
            </span>
          ),
        });
        onSuccess?.(result as Opportunity);
      }
      onClose();
    } catch (error) {
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

  // Progress calculation
  const requiredFields = ['name', 'stageId', 'amount'] as const;
  const optionalFields = ['description', 'expectedCloseDate'] as const;
  const filledRequired = requiredFields.filter((f) => {
    const val = watch(f);
    return val !== undefined && val !== '' && val !== 0;
  }).length;
  const filledOptional = optionalFields.filter((f) => watch(f)).length;
  const progress = Math.round(
    ((filledRequired / requiredFields.length) * 0.7 +
      (filledOptional / optionalFields.length) * 0.3) *
      100
  );

  // Weighted forecast
  const weightedForecast = (watchedAmount * watchedProbability) / 100;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side="right"
        hideCloseButton
        accessibleTitle={isEditing ? t.opportunities.editOpportunity : t.opportunities.newOpportunity}
        className={cn(
          'flex flex-col p-0 gap-0',
          'backdrop-blur-xl bg-background/95',
          'w-full max-w-full',
          'sm:w-[480px] sm:max-w-[calc(100vw-2rem)]',
          'md:w-[520px]'
        )}
      >
        {/* Header */}
        <div
          className={cn(
            'flex items-center justify-between shrink-0',
            'px-4 py-3 sm:px-5 sm:py-4',
            'border-b border-border/40'
          )}
        >
          <div className="flex-1 min-w-0 mr-3">
            <h2 className="text-lg font-semibold truncate">
              {isEditing ? t.opportunities.editOpportunity : t.opportunities.newOpportunity}
            </h2>
            {/* Progress bar */}
            <div className="flex items-center gap-2 mt-1.5">
              <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden shadow-inner">
                <motion.div
                  className="h-full bg-gradient-to-r from-primary to-primary/80 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
              <span
                className={cn(
                  "text-xs font-semibold tabular-nums min-w-[2.5rem] text-right",
                  progress === 0 && "text-muted-foreground",
                  progress > 0 && progress < 70 && "text-amber-600 dark:text-amber-400",
                  progress >= 70 && "text-primary"
                )}
              >
                {progress}%
              </span>
            </div>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-10 w-10 rounded-full shrink-0"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form Content */}
        <ScrollArea className="flex-1 min-h-0">
          <form
            id="opportunity-form"
            className="px-5 py-5 space-y-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Weighted Forecast Card */}
            <div className={cn(
              'p-4 rounded-xl',
              'bg-gradient-to-br from-primary/10 to-primary/5',
              'border border-primary/20'
            )}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium text-muted-foreground">
                    {t.opportunities.probability.forecast}
                  </span>
                </div>
                <span className="text-2xl font-bold text-primary tabular-nums">
                  ${weightedForecast.toLocaleString()}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                ${watchedAmount.toLocaleString()} × {watchedProbability}%
              </p>
            </div>

            <FormSections>
              {/* Basic Info */}
              <FormSection
                title={t.opportunities.form.sections.basic.title}
                icon={Target}
                defaultExpanded={true}
                collapsible={false}
              >
                <div className="space-y-4">
                  <FormField
                    label={t.opportunities.form.fields.name.label}
                    id="name"
                    error={errors.name?.message}
                    required
                  >
                    <Input
                      id="name"
                      placeholder={t.opportunities.form.fields.name.placeholder}
                      disabled={isPending}
                      className="h-11 rounded-lg"
                      {...register('name')}
                    />
                  </FormField>

                  <FormField
                    label={t.opportunities.form.fields.description.label}
                    id="description"
                  >
                    <Textarea
                      id="description"
                      placeholder={t.opportunities.form.fields.description.placeholder}
                      disabled={isPending}
                      className="resize-none min-h-[80px]"
                      rows={3}
                      {...register('description')}
                    />
                  </FormField>

                  {/* Stage Select */}
                  <FormField
                    label={t.opportunities.form.fields.stage.label}
                    id="stageId"
                    error={errors.stageId?.message}
                    required
                  >
                    <Controller
                      name="stageId"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={handleStageChange}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-11 rounded-lg">
                            <SelectValue placeholder={t.opportunities.form.fields.stage.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            {stages.length > 0 ? (
                              stages.map((stage) => (
                                <SelectItem key={stage.id} value={stage.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full shrink-0"
                                      style={{ backgroundColor: stage.color }}
                                    />
                                    <span>{stage.label}</span>
                                    <span className="text-muted-foreground">({stage.probability}%)</span>
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
                      )}
                    />
                  </FormField>

                  {/* Priority */}
                  <FormField label={t.opportunities.form.fields.priority.label} id="priority">
                    <Controller
                      name="priority"
                      control={control}
                      render={({ field }) => (
                        <PriorityPills
                          value={field.value}
                          onChange={field.onChange}
                          disabled={isPending}
                          t={t}
                        />
                      )}
                    />
                  </FormField>
                </div>
              </FormSection>

              {/* Financial Info */}
              <FormSection
                title="Información Financiera"
                icon={DollarSign}
                defaultExpanded={true}
              >
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3">
                    <FormField
                      label={t.opportunities.form.fields.amount.label}
                      id="amount"
                      error={errors.amount?.message}
                      required
                      className="col-span-2"
                    >
                      <Input
                        id="amount"
                        type="number"
                        min={0}
                        step={100}
                        placeholder={t.opportunities.form.fields.amount.placeholder}
                        disabled={isPending}
                        className="h-11 rounded-lg"
                        {...register('amount')}
                      />
                    </FormField>

                    <FormField
                      label={t.opportunities.form.fields.currency.label}
                      id="currency"
                    >
                      <Controller
                        name="currency"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isPending}
                          >
                            <SelectTrigger className="h-11 rounded-lg">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="MXN">MXN</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>
                  </div>

                  {/* Probability Slider */}
                  <FormField
                    label={`${t.opportunities.form.fields.probability.label}: ${watchedProbability}%`}
                    id="probability"
                  >
                    <div className="pt-2 pb-4">
                      <Controller
                        name="probability"
                        control={control}
                        render={({ field }) => (
                          <Slider
                            max={100}
                            step={5}
                            value={[field.value]}
                            onValueChange={([value]) => field.onChange(value)}
                            disabled={isPending}
                            className="w-full"
                          />
                        )}
                      />
                    </div>
                  </FormField>

                  {/* Expected Close Date */}
                  <FormField
                    label={t.opportunities.form.fields.expectedCloseDate.label}
                    id="expectedCloseDate"
                  >
                    <Controller
                      name="expectedCloseDate"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              disabled={isPending}
                              className={cn(
                                'w-full h-11 rounded-lg justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, 'PPP', { locale: dateLocale })
                              ) : (
                                <span>{t.opportunities.form.fields.expectedCloseDate.placeholder}</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="start" className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={field.value ?? undefined}
                              onSelect={field.onChange}
                              disabled={(date) =>
                                date < new Date(new Date().setHours(0, 0, 0, 0))
                              }
                              locale={dateLocale}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                  </FormField>
                </div>
              </FormSection>

              {/* Classification */}
              <FormSection
                title="Clasificación"
                icon={Tag}
                defaultExpanded={isEditing}
              >
                <div className="space-y-4">
                  <FormField label={t.opportunities.form.fields.source.label} id="source">
                    <Controller
                      name="source"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value || '__none__'}
                          onValueChange={field.onChange}
                          disabled={isPending}
                        >
                          <SelectTrigger className="h-11 rounded-lg">
                            <SelectValue placeholder={t.opportunities.form.fields.source.placeholder} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">{t.opportunities.source.unspecified}</SelectItem>
                            {OPPORTUNITY_SOURCE.map((source) => (
                              <SelectItem key={source} value={source}>
                                {t.opportunities.source[source as keyof typeof t.opportunities.source] || source}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </FormField>

                  <FormField label={t.opportunities.form.fields.tags.label} id="tags">
                    <TagInput
                      value={tagInput}
                      onChange={setTagInput}
                      tags={tags}
                      onTagsChange={setTags}
                      disabled={isPending}
                      placeholder={t.opportunities.form.fields.tags.placeholder}
                    />
                  </FormField>
                </div>
              </FormSection>
            </FormSections>
          </form>
        </ScrollArea>

        {/* Footer */}
        <div
          className={cn(
            'shrink-0',
            'px-4 pt-3 sm:px-5 sm:pt-4',
            'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px)+1rem)]',
            'sm:pb-4',
            'border-t border-border/40',
            'bg-background/95 backdrop-blur-sm'
          )}
        >
          {/* Validation errors */}
          <AnimatePresence>
            {Object.keys(errors).length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-3 p-3 rounded-lg bg-destructive/10 border border-destructive/20"
              >
                <p className="text-xs text-destructive flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>Por favor corrige los errores antes de continuar</span>
                </p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit button */}
          <Button
            type="submit"
            form="opportunity-form"
            disabled={isPending || !isValid}
            className={cn(
              'w-full h-12',
              'text-base font-semibold',
              'rounded-xl',
              'bg-primary shadow-lg shadow-primary/30',
              'hover:shadow-xl hover:shadow-primary/40',
              'active:scale-[0.98]',
              'transition-all duration-200',
              'disabled:opacity-50 disabled:shadow-none'
            )}
          >
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {isEditing ? 'Guardando...' : 'Creando...'}
              </>
            ) : isEditing ? (
              <>
                <Check className="mr-2 h-5 w-5" />
                {t.opportunities.form.actions.save}
              </>
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                {t.opportunities.form.actions.create}
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default OpportunityFormSheet;

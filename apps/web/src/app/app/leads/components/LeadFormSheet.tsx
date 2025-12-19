'use client';

/**
 * Lead Form Sheet - Premium Edition
 *
 * A modern, accessible form for creating and editing leads.
 * Features progressive disclosure, visual status selection, and
 * real-time preview.
 *
 * @module leads/components/LeadFormSheet
 */

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Check,
  Globe,
  Loader2,
  Mail,
  Phone,
  Plus,
  Sparkles,
  Tag,
  User,
  X,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useIsMobile } from '@/hooks/use-media-query';
import {
  useCreateLead,
  useUpdateLead,
  usePipelineStages,
  LeadSource,
  type Lead,
} from '@/lib/leads';
import { useI18n } from '@/lib/i18n/context';
import { sanitizeLeadData, sanitizeTags } from '@/lib/security/form-sanitizer';
import { cn } from '@/lib/utils';

import {
  FormField,
  InputWithIcon,
  TextareaWithCounter,
  StatusPills,
  FormSection,
  FormSections,
} from './lead-form';

// ============================================
// Schema Factory with i18n Validation
// ============================================

type ValidationMessages = {
  nameMin: string;
  nameMax: string;
  nameInvalid: string;
  emailRequired: string;
  emailInvalid: string;
  emailMax: string;
  phoneMax: string;
  phoneInvalid: string;
  companyMax: string;
  jobTitleMax: string;
  websiteInvalid: string;
  websiteMax: string;
  industryMax: string;
  notesMax: string;
};

const createLeadFormSchema = (v: ValidationMessages) =>
  z.object({
    fullName: z
      .string()
      .min(2, v.nameMin)
      .max(200, v.nameMax)
      .regex(/^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s'-]+$/, v.nameInvalid),
    email: z
      .string()
      .min(1, v.emailRequired)
      .email(v.emailInvalid)
      .max(254, v.emailMax),
    phone: z
      .string()
      .max(30, v.phoneMax)
      .regex(/^[\d+\-\s()]*$/, v.phoneInvalid)
      .optional()
      .or(z.literal('')),
    companyName: z
      .string()
      .max(200, v.companyMax)
      .optional()
      .or(z.literal('')),
    jobTitle: z
      .string()
      .max(100, v.jobTitleMax)
      .optional()
      .or(z.literal('')),
    website: z
      .string()
      .url(v.websiteInvalid)
      .max(500, v.websiteMax)
      .optional()
      .or(z.literal('')),
    industry: z
      .string()
      .max(100, v.industryMax)
      .optional()
      .or(z.literal('')),
    source: z.nativeEnum(LeadSource).optional(),
    stageId: z.string().uuid().optional().or(z.literal('')),
    status: z.string().optional(),
    notes: z
      .string()
      .max(2000, v.notesMax)
      .optional()
      .or(z.literal('')),
    tags: z.array(z.string().max(50)).max(20).optional(),
  });

type LeadFormData = z.infer<ReturnType<typeof createLeadFormSchema>>;

// ============================================
// Types
// ============================================

export interface LeadFormSheetProps {
  /** Lead to edit (null for new lead) */
  lead?: Lead | null;
  /** Whether the sheet is open */
  open: boolean;
  /** Callback when the sheet should close */
  onClose: () => void;
  /** Callback after successful save */
  onSuccess?: (lead: Lead) => void;
}

// ============================================
// Tag Input Component
// ============================================

interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  disabled?: boolean;
  maxTags?: number;
  /** i18n labels */
  labels: {
    placeholder: string;
    limitReached: string;
    addHint: string;
    removeAriaLabel: (tag: string) => string;
  };
}

function TagInput({ tags, onAddTag, onRemoveTag, disabled, maxTags = 20, labels }: TagInputProps) {
  const [input, setInput] = React.useState('');
  const inputRef = React.useRef<HTMLInputElement>(null);

  const handleAddTag = React.useCallback(() => {
    const tag = input.trim();
    if (tag && !tags.includes(tag) && tags.length < maxTags) {
      onAddTag(tag);
      setInput('');
    }
  }, [input, tags, maxTags, onAddTag]);

  const handleKeyDown = React.useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleAddTag();
      } else if (e.key === 'Backspace' && !input && tags.length > 0) {
        const lastTag = tags[tags.length - 1];
        if (lastTag) {
          onRemoveTag(lastTag);
        }
      }
    },
    [handleAddTag, input, tags, onRemoveTag]
  );

  return (
    <div className="space-y-2 w-full max-w-full">
      <div
        className={cn(
          // Full width with overflow handling
          'w-full max-w-full overflow-hidden',
          'flex flex-wrap gap-2 p-3 rounded-lg border bg-background/50',
          'focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50',
          'transition-all duration-200',
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
              // Prevent tags from breaking layout
              className="max-w-full"
            >
              <Badge
                variant="secondary"
                className="gap-1 pr-1 bg-primary/10 hover:bg-primary/20 transition-colors max-w-full"
              >
                <span className="truncate max-w-[150px] sm:max-w-[200px]">{tag}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTag(tag);
                  }}
                  className="hover:bg-primary/20 rounded-full p-0.5 transition-colors shrink-0"
                  aria-label={labels.removeAriaLabel(tag)}
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
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleAddTag}
          disabled={disabled || tags.length >= maxTags}
          placeholder={tags.length >= maxTags ? labels.limitReached : labels.placeholder}
          className={cn(
            // Flexible width that adapts to container - reduced min-width for mobile
            'flex-1 min-w-[80px] sm:min-w-[120px] bg-transparent border-none outline-none',
            'text-sm placeholder:text-muted-foreground',
            disabled && 'cursor-not-allowed'
          )}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {tags.length}/{maxTags} - {labels.addHint}
      </p>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function LeadFormSheet({
  lead,
  open,
  onClose,
  onSuccess,
}: LeadFormSheetProps) {
  const isEditing = !!lead;
  const isMobile = useIsMobile();
  const [tags, setTags] = React.useState<string[]>(lead?.tags || []);
  const [selectedStatus, setSelectedStatus] = React.useState<string>(lead?.status || 'new');
  const { toast } = useToast();
  const { t } = useI18n();

  // Create schema with translated validation messages
  const leadFormSchema = React.useMemo(
    () =>
      createLeadFormSchema({
        nameMin: t.leads.form.validation.nameMin,
        nameMax: t.leads.form.validation.nameMax,
        nameInvalid: t.leads.form.validation.nameInvalid,
        emailRequired: t.leads.form.validation.emailRequired,
        emailInvalid: t.leads.form.validation.emailInvalid,
        emailMax: t.leads.form.validation.emailMax,
        phoneMax: t.leads.form.validation.phoneMax,
        phoneInvalid: t.leads.form.validation.phoneInvalid,
        companyMax: t.leads.form.validation.companyMax,
        jobTitleMax: t.leads.form.validation.jobTitleMax,
        websiteInvalid: t.leads.form.validation.websiteInvalid,
        websiteMax: t.leads.form.validation.websiteMax,
        industryMax: t.leads.form.validation.industryMax,
        notesMax: t.leads.form.validation.notesMax,
      }),
    [t]
  );

  // Status options with translations
  const statusOptions = React.useMemo(
    () => [
      { id: 'new', label: t.leads.status.new, color: '#10B981', isCompleted: false },
      { id: 'contacted', label: t.leads.status.contacted, color: '#10B981', isCompleted: true },
      { id: 'in_progress', label: t.leads.status.inProgress, color: '#F97316', isCompleted: false },
      { id: 'qualified', label: t.leads.status.qualified, color: '#8B5CF6', isCompleted: false },
      { id: 'proposal', label: t.leads.status.proposal, color: '#3B82F6', isCompleted: false },
      { id: 'negotiation', label: t.leads.status.negotiation, color: '#EC4899', isCompleted: false },
      { id: 'won', label: t.leads.status.won, color: '#10B981', isCompleted: true },
      { id: 'lost', label: t.leads.status.lost, color: '#EF4444', isCompleted: false },
    ],
    [t]
  );

  // Source labels with translations
  const sourceLabels = React.useMemo(
    () => ({
      [LeadSource.MANUAL]: t.leads.sources.manual,
      [LeadSource.WEBSITE]: t.leads.sources.website,
      [LeadSource.REFERRAL]: t.leads.sources.referral,
      [LeadSource.SOCIAL]: t.leads.sources.social,
      [LeadSource.AD]: t.leads.sources.advertising,
      [LeadSource.ORGANIC]: t.leads.sources.organic,
      [LeadSource.OTHER]: t.leads.sources.other,
    }),
    [t]
  );

  const createLead = useCreateLead();
  const updateLead = useUpdateLead();
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();

  const isLoading = createLead.isPending || updateLead.isPending;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      companyName: '',
      jobTitle: '',
      website: '',
      industry: '',
      source: LeadSource.MANUAL,
      stageId: '',
      status: 'new',
      notes: '',
      tags: [],
    },
  });

  // Watch form values for preview
  const watchedFullName = watch('fullName');
  const watchedEmail = watch('email');
  const watchedPhone = watch('phone');
  const watchedCompanyName = watch('companyName');
  const watchedNotes = watch('notes') || '';

  // Reset form when dialog opens/closes or lead changes
  React.useEffect(() => {
    if (open && lead) {
      reset({
        fullName: lead.fullName,
        email: lead.email,
        phone: lead.phone || '',
        companyName: lead.companyName || '',
        jobTitle: '',
        website: lead.website || '',
        industry: lead.industry || '',
        source: lead.source,
        stageId: lead.stageId || '',
        status: lead.status || 'new',
        notes: lead.notes || '',
        tags: lead.tags,
      });
      setTags(lead.tags);
      setSelectedStatus(lead.status || 'new');
    } else if (open && !lead) {
      reset({
        fullName: '',
        email: '',
        phone: '',
        companyName: '',
        jobTitle: '',
        website: '',
        industry: '',
        source: LeadSource.MANUAL,
        stageId: '',
        status: 'new',
        notes: '',
        tags: [],
      });
      setTags([]);
      setSelectedStatus('new');
    }
  }, [open, lead, reset]);

  // Handle tag add
  const handleAddTag = React.useCallback(
    (tag: string) => {
      const sanitizedTag = tag.trim().slice(0, 50);
      if (sanitizedTag && !tags.includes(sanitizedTag)) {
        const newTags = [...tags, sanitizedTag];
        setTags(newTags);
        setValue('tags', newTags, { shouldDirty: true });
      }
    },
    [tags, setValue]
  );

  // Handle tag remove
  const handleRemoveTag = React.useCallback(
    (tagToRemove: string) => {
      const newTags = tags.filter((t) => t !== tagToRemove);
      setTags(newTags);
      setValue('tags', newTags, { shouldDirty: true });
    },
    [tags, setValue]
  );

  // Handle status change
  const handleStatusChange = React.useCallback(
    (statusId: string) => {
      setSelectedStatus(statusId);
      setValue('status', statusId, { shouldDirty: true });
    },
    [setValue]
  );

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
        status: selectedStatus,
        tags: sanitizedTags,
      };

      if (isEditing && lead) {
        const result = await updateLead.mutateAsync({
          leadId: lead.id,
          data: payload,
        });
        toast({
          title: t.leads.form.success.updated,
          description: (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-green-500" />
              {t.leads.form.success.updatedDescription}
            </span>
          ),
        });
        onSuccess?.(result as Lead);
      } else {
        const result = await createLead.mutateAsync(payload);
        toast({
          title: t.leads.form.success.created,
          description: (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              {t.leads.form.success.createdDescription}
            </span>
          ),
        });
        onSuccess?.(result as Lead);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save lead:', error);
      toast({
        title: t.leads.form.errors.saveFailed,
        description:
          error instanceof Error
            ? error.message
            : t.leads.form.errors.saveFailed,
        variant: 'destructive',
      });
    }
  };

  // Calculate form progress
  const requiredFields = ['fullName', 'email'] as const;
  const optionalFields = ['phone', 'companyName', 'website', 'industry', 'notes'] as const;
  const filledRequired = requiredFields.filter((f) => watch(f)).length;
  const filledOptional = optionalFields.filter((f) => watch(f)).length;
  const progress = Math.round(
    ((filledRequired / requiredFields.length) * 0.6 +
      (filledOptional / optionalFields.length) * 0.4) *
      100
  );

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          // Base styles - flex column for proper layout
          'flex flex-col p-0 gap-0 overflow-hidden',
          // Glassmorphism
          'backdrop-blur-xl bg-background/95',
          'border-l border-border/50',
          // Responsive sizing - optimized for different devices
          isMobile
            ? [
                // Mobile: full width with proper constraints
                'h-[95dvh] rounded-t-[20px]',
                // Ensure it never exceeds viewport width
                'w-full max-w-full',
                // Safe area padding for notched devices (horizontal)
                'px-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]',
              ]
            : 'w-full sm:max-w-[520px] md:max-w-[560px] lg:max-w-[600px]',
          // Animation - faster on mobile for snappier feel
          isMobile
            ? 'data-[state=open]:duration-200 data-[state=closed]:duration-150'
            : 'data-[state=open]:duration-300 data-[state=closed]:duration-200'
        )}
      >
        <TooltipProvider delayDuration={300}>
          {/* Compact Header for Mobile */}
          <div className={cn(
            'flex items-center justify-between shrink-0',
            // Compact padding on mobile with safe area support
            'px-4 py-3 sm:px-5 sm:py-4',
            // Safe area padding for notched devices (top - for dynamic island/notch)
            'pt-[max(12px,env(safe-area-inset-top))]',
            // Border and background
            'border-b border-border/40',
            'bg-gradient-to-r from-muted/20 to-transparent'
          )}>
            {/* Title and Progress Combined */}
            <div className="flex-1 min-w-0 mr-3">
              <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                {isEditing ? t.leads.editLead : t.leads.newLead}
              </h2>
              {/* Inline progress indicator */}
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 h-2 bg-muted/60 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-primary via-primary to-primary/80 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.4, ease: 'easeOut' }}
                  />
                </div>
                <span className="text-xs font-medium text-primary tabular-nums shrink-0">
                  {progress}%
                </span>
              </div>
            </div>

            {/* Close Button - Large touch target */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClose}
              className={cn(
                'h-10 w-10 rounded-full shrink-0',
                'hover:bg-muted/80 active:bg-muted',
                'transition-colors duration-150',
                'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
              )}
              aria-label={t.leads.form.actions.close}
            >
              <X className="h-5 w-5" />
            </Button>
          </div>

          {/* Form Content - Scrollable area */}
          <ScrollArea className="flex-1 min-h-0 overscroll-contain w-full">
            <form
              id="lead-form"
              className={cn(
                // Full width with overflow protection
                'w-full max-w-full overflow-x-hidden',
                // Responsive padding - extra padding bottom for scroll comfort
                'px-4 pt-4 pb-6 sm:px-5 sm:pt-5 sm:pb-8',
                // Responsive spacing
                'space-y-4 sm:space-y-5'
              )}
              onSubmit={handleSubmit(onSubmit)}
            >
              {/* Status Pills - Full width with horizontal scroll */}
              <div className="space-y-2.5">
                <label className="text-sm font-medium text-foreground block">
                  {t.leads.status.label}
                </label>
                {/* Container - use overflow-x-auto instead of negative margins for mobile safety */}
                <div className="w-full overflow-x-auto scrollbar-none -webkit-overflow-scrolling-touch">
                  <StatusPills
                    options={statusOptions}
                    value={selectedStatus}
                    onChange={handleStatusChange}
                    disabled={isLoading}
                    size="sm"
                    layout="scroll"
                  />
                </div>
              </div>

              {/* Form Sections */}
              <FormSections>
                {/* Personal Info Section */}
                <FormSection
                  title={t.leads.form.personalInfo.title}
                  icon={User}
                  defaultExpanded={true}
                  collapsible={false}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      label={t.leads.form.fields.fullName.label}
                      id="fullName"
                      error={errors.fullName?.message}
                      required
                      icon={User}
                      className="sm:col-span-2"
                    >
                      <InputWithIcon
                        id="fullName"
                        placeholder={t.leads.form.fields.fullName.placeholder}
                        disabled={isLoading}
                        icon={User}
                        error={!!errors.fullName}
                        {...register('fullName')}
                      />
                    </FormField>

                    <FormField
                      label={t.leads.form.fields.email.label}
                      id="email"
                      error={errors.email?.message}
                      required
                      icon={Mail}
                    >
                      <InputWithIcon
                        id="email"
                        type="email"
                        placeholder={t.leads.form.fields.email.placeholder}
                        disabled={isLoading}
                        icon={Mail}
                        error={!!errors.email}
                        {...register('email')}
                      />
                    </FormField>

                    <FormField
                      label={t.leads.form.fields.phone.label}
                      id="phone"
                      error={errors.phone?.message}
                      hint={t.leads.form.fields.phone.hint}
                      icon={Phone}
                    >
                      <InputWithIcon
                        id="phone"
                        type="tel"
                        placeholder={t.leads.form.fields.phone.placeholder}
                        disabled={isLoading}
                        icon={Phone}
                        error={!!errors.phone}
                        {...register('phone')}
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* Company Info Section */}
                <FormSection
                  title={t.leads.form.companyInfo.title}
                  icon={Building2}
                  defaultExpanded={isEditing || !!watchedCompanyName}
                  description={t.leads.form.companyInfo.description}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField
                      label={t.leads.form.fields.company.label}
                      id="companyName"
                      error={errors.companyName?.message}
                      hint={t.leads.form.fields.company.hint}
                    >
                      <InputWithIcon
                        id="companyName"
                        placeholder={t.leads.form.fields.company.placeholder}
                        disabled={isLoading}
                        icon={Building2}
                        {...register('companyName')}
                      />
                    </FormField>

                    <FormField
                      label={t.leads.form.fields.jobTitle.label}
                      id="jobTitle"
                      error={errors.jobTitle?.message}
                      hint={t.leads.form.fields.jobTitle.hint}
                    >
                      <InputWithIcon
                        id="jobTitle"
                        placeholder={t.leads.form.fields.jobTitle.placeholder}
                        disabled={isLoading}
                        icon={Briefcase}
                        {...register('jobTitle')}
                      />
                    </FormField>

                    <FormField
                      label={t.leads.form.fields.website.label}
                      id="website"
                      error={errors.website?.message}
                      hint={t.leads.form.fields.website.hint}
                    >
                      <InputWithIcon
                        id="website"
                        type="url"
                        placeholder={t.leads.form.fields.website.placeholder}
                        disabled={isLoading}
                        icon={Globe}
                        {...register('website')}
                      />
                    </FormField>

                    <FormField
                      label={t.leads.form.fields.industry.label}
                      id="industry"
                      error={errors.industry?.message}
                      hint={t.leads.form.fields.industry.hint}
                    >
                      <InputWithIcon
                        id="industry"
                        placeholder={t.leads.form.fields.industry.placeholder}
                        disabled={isLoading}
                        {...register('industry')}
                      />
                    </FormField>
                  </div>
                </FormSection>

                {/* Classification Section */}
                <FormSection
                  title={t.leads.form.classification.title}
                  icon={Tag}
                  defaultExpanded={isEditing}
                  description={t.leads.form.classification.description}
                >
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label={t.leads.form.fields.source.label} id="source">
                      <Controller
                        name="source"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isLoading}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder={t.leads.form.fields.source.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              {Object.values(LeadSource).map((source) => (
                                <SelectItem key={source} value={source}>
                                  {sourceLabels[source]}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>

                    <FormField label={t.leads.form.fields.stage.label} id="stageId">
                      <Controller
                        name="stageId"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value || '_none'}
                            onValueChange={(v) => field.onChange(v === '_none' ? '' : v)}
                            disabled={isLoading || stagesLoading}
                          >
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder={t.leads.form.fields.stage.placeholder} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="_none">{t.leads.form.fields.stage.noStage}</SelectItem>
                              {stages?.map((stage) => (
                                <SelectItem key={stage.id} value={stage.id}>
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="w-3 h-3 rounded-full flex-shrink-0"
                                      style={{ backgroundColor: stage.color }}
                                    />
                                    <span>{stage.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </FormField>
                  </div>

                  <FormField label={t.leads.form.fields.tags.label} id="tags" className="col-span-full">
                    <TagInput
                      tags={tags}
                      onAddTag={handleAddTag}
                      onRemoveTag={handleRemoveTag}
                      disabled={isLoading}
                      labels={{
                        placeholder: t.leads.form.fields.tags.placeholder,
                        limitReached: t.leads.form.fields.tags.limitReached,
                        addHint: t.leads.form.fields.tags.addHint,
                        removeAriaLabel: (tag) => `${t.leads.form.actions.close} ${tag}`,
                      }}
                    />
                  </FormField>
                </FormSection>

                {/* Notes Section */}
                <FormSection
                  title={t.leads.form.notes.title}
                  icon={Sparkles}
                  defaultExpanded={isEditing && !!lead?.notes}
                  description={t.leads.form.notes.description}
                >
                  <FormField
                    label={t.leads.form.fields.notes.label}
                    id="notes"
                    error={errors.notes?.message}
                    showCharCount
                    maxLength={2000}
                    currentLength={watchedNotes.length}
                  >
                    <TextareaWithCounter
                      id="notes"
                      placeholder={t.leads.form.fields.notes.placeholder}
                      disabled={isLoading}
                      maxLength={2000}
                      error={!!errors.notes}
                      {...register('notes')}
                    />
                  </FormField>
                </FormSection>
              </FormSections>
            </form>
          </ScrollArea>

          {/* Footer Actions - Sticky with safe area padding */}
          <div
            className={cn(
              'shrink-0',
              // Responsive padding
              'px-4 pt-3 sm:px-5 sm:pt-4',
              // Safe area padding for notched devices (iPhone X+)
              'pb-[max(16px,env(safe-area-inset-bottom))]',
              // Visual separation with stronger background
              'border-t border-border/60',
              'bg-background/95 backdrop-blur-md',
              // Shadow to show it's above content
              'shadow-[0_-4px_20px_-4px_rgba(0,0,0,0.1)]'
            )}
          >
            {/* Validation Summary - Show above buttons */}
            <AnimatePresence>
              {Object.keys(errors).length > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3 p-2.5 rounded-lg bg-destructive/10 border border-destructive/20"
                >
                  <p className="text-xs text-destructive flex items-center gap-2">
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    {t.leads.form.validation.fixErrors}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Buttons - Horizontal layout with primary on right */}
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isLoading}
                className={cn(
                  // Flex sizing
                  'flex-1 sm:flex-none sm:w-auto',
                  // Touch target height (48px minimum)
                  'h-12',
                  // Border styling
                  'border-border/60',
                  // Focus state
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  // Active state
                  'active:scale-[0.98] transition-transform duration-100'
                )}
              >
                {t.leads.form.actions.cancel}
              </Button>
              <Button
                type="submit"
                form="lead-form"
                disabled={isLoading || !isValid}
                className={cn(
                  // Flex sizing - takes more space
                  'flex-[2] sm:flex-none sm:min-w-[160px]',
                  // Touch target height (48px minimum)
                  'h-12',
                  // Gradient and shadow for prominence
                  'bg-gradient-to-r from-primary to-primary/90',
                  'shadow-lg shadow-primary/30',
                  'hover:shadow-xl hover:shadow-primary/40',
                  // Text styling
                  'font-semibold',
                  // Transitions
                  'transition-all duration-200',
                  // Active state for touch feedback
                  'active:scale-[0.98]',
                  // Focus state
                  'focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
                  // Disabled state
                  'disabled:opacity-50 disabled:shadow-none'
                )}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isEditing ? t.leads.form.actions.saving : t.leads.form.actions.creating}
                  </>
                ) : (
                  <>
                    {isEditing ? (
                      <>
                        <Check className="mr-2 h-4 w-4" />
                        {t.leads.form.actions.save}
                      </>
                    ) : (
                      <>
                        <Plus className="mr-2 h-4 w-4" />
                        {t.leads.form.actions.create}
                      </>
                    )}
                  </>
                )}
              </Button>
            </div>
          </div>
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}

export default LeadFormSheet;

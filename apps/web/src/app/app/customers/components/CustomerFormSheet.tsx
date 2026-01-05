'use client';

/**
 * CustomerFormSheet - v1.0 (2025 World-Class)
 *
 * Premium form for creating and editing customers.
 * Homologated with LeadFormSheet and OpportunityFormSheet patterns.
 *
 * Design Principles:
 * - CSS-first responsive: No JavaScript for layout decisions
 * - Mobile-first: Base styles for mobile, breakpoints for larger
 * - Touch-friendly: 48px minimum touch targets
 * - Progressive disclosure: Collapsible sections
 * - Accessibility: WCAG 2.1 AA compliant
 * - Safe areas: Proper padding for notched devices
 *
 * @module customers/components/CustomerFormSheet
 */

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Building2,
  Check,
  DollarSign,
  Globe,
  Loader2,
  Mail,
  Phone,
  Plus,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Sheet,
  SheetContent,
} from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {
  useCreateCustomer,
  useUpdateCustomer,
  CustomerType,
  CustomerTier,
  CustomerStatus,
  TYPE_LABELS,
  TIER_LABELS,
  STATUS_LABELS,
  type Customer,
} from '@/lib/customers';
import { sanitizeCustomerData, sanitizeTags } from '@/lib/security/form-sanitizer';
import { cn } from '@/lib/utils';

// ============================================
// Schema
// ============================================

const customerFormSchema = z.object({
  companyName: z.string().min(1, 'El nombre es requerido').max(255),
  email: z.string().email('Email inválido').max(255),
  phone: z.string().max(50).optional().or(z.literal('')),
  website: z.string().url('URL inválida').max(255).optional().or(z.literal('')),
  industry: z.string().max(100).optional().or(z.literal('')),
  type: z.nativeEnum(CustomerType).optional(),
  tier: z.nativeEnum(CustomerTier).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  contractValue: z.coerce.number().min(0).optional(),
  mrr: z.coerce.number().min(0).optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

// ============================================
// Types
// ============================================

export interface CustomerFormSheetProps {
  customer?: Customer | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (customer: Customer) => void;
}

// ============================================
// Collapsible Form Section
// ============================================

interface FormSectionProps {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  defaultExpanded?: boolean;
  description?: string;
  collapsible?: boolean;
}

function FormSection({
  title,
  icon: Icon,
  children,
  defaultExpanded = false,
  description,
  collapsible = true,
}: FormSectionProps) {
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  if (!collapsible) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary" />
          <span className="text-sm font-medium">{title}</span>
        </div>
        {children}
      </div>
    );
  }

  return (
    <div className="border border-border/40 rounded-xl overflow-hidden bg-card/50">
      <button
        type="button"
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          'w-full flex items-center justify-between p-4',
          'hover:bg-muted/50 transition-colors',
          isExpanded && 'border-b border-border/40'
        )}
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <div className="text-left">
            <span className="text-sm font-medium block">{title}</span>
            {description && !isExpanded && (
              <span className="text-xs text-muted-foreground">{description}</span>
            )}
          </div>
        </div>
        <motion.div
          animate={{ rotate: isExpanded ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg
            className="h-5 w-5 text-muted-foreground"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </motion.div>
      </button>
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <div className="p-4 space-y-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
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
}

function TagInput({
  tags,
  onAddTag,
  onRemoveTag,
  disabled,
  maxTags = 20,
}: TagInputProps) {
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
        if (lastTag) onRemoveTag(lastTag);
      }
    },
    [handleAddTag, input, tags, onRemoveTag]
  );

  return (
    <div className="w-full space-y-2">
      <div
        className={cn(
          'w-full flex flex-wrap gap-2',
          'p-3 rounded-lg',
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
                <span className="truncate max-w-[120px]">{tag}</span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveTag(tag);
                  }}
                  className="hover:bg-primary/20 rounded-full p-0.5"
                  aria-label={`Eliminar etiqueta: ${tag}`}
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
          placeholder={
            tags.length >= maxTags ? 'Límite alcanzado' : 'Agregar etiqueta...'
          }
          className={cn(
            'flex-1 min-w-[100px] bg-transparent border-none outline-none',
            'text-sm placeholder:text-muted-foreground',
            disabled && 'cursor-not-allowed'
          )}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        {tags.length}/{maxTags} - Presiona Enter para agregar
      </p>
    </div>
  );
}

// ============================================
// Input with Icon
// ============================================

interface InputWithIconProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon?: React.ComponentType<{ className?: string }>;
  error?: boolean;
}

const InputWithIcon = React.forwardRef<HTMLInputElement, InputWithIconProps>(
  ({ icon: Icon, error, className, ...props }, ref) => {
    return (
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        )}
        <Input
          ref={ref}
          className={cn(
            'h-11 rounded-lg',
            Icon && 'pl-10',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);
InputWithIcon.displayName = 'InputWithIcon';

// ============================================
// Main Component
// ============================================

export function CustomerFormSheet({
  customer,
  open,
  onClose,
  onSuccess,
}: CustomerFormSheetProps) {
  const isEditing = !!customer;
  const [tags, setTags] = React.useState<string[]>(customer?.tags || []);
  const { toast } = useToast();

  // Refs to track initialization state (prevents infinite loops)
  const lastCustomerId = React.useRef<string | null>(null);
  const hasInitializedEmpty = React.useRef(false);

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const isLoading = createCustomer.isPending || updateCustomer.isPending;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    reset,
    setValue,
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    mode: 'onChange',
    defaultValues: {
      companyName: '',
      email: '',
      phone: '',
      website: '',
      industry: '',
      type: CustomerType.COMPANY,
      tier: CustomerTier.STANDARD,
      status: CustomerStatus.ACTIVE,
      contractValue: 0,
      mrr: 0,
      notes: '',
      tags: [],
    },
  });

  const watchedNotes = watch('notes') || '';

  // Reset refs when sheet closes
  React.useEffect(() => {
    if (!open) {
      lastCustomerId.current = null;
      hasInitializedEmpty.current = false;
    }
  }, [open]);

  // Reset form when sheet opens (with guards to prevent infinite loops)
  React.useEffect(() => {
    if (!open) return;

    if (customer) {
      // Only reset if this is a different customer
      if (lastCustomerId.current === customer.id) return;
      lastCustomerId.current = customer.id;

      reset({
        companyName: customer.companyName,
        email: customer.email,
        phone: customer.phone || '',
        website: customer.website || '',
        industry: customer.industry || '',
        type: customer.type,
        tier: customer.tier,
        status: customer.status,
        contractValue: customer.contractValue || 0,
        mrr: customer.mrr || 0,
        notes: customer.notes || '',
        tags: customer.tags,
      });
      setTags(customer.tags);
    } else {
      // Only reset for new customer once
      if (hasInitializedEmpty.current) return;
      hasInitializedEmpty.current = true;

      reset({
        companyName: '',
        email: '',
        phone: '',
        website: '',
        industry: '',
        type: CustomerType.COMPANY,
        tier: CustomerTier.STANDARD,
        status: CustomerStatus.ACTIVE,
        contractValue: 0,
        mrr: 0,
        notes: '',
        tags: [],
      });
      setTags([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customer?.id, open]);

  // Handlers
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

  const handleRemoveTag = React.useCallback(
    (tagToRemove: string) => {
      const newTags = tags.filter((t) => t !== tagToRemove);
      setTags(newTags);
      setValue('tags', newTags, { shouldDirty: true });
    },
    [tags, setValue]
  );

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const sanitizedData = sanitizeCustomerData(data as Record<string, unknown>) as CustomerFormData;
      const sanitizedTags = sanitizeTags(tags);

      const payload = {
        ...sanitizedData,
        phone: sanitizedData.phone || undefined,
        website: sanitizedData.website || undefined,
        industry: sanitizedData.industry || undefined,
        notes: sanitizedData.notes || undefined,
        contractValue: sanitizedData.contractValue || undefined,
        mrr: sanitizedData.mrr || undefined,
        tags: sanitizedTags,
      };

      if (isEditing && customer) {
        const result = await updateCustomer.mutateAsync({
          customerId: customer.id,
          data: payload,
        });
        toast({
          title: 'Cliente actualizado',
          description: (
            <span className="flex items-center gap-2">
              <Check className="h-4 w-4 text-[var(--status-success)]" />
              Los cambios se guardaron correctamente.
            </span>
          ),
        });
        onSuccess?.(result as Customer);
      } else {
        const result = await createCustomer.mutateAsync(payload);
        toast({
          title: 'Cliente creado',
          description: (
            <span className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              El cliente se creó correctamente.
            </span>
          ),
        });
        onSuccess?.(result as Customer);
      }

      onClose();
    } catch (error) {
      console.error('Failed to save customer:', error);
      toast({
        title: 'Error',
        description:
          error instanceof Error ? error.message : 'No se pudo guardar el cliente. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  // Progress calculation
  const requiredFields = ['companyName', 'email'] as const;
  const optionalFields = ['phone', 'website', 'industry', 'notes'] as const;
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
        side="right"
        hideCloseButton
        accessibleTitle={isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
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
              {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
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
                  'text-xs font-semibold tabular-nums min-w-[2.5rem] text-right',
                  progress === 0 && 'text-muted-foreground',
                  progress > 0 && progress < 60 && 'text-[var(--status-warning)]',
                  progress >= 60 && 'text-primary'
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
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Form Content */}
        <ScrollArea className="flex-1 min-h-0">
          <form
            id="customer-form"
            className="px-5 py-5 space-y-5"
            onSubmit={handleSubmit(onSubmit)}
          >
            {/* Company Info - Always Expanded */}
            <FormSection
              title="Información de la Empresa"
              icon={Building2}
              defaultExpanded={true}
              collapsible={false}
            >
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="companyName">Nombre de la empresa *</Label>
                  <InputWithIcon
                    id="companyName"
                    placeholder="Acme Inc."
                    disabled={isLoading}
                    icon={Building2}
                    error={!!errors.companyName}
                    {...register('companyName')}
                  />
                  {errors.companyName && (
                    <p className="text-sm text-destructive">{errors.companyName.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <InputWithIcon
                      id="email"
                      type="email"
                      placeholder="contacto@empresa.com"
                      disabled={isLoading}
                      icon={Mail}
                      error={!!errors.email}
                      {...register('email')}
                    />
                    {errors.email && (
                      <p className="text-sm text-destructive">{errors.email.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <InputWithIcon
                      id="phone"
                      type="tel"
                      placeholder="+52 555 123 4567"
                      disabled={isLoading}
                      icon={Phone}
                      error={!!errors.phone}
                      {...register('phone')}
                    />
                    {errors.phone && (
                      <p className="text-sm text-destructive">{errors.phone.message}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="website">Sitio web</Label>
                    <InputWithIcon
                      id="website"
                      type="url"
                      placeholder="https://empresa.com"
                      disabled={isLoading}
                      icon={Globe}
                      error={!!errors.website}
                      {...register('website')}
                    />
                    {errors.website && (
                      <p className="text-sm text-destructive">{errors.website.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="industry">Industria</Label>
                    <Input
                      id="industry"
                      placeholder="Tecnología, Retail, etc."
                      disabled={isLoading}
                      className="h-11 rounded-lg"
                      {...register('industry')}
                    />
                    {errors.industry && (
                      <p className="text-sm text-destructive">{errors.industry.message}</p>
                    )}
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Classification */}
            <FormSection
              title="Clasificación"
              icon={Tag}
              defaultExpanded={isEditing}
              description="Tipo, tier y estado del cliente"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Controller
                    name="type"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-11 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(CustomerType).map((type) => (
                            <SelectItem key={type} value={type}>
                              {TYPE_LABELS[type]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tier</Label>
                  <Controller
                    name="tier"
                    control={control}
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                        disabled={isLoading}
                      >
                        <SelectTrigger className="h-11 rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.values(CustomerTier).map((tier) => (
                            <SelectItem key={tier} value={tier}>
                              {TIER_LABELS[tier]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                {isEditing && (
                  <div className="space-y-2 sm:col-span-2">
                    <Label>Estado</Label>
                    <Controller
                      name="status"
                      control={control}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={isLoading}
                        >
                          <SelectTrigger className="h-11 rounded-lg">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {Object.values(CustomerStatus).map((status) => (
                              <SelectItem key={status} value={status}>
                                {STATUS_LABELS[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label>Etiquetas</Label>
                <TagInput
                  tags={tags}
                  onAddTag={handleAddTag}
                  onRemoveTag={handleRemoveTag}
                  disabled={isLoading}
                />
              </div>
            </FormSection>

            {/* Financial Info */}
            <FormSection
              title="Información Financiera"
              icon={DollarSign}
              defaultExpanded={false}
              description="Valor de contrato y MRR"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="contractValue">Valor de Contrato</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="contractValue"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isLoading}
                      className="h-11 rounded-lg pl-10"
                      {...register('contractValue')}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mrr">MRR (Mensual)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="mrr"
                      type="number"
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      disabled={isLoading}
                      className="h-11 rounded-lg pl-10"
                      {...register('mrr')}
                    />
                  </div>
                </div>
              </div>
            </FormSection>

            {/* Notes */}
            <FormSection
              title="Notas"
              icon={Sparkles}
              defaultExpanded={isEditing && !!customer?.notes}
              description="Notas adicionales sobre el cliente"
            >
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Textarea
                  id="notes"
                  placeholder="Notas adicionales sobre el cliente..."
                  disabled={isLoading}
                  className="min-h-[100px] rounded-lg"
                  maxLength={5000}
                  {...register('notes')}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{watchedNotes.length}/5000 caracteres</span>
                </div>
                {errors.notes && (
                  <p className="text-sm text-destructive">{errors.notes.message}</p>
                )}
              </div>
            </FormSection>
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
            form="customer-form"
            disabled={isLoading || !isValid}
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
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                {isEditing ? 'Guardando...' : 'Creando...'}
              </>
            ) : isEditing ? (
              <>
                <Check className="mr-2 h-5 w-5" />
                Guardar Cambios
              </>
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" />
                Crear Cliente
              </>
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CustomerFormSheet;

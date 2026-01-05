'use client';

/**
 * OpportunityDetailSheet - Unified View/Edit Component (v1.0)
 *
 * Premium unified component for viewing and editing opportunities.
 * Homologated with LeadDetailSheet design patterns.
 *
 * Design Principles:
 * - Single location: View and Edit in same Sheet position
 * - Smooth transitions: Framer Motion for mode switching
 * - Mobile-first: CSS responsive breakpoints
 * - Touch-friendly: 48px minimum touch targets
 * - Accessibility: WCAG 2.1 AA compliant
 * - Dynamic theming: Uses CSS variables for tenant colors
 *
 * @module opportunities/components/OpportunityDetailSheet
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { format, formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Tag,
  Target,
  Trophy,
  User,
  X,
  XCircle,
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
import { Separator } from '@/components/ui/separator';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useI18n } from '@/lib/i18n';
import {
  useUpdateOpportunity,
  usePipelineStages,
  type Opportunity,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_PRIORITY,
} from '@/lib/opportunities';
import { cn } from '@/lib/utils';

import { OpportunityProbabilityIndicator, OpportunityProbabilityBar } from './OpportunityProbabilityIndicator';
import { useOpportunityTheme } from '../hooks';
import { AttachmentSection } from '@/components/ui/attachment-section';
import { Paperclip } from 'lucide-react';

// ============================================
// Types & Schema
// ============================================

type DetailMode = 'view' | 'edit';

export interface OpportunityDetailSheetProps {
  opportunity: Opportunity | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (opportunity: Opportunity) => void;
  onDelete?: (opportunity: Opportunity) => void;
  onWin?: (opportunity: Opportunity) => void;
  onLost?: (opportunity: Opportunity) => void;
  defaultMode?: DetailMode;
}

const opportunityFormSchema = z.object({
  name: z.string().min(2, 'Nombre debe tener al menos 2 caracteres').max(200),
  amount: z.number().min(0, 'Monto debe ser positivo'),
  probability: z.number().min(0).max(100),
  expectedCloseDate: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']),
  stageId: z.string().uuid().optional(),
  description: z.string().max(2000).optional(),
  tags: z.array(z.string().max(50)).max(20).optional(),
});

type OpportunityFormData = z.infer<typeof opportunityFormSchema>;

// ============================================
// Animation Variants
// ============================================

const modeTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
};

const fadeIn = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.2 },
};

// ============================================
// Helpers
// ============================================

function formatCurrency(amount: number | null | undefined, currency = 'USD'): string {
  if (amount == null || isNaN(amount)) return '$0';
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function getProbabilityLevel(probability: number): 'high' | 'medium' | 'low' {
  if (probability >= 70) return 'high';
  if (probability >= 40) return 'medium';
  return 'low';
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const cleaned = phone.replace(/[^\d+]/g, '');
  if (!/^\+?\d{10,15}$/.test(cleaned)) return '';
  if (!cleaned.startsWith('+')) return `+52${cleaned.replace(/^0+/, '')}`;
  return cleaned;
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
                  aria-label={`Eliminar ${tag}`}
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
          placeholder={tags.length >= maxTags ? 'Límite alcanzado' : 'Agregar etiqueta...'}
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
// View Mode Component
// ============================================

interface ViewModeProps {
  opportunity: Opportunity;
  onEdit: () => void;
  onWin?: () => void;
  onLost?: () => void;
  onViewDetails: () => void;
  onClose: () => void;
}

function ViewMode({
  opportunity,
  onEdit,
  onWin,
  onLost,
  onViewDetails,
  onClose,
}: ViewModeProps) {
  const { t } = useI18n();
  const theme = useOpportunityTheme();
  const isOpen = opportunity.status === 'open';

  // Note: phone is accessed via type assertion since types don't include it
  const customerData = opportunity.customer as { id: string; name: string; email: string | null; phone?: string } | undefined;
  const leadData = opportunity.lead as { id: string; fullName: string; email: string | null; phone?: string } | undefined;
  const contactPhone = customerData?.phone || leadData?.phone;
  const contactEmail = opportunity.customer?.email || opportunity.lead?.email;
  const contactName = opportunity.customer?.name || opportunity.lead?.fullName || 'Sin contacto';
  const normalizedPhone = normalizePhone(contactPhone);
  const hasPhone = !!normalizedPhone;
  const hasEmail = !!contactEmail;

  const priorityLabels: Record<string, string> = {
    low: 'Baja',
    medium: 'Media',
    high: 'Alta',
    critical: 'Crítica',
  };

  const statusLabels: Record<string, string> = {
    open: 'Abierta',
    won: 'Ganada',
    lost: 'Perdida',
  };

  const handleWhatsApp = () => {
    if (normalizedPhone) {
      window.open(`https://wa.me/${normalizedPhone.replace('+', '')}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleCall = () => {
    if (normalizedPhone) {
      window.location.href = `tel:${normalizedPhone}`;
    }
  };

  const handleEmail = () => {
    if (contactEmail) {
      window.location.href = `mailto:${contactEmail}`;
    }
  };

  return (
    <motion.div
      key="view"
      {...modeTransition}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-semibold leading-tight line-clamp-2">
              {opportunity.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              {contactName}
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full flex-shrink-0"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Status & Priority */}
        <div className="flex gap-2 mt-3">
          <Badge className={cn(
            opportunity.status === 'won' && 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300',
            opportunity.status === 'lost' && 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300',
            opportunity.status === 'open' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
          )}>
            {statusLabels[opportunity.status]}
          </Badge>
          <Badge variant="outline" className={cn(
            opportunity.priority === 'critical' && 'border-red-300 text-red-600',
            opportunity.priority === 'high' && 'border-orange-300 text-orange-600',
            opportunity.priority === 'medium' && 'border-blue-300 text-blue-600',
            opportunity.priority === 'low' && 'border-slate-300 text-slate-600'
          )}>
            {priorityLabels[opportunity.priority]}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-4">
          {/* Amount Card */}
          <div className="rounded-xl border bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="h-5 w-5 text-emerald-600" />
              <span className="text-sm text-emerald-700 dark:text-emerald-300 font-medium">
                Valor de la Oportunidad
              </span>
            </div>
            <p className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(opportunity.amount, opportunity.currency)}
            </p>
          </div>

          {/* Probability */}
          <div className="rounded-xl border p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Probabilidad de Cierre</span>
              </div>
              <OpportunityProbabilityIndicator
                probability={opportunity.probability}
                size="sm"
                variant="badge"
              />
            </div>
            <OpportunityProbabilityBar
              probability={opportunity.probability}
              showForecast
              amount={opportunity.amount}
              currency={opportunity.currency}
            />
          </div>

          {/* Quick Actions */}
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              disabled={!hasPhone}
              onClick={handleWhatsApp}
            >
              <MessageCircle className="h-4 w-4 text-emerald-500" />
              WhatsApp
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              disabled={!hasPhone}
              onClick={handleCall}
            >
              <Phone className="h-4 w-4 text-primary" />
              Llamar
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex-1 gap-2"
              disabled={!hasEmail}
              onClick={handleEmail}
            >
              <Mail className="h-4 w-4 text-blue-500" />
              Email
            </Button>
          </div>

          <Separator />

          {/* Details */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-muted-foreground">Detalles</h4>

            {opportunity.expectedCloseDate && (
              <div className="flex items-start gap-3 py-2">
                <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Fecha de Cierre Esperada</p>
                  <p className="text-sm font-medium">
                    {format(new Date(opportunity.expectedCloseDate), 'PPP', { locale: es })}
                  </p>
                </div>
              </div>
            )}

            {opportunity.customer && (
              <div className="flex items-start gap-3 py-2">
                <Building2 className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Cliente</p>
                  <p className="text-sm font-medium">{opportunity.customer.name}</p>
                </div>
              </div>
            )}

            {opportunity.lead && (
              <div className="flex items-start gap-3 py-2">
                <User className="h-4 w-4 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-xs text-muted-foreground">Lead Asociado</p>
                  <p className="text-sm font-medium">{opportunity.lead.fullName}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3 py-2">
              <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-xs text-muted-foreground">Creada</p>
                <p className="text-sm font-medium">
                  {formatDistanceToNow(new Date(opportunity.createdAt), {
                    addSuffix: true,
                    locale: es,
                  })}
                </p>
              </div>
            </div>
          </div>

          {/* Description */}
          {opportunity.description && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Descripción</span>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {opportunity.description}
                </p>
              </div>
            </>
          )}

          {/* Tags */}
          {opportunity.tags && opportunity.tags.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Etiquetas</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {opportunity.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Attachments */}
          <Separator />
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Paperclip className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Documentos Adjuntos</span>
            </div>
            <AttachmentSection
              entityType="opportunity"
              entityId={opportunity.id}
              title=""
              description="Propuestas, cotizaciones y documentos relacionados"
              category="proposal"
              accessLevel="team"
              view="list"
              showUploader
              showList
            />
          </div>
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className={cn(
        'flex-shrink-0 pt-4 px-4 border-t bg-card/50 backdrop-blur-sm space-y-3',
        // Mobile: account for bottom bar (64px) + safe area + padding
        'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px)+1rem)]',
        // Desktop: normal padding (no bottom bar)
        'sm:pb-4'
      )}>
        {/* Win/Lost Actions */}
        {isOpen && (onWin || onLost) && (
          <div className="flex gap-2">
            {onWin && (
              <Button
                variant="outline"
                className="flex-1 border-emerald-300 text-emerald-600 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
                onClick={onWin}
              >
                <Trophy className="mr-2 h-4 w-4" />
                Ganada
              </Button>
            )}
            {onLost && (
              <Button
                variant="outline"
                className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:border-red-700 dark:text-red-400"
                onClick={onLost}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Perdida
              </Button>
            )}
          </div>
        )}

        {/* Primary Actions */}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={onEdit}>
            <Edit3 className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button className="flex-1" onClick={onViewDetails}>
            Ver Detalles
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Edit Mode Component
// ============================================

interface EditModeProps {
  opportunity: Opportunity;
  onCancel: () => void;
  onSuccess: (opportunity: Opportunity) => void;
}

function EditMode({ opportunity, onCancel, onSuccess }: EditModeProps) {
  const { toast } = useToast();
  const { data: stages } = usePipelineStages();
  const updateMutation = useUpdateOpportunity();

  const form = useForm<OpportunityFormData>({
    resolver: zodResolver(opportunityFormSchema),
    defaultValues: {
      name: opportunity.name || '',
      amount: opportunity.amount || 0,
      probability: opportunity.probability || 50,
      expectedCloseDate: opportunity.expectedCloseDate?.split('T')[0] || '',
      priority: opportunity.priority || 'medium',
      stageId: opportunity.stageId || '',
      description: opportunity.description || '',
      tags: opportunity.tags || [],
    },
  });

  const { control, handleSubmit, watch, setValue, formState: { isSubmitting, isDirty } } = form;
  const currentTags = watch('tags') || [];
  const currentProbability = watch('probability');

  const onSubmit = async (data: OpportunityFormData) => {
    try {
      const result = await updateMutation.mutateAsync({
        opportunityId: opportunity.id,
        data: {
          name: data.name,
          amount: data.amount,
          probability: data.probability,
          expectedCloseDate: data.expectedCloseDate || undefined,
          priority: data.priority,
          description: data.description || undefined,
          tags: data.tags || undefined,
        },
      });

      toast({
        title: 'Oportunidad actualizada',
        description: 'Los cambios se guardaron correctamente.',
      });

      onSuccess(result);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la oportunidad.',
        variant: 'destructive',
      });
    }
  };

  const handleAddTag = (tag: string) => {
    setValue('tags', [...currentTags, tag], { shouldDirty: true });
  };

  const handleRemoveTag = (tag: string) => {
    setValue('tags', currentTags.filter((t) => t !== tag), { shouldDirty: true });
  };

  return (
    <motion.div
      key="edit"
      {...modeTransition}
      className="flex flex-col h-full"
    >
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b bg-card/50 backdrop-blur-sm">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Editar Oportunidad</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Form */}
      <ScrollArea className="flex-1">
        <form id="opportunity-form" onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nombre de la Oportunidad</Label>
            <Controller
              name="name"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    id="name"
                    placeholder="Ej: Contrato anual empresa XYZ"
                    className={cn(fieldState.error && 'border-destructive')}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Monto ($)</Label>
            <Controller
              name="amount"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    id="amount"
                    type="number"
                    min={0}
                    placeholder="0"
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                    className={cn(fieldState.error && 'border-destructive')}
                  />
                  {fieldState.error && (
                    <p className="text-xs text-destructive flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          {/* Probability */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Probabilidad de Cierre</Label>
              <span className="text-sm font-semibold text-primary">
                {currentProbability}%
              </span>
            </div>
            <Controller
              name="probability"
              control={control}
              render={({ field }) => (
                <Slider
                  value={[field.value]}
                  onValueChange={(v) => field.onChange(v[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="w-full"
                />
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Expected Close Date */}
          <div className="space-y-2">
            <Label htmlFor="expectedCloseDate">Fecha de Cierre Esperada</Label>
            <Controller
              name="expectedCloseDate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="expectedCloseDate"
                  type="date"
                />
              )}
            />
          </div>

          {/* Priority */}
          <div className="space-y-2">
            <Label>Prioridad</Label>
            <Controller
              name="priority"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baja</SelectItem>
                    <SelectItem value="medium">Media</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
          </div>

          {/* Stage */}
          {stages && stages.length > 0 && (
            <div className="space-y-2">
              <Label>Etapa del Pipeline</Label>
              <Controller
                name="stageId"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id}>
                          <div className="flex items-center gap-2">
                            <div
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: stage.color }}
                            />
                            {stage.label}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="description"
                  placeholder="Detalles adicionales de la oportunidad..."
                  rows={4}
                />
              )}
            />
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <TagInput
              tags={currentTags}
              onAddTag={handleAddTag}
              onRemoveTag={handleRemoveTag}
              disabled={isSubmitting}
            />
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Documentos Adjuntos
            </Label>
            <AttachmentSection
              entityType="opportunity"
              entityId={opportunity.id}
              title=""
              description=""
              category="proposal"
              accessLevel="team"
              view="compact"
              compact
            />
          </div>
        </form>
      </ScrollArea>

      {/* Footer */}
      <div className={cn(
        'flex-shrink-0 pt-4 px-4 border-t bg-card/50 backdrop-blur-sm',
        // Mobile: account for bottom bar (64px) + safe area + padding
        'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px)+1rem)]',
        // Desktop: normal padding (no bottom bar)
        'sm:pb-4'
      )}>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="opportunity-form"
            className="flex-1"
            disabled={isSubmitting || !isDirty}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Guardar Cambios
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Main Component
// ============================================

export function OpportunityDetailSheet({
  opportunity,
  open,
  onClose,
  onSuccess,
  onDelete,
  onWin,
  onLost,
  defaultMode = 'view',
}: OpportunityDetailSheetProps) {
  const router = useRouter();
  const isMobile = useMediaQuery('(max-width: 639px)');
  const [mode, setMode] = React.useState<DetailMode>(defaultMode);

  // Initialize theme
  useOpportunityTheme();

  // Reset mode when opportunity changes
  React.useEffect(() => {
    setMode(defaultMode);
  }, [opportunity?.id, defaultMode]);

  const handleViewDetails = () => {
    if (opportunity) {
      router.push(`/app/opportunities/${opportunity.id}`);
    }
  };

  const handleEditSuccess = (updatedOpportunity: Opportunity) => {
    setMode('view');
    onSuccess?.(updatedOpportunity);
  };

  const handleWin = () => {
    if (opportunity) {
      onWin?.(opportunity);
      onClose();
    }
  };

  const handleLost = () => {
    if (opportunity) {
      onLost?.(opportunity);
      onClose();
    }
  };

  if (!opportunity) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        accessibleTitle={opportunity ? `Oportunidad: ${opportunity.name}` : 'Detalles de Oportunidad'}
        className={cn(
          'p-0',
          isMobile
            ? 'h-[90vh] rounded-t-2xl'
            : 'w-full sm:w-[420px] md:w-[480px] sm:max-w-[480px]'
        )}
      >
        <AnimatePresence mode="wait">
          {mode === 'view' ? (
            <ViewMode
              key="view-mode"
              opportunity={opportunity}
              onEdit={() => setMode('edit')}
              onWin={onWin ? handleWin : undefined}
              onLost={onLost ? handleLost : undefined}
              onViewDetails={handleViewDetails}
              onClose={onClose}
            />
          ) : (
            <EditMode
              key="edit-mode"
              opportunity={opportunity}
              onCancel={() => setMode('view')}
              onSuccess={handleEditSuccess}
            />
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

export default OpportunityDetailSheet;

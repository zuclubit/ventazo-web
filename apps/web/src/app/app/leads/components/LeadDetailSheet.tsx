'use client';

/**
 * LeadDetailSheet - Unified View/Edit Component (v1.0)
 *
 * Premium unified component for viewing and editing leads.
 * Combines LeadPreviewPanel and LeadFormSheet functionality in a single Sheet.
 *
 * Design Principles:
 * - Single location: View and Edit in same Sheet position
 * - Smooth transitions: Framer Motion for mode switching
 * - Mobile-first: CSS responsive breakpoints
 * - Touch-friendly: 48px minimum touch targets
 * - Accessibility: WCAG 2.1 AA compliant
 * - Dynamic theming: Uses CSS variables for tenant colors
 * - XSS Prevention: Sanitized inputs/outputs
 *
 * @module leads/components/LeadDetailSheet
 */

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import {
  AlertCircle,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  Edit3,
  ExternalLink,
  Eye,
  Flame,
  Globe,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  Plus,
  RefreshCcw,
  Sparkles,
  Star,
  Tag,
  TrendingUp,
  User,
  UserCheck,
  X,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
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
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  useUpdateLead,
  usePipelineStages,
  LeadSource,
  LeadStatus,
  type Lead,
  SCORE_CATEGORY_COLORS,
  SOURCE_LABELS,
  STATUS_LABELS,
} from '@/lib/leads';
import { useI18n } from '@/lib/i18n/context';
import { sanitizeLeadData, sanitizeTags, sanitizeForDisplay } from '@/lib/security/form-sanitizer';
import { cn } from '@/lib/utils';

import {
  FormField,
  InputWithIcon,
  TextareaWithCounter,
  StatusPills,
  FormSection,
  FormSections,
} from './lead-form';
import { LeadScoreIndicator } from './LeadScoreIndicator';
import { QuickActionsBar } from './QuickActionsBar';
import { AttachmentSection } from '@/components/ui/attachment-section';
import { Paperclip } from 'lucide-react';

// ============================================
// Types & Schema
// ============================================

type DetailMode = 'view' | 'edit';

export interface LeadDetailSheetProps {
  lead: Lead | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (lead: Lead) => void;
  onDelete?: (lead: Lead) => void;
  onConvert?: (lead: Lead) => void;
  defaultMode?: DetailMode;
  aiInsight?: string;
}

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
    companyName: z.string().max(200, v.companyMax).optional().or(z.literal('')),
    jobTitle: z.string().max(100, v.jobTitleMax).optional().or(z.literal('')),
    website: z
      .string()
      .url(v.websiteInvalid)
      .max(500, v.websiteMax)
      .optional()
      .or(z.literal('')),
    industry: z.string().max(100, v.industryMax).optional().or(z.literal('')),
    source: z.nativeEnum(LeadSource).optional(),
    stageId: z.string().uuid().optional().or(z.literal('')),
    status: z.string().optional(),
    notes: z.string().max(2000, v.notesMax).optional().or(z.literal('')),
    tags: z.array(z.string().max(50)).max(20).optional(),
  });

type LeadFormData = z.infer<ReturnType<typeof createLeadFormSchema>>;

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
// Tag Input Component (Reused from LeadFormSheet)
// ============================================

interface TagInputProps {
  tags: string[];
  onAddTag: (tag: string) => void;
  onRemoveTag: (tag: string) => void;
  disabled?: boolean;
  maxTags?: number;
  labels: {
    placeholder: string;
    limitReached: string;
    addHint: string;
    removeAriaLabel: (tag: string) => string;
  };
}

function TagInput({
  tags,
  onAddTag,
  onRemoveTag,
  disabled,
  maxTags = 20,
  labels,
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
          placeholder={
            tags.length >= maxTags ? labels.limitReached : labels.placeholder
          }
          className={cn(
            'flex-1 min-w-[100px] bg-transparent border-none outline-none',
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
// View Mode Component
// ============================================

interface ViewModeProps {
  lead: Lead;
  onEdit: () => void;
  onDelete: () => void;
  onConvert: () => void;
  onClose: () => void;
  aiInsight?: string;
}

function ViewMode({ lead, onEdit, onDelete, onConvert, onClose, aiInsight }: ViewModeProps) {
  const { t } = useI18n();
  const initials = lead.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '-';
    try {
      return new Date(dateStr).toLocaleDateString('es-MX', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return '-';
    }
  };

  const formatRelativeTime = (dateStr?: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays === 0) return 'Hoy';
      if (diffDays === 1) return 'Ayer';
      if (diffDays < 7) return `Hace ${diffDays} días`;
      if (diffDays < 30) return `Hace ${Math.floor(diffDays / 7)} sem.`;
      return formatDate(dateStr);
    } catch {
      return '';
    }
  };

  const scoreCategory = lead.scoreCategory || (lead.score >= 70 ? 'hot' : lead.score >= 40 ? 'warm' : 'cold');
  const isHot = scoreCategory === 'hot';

  return (
    <motion.div
      className="flex flex-col h-full"
      {...modeTransition}
    >
      {/* Header */}
      <div className={cn(
        'shrink-0 border-b border-border/40',
        'px-4 py-4 sm:px-5',
        'bg-gradient-to-b from-background to-background/80'
      )}>
        <div className="flex items-start justify-between gap-3">
          {/* Lead Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className={cn(
              'h-12 w-12 shrink-0',
              'ring-2 ring-offset-2 ring-offset-background',
              isHot ? 'ring-orange-500' : 'ring-primary/20'
            )}>
              <AvatarFallback className={cn(
                'text-sm font-semibold',
                isHot
                  ? 'bg-gradient-to-br from-orange-500 to-amber-500 text-white'
                  : 'bg-primary/10 text-primary'
              )}>
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg truncate">
                  {sanitizeForDisplay(lead.fullName)}
                </h2>
                {isHot && (
                  <Flame className="h-4 w-4 text-orange-500 shrink-0 animate-pulse" />
                )}
              </div>
              {lead.companyName && (
                <p className="text-sm text-muted-foreground truncate">
                  {sanitizeForDisplay(lead.companyName)}
                  {lead.jobTitle && ` · ${sanitizeForDisplay(lead.jobTitle)}`}
                </p>
              )}
            </div>
          </div>

          {/* Close Button */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="h-9 w-9 rounded-full shrink-0"
            aria-label={t.leads.form.actions.close}
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Score + Status Row */}
        <div className="flex items-center justify-between mt-4">
          <LeadScoreIndicator
            score={lead.score}
            size="lg"
            showLabel
          />
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium',
              SCORE_CATEGORY_COLORS[scoreCategory as keyof typeof SCORE_CATEGORY_COLORS] || SCORE_CATEGORY_COLORS.cold
            )}
          >
            {STATUS_LABELS[lead.status as LeadStatus] || lead.status}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 px-4 py-3 border-b border-border/40 bg-muted/30">
        <QuickActionsBar
          lead={{
            phone: lead.phone,
            email: lead.email,
            fullName: lead.fullName,
          }}
          variant="icons-only"
          size="sm"
        />
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-4 sm:px-5 space-y-5">
          {/* AI Insight Card */}
          {aiInsight && (
            <motion.div
              {...fadeIn}
              className={cn(
                'p-4 rounded-xl',
                'bg-gradient-to-br from-primary/5 via-primary/10 to-accent/5',
                'border border-primary/20',
                'relative overflow-hidden'
              )}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <span className="text-xs font-semibold text-primary uppercase tracking-wide">
                    AI Insight
                  </span>
                </div>
                <p className="text-sm text-foreground/90 leading-relaxed">
                  {sanitizeForDisplay(aiInsight)}
                </p>
              </div>
            </motion.div>
          )}

          {/* Contact Information */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <User className="h-4 w-4" />
              Información de Contacto
            </h3>
            <div className="space-y-3">
              {/* Email */}
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Email</p>
                  <a
                    href={`mailto:${lead.email}`}
                    className="text-sm font-medium text-foreground hover:text-primary truncate block"
                  >
                    {sanitizeForDisplay(lead.email)}
                  </a>
                </div>
              </div>

              {/* Phone */}
              {lead.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <a
                      href={`tel:${lead.phone}`}
                      className="text-sm font-medium text-foreground hover:text-primary truncate block"
                    >
                      {sanitizeForDisplay(lead.phone)}
                    </a>
                  </div>
                </div>
              )}

              {/* Website */}
              {lead.website && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Sitio Web</p>
                    <a
                      href={lead.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-primary truncate flex items-center gap-1"
                    >
                      {sanitizeForDisplay(lead.website.replace(/^https?:\/\//, ''))}
                      <ExternalLink className="h-3 w-3 shrink-0" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          </section>

          <Separator />

          {/* Business Details */}
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Detalles del Negocio
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard
                label="Industria"
                value={lead.industry}
                icon={Briefcase}
              />
              <InfoCard
                label="Fuente"
                value={SOURCE_LABELS[lead.source] || lead.source}
                icon={TrendingUp}
              />
              <InfoCard
                label="Creado"
                value={formatRelativeTime(lead.createdAt)}
                icon={Calendar}
              />
              <InfoCard
                label="Última Actividad"
                value={formatRelativeTime(lead.lastActivityAt)}
                icon={Clock}
              />
            </div>
          </section>

          {/* Tags */}
          {lead.tags && lead.tags.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Etiquetas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {lead.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs bg-primary/10 text-primary border-0"
                    >
                      {sanitizeForDisplay(tag)}
                    </Badge>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Notes */}
          {lead.notes && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notas
                </h3>
                <div className="p-3 rounded-lg bg-muted/30 text-sm text-foreground/80 whitespace-pre-wrap">
                  {sanitizeForDisplay(lead.notes)}
                </div>
              </section>
            </>
          )}

          {/* Attachments */}
          <Separator />
          <section>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Documentos Adjuntos
            </h3>
            <AttachmentSection
              entityType="lead"
              entityId={lead.id}
              title=""
              description="Propuestas, documentos y archivos relacionados"
              category="document"
              accessLevel="team"
              view="list"
              showUploader
              showList
            />
          </section>

          {/* Follow-up Alert */}
          {lead.nextFollowUpAt && (
            <>
              <Separator />
              <section>
                <div className={cn(
                  'p-4 rounded-xl border',
                  lead.isFollowUpOverdue
                    ? 'bg-destructive/10 border-destructive/20'
                    : 'bg-amber-500/10 border-amber-500/20'
                )}>
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                      lead.isFollowUpOverdue ? 'bg-destructive/20' : 'bg-amber-500/20'
                    )}>
                      <Clock className={cn(
                        'h-5 w-5',
                        lead.isFollowUpOverdue ? 'text-destructive' : 'text-amber-600'
                      )} />
                    </div>
                    <div>
                      <p className={cn(
                        'text-sm font-medium',
                        lead.isFollowUpOverdue ? 'text-destructive' : 'text-amber-700 dark:text-amber-400'
                      )}>
                        {lead.isFollowUpOverdue ? 'Seguimiento Vencido' : 'Próximo Seguimiento'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(lead.nextFollowUpAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </section>
            </>
          )}
        </div>
      </ScrollArea>

      {/* Footer Actions */}
      <div className={cn(
        'shrink-0 border-t border-border/40',
        'px-4 pt-4 sm:px-5',
        'bg-background/95 backdrop-blur-sm',
        // Mobile: account for bottom bar (64px) + safe area + padding
        'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px)+1rem)]',
        // Desktop: normal padding (no bottom bar)
        'sm:pb-4'
      )}>
        <div className="flex items-center gap-3">
          {/* Edit Button - Primary */}
          <Button
            onClick={onEdit}
            className={cn(
              'flex-1 h-11',
              'bg-primary hover:bg-primary/90',
              'shadow-lg shadow-primary/20'
            )}
          >
            <Edit3 className="h-4 w-4 mr-2" />
            Editar Lead
          </Button>

          {/* Convert Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onConvert}
                  className="h-11 w-11 shrink-0"
                  aria-label="Convertir a Cliente"
                >
                  <UserCheck className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Convertir a Cliente</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* Delete Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onDelete}
                  className="h-11 w-11 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Eliminar Lead"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar Lead</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Info Card Helper Component
// ============================================

function InfoCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string;
  icon: React.ElementType;
}) {
  if (!value) return null;

  return (
    <div className="p-3 rounded-lg bg-muted/30">
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className="text-sm font-medium truncate">{sanitizeForDisplay(value)}</p>
    </div>
  );
}

// ============================================
// Edit Mode Component
// ============================================

interface EditModeProps {
  lead: Lead;
  onCancel: () => void;
  onSave: (lead: Lead) => void;
}

function EditMode({ lead, onCancel, onSave }: EditModeProps) {
  const [tags, setTags] = React.useState<string[]>(lead.tags || []);
  const [selectedStatus, setSelectedStatus] = React.useState<string>(
    lead.status || 'new'
  );
  const { toast } = useToast();
  const { t } = useI18n();

  const updateLead = useUpdateLead();
  const { data: stages, isLoading: stagesLoading } = usePipelineStages();

  const isLoading = updateLead.isPending;

  // Schema with translations
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

  // Status options
  const statusOptions = React.useMemo(
    () => [
      { id: 'new', label: t.leads.status.new, shortLabel: t.leads.status.new, color: '#10B981', isCompleted: false },
      { id: 'contacted', label: t.leads.status.contacted, shortLabel: t.leads.status.contactedShort || 'Contacto', color: '#10B981', isCompleted: true },
      { id: 'in_progress', label: t.leads.status.inProgress, shortLabel: t.leads.status.inProgressShort || 'En curso', color: '#F97316', isCompleted: false },
      { id: 'qualified', label: t.leads.status.qualified, shortLabel: t.leads.status.qualifiedShort || 'Calific.', color: '#8B5CF6', isCompleted: false },
      { id: 'proposal', label: t.leads.status.proposal, shortLabel: t.leads.status.proposal, color: '#3B82F6', isCompleted: false },
      { id: 'negotiation', label: t.leads.status.negotiation, shortLabel: t.leads.status.negotiationShort || 'Negoc.', color: '#EC4899', isCompleted: false },
      { id: 'won', label: t.leads.status.won, shortLabel: t.leads.status.won, color: '#10B981', isCompleted: true },
      { id: 'lost', label: t.leads.status.lost, shortLabel: t.leads.status.lost, color: '#EF4444', isCompleted: false },
    ],
    [t]
  );

  // Source labels
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

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    setValue,
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadFormSchema),
    mode: 'onChange',
    defaultValues: {
      fullName: lead.fullName,
      email: lead.email,
      phone: lead.phone || '',
      companyName: lead.companyName || '',
      jobTitle: lead.jobTitle || '',
      website: lead.website || '',
      industry: lead.industry || '',
      source: lead.source,
      stageId: lead.stageId || '',
      status: lead.status || 'new',
      notes: lead.notes || '',
      tags: lead.tags,
    },
  });

  const watchedCompanyName = watch('companyName');
  const watchedNotes = watch('notes') || '';

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

  const handleStatusChange = React.useCallback(
    (statusId: string) => {
      setSelectedStatus(statusId);
      setValue('status', statusId, { shouldDirty: true });
    },
    [setValue]
  );

  const onSubmit = async (data: LeadFormData) => {
    try {
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

      onSave(result as Lead);
    } catch (error) {
      console.error('Failed to update lead:', error);
      toast({
        title: t.leads.form.errors.saveFailed,
        description:
          error instanceof Error ? error.message : t.leads.form.errors.saveFailed,
        variant: 'destructive',
      });
    }
  };

  // Progress calculation
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
    <motion.div
      className="flex flex-col h-full"
      {...modeTransition}
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
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onCancel}
              className="h-8 w-8 rounded-full shrink-0 -ml-1"
              aria-label="Volver a vista"
            >
              <ChevronRight className="h-5 w-5 rotate-180" />
            </Button>
            <h2 className="text-lg font-semibold truncate">
              {t.leads.editLead}
            </h2>
          </div>
          {/* Progress bar */}
          <div className="flex items-center gap-2 mt-1.5 ml-8">
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
                progress > 0 && progress < 60 && "text-amber-600 dark:text-amber-400",
                progress >= 60 && "text-primary"
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
          onClick={onCancel}
          className="h-10 w-10 rounded-full shrink-0"
          aria-label={t.leads.form.actions.close}
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Form Content */}
      <ScrollArea className="flex-1 min-h-0">
        <form
          id="lead-edit-form"
          className="px-5 py-5 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Status Pills */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">
              {t.leads.status.label}
            </label>
            <StatusPills
              options={statusOptions}
              value={selectedStatus}
              onChange={handleStatusChange}
              disabled={isLoading}
            />
          </div>

          <FormSections>
            {/* Personal Info */}
            <FormSection
              title={t.leads.form.personalInfo.title}
              icon={User}
              defaultExpanded={true}
              collapsible={false}
            >
              <div className="space-y-4">
                <FormField
                  label={t.leads.form.fields.fullName.label}
                  id="fullName"
                  error={errors.fullName?.message}
                  required
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField
                    label={t.leads.form.fields.email.label}
                    id="email"
                    error={errors.email?.message}
                    required
                  >
                    <InputWithIcon
                      id="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
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
                  >
                    <InputWithIcon
                      id="phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder={t.leads.form.fields.phone.placeholder}
                      disabled={isLoading}
                      icon={Phone}
                      error={!!errors.phone}
                      {...register('phone')}
                    />
                  </FormField>
                </div>
              </div>
            </FormSection>

            {/* Company Info */}
            <FormSection
              title={t.leads.form.companyInfo.title}
              icon={Building2}
              defaultExpanded={true}
              description={t.leads.form.companyInfo.description}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <FormField
                  label={t.leads.form.fields.company.label}
                  id="companyName"
                  error={errors.companyName?.message}
                >
                  <InputWithIcon
                    id="companyName"
                    autoComplete="organization"
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
                >
                  <InputWithIcon
                    id="jobTitle"
                    autoComplete="organization-title"
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
                >
                  <InputWithIcon
                    id="website"
                    type="url"
                    inputMode="url"
                    autoComplete="url"
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

            {/* Classification */}
            <FormSection
              title={t.leads.form.classification.title}
              icon={Tag}
              defaultExpanded={true}
              description={t.leads.form.classification.description}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                        <SelectTrigger className="h-11 rounded-lg">
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
                        <SelectTrigger className="h-11 rounded-lg">
                          <SelectValue placeholder={t.leads.form.fields.stage.placeholder} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">
                            {t.leads.form.fields.stage.noStage}
                          </SelectItem>
                          {stages?.map((stage) => (
                            <SelectItem key={stage.id} value={stage.id}>
                              <div className="flex items-center gap-2">
                                <div
                                  className="w-3 h-3 rounded-full shrink-0"
                                  style={{ backgroundColor: stage.color }}
                                />
                                <span className="truncate">{stage.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </FormField>
              </div>

              <FormField label={t.leads.form.fields.tags.label} id="tags">
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

            {/* Notes */}
            <FormSection
              title={t.leads.form.notes.title}
              icon={Sparkles}
              defaultExpanded={!!lead.notes}
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

            {/* Attachments */}
            <FormSection
              title="Documentos Adjuntos"
              icon={Paperclip}
              defaultExpanded={false}
              description="Adjunta propuestas, documentos y archivos relacionados"
            >
              <AttachmentSection
                entityType="lead"
                entityId={lead.id}
                title=""
                description=""
                category="document"
                accessLevel="team"
                view="compact"
                compact
              />
            </FormSection>
          </FormSections>
        </form>
      </ScrollArea>

      {/* Footer */}
      <div
        className={cn(
          'shrink-0',
          'px-4 pt-3 sm:px-5 sm:pt-4',
          // Mobile: account for bottom bar (64px) + safe area + padding
          'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px)+1rem)]',
          // Desktop: normal padding (no bottom bar)
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
                <span>{t.leads.form.validation.fixErrors}</span>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
            className="flex-1 h-12"
          >
            <Eye className="h-4 w-4 mr-2" />
            Ver
          </Button>
          <Button
            type="submit"
            form="lead-edit-form"
            disabled={isLoading || !isValid}
            className={cn(
              'flex-[2] h-12',
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
                {t.leads.form.actions.saving}
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
                {t.leads.form.actions.save}
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

export function LeadDetailSheet({
  lead,
  open,
  onClose,
  onSuccess,
  onDelete,
  onConvert,
  defaultMode = 'view',
  aiInsight,
}: LeadDetailSheetProps) {
  const [mode, setMode] = React.useState<DetailMode>(defaultMode);

  // Reset mode when lead changes or sheet opens
  React.useEffect(() => {
    if (open) {
      setMode(defaultMode);
    }
  }, [open, lead?.id, defaultMode]);

  const handleEdit = () => setMode('edit');
  const handleViewMode = () => setMode('view');

  const handleSave = (updatedLead: Lead) => {
    onSuccess?.(updatedLead);
    setMode('view');
  };

  const handleDelete = () => {
    if (lead) {
      onDelete?.(lead);
    }
  };

  const handleConvert = () => {
    if (lead) {
      onConvert?.(lead);
    }
  };

  const handleClose = () => {
    setMode('view');
    onClose();
  };

  if (!lead) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent
        side="right"
        hideCloseButton
        accessibleTitle={lead ? `Detalles de ${lead.fullName}` : 'Detalles del Lead'}
        className={cn(
          // Layout
          'flex flex-col p-0 gap-0',
          // Visual
          'backdrop-blur-xl bg-background/95',
          // Responsive width
          'w-full max-w-full',
          'sm:w-[420px] sm:max-w-[calc(100vw-2rem)]',
          'md:w-[480px]',
          // Transition
          'transition-all duration-300'
        )}
      >
        <AnimatePresence mode="wait">
          {mode === 'view' ? (
            <ViewMode
              key="view"
              lead={lead}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onConvert={handleConvert}
              onClose={handleClose}
              aiInsight={aiInsight}
            />
          ) : (
            <EditMode
              key="edit"
              lead={lead}
              onCancel={handleViewMode}
              onSave={handleSave}
            />
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

export default LeadDetailSheet;

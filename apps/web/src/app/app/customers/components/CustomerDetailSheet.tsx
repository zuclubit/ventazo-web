'use client';

/**
 * CustomerDetailSheet - Unified View/Edit Component (v1.0)
 *
 * Premium unified component for viewing and editing customers.
 * Combines view and edit functionality in a single Sheet.
 *
 * Design Principles:
 * - Single location: View and Edit in same Sheet position
 * - Smooth transitions: Framer Motion for mode switching
 * - Mobile-first: CSS responsive breakpoints
 * - Touch-friendly: 48px minimum touch targets
 * - Accessibility: WCAG 2.1 AA compliant
 * - Dynamic theming: Uses CSS variables for tenant colors
 *
 * @module customers/components/CustomerDetailSheet
 */

import * as React from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  AlertTriangle,
  Briefcase,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  Clock,
  DollarSign,
  Edit3,
  ExternalLink,
  Eye,
  Globe,
  Heart,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  RefreshCw,
  Star,
  Tag,
  TrendingUp,
  User,
  X,
} from 'lucide-react';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import {
  useUpdateCustomer,
  type Customer,
  CustomerStatus,
  CustomerTier,
  STATUS_LABELS,
  TIER_LABELS,
} from '@/lib/customers';
import { cn } from '@/lib/utils';

import { CustomerHealthIndicator } from './CustomerHealthIndicator';
import { CustomerTierBadge } from './CustomerTierBadge';
import { CustomerQuickActions, WebsiteButton } from './CustomerQuickActions';
import { useCustomerHealth } from '../hooks';
import { AttachmentSection } from '@/components/ui/attachment-section';
import { Paperclip } from 'lucide-react';

// ============================================
// Types & Schema
// ============================================

type DetailMode = 'view' | 'edit';

export interface CustomerDetailSheetProps {
  customer: Customer | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (customer: Customer) => void;
  onDelete?: (customer: Customer) => void;
  defaultMode?: DetailMode;
}

const customerFormSchema = z.object({
  companyName: z.string().min(2, 'Mínimo 2 caracteres').max(200),
  displayName: z.string().max(200).optional().or(z.literal('')),
  fullName: z.string().max(200).optional().or(z.literal('')),
  email: z.string().email('Email inválido').max(254),
  phone: z.string().max(30).optional().or(z.literal('')),
  website: z.string().url('URL inválida').max(500).optional().or(z.literal('')),
  industry: z.string().max(100).optional().or(z.literal('')),
  status: z.nativeEnum(CustomerStatus).optional(),
  tier: z.nativeEnum(CustomerTier).optional(),
  notes: z.string().max(2000).optional().or(z.literal('')),
  mrr: z.number().min(0).optional(),
  contractValue: z.number().min(0).optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

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
// Utility Functions
// ============================================

function getInitials(name: string | null | undefined): string {
  if (!name) return '??';
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatCurrency(amount: number | null | undefined): string {
  if (amount == null || isNaN(amount)) return '$0';
  if (amount >= 1000000) return `$${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `$${(amount / 1000).toFixed(0)}K`;
  return `$${amount.toFixed(0)}`;
}

function formatDate(dateStr?: string | null): string {
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
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return '';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

function getRenewalUrgency(renewalDate?: string | null): 'urgent' | 'warning' | 'notice' | null {
  if (!renewalDate) return null;
  try {
    const days = differenceInDays(new Date(renewalDate), new Date());
    if (days < 0) return 'urgent';
    if (days <= 7) return 'urgent';
    if (days <= 30) return 'warning';
    if (days <= 90) return 'notice';
    return null;
  } catch {
    return null;
  }
}

// ============================================
// Info Card Helper Component
// ============================================

function InfoCard({
  label,
  value,
  icon: Icon,
  highlight = false,
}: {
  label: string;
  value?: string | null;
  icon: React.ElementType;
  highlight?: boolean;
}) {
  if (!value) return null;

  return (
    <div className={cn(
      'p-3 rounded-lg',
      highlight ? 'bg-primary/10' : 'bg-muted/30'
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn(
          'h-3.5 w-3.5',
          highlight ? 'text-primary' : 'text-muted-foreground'
        )} />
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <p className={cn(
        'text-sm font-medium truncate',
        highlight && 'text-primary'
      )}>{value}</p>
    </div>
  );
}

// ============================================
// View Mode Component
// ============================================

interface ViewModeProps {
  customer: Customer;
  onEdit: () => void;
  onDelete: () => void;
  onClose: () => void;
}

function ViewMode({ customer, onEdit, onDelete, onClose }: ViewModeProps) {
  const { calculateHealth } = useCustomerHealth();
  const healthResult = calculateHealth(customer);

  const displayName = customer.companyName || customer.displayName || customer.fullName || 'Sin nombre';
  const isAtRisk = customer.status === 'at_risk' || healthResult.level === 'critical';
  const renewalUrgency = getRenewalUrgency(customer.renewalDate || customer.contractEndDate);

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
          {/* Customer Info */}
          <div className="flex items-center gap-3 min-w-0">
            <Avatar className={cn(
              'h-12 w-12 shrink-0',
              'ring-2 ring-offset-2 ring-offset-background',
              isAtRisk ? 'ring-[var(--status-error)]' : 'ring-primary/20'
            )}>
              <AvatarFallback className={cn(
                'text-sm font-semibold',
                isAtRisk
                  ? 'bg-gradient-to-br from-[var(--status-error)] to-[var(--status-warning)] text-white'
                  : 'bg-primary/10 text-primary'
              )}>
                {getInitials(displayName)}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-lg truncate">
                  {displayName}
                </h2>
                {isAtRisk && (
                  <AlertTriangle className="h-4 w-4 text-[var(--status-error)] shrink-0 animate-pulse" />
                )}
              </div>
              {customer.fullName && customer.fullName !== displayName && (
                <p className="text-sm text-muted-foreground truncate">
                  {customer.fullName}
                  {customer.industry && ` · ${customer.industry}`}
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
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Health + Tier + Status Row */}
        <div className="flex items-center justify-between mt-4 flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <CustomerHealthIndicator
              score={healthResult.score}
              size="lg"
              variant="badge"
            />
            <CustomerTierBadge
              tier={customer.tier}
              size="sm"
              variant="gradient"
            />
          </div>
          <Badge
            variant="outline"
            className={cn(
              'text-xs font-medium',
              customer.status === 'active' && 'bg-[var(--status-success-bg)] text-[var(--status-success)] border-[var(--status-success-border)]',
              customer.status === 'at_risk' && 'bg-[var(--status-warning-bg)] text-[var(--status-warning)] border-[var(--status-warning-border)]',
              customer.status === 'churned' && 'bg-[var(--status-error-bg)] text-[var(--status-error)] border-[var(--status-error-border)]',
              customer.status === 'inactive' && 'bg-muted text-muted-foreground border-border',
            )}
          >
            {STATUS_LABELS[customer.status] || customer.status}
          </Badge>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="shrink-0 px-4 py-3 border-b border-border/40 bg-muted/30">
        <div className="flex items-center gap-2">
          <CustomerQuickActions
            customer={customer}
            variant="labeled"
            size="sm"
            orientation="horizontal"
          />
          {customer.website && (
            <WebsiteButton
              url={customer.website}
              size="sm"
              variant="labeled"
            />
          )}
        </div>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="px-4 py-4 sm:px-5 space-y-5">
          {/* Revenue Card */}
          {(customer.mrr || customer.contractValue || customer.totalRevenue) && (
            <motion.div
              {...fadeIn}
              className={cn(
                'p-4 rounded-xl',
                'bg-gradient-to-br from-[var(--status-success)]/5 via-[var(--status-success)]/10 to-[var(--tenant-accent)]/5',
                'border border-[var(--status-success)]/20',
                'relative overflow-hidden'
              )}
            >
              <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--status-success)]/5 rounded-full blur-3xl" />
              <div className="relative">
                <div className="flex items-center gap-2 mb-3">
                  <DollarSign className="h-4 w-4 text-[var(--status-success)]" />
                  <span className="text-xs font-semibold text-[var(--status-success)] uppercase tracking-wide">
                    Ingresos
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-2xl font-bold text-[var(--status-success)]">
                      {formatCurrency(customer.mrr)}
                    </p>
                    <p className="text-xs text-muted-foreground">MRR</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(customer.contractValue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Contrato</p>
                  </div>
                  <div>
                    <p className="text-lg font-semibold text-foreground">
                      {formatCurrency(customer.totalRevenue)}
                    </p>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Renewal Alert */}
          {renewalUrgency && (
            <motion.div
              {...fadeIn}
              className={cn(
                'p-4 rounded-xl border',
                renewalUrgency === 'urgent' && 'bg-[var(--status-error-bg)] border-[var(--status-error-border)]',
                renewalUrgency === 'warning' && 'bg-[var(--status-warning-bg)] border-[var(--status-warning-border)]',
                renewalUrgency === 'notice' && 'bg-[var(--status-info-bg)] border-[var(--status-info-border)]',
              )}
            >
              <div className="flex items-center gap-3">
                <div className={cn(
                  'h-10 w-10 rounded-full flex items-center justify-center shrink-0',
                  renewalUrgency === 'urgent' && 'bg-[var(--status-error)]/20',
                  renewalUrgency === 'warning' && 'bg-[var(--status-warning)]/20',
                  renewalUrgency === 'notice' && 'bg-[var(--status-info)]/20',
                )}>
                  <RefreshCw className={cn(
                    'h-5 w-5',
                    renewalUrgency === 'urgent' && 'text-[var(--status-error)]',
                    renewalUrgency === 'warning' && 'text-[var(--status-warning)]',
                    renewalUrgency === 'notice' && 'text-[var(--status-info)]',
                  )} />
                </div>
                <div>
                  <p className={cn(
                    'text-sm font-medium',
                    renewalUrgency === 'urgent' && 'text-[var(--status-error)]',
                    renewalUrgency === 'warning' && 'text-[var(--status-warning)]',
                    renewalUrgency === 'notice' && 'text-[var(--status-info)]',
                  )}>
                    {renewalUrgency === 'urgent' ? 'Renovación Urgente' :
                     renewalUrgency === 'warning' ? 'Renovación Próxima' : 'Renovación Pendiente'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(customer.renewalDate || customer.contractEndDate)}
                  </p>
                </div>
              </div>
            </motion.div>
          )}

          {/* Health Concern */}
          {healthResult.primaryConcern && (
            <motion.div
              {...fadeIn}
              className="p-3 rounded-lg bg-[var(--status-warning-bg)] border border-[var(--status-warning-border)]"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-[var(--status-warning)] shrink-0" />
                <p className="text-sm text-[var(--status-warning)]">
                  {healthResult.primaryConcern}
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
                    href={`mailto:${customer.email}`}
                    className="text-sm font-medium text-foreground hover:text-primary truncate block"
                  >
                    {customer.email}
                  </a>
                </div>
              </div>

              {/* Phone */}
              {customer.phone && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-[var(--status-success)]/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-[var(--status-success)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Teléfono</p>
                    <a
                      href={`tel:${customer.phone}`}
                      className="text-sm font-medium text-foreground hover:text-primary truncate block"
                    >
                      {customer.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Website */}
              {customer.website && (
                <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                  <div className="h-9 w-9 rounded-full bg-[var(--status-info)]/10 flex items-center justify-center shrink-0">
                    <Globe className="h-4 w-4 text-[var(--status-info)]" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs text-muted-foreground">Sitio Web</p>
                    <a
                      href={customer.website.startsWith('http') ? customer.website : `https://${customer.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-medium text-foreground hover:text-primary truncate flex items-center gap-1"
                    >
                      {customer.website.replace(/^https?:\/\//, '')}
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
              Detalles del Cliente
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <InfoCard
                label="Industria"
                value={customer.industry}
                icon={Briefcase}
              />
              <InfoCard
                label="Tier"
                value={TIER_LABELS[customer.tier]}
                icon={Star}
                highlight
              />
              <InfoCard
                label="Cliente desde"
                value={formatRelativeTime(customer.convertedAt)}
                icon={Calendar}
              />
              <InfoCard
                label="Última Actividad"
                value={formatRelativeTime(customer.updatedAt)}
                icon={Clock}
              />
            </div>
          </section>

          {/* Tags */}
          {customer.tags && customer.tags.length > 0 && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Etiquetas
                </h3>
                <div className="flex flex-wrap gap-2">
                  {customer.tags.map((tag) => (
                    <Badge
                      key={tag}
                      variant="secondary"
                      className="text-xs bg-primary/10 text-primary border-0"
                    >
                      {tag}
                    </Badge>
                  ))}
                </div>
              </section>
            </>
          )}

          {/* Notes */}
          {customer.notes && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notas
                </h3>
                <div className="p-3 rounded-lg bg-muted/30 text-sm text-foreground/80 whitespace-pre-wrap">
                  {customer.notes}
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
              entityType="customer"
              entityId={customer.id}
              title=""
              description="Contratos, facturas y documentos relacionados"
              category="document"
              accessLevel="team"
              view="list"
              showUploader
              showList
            />
          </section>

          {/* Recommendations */}
          {healthResult.recommendations.length > 0 && healthResult.score < 80 && (
            <>
              <Separator />
              <section>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Recomendaciones
                </h3>
                <ul className="space-y-2">
                  {healthResult.recommendations.slice(0, 3).map((rec, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
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
            Editar Cliente
          </Button>

          {/* Delete Button */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={onDelete}
                  className="h-11 w-11 shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                  aria-label="Eliminar Cliente"
                >
                  <X className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Eliminar Cliente</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Edit Mode Component
// ============================================

interface EditModeProps {
  customer: Customer;
  onCancel: () => void;
  onSave: (customer: Customer) => void;
}

function EditMode({ customer, onCancel, onSave }: EditModeProps) {
  const { toast } = useToast();
  const updateCustomer = useUpdateCustomer();
  const isLoading = updateCustomer.isPending;

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isValid },
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    mode: 'onChange',
    defaultValues: {
      companyName: customer.companyName,
      displayName: customer.displayName || '',
      fullName: customer.fullName || '',
      email: customer.email,
      phone: customer.phone || '',
      website: customer.website || '',
      industry: customer.industry || '',
      status: customer.status,
      tier: customer.tier,
      notes: customer.notes || '',
      mrr: customer.mrr || 0,
      contractValue: customer.contractValue || 0,
    },
  });

  const watchedNotes = watch('notes') || '';

  const onSubmit = async (data: CustomerFormData) => {
    try {
      const payload = {
        ...data,
        phone: data.phone || undefined,
        website: data.website || undefined,
        industry: data.industry || undefined,
        notes: data.notes || undefined,
        displayName: data.displayName || undefined,
        fullName: data.fullName || undefined,
      };

      const result = await updateCustomer.mutateAsync({
        customerId: customer.id,
        data: payload,
      });

      toast({
        title: 'Cliente actualizado',
        description: 'Los cambios se han guardado correctamente.',
      });

      onSave(result as Customer);
    } catch (error) {
      console.error('Failed to update customer:', error);
      toast({
        title: 'Error al guardar',
        description: error instanceof Error ? error.message : 'Error desconocido',
        variant: 'destructive',
      });
    }
  };

  // Progress calculation
  const requiredFields = ['companyName', 'email'] as const;
  const optionalFields = ['phone', 'website', 'industry', 'fullName', 'notes'] as const;
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
      <div className={cn(
        'flex items-center justify-between shrink-0',
        'px-4 py-3 sm:px-5 sm:py-4',
        'border-b border-border/40'
      )}>
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
              Editar Cliente
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
            <span className={cn(
              'text-xs font-semibold tabular-nums min-w-[2.5rem] text-right',
              progress < 60 && 'text-[var(--status-warning)]',
              progress >= 60 && 'text-primary'
            )}>
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
          aria-label="Cerrar"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Form Content */}
      <ScrollArea className="flex-1 min-h-0">
        <form
          id="customer-edit-form"
          className="px-5 py-5 space-y-5"
          onSubmit={handleSubmit(onSubmit)}
        >
          {/* Status & Tier */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <Controller
                name="status"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar estado" />
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

            <div className="space-y-2">
              <label className="text-sm font-medium">Tier</label>
              <Controller
                name="tier"
                control={control}
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue placeholder="Seleccionar tier" />
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
          </div>

          {/* Company Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              Información de Empresa
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Nombre de Empresa <span className="text-destructive">*</span>
              </label>
              <Input
                {...register('companyName')}
                placeholder="Nombre de la empresa"
                disabled={isLoading}
                className={cn('h-11', errors.companyName && 'border-destructive')}
              />
              {errors.companyName && (
                <p className="text-xs text-destructive">{errors.companyName.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Contacto Principal</label>
                <Input
                  {...register('fullName')}
                  placeholder="Nombre del contacto"
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Industria</label>
                <Input
                  {...register('industry')}
                  placeholder="Ej: Tecnología"
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <User className="h-4 w-4" />
              Información de Contacto
            </h3>

            <div className="space-y-2">
              <label className="text-sm font-medium">
                Email <span className="text-destructive">*</span>
              </label>
              <Input
                {...register('email')}
                type="email"
                placeholder="email@empresa.com"
                disabled={isLoading}
                className={cn('h-11', errors.email && 'border-destructive')}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  {...register('phone')}
                  type="tel"
                  placeholder="+52 55 1234 5678"
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Sitio Web</label>
                <Input
                  {...register('website')}
                  type="url"
                  placeholder="https://empresa.com"
                  disabled={isLoading}
                  className={cn('h-11', errors.website && 'border-destructive')}
                />
              </div>
            </div>
          </div>

          {/* Financial Info */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-muted-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4" />
              Información Financiera
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">MRR (USD)</label>
                <Input
                  {...register('mrr', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={isLoading}
                  className="h-11"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Valor Contrato (USD)</label>
                <Input
                  {...register('contractValue', { valueAsNumber: true })}
                  type="number"
                  min="0"
                  placeholder="0"
                  disabled={isLoading}
                  className="h-11"
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Notas
            </label>
            <Textarea
              {...register('notes')}
              placeholder="Notas sobre el cliente..."
              disabled={isLoading}
              className="min-h-[100px] resize-none"
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground text-right">
              {watchedNotes.length}/2000
            </p>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Documentos Adjuntos
            </label>
            <AttachmentSection
              entityType="customer"
              entityId={customer.id}
              title=""
              description=""
              category="document"
              accessLevel="team"
              view="compact"
              compact
            />
          </div>
        </form>
      </ScrollArea>

      {/* Footer */}
      <div className={cn(
        'shrink-0',
        'px-4 pt-3 sm:px-5 sm:pt-4',
        // Mobile: account for bottom bar (64px) + safe area + padding
        'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px)+1rem)]',
        // Desktop: normal padding (no bottom bar)
        'sm:pb-4',
        'border-t border-border/40',
        'bg-background/95 backdrop-blur-sm'
      )}>
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
                <span>Por favor corrige los errores antes de guardar</span>
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
            form="customer-edit-form"
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
                Guardando...
              </>
            ) : (
              <>
                <Check className="mr-2 h-5 w-5" />
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

export function CustomerDetailSheet({
  customer,
  open,
  onClose,
  onSuccess,
  onDelete,
  defaultMode = 'view',
}: CustomerDetailSheetProps) {
  const [mode, setMode] = React.useState<DetailMode>(defaultMode);

  // Reset mode when customer changes or sheet opens
  React.useEffect(() => {
    if (open) {
      setMode(defaultMode);
    }
  }, [open, customer?.id, defaultMode]);

  const handleEdit = () => setMode('edit');
  const handleViewMode = () => setMode('view');

  const handleSave = (updatedCustomer: Customer) => {
    onSuccess?.(updatedCustomer);
    setMode('view');
  };

  const handleDelete = () => {
    if (customer) {
      onDelete?.(customer);
    }
  };

  const handleClose = () => {
    setMode('view');
    onClose();
  };

  if (!customer) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <SheetContent
        side="right"
        hideCloseButton
        accessibleTitle={customer ? `Detalles de ${customer.companyName || customer.displayName || 'Cliente'}` : 'Detalles del Cliente'}
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
              customer={customer}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onClose={handleClose}
            />
          ) : (
            <EditMode
              key="edit"
              customer={customer}
              onCancel={handleViewMode}
              onSave={handleSave}
            />
          )}
        </AnimatePresence>
      </SheetContent>
    </Sheet>
  );
}

export default CustomerDetailSheet;

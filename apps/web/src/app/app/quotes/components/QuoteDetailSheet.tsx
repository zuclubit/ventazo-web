'use client';

/**
 * QuoteDetailSheet - Unified View/Edit Component (v5.0)
 *
 * Enterprise-grade component for viewing and editing quotes.
 * Based on detailed UX requirements and design system.
 *
 * Key Improvements v5.0:
 * - Premium blue ValueCard gradient (homogenized with page design)
 * - Status-based color variants (green=accepted, red=rejected, blue=default)
 * - White text on colored cards for better contrast
 * - Decorative glow effects
 *
 * Key Improvements v4.0:
 * - Orange expiration banners
 * - Consistent contact buttons with labels
 * - Reactivate functionality for expired quotes
 * - Copy link and Download PDF functionality
 * - Client assignment CTA when no client
 * - Date cards for creation/expiry
 * - Improved typography hierarchy
 *
 * @version 5.0.0
 * @module quotes/components/QuoteDetailSheet
 */

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { AnimatePresence, motion } from 'framer-motion';
import { format, formatDistanceToNow, isPast, differenceInDays } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  CheckCircle,
  ChevronRight,
  Clock,
  Copy,
  DollarSign,
  Download,
  Edit3,
  ExternalLink,
  FileText,
  Loader2,
  Mail,
  MessageCircle,
  Package,
  Percent,
  Phone,
  RefreshCw,
  Send,
  Tag,
  Trash2,
  User,
  UserPlus,
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import type { Quote, QuoteStatus, QuoteLineItem, UpdateQuoteRequest } from '@/lib/quotes/types';
import { QUOTE_STATUS_LABELS } from '@/lib/quotes/types';
import { useUpdateQuote } from '@/lib/quotes/hooks';
import { useQuoteTheme } from '../hooks';
import { QuotePdfActions } from './QuotePdfActions';
import { CommentSection } from '@/components/comments';
import { AttachmentSection, AttachmentView } from '@/components/ui/attachment-section';
import { Paperclip } from 'lucide-react';

// ============================================
// Types & Schema
// ============================================

type DetailMode = 'view' | 'edit';

export interface QuoteDetailSheetProps {
  quote: Quote | null;
  open: boolean;
  onClose: () => void;
  onSuccess?: (quote: Quote) => void;
  onDelete?: (quote: Quote) => void;
  onSend?: (quote: Quote) => void;
  onAccept?: (quote: Quote) => void;
  onReject?: (quote: Quote) => void;
  onDuplicate?: (quote: Quote) => void;
  onDownloadPdf?: (quote: Quote) => Promise<Blob | void>;
  onReactivate?: (quote: Quote) => Promise<void>;
  onAssignClient?: (quote: Quote) => void;
  defaultMode?: DetailMode;
  isLoading?: boolean;
}

const quoteFormSchema = z.object({
  title: z.string().min(2, 'Título debe tener al menos 2 caracteres').max(200),
  description: z.string().max(2000).optional(),
  contactName: z.string().max(100).optional(),
  contactEmail: z.string().email('Email inválido').optional().or(z.literal('')),
  contactPhone: z.string().max(20).optional(),
  expiryDate: z.string().optional(),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(5000).optional(),
});

type QuoteFormData = z.infer<typeof quoteFormSchema>;

// ============================================
// Status Configuration
// ============================================

const STATUS_CONFIG: Record<QuoteStatus, {
  color: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: typeof FileText;
}> = {
  draft: {
    color: 'var(--quote-status-draft, #64748B)',
    bgColor: 'bg-slate-100/90 dark:bg-slate-700/50',
    textColor: 'text-slate-800 dark:text-slate-100',
    borderColor: 'border-slate-300 dark:border-slate-600',
    icon: FileText,
  },
  pending_review: {
    color: 'var(--quote-status-pending, #F59E0B)',
    bgColor: 'bg-amber-100/90 dark:bg-amber-800/40',
    textColor: 'text-amber-900 dark:text-amber-100',
    borderColor: 'border-amber-300 dark:border-amber-600',
    icon: Clock,
  },
  sent: {
    color: 'var(--quote-status-sent, #3B82F6)',
    bgColor: 'bg-blue-100/90 dark:bg-blue-800/40',
    textColor: 'text-blue-900 dark:text-blue-100',
    borderColor: 'border-blue-300 dark:border-blue-600',
    icon: Send,
  },
  viewed: {
    color: 'var(--quote-status-viewed, #8B5CF6)',
    bgColor: 'bg-violet-100/90 dark:bg-violet-800/40',
    textColor: 'text-violet-900 dark:text-violet-100',
    borderColor: 'border-violet-300 dark:border-violet-600',
    icon: FileText,
  },
  accepted: {
    color: 'var(--quote-status-accepted, #10B981)',
    bgColor: 'bg-emerald-100/90 dark:bg-emerald-800/40',
    textColor: 'text-emerald-900 dark:text-emerald-100',
    borderColor: 'border-emerald-300 dark:border-emerald-600',
    icon: CheckCircle,
  },
  rejected: {
    color: 'var(--quote-status-rejected, #EF4444)',
    bgColor: 'bg-red-100/90 dark:bg-red-800/40',
    textColor: 'text-red-900 dark:text-red-100',
    borderColor: 'border-red-300 dark:border-red-600',
    icon: XCircle,
  },
  expired: {
    color: 'var(--quote-status-expired, #6B7280)',
    bgColor: 'bg-orange-100/90 dark:bg-orange-800/40',
    textColor: 'text-orange-900 dark:text-orange-100',
    borderColor: 'border-orange-300 dark:border-orange-600',
    icon: Clock,
  },
  revised: {
    color: 'var(--quote-status-revised, #06B6D4)',
    bgColor: 'bg-cyan-100/90 dark:bg-cyan-800/40',
    textColor: 'text-cyan-900 dark:text-cyan-100',
    borderColor: 'border-cyan-300 dark:border-cyan-600',
    icon: FileText,
  },
};

// ============================================
// Animation Variants
// ============================================

const modeTransition = {
  initial: { opacity: 0, x: 20 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -20 },
  transition: { duration: 0.25, ease: [0.4, 0, 0.2, 1] as const },
};

// ============================================
// Helpers
// ============================================

/**
 * Format currency amount
 * Note: Backend stores values in cents, so we divide by 100
 */
function formatCurrency(amount: number, currency = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    return format(new Date(dateStr), "d 'de' MMM yyyy", { locale: es });
  } catch {
    return '-';
  }
}

function formatRelativeDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    return formatDistanceToNow(date, { addSuffix: true, locale: es });
  } catch {
    return '';
  }
}

function getExpiryStatus(expiryDate: string | null | undefined): {
  isExpired: boolean;
  isExpiringSoon: boolean;
  daysRemaining: number | null;
} {
  if (!expiryDate) return { isExpired: false, isExpiringSoon: false, daysRemaining: null };
  const expiry = new Date(expiryDate);
  const now = new Date();
  const days = differenceInDays(expiry, now);
  return {
    isExpired: isPast(expiry),
    isExpiringSoon: days >= 0 && days <= 7,
    daysRemaining: days,
  };
}

function normalizePhone(phone: string | null | undefined): string {
  if (!phone) return '';
  return phone.replace(/\D/g, '');
}

function sanitizeEmail(email: string | null | undefined): string {
  if (!email) return '';
  return email.trim().toLowerCase();
}

// ============================================
// Reusable Components
// ============================================

interface InfoRowProps {
  icon?: typeof Building2;
  label: string;
  value: React.ReactNode;
  className?: string;
}

function InfoRow({ icon: Icon, label, value, className }: InfoRowProps) {
  return (
    <div className={cn('flex items-start gap-3', className)}>
      {Icon && (
        <div className="shrink-0 w-8 h-8 rounded-lg bg-muted/80 flex items-center justify-center">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm font-medium text-foreground">{value || '-'}</div>
      </div>
    </div>
  );
}

interface LineItemRowProps {
  item: QuoteLineItem;
  currency: string;
}

function LineItemRow({ item, currency }: LineItemRowProps) {
  return (
    <div className="flex items-start justify-between gap-3 py-3 border-b border-border/50 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{item.name}</p>
        {item.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{item.description}</p>
        )}
        <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
          <span>{item.quantity} × {formatCurrency(item.unitPrice, currency)}</span>
          {item.discountValue && item.discountValue > 0 && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              -{item.discountType === 'percentage' ? `${item.discountValue}%` : formatCurrency(item.discountValue, currency)}
            </Badge>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold tabular-nums">{formatCurrency(item.total, currency)}</p>
      </div>
    </div>
  );
}

// ============================================
// Contact Button Component
// ============================================

interface ContactButtonProps {
  icon: typeof Phone;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  actionType: 'whatsapp' | 'call' | 'email';
}

function ContactButton({ icon: Icon, label, onClick, disabled, actionType }: ContactButtonProps) {
  const theme = useQuoteTheme();
  const actionTheme = theme.actions[actionType];

  // Dynamic styles using theme
  const enabledStyle: React.CSSProperties = {
    backgroundColor: actionTheme.bg,
    color: actionTheme.text,
    borderColor: actionTheme.border,
  };

  const enabledHoverStyle: React.CSSProperties = {
    backgroundColor: actionTheme.bgHover,
  };

  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={cn(
        'flex flex-col items-center justify-center gap-1.5',
        'p-3 rounded-xl border min-h-[64px]',
        'transition-all duration-200',
        disabled && 'cursor-not-allowed opacity-60 bg-muted text-muted-foreground border-border'
      )}
      style={disabled ? undefined : (isHovered ? { ...enabledStyle, ...enabledHoverStyle } : enabledStyle)}
    >
      <Icon className="w-5 h-5" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

// ============================================
// Date Card Component
// ============================================

interface DateCardProps {
  icon: typeof Calendar;
  label: string;
  date: string | null | undefined;
  isExpired?: boolean;
}

function DateCard({ icon: Icon, label, date, isExpired }: DateCardProps) {
  return (
    <div className={cn(
      'p-3 rounded-xl border transition-colors',
      isExpired
        ? 'bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800'
        : 'bg-muted/50 border-border'
    )}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={cn(
          'w-4 h-4',
          isExpired ? 'text-orange-500' : 'text-muted-foreground'
        )} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      <p className={cn(
        'text-sm font-semibold',
        isExpired ? 'text-orange-700 dark:text-orange-400' : 'text-foreground'
      )}>
        {formatDate(date)}
      </p>
      {date && (
        <p className={cn(
          'text-xs mt-0.5',
          isExpired ? 'text-orange-600 dark:text-orange-400' : 'text-muted-foreground'
        )}>
          {formatRelativeDate(date)}
        </p>
      )}
    </div>
  );
}

// ============================================
// Value Card Component
// ============================================

interface ValueCardProps {
  total: number;
  currency: string;
  itemsCount: number;
  status: QuoteStatus;
}

function ValueCard({ total, currency, itemsCount, status }: ValueCardProps) {
  const theme = useQuoteTheme();
  const isExpired = status === 'expired';
  const cardStyle = theme.getValueCardStyle(status, isExpired);

  return (
    <div
      className="relative overflow-hidden rounded-xl p-5 transition-all duration-300"
      style={cardStyle}
    >
      {/* Decorative elements */}
      <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white opacity-10 blur-2xl" />
      <div className="absolute -bottom-8 -left-8 w-24 h-24 rounded-full bg-white opacity-[0.05] blur-xl" />

      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <DollarSign className="h-4 w-4 text-white/80" />
          <p className="text-xs font-semibold text-white/80 uppercase tracking-wider">
            Monto Total
          </p>
        </div>
        <p className="text-3xl font-bold tabular-nums tracking-tight text-white">
          {formatCurrency(total, currency)}
        </p>
        {itemsCount > 0 && (
          <p className="text-sm text-white/70 mt-1">
            {itemsCount} {itemsCount === 1 ? 'concepto' : 'conceptos'}
          </p>
        )}
      </div>
    </div>
  );
}

// ============================================
// Status Badge Component
// ============================================

interface QuoteStatusBadgeProps {
  status: QuoteStatus;
  isExpired?: boolean;
}

function QuoteStatusBadge({ status, isExpired }: QuoteStatusBadgeProps) {
  const effectiveStatus = isExpired && status !== 'expired' ? 'expired' : status;
  const config = STATUS_CONFIG[effectiveStatus];
  const StatusIcon = config.icon;

  return (
    <Badge
      className={cn(
        'px-3 py-1.5 text-xs font-medium gap-1.5 border',
        config.bgColor,
        config.textColor,
        config.borderColor
      )}
    >
      <StatusIcon className="h-3.5 w-3.5" />
      {QUOTE_STATUS_LABELS[effectiveStatus]}
    </Badge>
  );
}

// ============================================
// View Mode Component
// ============================================

interface ViewModeProps {
  quote: Quote;
  theme: ReturnType<typeof useQuoteTheme>;
  onEdit: () => void;
  onSend?: () => void;
  onAccept?: () => void;
  onReject?: () => void;
  onDuplicate?: () => void;
  onReactivate?: () => void;
  onAssignClient?: () => void;
  onViewDetails: () => void;
  onClose: () => void;
  onCopyLink: () => void;
  isLoading: boolean;
  isReactivating: boolean;
}

function ViewMode({
  quote,
  theme,
  onEdit,
  onSend,
  onAccept,
  onReject,
  onDuplicate,
  onReactivate,
  onAssignClient,
  onViewDetails,
  onClose,
  onCopyLink,
  isLoading,
  isReactivating,
}: ViewModeProps) {
  const statusConfig = STATUS_CONFIG[quote.status];
  const StatusIcon = statusConfig.icon;
  const expiryInfo = getExpiryStatus(quote.expiryDate);
  const clientName = quote.customerName || quote.leadName;
  const clientType = quote.customerId ? 'customer' : quote.leadId ? 'lead' : null;
  const hasClient = !!clientName;

  // Determine if quote is effectively expired
  const isEffectivelyExpired = quote.status === 'expired' || expiryInfo.isExpired;

  // Action visibility based on status
  const canSend = !isEffectivelyExpired && (quote.status === 'draft' || quote.status === 'pending_review' || quote.status === 'revised');
  const canAcceptReject = quote.status === 'sent' || quote.status === 'viewed';
  const canEdit = quote.status === 'draft' || quote.status === 'pending_review';

  // Phone/email handlers
  const normalizedPhone = normalizePhone(quote.contactPhone);
  const sanitizedEmail = sanitizeEmail(quote.contactEmail);
  const hasPhone = normalizedPhone.length >= 10;
  const hasEmail = !!sanitizedEmail;

  const handleWhatsApp = () => {
    if (!hasPhone) return;
    const phoneDigits = normalizedPhone.replace(/^0+/, '');
    const message = encodeURIComponent(
      `Hola${quote.contactName ? ` ${quote.contactName}` : ''}, le comparto su cotización ${quote.quoteNumber} por ${formatCurrency(quote.total, quote.currency)}`
    );
    window.open(`https://wa.me/${phoneDigits}?text=${message}`, '_blank');
  };

  const handleCall = () => {
    if (!hasPhone) return;
    window.location.href = `tel:${normalizedPhone}`;
  };

  const handleEmail = () => {
    if (!hasEmail) return;
    const subject = encodeURIComponent(`Cotización ${quote.quoteNumber}`);
    const body = encodeURIComponent(
      `Estimado/a ${quote.contactName || 'cliente'},\n\nAdjunto encontrará la cotización ${quote.quoteNumber} por ${formatCurrency(quote.total, quote.currency)}.\n\nSaludos.`
    );
    window.location.href = `mailto:${sanitizedEmail}?subject=${subject}&body=${body}`;
  };

  return (
    <motion.div
      key="view"
      {...modeTransition}
      className="flex flex-col h-full"
    >
      {/* Header with Glassmorphism */}
      <div className="flex-shrink-0 p-4 border-b bg-card/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-foreground tracking-tight">
              {quote.quoteNumber}
            </h2>
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {quote.title || 'Sin descripción'}
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

        {/* Status Badge */}
        <div className="mt-3">
          <QuoteStatusBadge status={quote.status} isExpired={isEffectivelyExpired} />
        </div>
      </div>

      {/* Content - min-h-0 required for flex layout to properly constrain height */}
      <ScrollArea className="flex-1 min-h-0">
        <div className="p-4 space-y-4">
          {/* Value Card */}
          <ValueCard
            total={quote.total}
            currency={quote.currency}
            itemsCount={quote.items.length}
            status={isEffectivelyExpired ? 'expired' : quote.status}
          />

          {/* Quick Actions (Contact Buttons with labels) - Using dynamic theming */}
          <div className="grid grid-cols-3 gap-3">
            <ContactButton
              icon={MessageCircle}
              label="WhatsApp"
              onClick={handleWhatsApp}
              disabled={!hasPhone}
              actionType="whatsapp"
            />
            <ContactButton
              icon={Phone}
              label="Llamar"
              onClick={handleCall}
              disabled={!hasPhone}
              actionType="call"
            />
            <ContactButton
              icon={Mail}
              label="Email"
              onClick={handleEmail}
              disabled={!hasEmail}
              actionType="email"
            />
          </div>

          {/* Expiry Warning Banner - Orange */}
          {isEffectivelyExpired && (
            <div className={cn(
              'flex items-center gap-3 p-4 rounded-xl',
              'bg-orange-100/90 border border-orange-300',
              'dark:bg-orange-900/50 dark:border-orange-700'
            )}>
              <div className="flex-shrink-0 p-2 rounded-lg bg-orange-200/80 dark:bg-orange-800/60">
                <AlertCircle className="w-5 h-5 text-orange-700 dark:text-orange-200" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-orange-900 dark:text-orange-50">
                  Esta cotización ha expirado
                </p>
                <p className="text-xs text-orange-700 dark:text-orange-200 mt-0.5">
                  Venció {formatRelativeDate(quote.expiryDate)}
                </p>
              </div>
              {onReactivate && (
                <Button
                  size="sm"
                  onClick={onReactivate}
                  disabled={isReactivating}
                  className="flex-shrink-0 bg-orange-600 text-white hover:bg-orange-700 dark:bg-orange-500 dark:hover:bg-orange-600 text-xs"
                >
                  {isReactivating ? (
                    <Loader2 className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <RefreshCw className="w-3 h-3 mr-1" />
                  )}
                  Reactivar
                </Button>
              )}
            </div>
          )}

          {/* Expiring Soon Warning - Amber */}
          {!isEffectivelyExpired && expiryInfo.isExpiringSoon && (
            <div className={cn(
              'flex items-center gap-2 p-3 rounded-lg',
              'bg-amber-100/90 border border-amber-300',
              'dark:bg-amber-900/50 dark:border-amber-700'
            )}>
              <AlertTriangle className="h-4 w-4 text-amber-700 dark:text-amber-200 shrink-0" />
              <p className="text-xs font-medium text-amber-900 dark:text-amber-50">
                Vence en {expiryInfo.daysRemaining} {expiryInfo.daysRemaining === 1 ? 'día' : 'días'}
              </p>
            </div>
          )}

          {/* Date Cards */}
          <div className="grid grid-cols-2 gap-3">
            <DateCard
              icon={Calendar}
              label="Creación"
              date={quote.createdAt}
            />
            <DateCard
              icon={Clock}
              label="Vencimiento"
              date={quote.expiryDate}
              isExpired={isEffectivelyExpired}
            />
          </div>

          <Separator />

          {/* Client Info */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Cliente</h3>

            {hasClient ? (
              <div className={cn(
                'flex items-center gap-4 p-4 rounded-xl',
                'bg-muted/50 border border-border'
              )}>
                <div className={cn(
                  'w-12 h-12 rounded-full flex-shrink-0',
                  'bg-gradient-to-br from-muted to-muted/80',
                  'flex items-center justify-center'
                )}>
                  {clientType === 'customer' ? (
                    <Building2 className="w-5 h-5 text-muted-foreground" />
                  ) : (
                    <User className="w-5 h-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {clientName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {clientType === 'customer' ? 'Cliente' : 'Prospecto'}
                  </p>
                  {quote.contactEmail && (
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {quote.contactEmail}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              /* No Client - CTA to assign */
              <button
                onClick={onAssignClient || onEdit}
                className={cn(
                  'w-full flex items-center justify-center gap-3 p-4 rounded-xl',
                  'border-2 border-dashed border-border',
                  'text-muted-foreground hover:text-foreground',
                  'hover:border-primary/50 hover:bg-muted/50',
                  'transition-all duration-200'
                )}
              >
                <UserPlus className="w-5 h-5" />
                <span className="text-sm font-medium">Asignar cliente</span>
              </button>
            )}

            {/* Contact Info (if has contact but no client) */}
            {!hasClient && (quote.contactName || quote.contactEmail || quote.contactPhone) && (
              <div className="space-y-2 mt-2">
                {quote.contactName && (
                  <InfoRow icon={User} label="Contacto" value={quote.contactName} />
                )}
                {quote.contactEmail && (
                  <InfoRow
                    icon={Mail}
                    label="Email"
                    value={
                      <a href={`mailto:${quote.contactEmail}`} className="text-primary hover:underline">
                        {quote.contactEmail}
                      </a>
                    }
                  />
                )}
                {quote.contactPhone && (
                  <InfoRow
                    icon={Phone}
                    label="Teléfono"
                    value={
                      <a href={`tel:${quote.contactPhone}`} className="text-primary hover:underline">
                        {quote.contactPhone}
                      </a>
                    }
                  />
                )}
              </div>
            )}
          </div>

          {/* Line Items */}
          {quote.items.length > 0 && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Productos / Servicios
                </h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <div className="divide-y divide-border">
                    {quote.items.slice(0, 3).map((item) => (
                      <LineItemRow key={item.id} item={item} currency={quote.currency} />
                    ))}
                    {quote.items.length > 3 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground text-center bg-muted/50">
                        +{quote.items.length - 3} más
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="space-y-2 p-3 rounded-lg bg-muted/50 border border-border/50">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium tabular-nums text-foreground">{formatCurrency(quote.subtotal, quote.currency)}</span>
                </div>
                {quote.discountAmount > 0 && (
                  <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
                    <span>Descuento</span>
                    <span className="font-medium tabular-nums">-{formatCurrency(quote.discountAmount, quote.currency)}</span>
                  </div>
                )}
                {quote.taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Impuestos ({quote.taxRate || 16}%)</span>
                    <span className="font-medium tabular-nums text-foreground">{formatCurrency(quote.taxAmount, quote.currency)}</span>
                  </div>
                )}
                <Separator className="my-2" />
                <div className="flex justify-between text-base">
                  <span className="font-semibold text-foreground">Total</span>
                  <span
                    className="font-bold text-lg tabular-nums"
                    style={{ color: theme.primaryColor }}
                  >
                    {formatCurrency(quote.total, quote.currency)}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {(quote.notes || quote.terms) && (
            <>
              <Separator />
              <div className="space-y-3">
                {quote.notes && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Notas</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{quote.notes}</p>
                  </div>
                )}
                {quote.terms && (
                  <div>
                    <h3 className="text-sm font-semibold text-foreground mb-1">Términos y Condiciones</h3>
                    <p className="text-sm text-muted-foreground whitespace-pre-line line-clamp-4">{quote.terms}</p>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Activity Timeline - Using dynamic theming */}
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Historial
            </h3>
            <div className="space-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <div
                  className="w-1.5 h-1.5 rounded-full"
                  style={{ backgroundColor: theme.getTimelineDotColor('draft') }}
                />
                <span>Creada {formatRelativeDate(quote.createdAt)}</span>
              </div>
              {quote.sentAt && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: theme.getTimelineDotColor('sent') }}
                  />
                  <span>Enviada {formatRelativeDate(quote.sentAt)}</span>
                </div>
              )}
              {quote.viewedAt && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: theme.getTimelineDotColor('viewed') }}
                  />
                  <span>Vista {formatRelativeDate(quote.viewedAt)}</span>
                </div>
              )}
              {quote.acceptedAt && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: theme.getTimelineDotColor('accepted') }}
                  />
                  <span>Aceptada {formatRelativeDate(quote.acceptedAt)}</span>
                </div>
              )}
              {quote.rejectedAt && (
                <div className="flex items-center gap-2">
                  <div
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ backgroundColor: theme.getTimelineDotColor('rejected') }}
                  />
                  <span>Rechazada {formatRelativeDate(quote.rejectedAt)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          <Separator />
          <CommentSection
            entityType="quote"
            entityId={quote.id}
            allowReplies
            allowReactions
            allowMentions
            allowMarkdown
            title="Comentarios"
            placeholder="Agregar comentario a esta cotización..."
            emptyMessage="No hay comentarios. Agrega el primero."
            maxHeight="300px"
          />

          {/* Attachments Section */}
          <Separator />
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Paperclip className="h-4 w-4" />
              Documentos Adjuntos
            </h3>
            <AttachmentSection
              entityType="quote"
              entityId={quote.id}
              title=""
              description="Propuestas, contratos y documentos relacionados"
              category="proposal"
              accessLevel="team"
              view="list"
              showUploader
              showList
            />
          </div>
        </div>
      </ScrollArea>

      {/* Footer with Glassmorphism */}
      <div className={cn(
        'flex-shrink-0 pt-4 px-4 border-t bg-card/80 backdrop-blur-md space-y-3',
        // Mobile: account for bottom bar (64px) + safe area + padding
        'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px)+1rem)]',
        // Desktop: normal padding (no bottom bar)
        'sm:pb-4'
      )}>
        {/* Primary Action - Reactivate or Send */}
        {isEffectivelyExpired ? (
          onReactivate && (
            <Button
              className="w-full min-h-[44px] bg-orange-600 hover:bg-orange-700"
              onClick={onReactivate}
              disabled={isReactivating}
            >
              {isReactivating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Reactivando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Reactivar Cotización
                </>
              )}
            </Button>
          )
        ) : (
          <>
            {/* Accept/Reject Actions - Using dynamic theming */}
            {canAcceptReject && (onAccept || onReject) && (
              <div className="flex gap-2">
                {onAccept && (
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                    style={{
                      backgroundColor: theme.actions.accept.bg,
                      borderColor: theme.actions.accept.border,
                      color: theme.actions.accept.text,
                    }}
                    onClick={onAccept}
                    disabled={isLoading}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Aceptar
                  </Button>
                )}
                {onReject && (
                  <Button
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                    style={{
                      backgroundColor: theme.actions.reject.bg,
                      borderColor: theme.actions.reject.border,
                      color: theme.actions.reject.text,
                    }}
                    onClick={onReject}
                    disabled={isLoading}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Rechazar
                  </Button>
                )}
              </div>
            )}

            {/* Send Action */}
            {canSend && onSend && (
              <Button
                className="w-full min-h-[44px]"
                onClick={onSend}
                disabled={isLoading}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar Cotización
              </Button>
            )}
          </>
        )}

        {/* Secondary Actions */}
        <div className="flex gap-2">
          {canEdit && (
            <Button variant="outline" className="flex-1 min-h-[44px]" onClick={onEdit}>
              <Edit3 className="mr-2 h-4 w-4" />
              Editar
            </Button>
          )}
          <Button className="flex-1 min-h-[44px]" variant="outline" onClick={onViewDetails}>
            Ver Detalles
            <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        </div>

        {/* Tertiary Actions with Labels */}
        <div className="flex items-center justify-center gap-2 pt-3 border-t border-border">
          <button
            onClick={onCopyLink}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg',
              'text-sm text-muted-foreground',
              'hover:bg-muted hover:text-foreground transition-colors'
            )}
          >
            <Copy className="w-4 h-4" />
            Copiar enlace
          </button>

          <div className="w-px h-5 bg-border" />

          {/* PDF Actions with Template Selection */}
          <QuotePdfActions quote={quote} variant="compact" />
        </div>
      </div>
    </motion.div>
  );
}

// ============================================
// Edit Mode Component
// ============================================

interface EditModeProps {
  quote: Quote;
  onCancel: () => void;
  onSuccess: (quote: Quote) => void;
}

function EditMode({ quote, onCancel, onSuccess }: EditModeProps) {
  const { toast } = useToast();
  const updateMutation = useUpdateQuote();

  const form = useForm<QuoteFormData>({
    resolver: zodResolver(quoteFormSchema),
    defaultValues: {
      title: quote.title || '',
      description: quote.description || '',
      contactName: quote.contactName || '',
      contactEmail: quote.contactEmail || '',
      contactPhone: quote.contactPhone || '',
      expiryDate: quote.expiryDate?.split('T')[0] || '',
      discountType: quote.discountType || 'percentage',
      discountValue: quote.discountValue || 0,
      taxRate: quote.taxRate || 16,
      notes: quote.notes || '',
      terms: quote.terms || '',
    },
  });

  const { control, handleSubmit, watch, formState: { isSubmitting, isDirty } } = form;
  const currentTaxRate = watch('taxRate') || 16;

  const onSubmit = async (data: QuoteFormData) => {
    try {
      const updateData: UpdateQuoteRequest = {
        title: data.title,
        description: data.description || undefined,
        contactEmail: data.contactEmail || undefined,
        expiryDate: data.expiryDate || undefined,
        discountType: data.discountType || undefined,
        discountValue: data.discountValue || undefined,
        taxRate: data.taxRate || undefined,
        notes: data.notes || undefined,
        terms: data.terms || undefined,
      };

      const result = await updateMutation.mutateAsync({
        quoteId: quote.id,
        data: updateData,
      });

      toast({
        title: 'Cotización actualizada',
        description: 'Los cambios se guardaron correctamente.',
      });

      onSuccess(result);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la cotización.',
        variant: 'destructive',
      });
    }
  };

  return (
    <motion.div
      key="edit"
      {...modeTransition}
      className="flex flex-col h-full"
    >
      {/* Header with Glassmorphism */}
      <div className="flex-shrink-0 p-4 border-b bg-card/80 backdrop-blur-md">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Editar Cotización</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-full"
            onClick={onCancel}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{quote.quoteNumber}</p>
      </div>

      {/* Form - min-h-0 required for flex layout to properly constrain height */}
      <ScrollArea className="flex-1 min-h-0">
        <form id="quote-form" onSubmit={handleSubmit(onSubmit)} className="p-4 space-y-4">
          {/* Title */}
          <div className="form-field">
            <Label htmlFor="title" variant="premium" required>Título de la Cotización</Label>
            <Controller
              name="title"
              control={control}
              render={({ field, fieldState }) => (
                <>
                  <Input
                    {...field}
                    id="title"
                    variant="glass"
                    placeholder="Ej: Propuesta servicios web"
                    error={!!fieldState.error}
                    animateOnFocus
                  />
                  {fieldState.error && (
                    <p className="form-error">
                      <AlertCircle className="h-3 w-3" />
                      {fieldState.error.message}
                    </p>
                  )}
                </>
              )}
            />
          </div>

          {/* Description */}
          <div className="form-field">
            <Label htmlFor="description" variant="premium">Descripción</Label>
            <Controller
              name="description"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="description"
                  variant="glass"
                  placeholder="Descripción detallada de la cotización..."
                  rows={3}
                />
              )}
            />
          </div>

          <Separator />

          {/* Contact Info */}
          <h3 className="form-section-title">
            <User className="h-4 w-4" />
            Información de Contacto
          </h3>

          <div className="form-field">
            <Label htmlFor="contactName" variant="premium">Nombre del Contacto</Label>
            <Controller
              name="contactName"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="contactName"
                  variant="glass"
                  placeholder="Nombre completo"
                  animateOnFocus
                />
              )}
            />
          </div>

          <div className="form-grid-2">
            <div className="form-field">
              <Label htmlFor="contactEmail" variant="premium">Email</Label>
              <Controller
                name="contactEmail"
                control={control}
                render={({ field, fieldState }) => (
                  <>
                    <Input
                      {...field}
                      id="contactEmail"
                      type="email"
                      variant="glass"
                      placeholder="email@ejemplo.com"
                      error={!!fieldState.error}
                      animateOnFocus
                    />
                    {fieldState.error && (
                      <p className="form-error">{fieldState.error.message}</p>
                    )}
                  </>
                )}
              />
            </div>

            <div className="form-field">
              <Label htmlFor="contactPhone" variant="premium">Teléfono</Label>
              <Controller
                name="contactPhone"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="contactPhone"
                    type="tel"
                    variant="glass"
                    placeholder="+52 55 1234 5678"
                    animateOnFocus
                  />
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Dates & Financial */}
          <h3 className="form-section-title">
            <Calendar className="h-4 w-4" />
            Fechas y Finanzas
          </h3>

          <div className="form-field">
            <Label htmlFor="expiryDate" variant="premium">Fecha de Vencimiento</Label>
            <Controller
              name="expiryDate"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="expiryDate"
                  type="date"
                  variant="glass"
                  animateOnFocus
                />
              )}
            />
          </div>

          {/* Tax Rate Slider */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Tasa de Impuesto
              </Label>
              <span className="text-sm font-semibold text-primary">{currentTaxRate}%</span>
            </div>
            <Controller
              name="taxRate"
              control={control}
              render={({ field }) => (
                <Slider
                  value={[field.value || 16]}
                  onValueChange={(v) => field.onChange(v[0])}
                  min={0}
                  max={25}
                  step={1}
                  className="w-full"
                />
              )}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>0%</span>
              <span>8%</span>
              <span>16%</span>
              <span>25%</span>
            </div>
          </div>

          {/* Discount */}
          <div className="form-grid-2">
            <div className="form-field">
              <Label variant="premium">Tipo de Descuento</Label>
              <Controller
                name="discountType"
                control={control}
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="h-12 sm:h-11 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white hover:border-slate-300 dark:hover:border-slate-500 focus:ring-2 focus:ring-primary/20 transition-all duration-200">
                      <SelectValue placeholder="Tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">Porcentaje (%)</SelectItem>
                      <SelectItem value="fixed">Monto Fijo ($)</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="form-field">
              <Label htmlFor="discountValue" variant="premium">Valor del Descuento</Label>
              <Controller
                name="discountValue"
                control={control}
                render={({ field }) => (
                  <Input
                    {...field}
                    id="discountValue"
                    type="number"
                    variant="glass"
                    min={0}
                    placeholder="0"
                    animateOnFocus
                    onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                  />
                )}
              />
            </div>
          </div>

          <Separator />

          {/* Notes & Terms */}
          <h3 className="form-section-title">
            <FileText className="h-4 w-4" />
            Notas y Términos
          </h3>

          <div className="form-field">
            <Label htmlFor="notes" variant="premium">Notas para el Cliente</Label>
            <Controller
              name="notes"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="notes"
                  variant="glass"
                  placeholder="Notas adicionales visibles para el cliente..."
                  rows={3}
                />
              )}
            />
          </div>

          <div className="form-field">
            <Label htmlFor="terms" variant="premium">Términos y Condiciones</Label>
            <Controller
              name="terms"
              control={control}
              render={({ field }) => (
                <Textarea
                  {...field}
                  id="terms"
                  variant="glass"
                  placeholder="Términos y condiciones de la cotización..."
                  rows={4}
                />
              )}
            />
          </div>

          <Separator />

          {/* Attachments Section */}
          <h3 className="form-section-title">
            <Paperclip className="h-4 w-4" />
            Documentos Adjuntos
          </h3>

          <AttachmentSection
            entityType="quote"
            entityId={quote.id}
            title=""
            description="Adjunta propuestas, contratos o documentos relevantes"
            category="proposal"
            accessLevel="team"
            view="compact"
            compact
          />
        </form>
      </ScrollArea>

      {/* Footer with Glassmorphism */}
      <div className={cn(
        'flex-shrink-0 pt-4 px-4 border-t bg-card/80 backdrop-blur-md',
        // Mobile: account for bottom bar (64px) + safe area + padding
        'pb-[calc(var(--bottom-bar-height,64px)+env(safe-area-inset-bottom,0px)+1rem)]',
        // Desktop: normal padding (no bottom bar)
        'sm:pb-4'
      )}>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1 min-h-[44px]"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            form="quote-form"
            className="flex-1 min-h-[44px]"
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

export function QuoteDetailSheet({
  quote,
  open,
  onClose,
  onSuccess,
  onDelete,
  onSend,
  onAccept,
  onReject,
  onDuplicate,
  onDownloadPdf,
  onReactivate,
  onAssignClient,
  defaultMode = 'view',
  isLoading = false,
}: QuoteDetailSheetProps) {
  const router = useRouter();
  const { toast } = useToast();
  const isMobile = useMediaQuery('(max-width: 639px)');
  const [mode, setMode] = React.useState<DetailMode>(defaultMode);
  const [isReactivating, setIsReactivating] = React.useState(false);
  const theme = useQuoteTheme();

  // Reset mode when quote changes
  React.useEffect(() => {
    setMode(defaultMode);
  }, [quote?.id, defaultMode]);

  // Copy link functionality
  const handleCopyLink = React.useCallback(async () => {
    if (!quote) return;

    try {
      const publicUrl = quote.publicUrl || `${window.location.origin}/q/${quote.publicToken || quote.id}`;
      await navigator.clipboard.writeText(publicUrl);
      toast({
        title: 'Enlace copiado',
        description: 'El enlace de la cotización se copió al portapapeles',
      });
    } catch (error) {
      toast({
        title: 'Error al copiar',
        description: 'No se pudo copiar el enlace',
        variant: 'destructive',
      });
    }
  }, [quote, toast]);

  // Reactivate functionality
  const handleReactivate = React.useCallback(async () => {
    if (!quote || !onReactivate) return;

    setIsReactivating(true);
    try {
      await onReactivate(quote);
      toast({
        title: 'Cotización reactivada',
        description: 'Se extendió la fecha de vencimiento por 30 días',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo reactivar la cotización',
        variant: 'destructive',
      });
    } finally {
      setIsReactivating(false);
    }
  }, [quote, onReactivate, toast]);

  const handleViewDetails = () => {
    if (quote) {
      router.push(`/app/quotes/${quote.id}`);
    }
  };

  const handleEditSuccess = (updatedQuote: Quote) => {
    setMode('view');
    onSuccess?.(updatedQuote);
  };

  const handleAction = React.useCallback(
    (action?: (quote: Quote) => void) => {
      if (quote && action && !isLoading) {
        action(quote);
      }
    },
    [quote, isLoading]
  );

  if (!quote) return null;

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        className={cn(
          'p-0 flex flex-col',
          isMobile
            ? 'h-[92vh] rounded-t-2xl'
            : 'w-full sm:w-[440px] md:w-[500px] sm:max-w-[500px]'
        )}
        accessibleTitle={`Detalle de cotización ${quote.quoteNumber}`}
        hideCloseButton
      >
        <TooltipProvider>
          <AnimatePresence mode="wait">
            {mode === 'view' ? (
              <ViewMode
                key="view-mode"
                quote={quote}
                theme={theme}
                onEdit={() => setMode('edit')}
                onSend={onSend ? () => handleAction(onSend) : undefined}
                onAccept={onAccept ? () => handleAction(onAccept) : undefined}
                onReject={onReject ? () => handleAction(onReject) : undefined}
                onDuplicate={onDuplicate ? () => handleAction(onDuplicate) : undefined}
                onReactivate={onReactivate ? handleReactivate : undefined}
                onAssignClient={onAssignClient ? () => handleAction(onAssignClient) : undefined}
                onViewDetails={handleViewDetails}
                onClose={onClose}
                onCopyLink={handleCopyLink}
                isLoading={isLoading}
                isReactivating={isReactivating}
              />
            ) : (
              <EditMode
                key="edit-mode"
                quote={quote}
                onCancel={() => setMode('view')}
                onSuccess={handleEditSuccess}
              />
            )}
          </AnimatePresence>
        </TooltipProvider>
      </SheetContent>
    </Sheet>
  );
}

export default QuoteDetailSheet;

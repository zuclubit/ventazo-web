'use client';

/**
 * QuoteCreateSheet - Quote Creation/Edit Modal (v3.0 - Modular Components)
 *
 * Premium sheet component for creating and editing quotes.
 * Uses modular sheet components from Ventazo Design System 2025.
 *
 * Features:
 * - Full form with validation
 * - Line items editor with calculations
 * - Lead/Customer selector
 * - Real-time total preview
 * - Mobile-responsive design with bottom bar awareness
 * - Glassmorphism styling
 * - 44px touch targets
 * - Accessible with proper ARIA labels
 * - Full dark/light theme support
 * - Dynamic tenant color system preserved
 *
 * v3.0 Changes:
 * - Refactored to use modular SheetSection, SheetFooter, TotalsSummary
 * - Consistent with kanban module modal patterns
 * - Reusable components from @/components/sheets
 *
 * v2.1 Changes:
 * - Theme-aware typography (text-foreground, text-muted-foreground)
 * - All monetary values use explicit foreground colors
 * - Client selector names support dark mode
 *
 * @version 3.0.0
 * @module quotes/components/QuoteCreateSheet
 */

import * as React from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, addDays } from 'date-fns';
import { es } from 'date-fns/locale';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Building2,
  User,
  FileText,
  DollarSign,
  Percent,
  Send,
  Save,
  X,
  Loader2,
  AlertCircle,
  CheckCircle,
  Search,
  ChevronDown,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
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
import {
  Sheet,
  SheetContent,
  SheetHeader as BaseSheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

// Modular Sheet Components
import {
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetSection,
  TotalsSummary,
} from '@/components/sheets';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { useLeads } from '@/lib/leads/hooks';
import { useCustomers } from '@/lib/customers/hooks';
import { useQuoteMutations } from '@/lib/quotes/hooks';
import type {
  Quote,
  CreateQuoteRequest,
  DiscountType,
} from '@/lib/quotes/types';
import { useToast } from '@/hooks/use-toast';

import { LineItemsEditorV2 as LineItemsEditor, type LineItem } from './LineItemsEditorV2';
import { AttachmentSection } from '@/components/ui/attachment-section';

// ============================================
// Validation Schema
// ============================================

const lineItemSchema = z.object({
  id: z.string(),
  type: z.enum(['product', 'service', 'subscription', 'discount', 'fee']),
  productId: z.string().optional(),
  name: z.string().min(1, 'El nombre es requerido'),
  description: z.string().optional(),
  quantity: z.number().min(1, 'La cantidad debe ser al menos 1'),
  unitPrice: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100).optional(),
  order: z.number().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const createQuoteSchema = z.object({
  title: z.string().min(3, 'El titulo debe tener al menos 3 caracteres'),
  description: z.string().optional(),
  clientType: z.enum(['lead', 'customer', 'none']),
  leadId: z.string().optional(),
  customerId: z.string().optional(),
  contactEmail: z.string().email('Email invalido').optional().or(z.literal('')),
  expiryDate: z.date({ required_error: 'La fecha de vencimiento es requerida' }),
  currency: z.enum(['MXN', 'USD', 'COP', 'EUR']),
  discountType: z.enum(['percentage', 'fixed']).optional(),
  discountValue: z.number().min(0).optional(),
  taxRate: z.number().min(0).max(100),
  terms: z.string().optional(),
  notes: z.string().optional(),
  internalNotes: z.string().optional(),
  items: z.array(lineItemSchema).min(1, 'Debe agregar al menos un producto o servicio'),
});

type CreateQuoteFormData = z.infer<typeof createQuoteSchema>;

// ============================================
// Types
// ============================================

export interface QuoteCreateSheetProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (quote: Quote) => void;
  defaultValues?: Partial<CreateQuoteFormData>;
  editQuote?: Quote; // For edit mode
}

// ============================================
// Helper Components
// ============================================

interface ClientSelectorProps {
  clientType: 'lead' | 'customer' | 'none';
  leadId?: string;
  customerId?: string;
  onClientTypeChange: (type: 'lead' | 'customer' | 'none') => void;
  onLeadChange: (id: string | undefined) => void;
  onCustomerChange: (id: string | undefined) => void;
  disabled?: boolean;
}

function ClientSelector({
  clientType,
  leadId,
  customerId,
  onClientTypeChange,
  onLeadChange,
  onCustomerChange,
  disabled,
}: ClientSelectorProps) {
  const [leadSearch, setLeadSearch] = React.useState('');
  const [customerSearch, setCustomerSearch] = React.useState('');
  const [openLead, setOpenLead] = React.useState(false);
  const [openCustomer, setOpenCustomer] = React.useState(false);

  const { data: leadsData } = useLeads({ searchTerm: leadSearch, limit: 10 });
  const { data: customersData } = useCustomers({ searchTerm: customerSearch, limit: 10 });

  const leads = leadsData?.data || [];
  const customers = customersData?.data || [];

  const selectedLead = leads.find((l) => l.id === leadId);
  const selectedCustomer = customers.find((c) => c.id === customerId);

  return (
    <div className="space-y-4">
      {/* Client Type Toggle */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant={clientType === 'lead' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            onClientTypeChange('lead');
            onCustomerChange(undefined);
          }}
          disabled={disabled}
          className="flex-1 gap-2"
        >
          <User className="h-4 w-4" />
          Prospecto
        </Button>
        <Button
          type="button"
          variant={clientType === 'customer' ? 'default' : 'outline'}
          size="sm"
          onClick={() => {
            onClientTypeChange('customer');
            onLeadChange(undefined);
          }}
          disabled={disabled}
          className="flex-1 gap-2"
        >
          <Building2 className="h-4 w-4" />
          Cliente
        </Button>
        <Button
          type="button"
          variant={clientType === 'none' ? 'secondary' : 'outline'}
          size="sm"
          onClick={() => {
            onClientTypeChange('none');
            onLeadChange(undefined);
            onCustomerChange(undefined);
          }}
          disabled={disabled}
          className="gap-2"
        >
          Sin asignar
        </Button>
      </div>

      {/* Lead Selector */}
      {clientType === 'lead' && (
        <Popover open={openLead} onOpenChange={setOpenLead}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={openLead}
              className="w-full justify-between h-11"
              disabled={disabled}
            >
              {selectedLead ? (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                    <User className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <span className="truncate">{selectedLead.companyName || selectedLead.fullName}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Seleccionar prospecto...</span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar prospecto..."
                value={leadSearch}
                onValueChange={setLeadSearch}
              />
              <CommandList>
                <CommandEmpty>No se encontraron prospectos</CommandEmpty>
                <CommandGroup>
                  {leads.map((lead) => (
                    <CommandItem
                      key={lead.id}
                      value={lead.id}
                      onSelect={() => {
                        onLeadChange(lead.id);
                        setOpenLead(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="h-8 w-8 rounded-md bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center">
                          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {lead.companyName || lead.fullName || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {lead.email || 'Sin email'}
                          </p>
                        </div>
                      </div>
                      {leadId === lead.id && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}

      {/* Customer Selector */}
      {clientType === 'customer' && (
        <Popover open={openCustomer} onOpenChange={setOpenCustomer}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              role="combobox"
              aria-expanded={openCustomer}
              className="w-full justify-between h-11"
              disabled={disabled}
            >
              {selectedCustomer ? (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-md bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                    <Building2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <span className="truncate">{selectedCustomer.companyName}</span>
                </div>
              ) : (
                <span className="text-muted-foreground">Seleccionar cliente...</span>
              )}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[400px] p-0" align="start">
            <Command>
              <CommandInput
                placeholder="Buscar cliente..."
                value={customerSearch}
                onValueChange={setCustomerSearch}
              />
              <CommandList>
                <CommandEmpty>No se encontraron clientes</CommandEmpty>
                <CommandGroup>
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      value={customer.id}
                      onSelect={() => {
                        onCustomerChange(customer.id);
                        setOpenCustomer(false);
                      }}
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <div className="h-8 w-8 rounded-md bg-emerald-100 dark:bg-emerald-900/50 flex items-center justify-center">
                          <Building2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {customer.companyName || 'Sin nombre'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {customer.email || 'Sin email'}
                          </p>
                        </div>
                      </div>
                      {customerId === customer.id && (
                        <CheckCircle className="h-4 w-4 text-primary" />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}

// ============================================
// Utility Functions
// ============================================

function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function calculateTotals(
  items: LineItem[],
  globalDiscountType?: DiscountType,
  globalDiscountValue?: number,
  taxRate?: number
) {
  // Calculate items subtotal
  let subtotal = 0;
  let itemsTaxTotal = 0;

  for (const item of items) {
    const itemSubtotal = item.quantity * item.unitPrice;
    let itemDiscount = 0;

    if (item.discountValue && item.discountValue > 0) {
      itemDiscount = item.discountType === 'percentage'
        ? itemSubtotal * (item.discountValue / 100)
        : item.discountValue;
    }

    const afterItemDiscount = itemSubtotal - itemDiscount;
    const itemTax = item.taxRate
      ? afterItemDiscount * (item.taxRate / 100)
      : 0;

    subtotal += afterItemDiscount;
    itemsTaxTotal += itemTax;
  }

  // Apply global discount
  let globalDiscount = 0;
  if (globalDiscountValue && globalDiscountValue > 0) {
    globalDiscount = globalDiscountType === 'percentage'
      ? subtotal * (globalDiscountValue / 100)
      : globalDiscountValue;
  }

  const afterGlobalDiscount = subtotal - globalDiscount;

  // Apply global tax if no item-level tax
  const globalTax = taxRate && itemsTaxTotal === 0
    ? afterGlobalDiscount * (taxRate / 100)
    : 0;

  const totalTax = itemsTaxTotal + globalTax;
  const total = afterGlobalDiscount + totalTax;

  return {
    subtotal,
    globalDiscount,
    itemsTaxTotal,
    globalTax,
    totalTax,
    total,
  };
}

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================
// Main Component
// ============================================

export function QuoteCreateSheet({
  open,
  onClose,
  onSuccess,
  defaultValues,
  editQuote,
}: QuoteCreateSheetProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const { toast } = useToast();
  const mutations = useQuoteMutations();

  const isEdit = !!editQuote;

  // Default form values
  const defaultFormValues: CreateQuoteFormData = React.useMemo(() => ({
    title: editQuote?.title || defaultValues?.title || '',
    description: editQuote?.description || defaultValues?.description || '',
    clientType: editQuote?.customerId ? 'customer' : editQuote?.leadId ? 'lead' : 'none',
    leadId: editQuote?.leadId || defaultValues?.leadId,
    customerId: editQuote?.customerId || defaultValues?.customerId,
    contactEmail: editQuote?.contactEmail || defaultValues?.contactEmail || '',
    expiryDate: editQuote?.expiryDate
      ? new Date(editQuote.expiryDate)
      : defaultValues?.expiryDate || addDays(new Date(), 30),
    currency: (editQuote?.currency as 'MXN' | 'USD' | 'COP' | 'EUR') || defaultValues?.currency || 'MXN',
    discountType: editQuote?.discountType || defaultValues?.discountType || 'percentage',
    discountValue: editQuote?.discountValue || defaultValues?.discountValue || 0,
    taxRate: editQuote?.taxRate || defaultValues?.taxRate || 16,
    terms: editQuote?.terms || defaultValues?.terms || '',
    notes: editQuote?.notes || defaultValues?.notes || '',
    internalNotes: editQuote?.internalNotes || defaultValues?.internalNotes || '',
    items: editQuote?.items?.map((item) => ({
      ...item,
      id: item.id || generateId(),
    })) || defaultValues?.items || [
      {
        id: generateId(),
        type: 'service' as const,
        name: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        discountType: 'percentage' as const,
        discountValue: 0,
        taxRate: 16,
        order: 0,
      },
    ],
  }), [editQuote, defaultValues]);

  // Form setup
  const form = useForm<CreateQuoteFormData>({
    resolver: zodResolver(createQuoteSchema),
    defaultValues: defaultFormValues,
    mode: 'onChange',
  });

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = form;

  // Watch form values for calculations
  const watchedItems = watch('items') as LineItem[];
  const watchedCurrency = watch('currency');
  const watchedDiscountType = watch('discountType');
  const watchedDiscountValue = watch('discountValue');
  const watchedTaxRate = watch('taxRate');
  const watchedClientType = watch('clientType');
  const watchedLeadId = watch('leadId');
  const watchedCustomerId = watch('customerId');

  // Calculate totals
  const totals = React.useMemo(() => {
    return calculateTotals(
      watchedItems,
      watchedDiscountType,
      watchedDiscountValue,
      watchedTaxRate
    );
  }, [watchedItems, watchedDiscountType, watchedDiscountValue, watchedTaxRate]);

  // Reset form when opening/closing
  React.useEffect(() => {
    if (open) {
      reset(defaultFormValues);
    }
  }, [open, reset, defaultFormValues]);

  // Form submission
  const onSubmit = async (data: CreateQuoteFormData) => {
    try {
      // Transform form data to API format
      const requestData: CreateQuoteRequest = {
        title: data.title,
        description: data.description,
        leadId: data.clientType === 'lead' ? data.leadId : undefined,
        customerId: data.clientType === 'customer' ? data.customerId : undefined,
        contactEmail: data.contactEmail || undefined,
        expiryDate: data.expiryDate.toISOString(),
        currency: data.currency,
        discountType: data.discountType,
        discountValue: data.discountValue,
        taxRate: data.taxRate,
        terms: data.terms,
        notes: data.notes,
        internalNotes: data.internalNotes,
        items: data.items.map((item, index) => ({
          type: item.type,
          productId: item.productId,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
          taxRate: item.taxRate,
          order: index,
          metadata: item.metadata,
        })),
      };

      let result: Quote;

      if (isEdit && editQuote) {
        result = await mutations.update({
          quoteId: editQuote.id,
          data: requestData,
        });
        toast({
          title: 'Cotizacion actualizada',
          description: `La cotizacion ${result.quoteNumber} ha sido actualizada exitosamente.`,
        });
      } else {
        result = await mutations.create(requestData);
        toast({
          title: 'Cotizacion creada',
          description: `La cotizacion ${result.quoteNumber} ha sido creada exitosamente.`,
        });
      }

      onSuccess?.(result);
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error
          ? error.message
          : `Error al ${isEdit ? 'actualizar' : 'crear'} la cotizacion`,
        variant: 'destructive',
      });
    }
  };

  const handleSaveAndSend = async () => {
    // Validate form first
    const isValid = await form.trigger();
    if (!isValid) return;

    const data = form.getValues();

    try {
      // Create the quote first
      const requestData: CreateQuoteRequest = {
        title: data.title,
        description: data.description,
        leadId: data.clientType === 'lead' ? data.leadId : undefined,
        customerId: data.clientType === 'customer' ? data.customerId : undefined,
        contactEmail: data.contactEmail || undefined,
        expiryDate: data.expiryDate.toISOString(),
        currency: data.currency,
        discountType: data.discountType,
        discountValue: data.discountValue,
        taxRate: data.taxRate,
        terms: data.terms,
        notes: data.notes,
        internalNotes: data.internalNotes,
        items: data.items.map((item, index) => ({
          type: item.type,
          productId: item.productId,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountType: item.discountType,
          discountValue: item.discountValue,
          taxRate: item.taxRate,
          order: index,
          metadata: item.metadata,
        })),
      };

      const createdQuote = await mutations.create(requestData);

      // Then send it
      await mutations.send({
        quoteId: createdQuote.id,
        data: {
          email: data.contactEmail,
        },
      });

      toast({
        title: 'Cotizacion enviada',
        description: `La cotizacion ${createdQuote.quoteNumber} ha sido creada y enviada.`,
      });

      onSuccess?.(createdQuote);
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al crear y enviar la cotizacion',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent
        side={isMobile ? 'bottom' : 'right'}
        hideCloseButton
        accessibleTitle={isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
        className={cn(
          'flex flex-col p-0',
          // Ventazo glassmorphism v2.0
          'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md',
          'border-l border-slate-200/60 dark:border-slate-700/60',
          isMobile ? 'h-[95vh] rounded-t-2xl' : 'w-full max-w-2xl'
        )}
      >
        {/* Header - Using Modular SheetHeader v3.0 */}
        <SheetHeader
          title={isEdit ? 'Editar Cotización' : 'Nueva Cotización'}
          description={
            isEdit
              ? 'Modifica los detalles de la cotización'
              : 'Crea una propuesta comercial para tu cliente'
          }
          icon={FileText}
          onClose={onClose}
        />

        {/* Form Content - Using SheetBody for proper responsive scrolling */}
        <SheetBody asForm onSubmit={handleSubmit(onSubmit)}>
            {/* Basic Info */}
            <SheetSection title="Informacion General" icon={FileText}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">
                    Titulo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="title"
                    placeholder="Ej: Propuesta de desarrollo web"
                    {...register('title')}
                    className={cn(errors.title && 'border-red-500')}
                  />
                  {errors.title && (
                    <p className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      {errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Descripcion</Label>
                  <Textarea
                    id="description"
                    placeholder="Descripcion breve de la cotizacion..."
                    rows={2}
                    {...register('description')}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Moneda</Label>
                    <Controller
                      name="currency"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="MXN">MXN - Peso Mexicano</SelectItem>
                            <SelectItem value="USD">USD - Dolar</SelectItem>
                            <SelectItem value="COP">COP - Peso Colombiano</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>
                      Fecha de Vencimiento <span className="text-red-500">*</span>
                    </Label>
                    <Controller
                      name="expiryDate"
                      control={control}
                      render={({ field }) => (
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              type="button"
                              variant="outline"
                              className={cn(
                                'w-full justify-start text-left font-normal',
                                !field.value && 'text-muted-foreground',
                                errors.expiryDate && 'border-red-500'
                              )}
                            >
                              <Calendar className="mr-2 h-4 w-4" />
                              {field.value ? (
                                format(field.value, 'PPP', { locale: es })
                              ) : (
                                <span>Seleccionar fecha</span>
                              )}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0" align="start">
                            <CalendarComponent
                              mode="single"
                              selected={field.value}
                              onSelect={field.onChange}
                              disabled={(date) => date < new Date()}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      )}
                    />
                    {errors.expiryDate && (
                      <p className="text-xs text-red-500 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        {errors.expiryDate.message}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </SheetSection>

            <Separator />

            {/* Client */}
            <SheetSection title="Cliente" icon={Building2}>
              <ClientSelector
                clientType={watchedClientType}
                leadId={watchedLeadId}
                customerId={watchedCustomerId}
                onClientTypeChange={(type) => setValue('clientType', type, { shouldDirty: true })}
                onLeadChange={(id) => setValue('leadId', id, { shouldDirty: true })}
                onCustomerChange={(id) => setValue('customerId', id, { shouldDirty: true })}
              />

              <div className="space-y-2">
                <Label htmlFor="contactEmail">Email de Contacto</Label>
                <Input
                  id="contactEmail"
                  type="email"
                  placeholder="cliente@ejemplo.com"
                  {...register('contactEmail')}
                  className={cn(errors.contactEmail && 'border-red-500')}
                />
                {errors.contactEmail && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    {errors.contactEmail.message}
                  </p>
                )}
              </div>
            </SheetSection>

            <Separator />

            {/* Line Items */}
            <SheetSection title="Productos / Servicios" icon={DollarSign}>
              <Controller
                name="items"
                control={control}
                render={({ field }) => (
                  <LineItemsEditor
                    items={field.value as LineItem[]}
                    onChange={field.onChange}
                    currency={watchedCurrency}
                    taxRate={watchedTaxRate}
                    errors={
                      errors.items
                        ? Object.fromEntries(
                            Object.entries(errors.items).map(([key, value]) => [
                              `items.${key}`,
                              typeof value === 'object' && value !== null && 'message' in value
                                ? (value as { message?: string }).message || ''
                                : '',
                            ])
                          )
                        : {}
                    }
                  />
                )}
              />
              {errors.items?.message && (
                <p className="text-xs text-red-500 flex items-center gap-1 mt-2">
                  <AlertCircle className="h-3 w-3" />
                  {errors.items.message}
                </p>
              )}
            </SheetSection>

            <Separator />

            {/* Global Discount & Tax */}
            <SheetSection title="Descuentos e Impuestos" icon={Percent}>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Descuento Global</Label>
                  <div className="flex gap-2">
                    <Controller
                      name="discountType"
                      control={control}
                      render={({ field }) => (
                        <Select value={field.value || 'percentage'} onValueChange={field.onChange}>
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">Fijo</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <div className="relative flex-1">
                      {watchedDiscountType === 'percentage' ? (
                        <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      ) : (
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      )}
                      <Input
                        type="number"
                        min={0}
                        max={watchedDiscountType === 'percentage' ? 100 : undefined}
                        step={0.01}
                        {...register('discountValue', { valueAsNumber: true })}
                        className={cn(
                          watchedDiscountType === 'percentage' ? 'pr-10' : 'pl-10'
                        )}
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>IVA (%)</Label>
                  <div className="relative">
                    <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      {...register('taxRate', { valueAsNumber: true })}
                      className="pr-10"
                    />
                  </div>
                </div>
              </div>
            </SheetSection>

            <Separator />

            {/* Notes */}
            <SheetSection title="Notas y Terminos" icon={FileText}>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="terms">Terminos y Condiciones</Label>
                  <Textarea
                    id="terms"
                    placeholder="Terminos y condiciones de la cotizacion..."
                    rows={3}
                    {...register('terms')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notas para el Cliente</Label>
                  <Textarea
                    id="notes"
                    placeholder="Notas adicionales visibles para el cliente..."
                    rows={2}
                    {...register('notes')}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="internalNotes">Notas Internas</Label>
                  <Textarea
                    id="internalNotes"
                    placeholder="Notas internas (no visibles para el cliente)..."
                    rows={2}
                    {...register('internalNotes')}
                  />
                  <p className="text-xs text-muted-foreground">
                    Estas notas solo son visibles para tu equipo
                  </p>
                </div>
              </div>
            </SheetSection>

            {/* Attachments - Only show if editing (quote already has ID) */}
            {isEdit && editQuote?.id && (
              <>
                <Separator />
                <AttachmentSection
                  entityType="quote"
                  entityId={editQuote.id}
                  title="Documentos Adjuntos"
                  description="Adjunta propuestas, contratos o cualquier documento relevante"
                  category="proposal"
                  accessLevel="team"
                  view="compact"
                />
              </>
            )}
        </SheetBody>

        {/* Footer - Compact mode for better fit */}
        <SheetFooter
          compact
          cancelAction={{
            key: 'cancel',
            label: 'Cancelar',
            onClick: onClose,
            disabled: isSubmitting,
          }}
          secondaryAction={{
            key: 'draft',
            label: isEdit ? 'Guardar' : 'Guardar',
            icon: Save,
            onClick: handleSubmit(onSubmit),
            disabled: isSubmitting || !isDirty,
            loading: isSubmitting,
          }}
          primaryAction={
            !isEdit
              ? {
                  key: 'send',
                  label: 'Enviar',
                  icon: Send,
                  onClick: handleSaveAndSend,
                  disabled: isSubmitting || !watchedItems.some((i) => i.name),
                  loading: isSubmitting,
                }
              : undefined
          }
        >
          {/* Totals Summary - Compact */}
          <TotalsSummary
            compact
            items={[
              {
                label: 'Subtotal',
                value: formatCurrency(totals.subtotal, watchedCurrency),
              },
              ...(totals.globalDiscount > 0
                ? [
                    {
                      label: 'Descuento',
                      value: `-${formatCurrency(totals.globalDiscount, watchedCurrency)}`,
                      variant: 'success' as const,
                    },
                  ]
                : []),
              ...(totals.totalTax > 0
                ? [
                    {
                      label: 'Impuestos',
                      value: formatCurrency(totals.totalTax, watchedCurrency),
                    },
                  ]
                : []),
              {
                label: 'Total',
                value: formatCurrency(totals.total, watchedCurrency),
                variant: 'primary' as const,
                bold: true,
              },
            ]}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export default QuoteCreateSheet;

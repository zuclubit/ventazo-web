'use client';

/**
 * LineItemsEditorV2 - Responsive Quote Line Items Editor
 *
 * Premium component for managing quote line items with:
 * - Responsive design: Cards on mobile, table on desktop
 * - Ventazo glassmorphism design system
 * - Touch-friendly drag handles
 * - Sticky totals summary
 * - Real-time calculations
 *
 * v2.1 Changes:
 * - Fixed dark mode text visibility for all labels and values
 * - Explicit text colors (text-slate-900/100 for light/dark)
 * - Improved contrast for "Productos/Servicios" header
 * - Fixed StickyTotals dark mode text colors
 * - Fixed EmptyState dark mode text colors
 *
 * @version 2.1.0
 * @module quotes/components/LineItemsEditorV2
 */

import * as React from 'react';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import {
  Plus,
  Trash2,
  GripVertical,
  Package,
  Percent,
  DollarSign,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ShoppingBag,
  Wrench,
  RefreshCw,
  Tag,
  Receipt,
  MoreHorizontal,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useMediaQuery } from '@/hooks/use-media-query';
import type {
  QuoteLineItemType,
  DiscountType,
  CreateQuoteLineItemRequest,
} from '@/lib/quotes/types';
import { LINE_ITEM_TYPE_LABELS } from '@/lib/quotes/types';

// ============================================
// Types
// ============================================

export interface LineItem extends CreateQuoteLineItemRequest {
  id: string;
}

export interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency?: string;
  taxRate?: number;
  disabled?: boolean;
  errors?: Record<string, string>;
}

interface LineItemCardProps {
  item: LineItem;
  index: number;
  currency: string;
  taxRate: number;
  onChange: (item: LineItem) => void;
  onRemove: () => void;
  onDuplicate: () => void;
  disabled?: boolean;
  error?: string;
  isMobile: boolean;
}

// ============================================
// Constants
// ============================================

const TYPE_ICONS: Record<QuoteLineItemType, typeof Package> = {
  product: ShoppingBag,
  service: Wrench,
  subscription: RefreshCw,
  discount: Tag,
  fee: Receipt,
};

const TYPE_COLORS: Record<QuoteLineItemType, string> = {
  product: 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20',
  service: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20',
  subscription: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  discount: 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20',
  fee: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20',
};

// ============================================
// Utility Functions
// ============================================

function generateId(): string {
  return `item-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatCurrency(amount: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function calculateLineItemTotal(
  quantity: number,
  unitPrice: number,
  discountType?: DiscountType,
  discountValue?: number,
  taxRate?: number
): { subtotal: number; discountAmount: number; taxAmount: number; total: number } {
  const subtotal = quantity * unitPrice;

  let discountAmount = 0;
  if (discountValue && discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
  }

  const afterDiscount = subtotal - discountAmount;
  const taxAmount = taxRate ? afterDiscount * (taxRate / 100) : 0;
  const total = afterDiscount + taxAmount;

  return { subtotal, discountAmount, taxAmount, total };
}

function createEmptyItem(): LineItem {
  return {
    id: generateId(),
    type: 'service',
    name: '',
    description: '',
    quantity: 1,
    unitPrice: 0,
    discountType: 'percentage',
    discountValue: 0,
    taxRate: 16,
    order: 0,
  };
}

// ============================================
// Mobile Line Item Card Component
// ============================================

function MobileLineItemCard({
  item,
  index,
  currency,
  taxRate,
  onChange,
  onRemove,
  onDuplicate,
  disabled,
  error,
}: Omit<LineItemCardProps, 'isMobile'>) {
  const [expanded, setExpanded] = React.useState(false);
  const dragControls = useDragControls();
  const TypeIcon = TYPE_ICONS[item.type];

  const totals = React.useMemo(() => {
    return calculateLineItemTotal(
      item.quantity || 0,
      item.unitPrice || 0,
      item.discountType,
      item.discountValue,
      item.taxRate ?? taxRate
    );
  }, [item.quantity, item.unitPrice, item.discountType, item.discountValue, item.taxRate, taxRate]);

  const handleFieldChange = React.useCallback(
    <K extends keyof LineItem>(field: K, value: LineItem[K]) => {
      onChange({ ...item, [field]: value });
    },
    [item, onChange]
  );

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        'rounded-xl border transition-all duration-200',
        // Ventazo glassmorphism
        'bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm',
        'shadow-sm hover:shadow-md',
        error
          ? 'border-red-300 dark:border-red-800'
          : 'border-slate-200/60 dark:border-slate-700/60',
        disabled && 'opacity-60 pointer-events-none'
      )}
    >
      {/* Card Header - Always Visible */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          {/* Drag Handle - Touch Friendly */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className={cn(
              'shrink-0 p-2 -ml-1 rounded-lg cursor-grab active:cursor-grabbing',
              'touch-none select-none',
              'text-slate-400 active:text-[var(--tenant-primary)]',
              'hover:bg-slate-100 dark:hover:bg-slate-800',
              'active:bg-[var(--tenant-primary)]/10'
            )}
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 space-y-3">
            {/* Type Badge + Name */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn(
                'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border',
                TYPE_COLORS[item.type]
              )}>
                <TypeIcon className="h-3 w-3" />
                {LINE_ITEM_TYPE_LABELS[item.type]}
              </span>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                #{index + 1}
              </span>
            </div>

            {/* Name Input */}
            <Input
              value={item.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Nombre del producto o servicio"
              className={cn(
                'h-11 text-base font-medium',
                'border-slate-200/60 dark:border-slate-700/60',
                'focus:border-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]/20',
                !item.name && 'border-amber-300 dark:border-amber-700'
              )}
              disabled={disabled}
            />

            {/* Quantity x Price = Total Row */}
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Cantidad</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  min={1}
                  step={1}
                  value={item.quantity}
                  onChange={(e) => handleFieldChange('quantity', Math.max(1, parseInt(e.target.value) || 1))}
                  className="h-10 text-center font-medium"
                  disabled={disabled}
                />
              </div>

              <span className="text-slate-500 dark:text-slate-400 mt-5">×</span>

              <div className="flex-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1 block">Precio</Label>
                <div className="relative">
                  <DollarSign className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.01}
                    value={item.unitPrice}
                    onChange={(e) => handleFieldChange('unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                    className="h-10 pl-8 text-right font-medium"
                    disabled={disabled}
                  />
                </div>
              </div>

              <span className="text-slate-500 dark:text-slate-400 mt-5">=</span>

              <div className="flex-1 mt-5">
                <div className="h-10 flex items-center justify-end px-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                  <span className="font-bold text-[var(--tenant-primary)] tabular-nums">
                    {formatCurrency(totals.total, currency)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Actions Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 shrink-0"
                disabled={disabled}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setExpanded(!expanded)}>
                {expanded ? (
                  <>
                    <ChevronUp className="mr-2 h-4 w-4" />
                    Ocultar detalles
                  </>
                ) : (
                  <>
                    <ChevronDown className="mr-2 h-4 w-4" />
                    Ver detalles
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate}>
                <Package className="mr-2 h-4 w-4" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={onRemove}
                className="text-red-600 dark:text-red-400"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Discount indicator */}
        {(item.discountValue ?? 0) > 0 && (
          <div className="mt-2 flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
            <Tag className="h-3 w-3" />
            <span>
              Descuento: {item.discountType === 'percentage' ? `${item.discountValue}%` : formatCurrency(item.discountValue || 0, currency)}
              {' '}(-{formatCurrency(totals.discountAmount, currency)})
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 mt-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {/* Expanded Details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 pt-0 border-t border-slate-100 dark:border-slate-800">
              <div className="pt-4 space-y-4">
                {/* Type Selector */}
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Tipo</Label>
                  <Select
                    value={item.type}
                    onValueChange={(value) => handleFieldChange('type', value as QuoteLineItemType)}
                    disabled={disabled}
                  >
                    <SelectTrigger className="h-11">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(LINE_ITEM_TYPE_LABELS) as QuoteLineItemType[]).map((type) => {
                        const Icon = TYPE_ICONS[type];
                        return (
                          <SelectItem key={type} value={type}>
                            <div className="flex items-center gap-2">
                              <Icon className="h-4 w-4" />
                              {LINE_ITEM_TYPE_LABELS[type]}
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Description */}
                <div>
                  <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Descripcion (opcional)</Label>
                  <Textarea
                    value={item.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Detalles adicionales..."
                    rows={2}
                    className="resize-none text-sm"
                    disabled={disabled}
                  />
                </div>

                {/* Discount & Tax Row */}
                <div className="grid grid-cols-2 gap-3">
                  {/* Discount */}
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Descuento</Label>
                    <div className="flex gap-2">
                      <Select
                        value={item.discountType || 'percentage'}
                        onValueChange={(value) => handleFieldChange('discountType', value as DiscountType)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="w-16 h-10">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">$</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        <Input
                          type="number"
                          inputMode="decimal"
                          min={0}
                          max={item.discountType === 'percentage' ? 100 : undefined}
                          step={0.01}
                          value={item.discountValue || 0}
                          onChange={(e) => handleFieldChange('discountValue', Math.max(0, parseFloat(e.target.value) || 0))}
                          className="h-10 pr-8"
                          disabled={disabled}
                        />
                        {item.discountType === 'percentage' && (
                          <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tax */}
                  <div>
                    <Label className="text-xs text-slate-500 dark:text-slate-400 mb-1.5 block">Impuesto (%)</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        inputMode="decimal"
                        min={0}
                        max={100}
                        step={0.01}
                        value={item.taxRate ?? taxRate}
                        onChange={(e) => handleFieldChange('taxRate', Math.max(0, parseFloat(e.target.value) || 0))}
                        className="h-10 pr-8"
                        disabled={disabled}
                      />
                      <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                    </div>
                  </div>
                </div>

                {/* Subtotals */}
                <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
                    <span className="tabular-nums">{formatCurrency(totals.subtotal, currency)}</span>
                  </div>
                  {totals.discountAmount > 0 && (
                    <div className="flex justify-between text-green-600 dark:text-green-400">
                      <span>Descuento:</span>
                      <span className="tabular-nums">-{formatCurrency(totals.discountAmount, currency)}</span>
                    </div>
                  )}
                  {totals.taxAmount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Impuesto:</span>
                      <span className="tabular-nums">{formatCurrency(totals.taxAmount, currency)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-semibold pt-1 border-t border-slate-200 dark:border-slate-700">
                    <span>Total:</span>
                    <span className="tabular-nums text-[var(--tenant-primary)]">
                      {formatCurrency(totals.total, currency)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Reorder.Item>
  );
}

// ============================================
// Desktop Line Item Row Component
// ============================================

const DesktopLineItemRow = React.memo<Omit<LineItemCardProps, 'isMobile'>>(function DesktopLineItemRow({
  item,
  index,
  currency,
  taxRate,
  onChange,
  onRemove,
  onDuplicate,
  disabled,
  error,
}) {
  const [showDetails, setShowDetails] = React.useState(false);
  const TypeIcon = TYPE_ICONS[item.type];

  const totals = React.useMemo(() => {
    return calculateLineItemTotal(
      item.quantity || 0,
      item.unitPrice || 0,
      item.discountType,
      item.discountValue,
      item.taxRate ?? taxRate
    );
  }, [item.quantity, item.unitPrice, item.discountType, item.discountValue, item.taxRate, taxRate]);

  const handleFieldChange = React.useCallback(
    <K extends keyof LineItem>(field: K, value: LineItem[K]) => {
      onChange({ ...item, [field]: value });
    },
    [item, onChange]
  );

  return (
    <Reorder.Item
      value={item}
      id={item.id}
      className={cn(
        'group rounded-xl border transition-all duration-200',
        // Ventazo glassmorphism
        'bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm',
        'shadow-sm hover:shadow-md',
        error
          ? 'border-red-300 dark:border-red-800'
          : 'border-slate-200/60 dark:border-slate-700/60 hover:border-[var(--tenant-primary)]/30',
        disabled && 'opacity-60 pointer-events-none'
      )}
    >
      <div className="p-4">
        {/* Main Row - Responsive grid layout */}
        <div className="flex items-center gap-3">
          {/* Drag Handle */}
          <div
            className={cn(
              'shrink-0 cursor-grab active:cursor-grabbing',
              'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
              'opacity-0 group-hover:opacity-100 transition-opacity'
            )}
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Type Select with Icon - compact on medium screens */}
          <div className="w-28 lg:w-32 shrink-0">
            <Select
              value={item.type}
              onValueChange={(value) => handleFieldChange('type', value as QuoteLineItemType)}
              disabled={disabled}
            >
              <SelectTrigger className="h-10">
                <div className="flex items-center gap-1.5">
                  <TypeIcon className="h-4 w-4 shrink-0" />
                  <span className="truncate"><SelectValue /></span>
                </div>
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LINE_ITEM_TYPE_LABELS) as QuoteLineItemType[]).map((type) => {
                  const Icon = TYPE_ICONS[type];
                  return (
                    <SelectItem key={type} value={type}>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {LINE_ITEM_TYPE_LABELS[type]}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Name & Description - flexible width */}
          <div className="flex-1 min-w-[100px] space-y-1">
            <Input
              value={item.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Nombre del producto o servicio"
              className={cn(
                'h-10 font-medium',
                'focus:border-[var(--tenant-primary)] focus:ring-[var(--tenant-primary)]/20',
                !item.name && 'border-amber-300 dark:border-amber-700'
              )}
              disabled={disabled}
            />
            {showDetails && (
              <Textarea
                value={item.description || ''}
                onChange={(e) => handleFieldChange('description', e.target.value)}
                placeholder="Descripcion (opcional)"
                rows={2}
                className="resize-none text-sm"
                disabled={disabled}
              />
            )}
          </div>

          {/* Quantity - compact */}
          <div className="w-16 lg:w-20 shrink-0">
            <Input
              type="number"
              min={1}
              step={1}
              value={item.quantity}
              onChange={(e) => handleFieldChange('quantity', Math.max(1, parseInt(e.target.value) || 1))}
              className="h-10 text-center font-medium"
              disabled={disabled}
            />
          </div>

          {/* Unit Price - compact on medium screens */}
          <div className="w-24 lg:w-28 shrink-0">
            <div className="relative">
              <DollarSign className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={item.unitPrice}
                onChange={(e) => handleFieldChange('unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                className="h-10 pl-7 text-right font-medium text-sm"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Total - compact */}
          <div className="w-24 lg:w-28 shrink-0 text-right">
            <p className="text-base lg:text-lg font-bold tabular-nums text-[var(--tenant-primary)]">
              {formatCurrency(totals.total, currency)}
            </p>
            {totals.discountAmount > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400">
                -{formatCurrency(totals.discountAmount, currency)}
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setShowDetails(!showDetails)}
              className={cn('h-8 w-8', showDetails && 'text-[var(--tenant-primary)]')}
              disabled={disabled}
            >
              {showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onDuplicate}
              className="h-8 w-8"
              disabled={disabled}
            >
              <Package className="h-4 w-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onRemove}
              className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
              disabled={disabled}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Expanded Details */}
        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="pt-4 mt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="grid grid-cols-4 gap-4">
                  {/* Discount */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Descuento</Label>
                    <div className="flex gap-2">
                      <Select
                        value={item.discountType || 'percentage'}
                        onValueChange={(value) => handleFieldChange('discountType', value as DiscountType)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="w-20 h-9">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="percentage">%</SelectItem>
                          <SelectItem value="fixed">Fijo</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="relative flex-1">
                        {item.discountType === 'percentage' ? (
                          <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        ) : (
                          <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                        )}
                        <Input
                          type="number"
                          min={0}
                          max={item.discountType === 'percentage' ? 100 : undefined}
                          step={0.01}
                          value={item.discountValue || 0}
                          onChange={(e) => handleFieldChange('discountValue', Math.max(0, parseFloat(e.target.value) || 0))}
                          className={cn(
                            'h-9',
                            item.discountType === 'percentage' ? 'pr-8' : 'pl-8'
                          )}
                          disabled={disabled}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tax Rate */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-slate-500 dark:text-slate-400">Impuesto (%)</Label>
                    <div className="relative">
                      <Percent className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                      <Input
                        type="number"
                        min={0}
                        max={100}
                        step={0.01}
                        value={item.taxRate ?? taxRate}
                        onChange={(e) => handleFieldChange('taxRate', Math.max(0, parseFloat(e.target.value) || 0))}
                        className="h-9 pr-8"
                        disabled={disabled}
                      />
                    </div>
                  </div>

                  {/* Spacer */}
                  <div />

                  {/* Subtotals */}
                  <div className="space-y-1 text-right text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
                      <span className="tabular-nums">{formatCurrency(totals.subtotal, currency)}</span>
                    </div>
                    {totals.discountAmount > 0 && (
                      <div className="flex justify-between text-green-600 dark:text-green-400">
                        <span>Descuento:</span>
                        <span className="tabular-nums">-{formatCurrency(totals.discountAmount, currency)}</span>
                      </div>
                    )}
                    {totals.taxAmount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-slate-500 dark:text-slate-400">Impuesto:</span>
                        <span className="tabular-nums">{formatCurrency(totals.taxAmount, currency)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Message */}
        {error && (
          <div className="flex items-center gap-2 mt-3 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </Reorder.Item>
  );
});

// ============================================
// Empty State Component
// ============================================

function EmptyState({
  onAdd,
  disabled,
}: {
  onAdd: () => void;
  disabled?: boolean;
}) {
  return (
    <div className={cn(
      'flex flex-col items-center justify-center py-12 px-6 rounded-xl',
      'border-2 border-dashed',
      'border-slate-200 dark:border-slate-700',
      'bg-slate-50/50 dark:bg-slate-900/50'
    )}>
      <div className="p-3 rounded-xl bg-[var(--tenant-primary)]/10 dark:bg-[var(--tenant-primary)]/20 mb-4">
        <Package className="h-6 w-6 text-[var(--tenant-primary)]" />
      </div>
      <p className="text-base font-medium text-slate-900 dark:text-slate-100 mb-1">
        Sin productos o servicios
      </p>
      <p className="text-sm text-slate-500 dark:text-slate-400 mb-6 text-center max-w-xs">
        Agrega items a tu cotizacion para calcular el total automaticamente
      </p>
      <Button
        type="button"
        onClick={onAdd}
        disabled={disabled}
        className={cn(
          'gap-2',
          'bg-[var(--tenant-primary)] hover:bg-[var(--tenant-primary-hover)]',
          'text-white'
        )}
      >
        <Plus className="h-4 w-4" />
        Agregar primer item
      </Button>
    </div>
  );
}

// ============================================
// Sticky Totals Component
// ============================================

interface StickyTotalsProps {
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  total: number;
  currency: string;
  itemCount: number;
}

function StickyTotals({
  subtotal,
  discountAmount,
  taxAmount,
  total,
  currency,
  itemCount,
}: StickyTotalsProps) {
  return (
    <div className={cn(
      'sticky bottom-0 z-10',
      'mt-6 p-4 rounded-xl',
      // Ventazo glassmorphism
      'bg-white/95 dark:bg-slate-900/95 backdrop-blur-md',
      'border border-slate-200/60 dark:border-slate-700/60',
      'shadow-lg shadow-slate-200/50 dark:shadow-slate-900/50'
    )}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Item count */}
        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
          <Package className="h-4 w-4" />
          <span>{itemCount} {itemCount === 1 ? 'item' : 'items'}</span>
        </div>

        {/* Totals */}
        <div className="flex flex-wrap items-center justify-end gap-x-6 gap-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-slate-500 dark:text-slate-400">Subtotal:</span>
            <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(subtotal, currency)}</span>
          </div>

          {discountAmount > 0 && (
            <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
              <Tag className="h-3.5 w-3.5" />
              <span className="font-medium tabular-nums">-{formatCurrency(discountAmount, currency)}</span>
            </div>
          )}

          {taxAmount > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-slate-500 dark:text-slate-400">IVA:</span>
              <span className="font-medium tabular-nums text-slate-900 dark:text-slate-100">{formatCurrency(taxAmount, currency)}</span>
            </div>
          )}

          <div className="flex items-center gap-2 pl-4 border-l border-slate-200 dark:border-slate-700">
            <span className="font-semibold text-slate-900 dark:text-slate-100">Total:</span>
            <span className={cn(
              'text-xl font-bold tabular-nums',
              'text-[var(--tenant-primary)]'
            )}>
              {formatCurrency(total, currency)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function LineItemsEditorV2({
  items,
  onChange,
  currency = 'MXN',
  taxRate = 16,
  disabled = false,
  errors = {},
}: LineItemsEditorProps) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  // Calculate totals
  const totals = React.useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const itemTotals = calculateLineItemTotal(
          item.quantity || 0,
          item.unitPrice || 0,
          item.discountType,
          item.discountValue,
          item.taxRate ?? taxRate
        );
        return {
          subtotal: acc.subtotal + itemTotals.subtotal,
          discountAmount: acc.discountAmount + itemTotals.discountAmount,
          taxAmount: acc.taxAmount + itemTotals.taxAmount,
          total: acc.total + itemTotals.total,
        };
      },
      { subtotal: 0, discountAmount: 0, taxAmount: 0, total: 0 }
    );
  }, [items, taxRate]);

  // Handlers
  const handleAddItem = React.useCallback(() => {
    const newItem = createEmptyItem();
    newItem.order = items.length;
    onChange([...items, newItem]);
  }, [items, onChange]);

  const handleUpdateItem = React.useCallback(
    (index: number, updatedItem: LineItem) => {
      const newItems = [...items];
      newItems[index] = updatedItem;
      onChange(newItems);
    },
    [items, onChange]
  );

  const handleRemoveItem = React.useCallback(
    (index: number) => {
      const newItems = items.filter((_, i) => i !== index);
      newItems.forEach((item, i) => {
        item.order = i;
      });
      onChange(newItems);
    },
    [items, onChange]
  );

  const handleDuplicateItem = React.useCallback(
    (index: number) => {
      const itemToDuplicate = items[index];
      if (!itemToDuplicate) return;

      const newItem: LineItem = {
        ...itemToDuplicate,
        id: generateId(),
        name: `${itemToDuplicate.name} (copia)`,
        order: items.length,
      };
      onChange([...items, newItem]);
    },
    [items, onChange]
  );

  const handleReorder = React.useCallback(
    (newItems: LineItem[]) => {
      newItems.forEach((item, i) => {
        item.order = i;
      });
      onChange(newItems);
    },
    [onChange]
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Productos / Servicios
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Arrastra para reordenar
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          disabled={disabled}
          className={cn(
            'gap-1.5',
            'border-[var(--tenant-primary)]/30 text-[var(--tenant-primary)]',
            'hover:bg-[var(--tenant-primary)]/5 hover:border-[var(--tenant-primary)]/50'
          )}
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {/* Desktop Column Headers - Hidden on tablets, only show on lg+ */}
      {!isMobile && items.length > 0 && (
        <div className="hidden lg:flex items-center gap-3 px-3 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          <div className="w-5 shrink-0" /> {/* Drag handle space */}
          <div className="w-28 shrink-0">Tipo</div>
          <div className="flex-1 min-w-[120px]">Descripcion</div>
          <div className="w-20 shrink-0 text-center">Cant.</div>
          <div className="w-28 shrink-0 text-right">Precio</div>
          <div className="w-28 shrink-0 text-right">Total</div>
          <div className="w-20 shrink-0" /> {/* Actions space */}
        </div>
      )}

      {/* Items List */}
      {items.length > 0 ? (
        <>
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={handleReorder}
            className="space-y-3"
          >
            <AnimatePresence>
              {items.map((item, index) => (
                isMobile ? (
                  <MobileLineItemCard
                    key={item.id}
                    item={item}
                    index={index}
                    currency={currency}
                    taxRate={taxRate}
                    onChange={(updatedItem) => handleUpdateItem(index, updatedItem)}
                    onRemove={() => handleRemoveItem(index)}
                    onDuplicate={() => handleDuplicateItem(index)}
                    disabled={disabled}
                    error={errors[`items.${index}`]}
                  />
                ) : (
                  <DesktopLineItemRow
                    key={item.id}
                    item={item}
                    index={index}
                    currency={currency}
                    taxRate={taxRate}
                    onChange={(updatedItem) => handleUpdateItem(index, updatedItem)}
                    onRemove={() => handleRemoveItem(index)}
                    onDuplicate={() => handleDuplicateItem(index)}
                    disabled={disabled}
                    error={errors[`items.${index}`]}
                  />
                )
              ))}
            </AnimatePresence>
          </Reorder.Group>

          {/* Sticky Totals */}
          <StickyTotals
            subtotal={totals.subtotal}
            discountAmount={totals.discountAmount}
            taxAmount={totals.taxAmount}
            total={totals.total}
            currency={currency}
            itemCount={items.length}
          />
        </>
      ) : (
        <EmptyState onAdd={handleAddItem} disabled={disabled} />
      )}
    </div>
  );
}

export default LineItemsEditorV2;

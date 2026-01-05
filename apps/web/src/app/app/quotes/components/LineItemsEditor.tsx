'use client';

/**
 * LineItemsEditor - Quote Line Items Management Component
 *
 * Premium component for adding, editing, and removing quote line items.
 * Features real-time price calculations and drag-to-reorder.
 *
 * @version 1.0.0
 * @module quotes/components/LineItemsEditor
 */

import * as React from 'react';
import { motion, AnimatePresence, Reorder } from 'framer-motion';
import {
  Plus,
  Trash2,
  GripVertical,
  Package,
  Percent,
  DollarSign,
  AlertCircle,
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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
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
  id: string; // Temporary ID for React keys
}

export interface LineItemsEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  currency?: string;
  taxRate?: number;
  disabled?: boolean;
  errors?: Record<string, string>;
}

interface LineItemRowProps {
  item: LineItem;
  index: number;
  currency: string;
  taxRate: number;
  onChange: (item: LineItem) => void;
  onRemove: () => void;
  disabled?: boolean;
  error?: string;
}

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

  // Calculate discount
  let discountAmount = 0;
  if (discountValue && discountValue > 0) {
    if (discountType === 'percentage') {
      discountAmount = subtotal * (discountValue / 100);
    } else {
      discountAmount = discountValue;
    }
  }

  const afterDiscount = subtotal - discountAmount;

  // Calculate tax on amount after discount
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
// Line Item Row Component
// ============================================

const LineItemRow = React.memo<LineItemRowProps>(function LineItemRow({
  item,
  index,
  currency,
  taxRate,
  onChange,
  onRemove,
  disabled,
  error,
}) {
  const [showDetails, setShowDetails] = React.useState(false);

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
        'bg-white dark:bg-slate-900',
        error
          ? 'border-red-300 dark:border-red-800'
          : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
        disabled && 'opacity-60 pointer-events-none'
      )}
    >
      <div className="p-4">
        {/* Main Row */}
        <div className="flex items-start gap-3">
          {/* Drag Handle */}
          <div
            className={cn(
              'shrink-0 mt-2 cursor-grab active:cursor-grabbing',
              'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300',
              'opacity-0 group-hover:opacity-100 transition-opacity'
            )}
          >
            <GripVertical className="h-5 w-5" />
          </div>

          {/* Type Select */}
          <div className="w-28 shrink-0">
            <Select
              value={item.type}
              onValueChange={(value) => handleFieldChange('type', value as QuoteLineItemType)}
              disabled={disabled}
            >
              <SelectTrigger className="h-10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(LINE_ITEM_TYPE_LABELS) as QuoteLineItemType[]).map((type) => (
                  <SelectItem key={type} value={type}>
                    {LINE_ITEM_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Name & Description */}
          <div className="flex-1 min-w-0 space-y-2">
            <Input
              value={item.name}
              onChange={(e) => handleFieldChange('name', e.target.value)}
              placeholder="Nombre del producto o servicio"
              className={cn('h-10', !item.name && 'border-amber-300 dark:border-amber-700')}
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

          {/* Quantity */}
          <div className="w-20 shrink-0">
            <Input
              type="number"
              min={1}
              step={1}
              value={item.quantity}
              onChange={(e) => handleFieldChange('quantity', Math.max(1, parseInt(e.target.value) || 1))}
              className="h-10 text-center"
              disabled={disabled}
            />
          </div>

          {/* Unit Price */}
          <div className="w-32 shrink-0">
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                type="number"
                min={0}
                step={0.01}
                value={item.unitPrice}
                onChange={(e) => handleFieldChange('unitPrice', Math.max(0, parseFloat(e.target.value) || 0))}
                className="h-10 pl-8 text-right"
                disabled={disabled}
              />
            </div>
          </div>

          {/* Total */}
          <div className="w-32 shrink-0 text-right">
            <p className="text-lg font-bold tabular-nums text-foreground">
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
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => setShowDetails(!showDetails)}
                    className="h-8 w-8"
                    disabled={disabled}
                  >
                    <Package className={cn('h-4 w-4', showDetails && 'text-primary')} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {showDetails ? 'Ocultar detalles' : 'Mostrar detalles'}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
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
                </TooltipTrigger>
                <TooltipContent>Eliminar item</TooltipContent>
              </Tooltip>
            </TooltipProvider>
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
                <div className="grid grid-cols-3 gap-4">
                  {/* Discount */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">Descuento</Label>
                    <div className="flex gap-2">
                      <Select
                        value={item.discountType || 'percentage'}
                        onValueChange={(value) => handleFieldChange('discountType', value as DiscountType)}
                        disabled={disabled}
                      >
                        <SelectTrigger className="w-24 h-9">
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
                    <Label className="text-xs text-muted-foreground">Impuesto (%)</Label>
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

                  {/* Subtotals */}
                  <div className="space-y-1 text-right text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal:</span>
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
                        <span className="text-muted-foreground">Impuesto:</span>
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
// Main Component
// ============================================

export function LineItemsEditor({
  items,
  onChange,
  currency = 'MXN',
  taxRate = 16,
  disabled = false,
  errors = {},
}: LineItemsEditorProps) {
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
      // Update order after removal
      newItems.forEach((item, i) => {
        item.order = i;
      });
      onChange(newItems);
    },
    [items, onChange]
  );

  const handleReorder = React.useCallback(
    (newItems: LineItem[]) => {
      // Update order after reorder
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
          <h3 className="text-sm font-semibold text-foreground">
            Productos / Servicios
          </h3>
          <p className="text-xs text-muted-foreground">
            {items.length} {items.length === 1 ? 'item' : 'items'}
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleAddItem}
          disabled={disabled}
          className="gap-1.5"
        >
          <Plus className="h-4 w-4" />
          Agregar
        </Button>
      </div>

      {/* Column Headers */}
      {items.length > 0 && (
        <div className="flex items-center gap-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">
          <div className="w-5 shrink-0" /> {/* Drag handle space */}
          <div className="w-28 shrink-0">Tipo</div>
          <div className="flex-1">Descripcion</div>
          <div className="w-20 shrink-0 text-center">Cant.</div>
          <div className="w-32 shrink-0 text-right">Precio Unit.</div>
          <div className="w-32 shrink-0 text-right">Total</div>
          <div className="w-16 shrink-0" /> {/* Actions space */}
        </div>
      )}

      {/* Items List */}
      {items.length > 0 ? (
        <Reorder.Group
          axis="y"
          values={items}
          onReorder={handleReorder}
          className="space-y-3"
        >
          <AnimatePresence>
            {items.map((item, index) => (
              <LineItemRow
                key={item.id}
                item={item}
                index={index}
                currency={currency}
                taxRate={taxRate}
                onChange={(updatedItem) => handleUpdateItem(index, updatedItem)}
                onRemove={() => handleRemoveItem(index)}
                disabled={disabled}
                error={errors[`items.${index}`]}
              />
            ))}
          </AnimatePresence>
        </Reorder.Group>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 rounded-xl border-2 border-dashed border-slate-200 dark:border-slate-700">
          <Package className="h-10 w-10 text-slate-300 dark:text-slate-600 mb-3" />
          <p className="text-sm text-muted-foreground mb-4">
            No hay productos o servicios agregados
          </p>
          <Button
            type="button"
            variant="outline"
            onClick={handleAddItem}
            disabled={disabled}
            className="gap-1.5"
          >
            <Plus className="h-4 w-4" />
            Agregar primer item
          </Button>
        </div>
      )}

      {/* Totals Summary */}
      {items.length > 0 && (
        <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="font-medium tabular-nums">
                {formatCurrency(totals.subtotal, currency)}
              </span>
            </div>
            {totals.discountAmount > 0 && (
              <div className="flex justify-between text-green-600 dark:text-green-400">
                <span>Descuentos</span>
                <span className="font-medium tabular-nums">
                  -{formatCurrency(totals.discountAmount, currency)}
                </span>
              </div>
            )}
            {totals.taxAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impuestos</span>
                <span className="font-medium tabular-nums">
                  {formatCurrency(totals.taxAmount, currency)}
                </span>
              </div>
            )}
            <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold tabular-nums text-primary">
                  {formatCurrency(totals.total, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default LineItemsEditor;

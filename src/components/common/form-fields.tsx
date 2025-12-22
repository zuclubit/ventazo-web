'use client';

import * as React from 'react';

import { type Control, type FieldPath, type FieldValues } from 'react-hook-form';

import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

// ============================================
// Base Props
// ============================================

interface BaseFieldProps<TFieldValues extends FieldValues> {
  /** Form control from react-hook-form */
  control: Control<TFieldValues>;
  /** Field name (path) */
  name: FieldPath<TFieldValues>;
  /** Field label */
  label: string;
  /** Optional description text */
  description?: string;
  /** Whether the field is required */
  required?: boolean;
  /** Whether the field is disabled */
  disabled?: boolean;
  /** Additional className for FormItem */
  className?: string;
}

// ============================================
// Text Input Field
// ============================================

export interface TextFieldProps<TFieldValues extends FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** Input placeholder */
  placeholder?: string;
  /** Input type (text, email, tel, url) */
  type?: 'text' | 'email' | 'tel' | 'url';
  /** Max length */
  maxLength?: number;
}

/**
 * Text input field with react-hook-form integration
 */
export function TextField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  placeholder,
  type = 'text',
  maxLength,
}: TextFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              {...field}
              disabled={disabled}
              maxLength={maxLength}
              placeholder={placeholder}
              type={type}
              value={field.value ?? ''}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// Number Input Field
// ============================================

export interface NumberFieldProps<TFieldValues extends FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** Input placeholder */
  placeholder?: string;
  /** Minimum value */
  min?: number;
  /** Maximum value */
  max?: number;
  /** Step increment */
  step?: number | string;
  /** Whether to allow decimals */
  allowDecimals?: boolean;
}

/**
 * Number input field with react-hook-form integration
 */
export function NumberField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  placeholder,
  min,
  max,
  step = 1,
  allowDecimals = false,
}: NumberFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Input
              disabled={disabled}
              max={max}
              min={min}
              placeholder={placeholder}
              step={allowDecimals ? step : 1}
              type="number"
              value={field.value ?? ''}
              onChange={(e) => {
                const value = e.target.value;
                if (value === '') {
                  field.onChange(undefined);
                } else {
                  field.onChange(allowDecimals ? parseFloat(value) : parseInt(value, 10));
                }
              }}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// Textarea Field
// ============================================

export interface TextareaFieldProps<TFieldValues extends FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** Textarea placeholder */
  placeholder?: string;
  /** Number of rows */
  rows?: number;
  /** Max length */
  maxLength?: number;
  /** Min height className */
  minHeight?: string;
}

/**
 * Textarea field with react-hook-form integration
 */
export function TextareaField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  placeholder,
  rows,
  maxLength,
  minHeight = 'min-h-[100px]',
}: TextareaFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <Textarea
              {...field}
              className={minHeight}
              disabled={disabled}
              maxLength={maxLength}
              placeholder={placeholder}
              rows={rows}
              value={field.value ?? ''}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// Select Field
// ============================================

export interface SelectOption {
  /** Option value */
  value: string;
  /** Option label */
  label: string;
  /** Optional icon or prefix */
  icon?: React.ReactNode;
}

export interface SelectFieldProps<TFieldValues extends FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** Select options */
  options: SelectOption[];
  /** Placeholder text */
  placeholder?: string;
  /** Whether to allow empty value */
  allowEmpty?: boolean;
  /** Empty option label */
  emptyLabel?: string;
}

/**
 * Select field with react-hook-form integration
 */
export function SelectField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  options,
  placeholder = 'Seleccionar...',
  allowEmpty = false,
  emptyLabel = 'Ninguno',
}: SelectFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <Select
            disabled={disabled}
            value={field.value ?? ''}
            onValueChange={field.onChange}
          >
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder={placeholder} />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {allowEmpty && (
                <SelectItem value="">{emptyLabel}</SelectItem>
              )}
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <div className="flex items-center gap-2">
                    {option.icon}
                    {option.label}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// Switch Field
// ============================================

export interface SwitchFieldProps<TFieldValues extends FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** Variant: inline (row) or stacked */
  variant?: 'inline' | 'stacked' | 'card';
}

/**
 * Switch/toggle field with react-hook-form integration
 */
export function SwitchField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
  variant = 'inline',
}: SwitchFieldProps<TFieldValues>) {
  if (variant === 'card') {
    return (
      <FormField
        control={control}
        name={name}
        render={({ field }) => (
          <FormItem
            className={cn(
              'flex flex-row items-center justify-between rounded-lg border p-3',
              className
            )}
          >
            <div className="space-y-0.5">
              <FormLabel>{label}</FormLabel>
              {description && (
                <FormDescription>{description}</FormDescription>
              )}
            </div>
            <FormControl>
              <Switch
                checked={field.value ?? false}
                disabled={disabled}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />
    );
  }

  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem
          className={cn(
            variant === 'inline' && 'flex flex-row items-center gap-2',
            className
          )}
        >
          <FormControl>
            <Switch
              checked={field.value ?? false}
              disabled={disabled}
              onCheckedChange={field.onChange}
            />
          </FormControl>
          <div className={variant === 'inline' ? '' : 'space-y-1'}>
            <FormLabel className="cursor-pointer">{label}</FormLabel>
            {description && (
              <FormDescription>{description}</FormDescription>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// Currency Field
// ============================================

export interface CurrencyFieldProps<TFieldValues extends FieldValues>
  extends BaseFieldProps<TFieldValues> {
  /** Currency symbol or code */
  currency?: string;
  /** Placeholder */
  placeholder?: string;
  /** Minimum value */
  min?: number;
}

/**
 * Currency input field (stored in cents, displayed in units)
 */
export function CurrencyField<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  required,
  disabled,
  className,
  currency = '$',
  placeholder = '0.00',
  min = 0,
}: CurrencyFieldProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          <FormLabel>
            {label}
            {required && <span className="text-destructive ml-1">*</span>}
          </FormLabel>
          <FormControl>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                {currency}
              </span>
              <Input
                className="pl-8"
                disabled={disabled}
                min={min}
                placeholder={placeholder}
                step="0.01"
                type="number"
                value={field.value ?? ''}
                onChange={(e) => {
                  const value = e.target.value;
                  field.onChange(value === '' ? undefined : parseFloat(value));
                }}
              />
            </div>
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}

// ============================================
// Form Section Helper
// ============================================

export interface FormSectionProps {
  /** Section title */
  title?: string;
  /** Section description */
  description?: string;
  /** Child form fields */
  children: React.ReactNode;
  /** Grid columns (default: 2) */
  columns?: 1 | 2 | 3 | 4;
  /** Additional className */
  className?: string;
}

/**
 * Form section with optional title and grid layout
 */
export function FormSection({
  title,
  description,
  children,
  columns = 2,
  className,
}: FormSectionProps) {
  const colsClass = {
    1: '',
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-3',
    4: 'sm:grid-cols-4',
  };

  return (
    <div className={cn('space-y-4', className)}>
      {(title || description) && (
        <div className="space-y-1">
          {title && <h4 className="font-medium">{title}</h4>}
          {description && (
            <p className="text-sm text-muted-foreground">{description}</p>
          )}
        </div>
      )}
      <div className={cn('grid gap-4', colsClass[columns])}>
        {children}
      </div>
    </div>
  );
}

// ============================================
// Form Row Helper
// ============================================

export interface FormRowProps {
  /** Child form fields */
  children: React.ReactNode;
  /** Additional className */
  className?: string;
}

/**
 * Horizontal row of form fields
 */
export function FormRow({ children, className }: FormRowProps) {
  return (
    <div className={cn('grid gap-4 sm:grid-cols-2', className)}>
      {children}
    </div>
  );
}

// ============================================
// Full Width Field Helper
// ============================================

export interface FullWidthProps {
  /** Child form field */
  children: React.ReactNode;
}

/**
 * Makes a field span full width in a grid
 */
export function FullWidth({ children }: FullWidthProps) {
  return <div className="sm:col-span-full">{children}</div>;
}

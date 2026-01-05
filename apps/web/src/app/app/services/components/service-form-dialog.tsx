'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Package } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { sanitizeServiceData } from '@/lib/security/form-sanitizer';
import {
  getIndustryFields,
  INDUSTRY_TYPE,
  INDUSTRY_TYPE_LABELS,
  SERVICE_STATUS,
  SERVICE_STATUS_LABELS,
  SERVICE_TYPE,
  SERVICE_TYPE_LABELS,
  useCreateService,
  useUpdateService,
  type IndustryType,
  type Service,
  type ServiceCategory,
  type ServiceType,
} from '@/lib/services';
import { useTenant } from '@/lib/tenant';

// ============================================
// Form Schema
// ============================================

const serviceFormSchema = z.object({
  name: z.string().min(1, 'El nombre es requerido').max(255),
  description: z.string().max(5000).optional(),
  short_description: z.string().max(500).optional(),
  service_type: z.enum(['service', 'product', 'package']),
  status: z.enum(['active', 'inactive', 'draft', 'archived']).optional(),
  category_id: z.string().uuid().optional().or(z.literal('')),
  price: z.number().min(0, 'El precio debe ser mayor o igual a 0'),
  currency: z.string().length(3).optional(),
  cost_price: z.number().min(0).optional(),
  tax_rate: z.number().min(0).max(100).optional(),
  taxable: z.boolean().optional(),
  duration_minutes: z.number().int().min(0).optional(),
  buffer_time_minutes: z.number().int().min(0).optional(),
  image_url: z.string().url().optional().or(z.literal('')),
  is_featured: z.boolean().optional(),
  is_bookable: z.boolean().optional(),
  max_capacity: z.number().int().min(1).optional(),
  requires_deposit: z.boolean().optional(),
  deposit_amount: z.number().min(0).optional(),
  sku: z.string().max(100).optional(),
  // Industry-specific fields stored as JSON
  custom_fields: z.record(z.unknown()).optional(),
});

type ServiceFormValues = z.infer<typeof serviceFormSchema>;

// ============================================
// Props
// ============================================

interface ServiceFormDialogProps {
  service: Service | null;
  categories: ServiceCategory[];
  open: boolean;
  onClose: () => void;
}

// ============================================
// Dynamic Industry Fields Component
// ============================================

function IndustryFieldsSection({
  industryType,
  serviceType,
  customFields,
  onFieldChange,
}: {
  industryType: IndustryType | null;
  serviceType: ServiceType;
  customFields: Record<string, unknown>;
  onFieldChange: (key: string, value: unknown) => void;
}) {
  const fields = getIndustryFields(industryType, serviceType);

  if (fields.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground">
        <p>No hay campos adicionales para este tipo de servicio.</p>
      </div>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {fields.map((field) => (
        <div key={field.key} className="space-y-2">
          <label className="text-sm font-medium">
            {field.label}
            {field.required && <span className="text-destructive ml-1">*</span>}
          </label>

          {field.type === 'text' && (
            <Input
              placeholder={field.placeholder}
              value={(customFields[field.key] as string) ?? ''}
              onChange={(e) => onFieldChange(field.key, e.target.value)}
            />
          )}

          {field.type === 'number' && (
            <Input
              placeholder={field.placeholder}
              type="number"
              value={(customFields[field.key] as number) ?? ''}
              onChange={(e) => onFieldChange(field.key, e.target.value ? Number(e.target.value) : undefined)}
            />
          )}

          {field.type === 'boolean' && (
            <div className="flex items-center space-x-2">
              <Switch
                checked={(customFields[field.key] as boolean) ?? false}
                onCheckedChange={(checked) => onFieldChange(field.key, checked)}
              />
              <span className="text-sm text-muted-foreground">
                {(customFields[field.key] as boolean) ? 'Sí' : 'No'}
              </span>
            </div>
          )}

          {field.type === 'select' && field.options && (
            <Select
              value={(customFields[field.key] as string) ?? ''}
              onValueChange={(value) => onFieldChange(field.key, value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar..." />
              </SelectTrigger>
              <SelectContent>
                {field.options.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {field.type === 'multiselect' && field.options && (
            <div className="flex flex-wrap gap-2">
              {field.options.map((option) => {
                const selected = ((customFields[field.key] as string[]) ?? []).includes(option);
                return (
                  <Button
                    key={option}
                    size="sm"
                    type="button"
                    variant={selected ? 'default' : 'outline'}
                    onClick={() => {
                      const current = (customFields[field.key] as string[]) ?? [];
                      const updated = selected
                        ? current.filter((v) => v !== option)
                        : [...current, option];
                      onFieldChange(field.key, updated);
                    }}
                  >
                    {option}
                  </Button>
                );
              })}
            </div>
          )}

          {field.helpText && (
            <p className="text-xs text-muted-foreground">{field.helpText}</p>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// Main Component
// ============================================

export function ServiceFormDialog({
  service,
  categories,
  open,
  onClose,
}: ServiceFormDialogProps) {
  const { toast } = useToast();
  const { tenant } = useTenant();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const isEditing = !!service;

  // Get industry type from tenant settings (with fallback)
  const industryType = (tenant?.settings as { industry_type?: IndustryType } | undefined)?.industry_type ?? null;

  const form = useForm<ServiceFormValues>({
    resolver: zodResolver(serviceFormSchema),
    defaultValues: {
      name: '',
      description: '',
      short_description: '',
      service_type: 'service',
      status: 'active',
      category_id: '',
      price: 0,
      currency: 'MXN',
      cost_price: undefined,
      tax_rate: 16,
      taxable: true,
      duration_minutes: undefined,
      buffer_time_minutes: undefined,
      image_url: '',
      is_featured: false,
      is_bookable: true,
      max_capacity: undefined,
      requires_deposit: false,
      deposit_amount: undefined,
      sku: '',
      custom_fields: {},
    },
  });

  const watchServiceType = form.watch('service_type');
  const watchCustomFields = form.watch('custom_fields') ?? {};

  // Reset form when dialog opens/closes or service changes
  React.useEffect(() => {
    if (open) {
      if (service) {
        form.reset({
          name: service.name,
          description: service.description ?? '',
          short_description: service.short_description ?? '',
          service_type: service.service_type,
          status: service.status,
          category_id: service.category_id ?? '',
          price: service.price / 100, // Convert from cents
          currency: service.currency,
          cost_price: service.cost_price ? service.cost_price / 100 : undefined,
          tax_rate: service.tax_rate ?? 16,
          taxable: service.taxable,
          duration_minutes: service.duration_minutes ?? undefined,
          buffer_time_minutes: service.buffer_time_minutes ?? undefined,
          image_url: service.image_url ?? '',
          is_featured: service.is_featured,
          is_bookable: service.is_bookable,
          max_capacity: service.max_capacity ?? undefined,
          requires_deposit: service.requires_deposit,
          deposit_amount: service.deposit_amount ? service.deposit_amount / 100 : undefined,
          sku: service.sku ?? '',
          custom_fields: service.custom_fields ?? {},
        });
      } else {
        form.reset({
          name: '',
          description: '',
          short_description: '',
          service_type: 'service',
          status: 'active',
          category_id: '',
          price: 0,
          currency: 'MXN',
          tax_rate: 16,
          taxable: true,
          is_featured: false,
          is_bookable: true,
          requires_deposit: false,
          custom_fields: {},
        });
      }
    }
  }, [open, service, form]);

  const handleCustomFieldChange = (key: string, value: unknown) => {
    const current = form.getValues('custom_fields') ?? {};
    form.setValue('custom_fields', { ...current, [key]: value });
  };

  const onSubmit = async (values: ServiceFormValues) => {
    try {
      // Sanitize all input data before sending to API (XSS prevention)
      const sanitizedValues = sanitizeServiceData(values as Record<string, unknown>) as ServiceFormValues;

      const data = {
        ...sanitizedValues,
        price: Math.round(sanitizedValues.price * 100), // Convert to cents
        cost_price: sanitizedValues.cost_price ? Math.round(sanitizedValues.cost_price * 100) : undefined,
        deposit_amount: sanitizedValues.deposit_amount ? Math.round(sanitizedValues.deposit_amount * 100) : undefined,
        category_id: sanitizedValues.category_id || undefined,
        image_url: sanitizedValues.image_url || undefined,
        sku: sanitizedValues.sku || undefined,
      };

      if (isEditing && service) {
        await updateService.mutateAsync({ id: service.id, ...data });
        toast({
          title: 'Servicio actualizado',
          description: 'El servicio se ha actualizado correctamente.',
        });
      } else {
        await createService.mutateAsync(data);
        toast({
          title: 'Servicio creado',
          description: 'El servicio se ha creado correctamente.',
        });
      }
      onClose();
    } catch {
      toast({
        title: 'Error',
        description: isEditing
          ? 'No se pudo actualizar el servicio.'
          : 'No se pudo crear el servicio.',
        variant: 'destructive',
      });
    }
  };

  const isPending = createService.isPending || updateService.isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {isEditing ? 'Editar Servicio' : 'Nuevo Servicio'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica la información del servicio.'
              : 'Completa la información para crear un nuevo servicio.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <Tabs className="w-full" defaultValue="basic">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="basic">Básico</TabsTrigger>
                <TabsTrigger value="pricing">Precios</TabsTrigger>
                <TabsTrigger value="industry">
                  {industryType ? INDUSTRY_TYPE_LABELS[industryType] : 'Adicional'}
                </TabsTrigger>
              </TabsList>

              {/* Basic Tab */}
              <TabsContent className="space-y-4 pt-4" value="basic">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Nombre *</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: Consulta general" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="service_type"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo *</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar tipo" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICE_TYPE.map((type) => (
                              <SelectItem key={type} value={type}>
                                {SERVICE_TYPE_LABELS[type]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="status"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Seleccionar estado" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {SERVICE_STATUS.map((status) => (
                              <SelectItem key={status} value={status}>
                                {SERVICE_STATUS_LABELS[status]}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="category_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Categoría</FormLabel>
                        <Select value={field.value} onValueChange={field.onChange}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Sin categoría" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="">Sin categoría</SelectItem>
                            {categories.map((cat) => (
                              <SelectItem key={cat.id} value={cat.id}>
                                {cat.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sku"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SKU / Código</FormLabel>
                        <FormControl>
                          <Input placeholder="Ej: SRV-001" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="short_description"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Descripción corta</FormLabel>
                        <FormControl>
                          <Input placeholder="Una breve descripción..." {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Descripción completa</FormLabel>
                        <FormControl>
                          <Textarea
                            className="min-h-[100px]"
                            placeholder="Descripción detallada del servicio..."
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Duration fields (for services) */}
                  {watchServiceType === 'service' && (
                    <>
                      <FormField
                        control={form.control}
                        name="duration_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Duración (minutos)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="60"
                                type="number"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="buffer_time_minutes"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tiempo buffer (minutos)</FormLabel>
                            <FormControl>
                              <Input
                                {...field}
                                placeholder="15"
                                type="number"
                                value={field.value ?? ''}
                                onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                              />
                            </FormControl>
                            <FormDescription>Tiempo entre citas</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                </div>
              </TabsContent>

              {/* Pricing Tab */}
              <TabsContent className="space-y-4 pt-4" value="pricing">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Precio *</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="0.00"
                            step="0.01"
                            type="number"
                            onChange={(e) => field.onChange(Number(e.target.value))}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="cost_price"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Costo</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="0.00"
                            step="0.01"
                            type="number"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormDescription>Para cálculo de margen</FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tax_rate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tasa de impuesto (%)</FormLabel>
                        <FormControl>
                          <Input
                            {...field}
                            placeholder="16"
                            type="number"
                            value={field.value ?? ''}
                            onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="taxable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Gravable</FormLabel>
                          <FormDescription>¿Aplica impuestos?</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="requires_deposit"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Requiere anticipo</FormLabel>
                          <FormDescription>Pago previo requerido</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  {form.watch('requires_deposit') && (
                    <FormField
                      control={form.control}
                      name="deposit_amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Monto de anticipo</FormLabel>
                          <FormControl>
                            <Input
                              {...field}
                              placeholder="0.00"
                              step="0.01"
                              type="number"
                              value={field.value ?? ''}
                              onChange={(e) => field.onChange(e.target.value ? Number(e.target.value) : undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="is_featured"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Destacado</FormLabel>
                          <FormDescription>Mostrar en destacados</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="is_bookable"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5">
                          <FormLabel>Reservable</FormLabel>
                          <FormDescription>Permitir reservas online</FormDescription>
                        </div>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
              </TabsContent>

              {/* Industry-specific Tab */}
              <TabsContent className="pt-4" value="industry">
                {!industryType ? (
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Selecciona el tipo de industria para ver campos adicionales personalizados.
                    </p>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {INDUSTRY_TYPE.filter((t) => t !== 'other').map((type) => (
                        <Button
                          key={type}
                          className="justify-start"
                          type="button"
                          variant="outline"
                        >
                          {INDUSTRY_TYPE_LABELS[type]}
                        </Button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <IndustryFieldsSection
                    customFields={watchCustomFields}
                    industryType={industryType}
                    serviceType={watchServiceType}
                    onFieldChange={handleCustomFieldChange}
                  />
                )}
              </TabsContent>
            </Tabs>

            <DialogFooter>
              <Button disabled={isPending} type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button disabled={isPending} type="submit">
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditing ? 'Guardar cambios' : 'Crear servicio'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

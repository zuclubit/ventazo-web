'use client';

import * as React from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, X } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
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

// ============================================
// Schema
// ============================================

const customerFormSchema = z.object({
  companyName: z.string().min(1, 'El nombre es requerido').max(255),
  email: z.string().email('Email invalido').max(255),
  phone: z.string().max(50).optional().or(z.literal('')),
  website: z.string().url('URL invalida').max(255).optional().or(z.literal('')),
  type: z.nativeEnum(CustomerType).optional(),
  tier: z.nativeEnum(CustomerTier).optional(),
  status: z.nativeEnum(CustomerStatus).optional(),
  notes: z.string().max(5000).optional().or(z.literal('')),
  tags: z.array(z.string()).optional(),
});

type CustomerFormData = z.infer<typeof customerFormSchema>;

// ============================================
// Props
// ============================================

interface CustomerFormDialogProps {
  customer?: Customer | null;
  open: boolean;
  onClose: () => void;
}

// ============================================
// Component
// ============================================

export function CustomerFormDialog({ customer, open, onClose }: CustomerFormDialogProps) {
  const isEditing = !!customer;
  const [tagInput, setTagInput] = React.useState('');
  const [tags, setTags] = React.useState<string[]>(customer?.tags || []);
  const { toast } = useToast();

  const createCustomer = useCreateCustomer();
  const updateCustomer = useUpdateCustomer();

  const isLoading = createCustomer.isPending || updateCustomer.isPending;

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      companyName: '',
      email: '',
      phone: '',
      website: '',
      type: CustomerType.COMPANY,
      tier: CustomerTier.STANDARD,
      status: CustomerStatus.ACTIVE,
      notes: '',
      tags: [],
    },
  });

  // Reset form when dialog opens/closes or customer changes
  React.useEffect(() => {
    if (open && customer) {
      reset({
        companyName: customer.companyName,
        email: customer.email,
        phone: customer.phone || '',
        website: customer.website || '',
        type: customer.type,
        tier: customer.tier,
        status: customer.status,
        notes: customer.notes || '',
        tags: customer.tags,
      });
      setTags(customer.tags);
    } else if (open && !customer) {
      reset({
        companyName: '',
        email: '',
        phone: '',
        website: '',
        type: CustomerType.COMPANY,
        tier: CustomerTier.STANDARD,
        status: CustomerStatus.ACTIVE,
        notes: '',
        tags: [],
      });
      setTags([]);
    }
  }, [open, customer, reset]);

  // Handle tag add
  const handleAddTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      const newTags = [...tags, tag];
      setTags(newTags);
      setValue('tags', newTags);
      setTagInput('');
    }
  };

  // Handle tag remove
  const handleRemoveTag = (tagToRemove: string) => {
    const newTags = tags.filter((t) => t !== tagToRemove);
    setTags(newTags);
    setValue('tags', newTags);
  };

  // Handle form submit
  const onSubmit = async (data: CustomerFormData) => {
    try {
      const payload = {
        ...data,
        phone: data.phone || undefined,
        website: data.website || undefined,
        notes: data.notes || undefined,
        tags,
      };

      if (isEditing && customer) {
        await updateCustomer.mutateAsync({
          customerId: customer.id,
          data: payload,
        });
        toast({
          title: 'Cliente actualizado',
          description: 'Los cambios se guardaron correctamente.',
        });
      } else {
        await createCustomer.mutateAsync(payload);
        toast({
          title: 'Cliente creado',
          description: 'El cliente se creo correctamente.',
        });
      }

      onClose();
    } catch (error) {
      console.error('Failed to save customer:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'No se pudo guardar el cliente. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Cliente' : 'Nuevo Cliente'}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? 'Modifica los datos del cliente'
              : 'Completa la informacion para crear un nuevo cliente'}
          </DialogDescription>
        </DialogHeader>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
          {/* Company Name & Email */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de la empresa *</Label>
              <Input
                disabled={isLoading}
                id="companyName"
                placeholder="Acme Inc."
                {...register('companyName')}
              />
              {errors.companyName && (
                <p className="text-sm text-destructive">{errors.companyName.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                disabled={isLoading}
                id="email"
                placeholder="contacto@empresa.com"
                type="email"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>
          </div>

          {/* Phone & Website */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="phone">Telefono</Label>
              <Input
                disabled={isLoading}
                id="phone"
                placeholder="+52 555 123 4567"
                {...register('phone')}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">{errors.phone.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">Sitio web</Label>
              <Input
                disabled={isLoading}
                id="website"
                placeholder="https://empresa.com"
                {...register('website')}
              />
              {errors.website && (
                <p className="text-sm text-destructive">{errors.website.message}</p>
              )}
            </div>
          </div>

          {/* Type, Tier & Status */}
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                defaultValue={watch('type')}
                disabled={isLoading}
                onValueChange={(value) => setValue('type', value as CustomerType)}
              >
                <SelectTrigger>
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
            </div>
            <div className="space-y-2">
              <Label>Tier</Label>
              <Select
                defaultValue={watch('tier')}
                disabled={isLoading}
                onValueChange={(value) => setValue('tier', value as CustomerTier)}
              >
                <SelectTrigger>
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
            </div>
            {isEditing && (
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  defaultValue={watch('status')}
                  disabled={isLoading}
                  onValueChange={(value) => setValue('status', value as CustomerStatus)}
                >
                  <SelectTrigger>
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
              </div>
            )}
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label>Etiquetas</Label>
            <div className="flex gap-2">
              <Input
                className="flex-1"
                disabled={isLoading}
                placeholder="Agregar etiqueta..."
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
              />
              <Button
                disabled={isLoading || !tagInput.trim()}
                type="button"
                variant="outline"
                onClick={handleAddTag}
              >
                Agregar
              </Button>
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tags.map((tag) => (
                  <Badge key={tag} className="gap-1" variant="secondary">
                    {tag}
                    <button
                      className="hover:bg-muted rounded-full"
                      disabled={isLoading}
                      type="button"
                      onClick={() => handleRemoveTag(tag)}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              className="min-h-[100px]"
              disabled={isLoading}
              id="notes"
              placeholder="Notas adicionales sobre el cliente..."
              {...register('notes')}
            />
            {errors.notes && (
              <p className="text-sm text-destructive">{errors.notes.message}</p>
            )}
          </div>

          <DialogFooter>
            <Button disabled={isLoading} type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button disabled={isLoading} type="submit">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isEditing ? 'Guardando...' : 'Creando...'}
                </>
              ) : isEditing ? (
                'Guardar Cambios'
              ) : (
                'Crear Cliente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

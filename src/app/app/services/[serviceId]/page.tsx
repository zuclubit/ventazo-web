'use client';

import * as React from 'react';

import { useParams, useRouter } from 'next/navigation';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Archive,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  DollarSign,
  Edit,
  FolderOpen,
  Hash,
  Loader2,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Settings,
  Tag,
  Trash2,
  User,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { RBACGuard } from '@/lib/auth';
import {
  CUSTOM_FIELD_TYPE,
  CUSTOM_FIELD_TYPE_LABELS,
  formatDuration,
  formatPrice,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_LABELS,
  SERVICE_TYPE_COLORS,
  SERVICE_TYPE_LABELS,
  useAddCustomField,
  useDeleteCustomField,
  useServiceDetail,
  useUpdateCustomField,
  type CustomFieldType,
  type ServiceActivity,
  type ServiceCustomField,
} from '@/lib/services';

import { DeleteServiceDialog } from '../components/delete-service-dialog';
import { ServiceFormDialog } from '../components/service-form-dialog';

// ============================================
// Loading State
// ============================================

function ServiceDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
        </div>
      </div>
      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-4">
          <Skeleton className="h-64" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  );
}

// ============================================
// Overview Tab
// ============================================

function OverviewTab({
  service,
}: {
  service: NonNullable<ReturnType<typeof useServiceDetail>['service']>;
}) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      {/* Main Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Tipo</p>
              <Badge className={SERVICE_TYPE_COLORS[service.service_type]} variant="secondary">
                {SERVICE_TYPE_LABELS[service.service_type]}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Estado</p>
              <Badge className={SERVICE_STATUS_COLORS[service.status]} variant="secondary">
                {SERVICE_STATUS_LABELS[service.status]}
              </Badge>
            </div>
          </div>

          {service.description && (
            <div>
              <p className="text-sm text-muted-foreground">Descripción</p>
              <p className="text-sm mt-1">{service.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            {service.category && (
              <div className="flex items-center gap-2">
                <FolderOpen className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Categoría</p>
                  <p className="text-sm font-medium">{service.category.name}</p>
                </div>
              </div>
            )}
            {service.sku && (
              <div className="flex items-center gap-2">
                <Hash className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">SKU</p>
                  <p className="text-sm font-medium">{service.sku}</p>
                </div>
              </div>
            )}
          </div>

          {service.tags.length > 0 && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">Etiquetas</p>
              <div className="flex flex-wrap gap-1">
                {service.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    <Tag className="mr-1 h-3 w-3" />
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Precios</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold">{formatPrice(service.price, service.currency)}</p>
              <p className="text-sm text-muted-foreground">Precio de venta</p>
            </div>
          </div>

          <Separator />

          <div className="grid grid-cols-2 gap-4 text-sm">
            {service.cost_price && (
              <div>
                <p className="text-muted-foreground">Costo</p>
                <p className="font-medium">{formatPrice(service.cost_price, service.currency)}</p>
              </div>
            )}
            {service.tax_rate && (
              <div>
                <p className="text-muted-foreground">Impuesto</p>
                <p className="font-medium">{service.tax_rate}%</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Gravable</p>
              <p className="font-medium">{service.taxable ? 'Sí' : 'No'}</p>
            </div>
            {service.requires_deposit && (
              <div>
                <p className="text-muted-foreground">Anticipo</p>
                <p className="font-medium">
                  {service.deposit_amount
                    ? formatPrice(service.deposit_amount, service.currency)
                    : 'Requerido'}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Service Settings */}
      {service.service_type === 'service' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configuración de Servicio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <div>
                  <p className="text-xs text-muted-foreground">Duración</p>
                  <p className="text-sm font-medium">{formatDuration(service.duration_minutes)}</p>
                </div>
              </div>
              {service.buffer_time_minutes && (
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Buffer</p>
                    <p className="text-sm font-medium">{formatDuration(service.buffer_time_minutes)}</p>
                  </div>
                </div>
              )}
              {service.max_capacity && (
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Capacidad</p>
                    <p className="text-sm font-medium">{service.max_capacity} personas</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div className="flex flex-wrap gap-2">
              {service.is_featured && (
                <Badge variant="secondary">
                  <CheckCircle className="mr-1 h-3 w-3" />
                  Destacado
                </Badge>
              )}
              {service.is_bookable && (
                <Badge variant="secondary">
                  <Calendar className="mr-1 h-3 w-3" />
                  Reservable
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Custom Fields Display */}
      {Object.keys(service.custom_fields || {}).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Campos Personalizados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(service.custom_fields).map(([key, value]) => (
                <div key={key}>
                  <p className="text-sm text-muted-foreground capitalize">{key.replace(/_/g, ' ')}</p>
                  <p className="text-sm font-medium">
                    {Array.isArray(value) ? value.join(', ') : String(value)}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

// ============================================
// Custom Fields Tab
// ============================================

function CustomFieldsTab({
  serviceId,
  fields,
  isLoading,
}: {
  serviceId: string;
  fields: ServiceCustomField[];
  isLoading: boolean;
}) {
  const { toast } = useToast();
  const [isAdding, setIsAdding] = React.useState(false);
  const [newField, setNewField] = React.useState({
    key: '',
    label: '',
    field_type: 'text' as CustomFieldType,
    value: '',
  });

  const addField = useAddCustomField();
  const _updateField = useUpdateCustomField(); // Reserved for inline editing
  const deleteField = useDeleteCustomField();

  const handleAddField = async () => {
    if (!newField.key || !newField.label) {
      toast({
        title: 'Error',
        description: 'Completa todos los campos requeridos.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await addField.mutateAsync({
        service_id: serviceId,
        key: newField.key,
        label: newField.label,
        field_type: newField.field_type,
        value: newField.value,
        required: false,
      });
      toast({
        title: 'Campo agregado',
        description: 'El campo personalizado ha sido agregado.',
      });
      setNewField({ key: '', label: '', field_type: 'text', value: '' });
      setIsAdding(false);
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo agregar el campo.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteField = async (field: ServiceCustomField) => {
    try {
      await deleteField.mutateAsync({ id: field.id, service_id: serviceId });
      toast({
        title: 'Campo eliminado',
        description: 'El campo personalizado ha sido eliminado.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el campo.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Campos Personalizados</CardTitle>
          <CardDescription>Agrega información adicional específica</CardDescription>
        </div>
        <RBACGuard fallback={null} minRole="manager">
          <Button size="sm" variant="outline" onClick={() => setIsAdding(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar campo
          </Button>
        </RBACGuard>
      </CardHeader>
      <CardContent>
        {isAdding && (
          <div className="mb-6 p-4 border rounded-lg space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Clave (key)</Label>
                <Input
                  placeholder="ej: warranty_months"
                  value={newField.key}
                  onChange={(e) => setNewField({ ...newField, key: e.target.value.toLowerCase().replace(/\s/g, '_') })}
                />
              </div>
              <div>
                <Label>Etiqueta</Label>
                <Input
                  placeholder="ej: Meses de garantía"
                  value={newField.label}
                  onChange={(e) => setNewField({ ...newField, label: e.target.value })}
                />
              </div>
              <div>
                <Label>Tipo</Label>
                <Select
                  value={newField.field_type}
                  onValueChange={(value) => setNewField({ ...newField, field_type: value as CustomFieldType })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CUSTOM_FIELD_TYPE.map((type) => (
                      <SelectItem key={type} value={type}>
                        {CUSTOM_FIELD_TYPE_LABELS[type]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Valor inicial</Label>
                <Input
                  placeholder="Valor"
                  value={newField.value}
                  onChange={(e) => setNewField({ ...newField, value: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button disabled={addField.isPending} size="sm" onClick={handleAddField}>
                {addField.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Guardar
              </Button>
              <Button size="sm" variant="outline" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
            </div>
          </div>
        )}

        {fields.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Settings className="mx-auto h-8 w-8 mb-2" />
            <p>No hay campos personalizados</p>
            <p className="text-sm">Agrega campos para almacenar información adicional</p>
          </div>
        ) : (
          <div className="space-y-3">
            {fields.map((field) => (
              <div
                key={field.id}
                className="flex items-center justify-between p-3 border rounded-lg"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{field.label}</p>
                    <Badge variant="outline">{CUSTOM_FIELD_TYPE_LABELS[field.field_type]}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {String(field.value) || '(sin valor)'}
                  </p>
                </div>
                <RBACGuard fallback={null} minRole="manager">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDeleteField(field)}
                  >
                    <Trash2 className="h-4 w-4 text-muted-foreground" />
                  </Button>
                </RBACGuard>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Activity Tab
// ============================================

function ActivityTab({
  activity,
  isLoading,
}: {
  activity: ServiceActivity[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const actionLabels: Record<string, string> = {
    created: 'Servicio creado',
    updated: 'Servicio actualizado',
    archived: 'Servicio archivado',
    activated: 'Servicio activado',
    deactivated: 'Servicio desactivado',
    price_changed: 'Precio modificado',
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Historial de Actividad</CardTitle>
        <CardDescription>Registro de cambios y operaciones</CardDescription>
      </CardHeader>
      <CardContent>
        {activity.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Clock className="mx-auto h-8 w-8 mb-2" />
            <p>No hay actividad registrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activity.map((item) => (
              <div key={item.id} className="flex gap-3">
                <div className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                <div className="flex-1">
                  <p className="font-medium">{actionLabels[item.action] ?? item.action}</p>
                  <p className="text-sm text-muted-foreground">{item.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {format(new Date(item.performed_at), "d 'de' MMMM, yyyy 'a las' HH:mm", {
                      locale: es,
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function ServiceDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const serviceId = params['serviceId'] as string;

  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const {
    service,
    activity,
    customFields,
    categories,
    isLoading,
    isLoadingActivity,
    isLoadingCustomFields,
    archiveService,
    activateService,
  } = useServiceDetail(serviceId);

  const handleArchive = async () => {
    if (!service) return;
    try {
      await archiveService.mutateAsync(service.id);
      toast({
        title: 'Servicio archivado',
        description: 'El servicio ha sido archivado correctamente.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo archivar el servicio.',
        variant: 'destructive',
      });
    }
  };

  const handleActivate = async () => {
    if (!service) return;
    try {
      await activateService.mutateAsync(service.id);
      toast({
        title: 'Servicio activado',
        description: 'El servicio ha sido activado correctamente.',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo activar el servicio.',
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return <ServiceDetailSkeleton />;
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <Package className="h-12 w-12 text-muted-foreground" />
        <h2 className="text-lg font-medium">Servicio no encontrado</h2>
        <Button variant="outline" onClick={() => router.push('/app/services')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Volver a servicios
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button size="icon" variant="ghost" onClick={() => router.push('/app/services')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight">{service.name}</h1>
              <Badge className={SERVICE_STATUS_COLORS[service.status]} variant="secondary">
                {SERVICE_STATUS_LABELS[service.status]}
              </Badge>
            </div>
            {service.short_description && (
              <p className="text-muted-foreground mt-1">{service.short_description}</p>
            )}
          </div>
        </div>

        <div className="flex gap-2">
          <RBACGuard fallback={null} minRole="manager">
            <Button variant="outline" onClick={() => setFormDialogOpen(true)}>
              <Edit className="mr-2 h-4 w-4" />
              Editar
            </Button>
          </RBACGuard>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="icon" variant="outline">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <RBACGuard fallback={null} minRole="manager">
                {service.status === 'active' ? (
                  <DropdownMenuItem onClick={handleArchive}>
                    <Archive className="mr-2 h-4 w-4" />
                    Archivar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={handleActivate}>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Activar
                  </DropdownMenuItem>
                )}
              </RBACGuard>
              <RBACGuard fallback={null} minRole="admin">
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => setDeleteDialogOpen(true)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Eliminar
                </DropdownMenuItem>
              </RBACGuard>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Tabs */}
      <Tabs className="w-full" defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="custom-fields">Campos</TabsTrigger>
          <TabsTrigger value="activity">Actividad</TabsTrigger>
        </TabsList>

        <TabsContent className="mt-6" value="overview">
          <OverviewTab service={service} />
        </TabsContent>

        <TabsContent className="mt-6" value="custom-fields">
          <CustomFieldsTab
            fields={customFields}
            isLoading={isLoadingCustomFields}
            serviceId={serviceId}
          />
        </TabsContent>

        <TabsContent className="mt-6" value="activity">
          <ActivityTab activity={activity} isLoading={isLoadingActivity} />
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <ServiceFormDialog
        categories={categories}
        open={formDialogOpen}
        service={service}
        onClose={() => setFormDialogOpen(false)}
      />

      <DeleteServiceDialog
        open={deleteDialogOpen}
        service={service}
        onClose={() => {
          setDeleteDialogOpen(false);
          router.push('/app/services');
        }}
      />
    </div>
  );
}

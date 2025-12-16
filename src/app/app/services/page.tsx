'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  Archive,
  CheckCircle,
  DollarSign,
  Edit,
  Eye,
  Filter,
  FolderOpen,
  Layers,
  MoreHorizontal,
  Package,
  Plus,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  Wrench,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { RBACGuard } from '@/lib/auth';
import {
  formatDuration,
  formatPrice,
  SERVICE_STATUS,
  SERVICE_STATUS_COLORS,
  SERVICE_STATUS_LABELS,
  SERVICE_TYPE,
  SERVICE_TYPE_COLORS,
  SERVICE_TYPE_LABELS,
  useServiceManagement,
  type Service,
  type ServicesFilters,
  type ServiceStatus,
  type ServiceType,
} from '@/lib/services';

import { DeleteServiceDialog } from './components/delete-service-dialog';
import { ServiceFormDialog } from './components/service-form-dialog';

// ============================================
// Statistics Cards
// ============================================

function StatisticsCards({
  statistics,
  isLoading,
}: {
  statistics: {
    total: number;
    by_type: Record<ServiceType, number>;
    by_status: Record<ServiceStatus, number>;
    active: number;
  } | undefined;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const stats = [
    {
      title: 'Total Servicios',
      value: statistics?.total ?? 0,
      icon: Layers,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Activos',
      value: statistics?.active ?? 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Productos',
      value: statistics?.by_type?.product ?? 0,
      icon: ShoppingBag,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Paquetes',
      value: statistics?.by_type?.package ?? 0,
      icon: Package,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <div className={`rounded-full p-2 ${stat.bgColor}`}>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stat.value}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Filters
// ============================================

function ServicesFiltersBar({
  filters,
  onFiltersChange,
  categories,
}: {
  filters: ServicesFilters;
  onFiltersChange: (filters: ServicesFilters) => void;
  categories: { id: string; name: string }[];
}) {
  const [search, setSearch] = React.useState(filters.search ?? '');

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ ...filters, search });
  };

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <form className="flex flex-1 gap-2" onSubmit={handleSearchSubmit}>
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Buscar servicios..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button size="icon" type="submit" variant="secondary">
          <Search className="h-4 w-4" />
        </Button>
      </form>

      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.service_type?.[0] ?? 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              service_type: value === 'all' ? undefined : [value as ServiceType],
            })
          }
        >
          <SelectTrigger className="w-[140px]">
            <Wrench className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Tipo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {SERVICE_TYPE.map((type) => (
              <SelectItem key={type} value={type}>
                {SERVICE_TYPE_LABELS[type]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.status?.[0] ?? 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              status: value === 'all' ? undefined : [value as ServiceStatus],
            })
          }
        >
          <SelectTrigger className="w-[140px]">
            <Filter className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            {SERVICE_STATUS.map((status) => (
              <SelectItem key={status} value={status}>
                {SERVICE_STATUS_LABELS[status]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={filters.category_id ?? 'all'}
          onValueChange={(value) =>
            onFiltersChange({
              ...filters,
              category_id: value === 'all' ? undefined : value,
            })
          }
        >
          <SelectTrigger className="w-[160px]">
            <FolderOpen className="mr-2 h-4 w-4" />
            <SelectValue placeholder="Categoría" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(filters.search || filters.service_type || filters.status || filters.category_id) && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              setSearch('');
              onFiltersChange({});
            }}
          >
            <XCircle className="mr-2 h-4 w-4" />
            Limpiar
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================
// Services Table
// ============================================

function ServicesTable({
  services,
  isLoading,
  onEdit,
  onView,
  onArchive,
  onActivate,
  onDelete,
}: {
  services: Service[];
  isLoading: boolean;
  onEdit: (service: Service) => void;
  onView: (service: Service) => void;
  onArchive: (service: Service) => void;
  onActivate: (service: Service) => void;
  onDelete: (service: Service) => void;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Precio</TableHead>
                <TableHead>Duración</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[70px]">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {[1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  }

  if (services.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <Package className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No hay servicios</h3>
          <p className="text-muted-foreground text-sm mt-1">
            Crea tu primer servicio para comenzar
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Categoría</TableHead>
              <TableHead>Precio</TableHead>
              <TableHead>Duración</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="w-[70px]">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((service) => (
              <TableRow
                key={service.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => onView(service)}
              >
                <TableCell>
                  <div className="flex flex-col">
                    <span className="font-medium">{service.name}</span>
                    {service.short_description && (
                      <span className="text-sm text-muted-foreground line-clamp-1">
                        {service.short_description}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={SERVICE_TYPE_COLORS[service.service_type]} variant="secondary">
                    {SERVICE_TYPE_LABELS[service.service_type]}
                  </Badge>
                </TableCell>
                <TableCell>
                  {service.category?.name ?? (
                    <span className="text-muted-foreground">Sin categoría</span>
                  )}
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <DollarSign className="mr-1 h-3 w-3 text-muted-foreground" />
                    {formatPrice(service.price, service.currency)}
                  </div>
                </TableCell>
                <TableCell>
                  {formatDuration(service.duration_minutes)}
                </TableCell>
                <TableCell>
                  <Badge className={SERVICE_STATUS_COLORS[service.status]} variant="secondary">
                    {SERVICE_STATUS_LABELS[service.status]}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onView(service); }}>
                        <Eye className="mr-2 h-4 w-4" />
                        Ver detalle
                      </DropdownMenuItem>
                      <RBACGuard fallback={null} minRole="manager">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(service); }}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {service.status === 'active' ? (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(service); }}>
                            <Archive className="mr-2 h-4 w-4" />
                            Archivar
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onActivate(service); }}>
                            <RefreshCw className="mr-2 h-4 w-4" />
                            Activar
                          </DropdownMenuItem>
                        )}
                      </RBACGuard>
                      <RBACGuard fallback={null} minRole="admin">
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); onDelete(service); }}
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Eliminar
                        </DropdownMenuItem>
                      </RBACGuard>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function ServicesPage() {
  const router = useRouter();
  const [filters, setFilters] = React.useState<ServicesFilters>({});
  const [formDialogOpen, setFormDialogOpen] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);
  const [selectedService, setSelectedService] = React.useState<Service | null>(null);

  const {
    services,
    statistics,
    categories,
    isLoading,
    isLoadingStatistics,
    archiveService,
    activateService,
  } = useServiceManagement(filters);

  const handleEdit = (service: Service) => {
    setSelectedService(service);
    setFormDialogOpen(true);
  };

  const handleView = (service: Service) => {
    router.push(`/app/services/${service.id}`);
  };

  const handleArchive = async (service: Service) => {
    await archiveService.mutateAsync(service.id);
  };

  const handleActivate = async (service: Service) => {
    await activateService.mutateAsync(service.id);
  };

  const handleDelete = (service: Service) => {
    setSelectedService(service);
    setDeleteDialogOpen(true);
  };

  const handleCreateNew = () => {
    setSelectedService(null);
    setFormDialogOpen(true);
  };

  const handleFormClose = () => {
    setFormDialogOpen(false);
    setSelectedService(null);
  };

  const handleDeleteClose = () => {
    setDeleteDialogOpen(false);
    setSelectedService(null);
  };

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Servicios & Catálogo</h1>
          <p className="text-muted-foreground">
            Gestiona tus servicios, productos y paquetes
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/app/services/categories')}>
            <FolderOpen className="mr-2 h-4 w-4" />
            Categorías
          </Button>
          <RBACGuard fallback={null} minRole="manager">
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo
            </Button>
          </RBACGuard>
        </div>
      </div>

      {/* Statistics */}
      <StatisticsCards isLoading={isLoadingStatistics} statistics={statistics} />

      {/* Filters */}
      <ServicesFiltersBar
        categories={categories}
        filters={filters}
        onFiltersChange={setFilters}
      />

      {/* Table */}
      <ServicesTable
        isLoading={isLoading}
        services={services}
        onActivate={handleActivate}
        onArchive={handleArchive}
        onDelete={handleDelete}
        onEdit={handleEdit}
        onView={handleView}
      />

      {/* Dialogs */}
      <ServiceFormDialog
        categories={categories}
        open={formDialogOpen}
        service={selectedService}
        onClose={handleFormClose}
      />

      <DeleteServiceDialog
        open={deleteDialogOpen}
        service={selectedService}
        onClose={handleDeleteClose}
      />
    </div>
  );
}

'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  Building2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
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
import { Separator } from '@/components/ui/separator';
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
  useCustomerManagement,
  CustomerStatus,
  CustomerTier,
  STATUS_LABELS,
  STATUS_COLORS,
  TIER_LABELS,
  TIER_COLORS,
  type Customer,
} from '@/lib/customers';

import { CustomerFormDialog } from './components/customer-form-dialog';
import { DeleteCustomerDialog } from './components/delete-customer-dialog';

// ============================================
// Customers List Page
// ============================================

export default function CustomersPage() {
  const router = useRouter();

  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<CustomerStatus | 'all'>('all');
  const [tierFilter, setTierFilter] = React.useState<CustomerTier | 'all'>('all');
  const [page, setPage] = React.useState(1);
  const pageSize = 20;

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = React.useState('');
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Dialogs
  const [isCreateOpen, setIsCreateOpen] = React.useState(false);
  const [editCustomer, setEditCustomer] = React.useState<Customer | null>(null);
  const [deleteCustomer, setDeleteCustomer] = React.useState<Customer | null>(null);

  // Data
  const {
    customers,
    meta,
    statistics,
    isLoading,
    isStatisticsLoading,
    refetchCustomers,
  } = useCustomerManagement({
    page,
    limit: pageSize,
    searchTerm: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    tier: tierFilter !== 'all' ? tierFilter : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, tierFilter]);

  // Format currency
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(value / 100);
  };

  // Get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Clientes</h1>
          <p className="text-muted-foreground">
            Gestiona tu base de clientes y sus relaciones
          </p>
        </div>
        <RBACGuard fallback={null} minRole="sales_rep">
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nuevo Cliente
          </Button>
        </RBACGuard>
      </div>

      <Separator />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                statistics?.totalCustomers ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.newCustomersThisMonth ?? 0} nuevos este mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Activos</CardTitle>
            <Building2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                statistics?.activeCustomers ?? 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">En Riesgo</CardTitle>
            <Building2 className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                statistics?.atRiskCustomers ?? 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(statistics?.totalRevenue ?? 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              LTV promedio: {formatCurrency(statistics?.averageLifetimeValue ?? 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            {/* Search */}
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Buscar por nombre, email, telefono..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as CustomerStatus | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.values(CustomerStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Tier Filter */}
            <Select
              value={tierFilter}
              onValueChange={(value) => setTierFilter(value as CustomerTier | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los tiers</SelectItem>
                {Object.values(CustomerTier).map((tier) => (
                  <SelectItem key={tier} value={tier}>
                    {TIER_LABELS[tier]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button size="icon" variant="outline" onClick={() => refetchCustomers()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Clientes</CardTitle>
          <CardDescription>
            {meta?.total ?? 0} clientes encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : customers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">Sin clientes</p>
              <p className="text-sm text-muted-foreground">
                No se encontraron clientes con los filtros seleccionados
              </p>
              <RBACGuard fallback={null} minRole="sales_rep">
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primer cliente
                </Button>
              </RBACGuard>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Tier</TableHead>
                    <TableHead className="text-right">Ingresos</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((customer) => (
                    <TableRow
                      key={customer.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/app/customers/${customer.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{getInitials(customer.companyName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{customer.companyName}</p>
                            <p className="text-sm text-muted-foreground">
                              {customer.website || '-'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{customer.email}</p>
                          <p className="text-sm text-muted-foreground">{customer.phone || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[customer.status]}>
                          {STATUS_LABELS[customer.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={TIER_COLORS[customer.tier]} variant="outline">
                          {TIER_LABELS[customer.tier]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(customer.totalRevenue)}
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {customer.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} className="text-xs" variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                          {customer.tags.length > 2 && (
                            <Badge className="text-xs" variant="secondary">
                              +{customer.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button size="icon" variant="ghost">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/app/customers/${customer.id}`);
                              }}
                            >
                              Ver detalles
                            </DropdownMenuItem>
                            <RBACGuard fallback={null} minRole="sales_rep">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditCustomer(customer);
                                }}
                              >
                                Editar
                              </DropdownMenuItem>
                            </RBACGuard>
                            <RBACGuard fallback={null} minRole="admin">
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteCustomer(customer);
                                }}
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

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4 mt-4">
                  <p className="text-sm text-muted-foreground">
                    Pagina {meta.page} de {meta.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      disabled={page <= 1}
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      disabled={page >= meta.totalPages}
                      size="sm"
                      variant="outline"
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Siguiente
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <CustomerFormDialog
        customer={editCustomer}
        open={isCreateOpen || !!editCustomer}
        onClose={() => {
          setIsCreateOpen(false);
          setEditCustomer(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteCustomerDialog
        customer={deleteCustomer}
        open={!!deleteCustomer}
        onClose={() => setDeleteCustomer(null)}
      />
    </div>
  );
}

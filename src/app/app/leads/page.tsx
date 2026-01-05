'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  ChevronLeft,
  ChevronRight,
  Filter,
  Kanban,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  UserPlus,
  Users,
  Zap,
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
  useLeadsManagement,
  LeadStatus,
  LeadSource,
  STATUS_LABELS,
  STATUS_COLORS,
  SOURCE_LABELS,
  type Lead,
} from '@/lib/leads';

import { ConvertLeadDialog } from './components/convert-lead-dialog';
import { DeleteLeadDialog } from './components/delete-lead-dialog';
import { LeadFormDialog } from './components/lead-form-dialog';

// ============================================
// Leads List Page
// ============================================

export default function LeadsPage() {
  const router = useRouter();

  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<LeadStatus | 'all'>('all');
  const [sourceFilter, setSourceFilter] = React.useState<LeadSource | 'all'>('all');
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
  const [editLead, setEditLead] = React.useState<Lead | null>(null);
  const [deleteLead, setDeleteLead] = React.useState<Lead | null>(null);
  const [convertLead, setConvertLead] = React.useState<Lead | null>(null);

  // Data
  const {
    leads,
    meta,
    statistics,
    isLoading,
    isStatsLoading,
    refetchLeads,
  } = useLeadsManagement({
    page,
    limit: pageSize,
    searchTerm: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    source: sourceFilter !== 'all' ? sourceFilter : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, sourceFilter]);

  // Get initials
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Leads</h1>
          <p className="text-muted-foreground">
            Gestiona tus prospectos y convierte oportunidades
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/app/leads/pipeline')}>
            <Kanban className="mr-2 h-4 w-4" />
            Pipeline
          </Button>
          <RBACGuard fallback={null} minRole="sales_rep">
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lead
            </Button>
          </RBACGuard>
        </div>
      </div>

      <Separator />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                statistics?.total ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.newThisMonth ?? 0} nuevos este mes
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nuevos</CardTitle>
            <UserPlus className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isStatsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                statistics?.byStatus?.[LeadStatus.NEW] ?? 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Calificados</CardTitle>
            <Zap className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isStatsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                statistics?.byStatus?.[LeadStatus.QUALIFIED] ?? 0
              )}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Convertidos</CardTitle>
            <Users className="h-4 w-4 text-purple-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {isStatsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                statistics?.convertedThisMonth ?? 0
              )}
            </div>
            <p className="text-xs text-muted-foreground">este mes</p>
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
                  placeholder="Buscar por nombre, email, empresa..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as LeadStatus | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {Object.values(LeadStatus).map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Source Filter */}
            <Select
              value={sourceFilter}
              onValueChange={(value) => setSourceFilter(value as LeadSource | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Fuente" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las fuentes</SelectItem>
                {Object.values(LeadSource).map((source) => (
                  <SelectItem key={source} value={source}>
                    {SOURCE_LABELS[source]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button size="icon" variant="outline" onClick={() => refetchLeads()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Leads</CardTitle>
          <CardDescription>
            {meta?.total ?? 0} leads encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Users className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">Sin leads</p>
              <p className="text-sm text-muted-foreground">
                No se encontraron leads con los filtros seleccionados
              </p>
              <RBACGuard fallback={null} minRole="sales_rep">
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primer lead
                </Button>
              </RBACGuard>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Contacto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fuente</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Actualizado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/app/leads/${lead.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{getInitials(lead.fullName)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{lead.fullName}</p>
                            <p className="text-sm text-muted-foreground">
                              {lead.companyName || '-'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="text-sm">{lead.email}</p>
                          <p className="text-sm text-muted-foreground">{lead.phone || '-'}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[lead.status]}>
                          {STATUS_LABELS[lead.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {SOURCE_LABELS[lead.source]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div
                            className="h-2 w-16 rounded-full bg-gray-200"
                            title={`Score: ${lead.score}`}
                          >
                            <div
                              className={`h-full rounded-full ${
                                lead.score >= 70
                                  ? 'bg-green-500'
                                  : lead.score >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${lead.score}%` }}
                            />
                          </div>
                          <span className="text-sm text-muted-foreground">{lead.score}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {lead.tags.slice(0, 2).map((tag) => (
                            <Badge key={tag} className="text-xs" variant="secondary">
                              {tag}
                            </Badge>
                          ))}
                          {lead.tags.length > 2 && (
                            <Badge className="text-xs" variant="secondary">
                              +{lead.tags.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(lead.updatedAt)}
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
                                router.push(`/app/leads/${lead.id}`);
                              }}
                            >
                              Ver detalles
                            </DropdownMenuItem>
                            <RBACGuard fallback={null} minRole="sales_rep">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditLead(lead);
                                }}
                              >
                                Editar
                              </DropdownMenuItem>
                              {lead.status === LeadStatus.QUALIFIED && (
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setConvertLead(lead);
                                  }}
                                >
                                  Convertir a Cliente
                                </DropdownMenuItem>
                              )}
                            </RBACGuard>
                            <RBACGuard fallback={null} minRole="admin">
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteLead(lead);
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
      <LeadFormDialog
        lead={editLead}
        open={isCreateOpen || !!editLead}
        onClose={() => {
          setIsCreateOpen(false);
          setEditLead(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteLeadDialog
        lead={deleteLead}
        open={!!deleteLead}
        onClose={() => setDeleteLead(null)}
      />

      {/* Convert Dialog */}
      <ConvertLeadDialog
        lead={convertLead}
        open={!!convertLead}
        onClose={() => setConvertLead(null)}
      />
    </div>
  );
}

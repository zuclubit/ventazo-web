'use client';

import * as React from 'react';

import { useRouter } from 'next/navigation';

import {
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Filter,
  Kanban,
  Loader2,
  Minus,
  MoreHorizontal,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Target,
  TrendingUp,
  Trash2,
  Trophy,
  XCircle,
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
  useOpportunityManagement,
  usePipelineStages,
  type Opportunity,
  type OpportunityStatus,
  type OpportunityPriority,
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  OPPORTUNITY_STATUS,
  OPPORTUNITY_PRIORITY,
  formatCurrency,
  calculateForecast,
} from '@/lib/opportunities';

import { DeleteOpportunityDialog } from './components/delete-opportunity-dialog';
import { OpportunityFormDialog } from './components/opportunity-form-dialog';
import { WinLostDialog } from './components/win-lost-dialog';

// ============================================
// Opportunities List Page
// ============================================

export default function OpportunitiesPage() {
  const router = useRouter();

  // Filters
  const [searchTerm, setSearchTerm] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<OpportunityStatus | 'all'>('all');
  const [stageFilter, setStageFilter] = React.useState<string>('all');
  const [priorityFilter, setPriorityFilter] = React.useState<OpportunityPriority | 'all'>('all');
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
  const [editOpportunity, setEditOpportunity] = React.useState<Opportunity | null>(null);
  const [deleteOpportunity, setDeleteOpportunity] = React.useState<Opportunity | null>(null);
  const [winLostOpportunity, setWinLostOpportunity] = React.useState<{ opportunity: Opportunity; action: 'win' | 'lost' } | null>(null);

  // Pipeline stages for filter
  const { data: stages } = usePipelineStages();

  // Data
  const {
    opportunities,
    meta,
    statistics,
    isLoading,
    isStatisticsLoading,
    refetchOpportunities,
  } = useOpportunityManagement({
    page,
    limit: pageSize,
    searchTerm: debouncedSearch || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    stageId: stageFilter !== 'all' ? stageFilter : undefined,
    priority: priorityFilter !== 'all' ? priorityFilter : undefined,
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });

  // Reset page on filter change
  React.useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter, stageFilter, priorityFilter]);

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
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  // Get priority icon
  const getPriorityIcon = (priority: OpportunityPriority) => {
    switch (priority) {
      case 'critical':
      case 'high':
        return <ArrowUp className="h-3 w-3" />;
      case 'low':
        return <ArrowDown className="h-3 w-3" />;
      default:
        return <Minus className="h-3 w-3" />;
    }
  };

  return (
    <div className="space-y-6 p-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Oportunidades</h1>
          <p className="text-muted-foreground">
            Gestiona tus oportunidades de venta y cierra negocios
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push('/app/opportunities/pipeline')}>
            <Kanban className="mr-2 h-4 w-4" />
            Pipeline
          </Button>
          <RBACGuard fallback={null} minRole="sales_rep">
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nueva Oportunidad
            </Button>
          </RBACGuard>
        </div>
      </div>

      <Separator />

      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(statistics?.totalAmount ?? 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.total ?? 0} oportunidades abiertas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Forecast</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(statistics?.totalForecast ?? 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              valor ponderado
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ganadas</CardTitle>
            <Trophy className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                formatCurrency(statistics?.wonAmount ?? 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              {statistics?.won ?? 0} cerradas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Win Rate</CardTitle>
            <Percent className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {isStatisticsLoading ? (
                <Loader2 className="h-5 w-5 animate-spin" />
              ) : (
                `${(statistics?.winRate ?? 0).toFixed(1)}%`
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              tasa de conversión
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
                  placeholder="Buscar por titulo, cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as OpportunityStatus | 'all')}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                {OPPORTUNITY_STATUS.map((status) => (
                  <SelectItem key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Stage Filter */}
            <Select
              value={stageFilter}
              onValueChange={(value) => setStageFilter(value)}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Etapa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las etapas</SelectItem>
                {stages?.map((stage) => (
                  <SelectItem key={stage.id} value={stage.id}>
                    {stage.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
            <Select
              value={priorityFilter}
              onValueChange={(value) => setPriorityFilter(value as OpportunityPriority | 'all')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Prioridad" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas las prioridades</SelectItem>
                {OPPORTUNITY_PRIORITY.map((priority) => (
                  <SelectItem key={priority} value={priority}>
                    {PRIORITY_LABELS[priority]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Refresh */}
            <Button size="icon" variant="outline" onClick={() => refetchOpportunities()}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Opportunities Table */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Oportunidades</CardTitle>
          <CardDescription>
            {meta?.total ?? 0} oportunidades encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : opportunities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Target className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">Sin oportunidades</p>
              <p className="text-sm text-muted-foreground">
                No se encontraron oportunidades con los filtros seleccionados
              </p>
              <RBACGuard fallback={null} minRole="sales_rep">
                <Button className="mt-4" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Crear primera oportunidad
                </Button>
              </RBACGuard>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Oportunidad</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Etapa</TableHead>
                    <TableHead className="text-right">Monto</TableHead>
                    <TableHead className="text-center">Prob.</TableHead>
                    <TableHead className="text-right">Forecast</TableHead>
                    <TableHead>Prioridad</TableHead>
                    <TableHead>Cierre Esperado</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {opportunities.map((opp) => (
                    <TableRow
                      key={opp.id}
                      className="cursor-pointer"
                      onClick={() => router.push(`/app/opportunities/${opp.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{getInitials(opp.title)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{opp.title}</p>
                            <p className="text-sm text-muted-foreground">
                              {opp.customer?.name || opp.lead?.fullName || '-'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={STATUS_COLORS[opp.status]}>
                          {STATUS_LABELS[opp.status]}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {opp.stage ? (
                          <Badge
                            style={{ borderColor: opp.stage.color, color: opp.stage.color }}
                            variant="outline"
                          >
                            {opp.stage.label}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(opp.amount, opp.currency)}
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-1">
                          <div
                            className="h-2 w-12 rounded-full bg-gray-200"
                            title={`${opp.probability}%`}
                          >
                            <div
                              className={`h-full rounded-full ${
                                opp.probability >= 70
                                  ? 'bg-green-500'
                                  : opp.probability >= 40
                                  ? 'bg-yellow-500'
                                  : 'bg-red-500'
                              }`}
                              style={{ width: `${opp.probability}%` }}
                            />
                          </div>
                          <span className="text-xs text-muted-foreground w-8">
                            {opp.probability}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground">
                        {formatCurrency(calculateForecast(opp.amount, opp.probability), opp.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={PRIORITY_COLORS[opp.priority]}>
                          {getPriorityIcon(opp.priority)}
                          <span className="ml-1">{PRIORITY_LABELS[opp.priority]}</span>
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(opp.expectedCloseDate)}
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
                                router.push(`/app/opportunities/${opp.id}`);
                              }}
                            >
                              Ver detalles
                            </DropdownMenuItem>
                            <RBACGuard fallback={null} minRole="sales_rep">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditOpportunity(opp);
                                }}
                              >
                                Editar
                              </DropdownMenuItem>
                              {opp.status === 'open' && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-green-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setWinLostOpportunity({ opportunity: opp, action: 'win' });
                                    }}
                                  >
                                    <Trophy className="mr-2 h-4 w-4" />
                                    Marcar Ganada
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    className="text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setWinLostOpportunity({ opportunity: opp, action: 'lost' });
                                    }}
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Marcar Perdida
                                  </DropdownMenuItem>
                                </>
                              )}
                            </RBACGuard>
                            <RBACGuard fallback={null} minRole="admin">
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteOpportunity(opp);
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
      <OpportunityFormDialog
        open={isCreateOpen || !!editOpportunity}
        opportunity={editOpportunity}
        onClose={() => {
          setIsCreateOpen(false);
          setEditOpportunity(null);
        }}
      />

      {/* Delete Dialog */}
      <DeleteOpportunityDialog
        open={!!deleteOpportunity}
        opportunity={deleteOpportunity}
        onClose={() => setDeleteOpportunity(null)}
      />

      {/* Win/Lost Dialog */}
      <WinLostDialog
        action={winLostOpportunity?.action ?? 'win'}
        open={!!winLostOpportunity}
        opportunity={winLostOpportunity?.opportunity ?? null}
        onClose={() => setWinLostOpportunity(null)}
      />
    </div>
  );
}

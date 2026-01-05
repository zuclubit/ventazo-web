'use client';

import * as React from 'react';

import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Activity,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Filter,
  RefreshCw,
  User,
} from 'lucide-react';
import { ActivityPageSkeleton } from '../components';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import {
  useMyAuditLogs,
  AUDIT_ACTION_LABELS,
  AUDIT_ACTION_COLORS,
  AUDIT_ENTITY_LABELS,
  type AuditAction,
  type AuditEntityType,
} from '@/lib/users';
import { useAuthStore } from '@/store';

// ============================================
// Constants
// ============================================

const ITEMS_PER_PAGE = 20;

const ACTION_CATEGORIES: Record<string, AuditAction[]> = {
  authentication: ['user_login', 'user_logout', 'user_signup', 'password_change', 'password_reset'],
  profile: ['profile_updated', 'avatar_updated'],
  team: ['member_invited', 'member_joined', 'member_removed', 'member_role_changed', 'member_suspended', 'member_reactivated'],
  leads: ['lead_created', 'lead_updated', 'lead_deleted', 'lead_status_changed', 'lead_assigned', 'lead_qualified', 'lead_converted'],
  tenant: ['tenant_created', 'tenant_updated', 'tenant_settings_changed', 'tenant_switched'],
};

const CATEGORY_LABELS: Record<string, string> = {
  authentication: 'Autenticación',
  profile: 'Perfil',
  team: 'Equipo',
  leads: 'Leads',
  tenant: 'Empresa',
};

// ============================================
// Activity Page
// ============================================

export default function ActivityPage() {
  const _user = useAuthStore((state) => state.user);

  // Filters
  const [actionFilter, setActionFilter] = React.useState<string>('all');
  const [entityFilter, setEntityFilter] = React.useState<string>('all');
  const [dateRange, setDateRange] = React.useState<'today' | 'week' | 'month' | 'all'>('all');
  const [page, setPage] = React.useState(1);

  // Calculate date filters
  const getDateFilters = () => {
    const now = new Date();
    switch (dateRange) {
      case 'today': {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        return { startDate: today.toISOString() };
      }
      case 'week': {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return { startDate: weekAgo.toISOString() };
      }
      case 'month': {
        const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return { startDate: monthAgo.toISOString() };
      }
      default:
        return {};
    }
  };

  // Fetch audit logs
  const {
    data: auditLogsResponse,
    isLoading,
    error,
    refetch,
    isFetching,
  } = useMyAuditLogs({
    action: actionFilter !== 'all' ? (actionFilter as AuditAction) : undefined,
    entityType: entityFilter !== 'all' ? (entityFilter as AuditEntityType) : undefined,
    ...getDateFilters(),
    page,
    pageSize: ITEMS_PER_PAGE,
  });

  const auditLogs = auditLogsResponse?.data ?? [];
  const meta = auditLogsResponse?.meta;

  // Get action icon
  const getActionIcon = (action: AuditAction) => {
    if (ACTION_CATEGORIES['authentication']?.includes(action)) {
      return <User className="h-4 w-4" />;
    }
    if (ACTION_CATEGORIES['profile']?.includes(action)) {
      return <User className="h-4 w-4" />;
    }
    if (ACTION_CATEGORIES['team']?.includes(action)) {
      return <User className="h-4 w-4" />;
    }
    return <Activity className="h-4 w-4" />;
  };

  // Format relative time
  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Hace un momento';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    if (diffHours < 24) return `Hace ${diffHours}h`;
    if (diffDays < 7) return `Hace ${diffDays}d`;
    return format(date, "d 'de' MMMM", { locale: es });
  };

  // Reset page when filters change
  React.useEffect(() => {
    setPage(1);
  }, [actionFilter, entityFilter, dateRange]);

  // Loading state
  if (isLoading) {
    return <ActivityPageSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Mi Actividad</h2>
          <p className="text-muted-foreground">
            Historial de acciones realizadas en el sistema
          </p>
        </div>
        <Button
          disabled={isFetching}
          size="sm"
          variant="outline"
          onClick={() => refetch()}
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      <Separator />

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center text-base">
            <Filter className="mr-2 h-4 w-4" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            {/* Date Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Periodo</label>
              <Select value={dateRange} onValueChange={(value: typeof dateRange) => setDateRange(value)}>
                <SelectTrigger>
                  <Calendar className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo el tiempo</SelectItem>
                  <SelectItem value="today">Hoy</SelectItem>
                  <SelectItem value="week">Ultima semana</SelectItem>
                  <SelectItem value="month">Ultimo mes</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Action Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de accion</label>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger>
                  <Activity className="mr-2 h-4 w-4" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las acciones</SelectItem>
                  <Separator className="my-1" />
                  {Object.entries(ACTION_CATEGORIES).map(([category, actions]) => (
                    <React.Fragment key={category}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {CATEGORY_LABELS[category]}
                      </div>
                      {actions.map((action) => (
                        <SelectItem key={action} value={action}>
                          {AUDIT_ACTION_LABELS[action]}
                        </SelectItem>
                      ))}
                    </React.Fragment>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Entity Type */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Modulo</label>
              <Select value={entityFilter} onValueChange={setEntityFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los modulos</SelectItem>
                  {Object.entries(AUDIT_ENTITY_LABELS).map(([key, label]) => (
                    <SelectItem key={key} value={key}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Actividad</CardTitle>
          <CardDescription>
            {meta?.total ?? 0} acciones encontradas
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <p className="text-destructive">Error al cargar la actividad</p>
              <Button className="mt-4" variant="outline" onClick={() => refetch()}>
                Reintentar
              </Button>
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Activity className="h-12 w-12 text-muted-foreground/50" />
              <p className="mt-4 text-lg font-medium">Sin actividad</p>
              <p className="text-sm text-muted-foreground">
                No se encontraron acciones con los filtros seleccionados
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Timeline */}
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />

                {auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="relative flex gap-4 pb-6 last:pb-0"
                  >
                    {/* Timeline dot */}
                    <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-background">
                      {getActionIcon(log.action)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge className={AUDIT_ACTION_COLORS[log.action]} variant="secondary">
                          {AUDIT_ACTION_LABELS[log.action]}
                        </Badge>
                        {log.entityType && (
                          <Badge variant="outline">
                            {AUDIT_ENTITY_LABELS[log.entityType] || log.entityType}
                          </Badge>
                        )}
                      </div>

                      {log.description && (
                        <p className="text-sm text-foreground">
                          {log.description}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span title={format(new Date(log.createdAt), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es })}>
                          {formatRelativeTime(log.createdAt)}
                        </span>
                        {log.ipAddress && (
                          <>
                            <span>·</span>
                            <span>IP: {log.ipAddress}</span>
                          </>
                        )}
                      </div>

                      {/* Details */}
                      {log.details && Object.keys(log.details).length > 0 && (
                        <div className="mt-2 rounded-md bg-muted/50 p-2 text-xs">
                          <pre className="overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {meta && meta.totalPages > 1 && (
                <div className="flex items-center justify-between border-t pt-4">
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{meta?.total ?? 0}</div>
            <p className="text-xs text-muted-foreground">Total de acciones</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {auditLogs.filter((l) => ACTION_CATEGORIES['authentication']?.includes(l.action)).length}
            </div>
            <p className="text-xs text-muted-foreground">Inicios de sesion</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {auditLogs.filter((l) => ACTION_CATEGORIES['leads']?.includes(l.action)).length}
            </div>
            <p className="text-xs text-muted-foreground">Acciones en leads</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {auditLogs.filter((l) => ACTION_CATEGORIES['team']?.includes(l.action)).length}
            </div>
            <p className="text-xs text-muted-foreground">Acciones de equipo</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

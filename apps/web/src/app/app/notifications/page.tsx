'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  Bell,
  Check,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Filter,
  Loader2,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  NOTIFICATION_TYPES,
  useDeleteNotification,
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useNotificationStats,
  useUnreadNotificationCount,
  type Notification,
  type NotificationType,
} from '@/lib/messaging';
import { cn } from '@/lib/utils';

// ============================================
// Constants
// ============================================

const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { icon: string; label: string; bgColor: string; textColor: string }
> = {
  info: { icon: 'ℹ️', label: 'Información', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  success: { icon: '✅', label: 'Éxito', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  warning: { icon: '⚠️', label: 'Advertencia', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  error: { icon: '❌', label: 'Error', bgColor: 'bg-red-100', textColor: 'text-red-800' },
  workflow: { icon: '⚡', label: 'Workflow', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  task: { icon: '📋', label: 'Tarea', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
  lead: { icon: '👤', label: 'Lead', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800' },
  opportunity: { icon: '💰', label: 'Oportunidad', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
  customer: { icon: '🏢', label: 'Cliente', bgColor: 'bg-teal-100', textColor: 'text-teal-800' },
  mention: { icon: '@', label: 'Mención', bgColor: 'bg-pink-100', textColor: 'text-pink-800' },
  reminder: { icon: '🔔', label: 'Recordatorio', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  system: { icon: '🔧', label: 'Sistema', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
};

const PAGE_SIZE = 20;

// ============================================
// Time Ago Helper
// ============================================

function timeAgo(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return 'Ahora mismo';
  if (seconds < 3600) return `Hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `Hace ${Math.floor(seconds / 3600)} h`;
  if (seconds < 604800) return `Hace ${Math.floor(seconds / 86400)} días`;
  return date.toLocaleDateString('es-MX', { month: 'short', day: 'numeric' });
}


// ============================================
// Notification Item Component
// ============================================

interface NotificationItemProps {
  notification: Notification;
  isSelected: boolean;
  onSelect: (id: string, selected: boolean) => void;
  onMarkRead: (id: string) => void;
  onDelete: (id: string) => void;
  isMarking: boolean;
  isDeleting: boolean;
}

function NotificationItem({
  notification,
  isSelected,
  onSelect,
  onMarkRead,
  onDelete,
  isMarking,
  isDeleting,
}: NotificationItemProps) {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];
  const isUnread = !notification.readAt;

  return (
    <div
      className={cn(
        'flex gap-4 p-4 hover:bg-muted/50 transition-colors border-b last:border-b-0',
        isUnread && 'bg-blue-50/30',
        isSelected && 'bg-muted/70'
      )}
    >
      {/* Checkbox */}
      <div className="flex items-start pt-1">
        <Checkbox
          checked={isSelected}
          onCheckedChange={(checked) => onSelect(notification.id, !!checked)}
        />
      </div>

      {/* Type indicator */}
      <div
        className={cn(
          'flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg',
          config.bgColor
        )}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <p className={cn('text-sm font-medium', isUnread && 'font-semibold')}>
                {notification.title}
              </p>
              {isUnread && (
                <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0" />
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-1">{notification.message}</p>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            {isUnread && (
              <Button
                className="h-8 w-8"
                disabled={isMarking}
                size="icon"
                title="Marcar como leída"
                variant="ghost"
                onClick={() => onMarkRead(notification.id)}
              >
                {isMarking ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
              </Button>
            )}
            <Button
              className="h-8 w-8 text-destructive hover:text-destructive"
              disabled={isDeleting}
              size="icon"
              title="Eliminar"
              variant="ghost"
              onClick={() => onDelete(notification.id)}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-2">
          <Badge className={cn(config.bgColor, config.textColor, 'text-xs')} variant="secondary">
            {config.label}
          </Badge>
          <span className="text-xs text-muted-foreground">{timeAgo(notification.createdAt)}</span>
          {notification.actionUrl && (
            <Link
              className="text-xs text-primary hover:underline flex items-center gap-1"
              href={notification.actionUrl}
            >
              Ver detalles <ExternalLink className="h-3 w-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Stats Cards Component
// ============================================

function StatsCards() {
  const { data: stats, isLoading } = useNotificationStats();
  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <div className="h-4 w-20 bg-muted animate-pulse rounded" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-muted animate-pulse rounded" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Sin Leer</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{unreadCount}</div>
          <p className="text-xs text-muted-foreground">notificaciones pendientes</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Hoy</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.today ?? 0}</div>
          <p className="text-xs text-muted-foreground">recibidas hoy</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Esta Semana</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.thisWeek ?? 0}</div>
          <p className="text-xs text-muted-foreground">recibidas esta semana</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total</CardTitle>
          <Bell className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total ?? 0}</div>
          <p className="text-xs text-muted-foreground">notificaciones totales</p>
        </CardContent>
      </Card>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function NotificationsPage() {
  const [activeTab, setActiveTab] = React.useState<'all' | 'unread'>('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [selectedTypes, setSelectedTypes] = React.useState<NotificationType[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [page, setPage] = React.useState(0);

  // Queries
  const { data: notifications = [], isLoading, error: notificationsError, refetch } = useNotifications({
    type: selectedTypes.length === 1 ? selectedTypes[0] : undefined,
    unreadOnly: activeTab === 'unread',
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  });

  const { data: unreadCount = 0 } = useUnreadNotificationCount();

  // Mutations
  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();
  const deleteNotification = useDeleteNotification();

  // Filtered notifications
  const filteredNotifications = React.useMemo(() => {
    let result = notifications;

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (n) =>
          n.title.toLowerCase().includes(query) || n.message.toLowerCase().includes(query)
      );
    }

    // Filter by types (if multiple selected)
    if (selectedTypes.length > 1) {
      result = result.filter((n) => selectedTypes.includes(n.type));
    }

    return result;
  }, [notifications, searchQuery, selectedTypes]);

  // Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(filteredNotifications.map((n) => n.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id: string, selected: boolean) => {
    const newSelected = new Set(selectedIds);
    if (selected) {
      newSelected.add(id);
    } else {
      newSelected.delete(id);
    }
    setSelectedIds(newSelected);
  };

  const handleMarkSelectedRead = () => {
    selectedIds.forEach((id) => {
      const notification = notifications.find((n) => n.id === id);
      if (notification && !notification.readAt) {
        markRead.mutate(id);
      }
    });
    setSelectedIds(new Set());
  };

  const handleDeleteSelected = () => {
    selectedIds.forEach((id) => {
      deleteNotification.mutate(id);
    });
    setSelectedIds(new Set());
  };

  const handleTypeToggle = (type: NotificationType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const allSelected =
    filteredNotifications.length > 0 &&
    filteredNotifications.every((n) => selectedIds.has(n.id));

  const someSelected = selectedIds.size > 0;

  return (
    <div className="container py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notificaciones</h1>
          <p className="text-muted-foreground">
            Gestiona todas tus notificaciones y alertas del sistema
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/app/settings/notifications">
            <Settings className="h-4 w-4 mr-2" />
            Preferencias
          </Link>
        </Button>
      </div>

      {/* Stats */}
      <StatsCards />

      {/* Main Content */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Tabs */}
            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'all' | 'unread')}>
              <TabsList>
                <TabsTrigger value="all">Todas</TabsTrigger>
                <TabsTrigger className="relative" value="unread">
                  Sin leer
                  {unreadCount > 0 && (
                    <Badge className="ml-2 h-5 px-1.5" variant="destructive">
                      {unreadCount}
                    </Badge>
                  )}
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Actions */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-8 w-[200px]"
                  placeholder="Buscar..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <Button
                    className="absolute right-1 top-1 h-6 w-6"
                    size="icon"
                    variant="ghost"
                    onClick={() => setSearchQuery('')}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                )}
              </div>

              {/* Type Filter */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline">
                    <Filter className="h-4 w-4 mr-2" />
                    Filtros
                    {selectedTypes.length > 0 && (
                      <Badge className="ml-2" variant="secondary">
                        {selectedTypes.length}
                      </Badge>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Tipo de notificación</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {NOTIFICATION_TYPES.map((type) => (
                    <DropdownMenuCheckboxItem
                      key={type}
                      checked={selectedTypes.includes(type)}
                      onCheckedChange={() => handleTypeToggle(type)}
                    >
                      <span className="mr-2">{NOTIFICATION_TYPE_CONFIG[type].icon}</span>
                      {NOTIFICATION_TYPE_CONFIG[type].label}
                    </DropdownMenuCheckboxItem>
                  ))}
                  {selectedTypes.length > 0 && (
                    <>
                      <DropdownMenuSeparator />
                      <Button
                        className="w-full justify-start"
                        size="sm"
                        variant="ghost"
                        onClick={() => setSelectedTypes([])}
                      >
                        Limpiar filtros
                      </Button>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>

              {/* Mark All Read */}
              {unreadCount > 0 && (
                <Button
                  disabled={markAllRead.isPending}
                  size="sm"
                  variant="outline"
                  onClick={() => markAllRead.mutate()}
                >
                  {markAllRead.isPending ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <CheckCheck className="h-4 w-4 mr-2" />
                  )}
                  Marcar todas
                </Button>
              )}
            </div>
          </div>
        </CardHeader>

        <Separator />

        {/* Bulk Actions Bar */}
        {someSelected && (
          <>
            <div className="flex items-center justify-between px-4 py-2 bg-muted/50">
              <span className="text-sm text-muted-foreground">
                {selectedIds.size} seleccionadas
              </span>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleMarkSelectedRead}>
                  <Check className="h-4 w-4 mr-2" />
                  Marcar como leídas
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="text-destructive hover:text-destructive"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Eliminar
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setSelectedIds(new Set())}>
                  Cancelar
                </Button>
              </div>
            </div>
            <Separator />
          </>
        )}

        {/* Select All */}
        {filteredNotifications.length > 0 && (
          <>
            <div className="flex items-center gap-3 px-4 py-2 border-b">
              <Checkbox checked={allSelected} onCheckedChange={handleSelectAll} />
              <span className="text-sm text-muted-foreground">Seleccionar todas</span>
            </div>
          </>
        )}

        {/* Notifications List */}
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-0">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border-b animate-pulse">
                  <div className="w-4 h-4 bg-muted rounded mt-1" />
                  <div className="w-10 h-10 bg-muted rounded-full" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="flex gap-2">
                      <div className="h-5 bg-muted rounded w-16" />
                      <div className="h-5 bg-muted rounded w-20" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : notificationsError ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <div className="rounded-full bg-destructive/10 p-4 mb-4">
                <Bell className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-lg font-medium">Error al cargar notificaciones</h3>
              <p className="text-sm text-muted-foreground mt-1 max-w-md">
                {notificationsError?.message || 'No se pudieron cargar las notificaciones. Por favor, intenta de nuevo.'}
              </p>
              <Button className="mt-4" variant="outline" onClick={() => void refetch()}>
                Reintentar
              </Button>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Bell className="h-12 w-12 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-medium">No hay notificaciones</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {activeTab === 'unread'
                  ? 'No tienes notificaciones sin leer'
                  : searchQuery
                    ? 'No se encontraron notificaciones con ese criterio'
                    : 'Aún no has recibido notificaciones'}
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[500px]">
              {filteredNotifications.map((notification) => (
                <NotificationItem
                  key={notification.id}
                  isDeleting={deleteNotification.isPending}
                  isMarking={markRead.isPending}
                  isSelected={selectedIds.has(notification.id)}
                  notification={notification}
                  onDelete={(id) => deleteNotification.mutate(id)}
                  onMarkRead={(id) => markRead.mutate(id)}
                  onSelect={handleSelect}
                />
              ))}
            </ScrollArea>
          )}
        </CardContent>

        {/* Pagination */}
        {filteredNotifications.length > 0 && (
          <>
            <Separator />
            <div className="flex items-center justify-between px-4 py-3">
              <span className="text-sm text-muted-foreground">
                Mostrando {page * PAGE_SIZE + 1} -{' '}
                {Math.min((page + 1) * PAGE_SIZE, filteredNotifications.length)} de{' '}
                {filteredNotifications.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  disabled={page === 0}
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  disabled={filteredNotifications.length < PAGE_SIZE}
                  size="sm"
                  variant="outline"
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </>
        )}
      </Card>
    </div>
  );
}

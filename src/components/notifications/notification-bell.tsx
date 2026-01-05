'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  Bell,
  Check,
  CheckCheck,
  ExternalLink,
  Loader2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotifications,
  useUnreadNotificationCount,
  type Notification,
  type NotificationType,
} from '@/lib/messaging';
import { cn } from '@/lib/utils';

// ============================================
// Notification Type Icons & Colors
// ============================================

const NOTIFICATION_TYPE_CONFIG: Record<
  NotificationType,
  { icon: string; bgColor: string; textColor: string }
> = {
  info: { icon: 'ℹ️', bgColor: 'bg-blue-100', textColor: 'text-blue-800' },
  success: { icon: '✅', bgColor: 'bg-green-100', textColor: 'text-green-800' },
  warning: { icon: '⚠️', bgColor: 'bg-yellow-100', textColor: 'text-yellow-800' },
  error: { icon: '❌', bgColor: 'bg-red-100', textColor: 'text-red-800' },
  workflow: { icon: '⚡', bgColor: 'bg-purple-100', textColor: 'text-purple-800' },
  task: { icon: '📋', bgColor: 'bg-indigo-100', textColor: 'text-indigo-800' },
  lead: { icon: '👤', bgColor: 'bg-cyan-100', textColor: 'text-cyan-800' },
  opportunity: { icon: '💰', bgColor: 'bg-emerald-100', textColor: 'text-emerald-800' },
  customer: { icon: '🏢', bgColor: 'bg-teal-100', textColor: 'text-teal-800' },
  mention: { icon: '@', bgColor: 'bg-pink-100', textColor: 'text-pink-800' },
  reminder: { icon: '🔔', bgColor: 'bg-orange-100', textColor: 'text-orange-800' },
  system: { icon: '🔧', bgColor: 'bg-gray-100', textColor: 'text-gray-800' },
};

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
  onMarkRead: (id: string) => void;
  isMarking: boolean;
}

function NotificationItem({ notification, onMarkRead, isMarking }: NotificationItemProps) {
  const config = NOTIFICATION_TYPE_CONFIG[notification.type];
  const isUnread = !notification.readAt;

  return (
    <div
      className={cn(
        'flex gap-3 p-3 hover:bg-muted/50 transition-colors cursor-pointer relative',
        isUnread && 'bg-blue-50/50'
      )}
    >
      {/* Type indicator */}
      <div
        className={cn(
          'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm',
          config.bgColor
        )}
      >
        {config.icon}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm font-medium truncate', isUnread && 'font-semibold')}>
            {notification.title}
          </p>
          {isUnread && (
            <Button
              className="flex-shrink-0 h-6 w-6"
              disabled={isMarking}
              size="icon"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation();
                onMarkRead(notification.id);
              }}
            >
              {isMarking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3" />
              )}
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
          {notification.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-muted-foreground">
            {timeAgo(notification.createdAt)}
          </span>
          {notification.actionUrl && (
            <Link
              className="text-xs text-primary hover:underline flex items-center gap-0.5"
              href={notification.actionUrl}
            >
              Ver más <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          )}
        </div>
      </div>

      {/* Unread indicator */}
      {isUnread && (
        <div className="absolute left-1 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-blue-500" />
      )}
    </div>
  );
}

// ============================================
// Notification Bell Component
// ============================================

export function NotificationBell() {
  const [isOpen, setIsOpen] = React.useState(false);

  const { data: unreadCount = 0 } = useUnreadNotificationCount();
  const { data: notifications = [], isLoading } = useNotifications({ limit: 10 });

  const markRead = useMarkNotificationRead();
  const markAllRead = useMarkAllNotificationsRead();

  const handleMarkRead = (id: string) => {
    markRead.mutate(id);
  };

  const handleMarkAllRead = () => {
    markAllRead.mutate();
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button className="relative" size="icon" variant="ghost">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notificaciones</span>
          {unreadCount > 0 && (
            <Button
              className="h-auto p-0 text-xs font-normal"
              disabled={markAllRead.isPending}
              variant="link"
              onClick={handleMarkAllRead}
            >
              {markAllRead.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin mr-1" />
              ) : (
                <CheckCheck className="h-3 w-3 mr-1" />
              )}
              Marcar todas como leídas
            </Button>
          )}
        </DropdownMenuLabel>

        <DropdownMenuSeparator />

        <ScrollArea className="h-[400px]">
          {isLoading ? (
            <div className="flex items-center justify-center p-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-10 w-10 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No hay notificaciones</p>
            </div>
          ) : (
            <DropdownMenuGroup>
              {notifications.map((notification) => (
                <DropdownMenuItem
                  key={notification.id}
                  asChild
                  className="p-0 focus:bg-transparent"
                >
                  <div>
                    <NotificationItem
                      isMarking={markRead.isPending}
                      notification={notification}
                      onMarkRead={handleMarkRead}
                    />
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          )}
        </ScrollArea>

        <DropdownMenuSeparator />

        <DropdownMenuItem asChild>
          <Link
            className="flex items-center justify-center gap-2 py-2 cursor-pointer"
            href="/app/notifications"
            onClick={() => setIsOpen(false)}
          >
            Ver todas las notificaciones
            <ExternalLink className="h-3 w-3" />
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default NotificationBell;

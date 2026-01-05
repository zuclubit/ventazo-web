'use client';

/**
 * ConnectEmailCard Component
 *
 * Cards for connecting Gmail and Outlook accounts via OAuth.
 */

import * as React from 'react';
import { Check, Loader2, Mail, RefreshCw, Trash2, ExternalLink } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
import type { EmailAccount, EmailProvider } from '@/lib/emails';

// ============================================
// Types
// ============================================

export interface ConnectEmailCardProps {
  /** Connected accounts */
  accounts?: EmailAccount[];
  /** Handler for connect */
  onConnect: (provider: EmailProvider) => void;
  /** Handler for disconnect */
  onDisconnect: (accountId: string) => void;
  /** Handler for sync */
  onSync: (accountId: string) => void;
  /** Loading state */
  isLoading?: boolean;
  /** Connecting state */
  isConnecting?: boolean;
}

// ============================================
// Provider Configuration
// ============================================

interface ProviderConfig {
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
  hoverColor: string;
}

const PROVIDER_CONFIG: Record<EmailProvider, ProviderConfig> = {
  gmail: {
    name: 'Gmail',
    description: 'Conecta tu cuenta de Google para sincronizar correos',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path
          fill="#EA4335"
          d="M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"
        />
      </svg>
    ),
    color: '#EA4335',
    bgColor: 'bg-red-50',
    hoverColor: 'hover:bg-red-100',
  },
  outlook: {
    name: 'Outlook',
    description: 'Conecta tu cuenta de Microsoft para sincronizar correos',
    icon: (
      <svg viewBox="0 0 24 24" className="h-6 w-6">
        <path
          fill="#0078D4"
          d="M24 7.387v10.478c0 .23-.08.424-.238.576-.159.152-.357.228-.595.228h-8.16v-6.18l1.778 1.302a.37.37 0 0 0 .413.016.335.335 0 0 0 .183-.298V12.1c0-.127-.061-.234-.183-.324l-2.19-1.586v-.851l2.19-1.586a.335.335 0 0 0 .183-.324v-1.41a.335.335 0 0 0-.183-.297.37.37 0 0 0-.413.015l-1.778 1.302V3.33h8.16c.238 0 .436.076.595.228.159.152.238.346.238.576v3.253zM0 7.387l7.687 4.862L0 17.865V7.387zm14.006-4.64c0-.23.08-.424.238-.576.159-.152.357-.228.595-.228h9.157v2.286h-9.157c-.238 0-.436-.076-.595-.228a.747.747 0 0 1-.238-.576V2.747zm-2.813 1.083a3.813 3.813 0 0 1 2.813 1.163V7.5a3.813 3.813 0 0 1-1.163 2.813 3.813 3.813 0 0 1-2.813 1.163H3.813A3.813 3.813 0 0 1 1 10.313 3.813 3.813 0 0 1-.163 7.5a3.813 3.813 0 0 1 1.163-2.813A3.813 3.813 0 0 1 3.813 3.524h7.38v.306z"
        />
      </svg>
    ),
    color: '#0078D4',
    bgColor: 'bg-blue-50',
    hoverColor: 'hover:bg-blue-100',
  },
  other: {
    name: 'Otro proveedor',
    description: 'Conecta otro proveedor de correo vía IMAP/SMTP',
    icon: <Mail className="h-6 w-6 text-gray-600" />,
    color: '#6B7280',
    bgColor: 'bg-gray-50',
    hoverColor: 'hover:bg-gray-100',
  },
};

// ============================================
// Sub-Components
// ============================================

interface AccountCardProps {
  account: EmailAccount;
  onSync: () => void;
  onDisconnect: () => void;
  isSyncing?: boolean;
}

function AccountCard({ account, onSync, onDisconnect, isSyncing }: AccountCardProps) {
  const config = PROVIDER_CONFIG[account.provider];

  return (
    <Card className={cn('border', account.isConnected ? 'border-green-200' : 'border-red-200')}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className={cn('p-2 rounded-lg', config.bgColor)}>{config.icon}</div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="font-medium truncate">{account.email}</p>
              <Badge variant={account.isConnected ? 'default' : 'destructive'} className="text-xs">
                {account.isConnected ? 'Conectado' : 'Desconectado'}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">{config.name}</p>
            {account.lastSyncAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Última sincronización:{' '}
                {new Date(account.lastSyncAt).toLocaleString('es-ES', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                })}
              </p>
            )}
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSync}
              disabled={isSyncing || !account.isConnected}
            >
              <RefreshCw className={cn('h-4 w-4', isSyncing && 'animate-spin')} />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Desconectar cuenta</AlertDialogTitle>
                  <AlertDialogDescription>
                    Esto eliminará la conexión con {account.email}. Los correos sincronizados se
                    mantendrán pero no se sincronizarán nuevos correos.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancelar</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={onDisconnect}
                    className="bg-destructive hover:bg-destructive/90"
                  >
                    Desconectar
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface ConnectProviderCardProps {
  provider: EmailProvider;
  onConnect: () => void;
  isConnecting?: boolean;
  hasAccount?: boolean;
}

function ConnectProviderCard({
  provider,
  onConnect,
  isConnecting,
  hasAccount,
}: ConnectProviderCardProps) {
  const config = PROVIDER_CONFIG[provider];

  if (hasAccount && provider !== 'other') {
    return null;
  }

  return (
    <Card className={cn('border-2 border-dashed transition-colors', config.hoverColor)}>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={cn('p-2 rounded-lg', config.bgColor)}>{config.icon}</div>

          <div className="flex-1">
            <p className="font-medium">{config.name}</p>
            <p className="text-sm text-muted-foreground">{config.description}</p>
          </div>

          <Button
            variant="outline"
            onClick={onConnect}
            disabled={isConnecting}
            className="gap-2"
          >
            {isConnecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="h-4 w-4" />
            )}
            Conectar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Component
// ============================================

export function ConnectEmailCard({
  accounts = [],
  onConnect,
  onDisconnect,
  onSync,
  isLoading = false,
  isConnecting = false,
}: ConnectEmailCardProps) {
  const hasGmail = accounts.some((a) => a.provider === 'gmail');
  const hasOutlook = accounts.some((a) => a.provider === 'outlook');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-lg font-semibold">Cuentas de correo</h2>
        <p className="text-sm text-muted-foreground">
          Conecta tus cuentas de correo para sincronizar emails dentro del CRM
        </p>
      </div>

      {/* Connected Accounts */}
      {accounts.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Cuentas conectadas</h3>
          {accounts.map((account) => (
            <AccountCard
              key={account.id}
              account={account}
              onSync={() => onSync(account.id)}
              onDisconnect={() => onDisconnect(account.id)}
            />
          ))}
        </div>
      )}

      {/* Connect New Account */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          {accounts.length > 0 ? 'Agregar otra cuenta' : 'Conectar una cuenta'}
        </h3>

        <ConnectProviderCard
          provider="gmail"
          onConnect={() => onConnect('gmail')}
          isConnecting={isConnecting}
          hasAccount={hasGmail}
        />

        <ConnectProviderCard
          provider="outlook"
          onConnect={() => onConnect('outlook')}
          isConnecting={isConnecting}
          hasAccount={hasOutlook}
        />
      </div>

      {/* Features Info */}
      <Card className="bg-[var(--tenant-primary-lighter)] border-[var(--tenant-primary)]/20">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Check className="h-5 w-5 text-[var(--tenant-primary)] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium text-[var(--tenant-primary)]">Sincronización bidireccional</p>
              <p className="text-sm text-muted-foreground">
                Los correos enviados desde el CRM aparecerán en tu bandeja de enviados.
                Los correos recibidos se sincronizarán automáticamente.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default ConnectEmailCard;

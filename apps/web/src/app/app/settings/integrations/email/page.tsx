'use client';

/**
 * Email Integration Settings Page
 *
 * Allows users to connect and manage Gmail and Microsoft Outlook email accounts.
 * Handles OAuth flow and displays connected accounts with sync status.
 *
 * @module app/settings/integrations/email
 */

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Mail,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RefreshCw,
  HelpCircle,
  Trash2,
  Clock,
  Inbox,
  Star,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

import {
  useEmailAccounts,
  useGetEmailAuthUrl,
  useDisconnectEmailAccount,
  useSyncEmailAccount,
  useSetDefaultEmailAccount,
  emailKeys,
} from '@/lib/emails/hooks';
import type { EmailAccount, EmailProvider } from '@/lib/emails/types';
import { useQueryClient } from '@tanstack/react-query';

// ============================================
// Provider Icons
// ============================================

function GmailIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M22 6L12 13L2 6V4L12 11L22 4V6Z" fill="#EA4335"/>
      <path d="M22 6V18C22 19.1 21.1 20 20 20H4C2.9 20 2 19.1 2 18V6L12 13L22 6Z" fill="#EA4335"/>
      <path d="M2 6L12 13L2 6Z" fill="#FBBC05"/>
      <path d="M22 6L12 13L22 6Z" fill="#34A853"/>
      <path d="M2 6V18C2 19.1 2.9 20 4 20H20C21.1 20 22 19.1 22 18V6L12 13L2 6Z" fill="none" stroke="currentColor" strokeWidth="0"/>
    </svg>
  );
}

function OutlookIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M21 4H8C7.45 4 7 4.45 7 5V19C7 19.55 7.45 20 8 20H21C21.55 20 22 19.55 22 19V5C22 4.45 21.55 4 21 4Z" fill="#0078D4"/>
      <path d="M2 7L7 9.5V14.5L2 17V7Z" fill="#0078D4"/>
      <path d="M7 9.5L14.5 12L7 14.5V9.5Z" fill="#28A8EA"/>
      <ellipse cx="9" cy="12" rx="4" ry="5" fill="#0364B8"/>
      <ellipse cx="9" cy="12" rx="2.5" ry="3" fill="white"/>
    </svg>
  );
}

const providerConfig: Record<'gmail' | 'outlook', {
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  description: string;
}> = {
  gmail: {
    name: 'Gmail',
    icon: GmailIcon,
    color: 'bg-red-500/10 text-red-600 border-red-200',
    description: 'Conecta tu cuenta de Google Workspace o Gmail personal',
  },
  outlook: {
    name: 'Microsoft Outlook',
    icon: OutlookIcon,
    color: 'bg-blue-500/10 text-blue-600 border-blue-200',
    description: 'Conecta tu cuenta de Microsoft 365 o Outlook.com',
  },
};

// ============================================
// OAuth Callback Handler
// ============================================

function useEmailOAuthCallback() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isProcessing, setIsProcessing] = React.useState(false);

  React.useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const scope = searchParams.get('scope');

    // Handle OAuth error
    if (error) {
      toast({
        title: 'Error de autorizacion',
        description: error === 'access_denied'
          ? 'No se otorgaron los permisos necesarios para acceder al correo.'
          : `Error: ${error}`,
        variant: 'destructive',
      });
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname);
      return;
    }

    // Handle OAuth success - we received an auth code
    if (code && state) {
      const storedState = sessionStorage.getItem('email_oauth_state');
      const provider = sessionStorage.getItem('email_oauth_provider') as 'google' | 'microsoft';

      // Verify state to prevent CSRF
      if (state !== storedState) {
        toast({
          title: 'Error de seguridad',
          description: 'El estado de autorizacion no coincide. Intenta de nuevo.',
          variant: 'destructive',
        });
        window.history.replaceState({}, '', window.location.pathname);
        return;
      }

      // Process OAuth callback - send code to backend
      setIsProcessing(true);
      const redirectUri = `${window.location.origin}/app/settings/integrations/email`;

      // The backend should handle the token exchange
      // For now, we'll make a call to the connect endpoint with the auth code
      fetch('/api/proxy/email-sync/accounts/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          provider,
          authCode: code,
          redirectUri,
        }),
      })
        .then(async (response) => {
          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Error al conectar la cuenta');
          }
          return response.json();
        })
        .then(() => {
          toast({
            title: 'Cuenta conectada',
            description: `Tu cuenta de ${provider === 'google' ? 'Gmail' : 'Outlook'} se ha conectado correctamente.`,
          });
          // Invalidate accounts query to refresh the list
          void queryClient.invalidateQueries({ queryKey: emailKeys.accounts() });
          // Clean session storage
          sessionStorage.removeItem('email_oauth_state');
          sessionStorage.removeItem('email_oauth_provider');
        })
        .catch((err) => {
          console.error('OAuth callback error:', err);
          toast({
            title: 'Error de conexion',
            description: err.message || 'No se pudo completar la conexion. Intenta de nuevo.',
            variant: 'destructive',
          });
        })
        .finally(() => {
          setIsProcessing(false);
          // Clean URL
          window.history.replaceState({}, '', window.location.pathname);
        });
    }
  }, [searchParams, toast, queryClient]);

  return { isProcessing };
}

// ============================================
// Email Provider Card (for connecting)
// ============================================

function EmailProviderCard({
  provider,
  onConnectStart,
  isConnecting,
}: {
  provider: 'gmail' | 'outlook';
  onConnectStart: () => void;
  isConnecting: boolean;
}) {
  const config = providerConfig[provider];
  const Icon = config.icon;

  return (
    <Card className="relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-3">
          <div className={`p-3 rounded-lg ${config.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div>
            <CardTitle className="text-lg">{config.name}</CardTitle>
            <CardDescription className="text-sm">{config.description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Button
          onClick={onConnectStart}
          disabled={isConnecting}
          className="w-full"
          variant="outline"
        >
          {isConnecting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Conectando...
            </>
          ) : (
            <>
              <Mail className="h-4 w-4 mr-2" />
              Conectar {config.name}
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ============================================
// Connected Email Account Card
// ============================================

function ConnectedEmailCard({
  account,
  onSync,
  onDisconnect,
  onSetDefault,
  isSyncing,
}: {
  account: EmailAccount;
  onSync: () => void;
  onDisconnect: () => void;
  onSetDefault: () => void;
  isSyncing: boolean;
}) {
  const provider = account.provider === 'gmail' || account.provider === 'outlook'
    ? account.provider
    : 'gmail';
  const config = providerConfig[provider];
  const Icon = config.icon;

  const syncStatusColor = {
    idle: 'bg-gray-100 text-gray-600',
    syncing: 'bg-blue-100 text-blue-600',
    success: 'bg-green-100 text-green-600',
    error: 'bg-red-100 text-red-600',
  }[account.syncStatus];

  const syncStatusText = {
    idle: 'Sin sincronizar',
    syncing: 'Sincronizando...',
    success: 'Sincronizado',
    error: 'Error de sincronizacion',
  }[account.syncStatus];

  return (
    <Card className="relative">
      {account.isDefault && (
        <div className="absolute top-3 right-3">
          <Badge variant="secondary" className="bg-primary/10 text-primary">
            <Star className="h-3 w-3 mr-1 fill-current" />
            Principal
          </Badge>
        </div>
      )}
      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          <div className={`p-3 rounded-lg ${config.color}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg truncate">{account.email}</CardTitle>
              {account.isConnected && (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              )}
            </div>
            <CardDescription className="flex items-center gap-2 mt-1">
              <span>{config.name}</span>
              {account.displayName && (
                <>
                  <span className="text-muted-foreground/50">•</span>
                  <span>{account.displayName}</span>
                </>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sync Status */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className={syncStatusColor}>
              {account.syncStatus === 'syncing' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
              {syncStatusText}
            </Badge>
          </div>
          {account.lastSyncAt && (
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Ultima sync: {new Date(account.lastSyncAt).toLocaleString('es-MX', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          )}
        </div>

        {/* Sync Error */}
        {account.syncStatus === 'error' && account.syncError && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-xs">{account.syncError}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onSync}
            disabled={isSyncing || account.syncStatus === 'syncing'}
            className="flex-1"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing || account.syncStatus === 'syncing' ? 'animate-spin' : ''}`} />
            Sincronizar
          </Button>
          {!account.isDefault && (
            <Button
              variant="outline"
              size="sm"
              onClick={onSetDefault}
            >
              <Star className="h-4 w-4 mr-2" />
              Hacer principal
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={onDisconnect}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function EmailSettingsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10 rounded-lg" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-72" />
        </div>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-lg" />
        <Skeleton className="h-40 w-full rounded-lg" />
      </div>
    </div>
  );
}

// ============================================
// Main Page Component
// ============================================

export default function EmailIntegrationPage() {
  const { toast } = useToast();
  const { isProcessing: isOAuthProcessing } = useEmailOAuthCallback();
  const queryClient = useQueryClient();

  // Data fetching
  const {
    data: accountsData,
    isLoading: accountsLoading,
    error: accountsError,
    refetch: refetchAccounts,
  } = useEmailAccounts();

  // Mutations
  const getAuthUrl = useGetEmailAuthUrl();
  const disconnectAccount = useDisconnectEmailAccount();
  const syncAccount = useSyncEmailAccount();
  const setDefaultAccount = useSetDefaultEmailAccount();

  // Disconnect dialog state
  const [disconnectDialogOpen, setDisconnectDialogOpen] = React.useState(false);
  const [accountToDisconnect, setAccountToDisconnect] = React.useState<EmailAccount | null>(null);

  // Syncing state
  const [syncingAccountId, setSyncingAccountId] = React.useState<string | null>(null);
  const [connectingProvider, setConnectingProvider] = React.useState<'gmail' | 'outlook' | null>(null);

  const accounts = accountsData?.accounts ?? [];
  const connectedAccounts = accounts.filter((a) => a.isConnected);
  const connectedProviders = new Set(accounts.map((a) => a.provider));

  // Available providers (not yet connected or allow multiple)
  const availableProviders: ('gmail' | 'outlook')[] = ['gmail', 'outlook'];

  const handleConnect = async (provider: 'gmail' | 'outlook') => {
    setConnectingProvider(provider);
    try {
      // Map to backend provider names
      const backendProvider = provider === 'gmail' ? 'google' : 'microsoft';
      const result = await getAuthUrl.mutateAsync(backendProvider);

      if (result.authUrl) {
        // Store state for verification when OAuth returns
        const urlParams = new URLSearchParams(result.authUrl.split('?')[1]);
        const state = urlParams.get('state');
        if (state) {
          sessionStorage.setItem('email_oauth_state', state);
          sessionStorage.setItem('email_oauth_provider', backendProvider);
        }
        // Redirect to OAuth provider
        window.location.href = result.authUrl;
      } else {
        throw new Error('No se recibio URL de autorizacion');
      }
    } catch (error) {
      console.error('Error getting auth URL:', error);
      toast({
        title: 'Error',
        description: 'No se pudo iniciar la conexion. Intenta de nuevo.',
        variant: 'destructive',
      });
      setConnectingProvider(null);
    }
  };

  const handleSync = async (accountId: string) => {
    setSyncingAccountId(accountId);
    try {
      await syncAccount.mutateAsync({ accountId });
      toast({
        title: 'Sincronizacion iniciada',
        description: 'Los correos se estan sincronizando en segundo plano.',
      });
    } catch (error) {
      console.error('Sync error:', error);
      toast({
        title: 'Error de sincronizacion',
        description: 'No se pudo iniciar la sincronizacion. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setSyncingAccountId(null);
    }
  };

  const handleDisconnect = async () => {
    if (!accountToDisconnect) return;

    try {
      await disconnectAccount.mutateAsync(accountToDisconnect.id);
      toast({
        title: 'Cuenta desconectada',
        description: `${accountToDisconnect.email} ha sido desconectada.`,
      });
      setDisconnectDialogOpen(false);
      setAccountToDisconnect(null);
    } catch (error) {
      console.error('Disconnect error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo desconectar la cuenta. Intenta de nuevo.',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefault = async (accountId: string) => {
    try {
      await setDefaultAccount.mutateAsync(accountId);
      toast({
        title: 'Cuenta principal actualizada',
        description: 'Esta cuenta se usara por defecto para enviar correos.',
      });
    } catch (error) {
      console.error('Set default error:', error);
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la cuenta principal.',
        variant: 'destructive',
      });
    }
  };

  const handleRefresh = () => {
    refetchAccounts();
    toast({
      title: 'Actualizando...',
      description: 'Sincronizando estado de cuentas de correo.',
    });
  };

  const isLoading = accountsLoading || isOAuthProcessing;

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" asChild>
              <Link href="/app/settings/integrations">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Mail className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-2xl font-bold tracking-tight">Correo Electronico</h2>
                <p className="text-muted-foreground">
                  Conecta Gmail o Microsoft Outlook
                </p>
              </div>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* OAuth Processing State */}
        {isOAuthProcessing && (
          <Alert>
            <Loader2 className="h-4 w-4 animate-spin" />
            <AlertTitle>Procesando autorizacion...</AlertTitle>
            <AlertDescription>
              Estamos completando la conexion con tu cuenta de correo. Espera un momento.
            </AlertDescription>
          </Alert>
        )}

        {/* Error State */}
        {accountsError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>
              No se pudieron cargar las cuentas de correo. {String(accountsError)}
            </AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && !isOAuthProcessing ? (
          <EmailSettingsSkeleton />
        ) : (
          <>
            {/* Connected Accounts Section */}
            {connectedAccounts.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                    Cuentas conectadas ({connectedAccounts.length})
                  </h3>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <HelpCircle className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        Tus cuentas de correo se sincronizan automaticamente.
                        Puedes ver y responder correos desde la bandeja unificada del CRM.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid gap-4">
                  {connectedAccounts.map((account) => (
                    <ConnectedEmailCard
                      key={account.id}
                      account={account}
                      onSync={() => handleSync(account.id)}
                      onDisconnect={() => {
                        setAccountToDisconnect(account);
                        setDisconnectDialogOpen(true);
                      }}
                      onSetDefault={() => handleSetDefault(account.id)}
                      isSyncing={syncingAccountId === account.id}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Available Providers Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">
                {connectedAccounts.length > 0
                  ? 'Conectar otra cuenta'
                  : 'Conectar cuenta de correo'}
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {availableProviders.map((provider) => (
                  <EmailProviderCard
                    key={provider}
                    provider={provider}
                    onConnectStart={() => handleConnect(provider)}
                    isConnecting={connectingProvider === provider || getAuthUrl.isPending}
                  />
                ))}
              </div>
            </div>

            {/* Benefits Info */}
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <h4 className="font-medium flex items-center gap-2">
                <Inbox className="h-4 w-4" />
                Beneficios de conectar tu correo:
              </h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Bandeja de entrada unificada para todos tus correos</li>
                <li>• Vincula automaticamente correos con leads y clientes</li>
                <li>• Envia correos directamente desde el CRM</li>
                <li>• Registra interacciones en el timeline de cada contacto</li>
                <li>• Plantillas de correo personalizables</li>
                <li>• Seguimiento de apertura y respuestas</li>
              </ul>
            </div>
          </>
        )}

        {/* Disconnect Confirmation Dialog */}
        <AlertDialog open={disconnectDialogOpen} onOpenChange={setDisconnectDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Desconectar cuenta de correo?</AlertDialogTitle>
              <AlertDialogDescription>
                Esta accion desconectara <strong>{accountToDisconnect?.email}</strong> del CRM.
                Los correos sincronizados se mantendran, pero no se sincronizaran nuevos correos.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDisconnect}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {disconnectAccount.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Desconectando...
                  </>
                ) : (
                  'Desconectar'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </TooltipProvider>
  );
}

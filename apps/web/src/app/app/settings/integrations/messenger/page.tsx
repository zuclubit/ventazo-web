'use client';

import * as React from 'react';
import Link from 'next/link';
import {
  MessageCircle,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Trash2,
  Star,
  ExternalLink,
  AlertCircle,
  Loader2,
  Clock
} from 'lucide-react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { useTenantStore } from '@/store/tenant.store';

// ============================================
// Types
// ============================================

interface ConnectedPage {
  id: string;
  pageId: string;
  pageName: string;
  isDefault: boolean;
  connectedAt: string;
  lastWebhookAt?: string;
}

interface HealthStatus {
  connected: boolean;
  pageId?: string;
  pageName?: string;
  lastWebhookAt?: string;
  permissionsGranted?: string[];
  tokenStatus: 'valid' | 'expired' | 'not_configured';
}

// ============================================
// API Functions
// ============================================

const API_BASE = process.env['NEXT_PUBLIC_API_URL'] || 'https://zuclubit-lead-service.fly.dev';

async function fetchConnectedPages(tenantId: string, token: string): Promise<ConnectedPage[]> {
  const response = await fetch(`${API_BASE}/api/v1/messenger/oauth/pages`, {
    headers: {
      'x-tenant-id': tenantId,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch pages');
  const data = await response.json();
  // Backend returns { success: true, data: [pages array] }
  return (data.data || []).map((page: any) => ({
    id: page.id,
    pageId: page.pageId,
    pageName: page.pageName,
    isDefault: page.isDefault || false,
    connectedAt: page.createdAt,
    lastWebhookAt: page.lastWebhookAt,
  }));
}

async function fetchHealthStatus(tenantId: string, token: string): Promise<HealthStatus> {
  const response = await fetch(`${API_BASE}/api/v1/messenger/health`, {
    headers: {
      'x-tenant-id': tenantId,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to fetch health status');
  const data = await response.json();
  return data.data;
}

async function setDefaultPage(tenantId: string, pageId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/messenger/oauth/pages/${pageId}/default`, {
    method: 'PATCH',
    headers: {
      'x-tenant-id': tenantId,
      'Authorization': `Bearer ${token}`,
    },
  });
  if (!response.ok) throw new Error('Failed to set default page');
}

async function disconnectPage(tenantId: string, pageId: string, token: string): Promise<void> {
  const response = await fetch(`${API_BASE}/api/v1/messenger/oauth/disconnect`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': tenantId,
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ pageId }),
  });
  if (!response.ok) throw new Error('Failed to disconnect page');
}

async function testConnection(tenantId: string, token: string): Promise<{ success: boolean; message?: string }> {
  const response = await fetch(`${API_BASE}/api/v1/messenger/oauth/test`, {
    method: 'POST',
    headers: {
      'x-tenant-id': tenantId,
      'Authorization': `Bearer ${token}`,
    },
  });
  const data = await response.json();
  return { success: response.ok, message: data.message || data.error };
}

// ============================================
// MessengerStatusCard Component
// ============================================

function MessengerStatusCard({
  health,
  isLoading
}: {
  health: HealthStatus | null;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-60" />
          </div>
        </CardHeader>
      </Card>
    );
  }

  const isConnected = health?.connected && health?.tokenStatus === 'valid';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-4">
        <div className={`p-3 rounded-lg ${isConnected ? 'bg-green-500' : 'bg-gray-400'}`}>
          <MessageCircle className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Facebook Messenger</CardTitle>
            {isConnected ? (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Conectado
              </Badge>
            ) : (
              <Badge variant="secondary">
                <XCircle className="h-3 w-3 mr-1" />
                Sin conectar
              </Badge>
            )}
          </div>
          <CardDescription className="mt-1">
            {isConnected
              ? `Conectado a: ${health?.pageName || 'Pagina de Facebook'}`
              : 'Conecta tu pagina de Facebook para recibir mensajes en Ventazo.'
            }
          </CardDescription>
        </div>
      </CardHeader>
      {isConnected && health?.lastWebhookAt && (
        <CardContent className="pt-0">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            Ultimo mensaje recibido: {new Date(health.lastWebhookAt).toLocaleString('es-MX')}
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ============================================
// ConnectWithFacebookButton Component
// ============================================

function ConnectWithFacebookButton({ tenantId }: { tenantId: string }) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConnect = () => {
    setIsLoading(true);
    // Redirect to OAuth flow
    const callbackUrl = `${window.location.origin}/app/settings/integrations/messenger`;
    const oauthUrl = `${API_BASE}/api/v1/messenger/oauth/connect?tenantId=${tenantId}&callbackUrl=${encodeURIComponent(callbackUrl)}`;
    window.location.href = oauthUrl;
  };

  return (
    <Button
      onClick={handleConnect}
      disabled={isLoading}
      className="bg-[#1877F2] hover:bg-[#166FE5] text-white"
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4 mr-2" />
      )}
      Conectar con Facebook
    </Button>
  );
}

// ============================================
// TestConnectionButton Component
// ============================================

function TestConnectionButton({
  tenantId,
  token,
  onResult
}: {
  tenantId: string;
  token: string;
  onResult: (success: boolean, message: string) => void;
}) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleTest = async () => {
    setIsLoading(true);
    try {
      const result = await testConnection(tenantId, token);
      onResult(result.success, result.message || (result.success ? 'Conexion exitosa' : 'Error de conexion'));
    } catch (error) {
      onResult(false, 'Error al probar la conexion');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button variant="outline" onClick={handleTest} disabled={isLoading}>
      {isLoading ? (
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
      ) : (
        <RefreshCw className="h-4 w-4 mr-2" />
      )}
      Probar Conexion
    </Button>
  );
}

// ============================================
// DisconnectConfirmationModal Component
// ============================================

function DisconnectConfirmationModal({
  pageName,
  onConfirm,
  isLoading,
}: {
  pageName: string;
  onConfirm: () => void;
  isLoading: boolean;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="h-4 w-4 mr-1" />
          Desconectar
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Desconectar pagina de Facebook</AlertDialogTitle>
          <AlertDialogDescription>
            Estas seguro de que deseas desconectar <strong>{pageName}</strong>?
            Ya no recibiras mensajes de Messenger en Ventazo desde esta pagina.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={isLoading}
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Desconectar
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ============================================
// ConnectedPagesTable Component
// ============================================

function ConnectedPagesTable({
  pages,
  tenantId,
  token,
  onRefresh,
}: {
  pages: ConnectedPage[];
  tenantId: string;
  token: string;
  onRefresh: () => void;
}) {
  const { toast } = useToast();
  const [loadingPageId, setLoadingPageId] = React.useState<string | null>(null);

  const handleSetDefault = async (pageId: string) => {
    setLoadingPageId(pageId);
    try {
      await setDefaultPage(tenantId, pageId, token);
      toast({
        title: 'Pagina predeterminada actualizada',
        description: 'La pagina se ha establecido como predeterminada.',
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo establecer la pagina como predeterminada.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPageId(null);
    }
  };

  const handleDisconnect = async (pageId: string) => {
    setLoadingPageId(pageId);
    try {
      await disconnectPage(tenantId, pageId, token);
      toast({
        title: 'Pagina desconectada',
        description: 'La pagina ha sido desconectada exitosamente.',
      });
      onRefresh();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo desconectar la pagina.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPageId(null);
    }
  };

  if (pages.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Sin paginas conectadas</AlertTitle>
        <AlertDescription>
          No tienes ninguna pagina de Facebook conectada. Haz clic en "Conectar con Facebook" para comenzar.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Paginas Conectadas</CardTitle>
        <CardDescription>
          Administra las paginas de Facebook conectadas a tu cuenta de Ventazo.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pagina</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Conectada</TableHead>
              <TableHead className="text-right">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pages.map((page) => (
              <TableRow key={page.id}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{page.pageName}</span>
                    {page.isDefault && (
                      <Badge variant="default" className="bg-yellow-500 hover:bg-yellow-600">
                        <Star className="h-3 w-3 mr-1" />
                        Predeterminada
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Activa
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {new Date(page.connectedAt).toLocaleDateString('es-MX')}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    {!page.isDefault && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleSetDefault(page.pageId)}
                        disabled={loadingPageId === page.pageId}
                      >
                        {loadingPageId === page.pageId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Star className="h-4 w-4 mr-1" />
                        )}
                        Predeterminar
                      </Button>
                    )}
                    <DisconnectConfirmationModal
                      pageName={page.pageName}
                      onConfirm={() => handleDisconnect(page.pageId)}
                      isLoading={loadingPageId === page.pageId}
                    />
                  </div>
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
// MessengerIntegrationPage (Main Component)
// ============================================

export default function MessengerIntegrationPage() {
  const { toast } = useToast();
  const { currentTenant } = useTenantStore();
  const [pages, setPages] = React.useState<ConnectedPage[]>([]);
  const [health, setHealth] = React.useState<HealthStatus | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [oauthError, setOauthError] = React.useState<string | null>(null);

  // Get token from session storage or auth context
  const token = typeof window !== 'undefined'
    ? localStorage.getItem('accessToken') || ''
    : '';
  const tenantId = currentTenant?.id || '';

  // Check for OAuth callback errors in URL
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const error = params.get('error');
      const success = params.get('success');

      if (error) {
        setOauthError(decodeURIComponent(error));
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }

      if (success === 'true') {
        toast({
          title: 'Conexion exitosa',
          description: 'Tu pagina de Facebook ha sido conectada correctamente.',
        });
        // Clean URL
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [toast]);

  const fetchData = React.useCallback(async () => {
    if (!tenantId || !token) return;

    setIsLoading(true);
    try {
      const [pagesData, healthData] = await Promise.all([
        fetchConnectedPages(tenantId, token).catch(() => []),
        fetchHealthStatus(tenantId, token).catch(() => null),
      ]);
      setPages(pagesData);
      setHealth(healthData);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [tenantId, token]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleTestResult = (success: boolean, message: string) => {
    toast({
      title: success ? 'Conexion exitosa' : 'Error de conexion',
      description: message,
      variant: success ? 'default' : 'destructive',
    });
  };

  const isConnected = health?.connected && health?.tokenStatus === 'valid';

  return (
    <div className="space-y-6">
      {/* Header with back button */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/app/settings/integrations">
            <ArrowLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Facebook Messenger</h2>
          <p className="text-muted-foreground">
            Configura la integracion con Facebook Messenger para recibir y responder mensajes.
          </p>
        </div>
      </div>

      {/* OAuth Error Alert */}
      {oauthError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error de conexion</AlertTitle>
          <AlertDescription>{oauthError}</AlertDescription>
        </Alert>
      )}

      {/* Status Card */}
      <MessengerStatusCard health={health} isLoading={isLoading} />

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {!isConnected && tenantId && (
          <ConnectWithFacebookButton tenantId={tenantId} />
        )}
        {isConnected && tenantId && token && (
          <>
            <ConnectWithFacebookButton tenantId={tenantId} />
            <TestConnectionButton
              tenantId={tenantId}
              token={token}
              onResult={handleTestResult}
            />
          </>
        )}
      </div>

      {/* Connected Pages Table */}
      {!isLoading && (
        <ConnectedPagesTable
          pages={pages}
          tenantId={tenantId}
          token={token}
          onRefresh={fetchData}
        />
      )}

      {/* Help Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Como funciona</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              1
            </div>
            <div>
              <p className="font-medium">Conecta tu pagina de Facebook</p>
              <p className="text-sm text-muted-foreground">
                Haz clic en "Conectar con Facebook" y autoriza el acceso a tu pagina.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              2
            </div>
            <div>
              <p className="font-medium">Selecciona la pagina</p>
              <p className="text-sm text-muted-foreground">
                Elige cual de tus paginas de Facebook quieres conectar.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-sm font-medium">
              3
            </div>
            <div>
              <p className="font-medium">Recibe mensajes en Ventazo</p>
              <p className="text-sm text-muted-foreground">
                Los mensajes de Messenger apareceran en tu bandeja unificada.
              </p>
            </div>
          </div>
        </CardContent>
        <CardFooter>
          <Button variant="link" className="px-0" asChild>
            <a
              href="https://developers.facebook.com/docs/messenger-platform"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver documentacion de Facebook Messenger
              <ExternalLink className="h-4 w-4 ml-1" />
            </a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

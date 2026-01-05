'use client';

/**
 * Security Settings Page
 *
 * Manages authentication, sessions and security policies.
 * Admin-only access.
 */

import * as React from 'react';
import {
  Shield,
  Key,
  Smartphone,
  LogOut,
  Clock,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { RBACGuard } from '@/lib/auth';
import { useAuthStore } from '@/store';
import {
  useSecurityManagement,
  useEnable2FA,
  useDisable2FA,
  useVerify2FA,
  useRevokeSession,
  useRevokeAllSessions,
  useUpdatePasswordPolicy,
  useUpdateSessionSettings,
} from '@/lib/security';

// ============================================
// Helper Functions
// ============================================

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Ahora';
  if (diffMins < 60) return `Hace ${diffMins} min`;
  if (diffHours < 24) return `Hace ${diffHours} horas`;
  return `Hace ${diffDays} dias`;
}

// ============================================
// Security Settings Page
// ============================================

export default function SecurityPage() {
  const { toast } = useToast();
  const user = useAuthStore((state) => state.user);

  // Use the new security hooks
  const {
    twoFactorStatus,
    sessions: sessionsData,
    passwordPolicy,
    sessionSettings,
    stats,
    isLoading,
    refetchAll,
  } = useSecurityManagement();

  // Mutations
  const enable2FA = useEnable2FA();
  const disable2FA = useDisable2FA();
  const verify2FA = useVerify2FA();
  const revokeSession = useRevokeSession();
  const revokeAllSessions = useRevokeAllSessions();
  const updatePasswordPolicy = useUpdatePasswordPolicy();
  const updateSessionSettings = useUpdateSessionSettings();

  // Local state for 2FA setup flow
  const [showQRCode, setShowQRCode] = React.useState(false);
  const [qrCodeUrl, setQrCodeUrl] = React.useState('');
  const [verificationCode, setVerificationCode] = React.useState('');

  // Derive settings from backend data
  const settings = {
    twoFactorEnabled: twoFactorStatus?.enabled || false,
    sessionTimeout: sessionSettings?.sessionTimeout || 30,
    requireStrongPasswords: passwordPolicy?.requireUppercase && passwordPolicy?.requireNumbers || true,
    allowRememberMe: sessionSettings?.allowRememberMe || true,
    maxLoginAttempts: 5,
  };

  // Map sessions from API
  const sessions = sessionsData.map((session) => ({
    id: session.id,
    device: `${session.browser} en ${session.os}`,
    location: session.location || 'Ubicacion desconocida',
    lastActive: session.isCurrent ? 'Ahora' : formatRelativeTime(session.lastActiveAt),
    isCurrent: session.isCurrent,
  }));

  const handleToggle2FA = async () => {
    try {
      if (settings.twoFactorEnabled) {
        // Need verification code to disable
        // For now, show a simple flow - in production, show a dialog
        await disable2FA.mutateAsync({ code: verificationCode });
        toast({
          title: '2FA desactivado',
          description: 'La autenticacion de dos factores ha sido desactivada',
        });
      } else {
        // Start 2FA setup
        const response = await enable2FA.mutateAsync('totp');
        setQrCodeUrl(response.qrCodeUrl);
        setShowQRCode(true);
        toast({
          title: 'Configuracion 2FA',
          description: 'Escanea el codigo QR con tu aplicacion de autenticacion',
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuracion',
        variant: 'destructive',
      });
    }
  };

  const handleEndSession = async (sessionId: string) => {
    try {
      await revokeSession.mutateAsync(sessionId);
      toast({
        title: 'Sesion cerrada',
        description: 'La sesion ha sido cerrada exitosamente',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo cerrar la sesion',
        variant: 'destructive',
      });
    }
  };

  const handleEndAllSessions = async () => {
    try {
      const result = await revokeAllSessions.mutateAsync();
      toast({
        title: 'Todas las sesiones cerradas',
        description: `Se han cerrado ${result.revokedCount} sesiones`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudieron cerrar las sesiones',
        variant: 'destructive',
      });
    }
  };

  const handleUpdatePasswordPolicy = async (update: { requireStrongPasswords: boolean }) => {
    try {
      await updatePasswordPolicy.mutateAsync({
        requireUppercase: update.requireStrongPasswords,
        requireNumbers: update.requireStrongPasswords,
        requireSpecialChars: update.requireStrongPasswords,
      });
      toast({
        title: 'Politica actualizada',
        description: 'La politica de contrasenas ha sido actualizada',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la politica',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSessionSettings = async (update: { allowRememberMe?: boolean }) => {
    try {
      await updateSessionSettings.mutateAsync(update);
      toast({
        title: 'Configuracion actualizada',
        description: 'La configuracion de sesiones ha sido actualizada',
      });
    } catch {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar la configuracion',
        variant: 'destructive',
      });
    }
  };

  return (
    <RBACGuard minRole="admin" fallback={
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <Shield className="h-12 w-12 text-muted-foreground/50" />
        <h2 className="mt-4 text-lg font-semibold">Acceso restringido</h2>
        <p className="text-muted-foreground">
          Solo los administradores pueden acceder a esta seccion
        </p>
      </div>
    }>
      <div className="space-y-6">
        {/* Page Header */}
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Seguridad</h2>
          <p className="text-muted-foreground">
            Gestiona la autenticacion, sesiones y politicas de seguridad
          </p>
        </div>

        <Separator />

        {/* Two-Factor Authentication */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Autenticacion de Dos Factores (2FA)
            </CardTitle>
            <CardDescription>
              Agrega una capa adicional de seguridad a tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Estado de 2FA</p>
                <p className="text-sm text-muted-foreground">
                  {settings.twoFactorEnabled
                    ? 'Tu cuenta esta protegida con 2FA'
                    : 'Habilita 2FA para mayor seguridad'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge variant={settings.twoFactorEnabled ? 'default' : 'secondary'}>
                  {settings.twoFactorEnabled ? (
                    <><CheckCircle2 className="mr-1 h-3 w-3" /> Activo</>
                  ) : (
                    <><AlertTriangle className="mr-1 h-3 w-3" /> Inactivo</>
                  )}
                </Badge>
                <Switch
                  checked={settings.twoFactorEnabled}
                  disabled={enable2FA.isPending || disable2FA.isPending || isLoading}
                  onCheckedChange={handleToggle2FA}
                />
              </div>
            </div>

            {!settings.twoFactorEnabled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950">
                <div className="flex gap-3">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <div>
                    <p className="font-medium text-amber-800 dark:text-amber-200">
                      Recomendacion de seguridad
                    </p>
                    <p className="text-sm text-amber-700 dark:text-amber-300">
                      Te recomendamos activar la autenticacion de dos factores para proteger tu cuenta.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Active Sessions */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Sesiones Activas
                </CardTitle>
                <CardDescription>
                  Dispositivos donde has iniciado sesion
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={handleEndAllSessions}>
                <LogOut className="mr-2 h-4 w-4" />
                Cerrar todas
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="flex items-center justify-between rounded-lg border p-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                      <Smartphone className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{session.device}</p>
                        {session.isCurrent && (
                          <Badge variant="secondary" className="text-xs">
                            Actual
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {session.location} · {session.lastActive}
                      </p>
                    </div>
                  </div>
                  {!session.isCurrent && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEndSession(session.id)}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Password Policy */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Politicas de Contrasena
            </CardTitle>
            <CardDescription>
              Configura los requisitos de contrasena para tu organizacion
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Contrasenas fuertes obligatorias</p>
                <p className="text-sm text-muted-foreground">
                  Requiere mayusculas, numeros y caracteres especiales
                </p>
              </div>
              <Switch
                checked={settings.requireStrongPasswords}
                disabled={updatePasswordPolicy.isPending}
                onCheckedChange={(checked) =>
                  handleUpdatePasswordPolicy({ requireStrongPasswords: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Permitir "Recordarme"</p>
                <p className="text-sm text-muted-foreground">
                  Los usuarios pueden mantener su sesion activa
                </p>
              </div>
              <Switch
                checked={settings.allowRememberMe}
                disabled={updateSessionSettings.isPending}
                onCheckedChange={(checked) =>
                  handleUpdateSessionSettings({ allowRememberMe: checked })
                }
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="font-medium">Tiempo de sesion</p>
                <p className="text-sm text-muted-foreground">
                  La sesion expira despues de {settings.sessionTimeout} minutos de inactividad
                </p>
              </div>
              <Badge variant="outline">
                <Clock className="mr-1 h-3 w-3" />
                {settings.sessionTimeout} min
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Security Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  stats?.accountStatus === 'secure'
                    ? 'bg-green-100 dark:bg-green-900'
                    : stats?.accountStatus === 'warning'
                    ? 'bg-amber-100 dark:bg-amber-900'
                    : 'bg-red-100 dark:bg-red-900'
                }`}>
                  <CheckCircle2 className={`h-6 w-6 ${
                    stats?.accountStatus === 'secure'
                      ? 'text-green-600 dark:text-green-400'
                      : stats?.accountStatus === 'warning'
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-red-600 dark:text-red-400'
                  }`} />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {stats?.accountStatus === 'secure' ? 'Seguro' :
                     stats?.accountStatus === 'warning' ? 'Advertencia' : 'En riesgo'}
                  </div>
                  <p className="text-xs text-muted-foreground">Estado de cuenta</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Smartphone className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">{stats?.activeSessions ?? sessions.length}</div>
                  <p className="text-xs text-muted-foreground">Sesiones activas</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <div>
                  <div className="text-2xl font-bold">
                    {stats?.lastLogin ? formatRelativeTime(stats.lastLogin) : 'Ahora'}
                  </div>
                  <p className="text-xs text-muted-foreground">Ultimo acceso</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </RBACGuard>
  );
}

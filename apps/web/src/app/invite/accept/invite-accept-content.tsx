'use client';

import * as React from 'react';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  CheckCircle2,
  Loader2,
  AlertTriangle,
  XCircle,
  Users,
  Shield,
  Mail,
  ArrowRight,
  LogIn,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useSession } from '@/lib/auth';
import { API_BASE_URL } from '@/lib/api/api-client';

// ============================================
// Types
// ============================================

interface InvitationDetails {
  id: string;
  email: string;
  role: string;
  status: string;
  expiresAt: string;
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  inviterName: string;
  customMessage?: string;
}

type InvitationState =
  | { status: 'loading' }
  | { status: 'not-found' }
  | { status: 'expired' }
  | { status: 'already-accepted' }
  | { status: 'cancelled' }
  | { status: 'requires-auth'; invitation: InvitationDetails }
  | { status: 'email-mismatch'; invitation: InvitationDetails; userEmail: string }
  | { status: 'ready'; invitation: InvitationDetails }
  | { status: 'accepting' }
  | { status: 'accepted'; tenantName: string }
  | { status: 'error'; message: string };

const ROLE_LABELS: Record<string, { label: string; description: string }> = {
  owner: { label: 'Propietario', description: 'Acceso total a todas las funciones' },
  admin: { label: 'Administrador', description: 'Acceso total excepto facturación' },
  manager: { label: 'Gerente', description: 'Gestión de equipo y reportes' },
  sales_rep: { label: 'Vendedor', description: 'Gestión de leads y clientes propios' },
  viewer: { label: 'Visualizador', description: 'Solo lectura' },
};

// ============================================
// Invitation Accept Content
// ============================================

export function InviteAcceptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const { user, isAuthenticated, isLoading: isSessionLoading, tokens } = useSession();

  const [state, setState] = React.useState<InvitationState>({ status: 'loading' });

  // Fetch invitation details
  React.useEffect(() => {
    if (!token) {
      setState({ status: 'not-found' });
      return;
    }

    if (isSessionLoading) {
      return; // Wait for session to load
    }

    const fetchInvitation = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/invitations/token/${token}`);

        if (response.status === 404) {
          setState({ status: 'not-found' });
          return;
        }

        if (response.status === 410) {
          const data = await response.json();
          if (data.message?.includes('expired')) {
            setState({ status: 'expired' });
          } else if (data.message?.includes('already been accepted')) {
            setState({ status: 'already-accepted' });
          } else if (data.message?.includes('cancelled')) {
            setState({ status: 'cancelled' });
          } else {
            setState({ status: 'expired' });
          }
          return;
        }

        if (!response.ok) {
          setState({ status: 'error', message: 'Error al cargar la invitación' });
          return;
        }

        const invitation: InvitationDetails = await response.json();

        // Check if user is authenticated
        if (!isAuthenticated || !user) {
          setState({ status: 'requires-auth', invitation });
          return;
        }

        // Check if email matches
        if (user.email.toLowerCase() !== invitation.email.toLowerCase()) {
          setState({
            status: 'email-mismatch',
            invitation,
            userEmail: user.email,
          });
          return;
        }

        setState({ status: 'ready', invitation });
      } catch (error) {
        console.error('[InvitationAccept] Error:', error);
        setState({
          status: 'error',
          message: error instanceof Error ? error.message : 'Error inesperado',
        });
      }
    };

    fetchInvitation();
  }, [token, isAuthenticated, user, isSessionLoading]);

  // Accept invitation
  const handleAccept = async () => {
    if (state.status !== 'ready') return;

    setState({ status: 'accepting' });

    try {
      const accessToken = tokens?.accessToken;
      if (!accessToken) {
        setState({ status: 'requires-auth', invitation: state.invitation });
        return;
      }

      const response = await fetch(`${API_BASE_URL}/invitations/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ token }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.message || 'Error al aceptar la invitación');
      }

      setState({ status: 'accepted', tenantName: state.invitation.tenant.name });

      // Redirect to dashboard after 2 seconds
      setTimeout(() => {
        router.push('/app/dashboard');
      }, 2000);
    } catch (error) {
      console.error('[InvitationAccept] Accept error:', error);
      setState({
        status: 'error',
        message: error instanceof Error ? error.message : 'Error al aceptar la invitación',
      });
    }
  };

  // Redirect to login with return URL
  const handleLoginRedirect = () => {
    const returnUrl = `/invite/accept?token=${token}`;
    router.push(`/login?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  // Redirect to signup with return URL
  const handleSignupRedirect = () => {
    const returnUrl = `/invite/accept?token=${token}`;
    router.push(`/signup?returnUrl=${encodeURIComponent(returnUrl)}`);
  };

  // Render content based on state
  const renderContent = () => {
    switch (state.status) {
      case 'loading':
        return (
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Cargando invitación...</p>
            </CardContent>
          </Card>
        );

      case 'not-found':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Invitación no encontrada</CardTitle>
              <CardDescription>
                El enlace de invitación no es válido o ya no existe.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button asChild>
                <Link href="/login">Ir al inicio de sesión</Link>
              </Button>
            </CardFooter>
          </Card>
        );

      case 'expired':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
              </div>
              <CardTitle>Invitación expirada</CardTitle>
              <CardDescription>
                Esta invitación ha expirado. Contacta con la persona que te invitó para
                solicitar una nueva invitación.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button asChild variant="outline">
                <Link href="/login">Ir al inicio de sesión</Link>
              </Button>
            </CardFooter>
          </Card>
        );

      case 'already-accepted':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
              </div>
              <CardTitle>Invitación ya aceptada</CardTitle>
              <CardDescription>
                Ya has aceptado esta invitación anteriormente. Puedes iniciar sesión para
                acceder a tu cuenta.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button asChild>
                <Link href="/login">Iniciar sesión</Link>
              </Button>
            </CardFooter>
          </Card>
        );

      case 'cancelled':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-muted">
                <XCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <CardTitle>Invitación cancelada</CardTitle>
              <CardDescription>
                Esta invitación ha sido cancelada por el administrador.
              </CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button asChild variant="outline">
                <Link href="/login">Ir al inicio de sesión</Link>
              </Button>
            </CardFooter>
          </Card>
        );

      case 'requires-auth':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Te han invitado a unirte</CardTitle>
              <CardDescription>
                {state.invitation.inviterName} te ha invitado a unirte a{' '}
                <span className="font-semibold">{state.invitation.tenant.name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invitation details */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{state.invitation.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">
                    Rol: {ROLE_LABELS[state.invitation.role]?.label || state.invitation.role}
                  </span>
                </div>
              </div>

              {state.invitation.customMessage && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm italic text-muted-foreground">
                    "{state.invitation.customMessage}"
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    - {state.invitation.inviterName}
                  </p>
                </div>
              )}

              <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  Para aceptar esta invitación, necesitas iniciar sesión o crear una cuenta
                  con el email <strong>{state.invitation.email}</strong>
                </p>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button className="w-full" onClick={handleLoginRedirect}>
                <LogIn className="mr-2 h-4 w-4" />
                Iniciar sesión
              </Button>
              <Button className="w-full" variant="outline" onClick={handleSignupRedirect}>
                Crear una cuenta
              </Button>
            </CardFooter>
          </Card>
        );

      case 'email-mismatch':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/20">
                <AlertTriangle className="h-8 w-8 text-yellow-600 dark:text-yellow-500" />
              </div>
              <CardTitle>Email incorrecto</CardTitle>
              <CardDescription>
                Esta invitación fue enviada a{' '}
                <span className="font-semibold">{state.invitation.email}</span>, pero estás
                conectado como <span className="font-semibold">{state.userEmail}</span>
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center">
                Por favor cierra sesión e inicia sesión con el email correcto, o contacta
                con {state.invitation.inviterName} para solicitar una nueva invitación.
              </p>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button
                className="w-full"
                variant="outline"
                onClick={() => {
                  // Clear session and redirect to login
                  router.push(`/logout?returnUrl=${encodeURIComponent(`/invite/accept?token=${token}`)}`);
                }}
              >
                Cerrar sesión y usar otro email
              </Button>
            </CardFooter>
          </Card>
        );

      case 'ready':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <CardTitle>Te han invitado a unirte</CardTitle>
              <CardDescription>
                {state.invitation.inviterName} te ha invitado a unirte a{' '}
                <span className="font-semibold">{state.invitation.tenant.name}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Invitation details */}
              <div className="rounded-lg bg-muted/50 p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{state.invitation.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <span className="text-sm font-medium">
                      {ROLE_LABELS[state.invitation.role]?.label || state.invitation.role}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[state.invitation.role]?.description}
                    </p>
                  </div>
                </div>
              </div>

              {state.invitation.customMessage && (
                <div className="rounded-lg border p-4">
                  <p className="text-sm italic text-muted-foreground">
                    "{state.invitation.customMessage}"
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    - {state.invitation.inviterName}
                  </p>
                </div>
              )}
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button className="w-full" size="lg" onClick={handleAccept}>
                Aceptar invitación
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                Al aceptar, tendrás acceso a los recursos compartidos de{' '}
                {state.invitation.tenant.name}
              </p>
            </CardFooter>
          </Card>
        );

      case 'accepting':
        return (
          <Card className="w-full max-w-md">
            <CardContent className="flex flex-col items-center py-12">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="mt-4 text-muted-foreground">Aceptando invitación...</p>
            </CardContent>
          </Card>
        );

      case 'accepted':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/20">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-500" />
              </div>
              <CardTitle>Bienvenido al equipo</CardTitle>
              <CardDescription>
                Te has unido exitosamente a{' '}
                <span className="font-semibold">{state.tenantName}</span>
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-sm text-muted-foreground">
                Redirigiendo al dashboard...
              </p>
            </CardContent>
          </Card>
        );

      case 'error':
        return (
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="h-8 w-8 text-destructive" />
              </div>
              <CardTitle>Error</CardTitle>
              <CardDescription>{state.message}</CardDescription>
            </CardHeader>
            <CardFooter className="flex justify-center">
              <Button
                variant="outline"
                onClick={() => window.location.reload()}
              >
                Intentar de nuevo
              </Button>
            </CardFooter>
          </Card>
        );
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-background via-background to-muted/20 p-4">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-1/2 left-1/2 h-[800px] w-[800px] -translate-x-1/2 rounded-full bg-primary/5 blur-3xl" />
      </div>

      {renderContent()}
    </div>
  );
}

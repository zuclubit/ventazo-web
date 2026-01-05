'use client';

import * as React from 'react';

import Link from 'next/link';

import {
  AlertTriangle,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  CreditCard,
  Crown,
  Download,
  ExternalLink,
  Loader2,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Shield,
  Sparkles,
  Trash2,
  XCircle,
  Zap,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RBACGuard, usePermissions } from '@/lib/auth';
import { cn } from '@/lib/utils';
import {
  useBillingOverview,
  useTrialInfo,
  useCancelSubscription,
  useReactivateSubscription,
  useCreateCheckoutSession,
  useCreatePortalSession,
  type Subscription,
  type Invoice,
  type PaymentMethod,
  type UsageMetric,
} from '@/lib/subscriptions';

// ============================================
// Plan Config
// ============================================

const PLAN_CONFIG = {
  free: {
    name: 'Starter',
    color: 'bg-slate-100 text-slate-700',
    icon: Zap,
    features: ['500 leads', '2 usuarios', 'Pipeline básico'],
  },
  starter: {
    name: 'Starter',
    color: 'bg-slate-100 text-slate-700',
    icon: Zap,
    features: ['500 leads', '2 usuarios', 'Pipeline básico'],
  },
  pro: {
    name: 'Professional',
    color: 'bg-primary/10 text-primary',
    icon: Crown,
    features: ['Leads ilimitados', 'Usuarios ilimitados', 'Automatizaciones', 'IA incluida'],
  },
  enterprise: {
    name: 'Enterprise',
    color: 'bg-purple-100 text-purple-700',
    icon: Sparkles,
    features: ['Todo en Pro', 'SSO corporativo', 'API dedicada', 'SLA garantizado'],
  },
};

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: 'Activa', color: 'bg-green-100 text-green-700' },
  trialing: { label: 'En prueba', color: 'bg-blue-100 text-blue-700' },
  past_due: { label: 'Pago pendiente', color: 'bg-yellow-100 text-yellow-700' },
  canceled: { label: 'Cancelada', color: 'bg-red-100 text-red-700' },
  paused: { label: 'Pausada', color: 'bg-slate-100 text-slate-700' },
};

// ============================================
// Billing Page
// ============================================

export default function BillingPage() {
  usePermissions();

  const { data: billingData, isLoading, refetch } = useBillingOverview();
  const { data: trialInfo } = useTrialInfo();

  const [isCancelDialogOpen, setIsCancelDialogOpen] = React.useState(false);
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = React.useState(false);

  const cancelMutation = useCancelSubscription();
  const reactivateMutation = useReactivateSubscription();
  const checkoutMutation = useCreateCheckoutSession();
  const portalMutation = useCreatePortalSession();

  const handleOpenPortal = async () => {
    try {
      const result = await portalMutation.mutateAsync(window.location.href);
      window.location.href = result.url;
    } catch (error) {
      console.error('Error opening portal:', error);
    }
  };

  const handleCancelSubscription = async () => {
    if (!billingData?.subscription?.id) return;

    try {
      await cancelMutation.mutateAsync({
        subscriptionId: billingData.subscription.id,
        request: { cancelAtPeriodEnd: true },
      });
      setIsCancelDialogOpen(false);
      refetch();
    } catch (error) {
      console.error('Error canceling subscription:', error);
    }
  };

  const handleReactivate = async () => {
    if (!billingData?.subscription?.id) return;

    try {
      await reactivateMutation.mutateAsync(billingData.subscription.id);
      refetch();
    } catch (error) {
      console.error('Error reactivating:', error);
    }
  };

  const handleUpgrade = async (planId: string) => {
    try {
      const result = await checkoutMutation.mutateAsync({
        planId,
        billingInterval: 'monthly',
        successUrl: `${window.location.origin}/app/settings/billing?success=true`,
        cancelUrl: `${window.location.origin}/app/settings/billing?canceled=true`,
      });
      window.location.href = result.url;
    } catch (error) {
      console.error('Error creating checkout:', error);
    }
  };

  return (
    <RBACGuard
      fallback={
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Shield className="mb-4 h-12 w-12 text-muted-foreground" />
          <h2 className="text-xl font-semibold">Acceso Restringido</h2>
          <p className="text-muted-foreground">
            Solo el propietario puede acceder a la configuración de facturación
          </p>
        </div>
      }
      permission="TENANT_BILLING"
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Facturación</h2>
            <p className="text-muted-foreground">
              Gestiona tu suscripción, métodos de pago y facturas
            </p>
          </div>
          <Button onClick={handleOpenPortal} disabled={portalMutation.isPending}>
            {portalMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ExternalLink className="mr-2 h-4 w-4" />
            )}
            Portal de facturación
          </Button>
        </div>

        <Separator />

        {/* Trial Banner */}
        {trialInfo?.isInTrial && (
          <TrialBanner
            daysRemaining={trialInfo.daysRemaining}
            trialEndsAt={trialInfo.trialEndsAt}
            onUpgrade={() => setIsUpgradeDialogOpen(true)}
          />
        )}

        {/* Main Content */}
        {isLoading ? (
          <BillingSkeleton />
        ) : (
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Resumen</TabsTrigger>
              <TabsTrigger value="invoices">Facturas</TabsTrigger>
              <TabsTrigger value="usage">Uso</TabsTrigger>
            </TabsList>

            <TabsContent className="space-y-6 pt-4" value="overview">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Current Plan */}
                <CurrentPlanCard
                  subscription={billingData?.subscription}
                  onCancel={() => setIsCancelDialogOpen(true)}
                  onReactivate={handleReactivate}
                  onUpgrade={() => setIsUpgradeDialogOpen(true)}
                  isReactivating={reactivateMutation.isPending}
                />

                {/* Next Invoice */}
                <NextInvoiceCard
                  upcomingInvoice={billingData?.upcomingInvoice}
                  subscription={billingData?.subscription}
                />
              </div>

              {/* Payment Methods */}
              <PaymentMethodsCard
                methods={billingData?.paymentMethods || []}
                onManage={handleOpenPortal}
              />
            </TabsContent>

            <TabsContent className="space-y-6 pt-4" value="invoices">
              <InvoicesTable invoices={billingData?.recentInvoices || []} />
            </TabsContent>

            <TabsContent className="space-y-6 pt-4" value="usage">
              <UsageOverview usage={billingData?.usage || []} />
            </TabsContent>
          </Tabs>
        )}

        {/* Cancel Dialog */}
        <Dialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cancelar suscripción</DialogTitle>
              <DialogDescription>
                Tu suscripción se cancelará al final del período de facturación actual.
                Seguirás teniendo acceso hasta entonces.
              </DialogDescription>
            </DialogHeader>
            <div className="rounded-lg bg-yellow-50 p-4 dark:bg-yellow-900/20">
              <div className="flex gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div className="text-sm text-yellow-800 dark:text-yellow-200">
                  <p className="font-medium">Perderás acceso a:</p>
                  <ul className="mt-1 list-inside list-disc">
                    <li>Automatizaciones</li>
                    <li>IA y scoring predictivo</li>
                    <li>Reportes avanzados</li>
                  </ul>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsCancelDialogOpen(false)}>
                Mantener suscripción
              </Button>
              <Button
                variant="destructive"
                onClick={handleCancelSubscription}
                disabled={cancelMutation.isPending}
              >
                {cancelMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Confirmar cancelación
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Upgrade Dialog */}
        <Dialog open={isUpgradeDialogOpen} onOpenChange={setIsUpgradeDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>Mejora tu plan</DialogTitle>
              <DialogDescription>
                Desbloquea todas las funcionalidades de Ventazo
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4 md:grid-cols-2">
              {/* Pro Plan */}
              <Card className="border-primary">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Professional</CardTitle>
                    <Badge>Recomendado</Badge>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">$29</span>
                    <span className="text-muted-foreground">/usuario/mes</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {PLAN_CONFIG.pro.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    className="w-full"
                    onClick={() => handleUpgrade('pro')}
                    disabled={checkoutMutation.isPending}
                  >
                    {checkoutMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : null}
                    Elegir Professional
                  </Button>
                </CardFooter>
              </Card>

              {/* Enterprise Plan */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Enterprise</CardTitle>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">Personalizado</span>
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    {PLAN_CONFIG.enterprise.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button className="w-full" variant="outline" asChild>
                    <Link href="mailto:ventas@ventazo.app">Contactar ventas</Link>
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </RBACGuard>
  );
}

// ============================================
// Trial Banner Component
// ============================================

function TrialBanner({
  daysRemaining,
  trialEndsAt,
  onUpgrade,
}: {
  daysRemaining: number;
  trialEndsAt?: string;
  onUpgrade: () => void;
}) {
  const urgencyClass =
    daysRemaining <= 1
      ? 'bg-red-50 border-red-200 dark:bg-red-900/20'
      : daysRemaining <= 3
        ? 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20'
        : 'bg-blue-50 border-blue-200 dark:bg-blue-900/20';

  const textClass =
    daysRemaining <= 1
      ? 'text-red-800 dark:text-red-200'
      : daysRemaining <= 3
        ? 'text-yellow-800 dark:text-yellow-200'
        : 'text-blue-800 dark:text-blue-200';

  return (
    <div className={cn('rounded-lg border p-4', urgencyClass)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-full',
              daysRemaining <= 1
                ? 'bg-red-100 dark:bg-red-800'
                : daysRemaining <= 3
                  ? 'bg-yellow-100 dark:bg-yellow-800'
                  : 'bg-blue-100 dark:bg-blue-800'
            )}
          >
            <Calendar className={cn('h-5 w-5', textClass)} />
          </div>
          <div>
            <p className={cn('font-medium', textClass)}>
              {daysRemaining === 0
                ? 'Tu prueba termina hoy'
                : daysRemaining === 1
                  ? 'Tu prueba termina mañana'
                  : `Te quedan ${daysRemaining} días de prueba`}
            </p>
            <p className={cn('text-sm opacity-80', textClass)}>
              {trialEndsAt &&
                `Termina el ${new Date(trialEndsAt).toLocaleDateString('es-MX', {
                  day: 'numeric',
                  month: 'long',
                })}`}
            </p>
          </div>
        </div>
        <Button onClick={onUpgrade}>
          <ArrowUpRight className="mr-2 h-4 w-4" />
          Mejorar ahora
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Current Plan Card
// ============================================

function CurrentPlanCard({
  subscription,
  onCancel,
  onReactivate,
  onUpgrade,
  isReactivating,
}: {
  subscription?: Subscription | null;
  onCancel: () => void;
  onReactivate: () => void;
  onUpgrade: () => void;
  isReactivating: boolean;
}) {
  const planTier = subscription?.plan?.tier || 'free';
  const planConfig = PLAN_CONFIG[planTier as keyof typeof PLAN_CONFIG] || PLAN_CONFIG.free;
  const statusConfig = STATUS_CONFIG[subscription?.status || 'active'] ?? { label: 'Activa', color: 'bg-green-100 text-green-700' };
  const PlanIcon = planConfig.icon;

  const isCanceled = subscription?.cancelAtPeriodEnd;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Plan actual</CardTitle>
          <Badge className={statusConfig.color}>{statusConfig.label}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4">
          <div className={cn('flex h-12 w-12 items-center justify-center rounded-lg', planConfig.color)}>
            <PlanIcon className="h-6 w-6" />
          </div>
          <div>
            <p className="text-xl font-semibold">{planConfig.name}</p>
            {subscription?.plan?.price && (
              <p className="text-sm text-muted-foreground">
                ${subscription.plan.price.monthly}/mes por usuario
              </p>
            )}
          </div>
        </div>

        {isCanceled && (
          <div className="rounded-lg bg-yellow-50 p-3 dark:bg-yellow-900/20">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              Tu suscripción se cancelará el{' '}
              {new Date(subscription?.currentPeriodEnd || '').toLocaleDateString('es-MX')}
            </p>
          </div>
        )}

        <ul className="space-y-2 text-sm text-muted-foreground">
          {planConfig.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-green-500" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
      <CardFooter className="flex gap-2">
        {planTier !== 'enterprise' && (
          <Button onClick={onUpgrade}>
            <ArrowUpRight className="mr-2 h-4 w-4" />
            {planTier === 'free' || planTier === 'starter' ? 'Mejorar plan' : 'Cambiar plan'}
          </Button>
        )}
        {isCanceled ? (
          <Button variant="outline" onClick={onReactivate} disabled={isReactivating}>
            {isReactivating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Reactivar
          </Button>
        ) : (
          subscription &&
          planTier !== 'free' && (
            <Button variant="ghost" onClick={onCancel}>
              Cancelar
            </Button>
          )
        )}
      </CardFooter>
    </Card>
  );
}

// ============================================
// Next Invoice Card
// ============================================

function NextInvoiceCard({
  upcomingInvoice,
  subscription,
}: {
  upcomingInvoice?: { amount: number; currency: string; dueDate: string };
  subscription?: Subscription | null;
}) {
  if (!upcomingInvoice || subscription?.cancelAtPeriodEnd) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Próxima factura</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
          <p className="text-muted-foreground">
            {subscription?.cancelAtPeriodEnd
              ? 'No hay facturas pendientes'
              : 'Sin suscripción activa'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Próxima factura</CardTitle>
        <CardDescription>
          Fecha: {new Date(upcomingInvoice.dueDate).toLocaleDateString('es-MX')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold">
            ${upcomingInvoice.amount.toLocaleString()}
          </span>
          <span className="text-muted-foreground">{upcomingInvoice.currency}</span>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">
          Se cargará automáticamente a tu método de pago predeterminado
        </p>
      </CardContent>
    </Card>
  );
}

// ============================================
// Payment Methods Card
// ============================================

function PaymentMethodsCard({
  methods,
  onManage,
}: {
  methods: PaymentMethod[];
  onManage: () => void;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Métodos de pago</CardTitle>
          <Button variant="outline" size="sm" onClick={onManage}>
            <Plus className="mr-2 h-4 w-4" />
            Agregar método
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {methods.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
            <p className="text-muted-foreground">No hay métodos de pago configurados</p>
            <Button className="mt-4" variant="outline" onClick={onManage}>
              Agregar método de pago
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {methods.map((method) => (
              <div
                key={method.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted">
                    <CreditCard className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-medium">
                      {method.card
                        ? `${method.card.brand.toUpperCase()} •••• ${method.card.last4}`
                        : 'Método de pago'}
                    </p>
                    {method.card && (
                      <p className="text-sm text-muted-foreground">
                        Vence {method.card.expMonth}/{method.card.expYear}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {method.isDefault && <Badge variant="outline">Predeterminado</Badge>}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {!method.isDefault && (
                        <DropdownMenuItem onClick={onManage}>
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                          Establecer como predeterminado
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem onClick={onManage} className="text-destructive">
                        <Trash2 className="mr-2 h-4 w-4" />
                        Eliminar
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================
// Invoices Table
// ============================================

function InvoicesTable({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center">
          <CreditCard className="mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="text-lg font-medium">Sin facturas</h3>
          <p className="text-sm text-muted-foreground">
            Las facturas aparecerán aquí una vez que tengas una suscripción activa
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Historial de facturas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {invoices.map((invoice) => (
            <div
              key={invoice.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    'flex h-10 w-10 items-center justify-center rounded-full',
                    invoice.status === 'paid'
                      ? 'bg-green-100 dark:bg-green-900/20'
                      : 'bg-yellow-100 dark:bg-yellow-900/20'
                  )}
                >
                  {invoice.status === 'paid' ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium">Factura #{invoice.number}</p>
                  <p className="text-sm text-muted-foreground">
                    {new Date(invoice.createdAt).toLocaleDateString('es-MX')}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="font-medium">
                    ${invoice.total.toLocaleString()} {invoice.currency}
                  </p>
                  <Badge
                    className={cn(
                      invoice.status === 'paid'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-yellow-100 text-yellow-700'
                    )}
                  >
                    {invoice.status === 'paid' ? 'Pagada' : 'Pendiente'}
                  </Badge>
                </div>
                {invoice.invoicePdf && (
                  <Button variant="ghost" size="icon" asChild>
                    <a href={invoice.invoicePdf} target="_blank" rel="noopener noreferrer">
                      <Download className="h-4 w-4" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================
// Usage Overview
// ============================================

function UsageOverview({ usage }: { usage: UsageMetric[] }) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {usage.map((metric) => (
        <Card key={metric.metric}>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {metric.label}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold">
                {typeof metric.used === 'number' ? metric.used.toLocaleString() : metric.used}
              </span>
              <span className="text-muted-foreground">
                / {metric.limit === 'unlimited' ? 'ilimitado' : metric.limit.toLocaleString()}
              </span>
            </div>
            {metric.percentage !== undefined && metric.limit !== 'unlimited' && (
              <Progress className="mt-3" value={metric.percentage} />
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// ============================================
// Loading Skeleton
// ============================================

function BillingSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-24" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    </div>
  );
}

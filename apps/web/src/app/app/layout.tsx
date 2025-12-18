import type { Metadata } from 'next';

import { AuthGuard } from '@/components/auth';
import { RouteErrorBoundary } from '@/components/common/error-boundary';
import { DashboardShell } from '@/components/layout';

export const metadata: Metadata = {
  title: {
    template: '%s | Ventazo CRM',
    default: 'Dashboard | Ventazo CRM',
  },
  description: 'Panel de control de Ventazo CRM - Gestiona tus leads, oportunidades y clientes',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardShell>
        <RouteErrorBoundary>{children}</RouteErrorBoundary>
      </DashboardShell>
    </AuthGuard>
  );
}

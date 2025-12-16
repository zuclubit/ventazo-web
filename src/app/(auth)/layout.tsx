import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s | Ventazo',
    default: 'Autenticación | Ventazo',
  },
  description: 'Accede a tu cuenta de Ventazo - El CRM inteligente para equipos de ventas en LATAM',
  robots: {
    index: false,
    follow: false,
  },
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

import './globals.css';

import { Plus_Jakarta_Sans as FontSans, Inter as FontInter } from 'next/font/google';

import { type Metadata, type Viewport } from 'next';

import { Providers } from '@/components/providers';
import { cn } from '@/lib/utils';

// Ventazo Typography: Plus Jakarta Sans (primary) + Inter (fallback)
const fontSans = FontSans({
  subsets: ['latin'],
  variable: '--font-sans',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
});

const fontInter = FontInter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://zuclubit-crm.osvaloismtz.workers.dev'),
  title: {
    default: 'Ventazo by Zuclubit - Smart CRM para LATAM',
    template: '%s | Ventazo',
  },
  description: 'Ventazo by Zuclubit - El CRM inteligente para equipos de ventas en Latinoamérica. Con WhatsApp Business, facturación electrónica CFDI e inteligencia artificial.',
  keywords: [
    'CRM',
    'CRM LATAM',
    'CRM México',
    'CRM Colombia',
    'CRM Argentina',
    'CFDI',
    'Facturación electrónica',
    'WhatsApp Business CRM',
    'Lead Management',
    'Gestión de ventas',
    'Ventazo',
    'Zuclubit',
    'Inteligencia Artificial',
    'AI CRM',
    'Sales automation',
  ],
  authors: [{ name: 'Zuclubit', url: 'https://zuclubit.com' }],
  creator: 'Ventazo by Zuclubit',
  publisher: 'Zuclubit',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    type: 'website',
    locale: 'es_MX',
    alternateLocale: ['es_CO', 'es_AR', 'es_CL', 'es_PE', 'pt_BR', 'en_US'],
    url: 'https://zuclubit-crm.osvaloismtz.workers.dev',
    siteName: 'Ventazo by Zuclubit',
    title: 'Ventazo - Smart CRM para LATAM',
    description: 'El CRM inteligente para equipos de ventas en Latinoamérica. Con WhatsApp Business, facturación electrónica e IA.',
    images: [
      {
        url: '/images/hero/logo.png',
        width: 512,
        height: 512,
        alt: 'Ventazo by Zuclubit Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Ventazo - Smart CRM para LATAM',
    description: 'El CRM inteligente para equipos de ventas en Latinoamérica. Con WhatsApp Business, facturación electrónica e IA.',
    images: ['/images/hero/logo.png'],
    creator: '@zuclubit',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  category: 'business',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FAF7F5' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0A0A' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning lang="es">
      <body
        className={cn(
          'min-h-screen bg-background font-sans antialiased',
          fontSans.variable,
          fontInter.variable
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}

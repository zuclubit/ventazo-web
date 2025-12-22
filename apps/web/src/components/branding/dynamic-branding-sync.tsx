'use client';

/**
 * DynamicBrandingSync Component - v1.0
 *
 * Enterprise-grade dynamic branding synchronization system.
 * Handles real-time updates of document title, favicon, and CSS variables.
 *
 * Architecture:
 * - SSR-safe with proper hydration handling
 * - Performance optimized with RAF batching
 * - Memory efficient with cleanup on unmount
 * - Supports dark mode favicon variants
 * - Validates all URLs for security
 * - Uses requestIdleCallback for non-critical updates
 *
 * @module components/branding/dynamic-branding-sync
 */

import * as React from 'react';
import { usePathname } from 'next/navigation';

import { useTenantBranding, useBrandingCSSVars } from '@/hooks/use-tenant-branding';

// ============================================
// Constants
// ============================================

const DEFAULT_APP_NAME = 'Ventazo';
const DEFAULT_FAVICON = '/favicon.ico';
const DEFAULT_APPLE_ICON = '/apple-touch-icon.png';

/**
 * Page title mapping for route-based titles
 * Used to generate dynamic page titles like "Leads | CompanyName"
 */
const PAGE_TITLES: Record<string, string> = {
  '/app': 'Dashboard',
  '/app/dashboard': 'Dashboard',
  '/app/leads': 'Leads',
  '/app/leads/pipeline': 'Pipeline de Leads',
  '/app/opportunities': 'Oportunidades',
  '/app/opportunities/pipeline': 'Pipeline',
  '/app/customers': 'Clientes',
  '/app/tasks': 'Tareas',
  '/app/services': 'Servicios',
  '/app/services/categories': 'Categorías',
  '/app/workflows': 'Workflows',
  '/app/calendar': 'Calendario',
  '/app/email': 'Email',
  '/app/whatsapp': 'WhatsApp',
  '/app/quotes': 'Cotizaciones',
  '/app/reports': 'Reportes',
  '/app/notifications': 'Notificaciones',
  '/app/analytics/leads': 'Analytics - Leads',
  '/app/analytics/opportunities': 'Analytics - Oportunidades',
  '/app/analytics/services': 'Analytics - Servicios',
  '/app/analytics/tasks': 'Analytics - Tareas',
  '/app/analytics/workflows': 'Analytics - Workflows',
  '/app/settings': 'Configuración',
  '/app/settings/profile': 'Mi Perfil',
  '/app/settings/team': 'Equipo',
  '/app/settings/billing': 'Facturación',
  '/app/settings/notifications': 'Notificaciones',
  '/app/settings/pipeline': 'Pipeline',
  '/app/settings/activity': 'Actividad',
  '/app/settings/messaging/templates': 'Plantillas',
  '/app/settings/messaging/logs': 'Logs',
  '/login': 'Iniciar Sesión',
  '/register': 'Registro',
  '/forgot-password': 'Recuperar Contraseña',
  '/reset-password': 'Restablecer Contraseña',
  '/onboarding/create-business': 'Crear Negocio',
  '/onboarding/setup': 'Configuración',
  '/onboarding/invite-team': 'Invitar Equipo',
  '/onboarding/complete': 'Completado',
  '/signup': 'Registro',
  '/signup/verify-email': 'Verificar Email',
  '/invite/accept': 'Aceptar Invitación',
};

// ============================================
// Types
// ============================================

interface FaviconConfig {
  href: string;
  darkHref?: string;
  appleTouchIcon?: string;
}

// ============================================
// Utility Functions
// ============================================

/**
 * Validate favicon URL for security
 * Only allows relative paths or https URLs from trusted domains
 */
function isValidFaviconUrl(url: string | undefined | null): boolean {
  if (!url || typeof url !== 'string') return false;

  // Allow relative paths
  if (url.startsWith('/')) return true;

  // Allow data URIs for dynamically generated favicons
  if (url.startsWith('data:image/')) return true;

  // Allow trusted domains
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;

    // Trusted domains for favicon hosting
    const trustedDomains = [
      'fngdlxipgrkpbutiqjhw.supabase.co',
      'supabase.co',
      'amazonaws.com',
      's3.amazonaws.com',
      'cloudflare.com',
      'googleusercontent.com',
      'zuclubit.com',
      'ventazo.com',
    ];

    return trustedDomains.some(domain => parsed.hostname.endsWith(domain));
  } catch {
    return false;
  }
}

/**
 * Get page title from pathname
 */
function getPageTitle(pathname: string): string | null {
  // Direct match
  if (PAGE_TITLES[pathname]) {
    return PAGE_TITLES[pathname] as string;
  }

  // Check for dynamic routes (e.g., /app/leads/[id])
  const segments = pathname.split('/');
  if (segments.length > 3) {
    // Try parent route
    const parentPath = segments.slice(0, 3).join('/');
    if (PAGE_TITLES[parentPath]) {
      return PAGE_TITLES[parentPath] as string;
    }
  }

  // Check for app routes with dynamic segments
  if (pathname.startsWith('/app/')) {
    const basePath = pathname.split('/').slice(0, 3).join('/');
    if (PAGE_TITLES[basePath]) {
      return PAGE_TITLES[basePath] as string;
    }
  }

  return null;
}

/**
 * Schedule non-critical work using requestIdleCallback
 * Falls back to setTimeout for browsers without support
 */
function scheduleIdleWork(callback: () => void): void {
  if (typeof requestIdleCallback !== 'undefined') {
    requestIdleCallback(callback, { timeout: 2000 });
  } else {
    setTimeout(callback, 100);
  }
}

// ============================================
// useDynamicTitle Hook
// ============================================

/**
 * Updates document.title based on current route and tenant name
 *
 * Format: "PageTitle | TenantName" or just "TenantName" for home
 */
function useDynamicTitle(tenantName: string): void {
  const pathname = usePathname();
  const prevTitleRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const pageTitle = getPageTitle(pathname);
    const newTitle = pageTitle
      ? `${pageTitle} | ${tenantName}`
      : `${tenantName} - Smart CRM`;

    // Only update if changed
    if (prevTitleRef.current !== newTitle) {
      document.title = newTitle;
      prevTitleRef.current = newTitle;
    }
  }, [pathname, tenantName]);
}

// ============================================
// useDynamicFavicon Hook
// ============================================

/**
 * Updates favicon links in document head
 * Supports light/dark mode variants
 */
function useDynamicFavicon(config: FaviconConfig): void {
  const prevConfigRef = React.useRef<FaviconConfig | null>(null);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    const { href, darkHref, appleTouchIcon } = config;

    // Check if update is needed
    const prev = prevConfigRef.current;
    if (prev && prev.href === href && prev.darkHref === darkHref) {
      return;
    }

    // Validate URLs
    const validHref = isValidFaviconUrl(href) ? href : DEFAULT_FAVICON;
    const validAppleIcon = isValidFaviconUrl(appleTouchIcon)
      ? appleTouchIcon
      : DEFAULT_APPLE_ICON;

    // Batch DOM updates
    requestAnimationFrame(() => {
      // Update standard favicon
      updateFaviconLink('icon', validHref);

      // Update apple touch icon
      updateFaviconLink('apple-touch-icon', validAppleIcon);

      // Update dark mode favicon if provided
      if (darkHref && isValidFaviconUrl(darkHref)) {
        updateDarkModeFavicon(darkHref);
      }

      prevConfigRef.current = config;
    });
  }, [config]);
}

/**
 * Helper: Update or create favicon link element
 */
function updateFaviconLink(rel: string, href: string): void {
  let link = document.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;

  if (link) {
    link.href = href;
  } else {
    link = document.createElement('link');
    link.rel = rel;
    link.href = href;
    document.head.appendChild(link);
  }
}

/**
 * Helper: Handle dark mode favicon with media query
 */
function updateDarkModeFavicon(darkHref: string): void {
  const darkMediaQuery = '(prefers-color-scheme: dark)';
  let darkLink = document.querySelector(
    `link[rel="icon"][media="${darkMediaQuery}"]`
  ) as HTMLLinkElement | null;

  if (darkLink) {
    darkLink.href = darkHref;
  } else {
    darkLink = document.createElement('link');
    darkLink.rel = 'icon';
    darkLink.media = darkMediaQuery;
    darkLink.href = darkHref;
    document.head.appendChild(darkLink);
  }
}

// ============================================
// useDynamicManifest Hook
// ============================================

/**
 * Updates web app manifest dynamically
 * For PWA name and icon customization
 */
function useDynamicManifest(tenantName: string, iconUrl: string): void {
  React.useEffect(() => {
    if (typeof document === 'undefined') return;

    // Schedule non-critical manifest update
    scheduleIdleWork(() => {
      const manifestLink = document.querySelector(
        'link[rel="manifest"]'
      ) as HTMLLinkElement | null;

      if (manifestLink) {
        // Generate dynamic manifest
        const manifest = {
          name: `${tenantName} - Smart CRM`,
          short_name: tenantName,
          description: `${tenantName} CRM Application`,
          start_url: '/app',
          display: 'standalone',
          background_color: '#0A0A0A',
          theme_color: '#0EB58C',
          icons: [
            {
              src: isValidFaviconUrl(iconUrl) ? iconUrl : '/favicon-192x192.png',
              sizes: '192x192',
              type: 'image/png',
            },
            {
              src: isValidFaviconUrl(iconUrl) ? iconUrl : '/favicon-512x512.png',
              sizes: '512x512',
              type: 'image/png',
            },
          ],
        };

        // Create blob URL for manifest
        const blob = new Blob([JSON.stringify(manifest)], {
          type: 'application/json',
        });
        const manifestUrl = URL.createObjectURL(blob);

        // Update manifest link
        manifestLink.href = manifestUrl;

        // Cleanup old blob URL after a short delay
        return () => {
          setTimeout(() => URL.revokeObjectURL(manifestUrl), 1000);
        };
      }
    });
  }, [tenantName, iconUrl]);
}

// ============================================
// useThemeColorMeta Hook
// ============================================

/**
 * Updates theme-color meta tag based on primary color
 * Affects browser chrome color on mobile
 */
function useThemeColorMeta(primaryColor: string): void {
  const prevColorRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    if (prevColorRef.current === primaryColor) return;

    requestAnimationFrame(() => {
      // Update light mode theme color
      const lightMeta = document.querySelector(
        'meta[name="theme-color"][media="(prefers-color-scheme: light)"]'
      );
      if (lightMeta) {
        lightMeta.setAttribute('content', '#FAF7F5');
      }

      // Update dark mode theme color
      const darkMeta = document.querySelector(
        'meta[name="theme-color"][media="(prefers-color-scheme: dark)"]'
      );
      if (darkMeta) {
        darkMeta.setAttribute('content', primaryColor);
      }

      // Update generic theme color
      const genericMeta = document.querySelector(
        'meta[name="theme-color"]:not([media])'
      );
      if (genericMeta) {
        genericMeta.setAttribute('content', primaryColor);
      }

      prevColorRef.current = primaryColor;
    });
  }, [primaryColor]);
}

// ============================================
// DynamicBrandingSync Component
// ============================================

interface DynamicBrandingSyncProps {
  children?: React.ReactNode;
}

/**
 * Synchronizes tenant branding to the document
 *
 * Handles:
 * - Document title updates
 * - Favicon/icon updates
 * - CSS variable application
 * - Theme color meta updates
 * - PWA manifest updates
 *
 * @example
 * ```tsx
 * <DynamicBrandingSync />
 * ```
 */
export function DynamicBrandingSync({ children }: DynamicBrandingSyncProps) {
  const branding = useTenantBranding();

  // Apply CSS variables to :root
  useBrandingCSSVars();

  // Update document title
  useDynamicTitle(branding.name);

  // Update favicon
  useDynamicFavicon({
    href: branding.faviconUrl,
    appleTouchIcon: branding.logoUrl,
  });

  // Update PWA manifest
  useDynamicManifest(branding.name, branding.logoUrl);

  // Update theme-color meta
  useThemeColorMeta(branding.sidebarColor);

  return children ? <>{children}</> : null;
}

// ============================================
// Individual Export Hooks
// ============================================

export {
  useDynamicTitle,
  useDynamicFavicon,
  useDynamicManifest,
  useThemeColorMeta,
  isValidFaviconUrl,
  getPageTitle,
  PAGE_TITLES,
};

export default DynamicBrandingSync;

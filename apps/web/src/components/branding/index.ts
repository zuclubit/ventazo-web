/**
 * Branding Module
 *
 * Components and hooks for dynamic tenant branding.
 * Handles favicon, title, logo, and color synchronization.
 *
 * @module components/branding
 */

export {
  DynamicBrandingSync,
  useDynamicTitle,
  useDynamicFavicon,
  useDynamicManifest,
  useThemeColorMeta,
  isValidFaviconUrl,
  getPageTitle,
  PAGE_TITLES,
} from './dynamic-branding-sync';

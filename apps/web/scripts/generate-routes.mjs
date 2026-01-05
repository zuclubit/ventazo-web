/**
 * Generate _routes.json for Cloudflare Pages
 *
 * Instead of excluding static assets (which causes overlapping rule issues),
 * we INCLUDE only the dynamic routes that need the worker.
 * Everything else gets served as static assets automatically.
 */

import { writeFileSync } from 'fs';
import { join } from 'path';

// Script is called from project root: node scripts/generate-routes.mjs
const BUILD_DIR = '.open-next';

/**
 * Define all dynamic routes that need to go through the Next.js worker.
 * Static assets (/_next/static/*, /images/*, etc.) will be served directly.
 */
const DYNAMIC_ROUTES = [
  // Root and main pages
  '/',

  // Auth pages
  '/login',
  '/register',
  '/signup',
  '/signup/*',
  '/forgot-password',
  '/reset-password',
  '/verify-email',

  // OAuth callbacks
  '/auth',
  '/auth/*',

  // Protected app routes
  '/app',
  '/app/*',

  // Onboarding flow
  '/onboarding',
  '/onboarding/*',

  // API routes (server actions, etc.)
  '/api',
  '/api/*',

  // Legal pages
  '/terms',
  '/privacy',

  // Invitation handling
  '/invite',
  '/invite/*',

  // RSC data routes (Next.js internal)
  '/_next/data/*',
];

/**
 * Generate the _routes.json content using INCLUDE approach
 */
function generateRoutesConfig() {
  return {
    version: 1,
    include: DYNAMIC_ROUTES,
    exclude: [],
  };
}

// Generate and write the config
const config = generateRoutesConfig();
const outputPath = join(BUILD_DIR, '_routes.json');

writeFileSync(outputPath, JSON.stringify(config, null, 2));

console.log('Generated _routes.json with', config.include.length, 'include patterns:');
console.log(config.include.slice(0, 10).join('\n'));
if (config.include.length > 10) {
  console.log(`... and ${config.include.length - 10} more`);
}

/**
 * Lighthouse CI Configuration
 * Zuclubit Smart CRM
 *
 * Run with: lhci autorun
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'https://crm.zuclubit.com/login',
        'https://crm.zuclubit.com/',
      ],
      numberOfRuns: 3, // Run each URL 3 times for consistency
      settings: {
        // Lighthouse settings
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        screenEmulation: {
          mobile: false,
          width: 1920,
          height: 1080,
          deviceScaleFactor: 1,
          disabled: false,
        },
        formFactor: 'desktop',
        // Skip specific audits if needed
        skipAudits: ['uses-http2'],
      },
    },
    assert: {
      // Assertion configuration
      preset: 'lighthouse:recommended',
      assertions: {
        // Performance assertions
        'categories:performance': ['error', { minScore: 0.7 }],
        'categories:accessibility': ['warn', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.8 }],

        // Core Web Vitals
        'first-contentful-paint': ['error', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 4000 }],
        'interactive': ['warn', { maxNumericValue: 4000 }],

        // Resource optimization
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',
        'uses-responsive-images': 'warn',
        'efficient-animated-content': 'warn',
        'unminified-css': 'error',
        'unminified-javascript': 'error',
        'unused-css-rules': 'warn',
        'unused-javascript': 'warn',

        // Performance best practices
        'render-blocking-resources': 'warn',
        'uses-text-compression': 'warn',
        'uses-rel-preconnect': 'warn',
        'server-response-time': ['error', { maxNumericValue: 600 }],
        'redirects': 'warn',
        'uses-long-cache-ttl': 'warn',

        // Modern features
        'uses-http2': 'off', // Cloudflare handles this
        'uses-passive-event-listeners': 'warn',
        'no-document-write': 'error',

        // Accessibility (ensure good UX)
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',

        // SEO basics
        'document-title': 'error',
        'meta-description': 'warn',
        'viewport': 'error',
      },
    },
    upload: {
      // Upload to temporary public storage for viewing
      target: 'temporary-public-storage',
    },
    server: {
      // Local server for development
    },
  },
};

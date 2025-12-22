import Fastify, { FastifyInstance, FastifyServerOptions } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import compress from '@fastify/compress';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import ScalarApiReference from '@scalar/fastify-api-reference';
import zlib from 'zlib';
import { correlationIdMiddleware, requestLoggerOnRequest, requestLoggerOnResponse } from './middlewares';
import { startCronScheduler, stopCronScheduler } from '../infrastructure/messaging';

/**
 * Server configuration options
 */
export interface ServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  rateLimitMax: number;
  rateLimitTimeWindow: string;
}

/**
 * Create and configure Fastify server
 * Implements security best practices and performance optimizations
 * Based on: https://fastify.dev/docs/latest/Guides/Recommendations/
 * And: https://astconsulting.in/java-script/nodejs/fastify/master-fastify-performance-production-optimization
 */
export async function createServer(config: ServerConfig): Promise<FastifyInstance> {
  const isProduction = process.env.NODE_ENV === 'production';

  // Fastify options for optimal performance
  // Production: Use Pino with optimized settings for high throughput (JSON output)
  // Development: Use pino-pretty for readability (only if available)
  // Note: pino-pretty is a devDependency and not available in production
  const getLoggerConfig = () => {
    if (isProduction) {
      // Production: JSON logging with minimal serializers for performance
      return {
        level: process.env.LOG_LEVEL || 'info',
        serializers: {
          req: (req: { method: string; url: string; hostname: string }) => ({
            method: req.method,
            url: req.url,
            hostname: req.hostname,
          }),
          res: (res: { statusCode: number }) => ({
            statusCode: res.statusCode,
          }),
        },
      };
    }

    // Development: Try to use pino-pretty if available
    try {
      require.resolve('pino-pretty');
      return {
        level: 'debug',
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      };
    } catch {
      // Fallback to basic logging if pino-pretty not available
      return { level: 'debug' };
    }
  };

  const fastifyOptions: FastifyServerOptions = {
    logger: getLoggerConfig(),
    // Increase request timeout for complex queries
    requestTimeout: 30000,
    // Connection timeout for slow clients
    connectionTimeout: 10000,
    // Trust proxy for accurate IP addresses (required for Fly.io, Railway, etc.)
    trustProxy: true,
    // Improve JSON parsing performance
    ignoreTrailingSlash: true,
    caseSensitive: false,
    // Disable request logging in production (we handle it manually)
    disableRequestLogging: isProduction,
    // Body limit for JSON payloads
    bodyLimit: 1048576, // 1MB
  };

  const server = Fastify(fastifyOptions);

  // Request hooks for correlation ID and logging
  server.addHook('onRequest', correlationIdMiddleware);
  server.addHook('onRequest', requestLoggerOnRequest);
  server.addHook('onResponse', requestLoggerOnResponse);

  // Security plugins
  await server.register(helmet, {
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net', 'https://unpkg.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com', 'data:'],
        imgSrc: ["'self'", 'data:', 'validator.swagger.io', 'https:'],
        connectSrc: ["'self'", 'https:'],
        workerSrc: ["'self'", 'blob:'],
      },
    },
  });

  // CORS configuration
  await server.register(cors, {
    origin: config.corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
  });

  // Compression for responses - Optimized for API performance
  // Based on: https://github.com/fastify/fastify-compress
  await server.register(compress, {
    global: true,
    threshold: 1024, // Only compress responses > 1KB
    encodings: ['br', 'gzip', 'deflate'], // Priority: Brotli > gzip > deflate
    // Brotli options optimized for API text responses
    brotliOptions: {
      params: {
        [zlib.constants.BROTLI_PARAM_MODE]: zlib.constants.BROTLI_MODE_TEXT,
        [zlib.constants.BROTLI_PARAM_QUALITY]: 4, // Balance between speed and compression (0-11)
      },
    },
    // Gzip options for fallback
    zlibOptions: {
      level: 6, // Default compression level (1-9)
    },
  });

  // Rate limiting
  await server.register(rateLimit, {
    max: config.rateLimitMax,
    timeWindow: config.rateLimitTimeWindow,
    cache: 10000,
    allowList: ['127.0.0.1'],
    errorResponseBuilder: (req, context) => {
      return {
        statusCode: 429,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Try again in ${Math.ceil(context.ttl / 1000)} seconds.`,
      };
    },
  });

  // Swagger/OpenAPI documentation
  await server.register(swagger, {
    openapi: {
      info: {
        title: 'Zuclubit Smart CRM - Lead Service API',
        description: `
## Overview

Enterprise-grade RESTful API for the Zuclubit Smart CRM Lead Management Service.

This API provides comprehensive lead management capabilities including:
- **Lead CRUD Operations** - Create, read, update, and delete leads
- **Pipeline Management** - Configure and manage sales pipelines
- **Lead Scoring** - AI-powered lead scoring and qualification
- **Analytics & Reports** - Real-time analytics and custom reports
- **Webhooks** - Event-driven integrations
- **Multi-tenant Support** - Isolated data per tenant with RLS

## Authentication

All endpoints require JWT authentication via the \`Authorization\` header:
\`\`\`
Authorization: Bearer <your-jwt-token>
\`\`\`

## Multi-tenancy

Include the tenant ID in the request header:
\`\`\`
x-tenant-id: <your-tenant-uuid>
\`\`\`

## Rate Limiting

- **Default**: 100 requests per minute
- **Bulk Operations**: 10 requests per minute
- Headers: \`X-RateLimit-Limit\`, \`X-RateLimit-Remaining\`, \`X-RateLimit-Reset\`

## Support

- Documentation: [docs.zuclubit.com](https://docs.zuclubit.com)
- Email: api-support@zuclubit.com
        `,
        version: '1.0.0',
        contact: {
          name: 'Zuclubit API Support',
          email: 'api-support@zuclubit.com',
          url: 'https://zuclubit.com',
        },
        license: {
          name: 'Proprietary',
          url: 'https://zuclubit.com/terms',
        },
      },
      externalDocs: {
        description: 'Full Documentation',
        url: 'https://docs.zuclubit.com',
      },
      servers: [
        {
          url: 'https://zuclubit-lead-service.fly.dev',
          description: 'Production (Fly.io)',
        },
        {
          url: 'http://localhost:3000',
          description: 'Local Development',
        },
      ],
      tags: [
        { name: 'health', description: 'Health check and readiness endpoints' },
        { name: 'leads', description: 'Lead management - CRUD, scoring, qualification' },
        { name: 'pipelines', description: 'Sales pipeline configuration and stages' },
        { name: 'opportunities', description: 'Opportunity management and tracking' },
        { name: 'customers', description: 'Customer management and profiles' },
        { name: 'tasks', description: 'Task management and assignments' },
        { name: 'Analytics', description: 'Real-time analytics and dashboards' },
        { name: 'Reports', description: 'Custom report generation and exports' },
        { name: 'Webhooks', description: 'Webhook configuration and event subscriptions' },
        { name: 'Deliveries', description: 'Webhook delivery history and retry mechanisms' },
        { name: 'AI', description: 'AI-powered features - scoring, insights, predictions' },
        { name: 'Workflows', description: 'Workflow automation and triggers' },
        { name: 'Integrations', description: 'Third-party integrations and connectors' },
        { name: 'Admin', description: 'Administrative endpoints - cache, rate-limiting, audit' },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'JWT token obtained from /api/v1/auth/login',
          },
          tenantId: {
            type: 'apiKey',
            in: 'header',
            name: 'x-tenant-id',
            description: 'Tenant UUID for multi-tenant isolation',
          },
        },
      },
      security: [
        { bearerAuth: [] },
        { tenantId: [] },
      ],
    },
  });

  // Swagger UI (fallback/legacy documentation)
  await server.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      syntaxHighlight: {
        activate: true,
        theme: 'monokai',
      },
    },
    staticCSP: true,
  });

  // ==========================================================================
  // RapiDoc - FASTEST option for large APIs (tested with 5MB+ specs)
  // Based on: https://github.com/rapi-doc/RapiDoc/issues/141
  // "We have tested its performance with very large (5mb) spec and it plays
  // out better than SwaggerUI and ReDoc"
  // ==========================================================================
  server.get('/rapidoc', {
    schema: {
      tags: ['health'],
      description: 'RapiDoc API documentation - optimized for large APIs',
      hide: true,
    },
  }, async (request, reply) => {
    reply.type('text/html');
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Zuclubit CRM API - RapiDoc</title>
  <script type="module" src="https://unpkg.com/rapidoc/dist/rapidoc-min.js"></script>
  <style>
    body { margin: 0; padding: 0; }
    rapi-doc { width: 100%; height: 100vh; }
  </style>
</head>
<body>
  <rapi-doc
    spec-url="/docs/json"
    theme="dark"
    bg-color="#1a1a2e"
    text-color="#eaeaea"
    primary-color="#7c3aed"
    nav-bg-color="#16213e"
    nav-text-color="#a5b4fc"
    nav-hover-bg-color="#0f3460"
    nav-accent-color="#7c3aed"

    render-style="focused"
    schema-style="table"
    show-header="false"
    allow-authentication="true"
    allow-server-selection="true"
    allow-api-list-style-selection="false"

    show-method-in-nav-bar="as-colored-block"
    use-path-in-nav-bar="true"
    nav-item-spacing="compact"
    font-size="default"

    fetch-credentials="include"
    persist-auth="true"

    load-fonts="false"
    regular-font="system-ui, -apple-system, sans-serif"
    mono-font="ui-monospace, monospace"
  >
    <div slot="nav-logo" style="padding: 20px; text-align: center;">
      <span style="font-size: 1.2rem; font-weight: bold; color: #7c3aed;">Zuclubit CRM API</span>
    </div>
  </rapi-doc>
</body>
</html>`;
  });

  // ==========================================================================
  // Scalar API Reference - Primary Documentation UI
  // Optimized for large APIs (793 endpoints, 340KB spec)
  // Performance: https://blog.scalar.com/p/how-we-sped-up-our-api-docs-25x
  // Config: https://guides.scalar.com/scalar/scalar-api-references/configuration
  // ==========================================================================
  await server.register(ScalarApiReference, {
    routePrefix: '/reference',
    logLevel: 'warn',
    configuration: {
      // OpenAPI spec source - external URL for optimal performance with large specs
      spec: { url: '/docs/json' },

      // Layout & Theme - 'modern' is optimized for performance
      layout: 'modern',
      theme: 'purple',
      darkMode: true,
      forceDarkModeState: 'dark',

      // =======================================================================
      // PERFORMANCE OPTIMIZATIONS FOR LARGE APIs (793 endpoints)
      // =======================================================================

      // Fonts - system fonts load faster than CDN fonts
      withDefaultFonts: false,

      // Sidebar - keep collapsed for faster initial render
      showSidebar: true,
      defaultOpenAllTags: false, // CRITICAL: Keep false for 793 endpoints
      tagsSorter: 'alpha',
      operationsSorter: 'alpha',

      // Content - lazy load, don't expand everything
      hideModels: false,
      expandAllModelSections: false, // CRITICAL: Don't expand all models
      expandAllResponses: false,     // CRITICAL: Don't expand all responses
      orderRequiredPropertiesFirst: true,
      orderSchemaPropertiesBy: 'alpha',
      operationTitleSource: 'summary',

      // Search - essential for navigating 793 endpoints
      hideSearch: false,
      searchHotKey: 'k',

      // API Client - minimal setup for faster load
      hideTestRequestButton: false,
      hideClientButton: false,
      hideDarkModeToggle: true,
      persistAuth: true,
      defaultHttpClient: {
        targetKey: 'shell',
        clientKey: 'curl',
      },

      // Download
      documentDownloadType: 'json', // Single format = smaller memory footprint

      // Hide unused HTTP clients to reduce DOM elements
      hiddenClients: {
        php: true,
        perl: true,
        objc: true,
        ocaml: true,
        powershell: true,
        r: true,
        clojure: true,
        c: true,
        kotlin: true,
        swift: true,
        java: true,
        csharp: true,
        ruby: true,
        go: true,
      },

      // Performance & Privacy
      telemetry: false,
      showDeveloperTools: 'never', // Disable dev tools in production

      // Metadata
      metaData: {
        title: 'Zuclubit CRM API',
        description: 'Enterprise-grade API documentation for Zuclubit Smart CRM',
        ogTitle: 'Zuclubit CRM API Reference',
        ogDescription: 'Comprehensive API documentation for lead management, pipelines, analytics, and more.',
      },

      // =======================================================================
      // Custom CSS - Zuclubit Brand Theme
      // Variables: https://github.com/scalar/scalar/blob/main/documentation/themes.md
      // =======================================================================
      customCss: `
        /* ===== Zuclubit Dark Theme ===== */
        .dark-mode,
        .scalar-app {
          /* Primary Colors - Zuclubit Purple */
          --scalar-color-1: #f4f4f5;
          --scalar-color-2: #a1a1aa;
          --scalar-color-3: #71717a;
          --scalar-color-accent: #8b5cf6;

          /* Backgrounds - Deep Space */
          --scalar-background-1: #09090b;
          --scalar-background-2: #18181b;
          --scalar-background-3: #27272a;
          --scalar-background-accent: rgba(139, 92, 246, 0.12);

          /* Borders */
          --scalar-border-color: #3f3f46;

          /* Sidebar */
          --scalar-sidebar-background-1: #09090b;
          --scalar-sidebar-item-hover-color: #f4f4f5;
          --scalar-sidebar-item-hover-background: rgba(139, 92, 246, 0.1);
          --scalar-sidebar-item-active-background: rgba(139, 92, 246, 0.15);
          --scalar-sidebar-color-1: #f4f4f5;
          --scalar-sidebar-color-2: #a1a1aa;
          --scalar-sidebar-color-active: #a78bfa;
          --scalar-sidebar-search-background: #18181b;
          --scalar-sidebar-search-border-color: #3f3f46;
          --scalar-sidebar-search-color: #f4f4f5;

          /* Buttons */
          --scalar-button-1: #8b5cf6;
          --scalar-button-1-color: #ffffff;
          --scalar-button-1-hover: #7c3aed;

          /* Code blocks */
          --scalar-color-green: #4ade80;
          --scalar-color-red: #f87171;
          --scalar-color-yellow: #facc15;
          --scalar-color-blue: #60a5fa;
          --scalar-color-orange: #fb923c;
          --scalar-color-purple: #a78bfa;

          /* Typography */
          --scalar-font: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          --scalar-font-code: 'SF Mono', SFMono-Regular, ui-monospace, 'DejaVu Sans Mono', Menlo, Consolas, monospace;

          /* Radius */
          --scalar-radius: 8px;
          --scalar-radius-lg: 12px;
          --scalar-radius-xl: 16px;
        }

        /* HTTP Method Colors */
        .scalar-app [data-method="get"] { --scalar-color-accent: #22c55e; }
        .scalar-app [data-method="post"] { --scalar-color-accent: #3b82f6; }
        .scalar-app [data-method="put"] { --scalar-color-accent: #f59e0b; }
        .scalar-app [data-method="patch"] { --scalar-color-accent: #8b5cf6; }
        .scalar-app [data-method="delete"] { --scalar-color-accent: #ef4444; }

        /* Logo/Header customization */
        .scalar-app .sidebar-header {
          padding: 16px;
          border-bottom: 1px solid var(--scalar-border-color);
        }

        /* Scrollbar styling */
        .scalar-app ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .scalar-app ::-webkit-scrollbar-track {
          background: var(--scalar-background-1);
        }
        .scalar-app ::-webkit-scrollbar-thumb {
          background: var(--scalar-border-color);
          border-radius: 4px;
        }
        .scalar-app ::-webkit-scrollbar-thumb:hover {
          background: #52525b;
        }

        /* ===== Loading Skeletons ===== */
        @keyframes skeleton-shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }

        @keyframes skeleton-pulse {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.7; }
        }

        /* Base skeleton style */
        .scalar-app .skeleton,
        .scalar-app [data-loading="true"],
        .scalar-app .loading-placeholder {
          background: linear-gradient(
            90deg,
            var(--scalar-background-2) 0%,
            var(--scalar-background-3) 20%,
            var(--scalar-background-2) 40%,
            var(--scalar-background-2) 100%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
          border-radius: var(--scalar-radius);
        }

        /* Skeleton for sidebar items while loading */
        .scalar-app .sidebar-loading .nav-item,
        .scalar-app [aria-busy="true"] .sidebar-item {
          position: relative;
          overflow: hidden;
        }

        .scalar-app .sidebar-loading .nav-item::after,
        .scalar-app [aria-busy="true"] .sidebar-item::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(139, 92, 246, 0.1) 50%,
            transparent 100%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
        }

        /* Content area skeletons */
        .scalar-app .content-loading,
        .scalar-app .operation-loading {
          min-height: 200px;
          background: var(--scalar-background-2);
          border-radius: var(--scalar-radius-lg);
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        /* Schema/Model skeleton blocks */
        .scalar-app .schema-skeleton {
          display: flex;
          flex-direction: column;
          gap: 8px;
          padding: 16px;
        }

        .scalar-app .schema-skeleton-line {
          height: 14px;
          background: linear-gradient(
            90deg,
            var(--scalar-background-3) 0%,
            #3f3f46 50%,
            var(--scalar-background-3) 100%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
          border-radius: 4px;
        }

        .scalar-app .schema-skeleton-line:nth-child(1) { width: 60%; }
        .scalar-app .schema-skeleton-line:nth-child(2) { width: 80%; }
        .scalar-app .schema-skeleton-line:nth-child(3) { width: 45%; }
        .scalar-app .schema-skeleton-line:nth-child(4) { width: 70%; }

        /* Request/Response panel skeleton */
        .scalar-app .panel-skeleton {
          background: var(--scalar-background-2);
          border: 1px solid var(--scalar-border-color);
          border-radius: var(--scalar-radius-lg);
          padding: 16px;
          min-height: 150px;
        }

        .scalar-app .panel-skeleton-header {
          height: 20px;
          width: 120px;
          background: linear-gradient(
            90deg,
            var(--scalar-background-3) 0%,
            #3f3f46 50%,
            var(--scalar-background-3) 100%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
          border-radius: 4px;
          margin-bottom: 16px;
        }

        .scalar-app .panel-skeleton-body {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .scalar-app .panel-skeleton-row {
          height: 12px;
          background: linear-gradient(
            90deg,
            var(--scalar-background-3) 0%,
            #3f3f46 50%,
            var(--scalar-background-3) 100%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
          border-radius: 4px;
        }

        .scalar-app .panel-skeleton-row:nth-child(odd) { width: 90%; }
        .scalar-app .panel-skeleton-row:nth-child(even) { width: 75%; }

        /* Button loading state */
        .scalar-app button[data-loading="true"],
        .scalar-app .btn-loading {
          position: relative;
          color: transparent !important;
          pointer-events: none;
        }

        .scalar-app button[data-loading="true"]::after,
        .scalar-app .btn-loading::after {
          content: '';
          position: absolute;
          width: 16px;
          height: 16px;
          top: 50%;
          left: 50%;
          margin-left: -8px;
          margin-top: -8px;
          border: 2px solid transparent;
          border-top-color: currentColor;
          border-radius: 50%;
          animation: spinner 0.8s linear infinite;
        }

        @keyframes spinner {
          to { transform: rotate(360deg); }
        }

        /* Fade in animation for loaded content */
        .scalar-app .fade-in,
        .scalar-app [data-loaded="true"] {
          animation: fadeIn 0.3s ease-out forwards;
        }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }

        /* Initial page loading overlay */
        .scalar-app .loading-overlay {
          position: fixed;
          inset: 0;
          background: var(--scalar-background-1);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          transition: opacity 0.3s ease-out;
        }

        .scalar-app .loading-overlay.hidden {
          opacity: 0;
          pointer-events: none;
        }

        .scalar-app .loading-spinner {
          width: 48px;
          height: 48px;
          border: 3px solid var(--scalar-background-3);
          border-top-color: var(--scalar-color-accent);
          border-radius: 50%;
          animation: spinner 1s linear infinite;
        }

        .scalar-app .loading-text {
          margin-top: 16px;
          color: var(--scalar-color-2);
          font-size: 14px;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        /* Lazy load placeholder for operations */
        .scalar-app .operation-placeholder {
          background: var(--scalar-background-2);
          border: 1px solid var(--scalar-border-color);
          border-radius: var(--scalar-radius-lg);
          padding: 20px;
          margin-bottom: 12px;
        }

        .scalar-app .operation-placeholder-method {
          display: inline-block;
          width: 50px;
          height: 22px;
          background: var(--scalar-background-3);
          border-radius: 4px;
          margin-right: 12px;
          animation: skeleton-pulse 1.5s ease-in-out infinite;
        }

        .scalar-app .operation-placeholder-path {
          display: inline-block;
          width: 200px;
          height: 18px;
          background: linear-gradient(
            90deg,
            var(--scalar-background-3) 0%,
            #3f3f46 50%,
            var(--scalar-background-3) 100%
          );
          background-size: 200% 100%;
          animation: skeleton-shimmer 1.5s ease-in-out infinite;
          border-radius: 4px;
        }

        /* Staggered animation for multiple items */
        .scalar-app .stagger-item:nth-child(1) { animation-delay: 0ms; }
        .scalar-app .stagger-item:nth-child(2) { animation-delay: 50ms; }
        .scalar-app .stagger-item:nth-child(3) { animation-delay: 100ms; }
        .scalar-app .stagger-item:nth-child(4) { animation-delay: 150ms; }
        .scalar-app .stagger-item:nth-child(5) { animation-delay: 200ms; }
        .scalar-app .stagger-item:nth-child(6) { animation-delay: 250ms; }
        .scalar-app .stagger-item:nth-child(7) { animation-delay: 300ms; }
        .scalar-app .stagger-item:nth-child(8) { animation-delay: 350ms; }

        /* ===== PERFORMANCE & FLUIDITY OPTIMIZATIONS ===== */

        /* GPU Acceleration - Force hardware rendering */
        .scalar-app,
        .scalar-app * {
          -webkit-font-smoothing: antialiased;
          -moz-osx-font-smoothing: grayscale;
          text-rendering: optimizeLegibility;
        }

        /* Smooth scrolling everywhere */
        .scalar-app,
        .scalar-app [class*="sidebar"],
        .scalar-app [class*="content"],
        .scalar-app [class*="panel"],
        .scalar-app [class*="scroll"],
        .scalar-app main,
        .scalar-app aside,
        .scalar-app nav {
          scroll-behavior: smooth;
          -webkit-overflow-scrolling: touch;
          overscroll-behavior: contain;
        }

        /* Optimize sidebar navigation */
        .scalar-app nav,
        .scalar-app [class*="sidebar"],
        .scalar-app [class*="navigation"] {
          will-change: scroll-position;
          contain: layout style;
        }

        /* Fast hover/click transitions for menu items */
        .scalar-app a,
        .scalar-app button,
        .scalar-app [role="button"],
        .scalar-app [class*="nav-item"],
        .scalar-app [class*="menu-item"],
        .scalar-app [class*="sidebar-item"],
        .scalar-app [class*="operation"],
        .scalar-app summary {
          transition:
            background-color 0.15s ease-out,
            color 0.15s ease-out,
            border-color 0.15s ease-out,
            transform 0.1s ease-out,
            box-shadow 0.15s ease-out,
            opacity 0.15s ease-out;
          cursor: pointer;
        }

        /* Instant visual feedback on click */
        .scalar-app a:active,
        .scalar-app button:active,
        .scalar-app [role="button"]:active,
        .scalar-app [class*="nav-item"]:active,
        .scalar-app [class*="menu-item"]:active,
        .scalar-app [class*="sidebar-item"]:active,
        .scalar-app summary:active {
          transform: scale(0.98);
          transition-duration: 0.05s;
        }

        /* Smooth expand/collapse for accordion sections */
        .scalar-app details,
        .scalar-app [class*="collapsible"],
        .scalar-app [class*="expandable"],
        .scalar-app [class*="accordion"] {
          transition: height 0.2s ease-out, opacity 0.2s ease-out;
        }

        .scalar-app details[open] > *:not(summary),
        .scalar-app [class*="expanded"] {
          animation: slideDown 0.2s ease-out forwards;
        }

        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-8px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        /* Smooth content transitions */
        .scalar-app [class*="content"],
        .scalar-app [class*="panel"],
        .scalar-app [class*="body"],
        .scalar-app section {
          transition: opacity 0.2s ease-out;
        }

        /* Optimize rendering for large lists */
        .scalar-app ul,
        .scalar-app ol,
        .scalar-app [class*="list"] {
          contain: content;
        }

        /* Fast hover states for sidebar */
        .scalar-app [class*="sidebar"] a:hover,
        .scalar-app [class*="sidebar"] button:hover,
        .scalar-app nav a:hover,
        .scalar-app nav button:hover {
          background-color: var(--scalar-sidebar-item-hover-background);
          transition-duration: 0.1s;
        }

        /* Smooth focus states */
        .scalar-app a:focus-visible,
        .scalar-app button:focus-visible,
        .scalar-app input:focus-visible,
        .scalar-app select:focus-visible,
        .scalar-app textarea:focus-visible {
          outline: 2px solid var(--scalar-color-accent);
          outline-offset: 2px;
          transition: outline-offset 0.1s ease-out;
        }

        /* Modal/Dialog smooth transitions */
        .scalar-app [class*="modal"],
        .scalar-app [class*="dialog"],
        .scalar-app [class*="overlay"],
        .scalar-app [class*="popup"] {
          transition:
            opacity 0.2s ease-out,
            transform 0.2s ease-out,
            visibility 0.2s;
        }

        /* Code block smooth reveal */
        .scalar-app pre,
        .scalar-app code,
        .scalar-app [class*="code"] {
          transition: background-color 0.15s ease-out;
        }

        /* Tooltip fast appearance */
        .scalar-app [class*="tooltip"] {
          transition: opacity 0.15s ease-out, transform 0.15s ease-out;
        }

        /* Tab switching animation */
        .scalar-app [role="tablist"] [role="tab"],
        .scalar-app [class*="tab"] {
          transition:
            background-color 0.15s ease-out,
            border-color 0.15s ease-out,
            color 0.15s ease-out;
        }

        .scalar-app [role="tabpanel"],
        .scalar-app [class*="tab-content"] {
          animation: tabFadeIn 0.2s ease-out;
        }

        @keyframes tabFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        /* Search input responsiveness */
        .scalar-app input[type="search"],
        .scalar-app [class*="search"] input {
          transition:
            border-color 0.15s ease-out,
            box-shadow 0.15s ease-out,
            width 0.2s ease-out;
        }

        /* Request/Response panel smooth transitions */
        .scalar-app [class*="request"],
        .scalar-app [class*="response"] {
          transition: height 0.25s ease-out, opacity 0.2s ease-out;
        }

        /* Dropdown menus fast open */
        .scalar-app [class*="dropdown"],
        .scalar-app [class*="select"] [class*="options"],
        .scalar-app [class*="menu"]:not(nav) {
          transition:
            opacity 0.15s ease-out,
            transform 0.15s ease-out;
          transform-origin: top;
        }

        .scalar-app [class*="dropdown"][data-open="true"],
        .scalar-app [class*="dropdown"].open,
        .scalar-app [class*="select"].open [class*="options"] {
          animation: dropdownOpen 0.15s ease-out forwards;
        }

        @keyframes dropdownOpen {
          from {
            opacity: 0;
            transform: scaleY(0.95) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: scaleY(1) translateY(0);
          }
        }

        /* Badge/Tag pulse on update */
        .scalar-app [class*="badge"],
        .scalar-app [class*="tag"],
        .scalar-app [class*="chip"] {
          transition: transform 0.15s ease-out, background-color 0.15s ease-out;
        }

        .scalar-app [class*="badge"]:hover,
        .scalar-app [class*="tag"]:hover {
          transform: scale(1.05);
        }

        /* Optimize paint for fixed elements */
        .scalar-app [class*="header"],
        .scalar-app [class*="sticky"],
        .scalar-app [style*="position: fixed"],
        .scalar-app [style*="position: sticky"] {
          will-change: transform;
          backface-visibility: hidden;
        }

        /* Reduce layout thrashing */
        .scalar-app img,
        .scalar-app svg {
          content-visibility: auto;
        }

        /* Smooth icon rotations (expand/collapse arrows) */
        .scalar-app [class*="icon"],
        .scalar-app svg {
          transition: transform 0.2s ease-out;
        }

        .scalar-app [class*="expanded"] [class*="icon"],
        .scalar-app details[open] > summary [class*="icon"],
        .scalar-app details[open] > summary svg {
          transform: rotate(90deg);
        }

        /* Input field smooth interactions */
        .scalar-app input,
        .scalar-app textarea,
        .scalar-app select {
          transition:
            border-color 0.15s ease-out,
            box-shadow 0.15s ease-out,
            background-color 0.15s ease-out;
        }

        /* Copy button feedback */
        .scalar-app [class*="copy"] {
          transition:
            opacity 0.15s ease-out,
            transform 0.1s ease-out;
        }

        .scalar-app [class*="copy"]:active {
          transform: scale(0.9);
        }

        /* Reduce motion for users who prefer it */
        @media (prefers-reduced-motion: reduce) {
          .scalar-app,
          .scalar-app * {
            animation-duration: 0.01ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: 0.01ms !important;
            scroll-behavior: auto !important;
          }
        }
      `,
    },
  });

  // ==========================================================================
  // Stoplight Elements - Modern 3-column API documentation
  // Alternative to Swagger UI with better UX for modern wide monitors
  // Based on: https://github.com/stoplightio/elements
  // ==========================================================================
  server.get('/elements', {
    schema: {
      tags: ['health'],
      description: 'Stoplight Elements API documentation - modern 3-column layout',
      hide: true,
    },
  }, async (request, reply) => {
    reply.type('text/html');
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Zuclubit CRM API - Stoplight Elements</title>
  <script src="https://unpkg.com/@stoplight/elements/web-components.min.js"></script>
  <link rel="stylesheet" href="https://unpkg.com/@stoplight/elements/styles.min.css">
  <style>
    html, body { margin: 0; padding: 0; height: 100%; background: #0f0f23; }
    elements-api {
      display: block;
      height: 100vh;
      --color-primary: 124, 58, 237;
      --color-primary-dark: 109, 40, 217;
      --color-primary-light: 167, 139, 250;
      --color-canvas-pure: 15, 15, 35;
      --color-canvas: 26, 26, 46;
      --color-canvas-dark: 22, 33, 62;
      --color-canvas-dialog: 26, 26, 46;
      --color-text: 228, 228, 231;
      --color-text-light: 161, 161, 170;
      --color-border: 45, 45, 68;
    }
  </style>
</head>
<body>
  <elements-api
    apiDescriptionUrl="/docs/json"
    router="hash"
    layout="sidebar"
    tryItCredentialsPolicy="include"
    logo="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Crect fill='%237c3aed' width='100' height='100' rx='20'/%3E%3Ctext x='50' y='65' font-family='system-ui' font-size='40' font-weight='bold' fill='white' text-anchor='middle'%3EZ%3C/text%3E%3C/svg%3E"
  />
</body>
</html>`;
  });

  // OpenAPI JSON endpoint - redirects to native swagger endpoint
  // The native /docs/json endpoint is generated by @fastify/swagger-ui AFTER all routes are registered
  // This ensures the spec always contains all routes
  server.get('/openapi.json', {
    schema: {
      tags: ['health'],
      description: 'OpenAPI 3.0 specification - redirects to /docs/json',
      response: {
        302: {
          type: 'null',
          description: 'Redirect to /docs/json',
        },
      },
    },
  }, async (request, reply) => {
    // Redirect to the native swagger-ui JSON endpoint which always has the full spec
    reply.redirect('/docs/json');
  });

  // Health check endpoint (detailed)
  server.get('/health', {
    schema: {
      tags: ['health'],
      description: 'Detailed health check endpoint',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            timestamp: { type: 'string' },
            uptime: { type: 'number' },
            version: { type: 'string' },
            memory: {
              type: 'object',
              properties: {
                heapUsed: { type: 'number' },
                heapTotal: { type: 'number' },
                rss: { type: 'number' },
              },
            },
          },
        },
      },
    },
  }, async (request, reply) => {
    const memUsage = process.memoryUsage();
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
      memory: {
        heapUsed: Math.round(memUsage.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memUsage.heapTotal / 1024 / 1024), // MB
        rss: Math.round(memUsage.rss / 1024 / 1024), // MB
      },
    };
  });

  // Lightweight healthz endpoint for load balancers and uptime monitors
  // Based on: https://fastify.dev/docs/latest/Guides/Recommendations/
  // "Expose a /healthz route for load-balancers and uptime monitors"
  server.get('/healthz', {
    schema: {
      tags: ['health'],
      description: 'Lightweight health check for load balancers (minimal overhead)',
      response: {
        200: {
          type: 'object',
          properties: {
            ok: { type: 'boolean' },
          },
        },
      },
    },
    // Disable logging for this endpoint to reduce noise
    logLevel: 'silent',
  }, async (request, reply) => {
    // Ultra-fast response for load balancer health checks
    return { ok: true };
  });

  // Ready check endpoint (for Kubernetes/orchestrators)
  server.get('/ready', {
    schema: {
      tags: ['health'],
      description: 'Readiness check endpoint for orchestrators',
      response: {
        200: {
          type: 'object',
          properties: {
            ready: { type: 'boolean' },
          },
        },
      },
    },
    logLevel: 'silent',
  }, async (request, reply) => {
    return { ready: true };
  });

  return server;
}

/**
 * Start the server
 */
export async function startServer(
  server: FastifyInstance,
  config: ServerConfig
): Promise<void> {
  try {
    await server.listen({
      port: config.port,
      host: config.host,
    });

    server.log.info(
      `Lead Service API is running at http://${config.host}:${config.port}`
    );
    server.log.info(
      `📚 Scalar API Reference: http://${config.host}:${config.port}/reference`
    );
    server.log.info(
      `📋 Swagger UI (fallback): http://${config.host}:${config.port}/docs`
    );
    server.log.info(
      `📄 OpenAPI Spec: http://${config.host}:${config.port}/openapi.json`
    );

    // Start the cron scheduler for automatic notifications
    if (process.env.ENABLE_CRON_SCHEDULER !== 'false') {
      try {
        startCronScheduler();
        server.log.info('Cron scheduler started for automatic notifications');
      } catch (cronError) {
        server.log.warn({ err: cronError }, 'Cron scheduler failed to start - continuing without scheduled notifications');
      }
    }

    // Graceful shutdown handler
    const shutdown = async () => {
      server.log.info('Shutting down gracefully...');
      stopCronScheduler();
      await server.close();
      process.exit(0);
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);

  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

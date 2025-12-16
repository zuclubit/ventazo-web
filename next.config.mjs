/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React Strict Mode for better development experience
  reactStrictMode: true,

  // Ignore ESLint errors during builds (handle separately in CI)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Ignore TypeScript errors during builds (handle separately in CI)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Transpile packages from the monorepo
  transpilePackages: ['@zuclubit/domain', '@zuclubit/events'],

  // Image optimization configuration
  images: {
    // Use unoptimized images for Cloudflare Pages compatibility
    unoptimized: process.env.CLOUDFLARE_PAGES === 'true',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'zuclubit-lead-service.fly.dev',
      },
    ],
  },

  // Environment variables that should be available on the client
  env: {
    NEXT_PUBLIC_APP_NAME: 'Zuclubit CRM',
    NEXT_PUBLIC_APP_VERSION: '1.0.0',
  },

  // Experimental features
  experimental: {
    // Enable server actions
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },

  // Output configuration for Cloudflare Pages
  // Use 'standalone' for Docker/Node.js or 'export' for static hosting
  ...(process.env.CLOUDFLARE_PAGES === 'true' && {
    output: 'standalone',
  }),

  // Redirects for common routes
  async redirects() {
    return [
      {
        source: '/dashboard',
        destination: '/app',
        permanent: true,
      },
    ];
  },

  // Headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ];
  },
};

export default nextConfig;

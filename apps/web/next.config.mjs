/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable standalone output for Cloudflare Pages deployment
  output: 'standalone',

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
    unoptimized: true,
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
    // Enable View Transitions API for smooth SPA-like navigation
    // This creates native app-like transitions between routes
    viewTransition: true,
  },

  // Webpack configuration for optimization
  webpack: (config, { isServer, webpack }) => {
    // Fix for __name error in Cloudflare Workers / esbuild
    // The __name helper is used by esbuild but not defined in browser
    if (!isServer) {
      config.plugins.push(
        new webpack.DefinePlugin({
          // Define __name as a no-op function that returns the input
          '__name': '((fn, name) => fn)',
        })
      );
    }

    // Optimize chunk splitting to stay under Cloudflare's 25MB limit
    if (!isServer) {
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          chunks: 'all',
          maxSize: 20 * 1024 * 1024, // 20MB max per chunk
          minSize: 20 * 1024, // 20KB min
          cacheGroups: {
            // Split large dependencies into separate chunks
            vendor: {
              test: /[\\/]node_modules[\\/]/,
              name: 'vendors',
              chunks: 'all',
              priority: 10,
              maxSize: 15 * 1024 * 1024, // 15MB max for vendor chunk
            },
            // Separate Radix UI components
            radix: {
              test: /[\\/]node_modules[\\/]@radix-ui[\\/]/,
              name: 'radix-ui',
              chunks: 'all',
              priority: 20,
            },
            // Separate chart library
            charts: {
              test: /[\\/]node_modules[\\/](recharts|d3)[\\/]/,
              name: 'charts',
              chunks: 'all',
              priority: 20,
            },
            // Separate tanstack libraries
            tanstack: {
              test: /[\\/]node_modules[\\/]@tanstack[\\/]/,
              name: 'tanstack',
              chunks: 'all',
              priority: 20,
            },
          },
        },
      };
    }

    // Disable webpack cache in production to avoid large cache files
    if (process.env.NODE_ENV === 'production') {
      config.cache = false;
    }

    return config;
  },

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

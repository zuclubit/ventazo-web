/**
 * @fileoverview tsup Build Configuration for @zuclubit/ui-kit
 *
 * Configures the build process for the Color Intelligence Design System.
 * Generates ESM, CJS, and TypeScript declarations for all entry points.
 *
 * @module ui-kit/tsup.config
 */

import { defineConfig } from 'tsup';

export default defineConfig({
  // Entry points matching package.json exports
  entry: {
    // Main entry
    'index': 'index.ts',

    // Domain layer
    'domain/index': 'domain/index.ts',

    // Application layer
    'application/index': 'application/index.ts',

    // Adapters layer
    'adapters/index': 'adapters/index.ts',
    'adapters/react/index': 'adapters/react/index.ts',
    'adapters/css/index': 'adapters/css/index.ts',
    'adapters/tailwind/index': 'adapters/tailwind/index.ts',

    // Infrastructure layer
    'infrastructure/index': 'infrastructure/index.ts',
    'infrastructure/audit/index': 'infrastructure/audit/index.ts',
    'infrastructure/exporters/index': 'infrastructure/exporters/index.ts',

    // Components layer
    'components/index': 'components/index.ts',
    'components/primitives/index': 'components/primitives/index.ts',
    'components/composed/index': 'components/composed/index.ts',

    // Validation layer
    'validation/index': 'validation/index.ts',
  },

  // Output formats
  format: ['esm', 'cjs'],

  // Generate TypeScript declarations
  dts: true,

  // Sourcemaps for debugging
  sourcemap: true,

  // Clean output directory before build
  clean: true,

  // Split chunks for better tree-shaking
  splitting: true,

  // Target modern browsers/node
  target: 'es2020',

  // External dependencies (peer deps)
  external: ['react', 'react-dom'],

  // Tree-shake for smaller bundles
  treeshake: true,

  // Minify production builds
  minify: process.env.NODE_ENV === 'production',

  // Output configuration
  outDir: 'dist',

  // Banner for builds
  banner: {
    js: '/* @zuclubit/ui-kit - Color Intelligence Design System */',
  },
});

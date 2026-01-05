import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/app.ts'],
  format: ['cjs'],
  // Disable DTS generation to reduce memory usage in CI
  dts: process.env.GENERATE_DTS === 'true',
  clean: true,
  sourcemap: true,
  target: 'es2022',
  platform: 'node',
  // Mark native and optional dependencies as external
  external: [
    'sharp',
    'pg-native',
    '@swc/core',
    'firebase-admin',
    'googleapis',
    '@azure/msal-node',
    '@microsoft/microsoft-graph-client',
    'bullmq',
    'ioredis',
    'nats', // NATS is dynamically imported
  ],
  // Bundle everything else
  noExternal: [],
  esbuildOptions(options) {
    options.alias = {
      '@zuclubit/domain': './src/shared/domain',
      '@zuclubit/database': './src/shared/database',
      '@zuclubit/events': './src/shared/events',
    };
  },
});

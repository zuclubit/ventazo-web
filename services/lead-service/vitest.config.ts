import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/**',
        'dist/**',
        '**/*.config.ts',
        '**/*.d.ts',
        '**/index.ts', // Barrel exports
        'src/infrastructure/database/schema.ts', // Schema definitions
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    include: ['src/**/*.test.ts'],
    exclude: ['node_modules', 'dist', '**/*.integration.test.ts', '**/*.api.test.ts', 'src/test/**'],
  },
});

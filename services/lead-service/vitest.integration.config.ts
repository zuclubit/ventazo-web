import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.integration.test.ts', 'src/**/*.api.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 60000, // 60 seconds for integration tests with containers
    hookTimeout: 60000,
    pool: 'forks', // Use forks for better isolation with containers
    poolOptions: {
      forks: {
        singleFork: true, // Run tests serially to avoid port conflicts
      },
    },
  },
});

import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: false,
    testTimeout: 10_000,
    hookTimeout: 20_000,
    include: ['tests/**/*.test.ts', 'src/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
  },
  resolve: {
    alias: {
      '@mcm/shared': new URL('../../packages/shared/src/index.ts', import.meta.url).pathname,
    },
  },
});

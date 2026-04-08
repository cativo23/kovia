import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '~': resolve(__dirname, 'app'),
      '#imports': resolve(__dirname, 'tests/setup.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: ['./tests/setup.ts'],
    include: ['app/**/*.spec.ts', 'tests/unit/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['app/**/*.vue', 'app/**/*.ts'],
      exclude: ['app/**/*.spec.ts'],
    },
  },
});

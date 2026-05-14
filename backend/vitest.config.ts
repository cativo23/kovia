import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    root: './',
    // Includes both `src/**/*.spec.ts` (regular unit/integration specs) and
    // `test/**/*.spec.ts` (boundary specs that live outside `src/`, e.g.
    // `test/locked-copy-consistency.spec.ts` which mitigates T-15-05).
    // The `test/**/*.e2e-spec.ts` suffix remains gated by vitest.config.e2e.ts.
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        'src/generated/**',
        'src/**/*.spec.ts',
        'src/**/*.module.ts',
        'src/main.ts',
      ],
    },
  },
  plugins: [swc.vite()],
});

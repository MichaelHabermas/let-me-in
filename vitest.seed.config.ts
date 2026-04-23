import { defineConfig } from 'vitest/config';

/** `pnpm seed:users` — isolated from the main unit test suite. */
export default defineConfig({
  resolve: {
    alias: {
      'onnxruntime-web/all': 'onnxruntime-web',
    },
  },
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    include: ['tests/scenarios/seed-3-users.integration.test.ts'],
  },
});

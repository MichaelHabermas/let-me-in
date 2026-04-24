import { defineConfig } from 'vitest/config';

export default defineConfig({
  define: {
    /** Lets admin enrollment tests mount without canvas/WebGL (`mount-admin-page`, E2E-style stub). */
    'import.meta.env.VITE_E2E_STUB_ENROLL': JSON.stringify('true'),
  },
  resolve: {
    alias: {
      // Browser build uses `/all` so WebGL registers; Node tests use the slim entry (WASM + file wasmPaths).
      'onnxruntime-web/all': 'onnxruntime-web',
    },
  },
  test: {
    exclude: ['**/node_modules/**', '**/dist/**', 'tests/e2e/**', 'tests/scenarios/**'],
    environment: 'node',
    /**
     * Vitest 4 removed `environmentMatchGlobs`. Suites that need `document` must use
     * `/** @vitest-environment happy-dom *\/` at file top. DOM tests:
     * bootstrap-app, detector-worker-client, gate-session, mount-gate, org-static-pages.
     */
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.ts'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        'src/**/*.test.ts',
        'tests/e2e/**',
        'tests/scenarios/**',
      ],
    },
  },
});

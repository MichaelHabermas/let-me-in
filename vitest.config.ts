import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      // Browser build uses `/all` so WebGL registers; Node tests use the slim entry (WASM + file wasmPaths).
      'onnxruntime-web/all': 'onnxruntime-web',
    },
  },
  test: {
    environment: 'node',
    /**
     * Vitest 4 removed `environmentMatchGlobs`. Suites that need `document` must use
     * `/** @vitest-environment happy-dom *\/` at file top. DOM tests:
     * bootstrap-app, detector-worker-client, gate-session, mount-gate, org-static-pages.
     */
    setupFiles: ['./tests/setup.ts'],
  },
});

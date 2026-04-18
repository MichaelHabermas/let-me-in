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
    setupFiles: ['./tests/setup.ts'],
  },
});

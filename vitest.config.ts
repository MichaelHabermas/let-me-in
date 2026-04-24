import { defineConfig } from 'vitest/config';

/** Suites that need `document` / DOM — run under `happy-dom` (see `test.projects` below). */
const happyDomTestFiles = [
  'tests/admin-enrollment-mount-coordinator.test.ts',
  'tests/audio.test.ts',
  'tests/auth.test.ts',
  'tests/bootstrap-app.test.ts',
  'tests/bulk-import.test.ts',
  'tests/access-decision-engine.test.ts',
  'tests/confidence-meter.test.ts',
  'tests/consent-settings.test.ts',
  'tests/decision-banner.test.ts',
  'tests/detector-worker-client.test.ts',
  'tests/enroll-e2e-controller.test.ts',
  'tests/gate-access-ui-controller.test.ts',
  'tests/gate-session.test.ts',
  'tests/mount-admin-page.test.ts',
  'tests/mount-gate.test.ts',
  'tests/mount-log-page.test.ts',
  'tests/org-static-pages.test.ts',
  'tests/pipeline.test.ts',
] as const;

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
    projects: [
      {
        extends: true,
        test: {
          name: 'unit-node',
          environment: 'node',
          include: ['tests/**/*.test.ts'],
          exclude: [
            '**/node_modules/**',
            '**/dist/**',
            'tests/e2e/**',
            'tests/scenarios/**',
            ...happyDomTestFiles,
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'unit-dom',
          environment: 'happy-dom',
          include: [...happyDomTestFiles],
        },
      },
    ],
  },
});

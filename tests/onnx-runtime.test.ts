import { describe, expect, it } from 'vitest';

import { createOnnxRuntimePlaceholder, resetOrtWasmConfigForTests } from '../src/infra/onnx-runtime';

describe('createOnnxRuntimePlaceholder', () => {
  it('returns a disposable disabled handle', async () => {
    const ort = await createOnnxRuntimePlaceholder();
    expect(ort.status).toBe('disabled');
    await expect(ort.dispose()).resolves.toBeUndefined();
  });
});

describe('onnx-runtime re-exports', () => {
  it('re-exports resetOrtWasmConfigForTests from ort-session-factory', () => {
    expect(typeof resetOrtWasmConfigForTests).toBe('function');
  });
});

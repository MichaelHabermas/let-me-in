import { describe, expect, it } from 'vitest';

import { resetOrtWasmConfigForTests } from '../src/infra/onnx-runtime';

describe('onnx-runtime re-exports', () => {
  it('re-exports resetOrtWasmConfigForTests from ort-session-factory', () => {
    expect(typeof resetOrtWasmConfigForTests).toBe('function');
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

const inferenceCreate = vi.fn();

vi.mock('onnxruntime-web', () => ({
  __esModule: true as const,
  default: {},
  InferenceSession: {
    create: (...args: unknown[]) => inferenceCreate(...args),
  },
}));

describe('createOrtSession', () => {
  beforeEach(() => {
    inferenceCreate.mockReset();
  });

  it('returns session and first EP when webgl succeeds', async () => {
    const fakeSession = { dispose: vi.fn() };
    inferenceCreate.mockResolvedValueOnce(fakeSession);

    const { createOrtSession } = await import('../src/infra/ort-session-factory');
    const out = await createOrtSession('https://example.com/m.onnx', ['webgl', 'wasm']);

    expect(out.executionProvider).toBe('webgl');
    expect(out.session).toBe(fakeSession);
    expect(inferenceCreate).toHaveBeenCalledTimes(1);
    expect(inferenceCreate).toHaveBeenCalledWith('https://example.com/m.onnx', {
      graphOptimizationLevel: 'all',
      executionProviders: ['webgl'],
    });
  });

  it('falls through to wasm when webgl fails', async () => {
    const fakeSession = { dispose: vi.fn() };
    inferenceCreate
      .mockRejectedValueOnce(new Error('webgl backend not found'))
      .mockResolvedValueOnce(fakeSession);

    const { createOrtSession } = await import('../src/infra/ort-session-factory');
    const out = await createOrtSession('/models/x.onnx');

    expect(out.executionProvider).toBe('wasm');
    expect(out.session).toBe(fakeSession);
    expect(inferenceCreate).toHaveBeenCalledTimes(2);
  });

  it('throws OrtSessionError when all EPs fail', async () => {
    inferenceCreate.mockRejectedValue(new Error('nope'));

    const { createOrtSession, OrtSessionError } = await import('../src/infra/ort-session-factory');
    const err = await createOrtSession('https://invalid/bad.onnx').catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OrtSessionError);
    expect(err).toMatchObject({
      name: 'OrtSessionError',
      modelUrl: 'https://invalid/bad.onnx',
    });
  });
});

describe('onnx-runtime re-exports', () => {
  it('exports createOrtSession from onnx-runtime', async () => {
    inferenceCreate.mockResolvedValue({ dispose: vi.fn() });
    const { createOrtSession } = await import('../src/infra/onnx-runtime');
    await expect(createOrtSession('u', ['wasm'])).resolves.toMatchObject({ executionProvider: 'wasm' });
  });
});

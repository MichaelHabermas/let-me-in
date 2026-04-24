import { describe, expect, it, vi } from 'vitest';

import { createDetectorEmbedderRuntime } from '../src/infra/inference-runtime';

describe('createDetectorEmbedderRuntime', () => {
  it('loadAll and disposeAll invoke both sides', async () => {
    const dLoad = vi.fn().mockResolvedValue(undefined);
    const dDispose = vi.fn().mockResolvedValue(undefined);
    const eLoad = vi.fn().mockResolvedValue(undefined);
    const eDispose = vi.fn().mockResolvedValue(undefined);
    const rt = createDetectorEmbedderRuntime({
      createDetector: () => ({
        load: dLoad,
        infer: vi.fn().mockResolvedValue([]),
        dispose: dDispose,
      }),
      createEmbedder: () => ({
        load: eLoad,
        infer: vi.fn().mockResolvedValue(new Float32Array(1)),
        dispose: eDispose,
      }),
    });
    await rt.loadAll();
    expect(dLoad).toHaveBeenCalledOnce();
    expect(eLoad).toHaveBeenCalledOnce();
    await rt.disposeAll();
    expect(dDispose).toHaveBeenCalledOnce();
    expect(eDispose).toHaveBeenCalledOnce();
  });
});

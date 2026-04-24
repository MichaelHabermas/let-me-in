import { describe, expect, it, vi } from 'vitest';

import { fetchModelBytesWithProgress } from '../src/infra/fetch-model-bytes';

function streamResponse(chunks: Uint8Array[], contentLength?: string): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(c);
      controller.close();
    },
  });
  const headers = new Headers();
  if (contentLength != null) headers.set('Content-Length', contentLength);
  return new Response(stream, { status: 200, headers });
}

describe('fetchModelBytesWithProgress', () => {
  it('reports progress and returns concatenated bytes', async () => {
    const a = new Uint8Array([1, 2]);
    const b = new Uint8Array([3, 4, 5]);
    const progress = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue(streamResponse([a, b], '5'));

    const out = await fetchModelBytesWithProgress('/models/x.onnx', progress);
    expect([...out]).toEqual([1, 2, 3, 4, 5]);
    expect(progress.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(progress.mock.calls[progress.mock.calls.length - 1]![0]).toEqual({
      loaded: 5,
      total: 5,
    });
  });

  it('works without Content-Length', async () => {
    const progress = vi.fn();
    globalThis.fetch = vi.fn().mockResolvedValue(streamResponse([new Uint8Array([9])]));

    const out = await fetchModelBytesWithProgress('/y', progress);
    expect([...out]).toEqual([9]);
    expect(progress).toHaveBeenCalledWith({ loaded: 1, total: null });
  });
});

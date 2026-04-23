/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from 'vitest';

import { createYoloWorkerDetector } from '../src/infra/detector-worker-client';
import { YOLO_WORKER_MSG } from '../src/infra/yolo-detector-worker-protocol';

type Posted = { msg: unknown; transfer?: Transferable[] };

function createMockWorker(
  handler: (posted: Posted, reply: (data: unknown) => void) => void,
): typeof Worker {
  return class MockWorker {
    onmessage: ((ev: MessageEvent) => void) | null = null;
    onerror: ((ev: ErrorEvent) => void) | null = null;

    postMessage(msg: unknown, transfer?: Transferable[]): void {
      handler({ msg, transfer }, (data) => {
        queueMicrotask(() => this.onmessage?.({ data } as MessageEvent));
      });
    }

    terminate(): void {
      /* no-op */
    }
  } as unknown as typeof Worker;
}

describe('createYoloWorkerDetector', () => {
  it('sends init with wasm base and model URL, then resolves load on init-ok', async () => {
    const posted: Posted[] = [];
    vi.stubGlobal(
      'Worker',
      createMockWorker((p, reply) => {
        posted.push(p);
        const m = p.msg as { type: string; id: number };
        if (m.type === YOLO_WORKER_MSG.init) {
          reply({ type: YOLO_WORKER_MSG.initOk, id: m.id });
        }
      }),
    );

    const det = createYoloWorkerDetector({
      modelUrl: 'https://example/model.onnx',
      ortWasmBase: 'https://cdn/wasm/',
    });
    await det.load();

    expect(posted).toHaveLength(1);
    expect(posted[0].msg).toMatchObject({
      type: YOLO_WORKER_MSG.init,
      ortWasmBase: 'https://cdn/wasm/',
      modelUrl: 'https://example/model.onnx',
    });
    vi.unstubAllGlobals();
  });

  it('rejects load on init-err', async () => {
    vi.stubGlobal(
      'Worker',
      createMockWorker((p, reply) => {
        const m = p.msg as { type: string; id: number };
        if (m.type === YOLO_WORKER_MSG.init) {
          reply({ type: YOLO_WORKER_MSG.initErr, id: m.id, error: 'wasm fail' });
        }
      }),
    );

    const det = createYoloWorkerDetector({ modelUrl: 'm.onnx', ortWasmBase: '/' });
    await expect(det.load()).rejects.toThrow('wasm fail');
    vi.unstubAllGlobals();
  });

  it('infers with rgba transfer and returns detections from infer-ok', async () => {
    const posted: Posted[] = [];
    vi.stubGlobal(
      'Worker',
      createMockWorker((p, reply) => {
        posted.push(p);
        const m = p.msg as { type: string; id: number; rgba?: ArrayBuffer };
        if (m.type === YOLO_WORKER_MSG.init) {
          reply({ type: YOLO_WORKER_MSG.initOk, id: m.id });
        } else if (m.type === YOLO_WORKER_MSG.infer) {
          expect(p.transfer?.length).toBe(1);
          expect(p.transfer?.[0]).toBe(m.rgba);
          reply({
            type: YOLO_WORKER_MSG.inferOk,
            id: m.id,
            dets: [{ bbox: [0, 0, 1, 1], confidence: 0.9, classId: 0 }],
          });
        }
      }),
    );

    const det = createYoloWorkerDetector({ modelUrl: 'm.onnx', ortWasmBase: '/' });
    await det.load();
    const data = new Uint8ClampedArray(4);
    const imageData = {
      width: 2,
      height: 2,
      data,
      colorSpace: 'srgb',
    } as ImageData;
    const dets = await det.infer(imageData);

    expect(dets).toHaveLength(1);
    expect(dets[0].classId).toBe(0);
    const inferPosted = posted.find(
      (x) => (x.msg as { type: string }).type === YOLO_WORKER_MSG.infer,
    );
    expect(inferPosted?.msg).toMatchObject({
      type: YOLO_WORKER_MSG.infer,
      width: 2,
      height: 2,
    });
    vi.unstubAllGlobals();
  });

  it('rejects infer on infer-err', async () => {
    vi.stubGlobal(
      'Worker',
      createMockWorker((p, reply) => {
        const m = p.msg as { type: string; id: number };
        if (m.type === YOLO_WORKER_MSG.init) {
          reply({ type: YOLO_WORKER_MSG.initOk, id: m.id });
        } else if (m.type === YOLO_WORKER_MSG.infer) {
          reply({ type: YOLO_WORKER_MSG.inferErr, id: m.id, error: 'boom' });
        }
      }),
    );

    const det = createYoloWorkerDetector({ modelUrl: 'm.onnx', ortWasmBase: '/' });
    await det.load();
    const imageData = {
      width: 1,
      height: 1,
      data: new Uint8ClampedArray(4),
      colorSpace: 'srgb',
    } as ImageData;
    await expect(det.infer(imageData)).rejects.toThrow('boom');
    vi.unstubAllGlobals();
  });

  it('rejects pending load when worker fires onerror', async () => {
    const instances: Array<{
      onmessage: ((ev: MessageEvent) => void) | null;
      onerror: ((ev: ErrorEvent) => void) | null;
    }> = [];

    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: ErrorEvent) => void) | null = null;

      constructor() {
        instances.push(this);
      }

      postMessage(): void {
        /* init never completes */
      }

      terminate(): void {
        /* no-op */
      }
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const det = createYoloWorkerDetector({ modelUrl: 'm.onnx', ortWasmBase: '/' });
    const loadP = det.load();
    await Promise.resolve();
    expect(instances).toHaveLength(1);
    const w = instances[0]!;
    w.onerror?.({ message: 'worker crashed' } as ErrorEvent);
    await expect(loadP).rejects.toThrow('worker crashed');
    vi.unstubAllGlobals();
  });

  it('calls terminate on dispose', async () => {
    const terminate = vi.fn();
    class MockWorker {
      onmessage: ((ev: MessageEvent) => void) | null = null;
      onerror: ((ev: ErrorEvent) => void) | null = null;

      postMessage(_msg: unknown, _transfer?: Transferable[]): void {
        /* no-op */
      }

      terminate(): void {
        terminate();
      }
    }

    vi.stubGlobal('Worker', MockWorker as unknown as typeof Worker);

    const det = createYoloWorkerDetector({ modelUrl: 'm.onnx', ortWasmBase: '/' });
    await det.dispose();
    expect(terminate).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});

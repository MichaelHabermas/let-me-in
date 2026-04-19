import { describe, expect, it } from 'vitest';

import { YoloWorkerTransport } from '../src/infra/yolo-worker-transport';
import { YOLO_WORKER_MSG } from '../src/infra/yolo-detector-worker-protocol';

type Posted = { msg: unknown; transfer?: Transferable[] };

function createMockWorker(
  handler: (posted: Posted, reply: (data: unknown) => void) => void,
): Worker {
  return new (class MockWorker {
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
  })() as unknown as Worker;
}

describe('YoloWorkerTransport', () => {
  it('resolves postToWorker when init-ok id matches', async () => {
    const worker = createMockWorker((p, reply) => {
      const m = p.msg as { type: string; id: number };
      if (m.type === YOLO_WORKER_MSG.init) {
        reply({ type: YOLO_WORKER_MSG.initOk, id: m.id });
      }
    });
    const t = new YoloWorkerTransport(worker);
    const msg = {
      type: YOLO_WORKER_MSG.init,
      id: t.nextMessageId(),
      ortWasmBase: '/wasm/',
      modelUrl: '/m.onnx',
    } as const;
    await expect(t.postToWorker(msg)).resolves.toMatchObject({ type: YOLO_WORKER_MSG.initOk, id: msg.id });
  });

  it('rejects postToWorker on init-err', async () => {
    const worker = createMockWorker((p, reply) => {
      const m = p.msg as { type: string; id: number };
      if (m.type === YOLO_WORKER_MSG.init) {
        reply({ type: YOLO_WORKER_MSG.initErr, id: m.id, error: 'boom' });
      }
    });
    const t = new YoloWorkerTransport(worker);
    const id = t.nextMessageId();
    await expect(
      t.postToWorker({ type: YOLO_WORKER_MSG.init, id, ortWasmBase: '/', modelUrl: 'x' }),
    ).rejects.toThrow('boom');
  });

  it('does not resolve pending when reply id mismatches', async () => {
    const worker = createMockWorker((p, reply) => {
      const m = p.msg as { type: string; id: number };
      if (m.type === YOLO_WORKER_MSG.init) {
        reply({ type: YOLO_WORKER_MSG.initOk, id: m.id + 999 });
      }
    });
    const t = new YoloWorkerTransport(worker);
    const id = t.nextMessageId();
    const pending = t.postToWorker({ type: YOLO_WORKER_MSG.init, id, ortWasmBase: '/', modelUrl: 'x' });
    const raced = await Promise.race([
      pending,
      new Promise<string>((r) => setTimeout(() => r('still-pending'), 25)),
    ]);
    expect(raced).toBe('still-pending');
  });

  it('rejects pending on worker onerror', async () => {
    const worker = createMockWorker(() => {
      /* never replies */
    });
    const t = new YoloWorkerTransport(worker);
    const id = t.nextMessageId();
    const p = t.postToWorker({ type: YOLO_WORKER_MSG.init, id, ortWasmBase: '/', modelUrl: 'x' });
    worker.onerror?.({ message: 'worker blew up' } as unknown as ErrorEvent);
    await expect(p).rejects.toThrow('worker blew up');
  });

  it('clearPending drops handlers without rejecting', () => {
    const worker = createMockWorker(() => {});
    const t = new YoloWorkerTransport(worker);
    const id = t.nextMessageId();
    void t.postToWorker({ type: YOLO_WORKER_MSG.init, id, ortWasmBase: '/', modelUrl: 'x' });
    t.clearPending();
  });
});

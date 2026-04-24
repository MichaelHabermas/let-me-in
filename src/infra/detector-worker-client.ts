import type { YoloDetector } from './detector-core';
import {
  YOLO_WORKER_MSG,
  type YoloHostToWorkerInfer,
  type YoloHostToWorkerInit,
  type YoloHostToWorkerMessage,
  type YoloWorkerToHostMessage,
  isYoloWorkerToHostMessage,
} from './yolo-detector-worker-protocol';

export type YoloWorkerDetectorOptions = {
  modelUrl: string;
  ortWasmBase: string;
};

/**
 * Runs ORT + YOLO decode off the main thread so the camera preview can stay near display rate.
 */
export function createYoloWorkerDetector(opts: YoloWorkerDetectorOptions): YoloDetector {
  const worker = new Worker(new URL('../workers/yolo-detector.worker.ts', import.meta.url), {
    type: 'module',
  });
  let nextId = 1;
  const pending = new Map<
    number,
    { resolve: (message: YoloWorkerToHostMessage) => void; reject: (error: Error) => void }
  >();
  let loaded = false;
  /** ORT session.run is not re-entrant; RAF overlay + capture can overlap without this queue. */
  let inferChain: Promise<unknown> = Promise.resolve();

  const rejectAll = (error: Error) => {
    for (const entry of pending.values()) {
      entry.reject(error);
    }
    pending.clear();
  };

  const postToWorker = (
    message: YoloHostToWorkerMessage,
    transfer: Transferable[] = [],
  ): Promise<YoloWorkerToHostMessage> =>
    new Promise((resolve, reject) => {
      pending.set(message.id, { resolve, reject });
      worker.postMessage(message, transfer);
    });

  worker.onmessage = (ev: MessageEvent) => {
    if (!isYoloWorkerToHostMessage(ev.data)) return;
    const slot = pending.get(ev.data.id);
    if (!slot) return;
    pending.delete(ev.data.id);
    if (ev.data.type === YOLO_WORKER_MSG.initErr || ev.data.type === YOLO_WORKER_MSG.inferErr) {
      slot.reject(new Error(ev.data.error));
      return;
    }
    slot.resolve(ev.data);
  };

  worker.onerror = (event) => {
    rejectAll(new Error(event.message));
  };

  return {
    async load() {
      if (loaded) return;
      const msg: YoloHostToWorkerInit = {
        type: YOLO_WORKER_MSG.init,
        id: nextId++,
        ortWasmBase: opts.ortWasmBase,
        modelUrl: opts.modelUrl,
      };
      const reply = await postToWorker(msg);
      if (reply.type !== YOLO_WORKER_MSG.initOk) {
        throw new Error(
          reply.type === YOLO_WORKER_MSG.initErr ? reply.error : 'unexpected worker reply',
        );
      }
      loaded = true;
    },

    async infer(imageData: ImageData) {
      const { width, height, data } = imageData;
      const rgba = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const msg: YoloHostToWorkerInfer = {
        type: YOLO_WORKER_MSG.infer,
        id: nextId++,
        width,
        height,
        rgba,
      };
      const job = inferChain.then(async () => {
        const reply = await postToWorker(msg, [rgba]);
        if (reply.type !== YOLO_WORKER_MSG.inferOk) {
          throw new Error(
            reply.type === YOLO_WORKER_MSG.inferErr ? reply.error : 'unexpected worker reply',
          );
        }
        return reply.dets;
      });
      inferChain = job.then(
        () => {},
        () => {},
      );
      return job;
    },

    async dispose() {
      await inferChain.catch(() => {});
      pending.clear();
      worker.terminate();
      loaded = false;
      inferChain = Promise.resolve();
      nextId = 1;
    },
  };
}

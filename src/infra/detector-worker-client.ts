import type { YoloDetector } from './detector-core';
import { YoloWorkerTransport } from './yolo-worker-transport';
import {
  YOLO_WORKER_MSG,
  type YoloHostToWorkerInfer,
  type YoloHostToWorkerInit,
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
  const rpc = new YoloWorkerTransport(worker);
  let loaded = false;

  return {
    async load() {
      if (loaded) return;
      const msg: YoloHostToWorkerInit = {
        type: YOLO_WORKER_MSG.init,
        id: rpc.nextMessageId(),
        ortWasmBase: opts.ortWasmBase,
        modelUrl: opts.modelUrl,
      };
      const reply = await rpc.postToWorker(msg);
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
        id: rpc.nextMessageId(),
        width,
        height,
        rgba,
      };
      const reply = await rpc.postToWorker(msg, [rgba]);
      if (reply.type !== YOLO_WORKER_MSG.inferOk) {
        throw new Error(
          reply.type === YOLO_WORKER_MSG.inferErr ? reply.error : 'unexpected worker reply',
        );
      }
      return reply.dets;
    },

    async dispose() {
      rpc.clearPending();
      rpc.terminate();
      loaded = false;
    },
  };
}

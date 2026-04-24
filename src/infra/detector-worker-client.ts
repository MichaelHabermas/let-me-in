import type { ModelLoadProgress } from './model-load-types';
import type { YoloDetector } from './detector-core';
import {
  YOLO_WORKER_MSG,
  type YoloHostToWorkerInfer,
  type YoloHostToWorkerInit,
  type YoloHostToWorkerMessage,
  type YoloWorkerToHostInitProgress,
  type YoloWorkerToHostMessage,
  isYoloWorkerToHostMessage,
} from './yolo-detector-worker-protocol';

export type YoloWorkerDetectorOptions = {
  modelUrl: string;
  ortWasmBase: string;
  onLoadProgress?: (p: ModelLoadProgress) => void;
};

type PendingMessageSlot = {
  resolve: (message: YoloWorkerToHostMessage) => void;
  reject: (error: Error) => void;
};

type WorkerRpcState = {
  worker: Worker;
  pending: Map<number, PendingMessageSlot>;
};

type DetectorRuntimeState = {
  nextId: number;
  loaded: boolean;
  inferChain: Promise<unknown>;
};

function rejectAllPending(state: WorkerRpcState, error: Error): void {
  for (const entry of state.pending.values()) {
    entry.reject(error);
  }
  state.pending.clear();
}

function postToWorker(
  state: WorkerRpcState,
  message: YoloHostToWorkerMessage,
  transfer: Transferable[] = [],
): Promise<YoloWorkerToHostMessage> {
  return new Promise((resolve, reject) => {
    state.pending.set(message.id, { resolve, reject });
    state.worker.postMessage(message, transfer);
  });
}

function isInitProgress(data: unknown): data is YoloWorkerToHostInitProgress {
  if (!data || typeof data !== 'object') return false;
  const m = data as { type?: string; id?: number; loaded?: number; total?: unknown };
  return (
    m.type === YOLO_WORKER_MSG.initProgress &&
    typeof m.id === 'number' &&
    typeof m.loaded === 'number' &&
    (m.total === null || typeof m.total === 'number')
  );
}

function wireWorkerRpc(
  state: WorkerRpcState,
  onLoadProgress?: (p: ModelLoadProgress) => void,
): void {
  state.worker.onmessage = (ev: MessageEvent) => {
    if (isInitProgress(ev.data)) {
      onLoadProgress?.({
        stage: 'detector',
        loaded: ev.data.loaded,
        total: ev.data.total ?? undefined,
      });
      return;
    }
    if (!isYoloWorkerToHostMessage(ev.data)) return;
    const slot = state.pending.get(ev.data.id);
    if (!slot) return;
    state.pending.delete(ev.data.id);
    if (ev.data.type === YOLO_WORKER_MSG.initErr || ev.data.type === YOLO_WORKER_MSG.inferErr) {
      slot.reject(new Error(ev.data.error));
      return;
    }
    slot.resolve(ev.data);
  };
  state.worker.onerror = (event) => {
    rejectAllPending(state, new Error(event.message));
  };
}

async function runInferJob(
  state: WorkerRpcState,
  msg: YoloHostToWorkerInfer,
): Promise<ReturnType<YoloDetector['infer']>> {
  const reply = await postToWorker(state, msg, [msg.rgba]);
  if (reply.type !== YOLO_WORKER_MSG.inferOk) {
    throw new Error(
      reply.type === YOLO_WORKER_MSG.inferErr ? reply.error : 'unexpected worker reply',
    );
  }
  return reply.dets;
}

function createDetectorApi(
  opts: YoloWorkerDetectorOptions,
  state: WorkerRpcState,
  runtime: DetectorRuntimeState,
): YoloDetector {
  return {
    async load() {
      if (runtime.loaded) return;
      const msg: YoloHostToWorkerInit = {
        type: YOLO_WORKER_MSG.init,
        id: runtime.nextId++,
        ortWasmBase: opts.ortWasmBase,
        modelUrl: opts.modelUrl,
      };
      const reply = await postToWorker(state, msg);
      if (reply.type !== YOLO_WORKER_MSG.initOk) {
        throw new Error(
          reply.type === YOLO_WORKER_MSG.initErr ? reply.error : 'unexpected worker reply',
        );
      }
      runtime.loaded = true;
    },

    async infer(imageData: ImageData) {
      const { width, height, data } = imageData;
      const rgba = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const msg: YoloHostToWorkerInfer = {
        type: YOLO_WORKER_MSG.infer,
        id: runtime.nextId++,
        width,
        height,
        rgba,
      };
      const job = runtime.inferChain.then(() => runInferJob(state, msg));
      runtime.inferChain = job.then(
        () => {},
        () => {},
      );
      return job;
    },

    async dispose() {
      await runtime.inferChain.catch(() => {});
      state.pending.clear();
      state.worker.terminate();
      runtime.loaded = false;
      runtime.inferChain = Promise.resolve();
      runtime.nextId = 1;
    },
  };
}

/**
 * Runs ORT + YOLO decode off the main thread so the camera preview can stay near display rate.
 */
export function createYoloWorkerDetector(opts: YoloWorkerDetectorOptions): YoloDetector {
  const worker = new Worker(new URL('../workers/yolo-detector.worker.ts', import.meta.url), {
    type: 'module',
  });
  const state: WorkerRpcState = { worker, pending: new Map<number, PendingMessageSlot>() };
  const runtime: DetectorRuntimeState = {
    nextId: 1,
    loaded: false,
    /** ORT session.run is not re-entrant; RAF overlay + capture can overlap without this queue. */
    inferChain: Promise.resolve(),
  };
  wireWorkerRpc(state, opts.onLoadProgress);
  return createDetectorApi(opts, state, runtime);
}

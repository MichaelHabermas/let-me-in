import type { Detection, YoloDetector } from './detector-core';

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
    { resolve: (v: unknown) => void; reject: (e: Error) => void }
  >();

  function post<T>(type: string, payload: Record<string, unknown> = {}, transfer: Transferable[] = []): Promise<T> {
    const id = nextId++;
    return new Promise<T>((resolve, reject) => {
      pending.set(id, {
        resolve: resolve as (v: unknown) => void,
        reject,
      });
      worker.postMessage({ type, id, ...payload }, transfer);
    });
  }

  worker.onmessage = (ev: MessageEvent) => {
    const m = ev.data as { type: string; id: number; dets?: Detection[]; error?: string };
    const slot = pending.get(m.id);
    if (!slot) return;
    pending.delete(m.id);
    if (m.type.endsWith('-ok')) {
      slot.resolve(m);
    } else {
      slot.reject(new Error(m.error ?? 'worker error'));
    }
  };

  worker.onerror = (e) => {
    for (const [, slot] of pending) {
      slot.reject(new Error(e.message));
    }
    pending.clear();
  };

  let loaded = false;

  return {
    async load() {
      if (loaded) return;
      await post('init', { ortWasmBase: opts.ortWasmBase, modelUrl: opts.modelUrl });
      loaded = true;
    },

    async infer(imageData: ImageData) {
      const { width, height, data } = imageData;
      const rgba = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
      const m = await post<{ dets: Detection[] }>(
        'infer',
        {
          width,
          height,
          rgba,
        },
        [rgba],
      );
      return m.dets ?? [];
    },

    async dispose() {
      pending.clear();
      worker.terminate();
      loaded = false;
    },
  };
}

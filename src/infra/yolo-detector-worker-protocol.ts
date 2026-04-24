import type { Detection } from './detector-core';

export const YOLO_WORKER_MSG = {
  init: 'init',
  infer: 'infer',
  initOk: 'init-ok',
  initErr: 'init-err',
  initProgress: 'init-progress',
  inferOk: 'infer-ok',
  inferErr: 'infer-err',
} as const;

export type YoloWorkerToHostMessage =
  | { type: typeof YOLO_WORKER_MSG.initOk; id: number }
  | { type: typeof YOLO_WORKER_MSG.initErr; id: number; error: string }
  | { type: typeof YOLO_WORKER_MSG.inferOk; id: number; dets: Detection[] }
  | { type: typeof YOLO_WORKER_MSG.inferErr; id: number; error: string };

/** Fire-and-forget download progress during init (same `id` as the pending init RPC). */
export type YoloWorkerToHostInitProgress = {
  type: typeof YOLO_WORKER_MSG.initProgress;
  id: number;
  loaded: number;
  total: number | null;
};

export type YoloHostToWorkerInit = {
  type: typeof YOLO_WORKER_MSG.init;
  id: number;
  ortWasmBase: string;
  modelUrl: string;
};

export type YoloHostToWorkerInfer = {
  type: typeof YOLO_WORKER_MSG.infer;
  id: number;
  width: number;
  height: number;
  rgba: ArrayBuffer;
};

export type YoloHostToWorkerMessage = YoloHostToWorkerInit | YoloHostToWorkerInfer;

export function isYoloWorkerToHostMessage(data: unknown): data is YoloWorkerToHostMessage {
  if (!data || typeof data !== 'object') return false;
  const m = data as { type?: string; id?: number };
  if (typeof m.type !== 'string' || typeof m.id !== 'number') return false;
  if (m.type === YOLO_WORKER_MSG.initProgress) return false;
  switch (m.type) {
    case YOLO_WORKER_MSG.initOk:
      return true;
    case YOLO_WORKER_MSG.initErr:
      return typeof (m as { error?: string }).error === 'string';
    case YOLO_WORKER_MSG.inferOk: {
      const dets = (m as { dets?: unknown }).dets;
      return Array.isArray(dets);
    }
    case YOLO_WORKER_MSG.inferErr:
      return typeof (m as { error?: string }).error === 'string';
    default:
      return false;
  }
}

/// <reference lib="webworker" />

import {
  configureOrtWasmAssets,
  createOrtSession,
  type OrtSessionBundle,
} from '../infra/ort-session-factory';
import { YOLO_WORKER_MSG } from '../infra/yolo-detector-worker-protocol';
import { runYoloDetectorInference } from '../infra/yolo-ort-inference';

let bundle: OrtSessionBundle | null = null;

async function handleInitMessage(msg: {
  id: number;
  ortWasmBase: string;
  modelUrl: string;
}): Promise<void> {
  try {
    configureOrtWasmAssets(msg.ortWasmBase);
    bundle = await createOrtSession(msg.modelUrl);
    self.postMessage({ type: YOLO_WORKER_MSG.initOk, id: msg.id });
  } catch (e) {
    self.postMessage({
      type: YOLO_WORKER_MSG.initErr,
      id: msg.id,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

async function handleInferMessage(msg: {
  id: number;
  width: number;
  height: number;
  rgba: ArrayBuffer;
}): Promise<void> {
  if (!bundle) {
    self.postMessage({
      type: YOLO_WORKER_MSG.inferErr,
      id: msg.id,
      error: 'detector not loaded',
    });
    return;
  }
  try {
    const data = new Uint8ClampedArray(msg.rgba);
    const imageData = {
      width: msg.width,
      height: msg.height,
      data,
      colorSpace: 'srgb',
    } as ImageData;
    const dets = await runYoloDetectorInference(bundle.session, imageData);
    self.postMessage({ type: YOLO_WORKER_MSG.inferOk, id: msg.id, dets });
  } catch (e) {
    self.postMessage({
      type: YOLO_WORKER_MSG.inferErr,
      id: msg.id,
      error: e instanceof Error ? e.message : String(e),
    });
  }
}

self.onmessage = (ev: MessageEvent) => {
  const m = ev.data as { type?: string };
  if (m.type === YOLO_WORKER_MSG.init) {
    void handleInitMessage(ev.data as Parameters<typeof handleInitMessage>[0]);
    return;
  }
  if (m.type === YOLO_WORKER_MSG.infer) {
    void handleInferMessage(ev.data as Parameters<typeof handleInferMessage>[0]);
  }
};

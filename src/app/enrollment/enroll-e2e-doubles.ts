/**
 * Headless-friendly camera / detector / embedder for Playwright and Vitest when
 * `VITE_E2E_STUB_ENROLL` is set — keeps a single `createEnrollmentController` path.
 */

import type { Camera, ErrorCallback, FrameCallback, Unsubscribe } from '../../infra/camera';
import { makeCameraError } from '../../infra/camera';
import type { Detection } from '../../infra/detector-core';
import type { FaceEmbedder } from '../../infra/embedder-ort';

const E2E_EMBEDDING_UNIT = 1 / Math.sqrt(512);

function greyImageData(frameWidth: number, frameHeight: number): ImageData {
  const data = new Uint8ClampedArray(frameWidth * frameHeight * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = 120;
    data[i + 1] = 120;
    data[i + 2] = 120;
    data[i + 3] = 255;
  }
  return new ImageData(data, frameWidth, frameHeight);
}

export type E2eEnrollmentDetector = {
  load(): Promise<void>;
  infer(imageData: ImageData): Promise<Detection[]>;
  dispose(): Promise<void>;
};

/** One high-confidence face box inset from the frame edges (stable for crop/embed). */
export function createE2eEnrollmentDetector(): E2eEnrollmentDetector {
  return {
    async load() {},
    async infer(frame: ImageData): Promise<Detection[]> {
      const { width: w, height: h } = frame;
      const inset = Math.round(Math.min(w, h) * 0.12);
      const bbox: [number, number, number, number] = [inset, inset, w - inset, h - inset];
      return [{ bbox, confidence: 0.99, classId: 0 }];
    },
    async dispose() {},
  };
}

/** Deterministic 512-D embedding (matches former stub enrollment). */
export function createE2eEnrollmentEmbedder(): FaceEmbedder {
  return {
    async load() {},
    async infer(_: Float32Array) {
      void _;
      const out = new Float32Array(512);
      out.fill(E2E_EMBEDDING_UNIT);
      return out;
    },
    async dispose() {},
  };
}

/**
 * Synthetic camera: no `getUserMedia`; `getFrame()` returns solid grey `ImageData`.
 * RAF loop drives `onFrame` subscribers like a real camera.
 */
export function createE2eEnrollmentCamera(frameWidth: number, frameHeight: number): Camera {
  let running = false;
  const frameListeners = new Set<FrameCallback>();
  let rafId: number | null = null;

  const loop = () => {
    if (!running) return;
    const t = typeof performance !== 'undefined' ? performance.now() : Date.now();
    for (const cb of frameListeners) cb(t);
    rafId = requestAnimationFrame(loop);
  };

  return {
    isRunning(): boolean {
      return running;
    },
    onFrame(cb: FrameCallback): Unsubscribe {
      frameListeners.add(cb);
      return () => {
        frameListeners.delete(cb);
      };
    },
    onError(_: ErrorCallback): Unsubscribe {
      void _;
      return () => {};
    },
    async start(): Promise<void> {
      if (running) return;
      running = true;
      rafId = requestAnimationFrame(loop);
    },
    stop(): void {
      running = false;
      if (rafId !== null) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    },
    getFrame(): ImageData {
      if (!running) throw makeCameraError('camera-stopped', 'Camera is stopped.', undefined);
      return greyImageData(frameWidth, frameHeight);
    },
  };
}

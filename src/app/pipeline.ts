import type { Camera } from './camera';
import { drawBbox } from './bbox-overlay';
import type { YoloDetector } from '../infra/detector-core';

export type DetectionPipelineOptions = {
  camera: Camera;
  detector: YoloDetector;
  overlayCtx: CanvasRenderingContext2D;
  overlayWidth: number;
  overlayHeight: number;
};

/**
 * Runs YOLO on each camera frame (single-flight) and draws boxes on the overlay canvas.
 */
export function createDetectionPipeline(opts: DetectionPipelineOptions): () => void {
  let busy = false;
  const unsub = opts.camera.onFrame(() => {
    if (!opts.camera.isRunning() || busy) return;
    busy = true;
    void (async () => {
      try {
        const frame = opts.camera.getFrame();
        const dets = await opts.detector.infer(frame);
        opts.overlayCtx.clearRect(0, 0, opts.overlayWidth, opts.overlayHeight);
        for (const d of dets) {
          drawBbox(opts.overlayCtx, d.bbox, '#22c55e', `${Math.round(d.confidence * 100)}%`);
        }
      } catch (e) {
        console.warn('[detection-pipeline] frame error', e);
      } finally {
        busy = false;
      }
    })();
  });

  return () => {
    unsub();
    opts.overlayCtx.clearRect(0, 0, opts.overlayWidth, opts.overlayHeight);
  };
}

import type { Camera } from './camera';
import { drawBbox } from './bbox-overlay';
import { squareCropWithMargin, resizeTo112, type Bbox } from './crop';
import { l2normalize } from './match';
import type { YoloDetector } from '../infra/detector-core';
import { toEmbedderTensor } from '../infra/embedder-preprocess';
import type { FaceEmbedder } from '../infra/embedder-ort';

export type DetectionPipelineOptions = {
  camera: Camera;
  detector: YoloDetector;
  overlayCtx: CanvasRenderingContext2D;
  overlayWidth: number;
  overlayHeight: number;
  faceEmbedder?: FaceEmbedder;
  logEmbeddingTimings?: boolean;
};

/**
 * Crop → 112² → InsightFace preprocess → ORT → L2-normalized 512-d.
 */
export async function embedFace(
  frame: ImageData,
  bbox: Bbox,
  embedder: FaceEmbedder,
): Promise<Float32Array> {
  const crop = squareCropWithMargin(frame, bbox);
  const small = resizeTo112(crop);
  const tensor = toEmbedderTensor(small);
  const raw = await embedder.infer(tensor);
  return l2normalize(raw);
}

/**
 * Runs YOLO on each camera frame (single-flight) and draws boxes on the overlay canvas.
 * When `faceEmbedder` is set and exactly one face is detected, computes a live embedding (E4).
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
        if (opts.faceEmbedder && dets.length === 1) {
          const t0 = performance.now();
          const emb = await embedFace(frame, dets[0]!.bbox, opts.faceEmbedder);
          const ms = performance.now() - t0;
          if (opts.logEmbeddingTimings) {
            console.info(`[gate] embed: ${ms.toFixed(1)} ms, len: ${emb.length}`);
          }
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

import type { Camera } from './camera';
import type { CooldownGate } from './cooldown';
import {
  drawDetections,
  embedFace,
  handleDetectionCardinality,
  isCoolingDown,
  setStatus,
} from './detection-pipeline-internals';
import type { Decision } from '../domain/types';
import type { YoloDetector } from '../infra/detector-core';
import type { FaceEmbedder } from '../infra/embedder-ort';

export { embedFace } from './detection-pipeline-internals';

export type DetectionPipelineOptions = {
  camera: Camera;
  detector: YoloDetector;
  overlayCtx: CanvasRenderingContext2D;
  overlayWidth: number;
  overlayHeight: number;
  faceEmbedder?: FaceEmbedder;
  logEmbeddingTimings?: boolean;
  statusEl?: HTMLElement;
  noFaceMessage?: string;
  multiFaceMessage?: string;
  cooldown?: CooldownGate;
  getNowMs?: () => number;
  evaluateDecision?: (input: { embedding: Float32Array; frame: ImageData }) => Decision | null;
};

/**
 * Runs YOLO on each camera frame (single-flight) and draws boxes on the overlay canvas.
 * When `faceEmbedder` is set and exactly one face is detected, computes a live embedding (E4).
 */
export function createDetectionPipeline(opts: DetectionPipelineOptions): () => void {
  const getNowMs = opts.getNowMs ?? (() => performance.now());
  let busy = false;
  const unsub = opts.camera.onFrame(() => {
    if (!opts.camera.isRunning() || busy) return;
    busy = true;
    void (async () => {
      try {
        const frame = opts.camera.getFrame();
        const dets = await opts.detector.infer(frame);
        opts.overlayCtx.clearRect(0, 0, opts.overlayWidth, opts.overlayHeight);
        drawDetections(opts.overlayCtx, dets);
        if (handleDetectionCardinality(opts, dets.length) === 'skip') return;
        const now = getNowMs();
        if (isCoolingDown(opts, now)) return;
        setStatus(opts.statusEl, '');
        if (!opts.faceEmbedder) return;
        const t0 = performance.now();
        const emb = await embedFace(frame, dets[0]!.bbox, opts.faceEmbedder);
        const ms = performance.now() - t0;
        if (opts.logEmbeddingTimings) {
          console.info(`[gate] embed: ${ms.toFixed(1)} ms, len: ${emb.length}`);
        }
        if (!opts.evaluateDecision) return;
        const decision = opts.evaluateDecision({ embedding: emb, frame });
        if (decision === 'GRANTED' || decision === 'DENIED') {
          opts.cooldown?.markAttempt(getNowMs());
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

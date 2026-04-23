import type { Camera } from './camera';
import { drawBbox } from './bbox-overlay';
import { squareCropWithMargin, resizeTo112, type Bbox } from './crop';
import { l2normalize } from './match';
import type { CooldownGate } from './cooldown';
import type { Decision } from '../domain/types';
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
  statusEl?: HTMLElement;
  noFaceMessage?: string;
  multiFaceMessage?: string;
  cooldown?: CooldownGate;
  getNowMs?: () => number;
  evaluateDecision?: (input: { embedding: Float32Array; frame: ImageData }) => Decision | null;
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

function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: ReadonlyArray<{
    bbox: readonly [number, number, number, number];
    confidence: number;
  }>,
): void {
  for (const d of detections) {
    drawBbox(ctx, d.bbox, '#22c55e', `${Math.round(d.confidence * 100)}%`);
  }
}

function setStatus(el: HTMLElement | undefined, text: string): void {
  if (el) el.textContent = text;
}

function handleDetectionCardinality(
  opts: DetectionPipelineOptions,
  detCount: number,
): 'continue' | 'skip' {
  if (detCount === 0) {
    if (opts.noFaceMessage) setStatus(opts.statusEl, opts.noFaceMessage);
    return 'skip';
  }
  if (detCount > 1) {
    if (opts.multiFaceMessage) setStatus(opts.statusEl, opts.multiFaceMessage);
    return 'skip';
  }
  return 'continue';
}

function isCoolingDown(opts: DetectionPipelineOptions, nowMs: number): boolean {
  if (!opts.cooldown || opts.cooldown.tryEnter(nowMs)) return false;
  const remaining = opts.cooldown.remainingMs(nowMs);
  setStatus(opts.statusEl, `Please wait ${Math.ceil(remaining / 1000)} s`);
  return true;
}

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

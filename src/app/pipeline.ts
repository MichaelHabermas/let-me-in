import type { Camera } from './camera';
import type { CooldownGate } from './cooldown';
import {
  drawDetections,
  embedFace,
  handleDetectionCardinality,
  isCoolingDown,
  resetNoFaceDebouncer,
  setStatus,
  tickNoFaceDebounced,
  type NoFaceDebouncer,
} from './detection-pipeline-internals';
import type { Decision } from '../domain/types';
import type { EvaluateGateAccessFn } from './gate-access-evaluation';
import { policyDecisionForCooldown } from './gate-access-evaluation';
import type { YoloDetector } from '../infra/detector-core';
import type { FaceEmbedder } from '../infra/embedder-ort';

export { embedFace } from './detection-pipeline-internals';

export type AppendAccessLogFn = (payload: {
  userId: string | null;
  similarity01: number;
  decision: Decision;
  capturedFrameBlob: Blob;
}) => Promise<void>;

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
  /** Debounce before showing `noFaceMessage` when detections stay at zero (default 1000 ms). */
  noFaceDebounceMs?: number;
  evaluateDecision?: EvaluateGateAccessFn;
  /** When set, GRANTED and DENIED append a row (not UNCERTAIN). */
  appendAccessLog?: AppendAccessLogFn;
};

const DEFAULT_NO_FACE_DEBOUNCE_MS = 1000;

/**
 * Runs YOLO on each camera frame (single-flight) and draws boxes on the overlay canvas.
 * When `faceEmbedder` is set and exactly one face is detected, computes a live embedding (E4).
 */
export function createDetectionPipeline(opts: DetectionPipelineOptions): () => void {
  const getNowMs = opts.getNowMs ?? (() => performance.now());
  const noFaceDebounceMs = opts.noFaceDebounceMs ?? DEFAULT_NO_FACE_DEBOUNCE_MS;
  const noFaceState: NoFaceDebouncer = { sinceMs: null };
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

        if (dets.length === 0) {
          tickNoFaceDebounced(noFaceState, {
            statusEl: opts.statusEl,
            noFaceMessage: opts.noFaceMessage,
            getNowMs,
            debounceMs: noFaceDebounceMs,
          });
          return;
        }

        resetNoFaceDebouncer(noFaceState);
        if (dets.length === 1) setStatus(opts.statusEl, '');

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
        const raw = opts.evaluateDecision({ embedding: emb, frame });
        const evaluation = await Promise.resolve(raw);
        if (!evaluation) return;
        const cd = policyDecisionForCooldown(evaluation.policy);
        if (cd) opts.cooldown?.markAttempt(getNowMs());
        if (opts.appendAccessLog) {
          const { policy } = evaluation;
          if (policy.decision === 'GRANTED' || policy.decision === 'DENIED') {
            await opts.appendAccessLog({
              userId: policy.decision === 'GRANTED' ? policy.userId : null,
              similarity01: policy.score,
              decision: policy.decision,
              capturedFrameBlob: evaluation.capturedFrameBlob,
            });
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

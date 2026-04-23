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
import type { Camera } from './camera';
import type { YoloDetector } from '../infra/detector-core';
import type { FaceEmbedder } from '../infra/embedder-ort';

export type AppendAccessLogFn = (payload: {
  userId: string | null;
  similarity01: number;
  decision: Decision;
  capturedFrameBlob: Blob;
}) => Promise<void>;

export type FramePipelineOpts = {
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
  getNowMs: () => number;
  noFaceDebounceMs: number;
  evaluateDecision?: EvaluateGateAccessFn;
  appendAccessLog?: AppendAccessLogFn;
};

export async function runDetectionPipelineFrame(
  opts: FramePipelineOpts,
  noFaceState: NoFaceDebouncer,
): Promise<void> {
  const frame = opts.camera.getFrame();
  const dets = await opts.detector.infer(frame);
  opts.overlayCtx.clearRect(0, 0, opts.overlayWidth, opts.overlayHeight);
  drawDetections(opts.overlayCtx, dets);

  if (dets.length === 0) {
    tickNoFaceDebounced(noFaceState, {
      statusEl: opts.statusEl,
      noFaceMessage: opts.noFaceMessage,
      getNowMs: opts.getNowMs,
      debounceMs: opts.noFaceDebounceMs,
    });
    return;
  }

  resetNoFaceDebouncer(noFaceState);
  if (dets.length === 1) setStatus(opts.statusEl, '');

  if (handleDetectionCardinality(opts, dets.length) === 'skip') return;
  const now = opts.getNowMs();
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
  if (cd) opts.cooldown?.markAttempt(opts.getNowMs());
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
}

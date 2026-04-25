import type { CooldownGate } from '../cooldown';
import {
  drawDetections,
  embedFace,
  handleDetectionCardinality,
  isCoolingDown,
  resetNoFaceDebouncer,
  setStatus,
  tickNoFaceDebounced,
  type NoFaceDebouncer,
} from './internals';
import {
  recordLastAccessEvaluationMs,
  recordLastDetectorInferMs,
  recordLastEmbedInferMs,
} from '../gatekeeper-metrics';
import type { Decision } from '../../domain/types';
import type { EvaluateGateAccessFn, GateAccessEvaluation } from '../gate-access-evaluation';
import type { Camera } from '../camera';
import type { YoloDetector } from '../../infra/detector-core';
import type { FaceEmbedder } from '../../infra/embedder-ort';

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

async function evaluateAccessDecision(
  opts: FramePipelineOpts,
  emb: Float32Array,
  frame: ImageData,
): Promise<GateAccessEvaluation | null> {
  if (!opts.evaluateDecision) return null;
  const tEval0 = performance.now();
  const raw = opts.evaluateDecision({ embedding: emb, frame });
  const evaluation = await Promise.resolve(raw);
  recordLastAccessEvaluationMs(performance.now() - tEval0);
  return evaluation;
}

/** Exposed for unit tests (GRANTED/DENIED vs UNCERTAIN). */
export async function appendAccessLogIfNeeded(
  opts: FramePipelineOpts,
  evaluation: GateAccessEvaluation,
): Promise<void> {
  if (!opts.appendAccessLog) return;
  const { verdict } = evaluation;
  if (verdict.decision !== 'GRANTED' && verdict.decision !== 'DENIED') return;
  await opts.appendAccessLog({
    userId: verdict.decision === 'GRANTED' ? verdict.userId : null,
    similarity01: verdict.bestScore,
    decision: verdict.decision,
    capturedFrameBlob: evaluation.capturedFrameBlob,
  });
}

type DetectorResult = Awaited<ReturnType<YoloDetector['infer']>>;

/**
 * Embed → access eval → cooldown mark → append (async tail of the frame).
 * Cardinality + cooldown gates run synchronously in the caller so `infer` and
 * status updates stay in the same microtask ordering as before the refactor.
 */
async function runEmbeddingAccessAndAppend(
  opts: FramePipelineOpts,
  frame: ImageData,
  primary: NonNullable<DetectorResult[0]>,
): Promise<void> {
  if (!opts.faceEmbedder) return;
  const t0 = performance.now();
  const emb = await embedFace(frame, primary.bbox, opts.faceEmbedder);
  const ms = performance.now() - t0;
  recordLastEmbedInferMs(ms);
  if (opts.logEmbeddingTimings) {
    console.info(`[gate] embed: ${ms.toFixed(1)} ms, len: ${emb.length}`);
  }
  const evaluation = await evaluateAccessDecision(opts, emb, frame);
  if (!evaluation) return;
  const cd =
    evaluation.verdict.decision === 'GRANTED' || evaluation.verdict.decision === 'DENIED'
      ? evaluation.verdict.decision
      : null;
  if (cd) opts.cooldown?.markAttempt(opts.getNowMs());
  await appendAccessLogIfNeeded(opts, evaluation);
}

export async function runDetectionPipelineFrame(
  opts: FramePipelineOpts,
  noFaceState: NoFaceDebouncer,
): Promise<void> {
  const frame = opts.camera.getFrame();
  const tDet0 = performance.now();
  const dets = await opts.detector.infer(frame);
  recordLastDetectorInferMs(performance.now() - tDet0);
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
  if (dets.length === 1) {
    setStatus(opts.statusEl, '');
  }

  if (handleDetectionCardinality(opts, dets.length) === 'skip') {
    return;
  }
  const now = opts.getNowMs();
  if (isCoolingDown(opts, now)) {
    return;
  }
  setStatus(opts.statusEl, '');
  if (!opts.faceEmbedder) {
    return;
  }
  const primary = dets[0];
  if (!primary) {
    return;
  }
  await runEmbeddingAccessAndAppend(opts, frame, primary);
}

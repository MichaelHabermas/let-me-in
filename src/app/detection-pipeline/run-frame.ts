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
import type { LivenessCollector, LivenessEvidence } from '../liveness';
import type { Camera } from '../camera';
import type { YoloDetector } from '../../infra/detector-core';
import type { FaceEmbedder } from '../../infra/embedder-ort';

export type AppendAccessLogFn = (payload: {
  userId: string | null;
  similarity01: number;
  decision: Decision;
  capturedFrameBlob: Blob;
  livenessScore?: number;
  livenessDecision?: LivenessEvidence['decision'];
  livenessReason?: LivenessEvidence['reason'];
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
  livenessCollector?: LivenessCollector;
  livenessCheckingMessage?: string;
  livenessHoldStillMessage?: string;
};

async function evaluateAccessDecision(
  opts: FramePipelineOpts,
  emb: Float32Array,
  frame: ImageData,
  liveness?: LivenessEvidence,
): Promise<GateAccessEvaluation | null> {
  if (!opts.evaluateDecision) return null;
  const tEval0 = performance.now();
  const raw = opts.evaluateDecision({ embedding: emb, frame, liveness });
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
  const isPresentationRisk = verdict.reasons.includes('PRESENTATION_ATTACK_RISK');
  if (verdict.decision !== 'GRANTED' && verdict.decision !== 'DENIED' && !isPresentationRisk)
    return;
  await opts.appendAccessLog({
    userId: verdict.decision === 'GRANTED' ? verdict.userId : null,
    similarity01: verdict.bestScore,
    decision: verdict.decision,
    capturedFrameBlob: evaluation.capturedFrameBlob,
    livenessScore: evaluation.liveness?.score,
    livenessDecision: evaluation.liveness?.decision,
    livenessReason: isPresentationRisk ? 'PRESENTATION_ATTACK_RISK' : evaluation.liveness?.reason,
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
  liveness?: LivenessEvidence,
): Promise<void> {
  if (!opts.faceEmbedder) return;
  const t0 = performance.now();
  const emb = await embedFace(frame, primary.bbox, opts.faceEmbedder);
  const ms = performance.now() - t0;
  recordLastEmbedInferMs(ms);
  if (opts.logEmbeddingTimings) {
    console.info(`[gate] embed: ${ms.toFixed(1)} ms, len: ${emb.length}`);
  }
  const evaluation = await evaluateAccessDecision(opts, emb, frame, liveness);
  if (!evaluation) return;
  const cd =
    evaluation.verdict.decision === 'GRANTED' ||
    evaluation.verdict.decision === 'DENIED' ||
    evaluation.verdict.reasons.includes('PRESENTATION_ATTACK_RISK')
      ? evaluation.verdict.decision
      : null;
  if (cd) opts.cooldown?.markAttempt(opts.getNowMs());
  await appendAccessLogIfNeeded(opts, evaluation);
}

function appendLivenessOrWait(
  opts: FramePipelineOpts,
  frame: ImageData,
  primary: NonNullable<DetectorResult[0]>,
  now: number,
): LivenessEvidence | null {
  const liveness = opts.livenessCollector?.append(frame, primary.bbox, now);
  if (liveness?.decision !== 'CHECKING') return liveness ?? null;
  setStatus(
    opts.statusEl,
    liveness.sampleCount <= 1
      ? (opts.livenessCheckingMessage ?? '')
      : (opts.livenessHoldStillMessage ?? opts.livenessCheckingMessage ?? ''),
  );
  return null;
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
    opts.livenessCollector?.reset();
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
    opts.livenessCollector?.reset();
    return;
  }
  const now = opts.getNowMs();
  if (isCoolingDown(opts, now)) {
    opts.livenessCollector?.reset();
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
  const liveness = appendLivenessOrWait(opts, frame, primary, now);
  if (opts.livenessCollector && !liveness) {
    return;
  }
  await runEmbeddingAccessAndAppend(opts, frame, primary, liveness ?? undefined);
}

import type { Camera } from '../camera';
import type { CooldownGate } from '../cooldown';
import type { EvaluateGateAccessFn } from '../gate-access-evaluation';
import type { LivenessCollector } from '../liveness';
import type { YoloDetector } from '../../infra/detector-core';
import type { FaceEmbedder } from '../../infra/embedder-ort';
import {
  type AppendAccessLogFn,
  type FramePipelineOpts,
  runDetectionPipelineFrame,
} from './run-frame';

export type { AppendAccessLogFn } from './run-frame';

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
  noFaceDebounceMs?: number;
  evaluateDecision?: EvaluateGateAccessFn;
  appendAccessLog?: AppendAccessLogFn;
  livenessCollector?: LivenessCollector;
  livenessCheckingMessage?: string;
  livenessHoldStillMessage?: string;
};

const DEFAULT_NO_FACE_DEBOUNCE_MS = 1000;

/**
 * Runs YOLO on each camera frame (single-flight) and draws boxes on the overlay canvas.
 * When `faceEmbedder` is set and exactly one face is detected, computes a live embedding (E4).
 */
export function createDetectionPipeline(opts: DetectionPipelineOptions): () => void {
  const getNowMs = opts.getNowMs ?? (() => performance.now());
  const noFaceDebounceMs = opts.noFaceDebounceMs ?? DEFAULT_NO_FACE_DEBOUNCE_MS;
  const noFaceState = { sinceMs: null as number | null };
  let busy = false;

  const frameOpts: FramePipelineOpts = {
    camera: opts.camera,
    detector: opts.detector,
    overlayCtx: opts.overlayCtx,
    overlayWidth: opts.overlayWidth,
    overlayHeight: opts.overlayHeight,
    faceEmbedder: opts.faceEmbedder,
    logEmbeddingTimings: opts.logEmbeddingTimings,
    statusEl: opts.statusEl,
    noFaceMessage: opts.noFaceMessage,
    multiFaceMessage: opts.multiFaceMessage,
    cooldown: opts.cooldown,
    getNowMs,
    noFaceDebounceMs,
    evaluateDecision: opts.evaluateDecision,
    appendAccessLog: opts.appendAccessLog,
    livenessCollector: opts.livenessCollector,
    livenessCheckingMessage: opts.livenessCheckingMessage,
    livenessHoldStillMessage: opts.livenessHoldStillMessage,
  };
  const unsub = opts.camera.onFrame(() => {
    if (!opts.camera.isRunning() || busy) return;
    busy = true;
    void (async () => {
      try {
        await runDetectionPipelineFrame(frameOpts, noFaceState);
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

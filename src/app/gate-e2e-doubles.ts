/**
 * Deterministic detector/embedder for Playwright when `VITE_E2E_STUB_GATE` is set.
 * Scenario is read from `localStorage` key {@link E2E_GATE_SCENARIO_KEY} in `./e2e-gate-scenario-key` (set via `addInitScript`).
 */

import type { Detection } from '../infra/detector-core';
import type { YoloDetector } from '../infra/detector-core';
import type { FaceEmbedder } from '../infra/embedder-ort';
import type { LivenessCollector, LivenessEvidence } from './liveness';
import { EMBEDDER_DIM } from '../infra/embedder-ort';
import { E2E_GATE_SCENARIO_KEY } from './e2e-gate-scenario-key';
import { e2eSingleFaceDetections } from './e2e-single-face-detections';
import { createE2eEnrollmentEmbedder } from './enrollment/enroll-e2e-doubles';

export { E2E_GATE_SCENARIO_KEY };

export type E2eGateScenarioMode = 'granted' | 'denied' | 'multi' | 'printed' | '';

export function readE2eGateScenario(): E2eGateScenarioMode {
  try {
    const v = localStorage.getItem(E2E_GATE_SCENARIO_KEY) ?? '';
    if (v === 'granted' || v === 'denied' || v === 'multi' || v === 'printed') return v;
    return '';
  } catch {
    return '';
  }
}

function oneFaceBox(frame: ImageData): Detection[] {
  return e2eSingleFaceDetections(frame);
}

function twoFaceBoxes(frame: ImageData): Detection[] {
  const { width: w, height: h } = frame;
  const inset = Math.round(Math.min(w, h) * 0.1);
  const mid = Math.round(w / 2);
  return [
    { bbox: [inset, inset, mid - inset, h - inset], confidence: 0.95, classId: 0 },
    { bbox: [mid + inset, inset, w - inset, h - inset], confidence: 0.94, classId: 0 },
  ];
}

/** YOLO-shaped stub: `multi` scenario returns two faces; else one. */
export function createE2eGateYoloDetector(): YoloDetector {
  return {
    async load() {},
    async infer(imageData: ImageData): Promise<Detection[]> {
      const mode = readE2eGateScenario();
      if (mode === 'multi') return twoFaceBoxes(imageData);
      return oneFaceBox(imageData);
    },
    async dispose() {},
  };
}

/** Embedding that is ~orthogonal to the uniform E2E enrollment vector → low similarity → DENIED. */
function createLowMatchRawEmbedding(): Float32Array {
  const out = new Float32Array(EMBEDDER_DIM);
  out[0] = 1;
  return out;
}

/**
 * Matches stub-enrolled users when scenario is `granted` or default; weak match when `denied` / `printed`.
 */
export function createE2eGateEmbedder(): FaceEmbedder {
  const matchEmbedder = createE2eEnrollmentEmbedder();
  return {
    async load() {},
    async infer(chw: Float32Array) {
      const mode = readE2eGateScenario();
      if (mode === 'denied' || mode === 'printed') {
        void chw;
        return createLowMatchRawEmbedding();
      }
      return matchEmbedder.infer(chw);
    },
    async dispose() {
      await matchEmbedder.dispose();
    },
  };
}

function e2eLivenessEvidence(decision: 'PASS' | 'FAIL', sampleCount: number): LivenessEvidence {
  const fail = decision === 'FAIL';
  return {
    decision,
    reason: fail ? 'PRESENTATION_ATTACK_RISK' : 'LIVE_MOTION_CONFIRMED',
    score: fail ? 0.12 : 0.82,
    sampleCount,
    requiredSamples: 2,
    metrics: {
      frameDifference: fail ? 0 : 0.04,
      textureVariation: fail ? 0.04 : 0.22,
      sharpness: fail ? 0.2 : 0.8,
      glareRisk: 0,
    },
  };
}

export function createE2eLivenessCollector(): LivenessCollector {
  let sampleCount = 0;
  return {
    append() {
      sampleCount += 1;
      if (sampleCount < 2) {
        return {
          decision: 'CHECKING',
          reason: 'LIVENESS_WINDOW_FILLING',
          score: 0,
          sampleCount,
          requiredSamples: 2,
          metrics: { frameDifference: 0, textureVariation: 0, sharpness: 0, glareRisk: 0 },
        };
      }
      return e2eLivenessEvidence(
        readE2eGateScenario() === 'printed' ? 'FAIL' : 'PASS',
        sampleCount,
      );
    },
    reset() {
      sampleCount = 0;
    },
    snapshot() {
      return [];
    },
  };
}

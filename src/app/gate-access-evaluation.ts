import type { PolicyDecision } from './policy';

/** Rich access outcome passed from policy through the detection pipeline to UI and logging. */
export type GateAccessEvaluation = {
  policy: PolicyDecision;
  /** Shown on GRANTED only; UNCERTAIN/DENIED omit name per PRD E7.S1. */
  displayName: string | null;
  referenceImageBlob: Blob | null;
  capturedFrameBlob: Blob;
};

export type GateAccessEvaluationInput = {
  embedding: Float32Array;
  frame: ImageData;
};

export type MaybePromise<T> = T | Promise<T>;

export type EvaluateGateAccessFn = (
  input: GateAccessEvaluationInput,
) => MaybePromise<GateAccessEvaluation | null>;

export function policyDecisionForCooldown(policy: PolicyDecision): 'GRANTED' | 'DENIED' | null {
  if (policy.decision === 'GRANTED' || policy.decision === 'DENIED') return policy.decision;
  return null;
}

/** Encode live frame as PNG for access log and side-by-side. */
export async function imageDataToPngBlob(frame: ImageData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  canvas.width = frame.width;
  canvas.height = frame.height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('2d context unavailable');
  ctx.putImageData(frame, 0, 0);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('canvas.toBlob returned null'));
    }, 'image/png');
  });
}

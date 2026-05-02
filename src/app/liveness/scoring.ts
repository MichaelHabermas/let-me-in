import type {
  FaceBbox,
  LivenessConfig,
  LivenessEvidence,
  LivenessMetrics,
  LivenessReason,
  LivenessSample,
} from './types';

const SIGNATURE_SIZE = 16;
const SIGNATURE_CELLS = SIGNATURE_SIZE * SIGNATURE_SIZE;
const EMPTY_METRICS: LivenessMetrics = {
  frameDifference: 0,
  textureVariation: 0,
  sharpness: 0,
  glareRisk: 0,
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function bboxEdges(
  bbox: FaceBbox,
  frame: ImageData,
): { x1: number; y1: number; x2: number; y2: number } {
  const x1 = Math.max(0, Math.min(frame.width - 1, Math.floor(bbox[0])));
  const y1 = Math.max(0, Math.min(frame.height - 1, Math.floor(bbox[1])));
  const x2 = Math.max(x1 + 1, Math.min(frame.width, Math.ceil(bbox[2])));
  const y2 = Math.max(y1 + 1, Math.min(frame.height, Math.ceil(bbox[3])));
  return { x1, y1, x2, y2 };
}

function lumaAt(frame: ImageData, x: number, y: number): number {
  const ix = (y * frame.width + x) * 4;
  const r = frame.data[ix] ?? 0;
  const g = frame.data[ix + 1] ?? 0;
  const b = frame.data[ix + 2] ?? 0;
  return (r * 0.299 + g * 0.587 + b * 0.114) / 255;
}

export function createLivenessSample(
  frame: ImageData,
  bbox: FaceBbox,
  timestampMs: number,
): LivenessSample {
  const { x1, y1, x2, y2 } = bboxEdges(bbox, frame);
  const w = x2 - x1;
  const h = y2 - y1;
  const signature = new Float32Array(SIGNATURE_CELLS);
  let sum = 0;
  let glare = 0;
  let edge = 0;

  for (let gy = 0; gy < SIGNATURE_SIZE; gy += 1) {
    for (let gx = 0; gx < SIGNATURE_SIZE; gx += 1) {
      const px = Math.min(x2 - 1, x1 + Math.floor(((gx + 0.5) / SIGNATURE_SIZE) * w));
      const py = Math.min(y2 - 1, y1 + Math.floor(((gy + 0.5) / SIGNATURE_SIZE) * h));
      const luma = lumaAt(frame, px, py);
      const idx = gy * SIGNATURE_SIZE + gx;
      signature[idx] = luma;
      sum += luma;
      if (luma > 0.92) glare += 1;
      if (gx > 0) edge += Math.abs(luma - (signature[idx - 1] ?? 0));
      if (gy > 0) edge += Math.abs(luma - (signature[idx - SIGNATURE_SIZE] ?? 0));
    }
  }

  const mean = sum / SIGNATURE_CELLS;
  let variance = 0;
  for (const value of signature) {
    variance += (value - mean) ** 2;
  }
  variance /= SIGNATURE_CELLS;

  return {
    timestampMs,
    bbox,
    signature,
    textureVariation: clamp01(Math.sqrt(variance) * 3.2),
    sharpness: clamp01(edge / (SIGNATURE_CELLS * 0.22)),
    glareRisk: glare / SIGNATURE_CELLS,
  };
}

function averageFrameDifference(samples: LivenessSample[]): number {
  if (samples.length < 2) return 0;
  let sum = 0;
  let pairs = 0;
  for (let i = 1; i < samples.length; i += 1) {
    const prev = samples[i - 1];
    const current = samples[i];
    if (!prev || !current) continue;
    const a = prev.signature;
    const b = current.signature;
    let diff = 0;
    for (let j = 0; j < SIGNATURE_CELLS; j += 1) {
      diff += Math.abs((a[j] ?? 0) - (b[j] ?? 0));
    }
    sum += diff / SIGNATURE_CELLS;
    pairs += 1;
  }
  return clamp01(sum / pairs);
}

function average(samples: LivenessSample[], pick: (sample: LivenessSample) => number): number {
  if (samples.length === 0) return 0;
  return samples.reduce((sum, sample) => sum + pick(sample), 0) / samples.length;
}

function reasonForFail(metrics: LivenessMetrics, config: LivenessConfig): LivenessReason {
  if (metrics.glareRisk > config.maxGlareRisk) return 'EXCESS_GLARE';
  if (metrics.textureVariation < config.minTextureVariation) return 'LOW_TEXTURE_VARIATION';
  if (metrics.frameDifference < config.minFrameDifference) return 'LOW_FRAME_DIFFERENCE';
  if (metrics.sharpness < 1 - config.maxBlurRisk) return 'BLUR_TOO_HIGH';
  return 'PRESENTATION_ATTACK_RISK';
}

export function scoreLivenessSamples(
  samples: LivenessSample[],
  config: LivenessConfig,
): LivenessEvidence {
  if (samples.length < config.minSamples) {
    return {
      decision: 'CHECKING',
      reason: 'LIVENESS_WINDOW_FILLING',
      score: 0,
      sampleCount: samples.length,
      requiredSamples: config.minSamples,
      metrics: EMPTY_METRICS,
    };
  }

  const metrics: LivenessMetrics = {
    frameDifference: averageFrameDifference(samples),
    textureVariation: average(samples, (s) => s.textureVariation),
    sharpness: average(samples, (s) => s.sharpness),
    glareRisk: average(samples, (s) => s.glareRisk),
  };
  const motionScore = clamp01(
    metrics.frameDifference / Math.max(config.minFrameDifference * 2.5, 0.001),
  );
  const textureScore = clamp01(
    metrics.textureVariation / Math.max(config.minTextureVariation * 1.5, 0.001),
  );
  const sharpnessScore = clamp01(metrics.sharpness / Math.max(1 - config.maxBlurRisk, 0.001));
  const glareScore = clamp01(1 - metrics.glareRisk / Math.max(config.maxGlareRisk, 0.001));
  const score = clamp01(
    motionScore * 0.42 + textureScore * 0.33 + sharpnessScore * 0.15 + glareScore * 0.1,
  );
  const failed =
    score < config.failScore ||
    metrics.frameDifference < config.minFrameDifference ||
    metrics.textureVariation < config.minTextureVariation ||
    metrics.glareRisk > config.maxGlareRisk;

  return {
    decision: failed || score < config.passScore ? 'FAIL' : 'PASS',
    reason:
      failed || score < config.passScore ? reasonForFail(metrics, config) : 'LIVE_MOTION_CONFIRMED',
    score,
    sampleCount: samples.length,
    requiredSamples: config.minSamples,
    metrics,
  };
}

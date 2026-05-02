export type LivenessDecision = 'CHECKING' | 'PASS' | 'FAIL';

export type LivenessReason =
  | 'LIVENESS_WINDOW_FILLING'
  | 'LIVE_MOTION_CONFIRMED'
  | 'PRESENTATION_ATTACK_RISK'
  | 'LOW_TEXTURE_VARIATION'
  | 'LOW_FRAME_DIFFERENCE'
  | 'EXCESS_GLARE'
  | 'BLUR_TOO_HIGH';

export type LivenessMetrics = {
  frameDifference: number;
  textureVariation: number;
  sharpness: number;
  glareRisk: number;
};

export type LivenessEvidence = {
  decision: LivenessDecision;
  reason: LivenessReason;
  score: number;
  sampleCount: number;
  requiredSamples: number;
  metrics: LivenessMetrics;
};

export type LivenessConfig = {
  windowSize: number;
  minSamples: number;
  staleFrameMs: number;
  maxBboxJumpRatio: number;
  passScore: number;
  failScore: number;
  minFrameDifference: number;
  minTextureVariation: number;
  maxGlareRisk: number;
  maxBlurRisk: number;
};

export type FaceBbox = readonly [number, number, number, number];

export type LivenessSample = {
  timestampMs: number;
  bbox: FaceBbox;
  signature: Float32Array;
  textureVariation: number;
  sharpness: number;
  glareRisk: number;
};

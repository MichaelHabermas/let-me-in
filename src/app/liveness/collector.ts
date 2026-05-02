import { createLivenessSample, scoreLivenessSamples } from './scoring';
import type { FaceBbox, LivenessConfig, LivenessEvidence, LivenessSample } from './types';

function centerOf(bbox: FaceBbox): { x: number; y: number; size: number } {
  const width = Math.max(1, bbox[2] - bbox[0]);
  const height = Math.max(1, bbox[3] - bbox[1]);
  return {
    x: bbox[0] + width / 2,
    y: bbox[1] + height / 2,
    size: Math.max(width, height),
  };
}

function bboxJumpRatio(a: FaceBbox, b: FaceBbox): number {
  const ca = centerOf(a);
  const cb = centerOf(b);
  const distance = Math.hypot(ca.x - cb.x, ca.y - cb.y);
  return distance / Math.max(ca.size, cb.size, 1);
}

export type LivenessCollector = {
  append(frame: ImageData, bbox: FaceBbox, timestampMs: number): LivenessEvidence;
  reset(): void;
  snapshot(): readonly LivenessSample[];
};

export function createLivenessCollector(config: LivenessConfig): LivenessCollector {
  const samples: LivenessSample[] = [];

  function reset(): void {
    samples.length = 0;
  }

  return {
    append(frame, bbox, timestampMs) {
      const last = samples.at(-1);
      if (last) {
        if (timestampMs - last.timestampMs > config.staleFrameMs) reset();
        else if (bboxJumpRatio(last.bbox, bbox) > config.maxBboxJumpRatio) reset();
      }
      samples.push(createLivenessSample(frame, bbox, timestampMs));
      while (samples.length > config.windowSize) samples.shift();
      return scoreLivenessSamples(samples, config);
    },
    reset,
    snapshot() {
      return [...samples];
    },
  };
}

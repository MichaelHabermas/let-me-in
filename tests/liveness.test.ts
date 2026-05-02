import { describe, expect, it } from 'vitest';

import {
  DEFAULT_LIVENESS_CONFIG,
  createLivenessConfig,
} from '../src/config';
import { createLivenessCollector, type LivenessReason } from '../src/app/liveness';
import { patternedFaceImageData } from './support/synthetic-image-data';

const bbox = [0, 0, 64, 64] as const;

type SyntheticMode = Parameters<typeof patternedFaceImageData>[3];

function collect(mode: SyntheticMode) {
  const config = createLivenessConfig({ minSamples: 5, windowSize: 7 });
  const collector = createLivenessCollector(config);
  let evidence = collector.append(patternedFaceImageData(64, 64, 0, mode), bbox, 0);
  for (let i = 1; i < 5; i += 1) {
    evidence = collector.append(patternedFaceImageData(64, 64, i, mode), bbox, i * 80);
  }
  return evidence;
}

describe('passive liveness', () => {
  it('uses deterministic defaults and exhaustive reason codes', () => {
    expect(DEFAULT_LIVENESS_CONFIG.windowSize).toBeGreaterThanOrEqual(5);
    expect(DEFAULT_LIVENESS_CONFIG.windowSize).toBeLessThanOrEqual(15);
    const reasons: Record<LivenessReason, true> = {
      LIVENESS_WINDOW_FILLING: true,
      LIVE_MOTION_CONFIRMED: true,
      PRESENTATION_ATTACK_RISK: true,
      LOW_TEXTURE_VARIATION: true,
      LOW_FRAME_DIFFERENCE: true,
      EXCESS_GLARE: true,
      BLUR_TOO_HIGH: true,
    };
    expect(Object.keys(reasons)).toHaveLength(7);
  });

  it('tracks append, reset, stale-frame expiry, and bbox-jump reset', () => {
    const collector = createLivenessCollector(createLivenessConfig({ minSamples: 3, staleFrameMs: 100 }));
    expect(collector.append(patternedFaceImageData(64, 64, 0, 'live-like'), bbox, 0).decision).toBe(
      'CHECKING',
    );
    expect(collector.snapshot()).toHaveLength(1);
    collector.reset();
    expect(collector.snapshot()).toHaveLength(0);
    collector.append(patternedFaceImageData(64, 64, 0, 'live-like'), bbox, 0);
    collector.append(patternedFaceImageData(64, 64, 1, 'live-like'), bbox, 200);
    expect(collector.snapshot()).toHaveLength(1);
    collector.append(patternedFaceImageData(64, 64, 2, 'live-like'), [40, 0, 104, 64], 240);
    expect(collector.snapshot()).toHaveLength(1);
  });

  it('scores flat sequences lower than live-like micro-motion', () => {
    const flat = collect('flat');
    const live = collect('live-like');
    expect(flat.decision).toBe('FAIL');
    expect(live.decision).toBe('PASS');
    expect(live.score).toBeGreaterThan(flat.score);
  });

  it('does not let noisy camera-like jitter pass by itself', () => {
    const jitter = collect('jittered-flat');
    expect(jitter.decision).toBe('FAIL');
    expect(jitter.reason).toBe('LOW_TEXTURE_VARIATION');
  });

  it('keeps glare as a specific failure mode', () => {
    const glare = collect('glare');
    expect(glare.decision).toBe('FAIL');
    expect(glare.reason).toBe('EXCESS_GLARE');
  });

  it('returns checking evidence until the minimum sample count exists', () => {
    const collector = createLivenessCollector(createLivenessConfig({ minSamples: 3 }));
    const evidence = collector.append(patternedFaceImageData(64, 64, 0, 'live-like'), bbox, 0);
    expect(evidence).toMatchObject({
      decision: 'CHECKING',
      reason: 'LIVENESS_WINDOW_FILLING',
      sampleCount: 1,
      requiredSamples: 3,
    });
  });
});

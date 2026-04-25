import { describe, expect, it } from 'vitest';

import type { AccessThresholds } from '../src/domain/access-policy';
import {
  buildCalibrationExplainability,
  projectCalibrationMismatchCounts,
} from '../src/domain/threshold-calibration-explain';

describe('threshold-calibration-explain', () => {
  const loose: AccessThresholds = { strong: 0.7, weak: 0.5, unknown: 0.5, margin: 0.02 };
  const strict: AccessThresholds = { strong: 0.92, weak: 0.75, unknown: 0.75, margin: 0.08 };

  it('counts false grant/deny under decideFromMatch replay', () => {
    const grantedScores = [0.5, 0.95, 0.8];
    const deniedScores = [0.2, 0.85, 0.6];
    const c = projectCalibrationMismatchCounts(grantedScores, deniedScores, loose);
    expect(c.falseGrant).toBe(1);
    expect(c.falseDeny).toBe(1);
  });

  it('buildCalibrationExplainability includes anchors and deltas', () => {
    const previous: AccessThresholds = { strong: 0.9, weak: 0.65, unknown: 0.65, margin: 0.05 };
    const next: AccessThresholds = { strong: 0.88, weak: 0.64, unknown: 0.64, margin: 0.05 };
    const ex = buildCalibrationExplainability({
      grantedScores: [0.91, 0.92, 0.93],
      deniedScores: [0.5, 0.55, 0.6],
      previous,
      next,
    });
    expect(ex.deniedP95).toBeGreaterThanOrEqual(0.5);
    expect(ex.grantedP10).toBeLessThanOrEqual(0.93);
    expect(ex.deltaStrong).toBeCloseTo(-0.02, 4);
    expect(ex.projectedFalseGrantBefore).toBe(
      projectCalibrationMismatchCounts([0.91, 0.92, 0.93], [0.5, 0.55, 0.6], previous).falseGrant,
    );
    expect(ex.projectedFalseGrantAfter).toBe(
      projectCalibrationMismatchCounts([0.91, 0.92, 0.93], [0.5, 0.55, 0.6], next).falseGrant,
    );
  });

  it('uses previous thresholds for after when next is null', () => {
    const previous = strict;
    const ex = buildCalibrationExplainability({
      grantedScores: [0.9],
      deniedScores: [0.4],
      previous,
      next: null,
    });
    expect(ex.deltaStrong).toBe(0);
    expect(ex.projectedFalseGrantAfter).toBe(ex.projectedFalseGrantBefore);
  });
});

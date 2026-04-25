import { describe, expect, it } from 'vitest';

import {
  applyReviewDecision,
  collectCalibrationSamples,
  isReviewCandidate,
} from '../src/domain/access-log-review';
import type { AccessLogRow } from '../src/domain/types';

function buildRow(partial: Partial<AccessLogRow>): AccessLogRow {
  return {
    timestamp: partial.timestamp ?? 1,
    userId: partial.userId ?? null,
    similarity01: partial.similarity01 ?? 0.5,
    decision: partial.decision ?? 'DENIED',
    capturedFrameBlob: partial.capturedFrameBlob ?? new Blob(),
    reviewedDecision: partial.reviewedDecision,
    reviewedAt: partial.reviewedAt,
    reviewedBy: partial.reviewedBy,
  };
}

describe('access-log-review domain helpers', () => {
  it('flags unreviewed UNCERTAIN and high-similarity DENIED rows as review candidates', () => {
    expect(isReviewCandidate(buildRow({ decision: 'UNCERTAIN', similarity01: 0.4 }))).toBe(true);
    expect(isReviewCandidate(buildRow({ decision: 'DENIED', similarity01: 0.78 }))).toBe(true);
    expect(isReviewCandidate(buildRow({ decision: 'DENIED', similarity01: 0.5 }))).toBe(false);
    expect(
      isReviewCandidate(
        buildRow({ decision: 'DENIED', similarity01: 0.9, reviewedDecision: 'DENIED' }),
      ),
    ).toBe(false);
  });

  it('applies reviewed decision metadata immutably', () => {
    const row = buildRow({ timestamp: 42, decision: 'UNCERTAIN' });
    const reviewed = applyReviewDecision(row, 'GRANTED', 999, 'admin');
    expect(reviewed).toMatchObject({
      timestamp: 42,
      reviewedDecision: 'GRANTED',
      reviewedAt: 999,
      reviewedBy: 'admin',
    });
    expect(row.reviewedDecision).toBeUndefined();
  });

  it('collects calibration samples with reviewed labels taking precedence', () => {
    const logs: AccessLogRow[] = [
      buildRow({ decision: 'GRANTED', similarity01: 0.92 }),
      buildRow({ decision: 'DENIED', similarity01: 0.56 }),
      buildRow({
        decision: 'DENIED',
        similarity01: 0.71,
        reviewedDecision: 'GRANTED',
      }),
      buildRow({
        decision: 'GRANTED',
        similarity01: 0.68,
        reviewedDecision: 'DENIED',
      }),
      buildRow({ decision: 'UNCERTAIN', similarity01: 0.65 }),
    ];

    expect(collectCalibrationSamples(logs)).toEqual({
      grantedScores: [0.92, 0.71],
      deniedScores: [0.56, 0.68],
      reviewedUsed: 2,
      rawUsed: 2,
    });
  });
});

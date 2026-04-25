import type { AccessLogRow, ReviewedDecision } from './types';

export type ReviewCandidateOptions = {
  minDeniedSimilarity01: number;
};

export type CalibrationSamples = {
  grantedScores: number[];
  deniedScores: number[];
  reviewedUsed: number;
  rawUsed: number;
};

export const DEFAULT_REVIEW_CANDIDATE_OPTIONS: ReviewCandidateOptions = {
  minDeniedSimilarity01: 0.7,
};

export function isReviewCandidate(
  row: AccessLogRow,
  options: ReviewCandidateOptions = DEFAULT_REVIEW_CANDIDATE_OPTIONS,
): boolean {
  if (row.reviewedDecision) return false;
  if (row.decision === 'UNCERTAIN') return true;
  return row.decision === 'DENIED' && row.similarity01 >= options.minDeniedSimilarity01;
}

export function applyReviewDecision(
  row: AccessLogRow,
  reviewedDecision: ReviewedDecision,
  reviewedAt: number,
  reviewedBy?: string | null,
): AccessLogRow {
  return {
    ...row,
    reviewedDecision,
    reviewedAt,
    reviewedBy: reviewedBy ?? null,
  };
}

export function collectCalibrationSamples(logs: AccessLogRow[]): CalibrationSamples {
  const grantedScores: number[] = [];
  const deniedScores: number[] = [];
  let reviewedUsed = 0;
  let rawUsed = 0;

  for (const row of logs) {
    if (row.reviewedDecision === 'GRANTED') {
      grantedScores.push(row.similarity01);
      reviewedUsed += 1;
      continue;
    }
    if (row.reviewedDecision === 'DENIED') {
      deniedScores.push(row.similarity01);
      reviewedUsed += 1;
      continue;
    }
    if (row.decision === 'GRANTED') {
      grantedScores.push(row.similarity01);
      rawUsed += 1;
      continue;
    }
    if (row.decision === 'DENIED') {
      deniedScores.push(row.similarity01);
      rawUsed += 1;
    }
  }

  return { grantedScores, deniedScores, reviewedUsed, rawUsed };
}

import { DEFAULT_REVIEW_CANDIDATE_OPTIONS } from '../domain/access-log-review';
import type { AccessLogRow, DexiePersistence, ReviewedDecision } from '../infra/persistence';

export type AccessLogReviewService = {
  listCandidates(limit?: number): Promise<AccessLogRow[]>;
  setReviewedDecision(payload: {
    timestamp: number;
    reviewedDecision: ReviewedDecision;
    reviewedBy?: string | null;
  }): Promise<void>;
};

export function createAccessLogReviewService(
  persistence: DexiePersistence,
): AccessLogReviewService {
  return {
    async listCandidates(limit?: number): Promise<AccessLogRow[]> {
      return persistence.accessLogRepo.listReviewCandidates({
        limit,
        minDeniedSimilarity01: DEFAULT_REVIEW_CANDIDATE_OPTIONS.minDeniedSimilarity01,
      });
    },
    async setReviewedDecision(payload: {
      timestamp: number;
      reviewedDecision: ReviewedDecision;
      reviewedBy?: string | null;
    }): Promise<void> {
      await persistence.accessLogRepo.setReviewDecision({
        timestamp: payload.timestamp,
        reviewedDecision: payload.reviewedDecision,
        reviewedAt: Date.now(),
        reviewedBy: payload.reviewedBy,
      });
    },
  };
}

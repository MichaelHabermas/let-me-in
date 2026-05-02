import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { AccessDecisionDataStores } from '../infra/persistence';
import type { GateAccessEvaluation, GateAccessEvaluationInput } from './gate-access-evaluation';
import { imageDataToPngBlob } from './gate-access-evaluation';
import { matchOne, type EnrolledEmbedding } from '../domain/embedding-match';
import { evaluateGateAccessMatch } from '../domain/gate-decision';
import type { AccessDecisionContext } from './access-decision-context';

export type LiveAccessDecisionUi = {
  onDecision(evaluation: GateAccessEvaluation): void;
};

/**
 * Deep module: loads enrolled users + thresholds, ranks the embedding, applies policy,
 * and assembles the rich evaluation payload for UI + logging.
 */
export async function createAccessDecisionEvaluator(
  dataStores: AccessDecisionDataStores,
  seedFallback: DatabaseSeedSettings,
  ui?: LiveAccessDecisionUi,
  context?: AccessDecisionContext,
): Promise<(input: GateAccessEvaluationInput) => Promise<GateAccessEvaluation | null>> {
  return async (input) => {
    const snapshot = context?.getSnapshot();
    const users = snapshot?.users ?? (await dataStores.usersRepo.toArray());
    const thresholds = snapshot?.thresholds ?? { ...seedFallback.thresholds };
    if (users.length === 0) return null;

    const enrolled: EnrolledEmbedding[] =
      snapshot?.enrolled ??
      users.map((u) => ({
        userId: u.id,
        embedding: u.embedding,
      }));
    const usersById = snapshot?.usersById ?? new Map(users.map((u) => [u.id, u]));

    const ranked = matchOne(input.embedding, enrolled);
    const policy = evaluateGateAccessMatch({
      match: {
        best: ranked.best,
        runnerUp: ranked.runnerUp,
      },
      thresholds,
      liveness: input.liveness,
    });

    const capturedFrameBlob = await imageDataToPngBlob(input.frame);
    const user = policy.userId != null ? usersById.get(policy.userId) : undefined;
    const evaluation: GateAccessEvaluation = {
      verdict: policy,
      displayName: policy.decision === 'GRANTED' ? (user?.name ?? null) : null,
      referenceImageBlob: policy.decision === 'DENIED' ? null : (user?.referenceImageBlob ?? null),
      capturedFrameBlob,
      bandThresholds: { strong: thresholds.strong, weak: thresholds.weak },
      liveness: input.liveness,
    };
    ui?.onDecision(evaluation);
    return evaluation;
  };
}

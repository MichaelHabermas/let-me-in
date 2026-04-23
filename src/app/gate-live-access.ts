import type { AccessThresholds } from '../domain/access-policy';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { User } from '../domain/types';
import type { DexiePersistence } from '../infra/persistence';
import type { GateAccessEvaluation, GateAccessEvaluationInput } from './gate-access-evaluation';
import { imageDataToPngBlob } from './gate-access-evaluation';
import { matchOne, type EnrolledEmbedding } from './match';
import { decide, type PolicyDecision } from './policy';

export type LiveAccessDecisionUi = {
  onDecision(evaluation: GateAccessEvaluation): void;
};

function referenceForPolicy(usersById: Map<string, User>, policy: PolicyDecision): Blob | null {
  if (policy.decision === 'DENIED') return null;
  return usersById.get(policy.userId)?.referenceImageBlob ?? null;
}

function displayNameForPolicy(usersById: Map<string, User>, policy: PolicyDecision): string | null {
  if (policy.decision !== 'GRANTED') return null;
  return usersById.get(policy.userId)?.name ?? null;
}

/**
 * Loads enrolled users + policy thresholds from IndexedDB, then returns an evaluator
 * for the detection pipeline. Call after `initDatabase` (e.g. from bootstrap).
 */
export async function loadLiveAccessDecisionFn(
  persistence: DexiePersistence,
  seedFallback: DatabaseSeedSettings,
  ui?: LiveAccessDecisionUi,
): Promise<(input: GateAccessEvaluationInput) => Promise<GateAccessEvaluation | null>> {
  const [users, thrRow] = await Promise.all([
    persistence.usersRepo.toArray(),
    persistence.settingsRepo.get('thresholds'),
  ]);

  const thresholds: AccessThresholds =
    thrRow?.value != null && typeof thrRow.value === 'object'
      ? (thrRow.value as AccessThresholds)
      : { ...seedFallback.thresholds };

  const enrolled: EnrolledEmbedding[] = users.map((u) => ({
    userId: u.id,
    embedding: u.embedding,
  }));

  const usersById = new Map(users.map((u) => [u.id, u]));

  return async (input) => {
    if (enrolled.length === 0) return null;
    const ranked = matchOne(input.embedding, enrolled);
    const policy: PolicyDecision = decide({
      best: ranked.best,
      runnerUp: ranked.runnerUp,
      thresholds,
    });

    const capturedFrameBlob = await imageDataToPngBlob(input.frame);
    const evaluation: GateAccessEvaluation = {
      policy,
      displayName: displayNameForPolicy(usersById, policy),
      referenceImageBlob: referenceForPolicy(usersById, policy),
      capturedFrameBlob,
    };
    ui?.onDecision(evaluation);
    return evaluation;
  };
}

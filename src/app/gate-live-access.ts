import type { AccessThresholds } from '../domain/access-policy';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import { evaluateGateAccessMatch } from '../domain/gate-decision';
import type { Decision, MatchResult } from '../domain/types';
import type { DexiePersistence } from '../infra/persistence';
import { matchOne, type EnrolledEmbedding } from './match';

export type LiveAccessDecisionUi = {
  onDecision(decision: Decision): void;
};

/**
 * Loads enrolled users + policy thresholds from IndexedDB, then returns a sync evaluator
 * for the detection pipeline. Call after `initDatabase` (e.g. from bootstrap).
 */
export async function loadLiveAccessDecisionFn(
  persistence: DexiePersistence,
  seedFallback: DatabaseSeedSettings,
  ui?: LiveAccessDecisionUi,
): Promise<(input: { embedding: Float32Array; frame: ImageData }) => Decision | null> {
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

  return (input) => {
    if (enrolled.length === 0) return null;
    const ranked = matchOne(input.embedding, enrolled);
    const match: MatchResult = { best: ranked.best, runnerUp: ranked.runnerUp };
    const verdict = evaluateGateAccessMatch({ match, thresholds });
    ui?.onDecision(verdict.decision);
    return verdict.decision;
  };
}

import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { DexiePersistence } from '../infra/persistence';
import type { GateAccessEvaluation, GateAccessEvaluationInput } from './gate-access-evaluation';
import type { LiveAccessDecisionUi } from './access-decision-engine';
import { createAccessDecisionEvaluator } from './access-decision-engine';

export type { LiveAccessDecisionUi } from './access-decision-engine';

/**
 * Returns an evaluator that re-reads enrolled users and thresholds from IndexedDB on
 * every access decision (avoids stale snapshots when navigating between admin and gate).
 * Call after `initDatabase` (e.g. from bootstrap).
 */
export async function loadLiveAccessDecisionFn(
  persistence: DexiePersistence,
  seedFallback: DatabaseSeedSettings,
  ui?: LiveAccessDecisionUi,
): Promise<(input: GateAccessEvaluationInput) => Promise<GateAccessEvaluation | null>> {
  return createAccessDecisionEvaluator(persistence, seedFallback, ui);
}

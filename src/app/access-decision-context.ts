import type { AccessThresholds } from '../domain/access-policy';
import type { EnrolledEmbedding } from '../domain/embedding-match';
import type { User } from '../domain/types';
import type { AccessDecisionDataStores } from '../infra/persistence';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import { readAccessThresholdsFromSettings } from './access-thresholds-store';

export type AccessDecisionSnapshot = {
  users: Awaited<ReturnType<AccessDecisionDataStores['usersRepo']['toArray']>>;
  thresholds: AccessThresholds;
  /** Filled in `refresh` for hot-path access evaluation (avoid per-frame maps). */
  enrolled: EnrolledEmbedding[];
  usersById: Map<string, User>;
};

export type AccessDecisionContext = {
  getSnapshot(): AccessDecisionSnapshot;
  refresh(): Promise<AccessDecisionSnapshot>;
};

export async function createAccessDecisionContext(
  dataStores: AccessDecisionDataStores,
  seedFallback: DatabaseSeedSettings,
): Promise<AccessDecisionContext> {
  let snapshot: AccessDecisionSnapshot = {
    users: [],
    thresholds: { ...seedFallback.thresholds },
    enrolled: [],
    usersById: new Map(),
  };

  const refresh = async (): Promise<AccessDecisionSnapshot> => {
    const [users, thresholds] = await Promise.all([
      dataStores.usersRepo.toArray(),
      readAccessThresholdsFromSettings(dataStores.settingsRepo, seedFallback),
    ]);
    const enrolled: EnrolledEmbedding[] = users.map((u) => ({
      userId: u.id,
      embedding: u.embedding,
    }));
    const usersById = new Map(users.map((u) => [u.id, u] as const));
    snapshot = { users, thresholds, enrolled, usersById };
    return snapshot;
  };

  await refresh();
  return {
    getSnapshot() {
      return snapshot;
    },
    refresh,
  };
}

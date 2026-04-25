import type { AccessThresholds } from '../domain/access-policy';
import type { AccessDecisionDataStores } from '../infra/persistence';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import { readAccessThresholdsFromSettings } from './access-thresholds-store';

export type AccessDecisionSnapshot = {
  users: Awaited<ReturnType<AccessDecisionDataStores['usersRepo']['toArray']>>;
  thresholds: AccessThresholds;
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
  };

  const refresh = async (): Promise<AccessDecisionSnapshot> => {
    const [users, thresholds] = await Promise.all([
      dataStores.usersRepo.toArray(),
      readAccessThresholdsFromSettings(dataStores.settingsRepo, seedFallback),
    ]);
    snapshot = { users, thresholds };
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

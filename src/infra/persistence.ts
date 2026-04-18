/**
 * IndexedDB port — app imports from here, not from dexie directly.
 */

import { createDexiePersistence, type DexiePersistence } from './db-dexie';
import type { DatabaseSeedSettings } from '../domain/database-seed';

export type { BboxPixels, Decision, MatchResult, User, AccessLogRow } from '../domain/types';

export type { DatabaseSeedSettings } from '../domain/database-seed';
export type { SettingsRow } from './db-dexie';

export type { DexiePersistence } from './db-dexie';

let defaultPersistence: DexiePersistence | null = null;

/** Process-wide default DB (`gatekeeper`) — use `createDexiePersistence` in tests for isolation. */
export function getDefaultPersistence(): DexiePersistence {
  if (!defaultPersistence) {
    defaultPersistence = createDexiePersistence('gatekeeper');
  }
  return defaultPersistence;
}

/** Open default DB and ensure default settings rows exist (E1.S2.F1.T3). Idempotent per process until reset. */
export async function initDatabase(seed: DatabaseSeedSettings): Promise<void> {
  await getDefaultPersistence().initDatabase(seed);
}

/** Close default client and drop init promise — use in tests after Dexie.delete. */
export async function resetIndexedDbClientForTests(): Promise<void> {
  await getDefaultPersistence().resetIndexedDbClientForTests();
}

export { createDexiePersistence } from './db-dexie';

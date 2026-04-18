/**
 * IndexedDB port — app imports from here, not from dexie directly.
 */

import {
  createDexiePersistence,
  type DexiePersistence,
  type DatabaseSeedSettings,
} from './db-dexie';

export type { BboxPixels, Decision, MatchResult, User, AccessLogRow } from '../domain/types';

export type { DatabaseSeedSettings, SettingsRow } from './db-dexie';

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

export const usersRepo = {
  put: (...args: Parameters<DexiePersistence['usersRepo']['put']>) =>
    getDefaultPersistence().usersRepo.put(...args),
  get: (...args: Parameters<DexiePersistence['usersRepo']['get']>) =>
    getDefaultPersistence().usersRepo.get(...args),
  delete: (...args: Parameters<DexiePersistence['usersRepo']['delete']>) =>
    getDefaultPersistence().usersRepo.delete(...args),
  toArray: (...args: Parameters<DexiePersistence['usersRepo']['toArray']>) =>
    getDefaultPersistence().usersRepo.toArray(...args),
};

export const accessLogRepo = {
  put: (...args: Parameters<DexiePersistence['accessLogRepo']['put']>) =>
    getDefaultPersistence().accessLogRepo.put(...args),
  get: (...args: Parameters<DexiePersistence['accessLogRepo']['get']>) =>
    getDefaultPersistence().accessLogRepo.get(...args),
  delete: (...args: Parameters<DexiePersistence['accessLogRepo']['delete']>) =>
    getDefaultPersistence().accessLogRepo.delete(...args),
  toArray: (...args: Parameters<DexiePersistence['accessLogRepo']['toArray']>) =>
    getDefaultPersistence().accessLogRepo.toArray(...args),
  appendDecision: (...args: Parameters<DexiePersistence['accessLogRepo']['appendDecision']>) =>
    getDefaultPersistence().accessLogRepo.appendDecision(...args),
};

export const settingsRepo = {
  put: (...args: Parameters<DexiePersistence['settingsRepo']['put']>) =>
    getDefaultPersistence().settingsRepo.put(...args),
  get: (...args: Parameters<DexiePersistence['settingsRepo']['get']>) =>
    getDefaultPersistence().settingsRepo.get(...args),
  delete: (...args: Parameters<DexiePersistence['settingsRepo']['delete']>) =>
    getDefaultPersistence().settingsRepo.delete(...args),
  toArray: (...args: Parameters<DexiePersistence['settingsRepo']['toArray']>) =>
    getDefaultPersistence().settingsRepo.toArray(...args),
};

export { createDexiePersistence } from './db-dexie';

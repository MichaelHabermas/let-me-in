/**
 * IndexedDB port — app imports from here, not from dexie directly.
 */

export type { BboxPixels, Decision, MatchResult, User, AccessLogRow } from '../domain/types';

export type { DatabaseSeedSettings, SettingsRow } from './db-dexie';

export {
  accessLogRepo,
  createDexiePersistence,
  initDatabase,
  resetIndexedDbClientForTests,
  settingsRepo,
  usersRepo,
} from './db-dexie';

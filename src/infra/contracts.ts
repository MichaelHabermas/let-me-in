/**
 * Dependency-inversion surface: app and UI import from here, not from dexie/onnx directly.
 */

export type { BboxPixels, Decision, MatchResult, User, AccessLogRow } from './types';

export { accessLogRepo, initDatabase, settingsRepo, usersRepo } from './db-dexie';

export type { SettingsRow } from './db-dexie';

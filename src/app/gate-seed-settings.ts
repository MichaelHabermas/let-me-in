import type { Config } from '../config';
import { databaseSeedSettingsFromConfig } from '../domain/database-seed';
import type { DatabaseSeedSettings } from '../domain/database-seed';

export type GateSeedConfigSlice = Pick<Config, 'thresholds' | 'cooldownMs'>;

export function getDatabaseSeedSettingsFromConfig(cfg: GateSeedConfigSlice): DatabaseSeedSettings {
  return databaseSeedSettingsFromConfig(cfg);
}

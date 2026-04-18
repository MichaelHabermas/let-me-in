import type { AccessThresholds } from './access-policy';

/** Default rows written to `settings` when the store is empty (caller supplies values). */
export type DatabaseSeedSettings = {
  thresholds: AccessThresholds;
  cooldownMs: number;
};

/**
 * Canonical mapping from org config into IndexedDB seed defaults.
 * Keeps threshold shapes aligned with `AccessThresholds` / `decideFromMatch`.
 */
export function databaseSeedSettingsFromConfig(cfg: {
  thresholds: AccessThresholds;
  cooldownMs: number;
}): DatabaseSeedSettings {
  return {
    thresholds: { ...cfg.thresholds },
    cooldownMs: cfg.cooldownMs,
  };
}

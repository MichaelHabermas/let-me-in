import type { AccessThresholds } from '../domain/access-policy';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { SettingsStore } from '../infra/persistence';

/** Loads access thresholds from settings, falling back to seed defaults when absent/malformed. */
export async function readAccessThresholdsFromSettings(
  settingsRepo: SettingsStore,
  seedFallback: DatabaseSeedSettings,
): Promise<AccessThresholds> {
  const row = await settingsRepo.get('thresholds');
  if (row?.value != null && typeof row.value === 'object') {
    return { ...(row.value as AccessThresholds) };
  }
  return { ...seedFallback.thresholds };
}

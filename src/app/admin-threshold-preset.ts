import type { AccessThresholds } from '../domain/access-policy';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { DexiePersistence } from '../infra/persistence';

/** SPECS L82 “default ≥ 0.75” — course strong-line preset (E14). */
export const SPECS_COURSE_STRONG_FLOOR = 0.75 as const;

export async function readAccessThresholds(
  persistence: DexiePersistence,
  seedFallback: DatabaseSeedSettings,
): Promise<AccessThresholds> {
  const row = await persistence.settingsRepo.get('thresholds');
  if (row?.value != null && typeof row.value === 'object') {
    return { ...(row.value as AccessThresholds) };
  }
  return { ...seedFallback.thresholds };
}

/** Sets `strong` to the course default; leaves `weak`, `margin`, and `unknown` unchanged. */
export async function applySpec075StrongPreset(
  persistence: DexiePersistence,
  seedFallback: DatabaseSeedSettings,
): Promise<AccessThresholds> {
  const t = await readAccessThresholds(persistence, seedFallback);
  const next: AccessThresholds = { ...t, strong: SPECS_COURSE_STRONG_FLOOR };
  await persistence.settingsRepo.put({ key: 'thresholds', value: next });
  return next;
}

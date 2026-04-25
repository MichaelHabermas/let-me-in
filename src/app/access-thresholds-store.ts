import type { AccessThresholds } from '../domain/access-policy';
import type { DatabaseSeedSettings } from '../domain/database-seed';
import type { SettingsStore } from '../infra/persistence';

function asFiniteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeAccessThresholds(value: unknown): AccessThresholds | null {
  if (!value || typeof value !== 'object') return null;
  const row = value as Record<string, unknown>;
  const strong = asFiniteNumber(row.strong);
  const weak = asFiniteNumber(row.weak);
  const unknown = asFiniteNumber(row.unknown);
  const margin = asFiniteNumber(row.margin);
  if (strong == null || weak == null || unknown == null || margin == null) return null;
  if (weak < 0 || strong > 1 || weak > strong || margin < 0) return null;
  if (unknown < 0 || unknown > 1) return null;
  return { strong, weak, unknown, margin };
}

/** Loads access thresholds from settings, falling back to seed defaults when absent/malformed. */
export async function readAccessThresholdsFromSettings(
  settingsRepo: SettingsStore,
  seedFallback: DatabaseSeedSettings,
): Promise<AccessThresholds> {
  const row = await settingsRepo.get('thresholds');
  const normalized = normalizeAccessThresholds(row?.value);
  if (normalized) {
    return { ...normalized };
  }
  return { ...seedFallback.thresholds };
}

export function validateAccessThresholds(value: unknown): AccessThresholds {
  const normalized = normalizeAccessThresholds(value);
  if (!normalized) {
    throw new Error('Invalid access thresholds');
  }
  return normalized;
}

export async function writeAccessThresholdsToSettings(
  settingsRepo: SettingsStore,
  thresholds: unknown,
): Promise<AccessThresholds> {
  const normalized = validateAccessThresholds(thresholds);
  await settingsRepo.put({ key: 'thresholds', value: normalized });
  return { ...normalized };
}

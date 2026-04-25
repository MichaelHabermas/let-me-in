import { describe, expect, it, vi } from 'vitest';

import {
  readAccessThresholdsFromSettings,
  writeAccessThresholdsToSettings,
} from '../src/app/access-thresholds-store';
import type { SettingsStore } from '../src/infra/persistence';

describe('readAccessThresholdsFromSettings', () => {
  const seedFallback = {
    thresholds: { strong: 0.85, weak: 0.65, margin: 0.03, unknown: 0.5 },
    cooldownMs: 3000,
  };

  it('returns persisted thresholds when settings row is valid', async () => {
    const settingsRepo = {
      get: vi.fn().mockResolvedValue({
        key: 'thresholds',
        value: { strong: 0.9, weak: 0.7, margin: 0.05, unknown: 0.45 },
      }),
    } as unknown as SettingsStore;

    const thresholds = await readAccessThresholdsFromSettings(settingsRepo, seedFallback);
    expect(thresholds).toEqual({ strong: 0.9, weak: 0.7, margin: 0.05, unknown: 0.45 });
  });

  it('falls back to seed thresholds when row is missing or malformed', async () => {
    const settingsRepo = {
      get: vi
        .fn()
        .mockResolvedValueOnce(undefined)
        .mockResolvedValueOnce({ key: 'thresholds', value: 42 }),
    } as unknown as SettingsStore;

    const fromMissing = await readAccessThresholdsFromSettings(settingsRepo, seedFallback);
    const fromMalformed = await readAccessThresholdsFromSettings(settingsRepo, seedFallback);

    expect(fromMissing).toEqual(seedFallback.thresholds);
    expect(fromMalformed).toEqual(seedFallback.thresholds);
    expect(fromMissing).not.toBe(seedFallback.thresholds);
    expect(fromMalformed).not.toBe(seedFallback.thresholds);
  });

  it('rejects invalid threshold writes and persists valid rows', async () => {
    const put = vi.fn().mockResolvedValue('thresholds');
    const settingsRepo = {
      get: vi.fn(),
      put,
    } as unknown as SettingsStore;

    await expect(
      writeAccessThresholdsToSettings(settingsRepo, {
        strong: 0.6,
        weak: 0.7,
        margin: 0.05,
        unknown: 0.7,
      }),
    ).rejects.toThrow('Invalid access thresholds');
    expect(put).not.toHaveBeenCalled();

    const persisted = await writeAccessThresholdsToSettings(settingsRepo, {
      strong: 0.86,
      weak: 0.67,
      margin: 0.04,
      unknown: 0.67,
    });
    expect(persisted).toEqual({ strong: 0.86, weak: 0.67, margin: 0.04, unknown: 0.67 });
    expect(put).toHaveBeenCalledWith({
      key: 'thresholds',
      value: { strong: 0.86, weak: 0.67, margin: 0.04, unknown: 0.67 },
    });
  });
});

import type { DexiePersistence } from '../infra/persistence';

export const CONSENT_SETTINGS_KEY = 'consentAccepted';

export type ConsentAcceptedValue = { timestamp: number };

export async function readConsentAccepted(
  persistence: DexiePersistence,
): Promise<ConsentAcceptedValue | null> {
  const row = await persistence.settingsRepo.get(CONSENT_SETTINGS_KEY);
  if (!row?.value || typeof row.value !== 'object') return null;
  const v = row.value as { timestamp?: unknown };
  return typeof v.timestamp === 'number' ? { timestamp: v.timestamp } : null;
}

export async function writeConsentAccepted(persistence: DexiePersistence): Promise<void> {
  await persistence.settingsRepo.put({
    key: CONSENT_SETTINGS_KEY,
    value: { timestamp: Date.now() } satisfies ConsentAcceptedValue,
  });
}

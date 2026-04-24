import type { CameraPreference } from '../domain/camera-preference';
import type { SettingsStore } from '../infra/persistence';

export type SettingsReadPort = Pick<SettingsStore, 'get' | 'put'>;

export function normalizeSettingsRepo(r: SettingsStore | undefined): SettingsReadPort | undefined {
  return r;
}

export async function readCameraPreference(
  repo: SettingsReadPort | undefined,
  key: string,
): Promise<CameraPreference | undefined> {
  if (!repo) return undefined;
  const row = await repo.get(key);
  if (!row?.value || typeof row.value !== 'object' || row.value === null) return undefined;
  const o = row.value as Record<string, unknown>;
  const p: CameraPreference = {};
  if (typeof o.deviceId === 'string' && o.deviceId) p.deviceId = o.deviceId;
  if (typeof o.facingMode === 'string' && o.facingMode) p.facingMode = o.facingMode;
  return Object.keys(p).length ? p : undefined;
}

export async function writeCameraPreference(
  repo: SettingsReadPort,
  key: string,
  value: CameraPreference,
): Promise<void> {
  await repo.put({ key, value });
}

/**
 * MediaDevices enumeration and labels for E12 (front/rear / multi-cam).
 */

import type { CameraStartOptions } from './camera';
import type { CameraPreference } from '../domain/camera-preference';

export type VideoInputListItem = {
  deviceId: string;
  label: string;
};

export type MediaDeviceAccess = {
  enumerateDevices: () => Promise<MediaDeviceInfo[]>;
  getUserMedia: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
};

export function getBrowserMediaDeviceAccess(): MediaDeviceAccess | null {
  const md = globalThis.navigator?.mediaDevices;
  if (!md?.enumerateDevices || !md.getUserMedia) {
    return null;
  }
  return {
    enumerateDevices: () => md.enumerateDevices(),
    getUserMedia: (c) => md.getUserMedia(c),
  };
}

/**
 * Re-enumerate; if all videoinput labels are empty, do a one-shot GUM to unlock
 * names (per browser privacy), then re-enumerate.
 */
export async function ensureVideoInputDeviceLabels(
  access: MediaDeviceAccess,
): Promise<MediaDeviceInfo[]> {
  let devices = await access.enumerateDevices();
  const vids = devices.filter((d) => d.kind === 'videoinput');
  if (vids.length === 0) return vids;
  if (vids.some((d) => d.label)) {
    return devices;
  }
  try {
    const stream = await access.getUserMedia({ video: true, audio: false });
    stream.getTracks().forEach((t) => t.stop());
  } catch {
    /* permission denied: labels may stay blank */
  }
  return access.enumerateDevices();
}

export function videoInputDevicesToList(
  allDevices: MediaDeviceInfo[],
  noLabel: (index: number) => string,
): VideoInputListItem[] {
  const v = allDevices.filter((d) => d.kind === 'videoinput');
  return v.map((d, i) => ({
    deviceId: d.deviceId,
    label: d.label.trim() ? d.label : noLabel(i),
  }));
}

/**
 * When `deviceId` is in preference but the device is gone, fall back to
 * `facingMode` if present, else the config default.
 */
export function firstStartOptionsFromPreference(
  preference: CameraPreference | undefined,
  defaultFacingMode: string,
): CameraStartOptions {
  if (preference?.deviceId) {
    return { deviceId: preference.deviceId };
  }
  if (preference?.facingMode) {
    return { facingMode: preference.facingMode };
  }
  return { facingMode: defaultFacingMode };
}

/**
 * @param listPopulated - false until the device `<select>` has been filled at least once after stream start.
 */
export function resolveCameraStartOptions(params: {
  listPopulated: boolean;
  selectValue: string;
  defaultFacingMode: string;
  loadedPreference: CameraPreference | undefined;
}): CameraStartOptions {
  const { listPopulated, selectValue, defaultFacingMode, loadedPreference } = params;
  if (selectValue) {
    return { deviceId: selectValue };
  }
  if (!listPopulated && loadedPreference) {
    return firstStartOptionsFromPreference(loadedPreference, defaultFacingMode);
  }
  return { facingMode: defaultFacingMode };
}

function hasDeviceId(err: unknown): err is { name: string } {
  return err !== null && typeof err === 'object' && 'name' in err;
}

/** `deviceId` is invalid or the track cannot be satisfied. */
export function isRecoverableVideoDeviceError(err: unknown): boolean {
  if (!hasDeviceId(err)) return false;
  const name = (err as DOMException).name;
  return name === 'OverconstrainedError' || name === 'NotFoundError' || name === 'AbortError';
}

export function preferenceForTrackSettings(
  s: MediaTrackSettings | null | undefined,
  fallbackFacing: string,
): CameraPreference {
  const p: CameraPreference = {};
  if (s?.deviceId) p.deviceId = s.deviceId;
  const facing = s?.facingMode;
  p.facingMode = typeof facing === 'string' && facing ? facing : fallbackFacing;
  return p;
}

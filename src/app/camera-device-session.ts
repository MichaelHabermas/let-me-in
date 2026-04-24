/**
 * Shared camera + video-input device list + preference handling for gate and admin.
 */

import type { Camera, CameraStartOptions } from './camera';
import { fillVideoDeviceSelect } from './gate-video-device-select-ui';
import { writeCameraPreference, type SettingsReadPort } from './camera-preference-persistence';
import {
  ensureVideoInputDeviceLabels,
  getBrowserMediaDeviceAccess,
  preferenceForTrackSettings,
  resolveCameraStartOptions,
  videoInputDevicesToList,
} from '../infra/camera-devices';
import type { CameraPreference } from '../domain/camera-preference';

export type CreateCameraStartOptionsStateParams = {
  getDefaultFacingMode: () => string;
  getSelectValueTrimmed: () => string;
};

/**
 * Mutable `listPopulated` + `loadedPreference` and `getStartOptions()` for
 * {@link resolveCameraStartOptions} — single implementation for gate + enroll.
 */
export function createCameraStartOptionsState(p: CreateCameraStartOptionsStateParams): {
  get listPopulated(): boolean;
  setListPopulated: (v: boolean) => void;
  get loadedPreference(): CameraPreference | undefined;
  setLoadedPreference: (v: CameraPreference | undefined) => void;
  getStartOptions: () => CameraStartOptions;
  recoverFromStaleDevice: (
    settingsRepo: SettingsReadPort | undefined,
    preferenceKey: string,
    fallbackFacingMode: string,
  ) => Promise<void>;
} {
  let listPopulated = false;
  let loadedPreference: CameraPreference | undefined;
  return {
    get listPopulated() {
      return listPopulated;
    },
    setListPopulated(v: boolean) {
      listPopulated = v;
    },
    get loadedPreference() {
      return loadedPreference;
    },
    setLoadedPreference(v: CameraPreference | undefined) {
      loadedPreference = v;
    },
    getStartOptions: () =>
      resolveCameraStartOptions({
        listPopulated,
        selectValue: p.getSelectValueTrimmed(),
        defaultFacingMode: p.getDefaultFacingMode(),
        loadedPreference,
      }),
    async recoverFromStaleDevice(
      settingsRepo: SettingsReadPort | undefined,
      preferenceKey: string,
      fallbackFacingMode: string,
    ) {
      listPopulated = false;
      loadedPreference = { facingMode: fallbackFacingMode };
      if (settingsRepo) {
        await writeCameraPreference(settingsRepo, preferenceKey, {
          facingMode: fallbackFacingMode,
        });
      }
    },
  };
}

export type RefreshVideoInputDeviceListParams = {
  camera: Camera;
  deviceSelect: HTMLSelectElement;
  settingsRepo: SettingsReadPort | undefined;
  preferenceKey: string;
  defaultFacingForPreference: string;
  firstSelectOptionLabel: string;
  /** Passed to `videoInputDevicesToList` (0-based index from device list). */
  formatUnnamedForListIndex: (index: number) => string;
};

/**
 * After a stream starts: enumerate + label devices, fill `<select>`, persist
 * track-based preference. Returns whether the list path ran (for `listPopulated`).
 */
export async function refreshVideoInputDeviceListAfterStart(
  p: RefreshVideoInputDeviceListParams,
): Promise<boolean> {
  try {
    const access = getBrowserMediaDeviceAccess();
    if (!access) {
      return false;
    }
    const all = await ensureVideoInputDeviceLabels(access);
    const items = videoInputDevicesToList(all, p.formatUnnamedForListIndex);
    const active = p.camera.getTrackSettings()?.deviceId;
    fillVideoDeviceSelect(p.deviceSelect, p.firstSelectOptionLabel, items, active ?? null);
    if (p.settingsRepo) {
      const t = p.camera.getTrackSettings();
      await writeCameraPreference(
        p.settingsRepo,
        p.preferenceKey,
        preferenceForTrackSettings(t, p.defaultFacingForPreference),
      );
    }
    return true;
  } catch {
    return false;
  }
}

import { describe, expect, it, vi } from 'vitest';

import { bindCameraDevicePreferenceChange } from '../src/app/camera-device-session';
import type { SettingsStore } from '../src/infra/persistence';

function makeSettingsStore(): SettingsStore {
  return {
    put: vi.fn().mockResolvedValue('thresholds'),
    get: vi.fn().mockResolvedValue(undefined),
    delete: vi.fn().mockResolvedValue(undefined),
    toArray: vi.fn().mockResolvedValue([]),
  };
}

describe('bindCameraDevicePreferenceChange', () => {
  it('persists preference and restarts when camera is running', async () => {
    const settingsRepo = makeSettingsStore();
    const select = document.createElement('select');
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    const backCamOption = document.createElement('option');
    backCamOption.value = 'back-cam';
    select.append(defaultOption, backCamOption);
    select.value = 'back-cam';
    const restartCamera = vi.fn().mockResolvedValue(undefined);
    const setLoadedPreference = vi.fn();

    bindCameraDevicePreferenceChange({
      deviceSelect: select,
      settingsRepo,
      preferenceKey: 'gateCameraPreference',
      defaultFacingMode: 'environment',
      isCameraRunning: () => true,
      restartCamera,
      setLoadedPreference,
    });

    select.dispatchEvent(new Event('change'));
    await Promise.resolve();

    expect(settingsRepo.put).toHaveBeenCalledWith({
      key: 'gateCameraPreference',
      value: { deviceId: 'back-cam' },
    });
    expect(setLoadedPreference).toHaveBeenCalledWith({ deviceId: 'back-cam' });
    expect(restartCamera).toHaveBeenCalledTimes(1);

    const putOrder = vi.mocked(settingsRepo.put).mock.invocationCallOrder[0];
    const restartOrder = restartCamera.mock.invocationCallOrder[0];
    expect(putOrder).toBeDefined();
    expect(restartOrder).toBeDefined();
    if (putOrder === undefined || restartOrder === undefined) {
      throw new Error('expected call order for settings write and restart');
    }
    expect(putOrder).toBeLessThan(restartOrder);
  });

  it('persists default facing mode and does not restart when camera is stopped', async () => {
    const settingsRepo = makeSettingsStore();
    const select = document.createElement('select');
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    select.append(defaultOption);
    select.value = '';
    const restartCamera = vi.fn();

    bindCameraDevicePreferenceChange({
      deviceSelect: select,
      settingsRepo,
      preferenceKey: 'enrollCameraPreference',
      defaultFacingMode: 'user',
      isCameraRunning: () => false,
      restartCamera,
    });

    select.dispatchEvent(new Event('change'));
    await Promise.resolve();

    expect(settingsRepo.put).toHaveBeenCalledWith({
      key: 'enrollCameraPreference',
      value: { facingMode: 'user' },
    });
    expect(restartCamera).not.toHaveBeenCalled();
  });

  it('unbinds listener during teardown', async () => {
    const settingsRepo = makeSettingsStore();
    const select = document.createElement('select');
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    select.append(defaultOption);
    const restartCamera = vi.fn();

    const unbind = bindCameraDevicePreferenceChange({
      deviceSelect: select,
      settingsRepo,
      preferenceKey: 'enrollCameraPreference',
      defaultFacingMode: 'user',
      isCameraRunning: () => false,
      restartCamera,
    });

    unbind();
    select.dispatchEvent(new Event('change'));
    await Promise.resolve();

    expect(settingsRepo.put).not.toHaveBeenCalled();
  });
});

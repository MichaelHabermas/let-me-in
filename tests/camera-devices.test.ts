import { describe, expect, it } from 'vitest';

import {
  firstStartOptionsFromPreference,
  resolveCameraStartOptions,
} from '../src/infra/camera-devices';
import type { CameraPreference } from '../src/domain/camera-preference';

describe('resolveCameraStartOptions / firstStartOptionsFromPreference', () => {
  it('selects by deviceId when the user picked a non-default option', () => {
    expect(
      resolveCameraStartOptions({
        listPopulated: true,
        selectValue: 'abc',
        defaultFacingMode: 'user',
        loadedPreference: undefined,
      }),
    ).toEqual({ deviceId: 'abc' });
  });

  it('uses default facing when list is populated and Default is selected', () => {
    expect(
      resolveCameraStartOptions({
        listPopulated: true,
        selectValue: '',
        defaultFacingMode: 'user',
        loadedPreference: { deviceId: 'gone' },
      }),
    ).toEqual({ facingMode: 'user' });
  });

  it('uses loaded preference for first start before the device list is filled', () => {
    const p: CameraPreference = { deviceId: 'd1' };
    expect(
      resolveCameraStartOptions({
        listPopulated: false,
        selectValue: '',
        defaultFacingMode: 'user',
        loadedPreference: p,
      }),
    ).toEqual({ deviceId: 'd1' });
  });

  it('firstStartOptionsFromPreference returns facing from preference', () => {
    expect(
      firstStartOptionsFromPreference({ facingMode: 'environment' }, 'user'),
    ).toEqual({ facingMode: 'environment' });
  });
});

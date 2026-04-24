import type { Camera, CameraStartOptions } from './camera';
import { isRecoverableVideoDeviceError } from '../infra/camera-devices';

/**
 * Tries the requested `getUserMedia` options; on stale `deviceId`, restarts with `facingMode` only.
 */
export async function startVideoCameraResilient(
  camera: Camera,
  getOptions: () => CameraStartOptions,
  defaultFacingMode: string,
  onRecoverFromStaleDevice?: (fallbackFacing: string) => void | Promise<void>,
): Promise<void> {
  let opts = getOptions();
  try {
    await camera.start(opts);
  } catch (e) {
    if (isRecoverableVideoDeviceError(e) && opts.deviceId) {
      await onRecoverFromStaleDevice?.(defaultFacingMode);
      opts = { facingMode: defaultFacingMode };
      await camera.start(opts);
    } else {
      throw e;
    }
  }
}

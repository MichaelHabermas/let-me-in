import type { Camera } from './camera';

export type CameraSessionLifecycle = {
  start(): Promise<void>;
  stop(): void;
  restart(): Promise<void>;
};

type CreateCameraSessionLifecycleParams = {
  camera: Camera;
  onStart: () => Promise<void>;
  onStop?: () => void;
  onStartError?: (error: unknown) => void;
};

/** Shared start/stop/restart lifecycle with guarded async starts. */
export function createCameraSessionLifecycle(
  params: CreateCameraSessionLifecycleParams,
): CameraSessionLifecycle {
  let starting = false;

  const stop = () => {
    params.onStop?.();
    params.camera.stop();
  };

  const start = async () => {
    if (starting) return;
    starting = true;
    try {
      await params.onStart();
    } catch (error) {
      params.onStartError?.(error);
      throw error;
    } finally {
      starting = false;
    }
  };

  const restart = async () => {
    stop();
    await start();
  };

  return { start, stop, restart };
}

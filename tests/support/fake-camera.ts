import { vi } from 'vitest';

import type { Camera } from '../../src/infra/camera';

/** Vitest-backed `Camera` with sensible defaults; override any method (e.g. stateful `onError`). */
export function createVitestCameraStub(overrides: Partial<Camera> = {}): Camera {
  return {
    start: vi.fn().mockResolvedValue(undefined),
    stop: vi.fn(),
    onError: vi.fn(() => () => {}),
    onFrame: vi.fn(() => () => {}),
    getFrame: vi.fn(),
    isRunning: vi.fn(() => false),
    getTrackSettings: vi.fn(() => null),
    ...overrides,
  } as Camera;
}

/**
 * Camera used by detection-pipeline tests: captures the `onFrame` callback so tests can
 * simulate RAF ticks after `createDetectionPipeline` subscribes.
 */
export function createCameraWithCapturedFrameCallback(
  frame: ImageData,
  isRunning = true,
): {
  camera: Camera;
  getFrameCb: () => ((t: number) => void) | undefined;
} {
  let frameCb: ((t: number) => void) | undefined;
  const camera = createVitestCameraStub({
    isRunning: vi.fn(() => isRunning),
    getFrame: vi.fn(() => frame),
    onFrame: vi.fn((cb: (t: number) => void) => {
      frameCb = cb;
      return () => {
        frameCb = undefined;
      };
    }),
  });
  return {
    camera,
    getFrameCb: () => frameCb,
  };
}

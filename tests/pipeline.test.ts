import { describe, expect, it, vi } from 'vitest';

import { createDetectionPipeline } from '../src/app/pipeline';
import type { Camera } from '../src/app/camera';
import type { YoloDetector } from '../src/infra/detector-core';

describe('createDetectionPipeline', () => {
  it('subscribes onFrame and draws after infer', async () => {
    const clearRect = vi.fn();
    const frame = { width: 2, height: 2, data: new Uint8ClampedArray(16) } as unknown as ImageData;
    let frameCb: ((t: number) => void) | undefined;
    const camera = {
      isRunning: vi.fn(() => true),
      getFrame: vi.fn(() => frame),
      onFrame: vi.fn((cb: (t: number) => void) => {
        frameCb = cb;
        return () => {
          frameCb = undefined;
        };
      }),
    } as unknown as Camera;

    const detector = {
      infer: vi.fn().mockResolvedValue([
        { bbox: [1, 2, 5, 8] as const, confidence: 0.9, classId: 0 },
      ]),
    } as unknown as YoloDetector;

    const overlayCtx = {
      clearRect,
      save: vi.fn(),
      restore: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      strokeRect: vi.fn(),
      font: '',
      fillStyle: '',
      fillRect: vi.fn(),
      measureText: vi.fn(() => ({ width: 20 })),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;

    const stop = createDetectionPipeline({
      camera,
      detector,
      overlayCtx,
      overlayWidth: 100,
      overlayHeight: 80,
    });

    expect(frameCb).toBeTypeOf('function');
    frameCb!(1);
    await vi.waitFor(() => expect(detector.infer).toHaveBeenCalled());
    expect(clearRect).toHaveBeenCalledWith(0, 0, 100, 80);

    stop();
  });
});

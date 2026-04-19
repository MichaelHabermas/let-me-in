import { describe, expect, it, vi } from 'vitest';

import { createDetectionPipeline } from '../src/app/pipeline';
import type { Camera } from '../src/app/camera';
import type { YoloDetector } from '../src/infra/detector-core';
import type { FaceEmbedder } from '../src/infra/embedder-ort';

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

  it('runs embedder when exactly one detection and faceEmbedder is set', async () => {
    const clearRect = vi.fn();
    const frame = new ImageData(128, 128);
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
      infer: vi.fn().mockResolvedValue([{ bbox: [32, 32, 96, 96] as const, confidence: 0.9, classId: 0 }]),
    } as unknown as YoloDetector;

    const faceEmbedder: FaceEmbedder = {
      load: vi.fn(),
      infer: vi.fn().mockResolvedValue(new Float32Array(512).fill(3)),
      dispose: vi.fn(),
    };

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

    createDetectionPipeline({
      camera,
      detector,
      overlayCtx,
      overlayWidth: 128,
      overlayHeight: 128,
      faceEmbedder,
    });

    expect(frameCb).toBeTypeOf('function');
    frameCb!(1);
    await vi.waitFor(() => expect(faceEmbedder.infer).toHaveBeenCalled());
    const arg = vi.mocked(faceEmbedder.infer).mock.calls[0][0] as Float32Array;
    expect(arg.length).toBe(3 * 112 * 112);
  });
});

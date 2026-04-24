/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from 'vitest';

import { createCooldown } from '../src/app/cooldown';
import { createDetectionPipeline } from '../src/app/pipeline';
import type { Camera } from '../src/app/camera';
import type { YoloDetector } from '../src/infra/detector-core';
import type { FaceEmbedder } from '../src/infra/embedder-ort';

const sampleBlob = new Blob(['x'], { type: 'image/png' });

function createOverlayCtx(
  overrides: Partial<CanvasRenderingContext2D> = {},
): CanvasRenderingContext2D {
  return {
    clearRect: vi.fn(),
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
    ...overrides,
  } as unknown as CanvasRenderingContext2D;
}

function evalGranted() {
  return {
    policy: { decision: 'GRANTED' as const, userId: 'u1', score: 0.9 },
    displayName: 'Alex',
    referenceImageBlob: null,
    capturedFrameBlob: sampleBlob,
  };
}

function evalDenied() {
  return {
    policy: { decision: 'DENIED' as const, userId: null, score: 0.2, label: 'Unknown' as const },
    displayName: null,
    referenceImageBlob: null,
    capturedFrameBlob: sampleBlob,
  };
}

function evalUncertain() {
  return {
    policy: { decision: 'UNCERTAIN' as const, userId: 'u1', score: 0.72 },
    displayName: null,
    referenceImageBlob: null,
    capturedFrameBlob: sampleBlob,
  };
}

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

    const overlayCtx = createOverlayCtx({ clearRect });

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

    const overlayCtx = createOverlayCtx({ clearRect });

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
    const inferCalls = vi.mocked(faceEmbedder.infer).mock.calls;
    const firstInferArgs = inferCalls[0];
    if (firstInferArgs === undefined) throw new Error('expected embedder infer call');
    const tensorArg = firstInferArgs[0];
    if (tensorArg === undefined) throw new Error('expected tensor argument');
    const arg = tensorArg as Float32Array;
    expect(arg.length).toBe(3 * 112 * 112);
  });

  it('shows no-face status without emitting a decision', async () => {
    const frame = new ImageData(64, 64);
    const statusEl = document.createElement('p');
    let now = 0;
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
      infer: vi.fn().mockResolvedValue([]),
    } as unknown as YoloDetector;
    const evaluateDecision = vi.fn();
    const overlayCtx = createOverlayCtx();

    createDetectionPipeline({
      camera,
      detector,
      overlayCtx,
      overlayWidth: 64,
      overlayHeight: 64,
      statusEl,
      noFaceMessage: 'No face detected',
      multiFaceMessage: 'Multiple faces',
      getNowMs: () => now,
      evaluateDecision,
    });
    frameCb!(1);
    await vi.waitFor(() => expect(detector.infer).toHaveBeenCalled());
    expect(statusEl.textContent).toBe('');
    now = 1001;
    await Promise.resolve();
    await Promise.resolve();
    frameCb!(2);
    await vi.waitFor(() => expect(detector.infer).toHaveBeenCalledTimes(2));
    expect(statusEl.textContent).toBe('No face detected');
    expect(evaluateDecision).not.toHaveBeenCalled();
  });

  it('shows multi-face status and does not embed', async () => {
    const frame = new ImageData(64, 64);
    const statusEl = document.createElement('p');
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
        { bbox: [1, 1, 10, 10] as const, confidence: 0.9, classId: 0 },
        { bbox: [20, 20, 30, 30] as const, confidence: 0.8, classId: 0 },
      ]),
    } as unknown as YoloDetector;
    const faceEmbedder: FaceEmbedder = {
      load: vi.fn(),
      infer: vi.fn(),
      dispose: vi.fn(),
    };
    const overlayCtx = createOverlayCtx();

    createDetectionPipeline({
      camera,
      detector,
      overlayCtx,
      overlayWidth: 64,
      overlayHeight: 64,
      faceEmbedder,
      statusEl,
      noFaceMessage: 'No face detected',
      multiFaceMessage: 'Multiple faces detected',
    });
    frameCb!(1);
    await vi.waitFor(() => expect(detector.infer).toHaveBeenCalled());
    expect(statusEl.textContent).toBe('Multiple faces detected');
    expect(faceEmbedder.infer).not.toHaveBeenCalled();
  });

  it('enforces cooldown after GRANTED decisions', async () => {
    let now = 1_000;
    const cooldown = createCooldown(3_000, () => now);
    const frame = new ImageData(128, 128);
    const statusEl = document.createElement('p');
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
    const evaluateDecision = vi.fn(() => evalGranted());
    const overlayCtx = createOverlayCtx();

    createDetectionPipeline({
      camera,
      detector,
      overlayCtx,
      overlayWidth: 128,
      overlayHeight: 128,
      faceEmbedder,
      statusEl,
      noFaceMessage: 'No face detected',
      multiFaceMessage: 'Multiple faces',
      cooldown,
      getNowMs: () => now,
      evaluateDecision,
    });

    frameCb!(1);
    await vi.waitFor(() => expect(faceEmbedder.infer).toHaveBeenCalledTimes(1));
    expect(evaluateDecision).toHaveBeenCalledTimes(1);

    now += 100;
    frameCb!(2);
    await vi.waitFor(() => expect(detector.infer).toHaveBeenCalledTimes(2));
    expect(faceEmbedder.infer).toHaveBeenCalledTimes(1);
    expect(statusEl.textContent).toBe('Please wait 3 s');
  });

  it('enforces cooldown after DENIED decisions', async () => {
    let now = 1_000;
    const cooldown = createCooldown(3_000, () => now);
    const frame = new ImageData(128, 128);
    const statusEl = document.createElement('p');
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
    const evaluateDecision = vi.fn(() => evalDenied());
    const overlayCtx = createOverlayCtx();

    createDetectionPipeline({
      camera,
      detector,
      overlayCtx,
      overlayWidth: 128,
      overlayHeight: 128,
      faceEmbedder,
      statusEl,
      noFaceMessage: 'No face detected',
      multiFaceMessage: 'Multiple faces',
      cooldown,
      getNowMs: () => now,
      evaluateDecision,
    });

    frameCb!(1);
    await vi.waitFor(() => expect(faceEmbedder.infer).toHaveBeenCalledTimes(1));
    expect(evaluateDecision).toHaveBeenCalledTimes(1);

    now += 100;
    frameCb!(2);
    await vi.waitFor(() => expect(detector.infer).toHaveBeenCalledTimes(2));
    expect(faceEmbedder.infer).toHaveBeenCalledTimes(1);
    expect(statusEl.textContent).toBe('Please wait 3 s');
  });

  it('does not start cooldown after UNCERTAIN (embedder runs each frame)', async () => {
    let now = 1_000;
    const cooldown = createCooldown(3_000, () => now);
    const frame = new ImageData(128, 128);
    const statusEl = document.createElement('p');
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
    const evaluateDecision = vi.fn(() => evalUncertain());
    const overlayCtx = createOverlayCtx();

    createDetectionPipeline({
      camera,
      detector,
      overlayCtx,
      overlayWidth: 128,
      overlayHeight: 128,
      faceEmbedder,
      statusEl,
      noFaceMessage: 'No face detected',
      multiFaceMessage: 'Multiple faces',
      cooldown,
      getNowMs: () => now,
      evaluateDecision,
    });

    frameCb!(1);
    await vi.waitFor(() => expect(faceEmbedder.infer).toHaveBeenCalledTimes(1));
    now += 100;
    frameCb!(2);
    await vi.waitFor(() => expect(faceEmbedder.infer).toHaveBeenCalledTimes(2));
    expect(statusEl.textContent).toBe('');
    expect(evaluateDecision).toHaveBeenCalledTimes(2);
  });

  it('calls appendAccessLog for DENIED', async () => {
    const appendAccessLog = vi.fn().mockResolvedValue(undefined);
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
    const overlayCtx = createOverlayCtx();

    createDetectionPipeline({
      camera,
      detector,
      overlayCtx,
      overlayWidth: 128,
      overlayHeight: 128,
      faceEmbedder,
      appendAccessLog,
      evaluateDecision: vi.fn(() => evalDenied()),
    });

    frameCb!(1);
    await vi.waitFor(() => expect(appendAccessLog).toHaveBeenCalledTimes(1));
    const logCalls = appendAccessLog.mock.calls;
    const firstLog = logCalls[0];
    if (firstLog === undefined) throw new Error('expected appendAccessLog call');
    const payload = firstLog[0];
    if (payload === undefined) throw new Error('expected log payload');
    expect(payload.decision).toBe('DENIED');
    expect(payload.userId).toBeNull();
  });

  it('does not call appendAccessLog for UNCERTAIN', async () => {
    const appendAccessLog = vi.fn().mockResolvedValue(undefined);
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
    const overlayCtx = createOverlayCtx();

    createDetectionPipeline({
      camera,
      detector,
      overlayCtx,
      overlayWidth: 128,
      overlayHeight: 128,
      faceEmbedder,
      appendAccessLog,
      evaluateDecision: vi.fn(() => evalUncertain()),
    });

    frameCb!(1);
    frameCb!(2);
    await vi.waitFor(() => expect(appendAccessLog).not.toHaveBeenCalled());
  });
});

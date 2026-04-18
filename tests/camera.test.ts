import { describe, expect, it, vi } from 'vitest';

import { createCamera, type CameraBrowserDeps, type CameraError } from '../src/app/camera';

const defaults = { idealWidth: 1280, idealHeight: 720, facingMode: 'user' };

function createMockCanvas(
  w: number,
  h: number,
): {
  canvas: HTMLCanvasElement;
  drawImage: ReturnType<typeof vi.fn>;
  getImageData: ReturnType<typeof vi.fn>;
} {
  const drawImage = vi.fn();
  const getImageData = vi.fn(() => ({
    width: w,
    height: h,
    data: new Uint8ClampedArray(w * h * 4),
  }));

  const ctx = {
    drawImage,
    getImageData,
  };

  const canvas = {
    width: w,
    height: h,
    getContext: vi.fn(() => ctx),
  } as unknown as HTMLCanvasElement;

  return { canvas, drawImage, getImageData };
}

function createMockVideo(): HTMLVideoElement & { _play: ReturnType<typeof vi.fn> } {
  const _play = vi.fn().mockResolvedValue(undefined);
  const video = {
    srcObject: null as MediaStream | null,
    muted: false,
    play: _play,
    setAttribute: vi.fn(),
    videoWidth: 1280,
    videoHeight: 720,
  } as unknown as HTMLVideoElement & { _play: ReturnType<typeof vi.fn> };
  return video;
}

async function drainMicrotasks(count: number): Promise<void> {
  for (let i = 0; i < count; i++) {
    await Promise.resolve();
  }
}

describe('createCamera', () => {
  it('exposes the public API surface', () => {
    const video = createMockVideo();
    const { canvas } = createMockCanvas(1280, 720);
    const camera = createCamera(video, canvas, { defaultConstraints: defaults });

    expect(typeof camera.start).toBe('function');
    expect(typeof camera.stop).toBe('function');
    expect(typeof camera.getFrame).toBe('function');
    expect(typeof camera.onFrame).toBe('function');
    expect(typeof camera.onError).toBe('function');
    expect(typeof camera.isRunning).toBe('function');
  });

  it('unsubscribes onFrame and onError listeners', () => {
    const video = createMockVideo();
    const { canvas } = createMockCanvas(4, 4);
    const camera = createCamera(video, canvas, { defaultConstraints: defaults });

    const frameCb = vi.fn();
    const errCb = vi.fn();
    const unsubF = camera.onFrame(frameCb);
    const unsubE = camera.onError(errCb);
    unsubF();
    unsubE();

    expect(frameCb).not.toHaveBeenCalled();
    expect(errCb).not.toHaveBeenCalled();
  });

  it('throws camera-stopped from getFrame when not running', () => {
    const video = createMockVideo();
    const { canvas } = createMockCanvas(8, 8);
    const camera = createCamera(video, canvas, { defaultConstraints: defaults });

    try {
      camera.getFrame();
      expect.fail('expected throw');
    } catch (e) {
      expect((e as CameraError).code).toBe('camera-stopped');
    }
  });

  it('stops tracks and rejects getFrame after stop()', async () => {
    const trackStop = vi.fn();
    const stream = {
      getTracks: () => [{ stop: trackStop }],
    } as unknown as MediaStream;

    const video = createMockVideo();
    const { canvas } = createMockCanvas(16, 16);

    let time = 0;
    const deps: CameraBrowserDeps = {
      getUserMedia: vi.fn().mockResolvedValue(stream),
      requestAnimationFrame: (cb) => {
        queueMicrotask(() => cb(time));
        time += 1000 / 60;
        return 1;
      },
      cancelAnimationFrame: vi.fn(),
      now: () => time,
    };

    const camera = createCamera(video, canvas, { defaultConstraints: defaults, deps });
    await camera.start();
    await drainMicrotasks(3);

    camera.stop();
    expect(trackStop).toHaveBeenCalled();

    try {
      camera.getFrame();
      expect.fail('expected throw');
    } catch (e) {
      expect((e as CameraError).code).toBe('camera-stopped');
    }
  });

  it('sustains at least 15 preview draws per simulated second', async () => {
    const trackStop = vi.fn();
    const stream = {
      getTracks: () => [{ stop: trackStop }],
    } as unknown as MediaStream;

    const video = createMockVideo();
    const { canvas, drawImage } = createMockCanvas(1280, 720);

    let timeMs = 0;
    const deps: CameraBrowserDeps = {
      getUserMedia: vi.fn().mockResolvedValue(stream),
      requestAnimationFrame: (cb) => {
        queueMicrotask(() => {
          cb(timeMs);
          timeMs += 1000 / 60;
        });
        return 1;
      },
      cancelAnimationFrame: vi.fn(),
      now: () => timeMs,
    };

    const camera = createCamera(video, canvas, { defaultConstraints: defaults, deps });

    let frames = 0;
    camera.onFrame(() => {
      frames++;
    });

    await camera.start();
    await drainMicrotasks(60);

    const elapsedSeconds = timeMs / 1000;
    const fps = frames / elapsedSeconds;
    expect(drawImage.mock.calls.length).toBe(frames);
    expect(frames).toBeGreaterThanOrEqual(15);
    expect(fps).toBeGreaterThanOrEqual(15);

    camera.stop();
  });

  it('returns ImageData sized to the canvas and getFrame stays within 20ms', async () => {
    const stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as unknown as MediaStream;

    const video = createMockVideo();
    const w = 1280;
    const h = 720;
    const { canvas, getImageData } = createMockCanvas(w, h);

    const deps: CameraBrowserDeps = {
      getUserMedia: vi.fn().mockResolvedValue(stream),
      requestAnimationFrame: (cb) => {
        queueMicrotask(() => cb(0));
        return 1;
      },
      cancelAnimationFrame: vi.fn(),
      now: () => 0,
    };

    const camera = createCamera(video, canvas, { defaultConstraints: defaults, deps });
    await camera.start();
    await drainMicrotasks(2);

    const frame = camera.getFrame();
    expect(frame.width).toBe(w);
    expect(frame.height).toBe(h);
    expect(frame.data.length).toBe(w * h * 4);

    const samples: number[] = [];
    for (let i = 0; i < 25; i++) {
      const t0 = performance.now();
      camera.getFrame();
      samples.push(performance.now() - t0);
    }
    samples.sort((a, b) => a - b);
    const p95 = samples[Math.floor(samples.length * 0.95)];
    expect(p95).toBeLessThanOrEqual(20);

    camera.stop();
    expect(getImageData).toHaveBeenCalled();
  });

  it('notifies onError subscribers when getUserMedia fails', async () => {
    const video = createMockVideo();
    const { canvas } = createMockCanvas(4, 4);
    const err = Object.assign(new Error('denied'), { name: 'NotAllowedError' });

    const deps: CameraBrowserDeps = {
      getUserMedia: vi.fn().mockRejectedValue(err),
      requestAnimationFrame: () => 1,
      cancelAnimationFrame: vi.fn(),
      now: () => 0,
    };

    const camera = createCamera(video, canvas, { defaultConstraints: defaults, deps });
    const onError = vi.fn();
    camera.onError(onError);

    await expect(camera.start()).rejects.toMatchObject({ code: 'permission-denied' });
    expect(onError).toHaveBeenCalledWith(expect.objectContaining({ code: 'permission-denied' }));
  });
});

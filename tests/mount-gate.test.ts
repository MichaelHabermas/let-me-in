/** @vitest-environment happy-dom */

import Dexie from 'dexie';
import { describe, expect, it, vi } from 'vitest';

import type { Camera } from '../src/app/camera';
import { CONSENT_SETTINGS_KEY } from '../src/app/consent';
import { l2normalize } from '../src/app/match';
import { createMountGateHostDeps, mountGateIntoHost } from '../src/app/mount-gate';
import type { YoloDetector } from '../src/infra/detector-core';
import type { FaceEmbedder } from '../src/infra/embedder-ort';
import { createDexiePersistence } from '../src/infra/persistence';

import { createTestGateRuntime } from './support/create-test-gate-runtime';
import { stubCanvas2dContext } from './support/stub-canvas-2d-context';

function fakeYoloDetector(): YoloDetector {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    infer: vi.fn().mockResolvedValue([]),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as YoloDetector;
}

function fakeFaceEmbedder(): FaceEmbedder {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    infer: vi.fn().mockResolvedValue(new Float32Array(512)),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as FaceEmbedder;
}

describe('createMountGateHostDeps', () => {
  it('keeps the same GateRuntime reference', () => {
    const rt = createTestGateRuntime();
    expect(createMountGateHostDeps(rt).rt).toBe(rt);
  });
});

describe('mountGateIntoHost', () => {
  it('renders gate DOM and wires session with injected createCamera', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const fakeCamera = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      onError: vi.fn(() => () => {}),
      onFrame: vi.fn(() => () => {}),
      getFrame: vi.fn(),
      isRunning: vi.fn(() => false),
    } as unknown as Camera;

    const createCamera = vi.fn(() => fakeCamera);

    mountGateIntoHost(
      host,
      createMountGateHostDeps(createTestGateRuntime(), {
        createCamera,
        createYoloDetector: fakeYoloDetector,
        createFaceEmbedder: fakeFaceEmbedder,
        addBeforeUnload: false,
      }),
    );

    expect(document.title).toBe('TestOrg — Entry');
    expect(host.querySelector('.page--gate')).toBeTruthy();
    const h1 = host.querySelector('.page__title');
    const bubble = host.querySelector('#gate-product-tagline');
    expect(host.querySelector('.gate-title-tooltip-host')).toBeTruthy();
    expect(bubble?.textContent).toBe('Test tagline for browser-only facial recognition.');
    expect(bubble?.classList.contains('gate-title-tooltip__bubble')).toBe(true);
    expect(h1?.getAttribute('aria-describedby')).toBe('gate-product-tagline');
    expect(host.querySelector('#start')).toBeTruthy();
    expect(host.querySelector('#preview')).toBeTruthy();
    expect(host.querySelector('#detector-overlay')).toBeTruthy();
    expect(host.querySelector('#decision')?.textContent).toBe('—');

    expect(createCamera).toHaveBeenCalled();
  });

  it('returns teardown that stops the camera', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);

    const fakeCamera = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      onError: vi.fn(() => () => {}),
      onFrame: vi.fn(() => () => {}),
      getFrame: vi.fn(),
      isRunning: vi.fn(() => false),
    } as unknown as Camera;

    const teardown = mountGateIntoHost(
      host,
      createMountGateHostDeps(createTestGateRuntime(), {
        createCamera: () => fakeCamera,
        createYoloDetector: fakeYoloDetector,
        createFaceEmbedder: fakeFaceEmbedder,
        addBeforeUnload: false,
      }),
    );

    teardown();
    expect(fakeCamera.stop).toHaveBeenCalled();
  });

  it('updates #decision from IndexedDB-backed live access when embedding matches enrollment', async () => {
    const dbName = `gate-mount-live-${crypto.randomUUID()}`;
    const persistence = createDexiePersistence(dbName);
    const rt = createTestGateRuntime();
    const seed = rt.getDatabaseSeedSettings();
    await persistence.initDatabase(seed);

    const raw = new Float32Array(512).map((_, i) => (i < 8 ? (i + 1) * 0.1 : 0));
    const emb = l2normalize(new Float32Array(raw));

    await persistence.usersRepo.put({
      id: 'user-1',
      name: 'Enrolled',
      role: 'staff',
      referenceImageBlob: new Blob(),
      embedding: emb,
      createdAt: 1,
    });
    await persistence.settingsRepo.put({
      key: CONSENT_SETTINGS_KEY,
      value: { timestamp: Date.now() },
    });

    const frame = new ImageData(rt.previewCanvasWidth, rt.previewCanvasHeight);
    let frameCb: ((t: number) => void) | undefined;
    let running = false;

    const fakeCamera = {
      start: vi.fn(async () => {
        running = true;
      }),
      stop: vi.fn(() => {
        running = false;
      }),
      onError: vi.fn(() => () => {}),
      onFrame: vi.fn((cb: (t: number) => void) => {
        frameCb = cb;
        return () => {
          frameCb = undefined;
        };
      }),
      getFrame: vi.fn(() => frame),
      isRunning: vi.fn(() => running),
    } as unknown as Camera;

    const yoloDetector: YoloDetector = {
      load: vi.fn().mockResolvedValue(undefined),
      infer: vi.fn().mockResolvedValue([
        { bbox: [32, 32, 200, 200] as const, confidence: 0.95, classId: 0 },
      ]),
      dispose: vi.fn().mockResolvedValue(undefined),
    } as unknown as YoloDetector;

    const embedder: FaceEmbedder = {
      load: vi.fn().mockResolvedValue(undefined),
      infer: vi.fn().mockResolvedValue(new Float32Array(raw)),
      dispose: vi.fn().mockResolvedValue(undefined),
    } as unknown as FaceEmbedder;

    const host = document.createElement('div');
    document.body.appendChild(host);

    mountGateIntoHost(
      host,
      createMountGateHostDeps(rt, {
        createCamera: () => fakeCamera,
        createYoloDetector: () => yoloDetector,
        createFaceEmbedder: () => embedder,
        addBeforeUnload: false,
        sessionDepsExtras: {
          persistence,
          databaseSeedFallback: seed,
        },
      }),
    );

    const restoreCanvasStub = stubCanvas2dContext();
    const overlay = host.querySelector<HTMLCanvasElement>('#detector-overlay')!;
    const overlayCtx = {
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      putImageData: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      strokeRect: vi.fn(),
      font: '',
      fillStyle: '',
      fillRect: vi.fn(),
      measureText: vi.fn(() => ({ width: 20 })),
      fillText: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    const getContextSpy = vi.spyOn(overlay, 'getContext').mockImplementation((type) =>
      type === '2d' ? overlayCtx : null,
    );

    try {
      await vi.waitFor(() => {
        expect(host.querySelector<HTMLButtonElement>('#start')!.disabled).toBe(false);
      });
      host.querySelector<HTMLButtonElement>('#start')!.click();
      await vi.waitFor(() => expect(fakeCamera.start).toHaveBeenCalled());
      await vi.waitFor(() => expect(frameCb).toBeTypeOf('function'));
      frameCb!(performance.now());
      await vi.waitFor(() => {
        expect(host.querySelector('#decision .banner--granted')).toBeTruthy();
        expect(host.querySelector('#decision .banner__title')?.textContent).toContain('Enrolled');
      });
    } finally {
      getContextSpy.mockRestore();
      restoreCanvasStub();
      document.body.removeChild(host);
      await persistence.resetIndexedDbClientForTests();
      await Dexie.delete(dbName);
    }
  });
});

/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from 'vitest';

import type { Camera } from '../src/app/camera';
import { createMountGateHostDeps, mountGateIntoHost } from '../src/app/mount-gate';
import type { YoloDetector } from '../src/infra/detector-core';
import type { FaceEmbedder } from '../src/infra/embedder-ort';

import { createTestGateRuntime } from './support/create-test-gate-runtime';

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
});

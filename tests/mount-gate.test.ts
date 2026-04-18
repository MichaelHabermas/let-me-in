/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from 'vitest';

import type { Camera } from '../src/app/camera';
import { wireGatePreviewSession } from '../src/app/gate-session';
import { mountGateIntoHost } from '../src/app/mount-gate';
import type { GateRuntime } from '../src/app/runtime-settings';
import type { YoloDetector } from '../src/infra/detector-core';

function fakeRuntime(): GateRuntime {
  return {
    orgName: 'TestOrg',
    gatePageTitle: 'TestOrg — Entry',
    adminPageTitle: 'TestOrg — Admin',
    logPageTitle: 'TestOrg — Entry log',
    previewCanvasWidth: 320,
    previewCanvasHeight: 240,
    showFpsOverlay: false,
    getDatabaseSeedSettings: () => ({
      thresholds: { strong: 0.8, weak: 0.65, unknown: 0.6, margin: 0.05 },
      cooldownMs: 3000,
    }),
    getDefaultVideoConstraintsForCamera: () => ({
      idealWidth: 320,
      idealHeight: 240,
      facingMode: 'user',
    }),
    getCameraUserFacingMessage: () => '',
    getCameraStartLabel: () => 'Start',
    getCameraStopLabel: () => 'Stop',
    getDetectorLoadingMessage: () => 'Loading detector…',
    getDetectorLoadFailedMessage: () => 'Detector failed.',
  };
}

function fakeYoloDetector(): YoloDetector {
  return {
    load: vi.fn().mockResolvedValue(undefined),
    infer: vi.fn().mockResolvedValue([]),
    dispose: vi.fn().mockResolvedValue(undefined),
  } as unknown as YoloDetector;
}

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

    mountGateIntoHost(host, {
      rt: fakeRuntime(),
      createCamera,
      wireGatePreviewSession,
      createYoloDetector: fakeYoloDetector,
      addBeforeUnload: false,
    });

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

    const teardown = mountGateIntoHost(host, {
      rt: fakeRuntime(),
      createCamera: () => fakeCamera,
      wireGatePreviewSession,
      createYoloDetector: fakeYoloDetector,
      addBeforeUnload: false,
    });

    teardown();
    expect(fakeCamera.stop).toHaveBeenCalled();
  });
});

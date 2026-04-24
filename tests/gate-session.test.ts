import { describe, expect, it, vi } from 'vitest';

import type { Camera } from '../src/app/camera';
import { wireGatePreviewSession } from '../src/app/gate-session';
import type { YoloDetector } from '../src/infra/detector-core';
import { makeCameraError } from '../src/infra/camera';

import {
  testDetectorLoadFailedMessage,
  testDetectorLoadingMessage,
  testModelLoadRetry,
  testModelLoadStageDetector,
  testModelLoadStageEmbedder,
} from './fixtures/gate-copy';
import { createVitestCameraStub } from './support/fake-camera';

function buildElements() {
  const cameraToggleBtn = document.createElement('button');
  cameraToggleBtn.dataset.labelStart = 'Start camera';
  cameraToggleBtn.dataset.labelStop = 'Stop camera';
  cameraToggleBtn.dataset.cameraState = 'idle';
  cameraToggleBtn.textContent = 'Start camera';
  cameraToggleBtn.setAttribute('aria-label', 'Start camera');
  const statusEl = document.createElement('p');
  const previewWrap = document.createElement('div');
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  return { cameraToggleBtn, statusEl, previewWrap, video, canvas };
}

describe('wireGatePreviewSession', () => {
  it('shows stop label after start succeeds and stops on second click', async () => {
    const els = buildElements();
    let onErrorCb: Parameters<Camera['onError']>[0] | undefined;
    let running = false;
    const fakeCamera = createVitestCameraStub({
      start: vi.fn(async () => {
        running = true;
      }),
      stop: vi.fn(() => {
        running = false;
      }),
      onError(cb: Parameters<Camera['onError']>[0]) {
        onErrorCb = cb;
        return () => {
          onErrorCb = undefined;
        };
      },
      onFrame: vi.fn(() => () => {}),
      getFrame: vi.fn(),
      isRunning: vi.fn(() => running),
    });

    const createCamera = vi.fn(() => fakeCamera);
    const defaultConstraints = {
      idealWidth: 640,
      idealHeight: 480,
      facingMode: 'user',
    };

    wireGatePreviewSession(els, {
      createCamera,
      getDefaultVideoConstraintsForCamera: () => defaultConstraints,
      getCameraUserFacingMessage: () => '',
      detectorLoadingMessage: testDetectorLoadingMessage,
      detectorLoadFailedMessage: testDetectorLoadFailedMessage,
      modelLoadStageDetectorLabel: testModelLoadStageDetector,
      modelLoadStageEmbedderLabel: testModelLoadStageEmbedder,
      modelLoadRetryLabel: testModelLoadRetry,
      noFaceMessage: 'No face',
      multiFaceMessage: 'Multiple faces',
      cooldownMs: 3000,
    });

    expect(createCamera).toHaveBeenCalledWith(els.video, els.canvas, { defaultConstraints });
    expect(onErrorCb).toBeTypeOf('function');

    els.cameraToggleBtn.click();
    await vi.waitFor(() => expect(fakeCamera.start).toHaveBeenCalled());
    await vi.waitFor(() => expect(els.cameraToggleBtn.textContent).toBe('Stop camera'));
    expect(els.cameraToggleBtn.dataset.cameraState).toBe('running');

    els.cameraToggleBtn.click();
    expect(fakeCamera.stop).toHaveBeenCalled();
    expect(els.cameraToggleBtn.textContent).toBe('Start camera');
    expect(els.cameraToggleBtn.dataset.cameraState).toBe('idle');
  });

  it('maps camera errors to status text', () => {
    const els = buildElements();
    let onErrorCb: Parameters<Camera['onError']>[0] | undefined;
    const fakeCamera = createVitestCameraStub({
      start: vi.fn(),
      stop: vi.fn(),
      onError(cb: Parameters<Camera['onError']>[0]) {
        onErrorCb = cb;
        return () => {
          onErrorCb = undefined;
        };
      },
      onFrame: vi.fn(() => () => {}),
      getFrame: vi.fn(),
      isRunning: vi.fn(() => false),
    });

    wireGatePreviewSession(els, {
      createCamera: () => fakeCamera,
      getDefaultVideoConstraintsForCamera: () => ({
        idealWidth: 640,
        idealHeight: 480,
        facingMode: 'user',
      }),
      getCameraUserFacingMessage: (code) =>
        code === 'permission-denied' ? 'Camera blocked' : 'other',
      detectorLoadingMessage: testDetectorLoadingMessage,
      detectorLoadFailedMessage: testDetectorLoadFailedMessage,
      modelLoadStageDetectorLabel: testModelLoadStageDetector,
      modelLoadStageEmbedderLabel: testModelLoadStageEmbedder,
      modelLoadRetryLabel: testModelLoadRetry,
      noFaceMessage: 'No face',
      multiFaceMessage: 'Multiple faces',
      cooldownMs: 3000,
    });

    onErrorCb?.(makeCameraError('permission-denied', 'nope'));
    expect(els.statusEl.textContent).toBe('Camera blocked');
  });

  it('defers camera.start until YOLO detector load finishes', async () => {
    let resolveLoad!: () => void;
    const loadPromise = new Promise<void>((r) => {
      resolveLoad = r;
    });
    const yoloDetector: YoloDetector = {
      load: () => loadPromise,
      infer: vi.fn().mockResolvedValue([]),
      dispose: vi.fn(),
    };

    const els = buildElements();
    const overlayCanvas = document.createElement('canvas');
    overlayCanvas.width = 16;
    overlayCanvas.height = 16;

    const fakeCamera = createVitestCameraStub();

    wireGatePreviewSession(
      { ...els, overlayCanvas },
      {
        createCamera: () => fakeCamera,
        getDefaultVideoConstraintsForCamera: () => ({
          idealWidth: 640,
          idealHeight: 480,
          facingMode: 'user',
        }),
        getCameraUserFacingMessage: () => '',
        yoloDetector,
        detectorLoadingMessage: testDetectorLoadingMessage,
        detectorLoadFailedMessage: testDetectorLoadFailedMessage,
        modelLoadStageDetectorLabel: testModelLoadStageDetector,
        modelLoadStageEmbedderLabel: testModelLoadStageEmbedder,
        modelLoadRetryLabel: testModelLoadRetry,
        noFaceMessage: 'No face',
        multiFaceMessage: 'Multiple faces',
        cooldownMs: 3000,
      },
    );

    els.cameraToggleBtn.click();
    expect(fakeCamera.start).not.toHaveBeenCalled();
    await Promise.resolve();
    await Promise.resolve();
    resolveLoad();
    await vi.waitFor(() => expect(fakeCamera.start).toHaveBeenCalled());
  });
});

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createCameraStartOptionsState } from '../src/app/camera-device-session';
import { runGatePreviewStartSequence } from '../src/app/gate-preview-start-sequence';
import type { GatePreviewElements, GatePreviewSessionDeps } from '../src/app/gate-session';
import type { DetectorGateState } from '../src/app/gate-session-detector-load';
import type { Camera } from '../src/app/camera';
import { createTestGateRuntime } from './support/create-test-gate-runtime';
import { createVitestCameraStub } from './support/fake-camera';

const { createDetectionPipelineMock } = vi.hoisted(() => ({
  createDetectionPipelineMock: vi.fn(() => vi.fn()),
}));
vi.mock('../src/app/detection-pipeline', () => ({
  createDetectionPipeline: createDetectionPipelineMock,
}));

vi.mock('../src/app/camera-resilient-start', () => ({
  startVideoCameraResilient: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../src/app/camera-device-session', async (importOriginal) => {
  const mod = await importOriginal<typeof import('../src/app/camera-device-session')>();
  return {
    ...mod,
    refreshVideoInputDeviceListAfterStart: vi.fn().mockResolvedValue(false),
  };
});

function minimalDetectorEmbedder() {
  const yolo = {
    load: vi.fn().mockResolvedValue(undefined),
    infer: vi.fn().mockResolvedValue([]),
    dispose: vi.fn().mockResolvedValue(undefined),
  };
  const face = {
    load: vi.fn().mockResolvedValue(undefined),
    infer: vi.fn().mockResolvedValue(new Float32Array(8)),
    dispose: vi.fn().mockResolvedValue(undefined),
  };
  return { yolo, face };
}

describe('runGatePreviewStartSequence', () => {
  beforeEach(() => {
    createDetectionPipelineMock.mockClear();
  });

  it('calls resolveLiveAccess and createDetectionPipeline when models are ready', async () => {
    const resolveLive = vi.fn(async (_el: unknown, d: GatePreviewSessionDeps) => d);
    const gateRt = createTestGateRuntime();
    const { yolo, face } = minimalDetectorEmbedder();
    const startOpts = createCameraStartOptionsState({
      getDefaultFacingMode: () => gateRt.defaultVideoConstraintsForCamera.facingMode,
      getSelectValueTrimmed: () => '',
    });
    const camera = createVitestCameraStub() as unknown as Camera;
    const statusEl = document.createElement('div');
    const overlay = document.createElement('canvas');
    overlay.width = 320;
    overlay.height = 240;
    const overlay2d = {
      clearRect: vi.fn(),
      drawImage: vi.fn(),
      getImageData: vi.fn(),
    } as unknown as CanvasRenderingContext2D;
    vi.spyOn(overlay, 'getContext').mockReturnValue(overlay2d);
    const elements = {
      statusEl,
      modelLoadRoot: statusEl,
      cameraToggleBtn: document.createElement('button'),
      cameraDeviceSelect: undefined,
      modelLoadUi: undefined,
      previewWrap: statusEl,
      video: document.createElement('video'),
      canvas: document.createElement('canvas'),
      overlayCanvas: overlay,
      decisionEl: statusEl,
    } as GatePreviewElements;
    const deps: GatePreviewSessionDeps = {
      getDefaultVideoConstraintsForCamera: () => gateRt.defaultVideoConstraintsForCamera,
      getCameraUserFacingMessage: () => '',
      yoloDetector: yolo as GatePreviewSessionDeps['yoloDetector'],
      faceEmbedder: face as GatePreviewSessionDeps['faceEmbedder'],
      createCamera: vi.fn(),
      logEmbeddingTimings: false,
      noFaceMessage: gateRt.noFaceMessage,
      multiFaceMessage: gateRt.multiFaceMessage,
      accessUiStrings: gateRt.gateAccessUiStrings,
      detectorLoadingMessage: gateRt.detectorLoadingMessage,
      detectorLoadFailedMessage: gateRt.detectorLoadFailedMessage,
      modelLoadStageDetectorLabel: gateRt.modelLoadStageDetectorLabel,
      modelLoadStageEmbedderLabel: gateRt.modelLoadStageEmbedderLabel,
      modelLoadRetryLabel: gateRt.modelLoadRetryLabel,
      cameraDefaultDeviceOption: gateRt.cameraDefaultDeviceOption,
      cameraSelectAriaLabel: gateRt.cameraSelectAriaLabel,
      formatUnnamedCamera: gateRt.formatUnnamedCamera,
      cooldownMs: gateRt.databaseSeedSettings.cooldownMs,
    };
    const state: DetectorGateState = {
      loadState: 'ready',
      embedderLoadState: 'ready',
    };

    await runGatePreviewStartSequence(
      {
        camera,
        elements,
        deps,
        state,
        getStartOptions: () => ({ facingMode: 'environment' }),
        startOpts,
        prefRead: null,
        deviceSelect: undefined,
        settingsRepo: undefined,
      },
      resolveLive,
    );

    expect(resolveLive).toHaveBeenCalled();
    expect(createDetectionPipelineMock).toHaveBeenCalled();
  });
});

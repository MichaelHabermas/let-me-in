import { GATE_CAMERA_PREFERENCE_KEY } from '../domain/camera-preference';
import type { Camera, CameraStartOptions } from './camera';
import { startVideoCameraResilient } from './camera-resilient-start';
import {
  refreshVideoInputDeviceListAfterStart,
  type createCameraStartOptionsState,
} from './camera-device-session';
import { createCooldown } from './cooldown';
import { createDetectionPipeline } from './detection-pipeline';
import { createLivenessCollector } from './liveness';
import { createE2eLivenessCollector } from './gate-e2e-doubles';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';
import type { DetectorGateState } from './gate-session-detector-load';
import { withLiveAccessDeps } from './gate-session-live-access';
import { readCameraPreference } from './camera-preference-persistence';

export type LiveAccessDepsResolver = (
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
) => Promise<GatePreviewSessionDeps>;

type StartOpts = ReturnType<typeof createCameraStartOptionsState>;

/**
 * Camera start, device list, and (when ready) detection + access pipeline — shared test hook via
 * `resolveLiveAccess` (default `withLiveAccessDeps`).
 */
/* eslint-disable max-lines-per-function -- one sequential start path */
export async function runGatePreviewStartSequence(
  args: {
    camera: Camera;
    elements: GatePreviewElements;
    deps: GatePreviewSessionDeps;
    state: DetectorGateState;
    getStartOptions: () => CameraStartOptions;
    startOpts: StartOpts;
    /** Same as `readCameraPreference(...)` in flight, or `null` when not used. */
    prefRead: ReturnType<typeof readCameraPreference> | null;
    deviceSelect: GatePreviewElements['cameraDeviceSelect'];
    settingsRepo: NonNullable<GatePreviewSessionDeps['persistence']>['settingsRepo'] | undefined;
  },
  resolveLiveAccess: LiveAccessDepsResolver = withLiveAccessDeps,
): Promise<void> {
  const {
    camera,
    elements,
    deps,
    state,
    getStartOptions,
    startOpts,
    prefRead,
    deviceSelect,
    settingsRepo,
  } = args;
  if (prefRead) {
    startOpts.setLoadedPreference((await prefRead) ?? undefined);
  }
  const attachDeps = await resolveLiveAccess(elements, deps);
  const d = deps.getDefaultVideoConstraintsForCamera();
  await startVideoCameraResilient(camera, getStartOptions, d.facingMode, async (fb) => {
    await startOpts.recoverFromStaleDevice(settingsRepo, GATE_CAMERA_PREFERENCE_KEY, fb);
  });

  if (deviceSelect) {
    const listed = await refreshVideoInputDeviceListAfterStart({
      camera,
      deviceSelect,
      settingsRepo,
      preferenceKey: GATE_CAMERA_PREFERENCE_KEY,
      defaultFacingForPreference: d.facingMode,
      firstSelectOptionLabel: deps.cameraDefaultDeviceOption,
      formatUnnamedForListIndex: (i) => deps.formatUnnamedCamera(i + 1),
    });
    if (listed) {
      startOpts.setListPopulated(true);
    }
  }

  const overlay = elements.overlayCanvas;
  const embedderReady = !attachDeps.faceEmbedder || state.embedderLoadState === 'ready';
  if (attachDeps.yoloDetector && overlay && state.loadState === 'ready' && embedderReady) {
    const overlayCtx = overlay.getContext('2d');
    if (overlayCtx) {
      state.stopPipeline?.();
      const cooldown = createCooldown(attachDeps.cooldownMs, () => performance.now());
      state.stopPipeline = createDetectionPipeline({
        camera,
        detector: attachDeps.yoloDetector,
        overlayCtx,
        overlayWidth: overlay.width,
        overlayHeight: overlay.height,
        faceEmbedder: attachDeps.faceEmbedder,
        logEmbeddingTimings: attachDeps.logEmbeddingTimings,
        statusEl: elements.statusEl,
        noFaceMessage: attachDeps.noFaceMessage,
        multiFaceMessage: attachDeps.multiFaceMessage,
        cooldown,
        livenessCollector:
          import.meta.env.VITE_E2E_STUB_GATE === 'true'
            ? createE2eLivenessCollector()
            : attachDeps.livenessConfig
              ? createLivenessCollector(attachDeps.livenessConfig)
              : undefined,
        livenessCheckingMessage: attachDeps.livenessCheckingMessage,
        livenessHoldStillMessage: attachDeps.livenessHoldStillMessage,
        evaluateDecision: attachDeps.evaluateDecision,
        appendAccessLog: attachDeps.appendAccessLog,
      });
    }
  }
}
/* eslint-enable max-lines-per-function */

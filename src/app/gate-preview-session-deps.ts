import type { GatePreviewSessionDeps } from './gate-session';
import type { GateRuntime } from './runtime-settings';

type DetectorFactories = Pick<
  GatePreviewSessionDeps,
  'createCamera' | 'yoloDetector' | 'faceEmbedder'
>;

/** Maps `GateRuntime` + detector/camera factories into `wireGatePreviewSession` deps (DRY). */
export function buildGatePreviewSessionDeps(
  rt: GateRuntime,
  factories: DetectorFactories,
  extras?: Partial<GatePreviewSessionDeps>,
): GatePreviewSessionDeps {
  return {
    ...factories,
    getDefaultVideoConstraintsForCamera: () => rt.getDefaultVideoConstraintsForCamera(),
    getCameraUserFacingMessage: (code) => rt.getCameraUserFacingMessage(code),
    logEmbeddingTimings: rt.devLogEmbeddingTimings,
    detectorLoadingMessage: rt.getDetectorLoadingMessage(),
    detectorLoadFailedMessage: rt.getDetectorLoadFailedMessage(),
    noFaceMessage: rt.getNoFaceMessage(),
    multiFaceMessage: rt.getMultiFaceMessage(),
    cooldownMs: rt.getDatabaseSeedSettings().cooldownMs,
    ...extras,
  };
}

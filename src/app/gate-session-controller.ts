import type { Camera } from './camera';
import { syncCameraToggleUi } from './gate-camera-toggle-ui';
import { createDetectorPipelineCoordinator } from './gate-detector-coordinator';
import { withLiveAccessDeps } from './gate-live-access-bootstrap';
import type { GatePreviewElements, GatePreviewSessionDeps } from './gate-session';

export function wireCameraControls(
  camera: Camera,
  elements: GatePreviewElements,
  deps: GatePreviewSessionDeps,
): () => void {
  const { cameraToggleBtn, statusEl } = elements;
  const loadingMsg = deps.detectorLoadingMessage;
  const failedMsg = deps.detectorLoadFailedMessage;
  const coord = createDetectorPipelineCoordinator({ elements, camera, statusEl });
  coord.beginModelLoad(deps, loadingMsg, failedMsg);

  const onStart = async () => {
    syncCameraToggleUi(cameraToggleBtn, 'loading');
    try {
      if (!(await coord.waitReady(deps, loadingMsg))) {
        syncCameraToggleUi(cameraToggleBtn, 'idle');
        return;
      }
      statusEl.textContent = '';
      const attachDeps = await withLiveAccessDeps(elements, deps);
      await camera.start();
      coord.attachRunningPipeline(attachDeps);
      syncCameraToggleUi(cameraToggleBtn, 'running');
    } catch {
      syncCameraToggleUi(cameraToggleBtn, 'idle');
    }
  };

  cameraToggleBtn.addEventListener('click', () => {
    if (camera.isRunning()) {
      coord.stopPipeline();
      camera.stop();
      syncCameraToggleUi(cameraToggleBtn, 'idle');
    } else {
      void onStart();
    }
  });

  return () => {
    coord.stopPipeline();
  };
}

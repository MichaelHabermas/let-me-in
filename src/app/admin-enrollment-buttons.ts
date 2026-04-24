import type { AdminEnrollmentDom } from './admin-enrollment-dom';
import type { EnrollmentController } from './enroll';
import type { GateRuntime } from './runtime-settings';

export function syncAdminEnrollmentButtons(
  dom: AdminEnrollmentDom,
  ctrl: EnrollmentController,
  rt: GateRuntime,
): void {
  const state = ctrl.getState();
  const camOn = ctrl.isCameraRunning();
  const showStart = state === 'idle' || (state === 'editing' && !camOn);
  const startLabel = rt.adminUiStrings.enrollStartCamera;
  const stopLabel = rt.cameraStopLabel;
  if (showStart) {
    dom.cameraToggleBtn.textContent = startLabel;
    dom.cameraToggleBtn.setAttribute('aria-label', startLabel);
    dom.cameraToggleBtn.className = 'btn btn--primary';
    dom.cameraToggleBtn.disabled = false;
  } else {
    dom.cameraToggleBtn.textContent = stopLabel;
    dom.cameraToggleBtn.setAttribute('aria-label', stopLabel);
    dom.cameraToggleBtn.className = 'btn btn--camera-stop';
    dom.cameraToggleBtn.disabled = state === 'saving';
  }
  dom.capBtn.disabled = state !== 'detecting';
  dom.retakeBtn.disabled = state !== 'editing' || !camOn;
  dom.saveBtn.disabled = state !== 'editing';
  dom.nameInput.disabled = state !== 'editing';
  dom.roleSelect.disabled = state !== 'editing';
}

import { syncAdminEnrollmentButtons } from './admin-enrollment-buttons';
import { fillEnrollmentRoleSelect } from './admin-enrollment-role-select';
import { bindEnrollUserSaveOnClick } from './admin-enrollment-enroll-save';
import type { AdminEnrollmentCaptureMount } from './admin-enrollment-ports';
import type { EnrollmentController } from './enroll';
import type { User } from '../domain/types';
import { ENROLL_CAMERA_PREFERENCE_KEY } from '../domain/camera-preference';
import type { DexiePersistence } from '../infra/persistence';
import { bindCameraDevicePreferenceChange } from './camera-device-session';
import type { GateRuntime } from './gate-runtime';

export type EnrollmentControllerRef = { ctrl: EnrollmentController | null };

export function createEnrollmentSyncHandlers(
  dom: AdminEnrollmentCaptureMount,
  rt: GateRuntime,
  enrollmentRef: EnrollmentControllerRef,
): { syncButtons: () => void; beginEdit: (user: User) => void } {
  const syncButtons = () => {
    const c = enrollmentRef.ctrl;
    if (c === null) return;
    syncAdminEnrollmentButtons(dom, c, rt);
  };

  const beginEdit = (user: User) => {
    const c = enrollmentRef.ctrl;
    if (c === null) return;
    const copy = rt.runtimeSlices.admin.ui;
    dom.nameInput.value = user.name;
    fillEnrollmentRoleSelect(dom.roleSelect, user.role, {
      enrollRolePlaceholder: copy.enrollRolePlaceholder,
      enrollRoleLegacySuffix: copy.enrollRoleLegacySuffix,
    });
    c.beginEditFromUser(user);
    syncButtons();
  };

  return { syncButtons, beginEdit };
}

/**
 * Camera toggle, capture/retake, device preference on change, and save — enrollment capture surface.
 */
export function bindAdminEnrollmentSessionUi(
  dom: AdminEnrollmentCaptureMount,
  ctrl: EnrollmentController,
  rt: GateRuntime,
  persistence: DexiePersistence,
  useStubEnrollment: boolean,
  syncButtons: () => void,
  refreshRoster: () => Promise<void>,
): void {
  dom.cameraToggleBtn.addEventListener('click', () => {
    const s = ctrl.getState();
    if (s === 'idle' || (s === 'editing' && !ctrl.isCameraRunning())) {
      void ctrl.startSession().catch(() => {});
    } else if (s !== 'saving') {
      ctrl.stopSession();
      syncButtons();
    }
  });
  dom.capBtn.addEventListener('click', () => {
    void ctrl.captureFace().then(() => syncButtons());
  });
  dom.retakeBtn.addEventListener('click', () => {
    ctrl.retake();
    syncButtons();
  });
  if (!useStubEnrollment) {
    bindCameraDevicePreferenceChange({
      deviceSelect: dom.cameraDeviceSelect,
      settingsRepo: persistence.settingsRepo,
      preferenceKey: ENROLL_CAMERA_PREFERENCE_KEY,
      defaultFacingMode: rt.defaultVideoConstraintsForCamera.facingMode,
      isCameraRunning: () => ctrl.isCameraRunning(),
      restartCamera: async () => {
        ctrl.stopSession();
        await ctrl.startSession();
      },
      onRestartError: () => {
        /* surface via controller */
      },
    });
  }
  bindEnrollUserSaveOnClick(dom, ctrl, rt, syncButtons, refreshRoster);
}

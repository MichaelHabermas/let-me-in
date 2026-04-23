import type { AdminAuth } from './auth';
import { renderAdminUserRoster } from './admin-user-roster';
import { fillEnrollmentRoleSelect } from './admin-enrollment-role-select';
import { createAdminEnrollmentDom, type AdminEnrollmentDom } from './admin-enrollment-dom';
import { createCamera } from './camera';
import { createEnrollmentController, type EnrollmentController } from './enroll';
import {
  createE2eEnrollmentCamera,
  createE2eEnrollmentDetector,
  createE2eEnrollmentEmbedder,
} from './enroll-e2e-doubles';
import { runBulkImport } from './bulk-import';
import { config, getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import { createFaceEmbedder } from '../infra/embedder-ort';
import { createYoloDetector } from '../infra/detector-ort';
import type { DexiePersistence } from '../infra/persistence';
import type { GateRuntime } from './runtime-settings';

export type MountAdminEnrollmentOptions = {
  root: HTMLElement;
  rt: GateRuntime;
  persistence: DexiePersistence;
  auth: AdminAuth;
  rerender: () => void;
};

function bindEnrollmentSaveClick(
  dom: AdminEnrollmentDom,
  ctrl: EnrollmentController,
  rt: GateRuntime,
  syncButtons: () => void,
  refreshRoster: () => Promise<void>,
): void {
  dom.saveBtn.addEventListener('click', () => {
    const name = dom.nameInput.value.trim();
    const ui = rt.getAdminUiStrings();
    if (!name) {
      dom.statusEl.textContent = ui.enrollNameRequired;
      return;
    }
    const role = dom.roleSelect.value.trim();
    if (!role) {
      dom.statusEl.textContent = ui.enrollRoleRequired;
      return;
    }
    const roleCopy = {
      enrollRolePlaceholder: ui.enrollRolePlaceholder,
      enrollRoleLegacySuffix: ui.enrollRoleLegacySuffix,
    };
    void ctrl
      .saveUser(name, role)
      .then(async () => {
        dom.statusEl.textContent = ui.enrollSuccess;
        dom.nameInput.value = '';
        fillEnrollmentRoleSelect(dom.roleSelect, '', roleCopy);
        syncButtons();
        await refreshRoster();
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.message : String(e);
        dom.statusEl.textContent = msg;
        syncButtons();
      });
  });
}

function bindEnrollmentUi(
  dom: AdminEnrollmentDom,
  ctrl: EnrollmentController,
  rt: GateRuntime,
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
  bindEnrollmentSaveClick(dom, ctrl, rt, syncButtons, refreshRoster);
}

function enrollmentControllerBase(
  dom: AdminEnrollmentDom,
  rt: GateRuntime,
  persistence: DexiePersistence,
  onStateChange: () => void,
) {
  return {
    video: dom.video,
    frameCanvas: dom.frameCanvas,
    overlayCanvas: dom.overlayCanvas,
    statusEl: dom.statusEl,
    getNoFaceMessage: () => rt.getNoFaceMessage(),
    getMultiFaceMessage: () => rt.getMultiFaceMessage(),
    persistence,
    onStateChange,
  };
}

/** Authenticated admin shell: roster + import + enrollment panel. */
/* eslint-disable max-lines-per-function -- composition: roster, import, enrollment FSM */
export function mountAuthenticatedAdminEnrollment(opts: MountAdminEnrollmentOptions): () => void {
  const { root, rt, persistence, auth, rerender } = opts;
  root.innerHTML = '';
  const dom = createAdminEnrollmentDom(rt);
  root.appendChild(dom.shell);

  let ctrl!: EnrollmentController;
  let revokeRosterUrls = () => {};

  const syncButtons = () => {
    const s = ctrl.getState();
    const camOn = ctrl.isCameraRunning();
    const showStart = s === 'idle' || (s === 'editing' && !camOn);
    const startLabel = rt.getAdminUiStrings().enrollStartCamera;
    const stopLabel = rt.getCameraStopLabel();
    if (showStart) {
      dom.cameraToggleBtn.textContent = startLabel;
      dom.cameraToggleBtn.setAttribute('aria-label', startLabel);
      dom.cameraToggleBtn.className = 'btn btn--primary';
      dom.cameraToggleBtn.disabled = false;
    } else {
      dom.cameraToggleBtn.textContent = stopLabel;
      dom.cameraToggleBtn.setAttribute('aria-label', stopLabel);
      dom.cameraToggleBtn.className = 'btn btn--camera-stop';
      dom.cameraToggleBtn.disabled = s === 'saving';
    }
    dom.capBtn.disabled = s !== 'detecting';
    dom.retakeBtn.disabled = s !== 'editing' || !camOn;
    dom.saveBtn.disabled = s !== 'editing';
    dom.nameInput.disabled = s !== 'editing';
    dom.roleSelect.disabled = s !== 'editing';
  };

  const refreshRoster = async () => {
    await persistence.initDatabase(rt.getDatabaseSeedSettings());
    revokeRosterUrls();
    const users = await persistence.usersRepo.toArray();
    const copy = rt.getAdminUiStrings();
    revokeRosterUrls = renderAdminUserRoster(dom.rosterTbody, users, copy, {
      onEdit: (user) => {
        dom.nameInput.value = user.name;
        fillEnrollmentRoleSelect(dom.roleSelect, user.role, {
          enrollRolePlaceholder: copy.enrollRolePlaceholder,
          enrollRoleLegacySuffix: copy.enrollRoleLegacySuffix,
        });
        ctrl.beginEditFromUser(user);
        syncButtons();
      },
      onDelete: (user) => {
        if (!window.confirm(copy.rosterDeleteConfirm)) return;
        void persistence.usersRepo.deleteWithAnonymization(user.id).then(async () => {
          await refreshRoster();
        });
      },
    });
  };

  dom.logoutBtn.addEventListener('click', () => {
    auth.logout();
    rerender();
  });

  const base = enrollmentControllerBase(dom, rt, persistence, syncButtons);
  ctrl = config.e2eStubEnrollment
    ? createEnrollmentController({
        ...base,
        camera: createE2eEnrollmentCamera(dom.frameCanvas.width, dom.frameCanvas.height),
        detector: createE2eEnrollmentDetector(),
        embedder: createE2eEnrollmentEmbedder(),
      })
    : createEnrollmentController({
        ...base,
        camera: createCamera(dom.video, dom.frameCanvas, {
          defaultConstraints: rt.getDefaultVideoConstraintsForCamera(),
        }),
        detector: createYoloDetector(getDetectorRuntimeSettings()),
        embedder: createFaceEmbedder(getEmbedderRuntimeSettings()),
      });

  syncButtons();
  bindEnrollmentUi(dom, ctrl, rt, syncButtons, refreshRoster);

  const onImportPick = () => {
    dom.importFileInput.click();
  };
  dom.importButton.addEventListener('click', onImportPick);

  const onImportFileChange = () => {
    const file = dom.importFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      void (async () => {
        dom.importStatusEl.textContent = '';
        const copy = rt.getAdminUiStrings();
        const res = await runBulkImport(persistence, text, {
          onProgress(current, total) {
            dom.importStatusEl.textContent = copy.rosterImportProgress
              .replaceAll('{current}', String(current))
              .replaceAll('{total}', String(total));
          },
          confirmDuplicateNames() {
            return Promise.resolve(window.confirm(copy.rosterImportConfirmDuplicates));
          },
        });
        if (!res.proceededAfterDuplicateConfirm) {
          dom.importFileInput.value = '';
          return;
        }
        dom.importStatusEl.textContent = copy.rosterImportDone;
        dom.importFileInput.value = '';
        await refreshRoster();
      })();
    };
    reader.readAsText(file);
  };
  dom.importFileInput.addEventListener('change', onImportFileChange);

  void refreshRoster();

  return () => {
    revokeRosterUrls();
    ctrl.dispose();
    dom.importButton.removeEventListener('click', onImportPick);
    dom.importFileInput.removeEventListener('change', onImportFileChange);
  };
}
/* eslint-enable max-lines-per-function */

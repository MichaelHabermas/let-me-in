import type { AdminAuth } from './auth';
import { bindAdminEnrollmentImportController } from './admin-enrollment-import-controller';
import { syncAdminEnrollmentButtons } from './admin-enrollment-buttons';
import { fillEnrollmentRoleSelect } from './admin-enrollment-role-select';
import { createAdminEnrollmentRosterController } from './admin-enrollment-roster-controller';
import { createAdminEnrollmentSessionController } from './admin-enrollment-session-factory';
import { createAdminEnrollmentDom, type AdminEnrollmentDom } from './admin-enrollment-dom';
import type { EnrollmentController } from './enroll';
import type { User } from '../domain/types';
import type { DexiePersistence } from '../infra/persistence';
import type { GateRuntime } from './runtime-settings';

export type MountAdminEnrollmentOptions = {
  root: HTMLElement;
  rt: GateRuntime;
  persistence: DexiePersistence;
  auth: AdminAuth;
  rerender: () => void;
  useStubEnrollment?: boolean;
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
    const ui = rt.adminUiStrings;
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

/**
 * Composes roster, CSV import, enrollment session, and button sync — single mount boundary.
 */
export function mountAuthenticatedAdminEnrollmentCoordinator(
  opts: MountAdminEnrollmentOptions,
): () => void {
  const { root, rt, persistence, auth, rerender, useStubEnrollment = false } = opts;
  root.innerHTML = '';
  const dom = createAdminEnrollmentDom(rt);
  root.appendChild(dom.shell);

  let ctrl!: EnrollmentController;

  const syncButtons = () => syncAdminEnrollmentButtons(dom, ctrl, rt);

  const beginEdit = (user: User) => {
    const copy = rt.adminUiStrings;
    dom.nameInput.value = user.name;
    fillEnrollmentRoleSelect(dom.roleSelect, user.role, {
      enrollRolePlaceholder: copy.enrollRolePlaceholder,
      enrollRoleLegacySuffix: copy.enrollRoleLegacySuffix,
    });
    ctrl.beginEditFromUser(user);
    syncButtons();
  };
  const roster = createAdminEnrollmentRosterController({ dom, rt, persistence, beginEdit });

  dom.logoutBtn.addEventListener('click', () => {
    auth.logout();
    rerender();
  });

  ctrl = createAdminEnrollmentSessionController({
    dom,
    rt,
    persistence,
    useStubEnrollment,
    onStateChange: syncButtons,
  });

  syncButtons();
  bindEnrollmentUi(dom, ctrl, rt, syncButtons, roster.refresh);
  const disposeImport = bindAdminEnrollmentImportController({
    dom,
    rt,
    persistence,
    refreshRoster: roster.refresh,
    useStubEnrollment,
  });

  void roster.refresh();

  return () => {
    roster.dispose();
    ctrl.dispose();
    disposeImport();
  };
}

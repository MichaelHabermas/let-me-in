import type { AdminAuth } from './auth';
import { syncAdminEnrollmentButtons } from './admin-enrollment-buttons';
import { fillEnrollmentRoleSelect } from './admin-enrollment-role-select';
import { createAdminEnrollmentSessionController } from './admin-enrollment-session-factory';
import { createAdminEnrollmentDom, type AdminEnrollmentDom } from './admin-enrollment-dom';
import type { EnrollmentController } from './enroll';
import type { User } from '../domain/types';
import type { DexiePersistence } from '../infra/persistence';
import { renderAdminUserRoster } from './admin-user-roster';
import { runBulkImport } from './bulk-import';
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

function createRosterController(params: {
  dom: AdminEnrollmentDom;
  rt: GateRuntime;
  persistence: DexiePersistence;
  beginEdit: (user: User) => void;
}): { refresh: () => Promise<void>; dispose: () => void } {
  const { dom, rt, persistence, beginEdit } = params;
  let revokeRosterUrls = () => {};
  const refresh = async () => {
    await persistence.initDatabase(rt.databaseSeedSettings!);
    revokeRosterUrls();
    const users = await persistence.usersRepo.toArray();
    const copy = rt.adminUiStrings;
    revokeRosterUrls = renderAdminUserRoster(dom.rosterTbody, users, copy, {
      onEdit: (user) => beginEdit(user),
      onDelete: (user) => {
        if (!window.confirm(copy.rosterDeleteConfirm)) return;
        void persistence.usersRepo.deleteWithAnonymization(user.id).then(async () => {
          await refresh();
        });
      },
    });
  };
  return { refresh, dispose: () => revokeRosterUrls() };
}

function bindImportController(params: {
  dom: AdminEnrollmentDom;
  rt: GateRuntime;
  persistence: DexiePersistence;
  refreshRoster: () => Promise<void>;
  useStubEnrollment: boolean;
}): () => void {
  const { dom, rt, persistence, refreshRoster, useStubEnrollment } = params;
  const onImportPick = () => dom.importFileInput.click();
  dom.importButton.addEventListener('click', onImportPick);
  const onImportFileChange = () => {
    const file = dom.importFileInput.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      void (async () => {
        dom.importStatusEl.textContent = '';
        const copy = rt.adminUiStrings;
        const res = await runBulkImport(persistence, text, {
          useStubEnrollment,
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
  return () => {
    dom.importButton.removeEventListener('click', onImportPick);
    dom.importFileInput.removeEventListener('change', onImportFileChange);
  };
}

/** Authenticated admin shell: roster + import + enrollment panel. */
export function mountAuthenticatedAdminEnrollment(opts: MountAdminEnrollmentOptions): () => void {
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
  const roster = createRosterController({ dom, rt, persistence, beginEdit });

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
  const disposeImport = bindImportController({
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

import { fillEnrollmentRoleSelect } from './admin-enrollment-role-select';
import type { AdminEnrollmentSaveFormPort } from './admin-enrollment-ports';
import type { EnrollmentController } from './enroll';
import type { GateRuntime } from './gate-runtime';

/**
 * Wires the Save button: validates name/role, calls `saveUser`, clears form, syncs roster.
 */
export function bindEnrollUserSaveOnClick(
  dom: AdminEnrollmentSaveFormPort,
  ctrl: EnrollmentController,
  rt: GateRuntime,
  syncButtons: () => void,
  refreshRoster: () => Promise<void>,
): () => void {
  const onSave = () => {
    const name = dom.nameInput.value.trim();
    const ui = rt.runtimeSlices.admin.ui;
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
  };
  dom.saveBtn.addEventListener('click', onSave);
  return () => dom.saveBtn.removeEventListener('click', onSave);
}

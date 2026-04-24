import type { AdminAuth } from './auth';
import { bindAdminEnrollmentImportController } from './admin-enrollment-import-controller';
import { createAdminEnrollmentRosterController } from './admin-enrollment-roster-controller';
import { createAdminEnrollmentSessionController } from './admin-enrollment-session-factory';
import { createAdminEnrollmentDom } from './admin-enrollment-dom';
import {
  bindAdminEnrollmentSessionUi,
  createEnrollmentSyncHandlers,
  type EnrollmentControllerRef,
} from './admin-enrollment-session-bindings';
import type { DexiePersistence } from '../infra/persistence';
import type { GateRuntime } from './gate-runtime';

export type MountAdminEnrollmentOptions = {
  root: HTMLElement;
  rt: GateRuntime;
  persistence: DexiePersistence;
  auth: AdminAuth;
  rerender: () => void;
  useStubEnrollment?: boolean;
};

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

  const enrollmentRef: EnrollmentControllerRef = { ctrl: null };
  const { syncButtons, beginEdit } = createEnrollmentSyncHandlers(dom, rt, enrollmentRef);
  const roster = createAdminEnrollmentRosterController({ dom, rt, persistence, beginEdit });

  dom.logoutBtn.addEventListener('click', () => {
    auth.logout();
    rerender();
  });

  enrollmentRef.ctrl = createAdminEnrollmentSessionController({
    dom,
    rt,
    persistence,
    useStubEnrollment,
    onStateChange: syncButtons,
  });
  const ctrl = enrollmentRef.ctrl;
  if (ctrl === null) {
    throw new Error('Enrollment controller failed to initialize');
  }

  syncButtons();
  bindAdminEnrollmentSessionUi(
    dom,
    ctrl,
    rt,
    persistence,
    useStubEnrollment,
    syncButtons,
    roster.refresh,
  );
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

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
import { bindAdminEnrollmentThresholdController } from './admin-enrollment-threshold-controller';
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

function createCoordinatorTeardown(params: {
  dom: ReturnType<typeof createAdminEnrollmentDom>;
  onLogout: () => void;
  abortController: AbortController;
  roster: ReturnType<typeof createAdminEnrollmentRosterController>;
  ctrl: NonNullable<EnrollmentControllerRef['ctrl']>;
  disposeSessionUi: () => void;
  disposeImport: () => void;
}): () => void {
  return () => {
    params.dom.logoutBtn.removeEventListener('click', params.onLogout);
    params.abortController.abort();
    params.roster.dispose();
    params.ctrl.dispose();
    params.disposeSessionUi();
    params.disposeImport();
  };
}

function wireEnrollmentSession(params: {
  dom: ReturnType<typeof createAdminEnrollmentDom>;
  enrollmentRef: EnrollmentControllerRef;
  rt: GateRuntime;
  persistence: DexiePersistence;
  useStubEnrollment: boolean;
  syncButtons: () => void;
  refreshRoster: () => Promise<void>;
}): { ctrl: NonNullable<EnrollmentControllerRef['ctrl']>; disposeSessionUi: () => void } {
  const ctrl = createAdminEnrollmentSessionController({
    dom: params.dom,
    rt: params.rt,
    persistence: params.persistence,
    useStubEnrollment: params.useStubEnrollment,
    onStateChange: params.syncButtons,
  });
  params.enrollmentRef.ctrl = ctrl;
  params.syncButtons();
  const disposeSessionUi = bindAdminEnrollmentSessionUi(
    params.dom,
    ctrl,
    params.rt,
    params.persistence,
    params.useStubEnrollment,
    params.syncButtons,
    params.refreshRoster,
  );
  return { ctrl, disposeSessionUi };
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

  const enrollmentRef: EnrollmentControllerRef = { ctrl: null };
  const { syncButtons, beginEdit } = createEnrollmentSyncHandlers(dom, rt, enrollmentRef);
  const roster = createAdminEnrollmentRosterController({ dom, rt, persistence, beginEdit });

  const onLogout = () => {
    auth.logout();
    rerender();
  };
  dom.logoutBtn.addEventListener('click', onLogout);

  const { ctrl, disposeSessionUi } = wireEnrollmentSession({
    dom,
    enrollmentRef,
    rt,
    persistence,
    useStubEnrollment,
    syncButtons,
    refreshRoster: roster.refresh,
  });
  const disposeImport = bindAdminEnrollmentImportController({
    dom,
    rt,
    persistence,
    refreshRoster: roster.refresh,
    useStubEnrollment,
  });

  const ac = new AbortController();
  const { signal } = ac;
  bindAdminEnrollmentThresholdController(dom, persistence, rt, signal);

  void roster.refresh();

  return createCoordinatorTeardown({
    dom,
    onLogout,
    abortController: ac,
    roster,
    ctrl,
    disposeSessionUi,
    disposeImport,
  });
}

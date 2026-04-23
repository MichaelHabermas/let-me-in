import { mountAdminLoginModal } from './admin-login-modal';
import { createAdminAuth, type AdminAuth } from './auth';
import { mountAuthenticatedAdminEnrollment } from './mount-admin-enrollment';
import { config } from '../config';
import { getDefaultPersistence, type DexiePersistence } from '../infra/persistence';
import { resolveGateRuntime, type GateRuntime } from './runtime-settings';

export type MountAdminPageOptions = {
  rt?: GateRuntime;
  persistence?: DexiePersistence;
  /** When omitted, uses `localStorage` and `config.admin`. */
  auth?: AdminAuth;
};

/**
 * Admin page composition root (Epic E6). Called from `bootstrapApp({ mount })`.
 */
export function mountAdminPage(options?: MountAdminPageOptions): void {
  const root = document.getElementById('app');
  if (!root) return;

  const rt = options?.rt ?? resolveGateRuntime();
  const persistence = options?.persistence ?? getDefaultPersistence();
  const auth =
    options?.auth ??
    createAdminAuth({
      storage: localStorage,
      nowMs: () => Date.now(),
      admin: config.admin,
    });
  document.title = rt.adminPageTitle;

  let teardownLogin: (() => void) | undefined;
  let teardownEnroll: (() => void) | undefined;

  const render = () => {
    teardownLogin?.();
    teardownEnroll?.();
    teardownLogin = undefined;
    teardownEnroll = undefined;
    root.innerHTML = '';

    if (!auth.isAdmin()) {
      const wrap = document.createElement('div');
      wrap.className = 'admin-root';
      root.appendChild(wrap);
      teardownLogin = mountAdminLoginModal(wrap, rt, auth, render);
      return;
    }

    teardownEnroll = mountAuthenticatedAdminEnrollment({
      root,
      rt,
      persistence,
      auth,
      rerender: render,
    });
  };

  render();
}

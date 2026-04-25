import { mountAdminLoginModal } from './admin-login-modal';
import { createAdminAuth, type AdminAuth } from './auth';
import { resolveAdminCredentialsForShell } from './admin-credentials';
import { mountAuthenticatedAdminEnrollmentCoordinator } from './admin-enrollment-mount-coordinator';
import { AppContextOptions, resolveAppContext } from './app-context';

export type MountAdminShellOptions = AppContextOptions & {
  /** When omitted, uses `localStorage` and credentials from {@link resolveAdminCredentialsForShell}. */
  auth?: AdminAuth;
  useStubEnrollment?: boolean;
};

/**
 * Admin app shell: login gate, enrollment when authenticated, `document.title`.
 * HTML entry resolves `#app` and calls this with the element.
 */
export function mountAdminShell(root: HTMLElement, options?: MountAdminShellOptions): void {
  const { rt, persistence } = resolveAppContext(options);
  const auth =
    options?.auth ??
    createAdminAuth({
      storage: localStorage,
      nowMs: () => Date.now(),
      admin: resolveAdminCredentialsForShell().admin,
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

    teardownEnroll = mountAuthenticatedAdminEnrollmentCoordinator({
      root,
      rt,
      persistence,
      auth,
      rerender: render,
      useStubEnrollment: options?.useStubEnrollment === true,
    });
  };

  render();
}

export function mountAdminView(options?: MountAdminShellOptions): void {
  const app = document.getElementById('app');
  if (!app) return;
  mountAdminShell(app, options);
}

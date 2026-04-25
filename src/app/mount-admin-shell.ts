import { mountAdminLoginModal } from './admin-login-modal';
import { createAdminAuth, type AdminAuth } from './auth';
import { mountAuthenticatedAdminEnrollmentCoordinator } from './admin-enrollment-mount-coordinator';
import { config } from '../config';
import { AppContextOptions, resolveAppContext } from './app-context';

export type MountAdminShellOptions = AppContextOptions & {
  /** When omitted, uses `localStorage` and `config.admin`. */
  auth?: AdminAuth;
  useStubEnrollment?: boolean;
};

/**
 * Admin app shell: login gate, enrollment when authenticated, `document.title`.
 * HTML entry resolves `#app` and calls this with the element.
 */
export function mountAdminShell(root: HTMLElement, options: Required<MountAdminShellOptions>): void {
  const { rt, persistence } = resolveAppContext(options);
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

export function mountAdminView(options: Required<MountAdminShellOptions>): void {
  const app = document.getElementById('app');
  if (!app) return;
  mountAdminShell(app, options);
}

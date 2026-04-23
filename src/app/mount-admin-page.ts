import { mountAdminShell, type MountAdminShellOptions } from './mount-admin-shell';

export type { MountAdminShellOptions as MountAdminPageOptions } from './mount-admin-shell';

/**
 * Admin page composition root (Epic E6). Called from `bootstrapApp({ mount })`.
 * Resolves `#app` and delegates to {@link mountAdminShell}.
 */
export function mountAdminPage(options?: MountAdminShellOptions): void {
  const root = document.getElementById('app');
  if (!root) return;
  mountAdminShell(root, options);
}

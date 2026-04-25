import type { AdminAuthCredentials } from './admin-auth-types';

export type AdminCredentialResolution = {
  source: 'env' | 'dev-default';
  admin: AdminAuthCredentials;
};

const DEV_DEFAULT: AdminAuthCredentials = { user: 'admin', pass: 'admin' };

/**
 * Admin sign-in only — not bundled in gate/main or log entry points. Production builds
 * require `VITE_ADMIN_USER` and `VITE_ADMIN_PASS` at build time; dev falls back to a
 * documented default with a console warning.
 */
export function resolveAdminCredentialsForShell(): AdminCredentialResolution {
  const userRaw = import.meta.env.VITE_ADMIN_USER as string | undefined;
  const passRaw = import.meta.env.VITE_ADMIN_PASS as string | undefined;
  const user = userRaw?.trim() ?? '';
  const pass = passRaw ?? '';
  if (user.length > 0 && pass.length > 0) {
    return { source: 'env', admin: { user, pass } };
  }

  if (import.meta.env.PROD) {
    throw new Error(
      '[Gatekeeper] Production admin requires VITE_ADMIN_USER and VITE_ADMIN_PASS at build time. Set both to non-empty values in your environment (see README).',
    );
  }

  console.warn(
    '[Gatekeeper] No VITE_ADMIN_USER/VITE_ADMIN_PASS set — using dev-default credentials. Do NOT use in production.',
  );
  return { source: 'dev-default', admin: DEV_DEFAULT };
}

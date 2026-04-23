/** Shared admin credential shape — kept out of `auth.ts` so `config` does not import auth implementation. */

export type AdminAuthCredentials = {
  user: string;
  pass: string;
};

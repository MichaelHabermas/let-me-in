/**
 * Canonical enrollment roles — edit this list to add or rename product roles.
 * Matching is case-insensitive; stored values use the casing defined here.
 */
export const USER_ROLES = ['Staff', 'Visitor', 'Contractor'] as const;

export type UserRole = (typeof USER_ROLES)[number];

/** Returns the canonical role string, or null if no match (trimmed, case-insensitive). */
export function resolveUserRole(raw: string): UserRole | null {
  const t = raw.trim();
  if (!t) return null;
  const lower = t.toLowerCase();
  for (const r of USER_ROLES) {
    if (r.toLowerCase() === lower) return r;
  }
  return null;
}

export function formatAllowedRolesHint(): string {
  return USER_ROLES.join(', ');
}

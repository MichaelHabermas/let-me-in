import { resolveUserRole, USER_ROLES } from '../domain/user-roles';

/** Strings needed to build the enrollment role `<select>`. */
export type RoleSelectCopy = {
  enrollRolePlaceholder: string;
  enrollRoleLegacySuffix: string;
};

/** Repopulates role options; selects `currentRole` (canonical or legacy). */
export function fillEnrollmentRoleSelect(
  select: HTMLSelectElement,
  currentRole: string,
  copy: RoleSelectCopy,
): void {
  select.replaceChildren();
  const ph = document.createElement('option');
  ph.value = '';
  ph.textContent = copy.enrollRolePlaceholder;
  select.appendChild(ph);
  for (const r of USER_ROLES) {
    const opt = document.createElement('option');
    opt.value = r;
    opt.textContent = r;
    select.appendChild(opt);
  }
  const t = currentRole.trim();
  const canon = resolveUserRole(t);
  if (canon) {
    select.value = canon;
    return;
  }
  if (t) {
    const leg = document.createElement('option');
    leg.value = t;
    leg.textContent = `${t}${copy.enrollRoleLegacySuffix}`;
    select.appendChild(leg);
    select.value = t;
    return;
  }
  select.value = '';
}

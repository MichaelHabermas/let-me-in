import type { User } from '../domain/types';
import type { DexiePersistence } from '../infra/persistence';
import { renderAdminUserRoster } from './admin-user-roster';
import type { AdminEnrollmentDom } from './admin-enrollment-dom';
import type { GateRuntime } from './runtime-settings';

export function createAdminEnrollmentRosterController(params: {
  dom: AdminEnrollmentDom;
  rt: GateRuntime;
  persistence: DexiePersistence;
  beginEdit: (user: User) => void;
}): { refresh: () => Promise<void>; dispose: () => void } {
  const { dom, rt, persistence, beginEdit } = params;
  let revokeRosterUrls = () => {};

  const refresh = async () => {
    await persistence.initDatabase(rt.getDatabaseSeedSettings());
    revokeRosterUrls();
    const users = await persistence.usersRepo.toArray();
    const copy = rt.getAdminUiStrings();
    revokeRosterUrls = renderAdminUserRoster(dom.rosterTbody, users, copy, {
      onEdit: (user) => beginEdit(user),
      onDelete: (user) => {
        if (!window.confirm(copy.rosterDeleteConfirm)) return;
        void persistence.usersRepo.deleteWithAnonymization(user.id).then(async () => {
          await refresh();
        });
      },
    });
  };

  return {
    refresh,
    dispose() {
      revokeRosterUrls();
    },
  };
}

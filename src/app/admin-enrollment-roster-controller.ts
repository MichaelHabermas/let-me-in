import type { User } from '../domain/types';
import type { DexiePersistence } from '../infra/persistence';
import { renderAdminUserRoster } from './admin-user-roster';
import type { AdminEnrollmentRosterDomPort } from './admin-enrollment-ports';
import type { GateRuntime } from './gate-runtime';

export function createAdminEnrollmentRosterController(params: {
  dom: AdminEnrollmentRosterDomPort;
  rt: GateRuntime;
  persistence: DexiePersistence;
  beginEdit: (user: User) => void;
}): { refresh: () => Promise<void>; dispose: () => void } {
  const { dom, rt, persistence, beginEdit } = params;
  let revokeRosterUrls = () => {};

  const refresh = async () => {
    await persistence.initDatabase(rt.databaseSeedSettings);
    revokeRosterUrls();
    const users = await persistence.usersRepo.toArray();
    const copy = rt.runtimeSlices.admin.ui;
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

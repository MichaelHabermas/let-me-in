import type { DexiePersistence, PersistenceProvider } from '../infra/persistence';
import { resolvePersistence } from '../infra/persistence';
import { accessLogToCsv, downloadAccessLogCsv } from './csv-export';
import { createLogPageController } from './log-page-controller';
import {
  appendUserFilterOptions,
  buildLogTable,
  buildLogToolbar,
  createUserNameMap,
} from './log-page-dom';
import type { GateRuntime } from './runtime-settings';
import { resolveGateRuntime } from './runtime-settings';

/**
 * Full access log: filters, sortable columns, all rows (no 20-row cap).
 */
export async function mountLogPageIntoApp(
  app: HTMLElement,
  options: { persistence: DexiePersistence; rt: GateRuntime },
): Promise<void> {
  const { persistence, rt } = options;
  const { unknown, logExportCsv } = rt.logPageStrings;

  const [rows, users] = await Promise.all([
    persistence.accessLogRepo.toArray(),
    persistence.usersRepo.toArray(),
  ]);

  app.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'page page--log';

  const h1 = document.createElement('h1');
  h1.className = 'page__title';
  h1.textContent = `${rt.orgName} — Entry log`;

  const userNames = createUserNameMap(users);

  const controls = buildLogToolbar(unknown, logExportCsv);
  appendUserFilterOptions(controls.userSelect, users);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'log-table-wrap';

  let controller: ReturnType<typeof createLogPageController> | null = null;
  const { table, tbody } = buildLogTable((key) => controller?.onSortHeaderClick(key));
  tableWrap.appendChild(table);

  controller = createLogPageController({
    rows,
    users,
    unknown,
    tbody,
    controls,
    userNames,
  });

  const onFilter = () => controller.render();
  controls.dateFrom.addEventListener('change', onFilter);
  controls.dateTo.addEventListener('change', onFilter);
  controls.userSelect.addEventListener('change', onFilter);
  controls.decisionSelect.addEventListener('change', onFilter);

  controls.exportBtn.addEventListener('click', () => {
    const csv = accessLogToCsv(rows, users, unknown);
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    downloadAccessLogCsv(csv, `gatekeeper-log-${y}${m}${day}`);
  });

  main.append(h1, controls.toolbar, tableWrap);
  app.appendChild(main);
  controller.render();
}

export type MountLogViewOptions = {
  persistence?: DexiePersistence;
  persistenceProvider?: PersistenceProvider;
};

export function mountLogView(options?: MountLogViewOptions): void {
  const app = document.getElementById('app');
  if (!app) return;
  const rt = resolveGateRuntime();
  document.title = rt.logPageTitle;
  const persistence = resolvePersistence({
    persistence: options?.persistence,
    provider: options?.persistenceProvider,
  });
  void mountLogPageIntoApp(app, { persistence, rt });
}

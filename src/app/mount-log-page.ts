import type { DexiePersistence, PersistenceProvider } from '../infra/persistence';
import { accessLogToCsv, downloadAccessLogCsv } from './csv-export';
import { createAccessLogReviewService } from './access-log-review-service';
import { createLogPageController } from './log-page-controller';
import {
  appendUserFilterOptions,
  buildLogTable,
  buildLogToolbar,
  createUserNameMap,
} from './log-page-dom';
import type { GateRuntime } from './gate-runtime';
import { resolveAppContext } from './app-context';

function createLogPageTitle(rt: GateRuntime): HTMLHeadingElement {
  const h1 = document.createElement('h1');
  h1.className = 'page__title';
  h1.textContent = `${rt.orgName} — Entry log`;
  return h1;
}

function createExportHandler(
  rows: Awaited<ReturnType<DexiePersistence['accessLogRepo']['toArray']>>,
  users: Awaited<ReturnType<DexiePersistence['usersRepo']['toArray']>>,
  unknown: string,
) {
  return () => {
    const csv = accessLogToCsv(rows, users, unknown);
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    downloadAccessLogCsv(csv, `gatekeeper-log-${y}${m}${day}`);
  };
}

/**
 * Full access log: filters, sortable columns, all rows (no 20-row cap).
 */
export async function mountLogPageIntoApp(
  app: HTMLElement,
  options: { persistence: DexiePersistence; rt: GateRuntime },
): Promise<() => void> {
  const { persistence, rt } = options;
  const { unknown, logExportCsv } = rt.logPageStrings;

  const [rows, users] = await Promise.all([
    persistence.accessLogRepo.toArray(),
    persistence.usersRepo.toArray(),
  ]);

  app.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'page page--log';
  const h1 = createLogPageTitle(rt);

  const userNames = createUserNameMap(users);

  const controls = buildLogToolbar(unknown, logExportCsv);
  appendUserFilterOptions(controls.userSelect, users);

  const tableWrap = document.createElement('div');
  tableWrap.className = 'log-table-wrap';

  let controller: ReturnType<typeof createLogPageController> | null = null;
  const reviewService = createAccessLogReviewService(persistence);
  const { table, tbody } = buildLogTable((key) => controller?.onSortHeaderClick(key));
  tableWrap.appendChild(table);

  controller = createLogPageController({
    rows,
    users,
    unknown,
    tbody,
    controls,
    userNames,
    reviewService,
  });

  const onFilter = () => controller.render();
  controls.dateFrom.addEventListener('change', onFilter);
  controls.dateTo.addEventListener('change', onFilter);
  controls.userSelect.addEventListener('change', onFilter);
  controls.decisionSelect.addEventListener('change', onFilter);
  controls.reviewSelect.addEventListener('change', onFilter);

  const onExportClick = createExportHandler(rows, users, unknown);
  controls.exportBtn.addEventListener('click', onExportClick);

  main.append(h1, controls.toolbar, tableWrap);
  app.appendChild(main);
  controller.render();
  return () => {
    controls.dateFrom.removeEventListener('change', onFilter);
    controls.dateTo.removeEventListener('change', onFilter);
    controls.userSelect.removeEventListener('change', onFilter);
    controls.decisionSelect.removeEventListener('change', onFilter);
    controls.reviewSelect.removeEventListener('change', onFilter);
    controls.exportBtn.removeEventListener('click', onExportClick);
  };
}

export type MountLogViewOptions = {
  persistence?: DexiePersistence;
  persistenceProvider?: PersistenceProvider;
};

export function mountLogView(options?: MountLogViewOptions): void {
  const app = document.getElementById('app');
  if (!app) return;
  const { rt, persistence } = resolveAppContext({
    persistence: options?.persistence,
    persistenceProvider: options?.persistenceProvider,
  });
  document.title = rt.logPageTitle;
  void mountLogPageIntoApp(app, { persistence, rt });
}

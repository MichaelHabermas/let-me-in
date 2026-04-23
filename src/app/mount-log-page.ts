import { config } from '../config';
import type { DexiePersistence } from '../infra/persistence';
import type { GateRuntime } from './runtime-settings';

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

/**
 * Renders the latest 20 access log rows (newest first) into `#app`.
 */
export async function mountLogPageIntoApp(
  app: HTMLElement,
  options: { persistence: DexiePersistence; rt: GateRuntime },
): Promise<void> {
  const { persistence, rt } = options;
  const unknown = config.ui.strings.unknown;

  const [rows, users] = await Promise.all([
    persistence.accessLogRepo.toArray(),
    persistence.usersRepo.toArray(),
  ]);
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const sorted = [...rows].sort((a, b) => b.timestamp - a.timestamp).slice(0, 20);

  app.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'page page--log';

  const h1 = document.createElement('h1');
  h1.className = 'page__title';
  h1.textContent = `${rt.orgName} — Entry log`;

  const tableWrap = document.createElement('div');
  tableWrap.className = 'log-table-wrap';

  const table = document.createElement('table');
  table.className = 'log-table';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const label of ['Time', 'User', 'Similarity', 'Decision']) {
    const th = document.createElement('th');
    th.textContent = label;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  const tbody = document.createElement('tbody');

  for (const row of sorted) {
    const tr = document.createElement('tr');
    const tdTime = document.createElement('td');
    tdTime.textContent = formatTimestamp(row.timestamp);
    const tdUser = document.createElement('td');
    tdUser.textContent =
      row.userId === null ? unknown : (nameById.get(row.userId) ?? unknown);
    const tdSim = document.createElement('td');
    tdSim.textContent = `${Math.round(row.similarity01 * 100)}%`;
    const tdDec = document.createElement('td');
    tdDec.textContent = row.decision;
    tr.append(tdTime, tdUser, tdSim, tdDec);
    tbody.appendChild(tr);
  }

  table.append(thead, tbody);
  tableWrap.appendChild(table);
  main.append(h1, tableWrap);
  app.appendChild(main);
}

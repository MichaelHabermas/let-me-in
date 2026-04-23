import { config } from '../config';
import type { DexiePersistence } from '../infra/persistence';
import { accessLogToCsv, downloadAccessLogCsv } from './csv-export';
import type { GateRuntime } from './runtime-settings';
import { filterAndSortLogRows, type LogFilterState, type LogSortKey } from './log-page-table';

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

/* eslint-disable max-lines-per-function -- DOM toolbar builder */
function buildToolbar(unknown: string): {
  toolbar: HTMLElement;
  dateFrom: HTMLInputElement;
  dateTo: HTMLInputElement;
  userSelect: HTMLSelectElement;
  decisionSelect: HTMLSelectElement;
  exportBtn: HTMLButtonElement;
} {
  const toolbar = document.createElement('div');
  toolbar.className = 'log-toolbar';
  toolbar.setAttribute('data-testid', 'log-toolbar');

  const dfWrap = document.createElement('label');
  dfWrap.className = 'log-toolbar__field';
  dfWrap.textContent = 'From ';
  const dateFrom = document.createElement('input');
  dateFrom.type = 'date';
  dateFrom.setAttribute('data-testid', 'log-filter-date-from');
  dfWrap.appendChild(dateFrom);

  const dtWrap = document.createElement('label');
  dtWrap.className = 'log-toolbar__field';
  dtWrap.textContent = 'To ';
  const dateTo = document.createElement('input');
  dateTo.type = 'date';
  dateTo.setAttribute('data-testid', 'log-filter-date-to');
  dtWrap.appendChild(dateTo);

  const userWrap = document.createElement('label');
  userWrap.className = 'log-toolbar__field';
  userWrap.textContent = 'User ';
  const userSelect = document.createElement('select');
  userSelect.setAttribute('data-testid', 'log-filter-user');
  const optAll = document.createElement('option');
  optAll.value = '';
  optAll.textContent = 'All';
  const optUnknown = document.createElement('option');
  optUnknown.value = '__null__';
  optUnknown.textContent = unknown;
  userSelect.append(optAll, optUnknown);
  userWrap.appendChild(userSelect);

  const decWrap = document.createElement('label');
  decWrap.className = 'log-toolbar__field';
  decWrap.textContent = 'Decision ';
  const decisionSelect = document.createElement('select');
  decisionSelect.setAttribute('data-testid', 'log-filter-decision');
  for (const [val, label] of [
    ['', 'All'],
    ['GRANTED', 'GRANTED'],
    ['UNCERTAIN', 'UNCERTAIN'],
    ['DENIED', 'DENIED'],
  ] as const) {
    const o = document.createElement('option');
    o.value = val;
    o.textContent = label;
    decisionSelect.appendChild(o);
  }
  decWrap.appendChild(decisionSelect);

  const exportBtn = document.createElement('button');
  exportBtn.type = 'button';
  exportBtn.className = 'log-toolbar__export';
  exportBtn.setAttribute('data-testid', 'log-export-csv');
  exportBtn.textContent = config.ui.strings.logExportCsv;

  toolbar.append(dfWrap, dtWrap, userWrap, decWrap, exportBtn);
  return { toolbar, dateFrom, dateTo, userSelect, decisionSelect, exportBtn };
}
/* eslint-enable max-lines-per-function */

function buildTableHead(onHeaderClick: (key: LogSortKey) => void): {
  table: HTMLTableElement;
  tbody: HTMLTableSectionElement;
} {
  const table = document.createElement('table');
  table.className = 'log-table';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  const headers: { key: LogSortKey; label: string }[] = [
    { key: 'timestamp', label: 'Time' },
    { key: 'user', label: 'User' },
    { key: 'similarity', label: 'Similarity' },
    { key: 'decision', label: 'Decision' },
  ];
  for (const { key, label } of headers) {
    const th = document.createElement('th');
    th.textContent = label;
    th.setAttribute('data-testid', `log-sort-${key}`);
    th.style.cursor = 'pointer';
    th.addEventListener('click', () => onHeaderClick(key));
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  const tbody = document.createElement('tbody');
  tbody.setAttribute('data-testid', 'log-table-body');
  table.append(thead, tbody);
  return { table, tbody };
}

/**
 * Full access log: filters, sortable columns, all rows (no 20-row cap).
 */
/* eslint-disable max-lines-per-function -- composition: load data, toolbar, table, handlers */
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

  app.innerHTML = '';
  const main = document.createElement('main');
  main.className = 'page page--log';

  const h1 = document.createElement('h1');
  h1.className = 'page__title';
  h1.textContent = `${rt.orgName} — Entry log`;

  const filters: LogFilterState = { dateFrom: '', dateTo: '', userId: '', decision: '' };
  let sortKey: LogSortKey = 'timestamp';
  let sortAsc = false;

  const { toolbar, dateFrom, dateTo, userSelect, decisionSelect, exportBtn } =
    buildToolbar(unknown);

  for (const u of users.sort((a, b) => a.name.localeCompare(b.name))) {
    const o = document.createElement('option');
    o.value = u.id;
    o.textContent = u.name;
    userSelect.appendChild(o);
  }

  const tableWrap = document.createElement('div');
  tableWrap.className = 'log-table-wrap';

  const onHeaderClick = (key: LogSortKey) => {
    if (sortKey === key) {
      sortAsc = !sortAsc;
    } else {
      sortKey = key;
      sortAsc = key === 'timestamp' ? false : true;
    }
    renderBody();
  };

  const { table, tbody } = buildTableHead(onHeaderClick);
  tableWrap.appendChild(table);

  const renderBody = () => {
    filters.dateFrom = dateFrom.value;
    filters.dateTo = dateTo.value;
    filters.userId = userSelect.value;
    filters.decision = decisionSelect.value as LogFilterState['decision'];
    const sorted = filterAndSortLogRows(rows, users, filters, sortKey, sortAsc, unknown);
    tbody.replaceChildren();
    for (const row of sorted) {
      const tr = document.createElement('tr');
      const tdTime = document.createElement('td');
      tdTime.textContent = formatTimestamp(row.timestamp);
      const tdUser = document.createElement('td');
      tdUser.textContent =
        row.userId === null ? unknown : (users.find((u) => u.id === row.userId)?.name ?? unknown);
      const tdSim = document.createElement('td');
      tdSim.textContent = `${Math.round(row.similarity01 * 100)}%`;
      const tdDec = document.createElement('td');
      tdDec.textContent = row.decision;
      tr.append(tdTime, tdUser, tdSim, tdDec);
      tbody.appendChild(tr);
    }
  };

  const onFilter = () => renderBody();
  dateFrom.addEventListener('change', onFilter);
  dateTo.addEventListener('change', onFilter);
  userSelect.addEventListener('change', onFilter);
  decisionSelect.addEventListener('change', onFilter);

  exportBtn.addEventListener('click', () => {
    const csv = accessLogToCsv(rows, users, unknown);
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    downloadAccessLogCsv(csv, `gatekeeper-log-${y}${m}${day}`);
  });

  main.append(h1, toolbar, tableWrap);
  app.appendChild(main);
  renderBody();
}
/* eslint-enable max-lines-per-function */

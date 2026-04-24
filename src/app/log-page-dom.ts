import type { AccessLogRow, User } from '../domain/types';
import type { LogSortKey } from './log-page-table';

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

export type LogToolbarControls = {
  toolbar: HTMLElement;
  dateFrom: HTMLInputElement;
  dateTo: HTMLInputElement;
  userSelect: HTMLSelectElement;
  decisionSelect: HTMLSelectElement;
  exportBtn: HTMLButtonElement;
};

/* eslint-disable max-lines-per-function -- DOM toolbar builder */
export function buildLogToolbar(unknown: string, exportLabel: string): LogToolbarControls {
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
  exportBtn.textContent = exportLabel;

  toolbar.append(dfWrap, dtWrap, userWrap, decWrap, exportBtn);
  return { toolbar, dateFrom, dateTo, userSelect, decisionSelect, exportBtn };
}
/* eslint-enable max-lines-per-function */

export function buildLogTable(onHeaderClick: (key: LogSortKey) => void): {
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

export function appendUserFilterOptions(userSelect: HTMLSelectElement, users: User[]): void {
  for (const user of users.sort((a, b) => a.name.localeCompare(b.name))) {
    const o = document.createElement('option');
    o.value = user.id;
    o.textContent = user.name;
    userSelect.appendChild(o);
  }
}

export function createUserNameMap(users: User[]): Map<string, string> {
  return new Map(users.map((user) => [user.id, user.name]));
}

export function renderLogRows(
  tbody: HTMLTableSectionElement,
  rows: AccessLogRow[],
  userNames: Map<string, string>,
  unknown: string,
): void {
  tbody.replaceChildren();
  for (const row of rows) {
    const tr = document.createElement('tr');
    const tdTime = document.createElement('td');
    tdTime.textContent = formatTimestamp(row.timestamp);
    const tdUser = document.createElement('td');
    tdUser.textContent = row.userId === null ? unknown : (userNames.get(row.userId) ?? unknown);
    const tdSim = document.createElement('td');
    tdSim.textContent = `${Math.round(row.similarity01 * 100)}%`;
    const tdDec = document.createElement('td');
    tdDec.textContent = row.decision;
    tr.append(tdTime, tdUser, tdSim, tdDec);
    tbody.appendChild(tr);
  }
}

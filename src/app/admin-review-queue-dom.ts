/** DOM factory for the review queue section and individual review rows. */

import type { AccessLogRow, ReviewedDecision } from '../infra/persistence';

export function buildReviewQueueSection(): {
  section: HTMLElement;
  tbody: HTMLTableSectionElement;
  refreshBtn: HTMLButtonElement;
  statusEl: HTMLElement;
  pendingCountBadgeEl: HTMLSpanElement;
} {
  const section = document.createElement('section');
  section.className = 'admin-review-queue';
  section.setAttribute('data-testid', 'admin-review-queue');

  const head = document.createElement('div');
  head.className = 'admin-review-queue__head';

  const h2 = document.createElement('h2');
  h2.className = 'admin-review-queue__title';
  h2.textContent = 'Review inbox';

  const pendingCountBadgeEl = document.createElement('span');
  pendingCountBadgeEl.className = 'admin-review-queue__pending-badge';
  pendingCountBadgeEl.setAttribute('data-testid', 'admin-review-queue-pending-badge');
  pendingCountBadgeEl.dataset.visible = 'false';
  pendingCountBadgeEl.textContent = '0';

  const statusEl = document.createElement('p');
  statusEl.className = 'admin-review-queue__status';
  statusEl.setAttribute('data-testid', 'admin-review-queue-status');

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'btn';
  refreshBtn.textContent = 'Refresh';
  refreshBtn.setAttribute('data-testid', 'admin-review-queue-refresh');

  head.append(h2, pendingCountBadgeEl, statusEl, refreshBtn);

  const wrap = document.createElement('div');
  wrap.className = 'admin-review-queue__table-wrap';
  const table = document.createElement('table');
  table.className = 'admin-review-queue__table';
  const thead = document.createElement('thead');
  const hr = document.createElement('tr');
  for (const label of ['Time', 'Decision', 'Similarity', 'Review']) {
    const th = document.createElement('th');
    th.textContent = label;
    hr.appendChild(th);
  }
  thead.appendChild(hr);
  const tbody = document.createElement('tbody');
  tbody.setAttribute('data-testid', 'admin-review-queue-tbody');
  table.append(thead, tbody);
  wrap.appendChild(table);

  section.append(head, wrap);
  return { section, tbody, refreshBtn, statusEl, pendingCountBadgeEl };
}

export function buildReviewRow(
  row: AccessLogRow,
  onReview: (timestamp: number, reviewedDecision: ReviewedDecision) => void,
  signal: AbortSignal,
): { tr: HTMLTableRowElement } {
  const tr = document.createElement('tr');

  const tdTime = document.createElement('td');
  try {
    tdTime.textContent = new Date(row.timestamp).toLocaleString();
  } catch {
    tdTime.textContent = String(row.timestamp);
  }

  const tdDecision = document.createElement('td');
  tdDecision.textContent = row.decision;

  const tdSimilarity = document.createElement('td');
  tdSimilarity.textContent = `${Math.round(row.similarity01 * 100)}%`;

  const tdActions = document.createElement('td');
  const grantBtn = document.createElement('button');
  grantBtn.type = 'button';
  grantBtn.className = 'btn btn--primary';
  grantBtn.textContent = 'Should grant';
  grantBtn.setAttribute('data-testid', `admin-review-grant-${row.timestamp}`);
  grantBtn.addEventListener('click', () => onReview(row.timestamp, 'GRANTED'), { signal });

  const denyBtn = document.createElement('button');
  denyBtn.type = 'button';
  denyBtn.className = 'btn';
  denyBtn.textContent = 'Should deny';
  denyBtn.setAttribute('data-testid', `admin-review-deny-${row.timestamp}`);
  denyBtn.addEventListener('click', () => onReview(row.timestamp, 'DENIED'), { signal });

  tdActions.append(grantBtn, denyBtn);
  tr.append(tdTime, tdDecision, tdSimilarity, tdActions);
  return { tr };
}

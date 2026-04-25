import type { AccessLogRow, Decision, User } from '../domain/types';

export type LogSortKey = 'timestamp' | 'user' | 'similarity' | 'decision';

export type LogFilterState = {
  dateFrom: string;
  dateTo: string;
  userId: string;
  decision: '' | Decision;
  review: '' | 'REVIEWED' | 'UNREVIEWED';
};

export function dayRangeToMs(
  dateFrom: string,
  dateTo: string,
): { fromMs: number; toMs: number } | null {
  if (!dateFrom.trim() || !dateTo.trim()) return null;
  const fromMs = new Date(`${dateFrom}T00:00:00`).getTime();
  const toMs = new Date(`${dateTo}T23:59:59.999`).getTime();
  if (Number.isNaN(fromMs) || Number.isNaN(toMs)) return null;
  return { fromMs, toMs };
}

function compareAccessLogRows(
  a: AccessLogRow,
  b: AccessLogRow,
  sortKey: LogSortKey,
  sortAsc: boolean,
  userLabel: (r: AccessLogRow) => string,
): number {
  let va: string | number;
  let vb: string | number;
  switch (sortKey) {
    case 'timestamp':
      va = a.timestamp;
      vb = b.timestamp;
      break;
    case 'similarity':
      va = a.similarity01;
      vb = b.similarity01;
      break;
    case 'decision':
      va = a.decision;
      vb = b.decision;
      break;
    case 'user':
      va = userLabel(a);
      vb = userLabel(b);
      break;
    default: {
      const _x: never = sortKey;
      return _x;
    }
  }
  if (va < vb) return sortAsc ? -1 : 1;
  if (va > vb) return sortAsc ? 1 : -1;
  return 0;
}

export function filterAndSortLogRows(
  rows: AccessLogRow[],
  users: User[],
  filters: LogFilterState,
  sortKey: LogSortKey,
  sortAsc: boolean,
  unknownLabel: string,
): AccessLogRow[] {
  const nameById = new Map(users.map((u) => [u.id, u.name]));
  const range = dayRangeToMs(filters.dateFrom, filters.dateTo);

  const filtered = rows.filter((r) => {
    if (range) {
      if (r.timestamp < range.fromMs || r.timestamp > range.toMs) return false;
    }
    if (filters.userId) {
      if (filters.userId === '__null__') {
        if (r.userId !== null) return false;
      } else if (r.userId !== filters.userId) return false;
    }
    if (filters.decision && r.decision !== filters.decision) return false;
    if (filters.review === 'REVIEWED' && !r.reviewedDecision) return false;
    if (filters.review === 'UNREVIEWED' && !!r.reviewedDecision) return false;
    return true;
  });

  const userLabel = (r: AccessLogRow) =>
    r.userId === null ? unknownLabel : (nameById.get(r.userId) ?? unknownLabel);

  return [...filtered].sort((a, b) => compareAccessLogRows(a, b, sortKey, sortAsc, userLabel));
}

import type { AccessLogRow, User } from '../domain/types';

/** RFC 4180 field escaping (Excel / Numbers compatible). */
export function escapeCsvField(value: string): string {
  if (/[",\r\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function isoTimestamp(ms: number): string {
  try {
    return new Date(ms).toISOString();
  } catch {
    return String(ms);
  }
}

/**
 * Builds CSV for the full access log (audit export). Omits binary frame blobs.
 */
export function accessLogToCsv(rows: AccessLogRow[], users: User[], unknownLabel: string): string {
  const byId = new Map(users.map((u) => [u.id, u]));
  const header = [
    'Timestamp (ISO)',
    'User',
    'Similarity (%)',
    'Decision',
    'Liveness Decision',
    'Liveness Score (%)',
    'Liveness Reason',
  ];
  const lines = [header.map(escapeCsvField).join(',')];

  for (const row of rows) {
    const name = row.userId === null ? unknownLabel : (byId.get(row.userId)?.name ?? unknownLabel);
    const sim = String(Math.round(row.similarity01 * 100));
    const liveScore =
      typeof row.livenessScore === 'number' ? String(Math.round(row.livenessScore * 100)) : '';
    const cells = [
      isoTimestamp(row.timestamp),
      name,
      sim,
      row.decision,
      row.livenessDecision ?? '',
      liveScore,
      row.livenessReason ?? '',
    ].map(escapeCsvField);
    lines.push(cells.join(','));
  }

  // UTF-8 BOM helps Excel open UTF-8 names correctly.
  return `\ufeff${lines.join('\r\n')}\r\n`;
}

export function downloadAccessLogCsv(csv: string, filenameBase: string): void {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filenameBase}.csv`;
  a.rel = 'noopener';
  a.click();
  URL.revokeObjectURL(url);
}

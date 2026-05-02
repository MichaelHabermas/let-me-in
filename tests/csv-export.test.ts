import { describe, expect, it } from 'vitest';

import { accessLogToCsv, escapeCsvField } from '../src/app/csv-export';
import type { AccessLogRow, User } from '../src/domain/types';

describe('escapeCsvField', () => {
  it('quotes fields with commas and escapes quotes', () => {
    expect(escapeCsvField('a,b')).toBe('"a,b"');
    expect(escapeCsvField('say "hi"')).toBe('"say ""hi"""');
  });
});

describe('accessLogToCsv', () => {
  const users: User[] = [
    {
      id: 'u1',
      name: 'Alex, Jr.',
      role: 'Staff',
      referenceImageBlob: new Blob(),
      embedding: new Float32Array(4),
      createdAt: 1,
    },
  ];

  it('includes header and resolves user names with BOM and CRLF', () => {
    const rows: AccessLogRow[] = [
      {
        timestamp: 1_700_000_000_000,
        userId: 'u1',
        similarity01: 0.9123,
        decision: 'GRANTED',
        capturedFrameBlob: new Blob(),
        livenessDecision: 'PASS',
        livenessScore: 0.812,
        livenessReason: 'LIVE_MOTION_CONFIRMED',
      },
    ];
    const csv = accessLogToCsv(rows, users, 'Unknown');
    expect(csv.startsWith('\ufeff')).toBe(true);
    expect(csv).toContain('Timestamp (ISO)');
    expect(csv).toContain('"Alex, Jr."');
    expect(csv).toContain('91');
    expect(csv).toContain('GRANTED');
    expect(csv).toContain('Liveness Decision');
    expect(csv).toContain('PASS');
    expect(csv).toContain('81');
    expect(csv).toContain('LIVE_MOTION_CONFIRMED');
    expect(csv.includes('\r\n')).toBe(true);
  });

  it('uses unknown label for null userId', () => {
    const rows: AccessLogRow[] = [
      {
        timestamp: 100,
        userId: null,
        similarity01: 0.4,
        decision: 'DENIED',
        capturedFrameBlob: new Blob(),
      },
    ];
    const csv = accessLogToCsv(rows, users, 'Nobody');
    expect(csv).toContain('Nobody');
  });
});

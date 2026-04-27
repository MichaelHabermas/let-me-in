import type { AccessLogRow, DexiePersistence } from '../infra/persistence';

const REVIEW_INBOX_DEMO_SETTINGS_KEY = 'reviewInboxDemoSeedV1';

/** Sample queue rows for local dev when the review inbox is empty (skipped in test/production builds). */
function buildReviewInboxDemoRows(nowMs: number): AccessLogRow[] {
  const frame = new Blob([], { type: 'image/jpeg' });
  return [
    {
      timestamp: nowMs - 3_600_000,
      userId: null,
      similarity01: 0.89,
      decision: 'DENIED',
      capturedFrameBlob: frame,
    },
    {
      timestamp: nowMs - 2_400_000,
      userId: 'demo-user',
      similarity01: 0.76,
      decision: 'DENIED',
      capturedFrameBlob: frame,
    },
    {
      timestamp: nowMs - 1_200_000,
      userId: null,
      similarity01: 0.71,
      decision: 'DENIED',
      capturedFrameBlob: frame,
    },
    {
      timestamp: nowMs - 600_000,
      userId: null,
      similarity01: 0.62,
      decision: 'UNCERTAIN',
      capturedFrameBlob: frame,
    },
  ];
}

/**
 * Inserts a few review-candidate log rows once (per browser DB) when running the Vite dev server
 * and the queue would otherwise be empty. No-op in `vitest` and production builds.
 */
export async function ensureReviewInboxDemoRows(persistence: DexiePersistence): Promise<void> {
  if (import.meta.env.MODE !== 'development') return;

  const marker = await persistence.settingsRepo.get(REVIEW_INBOX_DEMO_SETTINGS_KEY);
  if (marker?.value === true) return;

  const anyCandidate = await persistence.accessLogRepo.listReviewCandidates({ limit: 1 });
  if (anyCandidate.length > 0) return;

  const rows = buildReviewInboxDemoRows(Date.now());
  for (const row of rows) {
    let ts = row.timestamp;
    while (await persistence.accessLogRepo.get(ts)) {
      ts += 1;
    }
    await persistence.accessLogRepo.put({ ...row, timestamp: ts });
  }

  await persistence.settingsRepo.put({ key: REVIEW_INBOX_DEMO_SETTINGS_KEY, value: true });
}

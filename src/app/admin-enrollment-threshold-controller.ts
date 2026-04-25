import { applySpec075StrongPreset, readAccessThresholds } from './admin-threshold-preset';
import { createAccessLogReviewService } from './access-log-review-service';
import { readThresholdCalibrationMeta } from './access-threshold-calibration';
import type { AccessThresholds } from '../domain/access-policy';
import type { AccessLogRow, DexiePersistence, ReviewedDecision } from '../infra/persistence';
import type { GateRuntime } from './gate-runtime';

type ThresholdDom = {
  thresholdStatusEl: HTMLElement;
  thresholdCalibrationStatusEl: HTMLElement;
  thresholdApplySpec075Btn: HTMLButtonElement;
  reviewQueueTbody: HTMLTableSectionElement;
  reviewQueueRefreshBtn: HTMLButtonElement;
  reviewQueueStatusEl: HTMLElement;
};

function formatThresholdStatus(t: AccessThresholds, template: string): string {
  return template
    .replaceAll('{strong}', String(t.strong))
    .replaceAll('{weak}', String(t.weak))
    .replaceAll('{margin}', String(t.margin));
}

function formatCalibrationStatus(
  meta: Awaited<ReturnType<typeof readThresholdCalibrationMeta>>,
  nowMs: number,
): string {
  if (!meta) return 'Auto-calibration: no runs yet.';
  const elapsedSec = Math.max(0, Math.floor((nowMs - meta.lastRunAtMs) / 1000));
  if (meta.reason === 'applied' && meta.next) {
    return `Auto-calibration: applied ${elapsedSec}s ago (n=${meta.sampleCount}, reviewed=${meta.reviewedSamplesUsed}, raw=${meta.rawSamplesUsed}, drift=${meta.maxDriftApplied}).`;
  }
  return `Auto-calibration: ${meta.reason.replaceAll('_', ' ')} ${elapsedSec}s ago (n=${meta.sampleCount}, reviewed=${meta.reviewedSamplesUsed}, raw=${meta.rawSamplesUsed}).`;
}

function formatTimestamp(ts: number): string {
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function renderReviewQueueRows(params: {
  rows: AccessLogRow[];
  tbody: HTMLTableSectionElement;
  onReview: (timestamp: number, reviewedDecision: ReviewedDecision) => void;
  signal: AbortSignal;
}): void {
  params.tbody.replaceChildren();
  for (const row of params.rows) {
    const tr = document.createElement('tr');

    const tdTime = document.createElement('td');
    tdTime.textContent = formatTimestamp(row.timestamp);

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
    grantBtn.addEventListener('click', () => params.onReview(row.timestamp, 'GRANTED'), {
      signal: params.signal,
    });

    const denyBtn = document.createElement('button');
    denyBtn.type = 'button';
    denyBtn.className = 'btn';
    denyBtn.textContent = 'Should deny';
    denyBtn.setAttribute('data-testid', `admin-review-deny-${row.timestamp}`);
    denyBtn.addEventListener('click', () => params.onReview(row.timestamp, 'DENIED'), {
      signal: params.signal,
    });
    tdActions.append(grantBtn, denyBtn);
    tr.append(tdTime, tdDecision, tdSimilarity, tdActions);
    params.tbody.appendChild(tr);
  }
}

export function bindAdminEnrollmentThresholdController(
  dom: ThresholdDom,
  persistence: DexiePersistence,
  rt: GateRuntime,
  signal: AbortSignal,
): void {
  const template = rt.runtimeSlices.admin.ui.adminAccessThresholdsStatus;
  const reviewService = createAccessLogReviewService(persistence);

  const refresh = async (): Promise<void> => {
    const [t, meta] = await Promise.all([
      readAccessThresholds(persistence, rt.databaseSeedSettings),
      readThresholdCalibrationMeta(persistence.settingsRepo),
    ]);
    dom.thresholdStatusEl.textContent = formatThresholdStatus(t, template);
    dom.thresholdCalibrationStatusEl.textContent = formatCalibrationStatus(meta, Date.now());
    try {
      const reviewRows = await reviewService.listCandidates(8);
      renderReviewQueueRows({
        rows: reviewRows,
        tbody: dom.reviewQueueTbody,
        signal,
        onReview: (timestamp, reviewedDecision) => {
          void (async () => {
            await reviewService.setReviewedDecision({ timestamp, reviewedDecision });
            await refresh();
          })();
        },
      });
      dom.reviewQueueStatusEl.textContent = `Review queue: ${reviewRows.length} pending`;
    } catch {
      dom.reviewQueueTbody.replaceChildren();
      dom.reviewQueueStatusEl.textContent = 'Review queue unavailable.';
    }
  };

  dom.thresholdApplySpec075Btn.addEventListener(
    'click',
    () => {
      void (async () => {
        await applySpec075StrongPreset(persistence, rt.databaseSeedSettings);
        await refresh();
      })();
    },
    { signal },
  );
  dom.reviewQueueRefreshBtn.addEventListener(
    'click',
    () => {
      void refresh();
    },
    { signal },
  );

  void refresh();
}

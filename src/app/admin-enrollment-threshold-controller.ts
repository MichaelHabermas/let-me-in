import { applySpec075StrongPreset, readAccessThresholds } from './admin-threshold-preset';
import { buildReviewRow } from './admin-review-queue-dom';
import {
  renderAdminCalibrationExplainability,
  type CalibrationExplainabilityDom,
} from './admin-calibration-explainability-ui';
import { createAccessLogReviewService } from './access-log-review-service';
import { ensureReviewInboxDemoRows } from './review-inbox-demo-seed';
import {
  applyThresholdCalibrationShadow,
  clearThresholdCalibrationShadow,
  readThresholdCalibrationMeta,
  readThresholdCalibrationShadow,
  runAutomaticThresholdCalibration,
} from './access-threshold-calibration';
import type { AccessThresholds } from '../domain/access-policy';
import type { AccessLogRow, DexiePersistence, ReviewedDecision } from '../infra/persistence';
import type { GateRuntime } from './gate-runtime';

type ThresholdDom = {
  thresholdStatusEl: HTMLElement;
  thresholdCalibrationStatusEl: HTMLElement;
  thresholdApplySpec075Btn: HTMLButtonElement;
  calibrationExplainSummaryEl: HTMLElement;
  calibrationExplainSamplesEl: HTMLElement;
  calibrationExplainDeltasEl: HTMLElement;
  calibrationExplainProjectionEl: HTMLElement;
  calibrationShadowSummaryEl: HTMLElement;
  calibrationShadowSamplesEl: HTMLElement;
  calibrationShadowDeltasEl: HTMLElement;
  calibrationShadowProjectionEl: HTMLElement;
  calibrationShadowPreviewBtn: HTMLButtonElement;
  calibrationShadowApplyBtn: HTMLButtonElement;
  calibrationShadowDismissBtn: HTMLButtonElement;
  calibrationShadowBannerEl: HTMLElement;
  reviewQueueTbody: HTMLTableSectionElement;
  reviewQueueRefreshBtn: HTMLButtonElement;
  reviewQueueStatusEl: HTMLElement;
  reviewQueuePendingBadgeEl: HTMLSpanElement;
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

function toCalibrationExplainabilityDom(dom: ThresholdDom): CalibrationExplainabilityDom {
  return {
    calibrationExplainSummaryEl: dom.calibrationExplainSummaryEl,
    calibrationExplainSamplesEl: dom.calibrationExplainSamplesEl,
    calibrationExplainDeltasEl: dom.calibrationExplainDeltasEl,
    calibrationExplainProjectionEl: dom.calibrationExplainProjectionEl,
    calibrationShadowSummaryEl: dom.calibrationShadowSummaryEl,
    calibrationShadowSamplesEl: dom.calibrationShadowSamplesEl,
    calibrationShadowDeltasEl: dom.calibrationShadowDeltasEl,
    calibrationShadowProjectionEl: dom.calibrationShadowProjectionEl,
    calibrationShadowApplyBtn: dom.calibrationShadowApplyBtn,
    calibrationShadowBannerEl: dom.calibrationShadowBannerEl,
  };
}

async function doThresholdPanelRefresh(p: {
  dom: ThresholdDom;
  template: string;
  persistence: DexiePersistence;
  rt: GateRuntime;
  reviewService: ReturnType<typeof createAccessLogReviewService>;
  signal: AbortSignal;
  onAfterReview: () => Promise<void>;
}): Promise<void> {
  const [t, meta, shadow] = await Promise.all([
    readAccessThresholds(p.persistence, p.rt.databaseSeedSettings),
    readThresholdCalibrationMeta(p.persistence.settingsRepo),
    readThresholdCalibrationShadow(p.persistence.settingsRepo),
  ]);
  p.dom.thresholdStatusEl.textContent = formatThresholdStatus(t, p.template);
  p.dom.thresholdCalibrationStatusEl.textContent = formatCalibrationStatus(meta, Date.now());
  renderAdminCalibrationExplainability(toCalibrationExplainabilityDom(p.dom), meta, shadow);
  try {
    await ensureReviewInboxDemoRows(p.persistence);
    const reviewRows = await p.reviewService.listCandidates(8);
    renderReviewQueueRows({
      rows: reviewRows,
      tbody: p.dom.reviewQueueTbody,
      signal: p.signal,
      onReview: (timestamp, reviewedDecision) => {
        void (async () => {
          await p.reviewService.setReviewedDecision({ timestamp, reviewedDecision });
          await p.onAfterReview();
        })();
      },
    });
    const count = reviewRows.length;
    p.dom.reviewQueueStatusEl.textContent = `Review queue: ${count} pending`;
    p.dom.reviewQueuePendingBadgeEl.textContent = String(count);
    p.dom.reviewQueuePendingBadgeEl.dataset.visible = count > 0 ? 'true' : 'false';
  } catch {
    p.dom.reviewQueueTbody.replaceChildren();
    p.dom.reviewQueueStatusEl.textContent = 'Review queue unavailable.';
  }
}

function bindShadowCalibrationControls(
  dom: ThresholdDom,
  persistence: DexiePersistence,
  rt: GateRuntime,
  signal: AbortSignal,
  refresh: () => Promise<void>,
): void {
  dom.calibrationShadowPreviewBtn.addEventListener(
    'click',
    () => {
      void (async () => {
        await runAutomaticThresholdCalibration({
          persistence,
          seedFallback: rt.databaseSeedSettings,
          applyThresholds: false,
        });
        await refresh();
      })();
    },
    { signal },
  );
  dom.calibrationShadowApplyBtn.addEventListener(
    'click',
    () => {
      void (async () => {
        await applyThresholdCalibrationShadow(persistence);
        await refresh();
      })();
    },
    { signal },
  );
  dom.calibrationShadowDismissBtn.addEventListener(
    'click',
    () => {
      void (async () => {
        await clearThresholdCalibrationShadow(persistence.settingsRepo);
        await refresh();
      })();
    },
    { signal },
  );
}

function renderReviewQueueRows(params: {
  rows: AccessLogRow[];
  tbody: HTMLTableSectionElement;
  onReview: (timestamp: number, reviewedDecision: ReviewedDecision) => void;
  signal: AbortSignal;
}): void {
  params.tbody.replaceChildren();
  for (const row of params.rows) {
    const { tr } = buildReviewRow(row, params.onReview, params.signal);
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
    await doThresholdPanelRefresh({
      dom,
      template,
      persistence,
      rt,
      reviewService,
      signal,
      onAfterReview: refresh,
    });
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

  bindShadowCalibrationControls(dom, persistence, rt, signal, () => refresh());

  void refresh();
}

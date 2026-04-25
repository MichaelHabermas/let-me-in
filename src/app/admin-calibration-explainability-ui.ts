import type {
  ThresholdCalibrationMeta,
  ThresholdCalibrationShadow,
} from './access-threshold-calibration';

export type CalibrationExplainabilityDom = {
  calibrationExplainSummaryEl: HTMLElement;
  calibrationExplainSamplesEl: HTMLElement;
  calibrationExplainDeltasEl: HTMLElement;
  calibrationExplainProjectionEl: HTMLElement;
  calibrationShadowSummaryEl: HTMLElement;
  calibrationShadowSamplesEl: HTMLElement;
  calibrationShadowDeltasEl: HTMLElement;
  calibrationShadowProjectionEl: HTMLElement;
  calibrationShadowApplyBtn: HTMLButtonElement;
};

function humanReason(reason: ThresholdCalibrationMeta['reason']): string {
  return reason.replaceAll('_', ' ');
}

function writeExplainabilityLines(
  target: {
    summaryEl: HTMLElement;
    samplesEl: HTMLElement;
    deltasEl: HTMLElement;
    projectionEl: HTMLElement;
  },
  labelRun: 'live' | 'shadow',
  meta: ThresholdCalibrationMeta | null,
): void {
  if (!meta) {
    if (labelRun === 'live') {
      target.summaryEl.textContent = 'No calibration run recorded yet.';
    } else {
      target.summaryEl.textContent =
        'No shadow preview yet. Click “Preview calibration (shadow)” to simulate a run without changing live thresholds.';
    }
    target.samplesEl.textContent = '';
    target.deltasEl.textContent = '';
    target.projectionEl.textContent = '';
    return;
  }

  const elapsedSec = Math.max(0, Math.floor((Date.now() - meta.lastRunAtMs) / 1000));
  const prefix = labelRun === 'shadow' ? 'Shadow' : 'Last run';
  target.summaryEl.textContent = `${prefix}: ${humanReason(meta.reason)} · ${elapsedSec}s ago · window n=${meta.sampleCount}.`;

  const ex = meta.explainability;
  if (!ex) {
    if (meta.reason === 'skipped_insufficient_data') {
      target.samplesEl.textContent =
        'Anchors / replay: unavailable — not enough rows in the lookback window.';
    } else {
      target.samplesEl.textContent =
        'Anchors / replay: unavailable — need at least one grant-labeled and one deny-labeled score, or this run was saved before explainability metadata existed.';
    }
    target.deltasEl.textContent = '';
    target.projectionEl.textContent = '';
    return;
  }

  target.samplesEl.textContent = `Anchors: denied p95=${ex.deniedP95} · granted p10=${ex.grantedP10} · calibration labels: reviewed=${meta.reviewedSamplesUsed}, raw=${meta.rawSamplesUsed}.`;
  target.deltasEl.textContent = `Threshold deltas (next − previous): strong ${ex.deltaStrong >= 0 ? '+' : ''}${ex.deltaStrong}, weak ${ex.deltaWeak >= 0 ? '+' : ''}${ex.deltaWeak}, margin ${ex.deltaMargin >= 0 ? '+' : ''}${ex.deltaMargin}.`;
  target.projectionEl.textContent = `Replay on calibration scores (single-best, no runner-up): false-grant ${ex.projectedFalseGrantBefore}→${ex.projectedFalseGrantAfter}, false-deny ${ex.projectedFalseDenyBefore}→${ex.projectedFalseDenyAfter}.`;
}

export function renderAdminCalibrationExplainability(
  dom: CalibrationExplainabilityDom,
  live: ThresholdCalibrationMeta | null,
  shadow: ThresholdCalibrationShadow | null,
): void {
  writeExplainabilityLines(
    {
      summaryEl: dom.calibrationExplainSummaryEl,
      samplesEl: dom.calibrationExplainSamplesEl,
      deltasEl: dom.calibrationExplainDeltasEl,
      projectionEl: dom.calibrationExplainProjectionEl,
    },
    'live',
    live,
  );
  writeExplainabilityLines(
    {
      summaryEl: dom.calibrationShadowSummaryEl,
      samplesEl: dom.calibrationShadowSamplesEl,
      deltasEl: dom.calibrationShadowDeltasEl,
      projectionEl: dom.calibrationShadowProjectionEl,
    },
    'shadow',
    shadow ? shadow.meta : null,
  );
  const canApply = !!shadow?.meta && shadow.meta.reason === 'applied' && shadow.meta.next !== null;
  dom.calibrationShadowApplyBtn.disabled = !canApply;
}

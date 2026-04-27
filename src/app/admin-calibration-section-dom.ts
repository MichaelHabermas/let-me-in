/** DOM factory for the calibration explainability section. */

function buildCalibrationLiveExplainEls(): {
  summaryEl: HTMLElement;
  samplesEl: HTMLElement;
  deltasEl: HTMLElement;
  projectionEl: HTMLElement;
} {
  const summaryEl = document.createElement('p');
  summaryEl.className = 'admin-calibration-explain__line';
  summaryEl.setAttribute('data-testid', 'admin-calibration-explain-summary');
  const samplesEl = document.createElement('p');
  samplesEl.className = 'admin-calibration-explain__line';
  samplesEl.setAttribute('data-testid', 'admin-calibration-explain-samples');
  const deltasEl = document.createElement('p');
  deltasEl.className = 'admin-calibration-explain__line';
  deltasEl.setAttribute('data-testid', 'admin-calibration-explain-deltas');
  const projectionEl = document.createElement('p');
  projectionEl.className = 'admin-calibration-explain__line';
  projectionEl.setAttribute('data-testid', 'admin-calibration-explain-projection');
  return { summaryEl, samplesEl, deltasEl, projectionEl };
}

function buildCalibrationShadowLineEls(): {
  shadowBannerEl: HTMLElement;
  shadowSummaryEl: HTMLElement;
  shadowSamplesEl: HTMLElement;
  shadowDeltasEl: HTMLElement;
  shadowProjectionEl: HTMLElement;
} {
  const shadowBannerEl = document.createElement('div');
  shadowBannerEl.className = 'admin-shadow-banner';
  shadowBannerEl.setAttribute('data-testid', 'admin-shadow-banner');
  shadowBannerEl.textContent = 'Shadow preview — not live until you apply';
  shadowBannerEl.dataset.visible = 'false';
  const shadowSummaryEl = document.createElement('p');
  shadowSummaryEl.className = 'admin-calibration-explain__line';
  shadowSummaryEl.setAttribute('data-testid', 'admin-calibration-explain-shadow-summary');
  const shadowSamplesEl = document.createElement('p');
  shadowSamplesEl.className = 'admin-calibration-explain__line';
  shadowSamplesEl.setAttribute('data-testid', 'admin-calibration-explain-shadow-samples');
  const shadowDeltasEl = document.createElement('p');
  shadowDeltasEl.className = 'admin-calibration-explain__line';
  shadowDeltasEl.setAttribute('data-testid', 'admin-calibration-explain-shadow-deltas');
  const shadowProjectionEl = document.createElement('p');
  shadowProjectionEl.className = 'admin-calibration-explain__line';
  shadowProjectionEl.setAttribute('data-testid', 'admin-calibration-explain-shadow-projection');
  return { shadowBannerEl, shadowSummaryEl, shadowSamplesEl, shadowDeltasEl, shadowProjectionEl };
}

function buildCalibrationShadowToolbar(): {
  shadowPreviewBtn: HTMLButtonElement;
  shadowApplyBtn: HTMLButtonElement;
  shadowDismissBtn: HTMLButtonElement;
  toolbar: HTMLElement;
} {
  const toolbar = document.createElement('div');
  toolbar.className = 'admin-calibration-explain__toolbar';
  const shadowPreviewBtn = document.createElement('button');
  shadowPreviewBtn.type = 'button';
  shadowPreviewBtn.className = 'btn';
  shadowPreviewBtn.textContent = 'Preview calibration (shadow)';
  shadowPreviewBtn.setAttribute('data-testid', 'admin-calibration-shadow-preview');
  const shadowApplyBtn = document.createElement('button');
  shadowApplyBtn.type = 'button';
  shadowApplyBtn.className = 'btn btn--primary';
  shadowApplyBtn.textContent = 'Apply shadow proposal';
  shadowApplyBtn.setAttribute('data-testid', 'admin-calibration-shadow-apply');
  const shadowDismissBtn = document.createElement('button');
  shadowDismissBtn.type = 'button';
  shadowDismissBtn.className = 'btn';
  shadowDismissBtn.textContent = 'Dismiss shadow';
  shadowDismissBtn.setAttribute('data-testid', 'admin-calibration-shadow-dismiss');
  toolbar.append(shadowPreviewBtn, shadowApplyBtn, shadowDismissBtn);
  return { shadowPreviewBtn, shadowApplyBtn, shadowDismissBtn, toolbar };
}

export function buildCalibrationSection(): {
  section: HTMLElement;
  summaryEl: HTMLElement;
  samplesEl: HTMLElement;
  deltasEl: HTMLElement;
  projectionEl: HTMLElement;
  shadowBannerEl: HTMLElement;
  shadowSummaryEl: HTMLElement;
  shadowSamplesEl: HTMLElement;
  shadowDeltasEl: HTMLElement;
  shadowProjectionEl: HTMLElement;
  shadowPreviewBtn: HTMLButtonElement;
  shadowApplyBtn: HTMLButtonElement;
  shadowDismissBtn: HTMLButtonElement;
} {
  const section = document.createElement('section');
  section.className = 'admin-calibration-explain';
  section.setAttribute('data-testid', 'admin-calibration-explainability');
  const h2 = document.createElement('h2');
  h2.className = 'admin-calibration-explain__title';
  h2.textContent = 'Calibration detail';
  const live = buildCalibrationLiveExplainEls();
  const shLines = buildCalibrationShadowLineEls();
  const shTools = buildCalibrationShadowToolbar();

  const details = document.createElement('details');
  details.className = 'admin-calibration-detail';
  const summary = document.createElement('summary');
  summary.className = 'admin-calibration-detail__summary';
  summary.appendChild(live.summaryEl);
  details.append(summary, live.samplesEl, live.deltasEl, live.projectionEl);

  section.append(
    h2,
    details,
    shLines.shadowBannerEl,
    shLines.shadowSummaryEl,
    shLines.shadowSamplesEl,
    shLines.shadowDeltasEl,
    shLines.shadowProjectionEl,
    shTools.toolbar,
  );
  return {
    section,
    ...live,
    ...shLines,
    ...shTools,
  };
}

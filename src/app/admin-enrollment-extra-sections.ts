/** Admin DOM fragments kept out of `admin-enrollment-dom.ts` for file size / lint limits. */

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
  shadowTitleEl: HTMLElement;
  shadowSummaryEl: HTMLElement;
  shadowSamplesEl: HTMLElement;
  shadowDeltasEl: HTMLElement;
  shadowProjectionEl: HTMLElement;
} {
  const shadowTitleEl = document.createElement('p');
  shadowTitleEl.className = 'admin-calibration-explain__kicker';
  shadowTitleEl.textContent = 'Shadow preview (not live until you apply)';
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
  return { shadowTitleEl, shadowSummaryEl, shadowSamplesEl, shadowDeltasEl, shadowProjectionEl };
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

export function buildCalibrationExplainabilitySection(): {
  section: HTMLElement;
  summaryEl: HTMLElement;
  samplesEl: HTMLElement;
  deltasEl: HTMLElement;
  projectionEl: HTMLElement;
  shadowTitleEl: HTMLElement;
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
  section.append(
    h2,
    live.summaryEl,
    live.samplesEl,
    live.deltasEl,
    live.projectionEl,
    shLines.shadowTitleEl,
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

export function buildReviewQueueSection(): {
  section: HTMLElement;
  tbody: HTMLTableSectionElement;
  refreshBtn: HTMLButtonElement;
  statusEl: HTMLElement;
} {
  const section = document.createElement('section');
  section.className = 'admin-review-queue';
  section.setAttribute('data-testid', 'admin-review-queue');

  const head = document.createElement('div');
  head.className = 'admin-review-queue__head';

  const h2 = document.createElement('h2');
  h2.className = 'admin-review-queue__title';
  h2.textContent = 'Review inbox';

  const statusEl = document.createElement('p');
  statusEl.className = 'admin-review-queue__status';
  statusEl.setAttribute('data-testid', 'admin-review-queue-status');

  const refreshBtn = document.createElement('button');
  refreshBtn.type = 'button';
  refreshBtn.className = 'btn';
  refreshBtn.textContent = 'Refresh';
  refreshBtn.setAttribute('data-testid', 'admin-review-queue-refresh');

  head.append(h2, statusEl, refreshBtn);

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
  return { section, tbody, refreshBtn, statusEl };
}

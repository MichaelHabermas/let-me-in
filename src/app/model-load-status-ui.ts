/**
 * Gate / enrollment model download + ORT session load progress (E11).
 * Kept separate from pipeline `statusEl` (which uses textContent).
 */

import type { ModelLoadProgress, ModelLoadStage } from '../infra/model-load-types';

export type { ModelLoadProgress, ModelLoadStage } from '../infra/model-load-types';

export type ModelLoadStatusStrings = {
  stageDetector: string;
  stageEmbedder: string;
  retryLabel: string;
};

export type ModelLoadStatusUiOptions = {
  strings: ModelLoadStatusStrings;
  /** Gate test id vs enrollment. */
  testIdPrefix?: 'gate' | 'enroll';
};

const PREFIX = 'model-load';

type RowElements = {
  row: HTMLElement;
  label: HTMLElement;
  track: HTMLElement;
  fill: HTMLElement;
  indeterminate: HTMLElement;
  bytes: HTMLElement;
};

function createRow(labelText: string): RowElements {
  const row = document.createElement('div');
  row.className = `${PREFIX}__row`;

  const label = document.createElement('span');
  label.className = `${PREFIX}__row-label`;
  label.textContent = labelText;

  const track = document.createElement('div');
  track.className = `${PREFIX}__track`;

  const fill = document.createElement('div');
  fill.className = `${PREFIX}__fill`;

  const indeterminate = document.createElement('div');
  indeterminate.className = `${PREFIX}__indeterminate`;

  const bytes = document.createElement('span');
  bytes.className = `${PREFIX}__bytes`;
  bytes.setAttribute('aria-hidden', 'true');

  track.append(fill, indeterminate);
  row.append(label, track, bytes);
  return { row, label, track, fill, indeterminate, bytes };
}

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function paintRow(
  row: RowElements,
  opts: {
    determinate: boolean;
    fraction: number;
    loaded?: number;
    total?: number;
    done: boolean;
  },
): void {
  const { determinate, fraction, loaded, total, done } = opts;
  row.track.classList.toggle(`${PREFIX}__track--indeterminate`, !determinate && !done);
  row.fill.hidden = !determinate && !done;
  row.indeterminate.hidden = determinate || done;
  row.track.setAttribute('role', 'progressbar');
  row.track.setAttribute('aria-valuemin', '0');
  row.track.setAttribute('aria-valuemax', '100');
  if (done) {
    row.fill.style.setProperty('--model-load-fill-pct', '100%');
    row.track.setAttribute('aria-valuenow', '100');
    row.track.removeAttribute('aria-busy');
    row.bytes.textContent = '';
    return;
  }
  if (determinate) {
    row.fill.style.setProperty('--model-load-fill-pct', `${Math.round(fraction * 100)}%`);
    row.track.setAttribute('aria-valuenow', String(Math.round(fraction * 100)));
    row.track.removeAttribute('aria-busy');
  } else {
    row.track.setAttribute('aria-busy', 'true');
    row.track.removeAttribute('aria-valuenow');
  }
  if (loaded != null && total != null && total > 0) {
    row.bytes.textContent = `${formatBytes(loaded)} / ${formatBytes(total)}`;
  } else if (loaded != null && loaded > 0) {
    row.bytes.textContent = formatBytes(loaded);
  } else {
    row.bytes.textContent = '';
  }
}

export type ModelLoadStatusController = {
  configure(opts: { showDetector: boolean; showEmbedder: boolean }): void;
  showLoading(): void;
  hide(): void;
  onProgress(p: ModelLoadProgress): void;
  markStageComplete(stage: ModelLoadStage): void;
  showError(message: string): void;
  clearError(): void;
  setRetryHandler(handler: (() => void) | null): void;
};

/* eslint-disable max-lines-per-function -- DOM + controller in one mount for a11y and state coupling */
export function mountModelLoadStatusUi(
  root: HTMLElement,
  options: ModelLoadStatusUiOptions,
): ModelLoadStatusController {
  const { strings, testIdPrefix = 'gate' } = options;
  root.className = PREFIX;
  root.setAttribute('data-testid', `${testIdPrefix}-model-load`);
  root.hidden = true;

  const detRow = createRow(strings.stageDetector);
  const embRow = createRow(strings.stageEmbedder);

  const errorWrap = document.createElement('div');
  errorWrap.className = `${PREFIX}__error`;
  errorWrap.hidden = true;
  const errorMsg = document.createElement('p');
  errorMsg.className = `${PREFIX}__error-msg`;
  const retryBtn = document.createElement('button');
  retryBtn.type = 'button';
  retryBtn.className = `${PREFIX}__retry btn`;
  retryBtn.textContent = strings.retryLabel;
  retryBtn.setAttribute('data-testid', `${testIdPrefix}-model-load-retry`);
  errorWrap.append(errorMsg, retryBtn);

  root.append(detRow.row, embRow.row, errorWrap);

  let retryHandler: (() => void) | null = null;
  retryBtn.addEventListener('click', () => {
    retryHandler?.();
  });

  const state = {
    showDetector: true,
    showEmbedder: true,
  };

  function syncRowVisibility(): void {
    detRow.row.hidden = !state.showDetector;
    embRow.row.hidden = !state.showEmbedder;
  }

  return {
    configure(opts) {
      state.showDetector = opts.showDetector;
      state.showEmbedder = opts.showEmbedder;
      syncRowVisibility();
    },

    showLoading() {
      root.hidden = false;
      errorWrap.hidden = true;
      if (state.showDetector) {
        detRow.label.textContent = strings.stageDetector;
        paintRow(detRow, { determinate: false, fraction: 0, done: false });
      }
      if (state.showEmbedder) {
        embRow.label.textContent = strings.stageEmbedder;
        paintRow(embRow, { determinate: false, fraction: 0, done: false });
      }
      syncRowVisibility();
    },

    hide() {
      root.hidden = true;
      errorWrap.hidden = true;
      retryHandler = null;
      retryBtn.hidden = true;
    },

    onProgress(p: ModelLoadProgress) {
      const loaded = p.loaded ?? 0;
      const total = p.total;
      const t = total;
      const determinate = t != null && t > 0;
      const fraction = determinate ? Math.min(1, loaded / t) : 0;
      if (p.stage === 'detector' && state.showDetector) {
        paintRow(detRow, { determinate, fraction, loaded, total, done: false });
      }
      if (p.stage === 'embedder' && state.showEmbedder) {
        paintRow(embRow, { determinate, fraction, loaded, total, done: false });
      }
    },

    markStageComplete(stage: ModelLoadStage) {
      if (stage === 'detector' && state.showDetector) {
        paintRow(detRow, { determinate: true, fraction: 1, done: true });
      }
      if (stage === 'embedder' && state.showEmbedder) {
        paintRow(embRow, { determinate: true, fraction: 1, done: true });
      }
    },

    showError(message: string) {
      root.hidden = false;
      errorWrap.hidden = false;
      errorMsg.textContent = message;
    },

    clearError() {
      errorWrap.hidden = true;
    },

    setRetryHandler(handler: (() => void) | null) {
      retryHandler = handler;
      retryBtn.hidden = handler == null;
    },
  };
}
/* eslint-enable max-lines-per-function */

import type { GateRuntime } from './runtime-settings';

export type BaseGatePreviewElements = {
  previewWrap: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
};

export interface BuiltGateDom extends BaseGatePreviewElements {
  main: HTMLElement;
  cameraToggleBtn: HTMLButtonElement;
  statusEl: HTMLElement;
  decisionEl: HTMLElement;
}

export function createGateToolbar(rt: GateRuntime): {
  toolbar: HTMLElement;
  cameraToggleBtn: HTMLButtonElement;
} {
  const toolbar = document.createElement('div');
  toolbar.className = 'gate-toolbar';

  const startLabel = rt.getCameraStartLabel();
  const stopLabel = rt.getCameraStopLabel();

  const cameraToggleBtn = document.createElement('button');
  cameraToggleBtn.type = 'button';
  cameraToggleBtn.id = 'gate-camera-toggle';
  cameraToggleBtn.className = 'gate-toolbar__camera';
  cameraToggleBtn.setAttribute('data-testid', 'gate-camera-toggle');
  cameraToggleBtn.dataset.labelStart = startLabel;
  cameraToggleBtn.dataset.labelStop = stopLabel;
  cameraToggleBtn.dataset.cameraState = 'idle';
  cameraToggleBtn.textContent = startLabel;
  cameraToggleBtn.setAttribute('aria-label', startLabel);

  toolbar.appendChild(cameraToggleBtn);
  return { toolbar, cameraToggleBtn };
}

export function createGatePreview(rt: GateRuntime): BaseGatePreviewElements {
  const previewWrap = document.createElement('div');
  previewWrap.className = 'gate-preview';
  previewWrap.style.setProperty('--gate-preview-width', String(rt.previewCanvasWidth));
  previewWrap.style.setProperty('--gate-preview-height', String(rt.previewCanvasHeight));

  const video = document.createElement('video');
  video.autoplay = true;
  video.muted = true;
  video.playsInline = true;
  video.hidden = true;
  video.setAttribute('playsinline', '');
  video.className = 'gate-preview__video';

  const canvas = document.createElement('canvas');
  canvas.id = 'preview';
  canvas.width = rt.previewCanvasWidth;
  canvas.height = rt.previewCanvasHeight;
  canvas.className = 'gate-preview__canvas';

  const overlayCanvas = document.createElement('canvas');
  overlayCanvas.id = 'detector-overlay';
  overlayCanvas.width = rt.previewCanvasWidth;
  overlayCanvas.height = rt.previewCanvasHeight;
  overlayCanvas.className = 'gate-preview__overlay';
  overlayCanvas.setAttribute('aria-hidden', 'true');

  previewWrap.appendChild(video);
  previewWrap.appendChild(canvas);
  previewWrap.appendChild(overlayCanvas);
  return { previewWrap, video, canvas, overlayCanvas };
}

export function buildGateDom(rt: GateRuntime): BuiltGateDom {
  const main = document.createElement('main');
  main.className = 'page page--gate';

  const shell = document.createElement('div');
  shell.className = 'gate-shell';

  const header = document.createElement('header');
  header.className = 'gate-header';

  const intro = document.createElement('div');
  intro.className = 'gate-header__intro';

  const h1 = document.createElement('h1');
  h1.className = 'page__title';
  h1.textContent = rt.orgName;

  const tagline = rt.orgTagline.trim();
  if (tagline) {
    const titleHost = document.createElement('div');
    titleHost.className = 'gate-title-tooltip-host';
    titleHost.tabIndex = 0;

    const bubble = document.createElement('div');
    bubble.id = 'gate-product-tagline';
    bubble.className = 'gate-title-tooltip__bubble';
    bubble.setAttribute('role', 'tooltip');
    bubble.textContent = tagline;

    h1.setAttribute('aria-describedby', bubble.id);
    titleHost.appendChild(h1);
    intro.appendChild(titleHost);
    intro.appendChild(bubble);
  } else {
    intro.appendChild(h1);
  }

  const { toolbar, cameraToggleBtn } = createGateToolbar(rt);
  toolbar.classList.add('gate-header__actions');

  const statusEl = document.createElement('p');
  statusEl.className = 'gate-status';
  statusEl.setAttribute('role', 'status');
  header.appendChild(intro);
  header.appendChild(toolbar);

  const { previewWrap, video, canvas, overlayCanvas } = createGatePreview(rt);

  const liveBar = document.createElement('section');
  liveBar.className = 'gate-livebar';

  const decisionLabel = document.createElement('span');
  decisionLabel.className = 'gate-livebar__label';
  decisionLabel.textContent = 'Access result';

  const decision = document.createElement('div');
  decision.id = 'decision';
  decision.className = 'gate-decision';
  decision.setAttribute('aria-live', 'polite');
  decision.textContent = '—';

  liveBar.appendChild(statusEl);
  liveBar.appendChild(decisionLabel);
  liveBar.appendChild(decision);

  shell.appendChild(header);
  shell.appendChild(previewWrap);
  shell.appendChild(liveBar);
  main.appendChild(shell);

  return {
    main,
    cameraToggleBtn,
    statusEl,
    previewWrap,
    video,
    canvas,
    overlayCanvas,
    decisionEl: decision,
  };
}

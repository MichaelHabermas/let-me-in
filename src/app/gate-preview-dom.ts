import type { GateRuntime } from './runtime-settings';

export function createGateToolbar(rt: GateRuntime): {
  toolbar: HTMLElement;
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
} {
  const toolbar = document.createElement('div');
  toolbar.className = 'gate-toolbar';

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.id = 'start';
  startBtn.textContent = rt.getCameraStartLabel();

  const stopBtn = document.createElement('button');
  stopBtn.type = 'button';
  stopBtn.id = 'stop';
  stopBtn.textContent = rt.getCameraStopLabel();
  stopBtn.disabled = true;

  toolbar.appendChild(startBtn);
  toolbar.appendChild(stopBtn);
  return { toolbar, startBtn, stopBtn };
}

export function createGatePreview(rt: GateRuntime): {
  previewWrap: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
} {
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

interface GateDom {
  main: HTMLElement;
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  statusEl: HTMLElement;
  previewWrap: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
  overlayCanvas: HTMLCanvasElement;
}

export function buildGateDom(rt: GateRuntime): GateDom {
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

  const lede = document.createElement('p');
  lede.className = 'page__lede gate-header__lede';

  const { toolbar, startBtn, stopBtn } = createGateToolbar(rt);
  toolbar.classList.add('gate-header__actions');

  const statusEl = document.createElement('p');
  statusEl.className = 'gate-status';
  statusEl.setAttribute('role', 'status');

  intro.appendChild(h1);
  intro.appendChild(lede);
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

  return { main, startBtn, stopBtn, statusEl, previewWrap, video, canvas, overlayCanvas };
}

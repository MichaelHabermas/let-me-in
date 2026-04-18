import { createCamera } from './camera';
import { wireGatePreviewSession } from './gate-session';
import { resolveGateRuntime } from './runtime-settings';

function createGateToolbar(rt: ReturnType<typeof resolveGateRuntime>): {
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

function createGatePreview(rt: ReturnType<typeof resolveGateRuntime>): {
  previewWrap: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
} {
  const previewWrap = document.createElement('div');
  previewWrap.className = 'gate-preview';

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

  previewWrap.appendChild(video);
  previewWrap.appendChild(canvas);
  return { previewWrap, video, canvas };
}

function buildGateDom(rt: ReturnType<typeof resolveGateRuntime>): {
  main: HTMLElement;
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
  statusEl: HTMLElement;
  previewWrap: HTMLElement;
  video: HTMLVideoElement;
  canvas: HTMLCanvasElement;
} {
  const main = document.createElement('main');
  main.className = 'page page--gate';

  const h1 = document.createElement('h1');
  h1.className = 'page__title';
  h1.textContent = rt.orgName;

  const { toolbar, startBtn, stopBtn } = createGateToolbar(rt);

  const statusEl = document.createElement('p');
  statusEl.className = 'gate-status';
  statusEl.setAttribute('role', 'status');

  const { previewWrap, video, canvas } = createGatePreview(rt);

  const decision = document.createElement('div');
  decision.id = 'decision';
  decision.className = 'gate-decision';
  decision.setAttribute('aria-live', 'polite');
  decision.textContent = '—';

  main.appendChild(h1);
  main.appendChild(toolbar);
  main.appendChild(statusEl);
  main.appendChild(previewWrap);
  main.appendChild(decision);

  return { main, startBtn, stopBtn, statusEl, previewWrap, video, canvas };
}

export function mountGateView(): void {
  const app = document.getElementById('app');
  if (!app) return;

  const rt = resolveGateRuntime();
  document.title = rt.gatePageTitle;
  app.innerHTML = '';

  const { main, startBtn, stopBtn, statusEl, previewWrap, video, canvas } = buildGateDom(rt);
  app.appendChild(main);

  const teardown = wireGatePreviewSession(
    { startBtn, stopBtn, statusEl, previewWrap, video, canvas },
    {
      createCamera,
      getDefaultVideoConstraintsForCamera: () => rt.getDefaultVideoConstraintsForCamera(),
      getCameraUserFacingMessage: (code) => rt.getCameraUserFacingMessage(code),
    },
    { showFpsOverlay: rt.showFpsOverlay },
  );

  window.addEventListener('beforeunload', teardown, { once: true });
}

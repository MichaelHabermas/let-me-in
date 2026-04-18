import { wireGatePreviewSession } from '../app/gate-session';
import {
  getCameraStartLabel,
  getCameraStopLabel,
  getDefaultVideoConstraintsForCamera,
  getCameraUserFacingMessage,
  getGatePageTitle,
  getOrgName,
} from '../app/config-bridge';
import { createCamera } from '../app/camera';

function createGateToolbar(): {
  toolbar: HTMLElement;
  startBtn: HTMLButtonElement;
  stopBtn: HTMLButtonElement;
} {
  const toolbar = document.createElement('div');
  toolbar.className = 'gate-toolbar';

  const startBtn = document.createElement('button');
  startBtn.type = 'button';
  startBtn.id = 'start';
  startBtn.textContent = getCameraStartLabel();

  const stopBtn = document.createElement('button');
  stopBtn.type = 'button';
  stopBtn.id = 'stop';
  stopBtn.textContent = getCameraStopLabel();
  stopBtn.disabled = true;

  toolbar.appendChild(startBtn);
  toolbar.appendChild(stopBtn);
  return { toolbar, startBtn, stopBtn };
}

function createGatePreview(): {
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
  canvas.width = 1280;
  canvas.height = 720;
  canvas.className = 'gate-preview__canvas';

  previewWrap.appendChild(video);
  previewWrap.appendChild(canvas);
  return { previewWrap, video, canvas };
}

function buildGateDom(): {
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
  h1.textContent = getOrgName();

  const { toolbar, startBtn, stopBtn } = createGateToolbar();

  const statusEl = document.createElement('p');
  statusEl.className = 'gate-status';
  statusEl.setAttribute('role', 'status');

  const { previewWrap, video, canvas } = createGatePreview();

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

  document.title = getGatePageTitle();
  app.innerHTML = '';

  const { main, startBtn, stopBtn, statusEl, previewWrap, video, canvas } = buildGateDom();
  app.appendChild(main);

  const teardown = wireGatePreviewSession(
    { startBtn, stopBtn, statusEl, previewWrap, video, canvas },
    {
      createCamera,
      getDefaultVideoConstraintsForCamera,
      getCameraUserFacingMessage,
    },
    { showFpsOverlay: import.meta.env.DEV },
  );

  window.addEventListener('beforeunload', teardown, { once: true });
}

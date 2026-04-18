import { createCamera, type Camera } from '../app/camera';
import {
  getCameraStartLabel,
  getCameraStopLabel,
  getCameraUserFacingMessage,
  getDefaultVideoConstraintsForCamera,
  getGatePageTitle,
  getOrgName,
} from '../app/config-bridge';

function wireCameraControls(
  camera: Camera,
  startBtn: HTMLButtonElement,
  stopBtn: HTMLButtonElement,
  statusEl: HTMLElement,
): void {
  startBtn.addEventListener('click', async () => {
    statusEl.textContent = '';
    startBtn.disabled = true;
    try {
      await camera.start();
      stopBtn.disabled = false;
    } catch {
      startBtn.disabled = false;
    }
  });

  stopBtn.addEventListener('click', () => {
    camera.stop();
    startBtn.disabled = false;
    stopBtn.disabled = true;
  });
}

function maybeMountFpsOverlay(camera: Camera, host: HTMLElement): () => void {
  if (!import.meta.env.DEV) return () => {};

  const fpsEl = document.createElement('div');
  fpsEl.id = 'fps';
  fpsEl.className = 'gate-preview__fps';
  host.appendChild(fpsEl);

  let lastTs = 0;
  const rolling: number[] = [];

  return camera.onFrame((ts) => {
    if (lastTs > 0) {
      const dt = ts - lastTs;
      if (dt > 0) rolling.push(1000 / dt);
      if (rolling.length > 30) rolling.shift();
      const avg = rolling.reduce((a, b) => a + b, 0) / rolling.length;
      fpsEl.textContent = `${avg.toFixed(1)} FPS`;
    }
    lastTs = ts;
  });
}

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

  const camera = createCamera(video, canvas, {
    defaultConstraints: getDefaultVideoConstraintsForCamera(),
  });

  camera.onError((err) => {
    const msg = getCameraUserFacingMessage(err.code);
    if (msg) statusEl.textContent = msg;
  });

  const unsubFps = maybeMountFpsOverlay(camera, previewWrap);
  wireCameraControls(camera, startBtn, stopBtn, statusEl);

  window.addEventListener(
    'beforeunload',
    () => {
      unsubFps();
      camera.stop();
    },
    { once: true },
  );
}

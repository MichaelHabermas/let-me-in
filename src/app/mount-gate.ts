import type { Camera, CreateCameraOptions } from './camera';
import { createCamera } from './camera';
import { wireGatePreviewSession } from './gate-session';
import type { GateRuntime } from './runtime-settings';
import { resolveGateRuntime } from './runtime-settings';

function createGateToolbar(rt: GateRuntime): {
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

function createGatePreview(rt: GateRuntime): {
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

function buildGateDom(rt: GateRuntime): {
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

export type MountGateHostDeps = {
  rt: GateRuntime;
  createCamera: (
    video: HTMLVideoElement,
    canvas: HTMLCanvasElement,
    options: CreateCameraOptions,
  ) => Camera;
  wireGatePreviewSession: typeof wireGatePreviewSession;
  /** When true (default), register `beforeunload` teardown like production. */
  addBeforeUnload?: boolean;
};

/**
 * Mount the gate UI into an existing host (tests inject `#app` or a detached div).
 * Returns teardown (stop camera, remove listeners) — also registered on `beforeunload` when enabled.
 */
export function mountGateIntoHost(host: HTMLElement, deps: MountGateHostDeps): () => void {
  const {
    rt,
    createCamera: createCam,
    wireGatePreviewSession: wireSession,
    addBeforeUnload = true,
  } = deps;

  document.title = rt.gatePageTitle;
  host.innerHTML = '';

  const { main, startBtn, stopBtn, statusEl, previewWrap, video, canvas } = buildGateDom(rt);
  host.appendChild(main);

  const teardown = wireSession(
    { startBtn, stopBtn, statusEl, previewWrap, video, canvas },
    {
      createCamera: createCam,
      getDefaultVideoConstraintsForCamera: () => rt.getDefaultVideoConstraintsForCamera(),
      getCameraUserFacingMessage: (code) => rt.getCameraUserFacingMessage(code),
    },
    { showFpsOverlay: rt.showFpsOverlay },
  );

  if (addBeforeUnload) {
    window.addEventListener('beforeunload', teardown, { once: true });
  }

  return teardown;
}

export function mountGateView(): void {
  const app = document.getElementById('app');
  if (!app) return;

  mountGateIntoHost(app, {
    rt: resolveGateRuntime(),
    createCamera,
    wireGatePreviewSession,
  });
}

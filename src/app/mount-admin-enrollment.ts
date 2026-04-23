import type { AdminAuth } from './auth';
import { createAdminEnrollmentDom, type AdminEnrollmentDom } from './admin-enrollment-dom';
import { createCamera } from './camera';
import { createEnrollmentController, type EnrollmentController } from './enroll';
import {
  createE2eEnrollmentCamera,
  createE2eEnrollmentDetector,
  createE2eEnrollmentEmbedder,
} from './enroll-e2e-doubles';
import { config, getDetectorRuntimeSettings, getEmbedderRuntimeSettings } from '../config';
import { createFaceEmbedder } from '../infra/embedder-ort';
import { createYoloDetector } from '../infra/detector-ort';
import type { DexiePersistence } from '../infra/persistence';
import type { GateRuntime } from './runtime-settings';

export type MountAdminEnrollmentOptions = {
  root: HTMLElement;
  rt: GateRuntime;
  persistence: DexiePersistence;
  auth: AdminAuth;
  rerender: () => void;
};

function bindEnrollmentUi(
  dom: AdminEnrollmentDom,
  ctrl: EnrollmentController,
  rt: GateRuntime,
  syncButtons: () => void,
): void {
  dom.startBtn.addEventListener('click', () => {
    void ctrl.startSession().catch(() => {});
  });
  dom.stopBtn.addEventListener('click', () => {
    ctrl.stopSession();
    syncButtons();
  });
  dom.capBtn.addEventListener('click', () => {
    void ctrl.captureFace().then(() => syncButtons());
  });
  dom.retakeBtn.addEventListener('click', () => {
    ctrl.retake();
    syncButtons();
  });
  dom.saveBtn.addEventListener('click', () => {
    const name = dom.nameInput.value.trim();
    if (!name) {
      dom.statusEl.textContent = rt.getAdminUiStrings().enrollNameRequired;
      return;
    }
    void ctrl.saveUser(name, dom.roleInput.value).then(() => {
      dom.statusEl.textContent = rt.getAdminUiStrings().enrollSuccess;
      dom.nameInput.value = '';
      dom.roleInput.value = '';
      syncButtons();
    });
  });
}

function enrollmentControllerBase(
  dom: AdminEnrollmentDom,
  rt: GateRuntime,
  persistence: DexiePersistence,
  onStateChange: () => void,
) {
  return {
    video: dom.video,
    frameCanvas: dom.frameCanvas,
    overlayCanvas: dom.overlayCanvas,
    statusEl: dom.statusEl,
    getNoFaceMessage: () => rt.getNoFaceMessage(),
    getMultiFaceMessage: () => rt.getMultiFaceMessage(),
    persistence,
    onStateChange,
  };
}

function wireEnrollmentController(
  dom: AdminEnrollmentDom,
  rt: GateRuntime,
  persistence: DexiePersistence,
): EnrollmentController {
  let ctrl!: EnrollmentController;
  const syncButtons = () => {
    const s = ctrl.getState();
    dom.startBtn.disabled = s !== 'idle';
    dom.stopBtn.disabled = s === 'idle' || s === 'saving';
    dom.capBtn.disabled = s !== 'detecting';
    dom.retakeBtn.disabled = s !== 'editing';
    dom.saveBtn.disabled = s !== 'editing';
    dom.nameInput.disabled = s !== 'editing';
    dom.roleInput.disabled = s !== 'editing';
  };

  const base = enrollmentControllerBase(dom, rt, persistence, syncButtons);
  ctrl = config.e2eStubEnrollment
    ? createEnrollmentController({
        ...base,
        camera: createE2eEnrollmentCamera(dom.frameCanvas.width, dom.frameCanvas.height),
        detector: createE2eEnrollmentDetector(),
        embedder: createE2eEnrollmentEmbedder(),
      })
    : createEnrollmentController({
        ...base,
        camera: createCamera(dom.video, dom.frameCanvas, {
          defaultConstraints: rt.getDefaultVideoConstraintsForCamera(),
        }),
        detector: createYoloDetector(getDetectorRuntimeSettings()),
        embedder: createFaceEmbedder(getEmbedderRuntimeSettings()),
      });

  syncButtons();
  bindEnrollmentUi(dom, ctrl, rt, syncButtons);

  return ctrl;
}

/** Authenticated admin shell: header + enrollment panel. */
export function mountAuthenticatedAdminEnrollment(opts: MountAdminEnrollmentOptions): () => void {
  const { root, rt, persistence, auth, rerender } = opts;
  root.innerHTML = '';
  const dom = createAdminEnrollmentDom(rt);
  root.appendChild(dom.shell);

  dom.logoutBtn.addEventListener('click', () => {
    auth.logout();
    rerender();
  });

  const ctrl = wireEnrollmentController(dom, rt, persistence);
  return () => {
    ctrl.dispose();
  };
}

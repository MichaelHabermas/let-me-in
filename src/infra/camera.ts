/**
 * Webcam capture: stream binding, preview draw loop, frame snapshots.
 * Browser APIs are injectable via `deps` for unit tests (DIP).
 */

export type CameraErrorCode = 'permission-denied' | 'no-device' | 'unknown' | 'camera-stopped';

export interface CameraError extends Error {
  readonly code: CameraErrorCode;
  readonly cause?: unknown;
}

export function makeCameraError(
  code: CameraErrorCode,
  message: string,
  cause?: unknown,
): CameraError {
  const err = new Error(message) as CameraError;
  Object.assign(err, { code, cause });
  err.name = 'CameraError';
  return err;
}

export type FrameCallback = (timestampMs: number) => void;
export type ErrorCallback = (error: CameraError) => void;
export type Unsubscribe = () => void;

export interface DefaultVideoConstraints {
  idealWidth: number;
  idealHeight: number;
  facingMode: string;
}

export interface CameraBrowserDeps {
  getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>;
  requestAnimationFrame?: (cb: FrameRequestCallback) => number;
  cancelAnimationFrame?: (id: number) => void;
  now?: () => number;
}

export interface CreateCameraOptions {
  defaultConstraints: DefaultVideoConstraints;
  deps?: CameraBrowserDeps;
}

export interface CameraStartOptions {
  facingMode?: string;
}

export interface Camera {
  start(opts?: CameraStartOptions): Promise<void>;
  stop(): void;
  getFrame(): ImageData;
  onFrame(cb: FrameCallback): Unsubscribe;
  onError(cb: ErrorCallback): Unsubscribe;
  isRunning(): boolean;
}

export function mapGetUserMediaFailure(err: unknown): CameraError {
  if (err && typeof err === 'object' && 'name' in err) {
    const name = String((err as DOMException).name);
    if (name === 'NotAllowedError' || name === 'SecurityError') {
      return makeCameraError('permission-denied', 'Camera permission was denied.', err);
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return makeCameraError('no-device', 'No camera was found on this device.', err);
    }
  }
  return makeCameraError('unknown', 'Could not start the camera.', err);
}

export function resolveDeps(deps?: CameraBrowserDeps): Required<CameraBrowserDeps> {
  const g = globalThis as typeof globalThis & {
    navigator?: Navigator;
  };
  const gum =
    deps?.getUserMedia ?? g.navigator?.mediaDevices?.getUserMedia.bind(g.navigator.mediaDevices);
  if (!gum) {
    throw makeCameraError('unknown', 'getUserMedia is not available in this environment.');
  }
  const raf = deps?.requestAnimationFrame ?? globalThis.requestAnimationFrame?.bind(globalThis);
  const caf = deps?.cancelAnimationFrame ?? globalThis.cancelAnimationFrame?.bind(globalThis);
  if (!raf || !caf) {
    throw makeCameraError('unknown', 'requestAnimationFrame is not available in this environment.');
  }
  return {
    getUserMedia: gum,
    requestAnimationFrame: raf,
    cancelAnimationFrame: caf,
    now: deps?.now ?? (() => performance.now()),
  };
}

export function buildVideoConstraints(
  defaults: DefaultVideoConstraints,
  opts?: CameraStartOptions,
): MediaTrackConstraints {
  return {
    facingMode: opts?.facingMode ?? defaults.facingMode,
    width: { ideal: defaults.idealWidth },
    height: { ideal: defaults.idealHeight },
  };
}

export function drawVideoToCanvas(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
): void {
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
}

interface CameraRuntime {
  videoEl: HTMLVideoElement;
  canvasEl: HTMLCanvasElement;
  defaultConstraints: DefaultVideoConstraints;
  options: CreateCameraOptions;
  resolvedDeps: Required<CameraBrowserDeps> | null;
  stream: MediaStream | null;
  rafId: number | null;
  running: boolean;
  frameListeners: Set<FrameCallback>;
  errorListeners: Set<ErrorCallback>;
  ctxMemo: CanvasRenderingContext2D | null;
}

function emitError(rt: CameraRuntime, err: CameraError): void {
  for (const cb of rt.errorListeners) cb(err);
}

function getCanvas2dContext(rt: CameraRuntime): CanvasRenderingContext2D {
  if (rt.ctxMemo) return rt.ctxMemo;
  const ctx = rt.canvasEl.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw makeCameraError('unknown', 'Could not acquire a 2D canvas context.');
  }
  rt.ctxMemo = ctx;
  return ctx;
}

function stopLoop(rt: CameraRuntime): void {
  if (rt.rafId !== null && rt.resolvedDeps) {
    rt.resolvedDeps.cancelAnimationFrame(rt.rafId);
    rt.rafId = null;
  }
}

function paintFrame(rt: CameraRuntime): void {
  const ctx = getCanvas2dContext(rt);
  drawVideoToCanvas(rt.videoEl, ctx, rt.canvasEl);
  const t = rt.resolvedDeps!.now();
  for (const cb of rt.frameListeners) cb(t);
}

function loop(rt: CameraRuntime): void {
  if (!rt.running || !rt.stream || !rt.resolvedDeps) return;
  paintFrame(rt);
  rt.rafId = rt.resolvedDeps.requestAnimationFrame(() => loop(rt));
}

function startLoop(rt: CameraRuntime): void {
  if (!rt.resolvedDeps) return;
  stopLoop(rt);
  rt.rafId = rt.resolvedDeps.requestAnimationFrame(() => loop(rt));
}

async function acquireStream(rt: CameraRuntime, opts?: CameraStartOptions): Promise<void> {
  rt.resolvedDeps = resolveDeps(rt.options.deps);
  try {
    const constraints: MediaStreamConstraints = {
      video: buildVideoConstraints(rt.defaultConstraints, opts),
      audio: false,
    };
    rt.stream = await rt.resolvedDeps.getUserMedia(constraints);
  } catch (e) {
    const mapped = mapGetUserMediaFailure(e);
    emitError(rt, mapped);
    throw mapped;
  }
}

async function bindVideoAndPlay(rt: CameraRuntime): Promise<void> {
  rt.videoEl.srcObject = rt.stream;
  rt.videoEl.muted = true;
  rt.videoEl.setAttribute('playsinline', '');
  try {
    await rt.videoEl.play();
  } catch (e) {
    const mapped = mapGetUserMediaFailure(e);
    emitError(rt, mapped);
    stopCamera(rt);
    throw mapped;
  }
}

function stopTracks(rt: CameraRuntime): void {
  if (!rt.stream) return;
  for (const track of rt.stream.getTracks()) track.stop();
}

function stopCamera(rt: CameraRuntime): void {
  rt.running = false;
  stopLoop(rt);
  stopTracks(rt);
  rt.stream = null;
  rt.videoEl.srcObject = null;
  rt.ctxMemo = null;
}

function buildCameraApi(rt: CameraRuntime): Camera {
  return {
    isRunning(): boolean {
      return rt.running;
    },
    onFrame(cb: FrameCallback): Unsubscribe {
      rt.frameListeners.add(cb);
      return () => rt.frameListeners.delete(cb);
    },
    onError(cb: ErrorCallback): Unsubscribe {
      rt.errorListeners.add(cb);
      return () => rt.errorListeners.delete(cb);
    },
    async start(opts?: CameraStartOptions): Promise<void> {
      if (rt.running) stopCamera(rt);
      await acquireStream(rt, opts);
      await bindVideoAndPlay(rt);
      rt.running = true;
      startLoop(rt);
    },
    stop(): void {
      stopCamera(rt);
    },
    getFrame(): ImageData {
      if (!rt.running) {
        throw makeCameraError('camera-stopped', 'Camera is stopped.', undefined);
      }
      const ctx = getCanvas2dContext(rt);
      return ctx.getImageData(0, 0, rt.canvasEl.width, rt.canvasEl.height);
    },
  };
}

export function createCamera(
  videoEl: HTMLVideoElement,
  canvasEl: HTMLCanvasElement,
  options: CreateCameraOptions,
): Camera {
  const rt: CameraRuntime = {
    videoEl,
    canvasEl,
    defaultConstraints: options.defaultConstraints,
    options,
    resolvedDeps: null,
    stream: null,
    rafId: null,
    running: false,
    frameListeners: new Set(),
    errorListeners: new Set(),
    ctxMemo: null,
  };
  return buildCameraApi(rt);
}

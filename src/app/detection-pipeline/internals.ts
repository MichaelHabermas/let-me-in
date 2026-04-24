import { drawBbox } from '../bbox-overlay';
import { squareCropWithMargin, resizeTo112, type Bbox } from '../crop';
import { l2normalize } from '../../domain/embedding-match';
import type { CooldownGate } from '../cooldown';
import { toEmbedderTensor } from '../../infra/embedder-preprocess';
import type { FaceEmbedder } from '../../infra/embedder-ort';

/**
 * Crop → 112² → InsightFace preprocess → ORT → L2-normalized 512-d.
 */
export async function embedFace(
  frame: ImageData,
  bbox: Bbox,
  embedder: FaceEmbedder,
): Promise<Float32Array> {
  const crop = squareCropWithMargin(frame, bbox);
  const small = resizeTo112(crop);
  const tensor = toEmbedderTensor(small);
  const raw = await embedder.infer(tensor);
  return l2normalize(raw);
}

const MULTI_FACE_BBOX_COLORS = ['#22c55e', '#3b82f6', '#a855f7', '#f97316', '#ec4899'];

export function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: ReadonlyArray<{
    bbox: readonly [number, number, number, number];
    confidence: number;
  }>,
): void {
  const multi = detections.length > 1;
  const palette = MULTI_FACE_BBOX_COLORS;
  detections.forEach((d, i) => {
    const color = multi ? (palette[i % palette.length] ?? '#22c55e') : '#22c55e';
    drawBbox(ctx, d.bbox, color, `${Math.round(d.confidence * 100)}%`);
  });
}

export function setStatus(el: HTMLElement | undefined, text: string): void {
  if (el) el.textContent = text;
}

export type CardinalityAndCooldownOpts = {
  statusEl?: HTMLElement;
  noFaceMessage?: string;
  multiFaceMessage?: string;
  cooldown?: CooldownGate;
};

/** Mutable debounce anchor for consecutive zero-detection frames (PRD E7 no-face prompt). */
export type NoFaceDebouncer = { sinceMs: number | null };

export function tickNoFaceDebounced(
  state: NoFaceDebouncer,
  opts: {
    statusEl?: HTMLElement;
    noFaceMessage?: string;
    getNowMs: () => number;
    debounceMs: number;
  },
): void {
  const now = opts.getNowMs();
  if (state.sinceMs === null) state.sinceMs = now;
  if (opts.noFaceMessage && now - state.sinceMs >= opts.debounceMs) {
    setStatus(opts.statusEl, opts.noFaceMessage);
  }
}

export function resetNoFaceDebouncer(state: NoFaceDebouncer): void {
  state.sinceMs = null;
}

/** Zero → skip (no-face debounce in pipeline); multi-face → status + skip. */
export function handleDetectionCardinality(
  opts: CardinalityAndCooldownOpts,
  detCount: number,
): 'continue' | 'skip' {
  if (detCount === 0) return 'skip';
  if (detCount > 1) {
    if (opts.multiFaceMessage) setStatus(opts.statusEl, opts.multiFaceMessage);
    return 'skip';
  }
  return 'continue';
}

export function isCoolingDown(opts: CardinalityAndCooldownOpts, nowMs: number): boolean {
  if (!opts.cooldown || opts.cooldown.tryEnter(nowMs)) return false;
  const remaining = opts.cooldown.remainingMs(nowMs);
  setStatus(opts.statusEl, `Please wait ${Math.ceil(remaining / 1000)} s`);
  return true;
}

import { drawBbox } from './bbox-overlay';
import { squareCropWithMargin, resizeTo112, type Bbox } from './crop';
import { l2normalize } from './match';
import type { CooldownGate } from './cooldown';
import { toEmbedderTensor } from '../infra/embedder-preprocess';
import type { FaceEmbedder } from '../infra/embedder-ort';

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

export function drawDetections(
  ctx: CanvasRenderingContext2D,
  detections: ReadonlyArray<{
    bbox: readonly [number, number, number, number];
    confidence: number;
  }>,
): void {
  for (const d of detections) {
    drawBbox(ctx, d.bbox, '#22c55e', `${Math.round(d.confidence * 100)}%`);
  }
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

export function handleDetectionCardinality(
  opts: CardinalityAndCooldownOpts,
  detCount: number,
): 'continue' | 'skip' {
  if (detCount === 0) {
    if (opts.noFaceMessage) setStatus(opts.statusEl, opts.noFaceMessage);
    return 'skip';
  }
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

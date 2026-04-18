export type Bbox = readonly [number, number, number, number];

/**
 * Stroke a bbox on a 2D context (preview overlay). Line width 2px; optional label above box.
 */
export function drawBbox(
  ctx: CanvasRenderingContext2D,
  bbox: Bbox,
  color: string,
  label?: string,
): void {
  const [x1, y1, x2, y2] = bbox;
  const w = x2 - x1;
  const h = y2 - y1;
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.strokeRect(x1, y1, w, h);
  if (label) {
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillStyle = color;
    const pad = 4;
    const metrics = ctx.measureText(label);
    const tw = metrics.width;
    const th = 16;
    const lx = x1;
    const ly = Math.max(0, y1 - th - pad);
    ctx.fillRect(lx, ly, tw + pad * 2, th + pad);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillText(label, lx + pad, ly + th);
  }
  ctx.restore();
}

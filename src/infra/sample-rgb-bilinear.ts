import { u8At } from './typed-index';

// linear interpolation
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Bilinear RGB from RGBA 8-bit data; channels in 0–255 (float, for rounding or scaling). */
export function sampleRgbBilinear888(
  data: Uint8ClampedArray,
  sw: number,
  sh: number,
  x: number,
  y: number,
): [number, number, number] {
  const x0 = Math.max(0, Math.min(sw - 1, Math.floor(x)));
  const y0 = Math.max(0, Math.min(sh - 1, Math.floor(y)));
  const x1 = Math.max(0, Math.min(sw - 1, Math.ceil(x)));
  const y1 = Math.max(0, Math.min(sh - 1, Math.ceil(y)));
  const fx = x - x0;
  const fy = y - y0;
  const i00 = (y0 * sw + x0) * 4;
  const i10 = (y0 * sw + x1) * 4;
  const i01 = (y1 * sw + x0) * 4;
  const i11 = (y1 * sw + x1) * 4;
  const rgb: [number, number, number] = [0, 0, 0];
  for (let c = 0; c < 3; c++) {
    rgb[c] = lerp(
      lerp(u8At(data, i00 + c), u8At(data, i10 + c), fx),
      lerp(u8At(data, i01 + c), u8At(data, i11 + c), fx),
      fy,
    );
  }
  return rgb;
}

import { describe, expect, it } from 'vitest';

import { resizeTo112, squareCropWithMargin } from '../src/app/crop';

function solidImageData(w: number, h: number, r: number, g: number, b: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return new ImageData(data, w, h);
}

describe('squareCropWithMargin (E4.S1.F2.T1)', () => {
  it('expands max(w,h) by symmetric margin and clamps to frame', () => {
    const img = solidImageData(100, 100, 10, 20, 30);
    const crop = squareCropWithMargin(img, [25, 25, 75, 75], 0.1);
    const side = Math.floor(50 * 1.2);
    expect(crop.width).toBe(side);
    expect(crop.height).toBe(side);
    expect(crop.data[0]).toBe(10);
    expect(crop.data[1]).toBe(20);
    expect(crop.data[2]).toBe(30);
  });
});

describe('resizeTo112 (E4.S1.F2.T2)', () => {
  it('returns 112×112 ImageData', () => {
    const small = solidImageData(24, 24, 200, 100, 50);
    const out = resizeTo112(small);
    expect(out.width).toBe(112);
    expect(out.height).toBe(112);
  });
});

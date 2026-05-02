/** Solid RGBA image for tests that have a real `ImageData` constructor (node lib DOM or happy-dom). */
export function solidRgbImageData(w: number, h: number, r: number, g: number, b: number): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < data.length; i += 4) {
    data[i] = r;
    data[i + 1] = g;
    data[i + 2] = b;
    data[i + 3] = 255;
  }
  return new ImageData(data, w, h);
}

/** Node test env may lack full `ImageData`; minimal stub for detector preprocess paths. */
export function minimalImageDataStub(width: number, height: number): ImageData {
  return {
    width,
    height,
    data: new Uint8ClampedArray(width * height * 4),
    colorSpace: 'srgb',
  } as unknown as ImageData;
}

export function patternedFaceImageData(
  w: number,
  h: number,
  frameIndex: number,
  mode: 'flat' | 'jittered-flat' | 'live-like' | 'blur' | 'glare',
): ImageData {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y += 1) {
    for (let x = 0; x < w; x += 1) {
      const i = (y * w + x) * 4;
      let v = 128;
      if (mode === 'jittered-flat') v = 128 + (frameIndex % 2);
      if (mode === 'live-like') {
        v =
          112 +
          Math.round(Math.sin((x + frameIndex * 3) / 5) * 34) +
          Math.round(Math.cos((y - frameIndex * 2) / 7) * 26);
      }
      if (mode === 'blur') v = 120 + Math.round(Math.sin((x + y) / 40) * 4);
      if (mode === 'glare') v = x > w * 0.12 && x < w * 0.88 && y > h * 0.1 && y < h * 0.82 ? 248 : 106;
      data[i] = Math.max(0, Math.min(255, v));
      data[i + 1] = Math.max(0, Math.min(255, v + (mode === 'live-like' ? 8 : 0)));
      data[i + 2] = Math.max(0, Math.min(255, v - (mode === 'live-like' ? 8 : 0)));
      data[i + 3] = 255;
    }
  }
  return new ImageData(data, w, h);
}

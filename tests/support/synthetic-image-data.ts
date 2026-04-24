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

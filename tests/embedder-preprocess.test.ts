import { describe, expect, it } from 'vitest';

import { EMBEDDER_INPUT_SIZE, toEmbedderTensor } from '../src/infra/embedder-preprocess';

describe('toEmbedderTensor', () => {
  it('produces CHW length 1*3*112*112 with values in roughly [-1, 1]', () => {
    const data = new Uint8ClampedArray(EMBEDDER_INPUT_SIZE * EMBEDDER_INPUT_SIZE * 4);
    for (let i = 0; i < data.length; i += 4) {
      data[i] = 255;
      data[i + 1] = 0;
      data[i + 2] = 128;
      data[i + 3] = 255;
    }
    const img = {
      width: EMBEDDER_INPUT_SIZE,
      height: EMBEDDER_INPUT_SIZE,
      data,
      colorSpace: 'srgb',
    } as unknown as ImageData;
    const t = toEmbedderTensor(img);
    const plane = EMBEDDER_INPUT_SIZE * EMBEDDER_INPUT_SIZE;
    expect(t.length).toBe(1 * 3 * plane);
    expect(t[0]).toBeCloseTo((255 - 127.5) / 127.5, 5);
    expect(t[plane]).toBeCloseTo((0 - 127.5) / 127.5, 5);
    expect(t[2 * plane]).toBeCloseTo((128 - 127.5) / 127.5, 5);
  });
});

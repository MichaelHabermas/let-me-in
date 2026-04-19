/**
 * `ImageData` when Vitest uses `environment: 'node'` (see [vitest.config.ts](../vitest.config.ts)).
 * Suites that need `document` use `/** @vitest-environment happy-dom *\/` (Vitest 4 has no
 * `environmentMatchGlobs`); see vitest.config comment for the list of DOM test files.
 */

type PredefinedColorSpace = 'srgb';

class NodeImageData {
  readonly colorSpace: PredefinedColorSpace = 'srgb';
  readonly data: Uint8ClampedArray;
  readonly width: number;
  readonly height: number;

  constructor(sw: number, sh: number);
  constructor(data: Uint8ClampedArray, sw: number, sh: number);
  constructor(a: number | Uint8ClampedArray, b: number, c?: number) {
    if (typeof a === 'number') {
      this.width = a;
      this.height = b;
      this.data = new Uint8ClampedArray(a * b * 4);
    } else {
      this.data = a;
      this.width = b;
      this.height = c ?? a.length / (4 * b);
    }
  }
}

/** No-op when a real `ImageData` (happy-dom / browser) already exists. */
export function installImageDataIfMissing(): void {
  const g = globalThis as typeof globalThis & { ImageData?: typeof ImageData };
  if (typeof g.ImageData === 'function') return;
  g.ImageData = NodeImageData as unknown as typeof ImageData;
}

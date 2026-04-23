import { vi } from 'vitest';

/** happy-dom often lacks a real 2D context; enough for enrollment / overlay paths in unit tests. */
export function stubCanvas2dContext(): () => void {
  const noop = (): void => {};
  const toBlobSpy = vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(function (
    this: HTMLCanvasElement,
    callback: BlobCallback | null,
    type?: string,
  ) {
    if (callback) {
      callback(new Blob(['stub'], { type: type ?? 'image/png' }));
    }
  });
  const getContextSpy = vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(function (
    this: HTMLCanvasElement,
    type: string,
  ) {
    if (type !== '2d') return null;
    return {
      drawImage: noop,
      clearRect: noop,
      putImageData: vi.fn(),
      save: noop,
      restore: noop,
      strokeRect: noop,
      fillRect: noop,
      fillText: noop,
      strokeStyle: '',
      lineWidth: 2,
      font: '14px system-ui',
      fillStyle: '#000',
      measureText: () => ({ width: 40 } as TextMetrics),
      getImageData: (_sx: number, _sy: number, sw: number, sh: number) =>
        new ImageData(new Uint8ClampedArray(sw * sh * 4).fill(128), sw, sh),
    } as unknown as CanvasRenderingContext2D;
  });
  return () => {
    toBlobSpy.mockRestore();
    getContextSpy.mockRestore();
  };
}

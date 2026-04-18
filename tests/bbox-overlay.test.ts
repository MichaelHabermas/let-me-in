import { describe, expect, it, vi } from 'vitest';

import { drawBbox } from '../src/app/bbox-overlay';

describe('drawBbox', () => {
  it('strokes one rect and draws label when provided', () => {
    const strokeRect = vi.fn();
    const fillRect = vi.fn();
    const fillText = vi.fn();
    const measureText = vi.fn(() => ({ width: 40 }));

    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      strokeStyle: '',
      lineWidth: 0,
      strokeRect,
      font: '',
      fillStyle: '',
      fillRect,
      measureText,
      fillText,
    } as unknown as CanvasRenderingContext2D;

    drawBbox(ctx, [10, 20, 110, 220], '#00ff00', 'face');

    expect(strokeRect).toHaveBeenCalledTimes(1);
    expect(strokeRect).toHaveBeenCalledWith(10, 20, 100, 200);
    expect(fillText).toHaveBeenCalledTimes(1);
    expect(fillText).toHaveBeenCalledWith('face', 14, 16);
    expect(fillRect).toHaveBeenCalled();
  });

  it('skips fillText when label omitted', () => {
    const strokeRect = vi.fn();
    const fillText = vi.fn();
    const ctx = {
      save: vi.fn(),
      restore: vi.fn(),
      strokeRect,
      fillText,
      lineWidth: 0,
      strokeStyle: '',
    } as unknown as CanvasRenderingContext2D;

    drawBbox(ctx, [0, 0, 50, 50], '#ff0000');
    expect(strokeRect).toHaveBeenCalledTimes(1);
    expect(fillText).not.toHaveBeenCalled();
  });
});

/** @vitest-environment happy-dom */

import { describe, expect, it, vi } from 'vitest';

import { wireGatePreviewSession } from '../src/app/gate-session';
import type { Camera } from '../src/app/camera';
import { makeCameraError } from '../src/infra/camera';

function buildElements() {
  const startBtn = document.createElement('button');
  const stopBtn = document.createElement('button');
  stopBtn.disabled = true;
  const statusEl = document.createElement('p');
  const previewWrap = document.createElement('div');
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');
  return { startBtn, stopBtn, statusEl, previewWrap, video, canvas };
}

describe('wireGatePreviewSession', () => {
  it('enables stop after start succeeds', async () => {
    const els = buildElements();
    let onErrorCb: Parameters<Camera['onError']>[0] | undefined;
    const fakeCamera = {
      start: vi.fn().mockResolvedValue(undefined),
      stop: vi.fn(),
      onError(cb: Parameters<Camera['onError']>[0]) {
        onErrorCb = cb;
        return () => {
          onErrorCb = undefined;
        };
      },
      onFrame: vi.fn(() => () => {}),
      getFrame: vi.fn(),
      isRunning: vi.fn(() => false),
    } as unknown as Camera;

    const createCamera = vi.fn(() => fakeCamera);
    const defaultConstraints = {
      idealWidth: 640,
      idealHeight: 480,
      facingMode: 'user',
    };

    wireGatePreviewSession(els, {
      createCamera,
      getDefaultVideoConstraintsForCamera: () => defaultConstraints,
      getCameraUserFacingMessage: () => '',
    });

    expect(createCamera).toHaveBeenCalledWith(els.video, els.canvas, { defaultConstraints });
    expect(onErrorCb).toBeTypeOf('function');

    els.startBtn.click();
    await Promise.resolve();
    await Promise.resolve();
    expect(fakeCamera.start).toHaveBeenCalled();
    expect(els.stopBtn.disabled).toBe(false);
  });

  it('maps camera errors to status text', () => {
    const els = buildElements();
    let onErrorCb: Parameters<Camera['onError']>[0] | undefined;
    const fakeCamera = {
      start: vi.fn(),
      stop: vi.fn(),
      onError(cb: Parameters<Camera['onError']>[0]) {
        onErrorCb = cb;
        return () => {
          onErrorCb = undefined;
        };
      },
      onFrame: vi.fn(() => () => {}),
      getFrame: vi.fn(),
      isRunning: vi.fn(() => false),
    } as unknown as Camera;

    wireGatePreviewSession(els, {
      createCamera: () => fakeCamera,
      getDefaultVideoConstraintsForCamera: () => ({
        idealWidth: 640,
        idealHeight: 480,
        facingMode: 'user',
      }),
      getCameraUserFacingMessage: (code) =>
        code === 'permission-denied' ? 'Camera blocked' : 'other',
    });

    onErrorCb?.(makeCameraError('permission-denied', 'nope'));
    expect(els.statusEl.textContent).toBe('Camera blocked');
  });
});

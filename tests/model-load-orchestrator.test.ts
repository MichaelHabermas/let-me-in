import { describe, expect, it, vi } from 'vitest';

import {
  buildDetectorEmbedderModelLoadTargets,
  createModelLoadOrchestrator,
} from '../src/app/model-load-orchestrator';

describe('buildDetectorEmbedderModelLoadTargets', () => {
  it('returns empty when both models are missing', () => {
    expect(buildDetectorEmbedderModelLoadTargets(undefined, undefined)).toEqual([]);
  });

  it('returns only detector when embedder is missing', () => {
    const d = { load: vi.fn().mockResolvedValue(undefined) };
    const t = buildDetectorEmbedderModelLoadTargets(d, undefined);
    expect(t).toHaveLength(1);
    expect(t[0]!.key).toBe('detector');
  });
});

describe('createModelLoadOrchestrator', () => {
  it('resolves true with no active targets', async () => {
    const o = createModelLoadOrchestrator({
      targets: [],
      failedMessage: 'fail',
    });
    await expect(o.run()).resolves.toBe(true);
  });

  it('runs loads and returns true on success with setStatus when no UI', async () => {
    const setStatus = vi.fn();
    const det = { load: vi.fn().mockResolvedValue(undefined) };
    const o = createModelLoadOrchestrator({
      targets: buildDetectorEmbedderModelLoadTargets(det, undefined),
      failedMessage: 'load failed',
      loadingMessage: 'Loading…',
      setStatus,
    });
    await expect(o.run()).resolves.toBe(true);
    expect(det.load).toHaveBeenCalled();
    expect(setStatus).toHaveBeenCalled();
  });

  it('returns false and sets status on failure when no UI', async () => {
    const setStatus = vi.fn();
    const det = { load: vi.fn().mockRejectedValue(new Error('x')) };
    const o = createModelLoadOrchestrator({
      targets: buildDetectorEmbedderModelLoadTargets(det, undefined),
      failedMessage: 'load failed',
      setStatus,
    });
    await expect(o.run()).resolves.toBe(false);
    expect(setStatus).toHaveBeenCalledWith('load failed');
  });

  it('configures mock UI, completes stages, and hides on success', async () => {
    const configure = vi.fn();
    const markStageComplete = vi.fn();
    const clearError = vi.fn();
    const setRetryHandler = vi.fn();
    const showLoading = vi.fn();
    const hide = vi.fn();
    const modelLoadUi = {
      configure,
      markStageComplete,
      clearError,
      setRetryHandler,
      showLoading,
      hide,
    };
    const d = { load: vi.fn().mockResolvedValue(undefined) };
    const e = { load: vi.fn().mockResolvedValue(undefined) };
    const onReady = vi.fn();
    const o = createModelLoadOrchestrator({
      targets: buildDetectorEmbedderModelLoadTargets(d, e),
      modelLoadUi: modelLoadUi as never,
      failedMessage: 'failed',
      onReady,
    });
    await expect(o.run()).resolves.toBe(true);
    expect(configure).toHaveBeenCalled();
    expect(markStageComplete).toHaveBeenCalledWith('detector');
    expect(markStageComplete).toHaveBeenCalledWith('embedder');
    expect(hide).toHaveBeenCalled();
    expect(onReady).toHaveBeenCalled();
  });

  it('retry triggers onRetryRequested and can call run again', async () => {
    const onRetryRequested = vi.fn();
    const d = { load: vi.fn().mockResolvedValue(undefined) };
    const o = createModelLoadOrchestrator({
      targets: buildDetectorEmbedderModelLoadTargets(d, undefined),
      failedMessage: 'f',
      onRetryRequested,
    });
    o.retry();
    expect(onRetryRequested).toHaveBeenCalled();
  });
});

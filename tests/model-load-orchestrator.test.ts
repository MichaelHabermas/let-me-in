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
  function deferred<T>() {
    let resolve!: (value: T | PromiseLike<T>) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  }

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

  it('returns false for stale generation when retry starts a newer run', async () => {
    const first = deferred<void>();
    const d = { load: vi.fn(() => first.promise) };
    const o = createModelLoadOrchestrator({
      targets: buildDetectorEmbedderModelLoadTargets(d, undefined),
      failedMessage: 'f',
    });

    const firstRun = o.run();
    o.retry();
    first.resolve();

    await expect(firstRun).resolves.toBe(false);
  });

  it('wires modelLoadUi retry handler to clear error and rerun', async () => {
    const clearError = vi.fn();
    const showError = vi.fn();
    const setRetryHandler = vi.fn();
    const modelLoadUi = {
      configure: vi.fn(),
      markStageComplete: vi.fn(),
      clearError,
      setRetryHandler,
      showLoading: vi.fn(),
      hide: vi.fn(),
      showError,
    };
    const onRetryRequested = vi.fn();
    const d = {
      load: vi
        .fn()
        .mockRejectedValueOnce(new Error('first fail'))
        .mockResolvedValueOnce(undefined),
    };
    const o = createModelLoadOrchestrator({
      targets: buildDetectorEmbedderModelLoadTargets(d, undefined),
      modelLoadUi: modelLoadUi as never,
      failedMessage: 'failed',
      onRetryRequested,
    });

    await expect(o.run()).resolves.toBe(false);
    const retry = setRetryHandler.mock.calls.at(-1)?.[0] as (() => void) | null;
    expect(retry).not.toBeNull();
    retry?.();

    await Promise.resolve();
    await Promise.resolve();

    expect(clearError).toHaveBeenCalled();
    expect(onRetryRequested).toHaveBeenCalled();
    expect(d.load).toHaveBeenCalledTimes(2);
    expect(showError).toHaveBeenCalledWith('failed');
  });
});

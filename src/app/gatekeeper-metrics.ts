/**
 * PRD §5.2 — structured timings for validation (E10) and dev profiling.
 * `window.__gatekeeperMetrics` holds the latest snapshot (mutable object).
 */

export type GatekeeperMetricsSnapshot = {
  /** Wall ms for last `detector.load()` (parallel runs record independently). */
  detectorLoadMs: number | null;
  embedderLoadMs: number | null;
  /** Last `detector.infer()` duration (single-flight frame). */
  lastDetectorInferMs: number | null;
  /** Last `embedFace` wall time (crop + preprocess + embedder.infer + L2 norm). */
  lastEmbedInferMs: number | null;
  /** Last `evaluateDecision` (match + policy + PNG blob) wall time. */
  lastAccessEvaluationMs: number | null;
  /** `performance.now()` when decision UI last rendered. */
  lastDecisionWallMs: number | null;
  /** Once per page load: ms from navigation time origin to first successful detector+embedder ready. */
  navigationToDetectorReadyMs: number | null;
};

export const gatekeeperMetricsState: GatekeeperMetricsSnapshot = {
  detectorLoadMs: null,
  embedderLoadMs: null,
  lastDetectorInferMs: null,
  lastEmbedInferMs: null,
  lastAccessEvaluationMs: null,
  lastDecisionWallMs: null,
  navigationToDetectorReadyMs: null,
};

let navigationReadyRecorded = false;

function tryMeasure(name: string, startMark: string, endMark: string): number | null {
  try {
    performance.measure(name, startMark, endMark);
    const list = performance.getEntriesByName(name, 'measure');
    const last = list[list.length - 1];
    performance.clearMeasures(name);
    return last ? last.duration : null;
  } catch {
    return null;
  }
}

export function installGatekeeperMetricsOnWindow(): void {
  if (typeof window === 'undefined') return;
  (window as unknown as { __gatekeeperMetrics: GatekeeperMetricsSnapshot }).__gatekeeperMetrics =
    gatekeeperMetricsState;
}

export function recordDetectorLoadMs(ms: number): void {
  gatekeeperMetricsState.detectorLoadMs = ms;
}

export function recordEmbedderLoadMs(ms: number): void {
  gatekeeperMetricsState.embedderLoadMs = ms;
}

export function recordLastDetectorInferMs(ms: number): void {
  gatekeeperMetricsState.lastDetectorInferMs = ms;
}

export function recordLastEmbedInferMs(ms: number): void {
  gatekeeperMetricsState.lastEmbedInferMs = ms;
}

export function recordLastAccessEvaluationMs(ms: number): void {
  gatekeeperMetricsState.lastAccessEvaluationMs = ms;
}

export function recordDecisionPresented(): void {
  gatekeeperMetricsState.lastDecisionWallMs = performance.now();
}

/** Call once when both models finished loading successfully for the gate session. */
export function maybeRecordNavigationToDetectorReady(): void {
  if (navigationReadyRecorded) return;
  navigationReadyRecorded = true;
  gatekeeperMetricsState.navigationToDetectorReadyMs = performance.now();
}

/**
 * Wraps async work with `performance.mark` / `measure` (best-effort) and records duration.
 */
export async function withMeasuredLoad(
  label: 'detector' | 'embedder',
  work: () => Promise<void>,
): Promise<void> {
  const start = `gk-${label}-load-start`;
  const end = `gk-${label}-load-end`;
  const measureName = `gk-${label}-load`;
  try {
    performance.mark(start);
  } catch {
    /* ignore */
  }
  const t0 = performance.now();
  try {
    await work();
  } finally {
    const wall = performance.now() - t0;
    try {
      performance.mark(end);
      const m = tryMeasure(measureName, start, end);
      const ms = m ?? wall;
      if (label === 'detector') recordDetectorLoadMs(ms);
      else recordEmbedderLoadMs(ms);
    } catch {
      if (label === 'detector') recordDetectorLoadMs(wall);
      else recordEmbedderLoadMs(wall);
    }
    try {
      performance.clearMarks(start);
      performance.clearMarks(end);
    } catch {
      /* ignore */
    }
  }
}

/** Vitest / isolated runs: reset one-shot navigation timing. */
export function resetGatekeeperMetricsForTests(): void {
  navigationReadyRecorded = false;
  gatekeeperMetricsState.detectorLoadMs = null;
  gatekeeperMetricsState.embedderLoadMs = null;
  gatekeeperMetricsState.lastDetectorInferMs = null;
  gatekeeperMetricsState.lastEmbedInferMs = null;
  gatekeeperMetricsState.lastAccessEvaluationMs = null;
  gatekeeperMetricsState.lastDecisionWallMs = null;
  gatekeeperMetricsState.navigationToDetectorReadyMs = null;
}

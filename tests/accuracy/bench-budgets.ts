/**
 * SPECS / PRD / docs/BENCHMARKS.md — same numbers as the “Budget” column in BENCHMARKS.md.
 * Used for a **smoke** pass/fail on stub runs; canonical evidence is still MBP + desktop Chrome.
 */
export const BUDGETS_MS = {
  /** BENCHMARKS “Detector infer”; SPECS deep-dive “Face Detection Latency < 500ms per frame” (p50 check). */
  detectorInferP50: 500,
  /** BENCHMARKS “End-to-end to decision”. */
  endToEndToDecision: 3000,
  /** BENCHMARKS “Cold navigation → models ready”. */
  coldNavToModelsReady: 8000,
} as const;

export function reportDetectionBudgets(p50: number, p90: number, p99: number): boolean {
  const max = BUDGETS_MS.detectorInferP50;
  const ok = p50 < max;
  console.error(
    `[bench:detection] Quick check (BENCHMARKS / SPECS: detector infer p50 < ${max} ms): \n${ok ? 'PASS' : 'FAIL'} — p50=${p50} p90=${p90} p99=${p99}\n`,
  );
  return ok;
}

export function reportE2eBudget(clickToFirstEvaluationWallMs: number): boolean {
  const max = BUDGETS_MS.endToEndToDecision;
  const ok = clickToFirstEvaluationWallMs < max;
  console.error(
    `[bench:e2e] Quick check (BENCHMARKS: end-to-end to decision < ${max} ms): \n${ok ? 'PASS' : 'FAIL'} — clickToFirstEvaluationWallMs=${clickToFirstEvaluationWallMs}`,
  );
  return ok;
}

export function reportColdLoadBudget(navigationToDetectorReadyMs: number | null | undefined): boolean {
  const max = BUDGETS_MS.coldNavToModelsReady;
  if (navigationToDetectorReadyMs == null) {
    console.error(
      `[bench:cold-load] Quick check (BENCHMARKS: cold nav → models ready < ${max} ms): \nFAIL — navigationToDetectorReadyMs is missing\n`,
    );
    return false;
  }
  const ok = navigationToDetectorReadyMs < max;
  console.error(
    `[bench:cold-load] Quick check (BENCHMARKS: cold nav → models ready < ${max} ms): \n${ok ? 'PASS' : 'FAIL'} — navigationToDetectorReadyMs=${navigationToDetectorReadyMs}\n`,
  );
  return ok;
}

/** Short footer: stub context + optional strict mode. */
export function printBenchStubFooter(scriptName: string): void {
  console.error(
    `[bench:${scriptName}] Stub/headless 5199 run is not canonical hardware evidence — see docs/BENCHMARKS.md. ` +
      'Set BENCH_STRICT=1 to exit with code 1 when a quick check fails.\n',
  );
}

export function exitIfBenchStrictAndFailed(scriptName: string, ok: boolean): void {
  if (!ok && process.env.BENCH_STRICT === '1') {
    console.error(`[bench:${scriptName}] BENCH_STRICT=1: exiting with code 1 (budget miss).\n`);
    process.exit(1);
  }
}

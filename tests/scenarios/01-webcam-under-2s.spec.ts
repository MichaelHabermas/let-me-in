import { expect, test } from '@playwright/test';
import { acceptGateConsent, E2E_GATE_SCENARIO_LS_KEY, startGateCamera } from './_helpers';

/**
 * Automated leg: stub gate pipeline — time from programmatic click to first detector infer.
 * Manual leg (real GUM &lt;2s on MBP): see `docs/E10_SCENARIO_RESULTS.md`.
 */
test.describe('E10.S1.F1.T1 scenario 1 — webcam timing', () => {
  test('stubbed gate: click to first infer is under 2000 ms', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.removeItem(key);
    }, E2E_GATE_SCENARIO_LS_KEY);
    await acceptGateConsent(page);

    const elapsedMs = await page.evaluate(async () => {
      const btn = document.querySelector<HTMLButtonElement>('[data-testid="gate-camera-toggle"]');
      if (!btn) throw new Error('missing gate camera toggle');
      const t0 = performance.now();
      btn.click();
      await new Promise<void>((resolve, reject) => {
        const deadline = performance.now() + 10_000;
        const tick = () => {
          const m = (window as unknown as { __gatekeeperMetrics?: { lastDetectorInferMs: number | null } })
            .__gatekeeperMetrics;
          if (m?.lastDetectorInferMs != null) {
            resolve();
            return;
          }
          if (performance.now() > deadline) {
            reject(new Error('timeout waiting for first infer'));
            return;
          }
          requestAnimationFrame(tick);
        };
        tick();
      });
      return performance.now() - t0;
    });

    expect(elapsedMs).toBeLessThan(2000);
  });
});

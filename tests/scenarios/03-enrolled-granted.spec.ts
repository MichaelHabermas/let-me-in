import { expect, test } from '@playwright/test';
import {
  acceptGateConsent,
  E2E_GATE_SCENARIO_LS_KEY,
  enrollOneStubUser,
  startGateCamera,
} from './_helpers';

/** E10.S1.F1.T3 — enrolled user receives GRANTED within budget (stubbed pipeline). */
test.describe('E10.S1.F1.T3 scenario 3 — enrolled GRANTED', () => {
  test('shows granted banner under 3000 ms after camera start', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'granted');
    }, E2E_GATE_SCENARIO_LS_KEY);
    await enrollOneStubUser(page, 'Granted User');
    await acceptGateConsent(page);

    const t0 = Date.now();
    await startGateCamera(page);
    await page.locator('.banner--granted').waitFor({ state: 'visible', timeout: 15_000 });
    expect(Date.now() - t0).toBeLessThan(3000);
  });
});

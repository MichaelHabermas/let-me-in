import { expect, test } from '@playwright/test';
import {
  acceptGateConsent,
  adminLogin,
  E2E_GATE_SCENARIO_LS_KEY,
  startGateCamera,
} from './_helpers';

/** E10.S1.F1.T6 — multi-face → status message, no GRANTED/DENIED banner. */
test.describe('E10.S1.F1.T6 scenario 6 — two people', () => {
  test('shows multi-face guidance without granted/denied banner', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'multi');
    }, E2E_GATE_SCENARIO_LS_KEY);
    await adminLogin(page);
    await page.goto('/');
    await acceptGateConsent(page);
    await startGateCamera(page);
    await expect(page.locator('.gate-status')).toContainText(/multiple faces/i, {
      timeout: 15_000,
    });
    await expect(page.locator('.banner--granted')).toHaveCount(0);
    await expect(page.locator('.banner--denied')).toHaveCount(0);
  });
});

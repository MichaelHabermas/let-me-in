import { expect, test } from '@playwright/test';
import {
  acceptGateConsent,
  E2E_GATE_SCENARIO_LS_KEY,
  enrollOneStubUser,
  startGateCamera,
} from './_helpers';

/** E10.S1.F1.T8 — access log shows prior attempts. */
test.describe('E10.S1.F1.T8 scenario 8 — log prior attempts', () => {
  test('log lists granted then denied rows', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'granted');
    }, E2E_GATE_SCENARIO_LS_KEY);
    await enrollOneStubUser(page, 'Log User');
    await acceptGateConsent(page);
    await startGateCamera(page);
    await page.locator('.banner--granted').waitFor({ state: 'visible', timeout: 15_000 });
    await page.waitForTimeout(3100);

    await page.evaluate((key) => {
      localStorage.setItem(key, 'denied');
    }, E2E_GATE_SCENARIO_LS_KEY);
    await page.waitForTimeout(500);
    await page.locator('.banner--denied').waitFor({ state: 'visible', timeout: 15_000 });

    await page.goto('/log');
    await page.getByTestId('log-table-body').waitFor({ state: 'visible' });
    const body = page.getByTestId('log-table-body');
    const rowCount = await body.locator('tr').count();
    expect(rowCount).toBeGreaterThanOrEqual(2);
    await expect(body).toContainText(/GRANTED/i);
    await expect(body).toContainText(/DENIED/i);
  });
});

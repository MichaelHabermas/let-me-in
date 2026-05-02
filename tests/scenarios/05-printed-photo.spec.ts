import { expect, test } from '@playwright/test';
import {
  acceptGateConsent,
  E2E_GATE_SCENARIO_LS_KEY,
  enrollOneStubUser,
  startGateCamera,
} from './_helpers';

test.describe('E21.S4.F1.T1 scenario 5 — printed photo spoof risk', () => {
  test('does not grant and surfaces presentation-attack risk', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'printed');
    }, E2E_GATE_SCENARIO_LS_KEY);
    await enrollOneStubUser(page, 'Printed Target');
    await acceptGateConsent(page);
    await startGateCamera(page);
    await page.locator('.banner--denied').waitFor({ state: 'visible', timeout: 15_000 });
    await expect(page.getByTestId('gate-decision')).toBeVisible();
    await expect(page.getByTestId('gate-decision')).toContainText(/presentation attack risk/i);
  });
});

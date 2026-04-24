import { expect, test } from '@playwright/test';
import {
  acceptGateConsent,
  E2E_GATE_SCENARIO_LS_KEY,
  enrollOneStubUser,
  startGateCamera,
} from './_helpers';

/** E10.S1.F1.T4 — low-similarity live face → DENIED + Unknown (stub embedder). */
test.describe('E10.S1.F1.T4 scenario 4 — unenrolled / unknown denied', () => {
  test('denied banner with enrolled user present but mismatch embedding', async ({ page }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'denied');
    }, E2E_GATE_SCENARIO_LS_KEY);
    await enrollOneStubUser(page, 'Other User');
    await acceptGateConsent(page);
    await startGateCamera(page);
    await page.locator('.banner--denied').waitFor({ state: 'visible', timeout: 15_000 });
    await expect(page.getByTestId('gate-decision')).toContainText(/unknown/i);
  });
});

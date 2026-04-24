import { expect, test } from '@playwright/test';
import {
  acceptGateConsent,
  E2E_GATE_SCENARIO_LS_KEY,
  enrollOneStubUser,
  startGateCamera,
} from './_helpers';

/**
 * E10.S1.F1.T5 — printed-photo / spoof stretch.
 * Stub path treats `printed` like weak embedding; outcome is recorded for the audit trail.
 */
test.describe('E10.S1.F1.T5 scenario 5 — printed photo (honest stub)', () => {
  test('runs pipeline and surfaces denied outcome (no dedicated liveness in MVP)', async ({
    page,
  }) => {
    await page.addInitScript((key) => {
      localStorage.setItem(key, 'printed');
    }, E2E_GATE_SCENARIO_LS_KEY);
    await enrollOneStubUser(page, 'Printed Target');
    await acceptGateConsent(page);
    await startGateCamera(page);
    await page.locator('.banner--denied').waitFor({ state: 'visible', timeout: 15_000 });
    await expect(page.getByTestId('gate-decision')).toBeVisible();
  });
});

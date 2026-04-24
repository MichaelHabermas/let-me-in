/**
 * Navigate to the gate and wait until the camera toggle is clickable.
 * Consent modal may mount after async IndexedDB — poll like scenario tests.
 */
import { expect, type Page } from '@playwright/test';
import { E2E_GATE_SCENARIO_KEY } from '../../src/app/e2e-gate-scenario-key';

export type PrepareGatePageOptions = {
  /**
   * When true, register an init script that clears {@link E2E_GATE_SCENARIO_KEY} before load.
   * Use for Node accuracy benches only — Playwright scenario specs set this key via their own
   * `addInitScript` and must not have a later-registered remover wipe it on `goto`.
   */
  clearE2eScenario?: boolean;
};

export async function prepareGatePage(
  page: Page,
  baseURL: string,
  options?: PrepareGatePageOptions,
): Promise<void> {
  if (options?.clearE2eScenario) {
    await page.addInitScript((key) => {
      localStorage.removeItem(key);
    }, E2E_GATE_SCENARIO_KEY);
  }
  await page.goto(baseURL, { waitUntil: 'domcontentloaded' });
  const toggle = page.getByTestId('gate-camera-toggle');
  await toggle.waitFor({ state: 'visible' });
  const consentBtn = page.getByRole('button', { name: /understand/i });
  let consentClicked = false;
  await expect
    .poll(
      async () => {
        if (await toggle.isEnabled()) return true;
        if (!consentClicked && (await consentBtn.isVisible().catch(() => false))) {
          await consentBtn.click();
          consentClicked = true;
        }
        return await toggle.isEnabled();
      },
      { timeout: 15_000 },
    )
    .toBe(true);
}

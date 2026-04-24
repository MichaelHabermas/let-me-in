import { expect, type Page } from '@playwright/test';

import { E2E_GATE_SCENARIO_KEY } from '../../src/app/e2e-gate-scenario-key';

/** Alias for scenario specs — same value as {@link E2E_GATE_SCENARIO_KEY}. */
export const E2E_GATE_SCENARIO_LS_KEY = E2E_GATE_SCENARIO_KEY;

/** After save the enrollment camera may still be running; next toolbar click stops it — recover until Capture is enabled. */
export async function startEnrollmentCameraForCapture(page: Page): Promise<void> {
  await page.getByTestId('enroll-camera').click();
  try {
    await expect(page.getByTestId('enroll-capture')).toBeEnabled({ timeout: 2000 });
  } catch {
    await page.getByTestId('enroll-camera').click();
    await expect(page.getByTestId('enroll-capture')).toBeEnabled({ timeout: 10_000 });
  }
}

export async function adminLogin(page: Page): Promise<void> {
  await page.goto('/admin');
  await page.getByTestId('admin-login-user').fill('e2e_admin');
  await page.getByTestId('admin-login-pass').fill('e2e_secret');
  await page.getByTestId('admin-login-submit').click();
  await page.getByTestId('admin-enroll-root').waitFor({ state: 'visible' });
}

export async function enrollOneStubUser(page: Page, name = 'Scenario User'): Promise<void> {
  await adminLogin(page);
  await startEnrollmentCameraForCapture(page);
  await page.getByTestId('enroll-capture').click();
  await page.getByTestId('enroll-name').fill(name);
  await page.getByTestId('enroll-role').selectOption('Staff');
  await page.getByTestId('enroll-save').click();
  await page.getByTestId('enroll-status').waitFor({ state: 'visible' });
  await expect(page.getByTestId('admin-user-roster-tbody')).toContainText(name, { timeout: 10_000 });
}

export async function acceptGateConsent(page: Page): Promise<void> {
  await page.goto('/');
  const consentBtn = page.getByRole('button', { name: /understand/i });
  if (await consentBtn.isVisible().catch(() => false)) {
    await consentBtn.click();
  }
  await page.getByTestId('gate-camera-toggle').waitFor({ state: 'visible' });
  await expect(page.getByTestId('gate-camera-toggle')).toBeEnabled({ timeout: 15_000 });
}

export async function startGateCamera(page: Page): Promise<void> {
  await page.getByTestId('gate-camera-toggle').click();
}

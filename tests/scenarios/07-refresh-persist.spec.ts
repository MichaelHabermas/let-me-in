import { expect, test } from '@playwright/test';
import { adminLogin, startEnrollmentCameraForCapture } from './_helpers';

/** E10.S1.F1.T7 — roster survives reload. */
test.describe('E10.S1.F1.T7 scenario 7 — refresh persistence', () => {
  test('two stub enrollments remain after reload', async ({ page }) => {
    await adminLogin(page);
    for (const name of ['Persist A', 'Persist B']) {
      await startEnrollmentCameraForCapture(page);
      await page.getByTestId('enroll-capture').click();
      await page.getByTestId('enroll-name').fill(name);
      await page.getByTestId('enroll-role').selectOption('Staff');
      await page.getByTestId('enroll-save').click();
      await page.getByTestId('enroll-status').waitFor({ state: 'visible' });
      await expect(page.getByTestId('admin-user-roster-tbody')).toContainText(name, {
        timeout: 10_000,
      });
    }
    await page.reload();
    await page.getByTestId('admin-enroll-root').waitFor({ state: 'visible' });
    const rows = page.locator('[data-testid="admin-user-roster-tbody"] tr');
    await expect(rows).toHaveCount(2);
  });
});

import { expect, test } from '@playwright/test';

test.describe('admin enrollment (E2E doubles)', () => {
  test('walks idle → saved with enrollment controller + doubles', async ({ page }) => {
    await page.goto('/admin');
    await page.getByTestId('admin-login-user').fill('e2e_admin');
    await page.getByTestId('admin-login-pass').fill('e2e_secret');
    await page.getByTestId('admin-login-submit').click();

    await expect(page.getByTestId('admin-enroll-root')).toBeVisible();

    await expect(page.getByTestId('enroll-start')).toBeEnabled();
    await page.getByTestId('enroll-start').click();

    await expect(page.getByTestId('enroll-capture')).toBeEnabled();
    await page.getByTestId('enroll-capture').click();

    await page.getByTestId('enroll-name').fill('Test User');
    await page.getByTestId('enroll-role').fill('Staff');
    await page.getByTestId('enroll-save').click();

    await expect(page.getByTestId('enroll-status')).toContainText(/saved/i);
  });
});

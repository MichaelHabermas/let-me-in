import { expect, test } from '@playwright/test';

test.describe('admin login', () => {
  test('wrong password keeps modal; correct password shows enrollment', async ({ page }) => {
    await page.goto('/admin');

    await expect(page.getByTestId('admin-login-modal')).toBeVisible();
    await page.getByTestId('admin-login-user').fill('e2e_admin');
    await page.getByTestId('admin-login-pass').fill('wrong');
    await page.getByTestId('admin-login-submit').click();

    await expect(page.getByRole('alert')).toBeVisible();

    await page.getByTestId('admin-login-pass').fill('e2e_secret');
    await page.getByTestId('admin-login-submit').click();

    await expect(page.getByTestId('admin-enroll-root')).toBeVisible();
    await expect(page.getByTestId('admin-login-modal')).toHaveCount(0);
  });
});

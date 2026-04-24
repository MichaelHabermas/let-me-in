import { expect, test } from '@playwright/test';
import { enrollOneStubUser } from './_helpers';

/** E10.S1.F1.T2 — admin enroll happy path (stubbed camera / ONNX). */
test.describe('E10.S1.F1.T2 scenario 2 — admin enroll', () => {
  test('walks idle → saved with enrollment controller + doubles', async ({ page }) => {
    await enrollOneStubUser(page, 'E10 S2 User');
    await expect(page.getByTestId('enroll-status')).toContainText(/saved/i);
  });
});

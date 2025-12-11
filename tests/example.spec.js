import { test, expect } from '@playwright/test';

test('example.com is reachable', async ({ page }) => {
  await page.goto('https://example.com/');
  await expect(page).toHaveTitle(/Example Domain/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Example Domain');
});


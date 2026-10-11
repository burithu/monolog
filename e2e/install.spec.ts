import { expect, test } from '@playwright/test';

// First visit in a browser tab shows an install screen instead of the app.
test.use({ storageState: { cookies: [], origins: [] } });

test('install button opens the browser install dialog; then it says installed', async ({ page }) => {
  await page.goto('./');
  const prompt = page.getByRole('dialog', { name: 'Monolog' });
  await expect(prompt).toBeVisible();
  await expect(prompt.getByText('Getting the app ready…')).toBeVisible();

  // Simulate Chrome deciding the app is installable, and the user accepting.
  await page.evaluate(() => {
    const e = new Event('beforeinstallprompt') as Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };
    e.prompt = async () => {
      (window as unknown as { prompted: boolean }).prompted = true;
    };
    e.userChoice = Promise.resolve({ outcome: 'accepted' });
    window.dispatchEvent(e);
  });
  await prompt.getByRole('button', { name: 'Install Monolog' }).click();
  expect(await page.evaluate(() => (window as unknown as { prompted?: boolean }).prompted)).toBe(true);
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(prompt.getByText(/Installed\./)).toBeVisible();
  await prompt.getByRole('button', { name: 'Close' }).click();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
});

test('without an install event it shows the menu steps; "use in browser" hides it for good', async ({ page }) => {
  await page.goto('./');
  const prompt = page.getByRole('dialog', { name: 'Monolog' });
  await expect(prompt.getByText('Install app')).toBeVisible({ timeout: 8000 });
  await prompt.getByRole('button', { name: 'Use in browser instead' }).click();
  await expect(prompt).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect(page.getByRole('dialog', { name: 'Monolog' })).toHaveCount(0);
});

const IOS_SAFARI =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IOS_CHROME =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1';
const INSTAGRAM =
  'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 Instagram 350.0.0.0.0 (iPhone15,2; iOS 18_0; en_US)';

test.describe('iPhone Safari', () => {
  test.use({ userAgent: IOS_SAFARI });
  test('shows the Add to Home Screen steps, including the newer ⋯ menu', async ({ page }) => {
    await page.goto('./');
    const prompt = page.getByRole('dialog', { name: 'Monolog' });
    await expect(prompt.getByText('Add to Home Screen')).toBeVisible();
    await expect(prompt.getByText(/on newer iPhones, tap/)).toBeVisible();
  });
});

test.describe('iPhone Chrome', () => {
  test.use({ userAgent: IOS_CHROME });
  test('shows the share-menu steps for other iPhone browsers', async ({ page }) => {
    await page.goto('./');
    await expect(page.getByRole('dialog', { name: 'Monolog' }).getByText(/next to the address bar/)).toBeVisible();
  });
});

test.describe('in-app browser', () => {
  test.use({ userAgent: INSTAGRAM });
  test('asks to open the page in a real browser, with a copy-link button', async ({ page }) => {
    await page.goto('./');
    const prompt = page.getByRole('dialog', { name: 'Monolog' });
    await expect(prompt.getByText('Open in Safari')).toBeVisible();
    await expect(prompt.getByRole('button', { name: 'Copy link' })).toBeVisible();
  });
});

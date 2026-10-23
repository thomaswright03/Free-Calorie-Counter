const { test, expect } = require('./fixtures');

test('a new user is told on Today that Free Calorie Counter is free and their data stays on the phone, until they log something', async ({ page, appURL }) => {
  await page.goto(appURL);
  const note = page.locator('main [data-your-data]');
  await expect(note).toContainText('Free Calorie Counter is free. Your calories and weight stay on this phone and are never uploaded.');
  await note.getByRole('link', { name: 'About your data' }).click();
  await expect(page).toHaveURL(/#\/settings$/);
  await expect(page.getByRole('heading', { name: 'Free and private' })).toBeVisible();
  await expect(page.locator('main [data-your-data]')).toContainText('Free Calorie Counter has no server, so nothing is ever uploaded.');

  await page.goto(`${appURL}/#/`);
  await page.getByLabel('Weight (lbs)').fill('180');
  await page.getByLabel('Weight (lbs)').press('Enter');
  await expect(page.getByText('Saved', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await expect(page.locator('main [data-your-data]')).toHaveCount(0);
});

test('Settings links to the privacy policy and terms of service, which lead back into the app', async ({ page, appURL }) => {
  await page.goto(`${appURL}/#/settings`);
  const links = page.locator('main [data-legal-links]');
  await links.getByRole('link', { name: 'Privacy policy' }).click();
  await expect(page.getByRole('heading', { name: 'Privacy policy', level: 1 })).toBeVisible();
  await expect(page.getByText('we don’t collect, see or store any of your information')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cookies and similar technology' })).toBeVisible();
  await page.getByRole('link', { name: 'Terms of service' }).click();
  await expect(page.getByRole('heading', { name: 'Terms of service', level: 1 })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Not medical advice' })).toBeVisible();
  await page.getByRole('link', { name: 'Back to Free Calorie Counter' }).click();
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
});

test('the privacy policy and terms follow the app’s theme', async ({ page, appURL }) => {
  // Dark until a theme is chosen, whatever the device is set to.
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto(`${appURL}/privacy.html`);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe('rgb(7, 10, 18)');
  // With System chosen in Settings, they follow the device.
  await page.evaluate(() => localStorage.setItem('fcc:theme', 'system'));
  for (const scheme of ['light', 'dark']) {
    await page.emulateMedia({ colorScheme: scheme });
    for (const name of ['privacy.html', 'terms.html']) {
      await page.goto(`${appURL}/${name}`);
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      expect(bg, `${name} ${scheme}`).toBe(scheme === 'light' ? 'rgb(246, 244, 238)' : 'rgb(7, 10, 18)');
    }
  }
});

const { test, expect, TODAY, day } = require('./fixtures');

// A 2x2 PNG.
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAANHQEDasKb6QAAAABJRU5ErkJggg==',
  'base64'
);

test('Delete all my data empties localStorage and both photo databases', async ({ page, appURL, data }) => {
  await data.seed({ [TODAY]: day(TODAY, { breakfast: 400 }) });
  await page.goto(`${appURL}/#/photos`);
  await page.locator('input[type=file]').setInputFiles({ name: 'me.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.getByRole('status').filter({ hasText: 'Photo added' })).toBeVisible();
  await page.goto(`${appURL}/#/settings`);
  await page.getByLabel('Calories per day').fill('2000');
  await page.getByLabel('Calories per day').blur();
  await expect(page.getByText('Goal saved: 2,000 calories a day')).toBeVisible();

  await page.getByRole('button', { name: 'Delete all my data…' }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete all your data?' });
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  expect(await page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith('fcc:')).length)).toBeGreaterThan(0);

  await page.getByRole('button', { name: 'Delete all my data…' }).click();
  await dialog.getByRole('button', { name: 'Delete everything' }).click();
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const dbs = (await indexedDB.databases()).map((d) => d.name).filter((n) => n === 'fcc-photos' || n === 'fcc-photo-index');
        const keys = Object.keys(localStorage).filter((k) => k.startsWith('fcc:') && k !== 'fcc:theme');
        return { keys, dbs };
      })
    )
    .toEqual({ keys: [], dbs: [] });
});

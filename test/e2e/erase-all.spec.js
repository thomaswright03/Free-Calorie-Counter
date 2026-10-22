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
  const reloaded = page.waitForEvent('load');
  await dialog.getByRole('button', { name: 'Delete everything' }).click();
  await reloaded;
  await expect(page.getByRole('heading', { name: 'Today' })).toBeVisible();
  // The app starts afresh after the wipe, so it may open an empty photo
  // store and note that a new user has no tour to see; nothing the person
  // saved may be left.
  await expect
    .poll(() =>
      page.evaluate(async () => {
        const keys = Object.keys(localStorage).filter((k) => k.startsWith('fcc:') && !['fcc:theme', 'fcc:whatsNewSeen'].includes(k));
        const photos = await new Promise((resolve) => {
          const req = indexedDB.open('fcc-photos');
          req.onsuccess = () => {
            const db = req.result;
            const names = [...db.objectStoreNames];
            if (!names.length) return resolve(0);
            const tx = db.transaction(names, 'readonly');
            let total = 0;
            names.forEach((n) => (tx.objectStore(n).count().onsuccess = (e) => (total += e.target.result)));
            tx.oncomplete = () => resolve(total);
          };
          req.onerror = () => resolve(-1);
        });
        return { keys, photos };
      })
    )
    .toEqual({ keys: [], photos: 0 });
  await page.goto(`${appURL}/#/settings`);
  await expect(page.getByLabel('Calories per day')).toHaveValue('');
});

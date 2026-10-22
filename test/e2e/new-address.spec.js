const { test, expect, TODAY, day } = require('./fixtures');

// The app as served at its old address, thomaswright03.github.io, from the
// local test server (no service worker, which a routed origin can't run).
const OLD = 'https://thomaswright03.github.io/Free-Calorie-Counter';
test.use({ serviceWorkers: 'block' });

async function openAtOldAddress(page, appURL) {
  await page.route(`${OLD}/**`, async (route) => {
    const path = route.request().url().slice(OLD.length) || '/';
    const res = await route.fetch({ url: `${appURL}${path}` });
    await route.fulfill({ response: res });
  });
}

test('at the old address, Today asks for a backup to move to the new one, once', async ({ page, appURL }) => {
  await openAtOldAddress(page, appURL);
  await page.goto(`${OLD}/`);
  await page.evaluate((e) => localStorage.setItem('fcc:entries', JSON.stringify(e)), { [TODAY]: day(TODAY, { lunch: 500 }) });
  await page.reload();
  const card = page.locator('[data-backup-reminder="move"]');
  await expect(card).toContainText('Free Calorie Counter is moving to calories.wrightaisolutions.com');
  await expect(card).toContainText('Settings → Import Backup');
  // The Home Screen note would install the old address, so it isn't shown.
  await expect(page.locator('[data-install-note]')).toHaveCount(0);

  const download = page.waitForEvent('download');
  await card.getByRole('button', { name: 'Back up now' }).click();
  await download;
  await card.getByRole('button', { name: 'I’ve saved it' }).click();
  await expect(card).toContainText('Import it at the new address');
  await page.reload();
  await expect(page.locator('[data-backup-reminder="move"]')).toHaveCount(0);
});

test('at the old address with nothing saved, there is nothing to move', async ({ page, appURL }) => {
  await openAtOldAddress(page, appURL);
  await page.goto(`${OLD}/`);
  await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
  await expect(page.locator('[data-backup-reminder]')).toHaveCount(0);
});

test('at any other address the usual backup reminder shows', async ({ page, data }) => {
  await data.seed({ [TODAY]: day(TODAY, { lunch: 500 }) });
  await page.reload();
  await expect(page.locator('[data-backup-reminder=""]')).toContainText('You haven');
});

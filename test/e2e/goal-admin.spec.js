const fs = require('node:fs');
const { test, expect, TODAY, day } = require('./fixtures');

async function setGoal(page, appURL, value) {
  await page.goto(`${appURL}/#/settings`);
  const box = page.getByLabel('Calories per day');
  await box.fill(value);
  await box.blur();
}

test('a daily goal shows on Today as consumed, goal and remaining, and rejects bad values', async ({ page, appURL, data }) => {
  await data.seed({ [TODAY]: day(TODAY, { breakfast: 1500 }) });
  await setGoal(page, appURL, '50');
  await expect(page.getByText('Enter a daily goal between 500 and 10,000 calories.')).toBeVisible();
  await page.getByLabel('Calories per day').fill('2,000');
  await page.getByLabel('Calories per day').blur();
  await expect(page.getByText('Goal saved: 2,000 calories a day')).toBeVisible();
  await page.goto(`${appURL}/#/`);
  await expect(page.locator('[data-goal-progress]')).toHaveText('of 2,000 goal · 500 left');
  await page.goto(`${appURL}/#/history`);
  await expect(page.getByText('500 left').first()).toBeVisible();
});

test('over the goal says over, and clearing the goal removes the line', async ({ page, appURL, data }) => {
  await data.seed({ [TODAY]: day(TODAY, { breakfast: 2300 }) });
  await setGoal(page, appURL, '2000');
  await page.goto(`${appURL}/#/`);
  await expect(page.locator('[data-goal-progress]')).toHaveText('of 2,000 goal · 300 over');
  await setGoal(page, appURL, '');
  await page.goto(`${appURL}/#/`);
  await expect(page.locator('[data-goal-progress]')).toBeHidden();
});

test('the goal goes into the backup file and comes back on restore; old backups still restore', async ({ page, appURL, data }, testInfo) => {
  await data.seed({ [TODAY]: day(TODAY, { breakfast: 400 }) });
  await setGoal(page, appURL, '1800');
  await expect(page.getByText('Goal saved')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /export/i }).first().click();
  const file = testInfo.outputPath('backup.json');
  await (await download).saveAs(file);
  expect(JSON.parse(fs.readFileSync(file, 'utf8')).settings).toEqual({ dailyGoal: 1800 });

  await setGoal(page, appURL, '');
  await page.locator('input[type=file]').setInputFiles(file);
  await page.getByRole('dialog', { name: 'Restore from this backup?' }).getByRole('button', { name: /Restore/ }).click();
  await expect(page.getByText(/Restored|already/).first()).toBeVisible();
  await expect(page.getByLabel('Calories per day')).toHaveValue('');
  await page.reload();
  await expect(page.getByLabel('Calories per day')).toHaveValue('1800');

  const old = testInfo.outputPath('old.json');
  fs.writeFileSync(old, JSON.stringify({ app: 'free-calorie-counter', version: 2, entries: { '2026-09-01': day('2026-09-01', { lunch: 500 }) } }));
  await page.locator('input[type=file]').setInputFiles(old);
  await page.getByRole('dialog', { name: 'Restore from this backup?' }).getByRole('button', { name: /Restore/ }).click();
  await expect(page.getByText('Restored 1 day.', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Calories per day')).toHaveValue('1800');
});

test('the status page runs real checks and groups them', async ({ page, appURL }) => {
  await page.goto(`${appURL}/#/admin`);
  await expect(page.getByRole('heading', { name: 'Status' })).toBeVisible();
  for (const tier of ['important', 'key', 'basic']) await expect(page.locator(`[data-admin-tier=${tier}]`)).toBeVisible();
  await expect(page.locator('[data-overall]')).toHaveAttribute('data-overall', 'ok');
  await expect(page.locator('[data-check="Meal and weight saving"]')).toContainText('OK');
  await expect(page.locator('[data-check="Photo store"]')).toContainText('OK');
  const json = JSON.parse(await page.locator('.admin-json').textContent());
  expect(json.product).toBe('Free Calorie Counter');
  expect(json.functions.length).toBeGreaterThanOrEqual(10);
  expect(json.functions[0]).toHaveProperty('last_success');
  expect(json.overall).toBe('ok');
  for (const f of json.functions) {
    expect(f.tier).toMatch(/^(important|key|basic)$/);
    expect(f.status).toMatch(/^(ok|warning|down|unknown)$/);
  }
});

test('overall status comes from the Important rows only', async ({ page, appURL }) => {
  await page.addInitScript(() => {
    localStorage.setItem('fcc:problems', 'x');
  });
  await page.goto(`${appURL}/#/admin`);
  await expect(page.locator('[data-check="Meal and weight saving"]')).toContainText('OK');
  const json = JSON.parse(await page.locator('.admin-json').textContent());
  const important = json.functions.filter((f) => f.tier === 'important');
  const worst = ['down', 'warning', 'ok'].find((s) => important.some((f) => f.status === s));
  expect(json.overall).toBe(worst);
});

test('Backup export shows Down when the saved days can’t be put in a backup', async ({ page, appURL, data }) => {
  await data.seed({ [TODAY]: day(TODAY, { breakfast: 300 }) });
  await page.addInitScript(() => {
    const real = JSON.stringify;
    JSON.stringify = (v, ...rest) => {
      if (v && typeof v === 'object' && Object.keys(v).some((k) => /^\d{4}-\d{2}-\d{2}$/.test(k))) throw new TypeError('cannot serialise');
      return real(v, ...rest);
    };
  });
  await page.goto(`${appURL}/#/admin`);
  await page.reload();
  const row = page.locator('[data-check="Backup export"]');
  await expect(row).toContainText('Down');
  await expect(row).toContainText('This check couldn’t run on this device. The browser said: cannot serialise.');
  await expect(row).not.toContainText('TypeError');
  await expect(page.locator('[data-overall]')).toHaveAttribute('data-overall', 'down');
});

test('status page times are on the device clock and name its time zone', async ({ page, appURL }) => {
  await page.goto(`${appURL}/#/admin`);
  // The tests run on Chicago time (CDT in September).
  await expect(page.locator('[data-check="Meal and weight saving"] .admin-times')).toHaveText(/^Last checked Sep 24, 2026, 10:\d\d AM CDT · last success Sep 24, 2026, 10:\d\d AM CDT$/);
  await expect(page.getByText(/^Checked Sep 24, 2026, 10:\d\d AM CDT\./)).toBeVisible();
});

test('blocked IndexedDB shows the photo store and the overall status as Down', async ({ page, appURL }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', { value: undefined, configurable: true });
  });
  await page.goto(`${appURL}/#/admin`);
  await expect(page.locator('[data-check="Photo store"]')).toContainText('Down');
  await expect(page.locator('[data-check="Browser storage for photos"]')).toContainText('Down');
  await expect(page.locator('[data-overall]')).toHaveAttribute('data-overall', 'down');
});

test('Settings has a Latest Update card with the frontend changes first', async ({ page, appURL }) => {
  await page.goto(`${appURL}/#/settings`);
  const card = page.locator('[data-latest-update]');
  await expect(card.getByRole('heading', { name: 'Latest Update' })).toBeVisible();
  await expect(card.getByRole('heading', { name: 'Frontend changes' })).toBeVisible();
  const headings = await card.getByRole('heading').allTextContents();
  expect(headings).toEqual(['Latest Update', 'Frontend changes', 'Summary']);
  await expect(card).toContainText('Reduce Motion');
  // Only the latest round is listed: older rounds are replaced, not added to.
  expect(await card.locator('.update-list li').count()).toBeLessThanOrEqual(6);
  await expect(card).toContainText(/[A-Z][a-z]{2} \d{1,2}, \d{4}/);
  await expect(card).not.toContainText(/\d{4}-\d{2}-\d{2}/);
  await page.locator('[data-app-status] a').click();
  await expect(page).toHaveURL(/#\/admin/);
});

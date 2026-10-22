const { default: AxeBuilder } = require('@axe-core/playwright');
const { test, expect, TODAY, day } = require('./fixtures');

// A new user on a phone, in a browser tab: adding Free Calorie Counter to the
// Home Screen comes before anything else.
test.use({ installed: false });

const gate = (page) => page.locator('[data-install-gate]');

test.describe('new user on iPhone, in a Safari tab', () => {
  test('the Home Screen steps are the whole screen, with no way past them', async ({ page, appURL }) => {
    await page.goto(appURL);
    await expect(gate(page)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'First, add Free Calorie Counter to your Home Screen' })).toBeVisible();
    await expect(gate(page)).toContainText('iPhone may delete your days and photos');
    expect(await gate(page).locator('li').allTextContents()).toEqual([
      'Tap the Share button (the square with an arrow) in Safari’s toolbar. Don’t see it? Tap ••• first.',
      'Tap Add to Home Screen (scroll down if you don’t see it), then Add.',
      'From now on, open Free Calorie Counter from its new icon.',
    ]);
    await expect(page.getByLabel('Weight (lbs)')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeHidden();
    await expect(gate(page).getByRole('button')).toHaveCount(0);
    await expect(page).toHaveTitle('Add to Home Screen · Free Calorie Counter');
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'best-practice']).analyze();
    expect(results.violations.map((v) => v.id)).toEqual([]);
  });

  test('a link to another screen still lands on the steps', async ({ page, appURL }) => {
    await page.goto(`${appURL}/#/history`);
    await expect(gate(page)).toBeVisible();
    await expect(page.getByRole('heading', { name: 'History' })).toHaveCount(0);
  });

  test('opened from the Home Screen, the app opens as usual', async ({ page, appURL }) => {
    await page.addInitScript(() => {
      Object.defineProperty(Navigator.prototype, 'standalone', { get: () => true, configurable: true });
    });
    await page.goto(appURL);
    await expect(page.getByLabel('Weight (lbs)')).toBeVisible();
    await expect(gate(page)).toHaveCount(0);
  });

  test('someone who already logged days here gets the app, with the note to back up and move', async ({ page, appURL, data }) => {
    await data.seed({ [TODAY]: day(TODAY, { breakfast: 400 }) });
    await page.goto(appURL);
    await expect(page.getByLabel('Weight (lbs)')).toBeVisible();
    await expect(gate(page)).toHaveCount(0);
    await expect(page.locator('[data-install-note]')).toBeVisible();
  });

  test('the status page stays open in a tab', async ({ page, appURL }) => {
    await page.goto(`${appURL}/#/admin`);
    await expect(gate(page)).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Status', exact: true })).toBeVisible();
  });
});

test.describe('new user on Android, in a browser tab', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Mobile Safari/537.36' });

  test('gets the Android steps', async ({ page, appURL }) => {
    await page.goto(appURL);
    await expect(gate(page)).toBeVisible();
    expect(await gate(page).locator('li').allTextContents()).toEqual([
      'Tap the menu button (⋮) in your browser’s toolbar.',
      'Tap Add to Home screen (or Install app), then Add.',
      'From now on, open Free Calorie Counter from its new icon.',
    ]);
    await expect(page.getByLabel('Weight (lbs)')).toHaveCount(0);
  });
});

test.describe('on a computer', () => {
  test.use({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36', hasTouch: false, isMobile: false });

  test('there is nothing to add, so the app opens as usual', async ({ page, appURL }) => {
    await page.goto(appURL);
    await expect(page.getByLabel('Weight (lbs)')).toBeVisible();
    await expect(gate(page)).toHaveCount(0);
  });
});

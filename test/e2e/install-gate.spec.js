const { default: AxeBuilder } = require('@axe-core/playwright');
const { test, expect, TODAY, day } = require('./fixtures');

// A new user on a phone, in a browser tab: adding Free Calorie Counter to the
// Home Screen comes before anything else.
test.use({ installed: false });

const gate = (page) => page.locator('[data-install-gate]');

test.describe('new user on iPhone, in a Safari tab', () => {
  test('a walkthrough is the whole screen, one step at a time, with no way past it', async ({ page, appURL }) => {
    await page.goto(appURL);
    await expect(gate(page)).toBeVisible();
    await expect(page).toHaveTitle('Add to Home Screen · Free Calorie Counter');
    await expect(page.getByRole('heading', { name: 'First, add Free Calorie Counter to your Home Screen' })).toBeVisible();
    await expect(gate(page)).toContainText('iPhone may delete your days and photos');
    await expect(page.getByLabel('Weight (lbs)')).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Main' })).toBeHidden();
    await expect(page.getByRole('link', { name: 'Settings' })).toBeHidden();
    await expect(gate(page).getByRole('button', { name: 'Back' })).toBeHidden();

    const titles = [];
    const axe = async () => {
      const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'best-practice']).analyze();
      expect(results.violations.map((v) => v.id)).toEqual([]);
    };
    await axe();
    await gate(page).getByRole('button', { name: 'Show me how' }).click();
    for (let i = 0; i < 4; i++) {
      const title = gate(page).locator('.walk-slide.is-active .walk-title');
      await expect(title).toBeFocused();
      titles.push(`${await gate(page).locator('.walk-slide.is-active .walk-count').textContent()}: ${await title.textContent()}`);
      if (i < 3) await gate(page).getByRole('button', { name: 'Next' }).click();
    }
    expect(titles).toEqual([
      'Our mission: Our mission',
      'Step 1 of 3: Tap the Share button',
      'Step 2 of 3: Tap Add to Home Screen, then Add',
      'Step 3 of 3: Open it from your new icon',
    ]);
    await axe();
    // Only the slide in view can be read or tapped.
    await expect(page.getByRole('heading', { level: 2 })).toHaveCount(1);
    // The last step goes back to the first tap, never into the app.
    await gate(page).getByRole('button', { name: 'See the steps again' }).click();
    await expect(page.getByRole('heading', { name: 'Tap the Share button' })).toBeVisible();
    await gate(page).getByRole('button', { name: 'Back' }).click();
    await expect(page.getByRole('heading', { name: 'Our mission' })).toBeVisible();
    await expect(page.getByLabel('Weight (lbs)')).toHaveCount(0);
  });

  test('our mission plays its video on a tap, with captions, and closes again', async ({ page, appURL }) => {
    await page.goto(appURL);
    await gate(page).getByRole('button', { name: 'Show me how' }).click();
    const play = page.locator('[data-mission-video]');
    await expect(play).toHaveAccessibleName(/mission video/);
    await expect(play.locator('img')).toHaveAttribute('src', 'video/mission-thumb.jpg');
    await play.click();
    const dialog = page.getByRole('dialog', { name: 'Our mission video' });
    await expect(dialog).toBeVisible();
    const video = dialog.locator('video');
    await expect(video).toHaveAttribute('controls', '');
    await expect(video).toHaveAttribute('playsinline', '');
    await expect(video.locator('source')).toHaveAttribute('src', 'video/mission.mp4');
    await expect(video.locator('track[kind="captions"]')).toHaveAttribute('src', 'video/mission.vtt');
    for (const file of ['video/mission.mp4', 'video/mission.vtt', 'video/mission-thumb.jpg', 'video/mission-poster.jpg']) {
      const response = await page.request.get(`${appURL}/${file}`);
      expect(response.status(), file).toBe(200);
    }
    await dialog.getByRole('button', { name: 'Close' }).click();
    await expect(dialog).toHaveCount(0);
    await expect(play).toBeFocused();
    await play.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Our mission video' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
  });

  test('the arrow keys and a swipe move between steps', async ({ page, appURL }) => {
    await page.goto(appURL);
    await gate(page).getByRole('button', { name: 'Show me how' }).click();
    await page.keyboard.press('ArrowRight');
    await expect(page.getByRole('heading', { name: 'Tap the Share button' })).toBeVisible();
    await page.keyboard.press('ArrowLeft');
    await expect(page.getByRole('heading', { name: 'Our mission' })).toBeVisible();
    const box = await gate(page).locator('.walk-viewport').boundingBox();
    const y = box.y + box.height / 2;
    await page.mouse.move(box.x + box.width - 20, y);
    await page.mouse.down();
    await page.mouse.move(box.x + 20, y, { steps: 5 });
    await page.mouse.up();
    await expect(page.getByRole('heading', { name: 'Tap the Share button' })).toBeVisible();
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
    await gate(page).getByRole('button', { name: 'Show me how' }).click();
    await gate(page).getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Open your browser’s menu' })).toBeVisible();
    await gate(page).getByRole('button', { name: 'Next' }).click();
    await expect(page.getByRole('heading', { name: 'Tap Add to Home screen' })).toBeVisible();
    await expect(gate(page)).toContainText('It may say Install app instead');
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

test.describe('the walkthrough with motion allowed', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  const animationsIn = (page, selector) =>
    page.evaluate((sel) => document.querySelector(sel).getAnimations({ subtree: true }).map((a) => (a instanceof CSSAnimation ? a.animationName : 'transition')), selector);

  test('each step glides in and acts out its tap; the next slide arrives from the right', async ({ page, appURL }) => {
    await page.goto(appURL);
    expect(await animationsIn(page, '.walk-slide.is-active')).toEqual(expect.arrayContaining(['walk-pop', 'walk-float', 'walk-breathe']));
    await gate(page).getByRole('button', { name: 'Show me how' }).click();
    await gate(page).getByRole('button', { name: 'Next' }).click();
    await expect(gate(page).locator('[data-walk-slide="1"]')).toHaveAttribute('data-side', 'before');
    expect(await animationsIn(page, '.walk-slide.is-active')).toEqual(expect.arrayContaining(['walk-phone-in', 'walk-press', 'walk-ripple']));
    await gate(page).getByRole('button', { name: 'Next' }).click();
    await gate(page).getByRole('button', { name: 'Next' }).click();
    expect(await animationsIn(page, '.walk-slide.is-active')).toEqual(expect.arrayContaining(['walk-drop', 'walk-spark']));
  });
});

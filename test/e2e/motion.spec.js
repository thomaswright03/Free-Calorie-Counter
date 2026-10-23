// The animations (style.css "motion", ui/motion.js). The other tests run
// with reduced motion so they measure where things settle; these turn
// motion on, check that it plays and settles, and check that reduced
// motion keeps everything still.
const { test, expect, TODAY, day } = require('./fixtures');

const YESTERDAY = '2026-09-23';

/** Animations still running on the page, apart from the loading spinner and the background's slow drift (ambient-…). */
const running = (page) =>
  page.evaluate(() =>
    document
      .getAnimations()
      .filter((a) => a.playState === 'running')
      .filter((a) => !(a instanceof CSSAnimation && (a.animationName === 'spin' || a.animationName.startsWith('ambient-')))).length
  );

const settled = (page) => expect.poll(() => running(page), { timeout: 5000 }).toBe(0);

test.describe('with motion allowed', () => {
  test.use({ contextOptions: { reducedMotion: 'no-preference' } });

  test('a screen opened from a tab to its left slides in from the right, then settles exactly in place', async ({ page, appURL, data }) => {
    await data.seed({ [TODAY]: day(TODAY, { breakfast: 400 }), [YESTERDAY]: day(YESTERDAY, { lunch: 600 }) });
    await page.goto(appURL);
    await page.locator('.tabs').getByRole('link', { name: 'History' }).click();
    await expect(page.locator('#main')).toHaveAttribute('data-dir', 'forward');
    await expect(page.locator('#main > .view-enter')).toHaveCount(1);
    expect(await running(page)).toBeGreaterThan(0);
    await settled(page);
    const first = page.locator('.history-item').first();
    expect(await first.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
    expect(['none', 'matrix(1, 0, 0, 1, 0, 0)']).toContain(await first.evaluate((el) => getComputedStyle(el).transform));
    // Back to Today, to the left of History, comes in from the left.
    await page.locator('.tabs').getByRole('link', { name: 'Today' }).click();
    await expect(page.locator('#main')).toHaveAttribute('data-dir', 'back');
  });

  test('the highlight behind the open tab moves with it and hides on Settings', async ({ page, appURL }) => {
    await page.goto(appURL);
    const indicator = page.locator('.tab-indicator');
    await expect(indicator).toHaveClass(/is-on/);
    const at = () => indicator.evaluate((el) => el.getBoundingClientRect().left);
    const todayTab = await page.getByRole('link', { name: 'Today' }).boundingBox();
    await expect.poll(at).toBeCloseTo(todayTab.x, 0);
    await page.getByRole('link', { name: 'Compare' }).click();
    const compareTab = await page.getByRole('link', { name: 'Compare' }).boundingBox();
    await expect.poll(at).toBeCloseTo(compareTab.x, 0);
    await page.getByRole('link', { name: 'Settings' }).click();
    await expect(indicator).not.toHaveClass(/is-on/);
  });

  test('the day’s total counts up to its exact value, the goal ring fills, and a removed meal’s row flashes', async ({ page, appURL, data }) => {
    await data.seed({ [TODAY]: day(TODAY, { breakfast: 450, lunch: 600 }) });
    await page.evaluate(() => localStorage.setItem('fcc:dailyGoal', '2100'));
    await page.goto(appURL);
    const total = page.locator('.total-num');
    await expect(total).toHaveClass(/is-counting/);
    await expect(total).toHaveText('1,050');
    await settled(page);
    // The ring's arc is drawn on a path of length 1: what's left undrawn is 1 minus the share of the goal used.
    const share = await page.locator('.goal-meter-fill').evaluate((el) => 1 - Number(/[\d.]+/.exec(getComputedStyle(el).strokeDashoffset)[0]));
    expect(share).toBeCloseTo(0.5, 2);
    await page.getByRole('button', { name: 'Remove Breakfast' }).click();
    await expect(page.locator('[data-meal="breakfast"]')).toHaveClass(/is-changed/);
    await expect(page.locator('[data-meal="lunch"]')).not.toHaveClass(/is-changed/);
    await expect(total).toHaveText('600');
  });

  test('a graph draws itself in when first shown, but not again when the screen is resized', async ({ page, appURL, data }) => {
    await data.seed({ [TODAY]: day(TODAY, { breakfast: 400 }, 180), [YESTERDAY]: day(YESTERDAY, { lunch: 600 }, 181) });
    await page.goto(appURL);
    await expect(page.locator('.chart-svg.is-drawing').first()).toBeVisible();
    await settled(page);
    const width = () => page.locator('.chart-svg').first().evaluate((el) => el.getAttribute('width'));
    const before = await width();
    await page.setViewportSize({ width: 430, height: 800 });
    await expect.poll(width).not.toBe(before);
    await expect(page.locator('.chart-svg.is-drawing')).toHaveCount(0);
  });

  test('a message slides away when dismissed and then leaves the page', async ({ page, appURL }) => {
    await page.goto(`${appURL}/#/day/2026-12-01`);
    const message = page.locator('.toast');
    await expect(message).toHaveCount(1);
    // A message without a button lets taps through; a tap on it still dismisses it.
    const box = await message.boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(message).toHaveClass(/is-leaving/);
    await expect(message).toHaveCount(0);
  });
});

test('with reduced motion nothing animates, and the total shows its value at once', async ({ page, appURL, data }) => {
  await data.seed({ [TODAY]: day(TODAY, { breakfast: 450, lunch: 600 }) });
  await page.goto(appURL);
  await expect(page.locator('.total-num')).toHaveText('1,050');
  await expect(page.locator('.total-num')).not.toHaveClass(/is-counting/);
  expect(await running(page)).toBe(0);
  for (const name of ['History', 'Compare', 'Photos', 'Today']) {
    await page.locator('.tabs').getByRole('link', { name, exact: true }).click();
    await expect(page.locator('#main')).not.toHaveAttribute('aria-busy', 'true');
    expect(await running(page), name).toBe(0);
  }
});

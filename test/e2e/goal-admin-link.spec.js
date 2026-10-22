const { test, expect } = require('./fixtures');

test('with no goal set, Today offers a link to set one, and an empty day shows 0, not a dash', async ({ page, appURL }) => {
  await page.goto(`${appURL}/#/`);
  await expect(page.locator('.total-num')).toHaveText('0');
  const link = page.getByRole('link', { name: 'Set a daily goal' });
  await expect(link).toBeVisible();
  await link.click();
  await expect(page.getByLabel('Calories per day')).toBeFocused();
  await page.getByLabel('Calories per day').fill('2000');
  await page.getByLabel('Calories per day').blur();
  await page.goto(`${appURL}/#/`);
  await expect(link).toBeHidden();
});

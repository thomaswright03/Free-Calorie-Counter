// Logging a meal one food at a time, with the app adding them up, beside
// typing the meal's total.
const { test, expect, TODAY, day } = require('./fixtures');

test('foods added one at a time add up to the meal, and show on Today', async ({ page, appURL, data }) => {
  await page.goto(`${appURL}/#/log/breakfast`);
  await page.getByRole('button', { name: 'Food by food' }).tap();
  await expect(page.getByRole('button', { name: 'Food by food' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Breakfast calories')).toBeHidden();

  await page.getByLabel('Food in Breakfast').fill('Eggs');
  await page.getByLabel('Calories', { exact: true }).fill('140');
  await page.getByRole('button', { name: 'Add food' }).tap();
  await expect(page.getByText('Eggs added to Breakfast')).toBeVisible();
  await expect(page.getByLabel('Food in Breakfast')).toBeFocused();

  // Enter in the calories box adds the food too; the name is optional.
  await page.getByLabel('Calories', { exact: true }).fill('90');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Breakfast total: 230 cal from 2 foods')).toBeVisible();
  await expect(page.getByRole('list', { name: 'Breakfast foods' }).getByRole('listitem')).toHaveCount(2);
  await expect(page.getByText('Day total: 230 cal')).toBeVisible();
  await expect(page.locator('[data-meal="breakfast"] .pill-value')).toHaveText('✓ 230');

  const saved = await data.entry(TODAY);
  expect(saved.meals.breakfast).toBe(230);
  expect(saved.foods).toEqual({ breakfast: [{ name: 'Eggs', calories: 140 }, { name: '', calories: 90 }] });

  // A food typed but not added is added by Save and close.
  await page.getByLabel('Food in Breakfast').fill('Coffee');
  await page.getByLabel('Calories', { exact: true }).fill('5');
  await page.getByRole('button', { name: 'Save and close' }).tap();
  await expect(page.getByRole('status').filter({ hasText: 'Saved for Today: 235 cal' })).toBeVisible();
  await expect(page.locator('.total-num')).toHaveText('235');
  await expect(page.locator('[data-meal="breakfast"] .meal-foods')).toHaveText('Eggs, Food 2, Coffee');
});

test('a food can be removed and put back, and the total follows', async ({ page, appURL, data }) => {
  await data.seed({ [TODAY]: { ...day(TODAY, { lunch: 650 }), foods: { lunch: [{ name: 'Sandwich', calories: 450 }, { name: 'Chips', calories: 200 }] } } });
  await page.goto(`${appURL}/#/log/lunch`);
  await expect(page.getByRole('button', { name: 'Food by food' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Remove Chips from Lunch' }).tap();
  await expect(page.getByText('Lunch total: 450 cal from 1 food')).toBeVisible();
  expect((await data.entry(TODAY)).meals.lunch).toBe(450);
  await page.getByRole('button', { name: 'Undo' }).tap();
  await expect(page.getByText('Lunch total: 650 cal from 2 foods')).toBeVisible();
  expect((await data.entry(TODAY)).foods.lunch.map((f) => f.name)).toEqual(['Sandwich', 'Chips']);
});

test('typing a total instead replaces the foods, and the choice is remembered for new meals', async ({ page, appURL, data }) => {
  await data.seed({ [TODAY]: { ...day(TODAY, { dinner: 500 }), foods: { dinner: [{ name: 'Pasta', calories: 500 }] } } });
  await page.goto(`${appURL}/#/log/dinner`);
  await page.getByRole('button', { name: 'Type the total' }).tap();
  await expect(page.getByText('Dinner has 1 food added. Typing a total here replaces them.')).toBeVisible();
  await page.getByLabel('Dinner calories').fill('720');
  await page.getByLabel('Dinner calories').blur();
  await expect(page.getByText('Dinner saved')).toBeVisible();
  const saved = await data.entry(TODAY);
  expect(saved.meals.dinner).toBe(720);
  expect(saved.foods).toBeUndefined();

  // The last choice ("Type the total") is how an empty meal opens.
  await page.locator('[data-meal="snack3"]').tap();
  await expect(page.getByLabel('Snack 3 calories')).toBeVisible();
});

test('a bad food is refused with a message and nothing is saved', async ({ page, appURL, data }) => {
  await page.goto(`${appURL}/#/log/snack1`);
  await page.getByRole('button', { name: 'Food by food' }).tap();
  await page.getByLabel('Food in Snack 1').fill('Apple');
  await page.getByRole('button', { name: 'Add food' }).tap();
  await expect(page.getByText('Enter the food’s calories, like 120.')).toBeVisible();
  await page.getByLabel('Calories', { exact: true }).fill('12.5');
  await page.getByRole('button', { name: 'Add food' }).tap();
  await expect(page.getByText(/whole number/)).toBeVisible();
  expect(await data.entry(TODAY)).toBeNull();
});

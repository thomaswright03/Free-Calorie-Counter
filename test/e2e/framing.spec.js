const { test, expect } = require('./fixtures');

test('the app refuses to run inside another page and offers a link instead', async ({ page, appURL }) => {
  await page.setContent(`<iframe id="f" src="${appURL}/" width="400" height="600"></iframe>`);
  const frame = page.frameLocator('#f');
  await expect(frame.getByRole('link', { name: 'Open Free Calorie Counter in its own tab' })).toBeVisible();
  await expect(frame.getByRole('heading', { name: 'Today', exact: true })).toHaveCount(0);
});

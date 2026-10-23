const { test, expect } = require('./fixtures');

test('the app refuses to run inside another page and offers a link instead', async ({ page, appURL }) => {
  // The framed app stops its own loading, and WebKit then never fires the
  // frame's load event, so this page's load would never come either: wait
  // only for the page itself.
  await page.setContent(`<iframe id="f" src="${appURL}/" width="400" height="600"></iframe>`, { waitUntil: 'domcontentloaded' });
  const frame = page.frameLocator('#f');
  await expect(frame.getByRole('link', { name: 'Open Free Calorie Counter in its own tab' })).toBeVisible();
  await expect(frame.getByRole('heading', { name: 'Today', exact: true })).toHaveCount(0);
});

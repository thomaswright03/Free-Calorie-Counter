const { test, expect, day, TODAY } = require('./fixtures');

// The app's data used to be stored under its earlier name (kept encoded
// here). The first open after the rename copies it across.
const OLD = Buffer.from('a2VubmE=', 'base64').toString();

async function photoCount(page, name) {
  return page.evaluate(
    (n) =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open(n, 1);
        req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        req.onsuccess = () => {
          const r = req.result.transaction('photos').objectStore('photos').count();
          r.onsuccess = () => {
            req.result.close();
            resolve(r.result);
          };
          r.onerror = () => reject(r.error);
        };
        req.onerror = () => reject(req.error);
      }),
    name
  );
}

test('days, settings and photos saved under the old name carry over, once', async ({ page, appURL }) => {
  await page.goto(appURL);
  const entries = { [TODAY]: day(TODAY, { breakfast: 420 }, 170) };
  await page.evaluate(
    async ([old, e]) => {
      localStorage.clear();
      localStorage.setItem(`${old}:entries`, JSON.stringify(e));
      localStorage.setItem(`${old}:theme`, 'dark');
      const db = await new Promise((resolve, reject) => {
        const req = indexedDB.open(`${old}-photos`, 1);
        req.onupgradeneeded = () => req.result.createObjectStore('photos', { keyPath: 'id', autoIncrement: true });
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
      });
      await new Promise((resolve, reject) => {
        const tx = db.transaction('photos', 'readwrite');
        tx.objectStore('photos').add({ date: '2026-09-20', createdAt: '2026-09-20T08:00:00.000Z', bytes: new Uint8Array([255, 216, 255]).buffer, type: 'image/jpeg' });
        tx.oncomplete = resolve;
        tx.onerror = () => reject(tx.error);
      });
      db.close();
    },
    [OLD, entries]
  );
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('fcc:migrated'))).not.toBeNull();
  expect(JSON.parse(await page.evaluate(() => localStorage.getItem('fcc:entries')))).toEqual(entries);
  expect(await page.evaluate(() => localStorage.getItem('fcc:theme'))).toBe('dark');
  expect(await photoCount(page, 'fcc-photos')).toBe(1);
  // The old copies are left as they were, and nothing is copied twice.
  expect(await page.evaluate((old) => localStorage.getItem(`${old}:theme`), OLD)).toBe('dark');
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await photoCount(page, 'fcc-photos')).toBe(1);
});

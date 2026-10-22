const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const core = require('../../docs/core.js');

const docs = path.join(__dirname, '..', '..', 'docs');

test('every page has a Content-Security-Policy whose script hashes match its inline scripts', () => {
  const pages = [...fs.readdirSync(docs).filter((f) => f.endsWith('.html')), 'admin/index.html'];
  for (const name of pages) {
    const html = fs.readFileSync(path.join(docs, name), 'utf8');
    const csp = html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/);
    assert.ok(csp, `${name} has no CSP`);
    assert.match(csp[1], /object-src 'none'/);
    assert.match(html, /<meta name="referrer" content="no-referrer">/, `${name} has no referrer policy`);
    for (const [, body] of html.matchAll(/<script>([\s\S]*?)<\/script>/g)) {
      const hash = `'sha256-${crypto.createHash('sha256').update(body).digest('base64')}'`;
      assert.ok(csp[1].includes(hash), `${name}: inline script hash ${hash} missing from CSP`);
    }
  }
});

test('a backup photo that is not a plain raster image type (such as SVG) is rejected', () => {
  const photo = (type) => ({ entries: {}, photos: [{ date: '2026-01-01', createdAt: '2026-01-01T08:00:00.000Z', type, data: '/9j/4AAQSkZJRgAB' }] });
  assert.match(core.parseBackup(JSON.stringify(photo('image/svg+xml'))).error, /isn't an image/);
  assert.equal(core.parseBackup(JSON.stringify(photo('image/webp'))).error, undefined);
});

test('a backup photo whose bytes are not the image type it claims is rejected', () => {
  const photo = (data) => ({ entries: {}, photos: [{ date: '2026-01-01', createdAt: '2026-01-01T08:00:00.000Z', type: 'image/png', data }] });
  const text = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>').toString('base64');
  assert.match(core.parseBackup(JSON.stringify(photo(text))).error, /isn't an image/);
  assert.equal(core.parseBackup(JSON.stringify(photo('iVBORw0KGgoAAAAN'))).error, undefined);
});

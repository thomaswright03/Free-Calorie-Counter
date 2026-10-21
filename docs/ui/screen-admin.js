// Status page (#/admin): checks run on this device, right now, and are
// shown as an overall status and three groups (Important, Key, Basic).
// The same data is shown as JSON in the standard shape. Nothing here is
// hard-coded: a check that fails shows down.

import { core, h, prefs, visibleEntries } from './dom.js';
import { store } from './store.js';
import { problemLog } from './problems.js';
import { lastBackup } from './backup.js';
import { LATEST_UPDATE } from './latest-update.js';

/**
 * @typedef {'ok' | 'warning' | 'down' | 'unknown'} Status
 * @typedef {{ tier: 'important' | 'key' | 'basic', name: string, status: Status, detail: string }} Check
 * @typedef {Check & { last_checked: string, last_success: string | null, next_expected_run: string | null }} Row
 */

const TIERS = /** @type {const} */ (['important', 'key', 'basic']);
const BACKUP_WARN_DAYS = 7;
const LABELS = { ok: 'OK', warning: 'Warning', down: 'Down', unknown: 'Unknown' };
const TIER_TITLES = { important: 'Important', key: 'Key', basic: 'Basic' };

/**
 * Runs one check; a thrown error is a Down result, never a crash.
 * @param {Check['tier']} tier
 * @param {string} name
 * @param {() => Promise<{ status: Status, detail: string }>} fn
 * @returns {Promise<Check>}
 */
async function run(tier, name, fn) {
  try {
    return { tier, name, ...(await fn()) };
  } catch (err) {
    return { tier, name, status: 'down', detail: failedDetail(err) };
  }
}

/**
 * A plain sentence for a check that threw, with the browser's own reason
 * when it gives one.
 * @param {unknown} err
 */
export function failedDetail(err) {
  const reason = err instanceof Error ? err.message.trim().replace(/\.$/, '') : '';
  return reason ? `This check couldn’t run on this device. The browser said: ${reason}.` : 'This check couldn’t run on this device.';
}

/** A time on this device's clock, with its time zone, like "Oct 21, 2026, 7:15 AM PDT". */
export function formatCheckTime(/** @type {string | null} */ iso) {
  if (!iso) return 'never';
  return new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}

function localStorageWorks() {
  try {
    const key = 'fcc:admin-probe';
    window.localStorage.setItem(key, '1');
    const ok = window.localStorage.getItem(key) === '1';
    window.localStorage.removeItem(key);
    return ok;
  } catch {
    return false;
  }
}

/** The cache name written into sw.js by the build, read from the file itself. */
async function buildCacheName() {
  const res = await fetch('sw.js', { cache: 'no-cache' });
  const found = /const CACHE_NAME = '([^']*)';/.exec(await res.text());
  return found ? found[1] : null;
}

/** @returns {Promise<Check[]>} */
function allChecks() {
  return Promise.all([
    run('important', 'Meal and weight saving', async () => {
      if (!localStorageWorks()) return { status: 'down', detail: 'Saved days can’t be written to or read back from this browser.' };
      const days = Object.keys(await store.loadEntries()).length;
      return { status: 'ok', detail: `A test write and read-back worked. ${core.formatNumber(days)} saved day${days === 1 ? '' : 's'} read.` };
    }),
    run('important', 'Photo store', async () => {
      if (!window.indexedDB) return { status: 'down', detail: 'IndexedDB is not available, so photos can’t be stored.' };
      const n = await store.countPhotos();
      return { status: 'ok', detail: `The photo store opened. ${core.formatNumber(n)} photo${n === 1 ? '' : 's'} in it.` };
    }),
    run('important', 'Backup export', async () => {
      const entries = await store.loadEntries();
      /** @type {Record<string, import('../core.js').Entry>} */
      const days = {};
      for (const e of visibleEntries(entries)) days[e.date] = core.entryForBackup(e);
      // Photos are counted, not embedded: the days are what a damaged save would break.
      const photoCount = await store.countPhotos();
      const writer = window.AppBackupFile.createBackupWriter(days, new Date().toISOString(), null);
      const back = await window.AppBackupFile.checkBackup(writer.finish());
      const expected = Object.keys(days).length;
      if (!back.ok || back.dayCount !== expected) return { status: 'down', detail: 'A test backup of your saved days was built but can’t be read back.' };
      return { status: 'ok', detail: `A test backup of your ${core.formatNumber(expected)} saved day${expected === 1 ? '' : 's'} was built and read back. ${core.formatNumber(photoCount)} photo${photoCount === 1 ? '' : 's'} would be added.` };
    }),
    run('key', 'Offline cache', async () => {
      if (!('serviceWorker' in navigator) || !window.caches) return { status: 'unknown', detail: 'This browser or address doesn’t support offline caching.' };
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return { status: 'warning', detail: 'The offline helper isn’t registered yet; it is after the first full load.' };
      const [name, keys] = await Promise.all([buildCacheName(), window.caches.keys()]);
      if (!name) return { status: 'down', detail: 'The build’s cache name could not be read.' };
      return keys.includes(name)
        ? { status: 'ok', detail: `Registered; cache ${name} matches the build.` }
        : { status: 'warning', detail: `Registered, but the cache for build ${name} isn’t stored yet. Reload once.` };
    }),
    run('key', 'Time since last backup', async () => {
      const entries = await store.loadEntries();
      if (Object.keys(entries).length === 0) return { status: 'ok', detail: 'Nothing logged yet, so nothing to back up.' };
      const last = lastBackup();
      if (!last) return { status: 'warning', detail: 'No backup file has been saved from this device yet.' };
      const days = core.daysBetween(core.localDateStr(new Date(last.at)), core.todayStr());
      if (!last.confirmed) return { status: 'warning', detail: 'A backup was made but not confirmed saved.' };
      return days >= BACKUP_WARN_DAYS
        ? { status: 'warning', detail: `Last backup was ${days} days ago.` }
        : { status: 'ok', detail: days === 0 ? 'Last backup was today.' : `Last backup was ${days} day${days === 1 ? '' : 's'} ago.` };
    }),
    run('key', 'Problem log', async () => {
      const n = problemLog().length;
      return { status: n === 0 ? 'ok' : 'warning', detail: n === 0 ? 'No problems recorded.' : `${core.formatNumber(n)} problem${n === 1 ? '' : 's'} recorded (see Settings).` };
    }),
    run('basic', 'Browser storage for your days', async () => (localStorageWorks() ? { status: 'ok', detail: 'Available.' } : { status: 'down', detail: 'Not available.' })),
    run('basic', 'Browser storage for photos', async () => (window.indexedDB ? { status: 'ok', detail: 'Available.' } : { status: 'down', detail: 'Not available.' })),
    run('basic', 'Storage persistence', async () => {
      const p = await store.persistenceStatus();
      if (p === null) return { status: 'unknown', detail: 'This browser can’t say.' };
      return p ? { status: 'ok', detail: 'Granted: the browser keeps the data when space is low.' } : { status: 'warning', detail: 'Not granted: the browser may clear data when space is low.' };
    }),
    run('basic', 'Build and version', async () => {
      const name = await buildCacheName();
      const live = `Latest update went live ${core.formatMonthDay(LATEST_UPDATE.date, true)}.`;
      return name ? { status: 'ok', detail: `Build ${name}. ${live}` } : { status: 'unknown', detail: `The build id could not be read. ${live}` };
    }),
  ]);
}

/** The worst status among the Important rows; Key and Basic show their own badges. @param {Row[]} all @returns {Status} */
function overall(all) {
  const rows = all.filter((r) => r.tier === 'important');
  if (rows.some((r) => r.status === 'down')) return 'down';
  if (rows.some((r) => r.status === 'warning')) return 'warning';
  return rows.some((r) => r.status === 'ok') ? 'ok' : 'unknown';
}

/** Adds timing, remembering when each check last passed on this device. */
function withTimes(/** @type {Check[]} */ checks, /** @type {string} */ now) {
  return checks.map((c) => {
    const key = `adminOk:${c.name}`;
    if (c.status === 'ok') prefs.set(key, now);
    return { ...c, last_checked: now, last_success: c.status === 'ok' ? now : prefs.get(key, null), next_expected_run: null };
  });
}

/** @type {import('./render.js').ScreenBuilder} */
export async function buildAdmin() {
  const now = new Date().toISOString();
  const rows = withTimes(await allChecks(), now);
  const status = overall(rows);
  const json = { product: 'Free Calorie Counter', checked_at: now, overall: status, functions: rows };
  const badge = (/** @type {Status} */ s) => h('span', { class: `admin-status is-${s}`, text: LABELS[s] });

  const groups = TIERS.map((tier) =>
    h(
      'section',
      { class: 'card', 'data-admin-tier': tier },
      h('h3', { class: 'section-title', text: TIER_TITLES[tier] }),
      h(
        'ul',
        { class: 'admin-list' },
        rows
          .filter((r) => r.tier === tier)
          .map((r) =>
            h(
              'li',
              { class: 'admin-row', 'data-check': r.name },
              h('div', { class: 'admin-name' }, h('strong', { text: r.name }), ' ', badge(r.status)),
              h('p', { class: 'card-sub', text: r.detail }),
              h('p', { class: 'admin-times', text: `Last checked ${formatCheckTime(r.last_checked)} · last success ${formatCheckTime(r.last_success)}` })
            )
          )
      )
    )
  );

  const head = h(
    'section',
    { class: 'card' },
    h('h2', { class: 'card-title', text: 'Status' }),
    h('p', { class: 'admin-overall', 'data-overall': status }, 'Overall: ', badge(status)),
    h('p', { class: 'card-sub', text: `Checked ${formatCheckTime(now)}. These checks run on this device each time this page opens; nothing is sent anywhere.` })
  );
  const raw = h('details', { class: 'card' }, h('summary', { text: 'Status as JSON' }), h('pre', { class: 'admin-json', text: JSON.stringify(json, null, 2) }));
  return { title: 'Status', root: h('div', { class: 'screen-stack' }, head, ...groups, raw) };
}

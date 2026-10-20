// Status page (#/admin): checks run on this device, right now, and are
// shown as an overall status and three groups (Important, Key, Basic).
// The same data is shown as JSON in the standard shape. Nothing here is
// hard-coded: a check that fails shows Down.

import { core, h, prefs } from './dom.js';
import { store } from './store.js';
import { problemLog } from './problems.js';
import { lastBackup } from './backup.js';
import { LATEST_UPDATE } from './latest-update.js';

/**
 * @typedef {'OK' | 'Warning' | 'Down' | 'Unknown'} Status
 * @typedef {{ tier: 'Important' | 'Key' | 'Basic', name: string, status: Status, detail: string }} Check
 * @typedef {Check & { last_checked: string, last_success: string | null, next_expected_run: string | null }} Row
 */

const TIERS = /** @type {const} */ (['Important', 'Key', 'Basic']);
const BACKUP_WARN_DAYS = 7;

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
    return { tier, name, status: 'Down', detail: `Check failed: ${err instanceof Error && err.name ? err.name : 'error'}.` };
  }
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
    run('Important', 'Meal and weight saving', async () => {
      if (!localStorageWorks()) return { status: 'Down', detail: 'Saved days can’t be written to or read back from this browser.' };
      const days = Object.keys(await store.loadEntries()).length;
      return { status: 'OK', detail: `A test write and read-back worked. ${core.formatNumber(days)} saved day${days === 1 ? '' : 's'} read.` };
    }),
    run('Important', 'Photo store', async () => {
      if (!window.indexedDB) return { status: 'Down', detail: 'IndexedDB is not available, so photos can’t be stored.' };
      const n = await store.countPhotos();
      return { status: 'OK', detail: `The photo store opened. ${core.formatNumber(n)} photo${n === 1 ? '' : 's'} in it.` };
    }),
    run('Important', 'Backup export', async () => {
      const entries = await store.loadEntries();
      const writer = window.AppBackupFile.createBackupWriter({}, new Date().toISOString(), null);
      const parsed = JSON.parse(await writer.finish().text());
      if (!parsed || parsed.app !== core.BACKUP_APP_ID) return { status: 'Down', detail: 'A test backup file was built but isn’t readable.' };
      return { status: 'OK', detail: `A backup file can be built (${core.formatNumber(Object.keys(entries).length)} days would go in it).` };
    }),
    run('Key', 'Offline cache', async () => {
      if (!('serviceWorker' in navigator) || !window.caches) return { status: 'Unknown', detail: 'This browser or address doesn’t support offline caching.' };
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) return { status: 'Warning', detail: 'The offline helper isn’t registered yet; it is after the first full load.' };
      const [name, keys] = await Promise.all([buildCacheName(), window.caches.keys()]);
      if (!name) return { status: 'Down', detail: 'The build’s cache name could not be read.' };
      return keys.includes(name)
        ? { status: 'OK', detail: `Registered; cache ${name} matches the build.` }
        : { status: 'Warning', detail: `Registered, but the cache for build ${name} isn’t stored yet. Reload once.` };
    }),
    run('Key', 'Time since last backup', async () => {
      const entries = await store.loadEntries();
      if (Object.keys(entries).length === 0) return { status: 'OK', detail: 'Nothing logged yet, so nothing to back up.' };
      const last = lastBackup();
      if (!last) return { status: 'Warning', detail: 'No backup file has been saved from this device yet.' };
      const days = core.daysBetween(core.localDateStr(new Date(last.at)), core.todayStr());
      if (!last.confirmed) return { status: 'Warning', detail: 'A backup was made but not confirmed saved.' };
      return days >= BACKUP_WARN_DAYS
        ? { status: 'Warning', detail: `Last backup was ${days} days ago.` }
        : { status: 'OK', detail: days === 0 ? 'Last backup was today.' : `Last backup was ${days} day${days === 1 ? '' : 's'} ago.` };
    }),
    run('Key', 'Problem log', async () => {
      const n = problemLog().length;
      return { status: n === 0 ? 'OK' : 'Warning', detail: n === 0 ? 'No problems recorded.' : `${core.formatNumber(n)} problem${n === 1 ? '' : 's'} recorded (see Settings).` };
    }),
    run('Basic', 'localStorage available', async () => (localStorageWorks() ? { status: 'OK', detail: 'Available.' } : { status: 'Down', detail: 'Not available.' })),
    run('Basic', 'IndexedDB available', async () => (window.indexedDB ? { status: 'OK', detail: 'Available.' } : { status: 'Down', detail: 'Not available.' })),
    run('Basic', 'Storage persistence', async () => {
      const p = await store.persistenceStatus();
      if (p === null) return { status: 'Unknown', detail: 'This browser can’t say.' };
      return p ? { status: 'OK', detail: 'Granted: the browser keeps the data when space is low.' } : { status: 'Warning', detail: 'Not granted: the browser may clear data when space is low.' };
    }),
    run('Basic', 'Build and version', async () => {
      const name = await buildCacheName();
      return name ? { status: 'OK', detail: `Build ${name}.` } : { status: 'Unknown', detail: 'The build id could not be read.' };
    }),
    run('Basic', 'Latest update', async () => ({ status: 'OK', detail: `Went live ${LATEST_UPDATE.date}.` })),
  ]);
}

/** @param {Row[]} rows @returns {Status} */
function overall(rows) {
  if (rows.some((r) => r.status === 'Down')) return 'Down';
  if (rows.some((r) => r.status === 'Warning')) return 'Warning';
  return rows.some((r) => r.status === 'OK') ? 'OK' : 'Unknown';
}

/** Adds timing, remembering when each check last passed on this device. */
function withTimes(/** @type {Check[]} */ checks, /** @type {string} */ now) {
  return checks.map((c) => {
    const key = `adminOk:${c.name}`;
    if (c.status === 'OK') prefs.set(key, now);
    return { ...c, last_checked: now, last_success: c.status === 'OK' ? now : prefs.get(key, null), next_expected_run: null };
  });
}

/** @type {import('./render.js').ScreenBuilder} */
export async function buildAdmin() {
  const now = new Date().toISOString();
  const rows = withTimes(await allChecks(), now);
  const status = overall(rows);
  const json = { product: 'Free Calorie Counter', checked_at: now, overall: status, functions: rows };
  const badge = (/** @type {Status} */ s) => h('span', { class: `admin-status is-${s.toLowerCase()}`, text: s });
  const when = (/** @type {string | null} */ t) => (t ? new Date(t).toLocaleString() : 'never');

  const groups = TIERS.map((tier) =>
    h(
      'section',
      { class: 'card', 'data-admin-tier': tier },
      h('h3', { class: 'section-title', text: tier }),
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
              h('p', { class: 'admin-times', text: `Last checked ${when(r.last_checked)} · last success ${when(r.last_success)}` })
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
    h('p', { class: 'card-sub', text: `Checked ${when(now)}. These checks run on this device each time this page opens; nothing is sent anywhere.` })
  );
  const raw = h('details', { class: 'card' }, h('summary', { text: 'Status as JSON' }), h('pre', { class: 'admin-json', text: JSON.stringify(json, null, 2) }));
  return { title: 'Status', root: h('div', { class: 'screen-stack' }, head, ...groups, raw) };
}

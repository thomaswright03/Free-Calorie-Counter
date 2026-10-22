// Settings: theme, backup export/import and where the data is stored.

import { core, h, uid, prefs, today } from './dom.js';
import { failureText, recordProblem, buildProblemLogCard } from './problems.js';
import { confirmDialog, createStatusLine, createFieldStatus } from './feedback.js';
import { store } from './store.js';
import { applyTheme } from './theme.js';
import { motionAllowed } from './motion.js';
import { buildBackupSection, downloadBlob } from './backup.js';
import { inAppleBrowserTab, runningInstalled, installSteps } from './install-note.js';
import { showWhatsNew } from './whats-new.js';
import { LATEST_UPDATE } from './latest-update.js';
import { getGoal, setGoal, takeGoalFocus } from './goal.js';

/** @type {import('./render.js').ScreenBuilder} */
export async function buildSettings() {
  const pref = prefs.get('theme', 'system');
  const name = uid('theme');
  const options = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];
  const themeGroup = h(
    'fieldset',
    { class: 'segmented segmented-wide' },
    h('legend', { class: 'visually-hidden', text: 'Theme' }),
    options.map((o) => {
      const radio = h('input', { type: 'radio', name, value: o.value, id: `${name}-${o.value}`, class: 'visually-hidden', checked: o.value === pref });
      radio.addEventListener('change', () => {
        prefs.set('theme', o.value);
        // The whole app cross-fades into the new theme where the browser
        // can (Safari 18 and later); elsewhere it switches at once.
        if (document.startViewTransition && motionAllowed()) document.startViewTransition(() => applyTheme(o.value));
        else applyTheme(o.value);
      });
      return [radio, h('label', { for: radio.id, class: 'segment', text: o.label })];
    })
  );
  const appearance = h(
    'section',
    { class: 'card' },
    h('h2', { class: 'card-title', text: 'Settings' }),
    h('h3', { class: 'section-title', text: 'Appearance' }),
    h('p', { class: 'card-sub', text: 'System follows your device’s light or dark setting.' }),
    themeGroup
  );

  const whatsNew = h(
    'section',
    { class: 'card' },
    h('h3', { class: 'section-title', text: 'Quick tour' }),
    h('p', { class: 'card-sub', text: 'A quick guided tour of Free Calorie Counter, shown right where each feature is.' }),
    h('button', { type: 'button', class: 'btn btn-secondary', text: 'Take the tour', onClick: () => showWhatsNew() })
  );

  const latest = buildLatestUpdate();
  const statusCard = h(
    'section',
    { class: 'card', 'data-app-status': '' },
    h('h3', { class: 'section-title', text: 'App status' }),
    h('p', { class: 'card-sub', text: 'Check that saving, photos, backup and offline use are working on this device.' }),
    h('a', { class: 'btn btn-secondary', href: '#/admin', text: 'Open App status' })
  );
  const storageCard = await buildYourDataCard();
  const damaged = await buildDamagedDataCard();
  return {
    title: 'Settings',
    root: h('div', { class: 'screen-stack two-col' }, h('div', { class: 'screen-stack' }, appearance, buildGoalCard(), buildBackupSection(), whatsNew), h('div', { class: 'screen-stack' }, latest, statusCard, damaged, storageCard, buildEraseCard(), buildProblemLogCard(downloadBlob))),
  };
}

/** The daily calorie goal: a whole number, or empty for none. */
function buildGoalCard() {
  const input = h('input', { type: 'text', inputmode: 'numeric', id: uid('goal'), autocomplete: 'off', placeholder: 'No goal set' });
  const current = getGoal();
  input.value = current === null ? '' : String(current);
  const status = createFieldStatus(input);
  const save = () => {
    const result = core.validateGoal(input.value);
    if (!result.ok) {
      status.set('error', result.error);
      return;
    }
    setGoal(result.value);
    input.value = result.value === null ? '' : String(result.value);
    status.set('saved', result.value === null ? 'Goal cleared' : `Goal saved: ${core.formatNumber(result.value)} calories a day`);
  };
  input.addEventListener('change', save);
  // Focus once the screen is in the page (a no-op unless Today's goal link asked).
  takeGoalFocus(input);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') save();
  });
  return h(
    'section',
    { class: 'card', 'data-goal-card': '' },
    h('h3', { class: 'section-title', text: 'Daily calorie goal' }),
    h('p', { class: 'card-sub', text: `Today, History and Compare show each day against it. A whole number from ${core.formatNumber(core.GOAL_LIMITS.min)} to ${core.formatNumber(core.GOAL_LIMITS.max)}; leave empty for no goal.` }),
    h('div', { class: 'field' }, h('label', { for: input.id, text: 'Calories per day' }), input, status.el)
  );
}

/** What the latest round of changes did (see latest-update.js). */
function buildLatestUpdate() {
  return h(
    'section',
    { class: 'card', 'data-latest-update': '' },
    h('h3', { class: 'section-title', text: 'Latest Update' }),
    h('p', { class: 'card-sub', text: core.formatMonthDay(LATEST_UPDATE.date, true) }),
    h('h4', { class: 'section-title', text: 'Frontend changes' }),
    h('ul', { class: 'update-list' }, LATEST_UPDATE.frontend.map((t) => h('li', { text: t }))),
    h('h4', { class: 'section-title', text: 'Summary' }),
    h('p', { class: 'card-sub', text: LATEST_UPDATE.summary })
  );
}

/**
 * "Free and private": what Free Calorie Counter costs, where the data is kept and how
 * safe it is there.
 */
async function buildYourDataCard() {
  const storageCard = h(
    'section',
    { class: 'card', 'data-your-data': '' },
    h('h3', { class: 'section-title', text: 'Free and private' }),
    h('p', { class: 'card-sub', text: 'Free Calorie Counter is completely free, with no account, no ads and no subscription.' }),
    h('p', { class: 'card-sub', text: 'Your calories, weight and photos are saved only in this browser on this device. Free Calorie Counter has no server, so nothing is ever uploaded.' }),
    h('p', { class: 'card-sub', 'data-legal-links': '' }, h('a', { class: 'btn-text', href: 'privacy.html', text: 'Privacy policy' }), ' · ', h('a', { class: 'btn-text', href: 'terms.html', text: 'Terms of service' }))
  );
  storageCard.append(
    h('p', {
      class: 'card-sub',
      text: 'In a browser tab on iPhone or iPad, Safari may delete a website’s data, Free Calorie Counter’s included, when it hasn’t been used for about a week. Free Calorie Counter added to the Home Screen isn’t affected.',
    })
  );
  if (inAppleBrowserTab()) {
    storageCard.append(
      h(
        'div',
        { class: 'note-box', 'data-install-steps': '' },
        h('p', { class: 'notice-title', text: 'You’re using Free Calorie Counter in a Safari tab' }),
        h('p', { class: 'notice-text', text: 'To keep your data, add Free Calorie Counter to your Home Screen:' }),
        installSteps(),
        h('p', {
          class: 'notice-text',
          text: 'Free Calorie Counter on the Home Screen may open empty, because iPhone keeps its data apart from Safari’s: export a backup here first and import it there.',
        })
      )
    );
  } else if (runningInstalled()) {
    storageCard.append(h('p', { class: 'card-sub', text: 'Free Calorie Counter is running from your Home Screen, so this doesn’t apply.' }));
  }
  const persisted = await store.persistenceStatus();
  if (persisted === true) {
    storageCard.append(h('p', { class: 'card-sub', text: 'This browser has agreed to keep Free Calorie Counter’s data even when the device is low on space.' }));
  } else if (persisted === false) {
    storageCard.append(
      h('p', {
        class: 'card-sub',
        text: runningInstalled()
          ? 'This browser may clear Free Calorie Counter’s data if the device runs low on space. Saving backup files regularly keeps it safe.'
          : 'This browser may clear Free Calorie Counter’s data if the device runs low on space. Adding Free Calorie Counter to your Home Screen and saving backup files regularly keeps it safe.',
      })
    );
  }
  return storageCard;
}

/**
 * "Delete all my data": a confirmed wipe of every day, setting and photo kept
 * in this browser, for a shared or handed-over phone. Reloads when done.
 */
function buildEraseCard() {
  const status = createStatusLine();
  const eraseBtn = h('button', { type: 'button', class: 'btn btn-danger-outline', 'data-erase-all': '', text: 'Delete all my data…' });
  eraseBtn.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete all your data?',
      message: 'Every day, goal, setting and photo saved in this browser will be removed for good. Save a backup first if you want to keep anything.',
      confirmLabel: 'Delete everything',
      danger: true,
    });
    if (!ok) return;
    try {
      await store.eraseAll();
      location.hash = '#/';
      location.reload();
    } catch (err) {
      status.set('error', failureText('Delete all data', err));
    }
  });
  return h(
    'section',
    { class: 'card', 'data-erase-card': '' },
    h('h3', { class: 'section-title', text: 'Delete all my data' }),
    h('p', { class: 'card-sub', text: 'Removes everything Free Calorie Counter saved in this browser: days, goal, settings and photos. Useful before you hand over or sell this phone.' }),
    h('div', { class: 'notice-actions' }, eraseBtn),
    status.el
  );
}

/**
 * When stored days were ever found damaged, Free Calorie Counter kept a copy of the
 * damaged data (at most the two newest). This card lets it be downloaded,
 * to send off for repair, or deleted. Null when there's none.
 */
async function buildDamagedDataCard() {
  const copies = await store.damagedCopies().catch((err) => {
    recordProblem('List damaged data', err);
    return [];
  });
  if (copies.length === 0) return null;
  const status = createStatusLine();
  const newest = copies[0].savedAt;
  const when = newest ? ` on ${core.formatDate(core.localDateStr(new Date(newest)), today())}` : '';
  const downloadBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Download damaged data' });
  const deleteBtn = h('button', { type: 'button', class: 'btn btn-danger-outline', text: 'Delete damaged data…' });
  const card = h(
    'section',
    { class: 'card', 'data-damaged-data': '' },
    h('h3', { class: 'section-title', text: 'Damaged data' }),
    h('p', {
      class: 'card-sub',
      text: `Free Calorie Counter found its saved days damaged${when} and kept ${copies.length === 1 ? 'a copy' : `${core.formatNumber(copies.length)} copies`} of what was there. Download it to send off for repair, or delete it once you don’t need it. It takes up some of this browser’s storage.`,
    }),
    h('div', { class: 'notice-actions' }, deleteBtn, downloadBtn),
    status.el
  );
  downloadBtn.addEventListener('click', () => {
    const file = JSON.stringify({ app: 'free-calorie-counter', kind: 'damaged-data', copies }, null, 2);
    downloadBlob(new Blob([file], { type: 'application/json' }), `calorie-counter-damaged-data-${today()}.json`);
    status.set('saved', 'Downloading the damaged data…');
  });
  deleteBtn.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Delete the damaged data?',
      message: 'The kept copy will be removed for good. Your days, photos and backups aren’t affected.',
      confirmLabel: 'Delete',
      danger: true,
    });
    if (!ok) return;
    try {
      await store.deleteDamagedCopies();
      card.replaceChildren(h('h3', { class: 'section-title', text: 'Damaged data' }), h('p', { class: 'card-sub', role: 'status', text: 'The damaged data was deleted.' }));
    } catch (err) {
      status.set('error', failureText('Delete damaged data', err));
    }
  });
  return card;
}

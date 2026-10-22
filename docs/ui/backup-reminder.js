// A reminder on the Today screen to save a backup file, shown when there is
// logged data and no backup has been saved from this device yet, or the
// last one is more than a week old. "Not now" hides it for a few days.
// At the old address it asks for the backup that moves the data to the new
// one (new-address.js) until one has been saved there.

import { core, h, uid, prefs } from './dom.js';
import { failureText } from './problems.js';
import { announce, createStatusLine } from './feedback.js';
import { exportBackup, buildBackupDelivery, lastBackup } from './backup.js';
import { movingTo } from './new-address.js';

const { SNOOZE_DAYS } = core.BACKUP_REMINDER;

/**
 * The reminder card, or null when no reminder is due.
 * @param {boolean} hasData
 * @returns {{ root: HTMLElement, mounted: () => void } | null}
 */
export function buildBackupReminder(hasData) {
  const snoozedUntil = prefs.get('backupReminderSnoozedUntil', null);
  const target = movingTo();
  const moving = target && hasData && !prefs.get('moveBackupSavedAt', null) && !(snoozedUntil && Date.parse(snoozedUntil) > Date.now());
  const due = moving ? { never: false, days: 0 } : core.backupReminderDue({ hasData, lastBackupAt: (lastBackup() || { at: null }).at, snoozedUntil, now: new Date() });
  if (!due) return null;

  const titleId = uid('backup-note');
  const headline = moving && target ? `Free Calorie Counter is moving to ${target.host}` : due.never ? "You haven't saved a backup yet" : `Your last backup was ${core.formatNumber(due.days)} days ago`;
  const why = moving
    ? 'Soon this address will open the new one, and your days and photos won’t move by themselves. Save a backup file now, then at the new address use Settings → Import Backup to bring everything back.'
    : 'Your days and photos are stored only on this device. A backup file lets you get them back if it is lost, replaced or cleared.';
  const backupBtn = h('button', { type: 'button', class: 'btn btn-primary', text: 'Back up now' });
  const laterBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Not now' });
  const status = createStatusLine();
  const actions = h('div', { class: 'notice-actions' }, laterBtn, backupBtn);
  const root = h(
    'section',
    { class: 'card notice-card', 'aria-labelledby': titleId, 'data-backup-reminder': moving ? 'move' : '' },
    h('p', { class: 'notice-title', id: titleId, text: headline }),
    h('p', { class: 'notice-text', text: why }),
    actions,
    status.el
  );

  laterBtn.addEventListener('click', () => {
    prefs.set('backupReminderSnoozedUntil', new Date(Date.now() + SNOOZE_DAYS * 24 * 60 * 60 * 1000).toISOString());
    root.remove();
    announce(`Backup reminder hidden for ${SNOOZE_DAYS} days.`);
  });

  backupBtn.addEventListener('click', async () => {
    backupBtn.disabled = true;
    laterBtn.disabled = true;
    backupBtn.textContent = 'Backing up…';
    try {
      const result = await exportBackup((text) => status.set('pending', text));
      const title = h('p', { class: 'notice-title', id: titleId, text: 'Backup file not saved yet' });
      const delivery = buildBackupDelivery(result, {
        messageClass: 'notice-text',
        onSaved: (how) => {
          const done = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Done', onClick: () => root.remove() });
          if (moving) prefs.set('moveBackupSavedAt', new Date().toISOString());
          const next = moving ? 'Import it at the new address once it opens there.' : 'Free Calorie Counter will remind you again in a week.';
          const message = `${how === 'shared' ? 'Backup shared' : 'Backup saved'}. ${next}`;
          root.replaceChildren(
            h('p', { class: 'notice-title', id: titleId, text: how === 'shared' ? 'Backup shared' : 'Backup saved' }),
            h('p', { class: 'notice-text', text: message }),
            h('div', { class: 'notice-actions' }, done)
          );
          root.classList.add('is-done');
          announce(message);
          done.focus();
        },
      });
      root.replaceChildren(title, delivery.root);
      announce('Backup file ready, not saved yet.');
      delivery.focus();
    } catch (err) {
      backupBtn.disabled = false;
      laterBtn.disabled = false;
      backupBtn.textContent = 'Back up now';
      status.set('error', `Backup not saved. ${failureText('Make a backup', err)}`);
    }
  });

  return {
    root,
    mounted: () => announce(`${headline}. ${why}`),
  };
}

// Every new user adds Free Calorie Counter to their Home Screen before using
// it. On an iPhone, iPad or Android phone, in a browser tab, with nothing
// logged yet, this screen stands in for the app: it gives the steps and has
// no way past them, since a tab is where iPhone deletes data and the Home
// Screen app starts with its own, empty storage anyway. It never shows once
// the app runs from the Home Screen, on a computer, to someone who already
// logged days here (Today's install note asks them to back up first), or at
// the old address (which asks people to move instead).

import { h, byId, visibleEntries } from './dom.js';
import { store } from './store.js';
import { runningInstalled, onAppleMobile, installSteps } from './install-note.js';
import { movingTo } from './new-address.js';

/** Android phone or tablet. */
function onAndroid() {
  return /Android/.test(window.navigator.userAgent);
}

/**
 * The browser's own install prompt, on browsers that offer one (Chrome on
 * Android). Caught as early as possible, since it fires only once.
 * @type {(Event & { prompt: () => Promise<void> }) | null}
 */
let installPrompt = null;
window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault();
  installPrompt = /** @type {Event & { prompt: () => Promise<void> }} */ (event);
  document.dispatchEvent(new Event('fcc:installable'));
});

/** True when this visit must start by adding the app to the Home Screen. */
export async function needsHomeScreenFirst() {
  if (runningInstalled() || movingTo()) return false;
  if (!onAppleMobile() && !onAndroid()) return false;
  // The status page stays open in a tab, for checking the app itself.
  if (location.hash.startsWith('#/admin')) return false;
  const [entries, photos] = await Promise.all([store.loadEntries(), store.countPhotos().catch(() => 0)]);
  return visibleEntries(entries).length === 0 && photos === 0;
}

/** The Android steps, as an ordered list. */
function androidSteps() {
  return h(
    'ol',
    { class: 'install-steps' },
    h('li', { text: 'Tap the menu button (⋮) in your browser’s toolbar.' }),
    h('li', { text: 'Tap Add to Home screen (or Install app), then Add.' }),
    h('li', { text: 'From now on, open Free Calorie Counter from its new icon.' })
  );
}

/** Replaces the app with the Home Screen step. */
export function renderInstallGate() {
  const apple = onAppleMobile();
  document.title = 'Add to Home Screen · Free Calorie Counter';
  document.body.classList.add('is-install-gate');

  const installBtn = h('button', { type: 'button', class: 'btn btn-primary', text: 'Add to Home screen', hidden: true });
  const done = h('p', { class: 'notice-text', role: 'status' });
  const showInstallButton = () => {
    installBtn.hidden = !installPrompt;
  };
  installBtn.addEventListener('click', async () => {
    if (!installPrompt) return;
    const prompt = installPrompt;
    installPrompt = null;
    installBtn.hidden = true;
    await prompt.prompt();
  });
  document.addEventListener('fcc:installable', showInstallButton);
  window.addEventListener('appinstalled', () => {
    installBtn.hidden = true;
    done.textContent = 'Added. Close this tab and open Free Calorie Counter from its new icon.';
  });
  showInstallButton();

  byId('main').replaceChildren(
    h(
      'section',
      { class: 'card install-gate', 'aria-labelledby': 'install-gate-title', 'data-install-gate': '' },
      h('h2', { class: 'card-title', id: 'install-gate-title', text: 'First, add Free Calorie Counter to your Home Screen' }),
      h('p', {
        class: 'card-sub',
        text: apple
          ? 'Free Calorie Counter is meant to be used from your Home Screen, like an app. In a Safari tab, iPhone may delete your days and photos once it hasn’t been used for about a week. On your Home Screen, they’re kept.'
          : 'Free Calorie Counter is meant to be used from your Home Screen, like an app. It opens full screen, works offline, and your days and photos are kept on this phone.',
      }),
      apple ? installSteps() : androidSteps(),
      installBtn,
      done,
      h('p', {
        class: 'card-sub',
        text: apple
          ? 'Opened from inside another app (Messages, Instagram and so on)? Open this page in Safari first, then follow the steps.'
          : 'Opened from inside another app? Open this page in Chrome first, then follow the steps.',
      }),
      h('p', { class: 'card-sub' }, 'It’s free and nothing is uploaded. ', h('a', { class: 'btn-text', href: 'privacy.html', text: 'Privacy policy' }))
    )
  );
}

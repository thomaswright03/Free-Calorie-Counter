// Every new user adds Free Calorie Counter to their Home Screen before using
// it. On an iPhone, iPad or Android phone, in a browser tab, with nothing
// logged yet, this walkthrough stands in for the app: one step per slide,
// each with a small animated picture of what to tap, and no way past it, since a tab is where iPhone deletes data and the Home
// Screen app starts with its own, empty storage anyway. It never shows once
// the app runs from the Home Screen, on a computer, to someone who already
// logged days here (Today's install note asks them to back up first), or at
// the old address (which asks people to move instead).

import { h, svg, byId, uid, visibleEntries } from './dom.js';
import { announce, openDialog } from './feedback.js';
import { store } from './store.js';
import { runningInstalled, onAppleMobile } from './install-note.js';
import { movingTo } from './new-address.js';
import { motionAllowed } from './motion.js';

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

/** Safari's Share icon: a square with an arrow out of its top. */
function shareIcon() {
  const icon = svg('svg', { viewBox: '0 0 24 24', width: 22, height: 22, 'aria-hidden': 'true', focusable: 'false' });
  icon.append(
    svg('path', { d: 'M12 3v12M7.5 7.5 12 3l4.5 4.5', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }),
    svg('path', { d: 'M8 11H6a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-2', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' })
  );
  return icon;
}

/** "Add to Home Screen"'s icon: a plus in a rounded square. */
function addIcon() {
  const icon = svg('svg', { viewBox: '0 0 24 24', width: 20, height: 20, 'aria-hidden': 'true', focusable: 'false' });
  icon.append(
    svg('rect', { x: 4, y: 4, width: 16, height: 16, rx: 4, fill: 'none', stroke: 'currentColor', 'stroke-width': 2 }),
    svg('path', { d: 'M12 8v8M8 12h8', fill: 'none', stroke: 'currentColor', 'stroke-width': 2, 'stroke-linecap': 'round' })
  );
  return icon;
}

/** @param {string} cls */
const appIcon = (cls) => h('img', { class: cls, src: 'icons/icon-192.png', alt: '', width: 192, height: 192 });
/** A finger's tap: a dot with a ring that ripples out from it. */
const tap = () => h('span', { class: 'walk-tap', 'aria-hidden': 'true' });

/** The app's icon, floating, with a soft glow behind it. */
function welcomeArt() {
  return h('div', { class: 'walk-art walk-art-welcome' }, h('span', { class: 'walk-glow' }), appIcon('walk-hero-icon'));
}

/** Safari's bottom toolbar, its Share button tapped. */
function shareArt() {
  /** @param {string} label */
  const btn = (label) => h('span', { class: 'walk-tool', text: label });
  return h(
    'div',
    { class: 'walk-art walk-phone walk-phone-bottom' },
    h('span', { class: 'walk-page-lines' }, h('span'), h('span'), h('span')),
    h('span', { class: 'walk-address', text: 'calories.wright-ai-solutions.com' }),
    h('span', { class: 'walk-toolbar' }, btn('‹'), btn('›'), h('span', { class: 'walk-tool is-target' }, shareIcon(), tap()), btn('□'), btn('•••'))
  );
}

/** The share sheet sliding up, "Add to Home Screen" picked, then Add. */
function sheetArt() {
  /** @param {string} label @param {boolean} [target] */
  const row = (label, target) => h('span', { class: `walk-row${target ? ' is-target' : ''}` }, h('span', { text: label }), target ? addIcon() : h('span', { class: 'walk-row-dot' }), target ? tap() : null);
  return h(
    'div',
    { class: 'walk-art walk-phone walk-phone-sheet' },
    h(
      'span',
      { class: 'walk-sheet' },
      h('span', { class: 'walk-sheet-head' }, appIcon('walk-sheet-icon'), h('span', { class: 'walk-sheet-name', text: 'Free Calorie Counter' }), h('span', { class: 'walk-add', text: 'Add' })),
      row('Copy'),
      row('Add to Favorites'),
      row('Add to Home Screen', true)
    )
  );
}

/**
 * Chrome's top bar: its ⋮ button tapped, or its menu open with "Add to Home
 * screen" picked.
 * @param {boolean} open
 */
function menuArt(open) {
  /** @param {string} label @param {boolean} [target] */
  const row = (label, target) => h('span', { class: `walk-row${target ? ' is-target' : ''}` }, h('span', { text: label }), target ? addIcon() : null, target ? tap() : null);
  return h(
    'div',
    { class: 'walk-art walk-phone walk-phone-top' },
    h('span', { class: 'walk-page-lines' }, h('span'), h('span'), h('span')),
    h(
      'span',
      { class: 'walk-topbar' },
      h('span', { class: 'walk-address', text: 'calories.wright-ai-solutions.com' }),
      h('span', { class: `walk-tool walk-kebab${open ? '' : ' is-target'}` }, '⋮', open ? null : tap())
    ),
    open ? h('span', { class: 'walk-menu' }, row('New tab'), row('Bookmarks'), row('Add to Home screen', true)) : null
  );
}

/** A Home Screen, where the app's icon drops into place with a sparkle. */
function homeArt() {
  const slots = [];
  for (let i = 0; i < 11; i++) slots.push(h('span', { class: 'walk-slot' }));
  return h(
    'div',
    { class: 'walk-art walk-home' },
    h('span', { class: 'walk-grid' }, slots, h('span', { class: 'walk-new' }, appIcon('walk-new-icon'), h('span', { class: 'walk-sparks' }, h('span'), h('span'), h('span'), h('span')))),
    h('span', { class: 'walk-dock' }, h('span', { class: 'walk-slot' }), h('span', { class: 'walk-slot' }), h('span', { class: 'walk-slot' }), h('span', { class: 'walk-slot' }))
  );
}

/**
 * The mission video's poster with a play button on it. A tap opens the
 * video at full size, with sound and captions (openMissionVideo).
 */
function missionArt() {
  const play = svg('svg', { viewBox: '0 0 24 24', width: 28, height: 28, 'aria-hidden': 'true', focusable: 'false' });
  play.append(svg('path', { d: 'M8 5.5v13l11-6.5z', fill: 'currentColor' }));
  const button = h(
    'button',
    { type: 'button', class: 'walk-video', 'data-mission-video': '', 'aria-label': 'Play our mission video, one minute long' },
    h('img', { class: 'walk-video-poster', src: 'video/mission-thumb.jpg', alt: '', width: 520, height: 320 }),
    h('span', { class: 'walk-play' }, play),
    h('span', { class: 'walk-video-text', 'aria-hidden': 'true', text: 'Watch · 1 min' })
  );
  button.addEventListener('click', openMissionVideo);
  return h('div', { class: 'walk-art walk-art-video' }, button);
}

/**
 * Opens the mission video in a dialog, with its controls and captions. It
 * starts right away, since a tap asked for it; a phone set to reduce
 * motion shows the first frame and waits for the play control instead.
 */
function openMissionVideo() {
  const title = h('h2', { class: 'visually-hidden', id: uid('mission-video'), text: 'Our mission video' });
  const video = /** @type {HTMLVideoElement} */ (
    h(
      'video',
      { class: 'mission-video', controls: true, playsinline: true, preload: 'metadata', poster: 'video/mission-poster.jpg', width: 540, height: 960 },
      h('source', { src: 'video/mission.mp4', type: 'video/mp4' }),
      h('track', { kind: 'captions', src: 'video/mission.vtt', srclang: 'en', label: 'English', default: true })
    )
  );
  const closeBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Close' });
  const close = openDialog({
    className: 'dialog-video',
    labelId: title.id,
    content: h('div', { class: 'video-body' }, title, video, closeBtn),
    initialFocus: closeBtn,
    onClose: () => video.pause(),
  });
  closeBtn.addEventListener('click', () => close());
  if (motionAllowed()) video.play().catch(() => undefined);
}

/** @typedef {{ label: string, title: string, text: string, art: HTMLElement, add?: boolean }} Slide */

/**
 * The walkthrough's slides, for this phone.
 * @param {boolean} apple
 * @returns {Slide[]}
 */
function slides(apple) {
  return [
    {
      label: 'Before you start',
      title: 'First, add Free Calorie Counter to your Home Screen',
      text: apple
        ? 'It’s meant to be used from your Home Screen, like an app. In a Safari tab, iPhone may delete your days and photos once it hasn’t been used for about a week. On your Home Screen, they’re kept. It takes three taps.'
        : 'It’s meant to be used from your Home Screen, like an app. It opens full screen, works offline, and your days and photos are kept on this phone. It takes three taps.',
      art: welcomeArt(),
    },
    {
      label: 'Our mission',
      title: 'Our mission',
      text: 'Counting calories should be free and private. No account, no ads, no subscription, and your numbers never leave your phone.',
      art: missionArt(),
    },
    apple
      ? { label: 'Step 1 of 3', title: 'Tap the Share button', text: 'It’s the square with an arrow in Safari’s toolbar. Don’t see it? Tap ••• first.', art: shareArt() }
      : { label: 'Step 1 of 3', title: 'Open your browser’s menu', text: 'Tap the menu button (⋮) in the corner of the toolbar.', art: menuArt(false) },
    apple
      ? { label: 'Step 2 of 3', title: 'Tap Add to Home Screen, then Add', text: 'Scroll down the list if you don’t see it. Then tap Add in the top corner.', art: sheetArt(), add: true }
      : { label: 'Step 2 of 3', title: 'Tap Add to Home screen', text: 'It may say Install app instead. Then tap Add or Install.', art: menuArt(true), add: true },
    {
      label: 'Step 3 of 3',
      title: 'Open it from your new icon',
      text: apple
        ? 'Close Safari and tap Free Calorie Counter on your Home Screen. From now on, always open it from there.'
        : 'Tap Free Calorie Counter on your Home Screen. From now on, always open it from there.',
      art: homeArt(),
    },
  ];
}

/** @param {boolean} apple */
function footNote(apple) {
  return h(
    'p',
    { class: 'walk-foot' },
    apple ? 'Opened from inside another app (Messages, Instagram and so on)? Open this page in Safari first. ' : 'Opened from inside another app? Open this page in Chrome first. ',
    'It’s free and nothing is uploaded. ',
    h('a', { class: 'btn-text', href: 'privacy.html', text: 'Privacy policy' })
  );
}

/**
 * @param {Slide} step
 * @param {number} i
 */
function slideEl(step, i) {
  return h(
    'div',
    { class: 'walk-slide', 'data-walk-slide': String(i) },
    step.art,
    h('p', { class: 'walk-count', text: step.label }),
    h('h2', { class: 'walk-title', tabindex: '-1', text: step.title }),
    h('p', { class: 'walk-text', text: step.text })
  );
}

/** Shows the browser's own install prompt, once. */
function promptInstall() {
  const prompt = installPrompt;
  installPrompt = null;
  if (prompt) prompt.prompt().catch(() => {});
}

/**
 * A swipe left or right on el moves a step forward or back.
 * @param {HTMLElement} el
 * @param {(step: number) => void} move
 */
function onSwipe(el, move) {
  /** @type {{ x: number, y: number } | null} */
  let start = null;
  el.addEventListener('pointerdown', (e) => {
    start = { x: e.clientX, y: e.clientY };
  });
  el.addEventListener('pointerup', (e) => {
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    start = null;
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy)) return;
    move(dx < 0 ? 1 : -1);
  });
}

/** Replaces the app with the Home Screen walkthrough. */
export function renderInstallGate() {
  const apple = onAppleMobile();
  document.title = 'Add to Home Screen · Free Calorie Counter';
  document.body.classList.add('is-install-gate');

  const steps = slides(apple);
  const slideEls = steps.map((step, i) => slideEl(step, i));
  const dots = steps.map(() => h('span', { class: 'walk-dot' }));
  const backBtn = h('button', { type: 'button', class: 'btn btn-secondary', text: 'Back' });
  const nextBtn = h('button', { type: 'button', class: 'btn btn-primary' });
  const installBtn = h('button', { type: 'button', class: 'btn btn-primary walk-install', text: 'Add to Home screen', hidden: true });
  const done = h('p', { class: 'walk-done', role: 'status' });

  let current = -1;
  /** @param {number} to @param {boolean} [focus] */
  const show = (to, focus) => {
    const forward = to >= current;
    current = to;
    slideEls.forEach((el, i) => {
      el.classList.toggle('is-active', i === to);
      el.dataset.side = i < to ? 'before' : i > to ? 'after' : 'here';
      el.dataset.dir = forward ? 'forward' : 'back';
      if (i === to) el.removeAttribute('inert');
      else el.setAttribute('inert', '');
    });
    dots.forEach((d, i) => d.classList.toggle('is-on', i === to));
    dots.forEach((d, i) => d.classList.toggle('is-past', i < to));
    backBtn.hidden = to === 0;
    const last = to === steps.length - 1;
    nextBtn.textContent = to === 0 ? 'Show me how' : last ? 'See the steps again' : 'Next';
    installBtn.hidden = !(installPrompt && steps[to].add);
    if (focus) {
      const title = slideEls[to].querySelector('.walk-title');
      if (title instanceof HTMLElement) title.focus({ preventScroll: true });
      announce(`${steps[to].title}. ${steps[to].text}`);
    }
  };
  /** @param {number} to */
  const go = (to) => {
    if (to < 0 || to >= steps.length || to === current) return;
    show(to, true);
  };
  backBtn.addEventListener('click', () => go(current - 1));
  nextBtn.addEventListener('click', () => go(current === steps.length - 1 ? steps.findIndex((step) => step.label.startsWith('Step')) : current + 1));

  installBtn.addEventListener('click', () => {
    installBtn.hidden = true;
    promptInstall();
  });
  document.addEventListener('fcc:installable', () => show(current));
  window.addEventListener('appinstalled', () => {
    done.textContent = 'Added. Open Free Calorie Counter from its new icon.';
    go(steps.length - 1);
  });

  const viewport = h('div', { class: 'walk-viewport' }, slideEls);
  onSwipe(viewport, (step) => go(current + step));

  const root = h(
    'section',
    { class: 'card walk', 'aria-label': 'Add Free Calorie Counter to your Home Screen', 'data-install-gate': '' },
    viewport,
    h('div', { class: 'walk-dots', 'aria-hidden': 'true' }, dots),
    installBtn,
    done,
    h('div', { class: 'walk-nav' }, backBtn, nextBtn),
    footNote(apple)
  );
  root.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') go(current + 1);
    else if (e.key === 'ArrowLeft') go(current - 1);
  });
  show(0);
  byId('main').replaceChildren(root);
}

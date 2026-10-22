// Motion helpers: the screen-opening animation and numbers that count up.
// The animations themselves are in style.css (the "motion" section) and
// only run when the phone isn't set to reduce motion. Nothing here delays
// the app: content is on the page and usable at once, and every number
// ends on its exact value even if the browser skips frames.

const reduceQuery = window.matchMedia ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;

/** @returns {boolean} false when the phone asks for reduced motion */
export const motionAllowed = () => !(reduceQuery && reduceQuery.matches);

// Where each screen sits, left to right, so a screen to the right of the
// one left slides in from the right, and one to the left from the left.
/** @type {Record<string, number>} */
const SCREEN_ORDER = { today: 0, log: 0.5, history: 1, compare: 2, photos: 3, settings: 4, admin: 5 };

// The lists that follow their card in, item by item. Past the first few
// items (well below the fold) nothing animates, so a long History costs
// nothing.
const LIST_ITEMS = '.meal-row, .history-item, .photo-thumb, .compare-answer, .amount-row';
const STAGGERED = 14;
// Long enough for the slowest opening animation (the Compare bars) to end.
const ENTER_MS = 1600;

/**
 * Marks a freshly opened screen so its cards and lists animate in, from
 * the side of the screen it was opened from.
 * @param {HTMLElement} main
 * @param {HTMLElement} root the screen's root element
 * @param {string} from the screen left ('' on launch)
 * @param {string} to the screen opened
 */
export function enterScreen(main, root, from, to) {
  const a = SCREEN_ORDER[from];
  const b = SCREEN_ORDER[to];
  main.dataset.dir = a === undefined || b === undefined || a === b ? 'none' : b > a ? 'forward' : 'back';
  Array.from(root.children).forEach((child, i) => {
    if (child instanceof HTMLElement) child.style.setProperty('--i', String(i));
  });
  /** @type {Map<Element | null, number>} */
  const counts = new Map();
  root.querySelectorAll(LIST_ITEMS).forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    const n = counts.get(el.parentElement) || 0;
    counts.set(el.parentElement, n + 1);
    if (n < STAGGERED) el.style.setProperty('--i', String(n));
    else el.style.animation = 'none';
  });
  root.classList.add('view-enter');
  // Once it's in, later changes on the screen (a meal removed, a list
  // redrawn) don't replay the opening.
  setTimeout(() => root.classList.remove('view-enter'), ENTER_MS);
}

/** @type {WeakMap<HTMLElement, () => void>} */
const counting = new WeakMap();

/** @param {number} t from 0 to 1 */
const easeOut = (t) => 1 - Math.pow(1 - t, 3);

/**
 * Shows `to` in `el`, counting up (or down) from `from` when motion is
 * allowed. The exact final text is always set at the end.
 * @param {HTMLElement} el
 * @param {number} from
 * @param {number} to
 * @param {(n: number) => string} format
 * @param {number} [duration] in ms
 */
export function countTo(el, from, to, format, duration = 650) {
  const stop = counting.get(el);
  if (stop) stop();
  if (from === to || !motionAllowed()) {
    el.textContent = format(to);
    return;
  }
  const start = performance.now();
  let frame = 0;
  const finish = () => {
    cancelAnimationFrame(frame);
    clearTimeout(timer);
    counting.delete(el);
    el.textContent = format(to);
  };
  // Ends on time even when frames don't come (a hidden page).
  const timer = setTimeout(finish, duration + 100);
  const step = () => {
    const t = Math.min(1, (performance.now() - start) / duration);
    if (t >= 1) return finish();
    el.textContent = format(Math.round(from + (to - from) * easeOut(t)));
    frame = requestAnimationFrame(step);
  };
  counting.set(el, finish);
  el.textContent = format(from);
  frame = requestAnimationFrame(step);
  replay(el, 'is-counting');
}

/**
 * Plays a one-off CSS animation again, by taking its class off and
 * putting it back.
 * @param {Element} el
 * @param {string} className
 */
export function replay(el, className) {
  el.classList.remove(className);
  // Reading the layout makes the browser notice the class was removed.
  void (/** @type {HTMLElement} */ (el).offsetWidth);
  el.classList.add(className);
}

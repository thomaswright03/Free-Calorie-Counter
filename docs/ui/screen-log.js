// Log Meal: each meal, picked with the meal buttons, logged as one calorie
// total typed in, or one food at a time with the total added up.

import { core, h, MEAL_STEPS, mealLabel, today, blankEntry, notSavedReason, prefs } from './dom.js';
import { failureText } from './problems.js';
import { toast } from './feedback.js';
import { store } from './store.js';
import { dayHash, logHash, replaceHashSilently, returnTo } from './router.js';
import { render } from './render.js';
import { saveDateFor, farBackGate } from './day.js';
import { keepDraft, claimDraft, draftMealFor } from './drafts.js';
import { sayLeftSaved, keepLeftUnsaved } from './leaving.js';
import { modeFor, mealPicker, showRunningTotal, mealBoxes } from './log-boxes.js';

/**
 * What the screen is working on: the day (see today-weight.js), the meal
 * whose box is shown, and whether it's logged as a total or food by food.
 * @typedef {'total' | 'foods'} LogMode
 * @typedef {import('./today-weight.js').DayView & { activeKey: string, mode: LogMode }} LogState
 */

const HOW_IT_SAVES = 'Type a meal’s total, or add its foods one at a time and let the app add them up. Each meal saves as you go; saved meals show a ✓.';

/**
 * What the screen's saving and its ways out share: the last save (while
 * its "saved" message shows under the box), why the last save failed,
 * whether the screen is being left (a save finishing after that doesn't
 * draw this screen again) and whether Save and close was used (it says
 * what was saved itself).
 * @typedef {{ lastSave: { key: string, date: string, saved: number | null, previous: number | null } | null, failure: string, left: boolean, closed: boolean }} SaveTrack
 */

/**
 * Saving the box's value for the meal it was typed for. Saving updates the
 * buttons and total in place (nothing the user might be about to tap is
 * replaced), so the next tap always lands.
 * @param {LogState} state
 * @param {HTMLInputElement} input
 * @param {import('./feedback.js').StatusLine} status
 * @param {() => void} onSaved
 */
function mealSaver(state, input, status, onSaved) {
  /** @type {{ key: string, value: number | null, promise: Promise<boolean> } | null} */
  let saving = null;
  /** @type {SaveTrack} */
  const track = { lastSave: null, failure: '', left: false, closed: false };
  /** @param {{ value: number | null }} result */
  const needsSave = (result) => result.value !== state.entry.meals[state.activeKey] || state.rolledOver;

  /** @param {string} key @param {number | null} value */
  async function save(key, value) {
    const target = saveDateFor(state);
    const previous = state.entry.meals[key];
    status.set('pending', 'Saving…');
    try {
      state.entry = await store.updateEntry(target, { meals: { [key]: value } });
      track.lastSave = { key, date: target, saved: value, previous };
      if (state.rolledOver) {
        if (!track.left) render();
        return true;
      }
      onSaved();
      if (state.activeKey === key) status.set('saved', value === null ? `${mealLabel(key)} cleared` : `${mealLabel(key)} saved`);
      return true;
    } catch (err) {
      track.failure = failureText('Save a meal', err);
      if (state.activeKey === key) status.set('error', track.failure, { label: 'Retry', onClick: () => commit() });
      else toast(`${mealLabel(key)} not saved. ${notSavedReason(track.failure)}`, { tone: 'error' });
      return false;
    } finally {
      if (saving && saving.key === key && saving.value === value) saving = null;
    }
  }

  /** @returns {Promise<boolean>} */
  async function commit() {
    const key = state.activeKey;
    const result = core.validateCalories(input.value);
    if (!result.ok) {
      status.set('error', result.error);
      return false;
    }
    if (!needsSave(result)) {
      if (status.el.classList.contains('is-error')) status.set(null);
      return true;
    }
    if (saving && saving.key === key && saving.value === result.value) return saving.promise;
    const promise = save(key, result.value);
    saving = { key, value: result.value, promise };
    return promise;
  }

  /** True when what's in the box is already saved (or empty and nothing was). */
  const settled = () => {
    const result = core.validateCalories(input.value);
    return result.ok && !needsSave(result);
  };
  return { commit, settled, needsSave, track };
}

/**
 * The ways out of the screen: leaving it, and the page being hidden or
 * closed, each save what's in the box first.
 * @param {LogState} state
 * @param {HTMLInputElement} input
 * @param {import('./feedback.js').StatusLine} status
 * @param {ReturnType<typeof mealSaver>} saver
 */
function mealExits(state, input, status, saver) {
  const { track } = saver;
  /**
   * The screen is being left. A valid number in the box is saved (or the
   * save already under way is waited for) and the next screen says so; so
   * is a save whose "saved" message was still showing, since that message
   * goes with this screen. An invalid one, or one whose save fails, is
   * kept for next time.
   * @param {string} backHash this screen's address, for coming back to fix it
   * @returns {Promise<void> | undefined}
   */
  function leave(backHash) {
    if (track.left) return;
    track.left = true;
    const key = state.activeKey;
    const text = input.value;
    const result = core.validateCalories(text);
    if (!result.ok) {
      keepLeftUnsaved({ field: key, date: state.date, text, error: result.error }, backHash);
      return;
    }
    if (track.closed) return;
    const last = track.lastSave;
    if (!saver.needsSave(result)) {
      if (last && last.key === key && status.el.classList.contains('is-saved')) sayLeftSaved({ field: key, ...last });
      return;
    }
    return saver.commit().then((ok) => {
      const saved = track.lastSave;
      if (ok && saved && saved.key === key) sayLeftSaved({ field: key, ...saved });
      else if (!ok) keepLeftUnsaved({ field: key, date: state.date, text, error: track.failure }, backHash);
    });
  }

  // Saves what's in the box when the page is hidden or closed, exactly as
  // leaving the box would; a value that can't be saved, or whose save
  // fails, is kept as a draft.
  function flush() {
    if (track.left) return;
    const key = state.activeKey;
    const text = input.value;
    const result = core.validateCalories(text);
    if (result.ok) {
      saver.commit().then((ok) => {
        if (!ok) keepDraft({ field: key, date: state.date, text, error: track.failure });
      });
      return;
    }
    keepDraft({ field: key, date: state.date, text, error: result.error });
    status.set('error', result.error);
  }

  const closedWithSave = () => {
    track.closed = true;
  };
  return { leave, flush, closedWithSave };
}

/**
 * Save and close: saves what's in the box, returns to the day and says
 * what was saved. One tap finishes; further taps while it's saving do
 * nothing.
 * @param {LogState} state
 * @param {() => Promise<boolean>} commit
 * @param {() => void} focusBox puts the cursor back in the box to fix
 * @param {string | null} routeDate
 * @param {() => void} onClose runs as it returns to the day, having said what was saved
 */
function doneButton(state, commit, focusBox, routeDate, onClose) {
  const btn = h('button', { type: 'button', class: 'btn btn-primary', text: 'Save and close' });
  btn.addEventListener('click', async () => {
    if (btn.disabled) return;
    btn.disabled = true;
    btn.setAttribute('aria-busy', 'true');
    if (!(await commit())) {
      btn.disabled = false;
      btn.removeAttribute('aria-busy');
      focusBox();
      return;
    }
    const total = core.totalCalories(state.entry.meals);
    const when = core.formatRelativeDate(state.date, today());
    toast(total === null ? `Nothing logged for ${when}` : `Saved for ${when}: ${core.formatCalories(total)}`, { keepOnNavigate: true });
    onClose();
    returnTo(dayHash(routeDate));
  });
  return btn;
}

/**
 * Back to the day. Like every other way out, it saves what's in the box on
 * the way (see mealSaver's leave), and the day's screen says so.
 * @param {LogState} state
 * @param {string | null} routeDate
 */
function backButton(state, routeDate) {
  const now = today();
  const when = core.formatRelativeDate(state.date, now);
  const label = `Back to ${when === 'Today' || when === 'Yesterday' ? when : core.formatMonthDay(state.date, state.date.slice(0, 4) !== now.slice(0, 4))}`;
  return h('button', { type: 'button', class: 'btn btn-secondary', text: label, 'data-log-back': '', onClick: () => returnTo(dayHash(routeDate)) });
}

/**
 * Enter saves the meal and moves to the next one not logged yet, or to
 * Save and close after the last.
 * @param {LogState} state
 * @param {() => Promise<boolean>} commit
 * @param {(key: string) => void} select
 * @param {HTMLElement} doneBtn
 */
async function saveAndMoveOn(state, commit, select, doneBtn) {
  if (!(await commit())) return;
  const idx = MEAL_STEPS.findIndex((m) => m.key === state.activeKey);
  const next = MEAL_STEPS.slice(idx + 1).find((m) => state.entry.meals[m.key] === null);
  if (next) select(next.key);
  else doneBtn.focus();
}

/**
 * Keys in the calories box: Enter saves and moves on; Escape puts back
 * what's saved, as if nothing had been typed.
 * @param {HTMLInputElement} input
 * @param {{ enter: () => void, escape: () => boolean }} on escape: true when it put something back
 */
function boxKeys(input, on) {
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && on.escape()) {
      e.preventDefault();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      on.enter();
    }
  });
}

/**
 * Leaving the screen, or the page being hidden: a food typed but not added
 * is added, and what's in the total box is saved.
 * @param {ReturnType<typeof mealBoxes>['foods']} foods
 * @param {ReturnType<typeof mealExits>} exits
 * @param {() => string} backHash
 */
function bothExits(foods, exits, backHash) {
  return {
    flush() {
      foods.commitPending();
      exits.flush();
    },
    leave() {
      const leaving = [foods.leave(), exits.leave(backHash())].filter(Boolean);
      return leaving.length ? Promise.all(leaving).then(() => undefined) : undefined;
    },
  };
}

/** @type {import('./render.js').ScreenBuilder} */
export async function buildLog(ctx) {
  const now = today();
  const date = ctx.route.date || now;
  const [stored, entries] = await Promise.all([store.getEntry(date), store.loadEntries()]);
  const gate = farBackGate(date, entries, () => render());
  if (gate) {
    return { title: `Log Meal, ${core.formatDate(date, now)}`, root: h('section', { class: 'card' }, h('h2', { class: 'card-title', text: 'Log Meal' }), gate) };
  }
  const entry = stored || blankEntry(date);
  const firstOpen = MEAL_STEPS.find((m) => entry.meals[m.key] === null);
  const activeKey = ctx.route.meal || draftMealFor(date) || (firstOpen ? firstOpen : MEAL_STEPS[0]).key;
  /** @type {LogState} */
  const state = { date, entry, rolledOver: false, activeKey, mode: modeFor(entry, activeKey) };
  const draft = claimDraft(state.activeKey, date);
  if (draft) state.mode = 'total';

  const runningTotal = h('p', { class: 'running-total' });
  const picker = mealPicker((key) => switchTo(key));
  const boxes = mealBoxes(state, picker, runningTotal, (mode) => switchMode(mode));
  const { input, status, foods, refresh, focusBox, loadInput } = boxes;
  const saver = mealSaver(state, input, status, refresh);
  const exits = mealExits(state, input, status, saver);

  /** @param {string} key */
  function select(key) {
    state.activeKey = key;
    state.mode = modeFor(state.entry, key);
    status.set(null);
    loadInput();
    refresh();
    replaceHashSilently(logHash(ctx.route.date, key));
    focusBox();
  }
  // What's typed and not saved yet: the total, or a food not added.
  const commitAll = async () => (await foods.commitPending()) && saver.commit();
  // Nothing to save: switch within the same tap. Otherwise save first.
  /** @param {string} key */
  async function switchTo(key) {
    if (key === state.activeKey) focusBox();
    else if (saver.settled() || (await commitAll())) select(key);
  }
  /** @param {LogMode} mode */
  async function switchMode(mode) {
    if (mode === state.mode) return focusBox();
    if (!(await commitAll())) return;
    state.mode = mode;
    prefs.set('mealMode', mode);
    status.set(null);
    loadInput();
    refresh();
    focusBox();
  }
  const doneBtn = doneButton(state, commitAll, focusBox, ctx.route.date, exits.closedWithSave);
  input.addEventListener('change', saver.commit);
  input.addEventListener('input', () => showRunningTotal(runningTotal, state, input.value));
  boxKeys(input, {
    enter: () => saveAndMoveOn(state, saver.commit, select, doneBtn),
    escape: () => {
      if (saver.settled()) return false;
      select(state.activeKey);
      return true;
    },
  });
  loadInput();
  if (draft) input.value = draft.text;
  refresh();

  const forDay = date === now ? `today, ${core.formatDate(date, now)}` : core.formatDate(date, now);
  const root = h('section', { class: 'card' }, h('h2', { class: 'card-title', text: 'Log Meal' }), h('p', { class: 'card-sub', text: `For ${forDay}. ${HOW_IT_SAVES}` }));
  const backBtn = backButton(state, ctx.route.date);
  root.append(picker.el, boxes.toggle.el, boxes.totalField, foods.el, runningTotal, h('div', { class: 'log-actions' }, backBtn, doneBtn));
  return {
    title: date === now ? 'Log Meal' : `Log Meal, ${core.formatDate(date, now)}`,
    root,
    mounted: () => {
      if (draft) status.set('error', `Not saved yet. ${draft.error}`);
      if (window.matchMedia && window.matchMedia('(hover: hover)').matches) focusBox({ preventScroll: true });
    },
    ...bothExits(foods, exits, () => logHash(ctx.route.date, state.activeKey)),
    async refreshFromStorage() {
      state.entry = (await store.getEntry(state.date)) || blankEntry(state.date);
      if (document.activeElement !== input) loadInput();
      refresh();
    },
  };
}

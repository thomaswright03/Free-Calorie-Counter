// The daily calorie goal as kept on this device (a per-viewer setting).

import { core, prefs } from './dom.js';

const KEY = 'dailyGoal';

/** @returns {number | null} the goal, or null when none is set */
export function getGoal() {
  const raw = prefs.get(KEY, null);
  return raw === null ? null : core.goalFromData(Number(raw));
}

/** @param {number | null} goal null clears it */
export function setGoal(goal) {
  if (goal === null) prefs.remove(KEY);
  else prefs.set(KEY, String(goal));
}

/**
 * Fills the goal line under a day's total: hidden when no goal is set.
 * @param {HTMLElement} el
 * @param {number | null} total calories logged that day
 */
export function showGoalLine(el, total) {
  const goal = getGoal();
  const progress = core.goalProgress(total, goal);
  el.hidden = goal === null;
  el.className = `total-goal${progress ? ` is-${progress.kind}` : ''}`;
  el.textContent = goal === null ? '' : progress ? `of ${core.formatNumber(goal)} goal · ${progress.text}` : `Daily goal ${core.formatNumber(goal)}`;
}

/**
 * Fills the goal meter under a day's total: how much of the goal the day's
 * calories use, full (and red) once over it. Hidden when no goal is set.
 * @param {HTMLElement} el
 * @param {number | null} total
 */
export function showGoalMeter(el, total) {
  const goal = getGoal();
  el.hidden = goal === null;
  if (goal === null) return;
  const used = total === null ? 0 : total / goal;
  el.classList.toggle('is-over', used > 1);
  el.style.setProperty('--p', Math.min(1, Math.max(0, used)).toFixed(4));
}

/**
 * "500 left" / "200 over" for a day's meals, or null.
 * @param {import('../core.js').Entry['meals']} meals
 */
export function goalText(meals) {
  return core.goalProgress(core.totalCalories(meals), getGoal());
}

let focusGoalNext = false;

/** Asks Settings to put the cursor in the goal field the next time it draws. */
export function focusGoalOnNextSettings() {
  focusGoalNext = true;
}

/**
 * Called by Settings once the goal field is on the page: focuses it if a
 * "Set a daily goal" link asked for that.
 * @param {HTMLElement} input
 */
export function takeGoalFocus(input) {
  if (!focusGoalNext) return;
  focusGoalNext = false;
  requestAnimationFrame(() => input.focus({ preventScroll: true }));
}

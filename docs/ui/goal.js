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
 * "500 left" / "200 over" for a day's meals, or null.
 * @param {import('../core.js').Entry['meals']} meals
 */
export function goalText(meals) {
  return core.goalProgress(core.totalCalories(meals), getGoal());
}

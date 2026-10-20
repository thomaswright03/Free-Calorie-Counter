// The daily calorie goal: what can be set, and how a day is shown against it.

'use strict';

const { formatNumber } = require('./numbers.js');

const GOAL_LIMITS = { min: 500, max: 10000 };

/**
 * Validates a goal typed in Settings. Empty clears it (value null).
 * @param {unknown} raw
 * @returns {{ ok: true, value: number | null } | { ok: false, error: string }}
 */
function validateGoal(raw) {
  const text = String(raw === null || raw === undefined ? '' : raw).trim();
  if (text === '') return { ok: true, value: null };
  const plain = /^\d{1,3}(,\d{3})+$/.test(text) ? text.replace(/,/g, '') : text;
  const range = `Enter a daily goal between ${formatNumber(GOAL_LIMITS.min)} and ${formatNumber(GOAL_LIMITS.max)} calories.`;
  if (!/^\d+$/.test(plain)) return { ok: false, error: /^\d*[.,]\d+$/.test(text) ? 'Enter the goal as a whole number, like 2000, without decimals.' : range };
  const value = Number(plain);
  if (value < GOAL_LIMITS.min || value > GOAL_LIMITS.max) return { ok: false, error: range };
  return { ok: true, value };
}

/**
 * A goal read from a backup or storage: a valid whole number, or null.
 * @param {unknown} v
 * @returns {number | null}
 */
function goalFromData(v) {
  if (typeof v !== 'number' || !Number.isInteger(v)) return null;
  const r = validateGoal(String(v));
  return r.ok ? r.value : null;
}

/**
 * A day's calories against the goal, in words.
 * @param {number | null} total calories logged (null: none)
 * @param {number | null} goal
 * @returns {{ kind: 'left' | 'over' | 'met', text: string } | null} null when there's no goal or nothing logged
 */
function goalProgress(total, goal) {
  if (goal === null || total === null) return null;
  const diff = goal - total;
  if (diff > 0) return { kind: 'left', text: `${formatNumber(diff)} left` };
  if (diff === 0) return { kind: 'met', text: 'goal met' };
  return { kind: 'over', text: `${formatNumber(-diff)} over` };
}

module.exports = { GOAL_LIMITS, validateGoal, goalFromData, goalProgress };

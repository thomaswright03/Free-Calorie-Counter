// A day's entry: its weight and each meal's calorie total, and for a meal
// logged one food at a time, its foods. Reading stored days from any
// version of Free Calorie Counter, applying a change, and the day's totals.

/**
 * One day as the app works with it. A meal is its calorie total, or null
 * when it wasn't logged. A meal logged as separate foods also has its list
 * in `foods` (only meals with foods are there, and `foods` is left out
 * when no meal has any); its total is always the sum of that list.
 * @typedef {{ name: string, calories: number }} Food
 * @typedef {{ date: string, weight: number | null, meals: Record<string, number | null>, foods?: Record<string, Food[]> }} Entry
 * @typedef {{ weight?: number | null, meals?: Record<string, number | null>, foods?: Record<string, Food[] | null> }} EntryPatch
 */
'use strict';

const { isValidDateStr } = require('./dates.js');

const MEAL_STEPS = [
  { key: 'breakfast', label: 'Breakfast' },
  { key: 'snack1', label: 'Snack 1' },
  { key: 'lunch', label: 'Lunch' },
  { key: 'snack2', label: 'Snack 2' },
  { key: 'dinner', label: 'Dinner' },
  { key: 'snack3', label: 'Snack 3' },
];
const MEAL_KEYS = MEAL_STEPS.map((m) => m.key);

/** @returns {Record<string, number | null>} */
function emptyMeals() {
  /** @type {Record<string, number | null>} */
  const meals = {};
  for (const key of MEAL_KEYS) meals[key] = null;
  return meals;
}

// A meal's value is a single calorie total (number) or null if not logged.
// Older versions logged individual foods per meal as an array; those are
// read as their summed total, so old history keeps working unchanged.
/** @param {unknown} raw @returns {number | null} */
function normalizeMealValue(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (Array.isArray(raw)) {
    if (raw.length === 0) return null;
    const total = raw.reduce(
      (sum, f) => sum + ((Number(f && f.calories) || 0) * (Number(f && f.percent) || 0)) / 100,
      0
    );
    return Math.round(total);
  }
  if (typeof raw === 'object' || typeof raw === 'boolean') return null;
  const num = Number(raw);
  return Number.isFinite(num) ? Math.round(num) : null;
}

// The longest food name kept, in characters.
const FOOD_NAME_MAX = 60;

// A meal's list of foods as stored, keeping the foods that can be read (a
// whole number of calories, a name that's text); null when none can.
/** @param {unknown} raw @returns {Food[] | null} */
function normalizeFoods(raw) {
  if (!Array.isArray(raw)) return null;
  /** @type {Food[]} */
  const foods = [];
  for (const f of raw) {
    if (!f || typeof f !== 'object') continue;
    const calories = Number(f.calories);
    if (typeof f.calories !== 'number' || !Number.isFinite(calories) || calories < 0) continue;
    const name = typeof f.name === 'string' ? f.name.trim().slice(0, FOOD_NAME_MAX) : '';
    foods.push({ name, calories: Math.round(calories) });
  }
  return foods.length ? foods : null;
}

/** @param {Food[]} foods */
function sumFoods(foods) {
  return foods.reduce((sum, f) => sum + f.calories, 0);
}

/** @param {unknown} raw @returns {number | null} */
function normalizeWeight(raw) {
  if (raw === null || raw === undefined || raw === '' || typeof raw === 'boolean') return null;
  const num = Number(raw);
  return Number.isFinite(num) ? num : null;
}

// A weight to the two decimals the app shows and accepts (165.333 is
// 165.33). Non-finite values are left for validation to refuse.
/** @param {number} value */
function roundWeight(value) {
  return Number.isFinite(value) ? Math.round(value * 100) / 100 : value;
}

// Turns one stored entry into the clean shape the app works with, or null
// when it can't be read at all. Tolerant on purpose: stored data may come
// from any older version of the app.
/**
 * @param {string} date
 * @param {unknown} raw
 * @returns {Entry | null}
 */
function normalizeEntry(date, raw) {
  if (!isValidDateStr(date)) return null;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = /** @type {Record<string, any>} */ (raw);
  const meals = emptyMeals();
  const rawMeals = obj.meals && typeof obj.meals === 'object' && !Array.isArray(obj.meals) ? obj.meals : {};
  for (const key of MEAL_KEYS) meals[key] = normalizeMealValue(rawMeals[key]);
  /** @type {Entry} */
  const entry = { date, weight: normalizeWeight(obj.weight), meals };
  const rawFoods = obj.foods && typeof obj.foods === 'object' && !Array.isArray(obj.foods) ? obj.foods : {};
  for (const key of MEAL_KEYS) setFoods(entry, key, normalizeFoods(rawFoods[key]));
  return entry;
}

// Sets one meal's foods, and its total to their sum; null (or an empty
// list) takes the list away and leaves the meal not logged.
/** @param {Entry} entry @param {string} key @param {Food[] | null} foods */
function setFoods(entry, key, foods) {
  if (foods && foods.length) {
    entry.foods = { ...entry.foods, [key]: foods.map((f) => ({ ...f })) };
    entry.meals[key] = sumFoods(foods);
    return;
  }
  if (entry.foods && entry.foods[key]) {
    entry.meals[key] = null;
    dropFoods(entry, key);
  }
}

// Takes away one meal's list of foods, keeping its total.
/** @param {Entry} entry @param {string} key */
function dropFoods(entry, key) {
  if (!entry.foods || !entry.foods[key]) return;
  const rest = { ...entry.foods };
  delete rest[key];
  if (Object.keys(rest).length) entry.foods = rest;
  else delete entry.foods;
}

// One meal's foods, or an empty list for a meal logged as a total.
/** @param {Entry | null | undefined} entry @param {string} key @returns {Food[]} */
function mealFoods(entry, key) {
  return (entry && entry.foods && entry.foods[key]) || [];
}

// Reads a whole stored entries object, keeping every readable day and
// counting (not throwing on) the ones that can't be read.
/**
 * @param {unknown} raw
 * @returns {{ entries: Record<string, Entry>, skipped: number }}
 */
function sanitizeEntries(raw) {
  /** @type {Record<string, Entry>} */
  const entries = {};
  let skipped = 0;
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return { entries, skipped };
  const obj = /** @type {Record<string, unknown>} */ (raw);
  for (const key of Object.keys(obj)) {
    const entry = normalizeEntry(key, obj[key]);
    if (entry) entries[key] = entry;
    else skipped += 1;
  }
  return { entries, skipped };
}

/** @param {Record<string, unknown> | null | undefined} meals */
function hasMeals(meals) {
  if (!meals) return false;
  return MEAL_KEYS.some((k) => normalizeMealValue(meals[k]) !== null);
}

/** @param {Entry | null | undefined} entry */
function isEntryEmpty(entry) {
  return !entry || (entry.weight === null && !hasMeals(entry.meals));
}

// The day's calorie total, or null when no meal has been logged. A day
// with only a weight is "no calorie data", never "0 calories".
/** @param {Record<string, unknown> | null | undefined} meals @returns {number | null} */
function totalCalories(meals) {
  if (!meals || !hasMeals(meals)) return null;
  let total = 0;
  for (const key of MEAL_KEYS) {
    const v = normalizeMealValue(meals[key]);
    if (v !== null) total += v;
  }
  return total;
}

// Applies a partial update ({ weight?, meals?: { key: value }, foods?:
// { key: list } }) to an entry. Only the fields in the patch change, so two
// screens or tabs editing different meals of the same day never overwrite
// each other. A meal's total typed in replaces its foods; a list of foods
// replaces its total with their sum.
/**
 * @param {string} date
 * @param {unknown} existing
 * @param {EntryPatch} patch
 * @returns {Entry}
 */
function applyPatch(date, existing, patch) {
  const base = existing ? normalizeEntry(date, existing) : null;
  const next = base || { date, weight: null, meals: emptyMeals() };
  if (patch && Object.prototype.hasOwnProperty.call(patch, 'weight')) next.weight = normalizeWeight(patch.weight);
  if (patch && patch.meals && typeof patch.meals === 'object') {
    for (const key of MEAL_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(patch.meals, key)) continue;
      next.meals[key] = normalizeMealValue(patch.meals[key]);
      dropFoods(next, key);
    }
  }
  if (patch && patch.foods && typeof patch.foods === 'object') {
    for (const key of MEAL_KEYS) {
      if (!Object.prototype.hasOwnProperty.call(patch.foods, key)) continue;
      const foods = normalizeFoods(patch.foods[key]);
      if (foods) setFoods(next, key, foods);
      else {
        next.meals[key] = null;
        dropFoods(next, key);
      }
    }
  }
  return next;
}

/**
 * @param {Entry | null | undefined} entry
 * @returns {Record<string, number | null>} weight, total and each meal
 */
function computeDayStats(entry) {
  /** @type {Record<string, number | null>} */
  const stats = { weight: null, total: null };
  for (const key of MEAL_KEYS) stats[key] = null;
  if (!entry) return stats;
  stats.weight = normalizeWeight(entry.weight);
  stats.total = totalCalories(entry.meals);
  for (const key of MEAL_KEYS) stats[key] = normalizeMealValue(entry.meals && entry.meals[key]);
  return stats;
}

module.exports = {
  MEAL_STEPS,
  MEAL_KEYS,
  FOOD_NAME_MAX,
  emptyMeals,
  normalizeMealValue,
  normalizeFoods,
  sumFoods,
  mealFoods,
  normalizeWeight,
  roundWeight,
  normalizeEntry,
  sanitizeEntries,
  hasMeals,
  isEntryEmpty,
  totalCalories,
  applyPatch,
  computeDayStats,
};

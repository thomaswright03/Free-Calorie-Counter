// Log Meal's boxes: the meal buttons, the switch between typing a meal's
// total and adding its foods one at a time, and the day's running total.

import { core, h, uid, MEAL_STEPS, mealLabel, prefs } from './dom.js';
import { createFieldStatus } from './feedback.js';
import { foodsPanel } from './log-foods.js';

/** @typedef {import('./screen-log.js').LogState} LogState @typedef {import('./screen-log.js').LogMode} LogMode */

/**
 * How a meal opens: food by food when it has foods, as a total when it
 * was typed as one, and otherwise the way last chosen.
 * @param {import('../core.js').Entry} entry
 * @param {string} key
 * @returns {LogMode}
 */
export function modeFor(entry, key) {
  if (core.mealFoods(entry, key).length) return 'foods';
  if (entry.meals[key] !== null) return 'total';
  return prefs.get('mealMode', 'total') === 'foods' ? 'foods' : 'total';
}

/**
 * The two ways to log a meal, side by side.
 * @param {(mode: LogMode) => void} onPick
 */
export function modeToggle(onPick) {
  /** @type {[LogMode, string][]} */
  const options = [
    ['total', 'Type the total'],
    ['foods', 'Food by food'],
  ];
  const buttons = options.map(([mode, text]) => h('button', { type: 'button', class: 'segment', 'data-mode': mode, text, onClick: () => onPick(mode) }));
  const el = h('div', { class: 'segmented segmented-wide log-mode', role: 'group' }, buttons);
  /** @param {LogState} state */
  function refresh(state) {
    el.setAttribute('aria-label', `How to log ${mealLabel(state.activeKey)}`);
    for (const b of buttons) b.setAttribute('aria-pressed', b.dataset.mode === state.mode ? 'true' : 'false');
  }
  return { el, refresh };
}

/**
 * The meal buttons. Each shows a ✓ and its calories once saved, for as long
 * as the screen is open.
 * @param {(key: string) => void} onPick
 */
export function mealPicker(onPick) {
  const el = h('div', { class: 'meal-picker', role: 'group', 'aria-label': 'Meal' });
  /** @type {Map<string, HTMLButtonElement>} */
  const pills = new Map();
  for (const step of MEAL_STEPS) {
    const pill = h(
      'button',
      { type: 'button', 'data-meal': step.key, onClick: () => onPick(step.key) },
      h('span', { class: 'pill-label', text: step.label }),
      h('span', { class: 'pill-value', 'aria-hidden': 'true' })
    );
    pills.set(step.key, pill);
    el.append(pill);
  }
  /** @param {LogState} state */
  function refresh(state) {
    for (const step of MEAL_STEPS) {
      const pill = /** @type {HTMLButtonElement} */ (pills.get(step.key));
      const value = state.entry.meals[step.key];
      const active = step.key === state.activeKey;
      pill.className = `meal-pill${active ? ' active' : ''}${value !== null ? ' filled' : ''}`;
      pill.setAttribute('aria-pressed', active ? 'true' : 'false');
      const valueEl = pill.querySelector('.pill-value');
      if (valueEl) valueEl.textContent = value !== null ? `✓ ${core.formatNumber(value)}` : '';
      pill.setAttribute('aria-label', value !== null ? `${step.label}, ${core.formatCalories(value)}, saved` : `${step.label}, not logged`);
    }
  }
  return { el, refresh };
}

/**
 * The day total, which follows what's typed, marked as not saved until it is.
 * @param {HTMLElement} el
 * @param {LogState} state
 * @param {string} typedText
 */
export function showRunningTotal(el, state, typedText) {
  const typed = core.validateCalories(typedText);
  const unsaved = typed.ok && typed.value !== state.entry.meals[state.activeKey];
  const meals = unsaved ? { ...state.entry.meals, [state.activeKey]: typed.value } : state.entry.meals;
  const total = core.totalCalories(meals);
  el.replaceChildren(total === null ? 'No meals logged yet' : `Day total: ${core.formatCalories(total)}`);
  if (unsaved) el.append(h('span', { class: 'running-note', text: ` · ${mealLabel(state.activeKey)} not saved yet` }));
}

/**
 * The boxes for the meal picked: its total, or its foods, with the switch
 * between the two. `loadInput` puts the saved total in the total box;
 * `refresh` redraws everything after a change.
 * @param {LogState} state
 * @param {ReturnType<typeof mealPicker>} picker
 * @param {HTMLElement} runningTotal
 * @param {(mode: LogMode) => void} onMode
 */
export function mealBoxes(state, picker, runningTotal, onMode) {
  const input = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', id: uid('cal'), placeholder: 'e.g. 450' });
  const label = h('label', { for: input.id });
  const status = createFieldStatus(input);
  const toggle = modeToggle(onMode);
  const totalHint = h('p', { class: 'field-hint' });
  const totalField = h('div', { class: 'field' }, label, input, status.el, totalHint);
  const loadInput = () => {
    const v = state.entry.meals[state.activeKey];
    input.value = v === null ? '' : String(v);
    label.textContent = `${mealLabel(state.activeKey)} calories`;
  };
  const refresh = () => {
    picker.refresh(state);
    toggle.refresh(state);
    foods.refresh();
    const count = core.mealFoods(state.entry, state.activeKey).length;
    totalHint.textContent = count ? `${mealLabel(state.activeKey)} has ${count === 1 ? '1 food' : `${count} foods`} added. Typing a total here replaces them.` : '';
    totalField.hidden = state.mode !== 'total';
    foods.el.hidden = state.mode !== 'foods';
    showRunningTotal(runningTotal, state, input.value);
  };
  const foods = foodsPanel(state, () => {
    loadInput();
    refresh();
  });
  /** @param {FocusOptions} [options] */
  const focusBox = (options) => (state.mode === 'foods' ? foods.focus(options) : input.focus(options));
  return { input, status, toggle, totalField, foods, loadInput, refresh, focusBox };
}

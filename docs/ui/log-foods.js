// Log Meal's food list: a meal logged one food at a time. Each food added
// or removed saves straight away, and the meal's total is their sum.

import { core, h, uid, mealLabel, notSavedReason } from './dom.js';
import { failureText } from './problems.js';
import { toast, announce, createFieldStatus } from './feedback.js';
import { store } from './store.js';
import { render } from './render.js';
import { saveDateFor } from './day.js';

/**
 * @typedef {import('../core.js').Food} Food
 * @typedef {import('./screen-log.js').LogState} LogState
 * @typedef {(change: (foods: Food[]) => Food[]) => Promise<string>} SaveFoods saves the meal's list as changed; resolves to the meal's key
 */

/** A food's name as shown: its own, or "Food 2" when it has none. @param {{ name: string }} food @param {number} i */
export const foodName = (food, i) => food.name || `Food ${i + 1}`;

/** "1 food", "3 foods" @param {number} n */
export const foodCount = (n) => (n === 1 ? '1 food' : `${core.formatNumber(n)} foods`);

/**
 * Saving a change to the meal's list. The change is made to the list as
 * stored now, so a change made in another tab, or a new day after
 * midnight, is built on rather than overwritten.
 * @param {LogState} state
 * @param {() => void} onSaved
 * @returns {SaveFoods}
 */
function foodSaver(state, onSaved) {
  return async (change) => {
    const key = state.activeKey;
    const target = saveDateFor(state);
    const stored = await store.getEntry(target);
    state.entry = await store.updateEntry(target, { foods: { [key]: change(core.mealFoods(stored, key)) } });
    if (state.rolledOver) render();
    else onSaved();
    return key;
  };
}

/**
 * Removes one food, offering Undo for a few seconds.
 * @param {LogState} state
 * @param {SaveFoods} save
 * @param {number} index
 */
async function removeFood(state, save, index) {
  const key = state.activeKey;
  const food = core.mealFoods(state.entry, key)[index];
  if (!food) return;
  const shown = foodName(food, index);
  try {
    await save((foods) => foods.filter((_, i) => i !== index));
  } catch (err) {
    toast(`${shown} not removed. ${notSavedReason(failureText('Remove a food', err))}`, { tone: 'error' });
    return;
  }
  announce(`${shown} removed from ${mealLabel(key)}.`);
  const putBack = async () => {
    if (state.activeKey !== key) return;
    try {
      await save((foods) => [...foods.slice(0, index), food, ...foods.slice(index)]);
    } catch (err) {
      toast(`${shown} not put back. ${notSavedReason(failureText('Put back a food', err))}`, { tone: 'error' });
    }
  };
  toast(`${shown} removed from ${mealLabel(key)}`, { action: { label: 'Undo', onClick: putBack } });
}

/**
 * The meal's foods, each with a Remove button, and what they add up to.
 * @param {LogState} state
 * @param {(index: number) => void} onRemove
 */
function foodList(state, onRemove) {
  const list = h('ul', { class: 'food-list' });
  const sum = h('p', { class: 'food-sum' });
  function refresh() {
    const key = state.activeKey;
    const foods = core.mealFoods(state.entry, key);
    const meal = mealLabel(key);
    list.setAttribute('aria-label', `${meal} foods`);
    list.replaceChildren(
      ...foods.map((food, i) =>
        h(
          'li',
          { class: 'food-row' },
          h('span', { class: 'food-name', text: foodName(food, i) }),
          h('span', { class: 'food-cal', text: core.formatCalories(food.calories) }),
          h(
            'button',
            { type: 'button', class: 'icon-btn icon-btn-danger', 'aria-label': `Remove ${foodName(food, i)} from ${meal}`, 'data-remove-food': String(i), onClick: () => onRemove(i) },
            h('span', { 'aria-hidden': 'true', text: '×' })
          )
        )
      )
    );
    list.hidden = foods.length === 0;
    const typed = state.entry.meals[key];
    if (foods.length) sum.textContent = `${meal} total: ${core.formatCalories(core.sumFoods(foods))} from ${foodCount(foods.length)}`;
    else if (typed !== null) sum.textContent = `${meal} is logged as a ${core.formatCalories(typed)} total. Adding a food replaces it: then the foods you add are counted instead.`;
    else sum.textContent = `Add each food in ${meal} and the app adds them up.`;
  }
  return { els: [list, sum], refresh };
}

/**
 * The boxes to add a food (its name, which is optional, and its calories)
 * and the Add food button. Enter in the name box moves to the calories;
 * Enter there adds the food.
 * @param {LogState} state
 * @param {SaveFoods} save
 */
function foodAdder(state, save) {
  const nameInput = h('input', { type: 'text', autocomplete: 'off', id: uid('food'), maxlength: String(core.FOOD_NAME_MAX), placeholder: 'e.g. Eggs (optional)', enterkeyhint: 'next' });
  const calInput = h('input', { type: 'text', inputmode: 'numeric', autocomplete: 'off', id: uid('foodcal'), placeholder: 'e.g. 140', enterkeyhint: 'done' });
  const nameLabel = h('label', { for: nameInput.id });
  const status = createFieldStatus(calInput);
  /** The add under way, so a second tap or Enter doesn't add the same food twice. @type {Promise<boolean> | null} */
  let adding = null;
  /** Why the last add failed. */
  let failure = '';

  /** Adds what's in the boxes. @returns {Promise<boolean>} */
  function add() {
    if (adding) return adding;
    const checked = core.validateFood(nameInput.value, calInput.value);
    if (!checked.ok) {
      failure = checked.error;
      status.set('error', checked.error);
      (checked.field === 'name' ? nameInput : calInput).focus();
      return Promise.resolve(false);
    }
    const food = checked.food;
    status.set('pending', 'Adding…');
    adding = save((foods) => [...foods, food])
      .then((key) => {
        nameInput.value = '';
        calInput.value = '';
        status.set('saved', `${food.name || 'Food'} added to ${mealLabel(key)}`);
        return true;
      })
      .catch((err) => {
        failure = failureText('Add a food', err);
        status.set('error', failure, { label: 'Retry', onClick: () => add() });
        return false;
      })
      .finally(() => {
        adding = null;
      });
    return adding;
  }
  const addAndGoOn = () => add().then((ok) => ok && nameInput.focus());
  const addBtn = h('button', { type: 'button', class: 'btn btn-secondary food-add-btn', text: 'Add food', onClick: addAndGoOn });
  nameInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    calInput.focus();
  });
  calInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    addAndGoOn();
  });

  const el = h(
    'div',
    { class: 'food-add' },
    h('div', { class: 'field-row' }, h('div', { class: 'field' }, nameLabel, nameInput), h('div', { class: 'field' }, h('label', { for: calInput.id, text: 'Calories' }), calInput)),
    status.el,
    addBtn
  );
  const refresh = () => {
    nameLabel.textContent = `Food in ${mealLabel(state.activeKey)}`;
  };
  /** Calories typed for a food not added yet. */
  const pending = () => calInput.value.trim() !== '';
  const typed = () => `${nameInput.value.trim() || 'Food'}, ${calInput.value.trim()}`;
  /** @param {FocusOptions} [options] */
  const focus = (options) => nameInput.focus(options);
  return { el, add, pending, typed, failure: () => failure, refresh, focus };
}

/**
 * The food list and the boxes to add one, for the meal being logged.
 * @param {LogState} state
 * @param {() => void} onSaved runs after each change is saved, to redraw the rest of the screen
 */
export function foodsPanel(state, onSaved) {
  const save = foodSaver(state, onSaved);
  const adder = foodAdder(state, save);
  const list = foodList(state, (i) => {
    removeFood(state, save, i);
    adder.focus();
  });
  const el = h('div', { class: 'foods-panel' }, ...list.els, adder.el);

  /**
   * Adds a food typed but not added yet (Save and close, another meal).
   * Nothing typed is fine; a food that can't be added stops there with
   * its message.
   * @returns {Promise<boolean>}
   */
  const commitPending = () => (adder.pending() ? adder.add() : Promise.resolve(true));

  /**
   * The screen is being left: a food typed but not added is added, and the
   * next screen says so; one that can't be is named there.
   * @returns {Promise<void> | undefined}
   */
  function leave() {
    if (!adder.pending()) return;
    const typed = adder.typed();
    const meal = mealLabel(state.activeKey);
    return adder.add().then((ok) => {
      if (ok) toast(`Added to ${meal}: ${typed} cal`, { keepOnNavigate: true });
      else toast(`Not added to ${meal} (“${typed}”). ${notSavedReason(adder.failure())}`, { tone: 'error', keepOnNavigate: true });
    });
  }

  const refresh = () => {
    list.refresh();
    adder.refresh();
  };
  return { el, refresh, commitPending, leave, focus: adder.focus };
}

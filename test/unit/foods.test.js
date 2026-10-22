// A meal logged one food at a time: the foods are kept with the day, the
// meal's total is always their sum, and typing a total replaces them.
const test = require('node:test');
const assert = require('node:assert/strict');
const core = require('../../docs/core.js');
const { createLocalStore } = require('../../docs/store-local.js');

const meals = (m) => ({ ...core.emptyMeals(), ...m });
const eggs = { name: 'Eggs', calories: 140 };
const toast = { name: 'Toast', calories: 90 };

function memoryStorage() {
  const data = new Map();
  return {
    data,
    get length() {
      return data.size;
    },
    key: (i) => [...data.keys()][i] ?? null,
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
    removeItem: (k) => data.delete(k),
  };
}

test('a list of foods sets the meal total to their sum; typing a total replaces the list', () => {
  const withFoods = core.applyPatch('2026-10-22', null, { foods: { breakfast: [eggs, toast] } });
  assert.equal(withFoods.meals.breakfast, 230);
  assert.deepEqual(withFoods.foods, { breakfast: [eggs, toast] });
  assert.equal(core.totalCalories(withFoods.meals), 230);

  const lunch = core.applyPatch('2026-10-22', withFoods, { meals: { lunch: 500 } });
  assert.deepEqual(lunch.foods, { breakfast: [eggs, toast] }, 'other meals keep their foods');
  assert.equal(core.totalCalories(lunch.meals), 730);

  const typed = core.applyPatch('2026-10-22', lunch, { meals: { breakfast: 300 } });
  assert.equal(typed.meals.breakfast, 300);
  assert.equal(typed.foods, undefined, 'no meal has foods left, so there is no foods section');

  const emptied = core.applyPatch('2026-10-22', withFoods, { foods: { breakfast: [] } });
  assert.equal(emptied.meals.breakfast, null);
  assert.equal(core.isEntryEmpty(emptied), true);

  const removed = core.applyPatch('2026-10-22', withFoods, { meals: { breakfast: null } });
  assert.equal(removed.foods, undefined);
});

test('days saved before foods existed read exactly as before', () => {
  const old = core.normalizeEntry('2026-10-01', { date: '2026-10-01', weight: 180, meals: { lunch: 600 } });
  assert.deepEqual(old, { date: '2026-10-01', weight: 180, meals: meals({ lunch: 600 }) });
  assert.deepEqual(core.mealFoods(old, 'lunch'), []);
});

test('stored foods are read tolerantly, and the total always follows them', () => {
  const e = core.normalizeEntry('2026-10-22', {
    meals: { breakfast: 999, dinner: 400 },
    foods: { breakfast: [eggs, { calories: 'x' }, null, { name: 5, calories: 10 }], dinner: 'nope', bogus: [eggs] },
  });
  assert.deepEqual(e.foods, { breakfast: [eggs, { name: '', calories: 10 }] });
  assert.equal(e.meals.breakfast, 150);
  assert.equal(e.meals.dinner, 400);
});

test('a typed food is checked like a meal: name optional, whole calories, with a message for each problem', () => {
  assert.deepEqual(core.validateFood('  Eggs ', '140'), { ok: true, food: eggs });
  assert.deepEqual(core.validateFood('', '1,200'), { ok: true, food: { name: '', calories: 1200 } });
  assert.deepEqual(core.validateFood('Eggs', ''), { ok: false, field: 'calories', error: 'Enter the food’s calories, like 120.' });
  assert.match(core.validateFood('Eggs', '12.5').error, /whole number/);
  assert.match(core.validateFood('Eggs', '20000').error, /for one food/);
  assert.equal(core.validateFood('x'.repeat(61), '10').field, 'name');
});

test('a change to a meal’s foods is refused when it breaks the rules', () => {
  assert.equal(core.validatePatch({ foods: { breakfast: [eggs] } }).ok, true);
  assert.equal(core.validatePatch({ foods: { breakfast: null } }).ok, true);
  assert.match(core.validatePatch({ foods: { brunch: [eggs] } }).error, /Unknown meal/);
  assert.match(core.validatePatch({ foods: { breakfast: 'eggs' } }).error, /^Breakfast not saved/);
  assert.match(core.validatePatch({ foods: { breakfast: [{ name: 'a', calories: 6000 }, { name: 'b', calories: 6000 }] } }).error, /add up to 12,000/);
  assert.match(core.validatePatch({ foods: { breakfast: Array(51).fill(eggs) } }).error, /50 foods at most/);
});

test('backups carry the foods and bring them back; a backup without them still imports', () => {
  const day = core.applyPatch('2026-10-22', null, { foods: { breakfast: [eggs, toast] }, meals: { lunch: 500 } });
  const written = core.entryForBackup(day);
  assert.deepEqual(written.foods, { breakfast: [eggs, toast] });
  const parsed = core.parseBackup(JSON.stringify({ app: 'free-calorie-counter', version: 2, entries: { [day.date]: written } }));
  assert.equal(parsed.ok, true);
  assert.deepEqual(parsed.entries[day.date], day);

  const tampered = core.parseBackup(JSON.stringify({ entries: { [day.date]: { ...written, meals: meals({ breakfast: 5, lunch: 500 }) } } }));
  assert.equal(tampered.entries[day.date].meals.breakfast, 230, 'the total comes from the foods');
  assert.match(core.parseBackup(JSON.stringify({ entries: { [day.date]: { ...written, foods: { breakfast: [{ name: 'Eggs', calories: -1 }] } } } })).error, /Breakfast on .*negative/);

  const typedOnly = { ...day, foods: undefined };
  delete typedOnly.foods;
  const diff = core.compareWithStored({ [day.date]: day }, { [day.date]: { ...typedOnly, meals: { ...day.meals } } });
  assert.deepEqual(diff.replaced, [day.date], 'the same totals with different foods is a different day');
});

test('adding foods one by one in the phone’s storage keeps other meals and the weight', async () => {
  const storage = memoryStorage();
  const store = createLocalStore({ storage, onNotice: () => {} });
  await store.updateEntry('2026-10-22', { weight: 181, meals: { dinner: 700 } });
  await store.updateEntry('2026-10-22', { foods: { breakfast: [eggs] } });
  const after = await store.updateEntry('2026-10-22', { foods: { breakfast: [eggs, toast] } });
  assert.equal(after.meals.breakfast, 230);
  const read = await store.getEntry('2026-10-22');
  assert.deepEqual(read, { date: '2026-10-22', weight: 181, meals: meals({ breakfast: 230, dinner: 700 }), foods: { breakfast: [eggs, toast] } });
  const all = await store.loadEntries();
  assert.equal(core.totalCalories(all['2026-10-22'].meals), 930);
});

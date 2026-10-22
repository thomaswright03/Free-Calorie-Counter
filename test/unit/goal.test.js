const test = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const core = require('../../docs/core.js');
const { createBackupWriter, checkBackup } = require('../../docs/backup-file.js');

test('goal input: whole numbers in range, commas allowed, empty clears', () => {
  assert.deepEqual(core.validateGoal('2000'), { ok: true, value: 2000 });
  assert.deepEqual(core.validateGoal('2,000'), { ok: true, value: 2000 });
  assert.deepEqual(core.validateGoal('  '), { ok: true, value: null });
  for (const bad of ['499', '10001', '1800.5', 'abc', '-5']) assert.equal(core.validateGoal(bad).ok, false, bad);
});

test('goal progress: left, met, over, and nothing without a goal or meals', () => {
  assert.deepEqual(core.goalProgress(1500, 2000), { kind: 'left', text: '500 left' });
  assert.deepEqual(core.goalProgress(2000, 2000), { kind: 'met', text: 'goal met' });
  assert.deepEqual(core.goalProgress(2300, 2000), { kind: 'over', text: '300 over' });
  assert.equal(core.goalProgress(null, 2000), null);
  assert.equal(core.goalProgress(1500, null), null);
});

test('the goal is written to a backup and read back; a backup without one gives null', async () => {
  const withGoal = createBackupWriter({}, '2026-09-24T10:00:00.000Z', 1800).finish();
  const a = await checkBackup(withGoal);
  assert.equal(a.ok, true);
  assert.equal(a.dailyGoal, 1800);
  const without = await checkBackup(new Blob([JSON.stringify({ app: 'free-calorie-counter', version: 2, entries: { '2025-05-01': { date: '2025-05-01', weight: 150, meals: {} } } })]));
  assert.equal(without.ok, true);
  assert.equal(without.dailyGoal, null);
  const bogus = await checkBackup(new Blob([JSON.stringify({ settings: { dailyGoal: 5 }, entries: { '2025-05-01': { date: '2025-05-01', weight: 150, meals: {} } } })]));
  assert.equal(bogus.dailyGoal, null);
});

test('Latest Update was changed in or after the newest commit touching docs/ (when git history is available)', () => {
  const root = path.join(__dirname, '..', '..');
  const { LATEST_UPDATE } = { LATEST_UPDATE: parseUpdate(fs.readFileSync(path.join(root, 'docs/ui/latest-update.js'), 'utf8')) };
  assert.match(LATEST_UPDATE.date, /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(LATEST_UPDATE.frontendCount > 0);
  // Each round replaces the last one's list instead of adding to it.
  assert.ok(LATEST_UPDATE.frontendCount <= 6, `Latest Update lists ${LATEST_UPDATE.frontendCount} changes: list only the latest round (6 at most)`);
  // The last commit that touched user-facing docs/ files (other than this file
  // and the generated build) must not come after the last commit that
  // changed latest-update.js.
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  let docsCommit = '';
  let updateCommit = '';
  try {
    docsCommit = git('rev-list', '-1', 'HEAD', '--', 'docs', ':(exclude)docs/build', ':(exclude)docs/sw.js', ':(exclude)docs/ui/latest-update.js');
    updateCommit = git('rev-list', '-1', 'HEAD', '--', 'docs/ui/latest-update.js');
  } catch {
    return;
  }
  if (!docsCommit || !updateCommit || docsCommit === updateCommit) return;
  let ok = true;
  try {
    git('merge-base', '--is-ancestor', docsCommit, updateCommit);
  } catch (e) {
    // Exit 1 means "not an ancestor"; anything else (shallow clone) is skipped.
    ok = e.status !== 1;
  }
  assert.ok(ok, `docs/ commit ${docsCommit.slice(0, 7)} is newer than the last Latest Update change (${updateCommit.slice(0, 7)}): update docs/ui/latest-update.js`);
});

function parseUpdate(source) {
  const date = /date: '([^']+)'/.exec(source)[1];
  const list = /frontend: \[([\s\S]*?)\n {2}\],/.exec(source)[1];
  return { date, frontendCount: list.split('\n').filter((l) => l.trim().startsWith("'")).length };
}

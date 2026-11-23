// Checks how mark-known-bugs.mjs and ci-summary.mjs classify results: they decide whether a run
// is red or green. Run with `npm run test:scripts`.
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';

const scripts = import.meta.dirname;
const dirs = [];
let dir;

afterEach(() => {
  for (const created of dirs.splice(0)) {
    rmSync(created, { recursive: true, force: true });
  }
});

const BUG_LABELS = [
  { name: 'tag', value: '@known-bug' },
  { name: 'expectedError', value: '/mattress"' },
];

/** Writes Allure results; each is { id, name, status, message?, labels?, stop? }. */
function writeResults(results) {
  dir = mkdtempSync(join(tmpdir(), 'allure-results-'));
  dirs.push(dir);
  for (const { id, message, labels = [], stop = 1, ...rest } of results) {
    const result = {
      historyId: rest.name,
      ...rest,
      stop,
      labels: [{ name: 'parentSuite', value: 'ui' }, ...labels],
      statusDetails: message ? { message } : {},
    };
    writeFileSync(join(dir, `${id}-result.json`), JSON.stringify(result));
  }
}

function run(script, ...args) {
  return spawnSync(process.execPath, [join(scripts, script), dir, ...args], { encoding: 'utf8' });
}

function read(id) {
  return JSON.parse(readFileSync(join(dir, `${id}-result.json`), 'utf8'));
}

const knownBugLabel = (result) => result.labels.find((label) => label.name === 'knownBug')?.value;

test('mark-known-bugs classifies each known-bug outcome', () => {
  writeResults([
    // test.fail() test that failed with the bug: Playwright and Allure report it as passed.
    {
      id: 'a',
      name: 'expected',
      status: 'passed',
      labels: BUG_LABELS,
      message: 'Received: "x/mattress"',
    },
    { id: 'b', name: 'other', status: 'passed', labels: BUG_LABELS, message: 'Received: "x/"' },
    { id: 'c', name: 'fixed', status: 'failed', labels: BUG_LABELS },
    { id: 'd', name: 'normal', status: 'passed' },
  ]);

  const { status } = run('mark-known-bugs.mjs');

  assert.equal(status, 0, 'without --strict the script never fails');
  assert.deepEqual(
    [read('a'), read('b'), read('c')].map((result) => [result.status, knownBugLabel(result)]),
    [
      ['failed', 'expected-failure'],
      ['broken', 'unexpected-failure'],
      ['failed', 'no-longer-reproduces'],
    ],
  );
  assert.equal(knownBugLabel(read('d')), undefined);
});

test('mark-known-bugs --strict exits 1 only for a failure other than the bug', () => {
  writeResults([
    { id: 'a', name: 'expected', status: 'passed', labels: BUG_LABELS, message: 'x/mattress"' },
  ]);
  assert.equal(run('mark-known-bugs.mjs', '--strict').status, 0);

  writeResults([{ id: 'b', name: 'other', status: 'passed', labels: BUG_LABELS, message: 'x/"' }]);
  const { status, stderr } = run('mark-known-bugs.mjs', '--strict');
  assert.equal(status, 1);
  assert.match(stderr, /other: Known-bug test failed for another reason/);
});

test('ci-summary counts the last attempt, flaky retries and known bugs', () => {
  writeResults([
    { id: 'a1', name: 'retried', status: 'failed', stop: 1 },
    { id: 'a2', name: 'retried', status: 'passed', stop: 2 },
    { id: 'b', name: 'ok', status: 'passed' },
    {
      id: 'c',
      name: 'bug',
      status: 'failed',
      labels: [{ name: 'knownBug', value: 'expected-failure' }],
    },
    { id: 'd', name: 'broken one', status: 'broken' },
  ]);

  const { stdout } = run('ci-summary.mjs');

  // Columns: passed | failed | broken | skipped | flaky | known bug
  assert.match(stdout, /\| ui \| 1 \| 0 \| 1 \| 0 \| 1 \| 1 \|/);
  assert.match(stdout, /- \*\*flaky\*\* `ui` retried/);
  assert.match(stdout, /- \*\*broken\*\* `ui` broken one/);
  assert.match(stdout, /- \*\*known bug\*\* `ui` bug/);
});

test('mark-known-bugs treats a known-bug test without an expectedError label as unexpected', () => {
  writeResults([
    {
      id: 'a',
      name: 'no label',
      status: 'passed',
      labels: [{ name: 'tag', value: '@known-bug' }],
      message: 'Received: "x/mattress"',
    },
  ]);

  assert.equal(run('mark-known-bugs.mjs', '--strict').status, 1);
  assert.deepEqual([read('a').status, knownBugLabel(read('a'))], ['broken', 'unexpected-failure']);
});

test('mark-known-bugs leaves already marked results unchanged on a second run', () => {
  writeResults([
    { id: 'a', name: 'expected', status: 'passed', labels: BUG_LABELS, message: 'x/mattress"' },
  ]);
  run('mark-known-bugs.mjs');
  const once = read('a');

  run('mark-known-bugs.mjs');

  assert.deepEqual(read('a'), once);
});

test('ci-summary counts a known bug that needed a retry as flaky', () => {
  writeResults([
    { id: 'a1', name: 'slow bug', status: 'broken', stop: 1 },
    {
      id: 'a2',
      name: 'slow bug',
      status: 'failed',
      stop: 2,
      labels: [{ name: 'knownBug', value: 'expected-failure' }],
    },
  ]);

  const { stdout } = run('ci-summary.mjs');

  assert.match(stdout, /\| ui \| 0 \| 0 \| 0 \| 0 \| 1 \| 0 \|/);
  assert.match(stdout, /- \*\*flaky\*\* `ui` slow bug/);
});

test('ci-summary lists skipped quarantined tests with their reason', () => {
  writeResults([
    {
      id: 'a',
      name: 'UI-12 held back',
      status: 'skipped',
      labels: [{ name: 'tag', value: 'quarantine' }],
      steps: [{ name: 'quarantine: bug #32 shows no sizes' }],
    },
    { id: 'b', name: 'plain skip', status: 'skipped' },
  ]);

  const { stdout } = run('ci-summary.mjs');

  assert.match(stdout, /Quarantined \(skipped on purpose/);
  assert.match(stdout, /- `ui` UI-12 held back: bug #32 shows no sizes/);
  assert.doesNotMatch(stdout, /plain skip:/);
});

test('mark-known-bugs leaves a known-bug test that failed in its setup as an ordinary failure', () => {
  // test.fail() wasn't reached: Playwright reports a plain failure (and retries it in CI).
  writeResults([
    { id: 'a', name: 'setup', status: 'failed', labels: BUG_LABELS, message: 'page.goto: Timeout' },
  ]);

  assert.equal(run('mark-known-bugs.mjs', '--strict').status, 0);
  assert.deepEqual([read('a').status, knownBugLabel(read('a'))], ['failed', undefined]);
});

// Prints a Markdown summary of allure-results/ (pass/fail counts per Playwright project) for
// $GITHUB_STEP_SUMMARY. With retries there is one result per attempt: the last attempt counts,
// and a test that passed after a failed or broken attempt is reported as flaky. Known bugs
// (@known-bug, failing as expected) get their own column and are not listed as problems.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = process.argv[2] ?? 'allure-results';
// A test job that died before uploading leaves no results: report that instead of crashing.
const files = (existsSync(dir) ? readdirSync(dir) : []).filter((file) =>
  file.endsWith('-result.json'),
);
const attemptsByTest = new Map();

for (const file of files) {
  const result = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const key = result.historyId ?? result.fullName;
  attemptsByTest.set(key, [...(attemptsByTest.get(key) ?? []), result]);
}

const COLUMNS = ['passed', 'failed', 'broken', 'skipped', 'flaky', 'known bug'];
const byProject = new Map();
const problems = [];
const knownBugs = [];

for (const attempts of attemptsByTest.values()) {
  attempts.sort((a, b) => a.stop - b.stop);
  const last = attempts.at(-1);
  const project = last.labels.find((label) => label.name === 'parentSuite')?.value ?? 'unknown';
  // Failed as expected (marked by scripts/mark-known-bugs.mjs): counted apart from real failures.
  const knownBug = last.labels.some(
    (label) => label.name === 'knownBug' && label.value === 'expected-failure',
  );
  // Ended as expected (passed, or failed with its known bug) after a failed or broken attempt.
  const flaky =
    (last.status === 'passed' || knownBug) &&
    attempts
      .slice(0, -1)
      .some((attempt) => attempt.status === 'failed' || attempt.status === 'broken');
  const outcome = flaky ? 'flaky' : knownBug ? 'known bug' : last.status;
  const counts = byProject.get(project) ?? Object.fromEntries(COLUMNS.map((column) => [column, 0]));
  counts[outcome] = (counts[outcome] ?? 0) + 1;
  byProject.set(project, counts);
  if (outcome === 'known bug') {
    knownBugs.push(`- **known bug** \`${project}\` ${last.name}`);
  } else if (outcome !== 'passed' && outcome !== 'skipped') {
    problems.push(`- **${outcome}** \`${project}\` ${last.name}`);
  }
}

const lines = ['### Test results', ''];
if (byProject.size === 0) {
  lines.push('No test results were found.');
} else {
  lines.push(`| Project | ${COLUMNS.join(' | ')} |`, `| --- |${' ---: |'.repeat(COLUMNS.length)}`);
  for (const [project, counts] of [...byProject].sort()) {
    lines.push(`| ${project} | ${COLUMNS.map((column) => counts[column] ?? 0).join(' | ')} |`);
  }
  if (problems.length > 0) {
    lines.push('', ...problems);
  }
  if (knownBugs.length > 0) {
    lines.push('', 'Known product bugs (fail as expected, see docs/exploration.md):', ...knownBugs);
  }
}
process.stdout.write(`${lines.join('\n')}\n`);

// Prints a Markdown summary of allure-results/ (pass/fail counts per Playwright project) for
// $GITHUB_STEP_SUMMARY. With retries there is one result per attempt: the last attempt counts,
// and a test that passed after a failed or broken attempt is reported as flaky.
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const dir = process.argv[2] ?? 'allure-results';
const files = readdirSync(dir).filter((file) => file.endsWith('-result.json'));
const attemptsByTest = new Map();

for (const file of files) {
  const result = JSON.parse(readFileSync(join(dir, file), 'utf8'));
  const key = result.historyId ?? result.fullName;
  attemptsByTest.set(key, [...(attemptsByTest.get(key) ?? []), result]);
}

const COLUMNS = ['passed', 'failed', 'broken', 'skipped', 'flaky'];
const byProject = new Map();
const problems = [];

for (const attempts of attemptsByTest.values()) {
  attempts.sort((a, b) => a.stop - b.stop);
  const last = attempts.at(-1);
  const project = last.labels.find((label) => label.name === 'parentSuite')?.value ?? 'unknown';
  const flaky =
    last.status === 'passed' &&
    attempts.some((attempt) => attempt.status === 'failed' || attempt.status === 'broken');
  const outcome = flaky ? 'flaky' : last.status;
  const counts = byProject.get(project) ?? Object.fromEntries(COLUMNS.map((column) => [column, 0]));
  counts[outcome] = (counts[outcome] ?? 0) + 1;
  byProject.set(project, counts);
  if (outcome !== 'passed' && outcome !== 'skipped') {
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
}
process.stdout.write(`${lines.join('\n')}\n`);

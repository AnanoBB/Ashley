// Runs before `allure generate`. Tests tagged @known-bug use `test.fail()`: Playwright counts the
// expected failure as a pass (CI stays green) and allure-playwright reports it as "passed", which
// hides the bug in the report. This marks those results "failed" with a "Known bug" prefix so they
// show up red under the "Known product bugs" category (allurerc.mjs). A known-bug test that passes
// is already "failed" (unexpected pass); it gets a message saying the bug may be fixed.
// Each marked result gets a `knownBug` label (`expected-failure` or `no-longer-reproduces`), which
// the Allure categories and scripts/ci-summary.mjs match on. A known-bug test that failed for
// another reason (its message lacks the `expectedError` label from knownBug(), e.g. a page error or
// a broken locator, or it has no such label) is marked "broken", so it shows as a test problem
// instead of the known bug.
// With --strict (the CI test job) it also exits 1 then: Playwright counts any failure of a
// test.fail() test as a pass, so without this the job would stay green.
import { existsSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const KNOWN_BUG_PREFIX = 'Known bug (expected failure): ';
const NO_LONGER_REPRODUCES =
  'Known bug no longer reproduces: the test passed but is marked test.fail(). Check the bug and remove test.fail().';

const UNEXPECTED_FAILURE_PREFIX = 'Known-bug test failed for another reason than the bug: ';

const args = process.argv.slice(2);
const strict = args.includes('--strict');
const dir = args.find((arg) => !arg.startsWith('--')) ?? 'allure-results';
let marked = 0;
let unexpected = 0;

if (!existsSync(dir)) {
  console.log(`No ${dir}/ folder: nothing to mark.`);
  process.exit(0);
}

for (const file of readdirSync(dir).filter((name) => name.endsWith('-result.json'))) {
  const path = join(dir, file);
  const result = JSON.parse(readFileSync(path, 'utf8'));
  result.labels ??= [];
  const isKnownBug = result.labels.some(
    (label) => label.name === 'tag' && label.value.replace(/^@/, '') === 'known-bug',
  );
  const alreadyMarked = result.labels.some((label) => label.name === 'knownBug');
  const message = result.statusDetails?.message ?? '';
  const expectedError = result.labels.find((label) => label.name === 'expectedError')?.value;
  if (!isKnownBug || alreadyMarked) {
    continue;
  }
  if (
    result.status === 'passed' &&
    message &&
    !(expectedError && message.includes(expectedError))
  ) {
    result.status = 'broken';
    result.statusDetails.message = UNEXPECTED_FAILURE_PREFIX + message;
    result.labels.push({ name: 'knownBug', value: 'unexpected-failure' });
    unexpected += 1;
    console.error(`${result.name}: ${UNEXPECTED_FAILURE_PREFIX}${message.split('\n')[0]}`);
  } else if (result.status === 'passed' && message) {
    result.status = 'failed';
    result.statusDetails.message = KNOWN_BUG_PREFIX + message;
    result.labels.push({ name: 'knownBug', value: 'expected-failure' });
  } else if (result.status === 'failed' && !message) {
    result.statusDetails = { ...result.statusDetails, message: NO_LONGER_REPRODUCES };
    result.labels.push({ name: 'knownBug', value: 'no-longer-reproduces' });
  } else {
    continue;
  }
  writeFileSync(path, JSON.stringify(result));
  marked += 1;
}

console.log(`Marked ${marked} known-bug result(s) in ${dir}.`);
if (strict && unexpected > 0) {
  process.exitCode = 1;
}

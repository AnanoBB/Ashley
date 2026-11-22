// Runs before `allure generate`. Tests tagged @known-bug use `test.fail()`: Playwright counts the
// expected failure as a pass (CI stays green) and allure-playwright reports it as "passed", which
// hides the bug in the report. This marks those results "failed" with a "Known bug" prefix so they
// show up red under the "Known product bugs" category (allurerc.mjs). A known-bug test that passes
// is already "failed" (unexpected pass); it gets a message saying the bug may be fixed.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import process from 'node:process';

const KNOWN_BUG_PREFIX = 'Known bug (expected failure): ';
const NO_LONGER_REPRODUCES =
  'Known bug no longer reproduces: the test passed but is marked test.fail(). Check the bug and remove test.fail().';

const dir = process.argv[2] ?? 'allure-results';
let marked = 0;

for (const file of readdirSync(dir).filter((name) => name.endsWith('-result.json'))) {
  const path = join(dir, file);
  const result = JSON.parse(readFileSync(path, 'utf8'));
  const isKnownBug = result.labels?.some(
    (label) => label.name === 'tag' && label.value.replace(/^@/, '') === 'known-bug',
  );
  const message = result.statusDetails?.message ?? '';
  if (!isKnownBug || message.startsWith(KNOWN_BUG_PREFIX) || message === NO_LONGER_REPRODUCES) {
    continue;
  }
  if (result.status === 'passed' && message) {
    result.status = 'failed';
    result.statusDetails.message = KNOWN_BUG_PREFIX + message;
  } else if (result.status === 'failed' && !message) {
    result.statusDetails = { ...result.statusDetails, message: NO_LONGER_REPRODUCES };
  } else {
    continue;
  }
  writeFileSync(path, JSON.stringify(result));
  marked += 1;
}

process.stdout.write(`Marked ${marked} known-bug result(s) in ${dir}.\n`);
